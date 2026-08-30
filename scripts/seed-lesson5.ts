/**
 * 5차시 차시 계획 등록.
 *
 *   node --env-file=.env.local scripts/seed-lesson5.ts
 *
 * ## 이 차시가 하려는 것
 *
 * 진로 보고서를 쓰게 하는 것이 아니다. **내 직업을 조각으로 쪼개고, 조각마다 인공지능이
 * 가져갈지를 스스로 판정하게** 하는 것이다.
 *
 * "요리사가 사라질까?" 는 답이 안 나온다. 학생은 "안 사라져요" 라고 쓰고 끝낸다. 그런데
 * 재료 손질 · 조리 · 메뉴 개발로 쪼개 놓고 각각 물으면, 손질은 이미 기계가 하고 조리는
 * 반쯤이고 메뉴 개발은 사람이 한다는 것이 자기 손으로 나온다. 그 순간 학생은
 * **"내 직업이 통째로 사라지진 않지만 내가 하려던 일의 3분의 1은 이미 없다"** 를 발견한다.
 * 남이 말해 준 것이 아니라 자기가 쪼개서 나온 결론이라 반박할 수가 없다.
 *
 * 이 설계는 절망으로 끝나지도 않는다. 쪼개면 반드시 "사람이 계속할 조각" 이 남고,
 * 준비할 것이 거기서 나온다. 중1에게 "네 꿈은 사라진다" 만 남기면 그 수업은 실패다.
 *
 * ## 정보 교과의 분해다
 *
 * 프로그램을 짤 때 문제를 쪼개는 이유 중 하나가 "어느 부분을 컴퓨터에 시킬 수 있는지
 * 보려고" 다. 학생이 오늘 하는 일이 정확히 그것이다. 소재만 자기 인생일 뿐이다.
 * 그래서 문항 문구도 "세 가지 적으세요" 가 아니라 "분해해 보세요" 로 쓴다 —
 * 학생 머릿속에서 다른 작업이 된다.
 *
 * 안내에서는 **추상화**라고 부른다. 이 학교 교육과정에서 쪼개기를 배우는 단원 이름이
 * 그것이라, 학생이 실제로 들은 말로 불러 줘야 "아, 그거" 가 된다. 문항의 동사는
 * "분해해 보세요" 그대로 둔다 — 지금 손으로 하는 동작은 쪼개는 것이다.
 *
 * ## 45분 (8/24 부터 단축 없음)
 *
 *    0–4   대기 게임 · 기분
 *    4–8   도입: 교사 직업을 함께 분해해 보기 (공유 화면)
 *    8–10  활동 설명 · 검색/AI 사용법 · 출처 규칙
 *   10–28  개인 작성 (18분) — 오픈북
 *   28–36  활동지 감상: 친구가 안 쪼갠 조각 보태기 (8분)
 *   36–41  교사가 서너 개 골라 읽기
 *   41–45  성찰 · 정리
 *
 * 발표는 넣지 않는다. 28명 × 1분이면 28분이라 수업이 발표만으로 끝나고, 대표를 뽑으면
 * 서열이 생긴다 (PRD 9장 — 갤러리를 익명으로 두고 순위를 안 만든 것과 같은 이유).
 * 대신 익명 갤러리에서 서로 조각을 보태게 한다. 잔인함을 교사가 아니라 친구가 준다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import type { LessonPlan, PhaseContent, WorksheetQuestion } from "../src/lib/types.ts";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`✗ 환경변수 ${name} 가 없습니다. --env-file=.env.local 을 붙였는지 확인하세요.`);
    process.exit(1);
  }
  return value;
}

const app = initializeApp({
  credential: cert({
    projectId: requiredEnv("FIREBASE_PROJECT_ID"),
    clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
    privateKey: requiredEnv("FIREBASE_PRIVATE_KEY").replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

/** 4차시(future-job)와 **다른** 값. 5차시는 새 활동지다 */
const ACTIVITY_ID = "career-plan";
/** 지난 차시에 쓴 답을 불러올 곳 */
const LESSON4_ACTIVITY_ID = "future-job";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/**
 * 예상 보기 셋.
 *
 * "곧 / 나중에 / 사람이 계속" 으로만 두면 중1은 근거 없이 찍는다. 보기 문구 앞에
 * **이유를 붙여 두면** 고르는 순간 근거를 함께 고르게 된다.
 *
 * 처음에는 "순서가 정해져 있어서 / 상황 따라 판단해야 해서" 로 적었다. 자동화 가능성을
 * 가르는 기준(알고리즘으로 쓸 수 있는가)을 보기에 넣으려던 것인데, 중1이 읽기에 너무
 * 추상적이라 걷어냈다. 그 기준은 바로 다음 칸("왜 그렇게 봤나요?")의 예시로 옮겼다 —
 * 고르는 것은 쉽게, 이유는 자기 말로.
 *
 * 가운데 보기가 **협업 구간**이다. 인공지능을 써서 더 잘하게 되는 직업이 실제로 많은데,
 * 이걸 네 번째 보기로 따로 두면 학생 대부분이 그걸 고른다 — 편하니까. 그러면 오늘 만들려던
 * 정직함이 통째로 사라진다. 협업은 판정이 아니라 판정 **다음에** 오는 질문이라(4번 문항),
 * 보기는 셋으로 둔다.
 */
