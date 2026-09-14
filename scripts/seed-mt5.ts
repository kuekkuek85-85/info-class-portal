/**
 * 「디지털 마음 톡톡」(자유학기 주제선택) 5회기 — 대인관계 영역 (6·7교시 블록).
 *
 *   node --env-file=.env.local scripts/seed-mt5.ts
 *
 * ## 이것은 완성 회기가 아니라 "첫 활동 모듈(초안)" 이다
 *
 * 선생님은 활동을 하나씩 만들고 나중에 순서를 재배치해 조합하려 하신다. 그래서 이
 * 스크립트는 5회기의 **첫 활동 하나** — 「우리는 왜 다르게 생각할까?」 — 만 담는다.
 * 뒤에 대인관계 활동이 더 붙고 phase 순서가 재배치될 수 있게 **구조를 열어 둔다**:
 *  · 활동통(ACTIVITY_ID)은 5회기 공용으로 두어, 나중에 붙는 활동이 같은 통을 이어 쓴다.
 *  · WORKSHEET 는 phase 별로 묶어, 활동을 통째로 옮기거나 빼기 쉽게 나눠 두었다.
 *  · 아직 안 쓴 phase(gallery·emotion·grill·draw 등)는 뒤 활동이 가져다 쓸 수 있다.
 *
 * ## 블록타임 — 세션은 7교시로 하나만 연다 (여는 스크립트에서)
 *
 * 6·7교시 90분 연속 블록이다. 마음 톡톡의 규칙대로 **세션은 7교시로 하나만** 연다
 * (세션 문서 ID = 날짜__7__groupKey). 이 규칙은 open-mt5-*.ts 가 지킬 몫이고, 계획(plan)
 * 자체는 교시·분반과 무관하다 — 그래서 이번엔 여는 스크립트를 만들지 않고 seed 만 둔다.
 *
 * ## 활동 흐름 — 관점 차이 → 문화별 감정 표현 (교사 outline 그대로)
 *
 *   ① 착시 영상(11가지 착시) → ② 토끼-오리 착시 그림 제시 → ③ 토끼/오리 투표(퀴즈)
 *   → ④ 관점 차이 깨닫기 → ⑤ 문화권별 감정 표현 비교 → ⑥ 문화 맥락 이해 정리
 *
 * 단계(phase) 차례가 곧 설계다. 포털의 단계 순서(types.ts 의 LESSON_PHASES)에서 퀴즈
 * (quiz)는 활동지를 띄우는 모든 단계보다 **앞**이고, 안내 화면 두 칸(progress·assessment)만
 * 퀴즈보다 앞이다. 그래서 아래처럼 배치하면 교사 버튼이 outline 순서 그대로 흐른다:
 *
 *   mood(마음 체크인) → progress(오늘 할 일 + 착시 영상) → assessment(토끼? 오리? 그림)
 *   → quiz(토끼/오리 투표) → problem(관점 차이) → mvp(문화별 감정 표현) → build(정리)
 *   → reflection(마음일기)
 *
 * ## 프라이버시 — 이 과목의 1순위
 *
 * 개인 의견·감정 글은 친구에게 절대 안 나간다. 관점 성찰(problem)·문화 소감(mvp)·정리
 * 글(build)·마음일기는 모두 **본인·교사만** 본다. 그래서 이 세션은 서로 구경하기를
 * 아예 닫는다(galleryEnabled: false) — 서버의 갤러리 라우트가 이 값을 보고 응답 자체를
 * 막으므로(gallery/route.ts), 화면뿐 아니라 데이터로도 안 샌다. galleryAnswerKeys 는
 * 두지 않는다(열 것이 없다). 뒤에 대인관계 나눔 활동을 붙여 갤러리를 켤 일이 생기면,
 * 그때 **친구에게 나갈 칸만** galleryAnswerKeys 로 못박고 서버 목록도 함께 챙긴다.
 *
 * 토끼/오리 투표는 **익명 집계 수치**라 개인 글이 아니다 — 교사 대시보드가 선택지별
 * 응답 수만 보여주고(quiz-stats/route.ts), 누가 무엇을 골랐는지는 어디에도 안 뜬다.
 *
 * AI 감정 렌즈는 켜지 않는다(emotion_lens 문항 없음 → Gemini 호출 없음). 위기 신호를
 * 제3자로 보내거나 로그에 남길 자리가 이 활동엔 처음부터 없다.
 *
 * ## 토끼/오리 = 포털의 "퀴즈" 로 만든다 (집계를 위해)
 *
 * 정답이 없는 **의견 투표**지만, 교사가 공유화면에서 실시간 집계를 보게 하려고 포털의
 * 퀴즈 기능(session.quiz + quiz-stats + teacher-quiz-panel)을 그대로 쓴다. 퀴즈 스키마가
 * answerIndex(정답 index)를 요구하므로 형식상 0(토끼)을 넣지만 **정답이 아니다.**
 *
 *  · 교사는 [정답 공개] 를 **누르지 않는다.** 집계는 [응답 분포 새로고침] 으로만 본다
 *    (quiz-stats 는 정답 공개 여부와 무관하게 응답 수를 센다). 공개를 누르면 학생 화면에서
 *    answerIndex(토끼)가 초록 "정답" 으로, 오리를 고른 학생 칸이 분홍 "내 선택(오답)" 으로
 *    떠서 "오리는 틀렸다" 는 잘못된 신호를 준다.
 *  · 혹시 실수로 공개해도 메시지가 어긋나지 않게 nowText 에 "정답이 없다" 는 재구성을
 *    넣어 둔다. stickers 는 비워 둔다(디지털 특성 스티커는 이 과목과 무관).
 *
 * [남은 갈림] 교사 화면 문구가 "타임머신 퀴즈" 로 뜨고(teacher-quiz-panel.tsx 하드코딩),
 * 교사 제어판 미리보기에 토끼 옆 "← 정답" 이 붙는다 — 둘 다 **교사 화면에만** 보이는
 * 겉표시이고 학생에겐 안 간다. 의견 투표에서 정답 강조를 코드로 없애려면 퀴즈에
 * opinionPoll 같은 optional 플래그를 더해 quiz-view·teacher-quiz-panel 에서 강조만 끄면
 * 되지만(비파괴·최소), 이번 초안은 배포를 늘리지 않으려 seed 로만 두고 운영(공개 안 하기)
 * 으로 처리한다. 필요하면 보고 후 플래그를 넣는다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import type {
  LessonPlan,
  PhaseContent,
  QuizContent,
  WorksheetQuestion,
} from "../src/lib/types.ts";

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
 * 5회기(대인관계 영역)의 활동통. 자기 영역(mt-2026-2·mt-2026-3)과 다른 새 통이다.
 * 이 첫 활동의 성찰 답이 여기에 쌓이고, 뒤에 붙는 대인관계 활동도 같은 통을 이어 쓴다.
 */
