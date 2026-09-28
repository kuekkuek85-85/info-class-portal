/**
 * 16차시 차시 계획 등록 — 「터틀 함수 직접 타이핑 — 한 줄 한 줄 이해하기」.
 *
 *   node --env-file=.env.local scripts/seed-lesson16.ts
 *   node --env-file=.env.local scripts/seed-lesson16.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 이 자리(LESSON_NO 16)는 15차 다지기(consolidation) 수업으로 새로 지었다
 *
 * 15차(터틀 함수 찍어보기)에서 복사·붙여넣기로 값을 바꿔 익힌 다섯 예제를, 이번엔 학생이
 * OneCompiler 에 직접 한 줄 한 줄 타이핑하고 교사가 한 줄씩 설명하며 이해하는 시간이다.
 * 15차에서 '복붙 위주라 한 줄 한 줄 설명을 못다 한' 것을 여기서 채운다.
 *
 * 아크: 개론+맛보기(14) → 터틀 함수 찍어보기(15, seed-lesson15.ts) → 터틀 함수 직접 타이핑
 *   (16, 이 파일) → 똥피하기 분석·설계+첫 기능(17, seed-lesson17.ts) → 구현 차시들
 *   (python-dodge-game 통) → 피지컬 컴퓨팅 개념(122) → 마이크로비트(123) → 바이브 코딩 → 햄스터.
 *
 * 이 수업이 끼면서, 원래 16차였던 분석·설계+첫 기능은 한 칸 밀려 17차가 됐다(seed-lesson17.ts).
 *
 * ## 단계 흐름 — 15차 관례를 그대로(파이썬 타자 wordquiz 단계 + phaseOrder)
 *
 * 기분 체크는 대기 화면 앞에서 한 번만 한다(로그인 → 기분 → 대기 게임). phaseOrder 에 mood 를
 * 넣지 않아 대기·안내 사이 기분 중복을 막는다(moodCheckEnabled 는 켜 둠). 흐름:
 *
 *   대기(지뢰찾기) → 파이썬 타자 연습(wordquiz, 외부 앱 새 탭) → 안내(assessment)
 *     → 직접 타이핑(worksheet: 예제마다 참고 코드 + 직접 타이핑 + 제출) → 성찰(reflection)
 *
 * 타이핑 차시라 워밍업으로 파이썬 타자 연습이 잘 맞는다(15차와 같은 외부 앱). 대기 게임은 정보
 * 수업 관례대로 지뢰찾기.
 *
 * ⚠ phaseOrder 는 세션 문서에 실려야 대시보드가 읽는다. snapshotOf(db.ts)에 phaseOrder 를
 * 추가해 뒀고, 시드도 예약 세션에 직접 써 넣는다. 교사가 open-info-*.ts 로 새 세션을 열 때는
 * 그 스크립트가 phaseOrder 를 복사해야 한다(현 open-info 템플릿엔 없음 — 아래 콘솔·보고 참조).
 *
 * ## 활동 통(activityId) — 15차와 같은 통(python-intro)을 이어 쓴다
 *
 * 16차는 15차(터틀 빈칸 채우기)의 '이어서'라, **같은 통(python-intro)**을 쓴다. 무대·거북이를
 * 15차에 제출한 학생은 그 코드가 16차의 같은 키(poke_submit_stage·poke_submit_turtle) 필드에
 * 학생별로 그대로 뜬다(별도 프리필 없이 같은 아티팩트라 자동). 펜·좌표·이동은 15차에 없어 빈
 * 칸 — 16차에서 새로 채운다. 17차 게임 제작 통(python-dodge-game)·실습 통(physical-computing)·
 * 디지털 윤리 통(digital-ethics)과는 여전히 다른 문서라 안 섞인다. (원래 python-typing 으로
 * 분리했다가 진도 이어보기를 위해 합침 — 교사 확정.)
 *
 * ## 화면 텍스트는 평문이다 (마크다운 안 됨)
 *
 * label·hint·안내문은 whitespace-pre-line 평문으로 그려진다. 굵게·백틱·줄머리 # 같은 마크다운
 * 서식은 리터럴로 보이므로 쓰지 않는다. 강조는 따옴표·[대괄호]·콜론으로. code 필드의 파이썬
 * 코드(#주석 포함)는 그대로 둔다. code 필드는 UI 상 '코드 복사하기' 단추가 늘 함께 뜬다 — 이
 * 차시는 복사를 허용하되, 예제 코드에 ★★★ 빈칸을 넣어 그 부분만 학생이 직접 채워 완성하게 한다.
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
const LESSON_NO = 16;

/** 9~11차시와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

// ★ 15차와 같은 통(python-intro)을 쓴다. 16차는 15차의 '이어서'라, 무대·거북이를 15차에 이미
// 제출한 학생은 그 코드가 16차 같은 키(poke_submit_stage·poke_submit_turtle) 필드에 그대로
// 뜬다(학생별). 펜·좌표·이동은 15차에 없어 빈 칸 — 16차에서 새로 채운다. (원래 python-typing
// 으로 분리했다가, 15차 진도 이어보기를 위해 통을 합침 — 교사 확정.)
const ACTIVITY_ID = "python-intro";

/** 파이썬 타자/낱말 연습 — 교사가 만든 외부 앱(15차와 동일). 새 탭 링크만 건다. */
const TYPING_APP_URL = "https://python-typing-helper.vercel.app";

