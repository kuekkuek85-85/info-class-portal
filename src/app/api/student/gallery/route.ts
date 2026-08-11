import { fail, guard, ok } from "@/lib/api";
import { getArtifact, getSession, listArtifacts, listFeedbacksFor, studentNameMap } from "@/lib/db";
import { assignPeers, displayName, isVisible, toCard } from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";
import { TEACHER_AUTHOR_ID } from "@/lib/types";

/**
 * 작품 감상 — 배정된 2편 + 고를 수 있는 목록 + 내 작품과 받은 피드백.
 *
 * **폴링하지 않는다.** 화면을 열 때 한 번, 피드백을 남긴 뒤 한 번만 부른다.
 * 갤러리를 5초마다 다시 읽으면 28명 × 작품 28개가 그대로 읽기 수가 된다 (PRD 10장 D2).
 *
 * 이름은 서버에서 조인해 "2반 7번 김○○" 문자열 하나로 만들어 내려보낸다.
 * 명렬표가 학생 클라이언트로 내려가는 경로를 만들지 않는다는 원칙 그대로다 (PRD 1).
 */
export async function GET(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const activityId = session.activity?.activityId;
    if (!activityId) return fail("not_found", "이 차시에는 그리기 활동이 없어요.");

    // 같은 반 것만 읽는다. 다른 반 담벼락은 보이지 않는다 (PRD 3.5)
    const all = await listArtifacts(activityId, session.classNo);
    const visible = all.filter(isVisible);

    const wanted = new URL(request.url).searchParams.get("id");

    // ① 자유 선택으로 고른 작품 한 편만 받아 가는 경우
    if (wanted) {
      const picked = visible.find((row) => row.id === wanted);
      if (!picked) return fail("not_found", "그 작품은 지금 볼 수 없어요.");
      if (picked.studentId === me.studentId) return fail("invalid_input", "내 작품이에요.");

      const names = await studentNameMap([picked.studentId]);
      return ok({ card: toCard(picked, displayName(names.get(picked.studentId))) });
    }

    // ② 화면을 처음 열 때 — 배정 2편 + 고를 목록 + 내 작품
    const assigned = assignPeers(visible, me.studentId);
    const mine = await getArtifact(activityId, me.studentId);
    const names = await studentNameMap(visible.map((row) => row.studentId));

    const received = mine ? await listFeedbacksFor([mine.id]) : [];
    const authorNames = await studentNameMap(
      received.map((row) => row.authorId).filter((id) => id !== TEACHER_AUTHOR_ID),
    );

    // 내가 이미 남긴 피드백 — 화면에서 "고치기"로 보여주기 위해
    const myFeedbacks = (await listFeedbacksFor(assigned.map((row) => row.id))).filter(
      (row) => row.authorId === me.studentId,
    );

    return ok({
      assigned: assigned.map((row) => toCard(row, displayName(names.get(row.studentId)))),
      // 목록에는 제목만. 전체 데이터를 다 내려보내면 28편치 획이 한꺼번에 내려간다.
      choices: visible
        .filter((row) => row.studentId !== me.studentId)
        .map((row) => ({
          id: row.id,
          author: displayName(names.get(row.studentId)),
          place: row.place,
          year: row.year,
        })),
      myFeedbacks: myFeedbacks.map((row) => ({
        artifactId: row.artifactId,
        foundTech: row.foundTech,
        question: row.question,
      })),
      mine: mine ? { ...toCard(mine, "내 작품"), status: mine.status } : null,
      received: received.map((row) => ({
        id: row.id,
        from:
          row.authorId === TEACHER_AUTHOR_ID
            ? "선생님"
            : displayName(authorNames.get(row.authorId)),
        foundTech: row.foundTech,
        question: row.question,
        authorReply: row.authorReply ?? "",
      })),
      worksheet: session.activity?.worksheet ?? [],
    });
  });
}
