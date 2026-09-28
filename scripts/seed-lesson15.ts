/**
 * 15차시 차시 계획 등록 — 「터틀 함수 찍어보기 — 똥피하기 게임 준비」.
 *
 *   node --env-file=.env.local scripts/seed-lesson15.ts
 *   node --env-file=.env.local scripts/seed-lesson15.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 이 자리(LESSON_NO 15)는 아크에 새로 끼워 넣은 「함수 찍어보기」 수업이다
 *
 * 14차(프로그래밍 언어 개론 + 파이썬 맛보기)와, 똥피하기를 뜯어보며 만들기 시작하는 분석·설계
 * 수업(16차) 사이에 게임 코딩 아크의 첫 실습을 하나 둔다. 완성된 똥피하기 게임(교사 확정본)에
 * 실제로 쓰인 터틀 라이브러리 함수들을 직접 한 줄씩 쳐 보고(찍어보기), 매개변수를 여러 가지로
 * 바꿔 실행하며 파이썬과 친해지는 시간이다. 주인공 이동·게임 구현은 다음 차시(16)로 미룬다 —
 * 오늘은 변수·함수정의(def)·조건문·키보드를 깊이 안 들어가고, 순수 라이브러리 함수 호출 감각과
 * 좌표(goto·setx) 위주로만 간다.
 *
 * 아크: 개론+맛보기(14) → 터틀 함수 찍어보기(15, 이 파일) → 똥피하기 분석·설계+첫 기능
 *   (16, seed-lesson16.ts) → 기능을 하나씩 붙이는 구현 차시들(같은 python-dodge-game 통) →
 *   피지컬 컴퓨팅 개념(122) → 마이크로비트(123) → 바이브 코딩 → 햄스터.
 *
 * 이 수업이 끼면서, 원래 15차였던 분석·설계+구현은 한 칸 밀려 16차가 됐다(seed-lesson16.ts).
 *
 * ## 단계 흐름 — 14차의 「파이썬 타자 단계(wordquiz)」 관례를 그대로 따른다
 *
 * 기분 체크는 이제 대기 화면 앞에서 한 번만 한다(로그인 → 기분 → 대기 게임, lesson/page.tsx).
 * 그래서 교사 버튼 순서(phaseOrder)에 mood 를 넣지 않는다 — 넣으면 대기와 안내 사이에 기분이
 * 또 떠 중복이 된다. moodCheckEnabled 는 켜 두되(대기 앞 기분 체크용), 단계 버튼 흐름은:
 *
 *   대기(똥피하기) → 파이썬 타자 연습(wordquiz, 별도 단계) → 안내(assessment)
 *     → 함수 찍어보기(worksheet) → 성찰(reflection)
 *
 * 파이썬 타자는 14차처럼 wordquiz 단계에 note 하나(외부 앱 새 탭 링크)로 둔다. 14차는 그
 * 단계를 '기분 앞' 에 뒀지만, 15차는 '안내 앞'(대기 뒤)에 둔다. freeNavigation 으로 자유 이동도 가능.
 *
 * ⚠ phaseOrder 는 세션 문서에 실려야 대시보드가 읽는다. 시드는 계획 문서와 '아직 아무도 안
 * 들어온 예약 세션'에 phaseOrder 를 직접 써 넣는다. 교사가 open-info-*.ts 로 새 세션을 열 때도
 * 그 스크립트가 phaseOrder 를 복사해야 한다(snapshotOf 에도 phaseOrder 를 추가해 둠 — db.ts).
 *
 * ## 활동 통(activityId) — 입문/맛보기 통(python-intro)을 이어 쓴다
 *
 * 14차와 같은 python-intro 를 쓴다. 오늘은 OneCompiler 에서 직접 쳐 보고 값을 바꾸는 맛보기라
 * 저장되는 입력은 마지막 '코드 제출하기'(long)와 성찰뿐이다. 게임을 실제로 만들기 시작하는 통
 * (python-dodge-game)은 16차에서 새로 열어 깨끗이 쓴다. 마이크로비트~햄스터 실습 통
 * (physical-computing)·디지털 윤리 통(digital-ethics)과도 물리적으로 다른 문서라 안 섞인다.
 *
 * ## 화면 텍스트는 평문이다 (마크다운 안 됨)
 *
 * 포털 워크시트 렌더러는 label·hint·안내문을 whitespace-pre-line 평문으로 그린다(worksheet-view).
 * **굵게**·`백틱`·줄머리 # 같은 마크다운 서식은 그대로 리터럴로 보이므로 쓰지 않는다. 강조는
 * 따옴표·[대괄호]·콜론 같은 평범한 표현으로 한다. 단, code 필드의 파이썬 코드(#주석 포함)는 그대로 둔다.
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
 * 입문/맛보기 통. 14차와 같은 통을 이어 쓴다 — 오늘은 OneCompiler 에서 직접 쳐 보는 맛보기라
 * 저장되는 입력은 '코드 제출하기'(long)와 성찰뿐이고, 게임 제작 통(python-dodge-game, 16차부터)·
 * 실습 통(physical-computing)·디지털 윤리 통(digital-ethics)과 물리적으로 다른 문서라 안 섞인다.
 */
