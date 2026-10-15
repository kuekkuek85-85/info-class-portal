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

/* ──────────────────────────────────────────────────────────────
 * 버그 고치기(디버깅) — 완성 코드(BASE_GAME_CODE)에 '한 줄짜리 결함' 만 심은 분리본 3개.
 * lesson21 방식: note(증상+버그 코드+증상 SVG+OneCompiler 링크) → long 제출칸 → ai_feedback(code 채점).
 * 학생이 코드를 '읽고 이해해야' 고칠 수 있게, 버그 줄에 정답 표시(주석)는 넣지 않는다.
 * ────────────────────────────────────────────────────────────── */
function mustReplace(src: string, find: string, repl: string, tag: string): string {
  if (!src.includes(find)) {
    console.error(`✗ 버그 주입 실패(${tag}) — 찾는 문자열이 BASE_GAME_CODE 에 없습니다:\n${find}`);
    process.exit(1);
  }
  return src.replace(find, repl);
}

// 버그 ① 쉬움 — 문법: go_right 의 게임오버 확인이 `if over = True:` (대입 =) → SyntaxError
const BUG1_CODE = mustReplace(
  BASE_GAME_CODE,
  "def go_right():\n    if over:",
  "def go_right():\n    if over = True:",
  "bug1",
);

// 버그 ② 중간 — 논리: 충돌 판정 부등호가 `> 20` (방향 뒤집힘) → 시작하자마자 게임 오버
const BUG2_CODE = mustReplace(
  BASE_GAME_CODE,
  "if poop.distance(player) < 20:",
  "if poop.distance(player) > 20:",
  "bug2",
);

// 버그 ③ 어려움 — 흐름/들여쓰기: speed = speed + 1 이 if 블록 밖(for 안)으로 빠져 매 프레임 빨라짐
const BUG3_CODE = mustReplace(
  mustReplace(
    BASE_GAME_CODE,
    "            score = score + 1\n            speed = speed + 1\n            score_writer.clear()",
    "            score = score + 1\n            score_writer.clear()",
    "bug3a",
  ),
  '            score_writer.write("Score: " + str(score), align="center", font=("", 20, "bold"))\n        if poop.distance(player) < 20:',
  '            score_writer.write("Score: " + str(score), align="center", font=("", 20, "bold"))\n        speed = speed + 1\n        if poop.distance(player) < 20:',
  "bug3b",
);

/* 들여쓰기 배우기(wrapmap) 예제 — 같은 줄이 'if 안' 이냐 'if 밖' 이냐로 동작이 갈림(버그③과 직결). */
const CODE_INDENT_EXAMPLE = `# A) speed 올리기가 'if 안' (12칸) — 똥을 하나 피했을 때만 빨라짐 (정상)
for poop in poops:
    if poop.ycor() < -250:      # 똥이 바닥을 지났을 때(= 하나 피함)
        score = score + 1
        speed = speed + 1       # if 안 → 피했을 때만 실행

# B) speed 올리기가 'if 밖' (8칸, for 바로 밑) — 매 반복마다 빨라짐 (버그!)
for poop in poops:
    if poop.ycor() < -250:
        score = score + 1
    speed = speed + 1           # if 밖 → 똥을 안 피해도 매번 실행 → 너무 빨라짐`;

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
  ],
};

// ─────────────────────────────────────────────────────────────
// 활동지 — 바이브 코딩 소개(note) → 완성 코드(note) → 바이브 코딩 활동(vibe_code) → 디버깅 안내(note)
//          → 공유용 한 줄(long). 복습은 quiz 단계, 서로 보기는 gallery 단계, 성찰은 reflection 단계.
// 모든 단계가 같은 활동 통(python-dodge-game) 한 문서에 함께 저장된다.
// ─────────────────────────────────────────────────────────────
const SHARE_KEY = "dg22_share";

