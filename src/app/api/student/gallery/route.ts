import { fail, guard, ok } from "@/lib/api";
import {
  flagCareAlert,
  getArtifact,
  getSession,
  listArtifacts,
  listFeedbacksFor,
} from "@/lib/db";
import { checkCrisis } from "@/lib/emotion-lens";
import {
  activityIdFor,
  assignPeers,
  inViewingOrder,
  isVisible,
  publicIdOf,
  toCard,
} from "@/lib/gallery";
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
/** 위기 신호로 가린 학생을 교사에게 이미 알렸는지. `수업:학번` */
const flagged = new Set<string>();

export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found", "이 차시에는 그리기 활동이 없어요.");

    /*
     * 감정을 쓰는 차시는 서로 구경하기를 열지 않는다.
     *
     * 화면 쪽에서 이미 탭을 안 만들지만 여기서 한 번 더 막는다 — 주소를 직접 치면
     * 그만인 화면 검사와 달리, 이 줄이 없으면 마음 이야기가 실제로 나간다.
     */
    if (session.activity?.galleryEnabled === false) {
      return fail("not_found", "이 수업에서는 서로 구경하기를 하지 않아요.");
    }

    /** 친구에게 보여줄 답 칸. 안 정했으면 지금까지처럼 전부 (types.ts 의 galleryAnswerKeys) */
    const allowKeys = session.activity?.galleryAnswerKeys;

    // 같은 반 것만 읽는다. 다른 반 담벼락은 보이지 않는다 (PRD 3.5)
    const all = (await listArtifacts(activityId, session.classNo)).filter(isVisible);
    const mine = await getArtifact(activityId, me.studentId);

    /*
     * 친구에게 넘어가기 전에 위기 신호를 거른다.
     *
     * 감정을 나누는 차시에서는 학생이 쓴 글이 그대로 친구에게 간다. "죽고 싶다" 가
     * 담긴 줄이 스물두 명에게 걸리면, 그 뒤에 일어나는 일을 교사가 통제할 수 없다.
     * 본인 화면에는 그대로 보이고(자기 글은 자기 것이다), 친구 목록에서만 빠진다.
     *
     * 감정 렌즈와 같은 문턱을 쓴다 — 거기서만 막고 여기는 열어 두면 앞문을 잠그고
     * 뒷문을 연 셈이 된다. 공유하는 칸만 검사한다.
     */
    const shared = (row: (typeof all)[number]) =>
      (allowKeys ?? Object.keys(row.answers ?? {}))
        .map((k) => row.answers?.[k] ?? "")
        .join("\n");

    const visible: typeof all = [];
    for (const row of all) {
      if (!checkCrisis(shared(row))) {
        visible.push(row);
        continue;
      }
      /*
       * 가리는 것만으로는 모자라다. 그 학생은 친구 목록에서 빠지므로 아무 말도 못
       * 받는데, 정작 도움이 필요한 사람이 혼자 남는 셈이 된다. 교사에게 알린다.
       *
       * 이 화면은 스물두 명이 번갈아 폴링하므로 한 번만 세도록 기억해 둔다.
       * 서버 인스턴스마다 따로 놀아서 몇 번 더 셀 수는 있는데, 못 세는 것보다 낫다.
       */
      const once = `${session.id}:${row.studentId}`;
      if (!flagged.has(once)) {
        flagged.add(once);
        await flagCareAlert(session.id, row.studentId).catch(() => undefined);
      }
    }

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

    /*
     * 학번 순서를 여기서 끊는다.
     *
     * visible 은 listArtifacts 가 준 학번 순이다. 그 차례 그대로 내보내면 이름을 가려도
     * 자기 자리만 찾으면 앞뒤가 누구인지 다 따라온다 (inViewingOrder 참조).
     * 배정(assigned)은 학번 순 위에서 계산해 둔 뒤라 차례를 바꿔도 그대로 붙어 간다.
     */
    const works = inViewingOrder(
      visible
        .filter((row) => row.studentId !== me.studentId)
        .map((row) => ({
          // 정해진 답 칸만 싣는다 — 감정 낱말은 열고 경험 글은 닫는다
          ...toCard(row, "", allowKeys),
          // 꼭 봐야 할 두 편. 자유 선택만 두면 잘 그린 몇 명에게 몰린다 (assignPeers 참조)
          assigned: assignedIds.has(row.id),
          /** 이 활동지가 어느 필터에 걸리는가. 화면은 이것만 보고 거른다 */
          facetValues: facetValuesOf(row, session),
          counts: byArtifact.get(row.id)?.counts ?? {},
          myReactions: byArtifact.get(row.id)?.myReactions ?? [],
          myFoundTech: byArtifact.get(row.id)?.myFoundTech ?? "",
          myQuestion: byArtifact.get(row.id)?.myQuestion ?? "",
        })),
    );

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
      /**
       * 친구에게 열어 둔 답 칸의 차례. 화면은 카드 요약을 이 차례로 그린다.
       * 안 정한 차시에서는 비어 있고, 지금까지처럼 필터 값으로 요약한다.
       */
      sharedKeys: allowKeys ?? [],
      // 친구 것에 남기는 두 칸의 질문 — 차시가 정하지 않았으면 그림용 기본값
      feedbackPrompts: session.activity?.feedbackPrompts ?? DEFAULT_FEEDBACK_PROMPTS,
      /** 왼쪽 필터를 무엇으로 세울지. 차시마다 다르다 (facetsFor 참조) */
      facets: facetsFor(session, visible),
    });
  });
}