/** 파이썬 터틀 실행 편집기 — OneCompiler 터틀 모드(설치 불필요, 14·15·17차와 동일). */
const ONECOMPILER_TURTLE_URL = "https://onecompiler.com/turtle";

/** 색상 코드(#RRGGBB) 참고용 변환기 — 색 예제에서 원하는 색 코드를 찾아본다(15차와 동일). */
const COLOR_PICKER_URL = "https://youtil.kr/tools/art/color";

/** 대기 게임 — 정보 수업 관례대로 지뢰찾기. */
// 대기 게임 — 16차부터는 '끝없는 계단'(새 게임). 15차까지는 똥피하기였다.
const STAIRS_URL = "https://endless-stairs-game.vercel.app/";

/* ──────────────────────────────────────────────────────────────
 * 예제 코드(★★★ 빈칸) — 15차와 같은 다섯 예제에 ★★★ 빈칸을 넣었다. 핵심 키워드·time.sleep 과
 * 빈칸 옆 주석(# 값:/# 함수:)을 둔다. 복사를 허용하되(noCopy 없음) ★★★ 부분만 학생이 채운다.
 * 화면에 적는 글자는 영어(온라인 터틀 서버에서 한글 write 가 깨진다 — 한글은 # 주석에만).
 * code 필드라 등폭 readonly·들여쓰기 보존.
 * ────────────────────────────────────────────────────────────── */

/** 무대 만들기 — screen 을 만들고 제목·배경색·크기를 정한다 */
const CODE_STAGE = `import turtle

screen = turtle.Screen()
screen.title("★★★")        # 값: 창 제목(영어)
screen.★★★("lightyellow")  # 함수: 배경색 (bgcolor)
screen.setup(★★★, ★★★)     # 값: 가로, 세로

screen.mainloop()`;

/** 거북이 만들기·꾸미기 — Turtle 을 하나 만들고 모양·색을 정한다 */
const CODE_TURTLE = `import turtle

screen = turtle.Screen()
screen.setup(600, 600)

player = turtle.Turtle()
player.shape("★★★")   # 값: 모양 (square/circle/turtle …)
player.★★★("green")   # 함수: 색 (color)

screen.mainloop()`;

/** 펜 상태 — 펜을 내리면 선이 그려지고, 올리면(penup) 선 없이 이동만 한다 */
const CODE_PEN = `import turtle
import time

screen = turtle.Screen()
screen.setup(600, 600)

player = turtle.Turtle()
player.forward(★★★)   # 값: 거리
time.sleep(1)
player.★★★()          # 함수: 펜 올리기 (penup)
player.forward(★★★)   # 값: 거리
time.sleep(1)
player.pendown()
player.forward(★★★)   # 값: 거리

screen.mainloop()`;

/** 좌표 이동 — goto 는 (x, y) 자리로, setx 는 x(좌우)만 바꿔 옮긴다 */
const CODE_GOTO = `import turtle
import time

screen = turtle.Screen()
screen.setup(600, 600)

player = turtle.Turtle()
player.penup()
player.goto(★★★, ★★★)  # 값: x, y
time.sleep(1)
player.★★★(100)        # 함수: x만 이동 (setx)
time.sleep(1)
player.setx(★★★)       # 값: x

screen.mainloop()`;

