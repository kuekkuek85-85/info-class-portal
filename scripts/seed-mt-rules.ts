/**
 * 「디지털 마음 톡톡」 공동체 영역 — 우리 학교 상점/벌점 규칙 만들기 (독립 활동, 재사용 가능).
 *
 *   node --env-file=.env.local scripts/seed-mt-rules.ts
 *
 * ## 무엇인가 — 게임 훅으로 시작하는 공동체 규칙 만들기
 *
 * 아직 특정 회기에 묶지 않은 **독립 활동**이다. 나중에 어느 회기에 조합할지는 교사가 정한다
 * (이 시드는 lessonNo 207 로 계획만 등록해 두고, 세션은 기존 open-mt* 꼴을 복제해 연다).
 *
 * 흐름(교사 버튼 순서):
 *   ① 반복 죄수의 딜레마 게임(훅) + 성찰 한 줄        — grill
 *   ② 규칙 아이디어 제시(rows) + 받은 피드백 반영     — problem
 *   ③ 서로 감상·피드백(익명 갤러리)                   — gallery
 *   ④ 우리 학교 규칙 완성(AI 집계 표, 읽기 전용)       — build
 *   → 마음일기                                          — reflection
 *
 * ①의 게임(팃포탯 컴퓨터 상대, 10라운드)이 "혼자 이익만 좇으면? 함께 지키는 규칙은 왜?" 를
 * 몸으로 느끼게 해, ②규칙 만들기의 동기가 된다. ②에서 만든 규칙을 ③에서 서로 보고 피드백하고,
 * problem 단계로 돌아와 피드백을 반영해 고친다(received_feedback 이 problem 단계에 함께 있다).
 * ④에서 교사가 「규칙 완성하기」를 1회 누르면 전체 학생 규칙이 하나의 표로 정리돼 모두에게 뜬다.
 *
 * ## 프라이버시
 *
 * - 규칙은 저민감 정보이고 공동체 결과라 갤러리를 **켠다**(galleryEnabled: true). 단 갤러리에
 *   나가는 칸은 **규칙(rule_ideas) 하나로 못박는다**(galleryAnswerKeys). 게임 결과·성찰 한 줄은
 *   친구에게 안 나간다. 갤러리는 **익명**이다(galleryShowNames 를 켜지 않는다).
 * - AI 집계(④)는 규칙 텍스트만 Gemini 로 보낸다 — **이름·학번은 보내지 않고**, 결과에도 저자가
 *   없다(통합 "우리 학교 규칙"). rules-compile route · school-rules.ts 참조.
 * - 게임(①)은 클라이언트에서 계산하고 결과만 저장한다 — 서버·Gemini 를 쓰지 않는다.
 *
 * ⚠ 코드 배포 필요: 게임(dilemma_game)·완성 지면(rules_result)·집계 라우트는 코드다. main 머지 후
 * Vercel 재빌드가 되어 있어야 학생 화면에 뜨고 라우트가 동작한다. AI 집계는 GEMINI_API_KEY 필요.
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

/** 공동체 영역 활동통 (감정 영역 통과 별개). 이 활동의 규칙·게임 답이 여기 쌓인다. */
const ACTIVITY_ID = "mt-2026-community";
/** 차시 번호 — 200번대(2회기 202 … 6회기 206). 아직 회기 미배정이라 207 로 임시 등록. */
const LESSON_NO = 207;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const WORKSHEET: WorksheetQuestion[] = [
  /* ═══════════ ① 반복 죄수의 딜레마 게임(훅) + 성찰 한 줄 (grill) ═══════════ */
  {
    key: "_pd_intro",
    phase: "grill",
    label: "게임으로 시작 — 협력할까, 배신할까?",
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
    // 반복 죄수의 딜레마. 클라이언트에서 계산, 결과(라운드별 선택·총점)만 저장. 개인 기록.
    label: "반복 죄수의 딜레마 게임",
    hint: "협력/배신을 골라 10라운드를 해봐요. 끝나면 총점이 나와요.",
    kind: "dilemma_game",
    dilemmaRounds: 10,
    maxLength: 0,
  },
  {
    key: "pd_reflect",
    phase: "grill",
    // 성찰 한 줄. 개인 글, 친구에게 안 나간다(galleryAnswerKeys 에 없음).
    label: "혼자 이익만 좇으면 어떻게 될까요? 함께 지키는 규칙은 왜 필요할까요?",
    hint: "게임을 떠올리며 한두 줄로 적어 보세요. 이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },

  /* ═══════════ ② 규칙 아이디어 제시(rows) + 피드백 반영 (problem) ═══════════ */
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
    // 규칙 rows. 갤러리로 친구에게 나가는 유일한 칸(galleryAnswerKeys). AI 집계도 이 칸을 읽는다.
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
    /*
     * 받은 피드백. 갤러리(③) 뒤에 problem 단계로 돌아오면 여기 친구 피드백이 뜬다 — 그걸 보고
     * 위 rule_ideas 를 고쳐 최종본으로 만든다(⑤ 최종 수정 = 이 단계 재방문). 읽기 전용.
     */
    label: "친구들이 내 규칙에 남긴 피드백",
    hint: "친구들의 의견을 보고, 위 규칙을 더 좋게 고쳐 보세요. (아직 없으면 감상·피드백 뒤에 나타나요.)",
    kind: "received_feedback",
    maxLength: 0,
  },

  /* ═══════════ ④ 우리 학교 규칙 완성 (build) ═══════════ */
  {
    key: "_rules_done_intro",
    phase: "build",
    label: "우리 반 규칙을 하나로 모았어요",
    hint:
      "선생님이 우리 반 친구들의 규칙을 모아 하나의 표로 정리했어요. 아래가 ‘우리 학교 규칙’\n" +
      "이에요. 누가 냈는지는 표시하지 않아요 — 우리 모두가 함께 만든 규칙이에요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "rule_result",
    phase: "build",
    // 완성 지면(읽기 전용, 학급 공용). rulesSourceKey = 집계할 규칙 rows 문항.
    label: "우리 학교 규칙 (완성)",
    hint: "",
    kind: "rules_result",
    rulesSourceKey: "rule_ideas",
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "디지털 마음 톡톡 — 우리 학교 상벌점 규칙 만들기 (공동체)",

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
    heading: "오늘 할 일 — 우리 학교 규칙 만들기",
    body:
      "① 게임: 반복 죄수의 딜레마 — 협력과 배신, 무엇이 이득일까?\n" +
      "② 규칙 아이디어 제시 — 상점·벌점 규칙을 여러 개 제안하기\n" +
      "③ 서로 감상·피드백 — 친구 규칙을 보고 존중하며 의견 남기기\n" +
      "④ 피드백 반영해 고치기 → 우리 반 규칙을 하나로 완성하기",
    url: "",
  },

  assessment: empty(),
  video: empty(),

  reflectionQuestions: [
    "오늘 활동에서 마음에 남는 순간은 언제였나요? 무엇 때문에 그랬는지도 함께 적어 주세요.",
    "혼자만 이익을 좇으면 어떻게 될까요? 함께 지키는 규칙은 왜 필요할까요?",
    "우리 반이 만든 규칙 중, 내가 꼭 지키고 싶은 것 하나와 그 이유를 적어 주세요.",
  ],
  reflectionPublic: false,

  focusExempt: ["grill"],

  // 교사 버튼 순서. 대기 → 마음 체크인 → 게임(grill) → 규칙 만들기·피드백(problem)
  // → 서로 감상·피드백(gallery) → 우리 학교 규칙 완성(build) → 마음일기.
  phaseOrder: ["waiting", "mood", "grill", "problem", "gallery", "build", "reflection"],

  phaseLabels: {
    mood: "마음 체크인",
    grill: "게임 · 왜 규칙이 필요할까",
    problem: "규칙 만들기 · 피드백 반영",
    gallery: "서로 감상·피드백",
    build: "우리 학교 규칙 완성",
    reflection: "마음일기",
  },

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2026,
    worksheet: WORKSHEET,
    sourcesEnabled: false,

    /*
     * 갤러리를 켠다 — 규칙은 저민감·공동체 산출물이라 서로 봐도 된다. 단 나가는 칸은 규칙
     * (rule_ideas) 하나로 못박는다. 게임 결과·성찰 한 줄은 친구에게 안 나간다. 익명이다
     * (galleryShowNames 를 켜지 않는다 → 카드에 작성자 이름이 안 붙는다).
     */
    galleryEnabled: true,
    galleryAnswerKeys: ["rule_ideas"],

    // 존중·건설적 피드백을 유도하는 두 칸.
    feedbackPrompts: {
      found: {
        label: "이 규칙에서 좋은 점 (칭찬)",
        placeholder: "예) 배려하는 규칙이라 좋아요",
      },
      question: {
        label: "더 좋게 만들 제안 (존중하며)",
        placeholder: "예) 점수를 조금 낮추면 어떨까요?",
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

      const all = await db.collection("classSessions").where("lessonPlanId", "==", doc.id).get();
      const scheduled = all.docs.filter(
        (s) => (s.data() as { status: string }).status === "scheduled",
      );
      for (const s of scheduled) await s.ref.set({ ...PLAN }, { merge: true });
      console.log(`   아직 시작하지 않은 수업 ${scheduled.length}개에 반영`);

      for (const s of all.docs.filter((x) => (x.data() as { status: string }).status !== "scheduled")) {
        const x = s.data() as { status: string; code: string };
        console.warn(`   ⚠ ${s.id} (코드 ${x.code}) 는 ${x.status} 상태라 건너뛰었습니다.`);
      }
    }
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} · 차시 번호 ${LESSON_NO} (공동체 — 우리 학교 규칙 만들기)`);
  console.log("교사 버튼 순서: 대기 → 마음 체크인 →");
  console.log("  [grill] 반복 죄수의 딜레마 게임 + 성찰 한 줄");
  console.log("  [problem] 규칙 아이디어(rows) + 받은 피드백(감상 뒤 반영)");
  console.log("  [gallery] 서로 감상·피드백 (익명)");
  console.log("  [build] 「규칙 완성하기」(교사 1회) → 우리 학교 규칙 표(모든 학생 화면)");
  console.log("  → 마음일기 → 마침");
  console.log("\n프라이버시: 갤러리 켬 + 나가는 칸은 rule_ideas 하나(galleryAnswerKeys). 익명(이름 안 붙음). 게임 결과·성찰은 비공개.");
  console.log("AI 집계: 규칙 텍스트만 Gemini 로(이름·학번 미전송), 결과에 저자 없음. 게임은 클라이언트 계산(서버·AI 없음).");
  console.log("⚠ 코드(dilemma_game·rules_result·집계 라우트)라 main 머지 후 Vercel 재빌드 필요. AI 집계는 GEMINI_API_KEY 필요.");
  console.log("세션 열기: 기존 open-mt* 꼴을 복제(세션 ID 는 분반 열쇠, 7교시 권장). galleryEnabled: true 는 그대로 두세요(이 활동은 갤러리를 씁니다).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