const ACTIVITY_ID = "mt-2026-5";
/** 차시 번호가 정보과·인간과AI 와 안 겹치게 200번대 (2회기 202 · 3회기 203 · 4회기 204) */
const LESSON_NO = 205;

/**
 * ① 착시 영상 — 「11가지 착시 현상」 유튜브.
 *
 * 원본 링크는 https://youtu.be/6JgPeBPwRvY 다. progress 화면에 임베드하려고 iframe 이
 * 받아들이는 embed 주소 꼴로 바꿔 둔다(youtu.be/watch 주소는 iframe 안에서 막힌다).
 * 포털 CSP 는 frame-src 를 https: 로 열어 두어 유튜브 임베드가 허용된다(next.config.ts).
 * autoplay 파라미터를 넣지 않아 저절로 소리가 나지 않는다 — 학생이 눌러 보거나, 교사가
 * 같은 주소를 전자칠판에 띄워 함께 봐도 된다.
 *
 * [남은 선택] 이 포털의 관례는 "영상은 전자칠판(앞 화면)으로만"(video 단계)인데, 그
 * video 단계는 순서상 퀴즈보다 **뒤**라 쓰면 착시 영상 버튼이 투표 뒤로 간다. 그래서
 * 순서를 outline 대로 지키려 착시 영상을 안내 화면(progress)에 임베드했다. 앞 화면
 * 재생을 원하면 교사가 같은 링크를 전자칠판에 열면 된다(임베드는 그대로 둬도 무방).
 */
