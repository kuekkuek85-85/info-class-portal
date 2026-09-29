/**
 * 「디지털 마음 톡톡」 7회기 — 그림으로 마음 전하기 + 공동체 규칙 만들기 (조합 세션).
 *
 *   node --env-file=.env.local scripts/seed-mt7.ts
 *
 * ## 무엇인가 — 두 독립 활동을 한 회기로 조합
 *
 * 앞서 만든 두 독립 활동을 7회기 한 세션에 합쳤다:
 *   · 그림으로 마음 전하기(Sketchful.io 게임 + 성찰)  — seed-mt-sketchful.ts
 *   · 공동체 규칙 만들기(죄수딜레마 훅 + 규칙 rows + 익명 갤러리 + AI 집계) — seed-mt-rules.ts
 *
 * 교사 버튼 순서:
 *   대기 → 마음 체크인
 *   → ① 그림으로 마음 전하기(게임 · mvp) → ① 게임 후 돌아보기(성찰 · worksheet)
 *   → ② 반복 죄수의 딜레마(게임 · grill)
 *   → ③ STREAMS 개인전(게임 · wrapmap)
 *   → ④ 규칙 만들기·피드백 반영(problem) → ④ 서로 감상·피드백(익명 갤러리 · gallery)
 *   → ⑤ 우리 학교 규칙 완성(AI 집계 표 · build)
 *   → 마음일기(reflection)
 *
 * ## ★ 프라이버시 — 한 세션이라 galleryEnabled 가 하나뿐 (핵심)
 *
 * 규칙 감상·피드백 때문에 galleryEnabled 를 **켜야** 한다. 그러면 감정 성찰·게임 결과·마음일기
 * 까지 친구에게 새어 나갈 위험이 생긴다. 그래서 **galleryAnswerKeys 를 ["rule_ideas"] 하나로
 * 못박는다** — 서버 갤러리 라우트(toCard)가 그 칸만 카드에 싣는다(gallery/route.ts).
 *
 * 그 결과 친구에게 나가는 것은 **규칙(rule_ideas) 하나뿐**이고,
 *   · Sketchful 성찰(sk_word·sk_feel·sk_perspective·sk_fun)
 *   · 죄수딜레마 게임 결과(pd_game)·성찰(pd_reflect)
 *   · 받은 피드백(rule_feedback)·마음일기
 * 는 전부 **비공개**로 남는다. galleryAnswerKeys 를 비우면 모든 답이 노출되는 함정이라, 절대
 * 비우지 않는다. 갤러리는 **익명**이다(galleryShowNames 를 켜지 않는다 → 카드에 이름 안 붙음).
 *
 * AI 집계(④)는 규칙 텍스트만 Gemini 로 보낸다 — 이름·학번 미전송, 결과에 저자 없음
 * (rules-compile route · school-rules.ts).
 *
 * ## 코드 전제 (배포돼 있어야 함)
 *
 * dilemma_game(게임)·rules_result(완성 지면)·집계 라우트는 **코드 기능**이다. main 에 머지·배포
 * 돼 있어야 학생 화면에 게임·완성 표가 뜨고 라우트가 동작한다(이미 머지됨 전제).
 *
 * ## 활동통·차시번호
 *
 * 이 조합 세션 전용 activityId(mt-2026-7). carryOver(problem 복귀 최종수정)·갤러리·rules 집계가
 * 모두 이 한 통에서 동작한다. 차시번호는 회기 관례대로 207(2회기 202 … 6회기 206 → 7회기 207).
 * ⚠ 독립 샘플 seed-mt-rules(207)·seed-mt-sketchful(208)과 번호가 겹칠 수 있어, main·open 은
 * activityId 로 이 세션의 계획을 집어 다룬다(샘플 문서를 건드리지 않는다).
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

/** 이 조합 세션 전용 활동통. carryOver·갤러리·rules 집계가 모두 이 통에서 동작한다. */
const ACTIVITY_ID = "mt-2026-7";
/** 회기 관례대로 207 (2회기 202 … 6회기 206 → 7회기 207) */
const LESSON_NO = 207;

