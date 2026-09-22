import { fail, guard, ok } from "@/lib/api";
import { getArtifact, getSession, listFeedbacksFor } from "@/lib/db";
import { activityIdFor } from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";
import { TEACHER_AUTHOR_ID, reactionsOf } from "@/lib/types";

/**
 * 지금까지 **내가 받은** 피드백 셋을 한자리에 모아 돌려준다 (읽기 전용).
 *
 * 발표 준비 차시(「인간과 인공지능」 6차)가 쓴다. 학생은 발표 자료를 만들며 3~5차에 걸쳐
 * 받은 AI·선생님·친구 피드백을 한 표로 참고한다 (received-feedback-panel).
 *
 * ## 본인 것만 나간다 — 다른 학생 신원·성찰은 절대 안 나간다
 *
 * 세 출처 모두 **내 활동지 하나**에서만 읽는다.
 *  · AI      — 내 answers["ai_review"] 에 저장된 JSON {questions, at}
 *  · 선생님   — 내 teacherFeedback {chips, note}
 *  · 친구     — 내 작품(mine.id)에 달린 동료 피드백. 작성자 학번·문서 ID 는 싣지 않고
 *              좋은 점·개선점·이모지만 익명으로 내보낸다 (gallery route 의 received 와 같은 원칙).
 *
 * 갤러리(서로 구경하기)를 끈 차시에서도 돈다 — 이 조회는 남의 작품을 읽지 않으므로
 * galleryEnabled 에 기대지 않는다. 5차까지 같은 활동 ID 라 그때 받은 피드백이 그대로 열린다.
 */
export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");

    const mine = await getArtifact(activityId, me.studentId);
    // 아직 활동지가 없으면 조용히 빈 채로 — 화면은 "아직 받은 피드백이 없어요" 로 물러난다
    if (!mine) return ok({ ai: [], teacher: null, peers: [] });

    // AI — 내 답에 저장된 검토 질문들 (3차 저장)
    let ai: string[] = [];
    const rawAi = mine.answers?.ai_review;
    if (rawAi) {
      try {
        const parsed = JSON.parse(rawAi) as { questions?: unknown };
        if (Array.isArray(parsed.questions)) {
          ai = parsed.questions.filter((q): q is string => typeof q === "string" && q.trim() !== "");
        }
      } catch {
        // 깨진 JSON 이면 AI 칸만 비운다 — 나머지 출처는 그대로 나간다
      }
    }

    // 선생님 — 내 작품에 남긴 교사 검토 (chips + note). 둘 다 비면 없는 것으로 둔다
    const tf = mine.teacherFeedback ?? null;
    const teacher =
      tf && ((tf.chips?.length ?? 0) > 0 || (tf.note ?? "").trim() !== "")
        ? { chips: tf.chips ?? [], note: tf.note ?? "" }
        : null;

    // 친구 — 내 작품에 달린 동료 피드백만. 교사 작성분·빈 문서는 뺀다. 신원은 안 싣는다
    const feedbacks = await listFeedbacksFor([mine.id]);
    const peers = feedbacks
      .filter((row) => row.artifactId === mine.id && row.authorId !== TEACHER_AUTHOR_ID)
      .filter((row) => row.foundTech?.trim() || row.question?.trim() || reactionsOf(row).length > 0)
      .map((row) => ({
        found: row.foundTech ?? "",
        question: row.question ?? "",
        reactions: reactionsOf(row),
      }));

    return ok({ ai, teacher, peers });
  });
}
