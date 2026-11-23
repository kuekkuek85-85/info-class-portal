/**
 * 33차시 계획 등록 - 「수행평가 ① 피지컬 컴퓨팅 프로젝트: 문제 찾기와 설계」 (교사 지시 전 실행 금지).
 *
 *   node --env-file=.env.local scripts/seed-lesson33.ts
 *   node --env-file=.env.local scripts/seed-lesson33.ts --force
 *
 * 설계: docs/superpowers/specs/2026-11-19-info-lesson33-34-assessment-design.md (교사 결정 2026-11-19 반영)
 *
 * ## 흐름 (45분) - 33차 = 생각하는 차시 + 구현 시작
 *   대기·체크인 3 → 안내(assessment: 오늘 할 일 · 채점 기준 · 오픈북·AI 규칙) 3
 *   → ① 문제 발견·정의(problem) 12: 32차 성찰 echo → 내가 풀 문제 → 생활 속 사례와 그 가치(채점 ① 근거)
 *   → ② 구성요소 설계(mvp) 15: 부품 그림 · 32차 고른 입력·출력 echo → 입력·출력 고르기 → 입력·처리·출력 표
 *   → ③ 구현 시작(grill) 10: 포털 AI(이어서 부탁하기) + AI 검토 기록 + 지난 작품 예시 코드 5개(오픈북)
 *   → 마무리(reflection) 2: 내 프로젝트 한 줄 소개 → mb33_summary 에도 저장(34차 echo)
 *
 * ## 교사 결정
 *  · 보상 게임 없음(수행평가). 먼저 끝나면 ③ 구현을 계속한다.
 *  · 포털 AI만(외부 AI 금지). 오픈북: 인터넷 검색 가능, 교과서 없음, 지난 차시는 예시 코드 칸.
 *  · 하드웨어는 본체 내장 부품만.
 *
 * ## 키 (학번별 공유 답안 artifacts/microbit-makecode__학번 - 34차가 echo 로 이어받는다)
 *  mb33_problem · mb33_case · mb33_case_value · mb33_in · mb33_out · mb33_flow(rows) · mb33_vibe · mb33_ai_log(rows)
 *  · mb33_summary(성찰 한 벌 저장). 32차 키 mb32_pa_problem · mb32_want_in · mb32_want_out 을 echo 한다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import type { LessonPlan, PhaseContent, WorksheetQuestion } from "../src/lib/types.ts";
import { PLAN as PLAN32 } from "./lesson32-plan.ts";
import { exampleBlocks } from "./microbit-examples.ts";

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
    privateKey: requiredEnv("FIREBASE_PRIVATE_KEY")
      .replace(/^["']|["']$/g, "")
      .replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const LESSON_PLANS = "lessonPlans";
const LESSON_NO = 33;
const FORCE = process.argv.includes("--force");
const ACTIVITY_ID = "microbit-makecode";

/** 포털 AI '처음 코드' - 빈 프로그램(빈 함수엔 pass). 학생은 ② 에서 정한 것을 말로 부탁한다. */
const EMPTY_START = `def on_forever():
    pass
basic.forever(on_forever)`;

const INPUT_CHOICES = ["버튼 A·B", "로고 터치", "기울기·흔들기 (가속도)", "빛", "온도", "소리 감지 (마이크)", "나침반"];
const OUTPUT_CHOICES = ["LED 5×5 (그림·글자·숫자)", "스피커 (소리·음악)"];

