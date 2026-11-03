/**
 * 27차시 차시 계획 등록 — 「가위바위보 게임 만들기」 (마이크로비트 MakeCode 아크, 26차 다음).
 *
 *   node --env-file=.env.local scripts/seed-lesson27.ts
 *   node --env-file=.env.local scripts/seed-lesson27.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 26차(주사위)에 이어지는 MakeCode 아크 — 가위바위보 (새 프로그램)
 *
 * 25·26차에서 변수·대입·흔들기 이벤트·randint·if/elif/else 를 익혔다. 27차는 여기에 **버튼 입력(A/B)·
 * 로고 터치(v2)** 와 **선택 상태 변수**, 그리고 if/elif/else 로 **판정(내 패 vs AI 패)** 을 더해 '입력 →
 * 판단 → 출력' 이 다 든 작은 게임 하나를 완성한다. 26차와 달리 이어붙이기가 아니라 새 프로그램이다.
 *
 *   패 번호: 1=가위, 2=보, 3=바위.
 *   미션1(build)  버튼 A/B 로 내 패 고르기(선택 상태 변수 순환). show_hand 표시 함수는 완성 제공, A 버튼
 *                 순환만 빈칸(B 버튼은 예시로 완성 제공 — 거꾸로 따라 보기).
 *   미션2(grill)  금색 로고 터치로 AI 패 뽑기 — randint(1,3). 로고 등록·show_hand 제공, randint 만 빈칸.
 *   미션3(mvp)    판정 — if/elif/else 로 이김/비김/짐 아이콘. 비김·가위승 예시 제공, 바위승·보승 두 elif 빈칸.
 *                 끝에 MakeCode 공유(Share) 링크 제출(long).
 *   미션4(problem) 디버깅 — "비겼는데 '짐'이 떠요"(비김 갈림길 누락) 고치기 + 형성평가 2문항(randint 위치·비김 조건).
 *                 고친 코드 붙여넣기 제출(long, maxLength 6000).
 *
 * 설계 문서: docs/superpowers/specs/2026-10-31-info-lesson27-rps-design.md (교사 승인 확정본, 2026-11-04 착수).
 *
 * ## MakeCode 실측 검증 (2026-11-04, makecode.microbit.org '파이썬 보기' — Monaco setValue → 블록 전환)
 *
 *  · input.on_button_pressed(Button.A/B, 함수) — 블록('A 버튼 누를 때') 변환 확인.
 *  · ★로고 터치: input.on_logo_event(TouchButtonEvent.PRESSED, 함수) 가 '로고 눌릴 때' 블록으로 변환 확인.
 *    설계 초안이 적어 둔 TouchButton.LOGO 는 **컴파일 실패**('TouchButton' is not defined) — 쓰지 않는다.
 *    (poll 형 input.logo_is_pressed() 도 통과하나, 이벤트 형이 on_gesture/버튼과 같은 패턴이라 이벤트 형 채택.)
 *  · randint(1, 3) 전역 호출 · basic.show_icon(IconNames.HAPPY/MEH/SAD) · basic.show_leds("""…""") 멀티라인
 *    · def show_hand(n)(매개변수 함수) + 호출 · if/elif/else + == + and + global · 시작(on_start) 호출 — 모두 변환 확인(마커 0).
 *
 * 대상 1~4반 중1. 각 반 30번은 테스트 학생(리허설). 숙제 없음. seed 멱등(--force).
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
const LESSON_NO = 27;
const FORCE = process.argv.includes("--force");

/** 23~26차와 같은 MakeCode 피지컬 아크 전용 통. */
const ACTIVITY_ID = "microbit-makecode";
const MAKECODE_URL = "https://makecode.microbit.org/";

/** show_hand 표시 함수 — 지금 패(1=가위·2=보·3=바위)를 LED 로 보여준다. 미션 내내 완성 제공(반복 LED 그리기). */
const SHOW_HAND = `# show_hand: 패 번호(1=가위·2=보·3=바위)를 LED 그림으로 보여줘요 (다 돼 있어요)
def show_hand(n):
    if n == 1:
        basic.show_leds("""
            # # . . #
            # # . # .
            . . # . .
            # # . # .
            # # . . #
            """)
    elif n == 2:
        basic.show_leds("""
            . # # # .
            . # # # #
            . # # # #
            # # # # #
            # # # # #
            """)
    else:
        basic.show_leds("""
            . . . . .
            . # # # .
            . # # # .
            . # # # .
            . . . . .
            """)`;

