/**
 * 33차시 계획 등록 - 「수행평가 ① 피지컬 컴퓨팅 프로젝트: 문제 찾기와 설계」 (교사 지시 전 실행 금지).
 *
 *   node --env-file=.env.local scripts/seed-lesson33.ts
 *   node --env-file=.env.local scripts/seed-lesson33.ts --force
 *
 * 설계: docs/superpowers/specs/2026-11-19-info-lesson33-34-assessment-design.md (교사 결정 2026-11-19 반영)
 *
 * ## 흐름 (2026-11-25 교사 피드백으로 다시 짬, 40분 가정)
 *   대기·체크인 → 안내 → ① 문제 발견(problem) → ② 문제 정의(mvp: 초기·목표 상태) → ③ 추상화(build: 센서·액추에이터·꼭 필요한 기능)
 *   → ④ 알고리즘(grill: 자연어 단계) → 마무리(reflection: 성찰 → 선생님께 검토 받기 → 단계별 피드백·잘했어요 → UNO)
 *   단계마다 AI 검토(ai_review, 답 없이 질문만, 단계당 3번), 화면 전체 복사·붙여넣기 막기(noClipboard),
 *   최소 분량(stepReview: 문제 2줄·30자, 상태 15자씩, 기능 2줄·30자, 알고리즘 4줄·40자).
 *
 * ## 키 (artifacts/microbit-makecode__학번 - 34차가 echo 로 이어받는다)
 *  mb33_problem · mb33_case · mb33_state_now · mb33_state_goal · mb33_in · mb33_out · mb33_func · mb33_algo
 *  · AI 검토 mb33_ai1~4 · mb33_summary(성찰 한 벌 저장). 32차 mb32_pa_problem · mb32_want_in·out 을 echo 한다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import type { LessonPlan, PhaseContent, WorksheetQuestion } from "../src/lib/types.ts";
import { PLAN as PLAN32 } from "./lesson32-plan.ts";

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

/*
 * 2026-11-25 교사 피드백으로 다시 짰다 (수행평가 ① 생각하는 차시, 40분 가정).
 *   ① 문제 발견(problem) → ② 문제 정의(mvp) → ③ 추상화(build) → ④ 알고리즘(grill) → 마무리(reflection)
 *   · 단계마다 「AI에게 검토 받기」(답·완성 문장 없이 방향 질문만, 단계당 3번까지)
 *   · 화면 전체 복사·붙여넣기 막기(noClipboard), 단계마다 최소 분량(stepReview)
 *   · 마무리: 성찰 제출 → 「선생님께 검토 받기」 → 선생님이 단계별 피드백이나 「잘했어요」 → UNO
 * 구현(포털 AI 코드 받기)은 34차로 미룬다. 키는 mb33_problem · mb33_case · mb33_in · mb33_out 그대로,
 * 새 키 mb33_state_now · mb33_state_goal · mb33_func · mb33_algo · AI 검토 mb33_ai1~4.
 */

const INPUT_CHOICES = ["버튼 A·B", "로고 터치", "기울기·흔들기 (가속도)", "빛", "온도", "소리 감지 (마이크)", "나침반"];
const OUTPUT_CHOICES = ["LED 5×5 (그림·글자·숫자)", "스피커 (소리·음악)"];

/** SVG 문자열을 데이터 주소로 (정적 파일 배포 없이 계획 안에 그림을 싣는다) */
function svgData(svg: string): string {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
}

const FONT = `font-family="'Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo',sans-serif"`;

