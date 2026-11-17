/**
 * 31차시 차시 계획 등록 - 「똥피하기 ④ - 리스트로 똥 여러 개」 (MakeCode 아크, 30차 이어가기).
 *
 *   node --env-file=.env.local scripts/seed-lesson31.ts
 *   node --env-file=.env.local scripts/seed-lesson31.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 30차(똥피하기 완성, 똥 1개 + 충돌·점수)에 이어 '리스트' 를 배운다 (교사 확정 2026-11-17)
 *
 * 30차에서 충돌(게임오버)·점수까지 넣어 똥 1개짜리 똥피하기를 완성했다. 30차 수업 시간이 모자라
 * 미션3(똥 2개)은 31차로 이월됐다(seed-lesson30.ts 의 CODE_M3/SLOTS_M3). 31차는 그 이월분을
 * 출발점으로, '왜 리스트가 필요한가' 를 한 번의 고생으로 깨닫게 하는 데 집중한다.
 *
 * ## 흐름 (교사 확정 - 노가다로 아프게 → 리스트로 구제)
 *   미션 ① (build)   똥 여러 개를 '변수 노가다' 로 - 둘째 똥 변수를 또 만들고 똑같은 코드를 또 복붙.
 *                    (= 30차 이월분 CODE_M3/SLOTS_M3 그대로. 똥 하나 늘리는 데 드는 수고를 몸으로 느낀다.)
 *   리스트 개념 (problem)  '리스트' 가 무엇이고 왜 필요한가 - 독립 개념 단계(30차 'and 개념·퀴즈' 와 같은 자리).
 *                    변수 여러 개 vs 리스트 하나를 그림으로 대비(/mb31-list.svg), 인덱스(xs[0]·xs[1], 0부터)·
 *                    반복(for i in range(2))을 짧게. 확인 퀴즈(choice) 3개로 형성평가. (가르친 뒤 미션②에서 씀.)
 *   미션 ② (grill)   그 개념을 써서 똥 변수들을 '리스트 하나 + 반복' 으로 리팩토링 - 같은 동작, 짧은 코드.
 *                    (새 개념: 리스트 xs/ys · 인덱스 xs[i] · for i in range(2))
 *   미션 ③ (worksheet)  AI(바이브 코딩)로 '나만의 기능' 하나 더하기 - 보너스. 바탕 = 완성된 리스트 똥피하기.
 *   → 성찰 → UNO. (게임은 성찰 제출만으로 열림 - rewardGame.requires 비움. 미션 링크로 막지 않음.)
 *
 * ## '새 개념은 가르친 뒤 쓰게' (교사 설계 철학)
 *  · 리스트 리팩토링(미션②) 앞에 반드시 '리스트 개념(problem)' 단계가 오도록 phaseOrder 를 짰다:
 *    waiting → assessment → build(노가다) → problem(리스트 개념) → grill(리팩토링) → worksheet(AI) → reflection.
 *  · 개념 단계의 확인 퀴즈(choice 3개: 인덱스 xs[0]·ys[1]·노가다 vs 리스트)가 형성평가 겸 '고민거리' 역할.
 *
 * ## 구조 결정 - 리팩토링은 리스트 + for 반복 (평탄화 유지)
 *  · 미션② 는 똥의 가로/세로를 각각 리스트 xs/ys 하나에 모으고, for i in range(2) 로 '같은 일' 을 한 번만 쓴다.
 *    이게 리스트의 진짜 보람(복붙이 실제로 사라짐)이라 for 반복을 함께 가르친다 - 개념 단계에서 range 도 짚음.
 *  · 리스트 리터럴은 숫자만(xs=[1, 3], ys=[0, 2])으로 둬 MakeCode 'Python' 블록 변환 위험을 줄였다. 무작위는
 *    바닥 리셋 때 xs[i]=randint(0,4) 로만(30차에서 검증된 randint 그대로). 모든 ✎칸은 '비어도 유효한 완결 블록'
 *    (28~30 안전 패턴) - for 헤더·리스트 선언·반복 본문 한 줄(ys[i]=ys[i]+1)은 제공, ✎ 는 if 블록 둘만.
 *  · ⚠ list/for/range 는 30차까지 실측 검증된 명령 집합(and/or·playing bool·show_number·show_icon·led.plot·
 *    randint·forever·global)에 '없다'. 수업 전 makecode.microbit.org 'Python' 에서 미션② 코드가 블록으로
 *    정상 변환·실행되는지 반드시 실측할 것(보고의 '남은 것/질문' 참조).
 *
 * ## 세션 운영 (교사 확정 · 정보 수업 표준)
 *  · 대기 = 파이썬 타자 도우미(link:). 보상 = UNO(rewardGame, requires 비움 - 성찰 제출만으로 열림).
 *    hideDoneButton true. 활동 통 microbit-makecode(키 mb31_* 로 충돌 없음).
 *  · freeNavigation false - 되돌아가기 off, 마음 체크인 강제 관문 유효.
 *    흐름: 대기→기분→안내→미션①(노가다)→리스트 개념→미션②(리팩토링)→미션③(AI)→성찰.
 *  · 구현 미션마다 실행결과 SVG 우측 1/3: /mb30-m3.svg(미션① 똥 2개 노가다·30차 자산 재사용)·
 *    /mb31-m2.svg(미션② 리스트 리팩토링 결과). 리스트 개념 단계엔 대비 그림 /mb31-list.svg(설명 아래 전폭).
 *  · code_fill 미션은 maxLength 0(붙여넣기는 ✎칸). 들여쓰기 안내는 Tab 횟수로(Tab 1번=공백 4칸=한 단계).
 *    for 안쪽 if 는 Tab 3번, 그 안은 Tab 4번(30차보다 한 단계 깊음 - for 로 감쌌기 때문).
 *  · '___'/'★★★' 리터럴 금지(블록 변환 깨짐). ✎칸은 own-line, 정답 영어 키워드 힌트 노출 금지.
 *
 * 바이브 걸림돌 점검(30차와 동일): 학교망=25~30차 같은 Gemini 엔드포인트로 실제 수업했으므로 차단 아님.
 *   쿼터=학번당 25회/시간(route.ts), 바이브는 보너스라 충분. 프라이버시=학번·이름 안 보냄(baseCode+프롬프트만),
 *   답은 본인 artifact 에 저장·교사만 열람·"선생님이 볼 수 있어요" 표시.
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
const LESSON_NO = 31;
const FORCE = process.argv.includes("--force");

/** 23~30차와 같은 MakeCode 피지컬 아크 전용 통 (키 mb31_* 로 충돌 없음). */
const ACTIVITY_ID = "microbit-makecode";

