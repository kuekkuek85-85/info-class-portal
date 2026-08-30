/**
 * 정보과 7차시 — 디지털 시민 리포트 ① 쓰기 (수행평가 실시).
 *
 *   node --env-file=.env.local scripts/seed-lesson7.ts
 *
 * ## 6차시가 준비물이고 오늘이 마감이다
 *
 * 활동 통이 같아서(career-plan) 6차시에 그린 그림과 밑기사 ①②가 오늘 화면에 그대로
 * 열린다. 오늘 붙이는 것은 **③ 이미 시작되고 있다(취재)** 와 **④ 인터뷰** 둘이고,
 * 그러면 기사 한 편이 된다.
 *
 * 6차시 답을 echo(읽기 전용)로 띄우지 않는다. 마감 차시라 다듬을 수 있어야 하므로
 * **편집 가능한 칸**으로 그대로 다시 연다.
 *
 * ## 3단계로 낸다
 *
 *   1차 제출 → AI 점검(즉시) → 고치기 → 2차 제출 → 교사 피드백 → 최종 제출
 *
 * **1차 제출이 곧 수행평가 제출물이다.** 2차·최종은 여유 있는 학생을 더 올리는
 * 장치이지 완료 조건이 아니다. 28명에게 교사 피드백을 다 주려면 교사 한 사람에게
 * 14분이 직렬로 쌓이고, 그러면 종이 칠 때 "미완성" 인 학생이 생긴다 — 수행평가에
 * 쓸 수 없는 설계다.
 *
 * 루프는 활동지 안의 `submit` 칸 하나에서 지난다. 단계(LESSON_PHASES)를 새로 파면
 * 교사가 전체를 한꺼번에 넘겨야 해서 빠른 학생이 느린 학생을 기다린다 — **학생마다
 * 진도가 다른 것이 이 설계의 전제**다.
 *
 * ## AI 는 정량적인 것만 본다
 *
 * 빠진 조건·문장 수·오탈자까지다. ②의 '왜' 가 설득되는지, ③이 ①②와 이어지는지는
 * 보지 않는다 — 그것은 교사의 몫이고, 정성 평가를 기계에 맡기지 않는 것이 이
 * 수행평가의 원칙이다 (article-check.ts).
 *
 * 출처가 비어도 결함이 아니다. 안 찾고 쓰는 학생이 있고, 그것을 "빠뜨림" 으로
 * 표시하면 안 찾은 것을 숨기게 된다. 한 번 묻기만 한다.
 *
 * ## 40분 배분
 *
 *   기분 3 · 그림 마무리 4 · 기사 완성과 루프 30 · 성찰 3
 *
 * 기분 체크는 마감 차시에도 넣는다. 매일 하는 루틴이라 이 날만 빼면 그 자체가
 * "오늘은 평가라서 다르다" 는 신호가 된다.
 *
 * 그림은 4분이면 된다. 6차시에 이미 20분을 그렸고 남은 것은 안 끝낸 학생의 마무리와
 * 이름표 보강이다.
 *
 * ③ 취재는 **찾는 것을 한 건으로** 줄였다. 검색이 길어지면 1차 제출이 25분에 몰려
 * 루프가 한 바퀴도 안 돈다. 찾는 일은 짧게 끝내고, 그 한 건을 세 문장으로 푸는 데
 * 시간을 쓰게 한다 — 막힌 학생을 위해 예시를 hint 에 박아 둔다.
 *
 * ## 길이 제한을 푼다
 *
 * ①②③ 을 각각 세 줄 이상 쓰라고 교사가 구두로 안내했다. 6차시의 300~400자 제한을
 * 그대로 두면 안 쓴 것이 아니라 **못 쓴 것**이 된다.
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

/** 5·6차시와 같은 통. 그림과 밑기사가 이 문서에 있다 */
const ACTIVITY_ID = "career-plan";
const LESSON_NO = 7;

