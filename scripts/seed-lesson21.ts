/**
 * 21차시 차시 계획 등록 — 「똥피하기 게임 — 점수 + 난이도」.
 *
 *   node --env-file=.env.local scripts/seed-lesson21.ts
 *   node --env-file=.env.local scripts/seed-lesson21.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 20차에 바로 이어지는 차시 (같은 통, 같은 게임) — 여기까지 하면 기본 기능 완성
 *
 * 20차까지 똥을 리스트로 여러 개 떨어뜨리고 각자 충돌을 검사했다. 오늘은 그 코드 위에 **점수**와
 * **난이도(점점 빨라지기)** 를 올린다. 분석·설계는 17차에서 끝냈으니 바로 구현 두 단계로 간다:
 *   1단계(build) — 점수 세고 보여주기: score=0 · score=score+1 · clear→write (값 누적, 숫자를 글자로 str)
 *   2단계(grill) — 점점 빨라지기(난이도): speed 변수 · poop.sety(...-speed) · speed=speed+1
 *   여기까지 하면 '피하기·충돌·게임오버·점수·난이도' 기본 기능이 완성된다.
 *
 * ## 활동 통(activityId) — 17·18·19·20차와 같은 통을 이어 씀
 *
 * `python-dodge-game` — 게임 제작 아크 공용 통. 오늘 '점수·난이도' 기록이 20차 '똥 여러 개' 기록 위에
 * 같은 문서에 이어 쌓인다. 다른 통(python-intro·python-typing·physical-computing·digital-ethics)과 분리.
 *
 * ## 표준 — 18·19·20차와 동일
 *
 * 대기 화면은 파이썬 타자 도우미 링크(game.url="link:..."). 게임(테트리스)은 성찰 '제출하고 게임하기'
 * 보상(rewardGame)으로 주되, 구현 1·2단계 AI 채점을 통과해야 열린다. 구현은 ★★★ 빈칸 + AI 채점
 * (ai_feedback, feedbackVariant "code", checkGoal 서버전용). freeNavigation 켬. 각 구현 단계 note 는
 * 18·19·20차식 '설명 왼쪽·실행결과 그림 오른쪽'(imageSide right, imageSideWidth third).
 *
 * ## 화면 글씨는 영어 (OneCompiler 터틀 한글 깨짐)
 *
 * 점수 표시 write 글씨도 영어로 쓴다("Score: " + str(score)). OneCompiler 터틀은 한글을 네모(□)로
 * 깨뜨리기 때문 — 19차 "GAME OVER!" 를 영문으로 둔 것과 같은 이유다. 주석(#)은 한글이어도 괜찮다.
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
const LESSON_NO = 21;

/** 18·19·20차와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/**
 * **게임 제작 아크 공용 통.** 17·18·19·20차와 같은 통 — 오늘 '점수·난이도' 기록이 20차 '똥 여러 개'
 * 기록 위에 같은 artifact 에 쌓인다.
 */
const ACTIVITY_ID = "python-dodge-game";

/* ──────────────────────────────────────────────────────────────
 * 구현 예제 코드 — 20차 결과(똥 리스트 + for 낙하 + 충돌) 위에 '점수·난이도'를 두 단계로 쌓는다.
 * 각 단계 code 는 앞 단계를 포함한 '지금까지의 전체 코드' 다.
 *   1단계: 점수 세고 보여주기 — ★★★(score=score+1 의 1 · str(score) 의 score) 채우기.
 *   2단계: 점점 빨라지기 — ★★★(poop.sety(...-speed) 의 speed · speed=speed+1 의 1) 채우기.
 * 화면 글씨는 영어("Score: ...") — OneCompiler 터틀 한글 깨짐.
 * ────────────────────────────────────────────────────────────── */
