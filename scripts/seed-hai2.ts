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
 * ## AI 검토는 실제로 Gemini 를 부른다
 *
 * 학생이 먼저 두 질문에 스스로 답한 뒤, "AI에게 검토받기" 를 누르면 그 답까지 포함해
 * 지금까지 쓴 것 전부를 한 번에 Gemini 에 보내고 질문 2개를 받는다 (ai-review.ts).
 * AI는 점수·칭찬 없이 질문만 한다 — 계획서 §2.1 의 "질문자로 고정" 원칙 그대로다.
 *
 * 1인 1차시 3회 상한(서버, 인메모리)을 둔다. Gemini 가 죽거나 키가 없으면 빈 결과가
 * 오고, 화면은 "다시 눌러 보세요" 로 안내한다 — 검토 하나가 막혀도 수업은 굴러간다.
 *
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

/**
 * 캔바 학교 팀 초대 주소.
 *
 * **저장소에 적어 두지 않는다.** 주소에 붙은 토큰만 있으면 누구나 학교 캔바 팀에
 * 들어올 수 있는데, 이 저장소는 공개되어 있다. .env.local 에 넣고 여기서 읽는다
 * (`.env*` 는 무시 목록에 있다).
 *
 *   CANVA_INVITE_URL=https://www.canva.com/brand/join?token=...
 */
const CANVA_INVITE_URL = process.env.CANVA_INVITE_URL ?? "";

/** 7차시를 관통하는 활동 ID. 3차시 이후에도 같은 값을 쓰면 답이 이어진다 */
const ACTIVITY_ID = "hai-2026-1기";
/** 차시 번호가 정보과와 겹치므로(정보 2차시 vs 인간과AI 2차시) 100번대로 띄운다 */
const LESSON_NO = 102;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/**
 * 자기 검토 질문 (계획서 부록 A에서 하나를 뺐다).
 *
 * **v0.1 을 띄워 놓고** 답한다. 질문이 추상적이면 중1은 "잘 모르겠어요" 로 채운다.
 * 눈앞의 화면을 보고 답할 수 있는 것으로만 골랐다.
 *
 * 세 번째("하나만 남긴다면 어떤 기능일까요?") 는 뺐다. 이 시점엔 이미 다 만든 뒤라
 * "하나만 남긴다면" 이 가정으로 느껴지고, willFix("다음에 무엇을 바꿀까")와 하는
 * 역할이 겹친다.
 */
