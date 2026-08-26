/**
 * 정보과 6차시 — 디지털 시민 리포트 ① 준비하기 (수행평가 사전 예고).
 *
 *   node --env-file=.env.local scripts/seed-lesson6.ts
 *
 * ## 오늘은 쓰지 않는다
 *
 * 수행평가는 **다음 시간**에 본다. 사전 예고 규칙 때문이기도 하고, 예고 없이 보면
 * 준비한 학생과 안 한 학생의 차이가 아니라 **눈치 빠른 학생과 아닌 학생의 차이**가
 * 점수가 되기 때문이다.
 *
 * 그렇다고 45분을 안내로만 쓸 수는 없다. 그래서 이 시간의 본체는 **채점 기준을 직접
 * 채점해 보는 것**이다.
 *
 * ## 루브릭은 읽어 줘서는 안 남는다
 *
 * "구체적인 사례를 들어 설명하고 타당한 근거와 함께 서술함" 을 중1에게 읽어 주면
 * 고개는 끄덕이지만 정작 "AI 때문에 직업이 없어질 것 같다" 를 써 낸다. 상·중·하 답
 * 셋을 직접 채점해 보고 왜 그 등급인지 해설을 읽어야 기준이 손에 잡힌다.
 *
 * 퀴즈 부품은 마음 톡톡의 낱말 퀴즈와 같은 것을 쓴다(emotion-quiz.tsx) —
 * 틀리면 해설을 보고 그 문항만 다시 풀어 **전원이 100점에 도달**하는 구조다.
 * 채점 기준은 "대충 알겠다" 로 넘어가면 안 되는 것이라 이 방식이 맞는다.
 *
 * ## 초안은 쓰게 하지 않는다
 *
 * 준비는 "무엇을 쓸지 고르는 것" 까지만이다. 오늘 문장을 쓰게 하면 다음 시간이
 * 옮겨 적기가 되고, 그러면 평가가 아니라 필사를 채점하게 된다.
 *
 * ## 활동 ID 를 5차시와 같이 쓴다
 *
 * `career-plan` 을 그대로 쓴다. 5차시에 적은 희망 직업·일 분해·준비 계획이 같은
 * 문서에 있어서 echo 로 바로 띄울 수 있고, 다음 시간 리포트도 이 문서 하나만
 * 가져오면 5차시와 6차시 재료를 한꺼번에 얻는다.
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

/** 5차시와 같은 통. 희망 직업·일 분해가 이 문서에 있다 */
const ACTIVITY_ID = "career-plan";
const LESSON_NO = 6;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/**
 * 채점 연습에 쓰는 예시 답 셋.
 *
 * 실제 중1이 쓰는 문장으로 만들었다. 매끈한 모범답안을 보여주면 "나는 저렇게 못 써" 로
 * 끝나고, 정작 하 → 중 → 상 사이에 무엇이 더해졌는지가 안 보인다.
 *
 * 셋이 **같은 소재(요리사·서빙로봇)** 인 것이 중요하다. 소재가 다르면 학생은 등급이
 * 아니라 소재를 비교한다.
 */
const SAMPLE_LOW =
  "AI가 발전해서 앞으로 많은 직업이 없어질 것 같다.\n나도 걱정이 된다. 그래서 공부를 열심히 해야겠다.";

const SAMPLE_MID =
  "요즘 식당에 가면 서빙로봇이 음식을 가져다준다. 그래서 종업원 일자리가 줄었다고 한다.\n" +
  "나는 요리사가 되고 싶은데 로봇이 요리도 하게 될까 봐 걱정이다.\n" +
  "그래도 사람이 만든 음식이 더 맛있을 것 같다.";

const SAMPLE_HIGH =
  "우리 동네 분식집에도 서빙로봇이 들어왔다. 주문을 받고 나르는 일은 로봇이 하고,\n" +
  "사장님은 그 시간에 새 메뉴를 만드신다.\n" +
  "나는 요리사가 되고 싶어서 지난 시간에 요리사가 하는 일을 셋으로 나눠 봤는데,\n" +
  "‘재료 손질’ 과 ‘주문 확인’ 은 인공지능이 가져갈 것 같고 ‘새로운 맛을 만드는 일’ 은\n" +
  "사람에게 남을 것 같았다.\n" +
  "그래서 나는 레시피를 그대로 따라 하는 연습보다, 맛을 상상해서 조합해 보는 연습을 하려고 한다.\n" +
  "이번 달에는 집에서 새로운 재료 조합으로 한 가지를 만들어 볼 계획이다.";

