import { deviceKey, fail, guard, ok, rateLimit, readJson } from "@/lib/api";
import {
  feedbackId,
  getArtifactById,
  getArtifact,
  getSession,
  isSessionClosed,
  listFeedbacksFor,
  replyToFeedback,
  upsertFeedback,
} from "@/lib/db";
import { isVisible } from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";

/**
 * 작품 피드백.
 *
 * **자유 댓글이 아니다.** 칸이 두 개뿐이고 둘 다 무엇을 쓸지 정해져 있다 —
 * "그림에서 찾은 기술 하나", "궁금한 점 하나". 자유 입력이면 장난 글과 저격이 반드시
 * 들어오고, 그걸 관리하려면 신고·삭제·차단을 만들어야 한다. 9월에 사이버 폭력을 가르치는
 * 수업에서 플랫폼이 그 사고를 만들면 곤란하다 (PRD 3.5, 9장).
 *
 * 작품당 한 명이 한 장. 문서 ID 가 `작품ID__작성자학번` 이라 여러 장이 쌓이지 않는다.
 */

const MAX_LENGTH = 200;

export async function POST(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    if (!rateLimit(await deviceKey("feedback"), 60, 60_000)) {
      return fail("too_many_attempts");
    }

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");
    if (isSessionClosed(session)) {
      return fail("session_expired", "수업이 끝나서 저장할 수 없어요.");
    }

    const activityId = session.activity?.activityId;
    if (!activityId) return fail("not_found", "이 차시에는 그리기 활동이 없어요.");

    const body = await readJson<{
      artifactId?: string;
      foundTech?: string;
      question?: string;
      /** 내가 받은 피드백에 다는 한 줄 답 */
      replyTo?: string;
      reply?: string;
    }>(request);
    if (!body) return fail("invalid_input");

    // ---------------------------------------- 내가 받은 피드백에 답하기
    if (body.replyTo) {
      const mine = await getArtifact(activityId, me.studentId);
      if (!mine) return fail("not_found");

      // 내 작품에 달린 피드백인지 확인한다 — 남의 것에 답을 달 수 없게
      const feedbacks = await listFeedbacksFor([mine.id]);
      const target = feedbacks.find((row) => row.id === body.replyTo);
      if (!target) return fail("not_found", "그 피드백을 찾을 수 없어요.");

      await replyToFeedback(target.id, String(body.reply ?? "").trim().slice(0, MAX_LENGTH));
      return ok();
    }

    // ------------------------------------------------ 친구 작품에 남기기
    if (!body.artifactId) return fail("invalid_input");

    const target = await getArtifactById(body.artifactId);
    if (!target) return fail("not_found");

    // 같은 활동·같은 반·제출됨·숨김 아님. 하나라도 어긋나면 볼 수 없는 작품이다.
    if (
      target.activityId !== activityId ||
      target.classNo !== session.classNo ||
      !isVisible(target)
    ) {
      return fail("not_found", "그 작품은 지금 볼 수 없어요.");
    }
    if (target.studentId === me.studentId) {
      return fail("invalid_input", "내 작품에는 남길 수 없어요.");
    }

    const foundTech = String(body.foundTech ?? "").trim().slice(0, MAX_LENGTH);
    const question = String(body.question ?? "").trim().slice(0, MAX_LENGTH);
    if (!foundTech && !question) {
      return fail("invalid_input", "두 칸 중 하나는 적어 주세요.");
    }

    await upsertFeedback({
      artifactId: target.id,
      authorId: me.studentId,
      ownerId: target.studentId,
      classNo: session.classNo,
      foundTech,
      question,
    });

    return ok({ id: feedbackId(target.id, me.studentId) });
  });
}
