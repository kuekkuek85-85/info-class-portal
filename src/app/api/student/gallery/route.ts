import { fail, guard, ok } from "@/lib/api";
import { getArtifact, getSession, listArtifacts, listFeedbacksFor } from "@/lib/db";
import { activityIdFor, assignPeers, isVisible, publicIdOf, toCard } from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";
import { DEFAULT_FEEDBACK_PROMPTS, TEACHER_AUTHOR_ID, reactionsOf } from "@/lib/types";

/**
 * 작품 감상 — 우리 반 작품 전체를 한 번에 내려보낸다.
 *
 * **폴링하지 않는다.** 화면을 열 때 한 번, 피드백을 남긴 뒤 한 번만 부른다.
 * 갤러리를 5초마다 다시 읽으면 28명 × 작품 28개가 그대로 읽기 수가 된다 (PRD 10장 D2).
 *
 * 목록과 상세를 따로 부르지 않는다. 격자에 그림을 늘어놓으려면 어차피 모든 작품의 획이
 * 필요하고, 그것을 받아 두면 카드를 눌렀을 때 다시 물어볼 것이 없다. 한 반 규모에서
 * 획을 다 합쳐도 100KB 안쪽이다.
 *
 * **누가 그렸는지는 학생에게 알려 주지 않는다.**
 * 처음에는 실명을 붙였다(익명 뒤에 숨어 장난치는 것을 막으려고). 그런데 실제로 해 보니
 * 반대쪽 문제가 컸다 — 그림을 못 그렸다고 생각하는 학생이 자기 이름이 붙는 것을 민망해한다.
 * 장난은 두 칸짜리 정해진 양식과 교사 숨김으로 막고, 교사 화면에서는 그대로 보인다.
 */
export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found", "이 차시에는 그리기 활동이 없어요.");

    // 같은 반 것만 읽는다. 다른 반 담벼락은 보이지 않는다 (PRD 3.5)
    const visible = (await listArtifacts(activityId, session.classNo)).filter(isVisible);
    const mine = await getArtifact(activityId, me.studentId);

    // 반응·피드백은 한 번에 모아 읽는다 (작품마다 따로 읽으면 읽기 수가 곱해진다)
    const feedbacks = await listFeedbacksFor([
      ...visible.map((row) => row.id),
      ...(mine ? [mine.id] : []),
    ]);

    /** 작품별 이모지 개수와 내가 누른 것들, 내가 쓴 글 */
    const byArtifact = new Map<
      string,
      {
        counts: Record<string, number>;
        myReactions: string[];
        myFoundTech: string;
        myQuestion: string;
      }
    >();
    for (const row of feedbacks) {
      const entry = byArtifact.get(row.artifactId) ?? {
        counts: {},
        myReactions: [],
        myFoundTech: "",
        myQuestion: "",
      };
      // 한 사람이 여러 개를 누를 수 있다 — 누른 것마다 하나씩 센다
      const picked = reactionsOf(row);
      for (const emoji of picked) entry.counts[emoji] = (entry.counts[emoji] ?? 0) + 1;
      if (row.authorId === me.studentId) {
        entry.myReactions = picked;
        entry.myFoundTech = row.foundTech ?? "";
        entry.myQuestion = row.question ?? "";
      }
      byArtifact.set(row.artifactId, entry);
    }

    const assigned = assignPeers(visible, me.studentId);
    const assignedIds = new Set(assigned.map((row) => row.id));

    const works = visible
      .filter((row) => row.studentId !== me.studentId)
      .map((row) => ({
        ...toCard(row, ""),
        // 꼭 봐야 할 두 편. 자유 선택만 두면 잘 그린 몇 명에게 몰린다 (assignPeers 참조)
        assigned: assignedIds.has(row.id),
        counts: byArtifact.get(row.id)?.counts ?? {},
        myReactions: byArtifact.get(row.id)?.myReactions ?? [],
        myFoundTech: byArtifact.get(row.id)?.myFoundTech ?? "",
        myQuestion: byArtifact.get(row.id)?.myQuestion ?? "",
      }));

    const received = mine ? feedbacks.filter((row) => row.artifactId === mine.id) : [];

    return ok({
      works,
      mine: mine
        ? {
            ...toCard(mine, "내 작품"),
            status: mine.status,
            counts: byArtifact.get(mine.id)?.counts ?? {},
          }
        : null,
      /*
       * 이모지만 눌렀다가 취소한 문서는 빼고 보낸다.
       * 안 그러면 내용이 하나도 없는 "친구" 칸이 목록에 남아, 무엇을 받았다는 건지
       * 알 수 없는 빈 카드가 쌓인다.
       */
      received: received
        .filter((row) => row.foundTech?.trim() || row.question?.trim() || reactionsOf(row).length)
        .map((row) => ({
          // 피드백 문서 ID 도 `작품ID__작성자학번` 이라 그대로 내보내면 누가 썼는지 드러난다
          id: publicIdOf(row.id),
          from: row.authorId === TEACHER_AUTHOR_ID ? "선생님" : "친구",
          foundTech: row.foundTech,
          question: row.question,
          reactions: reactionsOf(row),
          authorReply: row.authorReply ?? "",
        })),
      worksheet: session.activity?.worksheet ?? [],
      // 친구 것에 남기는 두 칸의 질문 — 차시가 정하지 않았으면 그림용 기본값
      feedbackPrompts: session.activity?.feedbackPrompts ?? DEFAULT_FEEDBACK_PROMPTS,
      /** 필터에 쓸 장소 목록 — 실제로 그린 장소만 (빈 칸을 보여줄 이유가 없다) */
      places: [...new Set(visible.map((row) => row.place).filter(Boolean))].sort(),
    });
  });
}
