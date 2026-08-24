/**
 * 「인간과 인공지능」(진로탐색 선택과목) 2차시.
 *
 *   node --env-file=.env.local scripts/seed-hai2.ts
 *
 * ## 이 시간이 하려는 것
 *
 * 문제 정의 → MVP 기획 → **딸깍 v0.1 뽑기** → AI 검토 → 회고.
 *
 * 핵심은 **뽑기를 반드시 오늘 안에** 한다는 것이다. 설계를 다 해야 만들 수 있다고 하면
 * 설계는 만들기 앞의 관문이 되고, 중1에게 관문은 고통이다. 순서를 뒤집는다 —
 * 일단 대충 뽑아 보고, 어긋난 만큼을 다음 시간에 설계한다.
 *
 * 그래서 검토(grill)가 만들기(build) **뒤에** 있다. 앞에 두면 상상으로 답하고,
 * 뒤에 두면 눈앞의 결과를 보며 답한다.
 *
 * ## 오늘은 AI 대신 고정 질문 세 개
 *
 * 계획서 부록 A 대로다. Gemini 연동은 화면·저장 구조가 같아서 나중에 갈아끼우면 되고,
 * 오늘 반드시 있어야 하는 것은 **v0.1 링크 제출**이다. 그게 없으면 검토가 공중에 뜬다.
 *
 * ## 반이 섞인 수업
 *
 * 22명이 1~4반에서 모여 앉는다. 세션에 groupKey 를 적어 두면 학번의 반과 수업의 반이
 * 달라도 들어올 수 있다. 세션 문서 ID 는 바꾸지 않았다 — 운영 중인 정보과가 멈춘다.
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

/** 7차시를 관통하는 활동 ID. 3차시 이후에도 같은 값을 쓰면 답이 이어진다 */
const ACTIVITY_ID = "hai-2026-1기";
/** 차시 번호가 정보과와 겹치므로(정보 2차시 vs 인간과AI 2차시) 100번대로 띄운다 */
const LESSON_NO = 102;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/**
 * 고정 질문 세 개 (계획서 부록 A).
 *
 * **v0.1 을 띄워 놓고** 답한다. 질문이 추상적이면 중1은 "잘 모르겠어요" 로 채운다.
 * 셋 다 눈앞의 화면을 보고 답할 수 있는 것으로만 골랐다.
 */
const GRILL_QUESTIONS = [
  "이 화면을 누가 쓸까요? 그 사람 이름을 한 명 대 보세요.",
  "뽑힌 화면이 내가 생각한 것과 어디가 다른가요?",
  "이 앱에서 하나만 남긴다면 어떤 기능일까요?",
];

