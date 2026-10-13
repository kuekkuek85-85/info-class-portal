import { deviceKey, fail, guard, ok, rateLimit } from "@/lib/api";
import { generateBrainImage, type BrainEmotion } from "@/lib/brain-image";
import {
  flagCareAlert,
  getArtifact,
  getSession,
  isSessionClosed,
  logAiCall,
} from "@/lib/db";
import { checkCrisis } from "@/lib/emotion-lens";
import { activityIdFor } from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";

/**
 * 나의 뇌구조 이미지 생성 — 학생이 활동지에 적은 '상황 · 감정 · 색 · 마음 크기'로 머리 옆모습
 * 안을 감정 색으로 채운 그림을 Gemini(gemini-2.5-flash-image)가 그려 준다 (마음 톡톡 8회기).
 *
 * **학번·이름은 보내지 않는다.** 클라이언트가 보낸 텍스트를 그대로 태우지 않고, 서버가 그
 * 학생의 artifact 에서 상황·감정·색·퍼센트를 읽어 프롬프트를 조립한다(ai-feedback 패턴).
 *
 * ## 위기 신호는 Gemini 앞에서 멈춘다
 *
 * 상황 서술에 자·타해 암시가 있으면 호출 자체를 하지 않고(감정 렌즈와 같은 문턱) 교사에게
 * "걸렸다"는 사실만 알린다 — **무엇을 썼는지는 로그에도 Gemini 에도 남기지 않는다.**
 *
 * ## 저장은 클라이언트가 줄여서 artifact 라우트로
 *
 * 이미지 모델(gemini-2.5-flash-image)이 돌려주는 PNG 는 data URL 로 ~1MB 를 넘겨 Firestore 문서
 * 한도(1MB)에 안 들어간다. 그래서 **이 라우트는 생성한 그림을 돌려주기만** 하고, 저장은
 * 클라이언트가 캔버스로 작게 줄인 JPEG 를 artifact 라우트(brainImage 필드)로 올려서 한다. 저장분은
 * 본인 것이고 answers·갤러리 카드 경로를 안 지난다 — 친구에게 나갈 길이 없다(galleryEnabled:false).
 */

/** 학번 기준 — 한 시간에 6회. 이미지는 글보다 무겁고 비싸 피드백(8회)보다 낮게 둔다 */
const PER_STUDENT = 6;
/** 기기 기준 이중 상한 (다른 학번으로 들어가 우회하는 것을 막는다) */
const PER_DEVICE = 15;
const WINDOW_MS = 60 * 60_000;

const CRISIS_MESSAGE =
  "이건 그림보다 선생님과 직접 이야기하는 게 좋겠어요.\n" +
  "지금 조용히 손을 들어 주거나, 수업이 끝나고 남아 주세요. 혼자 두지 않을게요.";

/** 마음 크기 "40%" / "40" → 0~100 정수. 못 읽으면 0 */
function parsePercent(raw: string): number {
  const n = Math.round(Number(String(raw ?? "").replace(/[^0-9.]/g, "")));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/** brain_emotions(rows JSON)을 프롬프트용 감정 목록으로. 감정·색이 다 있는 줄만 남긴다. */
function parseEmotions(raw: string): BrainEmotion[] {
  if (!raw.trim()) return [];
  let rows: unknown;
  try {
    rows = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(rows)) return [];
  const out: BrainEmotion[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as { emotion?: unknown; color?: unknown; size?: unknown };
    const emotion = String(r.emotion ?? "").trim();
    const color = String(r.color ?? "").trim();
    if (!emotion || !color) continue;
    out.push({ emotion, color, percent: parsePercent(String(r.size ?? "")) });
  }
  // 프롬프트가 지나치게 길어지지 않게 상한(활동지 maxRows 와 같은 6)
  return out.slice(0, 6);
}

export async function POST() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");
    if (isSessionClosed(session)) return fail("session_expired", "이 수업은 끝났어요.");

    const activity = session.activity;
    if (!activity?.activityId || !activity.brainImage) return fail("not_found");

    const artifact = await getArtifact(activityIdFor(session), me.studentId);
    if (!artifact) return fail("not_found", "먼저 활동지를 채워 주세요.");

    /*
     * 보낼 것은 **앞 단계에서 쓴 답**을 그대로 가져온다(클라이언트가 보낸 텍스트를 태우지
     * 않는다). 상황·감정·색·마음 크기가 다 있어야 그림을 그릴 수 있다.
     */
    const situation = String(artifact.answers?.brain_situation ?? "").trim();
    const emotions = parseEmotions(String(artifact.answers?.brain_emotions ?? ""));
    if (!situation || emotions.length === 0) {
      return fail(
        "invalid_input",
        "먼저 왼쪽 활동지에서 '상황'과 '감정·색·마음 크기'를 채워 주세요.",
      );
    }

    /*
     * 위기 신호 — Gemini 를 부르기 전에 멈춘다. 상한을 세기 전에 검사한다(걸리는 것 자체가
     * 학생 잘못이 아니라 횟수를 깎지 않는다). 학번·시각만 남기고 무엇을 썼는지는 남기지 않는다.
     */
    const combined = [situation, ...emotions.map((e) => e.emotion)].join(" ");
    if (checkCrisis(combined)) {
      await logAiCall({
        studentId: me.studentId,
        lessonNo: session.lessonNo,
        feature: "brain_image_blocked",
      }).catch(() => undefined);
      await flagCareAlert(session.id, me.studentId).catch(() => undefined);
      return ok({ blocked: true, message: CRISIS_MESSAGE });
    }

    if (!rateLimit(`brainimage:${me.studentId}`, PER_STUDENT, WINDOW_MS)) {
      return fail("too_many_attempts", "뇌구조 이미지를 만들 수 있는 횟수를 다 썼어요.");
    }
    if (!rateLimit(await deviceKey("brainimage"), PER_DEVICE, WINDOW_MS)) {
      return fail("too_many_attempts", "이 태블릿에서 너무 많이 눌렀어요. 선생님께 알려 주세요.");
    }

    const dataUrl = await generateBrainImage(situation, emotions);
    if (!dataUrl) {
      return fail("server_error", "AI가 그림을 그리지 못했어요. 잠시 뒤에 다시 눌러 보세요.");
    }

    await logAiCall({
      studentId: me.studentId,
      sessionId: session.id,
      lessonNo: session.lessonNo,
      feature: "brain_image",
    }).catch(() => undefined);

    // 저장은 클라이언트가 작게 줄여 artifact 라우트(brainImage)로 올린다 (위 설명 — 1MB 한도).
    return ok({ blocked: false, dataUrl });
  });
}
