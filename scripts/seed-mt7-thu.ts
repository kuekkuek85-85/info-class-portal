/**
 * 「디지털 마음 톡톡」 7회기 (목요일 1기) — 릴레이 그림 + 죄수딜레마 + STREAMS + 규칙 만들기.
 *
 *   node --env-file=.env.local scripts/seed-mt7-thu.ts
 *
 * ## 화요일(mt7)과의 차이 — 막혔던 스케치풀 자리를 '릴레이 그림'으로 교체
 *
 * 화요일 mt7(mt-2026-7)은 Sketchful(외부 사이트) + 죄수딜레마 + STREAMS + 규칙이었다. 목요일은
 * 학교망에서 외부 사이트가 막혀, 그 자리를 **포털 내장 릴레이 그림(relay_draw)** 으로 바꾼다.
 * 나머지(죄수딜레마·STREAMS·규칙·AI 집계)는 그대로다. 활동통은 목요일 전용(mt-2026-7-thu).
 *
 * 교사 버튼 순서:
 *   대기 → 마음 체크인
 *   → ① 릴레이 그림(이어 그리기 · mvp) → ① 이어 그리기 돌아보기(성찰 · worksheet)
 *   → ② 반복 죄수의 딜레마(게임 · grill)
 *   → ③ STREAMS 개인전(게임 · wrapmap)
 *   → ④ 규칙 만들기·피드백 반영(problem) → ④ 서로 감상·피드백(익명 갤러리 · gallery)
 *   → ⑤ 우리 학교 규칙 완성(AI 집계 표 · build)
 *   → 마음일기(reflection)
 *
 * ## 프라이버시 — galleryAnswerKeys 는 ["rule_ideas"] 하나뿐
 *
 * 규칙 감상 때문에 galleryEnabled: true 지만, 친구에게 나가는 것은 규칙(rule_ideas)뿐이다.
 * 릴레이 그림은 answers 가 아니라 별도 경로(relayGroups)로 공개(교사 신호)되므로 galleryAnswerKeys
 * 와 무관하다. 릴레이 성찰(relay_reflect)·죄수딜레마·STREAMS 성찰·마음일기는 전부 비공개.
 *
 * ## 코드 전제 (배포돼 있어야 함)
 *
 * relay_draw·dilemma_game·streams_solo·rules_result 와 관련 라우트는 코드 기능이다. main 배포
 * 뒤에야 화면에 뜬다. AI 집계는 GEMINI_API_KEY 필요.
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

/** 목요일 7회기 전용 활동통(화요일 mt-2026-7 과 분리 — 릴레이·규칙·게임 답이 여기 저장). */
const ACTIVITY_ID = "mt-2026-7-thu";
/** 회기 관례대로 207 (화요일 mt7 과 같은 회기). 계획은 activityId 로 구분한다. */
const LESSON_NO = 207;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const WORKSHEET: WorksheetQuestion[] = [
  /* ═══════════ ① 릴레이 그림 — 이어 그리기 (mvp) ═══════════ */
  {
    key: "_relay_intro",
    phase: "mvp",
    label: "함께 잇는 그림 — 릴레이 그리기",
    hint:
      "모둠이 한 그림을 이어서 그려요. 내 차례가 되면 지금까지 친구들이 그린 그림 위에\n" +
      "조금 더 그린 뒤 ‘제출하고 다음 사람에게’ 를 눌러요. 다음 사람에게 넘어가요.\n" +
      "말 없이 그림으로만 이어가요 — 다음 사람이 알아보게 그리려면, 그 친구가 무엇을\n" +
      "떠올릴지 생각하며 그려 봐요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "relay",
    phase: "mvp",
    // 릴레이 그림. 모둠·턴·이미지는 relayGroups 컬렉션. 교사가 모둠 나누기로 시작한다.
    label: "릴레이 그림",
    hint: "선생님이 모둠을 나누면 시작돼요. 내 차례에 이어 그려요.",
    kind: "relay_draw",
    relayTopics: [
      "즐거운 소풍",
      "우리 반 교실",
      "미래의 도시",
      "바닷속 세상",
      "내가 좋아하는 음식",
      "우주 여행",
      "숲속 동물들",
      "놀이공원",
    ],
    maxLength: 0,
  },

  /* ═══════════ ① 이어 그리기 돌아보기 (성찰 · worksheet) ═══════════ */
  {
    key: "relay_reflect",
    phase: "worksheet",
    // 성찰 한 문항 — 의사소통·협력·공감. 개인 글, 비공개.
    label: "말 없이 그림으로 이어 그릴 때, 내 뜻이 잘 전해졌나요? 어디서 달라졌나요?",
    hint:
      "예) 내가 강아지를 그렸는데 다음 친구가 다른 동물로 바꿨다 / 함께 그리니 더 재밌었다.\n" +
      "말 없이 마음을 전하는 게 어땠는지 적어 봐요. 이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },

  /* ═══════════ ② 반복 죄수의 딜레마 게임 (grill) ═══════════ */
  {
    key: "_pd_intro",
    phase: "grill",
    label: "게임으로 생각해 보기 — 협력할까, 배신할까?",
    hint:
      "컴퓨터와 여러 번 겨루는 게임이에요. 매 라운드 ‘협력’ 이나 ‘배신’ 을 고르면, 컴퓨터도\n" +
      "골라요. 점수표를 보고 골라 보세요. 상대는 처음엔 협력하고, 그다음부터는 내 바로 앞\n" +
      "선택을 똑같이 따라 해요. 반복하면 무엇이 이득일지 직접 느껴 봐요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "pd_game",
    phase: "grill",
    label: "반복 죄수의 딜레마 게임",
    hint: "협력/배신을 골라 10라운드를 해봐요. 끝나면 총점이 나와요.",
    kind: "dilemma_game",
    dilemmaRounds: 10,
    maxLength: 0,
  },
  {
    key: "pd_reflect",
    phase: "grill",
    label: "혼자 이익만 좇으면 어떻게 될까요? 함께 지키는 규칙은 왜 필요할까요?",
    hint: "게임을 떠올리며 한두 줄로 적어 보세요. 이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },

  /* ═══════════ ③ STREAMS 개인전 (wrapmap) ═══════════ */
  {
    key: "_st_intro",
    phase: "wrapmap",
    label: "STREAMS — 숫자 줄기 잇기 게임",
    hint:
      "타일을 한 장씩 뽑아 20칸에 놓는 게임이에요.\n" +
      "① 뽑힌 타일을 빈 칸 하나에 놓아요. 한 번 놓으면 옮길 수 없어요.\n" +
      "② 왼쪽부터 숫자가 같거나 커지면(예: 3-3-7-9) 한 ‘줄기’ 로 이어져요.\n" +
      "③ 줄기가 길수록 점수가 훨씬 커져요. 조커는 아무 데나 이어 주는 만능 타일이에요.\n" +
      "다음에 어떤 숫자가 나올지 생각하며 자리를 잘 골라, 두어 판 도전해요!",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "st_game",
    phase: "wrapmap",
    label: "STREAMS 개인전",
    hint: "‘게임 시작’ 을 누르고, 뽑힌 타일을 빈 칸에 놓아요. 20칸을 다 채우면 점수가 나와요.",
    kind: "streams_solo",
    maxLength: 0,
  },
  {
    key: "st_strategy",
    phase: "wrapmap",
    label: "타일을 어디에 놓을지 어떻게 정했나요? 나만의 방법이 있었나요?",
    hint: "예) 큰 숫자는 오른쪽에 남겨 뒀다 / 조커는 아껴 뒀다. 이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 250,
  },

  /* ═══════════ ④ 규칙 아이디어 제시(rows) + 피드백 반영 (problem) ═══════════ */
  {
    key: "_rule_intro",
    phase: "problem",
    label: "우리 학교 상점·벌점 규칙을 만들어 봐요",
    hint:
      "함께 지키면 좋을 규칙을 여러 개 제안해 보세요. 카테고리(예: 수업 태도·배려·안전·환경),\n" +
      "규칙 내용, 상점인지 벌점인지, 점수를 적어요. ‘+ 줄 추가’ 로 여러 개 쓸 수 있어요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "rule_ideas",
    phase: "problem",
    label: "규칙 아이디어",
    hint: "한 줄에 규칙 하나씩. 상점/벌점은 눌러서 고르고, 점수는 숫자로 적어요.",
    kind: "rows",
    maxRows: 5,
    rowColumns: [
      { key: "category", label: "카테고리", placeholder: "예) 수업 태도" },
      { key: "item", label: "규칙 내용", placeholder: "예) 발표를 열심히 들어요" },
      { key: "type", label: "상점/벌점", emojis: ["상점", "벌점"] },
      { key: "score", label: "점수", placeholder: "예) 3" },
    ],
    maxLength: 0,
  },
  {
    key: "rule_feedback",
    phase: "problem",
    label: "친구들이 내 규칙에 남긴 피드백",
    hint: "친구들의 의견을 보고, 위 규칙을 더 좋게 고쳐 보세요. (아직 없으면 감상·피드백 뒤에 나타나요.)",
    kind: "received_feedback",
    maxLength: 0,
  },

  /* ═══════════ ⑤ 우리 학교 규칙 완성 (AI 집계 · build) ═══════════ */
  {
    key: "_rules_done_intro",
    phase: "build",
    label: "우리 반 규칙을 하나로 모았어요",
    hint:
      "선생님이 우리 반 친구들의 규칙을 모아 하나의 표로 정리했어요. 누가 냈는지는 표시하지\n" +
      "않아요 — 우리 모두가 함께 만든 규칙이에요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "rule_result",
    phase: "build",
    label: "우리 학교 규칙 (완성)",
    hint: "",
    kind: "rules_result",
    rulesSourceKey: "rule_ideas",
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "디지털 마음 톡톡 7회기(목) — 릴레이 그림 + 우리 학교 규칙 만들기",

  moodCheckEnabled: true,

  groups: [
    { key: "mt-tue-1", label: "화요일 1기", classNo: 1 },
    { key: "mt-thu-1", label: "목요일 1기", classNo: 2 },
    { key: "mt-tue-2", label: "화요일 2기", classNo: 3 },
    { key: "mt-thu-2", label: "목요일 2기", classNo: 4 },
  ],

  game: {
    heading: "기다리는 동안 — 지뢰찾기",
    body:
      "친구들이 다 모일 때까지 잠깐 쉬어요.\n" +
      "숫자는 그 칸 둘레에 숨은 지뢰의 개수예요. 지뢰가 없는 칸을 골라 열어 보세요.",
    url: "https://mine-sweeper-game-seven.vercel.app/home",
  },
  gameExplainer: empty(),

  progress: {
    heading: "오늘 할 일 — 함께 잇는 그림 + 우리 학교 규칙 만들기",
    body:
      "① 릴레이 그림 — 모둠이 한 그림을 이어 그리기\n" +
      "② 반복 죄수의 딜레마 — 협력과 배신, 무엇이 이득일까?\n" +
      "③ STREAMS 개인전 — 숫자 줄기를 길게 이어 점수 내기\n" +
      "④ 규칙 아이디어 제시 → 서로 감상·피드백(익명) → 피드백 반영해 고치기\n" +
      "⑤ 우리 반 규칙을 하나로 완성하기 → 마음일기",
    url: "",
  },

  assessment: empty(),
  video: empty(),

  reflectionQuestions: [
    "오늘 활동에서 마음에 남는 순간은 언제였나요? 무엇 때문에 그랬는지도 함께 적어 주세요.",
    "‘상대의 눈으로 생각하기’ 를, 이번 주에 친구 관계에서 어떻게 써볼 수 있을까요?",
    "우리 반이 만든 규칙 중, 내가 꼭 지키고 싶은 것 하나와 그 이유를 적어 주세요.",
  ],
  reflectionPublic: false,

  focusExempt: [],

  phaseOrder: ["waiting", "mood", "mvp", "worksheet", "grill", "wrapmap", "problem", "gallery", "build", "reflection"],

  phaseLabels: {
    mood: "마음 체크인",
    mvp: "① 릴레이 그림 (이어 그리기)",
    worksheet: "① 이어 그리기 돌아보기",
    grill: "② 반복 죄수의 딜레마",
    wrapmap: "③ STREAMS 개인전",
    problem: "④ 규칙 만들기 · 피드백 반영",
    gallery: "④ 서로 감상·피드백",
    build: "⑤ 우리 학교 규칙 완성",
    reflection: "마음일기",
  },

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2026,
    worksheet: WORKSHEET,
    sourcesEnabled: false,

    /*
     * ★ 갤러리를 켜되 나가는 칸은 rule_ideas 하나로 못박는다. 릴레이 그림은 answers 가 아니라
     * 별도 경로(relayGroups)로 공개되므로 galleryAnswerKeys 와 무관하다. 성찰·게임 답은 비공개.
     */
    galleryEnabled: true,
    galleryAnswerKeys: ["rule_ideas"],

    feedbackPrompts: {
      found: { label: "이 규칙에서 좋은 점 (칭찬)", placeholder: "예) 배려하는 규칙이라 좋아요" },
      question: { label: "더 좋게 만들 제안 (존중하며)", placeholder: "예) 점수를 조금 낮추면 어떨까요?" },
    },
  },
};

async function main(): Promise<void> {
  const now = Date.now();
  const byLesson = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  const mine = byLesson.docs.find(
    (d) => (d.data() as LessonPlan).activity?.activityId === ACTIVITY_ID,
  );

  if (!mine) {
    const ref = await db.collection("lessonPlans").add({ ...PLAN, createdAt: now, updatedAt: now });
    console.log(`✓ 등록 — ${PLAN.title} (${ref.id})`);
  } else {
    await mine.ref.set({ ...PLAN, updatedAt: now }, { merge: true });
    console.log(`↻ 갱신 — ${PLAN.title} (${mine.id})`);
    const all = await db.collection("classSessions").where("lessonPlanId", "==", mine.id).get();
    const scheduled = all.docs.filter((s) => (s.data() as { status: string }).status === "scheduled");
    for (const s of scheduled) await s.ref.set({ ...PLAN }, { merge: true });
    console.log(`   아직 시작하지 않은 수업 ${scheduled.length}개에 반영`);
    for (const s of all.docs.filter((x) => (x.data() as { status: string }).status !== "scheduled")) {
      const x = s.data() as { status: string; code: string };
      console.warn(`   ⚠ ${s.id} (코드 ${x.code}) 는 ${x.status} 상태라 건너뛰었습니다.`);
    }
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} · 차시 207 (목요일 7회기 — 릴레이 그림 교체본)`);
  console.log("교사 버튼 순서: 대기 → 마음 체크인 →");
  console.log("  [mvp] 릴레이 그림(모둠 이어 그리기) → [worksheet] 이어 그리기 돌아보기");
  console.log("  [grill] 반복 죄수의 딜레마 → [wrapmap] STREAMS 개인전");
  console.log("  [problem] 규칙 rows + 피드백 → [gallery] 서로 감상·피드백(익명) → [build] 규칙 완성 → 마음일기");
  console.log("\n릴레이 그림: 교사 대시보드에서 [모둠 나누기] → 학생이 차례로 이어 그림 → [건너뛰기]로 막힌 턴 넘김 → [공개].");
  console.log("★ 프라이버시: galleryAnswerKeys: [\"rule_ideas\"] 하나뿐 — 릴레이는 별도 공개 경로. 성찰·게임 답 비공개.");
  console.log("⚠ 코드(relay_draw·dilemma_game·streams_solo·rules_result·라우트)라 main 배포 후 화면에 뜹니다. AI 집계는 GEMINI_API_KEY 필요.");
  console.log("세션 열기(목요일 1기): node --env-file=.env.local scripts/open-mt7-thu1.ts [--rehearsal]");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
