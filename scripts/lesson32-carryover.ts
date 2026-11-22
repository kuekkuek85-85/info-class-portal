/**
 * 31차 미션②(리스트로 정리, code_choose)·미션③(AI 바이브 코딩) 보존본 - 32차에서 재사용한다.
 *
 * 2026-11-18 교사 결정: 31차는 실제 수업에서 '리스트 개념' 까지만 했다. 31차 seed 에서 미션②③을 빼고,
 * 내용(코드·빈칸 보기·정답·refLines·why·그림 경로·바이브 설정)은 한 글자도 안 바꾸고 이 파일로 옮겼다.
 * 32차 seed 가 import 해서 쓴다. Firebase 초기화가 없어서 import 해도 DB 를 건드리지 않는다.
 *
 * 그림: /mb31-m2.svg(실행결과) · /mb31-loop.svg(i -> xs[i] 표) · /mb31-vibe-ideas.svg(부탁 예시). 이미 배포돼 있다.
 * 키는 31차 그대로(_mb31_m2 등)다. 32차에서 키·단계를 바꾸려면 retarget() 을 쓴다.
 */

import type { LessonPhase, WorksheetQuestion } from "../src/lib/types.ts";

type Slot = NonNullable<WorksheetQuestion["codeSlots"]>[number];
/**
 * 미션 ② 는 code_choose(선택형) - 직접 타자 없음. 왼쪽 = 참조('변수 하나하나') 완성 코드(DODGE_VARS_DONE,
 * 읽기전용), 오른쪽 = 리스트 리팩토링 코드(CODE_M2, `{{토큰}}` 자리를 드롭다운으로 고름). 빈칸은 '의미 있는
 * 자리' 넷: 리스트 리터럴(lit = [1, 3]) · 무작위 새 칸(rnd = randint(0, 4)) · 인덱스 접근 둘(idx1·idx2 = i).
 * (2026-11-23: 반복 범위 range 빈칸은 뺐다 - 안 배운 개념이라 for i in range(2) 는 완성해서 준다.)
 * 네 칸을 다 맞히면 완성 코드 = DODGE_LIST_DONE 과 같아진다(= 미션③ vibeBaseCode). 좌우로 "같은 동작인데
 * 리스트 쪽이 짧다" 가 드러난다. 양쪽 다 줄 번호 거터.
 */
export const CODE_M2 = `# 똥피하기 ⑧ - 리스트로 깔끔하게! (변수 여러 벌 → 리스트 하나 + 반복)
# 똥들의 가로는 xs, 세로는 ys 라는 '리스트(묶음)' 하나에 모았어요.
# for i in range(2): 줄은 i 를 0, 1 로 바꿔 가며 '같은 일' 을 두 번 해 줘요 (그대로 두면 돼요).
xs = {{lit}}
ys = [0, 2]
x = 2
playing = True
score = 0

def on_button_pressed_a():
    global x
    x = x - 1
    if x < 0:
        x = 0
input.on_button_pressed(Button.A, on_button_pressed_a)

def on_button_pressed_b():
    global x
    x = x + 1
    if x > 4:
        x = 4
input.on_button_pressed(Button.B, on_button_pressed_b)

def on_forever():
    global playing, score
    if playing:
        basic.clear_screen()
        led.plot(x, 4)
        for i in range(2):
            ys[{{idx1}}] = ys[i] + 1
            if ys[i] > 4:
                ys[i] = 0
                xs[i] = {{rnd}}
                score = score + 1
            led.plot(xs[{{idx2}}], ys[i])
            if ys[i] == 4 and xs[i] == x:
                playing = False
                basic.show_icon(IconNames.SAD)
                basic.show_number(score)
    basic.pause(300)
basic.forever(on_forever)`;

/**
 * 미션 ② 왼쪽 참조 코드 - 미션① 에서 만든 '변수 하나하나' 완성본(똥 2벌·or). 읽기전용으로 오른쪽 리스트
 * 코드와 좌우 대비해 "변수를 또 만들고 같은 코드를 또 쓴" 길이를 눈으로 보게 한다.
 */
export const DODGE_VARS_DONE = `# 똥피하기 ⑦ - 똥 두 개 (변수를 하나하나)
x = 2
poop_x = randint(0, 4)
poop_y = 0
poop_x2 = randint(0, 4)
poop_y2 = 2
playing = True
score = 0

def on_button_pressed_a():
    global x
    x = x - 1
    if x < 0:
        x = 0
input.on_button_pressed(Button.A, on_button_pressed_a)

def on_button_pressed_b():
    global x
    x = x + 1
    if x > 4:
        x = 4
input.on_button_pressed(Button.B, on_button_pressed_b)

def on_forever():
    global poop_x, poop_y, poop_x2, poop_y2, playing, score
    if playing:
        poop_y = poop_y + 1
        poop_y2 = poop_y2 + 1
        if poop_y > 4:
            poop_y = 0
            poop_x = randint(0, 4)
            score = score + 1
        if poop_y2 > 4:
            poop_y2 = 0
            poop_x2 = randint(0, 4)
            score = score + 1
        basic.clear_screen()
        led.plot(x, 4)
        led.plot(poop_x, poop_y)
        led.plot(poop_x2, poop_y2)
        if (poop_y == 4 and poop_x == x) or (poop_y2 == 4 and poop_x2 == x):
            playing = False
            basic.show_icon(IconNames.SAD)
            basic.show_number(score)
    basic.pause(300)
basic.forever(on_forever)`;

