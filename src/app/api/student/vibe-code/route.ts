import { deviceKey, fail, guard, ok, rateLimit, readJson } from "@/lib/api";
import {
  ensureArtifact,
  getSession,
  isSessionClosed,
  logAiCall,
  updateArtifact,
} from "@/lib/db";
import { activityIdFor } from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";
import type { WorksheetQuestion } from "@/lib/types";

/** AI 응답을 90초까지 기다린다(vibe-code.ts TIMEOUT_MS). 함수 시간 상한을 그보다 넉넉히 둔다 */
export const maxDuration = 120;
import {
  MICROBIT_MANBOGI_BASE,
  vibeCodeGenerate,
  type VibeCodeEntry,
  type VibeCodeLog,
} from "@/lib/vibe-code";

/**
 * 바이브 코딩 — 학생 프롬프트 → Gemini 코드 생성 (22차 vibe_code 문항).
 *
 * ## 프라이버시 (이 과목의 1순위)
 *
 * - 학번·이름은 Gemini 로 보내지 않는다. 현재 게임 코드(차시가 준 vibeBaseCode)와 학생 프롬프트만 넘어간다.
 * - 프롬프트·AI 답(코드·설명)은 학생 본인 activity 아티팩트(answers[key])에 JSON 으로 저장되고
 *   교사만 열람한다(api/teacher/vibe-code + requireTeacher). 학생 화면엔 "선생님이 볼 수 있어요" 를 띄운다.
 *
 * 요청: POST { key, prompt }  → 코드 생성해 기록에 추가, 전체 기록 반환
 *       GET  ?key=...         → 내 기록 반환 (Gemini 호출 없음)
 */

/** 학번 기준 시간당 상한. 코드 생성은 비싸니 넉넉하되 남용은 막는다 */
const PER_STUDENT = 25;
/** 태블릿 기준 이중 상한 (다른 학번으로 우회 방지) */
const PER_DEVICE = 50;
const WINDOW_MS = 60 * 60_000;

// vibe-code.ts 의 MAX_PROMPT 와 같다 (2026-11-27 500 → 4000자)
const MAX_PROMPT = 4000;
/** 아티팩트에 쌓아 둘 기록 최대 개수 (Firestore 문서 방어). 오래된 것부터 버린다 */
const MAX_ENTRIES = 12;
/** '내 코드로 이어서' 에 붙여넣을 수 있는 최대 길이 (vibe-code.ts 의 MAX_BASE_CODE 와 같다) */
const MAX_MINE_CODE = 6000;

function parseLog(raw: string | undefined): VibeCodeLog | null {
  if (!raw?.trim()) return null;
  try {
    const value = JSON.parse(raw) as VibeCodeLog;
    return Array.isArray(value.entries) ? value : null;
  } catch {
    return null;
  }
}

function findQuestion(
  session: Awaited<ReturnType<typeof getSession>>,
  key: string,
): WorksheetQuestion | undefined {
  return (session?.activity?.worksheet ?? []).find(
    (q): q is WorksheetQuestion => q.key === key && q.kind === "vibe_code",
  );
}

export async function GET(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");
    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const key = (new URL(request.url).searchParams.get("key") ?? "").trim();
    if (!findQuestion(session, key)) return fail("not_found");

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");

    const artifact = await ensureArtifact({
      activityId,
      studentId: me.studentId,
      classNo: session.classNo,
      year: session.activity?.year ?? new Date().getFullYear(),
    });
    const log = parseLog(artifact.answers?.[key]) ?? { entries: [], updatedAt: 0 };
    return ok({ log });
  });
}

