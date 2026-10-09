/**
 * 22차시 차시 계획 등록 — 「복습 + 바이브 코딩」.
 *
 *   node --env-file=.env.local scripts/seed-lesson22.ts
 *   node --env-file=.env.local scripts/seed-lesson22.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 21차까지 만든 '똥피하기' 기본 기능 완성 뒤의 마무리·창작 차시
 *
 * 지금까지 배운 개념(변수·if·함수·리스트·for·==·True/False·distance·ontimer·점수·속도)을 가볍게
 * 복습하고, 그 완성 게임(21차 최종)에 **학생이 원하는 기능 하나를 말(프롬프트)로 요청해 AI에게 코드를
 * 받아 보는** '바이브 코딩' 을 체험한다. AI가 준 코드를 복사해 OneCompiler 터틀에서 실행·디버깅한다.
 *
 * ## 새 기능 — 바이브 코딩 (vibe_code kind)
 *
 * 학생 프롬프트 → 서버가 Gemini 호출(vibe-code.ts) → 전체 파이썬 turtle 코드 + 쉬운 설명. 프롬프트·답은
 * 학생 activity 아티팩트(answers[key])에 JSON(VibeCodeLog)으로 저장되고 **교사만 열람**한다
 * (api/teacher/vibe-code + requireTeacher, 대시보드 VibeCodeReviewPanel). 학번·이름은 Gemini 로 안 보낸다.
 * 화면엔 "선생님이 볼 수 있어요" 를 항상 띄운다. 비밀은 process.env(GEMINI_API_KEY)만.
 *
 * ## 활동 통(activityId) — 17~21차와 같은 통을 이어 씀
 *
 * `python-dodge-game` — 게임 제작 아크 공용 통. 바이브 코딩 기록이 21차 점수·난이도 기록 위에 같은
 * 문서에 쌓인다. 공유(gallery)는 galleryAnswerKeys 를 '공유용 한 칸' 으로 잠가, 바이브 프롬프트·성찰은
 * 비공개로 둔다(프라이버시).
 *
 * ## 표준 — 18~21차 계열
 *
 * 대기 화면은 파이썬 타자 도우미 링크(game.url="link:..."). 게임(테트리스)은 성찰 '제출하고 게임하기'
 * 보상(rewardGame). 단, 바이브 코딩은 AI 채점(verdict)이 없는 창작 활동이라 requires 게이트를 걸지
 * 않는다 — 성찰을 제출하면 열린다(활동을 마친 상). freeNavigation 켬.
 *
 * 대상 1~4반 중1. 각 반 30번은 테스트 학생(리허설). 숙제/집에 내주는 것 없음. seed 멱등(--force).
 */

import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import type { LessonPlan, PhaseContent, QuizContent, WorksheetQuestion } from "../src/lib/types.ts";

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
const LESSON_NO = 22;

/** 18~21차와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/** 게임 제작 아크 공용 통. 17~21차와 같은 통 — 바이브 코딩 기록이 21차 기록 위에 같은 artifact 에 쌓인다. */
const ACTIVITY_ID = "python-dodge-game";

const TYPING_APP_URL = "https://python-typing-helper.vercel.app/";
const ONECOMPILER_TURTLE_URL = "https://onecompiler.com/turtle";

/* ──────────────────────────────────────────────────────────────
 * 완성 게임(바탕) — 21차 최종 코드(점수·난이도까지). 학생에게 '완성 코드' 로 보여주고(복사), 바이브
 * 코딩의 vibeBaseCode(서버가 Gemini 에 주는 현재 코드)로도 쓴다. 화면 글씨는 영어(터틀 한글 깨짐).
 * ────────────────────────────────────────────────────────────── */
