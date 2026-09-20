/**
 * 15차시 차시 계획 등록 — 「터틀 함수 찍어보기 — 똥피하기 게임 준비」.
 *
 *   node --env-file=.env.local scripts/seed-lesson15.ts
 *   node --env-file=.env.local scripts/seed-lesson15.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 이 자리(LESSON_NO 15)는 아크에 새로 끼워 넣은 「함수 찍어보기」 수업이다
 *
 * 14차(프로그래밍 언어 개론 + 파이썬 맛보기)와, 똥피하기를 뜯어보며 만들기 시작하는 분석·설계
 * 수업 사이에 **게임 코딩 아크의 첫 실습**을 하나 둔다. 완성된 똥피하기 게임(교사 확정본)에
 * 실제로 쓰인 **터틀 라이브러리 함수들을 직접 한 줄씩 쳐 보고(찍어보기), 매개변수를 여러 가지로
 * 바꿔 실행**하며 파이썬과 친해지는 시간이다. 주인공 이동·게임 구현은 다음 차시(16)로 미룬다 —
 * 오늘은 변수·함수정의(def)·조건문·키보드를 깊이 안 들어가고, 순수 **라이브러리 함수 호출** 감각과
 * **좌표(goto·setx)** 위주로만 간다.
 *
 * 아크: **개론+맛보기(14) → 터틀 함수 찍어보기(15, 이 파일) → 똥피하기 분석·설계+첫 기능
 *   (16, seed-lesson16.ts) → 기능을 하나씩 붙이는 구현 차시들(같은 python-dodge-game 통) →
 *   피지컬 컴퓨팅 개념(122) → 마이크로비트(123) → 바이브 코딩 → 햄스터**.
 *
 * 이 수업이 끼면서, 원래 15차였던 분석·설계+구현은 한 칸 밀려 16차가 됐다(seed-lesson16.ts).
 *
 * ## 활동 통(activityId) — 입문/맛보기 통(python-intro)을 이어 쓴다
 *
 * 14차와 같은 `python-intro` 를 쓴다. 오늘은 OneCompiler 에서 직접 쳐 보고 값을 바꾸는 **맛보기**
 * 라 입력칸이 없다 — 모두 note/code 이고, 저장되는 것은 성찰 글뿐이다(14차 "글만 남기는 맛보기"
 * 와 같은 성격). 게임을 실제로 만들기 시작하는 통(python-dodge-game)은 16차에서 새로 열어 깨끗이
 * 쓴다. 마이크로비트~햄스터 실습 통(physical-computing)·디지털 윤리 통(digital-ethics)과도 분리.
 *
 * ## 단계 배치와 실제 진행 순서
 *
 * 포털 단계 순서(LESSON_PHASES)는 assessment(안내) → worksheet(활동지)로 흐르고, 실제
 * 진행은 교사가 단추로 몬다(freeNavigation). 교사 뼈대 순서:
 *
 *   0–3   대기(똥피하기) · 기분 체크 · 출석
 *   3–7   안내 보드(assessment) — 오늘: 타자 연습 → 함수 찍어보기 → 게임과 연결
 *   7–12  파이썬 타자 연습(외부 앱, 새 탭 링크)
 *   12–35 함수 찍어보기 — 무대/거북이/펜/좌표/이동 함수를 한 줄씩 쳐 보고 값을 바꿔 실험
 *   35–38 오늘 함수가 완성 게임 어디에 쓰이는지 짚기(게임과 연결 note)
 *   38–40 성찰 → 정리
 *
 * 점수·자동채점은 없다. 진도 팝업(progressChecks)은 없다. 개념 퀴즈도 없다(오늘은 손으로 익힘).
 *
 * 대상 1~4반 중1. 각 반 30번은 테스트 학생(리허설). 숙제/집에 내주는 것 없음. seed 멱등(--force).
 */