/** A 버튼(완성형 — 미션2·3 스타터에 그대로 들어감). */
const BTN_A_DONE = `def on_button_pressed_a():
    global choice
    choice = choice + 1
    if choice > 3:
        choice = 1
    show_hand(choice)
input.on_button_pressed(Button.A, on_button_pressed_a)`;

/** B 버튼(완성형 — 반대 방향, 늘 예시로 제공). */
const BTN_B_DONE = `def on_button_pressed_b():
    global choice
    choice = choice - 1
    if choice < 1:
        choice = 3
    show_hand(choice)
input.on_button_pressed(Button.B, on_button_pressed_b)`;

/**
 * 미션1 스타터 — 버튼으로 내 패 고르기. show_hand·B버튼은 완성 제공, A버튼 순환만 빈칸.
 * (B를 '거꾸로' 따라서 A는 '다음 패로' 채운다. choice 에 1 더하고, 3 넘으면 1로.)
 */
const CODE_M1 = `# 가위바위보 — 내 패 고르기 (A·B 버튼)
# 패 번호: 1=가위, 2=보, 3=바위
choice = 1

${SHOW_HAND}

# A 버튼: 다음 패로 (가위 → 보 → 바위)
def on_button_pressed_a():
    global choice
                             # (미션) ① 다음 패로 — choice 에 1 을 더해 다시 choice 에 담기
                             # (미션) ② choice 가 3보다 커지면 다시 1 로 (if 로 되돌리기)
    show_hand(choice)
input.on_button_pressed(Button.A, on_button_pressed_a)

# B 버튼: 반대로 (가위 → 바위 → 보) — 이건 예시로 다 해 놨어요 (A를 거꾸로 따라 보기)
${BTN_B_DONE}

# 켜면 먼저 '가위' 를 보여줘요
show_hand(choice)`;

/**
 * 미션2 스타터 — 금색 로고 터치로 AI 패 뽑기. A·B·show_hand 완성, 로고 함수의 randint 만 빈칸.
 */
const CODE_M2 = `# 가위바위보 — 로고 터치로 AI 패 뽑기
# 패 번호: 1=가위, 2=보, 3=바위
choice = 1
ai = 0

${SHOW_HAND}

${BTN_A_DONE}

${BTN_B_DONE}

# 금색 로고를 터치하면 AI 가 무작위로 패를 내요
def on_logo_pressed():
    global ai
                             # (미션) AI 패 뽑기 — ai 에 1~3 중 아무 수 담기 (무작위로 하나 뽑아 주는 함수에 (1, 3))
    show_hand(ai)
input.on_logo_event(TouchButtonEvent.PRESSED, on_logo_pressed)

show_hand(choice)`;

/**
 * 미션3 스타터 — 판정. 비김(Meh)·가위가 보를 이김(Happy) 예시 제공. '바위가 가위를', '보가 바위를'
 * 이기는 두 elif 가 빈칸(지금은 그 둘이 else 로 빠져 '짐' 으로 뜬다 → 채우면 바르게 이김). 끝에 공유 링크 제출.
 */
const CODE_M3 = `# 가위바위보 — 판정 (이김 / 비김 / 짐)
# 패 번호: 1=가위, 2=보, 3=바위
choice = 1
my = 0
ai = 0

${SHOW_HAND}

${BTN_A_DONE}

${BTN_B_DONE}

def on_logo_pressed():
    global my, ai
    my = choice
    ai = randint(1, 3)
    show_hand(ai)
    basic.pause(800)
    if my == ai:
        basic.show_icon(IconNames.MEH)          # 비김 (내 패 == AI 패)
    elif my == 1 and ai == 2:
        basic.show_icon(IconNames.HAPPY)        # 가위(1)가 보(2)를 이김
                             # (미션) ① 바위(3)가 가위(1)를 이기는 경우도 더하기 (elif … HAPPY)
                             # (미션) ② 보(2)가 바위(3)를 이기는 경우도 더하기 (elif … HAPPY)
    else:
        basic.show_icon(IconNames.SAD)          # 짐
    basic.pause(1500)
input.on_logo_event(TouchButtonEvent.PRESSED, on_logo_pressed)

show_hand(choice)`;

