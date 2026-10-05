/**
 * 17차시 차시 계획 등록 — 「똥피하기 게임 — 분석·설계 + 첫 기능(주인공 좌우 이동)」.
 *
 *   node --env-file=.env.local scripts/seed-lesson17.ts
 *   node --env-file=.env.local scripts/seed-lesson17.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 이 자리(LESSON_NO 17)는 아크에 수업이 둘 끼며 두 칸 뒤로 밀렸다
 *
 * 원래 이 수업(똥피하기 분석·설계 + 첫 기능)은 15차였다. 「함수 찍어보기」(15) 신설로 16차가
 * 됐고, 다시 「15차 코드 직접 타이핑」(16, seed-lesson16.ts) 신설로 17차가 됐다. 내용은 그대로다.
 *
 * 아크: **개론+맛보기(14) → 터틀 함수 찍어보기(15, seed-lesson15.ts) → 15차 코드 직접 타이핑
 *   (16, seed-lesson16.ts) → 똥피하기 분석·설계+첫 기능(17, 이 파일) → 기능을 하나씩 붙이는
 *   구현 차시들(≈이후 6차시, 같은 python-dodge-game 통을 이어 씀) → 피지컬 컴퓨팅 개념(122)
 *   → 마이크로비트(123) → 바이브 코딩 → 햄스터**.
 *
 * ## 이 시간의 목적 — "만들기 전에 뜯어보고, 순서를 정한다"
 *
 * 코드부터 치지 않는다. 먼저 익숙한 게임을 **구성요소로 뜯어**(도메인 분석) 무엇이 필요한지
 * 보고, **어떤 순서로 붙일지**(설계) 정한다. 좌표(화면은 x·y, 주인공은 (x,y) 위치) 개념을
 * 쉬운 note 로 먼저 잡은 뒤, 오늘의 첫 기능 **주인공 좌우 이동**만 터틀로 만들어 성공을 맛본다.
 * 나머지 기능(똥 떨어뜨리기·충돌·점수)은 다음 차시들에서 하나씩 붙인다.
 *
 * ## 활동 통(activityId) — 게임 제작 아크 공용 통
 *
 * `python-dodge-game` 를 판다. **이후 구현 차시들이 같은 통을 이어 쓴다** — 분석·설계·코드
 * 기록이 한 문서에 쌓여 이어지게. 게임 제작의 실질적 첫 기록이 여기서 시작한다. 14차·15차
 * 입문/맛보기 통(python-intro)·16차 직접 타이핑 통(python-typing)·마이크로비트~햄스터 실습 통
 * (physical-computing)·디지털 윤리 통(digital-ethics)과 물리적으로 다른 문서라 안 섞인다.
 *
 * ## 단계 배치와 실제 진행 순서
 *
 * 포털 단계 순서(LESSON_PHASES)는 assessment(안내) → worksheet(활동지)로 흐르고, 실제
 * 진행은 교사가 단추로 몬다(freeNavigation). 교사 뼈대 순서:
 *
 *   0–3   대기(테트리스) · 기분 · 출석
 *   3–8   안내 보드(assessment) — 오늘: 분석 → 구현(1·2·3단계)
 *   8–13  좌표 개념 note (화면은 x·y, 주인공은 (x,y))
 *   13–23 게임 분석 — 구성요소 빈칸 4지선다 드롭다운 + AI 채점(cloze)
 *   23–28 구현 1단계 — 플레이어 배치(shape·penup·좌표 ★★★ 채우기)
 *   28–33 구현 2단계 — 왼쪽 이동(go_left 의 xcor·setx ★★★ 채우기)
 *   33–38 구현 3단계 — 오른쪽 이동(go_right 두 줄 직접 채우기)
 *   38–40 성찰 → 정리
 *
 * 설계(만들 순서 정하기) 단계는 뺐다 — 구현 순서는 교사가 이미 정해 뒀다(아크 설계).
 * 구현은 벅차지 않게 세 단계로 쪼개 교사가 단추로 하나씩 넘긴다.
 *
 * 구성요소 분석은 AI(제미나이) 채점이 있다. 그 외 점수·자동채점은 없다. 진도 팝업은 없다.
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
const LESSON_NO = 17;

/** 9~11차시와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/**
 * **게임 제작 아크 공용 통.** 똥피하기 분석·설계·구현 차시들이 한 문서에 이어 쓴다 — 코드·설계
 * 기록이 쌓이게. 14차·15차 입문/맛보기 통(python-intro)·16차 직접 타이핑 통(python-typing)·
 * 마이크로비트~햄스터 실습 통(physical-computing)·디지털 윤리 통(digital-ethics)과 분리된 문서다.
 */