/** ② 문제 정의 그림: 초기 상태 → (내 마이크로비트) → 목표 상태 */
const DEFINE_IMAGE = svgData(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 150" ${FONT}>
  <rect x="10" y="20" width="170" height="110" rx="14" fill="#fde2e2" stroke="#f87171" stroke-width="2"/>
  <text x="95" y="52" text-anchor="middle" font-size="15" font-weight="700" fill="#171717">초기 상태</text>
  <text x="95" y="80" text-anchor="middle" font-size="12.5" fill="#374151">지금, 문제가</text>
  <text x="95" y="100" text-anchor="middle" font-size="12.5" fill="#374151">아직 그대로인 모습</text>
  <text x="280" y="70" text-anchor="middle" font-size="13" fill="#374151">내 마이크로비트가</text>
  <text x="280" y="92" text-anchor="middle" font-size="26" font-weight="700" fill="#94a3b8">→</text>
  <rect x="380" y="20" width="170" height="110" rx="14" fill="#dcfce7" stroke="#34d399" stroke-width="2"/>
  <text x="465" y="52" text-anchor="middle" font-size="15" font-weight="700" fill="#171717">목표 상태</text>
  <text x="465" y="80" text-anchor="middle" font-size="12.5" fill="#374151">문제가 풀려서</text>
  <text x="465" y="100" text-anchor="middle" font-size="12.5" fill="#374151">달라진 모습</text>
</svg>`);

/** ④ 알고리즘 그림: 자연어로 쓴 단계 예시 (정답이 아니라 쓰는 모양만) */
const ALGO_IMAGE = svgData(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 190" ${FONT}>
  <text x="280" y="22" text-anchor="middle" font-size="14" font-weight="700" fill="#171717">예) 운동 횟수 세기 - 이렇게 번호를 붙여 차례대로</text>
  <g font-size="13" fill="#171717">
    <rect x="20" y="36" width="520" height="30" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
    <text x="34" y="56">1. 시작하면 횟수를 0 으로 둔다</text>
    <rect x="20" y="72" width="520" height="30" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
    <text x="34" y="92">2. 계속 반복: 흔들림이 느껴지는지 본다</text>
    <rect x="20" y="108" width="520" height="30" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
    <text x="34" y="128">3. 흔들리면 횟수를 1 늘리고 LED 에 숫자로 보여 준다</text>
    <rect x="20" y="144" width="520" height="30" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
    <text x="34" y="164">4. 횟수가 목표에 닿으면 소리로 알려 준다</text>
  </g>
</svg>`);

/** 단계마다 「AI에게 검토 받기」 - 답·완성 문장·코드는 주지 않고 방향이 되는 질문만 */
function aiReview(
  key: string,
  phase: "problem" | "mvp" | "build" | "grill",
  subject: string,
  fields: { key: string; label: string }[],
  fallback: string[],
): WorksheetQuestion {
  return {
    key,
    phase,
    label: "다음 단계로 가기 전에 - AI에게 검토 받기",
    hint: "AI는 답을 알려 주지 않고, 더 생각해 볼 질문만 해요. (이 단계에서 3번까지)",
    kind: "ai_review",
    reviewFields: fields,
    reviewCount: 2,
    reviewLimit: 3,
    reviewPersona: {
      role:
        "중학교 1학년의 마이크로비트(피지컬 컴퓨팅) 프로젝트 설계를 돕는 조력자. 정답, 완성된 문장, 코드는 절대 주지 않고, 학생이 스스로 고칠 방향이 보이는 질문만 하는 사람",
      subject,
    },
    reviewFallback: fallback,
    maxLength: 0,
  };
}

/* ── ① 문제 발견 (problem) ── */
const STEP1: WorksheetQuestion[] = [
  {
    key: "_mb33_echo32",
    phase: "problem",
    label: "지난 시간(32차) 성찰에 적은 것",
    hint: "이걸 출발점으로 삼아도 되고, 새 문제를 골라도 돼요.",
    kind: "echo",
    echoKeys: [{ key: "mb32_pa_problem", label: "32차 성찰" }],
    maxLength: 0,
  },
  {
    key: "mb33_problem",
    phase: "problem",
    label: "① 실생활에서 불편한 점 (2줄 이상)",
    hint:
      "누가 · 어떤 상황에서 · 무엇이 불편한지 2줄 이상 써요.\n" +
      "예) 우리 할머니는 저녁 약 먹을 시간을 자주 잊으세요.\n    약통을 봐도 먹었는지 헷갈리세요.",
    kind: "long",
    prefillTemplate: "{mb32_pa_problem}",
    maxLength: 600,
  },
  {
    key: "mb33_case",
    phase: "problem",
    label: "비슷한 문제를 푸는 생활 속 물건 하나 (선택)",
    hint: "센서로 느끼고 스스로 움직이는 물건이에요. 예) 자동문, 가로등, 체온계",
    kind: "text",
    maxLength: 100,
  },
  aiReview(
    "mb33_ai1",
    "problem",
    "학생이 찾은 실생활 속 불편(누가, 어떤 상황, 무엇이 불편한지)",
    [
      { key: "mb33_problem", label: "실생활에서 불편한 점" },
      { key: "mb33_case", label: "비슷한 생활 속 물건" },
    ],
    ["이 불편을 겪는 사람은 정확히 누구이고, 언제 가장 불편할까?", "이 불편이 풀리면 그 사람은 무엇을 덜 하게 될까?"],
  ),
];