/**
 * 기사 본문 칸의 글자 수 제한을 사실상 푼다.
 *
 * 6차시에서는 300~400자로 묶어 두었다. 밑기사만 쓰는 시간이라 그만큼이면 됐고,
 * 길이를 열어 두면 한 칸에 다 쓰고 다음 칸을 비우는 학생이 나온다.
 *
 * 7차시는 마감이다. ①②③ 을 각각 세 줄 이상 쓰라고 안내했으므로 **묶어 두면 안 쓴
 * 것이 아니라 못 쓴 것이 된다.** 0 을 넣으면 화면이 기본값(long 500자)으로 되돌아가므로
 * (worksheet-view 의 `question.maxLength || 500`) 큰 값을 명시한다.
 *
 * 완전히 푸는 대신 4000 으로 둔다 — 붙여넣기 사고로 한 문서가 부풀어도 다섯 칸 합쳐
 * 20KB 라 Firestore 문서 한도(1MB)와 거리가 멀다.
 */
const NO_LIMIT = 4000;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const WORKSHEET: WorksheetQuestion[] = [
  {
    key: "_final_note",
    phase: "worksheet",
    label: "오늘은 기사를 마감합니다",
    hint:
      "지난 시간에 쓴 제목과 ①② 가 아래에 그대로 있습니다. 고쳐도 됩니다.\n" +
      "오늘 새로 붙이는 것은 ③ 과 ④ 둘이에요.\n\n" +
      "다 쓰면 맨 아래에서 제출합니다. 내고 나서도 고칠 수 있어요.",
    kind: "note",
    maxLength: 0,
  },

  /*
   * 6차시 답을 그대로 다시 연다.
   *
   * 같은 활동 통이라 answers 에 이미 들어 있다. echo 로 띄우면 읽기만 되는데,
   * 마감 차시에는 다듬을 수 있어야 한다 — 지난 시간에 급히 쓴 문장을 못 고치면
   * 그 상태로 채점된다.
   */
  {
    key: "news_title",
    phase: "worksheet",
    label: "기사 제목",
    hint: "무슨 일이 있었는지가 한 줄에 보이게 씁니다.\n예) 동네 분식집, 로봇이 나르고 사람이 만든다",
    kind: "text",
    maxLength: 60,
  },
  {
    key: "news_scene",
    phase: "worksheet",
    label: "① 현장 — 사진 속에서 무슨 일이 벌어지고 있나",
    hint:
      "세 문장 이상 씁니다. 줄을 바꾸거나 마침표를 찍으면 나뉘어요.\n" +
      "내가 그린 것만 씁니다. 안 그린 것을 지어내면 설명할 것이 없어져요.\n\n" +
      "예) 2036년 3월, {이름} 씨는 동네 식당에서 요리사로 일한다.\n" +
      "    홀에서는 서빙로봇이 음식을 나르고 있다.\n" +
      "    {이름} 씨는 주방에서 새 메뉴를 만드는 중이다.",
    kind: "long",
    maxLength: NO_LIMIT,
  },
  {
    key: "news_change",
    phase: "worksheet",
    label: "② 무엇이 바뀌었나 · 왜 그런가",
    hint:
      "세 문장 이상 씁니다. 예전에는 어땠는지, 지금은 무엇이 달라졌는지,\n" +
      "그리고 “왜 그렇게 되는지” 까지.\n" +
      "“왜” 가 빠지면 기사가 아니라 소식 전달이 돼요 — 상과 중을 가르는 것이 바로 그 이유입니다.\n\n" +
      "예) 예전에는 요리사가 주문을 받고 음식도 날랐다.\n" +
      "    지금은 그 일을 로봇이 한다.\n" +
      "    정해진 순서대로 하는 일이라 기계가 대신하기 쉽기 때문이다.",
    kind: "long",
    maxLength: NO_LIMIT,
  },

  /*
   * ③ 취재. 오늘 새로 붙이는 첫 번째.
   *
   * **한 건만, 한 줄로.** 검색을 열어 두면 중1은 10분을 쓴다. 그러면 1차 제출이
   * 25분에 몰려 루프가 한 바퀴도 안 돈다. 예시를 hint 에 박아 막힌 학생이 바로
   * 출발할 수 있게 한다 — 그대로 베끼지 말라는 말을 함께 붙인다.
   */
  {
    key: "news_real",
    phase: "worksheet",
    label: "③ 이미 시작되고 있다 — 진짜로 있는 일 하나",
    hint:
      "찾는 것은 **한 건만**입니다. 오래 뒤지지 마세요.\n" +
      "그 한 건을 세 문장으로 풉니다 — 무엇을 봤는지, 거기서 무슨 일이 일어나고 있는지,\n" +
      "그것이 내 기사와 어떻게 이어지는지.\n\n" +
      "예) 2026년 네이버 뉴스에서, 서빙로봇을 들인 식당이 늘고 있다는 기사를 봤다.\n" +
      "    벌써 사람 대신 로봇이 음식을 나르는 가게가 생기고 있다는 것이다.\n" +
      "    내가 그린 2036년 식당은 그것이 더 퍼진 모습이다.\n\n" +
      "못 찾겠으면 이런 데를 보세요 — 네이버 뉴스 · 유튜브 · 구글 검색.\n" +
      "그대로 베끼지 말고 내 말로 바꿔 쓰고, 찾은 곳은 아래 「출처」 칸에 적어 주세요.",
    kind: "long",
    maxLength: NO_LIMIT,
  },

  /*
   * ④ 인터뷰. 주인공이 자기 자신이다.
   *
   * "나는" 으로 시작하면 누구 이야기든 될 수 있는 글이 나온다. {이름} 을 박아 두면
   * 자기 그림과 5차시에 적은 자기 직업을 들여다봐야 다음 문장이 이어진다 (6차시와 같은 이유).
   */
  {
    key: "news_interview",
    phase: "worksheet",
    label: "④ {이름} 씨 인터뷰",
    hint:
      "기자가 물었을 때 내가 뭐라고 답할지 씁니다. 큰따옴표로 시작해 보세요.\n" +
      "예) “로봇이 들어와서 편해졌냐” 고 묻자 {이름} 씨는 이렇게 답했다.\n" +
      "    “나르는 일은 로봇이 하지만, 무슨 맛을 낼지는 아직 제가 정합니다.”",
    kind: "long",
    maxLength: NO_LIMIT,
  },

  /*
   * 2차로 내기 전 자기 점검.
   *
   * 판단은 **학생이 한다.** AI 는 정성 평가를 하지 않는다는 원칙이 여기서도 그대로다.
   *
   * 그리고 여기서 아래 세 개를 고른 학생이 곧 교사가 먼저 가 봐야 할 학생이다 —
   * 대기 줄을 그 순서로 세운다 (대시보드). 스스로 "약한 것 같다" 고 한 학생을
   * 먼저 만나는 편이, 다 됐다고 한 학생을 순서대로 도는 것보다 낫다.
   */
  {
    key: "news_check2",
    phase: "worksheet",
    label: "2차로 내기 전에 — 소리 내어 한 번 읽어 보세요",
    hint: "고른 것에 따라 선생님이 오는 순서가 정해집니다. 솔직하게 고르세요.",
    kind: "choice",
    choices: [
      "② 의 ‘왜’ 가 한 문장으로 보인다",
      "읽어 보니 ② 의 ‘왜’ 가 약한 것 같다",
      "③ 이 ①② 와 따로 노는 것 같다",
      "잘 모르겠다 — 선생님께 여쭙겠습니다",
    ],
    maxLength: 0,
  },

  /*
   * 사진 설명. 교사를 기다리는 동안 할 일이다.
   *
   * 실제 신문의 요소이고, 그림과 기사를 잇는 일이라 평가 방향에도 맞는다. 한 줄이라
   * 부담이 없다. 대기 시간이 빈 시간이 되지 않게 하는 것이 목적이다.
   */
  {
    key: "news_caption",
    phase: "worksheet",
    label: "사진 설명 — 그림 아래에 붙일 한 줄",
    hint:
      "신문에서 사진 밑에 작게 붙는 그 줄입니다.\n" +
      "예) 2036년 3월, 로봇이 음식을 나르는 동네 분식집 주방",
    kind: "text",
    maxLength: 80,
  },

  {
    key: "news_submit",
    phase: "worksheet",
    label: "다 썼으면 제출하세요",
    hint: "",
    kind: "submit",
    maxLength: 0,
    /*
     * 글자 수가 아니라 **문장 수**로 센다.
     *
     * 교사가 교실에서 구두로 안내하는 것이 "①②③ 은 각각 세 줄 이상" 이다. 그것을
     * 글자 수로 옮기면 학생이 듣고 이해한 기준과 화면이 말하는 기준이 어긋난다 —
     * 세 줄을 썼는데 "짧아요" 가 뜨거나, 한 줄을 길게 늘여 쓰고 통과한다.
     *
     * 줄바꿈도 문장으로 센다. 중1은 마침표를 잘 안 찍는데, 마침표만 세면 또박또박
     * 세 줄을 쓴 학생이 막힌다 (article-check 의 countSentences).
     */
    submitFields: [
      { key: "news_title", label: "제목", minSentences: 1 },
      { key: "news_scene", label: "① 현장", minSentences: 3 },
      { key: "news_change", label: "② 무엇이 바뀌었나 · 왜", minSentences: 3 },
      { key: "news_real", label: "③ 이미 시작되고 있다", minSentences: 3 },
      // 인터뷰는 묻고 답하는 두 마디가 기본이다
      { key: "news_interview", label: "④ 인터뷰", minSentences: 2 },
    ],
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "디지털 시민 리포트 ① — 쓰기",
  moodCheckEnabled: true,

  game: {
    heading: "기다리는 동안 — 2048",
    body: "같은 숫자끼리 밀어서 합치세요.\n오늘은 수행평가라 시작하면 바로 닫습니다.",
    url: "https://2048-game-gilt-kappa.vercel.app/",
  },
  gameExplainer: empty(),
  progress: empty(),
  video: empty(),

  /*
   * 오늘은 예고가 아니라 안내다. 6차시에 예고한 것을 한 장으로 줄여 다시 보여준다 —
   * 결석했던 학생과, 예고를 들었지만 잊은 학생이 있다.
   */
  assessment: {
    heading: "오늘 수행평가를 씁니다 — 디지털 시민 리포트 ①",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘 할 일",
        subtitle: "기사 한 편을 마감합니다",
        note: "지난 시간에 그린 그림과 밑기사가 화면에 그대로 열립니다.",
        rows: [
          { label: "앞 4분", value: "그림 마무리 — 이름표가 빠진 데가 있으면 지금 붙이세요" },
          { label: "그다음", value: "③ 진짜로 있는 일 하나 찾아 붙이기 + ④ 내 인터뷰 쓰기" },
          { label: "제출", value: "다 쓰면 맨 아래에서 1차 제출. 내고 나서도 고칠 수 있습니다" },
          { label: "볼 수 있는 것", value: "오픈북 — 내 활동지, 인터넷, 인공지능" },
        ],
        highlights: [
          "1차 제출이 곧 제출물입니다. 2차·최종까지 못 가도 미완성이 아니에요.",
          "그림도 함께 채점합니다. 다만 그리기 솜씨는 보지 않아요 — 무엇을 나타냈는지만 봅니다.",
        ],
      },
      {
        label: "어떻게 내나요",
        subtitle: "세 번에 나눠 냅니다",
        note: "빨리 끝낸 사람이 더 다듬을 수 있게 한 것이에요.",
        rows: [
          { label: "1차", value: "제출하면 빠진 것과 오탈자를 바로 알려 줍니다" },
          { label: "2차", value: "고쳐서 다시 내면 선생님이 읽고 답을 줍니다" },
          { label: "최종", value: "선생님 말을 반영해서 마지막으로 냅니다" },
        ],
        highlights: [
          "1차에서 알려 주는 것은 “빠졌다 · 짧다 · 이 낱말 확인” 까지입니다. 내용이 좋은지는 선생님이 봐요.",
          "출처를 안 적었으면 한 번 물어봅니다. 안 찾고 썼다면 그대로 두셔도 됩니다.",
        ],
      },
      {
        label: "인공지능을 써도 되나요",
        subtitle: "써도 됩니다. 다만 밝혀야 합니다",
        note: "",
        rows: [
          { label: "써도 되는 것", value: "막힐 때 물어보기, 낱말 찾기, 내가 쓴 문장 다듬기" },
          { label: "밝히는 곳", value: "「출처」 칸에 무엇을 물었고 어디까지 썼는지 한 줄" },
          { label: "안 되는 것", value: "통째로 시켜서 그대로 붙여넣기" },
        ],
        highlights: [
          "인공지능을 쓰는 것은 괜찮아요. 밝히지 않는 것이 문제입니다.",
          "인공지능 글을 그대로 내면, 내가 쓴 것이 없어서 채점할 것도 없어집니다.",
        ],
      },
    ],
  },

  /*
   * 성찰 한 줄. 마감 뒤에 묻는 것이라 더 가볍게 간다.
   *
   * 오늘 배운 것을 묻지 않는다. 40분을 쓰기에 다 쓴 뒤라 손이 무겁고, 무엇보다
   * 오늘의 일은 지식이 아니라 **마감**이었다. 그 경험을 한 줄로 남기게 한다.
   */
  reflectionQuestions: [
    "기사를 마감해 봤습니다.\n" +
      "고치기 전과 후에서, 가장 크게 달라진 곳은 어디였나요? 한 줄만 적어 주세요.",
  ],
  reflectionPublic: false,

  /*
   * 활동지와 그리기 중에는 이탈로 세지 않는다.
   *
   * ③ 을 찾으려면 검색해야 한다. 그것을 이탈로 세면 학생이 눈치를 보느라 안 찾아보고,
   * 그러면 오늘 새로 붙이라고 한 것이 통째로 비어 버린다 (5·6차시와 같은 이유).
   */
  focusExempt: ["worksheet", "draw"],
  phaseLabels: {
    assessment: "오늘 할 일",
    draw: "그림 마무리",
    worksheet: "기사 완성하고 제출하기",
  },

  activity: {
    activityId: ACTIVITY_ID,

    /*
     * 6차시와 같은 장소 목록·연도를 둔다.
     *
     * 학생이 이미 고른 장소가 artifact 에 있으므로 다시 고르지 않는다. 목록이 없으면
     * 그리기 화면 자체가 안 뜨고, 그러면 6차시 그림을 마무리할 자리가 없어진다.
     */
    places: ["병원", "학교", "식당", "사무실", "공장", "가게", "무대·경기장", "연구실"],
    year: 2036,
    drawPrompt: {
      heading: "지난 시간 그림을 마무리합니다",
      body:
        "새로 그리지 않아도 됩니다. 지난 시간 것이 그대로 열려요.\n\n" +
        "앞 4분 동안 두 가지만 봐 주세요.\n" +
        "  · 덜 그린 데가 있으면 채우기\n" +
        "  · [글자] 도구로 이름표 붙이기 — 그림도 함께 채점합니다\n" +
        "    예) 서빙로봇 · 이 로봇이 하는 일: 음식 나르기 · 내가 하는 일: 새 메뉴 만들기\n\n" +
        "이름표가 없으면 그림을 읽어 줄 수가 없어요.",
    },
    techExamples: [
      "서빙로봇",
      "자동 진단 AI",
      "번역 AI",
      "자율주행 배달차",
      "챗봇 상담",
      "3D 프린터",
      "재고 관리 AI",
      "자동 계산대",
      "수술 보조 로봇",
      "AI 추천 시스템",
    ],
    worksheetIntro: {
      heading: "2036년 ○○신문 — 기사 마감하기",
      body:
        "내가 그린 그림이 신문 1면 사진입니다. 그 사진 옆에 붙일 기사를 완성합니다.\n" +
        "지난 시간에 쓴 ①② 는 그대로 있어요. 오늘은 ③ 과 ④ 를 붙입니다.",
    },
    worksheet: WORKSHEET,

    /*
     * 서로 구경하기를 막는다. 수행평가 **실시** 시간이다.
     *
     * 6차시(준비)에서도 막아 두었는데, 오늘은 더 그렇다. 남의 ③ 사례를 보면 그대로
     * 베끼고, 그러면 스물여덟 명이 같은 기사를 낸다.
     */
    galleryEnabled: false,

    sourceHints: {
      site: "예) 네이버 뉴스 — 서빙로봇 도입 기사 (2026.9.)",
      ai: "예) 챗지피티 — ‘서빙로봇이 들어오면 식당 일이 어떻게 바뀌는지’ 물어봄. 답 중 ‘주문받는 일이 준다’ 만 참고하고 나머지는 내가 씀",
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (5·6차시와 같은 통 — 그림과 밑기사가 그대로 열립니다)`);
  console.log("단계: 대기 → 기분 → 오늘 할 일 → 그림 마무리 → 기사 완성하고 제출하기 → 성찰 → 마침");
  console.log("40분 배분 — 기분 3 · 그림 4 · 기사와 루프 30 · 성찰 3 = 40분");
  console.log("제출은 1차 → AI 점검 → 2차 → 교사 피드백 → 최종. 1차 제출이 곧 제출물입니다.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
