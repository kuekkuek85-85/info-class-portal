/**
 * 19차시 차시 계획 등록 — 「똥피하기 게임 — 충돌 처리」.
 *
 *   node --env-file=.env.local scripts/seed-lesson19.ts
 *   node --env-file=.env.local scripts/seed-lesson19.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 18차에 바로 이어지는 차시 (같은 통, 같은 게임)
 *
 * 18차에서 똥을 만들고 떨어뜨리고, 바닥에 닿으면 다시 맨 위로 보내게 만들었다. 오늘은 그 코드 위에
 * **주인공과 똥이 부딪혔는지(충돌)** 를 붙인다. 분석·설계는 17차에서 끝냈으니 이 시간에도 분석(cloze)
 * 단계 없이 바로 구현 세 단계로 간다:
 *   1단계(build)  — 충돌 감지해서 멈추기 (distance 로 거리 재서 가까우면 return)
 *   2단계(grill)  — "GAME OVER!" 글씨 (충돌하면 화면 가운데에 write; OneCompiler 터틀 한글 깨짐 → 영문)
 *   3단계(emotion)— 게임 끝나면 주인공도 멈추기 (global over 플래그 + 가드)
 *
 * ## 활동 통(activityId) — 17·18차와 같은 통을 이어 씀
 *
 * `python-dodge-game` — 게임 제작 아크 공용 통. 17차 분석·설계·주인공 이동, 18차 똥 떨어뜨리기 기록
 * 위에 오늘 충돌 기록이 같은 문서에 이어 쌓인다. 입문/맛보기 통(python-intro)·직접 타이핑 통(python-typing)·
 * 실습 통(physical-computing)·디지털 윤리 통(digital-ethics)과 물리적으로 다른 문서다.
 *
 * ## 표준 — 대기=파이썬 타자 도우미, 게임=성찰 보상(테트리스)
 *
 * 대기 화면은 게임이 아니라 파이썬 타자 도우미 링크(game.url="link:..."). 게임(테트리스)은
 * 성찰 '제출하고 게임하기' 보상(rewardGame)으로 주되, **구현 1·2·3단계** AI 채점을 모두 통과해야 열린다.
 * 구현 3단계(주인공 멈추기)도 필수라 게이트(requires)에 넣는다 — 세 단계를 다 통과해야 게임이 열린다.
 * 구현은 ★★★ 빈칸 + AI 채점(ai_feedback, feedbackVariant "code", checkGoal 서버전용).
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
const LESSON_NO = 19;

/** 18차와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/**
 * **게임 제작 아크 공용 통.** 17·18차와 같은 통 — 똥피하기 분석·설계·구현 차시가 한 문서에 이어 쓴다.
 * 오늘 '충돌 처리' 기록이 18차 똥 떨어뜨리기 기록 위에 같은 artifact 에 쌓인다.
 */
const ACTIVITY_ID = "python-dodge-game";

/* ──────────────────────────────────────────────────────────────
 * 구현 예제 코드 — 18차 결과(주인공 + 똥 떨어뜨리기/재등장) 위에 충돌 처리를 **세 단계로 쌓아** 붙인다.
 * 각 단계 code 는 앞 단계를 포함한 '지금까지의 전체 코드' 다.
 *   1단계: 충돌 감지해서 멈추기 — fall 안 ★★★(distance·return) 채우기 (20은 주어짐, 가까우면 멈춤)
 *   2단계: "게임 오버!" 글씨 — 충돌 if 안 ★★★(write·28) 채우기 (GAME OVER! 주어짐, 터틀 한글 깨짐 → 영문)
 *   3단계: 게임 끝나면 주인공도 멈추기 — over 가드 ★★★(over·over·True) 채우기 (global)
 * ────────────────────────────────────────────────────────────── */
