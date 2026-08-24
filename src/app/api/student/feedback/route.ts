import { deviceKey, fail, guard, ok, rateLimit, readJson } from "@/lib/api";
import {
  getArtifact,
  getSession,
  isSessionClosed,
  listArtifacts,
  listFeedbacksFor,
  replyToFeedback,
  upsertFeedback,
} from "@/lib/db";
import { activityIdFor, findByPublicId, isVisible, publicIdOf } from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";
import { isReaction } from "@/lib/types";

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

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found", "이 차시에는 그리기 활동이 없어요.");

    const body = await readJson<{
      artifactId?: string;
      foundTech?: string;
      question?: string;
      /** 지금 눌러 둔 이모지 전부. 화면이 통째로 보내고 서버는 그대로 덮어쓴다 */
      reactions?: string[];
      /** 내가 받은 피드백에 다는 한 줄 답 */
      replyTo?: string;
      reply?: string;
    }>(request);
    if (!body) return fail("invalid_input");

    // ---------------------------------------- 내가 받은 피드백에 답하기
    if (body.replyTo) {
      const mine = await getArtifact(activityId, me.studentId);
      if (!mine) return fail("not_found");

      // 내 작품에 달린 피드백인지 확인한다 — 남의 것에 답을 달 수 없게.
      // 화면이 보내오는 것은 익명화된 번호라, 내 작품의 피드백 안에서만 찾는다.
      const feedbacks = await listFeedbacksFor([mine.id]);
      const target = feedbacks.find((row) => publicIdOf(row.id) === body.replyTo);
      if (!target) return fail("not_found", "그 피드백을 찾을 수 없어요.");

      await replyToFeedback(target.id, String(body.reply ?? "").trim().slice(0, MAX_LENGTH));
      return ok();
    }

    // ------------------------------------------------ 친구 작품에 남기기
    if (!body.artifactId) return fail("invalid_input");

    // 감정을 쓰는 차시는 서로 주고받는 것 자체가 없다 (gallery 라우트와 같은 이유)
    if (session.activity?.galleryEnabled === false) {
      return fail("not_found", "이 수업에서는 서로 구경하기를 하지 않아요.");
    }

    /*
     * 학생이 보내오는 것은 진짜 문서 ID 가 아니라 되돌릴 수 없는 작품 번호다(익명화).
     * 그래서 같은 반의 볼 수 있는 작품만 모아 놓고 그 안에서 찾는다 —
     * 목록을 좁혀서 찾는 것 자체가 "볼 수 없는 작품에는 남길 수 없다"는 검사가 된다.
     */
    const visible = (await listArtifacts(activityId, session.classNo)).filter(isVisible);
    const target = findByPublicId(visible, body.artifactId);
    if (!target) return fail("not_found", "그 작품은 지금 볼 수 없어요.");

    if (target.studentId === me.studentId) {
      return fail("invalid_input", "내 작품에는 남길 수 없어요.");
    }

    /*
     * 보내온 칸만 고친다.
     *
     * 이모지 버튼과 글 입력은 서로 다른 요청으로 온다. 매번 전부 덮어쓰면 이모지를
     * 누르는 순간 이미 써 둔 글이 지워진다.
     */
    const patch: {
      foundTech?: string;
      question?: string;
      reactions?: string[];
    } = {};

    if (typeof body.foundTech === "string") {
      patch.foundTech = body.foundTech.trim().slice(0, MAX_LENGTH);
    }
    if (typeof body.question === "string") {
      patch.question = body.question.trim().slice(0, MAX_LENGTH);
    }
    if (Array.isArray(body.reactions)) {
      /*
       * 목록에 없는 이모지는 버린다. 자유 입력이면 이모지 칸이 또 하나의 댓글창이 된다.
       * 빈 배열은 "다 껐다" 는 뜻이라 그대로 통과시킨다.
       */
      patch.reactions = [...new Set(body.reactions.filter((r) => typeof r === "string" && isReaction(r)))];
    }

    if (Object.keys(patch).length === 0) {
      return fail("invalid_input", "한 가지는 남겨 주세요.");
    }

    await upsertFeedback({
      artifactId: target.id,
      authorId: me.studentId,
      ownerId: target.studentId,
      classNo: session.classNo,
      ...patch,
    });

    // 문서 ID 는 돌려주지 않는다 — 학번이 들어 있고, 화면에서 쓰지도 않는다
    return ok();
  });
}
