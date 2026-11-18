/**
 * 마이크로비트 아크 지난 작품의 완성 코드 5개 - 33~34차 수행평가 '참고 칸'(오픈북: 지난 차시 포털 내용).
 *
 * 학생은 이 코드를 복사해 포털 AI 의 "내 코드 붙여넣고 이어서" 에 붙이고 고쳐 달라고 할 수 있다(하 수준 출발점).
 * 만보기·주사위·가위바위보는 src/lib/vibe-code.ts 의 MICROBIT_*_BASE 와 같은 문자열(그 모듈은 server-only 라 seed 가
 * 못 불러와 줄 그대로 옮겼다). 똥피하기는 30차 완성본(리스트 없음, seed-lesson32-c4 의 DODGE_ONE_DONE 과 같음).
 * 하트 두근두근은 23차 미션(HEART ↔ SMALL_HEART, 1초 쉬기). Firebase 없음 - import 해도 DB 를 건드리지 않는다.
 */

import type { WorksheetQuestion } from "../src/lib/types.ts";

const HEART = `def on_forever():
    basic.show_icon(IconNames.HEART)
    basic.pause(1000)
    basic.show_icon(IconNames.SMALL_HEART)
    basic.pause(1000)
basic.forever(on_forever)`;
const MANBOGI = `steps = 0

def on_gesture_shake():
    global steps
    steps += 1
    basic.show_number(steps)
input.on_gesture(Gesture.SHAKE, on_gesture_shake)`;

const DICE = `roll = 0

def on_gesture_shake():
    global roll
    roll = randint(1, 6)
    if roll == 1:
        basic.show_leds("""
        . . . . .
        . . . . .
        . . # . .
        . . . . .
        . . . . .
        """)
    elif roll == 2:
        basic.show_leds("""
        # . . . .
        . . . . .
        . . . . .
        . . . . .
        . . . . #
        """)
    elif roll == 3:
        basic.show_leds("""
        # . . . .
        . . . . .
        . . # . .
        . . . . .
        . . . . #
        """)
    elif roll == 4:
        basic.show_leds("""
        # . . . #
        . . . . .
        . . . . .
        . . . . .
        # . . . #
        """)
    elif roll == 5:
        basic.show_leds("""
        # . . . #
        . . . . .
        . . # . .
        . . . . .
        # . . . #
        """)
    else:
        basic.show_leds("""
        # . . . #
        . . . . .
        # . . . #
        . . . . .
        # . . . #
        """)
input.on_gesture(Gesture.SHAKE, on_gesture_shake)`;

const RPS = `choice = 1
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
            . . . . .
            . # # # .
            . # # # .
            . # # # .
            . . . . .
            """)
    else:
        basic.show_leds("""
            . # # # .
            . # # # #
            . # # # #
            # # # # #
            # # # # #
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
    elif my == 1 and ai == 3:
        basic.show_icon(IconNames.HAPPY)
    elif my == 2 and ai == 1:
        basic.show_icon(IconNames.HAPPY)
    elif my == 3 and ai == 2:
        basic.show_icon(IconNames.HAPPY)
    else:
        basic.show_icon(IconNames.SAD)
    basic.pause(1500)
input.on_logo_event(TouchButtonEvent.PRESSED, on_logo_pressed)

show_hand(choice)`;

const DODGE = `x = 2
poop_x = randint(0, 4)
poop_y = 0
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
    global poop_x, poop_y, playing, score
    if playing:
        poop_y = poop_y + 1
        if poop_y > 4:
            poop_y = 0
            poop_x = randint(0, 4)
            score = score + 1
        basic.clear_screen()
        led.plot(x, 4)
        led.plot(poop_x, poop_y)
        if poop_y == 4 and poop_x == x:
            playing = False
            basic.show_icon(IconNames.SAD)
            basic.show_number(score)
    basic.pause(300)
basic.forever(on_forever)`;

export interface MicrobitExample {
  /** 키에 쓰는 짧은 이름 */
  id: string;
  title: string;
  /** 무엇으로 입력받고 무엇을 출력하나 - 한 줄 */
  summary: string;
  code: string;
}

/**
 * 예시 코드 5개를 활동지 칸으로 - 안내 note + 줄 번호·복사가 있는 읽기 전용 코드 칸(code_fill, 빈칸 없음) 5개.
 * 33·34차가 함께 쓴다(키 접두어·단계만 다르게).
 */
export function exampleBlocks(prefix: string, phase: WorksheetQuestion["phase"]): WorksheetQuestion[] {
  return [
    {
      key: `_${prefix}_examples_note`,
      phase,
      label: "참고 - 지난 작품 코드 (오픈북)",
      hint:
        "막히면 지난 작품 코드를 봐요. 복사해서 위 포털 AI 의\n" +
        "'내 코드 붙여넣고 이어서' 에 붙이고 바꿔 달라고 해도 돼요.",
      kind: "note",
      maxLength: 0,
    },
    ...MICROBIT_EXAMPLES.map(
      (ex): WorksheetQuestion => ({
        key: `_${prefix}_ex_${ex.id}`,
        phase,
        label: ex.title,
        hint: ex.summary,
        kind: "code_fill",
        codeTemplate: ex.code,
        codeSlots: [],
        maxLength: 0,
      }),
    ),
  ];
}

export const MICROBIT_EXAMPLES: MicrobitExample[] = [
  { id: "heart", title: "하트 두근두근 (23차)", summary: "입력 없음 → 반복 → LED 하트 크게·작게", code: HEART },
  { id: "manbogi", title: "만보기 (25차)", summary: "흔들기 → 걸음 수 +1 → LED 숫자", code: MANBOGI },
  { id: "dice", title: "주사위 (26차)", summary: "흔들기 → 1~6 무작위 + 갈림길 → LED 주사위 눈", code: DICE },
  { id: "rps", title: "가위바위보 (27차)", summary: "버튼 A·B, 로고 터치 → 무작위 + 승패 판정 → LED 그림·표정", code: RPS },
  { id: "dodge", title: "똥피하기 (28~30차)", summary: "버튼 A·B → 반복·충돌·점수 → LED 점·표정·점수", code: DODGE },
];