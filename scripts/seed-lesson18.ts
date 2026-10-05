/**
 * 18차시 차시 계획 등록 — 「똥피하기 게임 — 똥 떨어뜨리기」.
 *
 *   node --env-file=.env.local scripts/seed-lesson18.ts
 *   node --env-file=.env.local scripts/seed-lesson18.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 17차에 바로 이어지는 차시 (같은 통, 같은 게임)
 *
 * 17차에서 주인공을 놓고 좌우로 움직이게 만들었다(go_left·go_right). 오늘은 그 코드 위에
 * **똥을 떨어뜨리는 기능**을 붙인다. 분석·설계는 17차에서 끝냈으니 이 시간엔 분석(cloze) 단계
 * 없이 바로 구현 세 단계로 간다:
 *   1단계(build)  — 똥 만들기 (화면 맨 위에 turtle 하나 놓기)
 *   2단계(grill)  — 똥 떨어뜨리기 (fall 함수 + ontimer 반복)
 *   3단계(emotion)— 바닥에 닿으면 다시 맨 위로 (if 조건 + 랜덤 재등장)
 *
 * ## 활동 통(activityId) — 17차와 같은 통을 이어 씀
 *
 * `python-dodge-game` — 게임 제작 아크 공용 통. 17차 분석·설계·주인공 이동 기록 위에 오늘 똥
 * 기록이 같은 문서에 이어 쌓인다. 입문/맛보기 통(python-intro)·직접 타이핑 통(python-typing)·
 * 실습 통(physical-computing)·디지털 윤리 통(digital-ethics)과 물리적으로 다른 문서다.
 *
 * ## 표준 — 대기=파이썬 타자 도우미, 게임=성찰 보상(테트리스)
 *
 * 대기 화면은 게임이 아니라 파이썬 타자 도우미 링크(game.url="link:..."). 게임(테트리스)은
 * 성찰 '제출하고 게임하기' 보상(rewardGame)으로 주되, 구현 1·2·3단계 AI 채점을 다 통과해야
 * 열린다. 구현은 ★★★ 빈칸 + AI 채점(ai_feedback, feedbackVariant "code", checkGoal 서버전용).
 * freeNavigation 켬(보상 게이트에서 빠진 단계로 갔다가 성찰로 돌아와야 하므로).
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
const LESSON_NO = 18;

/** 17차와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/**
 * **게임 제작 아크 공용 통.** 17차와 같은 통 — 똥피하기 분석·설계·구현 차시가 한 문서에 이어 쓴다.
 * 오늘 '똥 떨어뜨리기' 기록이 17차 주인공 이동 기록 위에 같은 artifact 에 쌓인다.
 */
const ACTIVITY_ID = "python-dodge-game";

/* ──────────────────────────────────────────────────────────────
 * 구현 예제 코드 — 17차 결과(주인공 + go_left/go_right) 위에 똥을 **세 단계로 쌓아** 붙인다.
 * import random 를 맨 위에 추가. 각 단계 code 는 앞 단계를 포함한 '지금까지의 전체 코드' 다.
 *   1단계: 똥 만들기 — 똥 부분 ★★★(shape·penup·goto 의 y) 채우기
 *   2단계: 똥 떨어뜨리기 — fall 안의 ★★★(ycor·sety) 채우기 (ontimer 로 반복)
 *   3단계: 바닥 닿으면 다시 위로 — if 조건의 ★★★(-250·250) 채우기 (random 재등장)
 * ────────────────────────────────────────────────────────────── */
const CODE_IMPL_POOP = `import turtle
import random

screen = turtle.Screen()
screen.setup(400, 500)

# 주인공 (17차에서 만든 것)
player = turtle.Turtle()
player.shape("square")
player.penup()
player.goto(0, -200)

def go_left():
    x = player.xcor()
    player.setx(x - 20)

def go_right():
    x = player.xcor()
    player.setx(x + 20)

# 똥 만들기 — 화면 맨 위에 놓기
poop = turtle.Turtle()
poop.shape("★★★")          # 동그라미 모양
poop.★★★()                  # 선을 안 그리고 이동만 (주인공과 똑같이)
poop.goto(0, ★★★)            # 화면 맨 위 가운데 (y 는 위로 갈수록 커요)
poop.color("brown")         # 갈색 똥 (이미 적혀 있어요 — 검정 주인공과 구분돼요)

screen.listen()
screen.onkeypress(go_left, "Left")
screen.onkeypress(go_right, "Right")

screen.mainloop()`;