/* ── ① 문제 발견·정의 (problem) ── */
const STEP1: WorksheetQuestion[] = [
  {
    key: "_mb33_echo32",
    phase: "problem",
    label: "지난 시간(32차)에 적은 불편",
    hint: "이걸 출발점으로 삼아도 되고, 새 문제를 골라도 돼요.",
    kind: "echo",
    echoKeys: [{ key: "mb32_pa_problem", label: "32차에 적은 불편" }],
    maxLength: 0,
  },
  {
    key: "mb33_problem",
    phase: "problem",
    label: "① 내가 풀 문제",
    hint: "집·가족·운동·건강·동네·취미 등 실생활에서 누가 · 언제 · 무엇이 불편한지 한두 문장으로 써요.\n예) 할머니가 약 먹을 시간을 자주 잊으세요 · 줄넘기할 때 몇 번 했는지 헷갈려요.",
    kind: "long",
    prefillTemplate: "{mb32_pa_problem}",
    maxLength: 400,
  },
  {
    key: "mb33_case",
    phase: "problem",
    label: "생활 속 피지컬 컴퓨팅 사례 하나",
    hint: "센서로 느끼고 스스로 움직이는 물건이에요. 예) 자동문, 가로등, 체온계",
    kind: "text",
    maxLength: 100,
  },
  {
    key: "mb33_case_value",
    phase: "problem",
    label: "그 사례는 왜 필요할까요? (가치)",
    hint: "누구에게 어떤 도움이 되는지, 없으면 무엇이 불편한지 써요.",
    kind: "long",
    maxLength: 300,
  },
];

/* ── ② 구성요소 설계 (mvp) ── */
const STEP2: WorksheetQuestion[] = [
  {
    key: "_mb33_parts_note",
    phase: "mvp",
    label: "② 구성요소 설계 - 쓸 수 있는 부품",
    hint: "본체 안의 부품만 써요. 내 문제를 풀려면\n무엇을 느끼고(입력) 무엇을 보여 줘야(출력) 할까요?",
    kind: "note",
    imageUrl: "/mb32-parts.svg",
    imageAlt:
      "마이크로비트 본체 부품. 입력: 버튼 A·B, 로고 터치, 기울기·흔들기(가속도), 빛·온도, 소리 감지(마이크), 나침반. 출력: LED 5×5, 스피커",
    maxLength: 0,
  },
  {
    key: "_mb33_echo_want",
    phase: "mvp",
    label: "지난 시간에 끌렸던 부품",
    hint: "참고만 해요. 내 문제에 맞는 것으로 다시 골라요.",
    kind: "echo",
    echoKeys: [
      { key: "mb32_want_in", label: "써 보고 싶던 입력" },
      { key: "mb32_want_out", label: "써 보고 싶던 출력" },
    ],
    maxLength: 0,
  },
  {
    key: "mb33_in",
    phase: "mvp",
    label: "내 작품의 입력 (센서, 여러 개 가능)",
    hint: "문제를 풀려면 무엇을 느껴야 하나요?",
    kind: "multi",
    choices: INPUT_CHOICES,
    maxLength: 0,
  },
  {
    key: "mb33_out",
    phase: "mvp",
    label: "내 작품의 출력 (액추에이터, 여러 개 가능)",
    hint: "결과를 어떻게 알려 줄까요?",
    kind: "multi",
    choices: OUTPUT_CHOICES,
    maxLength: 0,
  },
  {
    key: "mb33_flow",
    phase: "mvp",
    label: "입력 → 처리 → 출력 (동작 원리)",
    hint: "한 줄에 하나씩, 1~3줄이면 충분해요.",
    kind: "rows",
    rowColumns: [
      { key: "in", label: "입력 (이럴 때)", placeholder: "예) 소리가 커지면" },
      { key: "proc", label: "처리 (이렇게 판단해서)", placeholder: "예) 소리 크기가 기준보다 큰지 봐요" },
      { key: "out", label: "출력 (이렇게 알려요)", placeholder: "예) LED 화난 얼굴 + 삐 소리" },
    ],
    maxRows: 4,
    maxLength: 2000,
  },
];