export async function POST(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");
    if (isSessionClosed(session)) return fail("session_expired", "이 수업은 끝났어요.");

    const body = await readJson<{ key?: string; prompt?: string; from?: string; code?: string }>(request);
    const key = body?.key ?? "";
    const question = findQuestion(session, key);
    if (!question) return fail("not_found");

    const prompt = (body?.prompt ?? "").trim().slice(0, MAX_PROMPT);
    if (!prompt) return fail("invalid_input", "추가하고 싶은 기능을 적어 주세요.");

    // 바탕 코드·대상은 차시가 준 것(vibeBaseCode·vibeTarget)을 쓴다 — 클라이언트가 보낸 코드는 신뢰하지 않는다.
    const target = question.vibeTarget ?? "turtle";
    // microbit 은 차시가 바탕을 안 줘도 만보기 기본 코드로 물러난다(25차). turtle 은 예전처럼 차시가 꼭 준다.
    const fallbackBase = target === "microbit" ? MICROBIT_MANBOGI_BASE : "";
    const questionBase = (question.vibeBaseCode ?? question.code ?? fallbackBase).trim();

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");

    const artifact = await ensureArtifact({
      activityId,
      studentId: me.studentId,
      classNo: session.classNo,
      year: session.activity?.year ?? new Date().getFullYear(),
    });
    const existing = parseLog(artifact.answers?.[key]) ?? { entries: [], updatedAt: 0 };

    /*
     * 출발점(vibeContinue 문항만, 33~34차 수행평가).
     *  · last - 마지막으로 받은 코드에서 이어서. **서버가 기록에서 직접 꺼낸다**(이 칸 → 없으면
     *           vibeContinueFromKey 칸). 학생이 보낸 코드를 '이어서' 라며 끼워 넣을 수 없다.
     *  · mine - 학생이 붙여넣은 자기 코드. 길이만 막는다(학번·이름은 여전히 안 보낸다).
     *  · 그 밖 - 처음 코드(questionBase). vibeContinue 가 꺼진 문항은 늘 이것이다(예전과 같음).
     */
    let from: "base" | "last" | "mine" = "base";
    let baseCode = questionBase;
    let startCode: string | undefined;
    if (question.vibeContinue && body?.from === "last") {
      const own = existing.entries.filter((e) => e.code).at(-1)?.code;
      const fromKey = question.vibeContinueFromKey;
      const prev = !own && fromKey
        ? parseLog(artifact.answers?.[fromKey])?.entries.filter((e) => e.code).at(-1)?.code
        : undefined;
      const code = (own ?? prev ?? "").trim();
      if (!code) return fail("invalid_input", "이어서 고칠 코드가 아직 없어요. '처음 코드' 로 먼저 받아 보세요.");
      from = "last";
      baseCode = code;
    } else if (question.vibeContinue && body?.from === "mine") {
      const code = (body?.code ?? "").trim();
      if (!code) return fail("invalid_input", "이어서 고칠 내 코드를 붙여넣어 주세요.");
      if (code.length > MAX_MINE_CODE) {
        return fail("invalid_input", `코드가 너무 길어요(${MAX_MINE_CODE}자까지). 필요한 부분만 붙여넣어 주세요.`);
      }
      from = "mine";
      baseCode = code;
      startCode = code;
    }
    if (!baseCode) return fail("server_error", "현재 코드가 준비되지 않았어요. 선생님께 알려 주세요.");

    if (!rateLimit(`vibecode:${me.studentId}`, PER_STUDENT, WINDOW_MS)) {
      return fail("too_many_attempts", "오늘 AI에게 코드를 받을 수 있는 횟수를 다 썼어요.");
    }
    if (!rateLimit(await deviceKey("vibecode"), PER_DEVICE, WINDOW_MS)) {
      return fail("too_many_attempts", "이 태블릿에서 너무 많이 눌렀어요. 선생님께 알려 주세요.");
    }

    const result = await vibeCodeGenerate({ baseCode, prompt, target });
    if (!result) {
      await logAiCall({
        studentId: me.studentId,
        lessonNo: session.lessonNo,
        feature: "vibe_code_fail",
      }).catch(() => undefined);
      return fail("server_error", "AI가 잠시 코드를 만들지 못하고 있어요. 조금 뒤에 다시 보내 보세요.");
    }

    // 생성에 수십 초 걸린다 - 그사이 바뀌었을 수 있으니 기록을 새로 읽는다.
    const fresh = await ensureArtifact({
      activityId,
      studentId: me.studentId,
      classNo: session.classNo,
      year: session.activity?.year ?? new Date().getFullYear(),
    });
    const latestLog = parseLog(fresh.answers?.[key]) ?? existing;
    const now = Date.now();
    const entry: VibeCodeEntry = {
      prompt,
      code: result.code,
      explanation: result.explanation,
      at: now,
      ...(question.vibeContinue ? { from } : {}),
      ...(startCode ? { startCode } : {}),
    };
    const log: VibeCodeLog = {
      // 오래된 것부터 버리고 최신 MAX_ENTRIES 개만 남긴다 (Firestore 문서 방어).
      entries: [...latestLog.entries, entry].slice(-MAX_ENTRIES),
      updatedAt: now,
    };
    // 이 키 하나만 merge 로 쓴다 - answers 전체를 펼쳐 쓰면 생성 중에 학생이 저장한 다른 답을 옛 값으로 덮는다.
    await updateArtifact(fresh.id, { answers: { [key]: JSON.stringify(log) } });
    await logAiCall({
      studentId: me.studentId,
      sessionId: session.id,
      lessonNo: session.lessonNo,
      feature: "vibe_code",
    }).catch(() => undefined);

    return ok({ log, entry });
  });
}