const WORKSHEET: WorksheetQuestion[] = [
  // ── 문제 정의 (4~10분) ────────────────────────────────
  {
    key: "problem_what",
    phase: "problem",
    label: "요즘 불편하다고 느낀 것 한 가지",
    hint: "크지 않아도 됩니다. 오늘 아침에 짜증났던 것도 좋아요.\n예) 급식 메뉴를 매번 찾아보기 귀찮다",
    kind: "text",
    maxLength: 60,
  },
  {
    key: "problem_who",
    phase: "problem",
    /*
     * "누구의 문제인가" 를 여기서 못 박는다.
     * 이 칸이 비면 다음 시간 PRD 1번(누가 쓰나)이 통째로 막힌다.
     */
    label: "그건 누구의 불편인가요?",
    hint: "나만 그런지, 우리 반 전체가 그런지 적어 주세요.\n예) 우리 반 급식 먹는 애들 전부",
    kind: "text",
    maxLength: 60,
  },

  // ── 꼭 필요한 것만 (10~16분) ──────────────────────────
  {
    key: "_mvp_note",
    phase: "mvp",
    /*
     * "MVP" 라는 말을 학생 화면에 쓰지 않는다. 중1이 모르는 말이고, 모르는 말로 시작하면
     * 그 칸을 채우는 것이 아니라 말뜻을 묻는 데 시간이 간다.
     *
     * 개념은 그대로 가르친다 — 다 만들려다 아무것도 못 끝내는 것을 막는 것. 이름은
     * 활동이 끝난 뒤에 붙여 주는 편이 낫다(계획서 §4.2 와 같은 순서).
     */
    label: "이제 제일 작게 줄여 봅시다",
    hint: "처음부터 다 만들려고 하면 아무것도 못 끝내요.\n“이것만 되면 일단 쓸 수 있다” 하는 것만 남기는 겁니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "mvp_one",
    phase: "mvp",
    label: "제일 작게 만들면 어떤 앱인가요? 한 줄로",
    hint: "‘무엇을 하면 무엇이 나온다’ 로 적으면 쉬워요.\n예) 오늘 날짜를 누르면 급식 메뉴가 뜨는 앱",
    kind: "text",
    maxLength: 80,
  },
  {
    key: "mvp_must1",
    phase: "mvp",
    /*
     * 기능은 딱 세 칸이다. 칸이 셋뿐이라는 사실 자체가 개념을 가르친다 —
     * 넷째를 적을 자리가 없어서 학생은 무엇을 뺄지 고르게 된다.
     */
    label: "꼭 필요한 기능 ①",
    hint: "세 개까지만 적을 수 있어요. 네 번째 칸은 없습니다.\n넣고 싶은 게 더 있어도 지금은 참아 보세요 — 무엇을 뺄지 고르는 것도 설계예요.",
    kind: "text",
    maxLength: 40,
  },
  { key: "mvp_must2", phase: "mvp", label: "꼭 필요한 기능 ②", hint: "", kind: "text", maxLength: 40 },
  { key: "mvp_must3", phase: "mvp", label: "꼭 필요한 기능 ③", hint: "", kind: "text", maxLength: 40 },

  // ── 만들기 · 딸깍 v0.1 (16~28분) ──────────────────────
  {
    key: "_build_recap",
    phase: "build",
    /*
     * 앞 단계에서 쓴 것을 다시 띄운다.
     *
     * 이게 없으면 "앞에서 쓴 한 줄을 그대로 넣어도 돼요" 가 없는 것을 가리키는 말이 된다.
     * 단계가 넘어가면 앞 칸은 화면에서 사라지고, 진짜 수업은 되돌아가기가 꺼져 있어서
     * 학생이 볼 방법이 아예 없다. 기억으로 다시 쓰거나 새로 지어내게 된다.
     */
    label: "앞에서 이렇게 적었어요",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "mvp_one", label: "제일 작게 만들면" },
      { key: "mvp_must1", label: "꼭 필요한 기능 ①" },
      { key: "mvp_must2", label: "꼭 필요한 기능 ②" },
      { key: "mvp_must3", label: "꼭 필요한 기능 ③" },
    ],
    maxLength: 0,
  },
  {
    key: "build_prompt",
    phase: "build",
    /*
     * 프롬프트를 **한 줄로** 못 박는다. 오늘은 일부러 대충 뽑는 시간이다.
     * 여기서 잘 쓰려고 하면 다음 시간 PRD 의 값이 사라진다.
     */
    label: "캔바에 넣을 한 줄 프롬프트",
    hint: "오늘은 일부러 대충 갑니다. 앞에서 쓴 ‘제일 작게 만들면’ 한 줄을 그대로 넣어도 돼요.\n잘 쓰려고 애쓰지 마세요 — 왜 부족한지 찾는 게 오늘 할 일입니다.",
    kind: "text",
    maxLength: 120,
  },
  {
    key: "build_url",
    phase: "build",
    label: "만들어진 화면 링크 (v0.1)",
    hint: "캔바에서 공유 링크를 복사해 붙여 넣으세요. 이게 오늘의 결과물입니다.",
    kind: "text",
    maxLength: 300,
  },

  // ── AI 검토 (28~37분) ─────────────────────────────────
  {
    key: "_grill_note",
    phase: "grill",
    label: "만든 화면을 띄워 놓고 답해 주세요",
    hint: "고치는 시간이 아닙니다. 무엇이 어긋났는지 찾는 시간이에요.\n답이 막히는 자리가 곧 내 기획의 구멍입니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_grill_recap",
    phase: "grill",
    // 방금 만든 화면 주소. 눌러서 새 창으로 연다 — 여기서 나가면 쓰던 답이 날아간다
    label: "",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "build_url", label: "내가 만든 화면" },
      { key: "mvp_one", label: "내가 만들려던 것" },
    ],
    maxLength: 0,
  },
  {
    key: "grill_a1",
    phase: "grill",
    label: GRILL_QUESTIONS[0],
    hint: "예) 우리 반 김○○",
    kind: "text",
    maxLength: 80,
  },
  {
    key: "grill_a2",
    phase: "grill",
    label: GRILL_QUESTIONS[1],
    hint: "예) 날짜를 누르는 칸이 아예 없어요",
    kind: "long",
    maxLength: 150,
  },
  {
    key: "grill_a3",
    phase: "grill",
    label: GRILL_QUESTIONS[2],
    hint: "예) 오늘 메뉴 보여주기 하나만",
    kind: "text",
    maxLength: 80,
  },
  {
    key: "will_fix",
    phase: "grill",
    /*
     * 이 한 줄이 3차시 첫 화면에 뜬다 (carryOver).
     * 아이들이 빈 종이에서 다음 시간을 시작하지 않게 하는 장치다.
     */
    label: "그래서 다음 시간에 고칠 것 한 가지는?",
    hint: "이 줄은 다음 시간 화면 맨 위에 그대로 뜹니다. 나에게 남기는 쪽지예요.",
    kind: "text",
    maxLength: 80,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "인간과 인공지능 2차시 — 문제 찾기부터 딸깍까지",
  /*
   * 기분 체크를 넣지 않는다.
   *
   * 45분에 다섯 단계를 지나야 하고, 뽑기(12분)를 반드시 오늘 안에 끝내야 한다.
   * 무엇보다 이 활동은 정보과에서 한 학기 내내 하고 있다 — 같은 학생이 화요일에 또
   * 같은 화면을 만나면 성의껏 고르지 않게 되고, 그러면 정보과 쪽 집계까지 무뎌진다.
   */
  moodCheckEnabled: false,

  /*
   * 이 과목은 반이 아니라 **분반**으로 연다. 네 분반 각각에 여러 반 학생이 섞여 앉는다.
   *
   * classNo 는 화면에 안 보이는 데이터 통 번호다. 출석·활동지·감정이 전부 이 값으로
   * 묶이므로 분반마다 다른 값을 준다 — 같은 값을 주면 화요일 1기가 목요일 2기 활동지를
   * 보게 된다. 정보과와 겹칠 걱정은 없다. 활동 ID 가 달라서 같은 통에 담기지 않는다.
   */
  groups: [
    { key: "hai-tue-1", label: "화요일 1기", classNo: 1 },
    { key: "hai-tue-2", label: "화요일 2기", classNo: 2 },
    { key: "hai-thu-1", label: "목요일 1기", classNo: 3 },
    { key: "hai-thu-2", label: "목요일 2기", classNo: 4 },
  ],

  game: {
    heading: "기다리는 동안 — 2048",
    body: "같은 숫자끼리 밀어서 합치세요.\n오늘은 512만 넘어도 잘한 거예요.",
    url: "https://2048-game-gilt-kappa.vercel.app/",
  },
  gameExplainer: empty(),

  /*
   * 오늘 할 일을 먼저 보여준다.
   *
   * 다섯 단계를 지나는 수업이라 지금 어디쯤인지 모르면 학생이 불안해한다.
   * 특히 "일부러 대충 뽑는다" 를 **뽑기 전에** 못 박아 두는 것이 중요하다 —
   * 그래야 결과물의 허접함이 실패가 아니라 예정된 교재가 된다.
   */
  progress: {
    heading: "오늘 할 일",
    body:
      "① 불편한 것 찾기\n" +
      "② 그중에 꼭 필요한 것만 남기기\n" +
      "③ 일단 뽑아 보기 — 오늘은 일부러 대충 갑니다\n" +
      "④ 뽑힌 걸 보고 어디가 어긋났는지 찾기\n" +
      "⑤ 다음 시간에 고칠 것 한 줄 남기기\n\n" +
      "오늘 뽑는 화면은 허접할 거예요. 그게 정상입니다.\n" +
      "왜 허접한지 찾아내는 것이 오늘의 진짜 과제예요.",
    url: "",
  },
  assessment: empty(),
  video: empty(),

  /*
   * 회고는 성찰 단계를 그대로 쓴다.
   * 두 문항이면 3분에 둘 다 얕아진다. 오늘 손에 쥔 것을 확인하는 한 문항만 둔다.
   */
  reflectionQuestions: [
    "오늘 한 것과, 다음 시간에 제일 먼저 하고 싶은 것을 적어 주세요.",
  ],
  reflectionPublic: false,

  /*
   * 만들기 단계는 이탈로 세지 않는다.
   *
   * 캔바로 나가서 뽑아 오는 것이 활동 자체다. 그걸 이탈로 세면 기록이 온통 빨갛게
   * 되고 아무 의미가 없다. 더 나쁜 것은 학생이 눈치를 보느라 안 나가는 것이다.
   * 감상 단계도 마찬가지다 — 친구 링크를 새 창으로 연다.
   */
  focusExempt: ["build", "grill", "gallery"],
  phaseLabels: {
    progress: "오늘 할 일",
    gallery: "서로 구경하기",
    reflection: "회고",
  },

  activity: {
    activityId: ACTIVITY_ID,
    // 그리기가 없는 활동. 장소를 비우면 그리기 화면이 안 뜬다.
    places: [],
    year: 2026,
    worksheet: WORKSHEET,

    sourceHints: {
      site: "예) 캔바 — AI 앱 생성",
      ai: "예) 챗지피티 — 급식 앱 아이디어 물어봄",
    },

    /** 감상 화면에서 "나랑 비슷한 문제를 고른 친구" 를 찾는다 */
    galleryFacets: [{ key: "who", label: "누구의 불편인가", answerKeys: ["problem_who"] }],

    feedbackPrompts: {
      found: {
        label: "이 친구가 만든 화면에서, 좋았던 것 하나만 알려 주세요",
        placeholder: "예) 날짜 누르는 칸이 큼직해서 쓰기 편해 보여요",
      },
      question: {
        label: "이 친구에게 물어보고 싶은 것",
        placeholder: "예) 이거 누가 쓰는 앱이야?",
      },
    },
  },
};