/** 상대 이동·회전 — forward 는 보는 방향으로, left/right 는 방향을 튼다 */
const CODE_MOVE = `import turtle
import time

screen = turtle.Screen()
screen.setup(600, 600)

player = turtle.Turtle()
player.forward(★★★)   # 값: 거리
time.sleep(0.5)
player.left(★★★)      # 값: 각도
player.forward(★★★)   # 값: 거리

screen.mainloop()`;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/*
 * 예제별 '완성한 코드' 제출 칸 — 각 예제 카드 바로 뒤에 하나씩 둔다. kind long 이라
 * 여러 줄 입력·자동 저장(1.5초)·붙여넣기 허용. 예제마다 key/label 을 구분해 답이 따로 저장된다.
 * 안내문은 평문. exampleName 은 위 카드 이름([무대] 등)을 가리킨다.
 */
function submitField(
  key: string,
  label: string,
  exampleName: string,
  phase: WorksheetQuestion["phase"] = "worksheet",
): WorksheetQuestion {
  return {
    key,
    phase,
    label,
    hint:
      `위 [${exampleName}] 예제를 복사 버튼으로 가져와 ★★★ 부분만 채워 완성하고 실행해 본 뒤,\n` +
      "그 코드를 여기에 붙여넣어 제출하세요.\n" +
      "붙여넣기(Ctrl+V) 가 되고, 쓰는 동안 자동으로 저장돼요.",
    kind: "long",
    maxLength: 2000,
  };
}

/*
 * 각 주제 단계 맨 앞에 두는 'OneCompiler 터틀 열기' 단추 카드. 주제마다 단계가 나뉘어 있어,
 * 무대(problem)의 안내 카드에만 링크가 있으면 다른 주제 단계(거북이·펜·좌표·이동)에서 편집기를
 * 못 연다(교사 지적). 그래서 주제 단계마다 같은 단추를 하나씩 둔다.
 */
function ocOpen(key: string, phase: WorksheetQuestion["phase"]): WorksheetQuestion {
  return {
    key,
    phase,
    label: "먼저 — OneCompiler 터틀 열기",
    hint:
      "아래 단추로 편집기를 새 탭에서 열어요(이미 열려 있으면 그대로 두고 거기서 해요).\n" +
      "이 주제의 코드를 복사해 ★★★만 채워 완성하고 실행해 봐요.",
    kind: "note",
    linkUrl: ONECOMPILER_TURTLE_URL,
    linkLabel: "OneCompiler 터틀 열기 (새 탭)",
    maxLength: 0,
  };
}