const BASE_GAME_CODE = `import turtle
import random

screen = turtle.Screen()
screen.setup(400, 500)

# 주인공
player = turtle.Turtle()
player.shape("square")
player.penup()
player.goto(0, -200)

over = False

def go_left():
    if over:
        return
    x = player.xcor()
    player.setx(x - 20)

def go_right():
    if over:
        return
    x = player.xcor()
    player.setx(x + 20)

# 똥 여러 개 (리스트)
poops = []
for i in range(3):
    poop = turtle.Turtle()
    poop.shape("circle")
    poop.penup()
    poop.color("brown")
    poop.goto(random.randint(-180, 180), random.randint(250, 400))
    poops.append(poop)

# 점수 + 속도(난이도)
score = 0
speed = 5

score_writer = turtle.Turtle()
score_writer.hideturtle()
score_writer.penup()
score_writer.goto(0, 210)
score_writer.write("Score: 0", align="center", font=("", 20, "bold"))

def fall():
    global score, speed
    for poop in poops:
        poop.sety(poop.ycor() - speed)
        if poop.ycor() < -250:
            poop.goto(random.randint(-180, 180), 250)
            score = score + 1
            speed = speed + 1
            score_writer.clear()
            score_writer.write("Score: " + str(score), align="center", font=("", 20, "bold"))
        if poop.distance(player) < 20:
            global over
            over = True
            over_writer = turtle.Turtle()
            over_writer.hideturtle()
            over_writer.write("GAME OVER!", align="center", font=("", 28, "bold"))
            return
    screen.ontimer(fall, 50)

screen.listen()
screen.onkeypress(go_left, "Left")
screen.onkeypress(go_right, "Right")

fall()

screen.mainloop()`;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 복습 퀴즈 — 지금까지 개념을 가볍게. 정답이 있는 지식 퀴즈. stickers 는 이 과목 특성 태그라 빈 배열.
// ─────────────────────────────────────────────────────────────
const QUIZ: QuizContent = {
  label: "복습",
  questions: [
    {
      prompt: "값을 담아 두는 '상자' 를 무엇이라고 할까요? (예: score, speed)",
      choices: ["변수", "함수", "리스트"],
      answerIndex: 0,
      nowText: "값을 담아 두는 상자가 '변수' 예요. score, speed, over 가 다 변수였죠.",
      stickers: [],
    },
    {
      prompt: "score = score + 1 은 무슨 뜻일까요?",
      choices: ["점수를 0으로 되돌린다", "지금 점수에 1을 더해 다시 담는다", "점수와 1이 같은지 물어본다"],
      answerIndex: 1,
      nowText: "'지금 score + 1' 을 다시 score 에 담는 거예요(값 누적). = 는 '넣기' 였죠.",
      stickers: [],
    },
    {
      prompt: "if over == True: 와 같은 뜻인 것은?",
      choices: ["if over:", "over = True", "for over:"],
      answerIndex: 0,
      nowText: "over 자체가 참/거짓 값이라 if over: 와 if over == True: 는 같은 뜻이에요. == 는 '같은지 물어보기'.",
      stickers: [],
    },
    {
      prompt: "똥 여러 개를 한 상자에 담아 하나씩 다루려고 쓴 것은?",
      choices: ["리스트와 for 반복", "if 조건문", "글씨 쓰기(write)"],
      answerIndex: 0,
      nowText: "poops = [] 에 append 로 담고, for poop in poops 로 하나씩 꺼내 다뤘어요.",
      stickers: [],
    },
    {
      prompt: "두 거북이(똥과 주인공) 사이 거리를 재서 충돌을 알아낸 함수는?",
      choices: ["distance", "forward", "goto"],
      answerIndex: 0,
      nowText: "poop.distance(player) 가 두 거북 사이 거리예요. 20보다 가까우면 닿은 것으로 봤죠.",
      stickers: [],
    },
    {
      prompt: "speed 를 점점 키우면 게임이 어떻게 될까요?",
      choices: ["똥이 점점 빨리 떨어진다", "점수가 사라진다", "주인공이 커진다"],
      answerIndex: 0,
      nowText: "speed = speed + 1 로 낙하 폭을 키우면 똥이 점점 빨리 떨어져 어려워져요(난이도).",
      stickers: [],
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// 활동지 — 바이브 코딩 소개(note) → 완성 코드(note) → 바이브 코딩 활동(vibe_code) → 디버깅 안내(note)
//          → 공유용 한 줄(long). 복습은 quiz 단계, 서로 보기는 gallery 단계, 성찰은 reflection 단계.
// 모든 단계가 같은 활동 통(python-dodge-game) 한 문서에 함께 저장된다.
// ─────────────────────────────────────────────────────────────
const SHARE_KEY = "dg22_share";

const WORKSHEET: WorksheetQuestion[] = [
  /* ── 바이브 코딩 소개 + 프롬프트 기초 ── */
  {
    key: "_dg22_vibe_intro",
    phase: "build",
    label: "바이브 코딩이란? — 말로 설명해 코드 받기",
    hint:
      "'바이브 코딩' 은 내가 원하는 걸 말(글)로 설명하면 AI가 코드를 만들어 주는 방식이에요.\n" +
      "오늘은 우리가 만든 똥피하기 게임에 '기능 하나' 를 AI에게 부탁해 붙여 봐요.\n\n" +
      "좋은 프롬프트(요청) 요령:\n" +
      "· 구체적으로 — '재밌게' 말고 '똥에 닿으면 목숨이 1 줄게' 처럼 동작을 또렷이.\n" +
      "· 한 번에 하나씩 — 기능을 한 가지만 부탁해요. 되면 다음 걸 또 부탁하면 돼요.\n" +
      "· 동작을 말로 — 무엇이 언제 어떻게 되는지(언제 점수가 오르고, 무엇이 바뀌는지) 적어요.\n\n" +
      "게임과 상관없거나 장난스러운 요청은 AI가 정중히 거절할 수 있어요.",
    kind: "note",
    maxLength: 0,
  },

  /* ── 완성 코드 제공 (바탕) ── */
  {
    key: "_dg22_base_code",
    phase: "build",
    label: "지금까지 만든 완성 게임 코드",
    hint:
      "아래가 지난 시간까지 함께 만든 '완성 게임' 이에요(주인공·똥 여러 개·충돌·게임 오버·점수·난이도).\n" +
      "바이브 코딩은 이 코드를 바탕으로 기능을 더해 줘요. 먼저 복사해서 OneCompiler 터틀에서 한 번\n" +
      "실행해 보고, 아래에서 원하는 기능을 AI에게 부탁해 봐요. 화면 글씨는 영어예요(터틀 한글 깨짐).",
    kind: "note",
    code: BASE_GAME_CODE,
    linkUrl: ONECOMPILER_TURTLE_URL,
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },

  /* ── 바이브 코딩 활동 (vibe_code) ── */
  {
    key: "dg22_vibe",
    phase: "build",
    label: "나만의 기능 추가하기 — AI에게 코드 받기",
    hint:
      "추가하고 싶은 기능을 아래 칸에 적고 'AI에게 코드 받기' 를 눌러요. AI가 전체 코드와 설명을\n" +
      "돌려주면, 복사해서 OneCompiler 터틀에서 실행해 봐요. 한 번에 안 되면 설명을 보고 조금씩 고쳐요.\n" +
      "예) 목숨 3개 만들기, 아이템 먹으면 점수 더 오르기, 똥 개수 늘리기, 주인공 색·모양 바꾸기 등.",
    kind: "vibe_code",
    vibeBaseCode: BASE_GAME_CODE,
    maxLength: 0,
  },

  /* ── 디버깅 안내 ── */
  {
    key: "_dg22_debug",
    phase: "build",
    label: "AI 코드가 한 번에 안 될 때 (정상이에요!)",
    hint:
      "AI가 준 코드가 한 번에 딱 안 되는 건 아주 흔한 일이에요 — 당황하지 말고 고쳐 봐요.\n\n" +
      "· 빨간 에러 메시지를 읽어요 — 보통 '몇 번째 줄' 이 적혀 있어요. 거기부터 봐요.\n" +
      "· 한 줄씩 확인해요 — 괄호·따옴표가 짝이 맞는지, 들여쓰기(안쪽 띄우기)가 맞는지.\n" +
      "· AI에게 다시 부탁해요 — '이런 에러가 났어, 고쳐 줘' 라고 에러 메시지를 그대로 전해도 돼요.\n\n" +
      "고치는 것도 코딩의 한 부분이에요. 한 번에 완벽하지 않아도 괜찮아요.",
    kind: "note",
    maxLength: 0,
  },

  /* ── 공유용 한 줄 (gallery 에서 이 칸만 공개 — 바이브 프롬프트·성찰은 비공개) ── */
  {
    key: SHARE_KEY,
    phase: "build",
    label: "친구들과 나눌 한 줄 — 내가 더한 기능",
    hint:
      "내가 어떤 기능을 더했고 어떻게 됐는지 한두 줄로 적어요. 이 칸만 '서로 보기' 에서 친구들에게\n" +
      "보여요(내가 AI에게 보낸 말과 성찰은 보이지 않아요).",
    kind: "long",
    maxLength: 400,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "복습 + 바이브 코딩",
  moodCheckEnabled: true,

  // 대기 화면 = 파이썬 타자 도우미 (게임 대신). 게임(테트리스)은 성찰 보상(rewardGame).
  game: {
    heading: "기다리는 동안 — 파이썬 타자 연습",
    body:
      "오늘은 복습하고, 완성한 게임에 내 기능을 하나 더해 봐요. 그 전에 파이썬 타자 도우미로 손을 풀어요.\n" +
      "아래 버튼을 누르면 새 탭에서 열려요. 수업이 시작되면 이 화면은 저절로 넘어가요.",
    url: `link:${TYPING_APP_URL}`,
  },
  gameExplainer: empty(),

  /*
   * 보상 게임 — 성찰 '제출하고 게임하기' 를 누르면 열린다. 바이브 코딩은 AI 채점(verdict)이 없는
   * 창작 활동이라 requires 게이트를 걸지 않는다(활동을 마친 상으로 성찰 제출 시 열림).
   */
  rewardGame: {
    heading: "테트리스",
    body: "오늘 활동을 다 끝냈어요 — 쉬는 시간으로 테트리스 한 판! 수업이 끝나면 정리해요.",
    url: "https://tetris-game-seven-nu.vercel.app/",
  },

  // 다음 시간(progress) 단계는 두지 않는다 — 안내(assessment)가 이미 있어 중복이다.
  progress: empty(),

  /*
   * 안내 보드 — 오늘 순서(복습 → 바이브 코딩 → 공유). 활동 중 되돌아와 볼 수 있다.
   */
  assessment: {
    heading: "오늘 할 일 — 복습하고, 내 기능 하나 더하기",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "지금까지 배운 걸 복습하고, AI로 내 기능을 더해요",
        note:
          "지난 시간까지 똥피하기 기본 기능을 완성했죠? 오늘은 그동안 배운 걸 가볍게 복습하고,\n" +
          "완성 게임에 '내가 원하는 기능 하나' 를 말로 설명해 AI에게 코드를 받아 붙여 봐요(바이브 코딩).",
        rows: [
          { label: "복습", value: "변수·if·함수·리스트·for·점수·속도 등 가볍게 퀴즈로" },
          { label: "바이브 코딩", value: "원하는 기능을 프롬프트로 요청 → AI 코드 받기 → 실행·고치기" },
          { label: "기록", value: "내가 AI에게 보낸 말과 받은 코드는 선생님이 볼 수 있어요" },
        ],
        highlights: [
          "AI가 준 코드가 한 번에 안 되는 건 정상이에요 — 설명을 보고 조금씩 고치는 것도 코딩이에요.",
        ],
      },
      {
        label: "오늘 순서",
        subtitle: "복습 퀴즈 → 바이브 코딩 → 서로 보기 → 성찰",
        note: "선생님이 한 단계씩 넘겨 줘요.",
        rows: [
          { label: "1", value: "복습 퀴즈 — 지금까지 배운 개념 가볍게" },
          { label: "2", value: "바이브 코딩 — 완성 코드에 내 기능 하나 AI에게 부탁해 붙이기" },
          { label: "3", value: "서로 보기 — 내가 더한 기능 한 줄을 친구들과 나누기" },
          { label: "마지막", value: "성찰 한 줄 → 제출하면 테트리스!" },
        ],
        highlights: [
          "프롬프트는 구체적으로, 한 번에 하나씩, 동작을 말로 적어요.",
        ],
      },
    ],
  },

  video: empty(),

  quiz: QUIZ,

  /*
   * 성찰 — 바이브 코딩으로 '진짜 게임' 처럼 꾸며 본 소감. 개인적이라 비공개.
   */
  reflectionQuestions: [
    "말로 설명해 AI에게 코드를 받아 보니 어땠나요? 좋았던 점이나 어려웠던 점을 한 줄로 적어 봐요.",
  ],
  reflectionPublic: false,

  /*
   * 외부 새 탭 링크가 붙은 단계는 창을 옮겨도 이탈로 세지 않는다. 대기(타자)·build(OneCompiler·바이브)다.
   */
  focusExempt: ["waiting", "build"],
  /*
   * 기분(mood)은 대기 화면에서 먼저 받으므로 단계에서 뺀다.
   * 단계: 안내(assessment) → 복습 퀴즈(quiz) → 바이브 코딩(build) → 서로 보기(gallery) → 성찰(reflection).
   */
  phaseOrder: ["waiting", "assessment", "quiz", "build", "gallery", "reflection"],
  phaseLabels: {
    assessment: "안내",
    quiz: "복습 퀴즈",
    build: "바이브 코딩",
    gallery: "서로 보기",
  },
  /*
   * 되돌아가기 켬 — 보상 안내·단계 이동·성찰 복귀에 필요하다.
   */
  freeNavigation: true,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "복습 + 바이브 코딩",
      body:
        "복습 퀴즈로 지금까지 배운 걸 가볍게 되짚고, 완성 게임에 내가 원하는 기능 하나를 AI에게\n" +
        "부탁해 붙여 봐요. 내가 더한 기능은 한 줄로 적어 친구들과 나눠요.",
    },
    worksheet: WORKSHEET,
    // 서로 보기(gallery)는 켜되, 공유용 한 칸(SHARE_KEY)만 공개한다 — 바이브 프롬프트·성찰은 비공개.
    galleryEnabled: true,
    galleryAnswerKeys: [SHARE_KEY],
    galleryNoun: "더한 기능",
    sourcesEnabled: false,
  },
};