const ACTIVITY_ID = "python-intro";

/** 파이썬 타자/낱말 연습 — 교사가 만든 외부 앱. 시드 안에 만들지 않고 새 탭 링크만 건다. */
const TYPING_APP_URL = "https://python-typing-helper.vercel.app";

/** 파이썬 터틀 실행 편집기 — OneCompiler 터틀 모드(설치 불필요, 14·16차와 동일). */
const ONECOMPILER_TURTLE_URL = "https://onecompiler.com/turtle";

/** 색상 코드(#RRGGBB) 참고용 변환기 — 색 찍어보기(color)에서 원하는 색 코드를 찾아본다. */
const COLOR_PICKER_URL = "https://youtil.kr/tools/art/color";

/* ──────────────────────────────────────────────────────────────
 * 찍어보기용 예제 코드 — 함수 하나(무리)를 담은 짧고 완결된 터틀 프로그램. code 필드로 준다
 * (등폭 readonly, 들여쓰기 보존 + 복사 단추). 학생은 이걸 직접 한 줄씩 따라 치고, hint 에
 * 적힌 여러 값을 차례로 바꿔 넣어 실행하며 관찰한다. 화면에 적는 글자는 영어(온라인 터틀
 * 서버에서 한글 write 가 깨진다 — 교사 확정). 14·16차와 같은 터틀로 일관한다.
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

// 펜·좌표·이동(CODE_PEN·CODE_GOTO·CODE_MOVE) 예제는 16차(seed-lesson16.ts)로 옮겼다.
// 15차는 무대·거북이 두 주제만 한다(교사 확정 — 나머지는 16차에서 이어서).

/* ──────────────────────────────────────────────────────────────
 * '게임과 연결' 표(다이어그램).
 *
 * 함수→쓰임 매핑을 글로 나열하면 눈에 안 들어온다(교사 지적). 두 칸짜리 표를 SVG 로 그려
 * imageUrl 로 카드에 얹는다(worksheet-view 는 imageUrl 을 w-full 읽기용 img 로 그린다).
 * data:image/svg+xml + encodeURIComponent 로 담아 한글·#색코드·→ 가 안전하게 실린다.
 * ────────────────────────────────────────────────────────────── */
const GAME_LINK_ROWS: { fn: string[]; use: string }[] = [
  { fn: ["turtle.Screen()", "setup·bgcolor·title"], use: "게임 화면(무대) 만들기" },
  { fn: ["turtle.Turtle()", "shape · color"], use: "주인공·똥 모양과 색" },
  { fn: ["penup()"], use: "선 없이 미끄러지기" },
  { fn: ["goto(0, -250)", "setx"], use: "시작 위치·좌우 이동" },
  { fn: ["forward · left · right"], use: "방향 바꾸기 (그림·연습)" },
  { fn: ["time.sleep(초)"], use: "움직임 속도 조절" },
];

const GAME_LINK_ROW_SVG = GAME_LINK_ROWS.map((r, i) => {
  const y = 90 + i * 56;
  const c = y + 28;
  const fill = i % 2 ? "#f8fafc" : "#ffffff";
  const left =
    r.fn.length === 2
      ? `<text x="147" y="${c - 6}" text-anchor="middle" font-size="14" font-family="ui-monospace, monospace" fill="#0f172a">${r.fn[0]}</text>` +
        `<text x="147" y="${c + 14}" text-anchor="middle" font-size="14" font-family="ui-monospace, monospace" fill="#0f172a">${r.fn[1]}</text>`
      : `<text x="147" y="${c + 5}" text-anchor="middle" font-size="14" font-family="ui-monospace, monospace" fill="#0f172a">${r.fn[0]}</text>`;
  return (
    `<rect x="12" y="${y}" width="270" height="56" fill="${fill}" stroke="#e5e7eb"/>` +
    `<rect x="318" y="${y}" width="270" height="56" fill="${fill}" stroke="#e5e7eb"/>` +
    `<text x="300" y="${c + 7}" text-anchor="middle" font-size="20" fill="#9ca3af">→</text>` +
    left +
    `<text x="453" y="${c + 5}" text-anchor="middle" font-size="15" fill="#0f172a">${r.use}</text>`
  );
}).join("");