const ACTIVITY_ID = "python-dodge-game";

/* ──────────────────────────────────────────────────────────────
 * 구현 예제 코드 — 한 번에 다 치지 않고 **세 단계로 쌓아** 완성한다(code 필드, 등폭 readonly,
 * 복사 가능). 14·15·16차와 같은 **터틀**. 방향키(Left/Right)로 주인공 x 좌표를 바꿔 움직인다.
 *   1단계: 플레이어를 가운데 하단에 놓기 — ★★★(모양·pen·좌표) 직접 채우기
 *   2단계: 앞 코드 + go_left — ★★★(xcor·setx) 직접 채우기 + 왼쪽 방향키 연결
 *   3단계: 앞 코드 + go_right 를 **빈 함수로 두고** 학생이 두 줄 직접 채우기(go_left 를 본떠 x 를 +20)
 * ────────────────────────────────────────────────────────────── */
const CODE_IMPL_PLACE = `import turtle

screen = turtle.Screen()
screen.setup(400, 500)          # 게임 화면 크기(가로 400, 세로 500)

# 주인공 만들기
player = turtle.Turtle()
player.shape("★★★")          # 네모 모양
player.★★★()                  # 선을 안 그리고 이동만
player.goto(★★★, ★★★)            # 화면 아래쪽 가운데로 이동

screen.mainloop()`;

const CODE_IMPL_LEFT = `import turtle

screen = turtle.Screen()
screen.setup(400, 500)

# 주인공 만들기
player = turtle.Turtle()
player.shape("square")
player.penup()
player.goto(0, -200)

# 왼쪽으로 — x 좌표를 20만큼 줄인다
def go_left():
    x = player.★★★()           # 지금 x 좌표를 읽어서
    player.★★★(x - 20)         # 현재 x 좌표보다 20만큼 왼쪽으로

# 방향키를 누르면 위 함수가 실행되게 연결
screen.listen()
screen.onkeypress(go_left, "Left")

screen.mainloop()`;