const VERDICTS = [
  "인공지능이 잘하는 일이라서 — 인공지능이 곧 가져간다",
  "인공지능과 협업해야 해서 — 인공지능을 활용하거나 같이 협업해서 한다",
  "인공지능이 못하는 일이라서 — 인간이 계속한다",
];

/** 과업 한 조각 = 세 칸 (이름 · 판정 · 근거) */
function taskFields(n: number): WorksheetQuestion[] {
  return [
    {
      key: `task${n}`,
      label: `${n}번째 일`,
      hint: n === 1 ? "예) 재료 손질 / 진료 기록 정리 / 그림 채색" : "",
      kind: "text",
      maxLength: 30,
    },
    {
      key: `task${n}_ai`,
      label: `↳ 이 일은 인공지능이 가져갈까요?`,
      hint: "",
      kind: "choice",
      choices: VERDICTS,
      maxLength: 0,
    },
    {
      key: `task${n}_why`,
      label: `↳ 왜 그렇게 예상했나요?`,
      /*
       * 자동화 가능성을 가르는 기준을 예시로 흘려 넣는다.
       * "정해진 순서대로 하는 일이냐, 그때그때 판단해야 하는 일이냐" 가 결국
       * "알고리즘으로 쓸 수 있느냐" 다. 설명하지 않고 예시 두 줄로 보여 준다.
       */
      hint:
        n === 1
          ? "예) 늘 같은 순서로 하는 일이라서 로봇이 이미 하고 있어요\n예) 손님마다 다르게 해야 해서 인공지능은 어려울 것 같아요"
          : "",
      kind: "text",
      maxLength: 80,
    },
  ];
}

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: 5,
  title: "내 직업 분해하기 — 인공지능은 어디까지 올까",
  moodCheckEnabled: true,

  // 4차시와 같은 게임. 태블릿 부팅과 주소 오타로 도착 시각이 5분씩 벌어진다.
  game: {
    heading: "기다리는 동안 — 2048",
    body: "같은 숫자끼리 밀어서 합치세요.\n2048을 만들면 끝나지만, 오늘은 512만 넘어도 잘한 거예요.",
    url: "https://2048-game-gilt-kappa.vercel.app/",
  },
  gameExplainer: empty(),

  /*
   * 도입은 화면이 아니라 **선생님이 직접** 한다.
   *
   * 공유 화면에 교사 직업을 띄워 놓고 함께 쪼갠다.
   *
   *   ① 수업 자료 만들기  → 인공지능과 나눠서 한다 (AI가 초안, 내가 고친다)
   *   ② 수업 진행         → 사람이 계속한다
   *   ③ 채점 · 기록       → 인공지능이 곧 가져간다
   *   ④ 상담 · 관계       → 사람이 계속한다
   *
   * 효과가 셋이다. 활동지 쓰는 법 시범이 되고, 분해 복습이 되고, **어른이 자기 직업의
   * 일부가 자동화된다고 먼저 인정한다.** 마지막이 크다. 먼저 정직해야 학생도 자기 꿈에
   * 대해 정직해진다.
   *
   * 영상은 넣지 않는다 — 45분에 자리가 없고, 4차시에서 이미 봤다.
   */
  progress: empty(),
  assessment: empty(),
  video: empty(),

  /*
   * 성찰은 한 문항이다.
   *
   * 두 문항이면 4분에 둘 다 얕아진다. 오늘 활동은 분해에서 결론까지 가는 것이 전부라,
   * 그 길을 한 번 더 되짚는 질문 하나가 낫다. 앞부분("어떤 조각이 넘어가고 어떤 조각이
   * 남던가")이 교과 개념을 닫고, 뒷부분("무엇을 바꾸기로 했는지")이 활동을 닫는다.
   */
  reflectionQuestions: [
    "오늘 내 희망 직업이 하는 일을 세 가지로 나눠 보았지요.\n그중 인공지능이 가져갈 것 같은 일은 무엇이었고, 인간이 계속할 것 같은 일은 무엇이었나요?\n그리고 그것 때문에 내가 무엇을 바꾸기로 했는지 적어 주세요.",
  ],
  reflectionPublic: false,

  /*
   * 활동지를 쓰는 동안은 이탈로 세지 않는다.
   *
   * 오픈북 활동이라 검색하고 AI에게 묻는 것이 **활동 자체**다. 그걸 이탈로 세면 기록이
   * 온통 빨갛게 되고, 그 기록은 아무 의미가 없다. 더 나쁜 것은 학생이 눈치를 보느라
   * 안 찾아보는 것이다.
   */
  focusExempt: ["worksheet"],
  phaseLabels: {
    gallery: "활동지 감상",
  },

  activity: {
    activityId: ACTIVITY_ID,
    // 그리기가 없는 차시. 장소를 비우면 그리기 화면이 안 뜬다.
    places: [],
    year: 2040,

    /*
     * 4차시에 쓴 답을 활동지 위에 띄운다.
     *
     * 5차시는 "내 희망 직업" 에서 출발하는데 그 답은 이미 4차시에 있다. 다시 쓰라고 하면
     * 진로가 없어서가 아니라 지난주에 겨우 정한 것을 또 떠올려야 해서 막히는 학생이 나온다.
     * 희망 직업이 없는 학생은 AI가 추천한 직업으로 대신할 수 있다.
     */
    carryOver: {
      activityId: LESSON4_ACTIVITY_ID,
      heading: "지난 시간에 이렇게 적었어요",
      fields: [
        { key: "my_job", label: "내가 되고 싶던 직업" },
        { key: "ai_job", label: "AI가 추천해 준 직업" },
      ],
    },

    sourceHints: {
      site: "예) 워크넷 — 요리사 직업 전망",
      ai: "예) 챗지피티 — 요리사가 하는 일을 나눠서 알려줘",
    },

    /*
     * 감상 필터.
     *
     * 하나면 충분하다. 학생이 가장 하고 싶어 하는 일이 "나랑 같은 직업을 고른 친구 찾기" 다.
     * 판정 결과로도 거르고 싶지만 과업 이름이 사람마다 달라 항목이 스물여덟 개가 된다.
     */
    galleryFacets: [{ key: "job", label: "희망 직업", answerKeys: ["job"] }],

    /*
     * 친구 것을 보고 남기는 두 칸.
     *
     * 처음에는 "놓친 위협" 이라고 적었다가 걷어냈다. 중1이 안 쓰는 한자어이고, 학생이 실제로
     * 하는 일과도 다르다 — 친구를 위협하는 것이 아니라 **못 쪼갠 조각을 보태 주는** 것이다.
     * 무엇보다 라벨이 무서우면 학생이 움츠러들어 순한 말만 쓴다.
     * 날카로운 답은 평범한 말로 물어야 나온다.
     *
     * 첫 칸은 보태기, 둘째 칸은 이견이다. 둘 다 공격이면 부담이 크고, 둘 다 순하면 아무
     * 일도 안 일어난다. 둘째 칸이 실제로 아픈 칸인데 "네가 틀렸다" 가 아니라 "내가 본 걸
     * 말한다" 는 형태라 평가가 아니고, 그래서 서열이 안 생긴다.
     */
    feedbackPrompts: {
      found: {
        label: "이 직업이 하는 일 중, 친구가 안 적은 게 있나요?",
        placeholder: "예) 간호사 — 기록 정리도 하잖아요",
      },
      question: {
        label: "친구가 예상한 것 중에 “정말 그럴까?” 싶은 게 있었나요?",
        placeholder: "예) 조리는 사람이 계속한다고 했는데, 로봇 팔이 볶아 주는 식당 봤어요",
      },
    },

    worksheet: [
      {
        key: "job",
        label: "내 희망 직업",
        hint: "아직 없으면 관심 있는 분야나, 지난 시간에 AI가 추천해 준 직업을 적어도 됩니다.",
        kind: "text",
        maxLength: 30,
      },
      /*
       * 여기가 활동의 전부다. 나머지 문항은 전부 여기서 파생된다.
       *
       * 셋으로 쪼개게 한 이유: 둘이면 "사람이 하는 일 / 기계가 하는 일" 이분법이 되어
       * 판정이 아니라 분류가 된다. 넷이면 18분에 안 끝난다.
       */
      {
        key: "_decompose",
        label: "이 직업이 하는 일을 세 가지로 분해해 보세요",
        hint: "복잡한 것을 다룰 수 있는 크기로 쪼개는 것 — 우리가 배운 그 추상화예요.\n하나씩 쪼갠 다음, 그 일마다 인공지능이 가져갈지 예상해 봅시다.",
        kind: "note",
        maxLength: 0,
      },
      ...taskFields(1),
      ...taskFields(2),
      ...taskFields(3),
      {
        key: "quote",
        /*
         * 물어볼 말을 통째로 준다.
         *
         * 처음에는 "가장 마음에 걸린 한 문장" 이라고만 적었다. 중1에게는 무엇을 하라는
         * 것인지 알 수 없는 말이다 — 물어보긴 물어봤는데 무엇을 옮겨 적어야 할지 모른다.
         * 칠 문장을 그대로 주고, 답에서 무엇을 골라 적을지까지 정해 준다.
         *
         * "고쳐 쓰지 말고" 가 핵심이다. 요약하게 두면 학생이 무의식적으로 순화한다.
         * 원문이 남아야 아프고, 아파야 다음 칸을 진지하게 쓴다.
         */
        label: "인공지능에게 아래처럼 물어보고, 답에서 가장 놀란 부분을 그대로 옮겨 적으세요",
        hint: '"내가 되고 싶은 직업은 ○○야. 인공지능 때문에 이 직업이 앞으로 어떻게 바뀔지,\n사라질 가능성은 얼마나 되는지 알려줘."\n\n답이 길면 놀란 한 문장만 적어도 됩니다. 말을 고치지 말고 그대로 옮겨 주세요.',
        kind: "long",
        maxLength: 200,
      },
      /*
       * 시너지와 강점.
       *
       * 두 칸 다 위에서 자기가 쓴 판정을 근거로만 답할 수 있다. 손질을 인공지능이
       * 가져간다고 적은 학생은 "그 시간에 메뉴를 더 개발한다" 가 나오고, 아무것도 안
       * 뺏긴다고 적은 학생은 첫 칸을 못 쓴다. 도피가 구조적으로 막힌다.
       */
      {
        key: "synergy",
        label: "인공지능이 대신해 주는 일이 생기면, 나는 그 시간에 무엇을 하면 좋을까요?",
        hint: "예) 재료 손질을 로봇이 해 주면, 나는 새로운 메뉴를 더 많이 만들 수 있어요",
        kind: "text",
        maxLength: 100,
      },
      {
        key: "strength",
        /*
         * 고른 보기를 문장 안에 그대로 넣지 않는다.
         * "인간이 계속한다고 예상한 일을 잘하려면" 은 인용절이 통째로 목적어가 되어
         * 읽다가 한 번 멈춘다. 사실을 먼저 말하고, 묻는 것은 짧게 따로 묻는다.
         */
        label: "인공지능이 못하는 일은 내가 계속하게 됩니다. 그 일을 잘하려면 어떤 능력이 필요할까요?",
        hint: "예) 손님이 무엇을 좋아할지 알아채는 능력",
        kind: "text",
        maxLength: 100,
      },
      /*
       * 준비 세 칸. 마지막 칸이 중요하다 —
       * 막연한 미래가 아니라 **오늘**로 끌어와야 활동이 결심으로 닫힌다.
       */
      {
        key: "prep_school",
        label: "이 직업을 위해 중·고등학교에서 준비해 나가야 할 것",
        hint: "예) 과학 시간에 배우는 화학을 잘 챙겨 두기",
        kind: "text",
        maxLength: 60,
      },
      {
        key: "prep_major",
        label: "이 직업을 위한 학과나 자격증",
        hint: "예) 식품영양학과 / 조리기능사",
        kind: "text",
        maxLength: 60,
      },
      {
        key: "prep_now",
        label: "이 직업을 위해 이번 달 안에 할 수 있는 것 하나",
        hint: "작아도 됩니다. 진짜 할 수 있는 것으로 적어 주세요.",
        kind: "text",
        maxLength: 60,
      },
    ],
  },
};