/* ── ② 문제 정의 (mvp) ── */
const STEP2: WorksheetQuestion[] = [
  {
    key: "_mb33_define_note",
    phase: "mvp",
    label: "② 문제 정의 - 지금 모습과 바라는 모습",
    hint: "문제는 '초기 상태' 와 '목표 상태' 의 차이예요.\n둘을 또렷하게 쓰면, 무엇을 만들어야 할지가 보여요.",
    kind: "note",
    imageUrl: DEFINE_IMAGE,
    imageAlt: "초기 상태(문제가 아직 그대로인 지금 모습)에서 내 마이크로비트를 거쳐 목표 상태(문제가 풀려 달라진 모습)로 가는 그림",
    maxLength: 0,
  },
  {
    key: "mb33_state_now",
    phase: "mvp",
    label: "초기 상태 - 문제가 해결되지 않은 지금",
    hint: "지금 실제로 어떤 일이 벌어지나요? 예) 할머니가 약 먹을 시간을 놓치고, 먹었는지도 헷갈린다.",
    kind: "long",
    maxLength: 400,
  },
  {
    key: "mb33_state_goal",
    phase: "mvp",
    label: "목표 상태 - 문제가 해결된 모습",
    hint: "무엇이 어떻게 달라지면 해결된 걸까요? 예) 약 먹을 시간에 알려 주고, 먹었는지 바로 보인다.",
    kind: "long",
    maxLength: 400,
  },
  aiReview(
    "mb33_ai2",
    "mvp",
    "학생이 정한 문제의 초기 상태(지금)와 목표 상태(해결된 모습)",
    [
      { key: "mb33_problem", label: "불편한 점" },
      { key: "mb33_state_now", label: "초기 상태" },
      { key: "mb33_state_goal", label: "목표 상태" },
    ],
    ["목표 상태가 되었는지 눈으로 확인할 수 있는 표시는 무엇일까?", "초기 상태와 목표 상태 사이에서 가장 크게 달라지는 한 가지는 무엇일까?"],
  ),
];

/* ── ③ 추상화 (build) ── */
const STEP3: WorksheetQuestion[] = [
  {
    key: "_mb33_parts_note",
    phase: "build",
    label: "③ 추상화 - 꼭 필요한 것만 골라내기",
    hint: "초기 상태에서 목표 상태로 가려면 무엇이 꼭 필요할까요?\n본체 안의 부품 중에서 느낄 것(입력)과 알려 줄 것(출력)을 골라요.",
    kind: "note",
    imageUrl: "/mb32-parts.svg",
    imageAlt:
      "마이크로비트 본체 부품. 입력: 버튼 A·B, 로고 터치, 기울기·흔들기(가속도), 빛·온도, 소리 감지(마이크), 나침반. 출력: LED 5×5, 스피커",
    maxLength: 0,
  },
  {
    key: "_mb33_echo_want",
    phase: "build",
    label: "지난 시간에 써 보고 싶던 부품",
    hint: "참고만 하고, 내 문제에 꼭 맞는 것으로 다시 골라요.",
    kind: "echo",
    echoKeys: [
      { key: "mb32_pa_problem", label: "32차 성찰 (불편 · 써 보고 싶은 입력·출력)" },
      { key: "mb32_want_in", label: "고른 입력" },
      { key: "mb32_want_out", label: "고른 출력" },
    ],
    maxLength: 0,
  },
  {
    key: "mb33_in",
    phase: "build",
    label: "입력 - 꼭 필요한 센서 (여러 개 가능)",
    hint: "목표 상태가 되려면 무엇을 느껴야 하나요?",
    kind: "multi",
    choices: INPUT_CHOICES,
    maxLength: 0,
  },
  {
    key: "mb33_out",
    phase: "build",
    label: "출력 - 꼭 필요한 액추에이터 (여러 개 가능)",
    hint: "결과를 어떻게 알려 줄까요?",
    kind: "multi",
    choices: OUTPUT_CHOICES,
    maxLength: 0,
  },
  {
    key: "mb33_func",
    phase: "build",
    label: "꼭 들어가야 할 기능과 그 이유 (2줄 이상)",
    hint: "기능마다 한 줄씩, '이게 없으면 목표 상태가 안 된다' 는 이유를 함께 써요.\n예) 시간 알림 - 없으면 약 먹을 때를 또 놓친다.",
    kind: "long",
    maxLength: 600,
  },
  aiReview(
    "mb33_ai3",
    "build",
    "학생이 목표 상태로 가려고 고른 입력(센서)·출력(액추에이터)과 꼭 필요한 기능",
    [
      { key: "mb33_state_goal", label: "목표 상태" },
      { key: "mb33_in", label: "입력(센서)" },
      { key: "mb33_out", label: "출력(액추에이터)" },
      { key: "mb33_func", label: "꼭 필요한 기능과 이유" },
    ],
    ["고른 센서가 목표 상태를 정말 알아챌 수 있을까? 어떤 값을 보게 될까?", "빼도 목표 상태가 되는 기능이 있다면 무엇일까?"],
  ),
];