// ─────────────────────────────────────────────────────────────
// 활동지 —
//   · 파이썬 타자 연습(phase: wordquiz, 별도 단계) : 외부 앱 새 탭 링크
//   · 빈칸 채우기 : 주제별 단계로 쪼갬 — 무대(problem)·거북이(mvp)·펜(build)·좌표(grill)·
//       이동(wrapmap). 각 단계 = ★★★ 빈칸 코드(복사 허용) + 완성한 코드 제출(long).
//       STEP_PHASE 슬롯을 써서 phaseLabels "빈칸 채우기 - □" 가 곧 단계 제목이 되게 한다
//       ('worksheet' 단계는 공용 머리말을 제목으로 띄워 안 씀).
// 핵심 키워드·time.sleep 은 15차 것을 그대로 둔다(참고용). 화면 텍스트는 평문.
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── 파이썬 타자 연습 (별도 단계 wordquiz, 안내 앞) — 외부 앱 새 탭 링크만 (15차와 동일) ── */
  {
    key: "_typing_typing",
    phase: "wordquiz",
    label: "파이썬 타자 연습 — 5분 워밍업",
    hint:
      "오늘은 파이썬 코드의 빈칸을 직접 채워 완성하는 날이라, 먼저 파이썬 낱말에 손을 풀어요.\n" +
      "아래 단추로 새 탭에서 열려요. 딱 5분만, 점수는 없으니 편하게 쳐 봐요.\n" +
      "다 하고 이 화면으로 돌아오세요.",
    kind: "note",
    linkUrl: TYPING_APP_URL,
    linkLabel: "파이썬 타자 연습 열기 (새 탭)",
    maxLength: 0,
  },

  /* ── ① 직접 타이핑 안내 + OneCompiler 링크 ── */
  {
    key: "_typing_intro",
    phase: "problem",
    label: "빈칸 채우기 — 코드를 가져와 ★★★만 채워 완성해요",
    hint:
      "지난 시간에 이어, 이번엔 예제 코드를 복사해 와서 ★★★ 빈칸만 직접 채워 완성해요.\n" +
      "아래 [OneCompiler 터틀 열기] 로 편집기를 새 탭에서 열고(그대로 두면 계속 거기서 해요),\n" +
      "각 예제의 코드를 복사 버튼으로 가져온 뒤 ★★★ 부분만 직접 쳐서 채워 완성하고 실행해요.\n" +
      "★★★는 대부분 값(색·크기·좌표·각도)이고, 한 곳은 함수 이름이에요(주석을 보고 채워요).\n\n" +
      "빈칸을 채울 때마다 그 줄이 무엇을 하는지 선생님과 함께 이야기하며 갑니다. 다 채운 예제는\n" +
      "바로 아래 제출 칸에 붙여넣어 내요.\n\n" +
      "화면에 적는 글자(제목 등)는 영어로 써요 — 온라인 편집기에서 한글은 깨져 보여요.",
    kind: "note",
    linkUrl: ONECOMPILER_TURTLE_URL,
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },

  /* ── ② 무대 만들기 — screen (직접 타이핑) ── */
  {
    key: "_typing_stage",
    phase: "problem",
    label: "무대 만들기 — screen",
    hint:
      "핵심 키워드: Screen() 창 만들기, setup() 크기, bgcolor() 배경색\n\n" +
      "아래 코드를 복사 버튼으로 가져온 뒤 ★★★만 채워 완성하고 실행해 봐요(★★★는 대부분 값,\n" +
      "한 곳은 함수 이름 — 주석 참고). 그다음 값을 하나씩 바꿔 다시 실행해 봐요.\n\n" +
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
  submitField("poke_submit_stage", "무대 — 완성한 코드 제출", "무대", "problem"),

  /* ── ③ 거북이 만들기·꾸미기 — shape · color (직접 타이핑) ── */
  ocOpen("_typing_oc_turtle", "mvp"),
  {
    key: "_typing_turtle",
    phase: "mvp",
    label: "거북이 만들기·꾸미기 — shape · color",
    hint:
      "핵심 키워드: Turtle() 거북이 만들기, shape() 모양, color() 색\n\n" +
      "아래 코드를 복사해 ★★★만 채워 완성한 뒤(★★★는 값·함수 이름 — 주석 참고) 실행하고,\n" +
      "값을 바꿔 가며 확인해요.\n\n" +
      "· player.shape(\"square\") — 모양. 이렇게도:\n" +
      "    \"circle\"  →  \"turtle\"  →  \"arrow\"  →  \"triangle\"  →  \"classic\"\n" +
      "· player.color(\"green\") — 색(색 이름). 이렇게도:\n" +
      "    \"red\"  →  \"blue\"  →  \"orange\"  →  \"purple\"\n" +
      "  색을 코드로도 넣어 봐요(맨 앞에 우물정 기호 붙은 여섯 자리):\n" +
      "    \"#FF0000\"(빨강)  →  \"#00AAFF\"(하늘)  →  \"#00CC66\"(초록)\n" +
      "  원하는 색의 코드가 궁금하면 아래 [색상 코드 변환기] 를 새 탭에서 열어 찾아봐요.\n\n" +
      "숫자(빨강·초록·파랑, 0~255)로도 넣을 수 있어요 — 먼저 이 한 줄을 맨 위에 추가해요:\n" +
      "    screen.colormode(255)\n" +
      "  그러면 이렇게도 돼요:\n" +
      "    player.color((255, 0, 0))  →  (0, 128, 255)  →  (0, 200, 0)\n\n" +
      "완성 게임에서 주인공은 square 에 green, 똥은 circle 에 brown 이에요.",
    kind: "note",
    code: CODE_TURTLE,
    // 색 코드(#RRGGBB)를 찾아볼 수 있는 참고 링크 — 코드 아래 단추로 뜬다(새 탭). worksheet focusExempt.
    linkUrl: COLOR_PICKER_URL,
    linkLabel: "색상 코드 변환기 (참고, 새 탭)",
    maxLength: 0,
  },
  submitField("poke_submit_turtle", "거북이/색 — 완성한 코드 제출", "거북이 만들기·꾸미기", "mvp"),

  /* ── ④ 펜 상태 — penup · pendown (직접 타이핑) ── */
  ocOpen("_typing_oc_pen", "build"),
  {
    key: "_typing_pen",
    phase: "build",
    label: "펜 상태 — penup · pendown",
    hint:
      "핵심 키워드: penup() 펜 올리기(선 안 그림), pendown() 펜 내리기(선 그림)\n\n" +
      "아래 코드를 복사해 ★★★만 채워 완성한 뒤(★★★는 값·함수 이름 — 주석 참고) 실행하고,\n" +
      "어디에 선이 생기고 안 생기는지 봐요. (time.sleep(1) 덕분에 한 동작씩 천천히 보여요.)\n\n" +
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
  submitField("poke_submit_pen", "펜 상태 — 완성한 코드 제출", "펜 상태", "build"),

  /* ── ⑤ 좌표 이동 — goto · setx (직접 타이핑) ── */
  ocOpen("_typing_oc_goto", "grill"),
  {
    key: "_typing_goto",
    phase: "grill",
    label: "좌표 이동 — goto · setx",
    hint:
      "핵심 키워드: goto() 좌표로 이동, setx() x만 바꾸기 (가운데가 0,0)\n\n" +
      "goto 는 '정해진 자리(x, y)' 로 한 번에 보내요. 화면 한가운데가 (0, 0) 이에요. 아래 코드를\n" +
      "복사해 ★★★만 채워 완성한 뒤(★★★는 값·함수 이름 — 주석 참고) 실행해요.\n\n" +
      "· player.goto(0, -250) — 이렇게도 넣어 봐요:\n" +
      "    (100, 100)  →  (-200, 0)  →  (0, 0)  →  (250, 250)  →  (-150, -150)\n" +
      "· player.setx(100) — x(좌우)만 바꿔요(위아래 y 는 그대로). 이렇게도:\n" +
      "    setx(-100)  →  setx(0)  →  setx(250)\n\n" +
      "x 는 오른쪽으로 갈수록 커지고, y 는 위로 갈수록 커져요.\n\n" +
      "완성 게임에서 주인공은 goto(0, -250) 로 아래 가운데에서 시작하고, 좌우로 움직일 때 setx 를 써요.",
    kind: "note",
    code: CODE_GOTO,
    maxLength: 0,
  },
  submitField("poke_submit_goto", "좌표 이동 — 완성한 코드 제출", "좌표 이동", "grill"),

  /* ── ⑥ 상대 이동·회전 — forward · left · right (직접 타이핑) ── */
  ocOpen("_typing_oc_move", "wrapmap"),
  {
    key: "_typing_move",
    phase: "wrapmap",
    label: "상대 이동·회전 — forward · left · right",
    hint:
      "핵심 키워드: forward() 앞으로, left()/right() 왼쪽·오른쪽 회전\n\n" +
      "forward 는 '지금 보고 있는 방향으로' 앞으로 가고, left/right 는 방향을 틀어요(도, degree).\n" +
      "아래 코드를 복사해 ★★★만 채워 완성한 뒤(여기 ★★★는 모두 값 — 거리·각도) 실행해요.\n\n" +
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
  submitField("poke_submit_move", "상대 이동·회전 — 완성한 코드 제출", "상대 이동·회전", "wrapmap"),
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "터틀 함수 — 빈칸 채워 완성하기",
  // 대기 화면 앞에서 하는 기분 체크. phaseOrder 에는 mood 를 넣지 않는다(대기·안내 사이 중복 방지).
  moodCheckEnabled: true,

  game: {
    heading: "기다리는 동안 — 끝없는 계단",
    body:
      "수업이 시작되길 기다리는 동안 잠깐 쉬어요.\n" +
      "끝없이 이어지는 계단을 리듬 맞춰 올라가 봐요.\n" +
      "수업이 시작되면 이 화면은 저절로 넘어가요.",
    url: STAIRS_URL,
  },
  gameExplainer: empty(),

  // 다음 시간(progress) 단계는 두지 않는다 — 안내(assessment)가 이미 있어 중복이다.
  progress: empty(),

  /*
   * 안내 보드 — 오늘 순서(타자 연습 → 직접 타이핑 → 제출). 활동 중 되돌아와 볼 수 있다.
   */
  assessment: {
    heading: "오늘 할 일 — 코드를 가져와 빈칸(★★★) 채우기",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "코드를 복사해 와서 ★★★ 빈칸만 직접 채워 완성해요",
        note:
          "지난 시간엔 코드를 복사해 값을 바꿔 보며 익혔죠? 오늘은 같은 다섯 예제를, 빈칸(★★★)이\n" +
          "뚫린 코드로 받아요. 복사해 와서 그 빈칸만 직접 채워 완성해요. 채울 때마다 그 줄이 무슨\n" +
          "뜻인지 선생님과 함께 짚어 봅니다.",
        rows: [
          { label: "한 줄로", value: "코드를 가져와 ★★★ 빈칸만 직접 채워 완성해요" },
          { label: "먼저", value: "파이썬 타자 연습으로 손 풀기(새 탭)" },
          { label: "오늘 할 일", value: "예제마다 빈칸 채우기 → 값 바꿔 관찰 → 완성한 코드 제출" },
          { label: "채점은", value: "점수·자동채점 없어요. 채워서 실행해 보고 이해하면 됩니다" },
        ],
        highlights: [
          "★★★는 대부분 값(색·크기·좌표·각도)이고, 한 곳은 함수 이름이에요(주석 참고).",
        ],
      },
      {
        label: "오늘 순서",
        subtitle: "타자 연습 → 지난 시간에 이어 빈칸 채우기(주제별 제출) → 성찰",
        note:
          "타자 연습을 한 뒤, 지난 시간(15차)에 하던 데에 이어서 해요. 반마다 시작하는 주제가\n" +
          "달라요 — 선생님이 '오늘은 □부터' 라고 알려줄 거예요. 그 주제 단계부터 아래로 이어서,\n" +
          "예제마다 ★★★ 빈칸을 채워 완성한 코드를 바로 아래 칸에 제출하면 됩니다.",
        rows: [
          { label: "먼저", value: "파이썬 타자 연습(별도 단계, 새 탭)" },
          { label: "무대", value: "screen — 지난 시간에 한 주제(복습용)" },
          { label: "거북이", value: "shape · color → 완성한 코드 제출" },
          { label: "펜", value: "penup · pendown → 제출" },
          { label: "좌표", value: "goto · setx → 제출" },
          { label: "이동", value: "forward · left · right → 제출" },
          { label: "마지막", value: "성찰 한두 줄" },
        ],
        highlights: [
          "우리 반이 어디부터 할지는 선생님이 알려줘요 — 그 주제 단계 버튼부터 시작해요.",
          "예제 하나를 다 채우면 바로 아래 칸에 그 코드를 붙여넣어 제출해요.",
        ],
      },
    ],
  },

  video: empty(),

  /*
   * 성찰 — 직접 쳐보니 새로 이해된 것 / 헷갈렸던 줄. 개인적이라 비공개.
   */
  reflectionQuestions: [
    "가장 채우기 어려웠던(또는 무엇을 넣을지 헷갈렸던) 빈칸은 무엇이었나요?",
  ],
  reflectionPublic: false,

  /*
   * 타자 연습(wordquiz)·직접 타이핑(worksheet) 두 단계가 새 탭(외부 앱·OneCompiler)을 열어,
   * 창을 옮기는 것을 이탈로 세지 않는다 (15차와 같은 이유).
   */
  // 직접 타이핑 단계들 모두 OneCompiler(새 탭)를 오가므로 focusExempt 에 넣는다(이탈 오탐 방지).
  focusExempt: ["wordquiz", "problem", "mvp", "build", "grill", "wrapmap"],
  /*
   * 교사 버튼 순서. 기분(mood)은 대기 앞에서 한 번만 하므로 여기 넣지 않는다(대기·안내 사이
   * 중복 방지). moodCheckEnabled 로 뜨는 기분 버튼은 목록 맨 뒤 재확인용이다.
   *
   * 빈칸 채우기를 **주제별 단계로 쪼갠다**(교사 확정) — 무대·거북이·펜·좌표·이동을 각각 다른
   * STEP_PHASE(problem·mvp·build·grill·wrapmap)에 담고 phaseLabels 로 "빈칸 채우기 - □" 이름을
   * 붙인다. 'worksheet' 단계는 안 쓴다 — 그 단계는 활동지 공용 머리말(worksheetIntro)을 제목으로
   * 띄워 단계 제목이 phaseLabel 로 안 나오기 때문(STEP_PHASE 는 phaseLabel 이 곧 단계 제목).
   * LESSON_PHASES 순서(problem<mvp<build<grill<wrapmap)라 제출 단추는 마지막 이동(wrapmap)에 뜬다.
   *   대기 → 타자 연습(wordquiz) → 안내(assessment) → 무대(problem) → 거북이(mvp) → 펜(build)
   *     → 좌표(grill) → 이동(wrapmap) → 성찰
   */
  phaseOrder: ["waiting", "wordquiz", "assessment", "problem", "mvp", "build", "grill", "wrapmap", "reflection"],
  phaseLabels: {
    wordquiz: "파이썬 타자 연습",
    assessment: "안내",
    problem: "빈칸 채우기 - 무대",
    mvp: "빈칸 채우기 - 거북이",
    build: "빈칸 채우기 - 펜",
    grill: "빈칸 채우기 - 좌표",
    wrapmap: "빈칸 채우기 - 이동",
  },
  /*
   * 되돌아가기 켬 — 학생이 안내·활동지 사이를 스스로 오갈 수 있다. 교사는 타자 연습 → 안내 →
   * 예제(무대·거북이·펜·좌표·이동)를 한 줄씩 설명하며 몬다.
   */
  freeNavigation: true,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리는 차시가 아니다 — 비우면 글만/기록만 하는 활동으로 잡는다(저장 입력은 코드 제출·성찰)
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "터틀 함수 — 빈칸 채워 완성하기",
      body:
        "위에서부터 순서대로 해요. 예제마다 코드를 복사해 와서 ★★★ 빈칸만 직접 채워 완성하고\n" +
        "실행한 뒤, 무슨 뜻인지 이해하고, 완성한 코드를 바로 아래 칸에 제출합니다.",
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
     * lessonNo 16 은 예전에 「똥피하기 분석·설계」 계획이 있던 자리다(seed-lesson17.ts 로 옮김).
     * merge 로는 그때의 필드가 남아 섞일 수 있어 progress·progressChecks·quiz 를 명시 삭제한다
     * (이 차시엔 셋 다 없다).
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
          // phaseOrder 를 세션에도 써 넣어야 대시보드 버튼 순서가 바뀐다(없으면 LESSON_PHASES 기본).
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (★ 15차와 같은 통 — 무대·거북이는 15차 제출(poke_submit_stage·turtle)이 16차 같은 필드에 학생별로 그대로 뜸. 펜·좌표·이동은 새로 채움. 17차 python-dodge-game 과는 분리)`);
  console.log("단계 흐름(phaseOrder): 대기(지뢰찾기) → 파이썬 타자 연습(wordquiz) → 안내(assessment) → 무대(problem) → 거북이(mvp) → 펜(build) → 좌표(grill) → 이동(wrapmap) → 성찰. 각 단계 제목=phaseLabels '빈칸 채우기 - □'.");
  console.log("빈칸 채우기는 주제별 단계로 쪼갬 — '빈칸 채우기 - 무대/거북이/펜/좌표/이동'. 각 단계 = ★★★ 빈칸 코드(복사 허용) + 완성한 코드 제출.");
  console.log("기분: moodCheckEnabled 켬(대기 앞 1회). phaseOrder 에 mood 없음 → 대기·안내 사이 중복 없음(기분 버튼은 목록 맨 뒤 재확인용).");
  console.log(`파이썬 타자: 별도 단계(wordquiz)에 외부 앱 새 탭 링크 (${TYPING_APP_URL}). 대기 게임: 끝없는 계단 (${STAIRS_URL}) — 16차부터.`);
  console.log(`빈칸 채우기: 예제 5개(무대·거북이/색·펜·좌표·이동). 각 예제=★★★ 빈칸 코드(복사 허용, 핵심키워드·time.sleep 유지) + 완성한 코드 제출(long, 자동저장·붙여넣기).`);
  console.log(`OneCompiler 터틀(${ONECOMPILER_TURTLE_URL})·색상 변환기(${COLOR_PICKER_URL}) 링크. 화면 텍스트 평문(마크다운 없음). quiz 없음. galleryEnabled: false.`);
  console.log("⚠ open-info-*.ts 로 새 세션을 열 때 그 스크립트가 phaseOrder 를 복사해야 대시보드 순서가 반영됩니다(snapshotOf 에도 phaseOrder 있음 — db.ts).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
