/**
 * 20차시 차시 계획 등록 — 「똥피하기 게임 — 똥 여러 개(리스트)」.
 *
 *   node --env-file=.env.local scripts/seed-lesson20.ts
 *   node --env-file=.env.local scripts/seed-lesson20.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 19차에 바로 이어지는 차시 (같은 통, 같은 게임)
 *
 * 19차까지 똥 하나(poop)로 떨어뜨리기·충돌·게임 오버·주인공 멈춤을 완성했다. 오늘은 그 코드 위에
 * **똥을 리스트(list)로 여러 개** 만들어 다 같이 떨어뜨린다. '노가다 → 리스트 개념 → 구현' 네 단계로 간다:
 *   문제 인식(problem) — 리스트/반복 없이 똥 3개를 poop1·poop2·poop3 로 '따로' 만든 완성본의 문제점 찾기(서술, AI 채점 없음)
 *   리스트 개념(mvp)   — 변수 여러 개 vs 리스트(개념 자료 + 미니 예시 nums=[10,20,30]·for) + 형성평가 객관식 1문항(cloze+AI 채점)
 *   구현 2단계(build)  — 똥 여러 개 만들기(리스트에 담기): poops=[] · for range(3) · append
 *   구현 3단계(grill)  — 리스트의 똥을 다 떨어뜨리기 + 각자 충돌: for poop in poops · distance(19차 재사용)
 *
 * ## 활동 통(activityId) — 17·18·19차와 같은 통을 이어 씀
 *
 * `python-dodge-game` — 게임 제작 아크 공용 통. 오늘 '똥 여러 개' 기록이 19차 충돌 기록 위에 같은
 * 문서에 이어 쌓인다. 입문/맛보기(python-intro)·직접 타이핑(python-typing)·실습(physical-computing)·
 * 디지털 윤리(digital-ethics) 통과 물리적으로 다른 문서다.
 *
 * ## 표준 — 19차와 동일
 *
 * 대기 화면은 파이썬 타자 도우미 링크(game.url="link:..."). 게임(테트리스)은 성찰 '제출하고 게임하기'
 * 보상(rewardGame)으로 주되, 구현 2·3단계 AI 채점을 통과해야 열린다(코딩 두 단계가 핵심이라 둘 다 게이트).
 * 구현은 ★★★ 빈칸 + AI 채점(ai_feedback, feedbackVariant "code", checkGoal 서버전용). freeNavigation 켬.
 * 각 구현 단계 note 는 18·19차식 '설명 왼쪽·실행결과 그림 오른쪽'(imageSide right, imageSideWidth third).
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
const LESSON_NO = 20;

/** 18·19차와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/**
 * **게임 제작 아크 공용 통.** 17·18·19차와 같은 통 — 오늘 '똥 여러 개(리스트)' 기록이 19차 충돌
 * 기록 위에 같은 artifact 에 쌓인다.
 */
const ACTIVITY_ID = "python-dodge-game";

/* ──────────────────────────────────────────────────────────────
 * 노가다 코드 — 리스트/반복문 없이 똥 3개를 poop1·poop2·poop3 로 각각 '따로' 만든 완성본.
 * 17~19차의 주인공·over·go_left/go_right 를 그대로 품고, 똥 3개는 '만들고 꾸미고 자리 잡는' 다섯 줄을
 * 변수 이름만 바꿔 세 번 되풀이한다(중복). 실제로 돌아가며, 결과는 '똥 3개 맨 위'(리스트 버전과 같음).
 * ★★★ 없음 — 고칠 코드가 아니라 '문제점을 찾아보는' 코드다.
 * ────────────────────────────────────────────────────────────── */