/* ── ④ 알고리즘 (grill) ── */
const STEP4: WorksheetQuestion[] = [
  {
    key: "_mb33_algo_note",
    phase: "grill",
    label: "④ 알고리즘 - 전체 흐름을 말로, 차례대로",
    hint: "처음 켤 때부터 끝까지, 마이크로비트가 할 일을 번호를 붙여 써요.\n'만약 ~ 이면', '계속 반복' 처럼 구체적으로. 코드는 안 써도 돼요.",
    kind: "note",
    imageUrl: ALGO_IMAGE,
    imageAlt: "운동 횟수 세기 예시: 1. 시작하면 횟수를 0으로 2. 계속 반복하며 흔들림을 본다 3. 흔들리면 횟수를 늘리고 LED에 보여 준다 4. 목표에 닿으면 소리로 알린다",
    maxLength: 0,
  },
  {
    key: "mb33_algo",
    phase: "grill",
    label: "내 작품의 알고리즘 (4줄 이상, 번호를 붙여서)",
    hint: "1. ... 2. ... 처럼 한 줄에 한 단계씩 써요.",
    kind: "long",
    maxLength: 1500,
  },
  aiReview(
    "mb33_ai4",
    "grill",
    "학생이 자연어로 쓴 마이크로비트 작품의 알고리즘(단계별 흐름)",
    [
      { key: "mb33_state_goal", label: "목표 상태" },
      { key: "mb33_in", label: "입력(센서)" },
      { key: "mb33_out", label: "출력(액추에이터)" },
      { key: "mb33_algo", label: "알고리즘" },
    ],
    ["어떤 단계가 '계속 반복' 되어야 할까? 지금 순서에 그게 드러나 있을까?", "조건이 맞지 않을 때(예: 센서 값이 기준보다 작을 때)는 무엇을 하게 될까?"],
  ),
];

