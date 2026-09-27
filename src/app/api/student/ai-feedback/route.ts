import { deviceKey, fail, guard, ok, rateLimit, readJson } from "@/lib/api";
import { reviewFeedback, type FeedbackVariant } from "@/lib/ai-feedback";
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
 * AI 피드백 — 학생이 쓴 답(나 전달법·공감 문장·갈등 분석)을 Gemini 에 보내고 따뜻한 피드백을
 * 받아 온다 (마음 톡톡 6회기 대인관계).
 *
 * **학번·이름은 보내지 않는다.** 활동지에 쓴 서술과 활동지가 정한 보기 라벨(고른 상황·입장)만
 * 넘어간다. **본문은 어디에도 로그로 남기지 않는다** — 남는 것은 "언제 이 기능을 불렀는가" 뿐이다.
 *
 * ## 위기 신호는 Gemini 앞에서 멈춘다
 *
 * 자·타해 암시가 있으면 호출 자체를 하지 않고 교사와 이야기하자는 안내만 띄운다(감정 렌즈와
 * 같은 문턱). 학생 글 원문은 활동지에 그대로 남아 교사가 읽고 판단한다.
 *
 * 요청: { key } — 문항의 feedbackFields 로 앞 칸 답을 서버가 모아 보낸다(클라이언트 텍스트 안 씀).
 */

/** 학번 기준 — 한 시간에 8회. 답을 고쳐 가며 다시 받아 보는 것까지 열어 둔다 */
const PER_STUDENT = 8;
/** 기기 기준 이중 상한 (다른 학번으로 다시 들어가 우회하는 것을 막는다) */
const PER_DEVICE = 20;
const WINDOW_MS = 60 * 60_000;

const CRISIS_MESSAGE =
  "이건 AI보다 선생님과 직접 이야기하는 게 좋겠어요.\n" +
  "지금 조용히 손을 들어 주거나, 수업이 끝나고 남아 주세요. 혼자 두지 않을게요.";

export async function POST(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");
    if (isSessionClosed(session)) return fail("session_expired", "이 수업은 끝났어요.");

    const body = await readJson<{ key?: string }>(request);
    const key = body?.key ?? "";
    const question = (session.activity?.worksheet ?? []).find(
      (q): q is WorksheetQuestion => q.key === key && q.kind === "ai_feedback",
    );
    if (!question) return fail("not_found");

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");
    const artifact = await getArtifact(activityId, me.studentId);
    if (!artifact) return fail("not_found", "먼저 앞 칸에 답을 써 주세요.");

    /*
     * 보낼 것은 **앞 단계에서 쓴 답**을 그대로 가져온다(클라이언트가 보낸 텍스트를 태우지
     * 않는다 — 활동지를 거치지 않은 아무 글이나 이 경로로 흘려보낼 수 없게). 비어 있는 칸이
     * 있으면 부르지 않고 먼저 채우게 안내한다.
     */
    const fields = (question.feedbackFields ?? []).map((f) => ({
      label: f.label,
      value: (artifact.answers?.[f.key] ?? "").trim(),
    }));
    if (fields.length === 0) return fail("not_found");
    if (fields.some((f) => !f.value)) {
      return fail("invalid_input", "먼저 위 칸을 다 채워 주세요. 비어 있는 칸이 있어요.");
    }

    // AI 로 보낼 학생 서술(위기 신호 검사·최소 길이 판정 대상)
    const combined = fields.map((f) => f.value).join("\n");
    if (combined.replace(/\s+/g, "").length < 5) {
      return fail("invalid_input", "조금 더 자세히 써 보고 다시 눌러 주세요.");
    }

    /*
     * 위기 신호 — Gemini 를 부르기 전에 멈춘다. 상한을 세기 전에 검사한다(걸리는 것 자체가
     * 학생 잘못이 아니라 횟수를 깎지 않는다). 학번·시각만 남기고 무엇을 썼는지는 남기지 않는다.
     */
    if (checkCrisis(combined)) {
      await logAiCall({
        studentId: me.studentId,
        lessonNo: session.lessonNo,
        feature: "ai_feedback_blocked",
      }).catch(() => undefined);
      await flagCareAlert(session.id, me.studentId).catch(() => undefined);
      return ok({ blocked: true, message: CRISIS_MESSAGE });
    }

    if (!rateLimit(`aifeedback:${me.studentId}`, PER_STUDENT, WINDOW_MS)) {
      return fail("too_many_attempts", "오늘 AI 피드백을 받을 수 있는 횟수를 다 썼어요.");
    }
    if (!rateLimit(await deviceKey("aifeedback"), PER_DEVICE, WINDOW_MS)) {
      return fail("too_many_attempts", "이 태블릿에서 너무 많이 눌렀어요. 선생님께 알려 주세요.");
    }

    const variant: FeedbackVariant =
      question.feedbackVariant === "conflict"
        ? "conflict"
        : question.feedbackVariant === "empathy"
          ? "empathy"
          : "imessage";
    const feedback = await reviewFeedback(variant, fields);
    if (!feedback) {
      return fail("server_error", "AI가 잠시 대답하지 못하고 있어요. 조금 뒤에 다시 눌러 보세요.");
    }

    await logAiCall({
      studentId: me.studentId,
      sessionId: session.id,
      lessonNo: session.lessonNo,
      feature: "ai_feedback",
    }).catch(() => undefined);

    /*
     * 결과를 활동지 답으로 저장한다(emotion_lens 와 같은 방식). 새 컬렉션을 만들지 않는 이유:
     * 새로고침에도 피드백이 남고, 교사 대시보드·CSV·일괄 삭제가 이미 이 경로를 지나간다.
     * 피드백은 학생 본인의 답에 대한 것이라 친구에게 안 나간다(galleryEnabled: false).
     */
    const result = { feedback, at: Date.now() };
    await updateArtifact(artifact.id, {
      answers: { ...artifact.answers, [key]: JSON.stringify(result) },
    });

    return ok({ blocked: false, result });
  });
}