/** Sketchful.io — CSP 상 iframe 임베드가 막혀 새 탭으로만 연다. */
const SKETCHFUL_URL = "https://sketchful.io/";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const WORKSHEET: WorksheetQuestion[] = [
  /* ═══════════ ① 그림으로 마음 전하기 — 게임 안내 + 링크 (mvp) ═══════════ */
  {
    key: "_sk_intro",
    phase: "mvp",
    label: "그림으로 마음 전하기 — Sketchful.io",
    hint:
      "온라인 그림 맞히기 게임이에요. 한 사람이 제시어를 그리면, 다른 친구들이 맞혀요.\n" +
      "① 아래 [Sketchful.io 열기] 를 눌러 새 탭에서 열어요.\n" +
      "② 선생님 안내에 따라 같은 방에 들어가요(방 만들기 또는 방 코드로 입장).\n" +
      "③ 내 차례엔 제시어를 그리고, 다른 차례엔 채팅으로 정답을 맞혀요.\n\n" +
      "오늘의 포인트: 남이 알아보게 그리려면, 상대가 그 그림을 보고 무엇을 떠올릴지\n" +
      "먼저 생각해 봐야 해요. ‘내 눈’ 이 아니라 ‘보는 사람의 눈’ 으로 그려 봐요.",
    kind: "note",
    linkUrl: SKETCHFUL_URL,
    linkLabel: "Sketchful.io 열기 (새 탭)",
    maxLength: 0,
  },

  /* ═══════════ ① 게임 후 성찰 (개인 비공개 · worksheet) ═══════════ */
  {
    key: "_sk_reflect_intro",
    phase: "worksheet",
    label: "게임을 하고 나서 — 잠깐 돌아봐요",
    hint: "아래 칸들은 나와 선생님만 봐요. 편하게 적어 주세요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "sk_word",
    phase: "worksheet",
    label: "가장 인상에 남은 제시어는 무엇이었나요? 왜 그런가요?",
    hint:
      "그리기 어려웠던 것, 재미있었던 것, 뜻밖에 다들 잘 맞힌 것 무엇이든 좋아요.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "sk_feel",
    phase: "worksheet",
    label: "그릴 때와 맞힐 때, 기분이 어땠나요?",
    hint:
      "예) 내 그림을 못 알아볼까 봐 조마조마했다 / 친구 그림을 맞혔을 때 신났다.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "sk_perspective",
    phase: "worksheet",
    label: "남이 알아보게 그리려고 어떻게 신경 썼나요? 상대 입장에서 생각해 본 점을 적어 보세요",
    hint:
      "예) 특징을 크게 그렸다 / 다들 아는 모양으로 단순하게 그렸다 / 글자 대신 그림으로만.\n" +
      "‘보는 사람이 무엇을 떠올릴까’ 를 생각한 순간을 적어 봐요. 이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "sk_fun",
    phase: "worksheet",
    label: "(선택) 친구 그림 중 기억에 남는 것이나, 함께 웃었던 순간이 있다면 적어 주세요",
    hint: "안 적어도 괜찮아요. 이 칸은 나와 선생님만 봐요.",
    kind: "text",
    maxLength: 200,
  },

  /* ═══════════ ② 반복 죄수의 딜레마 게임 (훅 · grill) ═══════════ */
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

  /* ═══════════ ③ STREAMS 개인전 (게임 · wrapmap) ═══════════
   *
   * 죄수의 딜레마에 이어 또 하나의 게임. 클라이언트에서 계산·채점(공유 엔진 streams.ts),
   * 최고 점수만 answers 에 저장한다 — 서버·Gemini 없음. st_* 성찰·게임 결과는 galleryAnswerKeys
   * (["rule_ideas"])에 없으므로 자동 비공개다.
   */
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
    // STREAMS 개인전. 클라이언트 계산·채점, 최고 점수만 저장. 개인 기록(비공개).
    label: "STREAMS 개인전",
    hint: "‘게임 시작’ 을 누르고, 뽑힌 타일을 빈 칸에 놓아요. 20칸을 다 채우면 점수가 나와요.",
    kind: "streams_solo",
    maxLength: 0,
  },
  {
    key: "st_strategy",
    phase: "wrapmap",
    // 짧은 성찰(전략). 개인 글, 비공개.
    label: "타일을 어디에 놓을지 어떻게 정했나요? 나만의 방법이 있었나요?",
    hint: "예) 큰 숫자는 오른쪽에 남겨 뒀다 / 조커는 아껴 뒀다. 이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 250,
  },
  {
    key: "st_feel",
    phase: "wrapmap",
    // 짧은 성찰(기분). 개인 글, 비공개.
    label: "게임하는 동안 기분이 어땠나요? 짜릿했거나 아쉬웠던 순간이 있었나요?",
    hint: "예) 긴 줄기가 이어질 때 신났다 / 큰 숫자가 일찍 나와 아쉬웠다. 이 칸은 나와 선생님만 봐요.",
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
    // ★ 갤러리로 친구에게 나가는 유일한 칸(galleryAnswerKeys). AI 집계도 이 칸을 읽는다.
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
     * 받은 피드백. 갤러리(③) 뒤 problem 단계로 돌아오면 친구 피드백이 뜬다 — 그걸 보고 위
     * rule_ideas 를 고쳐 최종본으로 만든다(최종 수정 = 이 단계 재방문). 읽기 전용. 비공개.
     */
    label: "친구들이 내 규칙에 남긴 피드백",
    hint: "친구들의 의견을 보고, 위 규칙을 더 좋게 고쳐 보세요. (아직 없으면 감상·피드백 뒤에 나타나요.)",
    kind: "received_feedback",
    maxLength: 0,
  },

  /* ═══════════ ④ 우리 학교 규칙 완성 (AI 집계 · build) ═══════════ */
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
  title: "디지털 마음 톡톡 7회기 — 그림으로 마음 전하기 + 우리 학교 규칙 만들기",

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
    heading: "오늘 할 일 — 그림으로 마음 전하기 + 우리 학교 규칙 만들기",
    body:
      "① 그림으로 마음 전하기 — Sketchful.io 게임 + 돌아보기\n" +
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

  /*
   * 이탈 면제 — Sketchful.io 를 새 탭으로 여는 mvp 단계(게임이라 이탈로 안 센다).
   * 죄수딜레마(grill)는 포털 안이라 면제 불필요.
   */
  focusExempt: ["mvp"],

  // 교사 버튼 순서.
  // 마음 체크인(mood)은 별도 단계로 두지 않는다 — 대기 화면에서 기분 체크를 먼저 한다(교사 표준).
  phaseOrder: ["waiting", "mvp", "worksheet", "grill", "wrapmap", "problem", "gallery", "build", "reflection"],

  phaseLabels: {
    mvp: "① 그림으로 마음 전하기 (게임)",
    worksheet: "① 게임 후 돌아보기",
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
     * ★ 갤러리를 켜되, 나가는 칸은 rule_ideas 하나로 못박는다(위 프라이버시 주석 참조).
     * 이 두 값은 open-mt7 이 그대로 세션에 복사한다(감정 회기처럼 false 로 덮어쓰지 않는다).
     */
    galleryEnabled: true,
    galleryAnswerKeys: ["rule_ideas"],

    // 존중·건설적 피드백 두 칸(익명).
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
  const now = Date.now();
  // 회기번호가 샘플(seed-mt-rules 등)과 겹칠 수 있어, 이 활동의 계획을 activityId 로 집는다.
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} · 차시 번호 ${LESSON_NO} (7회기 조합: Sketchful + 공동체 규칙)`);
  console.log("교사 버튼 순서: 대기 → 마음 체크인 →");
  console.log("  [mvp] 그림으로 마음 전하기(Sketchful 새 탭) → [worksheet] 게임 후 성찰 4문항");
  console.log("  [grill] 반복 죄수의 딜레마 게임 + 성찰");
  console.log("  [wrapmap] STREAMS 개인전 + 짧은 성찰(전략·기분)");
  console.log("  [problem] 규칙 rows + 받은 피드백 → [gallery] 서로 감상·피드백(익명) → [build] 「규칙 완성하기」");
  console.log("  → 마음일기 → 마침");
  console.log("\n★ 프라이버시: galleryEnabled: true 지만 galleryAnswerKeys: [\"rule_ideas\"] 하나뿐.");
  console.log("  → 친구에게 나가는 것은 규칙(rule_ideas)뿐. sk_*(스케치풀 성찰)·pd_*(게임)·마음일기는 전부 비공개. 갤러리 익명.");
  console.log("AI 집계: 규칙 텍스트만 Gemini 로(이름·학번 미전송). 게임·완성표는 코드 기능이라 배포 전제.");
  console.log("세션 열기(오늘 화요일 1기): node --env-file=.env.local scripts/open-mt7-tue1.ts");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