const ILLUSION_VIDEO_EMBED = "https://www.youtube.com/embed/6JgPeBPwRvY";
const ILLUSION_VIDEO_WATCH = "https://youtu.be/6JgPeBPwRvY";

/**
 * ② 토끼-오리 착시 그림.
 *
 * ⚠️ 이 이미지 파일은 아직 저장소에 없다. 교사가 토끼-오리 착시 그림을 이 경로에 맞춰
 *    public/mt5/rabbit-duck.png 로 넣어야 화면에 뜬다. (붙여넣은 이미지를 파일로 저장할
 *    수단이 없어 여기서는 경로만 잡아 둔다.) 파일이 없으면 해당 칸이 깨진 그림으로 보인다.
 *    무료 이용 가능한 그림 예: 위키미디어 공용 "Kaninchen und Ente"(토끼-오리, 퍼블릭 도메인).
 */
const RABBIT_DUCK_IMG = "/mt5/rabbit-duck.png";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/**
 * ③ 토끼/오리 투표 — 포털의 퀴즈로.
 *
 * 정답이 없는 의견 투표라 answerIndex 는 형식상 0(토끼)이다. 교사는 정답을 공개하지 않고
 * [응답 분포 새로고침] 으로 집계만 본다(위 파일 머리말의 처리 방식 참조).
 */
const QUIZ: QuizContent = {
  questions: [
    {
      prompt: "방금 본 그 그림, 여러분에게는 무엇으로 보였나요? 토끼일까요, 오리일까요?",
      choices: ["토끼", "오리"],
      // 형식상 index — 정답이 아니다. 교사는 정답을 공개하지 않는다.
      answerIndex: 0,
      // 혹시 공개되더라도 메시지가 어긋나지 않게 "정답이 없다" 로 재구성해 둔다.
      nowText:
        "사실 여기엔 정답이 없어요. 같은 그림인데 누구는 토끼로, 누구는 오리로 봅니다.\n" +
        "보는 사람마다 관점이 다를 수 있다는 것 — 그게 오늘 우리가 확인한 거예요.",
      // 디지털 특성 스티커는 이 과목과 무관하다. 비워 두면 스티커가 안 붙는다.
      stickers: [],
    },
  ],
};