const GRILL_QUESTIONS = [
  "이 화면을 누가 쓸까요?",
  "만들어진 화면들이 내가 생각한 것과 어디가 다른가요?",
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
  /*
   * 캔바 사용법을 화면에 적어 둔다.
   *
   * 말로만 하면 22명 중 몇은 반드시 놓친다. 놓친 학생이 손을 들면 교사는 그 자리로 가고,
   * 그동안 나머지는 멈춘다 — 45분에서 뽑기에 쓸 수 있는 시간은 12분뿐이다.
   * 로그인·만들기·링크 가져오기를 셋으로 나눠, 막힌 학생이 어느 대목인지 스스로 짚게 한다.
   */
  {
    key: "_build_login",
    phase: "build",
    label: "① 캔바에 들어가기",
    hint:
      "아래 단추를 누르고 [Microsoft로 계속하기] 를 고릅니다.\n" +
      "학교 계정으로 로그인해요 — 26 뒤에 내 학번 5자리를 붙입니다.\n" +
      "예) 학번이 10130이면 → 2610130@jangpyung.sen.ms.kr\n" +
      "비밀번호는 학교 계정 비밀번호예요.",
    kind: "note",
    linkUrl: CANVA_INVITE_URL,
    linkLabel: "캔바 열기 (새 창)",
    maxLength: 0,
  },
  {
    key: "_build_make",
    phase: "build",
    label: "② 웹 앱 만들기",
    hint:
      "왼쪽 메뉴에서 [Canva AI] → [</> 코드] 를 누릅니다.\n" +
      "아래 프롬프트의 [복사하기] 를 누른 뒤 캔바에 붙여 넣고 만들어요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "build_prompt",
    phase: "build",
    /*
     * 앞에서 쓴 답으로 미리 채워 둔다.
     *
     * 읽기 전용으로 옆에 보여주기만 했더니 옮겨 적어야 하는 칸이 되었다. 45분에 뽑기까지
     * 가야 하는데 그 시간이 아깝고, 옮겨 적다가 내용이 달라지기도 한다.
     *
     * 고칠 수 있게 둔다 — 그대로 넣어도 되고 손봐도 된다. 다만 오늘은 일부러 대충 가는
     * 시간이라 잘 쓰라고 부추기지 않는다. 여기서 잘 쓰면 다음 시간 PRD 의 값이 사라진다.
     */
    label: "캔바에 넣을 프롬프트",
    hint: "앞에서 쓴 것으로 미리 채워 뒀어요. 그대로 써도 되고 고쳐도 됩니다.\n오늘은 일부러 대충 갑니다 — 잘 쓰려고 애쓰지 마세요. 왜 부족한지 찾는 게 오늘 할 일이에요.",
    kind: "long",
    maxLength: 300,
    prefillTemplate:
      "{mvp_one} 을(를) 만들어줘.\n꼭 필요한 기능은 {mvp_must1} 이야.\n{mvp_must2} 도 있으면 좋겠어.\n{mvp_must3} 도 넣어줘.",
    copyable: true,
  },
  {
    key: "_build_publish",
    phase: "build",
    label: "③ 링크 가져오기",
    hint:
      "오른쪽 위 파란색 [게시] 단추를 누릅니다.\n" +
      "그러면 주소(URL)가 나와요. 그걸 복사해서 아래 칸에 붙여 넣습니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "build_url",
    phase: "build",
    label: "만들어진 화면 링크 (v0.1)",
    hint: "이게 오늘의 결과물입니다. 다음 시간에도 이 주소를 씁니다.",
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
    key: "ai_review",
    phase: "grill",
    /*
     * 여기서부터가 진짜 "AI 검토" 다.
     *
     * 학생이 스스로 답한 것(grill_a1·a2)까지 포함해 지금까지 쓴 것 전부를 Gemini 에
     * 한 번에 보내고, 아직 안 짚은 것을 질문 2개로 돌려받는다. 미리 답을 쓰게 한 다음에
     * 부르는 이유: 백지 기획을 보고 묻는 것보다, "이미 스스로 답한 것 말고 무엇을
     * 놓쳤는지" 를 짚어야 학생이 안 겹치는 새 관점을 얻는다.
     *
     * AI는 점수도 칭찬도 안 준다 — 질문만 한다 (ai-review.ts 참조). 그래서 라벨도
     * "검토받기" 이지 "평가받기" 가 아니다.
     */
    label: "이제 AI에게 검토받아 봅시다",
    hint: "지금까지 쓴 것을 모아 AI에게 보여줘요. AI는 점수를 매기지 않고, 아직 생각 못한 것을 질문으로 물어봐요.",
    kind: "ai_review",
    maxLength: 0,
    reviewFields: [
      { key: "problem_what", label: "불편했던 것" },
      { key: "problem_who", label: "누구의 불편인가" },
      { key: "mvp_one", label: "제일 작게 만들면" },
      { key: "mvp_must1", label: "꼭 필요한 기능 ①" },
      { key: "mvp_must2", label: "꼭 필요한 기능 ②" },
      { key: "mvp_must3", label: "꼭 필요한 기능 ③" },
      { key: "grill_a1", label: "누가 쓸지 스스로 답한 것" },
      { key: "grill_a2", label: "생각과 다른 점을 스스로 답한 것" },
    ],
  },
  {
    key: "will_fix",
    phase: "grill",
    /*
     * 이 한 줄이 3차시 첫 화면에 뜬다 (carryOver).
     * 아이들이 빈 종이에서 다음 시간을 시작하지 않게 하는 장치다.
     *
     * "고칠 것" 에서 "추가하거나 개선할 것" 으로 바꾼다. "고칠 것" 은 무언가 잘못됐다는
     * 말인데, AI 검토를 받고 나면 "빠진 것을 더하고 싶다" 는 학생도 있다.
     */
    label: "그래서 다음 시간에 추가하거나 개선할 것 한 가지는?",
    hint: "이 줄은 다음 시간 화면 맨 위에 그대로 뜹니다. 나에게 남기는 쪽지예요.\nAI가 물어본 것 중 하나를 골라 답해도 좋아요.",
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
   *
   * "오늘 한 것" 을 나열하게 하지 않는다. 그건 일지지 회고가 아니다. 오늘 배운 것
   * 중에서 **오래 남길 만한 것 하나**를 스스로 고르게 해야, 딸깍과 심혈의 차이나
   * MVP 개념처럼 이 시간의 핵심이 지나가는 활동으로 안 끝나고 말로 남는다.
   */
  reflectionQuestions: [
    "오늘 배운 것 중에서 가장 오래 기억하고 싶은 것 하나를 고르고, 왜 그것이 중요하다고 생각하는지 적어 주세요.",
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

    /*
     * 감상 화면 왼쪽 필터.
     *
     * "나랑 비슷한 문제를 고른 친구", "나랑 비슷한 걸 만든 친구" 를 찾는 것이 22명의
     * 서로 다른 프로젝트를 훑어볼 때 가장 자연스러운 길이다. 글자가 정확히 같아야
     * 묶이므로(직업 집계와 같은 한계) 다 다르게 적으면 항목이 흩어지지만, 그래도
     * 아무 기준 없이 스물두 장을 순서대로 보는 것보다는 낫다.
     */
    galleryFacets: [
      { key: "who", label: "누구의 불편인가", answerKeys: ["problem_who"] },
      { key: "made", label: "무엇을 만들었나", answerKeys: ["mvp_one"] },
    ],

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
  if (!CANVA_INVITE_URL) {
    console.error(
      "✗ CANVA_INVITE_URL 이 없습니다.\n" +
        "  .env.local 에 캔바 학교 팀 초대 주소를 넣어 주세요:\n" +
        "  CANVA_INVITE_URL=https://www.canva.com/brand/join?token=...\n" +
        "  (저장소가 공개라 코드에 직접 적지 않습니다)",
    );
    process.exit(1);
  }

  const existing = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  const now = Date.now();

  if (existing.empty) {
    const ref = await db.collection("lessonPlans").add({ ...PLAN, createdAt: now, updatedAt: now });
    console.log(`✓ 등록 — ${PLAN.title} (${ref.id})`);
  } else {
    for (const doc of existing.docs) {
      await doc.ref.set({ ...PLAN, updatedAt: now }, { merge: true });
      console.log(`↻ 갱신 — ${PLAN.title} (${doc.id})`);

      /*
       * 아직 시작하지 않은 수업에만 다시 복사한다 (PRD 5.1).
       *
       * 여기서 0개가 나오면 **계획만 바뀌고 수업은 옛 화면 그대로**다. 학생이 보는 것은
       * 수업 스냅샷이라, 계획을 아무리 고쳐도 화면이 안 바뀐다.
       *
       * 실제로 그렇게 당했다 — 수업이 잠깐 "진행 중" 이었던 사이에 시드를 돌렸더니
       * 0개가 나왔고, 그 뒤에 상태를 되돌려 놓아서 아무도 눈치채지 못했다.
       * 조용히 지나가지 않게 크게 알린다.
       */
      const all = await db.collection("classSessions").where("lessonPlanId", "==", doc.id).get();
      const scheduled = all.docs.filter(
        (s) => (s.data() as { status: string }).status === "scheduled",
      );
      for (const s of scheduled) await s.ref.set({ ...PLAN }, { merge: true });
      console.log(`   아직 시작하지 않은 수업 ${scheduled.length}개에 반영`);

      const skipped = all.docs.filter(
        (s) => (s.data() as { status: string }).status !== "scheduled",
      );
      for (const s of skipped) {
        const x = s.data() as { status: string; code: string };
        console.warn(
          `   ⚠ ${s.id} (코드 ${x.code}) 는 ${x.status} 상태라 건너뛰었습니다.\n` +
            `     학생 화면은 옛 내용 그대로입니다. 아직 수업 전이라면 대시보드에서\n` +
            `     "수업 종료" 후 다시 열거나, 상태를 대기로 되돌리고 이 스크립트를 다시 실행하세요.`,
        );
      }
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