const CODE_NOGADA = `import turtle
import random

screen = turtle.Screen()
screen.setup(400, 500)

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

poop1 = turtle.Turtle()
poop1.shape("circle")
poop1.penup()
poop1.color("brown")
poop1.goto(-120, 200)

poop2 = turtle.Turtle()
poop2.shape("circle")
poop2.penup()
poop2.color("brown")
poop2.goto(0, 200)

poop3 = turtle.Turtle()
poop3.shape("circle")
poop3.penup()
poop3.color("brown")
poop3.goto(120, 200)

screen.listen()
screen.onkeypress(go_left, "Left")
screen.onkeypress(go_right, "Right")

screen.mainloop()`;

/* ──────────────────────────────────────────────────────────────
 * 리스트 개념용 미니 예시 코드 — 게임이 아니라 '리스트+for' 를 한눈에 보여주는 가장 작은 예.
 * 숫자 세 개를 리스트 하나에 담고 for 로 한 번만 써서 셋 다 출력한다. 실행하면 10/20/30 이 차례로 나온다.
 * ────────────────────────────────────────────────────────────── */
const CODE_LIST_MINI = `# 숫자 세 개를 리스트 하나에 담기
nums = [10, 20, 30]

# 리스트에서 하나씩 꺼내며 — 한 번만 써도 셋 다!
for n in nums:
    print(n)`;

/* ──────────────────────────────────────────────────────────────
 * 구현 예제 코드 — 19차 결과(단일 똥 + 충돌/게임오버/주인공 멈춤) 위에 '똥 여러 개(리스트)'를 두 단계로 쌓는다.
 * 각 단계 code 는 앞 단계를 포함한 '지금까지의 전체 코드' 다.
 *   구현 2단계: 똥 여러 개 만들기 — ★★★(poops=[] · append) 채우기 (range(3) 주어짐). 3개가 흩어져 생김(아직 안 떨어짐).
 *   구현 3단계: 다 떨어뜨리기 + 충돌 — ★★★(for poop in poops · distance) 채우기 (20 주어짐). 3개 동시에 내려오며 각자 충돌.
 * ────────────────────────────────────────────────────────────── */
const CODE_IMPL_LIST = `import turtle
import random

screen = turtle.Screen()
screen.setup(400, 500)

# 주인공 (17차에서 만든 것)
player = turtle.Turtle()
player.shape("square")
player.penup()
player.goto(0, -200)

over = False   # 게임이 끝났나? (19차에서 만든 것)

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

# 똥 여러 개를 리스트에 담기 — 빈 리스트에 3개를 만들어 넣어요
poops = ★★★                 # 빈 리스트 (아직 아무것도 없음)
for i in range(3):
    poop = turtle.Turtle()
    poop.shape("circle")
    poop.penup()
    poop.color("brown")
    poop.goto(random.randint(-180, 180), 200)  # 맨 위(y=200)에, x만 서로 다른 자리에서
    poops.★★★(poop)          # 방금 만든 똥을 리스트에 담기

screen.listen()
screen.onkeypress(go_left, "Left")
screen.onkeypress(go_right, "Right")

screen.mainloop()`;