const WORKSHEET: WorksheetQuestion[] = [
  /* ═══════════════════════════════════════════════════════════════
   * 들여쓰기 배우기(wrapmap) — 복습 퀴즈 뒤·버그 고치기 ① 앞. 들여쓰기를 아직 안 배웠는데 버그③이
   * 들여쓰기 문제라, 먼저 개념을 익힌다. 개념 note + 예제 note(코드만, SVG 없음) + 형성평가 cloze
   * (lesson21 연산자 단계와 같은 방식 — clozeGrade 즉석 채점). 새 kind 없음 → 배포 불필요.
   * ═══════════════════════════════════════════════════════════════ */
  {
    key: "_dg22_indent_concept",
    phase: "wrapmap",
    label: "들여쓰기 — 부모와 자식의 예의",
    hint:
      "들여쓰기는 '부모와 자식의 예의' 라고 생각하면 쉬워요. 😊\n\n" +
      "· if 나 for 같은 줄이 '부모' 예요. 그 아래에서 그 if/for 에 속해 움직이는 줄들이 '자식' 이고요.\n" +
      "· 예의상 자식은 부모와 똑같은 자리에 나란히 서면 안 돼요 — 한 칸 '들여써서(안으로 들어가)' 서요.\n" +
      "  그 들여쓰기가 '나는 이 if(부모)의 자식이에요' 하는 표시예요(오른쪽 그림).\n" +
      "· 자식이 들여쓰기를 안 하고 부모와 같은 자리에 서 버리면, 더 이상 그 if 의 자식이 아니게 돼서\n" +
      "  '언제 실행되는지' 가 달라져요 — 에러가 없어도 동작이 이상해져요.\n\n" +
      "파이썬은 이렇게 들여쓰기(보통 공백 4칸)로 '어느 줄이 어느 블록에 속하는지' 를 정해요. 다른 언어가\n" +
      "{ } 괄호로 묶는 걸, 파이썬은 들여쓰기로 묶어요. 줄 끝의 : 이 '여기부터 내 자식' 이라는 신호예요.\n\n" +
      "곧 할 '버그 고치기 ③(똥이 너무 빨라요)' 이 바로 이 문제예요 — speed 올리는 줄이 if(부모)의\n" +
      "자식이어야 하는데 밖에 나와 서 있어서 생긴 버그거든요. 먼저 개념을 익혀 둬요.",
    kind: "note",
    imageUrl: "/dg22-indent.svg",
    imageAlt:
      "부모 블록(if/for)이 맨 왼쪽에 서 있고, 자식이 한 칸 들여써서 공손히 고개를 숙인 모습. 아래에 if ...: (부모)와 들여쓴 speed 줄(자식) 코드.",
    imageSide: "right",
    imageSideWidth: "third",
    maxLength: 0,
  },
  {
    key: "_dg22_indent_example",
    phase: "wrapmap",
    label: "예제 — 같은 줄, 다른 들여쓰기",
    hint:
      "아래 두 코드는 'speed = speed + 1'(속도 올리기) 한 줄의 들여쓰기만 달라요. 그런데 동작이 전혀 달라져요.\n\n" +
      "· A) 'if 안'(12칸, 점수 올리는 줄과 같은 칸) — 똥을 하나 피했을 때만 speed 가 1 올라가요(정상).\n" +
      "· B) 'if 밖'(8칸, for 바로 밑) — 똥을 피하든 말든 for 가 돌 때마다 speed 가 올라가 순식간에 너무\n" +
      "  빨라져요(버그). 같은 줄인데 들여쓰기 칸수만 다를 뿐이에요.\n\n" +
      "어느 블록 안에 있느냐가 '언제 실행되는지' 를 정한다는 걸 눈으로 확인해요.",
    kind: "note",
    code: CODE_INDENT_EXAMPLE,
    maxLength: 0,
  },
  {
    key: "dg22_indent_cloze",
    phase: "wrapmap",
    label: "형성평가 — 들여쓰기",
    hint: "보기에서 골라 'AI 채점 받기' 를 눌러 봐요. 위 개념·예제를 떠올리면 돼요.",
    kind: "cloze",
    clozeGrade: true,
    clozeLines: [
      {
        key: "q1",
        text: "if 나 for 처럼, 줄 끝에 써서 '여기부터 안쪽이 이 블록(내 자식)' 임을 알리는 기호는 → □",
        blanks: [
          {
            options: [":", ";", "{"],
            answer: ":",
          },
        ],
      },
    ],
    maxLength: 0,
  },

  /* ═══════════════════════════════════════════════════════════════
   * 버그 고치기 — 바이브 코딩(build) 앞에 둬서 '코드를 읽고 고치는 고민' 을 먼저 한다.
   * 교사 요청으로 버그 1개씩 세 단계로 분리: 버그①=mvp, 버그②=problem, 버그③=grill
   * (셋 다 STEP_PHASES 에 있어 활동지 문항을 렌더한다 — lesson/page.tsx 참조. grill 은 이 차시가
   * presentationPhase 를 안 쓰므로 일반 활동지 단계로 뜬다). 단계 순서/라벨은 phaseOrder·phaseLabels.
   * 버그마다: 증상 note(설명 왼쪽 + 버그 코드 + 증상 SVG 오른쪽 1/3 + OneCompiler) → 제출칸 → AI 채점.
   * checkGoal 은 서버 전용(lesson route 가 학생 화면으로 보내기 전에 떼어 냄).
   * ═══════════════════════════════════════════════════════════════ */

  /* ── 버그 ① 쉬움 — 문법(= vs ==) · 단계 mvp("버그 고치기 ①") ── */
  {
    key: "_dg22_debug_intro",
    phase: "mvp",
    label: "버그 고치기 — 코드를 읽고 고쳐 봐요",
    hint:
      "바이브 코딩에 들어가기 전에, 완성한 똥피하기 게임에 '일부러 심어 둔 버그(실수)' 를 고쳐 봐요.\n" +
      "버그는 세 단계(① 쉬움 → ② 중간 → ③ 어려움)로 하나씩 나와요. 각 단계마다 '완성 코드' 에\n" +
      "딱 한 군데가 잘못돼 있어요. 아래 순서로 해요.\n\n" +
      "· 코드를 복사해 OneCompiler 터틀에서 실행해 봐요 — 오른쪽 그림처럼 '증상' 이 나타나요.\n" +
      "· 코드를 한 줄씩 읽으며 어디가 이상한지 찾아요(한 군데예요).\n" +
      "· 고친 뒤 다시 실행해 제대로 되면, 고친 코드 전체를 붙여넣고 'AI 채점' 을 눌러 확인해요.\n\n" +
      "한 번에 안 돼도 괜찮아요 — 고치는 게 공부예요. 다 하면 선생님이 다음 단계로 넘겨 줘요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_dg22_bug1_note",
    phase: "mvp",
    label: "버그 ① — 게임이 아예 안 켜져요 (쉬움)",
    hint:
      "이 코드를 실행하면 게임 창이 안 뜨고 빨간 에러 글씨(SyntaxError)가 나요(오른쪽 그림).\n" +
      "빨간 에러에는 보통 '몇 번째 줄' 이 적혀 있어요 — 그 줄부터 읽어 봐요.\n\n" +
      "힌트: 게임이 끝났는지 '물어보는' 곳이에요. 값을 담을 때 쓰는 기호와, 두 값이 같은지\n" +
      "물어볼 때 쓰는 기호는 서로 달라요. 어느 쪽이 들어가야 '물어보기' 가 될까요?",
    kind: "note",
    code: BUG1_CODE,
    imageUrl: "/dg22-bug1.svg",
    imageAlt: "OneCompiler 실행 화면에 빨간 글씨로 SyntaxError 가 뜨고 게임 창이 열리지 않은 모습.",
    imageSide: "right",
    imageSideWidth: "third",
    linkUrl: ONECOMPILER_TURTLE_URL,
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "dg22_bug1_submit",
    phase: "mvp",
    label: "✍ 고친 코드 제출 (버그 ①)",
    hint: "OneCompiler 에서 고쳐 제대로 실행된 코드를 복사해 붙여넣어 주세요.",
    kind: "long",
    maxLength: 6000,
  },
  {
    key: "dg22_bug1_check",
    phase: "mvp",
    label: "AI 채점 — 버그 ① 고쳐졌는지 확인",
    hint: "위에 붙여넣은 코드를 AI가 봐줘요. 게임이 끝났는지 '물어보는' 조건이 바르게 고쳐졌으면 통과!",
    kind: "ai_feedback",
    feedbackVariant: "code",
    feedbackFields: [{ key: "dg22_bug1_submit", label: "고친 코드" }],
    checkGoal:
      "go_right() 의 게임오버 확인이 `if over = True:` 로 되어 있어 SyntaxError(문법 오류)가 난다. " +
      "= 는 값을 넣는(대입) 기호라 조건(if)에는 쓸 수 없다. 두 값이 같은지 물어보는 `if over == True:` " +
      "(또는 그냥 `if over:`) 로 고쳐야 맞다. 제출한 코드에 `if over = True:` 가 남아 있으면 틀림. " +
      "해당 조건이 `== True` 또는 `if over:` 로 바뀌었으면 통과.",
    maxLength: 2000,
  },

  /* ── 버그 ② 중간 — 논리(충돌 판정 부등호 방향) ── */
  {
    key: "_dg22_bug2_note",
    phase: "problem",
    label: "버그 ② — 시작하자마자 GAME OVER (중간)",
    hint:
      "이 코드는 에러 없이 실행돼요. 그런데 게임을 시작하자마자 바로 'GAME OVER!' 가 떠요(오른쪽 그림).\n" +
      "똥은 저 위에 멀리 있는데 왜 벌써 닿았다고 할까요?\n\n" +
      "힌트: 충돌(닿음)을 판정하는 줄을 찾아보세요. 두 거북이 '사이 거리' 를 재고 있어요.\n" +
      "똥이 주인공에 '가까울 때' 닿은 거예요. 지금 부등호 방향은 '멀 때' 를 가리키고 있지 않나요?",
    kind: "note",
    code: BUG2_CODE,
    imageUrl: "/dg22-bug2.svg",
    imageAlt: "게임이 시작되자마자 화면 가운데에 GAME OVER! 가 크게 뜨고 점수는 0 인 모습.",
    imageSide: "right",
    imageSideWidth: "third",
    linkUrl: ONECOMPILER_TURTLE_URL,
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "dg22_bug2_submit",
    phase: "problem",
    label: "✍ 고친 코드 제출 (버그 ②)",
    hint: "OneCompiler 에서 고쳐 제대로 실행된 코드를 복사해 붙여넣어 주세요.",
    kind: "long",
    maxLength: 6000,
  },
  {
    key: "dg22_bug2_check",
    phase: "problem",
    label: "AI 채점 — 버그 ② 고쳐졌는지 확인",
    hint: "위에 붙여넣은 코드를 AI가 봐줘요. 똥이 '가까울 때' 만 게임 오버가 되게 고쳐졌으면 통과!",
    kind: "ai_feedback",
    feedbackVariant: "code",
    feedbackFields: [{ key: "dg22_bug2_submit", label: "고친 코드" }],
    checkGoal:
      "충돌 판정이 `if poop.distance(player) > 20:` 로 되어 있어, 똥이 멀리 있어도(거리가 20보다 큼) " +
      "시작하자마자 게임 오버가 된다. 거리가 20보다 '작을 때'(가까울 때 = 닿았을 때) 게임 오버가 돼야 " +
      "하므로 `< 20` 이 맞다. 제출 코드의 충돌 조건이 `poop.distance(player) < 20` 이면 통과, " +
      "`> 20` 또는 `>= 20` 이면 틀림.",
    maxLength: 2000,
  },

  /* ── 버그 ③ 어려움 — 흐름/들여쓰기(speed 증가가 if 블록 밖) ── */
  {
    key: "_dg22_bug3_note",
    phase: "grill",
    label: "버그 ③ — 똥이 너무 빨라요 (어려움)",
    hint:
      "이 코드도 에러 없이 실행돼요. 그런데 시작하자마자 똥이 무섭게 빨라져서 도저히 못 피해요\n" +
      "(오른쪽 그림). 점수는 거의 안 오르는데 속도만 폭발하듯 올라가요.\n\n" +
      "힌트: 속도(speed) 를 1 올리는 줄을 찾아보세요. 원래는 '똥을 하나 피했을 때만' 빨라져야 해요.\n" +
      "지금 그 줄의 들여쓰기(안쪽 띄우기)를 보세요 — 어느 블록 안에 들어가 있어야 '피했을 때만'\n" +
      "실행될까요? 점수를 1 올리는 줄과 비교해 봐요.",
    kind: "note",
    code: BUG3_CODE,
    imageUrl: "/dg22-bug3.svg",
    imageAlt: "화면 가득 갈색 똥이 빽빽하게 내려와 주인공이 피할 틈이 없고 점수는 낮은 모습.",
    imageSide: "right",
    imageSideWidth: "third",
    linkUrl: ONECOMPILER_TURTLE_URL,
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "dg22_bug3_submit",
    phase: "grill",
    label: "✍ 고친 코드 제출 (버그 ③)",
    hint: "OneCompiler 에서 고쳐 제대로 실행된 코드를 복사해 붙여넣어 주세요.",
    kind: "long",
    maxLength: 6000,
  },
  {
    key: "dg22_bug3_check",
    phase: "grill",
    label: "AI 채점 — 버그 ③ 고쳐졌는지 확인",
    hint: "위에 붙여넣은 코드를 AI가 봐줘요. 속도 올리는 줄이 '똥을 하나 피했을 때' 안으로 들어갔으면 통과!",
    kind: "ai_feedback",
    feedbackVariant: "code",
    feedbackFields: [{ key: "dg22_bug3_submit", label: "고친 코드" }],
    checkGoal:
      "난이도 증가 `speed = speed + 1` 이 들여쓰기 때문에 `if poop.ycor() < -250:` 블록 밖(for 반복 " +
      "바로 밑)에 있어, 똥을 피하지 않아도 매 프레임마다 speed 가 올라가 게임이 순식간에 너무 빨라진다. " +
      "`speed = speed + 1` 이 `if poop.ycor() < -250:` 블록 '안'(score = score + 1 과 같은 들여쓰기, " +
      "12칸)에 있어야, 똥을 하나 피했을 때만 빨라진다. 제출 코드에서 speed 를 올리는 줄이 " +
      "`if poop.ycor() < -250:` 안쪽(점수 올리는 줄과 같은 들여쓰기)에 있으면 통과, for 루프 바로 밑" +
      "(if 밖, score = score + 1 보다 바깥 들여쓰기)에 있으면 틀림.",
    maxLength: 2000,
  },

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

  /* ── AI 코드 한 줄 이해하기 ('딸깍' 줄이기 — 받기만 말고 읽어 보게) ── */
  {
    key: "dg22_vibe_explain",
    phase: "build",
    label: "AI가 준 코드는 무엇을 하나요? — 한 줄로",
    hint:
      "AI가 준 코드가 '무엇을' 하는지 한 줄로 적어 봐요(예: '똥에 닿으면 목숨이 1 줄어든다').\n" +
      "코드를 그냥 받기만 하지 말고, 어떤 동작을 하는지 읽고 내 말로 설명해 보는 거예요.",
    kind: "long",
    maxLength: 200,
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
   * 보상 — 마지막 선물. 성찰에서 '제출하고 게임하기' 를 누르면 '오늘은 검사하지 않습니다' —
   * requireReflection:false 라 성찰을 비워도 바로 열리고(requires 게이트도 없음), 그동안 정보
   * 시간에 한 게임 8개를 '고르기 카드'(새 탭)로 띄운다. games 가 있으면 iframe 하나 대신 카드 그리드.
   */
  rewardGame: {
    heading: "수고했어요! 🎮",
    body: "그동안 정보 시간에 한 게임들이에요. 하나 골라서 놀아요. 선생님이 부르면 돌아오세요.",
    requireReflection: false,
    // games 지원 코드(RewardGame.games)가 배포되기 전까지의 폴백 — 옛 코드는 url 하나만 읽어
    // 테트리스 iframe 을 띄운다(깨진 화면 방지). 새 코드는 games 가 있으면 url 을 무시하고 카드 창을 연다.
    url: "https://tetris-game-seven-nu.vercel.app/",
    games: [
      { label: "하노이탑", url: "https://hanoi-tower-game-rosy.vercel.app/" },
      { label: "2048", url: "https://2048-game-gilt-kappa.vercel.app/" },
      { label: "똥피하기", url: "https://dodge-poop-game.vercel.app/" },
      { label: "한붓그리기", url: "https://euler-path-game.vercel.app/" },
      { label: "지뢰찾기", url: "https://mine-sweeper-game-seven.vercel.app/home" },
      { label: "4색 지도 칠하기", url: "https://four-color-map-game-two.vercel.app/" },
      { label: "테트리스", url: "https://tetris-game-seven-nu.vercel.app/" },
      { label: "끝없는 계단", url: "https://endless-stairs-game.vercel.app/" },
    ],
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
          "코드에 심어 둔 버그를 고친 뒤, 완성 게임에 '내가 원하는 기능 하나' 를 말로 설명해 AI에게\n" +
          "코드를 받아 붙여 봐요(바이브 코딩).",
        rows: [
          { label: "복습", value: "변수·if·함수·리스트·for·점수·속도 등 가볍게 퀴즈로" },
          { label: "버그 고치기 ①②③", value: "버그를 한 단계에 하나씩, 세 번에 걸쳐 읽고 고치기(쉬움→어려움)" },
          { label: "바이브 코딩", value: "원하는 기능을 프롬프트로 요청 → AI 코드 받기 → 실행·고치기" },
          { label: "기록", value: "내가 AI에게 보낸 말과 받은 코드는 선생님이 볼 수 있어요" },
        ],
        highlights: [
          "AI가 준 코드가 한 번에 안 되는 건 정상이에요 — 설명을 보고 조금씩 고치는 것도 코딩이에요.",
        ],
      },
      {
        label: "오늘 순서",
        subtitle: "복습 퀴즈 → 들여쓰기 배우기 → 버그 고치기 ①②③ → 바이브 코딩 → 서로 보기 → 성찰",
        note: "선생님이 한 단계씩 넘겨 줘요.",
        rows: [
          { label: "1", value: "복습 퀴즈 — 지금까지 배운 개념 가볍게" },
          { label: "2", value: "들여쓰기 배우기 — 어느 줄이 어느 블록인지(버그 고치기 전에 개념 먼저)" },
          { label: "3", value: "버그 고치기 ① — 쉬움(문법): 게임이 아예 안 켜져요" },
          { label: "4", value: "버그 고치기 ② — 중간(논리): 시작하자마자 GAME OVER" },
          { label: "5", value: "버그 고치기 ③ — 어려움(흐름/들여쓰기): 똥이 너무 빨라요" },
          { label: "6", value: "바이브 코딩 — 완성 코드에 내 기능 하나 AI에게 부탁해 붙이기" },
          { label: "7", value: "서로 보기 — 내가 더한 기능 한 줄을 친구들과 나누기" },
          { label: "마지막", value: "성찰 한 줄 → 제출하면 테트리스!" },
        ],
        highlights: [
          "버그는 한 군데씩이에요 — 코드를 한 줄씩 읽으며 찾아요.",
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
   * 외부 새 탭 링크가 붙은 단계는 창을 옮겨도 이탈로 세지 않는다. 대기(타자)·버그 고치기 세 단계
   * (mvp·problem·grill, OneCompiler)·build(바이브·OneCompiler)·성찰(reflection — 보상 게임을 새 탭으로 엶).
   */
  focusExempt: ["waiting", "mvp", "problem", "grill", "build", "reflection"],
  /*
   * 기분(mood)은 대기 화면에서 먼저 받으므로 단계에서 뺀다. 들여쓰기 배우기(wrapmap)를 복습 퀴즈
   * 뒤·버그 고치기 ① 앞에 둬서 개념을 먼저 익힌다(버그③이 들여쓰기 문제라). 그 뒤 버그 고치기를
   * 1개씩 세 단계(mvp·problem·grill, 모두 STEP_PHASES 라 활동지 렌더)로, 끝에 바이브 코딩(build)을
   * '다 고친 뒤의 창작' 으로 둔다. 순서는 여기서 정하므로 LESSON_PHASES 기본 순서와 무관하다.
   * 단계: 안내 → 복습 퀴즈 → 들여쓰기 배우기(wrapmap) → 버그 고치기 ①(mvp) → ②(problem) →
   *       ③(grill) → 나만의 기능 추가하기(build) → 서로 보기(gallery) → 성찰.
   */
  phaseOrder: ["waiting", "assessment", "quiz", "wrapmap", "mvp", "problem", "grill", "build", "gallery", "reflection"],
  phaseLabels: {
    assessment: "안내",
    quiz: "복습 퀴즈",
    wrapmap: "들여쓰기 배우기",
    mvp: "버그 고치기 ①",
    problem: "버그 고치기 ②",
    grill: "버그 고치기 ③",
    build: "나만의 기능 추가하기",
    gallery: "서로 보기",
  },
  /*
   * 되돌아가기 끔 — 버그 고치기를 3단계(mvp·problem·grill)로 쪼개면서, 되돌아가기 pill 이
   * LESSON_PHASES 순서를 따라 ①②③이 뒤섞이고 미리 건너뛸 수 있었다. 끄면 학생은 교사가 여는
   * 현재 단계만 본다(교사 주도). 보상 게임은 requires 없이 성찰 제출로 열리므로 freeNavigation 과 무관.
   */
  freeNavigation: false,

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
  console.log("단계: 대기(파이썬 타자 링크) → 안내 → 복습 퀴즈 → 들여쓰기 배우기(wrapmap) → 버그 고치기 ①(mvp)·②(problem)·③(grill) → 나만의 기능 추가하기(build) → 서로 보기(gallery) → 성찰. 기분은 대기 화면에서만.");
  console.log("들여쓰기 배우기(wrapmap): 개념 note('부모·자식 예의' 비유 + /dg22-indent.svg 오른쪽 1/3) + 예제 note(코드) + 형성평가 cloze 1문항(: 기호) — clozeGrade 즉석 채점. 복습 퀴즈 뒤·버그① 앞. 새 kind 없음(SVG는 새 파일 — 배포 필요).");
  console.log("버그 고치기: 교사 요청으로 버그 1개씩 세 단계 분리(mvp·problem·grill, 모두 STEP_PHASES). 완성 코드에 한 줄 결함만 심은 분리본 — ①쉬움 if over = True(문법/SyntaxError) ②중간 distance > 20(충돌 논리) ③어려움 speed = speed + 1 들여쓰기(흐름). 버그마다 note(증상+버그코드+증상SVG 오른쪽1/3+OneCompiler) → long 제출 → ai_feedback(code, checkGoal 서버전용) 채점.");
  console.log("증상 SVG: /dg22-bug1.svg(SyntaxError) /dg22-bug2.svg(즉시 GAME OVER) /dg22-bug3.svg(똥 폭주) — public/, note imageSide right third.");
  console.log("바이브 코딩(vibe_code): 학생 프롬프트 → 서버 Gemini(vibe-code.ts) → 전체 파이썬 turtle 코드 + 설명. 프롬프트·답은 answers[dg22_vibe] 에 JSON 저장, 교사만 열람. GEMINI_API_KEY 서버 전용. + dg22_vibe_explain(한 줄 설명) long 칸으로 '딸깍' 줄임.");
  console.log(`완성 코드(바탕): 21차 최종(점수·난이도). _dg22_base_code 의 code + vibe_code 의 vibeBaseCode 로 제공. OneCompiler 터틀(${ONECOMPILER_TURTLE_URL})에서 실행.`);
  console.log(`복습 퀴즈: ${QUIZ.questions.length}문항(변수·누적·리스트+for·distance).`);
  console.log(`공유: galleryEnabled + galleryAnswerKeys=[${SHARE_KEY}] 로 '더한 기능 한 줄' 만 공개 — 바이브 프롬프트·성찰은 비공개(프라이버시).`);
  console.log("보상: 게임 고르기 창 — 그동안 한 게임 8개(하노이탑·2048·똥피하기·한붓그리기·지뢰찾기·4색지도·테트리스·끝없는계단) 카드(새 탭). requireReflection:false 라 '검사 없이' 성찰 비워도 버튼 눌러 바로 열림. requires 없음. focusExempt 에 reflection 추가. ※ 코드(RewardGame.games/requireReflection + lesson/page.tsx 렌더·버튼) 배포돼야 화면에 뜸.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