const GAME_LINK_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 440" ` +
  `font-family="'Malgun Gothic','Apple SD Gothic Neo',sans-serif">` +
  `<rect x="0" y="0" width="600" height="440" fill="#ffffff"/>` +
  `<text x="300" y="28" text-anchor="middle" font-size="19" font-weight="700" fill="#111827">오늘 익힌 함수 → 게임에서 하는 일</text>` +
  `<rect x="12" y="44" width="270" height="40" rx="6" fill="#fde68a" stroke="#f59e0b"/>` +
  `<text x="147" y="70" text-anchor="middle" font-size="16" font-weight="700" fill="#92400e">오늘 배운 함수</text>` +
  `<rect x="318" y="44" width="270" height="40" rx="6" fill="#bfdbfe" stroke="#3b82f6"/>` +
  `<text x="453" y="70" text-anchor="middle" font-size="16" font-weight="700" fill="#1e40af">게임에서 하는 일</text>` +
  GAME_LINK_ROW_SVG +
  `</svg>`;

const GAME_LINK_DIAGRAM = `data:image/svg+xml,${encodeURIComponent(GAME_LINK_SVG)}`;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/*
 * 예제별 코드 제출 칸 — 각 찍어보기 카드 바로 뒤에 하나씩 둔다. kind long 이라 여러 줄 입력·
 * 자동 저장(1.5초)·붙여넣기 허용(noPaste 안 켬). 예제마다 key/label 을 구분해 답이 따로 저장된다.
 * 안내문은 평문(마크다운 서식 문자 없음). exampleName 은 위 카드 이름([무대] 등)을 가리킨다.
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
      "그 예제의 최종 코드를 여기에 붙여넣어 제출하세요.\n" +
      "붙여넣기(Ctrl+V) 가 되고, 쓰는 동안 자동으로 저장돼요.",
    kind: "long",
    maxLength: 2000,
  };
}

/*
 * 각 주제 단계 맨 앞에 두는 'OneCompiler 터틀 열기' 단추 카드(16차와 동일). 주제마다 단계가
 * 나뉘어 있어, 무대(problem)의 안내 카드에만 링크가 있으면 거북이 단계에서 편집기를 못 연다.
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
//   · 빈칸 채우기 : 주제별 단계로 쪼갬 — 무대(problem)·거북이(mvp) 두 주제.
//       각 주제 = 안내/참고 코드(★★★ 빈칸) + 완성한 코드 제출(long, 자동 저장).
//       '게임과 연결' 표는 별도 단계(build). 펜·좌표·이동은 16차에 이어서 한다(15차에서 제거).
// 카드마다 hint 에 "이렇게도 넣어 봐요" 로 여러 매개변수를 제시해 바꿔 보게 한다.
// 화면 텍스트는 평문 — 마크다운 서식 문자를 쓰지 않는다(code 필드의 파이썬만 예외).
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── 파이썬 타자 연습 (별도 단계 wordquiz, 안내 앞) — 외부 앱 새 탭 링크만 ── */
  /*
   * 14차 '파이썬 타자 도우미(wordquiz)' 관례와 같다. 시드 안에 타자게임을 만들지 않고, 교사가
   * 만든 외부 앱을 새 탭 링크로 연다(점수 없음). wordquiz 는 focusExempt 라 새 탭 이탈 오탐 없음.
   */
  {
    key: "_poke_typing",
    phase: "wordquiz",
    label: "파이썬 타자 연습 — 5분 워밍업",
    hint:
      "본격적으로 시작하기 전에, 파이썬에서 자주 쓰는 낱말에 손을 풀어요.\n" +
      "아래 단추로 새 탭에서 열려요. 딱 5분만, 점수는 없으니 편하게 쳐 봐요.\n" +
      "다 하고 이 화면으로 돌아오세요.",
    kind: "note",
    linkUrl: TYPING_APP_URL,
    linkLabel: "파이썬 타자 연습 열기 (새 탭)",
    maxLength: 0,
  },

  /* ── ① 찍어보기 안내 + OneCompiler 링크 ── */
  /*
   * 실행 편집기 = OneCompiler 터틀 — 교사 확정, 14·16차와 동일. 브라우저에서 파이썬 터틀
   * 그래픽이 바로 뜬다(설치 불필요). 아래 함수 카드들을 여기서 직접 쳐서 실행한다. 링크가 붙어도
   * 이 단계는 focusExempt(worksheet)라 새 탭 이탈 오탐이 안 난다.
   */
  {
    key: "_poke_intro",
    phase: "problem",
    label: "빈칸 채우기 — 코드를 가져와 ★★★만 직접 채워요",
    hint:
      "이제 파이썬 '터틀' 함수를 빈칸 채우기로 익혀요. 아래 [OneCompiler 터틀 열기] 로 편집기를\n" +
      "새 탭에서 열고(그대로 두면 계속 거기서 해요), 아래 칸의 코드를 복사 버튼으로 가져온 뒤\n" +
      "★★★ 부분만 직접 쳐서 채워 완성하고 실행해 봐요. ★★★는 대부분 값(색·크기·좌표·각도)이고,\n" +
      "한 곳은 함수 이름이에요(주석을 보고 채워요).\n\n" +
      "채운 뒤엔 색·좌표·거리·각도 값을 여러 가지로 바꿔 다시 실행해서, 무엇이 달라지는지 눈으로\n" +
      "확인하는 게 오늘의 핵심이에요. 같은 함수라도 넣는 값에 따라 결과가 달라져요.\n\n" +
      "화면에 적는 글자(제목 등)는 영어로 써요 — 온라인 편집기에서 한글은 깨져 보여요.",
    kind: "note",
    linkUrl: ONECOMPILER_TURTLE_URL,
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },

  /* ── ② 무대 만들기 — screen (bgcolor·setup·title) ── */
  {
    key: "_poke_stage",
    phase: "problem",
    label: "무대 만들기 — screen",
    hint:
      "핵심 키워드: Screen() 창 만들기, setup() 크기, bgcolor() 배경색\n\n" +
      "'무대' 는 게임이 펼쳐지는 화면이에요. 아래 코드를 복사 버튼으로 가져온 뒤 ★★★만 채워\n" +
      "완성하고 실행해 봐요(★★★는 대부분 값, 한 곳은 함수 이름 — 주석 참고). 그다음 값을 하나씩\n" +
      "바꿔 다시 실행해 봐요.\n\n" +
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
  submitField("poke_submit_stage", "무대 — 코드 제출", "무대", "problem"),

  /* ── ③ 거북이 만들기·꾸미기 — Turtle·shape·color (색을 여러 형태로) ── */
  ocOpen("_poke_oc_turtle", "mvp"),
  {
    key: "_poke_turtle",
    phase: "mvp",
    label: "거북이 만들기·꾸미기 — shape · color",
    hint:
      "핵심 키워드: Turtle() 거북이 만들기, shape() 모양, color() 색\n\n" +
      "거북이(주인공)를 하나 만들고 꾸며 봐요. 아래 코드를 복사해 ★★★만 채워 완성한 뒤(★★★는\n" +
      "값·함수 이름 — 주석 참고), 값을 바꿔 가며 실행해 보세요.\n\n" +
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
  submitField("poke_submit_turtle", "거북이/색 — 코드 제출", "거북이 만들기·꾸미기", "mvp"),

  /* ── 게임과 연결 — 오늘 함수가 완성 게임 어디에 쓰이나 (표/다이어그램) ── */
  /*
   * 매핑을 글로 나열하면 눈에 안 들어온다(교사 지적). 두 칸짜리 표(SVG)를 imageUrl 로 얹고,
   * hint 는 표를 읽는 법 + 다음 시간 예고만 짧게 둔다.
   */
  {
    key: "_poke_game_link",
    phase: "build",
    label: "오늘 익힌 함수가 게임의 어디에 쓰일까?",
    hint:
      "오늘 쳐 본 함수들이 완성된 똥피하기 게임에서 어디에 쓰이는지 아래 표로 봐요.\n" +
      "왼쪽이 오늘 배운 함수, 오른쪽이 게임에서 그 함수가 하는 일이에요.\n\n" +
      "오늘은 함수를 '하나씩 쳐 보고 값을 바꿔 보는' 날이었어요. 다음 시간부터 이 함수들을 합쳐서\n" +
      "주인공 움직이기 → 똥 떨어뜨리기 → 부딪힘 → 점수 순으로 게임을 만들어 갑니다!",
    kind: "note",
    imageUrl: GAME_LINK_DIAGRAM,
    imageAlt: "오늘 익힌 터틀 함수와 게임에서 하는 일을 짝지은 표",
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "터틀 함수 빈칸 채우기 — 똥피하기 게임 준비",
  // 대기 화면 앞에서 하는 기분 체크(로그인 → 기분 → 대기 게임). 단계 버튼(phaseOrder)에는 mood 를
  // 넣지 않는다 — 넣으면 대기와 안내 사이에 기분이 또 떠 중복이 된다.
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
   * 안내 보드 — 오늘 순서(타자 연습 → 함수 찍어보기 → 제출 → 게임과 연결). 활동 중 되돌아와 볼 수 있다.
   */
  assessment: {
    heading: "오늘 할 일 — 게임에 쓸 터틀 함수, 빈칸(★★★) 채워 완성하기",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "코드를 복사해 와서 ★★★ 빈칸만 직접 채워 완성해요",
        note:
          "지난 시간엔 파이썬을 살짝 맛봤죠? 오늘은 완성 게임(똥피하기)에 실제로 쓰인 터틀 함수들을,\n" +
          "빈칸(★★★)이 뚫린 코드로 받아요. 복사해 와서 그 빈칸만 직접 채워 완성하고 실행해 봐요.\n" +
          "게임을 만드는 건 다음 시간부터예요.",
        rows: [
          { label: "한 줄로", value: "코드를 가져와 ★★★ 빈칸만 직접 채워 완성해요" },
          { label: "먼저", value: "파이썬 타자 연습으로 손 풀기(새 탭)" },
          { label: "오늘 할 일", value: "예제마다 빈칸 채워 완성 → 값 바꿔 관찰 → 완성한 코드 제출 → 게임과 연결" },
          { label: "채점은", value: "점수·자동채점 없어요. 채워서 실행해 보고 이해하면 됩니다" },
        ],
        highlights: [
          "★★★는 대부분 값(색·크기·좌표·각도)이고, 한 곳은 함수 이름이에요(주석 참고).",
        ],
      },
      {
        label: "오늘 순서",
        subtitle: "타자 연습 → 빈칸 채우기(무대·거북이) → 게임과 연결",
        note:
          "타자 연습을 한 뒤, 코드를 복사해 와서 ★★★ 빈칸만 직접 채워 완성해요. 예제마다 바로 아래에\n" +
          "완성한 코드를 붙여넣어 제출하는 칸이 있어요. 오늘은 무대·거북이까지 하고, 펜·좌표·이동은\n" +
          "다음 시간(16차)에 이어서 합니다.",
        rows: [
          { label: "먼저", value: "파이썬 타자 연습(별도 단계, 새 탭)" },
          { label: "1", value: "무대 만들기 — screen → 완성한 코드 제출" },
          { label: "2", value: "거북이 만들기·꾸미기 — shape · color → 제출" },
          { label: "3", value: "게임과 연결 — 익힌 함수가 게임 어디에 쓰이나 보기" },
          { label: "다음 시간", value: "펜 · 좌표 · 이동은 16차에 이어서" },
          { label: "마지막", value: "성찰 한 줄" },
        ],
        highlights: [
          "오늘은 무대·거북이 두 주제예요. 펜·좌표·이동은 다음 시간(16차)에 이어서 해요.",
        ],
      },
    ],
  },

  video: empty(),

  /*
   * 성찰 — 오늘 바꿔 본 함수 중 신기했던 것 / 게임과 연결. 개인적이라 비공개.
   */
  reflectionQuestions: [
    "오늘 만들어 본 기능 중, 가장 신기했던 것 하나와 무엇이 달라졌는지 한 줄로 적어 봅시다.",
  ],
  reflectionPublic: false,

  /*
   * 타자 연습(wordquiz)·빈칸 채우기 두 단계(worksheet=무대, problem=거북이)가 새 탭
   * (외부 앱·OneCompiler)을 열어, 창을 옮기는 것을 이탈로 세지 않는다.
   */
  focusExempt: ["wordquiz", "problem", "mvp", "build"],
  /*
   * 교사 버튼 순서. 기분(mood)은 대기 앞에서 한 번만 하므로 여기 넣지 않는다.
   *
   * 빈칸 채우기를 **주제별 단계로 쪼갠다**(16차와 동일 방식): 15차는 무대·거북이 두 주제만 하고,
   * 펜·좌표·이동은 16차에 이어서 한다(교사 확정). 무대=worksheet, 거북이=problem 슬롯을 빌려
   * phaseLabels 로 "빈칸 채우기 - □" 이름을 붙인다(게임과 연결 표는 별도 단계 build).
   *   대기 → 파이썬 타자 연습(wordquiz) → 안내(assessment) → 빈칸 채우기 무대(problem)
   *     → 빈칸 채우기 거북이(mvp) → 게임과 연결(build) → 성찰
   * ※ 무대·거북이·게임과 연결 모두 STEP_PHASE(problem·mvp·build)에 둔다 — 'worksheet' 단계는
   *   활동지 공용 머리말(worksheetIntro)을 제목으로 띄워 단계 제목이 phaseLabel 로 안 나온다.
   *   STEP_PHASE 는 phaseLabel 이 곧 단계 제목이 된다.
   */
  phaseOrder: ["waiting", "wordquiz", "assessment", "problem", "mvp", "build", "reflection"],
  phaseLabels: {
    wordquiz: "파이썬 타자 연습",
    assessment: "안내",
    problem: "빈칸 채우기 - 무대",
    mvp: "빈칸 채우기 - 거북이",
    build: "게임과 연결",
  },
  /*
   * 되돌아가기 켬 — 학생이 안내·활동지 사이를 스스로 오갈 수 있다. 교사는 타자 연습 → 안내 →
   * 함수 카드(무대·거북이·펜·좌표·이동) → 코드 제출 → 게임과 연결 순으로 단추로 몬다.
   */
  freeNavigation: true,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리는 차시가 아니다 — 비우면 글만/기록만 하는 활동으로 잡는다(저장 입력은 코드 제출·성찰)
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "터틀 함수 빈칸 채우기 — 똥피하기 게임 준비",
      body:
        "위에서부터 순서대로 해요. 예제 코드를 복사해 와서 ★★★ 빈칸만 직접 채워 완성하고, 예제마다\n" +
        "바로 아래 칸에 그 코드를 제출한 뒤, 그 함수들이 완성 게임 어디에 쓰이는지 짚어 봅니다.",
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (입문/맛보기 통 — 14차와 공유. 게임 제작 통 python-dodge-game 은 16차부터)`);
  console.log("단계 흐름(phaseOrder): 대기(똥피하기) → 파이썬 타자 연습(wordquiz) → 안내(assessment) → 빈칸 채우기 무대(problem) → 거북이(mvp) → 게임과 연결(build) → 성찰");
  console.log("기분: moodCheckEnabled 켬(대기 앞에서 한 번). phaseOrder 에 mood 없음 → 대기·안내 사이 기분 중복 제거(기분 버튼은 목록 맨 뒤 재확인용).");
  console.log(`파이썬 타자: 별도 단계(wordquiz)에 외부 앱 새 탭 링크만 (${TYPING_APP_URL}). 시드 안에 타자게임 안 만듦. wordquiz focusExempt.`);
  console.log(`파이썬 터틀 실행: OneCompiler 터틀(${ONECOMPILER_TURTLE_URL}) — _poke_intro note 에 새 탭 링크. 함수 카드마다 code 필드로 예제(등폭 readonly, 복사 단추).`);
  console.log("빈칸 채우기 2주제(각 별도 단계): 무대(screen) · 거북이(shape·color). ★★★ 빈칸 채워 완성·제출. 펜·좌표·이동은 16차로 이관(15차에서 제거).");
  console.log("코드 제출하기: 예제(②~⑥)마다 바로 아래에 제출 칸(poke_submit_stage/turtle/pen/goto/move, long) — 자동 저장·붙여넣기 허용. 이 차시 저장 활동지 답. 성찰 2문항.");
  console.log("화면 텍스트 평문(마크다운 서식 문자 없음, code 필드 파이썬만 예외). quiz 없음. galleryEnabled: false.");
  console.log("⚠ open-info-*.ts 로 새 세션을 열 때 그 스크립트가 phaseOrder 를 복사해야 대시보드 순서가 반영됩니다(snapshotOf 에도 추가함 — db.ts).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