/**
 * 미션 ① 스타터 (build) - 똥 '변수 노가다'. = 30차 이월분(CODE_M3). 바탕 = 30차 완성(똥 1개·충돌·점수) +
 * 둘째 똥 변수·낙하·그리기(제공, 첫 똥과 평행해 읽기용). 학생은 ① 둘째 똥 바닥 리셋(✎ a, 첫 똥 리셋을
 * 거울처럼) ② 'or' 충돌 판정(✎ b)만 더한다. 리스트 미학습 상태라 변수 2벌 유지 - 이 복붙을 몸으로 느끼는 게 목적.
 */
const CODE_M1 = `# 똥피하기 ⑦ - 똥 두 개! (변수를 또 만들어서, 하나라도 맞으면 게임오버)
# 똥을 한 벌 더 만들어요(poop_x2, poop_y2). 첫째 똥 코드를 '그대로 또' 써야 해요.
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
{{a}}
        basic.clear_screen()
        led.plot(x, 4)
        led.plot(poop_x, poop_y)
        led.plot(poop_x2, poop_y2)
{{b}}
    basic.pause(300)
basic.forever(on_forever)`;

/**
 * 미션 ② 스타터 (grill) - 리스트 리팩토링. 똥들의 가로/세로를 리스트 xs/ys 하나에 모으고 for i in range(2) 로
 * '같은 일' 을 한 번만 쓴다. for 헤더·리스트 선언·반복 본문 첫 줄(ys[i]=ys[i]+1)·그리기(led.plot(xs[i],ys[i]))는
 * 제공 → for 본문이 늘 비지 않아, ✎(a 리셋 블록 · b 충돌 블록)이 비어도 유효한 파이썬이다. 두 ✎칸이 인덱스
 * 접근(xs[i]·ys[i])을 직접 쓰게 해 개념을 손으로 익힌다.
 */