import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

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
    privateKey: requiredEnv("FIREBASE_PRIVATE_KEY")
      .replace(/^["']|["']$/g, "")
      .replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const LESSON_PLANS = "lessonPlans";
const LESSON_NO = 15;

/** 9~11차시와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/**
 * **입문/맛보기 통.** 14차와 같은 통을 이어 쓴다 — 오늘은 OneCompiler 에서 직접 쳐 보는 맛보기라
 * 저장되는 입력이 없고(성찰 글만), 게임 제작 통(python-dodge-game, 16차부터)·실습 통
 * (physical-computing)·디지털 윤리 통(digital-ethics)과 물리적으로 다른 문서라 안 섞인다.
 */
const ACTIVITY_ID = "python-intro";

/** 파이썬 타자/낱말 연습 — 교사가 만든 외부 앱. 시드 안에 만들지 않고 새 탭 링크만 건다. */
const TYPING_APP_URL = "https://python-typing-helper.vercel.app";

/** 파이썬 터틀 실행 편집기 — OneCompiler 터틀 모드(설치 불필요, 14·16차와 동일). */
const ONECOMPILER_TURTLE_URL = "https://onecompiler.com/turtle";

/* ──────────────────────────────────────────────────────────────
 * 찍어보기용 예제 코드 — 함수 하나(무리)를 담은 짧고 완결된 터틀 프로그램. code 필드로 준다
 * (등폭 readonly, 들여쓰기 보존 + 복사 단추). 학생은 이걸 **직접 한 줄씩 따라 치고**, hint 에
 * 적힌 여러 값을 **차례로 바꿔 넣어** 실행하며 관찰한다. 화면에 적는 글자는 영어(온라인 터틀
 * 서버에서 한글 write 가 깨진다 — 교사 확정). 14·16차와 같은 터틀로 일관한다.
 * ────────────────────────────────────────────────────────────── */

/** 무대 만들기 — screen 을 만들고 제목·배경색·크기를 정한다 */
const CODE_STAGE = `import turtle

screen = turtle.Screen()
screen.title("My Game")
screen.bgcolor("lightyellow")
screen.setup(600, 600)

screen.mainloop()`;

/** 거북이 만들기·꾸미기 — Turtle 을 하나 만들고 모양·색을 정한다 */
const CODE_TURTLE = `import turtle

screen = turtle.Screen()
screen.setup(600, 600)

player = turtle.Turtle()
player.shape("square")
player.color("green")

screen.mainloop()`;

/** 펜 상태 — 펜을 내리면 선이 그려지고, 올리면(penup) 선 없이 이동만 한다 */
const CODE_PEN = `import turtle

screen = turtle.Screen()
screen.setup(600, 600)

player = turtle.Turtle()
player.forward(100)     # pen is down -> it draws a line
player.penup()          # lift the pen up
player.forward(100)     # now it moves with NO line
player.pendown()        # put the pen back down
player.forward(100)     # it draws again

screen.mainloop()`;

/** 좌표 이동 — goto 는 (x, y) 자리로, setx 는 x(좌우)만 바꿔 옮긴다 */
const CODE_GOTO = `import turtle

screen = turtle.Screen()
screen.setup(600, 600)

player = turtle.Turtle()
player.penup()
player.goto(0, -250)    # x=0 (center), y=-250 (bottom)

screen.mainloop()`;

/** 상대 이동·회전 — forward 는 보는 방향으로, left/right 는 방향을 튼다 */
const CODE_MOVE = `import turtle

screen = turtle.Screen()
screen.setup(600, 600)

player = turtle.Turtle()
player.forward(100)     # go forward 100
player.left(90)         # turn left 90 degrees
player.forward(100)

screen.mainloop()`;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 활동지 — 타자 연습 링크 → 찍어보기 안내(OneCompiler 링크) → 함수별 실험 카드 5개
//          (무대·거북이·펜·좌표·이동) → 게임과 연결 note.
// 한 worksheet 단계에 위→아래로 흐른다. 입력칸은 없다(모두 note/code) — 손으로 익히는 시간.
// 함수마다 hint 에 "이렇게도 넣어 봐요" 로 여러 매개변수를 제시해 차례로 실험하게 한다.
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── ⓪ 파이썬 타자 연습 (외부 앱, 새 탭 링크만) ── */
  {
    key: "_poke_typing",
    phase: "worksheet",
    label: "손 풀기 — 파이썬 타자 연습",
    hint:
      "본격적으로 시작하기 전에, 파이썬에서 자주 쓰는 낱말을 손에 익혀요.\n" +
      "아래 [파이썬 타자 연습 열기] 로 새 탭에서 열어 몇 분 동안 가볍게 쳐 봐요.\n" +
      "끝나면 이 탭으로 돌아와 아래 '찍어보기' 를 이어서 합니다.",
    kind: "note",
    linkUrl: TYPING_APP_URL,
    linkLabel: "파이썬 타자 연습 열기 (새 탭)",
    maxLength: 0,
  },

  /* ── ① 찍어보기 안내 + OneCompiler 링크 ── */
  /*
   * 실행 편집기 = **OneCompiler 터틀** — 교사 확정, 14·16차와 동일. 브라우저에서 파이썬 터틀
   * 그래픽이 바로 뜬다(설치 불필요). 아래 함수 카드들을 여기서 직접 쳐서 실행한다. 링크가 붙어도
   * 이 단계는 focusExempt(worksheet)라 새 탭 이탈 오탐이 안 난다.
   */
  {
    key: "_poke_intro",
    phase: "worksheet",
    label: "① 찍어보기 — 직접 쳐 보고, 값을 바꿔 실험해요",
    hint:
      "이제 파이썬 '터틀' 함수를 직접 쳐 보며 익혀요(찍어보기). 아래 [OneCompiler 터틀 열기] 로\n" +
      "편집기를 새 탭에서 열고(그대로 두면 계속 거기서 해요), 아래 칸들의 코드를 **직접 한 줄씩\n" +
      "따라 쳐서** 실행해 봐요.\n\n" +
      "그리고 색·좌표·거리·각도 같은 값을 **여러 가지로 바꿔** 다시 실행해서, 무엇이 달라지는지\n" +
      "눈으로 확인하는 게 오늘의 핵심이에요. 같은 함수라도 넣는 값에 따라 결과가 달라져요.\n\n" +
      "화면에 적는 글자(제목 등)는 **영어**로 써요 — 온라인 편집기에서 한글은 깨져 보여요.",
    kind: "note",
    linkUrl: ONECOMPILER_TURTLE_URL,
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },

  /* ── ② 무대 만들기 — screen (bgcolor·setup·title) ── */
  {
    key: "_poke_stage",
    phase: "worksheet",
    label: "② 무대 만들기 — screen",
    hint:
      "'무대' 는 게임이 펼쳐지는 화면이에요. 아래 코드를 직접 쳐서 실행해 보고, 값을 하나씩 바꿔\n" +
      "다시 실행해 봐요.\n\n" +
      "· screen.bgcolor(\"lightyellow\") — 배경색. 이렇게도 넣어 봐요:\n" +
      "    \"lightblue\"  →  \"pink\"  →  \"black\"  →  \"white\"\n" +
      "· screen.setup(600, 600) — 창 크기(가로, 세로). 이렇게도:\n" +
      "    (400, 400)  →  (800, 300)  →  (300, 700)\n" +
      "· screen.title(\"My Game\") — 창 제목(영어로). 이렇게도:\n" +
      "    \"Turtle\"  →  \"Dodge\"  →  \"Hello\"\n\n" +
      "바꿀 때마다 실행해서 화면이 어떻게 달라지는지 눈으로 확인해요.",
    kind: "note",
    code: CODE_STAGE,
    maxLength: 0,
  },

  /* ── ③ 거북이 만들기·꾸미기 — Turtle·shape·color (색을 여러 형태로) ── */
  {
    key: "_poke_turtle",
    phase: "worksheet",
    label: "③ 거북이 만들기·꾸미기 — shape · color",
    hint:
      "거북이(주인공)를 하나 만들고 꾸며 봐요. 값을 바꿔 가며 실행해 보세요.\n\n" +
      "· player.shape(\"square\") — 모양. 이렇게도:\n" +
      "    \"circle\"  →  \"turtle\"  →  \"arrow\"  →  \"triangle\"  →  \"classic\"\n" +
      "· player.color(\"green\") — 색. 이렇게도(색 이름):\n" +
      "    \"red\"  →  \"blue\"  →  \"orange\"  →  \"purple\"\n" +
      "  색을 코드(#)로도 넣어 봐요:\n" +
      "    \"#FF0000\"(빨강)  →  \"#00AAFF\"(하늘)  →  \"#00CC66\"(초록)\n\n" +
      "숫자(빨강·초록·파랑, 0~255)로도 넣을 수 있어요 — 먼저 이 한 줄을 맨 위에 추가해요:\n" +
      "    screen.colormode(255)\n" +
      "  그러면 이렇게도 돼요:\n" +
      "    player.color((255, 0, 0))  →  (0, 128, 255)  →  (0, 200, 0)\n\n" +
      "완성 게임에서 주인공은 \"square\" + \"green\", 똥은 \"circle\" + \"brown\" 이에요.",
    kind: "note",
    code: CODE_TURTLE,
    maxLength: 0,
  },

  /* ── ④ 펜 상태 — penup · pendown ── */
  {
    key: "_poke_pen",
    phase: "worksheet",
    label: "④ 펜 상태 — penup · pendown",
    hint:
      "'펜' 을 내리면 움직일 때 선이 그려지고, 올리면(penup) 선 없이 이동만 해요. 실행해서 어디에\n" +
      "선이 생기고 안 생기는지 봐요.\n\n" +
      "· player.penup() — 펜 올리기(선 안 그림)\n" +
      "· player.pendown() — 펜 내리기(선 그림)\n\n" +
      "이렇게 바꿔 봐요:\n" +
      "· penup() 줄을 지우면 어떻게 될까요? (계속 선이 그려져요)\n" +
      "· forward(100) 의 100 을 50 · 200 으로 바꿔서 선 길이도 바꿔 봐요.\n\n" +
      "완성 게임은 주인공과 똥에 penup() 을 써서 선을 안 남기고 미끄러지게 해요.",
    kind: "note",
    code: CODE_PEN,
    maxLength: 0,
  },

  /* ── ⑤ 좌표 이동 — goto · setx (좌표를 여러 개) ── */
  {
    key: "_poke_goto",
    phase: "worksheet",
    label: "⑤ 좌표 이동 — goto · setx",
    hint:
      "goto 는 '정해진 자리(x, y)' 로 한 번에 보내요. 화면 한가운데가 (0, 0) 이에요.\n\n" +
      "· player.goto(0, -250) — 이렇게도 넣어 봐요:\n" +
      "    (100, 100)  →  (-200, 0)  →  (0, 0)  →  (250, 250)  →  (-150, -150)\n" +
      "· player.setx(100) — x(좌우)만 바꿔요(위아래 y 는 그대로). 이렇게도:\n" +
      "    setx(-100)  →  setx(0)  →  setx(250)\n\n" +
      "x 는 오른쪽으로 갈수록 커지고, y 는 위로 갈수록 커져요. 넣은 좌표에 거북이가 어디로 가는지\n" +
      "잘 봐요.\n\n" +
      "완성 게임에서 주인공은 goto(0, -250) 로 아래 가운데에서 시작하고, 좌우로 움직일 때 setx 를 써요.",
    kind: "note",
    code: CODE_GOTO,
    maxLength: 0,
  },

  /* ── ⑥ 상대 이동·회전 — forward · left · right (거리·각도를 여러 개) ── */
  {
    key: "_poke_move",
    phase: "worksheet",
    label: "⑥ 상대 이동·회전 — forward · left · right",
    hint:
      "forward 는 '지금 보고 있는 방향으로' 앞으로 가고, left/right 는 방향을 틀어요(도, degree).\n\n" +
      "· player.forward(100) — 거리를 이렇게도:\n" +
      "    50  →  150  →  200  →  30\n" +
      "· player.left(90) — 각도를 이렇게도:\n" +
      "    45  →  120  →  30  →  60\n" +
      "· player.right(90) — 반대로 틀어요. 이렇게도:\n" +
      "    45  →  120  →  30\n\n" +
      "forward 와 right/left 를 번갈아 여러 번 하면 네모·삼각형 같은 그림도 그려져요. 각도를 바꾸면\n" +
      "그림이 완전히 달라져요 — 바꿔 보며 놀아 봐요.",
    kind: "note",
    code: CODE_MOVE,
    maxLength: 0,
  },

  /* ── ⑦ 게임과 연결 — 오늘 함수가 완성 게임 어디에 쓰이나 ── */
  {
    key: "_poke_game_link",
    phase: "worksheet",
    label: "⑦ 오늘 익힌 함수가 게임의 어디에 쓰일까?",
    hint:
      "오늘 쳐 본 함수들이 완성된 똥피하기 게임에서 어디에 쓰이는지 짚어 봐요:\n\n" +
      "· screen.Screen() · setup · bgcolor · title  →  ① 무대(게임 화면) 만들기\n" +
      "· turtle.Turtle() · shape · color  →  ② 주인공(square · green) 과 똥(circle · brown) 만들기\n" +
      "· penup()  →  주인공·똥이 선을 안 남기고 미끄러지게\n" +
      "· goto(0, -250) · setx  →  주인공 시작 위치 + 좌우 이동\n" +
      "· forward · left · right  →  방향을 다루는 명령(그림·연습에 유용)\n\n" +
      "오늘은 함수를 '하나씩 쳐 보고 값을 바꿔 보는' 날이었어요. 다음 시간부터 이 함수들을 합쳐서\n" +
      "주인공 움직이기 → 똥 떨어뜨리기 → 부딪힘 → 점수 순으로 게임을 만들어 갑니다!",
    kind: "note",
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "터틀 함수 찍어보기 — 똥피하기 게임 준비",
  // 수업 시작에 간단한 기분/컨디션 체크인 — 기존 정보 차시(14·16차)와 같은 기분 체크 단계.
  moodCheckEnabled: true,

  game: {
    heading: "기다리는 동안 — 똥피하기",
    body:
      "수업이 시작되길 기다리는 동안 잠깐 쉬어요.\n" +
      "위에서 떨어지는 똥을 좌우로 움직여 피하면 돼요.\n" +
      "오늘은 이 게임에 쓰인 파이썬 터틀 함수들을 직접 쳐 보며 익혀요! 수업이 시작되면 닫습니다.",
    url: "https://dodge-poop-game.vercel.app/",
  },
  gameExplainer: empty(),

  // 다음 시간(progress) 단계는 두지 않는다 — 안내(assessment)가 이미 있어 중복이다.
  progress: empty(),

  /*
   * 안내 보드 — 오늘 순서(타자 연습 → 함수 찍어보기 → 게임과 연결). 활동 중 되돌아와 볼 수 있다.
   */
  assessment: {
    heading: "오늘 할 일 — 게임에 쓸 터틀 함수 찍어보기",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "터틀 함수를 직접 쳐 보고, 값을 바꿔 실험해요",
        note:
          "지난 시간엔 파이썬을 살짝 맛봤죠? 오늘은 완성 게임(똥피하기)에 실제로 쓰인 터틀 함수들을\n" +
          "하나씩 직접 쳐 보고, 값을 여러 가지로 바꿔 실행하며 익혀요. 게임을 만드는 건 다음 시간부터예요.",
        rows: [
          { label: "한 줄로", value: "게임에 쓸 터틀 함수를 직접 쳐 보고 값을 바꿔 실험해요" },
          { label: "먼저", value: "파이썬 타자 연습으로 손 풀기(새 탭)" },
          { label: "오늘 할 일", value: "OneCompiler 에서 함수 찍어보기 → 값 바꿔 관찰 → 게임과 연결" },
          { label: "채점은", value: "점수·자동채점 없어요. 쳐 보고 바꿔 보며 감만 잡으면 됩니다" },
        ],
        highlights: [
          "정답을 외우는 시간이 아니에요. '값을 바꾸면 이렇게 달라지는구나' 를 눈으로 느끼면 돼요.",
        ],
      },
      {
        label: "오늘 순서",
        subtitle: "타자 연습 → 함수 찍어보기(무대·거북이·펜·좌표·이동) → 게임과 연결",
        note: "활동지가 위에서 아래로 이어져요. 순서대로 내려오면 됩니다.",
        rows: [
          { label: "1", value: "파이썬 타자 연습(새 탭)" },
          { label: "2", value: "무대 만들기 — screen(배경색·크기·제목)" },
          { label: "3", value: "거북이 만들기·꾸미기 — Turtle · shape · color" },
          { label: "4", value: "펜 상태 — penup · pendown" },
          { label: "5", value: "좌표 이동 — goto · setx" },
          { label: "6", value: "상대 이동·회전 — forward · left · right" },
          { label: "마지막", value: "게임과 연결 + 성찰" },
        ],
        highlights: [
          "함수 하나마다 값을 여러 개 바꿔 넣어 봐요 — 그게 오늘의 실험이에요.",
        ],
      },
    ],
  },

  video: empty(),

  /*
   * 성찰 — 오늘 바꿔 본 함수 중 신기했던 것 / 게임과 연결. 개인적이라 비공개.
   */
  reflectionQuestions: [
    "오늘 여러 값을 바꿔 넣어 본 함수 중, 가장 신기했던 것 하나와 무엇이 달라졌는지 한 줄로 적어 봅시다.",
    "완성된 똥피하기 게임에서 오늘 배운 함수가 쓰일 곳이 보였나요? 하나만 골라 적어 봐요.",
  ],
  reflectionPublic: false,

  /*
   * 타자 연습(외부 앱)·OneCompiler 터틀 두 링크가 새 탭으로 열려, worksheet 단계에서 창을
   * 옮기는 것을 이탈로 세지 않는다 (14·16차 링크 단계를 focusExempt 로 둔 것과 같은 이유).
   */
  focusExempt: ["worksheet"],
  phaseLabels: {
    assessment: "안내",
    worksheet: "함수 찍어보기",
  },
  /*
   * 되돌아가기 켬 — 학생이 안내·활동지 사이를 스스로 오갈 수 있다. 교사는 타자 연습 → 함수
   * 카드(무대·거북이·펜·좌표·이동) → 게임과 연결 순으로 단추로 몬다.
   */
  freeNavigation: true,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리는 차시가 아니다 — 비우면 글만/기록만 하는 활동으로 잡는다(오늘은 저장 입력이 성찰뿐)
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "터틀 함수 찍어보기 — 똥피하기 게임 준비",
      body:
        "위에서부터 순서대로 해요. 파이썬 타자로 손을 풀고, 터틀 함수를 하나씩 직접 쳐 보며 값을\n" +
        "바꿔 실험한 뒤, 그 함수들이 완성 게임 어디에 쓰이는지 짚어 봅니다.",
    },
    worksheet: WORKSHEET,
    // 서로 구경하기·출처 칸은 이 차시에서 쓰지 않는다
    galleryEnabled: false,
    sourcesEnabled: false,
  },
};

