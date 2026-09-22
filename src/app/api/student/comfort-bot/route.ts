import { deviceKey, fail, guard, ok, rateLimit, readJson } from "@/lib/api";
import {
  comfortIntro,
  comfortReply,
  type BotPreset,
  type ComfortDesignField,
  type ComfortTranscript,
} from "@/lib/comfort-bot";
import {
  ensureArtifact,
  flagCareAlert,
  getArtifact,
  getSession,
  isSessionClosed,
  logAiCall,
  updateArtifact,
} from "@/lib/db";
import { checkCrisis } from "@/lib/emotion-lens";
import { activityIdFor } from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";
import type { WorksheetQuestion } from "@/lib/types";

/**
 * 임베드 감정 대화 챗봇 — comfort_bot 문항 두 가지 프리셋을 함께 처리한다.
 *
 *  · comfort (기본)         — 학생이 고른 갈등 상황·설계로 만든 감정 위로 챗봇 (6회기 grill)
 *  · empathy_dialogue       — 감정 대화 연습 봇 (6회기 wrapheal ②). 상황 선택·설계 없이, 봇이
 *                             감정 상황을 꺼내고 학생이 배운 공감으로 응답을 이어 간다.
 *
 * ## 프라이버시·안전 (이 과목의 1순위) — 두 프리셋 공통
 *
 * - 학번·이름은 Gemini 로 보내지 않는다. 상황 전문(comfort)·학생 설계·대화 텍스트만 넘어간다.
 * - **위기 신호는 Gemini 앞에서 멈춘다.** checkCrisis 에 걸리면 호출하지 않고, 교사에게 신호만
 *   보낸다(flagCareAlert — 무엇을 썼는지는 빼고). 학생에겐 어른·상담에 가닿자는 안내를 띄운다.
 * - 대화 transcript 는 학생 activity 아티팩트(answers[key])에 저장되고 교사가 열람한다.
 *   학생 화면에는 "이 대화는 선생님이 볼 수 있어요" 를 항상 띄운다(투명성).
 *
 * 요청: { key, message?, reset? }
 *  · reset:true      — 대화를 처음부터 다시 (자기소개부터)
 *  · message 있음     — 학생의 새 말 → 챗봇 답
 *  · 둘 다 없음        — 열기: transcript 가 있으면 그대로, 없으면 자기소개로 시작
 */

/** 학번 기준 시간당 상한. 대화라 넉넉히 두되, 한 명이 수백 번 두드리는 것은 막는다 */
const PER_STUDENT = 40;
/** 태블릿 기준 이중 상한 (다른 학번으로 다시 들어가 우회하는 것을 막는다) */
const PER_DEVICE = 80;
const WINDOW_MS = 60 * 60_000;

/** Gemini 로 보낼 대화 이력 길이 상한 (토큰·비용 방어). 최근 것부터 이만큼만 보낸다 */
const HISTORY_LIMIT = 16;
const MAX_MESSAGE = 500;

/** 위기 신호로 막혔을 때 학생에게 띄우고 transcript 에도 남기는 안내 (챗봇 답을 대신한다). */
const CRISIS_REPLY =
  "지금 이야기는 챗봇보다 믿을 수 있는 어른과 나누는 게 좋겠어요.\n" +
  "선생님이나 부모님께 이야기하거나, 청소년 상담 1388, 자살예방 상담 109 에 전화해도 돼요.\n" +
  "혼자가 아니에요 — 선생님이 함께할게요.";