const CODE_IMPL_RIGHT = `import turtle

screen = turtle.Screen()
screen.setup(400, 500)

# 주인공 만들기
player = turtle.Turtle()
player.shape("square")
player.penup()
player.goto(0, -200)

# 왼쪽으로 — x 좌표를 20만큼 줄인다 (앞 단계에서 만든 것)
def go_left():
    x = player.xcor()
    player.setx(x - 20)

# 오른쪽으로 — go_left 를 본떠 직접 채워요 (x 를 20 늘리기)
def go_right():
    # ★★★ 여기를 채우세요
    # ★★★ 여기를 채우세요

# 방향키 연결 — 왼쪽은 go_left, 오른쪽은 go_right
screen.listen()
screen.onkeypress(go_left, "Left")
screen.onkeypress(go_right, "Right")

screen.mainloop()`;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 활동지 — 분석 1단계 + 구현 3단계로 나눠 교사가 단추로 하나씩 몬다(한 단계가 너무 길지 않게).
//   · 분석(problem)  — 먼저 함께 보기(시뮬레이션 링크, 맨 위) + 좌표 note + 분석 설명 + 구성요소 빈칸 4지선다 + AI 채점(cloze)
//   · 구현 1단계(build)  — 플레이어 배치
//   · 구현 2단계(grill)  — 왼쪽 이동(go_left 답 제시)
//   · 구현 3단계(wrapmap)— 오른쪽 이동(go_right 직접 채우기)
// 설계(만들 순서 정하기)는 뺐다 — 구현 순서는 교사가 이미 정해 뒀다(아크 설계).
// 모든 단계가 같은 활동 통(python-dodge-game) 한 문서에 함께 저장된다 — 답 묶음은 단계와 무관하게
// 한 artifact 에 쌓인다. 오늘 남기는 기록: 구성요소 빈칸 선택.
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── ⓪ 먼저 다 같이 보기 — 똥피하기 시뮬레이션 (분석 단계 맨 위) ──
   * 교사가 "먼저 다 같이 보고 진행" 하려고 맨 위에 둔 짧은 안내. 버튼은 카드 아래에 뜨므로
   * 설명을 짧게 둬 버튼이 분석 단계 거의 꼭대기에 오게 한다. 링크는 이 카드에만 둔다
   * (아래 분석 설명 카드에서는 뺐다 — 같은 버튼이 두 번 뜨지 않게). ────────────── */
  {
    key: "_dg_watch",
    phase: "problem",
    label: "먼저 다 같이 봐요 — 똥피하기",
    hint:
      "오늘 우리가 뜯어볼 게임이에요. 아래 버튼을 눌러 똥피하기가 어떻게 움직이는지\n" +
      "다 같이 잠깐 보고 시작해요. 무엇무엇이 필요한지 눈으로 먼저 익혀 둡니다.",
    kind: "note",
    linkUrl: "https://dodge-poop-game.vercel.app/demo",
    linkLabel: "똥피하기 시뮬레이션 보기 (새 탭)",
    maxLength: 0,
  },

  /* ── ① 좌표 개념 note (화면은 x·y, 주인공은 (x,y) 위치) ── */
  {
    key: "_dg_coord",
    phase: "problem",
    label: "① 화면은 좌표로 되어 있어요 (x · y)",
    hint:
      "게임을 만들려면 '어디에 있는지' 를 숫자로 말할 수 있어야 해요. 그게 '좌표' 예요.\n\n" +
      "  · x — 좌우 위치. 오른쪽으로 갈수록 커지고, 왼쪽으로 갈수록 작아져요.\n" +
      "  · y — 위아래 위치. 위로 갈수록 커지고, 아래로 갈수록 작아져요.\n\n" +
      "화면 한가운데가 (0, 0) 이에요. 주인공이 (0, -200) 에 있다면 '가로는 가운데, 세로는 아래쪽'\n" +
      "이라는 뜻이에요 — 아래 그림에서 가운데 (0, 0) 과 주인공 (0, -200) 의 자리를 눈으로 확인해 봐요.\n\n" +
      "그래서 주인공을 왼쪽으로 옮기려면 x 를 줄이고(-20), 오른쪽으로 옮기려면 x 를\n" +
      "늘리면(+20) 돼요. 오늘 첫 기능이 바로 이거예요.",
    kind: "note",
    // 좌표평면 그림 — 가운데 (0,0), 오른쪽 x 커짐·왼쪽 작아짐, 위 y 커짐·아래 작아짐, 주인공은 (0,-200).
    imageUrl: "/turtle-coord.svg",
    imageAlt: "좌표평면 그림 — 가운데가 (0, 0), 오른쪽으로 갈수록 x 가 커지고 왼쪽으로 갈수록 작아지며, 위로 갈수록 y 가 커지고 아래로 갈수록 작아진다. 주인공은 아래쪽 (0, -200) 에 있다.",
    // 넓은 화면에선 설명(왼쪽) · 좌표평면(오른쪽) 좌우 배치, 스마트폰 폭에선 설명 아래로 쌓인다.
    imageSide: "right",
    maxLength: 0,
  },

  /* ── ② 게임 분석 (도메인 분석): 필요한 구성요소와 하는 일 ── */
  {
    key: "_dg_analyze_intro",
    phase: "problem",
    label: "② 게임을 뜯어보기 — 무엇이 필요할까?",
    hint:
      "똥피하기 게임을 만들려면 무엇무엇이 필요한지 '구성요소' 로 뜯어봐요. 방금 다 같이 본\n" +
      "똥피하기를 떠올리면 쉬워요(맨 위 [똥피하기 시뮬레이션 보기] 로 다시 봐도 돼요).\n\n" +
      "아래 문장은 각 구성요소가 '하는 일' 을 설명한 거예요. 빈칸에 알맞은 낱말을 채워 봐요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "dg_components",
    phase: "problem",
    label: "게임 구성요소 분석",
    hint:
      "각 구성요소가 게임에서 하는 일이에요. 빈칸을 보기에서 골라 채우고, " +
      "아래 [AI 채점 받기] 로 맞는지 확인해 봐요.",
    kind: "cloze",
    // 문장은 그대로 보이고, □ 자리는 4지선다 드롭다운이 된다. blanks 의 answer 는 서버 전용 —
    // 학생 화면엔 보기만 가고(student/lesson 이 answer 를 뗌), 채점은 서버(cloze-grade)가 한다.
    // clozeGrade: true → 아래에 AI 채점 단추(제미나이: 맞으면 칭찬·틀리면 힌트).
    clozeLines: [
      {
        key: "player",
        text: "주인공(플레이어) — □로 움직여 똥을 피한다",
        blanks: [{ options: ["좌우", "위아래", "대각선", "제자리"], answer: "좌우" }],
      },
      {
        key: "poop",
        text: "똥(장애물) — □에서 □로 떨어진다",
        blanks: [
          { options: ["아래", "위", "옆", "가운데"], answer: "위" },
          { options: ["위", "왼쪽", "아래", "오른쪽"], answer: "아래" },
        ],
      },
      {
        key: "coord",
        text: "좌표(위치) — 주인공·똥이 화면 어디에 있는지 (□, □)",
        blanks: [
          { options: ["y", "z", "x", "r"], answer: "x" },
          { options: ["x", "z", "r", "y"], answer: "y" },
        ],
      },
      {
        key: "collision",
        text: "충돌(부딪힘) — □이 □에게 닿았는지",
        blanks: [
          { options: ["주인공", "똥", "벽", "점수"], answer: "똥" },
          { options: ["똥", "벽", "주인공", "점수"], answer: "주인공" },
        ],
      },
      {
        key: "score",
        text: "점수 — □ 올라간다",
        blanks: [
          {
            options: ["맞은 만큼", "움직인 만큼", "가만히 있은 만큼", "피한 만큼"],
            answer: "피한 만큼",
          },
        ],
      },
      {
        key: "bound",
        text: "화면 경계 — □이 밖으로 못 나가게",
        blanks: [{ options: ["똥", "주인공", "점수", "하늘"], answer: "주인공" }],
      },
    ],
    clozeGrade: true,
    // 빈칸 값들을 줄 key 별 배열로 묶어 JSON 한 칸에 저장(cloze-field). 넉넉히 1,000 안쪽.
    maxLength: 1000,
  },

  /* ── 구현 — 세 단계로 쌓아 완성한다 (터틀 예제) ──
   * 설계(만들 순서 정하기) 단계는 뺐다 — 구현 순서는 교사가 이미 정해 뒀다(아크 설계). 분석 다음
   * 바로 구현으로 간다. 한 번에 다 치면 벅차서, 1) 배치 → 2) 왼쪽(답 제시) → 3) 오른쪽(직접 채우기)
   * 로 쌓는다. 각 단계 코드는 앞 단계를 포함한 '지금까지의 전체 코드' 다(복사해 실행하면 바로 돈다).
   *
   * 실행 편집기 = OneCompiler 터틀(https://onecompiler.com/turtle) — 교사 확정, 14·15·16차와 동일.
   * 링크가 붙어도 이 단계(build)는 focusExempt 라 새 탭 이탈 오탐이 안 난다. 세 카드 모두 링크를 둔다.
   */
  {
    key: "_dg_impl_place",
    phase: "build",
    label: "플레이어를 가운데 하단에 놓기",
    hint:
      "먼저 주인공(네모)을 화면 아래 가운데에 놓아요. 아래 코드에 ★★★ 네 곳이 비어 있어요.\n" +
      "[OneCompiler 터틀 열기] 로 편집기를 새 탭에서 열고, 채워 실행해 봐요(주석이 힌트!).\n\n" +
      "· player.shape(\"★★★\") — 네모의 영어 이름 (14·15차 터틀에서 썼죠).\n" +
      "· player.★★★() — 선을 안 그리고 이동만 (pen 을 up 하기).\n" +
      "· player.goto(★★★, ★★★) — 앞에서 배운 좌표! 가로는 가운데·세로는 아래쪽 = 0, -200.\n\n" +
      "네모 주인공이 화면 아래 가운데에 뜨면 성공!",
    kind: "note",
    code: CODE_IMPL_PLACE,
    linkUrl: "https://onecompiler.com/turtle",
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "_dg_impl_left",
    phase: "grill",
    label: "왼쪽으로 이동하기",
    hint:
      "이제 왼쪽 이동을 직접 만들어요. go_left 함수 안의 ★★★ 두 곳을 채워, 실행하고\n" +
      "왼쪽 방향키(←)를 눌러 봐요. 주인공이 왼쪽으로 움직이면 성공!\n\n" +
      "· player.★★★() — 주인공의 '지금 x 좌표를 읽는' 함수 (x coordinate → xcor).\n" +
      "· player.★★★(x - 20) — x 좌표를 그 값으로 '옮기는' 함수 (set x → setx). 왼쪽은 x 를 20 줄여요.\n\n" +
      "방향키 연결(onkeypress)은 이미 돼 있어요 — 함수 안 두 줄만 채우면 됩니다.",
    kind: "note",
    code: CODE_IMPL_LEFT,
    linkUrl: "https://onecompiler.com/turtle",
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "_dg_impl_right",
    phase: "wrapmap",
    label: "오른쪽으로 이동하기 (직접 채우기)",
    hint:
      "마지막은 직접 만들어요! go_right 함수 안이 비어 있어요(★★★ 두 줄). 바로 위 go_left 를 본떠\n" +
      "두 줄을 채워요 — 오른쪽은 x 를 20 '늘리면' 돼요(go_left 는 줄였죠).\n\n" +
      "· 첫 줄: go_left 처럼 지금 x 좌표를 읽어요.\n" +
      "· 둘째 줄: 이번엔 x 에 20 을 '더한' 자리로 옮겨요 (왼쪽은 x - 20 이었어요).\n\n" +
      "[OneCompiler 터틀 열기] 로 채워 실행하고, 오른쪽 방향키(→)로도 움직이면 완성! 다음 시간엔 '똥 떨어뜨리기' 를 붙여요.",
    kind: "note",
    code: CODE_IMPL_RIGHT,
    linkUrl: "https://onecompiler.com/turtle",
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "똥피하기 게임 — 분석 + 구현",
  moodCheckEnabled: true,

  // 대기 게임 — 17차는 '테트리스'. 오늘 분석 대상인 똥피하기와 겹치지 않게 다른 게임을 둔다
  // (똥피하기 다시하기 링크는 아래 게임 분석 카드에 따로 붙어 대기 게임과 별개다).
  game: {
    heading: "기다리는 동안 — 테트리스",
    body:
      "수업이 시작되길 기다리는 동안 잠깐 쉬어요.\n" +
      "떨어지는 블록을 돌리고 옮겨 줄을 채워 봐요.\n" +
      "수업이 시작되면 이 화면은 저절로 넘어가요.",
    url: "https://tetris-game-seven-nu.vercel.app/",
  },
  gameExplainer: empty(),

  // 다음 시간(progress) 단계는 두지 않는다 — 안내(assessment)가 이미 있어 중복이다.
  progress: empty(),

  /*
   * 안내 보드 — 오늘 순서(분석 → 구현). 활동 중 되돌아와 볼 수 있다.
   */
  assessment: {
    heading: "오늘 할 일 — 똥피하기를 뜯어보고, 만들기 시작",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "뜯어보고, 바로 만들어요",
        note:
          "지난 세 시간에 파이썬을 맛보고, 게임에 쓸 터틀 함수를 찍어보고 직접 타이핑해 봤죠? 오늘부터\n" +
          "그 함수들을 합쳐 익숙한 똥피하기 게임을 직접 만들기 시작해요. 오늘은 게임을 뜯어보고(분석),\n" +
          "첫 기능 하나(주인공 좌우 이동)를 구현합니다.",
        rows: [
          { label: "분석", value: "게임을 구성요소로 뜯어보기 — 무엇이 필요한가" },
          { label: "구현", value: "주인공을 그리고 방향키로 좌우로 움직이기" },
          { label: "채점은", value: "점수·자동채점 없어요. 뜯어보고 따라 만들면 됩니다" },
        ],
        highlights: [
          "코드부터 치지 않아요. 먼저 게임을 구성요소로 뜯어보는 것도 '만들기' 의 중요한 부분이에요.",
        ],
      },
      {
        label: "오늘 순서",
        subtitle: "좌표 → 분석 → 구현",
        note: "활동지가 위에서 아래로 이어져요. 순서대로 내려오면 됩니다.",
        rows: [
          { label: "1", value: "화면 좌표(x·y) 알기 — 어디에 있는지 숫자로 말하기" },
          { label: "2", value: "게임 분석 — 구성요소가 하는 일 빈칸 채우기 + AI 채점" },
          { label: "3", value: "구현 — 주인공 좌우 이동(1단계 배치 → 2단계 왼쪽 → 3단계 오른쪽 직접 채우기)" },
          { label: "마지막", value: "성찰 한두 줄" },
        ],
        highlights: [
          "오늘은 첫 기능(좌우 이동)까지만 만들어요. 나머지는 다음 시간부터 하나씩 붙여요.",
        ],
      },
    ],
  },

  video: empty(),

  /*
   * 성찰 — 쪼개서 구현한 소감. 개인적이라 비공개.
   */
  reflectionQuestions: ["게임을 바로 만들지 않고 구성요소로 쪼개서 구현하니 어땠나요?"],
  reflectionPublic: false,

  /*
   * 외부 새 탭 링크가 붙은 단계는 창을 옮겨도 이탈로 세지 않는다 (14·15·16차와 같은 이유).
   * 분석(problem)엔 똥피하기 시뮬레이션 링크, 구현 세 단계(build·grill·wrapmap)엔 OneCompiler
   * 터틀 링크가 있다.
   */
  focusExempt: ["problem", "build", "grill", "wrapmap"],
  /*
   * 기분(mood)은 단계에서 뺀다 — 기분은 대기 화면에서 먼저 받으므로(moodCheckEnabled 켜 둠)
   * 별도 단계가 중복이다. phaseOrder 에 mood 를 안 적으면 교사 대시보드 단추(availablePhase)도,
   * 학생 되돌아가기 줄(backPhases 가 phaseOrder 를 존중)도 기분을 안 띄운다. 마음 톡톡 6회기와 같은 방식.
   *
   * 단계: 분석(problem) → 구현 1·2·3단계(build·grill·wrapmap). 구현도 한 번에 안 하고 셋으로 쪼갰다
   * (배치 → 왼쪽 → 오른쪽 직접 채우기). 설계(만들 순서 정하기)는 뺐다 — 구현 순서는 교사가 이미
   * 정해 뒀다. 선택과목이 쓰는 범용 슬롯을 빌려 쓰고 이름은 phaseLabels 로 붙인다(문항 있는 단계만 뜸).
   */
  phaseOrder: ["waiting", "assessment", "problem", "build", "grill", "wrapmap", "reflection"],
  phaseLabels: {
    assessment: "안내",
    problem: "분석",
    build: "구현 1단계",
    grill: "구현 2단계",
    wrapmap: "구현 3단계",
  },
  /*
   * 되돌아가기 켬 — 학생이 안내·활동지 사이를 스스로 오갈 수 있다. 교사는 분석 → 구현 1·2·3단계
   * 순으로 단추로 몬다.
   */
  freeNavigation: true,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리는 차시가 아니다 — 비우면 글만/기록만 하는 활동으로 잡는다
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "똥피하기 게임 — 뜯어보고, 첫 기능 만들기",
      body:
        "위에서부터 순서대로 해요. 좌표를 알고, 게임을 구성요소로 뜯어본 뒤,\n" +
        "첫 기능(주인공 좌우 이동)을 터틀로 만들어 봅니다.",
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
     * lessonNo 17 은 아크에 「찍어보기」(15)·「직접 타이핑」(16)이 끼며 생긴 슬롯이라 예전
     * 점유자가 없다. 그래도 다시 돌릴 때 옛 필드가 섞이지 않도록 progress·progressChecks·quiz 를
     * 명시 삭제해 둔다(이 차시엔 셋 다 없다).
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (게임 제작 아크 공용 통 — 이후 구현 차시가 이어 씀. 입문/맛보기 통 python-intro·직접 타이핑 통 python-typing 과 분리)`);
  console.log("단계: 대기(테트리스) → 안내(assessment) → 분석(problem) → 구현 1단계(build) → 구현 2단계(grill) → 구현 3단계(wrapmap) → 성찰. 설계(만들 순서)는 뺌 — 구현 순서는 교사가 미리 정함. 기분은 대기 화면에서만 받고 별도 단계는 없음(phaseOrder 에서 뺌, moodCheckEnabled 는 켜 둠).");
  console.log("분석(problem): 먼저 함께 보기(똥피하기 시뮬레이션 /demo 링크, 맨 위) + 좌표 note + 게임 분석 설명 + 구성요소 빈칸 채우기(cloze, 4지선다 드롭다운 + AI 채점). 구현: 1단계 배치 / 2단계 왼쪽(답제시) / 3단계 오른쪽(직접 채우기) — 각각 교사가 단추로 넘기는 별도 단계.");
  console.log("focusExempt: problem·build·grill·wrapmap(외부 링크 있는 단계). 모든 단계가 같은 통(python-dodge-game) 한 artifact 에 함께 저장. freeNavigation.");
  console.log("분석 칸(dg_components, cloze): 6문장의 빈칸을 4지선다 드롭다운으로 고르고 [AI 채점 받기](제미나이) — 맞음/틀림은 서버가 정답 대조, 틀린 칸은 AI 힌트. 정답은 서버 전용(student/lesson 이 뗌). 주인공=좌우/똥=위·아래/좌표=x·y/충돌=똥·주인공/점수=피한 만큼/화면 경계=주인공.");
  console.log("구현 3단계(모두 ★★★ 빈칸 직접 채우기): 1 배치(shape·penup·goto 좌표 채움) → 2 go_left(xcor·setx 채움)+왼쪽키 → 3 go_right(두 줄 직접 채움, go_left 본떠 x+20)+오른쪽키. 각 단계 code 는 앞 단계 포함 전체. OneCompiler 터틀로 실행.");
  console.log("파이썬 터틀 실행: OneCompiler 터틀(https://onecompiler.com/turtle) — 구현 3단계 카드마다 새 탭 링크. 14·15·16차와 같은 편집기.");
  console.log("성찰 1문항(구성요소로 쪼개 구현한 소감). 진도 팝업 없음. quiz 없음. galleryEnabled: false.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
