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
 *   최소 분량(stepReview, 2026-11-25 2차 피드백): ① 뜻·사례 3·누가·상황·불편 각 1줄 ② 상태 각 1줄·5자 ③ 기능 1개+ 각 5자 ④ 2줄·20자.
 *
 * ## 키 (artifacts/microbit-makecode__학번 - 34차가 echo 로 이어받는다)
 *  mb33_pc_def · mb33_pc_case1~3 · mb33_who · mb33_when · mb33_what · mb33_state_now · mb33_state_goal · mb33_in · mb33_out · mb33_func(list) · mb33_algo
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
 * 구현(포털 AI 코드 받기)은 34차로 미룬다. 2차 피드백: 불편을 누가·상황·무엇 세 칸(mb33_who·when·what)으로, 비슷한 기기 칸 삭제,
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
  <text x="280" y="70" text-anchor="middle" font-size="13" fill="#374151">문제가 해결되면</text>
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

/**
 * 단계마다 「AI에게 검토 받기」 - 단계 점검 모드(reviewRubric): ① 오탈자(틀린 곳만 짚고 고친 말은 안 줌)
 * ② 최소 분량 ③ 문맥(질문에 맞게, 앞 단계와 이어지게) → 방향 질문 2개. 무제한(reviewLimit 0, 교사 결정).
 */
function aiReview(
  key: string,
  phase: "problem" | "mvp" | "build" | "grill",
  subject: string,
  rubric: string,
  fields: { key: string; label: string }[],
  hints: [string, string],
): WorksheetQuestion {
  return {
    key,
    phase,
    label: "다음 단계로 가기 전에 - AI에게 검토 받기",
    hint: "AI가 오탈자 · 분량 · 질문에 맞게 썼는지를 짚고, 생각할 질문을 줘요.\n답은 알려 주지 않아요. 몇 번이든 받을 수 있어요.",
    kind: "ai_review",
    reviewFields: fields,
    reviewCount: 5,
    reviewLimit: 0,
    reviewRubric: rubric,
    reviewPersona: {
      role:
        "중학교 1학년의 마이크로비트(피지컬 컴퓨팅) 프로젝트 설계를 돕는 조력자. 정답, 완성된 문장, 고친 문장, 코드는 절대 주지 않고, 학생이 스스로 고칠 곳과 방향만 짚는 사람",
      subject,
    },
    // AI 가 안 될 때 - 점검 세 줄은 스스로 하게 바꿔 묻고, 질문 둘은 단계 것
    reviewFallback: [
      "오탈자가 없는지 소리 내어 한 번 읽어 볼까요?",
      `분량 기준(${rubric})을 채웠는지 칸마다 확인해 볼까요?`,
      "각 칸이 그 질문에 맞는 답인지, 앞 단계와 이어지는지 다시 볼까요?",
      ...hints,
    ],
    maxLength: 0,
  };
}