/**
 * 바이브 코딩 바탕(미션③) = 완성된 '리스트' 똥피하기 (미션② 를 ✎칸까지 다 채운 코드). AI가 여기에 '학생이 말한
 * 기능' 을 더한다. makecode.microbit.org 'Python' 변환 전제. 서버 fallback(만보기)은 25차 전용이라 반드시 넘긴다.
 */
export const DODGE_LIST_DONE = `xs = [1, 3]
ys = [0, 2]
x = 2
playing = True
score = 0

def on_button_pressed_a():
    global x
    x = x - 1
    if x < 0:
        x = 0
input.on_button_pressed(Button.A, on_button_pressed_a)

def on_button_pressed_b():
    global x
    x = x + 1
    if x > 4:
        x = 4
input.on_button_pressed(Button.B, on_button_pressed_b)

def on_forever():
    global playing, score
    if playing:
        basic.clear_screen()
        led.plot(x, 4)
        for i in range(2):
            ys[i] = ys[i] + 1
            if ys[i] > 4:
                ys[i] = 0
                xs[i] = randint(0, 4)
                score = score + 1
            led.plot(xs[i], ys[i])
            if ys[i] == 4 and xs[i] == x:
                playing = False
                basic.show_icon(IconNames.SAD)
                basic.show_number(score)
    basic.pause(300)
basic.forever(on_forever)`;


/**
 * 미션 ② code_choose 빈칸 - 드롭다운 '보기 선택'(자유 타자 없음). options 에 그럴듯한 오답을 섞고, answer 로
 * 채점한다. 모두 맞히면 why(왜 그런지 한 줄, 리스트/인덱스/반복 의미)를 보여 준다. 정답을 options 맨 앞에
 * 두지 않는다. lit/rnd/idx1/idx2 를 맞히면 완성 코드 = DODGE_LIST_DONE.
 */
export const SLOTS_M2: Slot[] = [
  {
    token: "lit",
    label: "똥들의 가로 위치 리스트",
    options: ["1, 3", "[1, 3]", "[1][3]", "(1, 3)"],
    answer: "[1, 3]",
    why: "대괄호 [ ] 안에 쉼표로 나열 → xs[0]=1, xs[1]=3. 1, 3 은 처음 자리일 뿐, 바닥에 닿으면 무작위로 바뀌어요.",
    // 왼쪽 3줄 poop_x = ..., 5줄 poop_x2 = ... (두 똥의 가로 위치 변수 두 개 → 리스트 xs 하나)
    refLines: [3, 5],
  },
  {
    token: "idx1",
    label: "떨어뜨릴 똥의 번호",
    options: ["0", "i", "1", "2"],
    answer: "i",
    why: "i 가 0이면 첫째 똥, 1이면 둘째 똥 - 똥마다 따로 안 써도 돼요.",
    // 왼쪽 27줄 poop_y = poop_y + 1, 28줄 poop_y2 = poop_y2 + 1 → ys[i] = ys[i] + 1 한 줄
    refLines: [27, 28],
  },
  /*
   * 2026-11-23 교사 피드백: range 빈칸 제거(학생들이 range 를 배운 적이 없다). for i in range(2) 줄은
   * 완성된 채로 주고, 그 자리 대신 이미 배운 '무작위(randint)' 함수 빈칸을 둔다(26차 주사위 · 29차 똥 시작 칸).
   * 값 3(lit·idx1·idx2) : 함수 1(rnd) 비율 유지.
   */
  {
    token: "rnd",
    label: "바닥에 닿은 똥의 새 가로 칸",
    options: ["randint(4, 0)", "randint(0, 4)", "randint(0, 5)", "random(0, 4)"],
    answer: "randint(0, 4)",
    why: "randint(0, 4) 는 0~4 중 무작위 수 하나 - 화면 가로 칸이 0~4 라서요(주사위에서 쓴 그 명령).",
    // 왼쪽 31줄 poop_x = randint(0, 4), 35줄 poop_x2 = randint(0, 4) → xs[i] = randint(0, 4) 한 줄
    refLines: [31, 35],
  },
  {
    token: "idx2",
    label: "그릴 똥의 번호",
    options: ["x", "0", "i", "1"],
    answer: "i",
    why: "led.plot(xs[i], ys[i]) - 지금 반복이 도는 i 번째 똥을 그 자리에 그려요.",
    // 왼쪽 39줄 led.plot(poop_x, poop_y), 40줄 led.plot(poop_x2, poop_y2) → led.plot(xs[i], ys[i]) 한 줄
    refLines: [39, 40],
  },
];