const CODE_IMPL_FALL = `import turtle
import random

screen = turtle.Screen()
screen.setup(400, 500)

# 주인공 (17차에서 만든 것)
player = turtle.Turtle()
player.shape("square")
player.penup()
player.goto(0, -200)

def go_left():
    x = player.xcor()
    player.setx(x - 20)

def go_right():
    x = player.xcor()
    player.setx(x + 20)

# 똥 만들기 — 화면 맨 위에 놓기 (1단계에서 채운 것)
poop = turtle.Turtle()
poop.shape("circle")
poop.penup()
poop.goto(0, 250)
poop.color("brown")         # 갈색 똥 (1단계에서 넣은 것)

# 똥 떨어뜨리기 — 조금씩 아래로, 계속 반복
def fall():
    y = poop.★★★()           # 지금 똥의 y 좌표를 읽어서
    poop.★★★(y - 10)         # 10만큼 아래로 (y 를 줄이면 아래로 내려가요)
    screen.ontimer(fall, 50) # 알람 맞추듯 0.05초 뒤에 fall 을 다시 — 그래서 계속 떨어져요

screen.listen()
screen.onkeypress(go_left, "Left")
screen.onkeypress(go_right, "Right")

fall()  # 떨어지기 시작!

screen.mainloop()`;

