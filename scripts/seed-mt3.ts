/**
 * 「디지털 마음 톡톡」(자유학기 주제선택) 3회기.
 *
 *   node --env-file=.env.local scripts/seed-mt3.ts
 *
 * ## 2회기에서 못 하고 넘어간 다섯 걸음만 남긴다
 *
 * 90분에 아홉 단계를 넣었더니 뒤쪽 다섯이 통째로 남았다. 기록을 세어 보면 어디서
 * 멈췄는지가 분명하다 (화요일 1기 21명 기준).
 *
 *   감정 낱말 퀴즈      21/21   ← 했다
 *   영화 활동지          20/21   ← 했다
 *   감정 캐릭터(캔바)    15/21   ← 절반쯤
 *   감정 낱말 ①②③      15·13·9  ← 절반쯤
 *   나눌 감정 · 한 줄    12 · 9   ← 절반쯤
 *   나의 감정 쓰기        10/21   ← 절반쯤
 *   영화·예능 속 내 마음   0/21   ← 못 했다
 *   AI 감정 렌즈          0/21   ← 못 했다
 *
 * 그래서 오늘은 영화·예능 → 나의 감정 쓰기 → 서로의 마음 읽기 → AI 감정 렌즈 →
 * 마음일기 다섯만 한다. 낱말 퀴즈와 영화 활동지는 다시 하지 않는다.
 *
 * ## 활동 ID 를 2회기와 같게 둔다
 *
 * 같은 `artifacts` 문서를 이어 쓴다. 절반쯤 쓴 칸(낱말·나눌 감정·경험 글)이 오늘
 * 화면에 그대로 열려서, 쓴 학생은 이어서 가고 안 쓴 학생은 오늘 채운다.
 * 지난 시간 것을 다시 치게 하면 그 자체로 10분이 날아간다.
 *
 * ## 단계 차례가 곧 설계다
 *
 * 목록에 박힌 차례가 mvp → worksheet → gallery → emotion → reflection 이고
 * (types.ts 의 LESSON_PHASES), 선생님이 말씀하신 순서와 정확히 같다. 장면을 먼저
 * 떠올린 뒤에 낱말을 고르는 것이 훨씬 쉽고, 낱말을 고른 뒤라야 친구를 찾을 수 있다.
 *
 * ## 무엇이 친구에게 보이는가
 *
 * 고른 감정(share_feel)과 한 줄(share_line), 그리고 2회기에 만든 감정 캐릭터
 * 주소뿐이다. 경험 글(draft)·AI 비교·마음일기는 나가지 않는다. 거르는 자리는
 * 화면이 아니라 서버다 (gallery 라우트의 galleryAnswerKeys).
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

/** ★ 2회기와 같은 값. 이 값이 같아야 절반쯤 쓴 칸이 오늘 열린다 */
const ACTIVITY_ID = "mt-2026-2";
/** 차시 번호가 정보과·인간과AI 와 겹치지 않게 200번대 (2회기가 202) */
const LESSON_NO = 203;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/**
 * 무드미터 16낱말. `src/lib/mood.ts` 의 MOOD_OPTIONS 와 같은 낱말·같은 순서다.
 *
 * 값 import 를 안 하는 이유는 이 스크립트가 node 로 직접 실행되기 때문이다 —
 * `.ts` 확장자가 필요한데 그러면 타입 검사가 막힌다. 낱말을 고칠 일이 생기면
 * seed-mt2.ts · mood.ts 와 **세 곳을 같이** 고쳐야 한다.
 */
const MOOD_WORDS = [
  "화남", "긴장됨", "불안함", "짜증남",
  "신남", "기대됨", "즐거움", "자신있음",
  "슬픔", "외로움", "지침", "심심함",
  "뿌듯함", "홀가분함", "편안함", "차분함",
];

const MOOD_WORDS_NOTE = {
  heading: "무드미터 낱말이에요. 여기 없는 낱말을 써도 좋아요.",
  hint: "낱말만 적지 말고 언제 그랬는지를 붙여 보세요.\n짜증남 → 아침에 늦잠 자서 뛰어왔을 때 짜증남",
};