/**
 * 미션4 디버깅 — 전체는 잘 도는데 **비겼을 때도 '짐'(Sad)** 이 뜬다. 비김(my == ai) 갈림길이 빠져서,
 * 내 패와 AI 패가 같아도 세 '이김' elif 에 안 걸려 else(SAD) 로 떨어진다. 고치기 = 비김 갈림길을
 * 맨 앞에 더하기(if my == ai: show_icon MEH) 또는 알맞은 자리에 elif 로 넣기. (25·26차 '자리' 감각 잇기.)
 */
const CODE_BUG = `# (버그) 비겼는데도 우는 얼굴('짐')이 떠요! 비김을 위한 갈림길이 빠졌어요.
# 내 패와 AI 패가 '같을 때'(my == ai)를 어디에, 무엇으로 더해야 할까요?
# 패 번호: 1=가위, 2=보, 3=바위
choice = 1
my = 0
ai = 0

${SHOW_HAND}

${BTN_A_DONE}

${BTN_B_DONE}

def on_logo_pressed():
    global my, ai
    my = choice
    ai = randint(1, 3)
    show_hand(ai)
    basic.pause(800)
    if my == 1 and ai == 2:
        basic.show_icon(IconNames.HAPPY)
    elif my == 3 and ai == 1:
        basic.show_icon(IconNames.HAPPY)
    elif my == 2 and ai == 3:
        basic.show_icon(IconNames.HAPPY)
    else:
        basic.show_icon(IconNames.SAD)
    basic.pause(1500)
input.on_logo_event(TouchButtonEvent.PRESSED, on_logo_pressed)

show_hand(choice)`;

/**
 * 미션5 바이브 베이스 — 완성형 가위바위보(미션1~3 완성형, 버그 없음). AI가 여기에 기능을 더한다.
 * ※ src/lib/vibe-code.ts 의 MICROBIT_RPS_BASE 와 **같은 문자열**이어야 한다(seed 는 server-only 모듈을
 *    import 못 해 복제함 — 한쪽을 고치면 다른 쪽도). makecode.microbit.org 에서 변환 확인(2026-11-04).
 */
