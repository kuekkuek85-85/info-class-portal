/**
 * 「디지털 마음 톡톡」(자유학기 주제선택) 2회기 — 3~4차시 블록.
 *
 *   node --env-file=.env.local scripts/seed-mt2.ts
 *
 * ## 이 시간이 하려는 것
 *
 * 마음 체크인 → 도입 영상 → 무드미터 강의 → 감정 낱말·경험 글 쓰기 →
 * **AI 감정 렌즈** → 비교하며 쓰기 → 마음일기.
 *
 * 서울시교육청 「중1 사회정서교육자료」 **1-2차시 '다양한 감정 인식하기'** 를 각색한 것이다.
 * 성취기준 [9사회정서01-01] 을 그대로 쓰고, 활동 매체만 디지털·AI로 바꿨다.
 * 원본의 **'마음 탐정 게임'**(모둠이 명화·상황 카드로 주인공 감정을 맞히는 활동)에서
 * 추측하는 주체만 모둠 친구에서 AI로 바꾼 것이 감정 렌즈다.
 *
 * ## 순서가 곧 설계다
 *
 * **학생이 먼저 쓰고, AI는 나중에 본다.** 렌즈를 앞에 두면 AI가 던진 낱말을 그대로
 * 베껴 쓰게 되고, "내 마음의 정답은 나에게 있다" 는 결론이 뒤집힌다. 그래서 단계
 * 목록에서도 emotion 이 worksheet 뒤에 있다 (types.ts 의 LESSON_PHASES).
 *
 * AI가 맞히면 감정 어휘를 얻고, **틀리면 더 좋다** — "AI가 못 본 나" 를 찾는 것이
 * 이 시간의 자기 인식이다. 그래서 렌즈는 후보를 2개 퍼센트로 준다. 하나만 딱 집어
 * 주면 학생이 그것을 정답으로 받아들여 비교할 것이 없어진다.
 *
 * ## 마음 이야기는 밖으로 나가지 않는다
 *
 * `galleryEnabled: false` — 서로 구경하기를 아예 막는다. 활동지에 "최근 있었던 일" 과
 * 그때의 감정이 들어가는데, 그건 성찰 글과 같은 등급이다. 지금까지의 판정은 "활동지
 * 문항이 있으면 감상을 연다" 였어서, 이 한 줄이 없으면 마음 이야기가 반 전체에 걸린다.
 * `reflectionPublic: false` 도 같은 이유다.
 *
 * ## 블록타임
 *
 * 6~7교시 90분 연속이라 세션을 **7교시로 하나만** 연다. 6교시로 열면 수업 코드가
 * 6교시 끝에 만료되어, 7교시 중간에 태블릿이 죽은 학생이 재입장하지 못한다 (timetable.ts).
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
 * 회기마다 다른 활동 ID.
 *
 * 「인간과 인공지능」은 7차시가 한 프로젝트라 ID 를 공유했다. 여기는 회기마다 쓰는
 * 것이 달라서, 같은 ID 를 쓰면 3회기의 word1 이 2회기 답을 덮어쓴다.
 */
const ACTIVITY_ID = "mt-2026-2";
/** 정보과(1~7)·인간과AI(100번대)와 안 겹치게 200번대 */
const LESSON_NO = 202;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/**
 * 무드미터 16낱말. 활동지 보기로 그대로 내려 준다.
 *
 * 원본 자료가 감정 단어 목록을 나눠 주는 자리다. **눌러서 칸에 넣어 주지 않는다** —
 * 답으로 원하는 것은 "짜증남" 이 아니라 "언제 그랬는지" 까지라서, 눌러 넣게 하면
 * 낱말만 남고 생각이 빠진다 (types.ts 의 examples 참조).
 *
 * `src/lib/mood.ts` 의 MOOD_OPTIONS 와 같은 낱말·같은 순서(빨강→노랑→파랑→초록)다.
 * 여기서 그 파일을 import 하지 않는 이유는 이 스크립트가 node 로 직접 실행되기
 * 때문이다 — 값 import 는 `.ts` 확장자가 필요한데 그러면 타입 검사가 막힌다.
 * 낱말을 고칠 일이 생기면 **두 곳을 같이** 고쳐야 한다.
 */
const MOOD_WORDS = [
  "화남", "긴장됨", "불안함", "짜증남",
  "신남", "기대됨", "즐거움", "자신있음",
  "슬픔", "외로움", "지침", "심심함",
  "뿌듯함", "홀가분함", "편안함", "차분함",
];