const WORKSHEET: WorksheetQuestion[] = [
  // ── ④ 관점 차이 깨닫기 (problem) ─────────────────────────────
  {
    key: "_persp_note",
    phase: "problem",
    label: "우리는 왜 다르게 봤을까?",
    hint:
      "우리 반 투표 결과를 함께 봤어요. 토끼도, 오리도 있었지요.\n" +
      "똑같은 그림인데 사람마다 다르게 봤어요. 어느 쪽도 틀린 게 아니에요 —\n" +
      "보는 사람의 경험·기분·시선에 따라 같은 것도 다르게 보입니다. 이게 ‘관점의 차이’ 예요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "persp_reflect",
    phase: "problem",
    /*
     * 개인 성찰. 친구에게 안 나간다(galleryEnabled: false 라 애초에 나갈 길이 없다).
     * 관점이 갈렸던 경험을 자기 이야기로 꺼내게 하는 다리다.
     */
    label: "나는 토끼·오리 중 무엇으로 봤나요? 그리고 친구와 다르게 본 경험이 있다면 적어 주세요",
    hint:
      "예) 나는 오리로 봤는데 짝은 토끼래서 놀랐다.\n" +
      "예) 같은 영화를 보고 나는 슬펐는데 친구는 웃겼다고 했다.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },

  // ── ⑤ 문화권별 감정 표현 비교 (mvp) ──────────────────────────
  {
    key: "_culture_intro",
    phase: "mvp",
    /*
     * 관점 차이 → 문화 차이로 잇는 머리글. 문화 예시는 아래 note 카드들로 이어진다.
     * (콘텐츠 카드(ContentCard)는 안내 화면에서만 그려지고 퀴즈보다 앞이라, 투표 뒤에
     *  와야 하는 문화 비교는 활동지 note 로 카드처럼 담는다. 뒤 활동이 재배치할 때
     *  안내 화면으로 옮기려면 note→cards 로 바꾸면 된다.)
     */
    label: "관점은 ‘문화’ 에 따라서도 달라져요",
    hint:
      "그림을 다르게 보듯, 같은 감정도 문화권마다 다르게 표현해요.\n" +
      "아래 예시들을 보며 ‘이건 나라마다 다르구나’ 를 느껴 보세요. 어느 쪽도 맞고 틀림이 아니에요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_culture_smile",
    phase: "mvp",
    label: "😊 웃음 — ‘반가움’ 일까, ‘무례함’ 일까",
    hint:
      "서양에서는 처음 만난 사람에게 활짝 웃는 것이 예의이자 반가움의 표시예요.\n" +
      "반대로 어떤 문화권(예: 러시아)에서는 이유 없이 낯선 사람에게 웃으면 진심이 없거나\n" +
      "이상하게 여겨지기도 해요. 같은 미소가 정반대로 읽히는 거죠.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_culture_eye",
    phase: "mvp",
    label: "👀 눈 맞춤 — ‘당당함’ 일까, ‘무례함’ 일까",
    hint:
      "서양에서는 대화할 때 눈을 마주치는 것이 자신감과 존중의 표시예요.\n" +
      "한국·일본 등 동아시아에서는 어른의 눈을 똑바로 오래 쳐다보는 것을 버릇없다고\n" +
      "여기기도 했어요. 같은 행동인데 존중과 무례로 갈립니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_culture_show",
    phase: "mvp",
    label: "😢 슬픔·기쁨 — ‘드러내기’ 일까, ‘참기’ 일까",
    hint:
      "감정을 크게 겉으로 드러내는 것을 자연스럽게 여기는 문화가 있고(예: 이탈리아·라틴 문화),\n" +
      "감정을 절제하고 차분히 표현하는 것을 예의로 여기는 문화가 있어요(예: 동아시아).\n" +
      "장례식에서 소리 내어 우는 곳도, 조용히 슬퍼하는 곳도 있습니다. 표현 방식이 다를 뿐이에요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_culture_gesture",
    phase: "mvp",
    label: "👍 같은 손짓, 다른 뜻",
    hint:
      "엄지 척(👍)은 우리에겐 ‘좋아요’ 지만, 일부 문화권에서는 무례한 뜻이 되기도 해요.\n" +
      "고개를 끄덕이는 것이 ‘예’ 가 아니라 ‘아니오’ 인 나라도 있어요(예: 불가리아).\n" +
      "몸으로 하는 감정 표현도 문화라는 맥락 위에서 읽힙니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "culture_pick",
    phase: "mvp",
    /*
     * 개인 소감. 친구에게 안 나간다. 어느 예시가 인상 깊었는지 자기 말로 꺼내게 한다.
     */
    label: "가장 흥미로웠던 차이 하나와, 왜 그런지 내 생각을 적어 주세요",
    hint:
      "예) 눈을 안 마주치는 게 무례가 아니라 존중일 수도 있다는 게 신기했다.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },

  // ── ⑥ 문화 맥락 이해 정리 (build) ────────────────────────────
  {
    key: "_wrap_note",
    phase: "build",
    label: "오늘 알게 된 것 — 감정 표현은 ‘문화’ 라는 맥락 위에 있다",
    hint:
      "같은 그림도 사람마다 다르게 보이고, 같은 감정도 문화마다 다르게 표현돼요.\n" +
      "그러니 친구가 나와 다르게 표현하거나 반응해도, 그게 틀린 게 아니라 ‘다른’ 거예요.\n" +
      "이걸 알면, 나와 다른 사람을 이해하고 존중하기가 조금 더 쉬워집니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "wrap_apply",
    phase: "build",
    /*
     * 대인관계 영역다운 마무리 — 배운 것을 관계에 적용해 보게 한다. 개인 글, 비공개.
     */
    label: "‘나와 다른 관점·표현’ 을 존중하기 위해, 내가 해볼 수 있는 것 한 가지",
    hint:
      "예) 친구가 나와 반응이 다를 때 ‘틀렸다’ 대신 ‘너는 그렇게 봤구나’ 라고 말해보기.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 250,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "디지털 마음 톡톡 5회기 — 우리는 왜 다르게 생각할까? (대인관계, 첫 활동)",

  // 매 회기 첫 화면 루틴
  moodCheckEnabled: true,

  // 이전 회기와 같은 분반 표 (계획엔 분반이 무관하지만 표기는 맞춰 둔다)
  groups: [
    { key: "mt-tue-1", label: "화요일 1기", classNo: 1 },
    { key: "mt-thu-1", label: "목요일 1기", classNo: 2 },
    { key: "mt-tue-2", label: "화요일 2기", classNo: 3 },
    { key: "mt-thu-2", label: "목요일 2기", classNo: 4 },
  ],

  game: {
    heading: "기다리는 동안 — 한붓그리기",
    body:
      "친구들이 다 모일 때까지 잠깐 쉬어요.\n" +
      "선을 한 번도 떼지 않고, 같은 길을 두 번 지나지 않게 모든 선을 그려 보세요.",
    url: "https://euler-path-game.vercel.app/",
  },
  gameExplainer: empty(),

  /*
   * 오늘 할 일 + ① 착시 영상.
   *
   * 안내 화면(progress)은 퀴즈보다 앞이라, 여기에 착시 영상을 임베드하면 버튼 순서가
   * outline 그대로(안내 → 토끼오리 그림 → 투표) 흐른다. body(오늘 할 일)와 url(착시
   * 영상 임베드)이 함께 그려진다 — cards·tabs 가 없을 때만 body 가 뜨므로 여기선 뜬다.
   */
  progress: {
    heading: "오늘 할 일 — 우리는 왜 다르게 생각할까?",
    body:
      "먼저 아래 ‘착시 영상’ 을 함께 봐요. 눈이 어떻게 우리를 다르게 속이는지 보고 시작합니다.\n\n" +
      "① 착시 영상 보기 — 같은 그림이 다르게 보이는 신기한 순간들\n" +
      "② 토끼일까 오리일까? — 유명한 착시 그림을 보고\n" +
      "③ 투표하기 — 나는 토끼로 보였나, 오리로 보였나 (결과를 함께 봐요)\n" +
      "④ 관점 차이 깨닫기 — 보는 사람마다 다를 수 있다\n" +
      "⑤ 문화마다 다른 감정 표현 — 같은 감정도 나라마다 다르게 표현해요\n" +
      "⑥ 정리 — 나와 다른 것은 틀린 게 아니라 다른 것\n\n" +
      "영상을 보며 생각해 보세요: 왜 어떤 건 사람마다 다르게 보일까?",
    url: ILLUSION_VIDEO_EMBED,
  },

  /*
   * ② 토끼-오리 착시 그림 제시.
   *
   * 안내 화면(assessment)은 퀴즈 바로 앞이라, 투표 직전에 그림을 크게 보여주기 좋다.
   * PhaseContent 는 그림을 탭(tab.imageUrl)으로만 그리므로 탭 하나에 담는다.
   * ⚠️ RABBIT_DUCK_IMG 파일은 아직 없다 — 교사가 public/mt5/rabbit-duck.png 로 넣어야 뜬다.
   */
  assessment: {
    heading: "토끼일까요, 오리일까요?",
    body: "",
    url: "",
    tabs: [
      {
        label: "이 그림, 뭐로 보여요?",
        subtitle: "잘 보세요 — 토끼로도, 오리로도 보입니다",
        note: "착시",
        rows: [],
        highlights: [
          "정답은 없어요. 처음에 무엇으로 보였는지 마음속으로 정해 두세요.",
          "다음 화면에서 ‘토끼 / 오리’ 를 투표할 거예요. 우리 반 결과를 함께 봅니다.",
        ],
        imageUrl: RABBIT_DUCK_IMG,
        imageAlt: "토끼로도 오리로도 보이는 유명한 착시 그림",
      },
    ],
  },

  // 착시 영상은 progress 에 임베드했다. 앞 화면(video 단계) 재생은 쓰지 않는다.
  video: empty(),

  /*
   * 마음일기 — 매 회기 루틴. reflectionPublic 은 반드시 false(비공개).
   * 오늘 주제(관점·다름의 존중)를 관계로 잇는 물음을 둔다.
   */
  reflectionQuestions: [
    "오늘 활동에서 마음에 남는 순간은 언제였나요? 무엇 때문에 그랬는지도 함께 적어 주세요.",
    "지금 내 기분은 어떤가요? 그리고 왜 그런 것 같나요?",
    "나와 생각·표현이 다른 친구를 떠올려 보세요. 오늘 배운 것을 그 친구에게 어떻게 써볼 수 있을까요?",
  ],
  reflectionPublic: false,

  /*
   * 착시 영상을 안내 화면(progress)에 임베드로 둔다. 임베드는 새 창 이탈이 아니라
   * 화면 안에서 재생되므로 이탈로 세지 않지만, 혹시 몰라 progress 를 면제해 둔다.
   */
  focusExempt: ["progress"],

  phaseLabels: {
    mood: "마음 체크인",
    progress: "오늘 할 일 · 착시 영상",
    assessment: "토끼? 오리?",
    quiz: "토끼 vs 오리 투표",
    problem: "관점 차이 깨닫기",
    mvp: "문화마다 다른 감정 표현",
    build: "정리 — 감정 표현과 문화",
    reflection: "마음일기",
  },

  // 토끼/오리 투표 — 포털 퀴즈로. 교사가 공유화면에서 집계를 본다(정답은 공개하지 않는다).
  quiz: QUIZ,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리기 없는 활동. 장소를 비우면 그림판이 안 뜬다.
    places: [],
    year: 2026,
    worksheet: WORKSHEET,

    // 자료 찾기가 아니라 마음을 들여다보는 활동이라 출처 두 칸을 안 띄운다.
    sourcesEnabled: false,

    /*
     * ★ 서로 구경하기를 닫는다 — 감정·의견 글은 친구에게 안 나간다.
     * 서버 갤러리 라우트가 이 값을 보고 응답 자체를 막는다(gallery/route.ts).
     * 뒤에 대인관계 나눔 활동을 붙여 갤러리를 켤 때는, 친구에게 나갈 칸만
     * galleryAnswerKeys 로 못박고 서버 목록도 함께 챙긴다.
     */
    galleryEnabled: false,
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

      // 아직 시작하지 않은 수업에만 다시 복사한다 (PRD 5.1)
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} · 차시 번호 ${LESSON_NO} (5회기 대인관계 — 첫 활동 모듈, 추후 조합)`);
  console.log("단계: 대기 → 마음 체크인 → 오늘 할 일+착시 영상 → 토끼? 오리? 그림 → 토끼/오리 투표(퀴즈) → 관점 차이 → 문화별 감정 표현 → 정리 → 마음일기");
  console.log(`착시 영상: 안내 화면(progress)에 임베드 (${ILLUSION_VIDEO_WATCH}). 앞 화면 재생을 원하면 교사가 같은 링크를 전자칠판에 열면 됩니다.`);
  console.log(`⚠ 이미지: 토끼-오리 그림 파일이 아직 없습니다 — 교사가 public${RABBIT_DUCK_IMG} 로 넣어야 화면에 뜹니다. (예: 위키미디어 공용 "Kaninchen und Ente")`);
  console.log("토끼/오리 투표: 포털 퀴즈로 만들었습니다. 교사 대시보드에서 [응답 분포 새로고침] 으로 집계를 보세요.");
  console.log("⚠ 정답 공개 금지: [정답 공개] 를 누르면 학생 화면에서 토끼가 초록 ‘정답’, 오리가 분홍 ‘오답’ 으로 떠서 잘못된 신호를 줍니다. 의견 투표라 정답이 없습니다 — 공개하지 마세요.");
  console.log("   (교사 제어판 문구가 ‘타임머신 퀴즈’ 로 뜨고 토끼 옆 ‘← 정답’ 이 붙는 것은 교사 화면에만 보이는 겉표시입니다. 학생에겐 안 갑니다.)");
  console.log("프라이버시: 서로 구경하기 꺼짐(galleryEnabled: false) — 관점·문화 소감·마음일기는 본인·교사만. 투표는 익명 집계 수치라 개인 글이 아님. AI 감정 렌즈 없음(Gemini 호출 없음).");
  console.log("블록타임: 6·7교시 90분 연속 → 세션은 7교시로 하나만 엽니다 (여는 스크립트 open-mt5-*.ts 의 몫, 이번엔 seed 만).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