async function main(): Promise<void> {
  const existing = await db.collection(LESSON_PLANS).where("lessonNo", "==", LESSON_NO).get();
  const now = Date.now();

  if (!existing.empty) {
    const doc = existing.docs[0];
    // 이 차시는 복습 quiz 가 있다 — quiz 는 지우지 않고 PLAN 으로 채운다. progress·progressChecks 만 삭제.
    await doc.ref.set(
      {
        ...PLAN,
        updatedAt: now,
        progress: FieldValue.delete(),
        progressChecks: FieldValue.delete(),
      },
      { merge: true },
    );
    console.log(`↻ 갱신 — ${PLAN.title} (${doc.id})`);

    /* 18~21차와 같은 규칙 — 아직 아무도 안 들어온 수업에만 반영한다 */
    const live = await db
      .collection("classSessions")
      .where("lessonNo", "==", LESSON_NO)
      .where("status", "in", ["scheduled", "active"])
      .get();

    const scheduled: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    for (const session of live.docs) {
      const joined = await db
        .collection("attendance")
        .where("sessionId", "==", session.id)
        .limit(1)
        .get();
      if (joined.empty || FORCE) scheduled.push(session);
      else
        console.log(
          `· ${session.id} — 이미 학생이 들어와 있어 건드리지 않습니다 (--force 로 덮어쓸 수 있습니다)`,
        );
    }

    for (const session of scheduled) {
      await session.ref.set(
        {
          title: PLAN.title,
          moodCheckEnabled: PLAN.moodCheckEnabled,
          game: PLAN.game,
          gameExplainer: PLAN.gameExplainer,
          rewardGame: PLAN.rewardGame,
          progress: FieldValue.delete(),
          progressChecks: FieldValue.delete(),
          assessment: PLAN.assessment,
          video: PLAN.video,
          quiz: PLAN.quiz,
          reflectionQuestions: PLAN.reflectionQuestions,
          reflectionPublic: PLAN.reflectionPublic,
          focusExempt: PLAN.focusExempt,
          phaseOrder: PLAN.phaseOrder,
          phaseLabels: PLAN.phaseLabels,
          freeNavigation: PLAN.freeNavigation,
          activity: PLAN.activity,
        },
        { merge: true },
      );
    }
    console.log(`   아직 아무도 안 들어온 수업 ${scheduled.length}개에 반영`);
  } else {
    const ref = await db.collection(LESSON_PLANS).add({ ...PLAN, createdAt: now, updatedAt: now });
    console.log(`＋ 등록 — ${PLAN.title} (${ref.id})`);
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} (게임 제작 아크 공용 통 — 17~21차와 같은 통. 바이브 코딩 기록이 21차 기록 위에 같은 문서에 쌓임)`);
  console.log("단계: 대기(파이썬 타자 링크) → 안내(assessment) → 복습 퀴즈(quiz) → 바이브 코딩(build) → 서로 보기(gallery) → 성찰. 기분은 대기 화면에서만.");
  console.log("바이브 코딩(vibe_code): 학생 프롬프트 → 서버 Gemini(vibe-code.ts) → 전체 파이썬 turtle 코드 + 설명. 프롬프트·답은 answers[dg22_vibe] 에 JSON 저장, 교사만 열람(api/teacher/vibe-code + requireTeacher, 대시보드 VibeCodeReviewPanel). 학번·이름 미전송. GEMINI_API_KEY 서버 전용.");
  console.log(`완성 코드(바탕): 21차 최종(점수·난이도). _dg22_base_code 의 code + vibe_code 의 vibeBaseCode 로 제공. OneCompiler 터틀(${ONECOMPILER_TURTLE_URL})에서 실행.`);
  console.log(`복습 퀴즈: ${QUIZ.questions.length}문항(변수·누적·==/True·리스트+for·distance·속도). 디버깅 안내 note 포함.`);
  console.log(`공유: galleryEnabled + galleryAnswerKeys=[${SHARE_KEY}] 로 '더한 기능 한 줄' 만 공개 — 바이브 프롬프트·성찰은 비공개(프라이버시).`);
  console.log("보상: 테트리스 — requires 없음(바이브는 AI 채점 verdict 없는 창작 활동이라, 성찰 제출 시 열림). freeNavigation. focusExempt: waiting·build.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