/**
 * 낱말 보기 상자의 안내 문구.
 *
 * 안 적으면 그림 차시 기본값("첨단 기술이란 이런 것들이에요 / 로봇 → 음식을 나르는
 * 로봇")이 감정 낱말 위에 붙는다. 중1은 안내를 지시로 읽으므로 반드시 바꿔 준다.
 */
const MOOD_WORDS_NOTE = {
  heading: "무드미터 낱말이에요. 여기 없는 낱말을 써도 좋아요.",
  hint: "낱말만 적지 말고 언제 그랬는지를 붙여 보세요.\n짜증남 → 아침에 늦잠 자서 뛰어왔을 때 짜증남",
};

const WORKSHEET: WorksheetQuestion[] = [
  /*
   * ── 인사이드 아웃 2 활동지 (10분) ────────────────────────
   *
   * 단계 칸은 `problem` 을 빌려 쓴다. 「인간과 인공지능」이 문제 정의에 쓰는 칸인데,
   * 이 차시는 그 칸을 안 쓰고 순서상 영상 바로 뒤라 자리가 맞는다. 학생·교사 화면에
   * 뜨는 이름은 phaseLabels 가 정하므로 "problem" 이라는 말은 아무 데도 안 보인다
   * (4차시가 진도 안내 칸을 AI 관상 체험에 쓴 것과 같은 방식).
   *
   * 영상 다음에 바로 쓴다. 보고 나서 시간이 지나면 "재밌었다" 만 남는다.
   */
  {
    key: "_io_note",
    phase: "problem",
    label: "방금 본 영상에 대해 적어 봅시다",
    hint:
      "정답이 있는 질문이 아니에요. 영화를 안 봤어도 괜찮습니다 — 방금 들은 이야기만으로 답할 수 있어요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "io_line",
    phase: "problem",
    label: "가장 마음에 남은 말이나 장면 한 가지",
    hint: "예) 기쁨이가 화를 내는 장면 / “어른이 된다는 건 기쁨이 줄어드는 건가 봐”",
    kind: "text",
    maxLength: 80,
  },
  {
    key: "io_grow",
    phase: "problem",
    /*
     * 영상의 중심 대사를 그대로 묻는다. 셋으로 나눈 이유는 가운데가 없으면
     * 중1이 아무 쪽이나 찍기 때문이다 — 실제로 대부분 "반반" 이 진심이다.
     */
    label: "“어른이 된다는 건 기쁨이 줄어드는 건가 봐” — 이 말에 얼마나 동의하나요?",
    hint: "",
    kind: "choice",
    choices: ["맞는 것 같다", "반은 맞고 반은 아니다", "그렇지 않다"],
    maxLength: 0,
  },
  {
    key: "io_why",
    phase: "problem",
    label: "왜 그렇게 생각했나요?",
    hint: "내 경험을 들어서 적으면 좋아요.\n예) 초등학교 때보다 걱정이 늘었지만, 즐거운 것도 그만큼 늘었어요.",
    kind: "long",
    maxLength: 250,
  },
  {
    key: "io_anxiety",
    phase: "problem",
    /*
     * 오늘 수업의 밑바탕 — **감정에 좋은 것과 나쁜 것은 없다.**
     *
     * 영화에서 불안이는 라일리를 망치려던 게 아니라 지키려던 것이었다. 이걸 자기
     * 이야기로 옮겨 놓으면, 뒤에 나오는 무드미터의 빨강·파랑 칸을 "나쁜 칸" 으로
     * 읽지 않게 된다.
     */
    label: "불안이는 라일리를 망치려던 게 아니라 지키려던 거였어요. 나를 힘들게 하는 감정도 그럴까요?",
    hint: "요즘 나를 힘들게 하는 감정 하나를 떠올려 보세요. 그 감정이 나에게 무엇을 알려 주려는 걸까요?\n예) 시험 전에 불안한 건 준비를 더 하라고 알려 주는 것 같아요.",
    kind: "long",
    maxLength: 250,
  },

  // ── 쓰기① 나의 감정 낱말 (10분) ─────────────────────────
  /*
   * 무드미터 설명이 여기 있다. 원래는 진도 안내 칸(progress)에 있었는데, 영상을
   * 수업 맨 앞으로 옮기면서 그 칸이 영상보다 앞이 되어 버렸다 (단계 순서는 고정이다).
   *
   * 옮기고 보니 이 자리가 더 낫다. 낱말을 고르기 **직전**에 축 설명을 듣는 편이,
   * 20분 전에 듣고 잊어버리는 것보다 실제로 쓰인다.
   */
  {
    key: "_moodmeter_note",
    phase: "worksheet",
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
      "“기분 나빴다” 말고 더 정확한 낱말을 찾아보세요 — 아래 보기에서 골라도 좋아요.",
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

  // ── 쓰기② 나를 보여주는 글 (12분) ───────────────────────
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

  // ── AI 감정 렌즈 (20분) ────────────────────────────────
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
    // 앞에서 쓴 글. 렌즈 화면에서 다시 볼 수 있어야 무엇을 보고 추측했는지 견줄 수 있다
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

  // ── 쓰기③ AI보다 내가 나를 잘 아는 이유 (10분) ──────────
  {
    key: "verdict",
    phase: "emotion",
    /*
     * 판정이 이 활동의 본체다. AI 결과만 저장하면 수업이 아니라 측정이 된다.
     * 세 칸으로 나눈 이유: "맞았다/틀렸다" 둘로만 두면 대부분 가운데가 없어서
     * 아무 쪽이나 고르게 된다.
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
     * 원본 자료의 "감정 차이가 발생한 이유(경험·가치관·상황·심리상태)" 를 AI 상대로
     * 옮긴 문항. 이 답이 수행 기록의 핵심이다.
     */
    label: "AI가 내 글에서 못 본 것은 무엇일까요?",
    hint:
      "AI는 글에 적힌 것만 봐요. 글에 안 적힌 게 있지 않나요?\n" +
      "예) 그 친구랑 원래 제일 친해서 더 서운했다는 걸 안 적었어요.",
    kind: "long",
    maxLength: 300,
  },
  /*
   * 여기 "그래서, 지금 이 경험에 내가 붙이는 감정 낱말은?" 이 있었다. 뺐다.
   *
   * "정답은 나에게 있다" 를 칸으로 만들려던 자리였는데, 화면에 나오는 모습은
   * 그 의도를 전하지 못했다. 쓰기①에서 이미 감정 낱말을 세 개 쓴 뒤라 무드미터
   * 낱말 상자가 또 떴고, 학생 눈에는 "아까 그거 또 하네" 로 보였다.
   * 경험 글이 쓰기① 세 사건 중 하나면 답까지 똑같아진다.
   *
   * 결론은 compare_hit·compare_why 가 이미 받아 간다.
   */
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "디지털 마음 톡톡 2회기 — 내 감정 알아차리기",

  /*
   * 마음 체크인은 이 프로그램의 **매 시간 첫 화면**이다.
   *
   * 무드미터를 쓰는 것 자체가 오늘 배울 기술(감정 인식)의 연습이고, 8회기 발표회에서
   * 학기 전체 감정 변화를 되돌아보는 원재료가 여기서 쌓인다. 「인간과 인공지능」이
   * 기분 체크를 끈 것과 반대 판단인데, 저쪽은 45분에 뽑기까지 가야 했고 여기는
   * 90분 블록에 감정 자체가 주제다.
   */
  moodCheckEnabled: true,

  /*
   * 자유학기 주제선택 — 학년 전체에서 모여 분반 4개로 돈다.
   * classNo 는 화면에 안 보이는 데이터 통 번호. 분반마다 달라야 기록이 안 섞인다.
   * 「인간과 인공지능」과 같은 1~4 를 쓰지만 활동 ID 가 달라 같은 통에 담기지 않는다.
   */
  groups: [
    { key: "mt-tue-1", label: "화요일 1기", classNo: 1 },
    { key: "mt-thu-1", label: "목요일 1기", classNo: 2 },
    { key: "mt-tue-2", label: "화요일 2기", classNo: 3 },
    { key: "mt-thu-2", label: "목요일 2기", classNo: 4 },
  ],

  /*
   * 대기 시간 미니게임.
   *
   * 노트북 수령·부팅으로 도착 시각이 5분씩 벌어진다. 먼저 온 학생의 그 시간을 그냥
   * 버리지 않는다 — 「인간과 인공지능」과 같은 2048 을 쓴다.
   *
   * 수업이 시작되면 화면이 저절로 넘어가므로 학생이 게임을 끄고 나올 필요가 없다.
   */
  game: {
    heading: "기다리는 동안 — 2048",
    body: "같은 숫자끼리 밀어서 합치세요.\n오늘은 512만 넘어도 잘한 거예요.",
    url: "https://2048-game-gilt-kappa.vercel.app/",
  },
  gameExplainer: empty(),

  /*
   * 진도 안내 칸은 비워 둔다.
   *
   * 여기 있던 무드미터 설명은 활동지(쓰기① 바로 위)로 옮겼다. 단계 순서가
   * `진도 안내 → 영상` 으로 고정이라, 영상을 수업 맨 앞으로 옮기는 순간 이 칸이
   * 영상보다 앞에 서기 때문이다. 내용이 비면 교사 화면에서 단추가 저절로 빠진다.
   */
  progress: empty(),
  assessment: empty(),

  /*
   * 도입 영상 — 인사이드 아웃 2. **전자칠판으로 다 같이 본다.**
   * 학생 화면에는 주소가 안 내려간다 (lesson/page.tsx 의 video 단계 참조).
   *
   * 통으로 틀지 않는다. 수업용이 아니라 영화 리뷰 채널이라 결말 스포일러·PC 논쟁·
   * 채널 홍보가 섞여 있다. 오늘 주제에 닿는 두 토막만 쓴다.
   */
  video: {
    heading: "인사이드 아웃 2 — 어른이 된다는 건",
    body:
      "두 토막만 봅니다.\n" +
      "① 0:00 ~ 1:30  “어른이 된다는 건 기쁨이 줄어드는 건가 봐”\n" +
      "② 7:17 ~ 7:40  힘들었던 순간들도 사실은 모두 나였다\n\n" +
      "앞 화면을 봐 주세요. 보고 나서 바로 활동지에 적습니다.",
    url: "https://youtu.be/hqNzumSERTs",
  },

  /*
   * 영상 보는 동안 띄울 "생각할 것".
   *
   * 안 적으면 성찰 질문(마음일기)이 뜬다. 마음일기는 90분 뒤에 쓰는 것이라,
   * 수업 시작 3분 만에 "지금 내 기분은?" 이 뜨면 학생이 지금 답하는 줄 안다.
   */
  videoPrompts: [
    "기쁨이는 왜 화가 났을까요?",
    "나에게도 “줄어든 기쁨” 이 있나요?",
  ],

  /*
   * 마음일기 — 이번 회기부터 **매 회기 반복 루틴**으로 격상한다.
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

  phaseLabels: {
    mood: "마음 체크인",
    video: "인사이드 아웃 2",
    // 문제 정의 칸을 빌려 영화 활동지로 쓴다 (WORKSHEET 위쪽 설명 참조)
    problem: "영화 활동지",
    worksheet: "나의 감정 쓰기",
    reflection: "마음일기",
  },

  activity: {
    activityId: ACTIVITY_ID,
    // 그리기가 없는 활동. 장소를 비우면 그리기 화면이 안 뜬다.
    places: [],
    year: 2026,
    worksheet: WORKSHEET,

    /*
     * **서로 구경하기를 막는다.**
     *
     * 이 한 줄이 없으면 "활동지 문항이 있으면 감상을 연다" 는 기본 판정에 걸려,
     * 학생이 쓴 경험 글과 감정이 반 전체에 그대로 걸린다.
     * OT 유의사항("마음 이야기는 밖으로 옮기지 않기")의 시스템 버전이다.
     */
    galleryEnabled: false,

    /*
     * 출처 두 칸은 화면에서 고정이라 예시만 이 수업에 맞게 바꾼다.
     * 기본 예시("나무위키 — 자율주행")를 그대로 두면 무엇을 적으라는 건지 어긋난다 —
     * 중1은 예시를 지시로 읽는다.
     */
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
       * 여기서 0개가 나오면 계획만 바뀌고 학생 화면은 옛 내용 그대로다 — 크게 알린다.
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} · 차시 번호 ${LESSON_NO}`);
  console.log(
    "단계: 대기 → 마음 체크인 → 인사이드 아웃 2 → 영화 활동지 →" +
      " 나의 감정 쓰기 → AI 감정 렌즈 → 마음일기 → 마침",
  );
  console.log("영상은 두 토막만 (0:00~1:30, 7:17~7:40). 전자칠판으로 다 같이 봅니다.");
  console.log("서로 구경하기는 막아 두었습니다 (마음 이야기는 친구에게 보이지 않습니다).");
  console.log("블록타임이라 세션은 7교시로 하나만 여세요 — 6교시로 열면 코드가 중간에 만료됩니다.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