/** 31차 미션② - 리스트 개념 note + 좌우 대비 보기 고르기(code_choose). 단계 grill, 키 _mb31_m2*. */
export const LIST_REFACTOR_QUESTIONS: WorksheetQuestion[] = [
  {
    key: "_mb31_m2_note",
    phase: "grill",
    label: "새 개념 - 리스트로 다시 쓰기 (인덱스 xs[i] · 반복)",
    hint:
      "똑같이 움직이는 똥피하기를 리스트로 짧게 다시 써요.\n" +
      "반복이 i 를 0, 1 로 바꾸면 xs[i]·ys[i] 가 똥을 하나씩 가리켜요. 아래 표처럼요.",
    kind: "note",
    imageUrl: "/mb31-loop.svg",
    imageAlt: "i 가 0 이면 xs[0], ys[0] 으로 첫째 똥, i 가 1 이면 xs[1], ys[1] 로 둘째 똥을 가리킨다는 표",
    maxLength: 0,
  },
  {
    key: "_mb31_m2",
    phase: "grill",
    label: "미션 ② - 리스트 + 반복으로 정리하기 (보기 골라 채우기)",
    hint:
      "빈칸 네 곳을 보기에서 골라 「확인」을 눌러요.\n" +
      "모두 맞으면 '완성 코드 복사' 를 눌러요.\n" +
      "MakeCode 'Python' 에 다 지우고 붙여넣어요.",
    kind: "code_choose",
    imageUrl: "/mb31-m2.svg",
    imageAlt: "똥 두 개가 똑같이 떨어지지만, 코드는 리스트와 반복으로 한 번만 써서 짧아진 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    codeRefTemplate: DODGE_VARS_DONE,
    codeRefLabel: "변수 하나하나",
    codeChooseLabel: "리스트로 정리",
    codeTemplate: CODE_M2,
    codeSlots: SLOTS_M2,
    maxLength: 0,
  },
];

/** 31차 미션③ - AI 바이브 코딩 안내 note + vibe_code(바탕 = 완성 리스트 똥피하기). 단계 worksheet, 키 *mb31_vibe*. */
export const VIBE_QUESTIONS: WorksheetQuestion[] = [
  {
    key: "_mb31_vibe_intro",
    phase: "worksheet",
    label: "미션 ③ - AI에게 기능 하나를 부탁하기 (보너스)",
    hint:
      "더하고 싶은 기능을 한 문장으로 말하면, AI가 전체 코드를 만들어 줘요.\n" +
      "복사해서 MakeCode 'Python' 에 붙여넣어 실행해요. 안 되면 다시 부탁해요.\n" +
      "(보낸 말과 받은 코드는 선생님이 볼 수 있어요.)",
    kind: "note",
    imageUrl: "/mb31-vibe-ideas.svg",
    imageAlt: "부탁해 볼 기능 예시 네 가지: 맞으면 삐 소리, 점수 10 넘으면 하트, 똥을 세 개로, A+B 로 처음부터 다시",
    maxLength: 0,
  },
  {
    key: "mb31_vibe",
    phase: "worksheet",
    label: "AI에게 기능 부탁하기 - 똥피하기에 더할 기능을 말로 적어요",
    hint: "기능은 한 번에 하나씩, 무엇이 어떻게 되면 좋을지 적어요.",
    kind: "vibe_code",
    vibeTarget: "microbit",
    // 바탕 = 완성형 '리스트' 똥피하기. 서버 fallback(만보기)은 25차 전용이라, 똥피하기는 반드시 베이스를 넘긴다.
    vibeBaseCode: DODGE_LIST_DONE,
    vibeNoun: "똥피하기",
    vibePlaceholder: "예: 똥을 세 개로 늘려 줘",
    maxLength: 0,
  },
];

/**
 * 키 접두어(mb31 -> 예: mb32)와 단계를 바꿔 새 배열로 돌려준다. 원본은 그대로 둔다.
 * 답은 학번별 공유 문서(artifacts/microbit-makecode__학번)에 키로 저장되므로, 32차에서 31차 키를 그대로 쓰면
 * 31차에 고르다 만 답이 미리 채워져 보인다. 새로 풀게 하려면 prefix 를 바꾼다.
 */
export function retarget(
  questions: WorksheetQuestion[],
  opts: { prefix?: string; phase?: LessonPhase } = {},
): WorksheetQuestion[] {
  return questions.map((q) => ({
    ...q,
    key: opts.prefix ? q.key.replace("mb31", opts.prefix) : q.key,
    phase: opts.phase ?? q.phase,
  }));
}