const CODE_IMPL_LOOP = `import turtle
import random

screen = turtle.Screen()
screen.setup(400, 500)

# 주인공 (17차에서 만든 것)
player = turtle.Turtle()
player.shape("square")
player.penup()
player.goto(0, -200)

def go_left():
    x = player.xcor()
    player.setx(x - 20)

def go_right():
    x = player.xcor()
    player.setx(x + 20)

# 똥 만들기 — 화면 맨 위에 놓기 (1단계)
poop = turtle.Turtle()
poop.shape("circle")
poop.penup()
poop.goto(0, 250)
poop.color("brown")         # 갈색 똥 (1단계에서 넣은 것)

# 똥 떨어뜨리기 + 바닥에 닿으면 다시 맨 위로
def fall():
    y = poop.ycor()
    poop.sety(y - 10)
    if poop.ycor() < ★★★:                        # 바닥(아래 끝)보다 더 내려가면
        poop.goto(random.randint(-180, 180), ★★★)  # 가로는 아무 데나(랜덤), 세로는 맨 위로
    screen.ontimer(fall, 50)

screen.listen()
screen.onkeypress(go_left, "Left")
screen.onkeypress(go_right, "Right")

fall()  # 떨어지기 시작!

screen.mainloop()`;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 활동지 — 분석(cloze) 단계 없음. 구현 3단계만, 교사가 단추로 하나씩 몬다.
//   · 구현 1단계(build)   — 똥 만들기 (shape·penup·goto 의 y ★★★)
//   · 구현 2단계(grill)   — 똥 떨어뜨리기 (fall 안 ycor·sety ★★★, ontimer 반복)
//   · 구현 3단계(emotion) — 바닥 닿으면 다시 위로 (if 의 -250·250 ★★★, random 재등장)
// 각 단계 = note(누적 전체 코드 + OneCompiler 터틀 링크) + 제출칸(long) + AI 채점(ai_feedback, code).
// 모든 단계가 같은 활동 통(python-dodge-game) 한 문서에 함께 저장된다 (17차 기록 위에 쌓임).
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── 구현 1단계 — 똥 만들기 ── */
  {
    key: "_dg18_impl_poop",
    phase: "build",
    label: "똥을 화면 맨 위에 만들기",
    hint:
      "17차에서 만든 주인공 코드 위에 '똥' 을 하나 더 놓아요. 아래 코드에 ★★★ 세 곳이 비어 있어요.\n" +
      "[OneCompiler 터틀 열기] 로 편집기를 새 탭에서 열고, 채워 실행해 봐요(주석이 힌트!).\n\n" +
      "· poop.shape(\"★★★\") — 동그라미의 영어 이름 (주인공은 네모 square 였죠).\n" +
      "· poop.★★★() — 선을 안 그리고 이동만. 주인공을 놓을 때 썼던 바로 그 함수예요.\n" +
      "· poop.goto(0, ★★★) — 화면 맨 위 가운데. y 는 위로 갈수록 커져요(맨 위는 +250쯤).\n\n" +
      "동그라미 똥이 화면 맨 위 가운데에 뜨면 성공!",
    kind: "note",
    // 설명(왼쪽) · 실행 결과 그림(오른쪽 1/3), 그 아래 코드 — 17차와 같은 배치. 갈색 똥·검정 주인공으로 구분.
    imageUrl: "/dodge18-impl1.svg",
    imageAlt: "실행 결과 — 검정 네모 주인공이 화면 아래 가운데에, 갈색 동그라미 똥이 화면 맨 위 가운데에 생긴 모습(아직 안 떨어짐).",
    imageSide: "right",
    imageSideWidth: "third",
    code: CODE_IMPL_POOP,
    linkUrl: "https://onecompiler.com/turtle",
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "dg18_impl1_submit",
    phase: "build",
    label: "✍ 완성한 코드 제출 (1단계)",
    hint: "OneCompiler 에서 완성한 코드를 복사해 붙여넣어 주세요.",
    kind: "long",
    maxLength: 900,
  },
  {
    key: "dg18_impl1_check",
    phase: "build",
    label: "AI 채점 — 맞게 채웠는지 확인",
    hint: "위에 붙여넣은 코드를 AI가 봐줘요. 똥을 만드는 ★★★ 세 곳을 바르게 다 채웠으면 통과! 틀리면 힌트를 줘요.",
    kind: "ai_feedback",
    feedbackVariant: "code",
    feedbackFields: [{ key: "dg18_impl1_submit", label: "완성한 코드" }],
    checkGoal:
      "똥(turtle)을 화면 맨 위에 만드는 코드다. 세 곳의 ★★★ 가 이렇게 채워져야 맞다: " +
      'poop.shape("circle")(동그라미), 선을 안 그리고 이동만 하려면 poop.penup(), 위치는 poop.goto(0, 250)' +
      "(가로 가운데·세로는 맨 위, y 는 위로 갈수록 큼). ★★★ 가 하나라도 남아 있으면 틀림.",
    maxLength: 2000,
  },

  /* ── 구현 2단계 — 똥 떨어뜨리기 (fall + ontimer 반복) ── */
  {
    key: "_dg18_impl_fall",
    phase: "grill",
    label: "똥 떨어뜨리기 (계속 반복)",
    hint:
      "이제 똥을 아래로 떨어뜨려요. fall 함수 안의 ★★★ 두 곳을 채우고 실행하면 똥이 쭉 내려가요.\n\n" +
      "· y = poop.★★★() — 똥의 '지금 y 좌표를 읽는' 함수 (y coordinate → ycor). 주인공 xcor 와 짝이에요.\n" +
      "· poop.★★★(y - 10) — y 좌표를 그 값으로 '옮기는' 함수 (set y → sety). 10 줄이면 아래로 내려가요.\n\n" +
      "※ 맨 아랫줄 screen.ontimer(fall, 50) 이 핵심이에요(이미 적혀 있어요). fall 은 똥을 '한 칸'\n" +
      "   내리는 동작이고, 이 줄은 '0.05초 뒤에 다시 한 번 내려라' 하고 알람을 맞추는 거예요. 그 알람이\n" +
      "   계속 울려서 fall → 조금 내려감 → 또 fall → 또 조금 내려감 … 이 반복되며 똥이 쉬지 않고 떨어져요.",
    kind: "note",
    imageUrl: "/dodge18-impl2.svg",
    imageAlt: "실행 결과 — 갈색 동그라미 똥이 화면 맨 위에서 아래로 쭉 내려가기를 계속 반복하는 모습. 검정 주인공은 아래 가운데 고정.",
    imageSide: "right",
    imageSideWidth: "third",
    code: CODE_IMPL_FALL,
    linkUrl: "https://onecompiler.com/turtle",
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "dg18_impl2_submit",
    phase: "grill",
    label: "✍ 완성한 코드 제출 (2단계)",
    hint: "OneCompiler 에서 완성한 코드를 복사해 붙여넣어 주세요.",
    kind: "long",
    maxLength: 900,
  },
  {
    key: "dg18_impl2_check",
    phase: "grill",
    label: "AI 채점 — 맞게 채웠는지 확인",
    hint: "위에 붙여넣은 코드를 AI가 봐줘요. fall 안의 ★★★ 두 곳을 바르게 채웠으면 통과! 틀리면 힌트를 줘요.",
    kind: "ai_feedback",
    feedbackVariant: "code",
    feedbackFields: [{ key: "dg18_impl2_submit", label: "완성한 코드" }],
    checkGoal:
      "똥을 아래로 떨어뜨리는 fall 함수를 완성한 코드다. fall 안의 ★★★ 두 곳이 이렇게여야 맞다: " +
      "y = poop.ycor()(지금 y 읽기), poop.sety(y - 10)(10 아래로). " +
      "screen.ontimer(fall, 50) 은 이미 주어져 있다. ★★★ 가 남으면 틀림.",
    maxLength: 2000,
  },

  /* ── 구현 3단계 — 바닥 닿으면 다시 맨 위로 (if + random 재등장) ── */
  {
    key: "_dg18_impl_loop",
    phase: "emotion",
    label: "바닥에 닿으면 다시 맨 위로",
    hint:
      "지금은 똥이 한 번 떨어지면 끝이에요. 바닥까지 내려가면 다시 맨 위에서 떨어지게 만들어요.\n" +
      "fall 안의 if 부분 ★★★ 두 곳을 채워요(똥 만들기·떨어뜨리기 부분은 이미 채워진 상태예요).\n\n" +
      "· if poop.ycor() < ★★★ — 똥이 화면 '아래 끝' 보다 더 내려갔는지 보는 조건. 화면 높이가 500이니\n" +
      "  아래 끝은 대략 -250 이에요(y 는 아래로 갈수록 작아져요).\n" +
      "· poop.goto(random.randint(-180, 180), ★★★) — 다시 맨 위로! 가로는 random 으로 아무 데나,\n" +
      "  세로는 1단계에서 똥을 처음 놓았던 그 맨 위 값과 같아요.\n\n" +
      "[OneCompiler 터틀 열기] 로 채워 실행하면 똥이 바닥까지 떨어졌다가 위에서 다시 랜덤하게 떨어져요!\n" +
      "다음 시간엔 '주인공과 똥이 부딪혔는지(충돌)' 를 붙여요.",
    kind: "note",
    imageUrl: "/dodge18-impl3.svg",
    imageAlt: "실행 결과 — 갈색 똥이 바닥까지 떨어진 뒤 맨 위의 다른 가로 자리로 다시 나타나 또 떨어지기를 반복하는 모습. 검정 주인공은 아래 가운데 고정.",
    imageSide: "right",
    imageSideWidth: "third",
    code: CODE_IMPL_LOOP,
    linkUrl: "https://onecompiler.com/turtle",
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "dg18_impl3_submit",
    phase: "emotion",
    label: "✍ 완성한 코드 제출 (3단계)",
    hint: "OneCompiler 에서 완성한 코드를 복사해 붙여넣어 주세요.",
    kind: "long",
    maxLength: 900,
  },
  {
    key: "dg18_impl3_check",
    phase: "emotion",
    label: "AI 채점 — 맞게 채웠는지 확인",
    hint: "위에 붙여넣은 코드를 AI가 봐줘요. if 조건의 ★★★ 두 곳을 바르게 채웠으면 통과! 틀리면 힌트를 줘요.",
    kind: "ai_feedback",
    feedbackVariant: "code",
    feedbackFields: [{ key: "dg18_impl3_submit", label: "완성한 코드" }],
    checkGoal:
      "똥이 바닥에 닿으면 맨 위로 다시 보내는 코드다. 조건은 if poop.ycor() < -250(화면 아래 끝보다 내려가면), " +
      "재등장은 poop.goto(random.randint(-180, 180), 250)(가로 랜덤, 세로 맨 위 250). " +
      "★★★ 두 곳이 -250 과 250 이어야 맞다. random.randint 는 이미 주어져 있다. ★★★ 가 남으면 틀림.",
    maxLength: 2000,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "똥피하기 게임 — 똥 떨어뜨리기",
  moodCheckEnabled: true,

  // 대기 화면 = 파이썬 타자 도우미 (게임 대신). url 이 "link:" 로 시작하면 설명+새 탭 링크 카드로 뜬다.
  // 게임(테트리스)은 성찰 단계 보상(rewardGame)으로 옮겼다 — 활동을 마친 상으로 준다.
  game: {
    heading: "기다리는 동안 — 파이썬 타자 연습",
    body:
      "오늘도 코드를 직접 타이핑해요. 그 전에 파이썬 타자 도우미로 손을 풀어 봐요.\n" +
      "import random, poop.goto, ontimer 같은 파이썬 낱말을 빠르고 정확하게 치는 연습이에요.\n" +
      "아래 버튼을 누르면 새 탭에서 열려요. 수업이 시작되면 이 화면은 저절로 넘어가요.",
    url: "link:https://python-typing-helper.vercel.app/",
  },
  gameExplainer: empty(),

  /*
   * 보상 게임 — 성찰 '제출하고 게임하기' 를 누르면, 구현 1·2·3단계 AI 채점을 다 통과했을 때만
   * 테트리스가 열린다. 빠진 게 있으면 그 단계로 바로 가는 안내 팝업이 뜬다.
   */
  rewardGame: {
    heading: "테트리스",
    body: "오늘 활동을 다 끝냈어요 — 쉬는 시간으로 테트리스 한 판! 수업이 끝나면 정리해요.",
    url: "https://tetris-game-seven-nu.vercel.app/",
    // 게이트는 '제출' 이 아니라 'AI 채점 통과(verdict good)' 로 본다 — 별표 코드 복붙 제출을 막는다.
    requires: [
      { key: "dg18_impl1_check", label: "구현 1단계", phase: "build" },
      { key: "dg18_impl2_check", label: "구현 2단계", phase: "grill" },
      { key: "dg18_impl3_check", label: "구현 3단계", phase: "emotion" },
    ],
  },

  // 다음 시간(progress) 단계는 두지 않는다 — 안내(assessment)가 이미 있어 중복이다.
  progress: empty(),

  /*
   * 안내 보드 — 오늘 순서(구현 1·2·3단계). 활동 중 되돌아와 볼 수 있다.
   */
  assessment: {
    heading: "오늘 할 일 — 똥을 떨어뜨리기",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "주인공에 이어, 이번엔 똥을 붙여요",
        note:
          "지난 시간에 주인공을 놓고 좌우로 움직이게 만들었죠? 오늘은 그 코드 위에 '똥' 을 붙여서\n" +
          "위에서 아래로 계속 떨어지게 만들어요. 분석·설계는 지난 시간에 끝냈으니, 오늘은 바로\n" +
          "구현만 세 단계로 쪼개 직접 채웁니다.",
        rows: [
          { label: "오늘 더할 것", value: "위에서 똥이 떨어지게 만들기 (주인공 코드 위에 이어 붙여요)" },
          { label: "구현", value: "똥 만들기 → 떨어뜨리기 → 바닥 닿으면 다시 위로, 세 단계로 빈칸 채우기" },
          { label: "채점은", value: "성적·등급 없어요 — 각 단계를 AI가 맞는지 봐줘요" },
        ],
        highlights: [
          "지난 시간 주인공 이동 코드에 오늘 똥을 이어 붙여요 — 같은 파일이 점점 게임이 되어 가요.",
        ],
      },
      {
        label: "오늘 순서",
        subtitle: "똥 만들기 → 떨어뜨리기 → 다시 위로",
        note: "선생님이 한 단계씩 넘겨 줘요. 각 단계에서 활동지의 ★★★ 를 채워 실행하면 됩니다.",
        rows: [
          { label: "1", value: "똥 만들기 — 화면 맨 위에 동그라미 똥을 하나 놓기(★★★ 채우기)" },
          { label: "2", value: "떨어뜨리기 — fall 함수로 조금씩 아래로, ontimer 로 계속 반복(★★★ 채우기)" },
          { label: "3", value: "다시 위로 — 바닥에 닿으면 맨 위에서 랜덤하게 또 떨어지기(★★★ 채우기)" },
          { label: "마지막", value: "성찰 한 줄 → 다 통과하면 테트리스!" },
        ],
        highlights: [
          "오늘은 똥을 떨어뜨리기까지 만들어요. 다음 시간부터 충돌·점수를 붙여요.",
        ],
      },
    ],
  },

  video: empty(),

  /*
   * 성찰 — 반복(ontimer)이 무엇을 해 주었는지 돌아본다. 개인적이라 비공개.
   */
  reflectionQuestions: ["똥이 계속 떨어지게 만들어 보니 어땠나요? (반복(ontimer)이 무엇을 해 주던가요?)"],
  reflectionPublic: false,

  /*
   * 외부 새 탭 링크가 붙은 단계는 창을 옮겨도 이탈로 세지 않는다 (17차와 같은 이유).
   * 구현 세 단계(build·grill·emotion)엔 OneCompiler 터틀 링크, 대기(waiting)엔 파이썬 타자 링크가 있다.
   */
  focusExempt: ["waiting", "build", "grill", "emotion"],
  /*
   * 기분(mood)은 단계에서 뺀다 — 기분은 대기 화면에서 먼저 받으므로(moodCheckEnabled 켜 둠)
   * 별도 단계가 중복이다. 분석(problem) 단계는 이 차시엔 없다(17차에서 분석을 끝냄).
   *
   * 단계: 안내(assessment) → 구현 1·2·3단계(build·grill·emotion) → 성찰(reflection).
   * 구현을 한 번에 안 하고 셋으로 쪼갰다(똥 만들기 → 떨어뜨리기 → 다시 위로). 범용 슬롯을 빌려
   * 쓰고 이름은 phaseLabels 로 붙인다(문항 있는 단계만 뜸).
   */
  phaseOrder: ["waiting", "assessment", "build", "grill", "emotion", "reflection"],
  phaseLabels: {
    assessment: "안내",
    build: "구현 1단계",
    grill: "구현 2단계",
    emotion: "구현 3단계",
  },
  /*
   * 되돌아가기 켬 — 보상 게이트가 빠진 단계로 보냈다가 성찰로 돌아오게 하려면 필요하다.
   * 교사는 구현 1·2·3단계 순으로 단추로 몬다.
   */
  freeNavigation: true,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리는 차시가 아니다 — 비우면 글만/기록만 하는 활동으로 잡는다
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "똥피하기 게임 — 똥 떨어뜨리기",
      body:
        "위에서부터 순서대로 해요. 지난 시간 주인공 코드 위에 똥을 만들고,\n" +
        "떨어뜨리고, 바닥에 닿으면 다시 맨 위로 보내는 기능을 한 단계씩 붙입니다.",
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
     * 다시 돌릴 때 옛 필드가 섞이지 않도록 progress·progressChecks·quiz 를 명시 삭제해 둔다
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

    /* 17차와 같은 규칙 — 아직 아무도 안 들어온 수업에만 반영한다 */
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (게임 제작 아크 공용 통 — 17차와 같은 통. 오늘 '똥 떨어뜨리기' 기록이 17차 주인공 이동 기록 위에 같은 문서에 쌓임)`);
  console.log("단계: 대기(파이썬 타자 도우미 링크) → 안내(assessment) → 구현 1단계(build) → 구현 2단계(grill) → 구현 3단계(emotion) → 성찰(보상 게임: 구현 1·2·3단계 AI 채점 다 통과하면 테트리스). 분석(cloze)은 17차에서 끝냄. 기분은 대기 화면에서만.");
  console.log("구현 3단계(모두 ★★★ 빈칸 직접 채우기, 누적 전체 코드): 1 똥 만들기(shape circle·penup·goto y) → 2 똥 떨어뜨리기(fall 안 ycor·sety + ontimer 반복) → 3 바닥 닿으면 다시 위로(if ycor < -250, goto random·250). 각 단계 code 는 앞 단계 포함 전체. OneCompiler 터틀로 실행.");
  console.log("focusExempt: waiting·build·grill·emotion(타자/외부 링크 단계). 모든 단계가 같은 통(python-dodge-game) 한 artifact 에 함께 저장. freeNavigation(보상 게이트 이동·복귀에 필요).");
  console.log("각 단계 AI 채점(제미나이, feedbackVariant code): 붙여넣은 코드를 checkGoal 로 판정(통과/힌트). 별표 코드 복붙 제출을 막는다. 보상 게이트는 '제출' 이 아니라 'AI 채점 통과(verdict good)' 로 본다.");
  console.log("성찰 1문항(반복 ontimer 이 무엇을 해 주던가요). 진도 팝업 없음. quiz 없음. galleryEnabled: false. sourcesEnabled: false.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