const CODE_IMPL_HIT = `import turtle
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

# 똥 만들기 (18차에서 만든 것)
poop = turtle.Turtle()
poop.shape("circle")
poop.penup()
poop.goto(0, 250)
poop.color("brown")         # 갈색 똥 (18차에서 넣은 것)

# 똥 떨어뜨리기 + 바닥 닿으면 다시 위로 (18차에서 만든 것)
def fall():
    y = poop.ycor()
    poop.sety(y - 5)
    if poop.ycor() < -250:
        poop.goto(random.randint(-180, 180), 250)
    # 충돌 — 똥이 주인공에 닿으면(가까우면) 멈추기
    if poop.★★★(player) < 20:      # 똥과 주인공 거리를 재서 20보다 가까우면 = 닿은 것 (20은 이미 적혀 있어요)
        ★★★                        # 여기서 멈추는 핵심 — ontimer 를 안 부르니 똥이 그 자리에 멈춰요
    screen.ontimer(fall, 50)

screen.listen()
screen.onkeypress(go_left, "Left")
screen.onkeypress(go_right, "Right")

fall()  # 떨어지기 시작!

screen.mainloop()`;

const CODE_IMPL_OVER = `import turtle
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

# 똥 만들기 (18차에서 만든 것)
poop = turtle.Turtle()
poop.shape("circle")
poop.penup()
poop.goto(0, 250)
poop.color("brown")         # 갈색 똥 (18차에서 넣은 것)

# 똥 떨어뜨리기 + 바닥 닿으면 다시 위로 (18차에서 만든 것)
def fall():
    y = poop.ycor()
    poop.sety(y - 5)
    if poop.ycor() < -250:
        poop.goto(random.randint(-180, 180), 250)
    # 충돌 — 똥이 주인공에 닿으면 게임 오버! (1단계에서 distance·return 을 채운 상태)
    if poop.distance(player) < 20:
        over_writer = turtle.Turtle()
        over_writer.hideturtle()
        over_writer.★★★("GAME OVER!", align="center", font=("", ★★★, "bold"))  # 화면 가운데(0,0)에 크게
        return
    screen.ontimer(fall, 50)

screen.listen()
screen.onkeypress(go_left, "Left")
screen.onkeypress(go_right, "Right")

fall()  # 떨어지기 시작!

screen.mainloop()`;