async function main(): Promise<void> {
  const existing = await db.collection("lessonPlans").where("lessonNo", "==", 5).get();
  const now = Date.now();

  if (existing.empty) {
    const ref = await db.collection("lessonPlans").add({ ...PLAN, createdAt: now, updatedAt: now });
    console.log(`✓ 5차시 등록 — ${PLAN.title} (${ref.id})`);
  } else {
    for (const doc of existing.docs) {
      await doc.ref.set({ ...PLAN, updatedAt: now }, { merge: true });
      console.log(`↻ 5차시 갱신 — ${PLAN.title} (${doc.id})`);

      /*
       * 아직 시작하지 않은 수업에만 내용을 다시 복사한다.
       *
       * 진행 중이거나 끝난 수업은 건드리지 않는다 — 학생이 실제로 답한 문항과 기록이
       * 어긋나면, 나중에 "이 반은 어떤 질문에 답한 것인가" 를 알 수 없다 (PRD 5.1).
       */
      const sessions = await db
        .collection("classSessions")
        .where("lessonPlanId", "==", doc.id)
        .where("status", "==", "scheduled")
        .get();
      for (const s of sessions.docs) await s.ref.set({ ...PLAN }, { merge: true });
      console.log(`   아직 시작하지 않은 수업 ${sessions.size}개에 반영`);
    }
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} (4차시 ${LESSON4_ACTIVITY_ID} 와 분리)`);
  console.log(`4차시에 쓴 "되고 싶던 직업 · AI 추천 직업" 이 활동지 위에 뜹니다.`);
  console.log("활동지를 쓰는 동안은 이탈로 세지 않습니다 (오픈북).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