/* ── ① 문제 발견 (problem) ── 피지컬 컴퓨팅 뜻·사례를 스스로 찾고, 불편을 세 칸으로 */
const STEP1: WorksheetQuestion[] = [
  {
    key: "mb33_pc_def",
    phase: "problem",
    label: "피지컬 컴퓨팅이란? (스스로 찾아 내 말로)",
    hint: "인터넷에서 찾아보고, 읽은 뒤 내 말로 한두 줄 써요. (오픈북)",
    kind: "long",
    maxLength: 400,
  },
  {
    key: "mb33_pc_case1",
    phase: "problem",
    label: "피지컬 컴퓨팅 실생활 사례 1",
    hint: "센서로 느끼고 스스로 움직이는 물건을 찾아 써요. 무엇을 느끼고 무엇을 하는지도 함께.",
    kind: "text",
    maxLength: 150,
  },
  { key: "mb33_pc_case2", phase: "problem", label: "실생활 사례 2", hint: "사례 1과 다른 분야에서 찾아봐요.", kind: "text", maxLength: 150 },
  { key: "mb33_pc_case3", phase: "problem", label: "실생활 사례 3", hint: "집 · 학교 · 거리 · 병원 등 어디서든 좋아요.", kind: "text", maxLength: 150 },
  {
    key: "_mb33_echo32",
    phase: "problem",
    label: "참고 - 지난 시간(32차) 성찰에 적은 것",
    hint: "이걸 출발점으로 삼아도 되고, 새 불편을 찾아도 돼요.",
    kind: "echo",
    echoKeys: [{ key: "mb32_pa_problem", label: "32차 성찰" }],
    maxLength: 0,
  },
  {
    key: "mb33_who",
    phase: "problem",
    label: "실생활의 불편 - 누가",
    hint: "예) 우리 할머니",
    kind: "text",
    maxLength: 150,
  },
  {
    key: "mb33_when",
    phase: "problem",
    label: "어떤 상황에서",
    hint: "예) 저녁 약 먹을 시간에",
    kind: "text",
    maxLength: 200,
  },
  {
    key: "mb33_what",
    phase: "problem",
    label: "무엇이 불편한가",
    hint: "예) 약 먹을 때를 자주 잊고, 먹었는지도 헷갈리신다",
    kind: "text",
    maxLength: 300,
  },
  aiReview(
    "mb33_ai1",
    "problem",
    "학생이 찾은 피지컬 컴퓨팅의 뜻·실생활 사례 3개와, 실생활 속 불편(누가·어떤 상황·무엇이)",
    "피지컬 컴퓨팅 뜻과 사례 3개, 누가·어떤 상황·무엇이 불편 각각 1줄 이상",
    [
      { key: "mb33_pc_def", label: "피지컬 컴퓨팅이란" },
      { key: "mb33_pc_case1", label: "사례 1" },
      { key: "mb33_pc_case2", label: "사례 2" },
      { key: "mb33_pc_case3", label: "사례 3" },
      { key: "mb33_who", label: "누가" },
      { key: "mb33_when", label: "어떤 상황에서" },
      { key: "mb33_what", label: "무엇이 불편" },
    ],
    ["이 불편이 가장 자주 생기는 때는 언제일까?", "이 불편이 풀리면 그 사람은 무엇을 덜 하게 될까?"],
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
    imageAlt: "초기 상태(문제가 아직 그대로인 지금 모습)에서 문제가 해결되면 목표 상태(문제가 풀려 달라진 모습)로 가는 그림",
    maxLength: 0,
  },
  {
    key: "mb33_state_now",
    phase: "mvp",
    label: "초기 상태 - 문제가 해결되지 않은 지금 (1줄 이상)",
    hint: "지금 실제로 어떤 일이 벌어지나요? 예) 할머니가 약 먹을 시간을 놓치고, 먹었는지도 헷갈린다.",
    kind: "long",
    maxLength: 400,
  },
  {
    key: "mb33_state_goal",
    phase: "mvp",
    label: "목표 상태 - 문제가 해결된 모습 (1줄 이상)",
    hint: "무엇이 어떻게 달라지면 해결된 걸까요? 예) 약 먹을 시간에 알려 주고, 먹었는지 바로 보인다.",
    kind: "long",
    maxLength: 400,
  },
  aiReview(
    "mb33_ai2",
    "mvp",
    "학생이 정한 문제의 초기 상태(지금)와 목표 상태(해결된 모습)",
    "초기 상태·목표 상태 각각 1줄 이상, 5자 이상",
    [
      { key: "mb33_who", label: "누가" },
      { key: "mb33_when", label: "어떤 상황에서" },
      { key: "mb33_what", label: "무엇이 불편" },
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
    label: "꼭 들어가야 할 기능 (1개 이상)",
    hint: "칸마다 기능 하나, 한 줄로 써요. 더 있으면 「+ 기능 추가」.\n예) 약 먹을 시간이 되면 알려 주기",
    kind: "list",
    minItems: 1,
    maxItems: 6,
    addLabel: "+ 기능 추가",
    maxLength: 1200,
  },
  aiReview(
    "mb33_ai3",
    "build",
    "학생이 목표 상태로 가려고 고른 입력(센서)·출력(액추에이터)과 꼭 필요한 기능",
    "입력·출력을 하나 이상 고르고, 기능 1개 이상, 기능마다 5자 이상",
    [
      { key: "mb33_state_goal", label: "목표 상태" },
      { key: "mb33_in", label: "입력(센서)" },
      { key: "mb33_out", label: "출력(액추에이터)" },
      { key: "mb33_func", label: "꼭 필요한 기능" },
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
    label: "내 작품의 알고리즘 (2줄 이상, 번호를 붙여서)",
    hint: "1. ... 2. ... 처럼 한 줄에 한 단계씩 써요.",
    kind: "long",
    maxLength: 1500,
  },
  aiReview(
    "mb33_ai4",
    "grill",
    "학생이 자연어로 쓴 마이크로비트 작품의 알고리즘(단계별 흐름)",
    "2줄 이상, 20자 이상",
    [
      { key: "mb33_state_goal", label: "목표 상태" },
      { key: "mb33_in", label: "입력(센서)" },
      { key: "mb33_out", label: "출력(액추에이터)" },
      { key: "mb33_func", label: "꼭 필요한 기능" },
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
          { label: "① 문제 발견", value: "피지컬 컴퓨팅 뜻 · 사례 3개 찾기 → 누가 · 어떤 상황 · 무엇이 불편" },
          { label: "② 문제 정의", value: "초기 상태(지금) → 목표 상태(해결된 모습)" },
          { label: "③ 추상화", value: "꼭 필요한 센서 · 액추에이터 · 기능(1개 이상)만 골라내기" },
          { label: "④ 알고리즘", value: "전체 흐름을 말로, 번호를 붙여 차례대로 (2줄 이상)" },
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
        {
          phase: "problem",
          label: "① 문제 발견",
          fields: [
            { key: "mb33_pc_def", label: "피지컬 컴퓨팅이란", minLines: 1 },
            { key: "mb33_pc_case1", label: "사례 1", minLines: 1 },
            { key: "mb33_pc_case2", label: "사례 2", minLines: 1 },
            { key: "mb33_pc_case3", label: "사례 3", minLines: 1 },
            { key: "mb33_who", label: "누가", minLines: 1 },
            { key: "mb33_when", label: "어떤 상황에서", minLines: 1 },
            { key: "mb33_what", label: "무엇이 불편", minLines: 1 },
          ],
        },
        {
          phase: "mvp",
          label: "② 문제 정의",
          fields: [
            { key: "mb33_state_now", label: "초기 상태", minLines: 1, minChars: 5 },
            { key: "mb33_state_goal", label: "목표 상태", minLines: 1, minChars: 5 },
          ],
        },
        {
          phase: "build",
          label: "③ 추상화",
          fields: [
            { key: "mb33_in", label: "입력" },
            { key: "mb33_out", label: "출력" },
            { key: "mb33_func", label: "꼭 필요한 기능", minLines: 1, minItemChars: 5 },
          ],
        },
        { phase: "grill", label: "④ 알고리즘", fields: [{ key: "mb33_algo", label: "알고리즘", minLines: 2, minChars: 20 }] },
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
