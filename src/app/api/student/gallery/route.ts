import { fail, guard, ok } from "@/lib/api";
import { getArtifact, getSession, listArtifacts, listFeedbacksFor } from "@/lib/db";
import { activityIdFor, assignPeers, isVisible, publicIdOf, toCard } from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";
import {
  DEFAULT_FEEDBACK_PROMPTS,
  TEACHER_AUTHOR_ID,
  TRAITS,
  reactionsOf,
  type Artifact,
  type ClassSession,
} from "@/lib/types";

/**
 * 왼쪽 필터를 무엇으로 세울지.
 *
 * 차시가 정해 두었으면(galleryFacets) 활동지에 적힌 말을 그대로 항목으로 쓴다.
 * 안 정했으면 그림 활동 기준 — 특성과 장소다.
 *
 * 특성은 아무도 안 고른 것까지 다섯 개를 다 세운다. 고정된 다섯 가지를 배우는 것이
 * 활동의 일부라, 우리 반이 뭘 안 골랐는지도 보이는 편이 낫다. 반대로 장소나 직업은
 * 학생이 적어 넣은 말이라 **실제로 나온 것만** 세운다 — 없는 항목은 누르면 빈 화면이다.
 */
function facetValuesOf(row: Artifact, session: ClassSession): Record<string, string[]> {
  const config = session.activity?.galleryFacets;
  if (config?.length) {
    return Object.fromEntries(
      config.map((facet) => [facet.key, answerValues(row, facet.answerKeys)]),
    );
  }
  return { traits: row.traits ?? [], place: row.place ? [row.place] : [] };
}

/** 활동지의 여러 칸에서 적힌 말을 모은다. 빈 칸과 앞뒤 공백은 버린다 */
function answerValues(row: Artifact, keys: string[]): string[] {
  const seen = new Set<string>();
  for (const key of keys) {
    const value = String(row.answers?.[key] ?? "")
      .replace(/\s+/g, " ")
      .trim();
    // 한 사람이 같은 말을 두 칸에 적으면 한 번만 센다
    if (value) seen.add(value);
  }
  return [...seen];
}

/**
 * 필터에 세울 항목 수 상한.
 *
 * 한 반 스물여덟 명이 세 칸씩 적으면 서로 다른 말이 예순 개까지 나온다. 그것을 다
 * 세우면 체크박스를 지나는 데만 화면 몇 개가 걸리고, 정작 볼 활동지는 저 아래에 있다.
 * 많이 나온 것부터 세우고, 잘린 개수는 화면에 적는다.
 */
const MAX_OPTIONS = 10;

function facetsFor(session: ClassSession, visible: Artifact[]) {
  const config = session.activity?.galleryFacets;

  if (config?.length) {
    return config.map((facet) => {
      const counts = new Map<string, number>();
      for (const row of visible) {
        for (const value of answerValues(row, facet.answerKeys)) {
          counts.set(value, (counts.get(value) ?? 0) + 1);
        }
      }
      const sorted = [...counts.entries()]
        // 많이 적힌 것부터. 같으면 가나다순이라 순서가 매번 같다
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([value, count]) => ({ value, count }));

      return {
        key: facet.key,
        label: facet.label,
        options: sorted.slice(0, MAX_OPTIONS),
        hidden: Math.max(0, sorted.length - MAX_OPTIONS),
        /*
         * 활동지에 쓴 말에서 나온 묶음이다 — 카드 요약에도 그대로 쓸 수 있다.
         * 아래 특성·장소는 카드에 이미 따로 나오므로 요약에 또 적으면 같은 말이 두 번이다.
         */
        fromAnswers: true,
      };
    });
  }

  const places = [...new Set(visible.map((row) => row.place).filter(Boolean))].sort();
  return [
    {
      key: "traits",
      label: "디지털 사회의 특성",
      options: TRAITS.map((trait) => ({
        value: trait,
        count: visible.filter((row) => (row.traits ?? []).includes(trait)).length,
      })),
      hidden: 0,
      fromAnswers: false,
    },
    {
      key: "place",
      label: "장소",
      options: places.map((place) => ({
        value: place,
        count: visible.filter((row) => row.place === place).length,
      })),
      hidden: 0,
      fromAnswers: false,
    },
  ].filter((facet) => facet.options.length > 0);
}

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
        /** 이 활동지가 어느 필터에 걸리는가. 화면은 이것만 보고 거른다 */
        facetValues: facetValuesOf(row, session),
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
      /** 왼쪽 필터를 무엇으로 세울지. 차시마다 다르다 (facetsFor 참조) */
      facets: facetsFor(session, visible),
    });
  });
}