const WORKSHEET: WorksheetQuestion[] = [...STEP1, ...STEP2, ...STEP3, ...STEP4];

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/** 32차 안내 탭에서 채점 기준 두 탭을 그대로 가져온다(평가 계획 문구). */
const RUBRIC_TABS = (PLAN32.assessment?.tabs ?? []).filter((t) => t.label.startsWith("채점"));

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "수행평가 ① 피지컬 컴퓨팅 프로젝트 - 문제 발견부터 알고리즘까지",
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
  // 보상 = UNO. 성찰 제출 → 선생님 검토(단계별 피드백이나 잘했어요)가 오면 열린다(교사 결정 2026-11-25).
  rewardGame: {
    heading: "수고했어요! 🃏",
    body: "선생님 검토가 끝났어요. 잠깐 UNO 로 쉬어요. 선생님이 부르면 돌아오세요.",
    url: "https://uno-game-gilt.vercel.app/",
    requires: [],
  },

  progress: empty(),

  assessment: {
    heading: "수행평가 ① - 오늘은 생각하고 설계하기",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘 할 일",
        subtitle: "네 단계, 단계마다 AI 검토 → 마지막에 선생님 검토",
        note: "복사·붙여넣기는 안 돼요. 내 말로 직접 써요.",
        rows: [
          { label: "① 문제 발견", value: "누가 · 어떤 상황에서 · 무엇이 불편한지 (2줄 이상)" },
          { label: "② 문제 정의", value: "초기 상태(지금) → 목표 상태(해결된 모습)" },
          { label: "③ 추상화", value: "꼭 필요한 센서 · 액추에이터 · 기능만 골라내기" },
          { label: "④ 알고리즘", value: "전체 흐름을 말로, 번호를 붙여 차례대로 (4줄 이상)" },
        ],
        highlights: [],
      },
      ...RUBRIC_TABS,
      {
        label: "AI 규칙",
        subtitle: "33~34차 모두",
        note: "보낸 말과 받은 답은 기록되고 선생님이 볼 수 있어요.",
        rows: [],
        highlights: [
          "포털 AI만 써요. 다른 AI 사이트(제미나이·챗GPT 등)는 안 돼요.",
          "AI 검토는 답을 주지 않아요. 받은 질문을 보고 내 글을 고쳐요.",
          "개인정보는 넣지 않아요.",
        ],
      },
    ],
  },

  video: empty(),

  // 마무리 - 한 줄 소개는 mb33_summary 에도 저장돼 34차에서 다시 보인다.
  reflectionQuestions: ["오늘 정한 내 프로젝트를 한 줄로 소개해요. (다음 시간에 다시 보여 줘요)"],
  reflectionPublic: false,
  reflectionAnswerKey: "mb33_summary",

  focusExempt: ["waiting"],
  phaseLabels: {
    assessment: "안내",
    problem: "① 문제 발견",
    mvp: "② 문제 정의",
    build: "③ 추상화",
    grill: "④ 알고리즘",
    reflection: "마무리",
  },
  phaseOrder: ["waiting", "assessment", "problem", "mvp", "build", "grill", "reflection"],
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "피지컬 컴퓨팅 프로젝트 ① 생각하고 설계하기",
      body: "① 문제 발견 → ② 문제 정의 → ③ 추상화 → ④ 알고리즘 → 마무리\n단계마다 AI 검토를 받고, 마지막에 선생님께 검토를 받아요.",
    },
    worksheet: WORKSHEET,
    galleryEnabled: false,
    sourcesEnabled: false,
    noClipboard: true,
    stepReview: {
      steps: [
        { phase: "problem", label: "① 문제 발견", fields: [{ key: "mb33_problem", label: "불편한 점", minLines: 2, minChars: 30 }] },
        {
          phase: "mvp",
          label: "② 문제 정의",
          fields: [
            { key: "mb33_state_now", label: "초기 상태", minChars: 15 },
            { key: "mb33_state_goal", label: "목표 상태", minChars: 15 },
          ],
        },
        {
          phase: "build",
          label: "③ 추상화",
          fields: [
            { key: "mb33_in", label: "입력" },
            { key: "mb33_out", label: "출력" },
            { key: "mb33_func", label: "꼭 필요한 기능", minLines: 2, minChars: 30 },
          ],
        },
        { phase: "grill", label: "④ 알고리즘", fields: [{ key: "mb33_algo", label: "알고리즘", minLines: 4, minChars: 40 }] },
      ],
    },
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
      { ...PLAN, updatedAt: now, quiz: FieldValue.delete() },
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
          moodCheckEnabled: PLAN.moodCheckEnabled,
          hideDoneButton: PLAN.hideDoneButton,
          game: PLAN.game,
          assessment: PLAN.assessment,
          reflectionQuestions: PLAN.reflectionQuestions,
          reflectionAnswerKey: PLAN.reflectionAnswerKey,
          focusExempt: PLAN.focusExempt,
          phaseOrder: PLAN.phaseOrder,
          freeNavigation: PLAN.freeNavigation,
          activity: PLAN.activity,
          rewardGame: PLAN.rewardGame,
        },
        { merge: true },
      );
      await session.ref.update({ phaseLabels: PLAN.phaseLabels });
      applied += 1;
    }
    console.log(`   열린 수업 ${applied}개에 반영`);
  }
  console.log("단계: 대기 → 기분 → 안내 → ① 문제 발견 → ② 문제 정의 → ③ 추상화 → ④ 알고리즘 → 마무리(성찰 → 선생님 검토 → UNO).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