const RPS_BASE = `choice = 1
my = 0
ai = 0

def show_hand(n):
    if n == 1:
        basic.show_leds("""
            # # . . #
            # # . # .
            . . # . .
            # # . # .
            # # . . #
            """)
    elif n == 2:
        basic.show_leds("""
            . # # # .
            . # # # #
            . # # # #
            # # # # #
            # # # # #
            """)
    else:
        basic.show_leds("""
            . . . . .
            . # # # .
            . # # # .
            . # # # .
            . . . . .
            """)

def on_button_pressed_a():
    global choice
    choice = choice + 1
    if choice > 3:
        choice = 1
    show_hand(choice)
input.on_button_pressed(Button.A, on_button_pressed_a)

def on_button_pressed_b():
    global choice
    choice = choice - 1
    if choice < 1:
        choice = 3
    show_hand(choice)
input.on_button_pressed(Button.B, on_button_pressed_b)

def on_logo_pressed():
    global my, ai
    my = choice
    ai = randint(1, 3)
    show_hand(ai)
    basic.pause(800)
    if my == ai:
        basic.show_icon(IconNames.MEH)
    elif my == 1 and ai == 2:
        basic.show_icon(IconNames.HAPPY)
    elif my == 3 and ai == 1:
        basic.show_icon(IconNames.HAPPY)
    elif my == 2 and ai == 3:
        basic.show_icon(IconNames.HAPPY)
    else:
        basic.show_icon(IconNames.SAD)
    basic.pause(1500)
input.on_logo_event(TouchButtonEvent.PRESSED, on_logo_pressed)

show_hand(choice)`;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 활동지 — 미션 4개: build(미션1 내 패) · grill(미션2 AI 패) · mvp(미션3 판정 + 공유 링크) ·
// problem(미션4 디버깅 + 형성평가 2문항 + 고친 코드 제출). 범용 슬롯을 빌려 쓰고 이름은 phaseLabels 로 붙인다.
// 공유 링크·코드 제출은 비공개(갤러리 off). 각 미션에 실행결과 SVG(설명 우측 1/3).
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── 미션 1 (build) — 내 패 고르기 ── */
  {
    key: "_mb27_m1",
    phase: "build",
    label: "미션 1 — A·B 버튼으로 내 패 고르기",
    hint:
      "가위바위보 게임을 만들어요! 먼저 'A·B 버튼' 으로 내 패(가위·보·바위)를 고르게 해요. 아래 '코드\n" +
      "복사하기' 로 뼈대를 복사해, MakeCode 'Python' 의 기존 코드를 모두 지우고(Ctrl+A → Delete) 맨 처음에\n" +
      "붙여넣어요. 패 번호는 1=가위, 2=보, 3=바위 예요.\n" +
      "'show_hand' 와 'B 버튼' 은 다 돼 있어요(B는 거꾸로 도는 예시예요). 'A 버튼' 함수 안 각 '# (미션)'\n" +
      "왼쪽 빈자리만 채워요:\n" +
      "   ① 다음 패로 — choice 에 1 을 더해 다시 choice 에 담아요 (25·26차에서 쓴 '1 더하기' 와 같아요).\n" +
      "   ② choice 가 3보다 커지면 다시 1 로 되돌려요 — B 버튼 예시의 'if … : choice = …' 를 거꾸로 따라 해요.\n" +
      "'global choice' 는 밖에서 만든 choice 를 함수 안에서 바꾼다는 뜻이니 그대로 둬요.\n" +
      "(아래 [MakeCode 열기] 로 새 탭에서 열고 'Python' 으로 바꾼 뒤 붙여넣어요. A·B 를 눌러 가위·보·바위가\n" +
      "바뀌면 성공!)",
    kind: "note",
    imageUrl: "/mb27-choose.svg",
    imageAlt: "마이크로비트 화면에 A·B 버튼을 누를 때마다 가위·보·바위 LED 그림이 바뀌는 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    code: CODE_M1,
    linkUrl: MAKECODE_URL,
    linkLabel: "MakeCode 열기 (새 탭)",
    maxLength: 0,
  },

  /* ── 미션 2 (grill) — AI 패(무작위) ── */
  {
    key: "_mb27_m2",
    phase: "grill",
    label: "미션 2 — 금색 로고 터치로 AI 패 뽑기",
    hint:
      "이제 상대(AI)를 만들어요. 마이크로비트 **앞면 위쪽 금색 로고를 터치**하면 AI 가 무작위로 패를 내요.\n" +
      "아래 '코드 복사하기' 로 뼈대를 복사해, MakeCode 'Python' 의 기존 코드를 모두 지우고 맨 처음에\n" +
      "붙여넣어요(A·B·show_hand 는 미션1에서 한 게 다 들어 있어요).\n" +
      "로고 함수 안 '# (미션)' 왼쪽 빈자리에 한 줄을 채워요:\n" +
      "   · AI 패 뽑기 — ai 에 1~3 중 아무 수를 담아요. 26차 주사위에서 쓴 '무작위로 하나 뽑아 주는'\n" +
      "     함수에 (1, 3) 을 넣으면 돼요. (바로 아래 show_hand(ai) 가 뽑은 패를 보여줘요.)\n" +
      "(로고 터치는 시뮬레이터에서 위쪽 금색 부분을 눌러요. 누를 때마다 AI 패가 바뀌면 성공!)",
    kind: "note",
    imageUrl: "/mb27-ai.svg",
    imageAlt: "로고를 터치하면 내 패 옆에 AI 가 무작위로 낸 패가 뜨는 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    code: CODE_M2,
    linkUrl: MAKECODE_URL,
    linkLabel: "MakeCode 열기 (새 탭)",
    maxLength: 0,
  },

  /* ── 미션 3 (mvp) — 판정 ── */
  {
    key: "_mb27_m3",
    phase: "mvp",
    label: "미션 3 — 이겼는지 판정하기 (if / elif / else)",
    hint:
      "마지막으로 '내 패 vs AI 패' 로 이김·비김·짐을 가려 얼굴로 보여줘요. 아래 '코드 복사하기' 로 뼈대를\n" +
      "복사해 MakeCode 'Python' 에 (기존 코드 모두 지우고) 붙여넣어요.\n" +
      "로고 함수 안에 '갈림길(if/elif/else)' 이 있어요. 비김(같을 때 → 그냥 얼굴)과 '가위가 보를 이김'(웃는\n" +
      "얼굴) 은 예시로 해 놨어요. 남은 두 경우를 '# (미션)' 자리에 elif 로 더해요:\n" +
      "   ① 바위(3)가 가위(1)를 이길 때 — 웃는 얼굴\n" +
      "   ② 보(2)가 바위(3)를 이길 때 — 웃는 얼굴\n" +
      "위의 '가위가 보를 이김' 줄(elif my == 1 and ai == 2:)을 똑같은 모양으로 숫자만 바꿔 따라 쓰면 돼요.\n" +
      "(안 채우면 그 두 경우는 '짐' 으로 잘못 떠요. 채우면 바르게 '이김' 이 떠요!)\n" +
      "다 되면 A·B 로 패를 정하고 로고를 터치해 승부를 봐요.",
    kind: "note",
    imageUrl: "/mb27-result.svg",
    imageAlt: "판정 결과로 웃는 얼굴(이김)·그냥 얼굴(비김)·우는 얼굴(짐)이 뜨는 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    code: CODE_M3,
    linkUrl: MAKECODE_URL,
    linkLabel: "MakeCode 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "mb27_share",
    phase: "mvp",
    label: "미션 3 — 완성한 가위바위보 공유 링크 제출",
    hint:
      "가위바위보가 되면(A·B 로 고르고 로고로 승부) MakeCode 위쪽 '공유(Share)' 를 눌러 만든 링크를\n" +
      "아래 칸에 붙여넣어요. 적으면 자동으로 저장돼요(따로 제출 버튼은 없어요).",
    kind: "long",
    maxLength: 500,
  },

  /* ── 미션 4 (problem) — 디버깅 + 형성평가 ── */
  {
    key: "_mb27_m4",
    phase: "problem",
    label: "미션 4 — 버그 고치기: 비겼는데 '짐'이 떠요",
    hint:
      "아래 코드는 거의 다 되는데, **비겼을 때도 우는 얼굴('짐')** 이 떠요. 복사해서 MakeCode 'Python' 에\n" +
      "붙여넣고 로고를 여러 번 터치해 보면 — 내 패와 AI 패가 같은데도 '짐' 이 뜨죠?\n" +
      "왜 그럴까요? '비김'(내 패와 AI 패가 같을 때 → my == ai)을 위한 갈림길이 빠져서, 세 '이김' 조건에\n" +
      "안 걸리면 전부 else('짐') 로 떨어져요. 비김 갈림길을 알맞은 자리에 더해서(같을 때 → 그냥 얼굴)\n" +
      "고쳐 보세요. (힌트: 미션3 에서는 비김을 '맨 앞' 에 뒀어요. 왜 맨 앞이 안전할까요?)\n" +
      "고쳐서 비겼을 때 '그냥 얼굴' 이 뜨면 성공! 고친 코드를 아래 '고친 코드 붙여넣기' 칸에 붙여넣어요.",
    kind: "note",
    imageUrl: "/mb27-bug.svg",
    imageAlt: "내 패와 AI 패가 둘 다 바위로 같은데도 우는 얼굴(짐)이 뜨는 고장난 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    code: CODE_BUG,
    linkUrl: MAKECODE_URL,
    linkLabel: "MakeCode 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "mb27_q1",
    phase: "problem",
    label: "퀴즈 ① — AI 패가 매번 똑같다면?",
    hint: "만약 로고를 터치해도 AI 가 매번 똑같은 패만 낸다면, 무작위로 뽑는 randint(1, 3) 은 어디에 있어야 할까요?",
    kind: "choice",
    choices: [
      "프로그램 맨 처음에 딱 한 번만 (시작할 때)",
      "로고를 터치할 때마다 — 로고 함수(on_logo_pressed) 안",
      "A 버튼 함수 안",
    ],
    maxLength: 0,
  },
  {
    key: "mb27_q2",
    phase: "problem",
    label: "퀴즈 ② — '비김' 은 어떤 때일까?",
    hint: "가위바위보에서 '비김' 은 내 패와 AI 패가 어떤 관계일 때인가요?",
    kind: "choice",
    choices: [
      "내 패와 AI 패가 같을 때 (my == ai)",
      "내 패가 AI 패보다 클 때 (my > ai)",
      "내 패와 AI 패가 다를 때 (my != ai)",
    ],
    maxLength: 0,
  },
  {
    key: "mb27_fix",
    phase: "problem",
    label: "미션 4 — 고친 코드 붙여넣기",
    hint:
      "버그를 고쳐 '비겼을 때 그냥 얼굴' 이 뜨면, MakeCode 'Python' 의 코드를 전체 선택(Ctrl+A) → 복사해\n" +
      "아래 칸에 붙여넣어요. 적으면 자동으로 저장돼요(선생님이 볼 수 있어요).",
    kind: "long",
    maxLength: 6000,
  },

  /* ── 미션 5 (worksheet) — AI로 기능 추가 (바이브) ── */
  {
    key: "_mb27_m5_intro",
    phase: "worksheet",
    label: "미션 5 — AI에게 기능 하나를 부탁하기",
    hint:
      "내 가위바위보에 더하고 싶은 기능을 한 문장으로 말하면, AI가 '가위바위보 전체 + 그 기능' 이 든 완성\n" +
      "코드를 만들어 줘요. 복사해서 MakeCode 'Python' 에 (기존 코드 모두 지우고) 붙여넣어 실행해요.\n\n" +
      "이런 걸 부탁해 볼 수 있어요:\n" +
      "  · 이기면 '삐' 소리가 나게 해 줘\n" +
      "  · 비기면 LED가 잠깐 깜빡이게 해 줘\n" +
      "  · A+B 를 같이 누르면 처음(가위)으로 되돌아가게 해 줘\n\n" +
      "한 번에 안 될 수도 있어요 — 설명을 읽고 다시 부탁하거나 조금씩 고쳐 봐요.\n" +
      "(내가 AI에게 보낸 말과 받은 코드는 저장되고, 선생님이 볼 수 있어요.)",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "mb27_vibe",
    phase: "worksheet",
    label: "AI에게 기능 부탁하기 — 가위바위보에 더할 기능을 말로 적어요",
    hint:
      "더하고 싶은 기능을 한 번에 하나씩, 동작으로 적어요. AI가 가위바위보 전체 코드에 그 기능을 더해 줘요.\n" +
      "'코드 복사하기' 로 복사해 아래 [MakeCode 열기] 로 열고 'Python' 에 붙여넣어 실행해요.",
    kind: "vibe_code",
    vibeTarget: "microbit",
    // 바탕 = 완성형 가위바위보. 서버 fallback(만보기)은 25차 전용이라, 가위바위보는 반드시 베이스를 넘긴다.
    vibeBaseCode: RPS_BASE,
    maxLength: 0,
  },
  {
    key: "mb27_vibe_what",
    phase: "worksheet",
    label: "AI가 준 코드는 무엇을 하나요? (한 줄)",
    hint: "AI가 더해 준 부분이 '무엇을 하는지' 한 줄로 적어 봐요. (예: 이기면 소리가 난다.)",
    kind: "text",
    maxLength: 200,
  },
  {
    key: "mb27_vibe_mine",
    phase: "worksheet",
    label: "내가 더한 기능 — 친구들과 나눌 한 줄",
    hint: "내 가위바위보에 어떤 기능을 더했는지, 자랑하듯 한 줄로 적어 봐요.",
    kind: "text",
    maxLength: 200,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "가위바위보 게임 만들기",
  moodCheckEnabled: true,
  hideDoneButton: true,

  // 대기 화면 = 파이썬 타자 도우미(정보 수업 표준). "link:" 면 설명+새 탭 링크 카드로 뜬다.
  game: {
    heading: "기다리는 동안 — 파이썬 타자 연습",
    body:
      "수업이 시작되길 기다리는 동안 파이썬 타자 연습을 해 봐요.\n" +
      "아래 단추로 새 탭에서 열려요. 수업이 시작되면 돌아오세요.",
    url: "link:https://python-typing-helper.vercel.app/",
  },
  gameExplainer: empty(),

  // 성찰 보상 게임 = 사과 게임(26차와 동일, 아크 일관성). 성찰을 제출하면 '제출하고 게임하기' 로 열린다.
  rewardGame: {
    heading: "수고했어요! 🍎",
    body: "성찰을 제출했으면 잠깐 사과 게임으로 쉬어요. 선생님이 부르면 돌아오세요.",
    url: "https://fruit-box-game-delta.vercel.app/",
  },

  progress: empty(),

  // 안내 보드 — 오늘 할 일(미션 1·2·3·4) + 새 개념(버튼·로고 입력 / 갈림길 판정).
  assessment: {
    heading: "오늘 할 일 — 가위바위보 게임 만들기",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "내 패 → AI 패 → 판정 → 고치기",
        note:
          "25·26차에서 익힌 변수·무작위·갈림길에, 오늘은 '버튼·로고 입력' 과 '판정' 을 더해 가위바위보\n" +
          "게임을 만들어요. 패 번호는 1=가위, 2=보, 3=바위 예요.",
        rows: [
          { label: "미션 1", value: "A·B 버튼으로 내 패 고르기 (선택 상태 변수)" },
          { label: "미션 2", value: "금색 로고 터치로 AI 패 뽑기 (randint)" },
          { label: "미션 3", value: "판정 — if/elif/else 로 이김·비김·짐 얼굴" },
          { label: "미션 4", value: "버그 고치기(비겼는데 짐) + 퀴즈 2문항" },
          { label: "미션 5", value: "AI로 기능 추가 (이기면 소리 등) — 바이브" },
          { label: "채점은", value: "점수·자동채점 없어요 — 만들어 보고 돌아가면 성공" },
        ],
        highlights: [
          "미션1~3은 뼈대 코드의 '# (미션)' 왼쪽 빈칸만 채워요(show_hand·B버튼 등은 다 돼 있어요).",
          "미션4는 '왜 비겼는데 짐이 뜨지?' 를 직접 찾아 고치는 미션 — 바이브만 하면 얕으니까요.",
          "미션5는 완성한 가위바위보에 AI로 기능 하나를 더해 '나만의 가위바위보' 로 만들어요.",
        ],
      },
      {
        label: "오늘의 새 낱말",
        subtitle: "버튼·로고 입력 · 갈림길 판정",
        note:
          "버튼 이벤트는 'A 버튼을 누르면 ~하기' 예요(25차 흔들기 이벤트와 같은 식). 로고 터치는 v2\n" +
          "마이크로비트 앞면 금색 로고를 눌러 '확정' 하는 입력이에요. if/elif/else 는 조건에 따라 다른 걸\n" +
          "하는 '갈림길' 이고, == 는 '같은지' 묻기예요 — 판정은 이 갈림길로 이김·비김·짐을 가려요.",
        rows: [
          { label: "버튼 이벤트", value: "input.on_button_pressed — A·B 누르면 ~하기" },
          { label: "로고 터치", value: "금색 로고 터치로 '확정' (micro:bit v2)" },
          { label: "if / elif / else", value: "조건에 따라 갈라지는 '갈림길' (판정)" },
          { label: "== (등호 두 개)", value: "'같은지' 묻기 (my == ai → 비김)" },
        ],
        highlights: [
          "자세한 설명은 선생님이 함께 해요. 여기선 '버튼·로고 입력' 과 '갈림길 판정' 두 가지만 기억해요.",
        ],
      },
    ],
  },

  video: empty(),

  // 성찰 — 입력·판정·디버깅 체험 소감. 개인적이라 비공개. 성찰 제출로 사과 게임 보상이 열린다.
  reflectionQuestions: [
    "오늘 가위바위보를 만들며 가장 재밌던/어려웠던 건 무엇이었나요? 한 줄로 적어 봐요. (미션4 '비겼는데 짐이 뜨는 버그' 를 고친 이야기나, 판정 갈림길을 만든 이야기를 넣어도 좋아요.)",
  ],
  reflectionPublic: false,

  // MakeCode(새 탭)·파이썬 타자(새 탭)가 붙은 단계에서 창을 옮기는 것을 이탈로 안 센다.
  focusExempt: ["waiting", "build", "grill", "mvp", "problem", "worksheet"],
  phaseLabels: {
    assessment: "안내",
    build: "미션 1 — 내 패 고르기",
    grill: "미션 2 — AI 패(무작위)",
    mvp: "미션 3 — 판정",
    problem: "미션 4 — 버그 고치기 + 퀴즈",
    worksheet: "미션 5 — AI로 기능 추가",
  },
  phaseOrder: ["waiting", "assessment", "build", "grill", "mvp", "problem", "worksheet", "reflection"],
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "가위바위보 게임 만들기",
      body:
        "A·B 버튼으로 내 패를 고르고(미션1), 금색 로고 터치로 AI 패를 뽑고(미션2), if/elif/else 로 이김·비김·\n" +
        "짐을 판정해요(미션3). 끝으로 '비겼는데 짐이 뜨는' 버그를 고치고 퀴즈를 풀어요(미션4).",
    },
    worksheet: WORKSHEET,
    galleryEnabled: false,
    sourcesEnabled: false,
  },
};