/* ── ③ 구현 시작 (grill) - 포털 AI + 검토 기록 + 예시 코드 ── */
const STEP3: WorksheetQuestion[] = [
  {
    key: "_mb33_ai_note",
    phase: "grill",
    label: "③ 구현 시작 - 포털 AI 로 첫 코드 받기",
    hint:
      "② 에서 정한 입력 → 처리 → 출력을 AI 에게 말해 첫 코드를 받아요.\n" +
      "MakeCode 'Python' 에 붙여 실물로 돌려 보고, 먼저 끝나면 계속 고쳐요.\n" +
      "다른 사람 이름·연락처 같은 개인정보는 넣지 않아요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "mb33_vibe",
    phase: "grill",
    label: "포털 AI 에게 부탁하기",
    hint: "한 번에 하나씩, 무엇이 어떻게 되면 좋을지 적어요.",
    kind: "vibe_code",
    vibeTarget: "microbit",
    vibeBaseCode: EMPTY_START,
    vibeContinue: true,
    vibeNoun: "내 프로젝트",
    vibePlaceholder: "예) 소리가 크면 LED 에 화난 얼굴을 보여 주고 삐 소리를 내 줘",
    maxLength: 0,
  },
  {
    key: "mb33_ai_log",
    phase: "grill",
    label: "AI 검토 기록 (채점에 들어가요)",
    hint: "AI 답을 그대로 믿지 말고, 실물로 돌려 보며 확인·고친 것을 적어요.",
    kind: "rows",
    rowColumns: [
      { key: "ask", label: "AI 에게 물어본 것", placeholder: "예) 소리가 크면 화난 얼굴" },
      { key: "check", label: "확인하거나 고친 것", placeholder: "예) 기준 숫자 128 이 너무 커서 80 으로" },
      { key: "why", label: "왜", placeholder: "예) 방 안 소리로는 안 바뀌어서" },
    ],
    maxRows: 8,
    maxLength: 3000,
  },
  ...exampleBlocks("mb33", "grill"),
];

const WORKSHEET: WorksheetQuestion[] = [...STEP1, ...STEP2, ...STEP3];

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/** 32차 안내 탭에서 채점 기준 두 탭을 그대로 가져온다(평가 계획 문구). */
const RUBRIC_TABS = (PLAN32.assessment?.tabs ?? []).filter((t) => t.label.startsWith("채점"));

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "수행평가 ① 피지컬 컴퓨팅 프로젝트 - 문제 찾기와 설계",
  moodCheckEnabled: true,
  hideDoneButton: true,

  game: {
    heading: "기다리는 동안 - 파이썬 타자 연습",
    body:
      "수업이 시작되길 기다리는 동안 파이썬 타자 연습을 해 봐요.\n" +
      "아래 단추로 새 탭에서 열려요. 수업이 시작되면 돌아오세요.",
    url: "link:https://python-typing-helper.vercel.app/",
  },
  gameExplainer: empty(),
  // 보상 게임 없음(교사 결정 - 수행평가 중엔 게임을 두지 않는다).

  progress: empty(),

  assessment: {
    heading: "수행평가 ① - 오늘은 문제 찾기와 설계",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘 할 일",
        subtitle: "33차: 생각하고 설계하기",
        note: "먼저 끝나면 ③ 구현을 계속해요.",
        rows: [
          { label: "① 문제 발견·정의", value: "내가 풀 생활 속 불편 + 피지컬 컴퓨팅 사례와 그 가치" },
          { label: "② 구성요소 설계", value: "입력·출력 부품 고르기 + 입력 → 처리 → 출력 표" },
          { label: "③ 구현 시작", value: "포털 AI 로 첫 코드 → 실물로 확인 → 검토 기록" },
        ],
        highlights: [],
        imageUrl: "/mb32-pa-flow.svg",
        imageAlt: "33차: ① 문제 발견·정의, ② 구성요소 설계. 34차: ③ AI로 구현·검토, ④ 성찰. 그다음 제출",
      },
      ...RUBRIC_TABS,
      {
        label: "오픈북·AI 규칙",
        subtitle: "33~34차 모두",
        note: "보낸 말과 받은 답은 기록되고 선생님이 볼 수 있어요.",
        rows: [],
        highlights: [
          "포털 AI만 써요. 다른 AI 사이트(제미나이·챗GPT 등)는 안 돼요.",
          "인터넷 검색은 돼요. 지난 작품 코드는 ③ 의 참고 칸에 있어요.",
          "개인정보는 넣지 않아요. 묻고 고친 것을 기록하고, 설명하지 못하면 채점에서 빠질 수 있어요.",
        ],
      },
    ],
  },

  video: empty(),

  // 마무리 한 줄 - mb33_summary 에도 저장돼 34차에서 다시 보인다.
  reflectionQuestions: ["오늘 정한 내 프로젝트를 한 줄로 소개해요. (다음 시간에 다시 보여 줘요)"],
  reflectionPublic: false,
  reflectionAnswerKey: "mb33_summary",

  focusExempt: ["waiting", "grill"],
  phaseLabels: {
    assessment: "안내",
    problem: "① 문제 발견·정의",
    mvp: "② 구성요소 설계",
    grill: "③ 구현 시작",
    reflection: "마무리",
  },
  phaseOrder: ["waiting", "assessment", "problem", "mvp", "grill", "reflection"],
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "피지컬 컴퓨팅 프로젝트 ① 문제 찾기와 설계",
      body: "① 문제 발견·정의 → ② 구성요소 설계 → ③ 구현 시작\n쓴 것은 모두 자동으로 저장되고, 다음 시간에 이어져요.",
    },
    worksheet: WORKSHEET,
    galleryEnabled: false,
    sourcesEnabled: false,
  },
};

