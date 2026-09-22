import { deviceKey, fail, guard, ok, rateLimit, readJson } from "@/lib/api";
import {
  comfortIntro,
  comfortReply,
  type ComfortDesignField,
  type ComfortTranscript,
} from "@/lib/comfort-bot";
import {
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
 * 감정 위로 챗봇 — 학생이 설계한 챗봇과 대화한다 (comfort_bot 문항).
 *
 * ## 프라이버시·안전 (이 과목의 1순위)
 *
 * - 학번·이름은 Gemini 로 보내지 않는다. 상황 전문·학생 설계·대화 텍스트만 넘어간다.
 * - **위기 신호는 Gemini 앞에서 멈춘다.** checkCrisis 에 걸리면 호출하지 않고, 교사에게
 *   신호만 보낸다(flagCareAlert — 무엇을 썼는지는 빼고 학번·시각만). 학생에겐 어른·상담에
 *   가닿자는 안내를 띄운다. 그 안내와 학생의 말은 transcript 에 남아 교사가 후속 대응한다.
 * - 대화 transcript 는 학생 activity 아티팩트(answers[key])에 저장되고, 교사가 대시보드에서
 *   열람한다. 학생 화면에는 "이 대화는 선생님이 볼 수 있어요" 를 명확히 띄운다(투명성).
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

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");
    const artifact = await getArtifact(activityId, me.studentId);
    if (!artifact) {
      return fail("not_found", "먼저 앞 칸에서 상황을 고르고 챗봇을 설계해 주세요.");
    }

    /*
     * 상황 전문을 서버에서 고른다. 학생이 고른 보기(situationSourceKey 칸의 답)와
     * situations[].match 를 견줘 하나만. 클라이언트가 보낸 텍스트는 쓰지 않는다 — 활동지를
     * 거치지 않은 아무 상황이나 이 경로로 흘려보낼 수 없게 (emotion route 와 같은 원칙).
     */
    const pickedLabel = (artifact.answers?.[question.situationSourceKey ?? ""] ?? "").trim();
    const situation = (question.situations ?? []).find((s) => s.match === pickedLabel);
    if (!situation) {
      return fail("invalid_input", "먼저 위에서 상황을 하나 골라 주세요.");
    }

    // 학생이 설계한 챗봇 성격을 앞 칸에서 읽어 온다 (없는 칸·빈 칸은 빠진다).
    const design: ComfortDesignField[] = (question.designKeys ?? [])
      .map((d) => ({ label: d.label, value: (artifact.answers?.[d.key] ?? "").trim() }))
      .filter((d) => d.value);

    const existing = parseTranscript(artifact.answers?.[key]);

    async function persist(transcript: ComfortTranscript) {
      await updateArtifact(artifact!.id, {
        answers: { ...artifact!.answers, [key]: JSON.stringify(transcript) },
      });
    }

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

      const intro = await comfortIntro({ situationText: situation.text, design });
      const first =
        intro ??
        "안녕하세요, 저는 당신의 이야기를 들어주는 위로 챗봇이에요. 무슨 일이 있었는지 편하게 말해 줄래요?";
      const transcript: ComfortTranscript = {
        situation: situation.match,
        design,
        messages: [{ role: "bot", text: first, at: Date.now() }],
        updatedAt: Date.now(),
      };
      await persist(transcript);
      await logAiCall({
        studentId: me.studentId,
        sessionId: session.id,
        lessonNo: session.lessonNo,
        feature: "comfort_bot",
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
        feature: "comfort_bot_blocked",
      }).catch(() => undefined);
      await flagCareAlert(session.id, me.studentId).catch(() => undefined);

      const now = Date.now();
      const transcript: ComfortTranscript = {
        situation: existing.situation || situation.match,
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
      situationText: situation.text,
      design,
      history: existing.messages.slice(-HISTORY_LIMIT),
      userText: text,
    });
    if (!reply) {
      return fail("server_error", "챗봇이 잠시 대답하지 못하고 있어요. 조금 뒤에 다시 보내 보세요.");
    }

    const now = Date.now();
    const transcript: ComfortTranscript = {
      situation: existing.situation || situation.match,
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
      feature: "comfort_bot",
    }).catch(() => undefined);

    return ok({ transcript });
  });
}