async function main(): Promise<void> {
  const existing = await db.collection(LESSON_PLANS).where("lessonNo", "==", LESSON_NO).get();
  const now = Date.now();

  if (!existing.empty) {
    const doc = existing.docs[0];
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
          hideDoneButton: PLAN.hideDoneButton,
          game: PLAN.game,
          gameExplainer: PLAN.gameExplainer,
          rewardGame: PLAN.rewardGame,
          progress: FieldValue.delete(),
          progressChecks: FieldValue.delete(),
          quiz: FieldValue.delete(),
          assessment: PLAN.assessment,
          video: PLAN.video,
          reflectionQuestions: PLAN.reflectionQuestions,
          reflectionPublic: PLAN.reflectionPublic,
          focusExempt: PLAN.focusExempt,
          phaseLabels: PLAN.phaseLabels,
          phaseOrder: PLAN.phaseOrder,
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (23~26차와 같은 MakeCode 통)`);
  console.log("단계: 대기(타자) → 기분 → 안내 → 미션1(build) → 미션2(grill) → 미션3(mvp·판정+공유링크) → 미션4(problem·디버깅+퀴즈2+고친코드) → 미션5(worksheet·바이브) → 성찰. freeNav off. hideDoneButton true. 성찰 제출 → 사과 게임.");
  console.log("미션1: 버튼 A 순환 빈칸(B·show_hand 제공). 미션2: 로고 터치 randint 빈칸. 미션3: 판정 elif 2개 빈칸 + 공유 링크(mb27_share, long). 미션4: 비김 누락 버그 고치기 + 형성평가 2문항(choice) + 고친 코드(mb27_fix, long 6000).");
  console.log("미션5: vibe_code(microbit, 베이스=완성형 RPS_BASE=vibe-code.ts MICROBIT_RPS_BASE) + 서술칸 2개(AI가 한 일·내가 더한 기능).");
  console.log("MakeCode 실측(2026-11-04): on_button_pressed·on_logo_event(TouchButtonEvent.PRESSED)·randint·show_icon(IconNames.HAPPY/MEH/SAD)·show_leds·show_hand(n)·if/elif/else 변환 확인. TouchButton.LOGO 는 컴파일 실패라 안 씀.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
