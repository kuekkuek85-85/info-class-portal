import { fail, guard, ok } from "@/lib/api";
import { getArtifact, getSession, listArtifacts, listFeedbacksFor } from "@/lib/db";
import {
  activityIdFor,
  assignPeers,
  findByPublicId,
  isVisible,
  publicIdOf,
  toCard,
} from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";
import { TEACHER_AUTHOR_ID } from "@/lib/types";

/**
 * 작품 감상 — 배정된 2편 + 고를 수 있는 목록 + 내 작품과 받은 피드백.
 *
 * **폴링하지 않는다.** 화면을 열 때 한 번, 피드백을 남긴 뒤 한 번만 부른다.
 * 갤러리를 5초마다 다시 읽으면 28명 × 작품 28개가 그대로 읽기 수가 된다 (PRD 10장 D2).
 *
 * **누가 그렸는지는 학생에게 알려 주지 않는다.**
 * 처음에는 실명을 붙였다(익명 뒤에 숨어 장난치는 것을 막으려고). 그런데 실제로 해 보니
 * 반대쪽 문제가 컸다 — 그림을 못 그렸다고 생각하는 학생이 자기 이름이 붙는 것을 민망해한다.
 * 장난은 두 칸짜리 정해진 양식과 교사 숨김으로 이미 막고 있고, 교사 화면에서는 누구 것인지
 * 그대로 보인다. 그래서 학생끼리만 익명으로 둔다.
 */
export async function GET(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found", "이 차시에는 그리기 활동이 없어요.");

    // 같은 반 것만 읽는다. 다른 반 담벼락은 보이지 않는다 (PRD 3.5)
    const all = await listArtifacts(activityId, session.classNo);
    const visible = all.filter(isVisible);

    const wanted = new URL(request.url).searchParams.get("id");

    /** 반응 이모지를 세어 붙인다 — 누가 눌렀는지는 내려보내지 않는다 */
    async function reactionsOf(ids: string[], meId: string) {
      const rows = await listFeedbacksFor(ids);
      const map = new Map<string, { counts: Record<string, number>; mine: string }>();
      for (const id of ids) map.set(id, { counts: {}, mine: "" });

      for (const row of rows) {
        const entry = map.get(row.artifactId);
        if (!entry || !row.reaction) continue;
        entry.counts[row.reaction] = (entry.counts[row.reaction] ?? 0) + 1;
        if (row.authorId === meId) entry.mine = row.reaction;
      }
      return map;
    }

    // ① 자유 선택으로 고른 작품 한 편만 받아 가는 경우
    if (wanted) {
      const picked = findByPublicId(visible, wanted);
      if (!picked) return fail("not_found", "그 작품은 지금 볼 수 없어요.");
      if (picked.studentId === me.studentId) return fail("invalid_input", "내 작품이에요.");

      const reactions = await reactionsOf([picked.id], me.studentId);
      return ok({
        card: { ...toCard(picked, ""), ...reactions.get(picked.id) },
      });
    }

    // ② 화면을 처음 열 때 — 배정 2편 + 고를 목록 + 내 작품
    const assigned = assignPeers(visible, me.studentId);
    const mine = await getArtifact(activityId, me.studentId);

    const received = mine ? await listFeedbacksFor([mine.id]) : [];
    const reactions = await reactionsOf(
      [...assigned.map((row) => row.id), ...(mine ? [mine.id] : [])],
      me.studentId,
    );

    // 내가 이미 남긴 피드백 — 화면에서 "고치기"로 보여주기 위해
    const myFeedbacks = (await listFeedbacksFor(assigned.map((row) => row.id))).filter(
      (row) => row.authorId === me.studentId,
    );

    return ok({
      assigned: assigned.map((row) => ({ ...toCard(row, ""), ...reactions.get(row.id) })),
      // 목록에는 제목만. 전체 데이터를 다 내려보내면 28편치 획이 한꺼번에 내려간다.
      choices: visible
        .filter((row) => row.studentId !== me.studentId)
        .map((row, index) => ({
          id: publicIdOf(row.id),
          // 누구 것인지 알리지 않되, 목록에서 서로 구분은 되어야 한다
          author: `작품 ${index + 1}`,
          place: row.place,
          year: row.year,
        })),
      myFeedbacks: myFeedbacks.map((row) => ({
        artifactId: publicIdOf(row.artifactId),
        foundTech: row.foundTech,
        question: row.question,
        reaction: row.reaction ?? "",
      })),
      mine: mine
        ? { ...toCard(mine, "내 작품"), status: mine.status, ...reactions.get(mine.id) }
        : null,
      /*
       * 이모지만 눌렀다가 취소한 문서는 빼고 보낸다.
       * 안 그러면 내용이 하나도 없는 "친구" 칸이 목록에 남아, 무엇을 받았다는 건지
       * 알 수 없는 빈 카드가 쌓인다.
       */
      received: received
        .filter((row) => row.foundTech?.trim() || row.question?.trim() || row.reaction)
        .map((row) => ({
          // 피드백 문서 ID 도 `작품ID__작성자학번` 이라 그대로 내보내면 누가 썼는지 드러난다
          id: publicIdOf(row.id),
          // 받은 쪽도 누가 썼는지 모른다. 선생님 것만 밝힌다.
          from: row.authorId === TEACHER_AUTHOR_ID ? "선생님" : "친구",
          foundTech: row.foundTech,
          question: row.question,
          reaction: row.reaction ?? "",
          authorReply: row.authorReply ?? "",
        })),
      worksheet: session.activity?.worksheet ?? [],
    });
  });
}