const CODE_IMPL_FALLALL = `import turtle
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

# 똥 여러 개를 리스트에 담기 (1단계에서 만든 것)
poops = []
for i in range(3):
    poop = turtle.Turtle()
    poop.shape("circle")
    poop.penup()
    poop.color("brown")
    poop.goto(random.randint(-180, 180), 200)
    poops.append(poop)

# 리스트의 똥을 하나씩 다 떨어뜨리기 + 각자 충돌 검사
def fall():
    for poop in ★★★:             # 앞에서 똥을 담아 둔 그 리스트에서 똥을 하나씩 꺼내 반복
        y = poop.ycor()
        poop.sety(y - 5)
        if poop.ycor() < -250:
            poop.goto(random.randint(-180, 180), 250)
        if poop.★★★(player) < 20:  # 그 똥과 주인공 거리를 재서 20보다 가까우면 = 닿은 것
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
// 활동지 — 분석(cloze) 단계 없음(17차에서 끝냄). 네 단계를 교사가 단추로 하나씩 몬다.
//   · 문제 인식(problem) — '노가다' 완성본(리스트 없이 똥 3개 따로 만들기)의 문제점 찾기 (서술, AI 채점 없음)
//   · 리스트 개념(mvp)   — 개념 자료 + 미니 예시(리스트+for) + 형성평가 객관식 1문항(cloze 드롭다운 + AI 채점)
//   · 구현 2단계(build)  — 똥 여러 개 만들기(리스트): poops=[] · append ★★★ (range(3) 주어짐)
//   · 구현 3단계(grill)  — 리스트의 똥을 다 떨어뜨리기 + 충돌: for poop in poops · distance ★★★ (20 주어짐)
// 구현 두 단계 = note(누적 전체 코드 + 실행결과 그림(오른쪽 1/3) + OneCompiler 터틀 링크) + 제출칸(long) + AI 채점(code).
// 모든 단계가 같은 활동 통(python-dodge-game) 한 문서에 함께 저장된다 (19차 기록 위에 쌓임).
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── 문제 인식 — '노가다'로 만들어 보니? (리스트/반복문 없이 똥 3개를 따로 만든 완성본의 문제점 찾기) ── */
  {
    key: "_dg20_nogada",
    phase: "problem",
    label: "노가다로 만들어 보니? — 똥 3개를 따로따로",
    hint:
      "아래는 '똥 3개' 를 화면 맨 위에 만드는, 실제로 돌아가는 완성 코드예요. 그런데 리스트도 반복문도 안 쓰고,\n" +
      "똥을 poop1·poop2·poop3 로 '하나씩 따로' 만들었어요 — 만들고(Turtle), 동그라미로 바꾸고(shape),\n" +
      "펜 올리고(penup), 갈색 칠하고(color), 자리 잡는(goto) 거의 똑같은 다섯 줄을 변수 이름만 바꿔 세 번 되풀이했죠.\n\n" +
      "코드를 천천히 읽어 보고, 아래 칸에 '이 코드의 어떤 점이 문제이거나 비효율적인지' 를 네 생각대로 적어 봐요.\n" +
      "정답을 맞히는 게 아니에요 — 똥을 30개로 늘린다면 어떨까? 색을 다 바꾸려면? 하고 상상하며 느낀 점을 써도 좋아요.",
    kind: "note",
    code: CODE_NOGADA,
    maxLength: 0,
  },
  {
    key: "dg20_nogada_problem",
    phase: "problem",
    label: "✍ 이 코드의 어떤 점이 문제이거나 비효율적인가요?",
    hint: "정답은 없어요 — 떠오른 생각을 한두 줄로 자유롭게 적어 주세요.",
    kind: "long",
    maxLength: 500,
  },

  /* ── 리스트 개념 — 변수 여러 개 vs 리스트 (개념 자료 + 미니 예시 + 형성평가 객관식) ── */
  {
    key: "_dg20_list_concept",
    phase: "mvp",
    label: "변수 여러 개 vs 리스트",
    hint:
      "방금 본 노가다 코드에서, 똥 1·2·3번을 만드는 다섯 줄이 거의 똑같이 세 번 되풀이됐죠? 이렇게 변수를\n" +
      "poop1·poop2·poop3 처럼 '여러 개 따로' 두면 — 똑같은 코드가 자꾸 늘어나고(중복), 모든 똥을 한꺼번에\n" +
      "다루기도 어려워요(색을 다 바꾸려면 세 줄, 30개면 서른 줄!).\n\n" +
      "이럴 때 쓰는 게 '리스트(list)' 예요. 여러 데이터를 상자 하나에 담아 묶고, 한꺼번에 관리하는 자료구조죠.\n" +
      "이름은 하나(poops)지만 그 안에 똥 여러 개가 칸칸이 들어가요. 아래 그림에서 왼쪽(따로따로)과\n" +
      "오른쪽(한 상자)을 견줘 봐요.",
    kind: "note",
    // 개념 도식 — 왼쪽 '변수 3개 따로' vs 오른쪽 '리스트 1개(한 상자에 3칸)'. 설명 아래에 넓게 깐다.
    imageUrl: "/list-concept-boxes.svg",
    imageAlt: "왼쪽은 poop1·poop2·poop3 라는 상자 셋이 따로 있고, 오른쪽은 poops 라는 상자 하나 안에 [0][1][2] 세 칸이 있어 똥이 각각 들어 있는 비교 그림.",
    maxLength: 0,
  },
  {
    key: "_dg20_list_mini",
    phase: "mvp",
    label: "리스트로 묶으면 — 아주 작은 예시",
    hint:
      "게임이 아니라 숫자로 먼저 느껴 봐요. 숫자 세 개를 리스트 하나(nums)에 담고, for 로 하나씩 꺼내 출력해요.\n" +
      "print 를 한 번만 썼는데도 10 → 20 → 30 이 차례로 다 나와요 — 이게 '리스트 + for' 의 힘이에요.\n\n" +
      "만약 리스트 없이 썼다면 num1·num2·num3 를 따로 만들고 print 를 세 번 써야 했겠죠? 똥도 똑같아요.\n" +
      "다음 단계부터 이 방법으로 똥을 여러 개 만들어 볼 거예요.",
    kind: "note",
    code: CODE_LIST_MINI,
    // 설명(왼쪽) · 실행 결과(오른쪽 1/3) — 10/20/30 이 출력되는 화면.
    imageUrl: "/list-concept-run.svg",
    imageAlt: "출력 창에 10, 20, 30 이 세 줄로 차례로 찍힌 실행 결과.",
    imageSide: "right",
    imageSideWidth: "third",
    maxLength: 0,
  },
  {
    key: "dg20_list_quiz",
    phase: "mvp",
    label: "형성평가 — 리스트, 왜 좋을까?",
    hint: "보기 중 하나를 골라 'AI 채점 받기' 를 눌러 봐요. 방금 본 노가다 코드와 리스트를 떠올리면 금방 알 수 있어요.",
    kind: "cloze",
    clozeGrade: true,
    clozeLines: [
      {
        key: "q1",
        text: "poop1·poop2·poop3 처럼 변수를 따로 쓰는 대신 리스트로 묶으면 좋은 점은 → □",
        blanks: [
          {
            options: [
              "똥이 더 빨리 떨어져 피하기 어려워진다",
              "똥 색깔이 똥마다 저절로 다르게 바뀐다",
              "중복 코드가 줄고 여러 개를 한꺼번에 다룬다",
              "코드 줄 수가 오히려 더 많아지고 복잡해진다",
            ],
            answer: "중복 코드가 줄고 여러 개를 한꺼번에 다룬다",
          },
        ],
      },
    ],
    maxLength: 0,
  },

  /* ── 구현 2단계 — 똥 여러 개 만들기(리스트에 담기) ── */
  {
    key: "_dg20_impl_list",
    phase: "build",
    label: "똥 여러 개 만들기 (리스트에 담기)",
    hint:
      "19차에서 똥 하나(poop)로 게임을 만들었죠? 이번엔 똥을 여러 개로 늘려요. 하나하나 따로 두면\n" +
      "복잡하니, '리스트' 라는 상자에 똥 여러 개를 담아요. 똥을 만드는 곳(poops = ... 와 for 반복)의 ★★★ 두 곳을 채워요.\n\n" +
      "· poops = ★★★ — 아무것도 안 든 '빈 리스트' 로 시작해요. 리스트는 대괄호로 묶죠? 아무것도\n" +
      "  안 넣고 대괄호만 열었다 바로 닫으면 '빈 리스트(아직 아무것도 없음)' 예요.\n" +
      "· for i in range(3): — 아래를 3번 되풀이해서 똥을 3개 만들어요 (range(3) 은 이미 적혀 있어요).\n" +
      "· poops.★★★(poop) — 방금 만든 똥을 리스트 맨 뒤에 '덧붙이는(추가하는)' 함수예요 — '덧붙이다' 를 뜻하는 영어 단어.\n\n" +
      "x 는 랜덤이고 y 는 200(화면 맨 위)으로 고정해 둬서, 실행하면 갈색 똥 3개가 화면 맨 위에\n" +
      "가로로 흩어져 나란히 생기면 성공! (아직 안 떨어져요 — 떨어뜨리기는 다음 단계예요.)",
    kind: "note",
    // 설명(왼쪽) · 실행 결과 그림(오른쪽 1/3), 그 아래 코드 — 18·19차와 같은 배치. 갈색 똥·검정 주인공.
    imageUrl: "/dodge20-impl1.svg",
    imageAlt: "실행 결과 — 갈색 동그라미 똥 3개가 화면 맨 위 한 줄에 서로 다른 x 자리로 나란히 생기고, 아래 가운데에 검정 네모 주인공이 있는 모습(아직 안 떨어짐).",
    imageSide: "right",
    imageSideWidth: "third",
    code: CODE_IMPL_LIST,
    linkUrl: "https://onecompiler.com/turtle",
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "dg20_impl1_submit",
    phase: "build",
    label: "✍ 완성한 코드 제출 (구현 2단계)",
    hint: "OneCompiler 에서 완성한 코드를 복사해 붙여넣어 주세요.",
    kind: "long",
    maxLength: 900,
  },
  {
    key: "dg20_impl1_check",
    phase: "build",
    label: "AI 채점 — 맞게 채웠는지 확인",
    hint: "위에 붙여넣은 코드를 AI가 봐줘요. 리스트 ★★★ 두 곳(빈 리스트로 시작하기 · 리스트에 덧붙이는 함수)을 바르게 채웠으면 통과! range(3) 은 이미 적혀 있어요. 첫 칸은 아무것도 안 든 빈 리스트(대괄호만 열었다 닫기), 둘째 칸은 리스트 맨 뒤에 '덧붙이다' 를 뜻하는 영어 함수예요.",
    kind: "ai_feedback",
    feedbackVariant: "code",
    feedbackFields: [{ key: "dg20_impl1_submit", label: "완성한 코드" }],
    checkGoal:
      "똥을 여러 개 만들어 리스트에 담는 코드다. range(3) 은 이미 주어졌고, 두 ★★★ 가 이렇게 채워져야 맞다: " +
      "poops = [] (빈 리스트) 와 poops.append(poop) (만든 똥을 리스트에 담기). 즉 poops = [] 로 시작해 " +
      "for i in range(3): 안에서 poops.append(poop). ★★★ 가 남으면 틀림.",
    maxLength: 2000,
  },

  /* ── 구현 2단계 — 리스트의 똥을 다 떨어뜨리기 + 충돌 ── */
  {
    key: "_dg20_impl_fallall",
    phase: "grill",
    label: "리스트의 똥을 다 떨어뜨리기",
    hint:
      "이제 리스트에 담은 똥을 '하나씩 다' 떨어뜨려요. 반복문 for 로 리스트의 똥을 하나하나 꺼내\n" +
      "똑같이 처리해요 (19차에서 똥 하나에 하던 걸, 이번엔 여러 개에 다 해 주는 거예요). ★★★ 두 곳을 채워요.\n\n" +
      "· for poop in ★★★: — 앞에서 똥들을 담아 둔 그 '리스트의 이름' 을 넣어요. 거기서 똥을 하나씩 꺼내\n" +
      "  poop 이라고 부르며 반복해요 (위 코드에서 똥을 담은 리스트 이름을 그대로 보고 쓰면 돼요).\n" +
      "  이 아래 줄들은 들여쓰기(안쪽)로 써서 '각 똥마다' 실행돼요.\n" +
      "· if poop.★★★(player) < 20: — 그 똥과 주인공이 얼마나 '떨어져 있는지(거리)' 를 재 주는 함수예요 — '거리' 를 뜻하는 영어 단어(19차에서 배운 것). 20보다 가까우면 닿은 것.\n\n" +
      "닿으면 over 를 True 로 바꾸고 GAME OVER! 를 써요 (19차에서 한 것 그대로, 이미 적혀 있어요).\n" +
      "실행하면 똥 3개가 동시에 내려오고, 아무 똥에나 닿으면 게임 오버가 되면 성공!",
    kind: "note",
    imageUrl: "/dodge20-impl2.svg",
    imageAlt: "실행 결과 — 갈색 동그라미 똥 3개가 서로 다른 자리에서 동시에 아래로 내려오고, 아래 가운데에 검정 네모 주인공이 있는 모습.",
    imageSide: "right",
    imageSideWidth: "third",
    code: CODE_IMPL_FALLALL,
    linkUrl: "https://onecompiler.com/turtle",
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "dg20_impl2_submit",
    phase: "grill",
    label: "✍ 완성한 코드 제출 (구현 3단계)",
    hint: "OneCompiler 에서 완성한 코드를 복사해 붙여넣어 주세요.",
    kind: "long",
    maxLength: 900,
  },
  {
    key: "dg20_impl2_check",
    phase: "grill",
    label: "AI 채점 — 맞게 채웠는지 확인",
    hint: "위에 붙여넣은 코드를 AI가 봐줘요. ★★★ 두 곳(반복할 리스트 이름 · 두 거북 사이 거리를 재는 함수)을 바르게 채웠으면 통과! 20 은 이미 적혀 있어요. 첫 칸은 앞에서 똥을 담아 둔 리스트 이름(for 로 하나씩 반복), 둘째 칸은 두 거북이 얼마나 떨어져 있는지 재 주는 함수예요.",
    kind: "ai_feedback",
    feedbackVariant: "code",
    feedbackFields: [{ key: "dg20_impl2_submit", label: "완성한 코드" }],
    checkGoal:
      "리스트에 담은 똥을 하나씩 다 떨어뜨리고 각 똥과 주인공의 충돌을 검사하는 코드다. 20 은 이미 주어졌고, " +
      "두 ★★★ 가 이렇게 채워져야 맞다: for poop in poops: (리스트 poops 를 반복) 와 poop.distance(player) " +
      "(그 똥과 주인공 거리). 즉 for poop in poops: 로 각 똥을 내리고, if poop.distance(player) < 20: 이면 게임 오버. " +
      "★★★ 가 남으면 틀림.",
    maxLength: 2000,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "똥피하기 게임 — 똥 여러 개(리스트)",
  moodCheckEnabled: true,

  // 대기 화면 = 파이썬 타자 도우미 (게임 대신). url 이 "link:" 로 시작하면 설명+새 탭 링크 카드로 뜬다.
  // 게임(테트리스)은 성찰 단계 보상(rewardGame)으로 옮겼다 — 활동을 마친 상으로 준다.
  game: {
    heading: "기다리는 동안 — 파이썬 타자 연습",
    body:
      "오늘도 코드를 직접 타이핑해요. 그 전에 파이썬 타자 도우미로 손을 풀어 봐요.\n" +
      "turtle.Turtle(), for i in range(3), random.randint 처럼 오늘 쓸 파이썬 낱말을 빠르고 정확하게 치는 연습이에요.\n" +
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
    // 코딩 구현 두 단계(2·3단계)의 AI 채점 통과로만 연다. 문제 인식(서술)·형성평가(cloze AI 채점)는
    // 통과 상태를 서버에 저장하지 않아(화면에만 즉석 표시) 게이트로 쓸 수 없다 — 기존 17~19차 표준과 같다.
    requires: [
      { key: "dg20_impl1_check", label: "구현 2단계", phase: "build" },
      { key: "dg20_impl2_check", label: "구현 3단계", phase: "grill" },
    ],
  },

  // 다음 시간(progress) 단계는 두지 않는다 — 안내(assessment)가 이미 있어 중복이다.
  progress: empty(),

  /*
   * 안내 보드 — 오늘 순서(구현 1·2단계). 활동 중 되돌아와 볼 수 있다.
   */
  assessment: {
    heading: "오늘 할 일 — 똥을 여러 개로!",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "노가다로 먼저 겪고 → 리스트로 똑똑하게",
        note:
          "지난 시간까지 똥 하나로 피하기·충돌·게임 오버를 만들었죠? 오늘은 그 코드 위에 똥을\n" +
          "'여러 개' 로 늘려요. 그런데 먼저 '노가다' — 똥을 poop1·poop2·poop3 로 하나씩 따로\n" +
          "만들어 보고, 뭐가 불편한지 느껴 봐요. 그다음 '리스트' 라는 상자로 묶어 for 반복으로\n" +
          "한꺼번에 다루는, 더 똑똑한 방법을 배웁니다.",
        rows: [
          { label: "먼저 느낄 것", value: "리스트 없이 똥 3개를 따로 만들면? — 똑같은 코드가 자꾸 늘어나요(노가다)" },
          { label: "오늘의 열쇠", value: "리스트 — 여러 데이터를 한 상자에 담아 for 로 한꺼번에 다루는 자료구조" },
          { label: "채점은", value: "성적·등급 없어요 — 구현 단계는 AI가 맞는지 봐주고, 중간에 간단 형성평가 1문항" },
        ],
        highlights: [
          "하나씩 따로 쓰면 똥 세 개면 세 번 써야 해요. 리스트+for 면 한 번만 써도 다 돼요 — 그게 오늘의 힘!",
        ],
      },
      {
        label: "오늘 순서",
        subtitle: "문제 느끼기 → 리스트 배우기 → 만들기 → 떨어뜨리기",
        note: "선생님이 한 단계씩 넘겨 줘요. 구현 단계에서는 활동지의 ★★★ 를 채워 실행하면 됩니다.",
        rows: [
          { label: "1 문제 인식", value: "노가다 코드(똥 3개 따로 만들기)를 읽고, 어떤 점이 불편한지 한 줄 적기" },
          { label: "2 리스트 개념", value: "변수 여러 개 vs 리스트 — 개념·예시 보고 형성평가 1문항 풀기" },
          { label: "3 구현 2단계", value: "똥 여러 개 만들기 — 빈 리스트로 시작해 똥 3개를 리스트에 덧붙여 담기(★★★)" },
          { label: "4 구현 3단계", value: "다 떨어뜨리기 — 리스트의 똥을 for 로 하나씩 꺼내 내리고 충돌 검사(★★★)" },
          { label: "마지막", value: "성찰 한 줄 → 구현 2·3단계 통과하면 테트리스!" },
        ],
        highlights: [
          "오늘로 '여러 개의 똥을 피하는' 진짜 게임에 한 발 더 가까워져요.",
        ],
      },
    ],
  },

  video: empty(),

  /*
   * 성찰 — 하나씩 따로 쓰는 것과 리스트+for 의 차이를 돌아본다. 개인적이라 비공개.
   */
  reflectionQuestions: [
    "똥을 poop1·poop2·poop3처럼 하나씩 따로 만드는 것과, 리스트에 담아 for로 한꺼번에 다루는 것 — 무엇이 더 편했고, 왜 그럴까요? 한 줄로 적어 봐요.",
  ],
  reflectionPublic: false,

  /*
   * 외부 새 탭 링크가 붙은 단계는 창을 옮겨도 이탈로 세지 않는다 (18·19차와 같은 이유).
   * 구현 두 단계(build·grill)엔 OneCompiler 터틀 링크, 대기(waiting)엔 파이썬 타자 링크가 있다.
   * 문제 인식(problem)·리스트 개념(mvp)은 외부 링크가 없다(읽기용 코드·개념 그림·형성평가뿐) — 넣지 않는다.
   */
  focusExempt: ["waiting", "build", "grill"],
  /*
   * 기분(mood)은 단계에서 뺀다 — 기분은 대기 화면에서 먼저 받으므로(moodCheckEnabled 켜 둠) 별도
   * 단계가 중복이다.
   *
   * 단계: 안내(assessment) → 문제 인식(problem) → 리스트 개념(mvp) → 구현 2단계(build) → 구현 3단계(grill) → 성찰(reflection).
   * 범용 STEP 슬롯을 빌려 쓰되(problem·mvp·build·grill) 이름은 phaseLabels 로 붙인다. 이 넷은 LESSON_PHASES 에서
   * problem→mvp→build→grill 순서라, phaseOrder 에 그대로 적으면 교사 단추 줄·학생 되돌아가기 줄 모두 이 차례로 뜬다.
   */
  phaseOrder: ["waiting", "assessment", "problem", "mvp", "build", "grill", "reflection"],
  phaseLabels: {
    assessment: "안내",
    problem: "문제 인식",
    mvp: "리스트 개념",
    build: "구현 2단계",
    grill: "구현 3단계",
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
      heading: "똥피하기 게임 — 똥 여러 개(리스트)",
      body:
        "위에서부터 순서대로 해요. 지난 시간 똥 하나 코드 위에 똥을 리스트로 여러 개 만들고,\n" +
        "for 반복으로 다 같이 떨어뜨리며 각자 충돌을 검사하는 기능을 한 단계씩 붙입니다.",
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

    /* 18·19차와 같은 규칙 — 아직 아무도 안 들어온 수업에만 반영한다 */
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (게임 제작 아크 공용 통 — 17·18·19차와 같은 통. 오늘 '똥 여러 개(리스트)' 기록이 19차 충돌 기록 위에 같은 문서에 쌓임)`);
  console.log("단계: 대기(파이썬 타자 링크) → 안내(assessment) → 문제 인식(problem) → 리스트 개념(mvp) → 구현 2단계(build) → 구현 3단계(grill) → 성찰(보상 게임: 구현 2·3단계 AI 채점 통과하면 테트리스). 기분은 대기 화면에서만.");
  console.log("문제 인식(problem): 리스트/반복문 없이 똥 3개를 poop1·poop2·poop3 로 따로 만든 '노가다' 완성본(★★★ 없음, 실행됨)을 읽고 문제점을 서술(long, AI 채점 없음 — 열린 생각이라 교사가 봄).");
  console.log("리스트 개념(mvp): 개념 자료(변수 여러 개 vs 리스트, /list-concept-boxes.svg) + 미니 예시 코드(nums=[10,20,30] · for, /list-concept-run.svg) + 형성평가 객관식 1문항(cloze 드롭다운 보기 4개 + AI 채점 clozeGrade, 정답='중복 코드가 줄고 여러 개를 한꺼번에').");
  console.log("구현 2단계(★★★ 빈칸 직접 채우기, 누적 전체 코드): 2단계 똥 여러 개 만들기(poops=[] · append, range(3) 주어짐, build) → 3단계 다 떨어뜨리기+충돌(for poop in poops · distance, 20 주어짐, grill). 각 단계 code 는 앞 단계 포함 전체. 실행결과 그림(dodge20-impl1/2.svg 오른쪽 1/3). OneCompiler 터틀로 실행.");
  console.log("focusExempt: waiting·build·grill(타자/외부 링크 단계). problem·mvp 는 외부 링크 없어 제외. 모든 단계가 같은 통(python-dodge-game) 한 artifact 에 함께 저장. freeNavigation(보상 게이트 이동·복귀에 필요).");
  console.log("구현 AI 채점(제미나이, feedbackVariant code): 붙여넣은 코드를 checkGoal 로 판정(통과/힌트). 보상 게이트는 'AI 채점 통과(verdict good)' 로 본다 — 구현 2·3단계만(문제 인식·형성평가는 통과 상태 미저장이라 게이트 불가).");
  console.log("성찰 1문항(따로 만들기 vs 리스트+for — 무엇이 편했나). 진도 팝업 없음. 세션 quiz 필드 없음(형성평가는 cloze 로 활동지 안에). galleryEnabled: false. sourcesEnabled: false.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