const CODE_IMPL_STOP = `import turtle
import random

screen = turtle.Screen()
screen.setup(400, 500)

# 주인공 (17차에서 만든 것)
player = turtle.Turtle()
player.shape("square")
player.penup()
player.goto(0, -200)

over = False   # 게임이 끝났나?

def go_left():
    if ★★★:        # 게임이 끝났으면(over 가 참이면) 안 움직여요
        return
    x = player.xcor()
    player.setx(x - 20)

def go_right():
    if ★★★:
        return
    x = player.xcor()
    player.setx(x + 20)

# 똥 만들기 (18차에서 만든 것)
poop = turtle.Turtle()
poop.shape("circle")
poop.penup()
poop.goto(0, 250)
poop.color("brown")         # 갈색 똥 (18차에서 넣은 것)

# 똥 떨어뜨리기 + 바닥 닿으면 다시 위로 + 충돌 (1·2단계에서 채운 상태)
def fall():
    y = poop.ycor()
    poop.sety(y - 5)
    if poop.ycor() < -250:
        poop.goto(random.randint(-180, 180), 250)
    if poop.distance(player) < 20:
        global over
        over = ★★★     # 게임 끝! 참(True)으로 바꾸기
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
// 활동지 — 분석(cloze) 단계 없음. 구현 3단계만, 교사가 단추로 하나씩 몬다.
//   · 구현 1단계(build)   — 충돌 감지해서 멈추기 (distance·return ★★★, 20은 주어짐, 가까우면 멈춤)
//   · 구현 2단계(grill)   — "GAME OVER!" 글씨 (write·28 ★★★; GAME OVER! 주어짐, 터틀 한글 깨짐 → 영문)
//   · 구현 3단계(emotion) — 게임 끝나면 주인공도 멈추기 (over 가드·True ★★★, global)
// 각 단계 = note(누적 전체 코드 + OneCompiler 터틀 링크) + 제출칸(long) + AI 채점(ai_feedback, code).
// 모든 단계가 같은 활동 통(python-dodge-game) 한 문서에 함께 저장된다 (18차 기록 위에 쌓임).
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── 구현 1단계 — 충돌 감지해서 멈추기 ── */
  {
    key: "_dg19_impl_hit",
    phase: "build",
    label: "충돌 감지해서 멈추기",
    hint:
      "18차에서 만든 똥 떨어뜨리기 코드 위에 '충돌' 을 붙여요. 똥이 주인공에 닿으면 멈추게 만들어요.\n" +
      "fall 함수 안(재등장 if 다음, ontimer 앞)의 ★★★ 두 곳을 채우고 실행해 봐요(주석이 힌트!).\n\n" +
      "· poop.★★★(player) — 똥과 주인공 '사이 거리를 재 주는' 함수 (distance).\n" +
      "· < 20 — 그 거리가 20보다 작으면 '닿은 것' (20은 이미 적혀 있어요).\n" +
      "· 그 아래 줄 ★★★ — 여기서 멈추는 핵심! return 을 적어요.\n\n" +
      "※ return 하면 그 아래 screen.ontimer(fall, 50) 을 안 불러요. ontimer 를 안 부르면 fall 이\n" +
      "   다시 예약되지 않아 똥이 그 자리에 뚝 멈춰요.",
    kind: "note",
    // 설명(왼쪽) · 실행 결과 그림(오른쪽 1/3), 그 아래 코드 — 18차와 같은 배치. 갈색 똥·검정 주인공으로 구분.
    imageUrl: "/dodge19-impl1.svg",
    imageAlt: "실행 결과 — 갈색 동그라미 똥이 아래 가운데의 검정 네모 주인공에 닿아 그 자리에 멈춘 모습.",
    imageSide: "right",
    imageSideWidth: "third",
    code: CODE_IMPL_HIT,
    linkUrl: "https://onecompiler.com/turtle",
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "dg19_impl1_submit",
    phase: "build",
    label: "✍ 완성한 코드 제출 (1단계)",
    hint: "OneCompiler 에서 완성한 코드를 복사해 붙여넣어 주세요.",
    kind: "long",
    maxLength: 900,
  },
  {
    key: "dg19_impl1_check",
    phase: "build",
    label: "AI 채점 — 맞게 채웠는지 확인",
    hint: "위에 붙여넣은 코드를 AI가 봐줘요. 충돌 감지 ★★★ 두 곳(distance 와 return)을 바르게 채웠으면 통과! 20은 이미 적혀 있어요. distance 는 두 거북 사이 거리를 재 주는 함수, return 하면 ontimer 를 안 불러 멈춰요.",
    kind: "ai_feedback",
    feedbackVariant: "code",
    feedbackFields: [{ key: "dg19_impl1_submit", label: "완성한 코드" }],
    checkGoal:
      "똥이 주인공에 닿았는지 보고 닿으면 멈추는 코드다. 20 은 이미 주어졌고, 두 ★★★ 가 이렇게 채워져야 맞다: " +
      "poop.distance(player)(두 거북 사이 거리) 와 return(멈추는 핵심). 즉 if poop.distance(player) < 20: 다음 줄이 return " +
      "(ontimer 안 부름 → 멈춤). ★★★ 가 남으면 틀림.",
    maxLength: 2000,
  },

  /* ── 구현 2단계 — "게임 오버!" 글씨 ── */
  {
    key: "_dg19_impl_over",
    phase: "grill",
    label: "\"GAME OVER!\" 글씨 띄우기",
    hint:
      "이제 똥이 닿으면 화면 가운데에 'GAME OVER!' 라고 크게 써요. 충돌 if 안의 ★★★ 두 곳을 채워요\n" +
      "(멈추기 return 과 충돌 감지 distance 는 1단계에서 채운 상태예요).\n\n" +
      "· over_writer.★★★(\"GAME OVER!\", ...) — 화면에 글씨를 써 주는 함수 (write).\n" +
      "· font=(\"\", ★★★, \"bold\") — 글자 크기(폰트 크기)예요. 크게 보이게 28 을 넣어요.\n\n" +
      "글자 내용 'GAME OVER!' 는 이미 적혀 있어요 — 영어예요. (OneCompiler 터틀은 한글을 네모(□)로\n" +
      "깨뜨려서, 글씨는 영어로 줬어요.)\n" +
      "write 는 거북이 있는 자리(여기선 0,0 = 화면 가운데)에 글씨를 써 주고, align=\"center\" 는 가운데 정렬이에요.",
    kind: "note",
    // 설명(왼쪽) · 실행 결과 그림(오른쪽 1/3), 그 아래 코드 — 18차와 같은 배치.
    imageUrl: "/dodge19-impl2.svg",
    imageAlt: "실행 결과 — 똥이 주인공에 닿고 화면 가운데에 GAME OVER! 글씨가 크게 뜬 모습.",
    imageSide: "right",
    imageSideWidth: "third",
    code: CODE_IMPL_OVER,
    linkUrl: "https://onecompiler.com/turtle",
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "dg19_impl2_submit",
    phase: "grill",
    label: "✍ 완성한 코드 제출 (2단계)",
    hint: "OneCompiler 에서 완성한 코드를 복사해 붙여넣어 주세요.",
    kind: "long",
    maxLength: 900,
  },
  {
    key: "dg19_impl2_check",
    phase: "grill",
    label: "AI 채점 — 맞게 채웠는지 확인",
    hint: "위에 붙여넣은 코드를 AI가 봐줘요. ★★★ 두 곳(write 와 28)을 바르게 채웠으면 통과! GAME OVER! 는 이미 주어졌어요. write 는 화면에 글씨를 쓰는 함수, 28 은 글자 크기예요.",
    kind: "ai_feedback",
    feedbackVariant: "code",
    feedbackFields: [{ key: "dg19_impl2_submit", label: "완성한 코드" }],
    checkGoal:
      "똥이 닿으면 화면 가운데에 게임 오버 글씨를 쓰는 코드다. \"GAME OVER!\" 는 이미 주어졌고, 두 ★★★ 가 " +
      "write(화면에 글씨 쓰는 함수) 와 28(글자 크기)로 채워져야 맞다. 즉 over_writer.write(\"GAME OVER!\", " +
      "align=\"center\", font=(\"\", 28, \"bold\")). ★★★ 가 남으면 틀림.",
    maxLength: 2000,
  },

  /* ── 구현 3단계 — 게임 끝나면 주인공도 멈추기 ── */
  /* 개념 설명 note — 코드 빈칸 앞에 참/거짓과 = vs == 를 쉬운 말로 짚는다(중1). */
  {
    key: "_dg19_impl_stop_concept",
    phase: "emotion",
    label: "잠깐 — 참/거짓(True/False) 과 = vs == 알고 가기",
    hint:
      "3단계에는 새 낱말이 나와요. 코드를 채우기 전에 셋만 쉽게 알고 가요.\n\n" +
      "1) True 와 False = 참 과 거짓. 전등 스위치처럼 생각해요 — True 는 켜짐, False 는 꺼짐.\n" +
      "   게임 처음엔 over = False (아직 안 끝남, 꺼짐), 똥에 닿으면 over = True (끝남, 켜짐) 로 바꿔요.\n\n" +
      "2) = 와 == 는 완전히 달라요 (여기서 제일 중요해요).\n" +
      "   · = 는 '넣기(저장)' 예요. over = True 는 over 라는 상자에 True 를 넣는 거예요.\n" +
      "   · == 는 '같은지 물어보기(비교)' 예요. over == True 는 'over 가 True 랑 같아?' 하고 확인해서\n" +
      "     참이나 거짓을 내놓아요. (== 를 비교 연산자라고 불러요.)\n\n" +
      "3) if over: 는 'over 가 참이면 아래를 실행해' 라는 뜻이에요. over 자체가 이미 참/거짓 값이라,\n" +
      "   if over: 와 if over == True: 는 같은 뜻이에요. 그래서 3단계 빈칸은 둘 다 정답이고,\n" +
      "   짧게 if over: 라고만 써도 충분해요.\n\n" +
      "이제 아래 코드의 ★★★ 세 곳(가드 둘, 그리고 over = True)을 채워 봐요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_dg19_impl_stop",
    phase: "emotion",
    label: "게임 끝나면 주인공도 멈추기",
    hint:
      "이 단계까지 완성해야 게임이 열려요.\n\n" +
      "지금은 게임 오버 글씨가 떠도 주인공은 계속 움직여요. 게임이 끝나면 주인공도 멈추게 만들어요.\n" +
      "over 라는 '스위치' 를 하나 두고, 충돌하면 켜요(True). 주인공 이동 함수는 스위치가 켜져 있으면\n" +
      "안 움직이게 막아요. ★★★ 세 곳(go_left·go_right 맨 위 둘, 충돌 때 하나)을 채워요.\n\n" +
      "· go_left·go_right 맨 위 if ★★★: return — '게임이 끝났으면 안 움직이기'. 스위치 이름 그대로 over.\n" +
      "  (over 만 써도 되고 over == True 라고 써도 돼요 — if over: 와 if over == True: 는 같은 뜻이에요.)\n" +
      "· 충돌 때 over = ★★★ — 게임 끝! 스위치를 참으로 켜요(True). 바깥 변수를 함수 안에서 바꾸려면\n" +
      "  바로 윗줄 global over 가 필요해요(이미 적혀 있어요).\n\n" +
      "세 ★★★ 가 over · over · True (또는 앞 둘을 over == True)면 성공! 이제 똥에 닿으면 주인공이 더는 안 움직여요.",
    kind: "note",
    // 설명(왼쪽) · 실행 결과 그림(오른쪽 1/3), 그 아래 코드 — 18차와 같은 배치.
    imageUrl: "/dodge19-impl3.svg",
    imageAlt: "실행 결과 — 게임이 끝나 GAME OVER! 가 뜨고 주인공과 똥이 모두 멈춘 모습.",
    imageSide: "right",
    imageSideWidth: "third",
    code: CODE_IMPL_STOP,
    linkUrl: "https://onecompiler.com/turtle",
    linkLabel: "OneCompiler 터틀 편집기 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "dg19_impl3_submit",
    phase: "emotion",
    label: "✍ 완성한 코드 제출 (3단계)",
    hint: "OneCompiler 에서 완성한 코드를 복사해 붙여넣어 주세요.",
    kind: "long",
    maxLength: 900,
  },
  {
    key: "dg19_impl3_check",
    phase: "emotion",
    label: "AI 채점 — 맞게 채웠는지 확인",
    hint: "위에 붙여넣은 코드를 AI가 봐줘요. over 가드·True ★★★ 세 곳을 바르게 채웠으면 통과! over 는 게임이 끝났는지 기억하는 스위치, 바깥 변수를 함수 안에서 바꾸려면 global over, 끝나면 주인공 움직임을 if over: return 으로 막아요. (if over: 와 if over == True: 는 같은 뜻이라 둘 다 정답.)",
    kind: "ai_feedback",
    feedbackVariant: "code",
    feedbackFields: [{ key: "dg19_impl3_submit", label: "완성한 코드" }],
    checkGoal:
      "게임이 끝나면 주인공도 못 움직이게 하는 코드다. go_left·go_right 맨 위의 if 조건 ★★★ 는 over 또는 over == True 둘 다 맞다" +
      "(파이썬에서 if over: 와 if over == True: 는 같은 뜻). 충돌 때 세 번째 ★★★ 는 True(over = True 로 게임 종료 표시, global over 로 바꿈). " +
      "즉 앞의 두 가드는 over(또는 over == True), 마지막은 True 여야 맞다. ★★★ 가 남으면 틀림.",
    maxLength: 2000,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "똥피하기 게임 — 충돌 처리",
  moodCheckEnabled: true,

  // 대기 화면 = 파이썬 타자 도우미 (게임 대신). url 이 "link:" 로 시작하면 설명+새 탭 링크 카드로 뜬다.
  // 게임(테트리스)은 성찰 단계 보상(rewardGame)으로 옮겼다 — 활동을 마친 상으로 준다.
  game: {
    heading: "기다리는 동안 — 파이썬 타자 연습",
    body:
      "오늘도 코드를 직접 타이핑해요. 그 전에 파이썬 타자 도우미로 손을 풀어 봐요.\n" +
      "poop.distance, GAME OVER!, global over 처럼 오늘 쓸 파이썬 낱말을 빠르고 정확하게 치는 연습이에요.\n" +
      "아래 버튼을 누르면 새 탭에서 열려요. 수업이 시작되면 이 화면은 저절로 넘어가요.",
    url: "link:https://python-typing-helper.vercel.app/",
  },
  gameExplainer: empty(),

  /*
   * 보상 게임 — 성찰 '제출하고 게임하기' 를 누르면, 구현 1·2·3단계 AI 채점을 모두 통과했을 때만 테트리스가
   * 열린다. 구현 3단계(주인공 멈추기)도 필수라 requires 에 넣는다 — 세 단계를 다 통과해야 게임이 열린다.
   * 빠진 게 있으면 그 단계로 바로 가는 안내 팝업이 뜬다.
   */
  rewardGame: {
    heading: "테트리스",
    body: "오늘 활동을 다 끝냈어요 — 쉬는 시간으로 테트리스 한 판! 수업이 끝나면 정리해요.",
    url: "https://tetris-game-seven-nu.vercel.app/",
    // 게이트는 '제출' 이 아니라 'AI 채점 통과(verdict good)' 로 본다 — 별표 코드 복붙 제출을 막는다.
    // 구현 1·2·3단계 AI 채점을 모두 통과해야 게임이 열린다 (3단계도 필수).
    requires: [
      { key: "dg19_impl1_check", label: "구현 1단계", phase: "build" },
      { key: "dg19_impl2_check", label: "구현 2단계", phase: "grill" },
      { key: "dg19_impl3_check", label: "구현 3단계", phase: "emotion" },
    ],
  },

  // 다음 시간(progress) 단계는 두지 않는다 — 안내(assessment)가 이미 있어 중복이다.
  progress: empty(),

  /*
   * 안내 보드 — 오늘 순서(구현 1·2·3단계). 활동 중 되돌아와 볼 수 있다.
   */
  assessment: {
    heading: "오늘 할 일 — 부딪히면 게임 오버!",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "떨어지는 똥에 이어, 이번엔 충돌을 붙여요",
        note:
          "지난 시간에 똥이 위에서 떨어지게 만들었죠? 오늘은 그 코드 위에 '충돌' 을 붙여서\n" +
          "똥이 주인공에 닿으면 게임이 끝나게 만들어요. 분석·설계는 이미 끝냈으니, 오늘도 바로\n" +
          "구현만 세 단계로 쪼개 직접 채웁니다.",
        rows: [
          { label: "오늘 더할 것", value: "똥이 주인공에 닿으면 게임 오버! (지난 시간 똥 코드 위에 이어 붙여요)" },
          { label: "구현", value: "충돌 감지(멈추기) → 게임 오버 글씨 → 주인공 멈추기, 세 단계로 빈칸 채우기" },
          { label: "채점은", value: "성적·등급 없어요 — 각 단계를 AI가 맞는지 봐줘요" },
        ],
        highlights: [
          "지난 시간 똥 떨어뜨리기 코드에 오늘 충돌을 이어 붙여요 — 같은 파일이 점점 진짜 게임이 되어 가요.",
        ],
      },
      {
        label: "오늘 순서",
        subtitle: "충돌 감지 → 게임 오버 글씨 → 주인공 멈추기",
        note: "선생님이 한 단계씩 넘겨 줘요. 각 단계에서 활동지의 ★★★ 를 채워 실행하면 됩니다.",
        rows: [
          { label: "1", value: "충돌 감지 — 똥이 주인공에 닿으면(거리 가까우면) 멈추기(★★★ 채우기)" },
          { label: "2", value: "게임 오버 글씨 — 닿으면 화면 가운데에 'GAME OVER!' 크게 쓰기(★★★ 채우기)" },
          { label: "3", value: "주인공 멈추기 — 게임이 끝나면 주인공도 안 움직이게(★★★ 채우기)" },
          { label: "마지막", value: "성찰 한 줄 → 세 단계 모두 통과하면 테트리스!" },
        ],
        highlights: [
          "오늘로 '똥을 피하다 닿으면 끝' 이 완성돼요. 세 단계를 모두 완성해 봐요!",
        ],
      },
    ],
  },

  video: empty(),

  /*
   * 성찰 — 두 개체의 충돌을 알려면 무엇(거리)을 측정해야 하는지 돌아본다. 개인적이라 비공개.
   */
  reflectionQuestions: ["두 개체 간의 충돌 여부는 무엇을 측정해야 알 수 있나요?"],
  reflectionPublic: false,

  /*
   * 외부 새 탭 링크가 붙은 단계는 창을 옮겨도 이탈로 세지 않는다 (18차와 같은 이유).
   * 구현 세 단계(build·grill·emotion)엔 OneCompiler 터틀 링크, 대기(waiting)엔 파이썬 타자 링크가 있다.
   */
  focusExempt: ["waiting", "build", "grill", "emotion"],
  /*
   * 기분(mood)은 단계에서 뺀다 — 기분은 대기 화면에서 먼저 받으므로(moodCheckEnabled 켜 둠)
   * 별도 단계가 중복이다. 분석(problem) 단계는 이 차시엔 없다(17차에서 분석을 끝냄).
   *
   * 단계: 안내(assessment) → 구현 1·2·3단계(build·grill·emotion) → 성찰(reflection).
   * 구현을 한 번에 안 하고 셋으로 쪼갰다(충돌 감지 → 게임 오버 글씨 → 주인공 멈추기). 범용 슬롯을 빌려
   * 쓰고 이름은 phaseLabels 로 붙인다(문항 있는 단계만 뜸). 3단계(emotion)도 필수라 게이트(requires)에 넣는다.
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
      heading: "똥피하기 게임 — 충돌 처리",
      body:
        "위에서부터 순서대로 해요. 지난 시간 똥 떨어뜨리기 코드 위에 충돌을 감지해서\n" +
        "멈추고, 게임 오버 글씨를 띄우고, 주인공도 멈추는 기능을 한 단계씩 붙입니다.",
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

    /* 18차와 같은 규칙 — 아직 아무도 안 들어온 수업에만 반영한다 */
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (게임 제작 아크 공용 통 — 17·18차와 같은 통. 오늘 '충돌 처리' 기록이 18차 똥 떨어뜨리기 기록 위에 같은 문서에 쌓임)`);
  console.log("단계: 대기(파이썬 타자 도우미 링크) → 안내(assessment) → 구현 1단계(build) → 구현 2단계(grill) → 구현 3단계(emotion) → 성찰(보상 게임: 구현 1·2·3단계 AI 채점 모두 통과하면 테트리스 — 3단계도 게이트에 포함). 분석(cloze)은 17차에서 끝냄. 기분은 대기 화면에서만.");
  console.log("구현 3단계(모두 ★★★ 빈칸 직접 채우기, 누적 전체 코드): 1 충돌 감지(distance·return 으로 멈춤, 20은 주어짐) → 2 게임 오버 글씨(write·28 채우기, \"GAME OVER!\" 주어짐 — OneCompiler 터틀 한글 깨짐 → 영문) → 3 주인공 멈추기(over·over·True + global). 각 단계 code 는 앞 단계 포함 전체. OneCompiler 터틀로 실행.");
  console.log("focusExempt: waiting·build·grill·emotion(타자/외부 링크 단계). 모든 단계가 같은 통(python-dodge-game) 한 artifact 에 함께 저장. freeNavigation(보상 게이트 이동·복귀에 필요).");
  console.log("각 단계 AI 채점(제미나이, feedbackVariant code): 붙여넣은 코드를 checkGoal 로 판정(통과/힌트). 별표 코드 복붙 제출을 막는다. 보상 게이트는 '제출' 이 아니라 'AI 채점 통과(verdict good)' 로 본다. 3단계도 필수라 게이트에 포함.");
  console.log("성찰 1문항(두 개체 충돌 여부는 무엇을 측정해야 아나 = 거리). 진도 팝업 없음. quiz 없음. galleryEnabled: false. sourcesEnabled: false.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