const CODE_IMPL_SCORE = `import turtle
import random

screen = turtle.Screen()
screen.setup(400, 500)

# 주인공 (17차에서 만든 것)
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

# 똥 여러 개를 리스트에 담기 (20차에서 만든 것)
poops = []
for i in range(3):
    poop = turtle.Turtle()
    poop.shape("circle")
    poop.penup()
    poop.color("brown")
    poop.goto(random.randint(-180, 180), random.randint(250, 400))
    poops.append(poop)

# 점수 — 0부터 시작 (똥을 하나 피할 때마다 1 올려요)
score = 0

# 점수를 보여줄 글씨 터틀 (화면 위쪽). 글씨는 영어 — 터틀이 한글을 깨뜨려서
score_writer = turtle.Turtle()
score_writer.hideturtle()
score_writer.penup()
score_writer.goto(0, 210)
score_writer.write("Score: 0", align="center", font=("", 20, "bold"))

def fall():
    for poop in poops:
        poop.sety(poop.ycor() - 5)
        if poop.ycor() < -250:
            poop.goto(random.randint(-180, 180), 250)
            # 똥 하나를 피했다! 점수 1 올리고 다시 보여주기
            global score
            score = score + ★★★   # 점수에 1 더하기 (값 누적)
            score_writer.clear()   # 옛 점수를 지우고
            score_writer.write("Score: " + str(★★★), align="center", font=("", 20, "bold"))  # 새 점수를 글자로 써요
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

fall()  # 떨어지기 시작!

screen.mainloop()`;