const WORKSHEET: WorksheetQuestion[] = [
  {
    key: "_rubric_note",
    phase: "worksheet",
    label: "채점 기준을 직접 채점해 봅시다",
    hint:
      "같은 주제(요리사·서빙로봇)로 쓴 답 셋이 나옵니다. 어느 것이 상·중·하일까요?\n" +
      "틀려도 괜찮아요 — 해설을 읽고 그 문제만 다시 풀면 됩니다. 다 맞혀야 다음 단계가 열려요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "rubric_quiz",
    phase: "worksheet",
    label: "채점 기준 익히기",
    hint: "하(등급 매기기) → 중(기준 알기) → 상(고쳐 쓰기·AI 규칙) 차례로 깨 봅시다.",
    kind: "emotion_quiz",
    maxLength: 0,
    quizDoneMessage:
      "이제 무엇이 ‘상’ 인지 알았어요. 아래에서 내가 쓸 사례를 하나 골라 둡시다.",
    quizItems: [
      // ── 하: 예시 답 등급 매기기 ─────────────────────────
      {
        level: "easy",
        prompt: `다음 답은 어느 등급일까요?\n\n${SAMPLE_LOW}`,
        choices: ["상", "중", "하"],
        answerIndex: 2,
        explain:
          "사례가 없습니다. “많은 직업이 없어진다” 는 어디선가 들은 말이지 사례가 아니에요. 진로와 이은 부분도 “공부를 열심히” 뿐이라 이 직업이 왜 그런지가 없습니다.",
      },
      {
        level: "easy",
        prompt: `다음 답은 어느 등급일까요?\n\n${SAMPLE_MID}`,
        choices: ["상", "중", "하"],
        answerIndex: 1,
        explain:
          "서빙로봇이라는 사례가 있고, 요리사라는 진로와도 이었어요. 그런데 “걱정이다 / 더 맛있을 것 같다” 에서 멈춥니다 — 왜 그렇게 생각하는지 근거가 없어요. 그 근거가 상과 중을 가릅니다.",
      },
      {
        level: "easy",
        prompt: `다음 답은 어느 등급일까요?\n\n${SAMPLE_HIGH}`,
        choices: ["상", "중", "하"],
        answerIndex: 0,
        explain:
          "‘우리 동네 분식집’ 이라는 구체적 사례, 요리사라는 진로 연결, 지난 시간에 일을 셋으로 나눠 본 근거, 그리고 이번 달에 할 일까지 있습니다. 사례 → 근거 → 계획이 한 줄로 이어져요.",
      },

      // ── 중: 무엇이 사례이고 무엇이 근거인가 ─────────────
      {
        level: "mid",
        prompt: "‘상’ 과 ‘중’ 을 가르는 것 두 가지는 무엇일까요?",
        choices: [
          "글씨를 예쁘게 쓰는 것과 분량이 많은 것",
          "구체적인 사례와 타당한 근거",
          "어려운 낱말을 쓰는 것과 문장이 긴 것",
          "인공지능을 많이 쓰는 것과 자료를 많이 찾는 것",
        ],
        answerIndex: 1,
        explain:
          "채점 기준표에 그대로 적혀 있어요 — “구체적인 사례를 들어 설명하고, 타당한 근거와 함께 서술함”. 길게 쓴다고 올라가지 않습니다.",
      },
      {
        level: "mid",
        prompt: "다음 중 ‘사례’ 에 해당하는 것은?",
        choices: [
          "인공지능이 요즘 많이 발전했다",
          "앞으로 세상이 많이 바뀔 것이다",
          "우리 동네 분식집에 서빙로봇이 들어와서 사장님이 주문을 안 받으신다",
          "사람들이 인공지능을 걱정한다",
        ],
        answerIndex: 2,
        explain:
          "사례는 **어디서 무슨 일이 있었는지**입니다. 내가 본 것, 뉴스에서 읽은 것처럼 짚을 수 있어야 해요. 나머지 셋은 다 “느낌” 입니다.",
      },
      {
        level: "mid",
        prompt: "다음 중 ‘근거’ 에 해당하는 것은?",
        choices: [
          "그냥 그럴 것 같아서",
          "친구도 그렇게 말해서",
          "지난 시간에 요리사가 하는 일을 셋으로 나눠 보니 재료 손질은 정해진 순서라서 인공지능이 할 수 있을 것 같았다",
          "인터넷에 그렇게 나와 있어서",
        ],
        answerIndex: 2,
        explain:
          "근거는 **왜 그렇게 생각했는지 과정**이 보이는 것입니다. “정해진 순서라서” 처럼 이유가 있어야 해요. “인터넷에 나와서” 는 출처지 근거가 아닙니다.",
      },

      // ── 상: 고쳐 쓰기와 AI 규칙 ─────────────────────────
      {
        level: "hard",
        prompt: "‘중’ 인 답을 ‘상’ 으로 올리려면 무엇을 더해야 할까요?",
        choices: [
          "분량을 두 배로 늘린다",
          "왜 그렇게 생각하는지 근거와, 그래서 내가 무엇을 할지 계획을 더한다",
          "어려운 전문 용어를 넣는다",
          "인공지능에게 다시 써 달라고 한다",
        ],
        answerIndex: 1,
        explain:
          "‘중’ 은 사례와 진로 연결까지는 있었어요. 빠진 것은 **근거**와 **그래서 무엇을 할 것인가**입니다. 이 둘이 붙으면 상이 됩니다.",
      },
      {
        level: "hard",
        prompt: "인공지능이 써 준 문장을 출처를 안 밝히고 그대로 냈습니다. 어떻게 될까요?",
        choices: [
          "그대로 점수를 받는다",
          "감점만 조금 된다",
          "그 내용은 채점에서 빠진다",
          "다시 쓰면 된다",
        ],
        answerIndex: 2,
        explain:
          "유의사항에 그대로 적혀 있어요. 선생님이 “이 부분 무슨 뜻이야?” 물었을 때 답을 못 해도 마찬가지로 빠집니다. 인공지능을 쓰는 것은 괜찮아요 — **밝히지 않는 것**이 문제입니다.",
      },
      {
        level: "hard",
        prompt: "인공지능을 썼다면 활동지에 무엇을 적어야 할까요?",
        choices: [
          "인공지능 이름만 적으면 된다",
          "무엇을 물었는지와, 그 답을 어떻게 썼는지",
          "아무것도 안 적어도 된다",
          "인공지능이 답한 내용을 통째로 붙여 넣는다",
        ],
        answerIndex: 1,
        explain:
          "질문과 **활용 방식** 둘 다입니다. “이렇게 물었고, 그중 이 부분만 참고해서 내 말로 고쳐 썼다” 처럼 적으면 돼요.",
      },
    ],
  },

  /*
   * 5차시에 쓴 것을 다시 띄운다.
   *
   * 활동 ID 가 같아서 carryOver 없이 echo 로 바로 읽힌다. 다음 시간 리포트가
   * 여기서 출발하므로, "내가 이미 이만큼 써 뒀다" 를 눈으로 보고 가는 것이 중요하다.
   */
  {
    key: "_mine_note",
    phase: "worksheet",
    label: "내가 이미 써 둔 것",
    hint: "다음 시간 리포트는 여기서 출발합니다. 새로 지어내지 않아도 돼요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_mine_echo",
    phase: "worksheet",
    label: "",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "job", label: "내 희망 직업" },
      { key: "task1", label: "그 직업이 하는 일 ①" },
      { key: "task1_ai", label: "↳ 인공지능이 가져갈까" },
      { key: "synergy", label: "남는 시간에 할 것" },
      { key: "strength", label: "내가 키워야 할 능력" },
      { key: "prep_now", label: "이번 달에 할 것" },
    ],
    maxLength: 0,
  },
  {
    key: "report_case",
    phase: "worksheet",
    /*
     * 오늘 쓰게 하는 유일한 칸. **문장이 아니라 소재만** 고르게 한다.
     *
     * 여기서 초안을 쓰게 하면 다음 시간이 옮겨 적기가 되고, 그러면 평가가 아니라
     * 필사를 채점하게 된다. 한 줄이면 무엇을 쓸지 정하기엔 충분하다.
     */
    label: "다음 시간 리포트에 쓸 ‘사례’ 를 하나 골라 한 줄로 적어 두세요",
    hint:
      "내가 직접 보거나 들은 것이 가장 좋아요. 뉴스에서 본 것도 됩니다.\n" +
      "예) 우리 동네 분식집에 서빙로봇이 들어왔다 / 아빠 회사에서 AI가 번역을 한다\n\n" +
      "오늘은 여기까지만 적습니다. 문장은 다음 시간에 써요.",
    kind: "text",
    maxLength: 100,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "디지털 시민 리포트 ① — 준비하기",
  moodCheckEnabled: true,

  game: {
    heading: "기다리는 동안 — 2048",
    body: "같은 숫자끼리 밀어서 합치세요.\n오늘은 512만 넘어도 잘한 거예요.",
    url: "https://2048-game-gilt-kappa.vercel.app/",
  },
  gameExplainer: empty(),
  progress: empty(),
  video: empty(),

  /*
   * 사전 예고의 본체.
   *
   * 말로만 하면 결석했거나 딴생각한 학생이 그대로 놓친다. 화면에 남겨 두면 다음
   * 시간까지 학생이 스스로 다시 볼 수 있고, "안 알려 주셨잖아요" 가 안 나온다.
   *
   * 탭을 넷으로 나눈 이유: 한 화면에 다 밀어 넣으면 중1은 첫 줄만 읽는다.
   */
  assessment: {
    heading: "수행평가 예고 — 디지털 시민 리포트 ①",
    body: "",
    url: "",
    tabs: [
      {
        label: "무엇을 쓰나요",
        subtitle: "인공지능이 바꾼 사회·직업과 나의 진로",
        note: "이번 리포트는 두 번에 나눠 씁니다. 오늘 예고하는 것은 ① 진로 부분이에요.",
        rows: [
          { label: "언제", value: "다음 정보 시간 (오늘은 쓰지 않습니다)" },
          { label: "얼마나", value: "25분 · 혼자 쓰기" },
          { label: "무엇을", value: "인공지능으로 사회와 직업이 어떻게 바뀌었는지 사례를 들고, 그것을 내 진로와 이어서 쓰기" },
          { label: "가져올 것", value: "없습니다. 4·5차시에 쓴 활동지가 화면에 저절로 뜹니다" },
          { label: "볼 수 있는 것", value: "오픈북 — 내 활동지, 인터넷, 인공지능 (선생님이 열어 준 시간에만)" },
        ],
        highlights: [
          "오늘은 쓰지 않습니다. 무엇을 어떻게 쓰는지 익히는 시간이에요.",
          "외워 올 것은 없습니다. 무엇을 쓸지만 정해 두세요.",
        ],
      },
      {
        label: "어떻게 채점하나요",
        subtitle: "디지털 사회와 진로 탐구",
        note: "아래 문구는 채점표에 적힌 그대로입니다.",
        rows: [
          {
            label: "상",
            value: "인공지능 기술로 인한 사회와 직업의 변화를 구체적인 사례를 들어 설명하고, 자신의 진로 계획과 연결 지어 타당한 근거와 함께 서술함",
          },
          {
            label: "중",
            value: "인공지능 기술로 인한 사회와 직업의 변화를 사례를 들어 설명하고, 자신의 진로와 관련지어 서술함",
          },
          {
            label: "하",
            value: "인공지능 기술로 인한 사회와 직업의 변화를 부분적으로 설명함",
          },
        ],
        highlights: [
          "상과 중을 가르는 것은 딱 두 가지 — 구체적인 사례와 타당한 근거입니다.",
          "길게 쓴다고 올라가지 않아요. 짧아도 사례와 근거가 있으면 상입니다.",
        ],
      },
      {
        label: "인공지능 쓸 때",
        subtitle: "써도 됩니다. 다만 밝혀야 합니다",
        note: "이 규칙은 선생님이 정한 것이 아니라 수행평가 안내에 적힌 것입니다.",
        rows: [
          { label: "언제", value: "선생님이 열어 준 시간에만. 그 밖의 시간에 기기·인터넷을 쓰면 부정행위입니다" },
          { label: "넣지 말 것", value: "다른 사람의 학번·이름·학교명 — 내 개인정보도 굳이 넣지 않습니다" },
          { label: "적을 것", value: "무엇을 물었는지, 그리고 그 답을 어떻게 썼는지" },
          { label: "안 밝히면", value: "그 내용은 채점에서 빠집니다. 내용을 물었을 때 답을 못 해도 마찬가지입니다" },
        ],
        highlights: [
          "인공지능을 쓰는 것은 괜찮아요. 밝히지 않는 것이 문제입니다.",
          "인공지능 글을 그대로 내면, 내가 쓴 것이 없어서 채점할 것도 없어집니다.",
        ],
      },
      {
        label: "다음은요",
        subtitle: "리포트 ②는 나중에",
        note: "",
        rows: [
          { label: "리포트 ②", value: "개인 정보 · 저작권 · 디지털 윤리를 배운 뒤에 씁니다" },
          { label: "왜 나눴나", value: "아직 안 배운 것을 쓰라고 할 수는 없으니까요. 배운 것부터 씁니다" },
        ],
        highlights: ["오늘 익힌 채점 기준은 리포트 ②에서도 그대로 씁니다."],
      },
    ],
  },

  /*
   * 성찰 한 문항.
   *
   * "오늘 배운 것" 을 묻지 않는다. 오늘의 목적은 지식이 아니라 **다음 시간 준비**라,
   * 자기가 어디가 약한지 스스로 짚는 것이 그대로 준비가 된다.
   */
  reflectionQuestions: [
    "오늘 채점 기준을 직접 매겨 봤지요.\n다음 시간 리포트에서 내가 가장 자신 없는 부분은 무엇인가요? (사례 찾기 / 근거 쓰기 / 진로와 잇기 중에서)\n그리고 그것을 위해 무엇을 준비하면 좋을지 적어 주세요.",
  ],
  reflectionPublic: false,

  /*
   * 활동지를 쓰는 동안은 이탈로 세지 않는다. 사례를 찾으려면 검색해야 하고,
   * 그걸 이탈로 세면 학생이 눈치를 보느라 안 찾아본다 (5차시와 같은 이유).
   */
  focusExempt: ["worksheet"],
  phaseLabels: {
    assessment: "수행평가 예고",
    worksheet: "채점 기준 익히기",
  },

  activity: {
    activityId: ACTIVITY_ID,
    // 그리기가 없는 차시. 장소를 비우면 그리기 화면이 안 뜬다.
    places: [],
    year: 2040,
    worksheet: WORKSHEET,

    /*
     * 서로 구경하기를 막는다.
     *
     * 수행평가 **준비** 시간이다. 내가 쓸 사례를 서로 보면 그대로 베끼고, 그러면
     * 다음 시간 리포트가 스물여덟 명이 같은 분식집 이야기가 된다.
     */
    galleryEnabled: false,

    sourceHints: {
      site: "예) 뉴스 — 서빙로봇 도입 기사",
      ai: "예) 챗지피티 — 요리사 일이 어떻게 바뀔지 물어봄",
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
        console.warn(
          `   ⚠ ${s.id} (코드 ${x.code}) 는 ${x.status} 상태라 건너뛰었습니다.\n` +
            `     학생 화면은 옛 내용 그대로입니다.`,
        );
      }
    }
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} (5차시와 같은 통 — echo 로 지난 답을 띄웁니다)`);
  console.log("단계: 대기 → 기분 → 수행평가 예고 → 채점 기준 익히기 → 성찰 → 마침");
  console.log("오늘은 리포트를 쓰지 않습니다. 채점 기준을 익히고 쓸 사례만 골라 둡니다.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