function parseTranscript(raw: string | undefined): ComfortTranscript | null {
  if (!raw?.trim()) return null;
  try {
    const value = JSON.parse(raw) as ComfortTranscript;
    return Array.isArray(value.messages) ? value : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");
    if (isSessionClosed(session)) return fail("session_expired", "이 수업은 끝났어요.");

    const body = await readJson<{ key?: string; message?: string; reset?: boolean }>(request);
    const key = body?.key ?? "";
    const question = (session.activity?.worksheet ?? []).find(
      (q): q is WorksheetQuestion => q.key === key && q.kind === "comfort_bot",
    );
    if (!question) return fail("not_found");

    const preset: BotPreset =
      question.botPreset === "empathy_dialogue" ? "empathy_dialogue" : "comfort";
    const isEmpathy = preset === "empathy_dialogue";

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");

    /*
     * 감정 대화 연습 봇(empathy_dialogue)은 앞에 고를 상황·설계 칸이 없다 — 학생이 바로 들어와
     * 대화를 시작할 수 있어야 하므로 아티팩트가 없으면 만든다. 감정 위로 챗봇(comfort)은 앞 칸
     * (상황 고르기·챗봇 설계)을 반드시 거쳐 아티팩트가 이미 있으므로 getArtifact 로 확인만 한다.
     */
    const artifact = isEmpathy
      ? await ensureArtifact({
          activityId,
          studentId: me.studentId,
          classNo: session.classNo,
          year: session.activity?.year ?? new Date().getFullYear(),
        })
      : await getArtifact(activityId, me.studentId);
    if (!artifact) {
      return fail("not_found", "먼저 앞 칸에서 상황을 고르고 챗봇을 설계해 주세요.");
    }

    /*
     * comfort 프리셋만 상황 전문·학생 설계를 앞 칸에서 읽어 온다. 상황 전문은 서버에서 고른다
     * (학생이 고른 보기와 situations[].match 를 견줘 하나만) — 클라이언트가 보낸 텍스트는 쓰지
     * 않는다. empathy_dialogue 는 상황·설계가 없다(고정 시스템 프롬프트).
     */
    let situationText = "";
    let situationLabel = "";
    let design: ComfortDesignField[] = [];
    if (!isEmpathy) {
      const pickedLabel = (artifact.answers?.[question.situationSourceKey ?? ""] ?? "").trim();
      const situation = (question.situations ?? []).find((s) => s.match === pickedLabel);
      if (!situation) {
        return fail("invalid_input", "먼저 위에서 상황을 하나 골라 주세요.");
      }
      situationText = situation.text;
      situationLabel = situation.match;
      design = (question.designKeys ?? [])
        .map((d) => ({ label: d.label, value: (artifact.answers?.[d.key] ?? "").trim() }))
        .filter((d) => d.value);
    }

    const existing = parseTranscript(artifact.answers?.[key]);

    async function persist(transcript: ComfortTranscript) {
      await updateArtifact(artifact!.id, {
        answers: { ...artifact!.answers, [key]: JSON.stringify(transcript) },
      });
    }

    const feature = isEmpathy ? "empathy_dialogue" : "comfort_bot";

    /* ── 열기: 이미 대화가 있으면 그대로 돌려준다 (Gemini 호출 없음) ── */
    const wantsSend = typeof body?.message === "string" && body.message.trim().length > 0;
    if (!body?.reset && !wantsSend) {
      if (existing && existing.messages.length > 0) {
        return ok({ transcript: existing });
      }
      // 처음 여는 경우 — 아래 자기소개 생성으로 이어진다
    }

    /* ── 처음 시작 / 다시 시작: 자기소개부터 ── */
    if (body?.reset || !existing || existing.messages.length === 0) {
      if (!rateLimit(`comfortbot:${me.studentId}`, PER_STUDENT, WINDOW_MS)) {
        return fail("too_many_attempts", "오늘 챗봇과 나눌 수 있는 횟수를 다 썼어요.");
      }
      if (!rateLimit(await deviceKey("comfortbot"), PER_DEVICE, WINDOW_MS)) {
        return fail("too_many_attempts", "이 태블릿에서 너무 많이 눌렀어요. 선생님께 알려 주세요.");
      }

      const intro = await comfortIntro({ preset, situationText, design });
      const first =
        intro ??
        (isEmpathy
          ? "안녕하세요, 저는 당신과 감정 이야기를 나눌 친구예요. 오늘 저는 발표를 망친 것 같아 조금 속상했어요. 이런 제 마음, 어떻게 알아줄 수 있을까요?"
          : "안녕하세요, 저는 당신의 이야기를 들어주는 위로 챗봇이에요. 무슨 일이 있었는지 편하게 말해 줄래요?");
      const transcript: ComfortTranscript = {
        situation: situationLabel,
        design,
        messages: [{ role: "bot", text: first, at: Date.now() }],
        updatedAt: Date.now(),
      };
      await persist(transcript);
      await logAiCall({
        studentId: me.studentId,
        sessionId: session.id,
        lessonNo: session.lessonNo,
        feature,
      }).catch(() => undefined);
      return ok({ transcript });
    }

    /* ── 학생의 새 말 → 챗봇 답 ── */
    const text = (body?.message ?? "").trim().slice(0, MAX_MESSAGE);
    if (!text) return fail("invalid_input", "하고 싶은 말을 적어 주세요.");

    /*
     * 위기 신호 — Gemini 를 부르기 전에 멈춘다. 상한을 세기 전에 검사한다(걸리는 것 자체가
     * 학생 잘못이 아니라 횟수를 깎지 않는다). 학생 말과 안내는 transcript 에 남겨 교사가
     * 후속 대응하되, 무엇을 썼는지는 외부 로그로 보내지 않는다.
     */
    if (checkCrisis(text)) {
      await logAiCall({
        studentId: me.studentId,
        lessonNo: session.lessonNo,
        feature: `${feature}_blocked`,
      }).catch(() => undefined);
      await flagCareAlert(session.id, me.studentId).catch(() => undefined);

      const now = Date.now();
      const transcript: ComfortTranscript = {
        situation: existing.situation || situationLabel,
        design: existing.design.length ? existing.design : design,
        messages: [
          ...existing.messages,
          { role: "user", text, at: now },
          { role: "bot", text: CRISIS_REPLY, at: now + 1 },
        ],
        updatedAt: now + 1,
      };
      await persist(transcript);
      return ok({ transcript, blocked: true });
    }

    if (!rateLimit(`comfortbot:${me.studentId}`, PER_STUDENT, WINDOW_MS)) {
      return fail("too_many_attempts", "오늘 챗봇과 나눌 수 있는 횟수를 다 썼어요.");
    }
    if (!rateLimit(await deviceKey("comfortbot"), PER_DEVICE, WINDOW_MS)) {
      return fail("too_many_attempts", "이 태블릿에서 너무 많이 눌렀어요. 선생님께 알려 주세요.");
    }

    const reply = await comfortReply({
      preset,
      situationText,
      design,
      history: existing.messages.slice(-HISTORY_LIMIT),
      userText: text,
    });
    if (!reply) {
      return fail("server_error", "챗봇이 잠시 대답하지 못하고 있어요. 조금 뒤에 다시 보내 보세요.");
    }

    const now = Date.now();
    const transcript: ComfortTranscript = {
      situation: existing.situation || situationLabel,
      design: existing.design.length ? existing.design : design,
      messages: [
        ...existing.messages,
        { role: "user", text, at: now },
        { role: "bot", text: reply, at: now + 1 },
      ],
      updatedAt: now + 1,
    };
    await persist(transcript);
    await logAiCall({
      studentId: me.studentId,
      sessionId: session.id,
      lessonNo: session.lessonNo,
      feature,
    }).catch(() => undefined);

    return ok({ transcript });
  });
}