const WORKSHEET: WorksheetQuestion[] = [
  // ── 영화·예능 속 내 마음 (15분) ─────────────────────────
  {
    key: "_mt3_start",
    phase: "mvp",
    /*
     * 지난 시간에 왜 여기서 멈췄는지를 먼저 말해 준다.
     *
     * "왜 또 해요" 가 나오기 전에 이유를 대는 편이 낫다. 못 한 것을 나무라는 말로
     * 읽히지 않게 사실로만 적는다.
     */
    label: "오늘은 지난 시간에 못다 한 다섯 걸음을 합니다",
    hint:
      "지난 시간에 감정 낱말 퀴즈와 인사이드 아웃 활동지까지 했어요. 그 뒤가 남았습니다.\n" +
      "낱말이나 글을 이미 쓴 사람은 그대로 남아 있어요 — 비어 있는 칸만 채우면 됩니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_scene_note",
    phase: "mvp",
    /*
     * 서울시교육청 자료의 '명화 속 내 마음 찾기' 를 각색한 것. 명화 대신 영화·예능으로
     * 바꾼 이유는 둘이다.
     *  ① 중1에게 명화 넉 장은 감상 경험이 없으면 고를 근거가 없다. 그냥 예쁜 걸 고른다.
     *  ② 자기 이야기를 바로 꺼내는 것보다 남의 장면을 빌려 말하는 것이 쉽다.
     *     "나 요즘 외로워" 는 못 써도 "기쁨이가 밀려나는 장면" 은 쓴다.
     */
    label: "영화·예능 속에서 내 마음 찾기",
    hint:
      "요즘 내 마음과 가장 가까운 장면을 하나 떠올려 보세요.\n" +
      "영화·드라마·예능·애니메이션·웹툰 무엇이든 좋아요. 유명하지 않아도 됩니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "scene_what",
    phase: "mvp",
    label: "어떤 작품의 어떤 장면인가요?",
    hint: "예) 인사이드 아웃 2에서 기쁨이가 밀려나는 장면\n예) 흑백요리사에서 탈락하고 조용히 짐 싸는 장면",
    kind: "text",
    maxLength: 100,
  },
  {
    key: "scene_why",
    phase: "mvp",
    // 장면을 빌려 자기 이야기로 건너오게 하는 다리다
    label: "그 장면이 왜 지금 내 마음 같나요?",
    hint: "최근에 있었던 내 일과 이어서 적어 보세요.\n예) 친구들이 새로 친해지는데 나만 밖에 있는 것 같았어요.",
    kind: "long",
    maxLength: 250,
  },
  {
    key: "scene_help",
    phase: "mvp",
    /*
     * 감정을 알아차리는 것이 왜 쓸모 있는지를 학생 입으로 말하게 하는 자리라 뺄 수 없다.
     */
    label: "그 감정을 알아차리고 나니 무엇이 달라졌나요?",
    hint: "아무것도 안 달라졌으면 그렇게 적어도 됩니다.\n예) 화가 난 게 아니라 서운한 거였다는 걸 알고 나니 좀 가라앉았어요.",
    kind: "long",
    maxLength: 250,
  },

  // ── 나의 감정 쓰기 (25분) ───────────────────────────────
  {
    key: "_moodmeter_note",
    phase: "worksheet",
    /*
     * 낱말을 고르기 직전에 축 설명을 다시 붙인다.
     * 지난주에 들은 것이라 일주일이 지나면 남아 있지 않다.
     */
    label: "감정에도 지도가 있어요",
    hint:
      "감정은 좋다/나쁘다 둘로 나뉘지 않아요. 두 개의 축으로 봅니다.\n" +
      "① 기운 — 몸이 들뜨는가, 가라앉는가\n" +
      "② 기분 — 편한가, 불편한가\n\n" +
      "🔴 빨강 — 기운 높음 · 기분 나쁨 (화남 · 긴장됨 · 불안함 · 짜증남)\n" +
      "🟡 노랑 — 기운 높음 · 기분 좋음 (신남 · 기대됨 · 즐거움 · 자신있음)\n" +
      "🔵 파랑 — 기운 낮음 · 기분 나쁨 (슬픔 · 외로움 · 지침 · 심심함)\n" +
      "🟢 초록 — 기운 낮음 · 기분 좋음 (뿌듯함 · 홀가분함 · 편안함 · 차분함)\n\n" +
      "같은 “기분 나쁨” 이라도 화남과 슬픔은 전혀 다른 칸에 있어요.\n" +
      "그 차이를 낱말로 구별하는 것이 오늘의 목표입니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_words_note",
    phase: "worksheet",
    label: "쓰기① 나의 감정 낱말",
    hint:
      "최근 일주일 동안 느낀 감정을 세 개 적어 봅시다.\n" +
      "“기분 나빴다” 말고 더 정확한 낱말을 찾아보세요 — 아래 보기에서 골라도 좋아요.\n" +
      "지난 시간에 쓴 것이 남아 있으면 그대로 두어도 됩니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "word1",
    phase: "worksheet",
    label: "감정 낱말 ① — 그리고 언제 그랬나요?",
    hint: "낱말 하나와, 그때가 언제였는지 한 줄로.\n예) 서운함 — 친구가 약속을 갑자기 취소했을 때",
    kind: "text",
    examples: MOOD_WORDS,
    examplesNote: MOOD_WORDS_NOTE,
    maxLength: 80,
  },
  {
    key: "word2",
    phase: "worksheet",
    label: "감정 낱말 ② — 그리고 언제 그랬나요?",
    hint: "",
    kind: "text",
    examples: MOOD_WORDS,
    examplesNote: MOOD_WORDS_NOTE,
    maxLength: 80,
  },
  {
    key: "word3",
    phase: "worksheet",
    label: "감정 낱말 ③ — 그리고 언제 그랬나요?",
    hint: "",
    kind: "text",
    examples: MOOD_WORDS,
    examplesNote: MOOD_WORDS_NOTE,
    maxLength: 80,
  },
  {
    key: "share_feel",
    phase: "worksheet",
    /*
     * 친구 찾기의 열쇠가 되는 칸.
     *
     * 위 세 칸은 자유롭게 쓰게 두었더니 글자가 저마다 달라서 묶이지 않는다.
     * 감상 화면의 묶기는 글자가 정확히 같아야 걸린다. 그래서 고르는 칸을 하나 둔다.
     */
    label: "위 셋 중에서, 요즘 나를 가장 크게 흔든 감정 하나를 골라 주세요",
    hint: "이 칸으로 나와 비슷한 감정을 고른 친구들을 찾아볼 거예요.",
    kind: "choice",
    choices: MOOD_WORDS,
    maxLength: 0,
  },
  {
    key: "share_line",
    phase: "worksheet",
    /*
     * 친구에게 실제로 보이는 유일한 글이다. 경험 글(draft)은 안 보인다.
     * 길게 쓰면 그만큼 누구인지 짚이고, 위로하는 쪽도 무엇에 답할지 흐려진다.
     */
    label: "그 감정을 한 줄로 적어 주세요 — 이 줄만 친구들에게 보입니다",
    hint:
      "이름은 쓰지 마세요. 친구 이야기는 ○○ 로 적어요.\n" +
      "예) 요즘 학원이 늘어서 지친다 / 친구랑 서먹해져서 서운하다\n" +
      "쓰기 싫으면 비워 둬도 됩니다. 비우면 친구들에게 안 보여요.",
    kind: "text",
    maxLength: 80,
  },
  {
    key: "_draft_note",
    phase: "worksheet",
    label: "쓰기② AI에게 보여줄 글",
    hint:
      "잠시 뒤에 이 글을 AI가 읽고 “어떤 기분이었을까” 를 추측할 거예요.\n" +
      "감정 낱말은 쓰지 마세요. 무슨 일이 있었는지만 적으면 AI가 알아맞혀야 해요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "draft",
    phase: "worksheet",
    /*
     * 렌즈에 보낼 글은 여기서 한 번만 쓴다. 렌즈 화면에 입력칸을 또 두면 학생은
     * 거기에 한 줄로 대충 적고, 그러면 추측이 얕아져서 견줄 것이 없어진다.
     */
    label: "최근에 있었던 일을 2~4문장으로 적어 주세요",
    hint:
      "예) 어제 급식 시간에 친구들이 먼저 가버렸다. 혼자 앉아서 먹었다. 아무도 부르지 않았다.\n" +
      "친구 이름은 ○○ 이라고 적어 주세요. 실명은 쓰지 않아요.\n" +
      "쓰기 싫은 이야기는 안 써도 됩니다 — 편하게 말할 수 있는 일로 고르세요.",
    kind: "long",
    maxLength: 400,
  },

  // ── AI 감정 렌즈 (25분) ─────────────────────────────────
  {
    key: "_lens_note",
    phase: "emotion",
    label: "이제 AI가 내 글을 읽습니다",
    hint:
      "AI는 내 마음을 아는 게 아니라 글자만 보고 추측해요.\n" +
      "맞을 수도 있고 틀릴 수도 있어요. 틀리면 오히려 좋습니다 — 그게 “AI가 못 본 나” 예요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_lens_recap",
    phase: "emotion",
    // 앞에서 쓴 글. 무엇을 보고 추측했는지 견주려면 옆에 있어야 한다
    label: "",
    hint: "",
    kind: "echo",
    echoKeys: [{ key: "draft", label: "내가 쓴 글" }],
    maxLength: 0,
  },
  {
    key: "lens",
    phase: "emotion",
    label: "AI에게 보여주기",
    hint: "위에 쓴 글을 AI가 읽고 감정을 추측해 줍니다. 점수를 매기는 게 아니에요.",
    kind: "emotion_lens",
    lensSourceKey: "draft",
    maxLength: 0,
  },
  {
    key: "verdict",
    phase: "emotion",
    /*
     * 판정이 이 활동의 본체다. AI 결과만 저장하면 수업이 아니라 측정이 된다.
     * 세 칸으로 나눈 이유: "맞았다/틀렸다" 둘로만 두면 가운데가 없어 아무 쪽이나 고른다.
     */
    label: "AI의 추측, 내 마음과 얼마나 비슷한가요?",
    hint: "",
    kind: "choice",
    choices: ["비슷해요", "조금 달라요", "전혀 달라요"],
    maxLength: 0,
  },
  {
    key: "compare_hit",
    phase: "emotion",
    label: "AI가 맞힌 것과 어긋난 것을 적어 주세요",
    hint: "예) 서운한 건 맞혔는데, 사실 화도 났다는 건 못 봤어요.",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "compare_why",
    phase: "emotion",
    /*
     * "감정 차이가 발생한 이유" 를 AI 상대로 옮긴 문항. 이 답이 수행 기록의 핵심이다.
     * 「정답은 나에게 있다」 가 여기서 학생 입으로 나온다.
     */
    label: "AI가 내 글에서 못 본 것은 무엇일까요?",
    hint:
      "AI는 글에 적힌 것만 봐요. 글에 안 적힌 게 있지 않나요?\n" +
      "예) 그 친구랑 원래 제일 친해서 더 서운했다는 걸 안 적었어요.",
    kind: "long",
    maxLength: 300,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "디지털 마음 톡톡 3회기 — 내 감정 알아차리기 (이어서)",

  /*
   * 마음 체크인은 이 프로그램의 매 시간 첫 화면이다.
   *
   * 무드미터를 쓰는 것 자체가 오늘 배울 기술(감정 인식)의 연습이고, 8회기 발표회에서
   * 학기 전체 감정 변화를 되돌아보는 원재료가 여기서 쌓인다.
   */
  moodCheckEnabled: true,

  // 분반은 2회기와 같은 값을 유지한다. 바꾸면 데이터 통이 갈려 지난 답이 안 열린다
  groups: [
    { key: "mt-tue-1", label: "화요일 1기", classNo: 1 },
    { key: "mt-thu-1", label: "목요일 1기", classNo: 2 },
    { key: "mt-tue-2", label: "화요일 2기", classNo: 3 },
    { key: "mt-thu-2", label: "목요일 2기", classNo: 4 },
  ],

  game: {
    heading: "기다리는 동안 — 똥 피하기",
    body:
      "위에서 떨어지는 똥을 좌우로 피하세요. 한 번이라도 맞으면 끝이에요.\n" +
      "화살표 키나 화면 좌·우를 누르면 움직입니다.",
    url: "https://dodge-poop-game.vercel.app/",
  },
  gameExplainer: empty(),

  /*
   * 오늘은 진도 안내 칸을 쓴다.
   *
   * 2회기에는 비워 두었다 — 단계 차례가 「진도 안내 → 영상」 으로 고정이라, 영상을
   * 맨 앞으로 옮기는 순간 이 칸이 영상보다 앞에 서기 때문이었다. 오늘은 영상이
   * 없으므로 그 문제가 없고, 다섯 걸음을 먼저 보여주는 편이 낫다.
   */
  progress: {
    heading: "오늘 할 일",
    body:
      "지난 시간에 감정 낱말 퀴즈와 인사이드 아웃 활동지까지 했어요. 오늘은 그 뒤를 합니다.\n\n" +
      "① 영화·예능 속 내 마음 — 내 마음과 가까운 장면 하나 고르기\n" +
      "② 나의 감정 쓰기 — 낱말 세 개, 그리고 AI에게 보여줄 글\n" +
      "③ 서로의 마음 읽기 — 같은 감정을 고른 친구 찾아보기\n" +
      "④ AI 감정 렌즈 — AI가 내 글을 읽고 감정을 추측합니다\n" +
      "⑤ 마음일기\n\n" +
      "지난 시간에 쓴 것은 그대로 남아 있어요. 비어 있는 칸만 채우면 됩니다.\n" +
      "친구에게 보이는 것은 고른 감정과 한 줄뿐이에요. 나머지는 나만 봅니다.",
    url: "",
  },
  assessment: empty(),
  video: empty(),

  /*
   * 마음일기 — 매 회기 반복 루틴이다.
   *
   * 원본 자료가 멘티미터로 전체 시각화를 하는 자리인데, 감정 이야기를 교실 앞 화면에
   * 띄우는 것은 이 프로그램에서 하지 않는다. 대신 각자에게 남긴다.
   * reflectionPublic 은 반드시 false — 친구에게 보이면 아무도 솔직하게 안 쓴다.
   */
  reflectionQuestions: [
    "오늘 마음에 남는 순간은 언제였나요? 무엇 때문에 그랬는지도 함께 적어 주세요.",
    "지금 내 기분은 어떤가요? 그리고 왜 그런 것 같나요?",
    "오늘의 나에게 해주고 싶은 말 한마디를 적어 주세요.",
  ],
  reflectionPublic: false,

  /*
   * 서로의 마음 읽기에서 친구가 만든 감정 캐릭터를 새 창으로 연다.
   * 그걸 이탈로 세면 기록이 온통 빨갛게 되고, 더 나쁜 것은 학생이 눈치를 보느라
   * 안 열어 보는 것이다.
   */
  focusExempt: ["gallery"],

  /*
   * 학생이 지나온 단계로 돌아갈 수 있게 한다.
   *
   * AI 렌즈에서 "글에 이걸 안 적었네" 를 깨닫고 앞 글을 고치러 가는 것이 이 활동의
   * 자연스러운 흐름이다. 앞 단계로는 여전히 못 간다.
   */
  freeNavigation: true,

  phaseLabels: {
    mood: "마음 체크인",
    progress: "오늘 할 일",
    // 화면에 "mvp" 라는 말은 아무 데도 안 보인다. 문항을 담는 그릇으로만 빌려 쓴다
    mvp: "영화·예능 속 내 마음",
    worksheet: "나의 감정 쓰기",
    gallery: "서로의 마음 읽기",
    emotion: "AI 감정 렌즈",
    reflection: "마음일기",
  },

  activity: {
    activityId: ACTIVITY_ID,
    // 그리기가 없는 활동. 장소를 비우면 그리기 화면이 안 뜬다
    places: [],
    year: 2026,
    worksheet: WORKSHEET,

    /*
     * 서로의 마음을 나누는 시간을 연다. **다만 여는 칸을 딱 셋으로 못 박는다.**
     *
     * "나만 그런 게 아니구나" 는 사회정서학습에서 가장 크게 작동하는 경험이라 열 값이
     * 있다. 하지만 활동지를 통째로 열면 경험 글(draft)·AI 비교·마음일기까지 반 전체에
     * 걸린다 — 그건 나누는 것이 아니라 새는 것이다.
     *
     * 거르는 자리는 서버다 (gallery 라우트). 화면에서 고르면 안 보일 뿐 응답에는
     * 실려 있어서, 개발자 도구를 여는 학생 하나면 다 읽힌다.
     *
     * canva_url 은 2회기에 만든 감정 캐릭터다. 절반쯤만 있지만, 있는 사람 것은
     * 보이는 편이 낫다 — 오늘 새로 만들지는 않는다.
     */
    galleryEnabled: true,
    galleryAnswerKeys: ["share_feel", "share_line", "canva_url"],
    galleryNoun: "이야기",

    /*
     * 같은 감정을 고른 친구끼리 모이게 하는 묶음. 이 활동의 핵심 장치다.
     * 자유롭게 쓴 낱말 세 칸이 아니라 고르는 칸(share_feel)을 쓰는 이유는,
     * 묶기가 글자가 정확히 같아야 걸리기 때문이다.
     */
    galleryFacets: [{ key: "feel", label: "같은 감정을 고른 친구", answerKeys: ["share_feel"] }],

    /*
     * 남기는 칸은 **하나뿐이다.**
     *
     * 기본은 두 칸(관찰 하나, 질문 하나)인데, 둘째 칸을 그대로 두면 힘든 이야기를
     * 꺼낸 친구에게 "왜 그런 일이 있었어?" 가 달린다. 위로가 아니라 취조가 된다.
     * 이름표를 비우면 그 칸이 통째로 빠진다 (gallery-view 의 FeedbackForm).
     */
    feedbackPrompts: {
      found: {
        label: "이 친구에게 해주고 싶은 따뜻한 말 한마디",
        placeholder: "예) 나도 요즘 비슷해. 혼자만 그런 거 아니야.",
      },
      question: { label: "", placeholder: "" },
    },

    sourceHints: {
      site: "예) 감정 낱말을 더 찾아본 곳",
      ai: "예) AI 감정 렌즈",
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

      /*
       * 아직 시작하지 않은 수업에만 다시 복사한다 (PRD 5.1).
       * 여기서 0개가 나오면 계획만 바뀌고 학생 화면은 옛 내용 그대로다.
       */
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (2회기와 같음 — 절반쯤 쓴 칸이 그대로 열립니다)`);
  console.log(`차시 번호 ${LESSON_NO}`);
  console.log("단계: 대기 → 마음 체크인 → 오늘 할 일 → 영화·예능 속 내 마음");
  console.log("      → 나의 감정 쓰기 → 서로의 마음 읽기 → AI 감정 렌즈 → 마음일기");
  console.log("\n친구에게 보이는 칸: 고른 감정 · 한 줄 · 감정 캐릭터 주소");
  console.log("나가지 않는 것: 경험 글 · AI 비교 · 마음일기");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