async function main(): Promise<void> {
  const found = await db.collection(LESSON_PLANS).where("lessonNo", "==", LESSON_NO).get();
  const mine = found.docs.filter((d) => !(d.data() as { variant?: string }).variant);
  const now = Date.now();
  if (mine.length === 0) {
    const ref = await db.collection(LESSON_PLANS).add({ ...PLAN, createdAt: now, updatedAt: now });
    console.log(`＋ 등록 - ${PLAN.title} (${ref.id})`);
  } else {
    const doc = mine[0];
    await doc.ref.set(
      { ...PLAN, updatedAt: now, rewardGame: FieldValue.delete(), quiz: FieldValue.delete() },
      { merge: true },
    );
    await doc.ref.update({ phaseLabels: PLAN.phaseLabels });
    console.log(`↻ 갱신 - ${PLAN.title} (${doc.id})`);

    const live = await db
      .collection("classSessions")
      .where("lessonNo", "==", LESSON_NO)
      .where("status", "in", ["scheduled", "active"])
      .get();
    let applied = 0;
    for (const session of live.docs.filter((s) => (s.data() as { lessonPlanId?: string }).lessonPlanId === doc.id)) {
      const joined = await db.collection("attendance").where("sessionId", "==", session.id).limit(1).get();
      if (!joined.empty && !FORCE) {
        console.log(`· ${session.id} - 이미 학생이 들어와 있어 건드리지 않습니다 (--force 로 덮어쓸 수 있습니다)`);
        continue;
      }
      await session.ref.set(
        {
          title: PLAN.title,
          assessment: PLAN.assessment,
          reflectionQuestions: PLAN.reflectionQuestions,
          reflectionAnswerKey: PLAN.reflectionAnswerKey,
          focusExempt: PLAN.focusExempt,
          phaseOrder: PLAN.phaseOrder,
          freeNavigation: PLAN.freeNavigation,
          activity: PLAN.activity,
          rewardGame: FieldValue.delete(),
        },
        { merge: true },
      );
      await session.ref.update({ phaseLabels: PLAN.phaseLabels });
      applied += 1;
    }
    console.log(`   열린 수업 ${applied}개에 반영`);
  }
  console.log("단계: 대기 → 기분 → 안내 → ① 문제 발견·정의 → ② 구성요소 설계 → ③ 구현 시작(포털 AI 이어서) → 마무리. 게임 없음.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
