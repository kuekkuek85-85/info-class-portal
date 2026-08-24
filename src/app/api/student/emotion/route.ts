import { deviceKey, fail, guard, ok, rateLimit, readJson } from "@/lib/api";
import {
  flagCareAlert,
  getArtifact,
  getSession,
  isSessionClosed,
  logAiCall,
  updateArtifact,
} from "@/lib/db";
import { checkCrisis, guessEmotion } from "@/lib/emotion-lens";
import { activityIdFor } from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";
import type { WorksheetQuestion } from "@/lib/types";

/**
 * AI 감정 렌즈 — 학생이 쓴 경험 글을 Gemini 에 보내고 감정 추측을 받아 온다.
 *
 * **학번·이름은 보내지 않는다.** 활동지에 쓴 글 텍스트만 넘어간다 (개인정보처리방침 §7).
 *
 * **본문은 어디에도 로그로 남기지 않는다.** 감정 텍스트는 성찰과 같은 등급이다 —
 * 남는 것은 "언제 이 기능을 불렀는가" 뿐이다.
 *
 * ## 위기 신호는 Gemini 앞에서 멈춘다
 *
 * 자·타해 암시가 있으면 **호출 자체를 하지 않고** 교사와 이야기하자는 안내만 띄운다.
 * 보내고 나서 거르면 글은 이미 밖으로 나갔고, AI가 만든 위로 문구를 학생이 먼저 읽어
 * "이걸로 끝났다" 고 느낀다. 여기서 필요한 것은 답이 아니라 교사와의 연결이다.
 * 학생 글 원문은 활동지에 그대로 남아 있으므로, 판단은 그것을 읽은 교사가 한다 (PRD 5.4).
 */

/** 학번 기준 — 한 시간에 5회. 글을 고쳐 가며 다시 물어보는 것까지는 열어 둔다 */
const PER_STUDENT = 5;
/**
 * 기기 기준 이중 상한.
 *
 * 학번 상한만 두면 태블릿을 그대로 두고 다른 학번으로 다시 들어가는 것으로 우회된다.
 * 한 대에서 나갈 수 있는 총량을 따로 막는다 — 22명이 한 교실에서 쓰는 기능이라
 * 넉넉하게 잡되, 한 대가 수십 번 두드리는 것은 걸리는 수준으로 둔다.
 */
const PER_DEVICE = 12;
const WINDOW_MS = 60 * 60_000;

export async function POST(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");
    if (isSessionClosed(session)) {
      return fail("session_expired", "이 수업은 끝났어요.");
    }

    const body = await readJson<{ key?: string }>(request);
    const key = body?.key ?? "";
    const question = (session.activity?.worksheet ?? []).find(
      (q): q is WorksheetQuestion => q.key === key && q.kind === "emotion_lens",
    );
    if (!question) return fail("not_found");

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");
    const artifact = await getArtifact(activityId, me.studentId);
    if (!artifact) return fail("not_found", "먼저 앞 칸에 글을 써 주세요.");

    /*
     * 보낼 글은 **앞 단계에서 쓴 것**을 그대로 가져온다. 렌즈 화면에서 새로 받지 않는다 —
     * 클라이언트가 보낸 텍스트를 그대로 AI 에 태우면, 활동지를 거치지 않은 아무 글이나
     * 이 경로로 흘려보낼 수 있게 된다.
     */
    const text = (artifact.answers?.[question.lensSourceKey ?? ""] ?? "").trim();
    if (text.length < 10) {
      return fail("invalid_input", "앞 칸에 있었던 일을 두세 문장으로 먼저 써 주세요.");
    }

    /*
     * 위기 신호 — Gemini 를 부르기 전에 멈춘다.
     *
     * 상한을 세기 전에 검사한다. 여기서 걸린 학생의 횟수를 깎으면, 글을 고쳐 다시 쓸 때
     * 쓸 수 있는 기회가 줄어든다. 걸리는 것 자체가 학생 잘못이 아니다.
     */
    if (checkCrisis(text)) {
      // 학번과 시각만 남긴다. 무엇을 썼는지는 남기지 않는다
      await logAiCall({
        studentId: me.studentId,
        lessonNo: session.lessonNo,
        feature: "emotion_lens_blocked",
      }).catch(() => undefined);

      /*
       * 교사 대시보드에 띄운다.
       *
       * 이게 없으면 교사가 알 방법이 없다 — 학생 화면에는 "선생님과 이야기하자" 만
       * 뜨는데, 그 학생이 손을 들지 않으면 아무 일도 일어나지 않는다. 정작 손을 들기
       * 어려워하는 학생일수록 그렇다. 안내를 띄우는 것과 교사에게 닿는 것은 다른 일이다.
       */
      await flagCareAlert(session.id, me.studentId).catch(() => undefined);

      return ok({
        blocked: true,
        message:
          "이건 AI보다 선생님과 직접 이야기하는 게 좋겠어요.\n" +
          "지금 조용히 손을 들어 주거나, 수업이 끝나고 남아 주세요. 혼자 두지 않을게요.",
      });
    }

    if (!rateLimit(`emotion:${me.studentId}`, PER_STUDENT, WINDOW_MS)) {
      return fail(
        "too_many_attempts",
        "오늘 AI에게 물어볼 수 있는 횟수를 다 썼어요. 이제 내 마음은 내가 적어 볼까요?",
      );
    }
    if (!rateLimit(await deviceKey("emotion"), PER_DEVICE, WINDOW_MS)) {
      return fail("too_many_attempts", "이 태블릿에서 너무 많이 눌렀어요. 선생님께 알려 주세요.");
    }

    const guess = await guessEmotion(text);
    if (!guess) {
      return fail("server_error", "AI가 잠시 대답하지 못하고 있어요. 조금 뒤에 다시 눌러 보세요.");
    }

    await logAiCall({
      studentId: me.studentId,
      lessonNo: session.lessonNo,
      feature: "emotion_lens",
    }).catch(() => undefined);

    /*
     * 결과를 활동지 답으로 저장한다. 새 컬렉션을 만들지 않는 이유:
     * 교사 대시보드·CSV 내보내기·일괄 삭제가 전부 이미 이 경로를 지나간다.
     */
    const result = { guess, at: Date.now() };
    await updateArtifact(artifact.id, {
      answers: { ...artifact.answers, [key]: JSON.stringify(result) },
    });

    return ok({ blocked: false, result });
  });
}