async function main(): Promise<void> {
  const existing = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  const now = Date.now();

  if (existing.empty) {
    const ref = await db.collection("lessonPlans").add({ ...PLAN, createdAt: now, updatedAt: now });
    console.log(`✓ 등록 — ${PLAN.title} (${ref.id})`);
  } else {
    for (const doc of existing.docs) {
      await doc.ref.set({ ...PLAN, updatedAt: now }, { merge: true });
      console.log(`↻ 갱신 — ${PLAN.title} (${doc.id})`);

      // 아직 시작하지 않은 수업에만 다시 복사한다 (PRD 5.1)
      const sessions = await db
        .collection("classSessions")
        .where("lessonPlanId", "==", doc.id)
        .where("status", "==", "scheduled")
        .get();
      for (const s of sessions.docs) await s.ref.set({ ...PLAN }, { merge: true });
      console.log(`   아직 시작하지 않은 수업 ${sessions.size}개에 반영`);
    }
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} · 차시 번호 ${LESSON_NO} (정보과와 안 겹치게)`);
  console.log("단계: 대기 → 오늘 할 일 → 문제 정의 → 꼭 필요한 것만 → 만들기 → AI 검토 → 서로 구경하기 → 회고");
  console.log("기분 체크는 넣지 않았습니다 (정보과에서 이미 하는 활동).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