const CODE_M2 = `# 똥피하기 ⑧ - 리스트로 깔끔하게! (변수 여러 벌 → 리스트 하나 + 반복)
# 똥들의 가로 위치를 xs, 세로 위치를 ys 라는 '리스트(묶음)' 하나에 모았어요.
# for 반복이 i 를 0, 1 로 바꿔 가며 '같은 일' 을 해 줘요 - 한 번만 적으면 돼요.
xs = [1, 3]
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
{{a}}
            led.plot(xs[i], ys[i])
{{b}}
    basic.pause(300)
basic.forever(on_forever)`;

/**
 * 바이브 코딩 바탕(미션③) = 완성된 '리스트' 똥피하기 (미션② 를 ✎칸까지 다 채운 코드). AI가 여기에 '학생이 말한
 * 기능' 을 더한다. makecode.microbit.org 'Python' 변환 전제. 서버 fallback(만보기)은 25차 전용이라 반드시 넘긴다.
 */
const DODGE_LIST_DONE = `xs = [1, 3]
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
 * code_fill 빈칸(토큰) - 위 템플릿의 `{{a}}`/`{{b}}` 자리 인라인 편집칸. 힌트는 정답 영어 키워드를 직접
 * 쓰지 않고 뜻으로 돌려 적는다(coding-hint-indirect-answers). answer 를 채워 blur 자동 힌트가 작동하게 한다.
 * 들여쓰기 공백은 hint 로만(Tab 횟수) 안내. 전부 own-line 블록.
 */
type Slot = NonNullable<WorksheetQuestion["codeSlots"]>[number];

const SLOTS_M1: Slot[] = [
  {
    token: "a",
    label: "둘째 똥 바닥 처리",
    hint:
      "둘째 똥(poop_y2)도 바닥을 지나면(4 보다 커지면) poop_y2 를 0 으로, poop_x2 에 0~4 무작위 수,\n" +
      "score 1 늘리기. 바로 위 첫째 똥 처리를 '거울처럼' 2 를 붙여 쓰면 돼요.\n" +
      "(갈림길 if 네 줄, 앞 if 줄은 Tab 2번, 그 안쪽 세 줄은 Tab 3번)",
    rows: 4,
    answer: "        if poop_y2 > 4:\n            poop_y2 = 0\n            poop_x2 = randint(0, 4)\n            score = score + 1",
  },
  {
    token: "b",
    label: "둘 중 하나라도 맞으면",
    hint:
      "두 똥 중 '하나라도' 주인공과 같은 칸에서 바닥에 닿으면 게임오버. (첫째 똥 조건) '또는' (둘째 똥 조건)\n" +
      "일 때 → playing 을 끄고, 슬픈 얼굴(위 30차에서 쓴 basic.show_icon(IconNames.SAD))과 점수를 보여 줘요.\n" +
      "(갈림길 if 네 줄, 앞 if 줄은 Tab 2번, 그 안쪽 세 줄은 Tab 3번)",
    rows: 4,
    answer:
      "        if (poop_y == 4 and poop_x == x) or (poop_y2 == 4 and poop_x2 == x):\n            playing = False\n            basic.show_icon(IconNames.SAD)\n            basic.show_number(score)",
  },
];

const SLOTS_M2: Slot[] = [
  {
    token: "a",
    label: "똥 i 가 바닥에 닿으면 (리셋 + 점수)",
    hint:
      "지금 보고 있는 똥 i 의 세로값 ys[i] 가 바닥을 지나면(4 보다 커지면): ys[i] 를 0 으로,\n" +
      "xs[i] 에 0~4 무작위 수, score 1 늘리기. 괄호 안 i 만 바꿨을 뿐, 하는 일은 노가다 때와 똑같아요.\n" +
      "(갈림길 if 네 줄 - 앞 if 줄은 Tab 3번, 그 안쪽 세 줄은 Tab 4번)",
    rows: 4,
    answer:
      "            if ys[i] > 4:\n                ys[i] = 0\n                xs[i] = randint(0, 4)\n                score = score + 1",
  },
  {
    token: "b",
    label: "똥 i 가 주인공과 부딪히면 (게임오버)",
    hint:
      "똥 i 가 맨 아랫줄에 왔고(ys[i] 가 4) '그리고(and)' 그 칸이 주인공 칸(xs[i] 가 x)이면 → playing 을 끄고,\n" +
      "슬픈 얼굴(basic.show_icon(IconNames.SAD))과 점수(basic.show_number(score))를 보여 줘요.\n" +
      "노가다 때는 똥마다 따로 썼지만, 지금은 i 하나로 두 똥에 다 적용돼요.\n" +
      "(갈림길 if 네 줄 - 앞 if 줄은 Tab 3번, 그 안쪽 세 줄은 Tab 4번)",
    rows: 4,
    answer:
      "            if ys[i] == 4 and xs[i] == x:\n                playing = False\n                basic.show_icon(IconNames.SAD)\n                basic.show_number(score)",
  },
];

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 활동지 - 미션①(노가다, build) → 리스트 개념·퀴즈(problem) → 미션②(리팩토링, grill) → 미션③(AI, worksheet).
//   각 구현 미션 앞에 새 개념 note. 개념 단계엔 note(대비 그림) + 확인 퀴즈(choice 3개).
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── 미션 ① (build) - 똥 '변수 노가다' (30차 이월분) ── */
  {
    key: "_mb31_m1_note",
    phase: "build",
    label: "지난 시간 복습 → 똥 두 개로 (변수 또 만들기)",
    hint:
      "지난 시간에 똥피하기를 완성했어요 - 똥에 맞으면 게임오버, 오래 버틸수록 점수.\n" +
      "오늘은 먼저 똥을 '두 개' 로 늘려 봐요. 그런데 아직 우리가 아는 방법은 하나뿐이에요:\n" +
      "둘째 똥을 담을 변수(poop_x2, poop_y2)를 '또' 만들고, 첫째 똥에 썼던 코드를 '그대로 또' 쓰는 거예요.\n\n" +
      "· 둘째 똥 변수·떨어지기·그리기는 미리 넣어 뒀어요(첫째 똥 코드를 거울처럼 베낀 것).\n" +
      "· 여러분은 ✎ 두 칸만 채워요: ① 둘째 똥 바닥 처리(첫 똥을 거울처럼) ② '또는(or)' 으로 둘 중 하나라도 맞으면 게임오버.\n\n" +
      "채우면서 느껴 봐요 - 똥을 하나 늘렸을 뿐인데 같은 코드를 또 써야 했죠? 똥이 10개면 열 벌을 복붙해야 해요.\n" +
      "이 불편함을 '리스트' 가 어떻게 없애 주는지 바로 다음 단계에서 배워요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_mb31_m1",
    phase: "build",
    label: "미션 ① - 똥 두 개 (변수 노가다)",
    hint:
      "둘째 똥 변수·떨어지기·그리기는 이미 넣어 뒀어요. ✎ 편집칸 두 곳만 채워요(들여쓰기는 Tab 으로):\n" +
      "   ① 둘째 똥 바닥 처리 - 첫째 똥 처리를 거울처럼(2 를 붙여) 그대로.\n" +
      "   ② 충돌 판정 - (첫째 똥 조건) '또는(or)' (둘째 똥 조건) 이면 게임오버.\n" +
      "다 채우면 '완성 코드 복사' 로 복사해 MakeCode 'Python' 에 (기존 코드 다 지우고) 붙여넣어요.\n" +
      "(똥 두 개가 함께 떨어지고, 하나라도 맞으면 슬픈 얼굴 - 그런데 코드가 길어졌죠?)",
    kind: "code_fill",
    imageUrl: "/mb30-m3.svg",
    imageAlt: "똥 두 개가 함께 떨어지고, 하나라도 주인공 칸에 닿으면 게임오버 되는 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    codeTemplate: CODE_M1,
    codeSlots: SLOTS_M1,
    maxLength: 0,
  },

  /* ── 리스트 개념 (problem) - 미션② 앞에 '리스트' 를 먼저 익힌다. 확인 퀴즈(choice 3)로 형성평가 ── */
  {
    key: "_mb31_list_note",
    phase: "problem",
    label: "새 개념 - 리스트(묶음) · 인덱스 · 반복",
    hint:
      "방금 똥을 하나 늘리는데 똑같은 코드를 또 썼죠? 똥이 10개면 변수 20개에 복붙 열 벌… 너무 힘들어요.\n" +
      "이걸 깔끔하게 해 주는 게 '리스트' 예요.\n\n" +
      "· 리스트(묶음): 여러 값을 '한 줄(상자 한 칸씩)' 에 모아 담아요. 오른쪽 그림처럼요.\n" +
      "    가로 위치들 → xs = [1, 3]   ·   세로 위치들 → ys = [0, 2]\n" +
      "· 인덱스(번호)로 꺼내기: 리스트는 '0번부터' 세요.\n" +
      "    xs[0] = 첫째 똥의 가로(1)   ·   xs[1] = 둘째 똥의 가로(3)   ← ★0부터★ 가 핵심!\n" +
      "· 반복(for): 'for i in range(2):' 는 i 를 0, 1 로 바꿔 가며 '같은 일' 을 해 줘요.\n" +
      "    똥마다 따로 쓰던 코드를 한 번만 쓰면 돼요. 똥이 10개면? range(10) 로 숫자 하나만 바꾸면 끝!\n\n" +
      "오른쪽 그림에서 '변수 여러 개' 와 '리스트 하나 + 반복' 을 견줘 봐요. 아래 퀴즈로 확인한 뒤,\n" +
      "다음 미션에서 우리 똥피하기를 리스트로 '다시 깔끔하게' 써 볼 거예요.",
    kind: "note",
    imageUrl: "/mb31-list.svg",
    imageAlt:
      "왼쪽은 poop_x·poop_x2·poop_x3 처럼 변수를 여러 개 만드는 노가다, 오른쪽은 xs=[1,3,…] 리스트 하나에 모아 인덱스(0,1,2)로 꺼내고 for 반복으로 한 번만 쓰는 모습을 대비한 그림",
    maxLength: 0,
  },
  {
    key: "mb31_list_q1",
    phase: "problem",
    label: "확인 ① - xs[0] 은 무엇일까요?",
    hint: "리스트 xs = [1, 3] 이 있어요. xs[0] 은 어떤 값일까요? (리스트는 0부터 센다는 걸 기억해요.)",
    kind: "choice",
    choices: [
      "1 - 0번(첫째) 자리의 값",
      "3 - 1번(둘째) 자리의 값",
      "아무것도 없음 - 0은 못 써요",
    ],
    maxLength: 0,
  },
  {
    key: "mb31_list_q2",
    phase: "problem",
    label: "확인 ② - ys[1] 은 무엇일까요?",
    hint: "리스트 ys = [0, 2] 가 있어요. ys[1] 은 어떤 값일까요?",
    kind: "choice",
    choices: [
      "2 - 1번(둘째) 자리의 값",
      "0 - 0번(첫째) 자리의 값",
      "1 - 괄호 안 숫자가 그대로 값이에요",
    ],
    maxLength: 0,
  },
  {
    key: "mb31_list_q3",
    phase: "problem",
    label: "확인 ③ - 똥을 10개로 늘린다면?",
    hint: "똥을 2개에서 10개로 늘릴 때, 어느 쪽이 더 편할까요?",
    kind: "choice",
    choices: [
      "리스트 + 반복 - range 숫자만 바꾸면 거의 끝",
      "변수 노가다 - 변수와 복붙을 여덟 벌 더 만들기",
      "둘 다 똑같이 힘들다",
    ],
    maxLength: 0,
  },

  /* ── 미션 ② (grill) - 리스트로 리팩토링 ── */
  {
    key: "_mb31_m2_note",
    phase: "grill",
    label: "새 개념 - 리스트로 다시 쓰기 (인덱스 xs[i] · 반복)",
    hint:
      "이제 방금 배운 리스트로, 우리 똥피하기를 '똑같이 동작하지만 짧게' 다시 써요.\n\n" +
      "· 똥들의 가로는 xs = [1, 3], 세로는 ys = [0, 2] 로 모아 뒀어요(맨 위에 제공).\n" +
      "· for i in range(2): 가 i 를 0, 1 로 바꿔 가며 같은 일을 해 줘요(이 줄도 제공).\n" +
      "· 그 안에서는 poop_x 대신 xs[i], poop_y 대신 ys[i] 처럼 '번호로 꺼내서' 써요.\n" +
      "    - i 가 0일 때 xs[0]·ys[0](첫째 똥), i 가 1일 때 xs[1]·ys[1](둘째 똥) - 자동으로 두 똥에 다 적용!\n\n" +
      "여러분은 ✎ 두 칸만 채워요: ① 똥 i 가 바닥에 닿으면(리셋+점수) ② 똥 i 가 주인공과 부딪히면(게임오버).\n" +
      "노가다 때 썼던 것과 '하는 일은 똑같은데', 이번엔 두 똥을 위해 '한 번만' 쓰면 돼요. 이게 리스트의 힘이에요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_mb31_m2",
    phase: "grill",
    label: "미션 ② - 리스트 + 반복으로 정리하기",
    hint:
      "리스트(xs·ys)·for 반복·그리기는 이미 넣어 뒀어요. for 안의 ✎ 편집칸 두 곳만 채워요(들여쓰기는 Tab 으로):\n" +
      "   ① 똥 i 가 바닥에 닿으면 - ys[i] 리셋 + xs[i] 무작위 + 점수 1 (if 줄 Tab 3번, 그 안 Tab 4번)\n" +
      "   ② 똥 i 가 주인공과 부딪히면 - playing 끄고 슬픈 얼굴·점수 (if 줄 Tab 3번, 그 안 Tab 4번)\n" +
      "괄호 안의 i 만 그대로 쓰면, 반복이 두 똥 모두에 적용해 줘요.\n" +
      "다 채우면 '완성 코드 복사' 로 복사해 MakeCode 'Python' 에 (기존 코드 다 지우고) 붙여넣어요.\n" +
      "(똥 두 개가 똑같이 떨어지는데, 코드는 노가다 때보다 훨씬 짧아졌죠?)",
    kind: "code_fill",
    imageUrl: "/mb31-m2.svg",
    imageAlt: "똥 두 개가 똑같이 떨어지지만, 코드는 리스트와 반복으로 한 번만 써서 짧아진 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    codeTemplate: CODE_M2,
    codeSlots: SLOTS_M2,
    maxLength: 0,
  },

  /* ── 미션 ③ (worksheet) - AI(바이브 코딩)로 나만의 기능 더하기 ── */
  {
    key: "_mb31_vibe_intro",
    phase: "worksheet",
    label: "미션 ③ - AI에게 기능 하나를 부탁하기 (보너스)",
    hint:
      "리스트로 똥피하기를 깔끔하게 완성했어요! 이제 '나만의 기능' 을 하나 더해요. 더하고 싶은 기능을 한 문장으로\n" +
      "말하면, AI가 '완성된 리스트 똥피하기 전체 + 그 기능' 이 든 코드를 만들어 줘요. 복사해서 MakeCode 'Python' 에\n" +
      "(기존 코드 모두 지우고) 붙여넣어 실행해요.\n\n" +
      "이런 걸 부탁해 볼 수 있어요:\n" +
      "  · 똥에 맞으면 '삐' 소리가 나게 해 줘\n" +
      "  · 점수가 10 을 넘으면 하트를 보여 줘\n" +
      "  · 똥을 '세 개' 로 늘려 줘 (리스트라서 쉬워요!)\n" +
      "  · A+B 를 같이 누르면 게임을 처음부터 다시 시작하게 해 줘\n\n" +
      "한 번에 안 될 수도 있어요 - 설명을 읽고 다시 부탁하거나 조금씩 고쳐 봐요.\n" +
      "(내가 AI에게 보낸 말과 받은 코드는 저장되고, 선생님이 볼 수 있어요.)",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "mb31_vibe",
    phase: "worksheet",
    label: "AI에게 기능 부탁하기 - 똥피하기에 더할 기능을 말로 적어요",
    hint:
      "더하고 싶은 기능을 한 번에 하나씩, 동작으로 적어요. AI가 리스트 똥피하기 전체 코드에 그 기능을 더해 줘요.\n" +
      "'코드 복사하기' 로 복사해 아래 [MakeCode 열기] 로 열고 'Python' 에 붙여넣어 실행해요.",
    kind: "vibe_code",
    vibeTarget: "microbit",
    // 바탕 = 완성형 '리스트' 똥피하기. 서버 fallback(만보기)은 25차 전용이라, 똥피하기는 반드시 베이스를 넘긴다.
    vibeBaseCode: DODGE_LIST_DONE,
    vibeNoun: "똥피하기",
    vibePlaceholder: "예: 똥을 세 개로 늘려 줘",
    maxLength: 0,
  },
  {
    key: "mb31_vibe_what",
    phase: "worksheet",
    label: "AI가 준 코드는 무엇을 하나요? (한 줄)",
    hint: "AI가 더해 준 부분이 '무엇을 하는지' 한 줄로 적어 봐요. (예: 똥이 세 개로 늘어난다.)",
    kind: "text",
    maxLength: 200,
  },
  {
    key: "mb31_vibe_mine",
    phase: "worksheet",
    label: "내가 더한 기능 - 친구들과 나눌 한 줄",
    hint: "내 똥피하기에 어떤 기능을 더했는지, 자랑하듯 한 줄로 적어 봐요.",
    kind: "text",
    maxLength: 200,
  },
  {
    key: "mb31_share",
    phase: "worksheet",
    label: "완성한 똥피하기 공유 링크 (선택)",
    hint:
      "다 만들었으면 MakeCode 에서 '공유(Share)' 로 링크를 만들어 여기에 붙여넣어요(선택). 선생님이 열어 볼 수 있어요.\n" +
      "(링크를 안 붙여도 성찰을 내면 게임이 열려요 - 이 칸은 꼭 채우지 않아도 돼요.)",
    kind: "long",
    maxLength: 6000,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "똥피하기 ④ - 리스트로 똥 여러 개",
  moodCheckEnabled: true,
  hideDoneButton: true,

  // 대기 화면 = 파이썬 타자 도우미(정보 수업 표준). "link:" 면 설명+새 탭 링크 카드로 뜬다.
  game: {
    heading: "기다리는 동안 - 파이썬 타자 연습",
    body:
      "수업이 시작되길 기다리는 동안 파이썬 타자 연습을 해 봐요.\n" +
      "아래 단추로 새 탭에서 열려요. 수업이 시작되면 돌아오세요.",
    url: "link:https://python-typing-helper.vercel.app/",
  },
  gameExplainer: empty(),

  // 성찰 보상 게임 = UNO. 성찰을 제출하면 '제출하고 게임하기' 로 열린다.
  // 게이트는 비운다 → 성찰 제출만으로 UNO 가 열린다(미션 링크로 막지 않음 - 교사 확정).
  rewardGame: {
    heading: "수고했어요! 🃏",
    body: "성찰을 제출했으면 잠깐 UNO 로 쉬어요. 선생님이 부르면 돌아오세요.",
    url: "https://uno-game-gilt.vercel.app/",
    requires: [],
  },

  progress: empty(),

  // 안내 보드 - 오늘 할 일(노가다 → 리스트 개념 → 리팩토링 → AI) + 30차 이어가기 짚기.
  assessment: {
    heading: "오늘 할 일 - 리스트로 똥 여러 개를 깔끔하게",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "노가다로 아프게 → 리스트로 구제",
        note:
          "지난 시간엔 똥 1개짜리 똥피하기를 완성했어요(충돌·점수). 오늘은 똥을 여러 개로 늘려요.\n" +
          "먼저 '변수 노가다' 로 똥 두 개를 만들어 복붙의 불편함을 느끼고, '리스트' 를 배워 똑같은 게임을\n" +
          "훨씬 짧은 코드로 다시 써요. 마지막엔 AI로 나만의 기능을 더해요.\n" +
          "좌표는 가로 x·세로 y 둘 다 0~4, 주인공은 맨 아랫줄(세로 4). 조작 A=왼쪽, B=오른쪽.",
        rows: [
          { label: "미션 ①", value: "똥 두 개 (변수 노가다 - 같은 코드를 또 복붙)" },
          { label: "리스트 개념", value: "여러 값을 한 묶음에 · 번호(인덱스)는 0부터 · 반복(for)" },
          { label: "미션 ②", value: "리스트 + 반복으로 다시 쓰기 (같은 동작, 짧은 코드)" },
          { label: "미션 ③", value: "AI로 나만의 기능 더하기 (보너스)" },
        ],
        highlights: [
          "미션마다 스타터를 복사해 MakeCode 'Python' 에 붙여넣고, ✎ 편집칸만 채워요.",
          "새 개념(리스트·인덱스·반복)은 미션② 앞 '리스트 개념' 단계에서 먼저 익혀요.",
        ],
      },
      {
        label: "오늘의 새 낱말",
        subtitle: "리스트 · 인덱스(0부터) · 반복 for",
        note:
          "'리스트' 는 여러 값을 한 묶음에 담는 상자예요(xs = [1, 3]). 그 안의 값은 '번호(인덱스)' 로 꺼내는데\n" +
          "0부터 세요 - xs[0] 이 첫째, xs[1] 이 둘째. '반복(for i in range(2))' 은 i 를 0, 1 로 바꿔 가며\n" +
          "같은 일을 해 줘요 - 똥마다 따로 쓰던 코드를 한 번만 쓰면 돼요.",
        rows: [
          { label: "리스트 (xs, ys)", value: "여러 값을 한 묶음에: xs = [1, 3]" },
          { label: "인덱스 (xs[0])", value: "번호로 꺼내기, ★0부터★: xs[0]=첫째, xs[1]=둘째" },
          { label: "반복 (for)", value: "for i in range(2): i 를 0,1 로 바꿔 같은 일 한 번만" },
          { label: "들여쓰기", value: "Tab 1번 = 한 단계. for 안 if 는 Tab 3번, 그 안은 Tab 4번" },
        ],
        highlights: [
          "리스트는 0부터 센다 - xs[0] 이 첫째 값. 이것만 확실히 익히면 돼요.",
        ],
      },
    ],
  },

  video: empty(),

  // 성찰 - 쉬운 말로 가볍게 돌아보기. 개인적이라 비공개. 성찰 제출로 UNO 가 열린다.
  reflectionQuestions: [
    "오늘 '리스트' 를 처음 배웠어요. 변수 노가다와 리스트 중 어느 쪽이 더 편했나요? 왜 그런지 한 줄로 적어 봐요.",
  ],
  reflectionPublic: false,

  // MakeCode(새 탭)·파이썬 타자(새 탭)·바이브(AI/새 탭)가 붙은 단계에서 창을 옮기는 것을 이탈로 안 센다.
  // (problem=리스트 개념·퀴즈 는 포털 안에서만 하므로 면제 대상 아님.)
  focusExempt: ["waiting", "build", "grill", "worksheet"],
  phaseLabels: {
    assessment: "안내",
    build: "미션 ① 똥 여러 개(노가다)",
    problem: "리스트 개념",
    grill: "미션 ② 리스트로 정리",
    worksheet: "미션 ③ AI로 나만의 기능",
  },
  // 교사 확정: 되돌아가기 off - 교사가 단계를 몰아준다. '새 개념은 가르친 뒤 쓰게' → 리팩토링(grill) 앞에
  // 반드시 리스트 개념(problem)이 온다. 성찰 제출만으로 UNO 가 열린다(rewardGame.requires 비움).
  // 마음 체크인 강제 관문은 freeNav off 에서 유효하다.
  phaseOrder: ["waiting", "assessment", "build", "problem", "grill", "worksheet", "reflection"],
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "똥피하기 ④ - 리스트로 똥 여러 개",
      body:
        "먼저 똥 두 개를 '변수 노가다' 로 만들어 복붙의 불편함을 느껴 봐요(미션①). 그다음 '리스트' 가\n" +
        "무엇이고 왜 필요한지 배우고(리스트 개념), 똑같은 게임을 리스트 + 반복으로 훨씬 짧게 다시 써요(미션②).\n" +
        "마지막엔 AI로 나만의 기능을 더해요(미션③). 각 미션은 스타터를 복사해 MakeCode 에 붙여넣고 ✎ 빈자리만\n" +
        "채워요(들여쓰기는 Tab 으로). 다 만든 뒤 성찰을 내면 UNO 가 열려요.",
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
    console.log(`↻ 갱신 - ${PLAN.title} (${doc.id})`);

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
          `· ${session.id} - 이미 학생이 들어와 있어 건드리지 않습니다 (--force 로 덮어쓸 수 있습니다)`,
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
    console.log(`＋ 등록 - ${PLAN.title} (${ref.id})`);
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} (23~30차와 같은 MakeCode 통, 키 mb31_* 로 충돌 없음)`);
  console.log("단계: 대기(타자) → 기분 → 안내 → 미션①(build 노가다) → 리스트 개념(problem) → 미션②(grill 리팩토링) → 미션③(worksheet AI) → 성찰. freeNav OFF. hideDoneButton true. 성찰 제출 → UNO.");
  console.log("리스트 개념: note(대비 그림 /mb31-list.svg) + 확인 choice 3개(xs[0]·ys[1]·노가다vs리스트). 미션 앞 새 개념 note. 들여쓰기 안내는 Tab 횟수(for 안 if 는 Tab 3번·그 안은 Tab 4번).");
  console.log("※ ⚠ list/for/range 는 30차까지 실측 집합에 없음 - 수업 전 makecode.microbit.org 'Python' 에서 미션② 변환·실행 실측 필요. 게이트: rewardGame.requires = [] - 성찰 제출만으로 UNO.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