async function main(): Promise<void> {
  const existing = await db.collection(LESSON_PLANS).where("lessonNo", "==", LESSON_NO).get();
  const now = Date.now();

  if (!existing.empty) {
    const doc = existing.docs[0];
    /*
     * lessonNo 15 자리에는 예전에 「똥피하기 분석·설계+구현」 계획이 있었다(seed-lesson16.ts 로
     * 옮김). merge 로는 그때의 필드가 남아 화면에 섞일 수 있어, progress·progressChecks·quiz 를
     * FieldValue.delete() 로 명시 삭제한다. 이 차시엔 셋 다 없다(오늘은 손으로 익히는 맛보기).
     */
    await doc.ref.set(
      {
        ...PLAN,
        updatedAt: now,
        progress: FieldValue.delete(),
        progressChecks: FieldValue.delete(),
        quiz: FieldValue.delete(),
      },
      { merge: true },
    );
    console.log(`↻ 갱신 — ${PLAN.title} (${doc.id})`);

    /* 9~11차시와 같은 규칙 — 아직 아무도 안 들어온 수업에만 반영한다 */
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
          // progress(다음 시간)·진도 팝업·옛 quiz 제거 — merge 로 안 비워지므로 세션에서도 지운다.
          progress: FieldValue.delete(),
          progressChecks: FieldValue.delete(),
          quiz: FieldValue.delete(),
          assessment: PLAN.assessment,
          video: PLAN.video,
          reflectionQuestions: PLAN.reflectionQuestions,
          reflectionPublic: PLAN.reflectionPublic,
          focusExempt: PLAN.focusExempt,
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (입문/맛보기 통 — 14차와 공유. 게임 제작 통 python-dodge-game 은 16차부터)`);
  console.log("단계: 대기(똥피하기) → 기분 → 안내(assessment) → 활동지(worksheet: 타자·찍어보기·게임연결) → 성찰");
  console.log("실제 진행: 안내 → 타자 연습(외부 새 탭) → 함수 찍어보기(무대·거북이·펜·좌표·이동, 값 바꿔 실험) → 게임과 연결 → 성찰 (freeNavigation)");
  console.log(`타자/낱말 연습: 외부 앱 새 탭 링크만 (${TYPING_APP_URL}) — 시드 안에 타자게임을 만들지 않음.`);
  console.log(`파이썬 터틀 실행: OneCompiler 터틀(${ONECOMPILER_TURTLE_URL}) — _poke_intro note 에 새 탭 링크. 함수 카드마다 code 필드로 예제 제시(등폭 readonly, 복사 단추).`);
  console.log("찍어보기 카드 5개: 무대(screen) · 거북이(shape·color, 색을 이름/#/튜플로) · 펜(penup·pendown) · 좌표(goto·setx) · 이동(forward·left·right). 함수마다 여러 값을 차례로 실험.");
  console.log("입력칸 없음(모두 note/code, 저장은 성찰뿐). 진도 팝업 없음. quiz 없음. galleryEnabled: false. 화면 글자 영어.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