const CODE_IMPL_SPEED = `import turtle
import random

screen = turtle.Screen()
screen.setup(400, 500)

# 주인공 (17차에서 만든 것)
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

# 똥 여러 개를 리스트에 담기 (20차에서 만든 것)
poops = []
for i in range(3):
    poop = turtle.Turtle()
    poop.shape("circle")
    poop.penup()
    poop.color("brown")
    poop.goto(random.randint(-180, 180), random.randint(250, 400))
    poops.append(poop)

score = 0
speed = 5   # 똥이 한 번에 내려오는 거리(낙하 폭). 점수가 오르면 키워요

score_writer = turtle.Turtle()
score_writer.hideturtle()
score_writer.penup()
score_writer.goto(0, 210)
score_writer.write("Score: 0", align="center", font=("", 20, "bold"))

def fall():
    global score, speed
    for poop in poops:
        poop.sety(poop.ycor() - ★★★)   # speed 만큼 내려오기 (처음 5, 점점 커짐)
        if poop.ycor() < -250:
            poop.goto(random.randint(-180, 180), 250)
            score = score + 1
            speed = speed + ★★★         # 똥 하나 피할 때마다 낙하 폭을 1 키우기 (점점 빨라짐)
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

fall()  # 떨어지기 시작!

screen.mainloop()`;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 활동지 — 분석(cloze) 단계 없음(17차에서 끝냄). 구현 2단계만, 교사가 단추로 하나씩 몬다.
//   · 구현 1단계(build) — 점수 세고 보여주기: score=score+1 의 1 · str(score) 의 score ★★★
//   · 구현 2단계(grill) — 점점 빨라지기: poop.sety(...-speed) 의 speed · speed=speed+1 의 1 ★★★
// 각 단계 = note(누적 전체 코드 + 실행결과 그림(오른쪽 1/3) + OneCompiler 터틀 링크) + 제출칸(long) + AI 채점(code).
// 모든 단계가 같은 활동 통(python-dodge-game) 한 문서에 함께 저장된다 (20차 기록 위에 쌓임).
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── 구현 1단계 — 점수 세고 보여주기 ── */
  {
    key: "_dg21_impl_score",
    phase: "build",
    label: "점수 세고 보여주기",
    hint:
      "20차에서 똥 여러 개를 떨어뜨렸죠? 이제 '점수' 를 붙여요. 똥 하나가 바닥을 지나 다시 위로\n" +
      "올라갈 때(= 하나 피한 것) 점수를 1 올리고, 화면 위쪽에 보여줘요. ★★★ 두 곳을 채워요.\n\n" +
      "· score = score + ★★★ — 점수에 1 을 더해요. '지금 점수 + 1' 을 다시 score 에 넣는 거예요(값 누적).\n" +
      "· str(★★★) — 숫자 score 를 글자로 바꿔요. 글자 'Score: ' 와 숫자는 바로 못 더하니, str 로 글자로\n" +
      "  바꿔 이어 붙여요.\n\n" +
      "score_writer.clear() 는 옛 점수를 지우고, write 로 새 점수를 써요(이미 적혀 있어요).\n" +
      "화면 글씨는 영어예요 — OneCompiler 터틀이 한글을 깨뜨려서 'Score:' 로 썼어요.\n" +
      "실행해서 똥을 피할 때마다 위쪽 숫자가 올라가면 성공!",
    kind: "note",
    // 설명(왼쪽) · 실행 결과 그림(오른쪽 1/3), 그 아래 코드 — 18·19·20차와 같은 배치.
    imageUrl: "/dodge21-impl1.svg",
    imageAlt: "실행 결과 — 화면 위쪽에 Score 숫자가 표시되고, 갈색 동그라미 똥 여러 개가 내려오며, 아래 가운데에 검정 네모 주인공이 있는 모습.",
    imageSide: "right",
    imageSideWidth: "third",
    code: CODE_IMPL_SCORE,
    linkUrl: "https://onecompiler.com/turtle",
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "dg21_impl1_submit",
    phase: "build",
    label: "✍ 완성한 코드 제출 (1단계)",
    hint: "OneCompiler 에서 완성한 코드를 복사해 붙여넣어 주세요.",
    kind: "long",
    maxLength: 1000,
  },
  {
    key: "dg21_impl1_check",
    phase: "build",
    label: "AI 채점 — 맞게 채웠는지 확인",
    hint: "위에 붙여넣은 코드를 AI가 봐줘요. ★★★ 두 곳(score = score + 1 의 1 과 str(score) 의 score)을 바르게 채웠으면 통과! score + 1 은 점수 누적, str 은 숫자를 글자로 바꿔 'Score: ' 뒤에 붙이는 거예요.",
    kind: "ai_feedback",
    feedbackVariant: "code",
    feedbackFields: [{ key: "dg21_impl1_submit", label: "완성한 코드" }],
    checkGoal:
      "똥을 하나 피할 때마다 점수를 1 올리고 화면에 보여주는 코드다. 두 ★★★ 가 이렇게 채워져야 맞다: " +
      "score = score + 1 (점수에 1 더하기, 값 누적) 와 str(score) (숫자 score 를 글자로 바꿔 'Score: ' 뒤에 붙임). " +
      "즉 score = score + 1 그리고 score_writer.write(\"Score: \" + str(score), ...). ★★★ 가 남으면 틀림.",
    maxLength: 2000,
  },

  /* ── 구현 2단계 — 점점 빨라지기(난이도) ── */
  {
    key: "_dg21_impl_speed",
    phase: "grill",
    label: "점점 빨라지기 (난이도)",
    hint:
      "마지막이에요! 점수가 오를수록 똥이 점점 빨라지게 만들어요(난이도). '속도 변수' speed 를 두고,\n" +
      "똥을 피할 때마다 speed 를 조금씩 키워요. ★★★ 두 곳을 채워요.\n\n" +
      "· poop.sety(poop.ycor() - ★★★) — 똥이 한 번에 내려오는 거리를 speed 만큼으로 바꿔요 (speed, 처음엔 5).\n" +
      "· speed = speed + ★★★ — 똥 하나를 피할 때마다 speed 를 1 키워요(점점 빨라짐).\n\n" +
      "speed = 5 와 global score, speed 는 이미 적혀 있어요. 실행해서 점수가 오를수록 똥이 더 빨리\n" +
      "떨어지면 성공! 여기까지 하면 기본 기능 완성이에요 — 진짜 게임처럼 점점 어려워져요.",
    kind: "note",
    imageUrl: "/dodge21-impl2.svg",
    imageAlt: "실행 결과 — 화면 위쪽 Score 숫자가 높고, 갈색 동그라미 똥들이 더 빠르게(길게) 내려오는 모습. 아래 가운데에 검정 네모 주인공.",
    imageSide: "right",
    imageSideWidth: "third",
    code: CODE_IMPL_SPEED,
    linkUrl: "https://onecompiler.com/turtle",
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "dg21_impl2_submit",
    phase: "grill",
    label: "✍ 완성한 코드 제출 (2단계)",
    hint: "OneCompiler 에서 완성한 코드를 복사해 붙여넣어 주세요.",
    kind: "long",
    maxLength: 1000,
  },
  {
    key: "dg21_impl2_check",
    phase: "grill",
    label: "AI 채점 — 맞게 채웠는지 확인",
    hint: "위에 붙여넣은 코드를 AI가 봐줘요. ★★★ 두 곳(poop.sety 의 - speed 와 speed = speed + 1 의 1)을 바르게 채웠으면 통과! speed 는 낙하 폭(처음 5), 똥을 피할 때마다 speed + 1 로 점점 빨라져요.",
    kind: "ai_feedback",
    feedbackVariant: "code",
    feedbackFields: [{ key: "dg21_impl2_submit", label: "완성한 코드" }],
    checkGoal:
      "점수가 오를수록 똥이 점점 빨라지는(난이도) 코드다. 두 ★★★ 가 이렇게 채워져야 맞다: " +
      "poop.sety(poop.ycor() - speed) (낙하 폭 변수 speed 만큼 내려오기) 와 speed = speed + 1 (똥을 피할 때마다 속도 1 키우기). " +
      "즉 - speed 로 떨어지고, 점수 오를 때 speed = speed + 1. global score, speed 와 speed = 5 는 이미 주어졌다. ★★★ 가 남으면 틀림.",
    maxLength: 2000,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "똥피하기 게임 — 점수 + 난이도",
  moodCheckEnabled: true,

  // 대기 화면 = 파이썬 타자 도우미 (게임 대신). url 이 "link:" 로 시작하면 설명+새 탭 링크 카드로 뜬다.
  // 게임(테트리스)은 성찰 단계 보상(rewardGame)으로 옮겼다 — 활동을 마친 상으로 준다.
  game: {
    heading: "기다리는 동안 — 파이썬 타자 연습",
    body:
      "오늘도 코드를 직접 타이핑해요. 그 전에 파이썬 타자 도우미로 손을 풀어 봐요.\n" +
      "score = score + 1, str(score), speed 처럼 오늘 쓸 파이썬 낱말을 빠르고 정확하게 치는 연습이에요.\n" +
      "아래 버튼을 누르면 새 탭에서 열려요. 수업이 시작되면 이 화면은 저절로 넘어가요.",
    url: "link:https://python-typing-helper.vercel.app/",
  },
  gameExplainer: empty(),

  /*
   * 보상 게임 — 성찰 '제출하고 게임하기' 를 누르면, 구현 1·2단계 AI 채점을 통과했을 때만 테트리스가
   * 열린다. 두 단계 다 오늘의 핵심이라 둘 다 게이트에 넣는다. 빠진 게 있으면 그 단계로 가는 팝업이 뜬다.
   */
  rewardGame: {
    heading: "테트리스",
    body: "오늘 활동을 다 끝냈어요 — 쉬는 시간으로 테트리스 한 판! 수업이 끝나면 정리해요.",
    url: "https://tetris-game-seven-nu.vercel.app/",
    // 게이트는 '제출' 이 아니라 'AI 채점 통과(verdict good)' 로 본다 — 별표 코드 복붙 제출을 막는다.
    requires: [
      { key: "dg21_impl1_check", label: "구현 1단계", phase: "build" },
      { key: "dg21_impl2_check", label: "구현 2단계", phase: "grill" },
    ],
  },

  // 다음 시간(progress) 단계는 두지 않는다 — 안내(assessment)가 이미 있어 중복이다.
  progress: empty(),

  /*
   * 안내 보드 — 오늘 순서(구현 1·2단계). 활동 중 되돌아와 볼 수 있다.
   */
  assessment: {
    heading: "오늘 할 일 — 점수와 난이도로 진짜 게임처럼!",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "점수를 세고, 점점 빨라지게 — 기본 기능 완성!",
        note:
          "지난 시간까지 똥 여러 개를 피하고 닿으면 게임 오버까지 만들었죠? 오늘은 '점수' 와 '난이도' 를\n" +
          "붙여요. 똥을 피할 때마다 점수가 오르고, 점수가 오를수록 똥이 점점 빨라져요. 여기까지 하면\n" +
          "피하기·충돌·게임오버·점수·난이도까지 기본 기능이 다 완성돼요!",
        rows: [
          { label: "오늘 더할 것", value: "점수 세기 + 점점 빨라지기(난이도) — 지난 코드 위에 이어 붙여요" },
          { label: "구현", value: "점수 세고 보여주기 → 점점 빨라지기, 두 단계로 빈칸 채우기" },
          { label: "채점은", value: "성적·등급 없어요 — 각 단계를 AI가 맞는지 봐줘요" },
        ],
        highlights: [
          "오늘로 '똥피하기' 기본 기능이 완성돼요 — 점수도 오르고 점점 어려워지는 진짜 게임!",
        ],
      },
      {
        label: "오늘 순서",
        subtitle: "점수 세고 보여주기 → 점점 빨라지기",
        note: "선생님이 한 단계씩 넘겨 줘요. 각 단계에서 활동지의 ★★★ 를 채워 실행하면 됩니다.",
        rows: [
          { label: "1", value: "점수 세고 보여주기 — 피할 때마다 score + 1, 화면 위에 Score 표시(★★★ 채우기)" },
          { label: "2", value: "점점 빨라지기 — 점수 오를수록 speed 를 키워 똥이 빨리 떨어지게(★★★ 채우기)" },
          { label: "마지막", value: "성찰 한 줄 → 1·2단계 통과하면 테트리스!" },
        ],
        highlights: [
          "여기까지가 기본 기능 완성이에요. 다음엔 내 맘대로 꾸미거나 기능을 더 붙여 볼 수 있어요.",
        ],
      },
    ],
  },

  video: empty(),

  /*
   * 성찰 — 점수·난이도를 넣어 '진짜 게임' 처럼 된 소감. 개인적이라 비공개.
   */
  reflectionQuestions: [
    "점수와 난이도(점점 빨라지기)를 넣어 '진짜 게임' 처럼 되니 어땠나요? 한 줄로 적어 봐요.",
  ],
  reflectionPublic: false,

  /*
   * 외부 새 탭 링크가 붙은 단계는 창을 옮겨도 이탈로 세지 않는다 (18·19·20차와 같은 이유).
   * 구현 두 단계(build·grill)엔 OneCompiler 터틀 링크, 대기(waiting)엔 파이썬 타자 링크가 있다.
   */
  focusExempt: ["waiting", "build", "grill"],
  /*
   * 기분(mood)은 단계에서 뺀다 — 기분은 대기 화면에서 먼저 받으므로(moodCheckEnabled 켜 둠) 별도
   * 단계가 중복이다. 분석(problem) 단계는 이 차시엔 없다(17차에서 분석을 끝냄).
   *
   * 단계: 안내(assessment) → 구현 1·2단계(build·grill) → 성찰(reflection).
   * 구현을 둘로 쪼갰다(점수 → 난이도). 범용 슬롯을 빌려 쓰고 이름은 phaseLabels 로 붙인다.
   */
  phaseOrder: ["waiting", "assessment", "build", "grill", "reflection"],
  phaseLabels: {
    assessment: "안내",
    build: "구현 1단계",
    grill: "구현 2단계",
  },
  /*
   * 되돌아가기 켬 — 보상 게이트가 빠진 단계로 보냈다가 성찰로 돌아오게 하려면 필요하다.
   * 교사는 구현 1·2단계 순으로 단추로 몬다.
   */
  freeNavigation: true,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리는 차시가 아니다 — 비우면 글만/기록만 하는 활동으로 잡는다
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "똥피하기 게임 — 점수 + 난이도",
      body:
        "위에서부터 순서대로 해요. 지난 시간 코드 위에 점수를 세어 화면에 보여주고,\n" +
        "점수가 오를수록 똥이 점점 빨라지게 만들어 기본 기능을 완성합니다.",
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

    /* 18·19·20차와 같은 규칙 — 아직 아무도 안 들어온 수업에만 반영한다 */
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (게임 제작 아크 공용 통 — 17·18·19·20차와 같은 통. 오늘 '점수·난이도' 기록이 20차 '똥 여러 개' 기록 위에 같은 문서에 쌓임)`);
  console.log("단계: 대기(파이썬 타자 도우미 링크) → 안내(assessment) → 구현 1단계(build) → 구현 2단계(grill) → 성찰(보상 게임: 구현 1·2단계 AI 채점 통과하면 테트리스). 분석(cloze)은 17차에서 끝냄. 기분은 대기 화면에서만.");
  console.log("구현 2단계(모두 ★★★ 빈칸 직접 채우기, 누적 전체 코드): 1 점수 세고 보여주기(score=score+1 의 1 · str(score) 의 score) → 2 점점 빨라지기(poop.sety(...-speed) 의 speed · speed=speed+1 의 1). 각 단계 code 는 앞 단계 포함 전체. OneCompiler 터틀로 실행. 여기까지 하면 기본 기능 완성.");
  console.log("각 구현 단계 note = 설명(왼쪽) + 실행결과 그림(오른쪽 1/3, dodge21-impl1/2.svg) + 누적 코드 + OneCompiler 링크. 18·19·20차와 같은 배치.");
  console.log("화면 글씨는 영어(\"Score: \" + str(score)) — OneCompiler 터틀 한글 깨짐(19차 GAME OVER! 와 같은 이유). 주석은 한글 OK.");
  console.log("focusExempt: waiting·build·grill. 모든 단계가 같은 통(python-dodge-game) 한 artifact 에 함께 저장. freeNavigation. 보상 게이트는 'AI 채점 통과(verdict good)' 로 본다 — 두 단계 다 핵심이라 둘 다 게이트.");
  console.log("성찰 1문항(점수·난이도로 진짜 게임처럼 된 소감). 진도 팝업 없음. quiz 없음. galleryEnabled: false. sourcesEnabled: false.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
