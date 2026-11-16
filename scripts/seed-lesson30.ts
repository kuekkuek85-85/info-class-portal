/**
 * 30차시 차시 계획 등록 — 「똥피하기 만들기 ③ (완성)」 (MakeCode 아크, 29차 이어가기).
 *
 *   node --env-file=.env.local scripts/seed-lesson30.ts
 *   node --env-file=.env.local scripts/seed-lesson30.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 29차(똥 계속 낙하)에 이어 똥피하기를 '완성' (교사 확정 2026-11-10, 2026-11-16 수업 후 재구성)
 *
 * 28·29차에서 주인공 이동·벽 처리·똥 낙하·바닥 리셋까지 만들어 '똥이 계속 떨어지는' 뼈대를 완성했다.
 * 30차는 그 위에 **'그리고(and)' 개념 → 충돌(게임오버) → 점수**를 얹어 게임을 완성한다. 새 개념은 쓰기 직전에 가르친다.
 *
 * ※ 2026-11-16 수업 결과 미션3(똥 2개)은 시간이 모자라 **31차로 이월**. 그리고 '그리고(and)' 를 미션1 앞에
 *   **개념·퀴즈 단계(problem)** 로 분리해 먼저 익히게 했다. 바이브 코딩(미션4)은 앞서 보류됨(아래 [보류] 주석).
 *
 *   개념·퀴즈(problem)  '그리고(and)' — 두 조건이 모두 참일 때만 참. note 설명 + choice 퀴즈 2개(교사와 함께 확인).
 *   미션1(build)  충돌 → 게임오버 — playing on/off 스위치로 forever 를 가드하고, 똥 바닥줄(poop_y==4)이
 *                 주인공 칸(poop_x==x)과 '같을 때(and)' playing 을 끄고 SAD 를 보인다. (새 개념: playing)
 *   미션2(grill)  점수 — 똥을 하나 피할 때(바닥 리셋) score+1, 게임오버 때 show_number(score). (새 개념: 점수·show_number)
 *   → 미션1·2 완성 후 바로 성찰 → UNO. (공유링크 제출 없음 — 미션3 과 함께 31차로 이월.)
 *   [31차 이월] 미션3(mvp) 똥 2개(변수 2벌·or) — CODE_M3/SLOTS_M3 상수에 보존. [보류] 미션4 바이브 — 아래 주석.
 *
 * 출처 미션: scratchpad dodge29_hybridA.py (3미션). ※ 구조 결정 — hybridA 는 `if 충돌 … else:(리셋+그리기)`
 *   구조지만, 본 차시 템플릿·vibeBaseCode 는 **충돌 판정을 그리기 뒤로 옮긴 평탄화(else 없음)** 버전을 쓴다.
 *   이유: 모든 code_fill ✎칸을 '비어도 유효한 완결 블록' 으로 두고(28·29 안전 패턴), blank-의존 else 가
 *   매달리지 않게. 동작 동일(poop_y==4 프레임엔 리셋이 안 걸리고 충돌 판정됨). 쓰는 명령은 전부 hybridA
 *   헤더가 2026-11-08 MakeCode 실측으로 변환 확인한 것과 동일(and/or·playing bool·show_number·show_icon·
 *   led.plot·randint·basic.forever·여러 global). 학생이 미션1~3 으로 만든 최종 코드 == vibeBaseCode.
 *
 * ## 세션 운영 (교사 확정 · 정보 수업 표준)
 *  · 대기 = 파이썬 타자 도우미(link:). 보상 = UNO(rewardGame, requires 비움 — 성찰 제출만으로 열림).
 *    hideDoneButton true. 활동 통 microbit-makecode.
 *  · freeNavigation false — 되돌아가기 off, 마음 체크인 강제 관문 유효. 흐름: 대기→기분→안내→and 개념·퀴즈→미션1→미션2→성찰.
 *  · 구현 미션마다 실행결과 SVG 우측 1/3: /mb30-m1.svg(충돌→SAD)·/mb30-m2.svg(충돌→SAD→점수 숫자).
 *    code_fill 미션은 maxLength 0(붙여넣기는 ✎칸). 들여쓰기 안내는 Tab 횟수로(Tab 1번=공백 4칸=한 단계).
 *  · '___'/'★★★' 리터럴 금지(블록 변환 깨짐). ✎칸은 own-line, 정답 영어 키워드 힌트 노출 금지.
 *
 * 바이브 걸림돌 점검: 학교망=25·26·27차에서 같은 Gemini 엔드포인트로 실제 수업했으므로 차단 아님.
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
const LESSON_NO = 30;
const FORCE = process.argv.includes("--force");

/** 23~29차와 같은 MakeCode 피지컬 아크 전용 통 (키 mb30_* 로 충돌 없음). */
const ACTIVITY_ID = "microbit-makecode";

/**
 * 미션1 스타터 (build) — 충돌 → 게임오버. 바탕 = 29차 완성(똥 계속 낙하) + playing on/off 스위치·if playing: 가드.
 * 학생은 forever 맨 끝에 '충돌 판정' 블록만 더한다(✎ a). 충돌을 '그리기 뒤' 에 둬서 블록이 완결 own-line 이 되게 함.
 */
const CODE_M1 = `# 똥피하기 ⑤ — 똥에 맞으면 게임 끝! (충돌 → 게임오버)
# playing 이 켜져 있으면(True) 게임이 돌아가고, 똥에 맞으면 꺼서(False) 멈춰요.
x = 2
poop_x = randint(0, 4)
poop_y = 0
playing = True

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
    global poop_x, poop_y, playing
    if playing:
        poop_y = poop_y + 1
        if poop_y > 4:
            poop_y = 0
            poop_x = randint(0, 4)
        basic.clear_screen()
        led.plot(x, 4)
        led.plot(poop_x, poop_y)
{{a}}
    basic.pause(300)
basic.forever(on_forever)`;

/**
 * 미션2 스타터 (grill) — 점수. 바탕 = 미션1 완성 + score=0. 바닥 리셋 안에서 score+1(✎ a), 게임오버 때
 * show_number(score)(✎ b). 두 ✎칸 모두 한 줄 완결 문장이라 비어도 유효.
 */
const CODE_M2 = `# 똥피하기 ⑥ — 점수 세기 (안 맞고 버틴 만큼 +1)
# 똥을 하나 피할 때마다(바닥에서 다시 떨어질 때) 점수 score 가 1 올라가요.
x = 2
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
{{a}}
        basic.clear_screen()
        led.plot(x, 4)
        led.plot(poop_x, poop_y)
        if poop_y == 4 and poop_x == x:
            playing = False
            basic.show_icon(IconNames.SAD)
{{b}}
    basic.pause(300)
basic.forever(on_forever)`;

/**
 * 미션3 스타터 (mvp) — 똥 2개. 바탕 = 미션2 완성 + 둘째 똥 변수·낙하·그리기(완성 제공, 첫 똥과 평행해 읽기용).
 * 학생은 ① 둘째 똥 바닥 리셋(✎ a, 첫 똥 리셋을 거울처럼) ② 'or' 충돌 판정(✎ b)만 더한다. 리스트 미학습 → 변수 2벌.
 */
const CODE_M3 = `# 똥피하기 ⑦ — 똥 두 개! (하나라도 맞으면 게임오버)
# 똥을 한 벌 더 만들어요(poop_x2, poop_y2). 둘 중 '하나라도' 맞으면 게임 끝.
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
 * 바이브 코딩 바탕 = 완성 똥피하기 (미션1~3 완성형, 똥 2개·점수·게임오버). AI가 여기에 '학생이 말한 기능' 을 더한다.
 * 위 미션 템플릿을 ✎칸까지 다 채운 코드와 **같은 결과**(평탄화 구조). makecode.microbit.org 'Python' 변환 전제.
 */
const DODGE_DONE = `x = 2
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
 * code_fill 빈칸(토큰) — 위 템플릿의 `{{a}}`/`{{b}}` 자리에 뜨는 인라인 편집칸. 힌트는 정답 영어 키워드를
 * 직접 쓰지 않고 뜻으로 돌려 적는다(coding-hint-indirect-answers). answer 를 채워 blur 자동 힌트(규칙+AI)가
 * 작동하게 한다. ★입력칸 안 placeholder 정답 노출 없음. 들여쓰기 공백은 hint 로만 안내. 전부 own-line 블록.
 */
type Slot = NonNullable<WorksheetQuestion["codeSlots"]>[number];

const SLOTS_M1: Slot[] = [
  {
    token: "a",
    label: "똥에 맞으면 게임 끝",
    hint:
      "똥이 바닥줄(poop_y 가 4)에 닿았고 '그리고' 그 칸이 주인공과 같은 칸(poop_x 가 x)일 때 →\n" +
      "playing 을 꺼짐으로 바꾸고, 슬픈 얼굴을 띄워요. 슬픈 얼굴 명령은 위 '새 개념' 설명의 예시\n" +
      "( basic.show_icon(IconNames.SAD) ) 를 참고해 그대로 쓰면 돼요. (갈림길 if 세 줄, 앞 if 줄은 Tab 2번, 그 안쪽 줄은 Tab 3번)",
    rows: 3,
    answer: "        if poop_y == 4 and poop_x == x:\n            playing = False\n            basic.show_icon(IconNames.SAD)",
  },
];

const SLOTS_M2: Slot[] = [
  {
    token: "a",
    label: "점수 1 올리기",
    hint: "똥을 하나 피했으니(바닥에서 다시 떨어질 때) score 를 1 늘려서 다시 score 에 담기 (들여쓰기 Tab 3번)",
    rows: 2,
    answer: "            score = score + 1",
  },
  {
    token: "b",
    label: "점수 보여주기",
    hint: "게임이 끝났을 때, 지금까지 모은 score 를 숫자로 화면에 보여 주기 (들여쓰기 Tab 3번)",
    rows: 2,
    answer: "            basic.show_number(score)",
  },
];

const SLOTS_M3: Slot[] = [
  {
    token: "a",
    label: "둘째 똥 바닥 처리",
    hint:
      "둘째 똥(poop_y2)도 바닥을 지나면(4 보다 커지면) poop_y2 를 0 으로, poop_x2 에 0~4 무작위 수,\n" +
      "score 1 늘리기. 바로 위 첫째 똥 처리를 '거울처럼' 2 를 붙여 쓰면 돼요. (갈림길 if 네 줄, 앞 if 줄은 Tab 2번, 그 안쪽 줄은 Tab 3번)",
    rows: 4,
    answer: "        if poop_y2 > 4:\n            poop_y2 = 0\n            poop_x2 = randint(0, 4)\n            score = score + 1",
  },
  {
    token: "b",
    label: "둘 중 하나라도 맞으면",
    hint:
      "두 똥 중 '하나라도' 주인공과 같은 칸에서 바닥에 닿으면 게임오버. (첫째 똥 조건) '또는' (둘째 똥 조건)\n" +
      "일 때 → playing 을 끄고, 슬픈 얼굴과 점수를 보여 줘요. (갈림길 if 네 줄, 앞 if 줄은 Tab 2번, 그 안쪽 줄은 Tab 3번)",
    rows: 4,
    answer:
      "        if (poop_y == 4 and poop_x == x) or (poop_y2 == 4 and poop_x2 == x):\n            playing = False\n            basic.show_icon(IconNames.SAD)\n            basic.show_number(score)",
  },
];

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 활동지 — and 개념·퀴즈(problem) + 구현 미션 2개(build·grill), 각 미션 앞에 새 개념 설명(note).
//   미션3(mvp)·바이브(worksheet)는 31차 이월/보류로 아래 주석 보존:
// note → vibe_code → text 2칸 → 메이크코드 공유 링크(long). 각 미션에 실행결과 SVG(설명 우측 1/3 폭).
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── and 개념·퀴즈 (problem) — 미션1 앞에 '그리고(and)' 를 먼저 익힌다. choice 퀴즈는 교사가 함께 확인 ── */
  {
    key: "_mb30_and_note",
    phase: "problem",
    label: "새 개념 — '그리고(and)'",
    hint:
      "오늘은 똥피하기를 '완성' 해요. 그 전에 꼭 필요한 '그리고(and)' 를 먼저 익혀요.\n\n" +
      "· 그리고(and): 두 조건이 '모두' 참일 때만 참이에요. 하나라도 거짓이면 전체가 거짓이에요.\n" +
      "    - 참 and 참  → 참 (둘 다 맞음)\n" +
      "    - 참 and 거짓 → 거짓 (하나만 맞음)\n" +
      "    - 거짓 and 거짓 → 거짓 (둘 다 틀림)\n" +
      "· 똥피하기에서 '부딪힘' 은 두 조건이 모두 맞을 때예요:\n" +
      "    똥이 맨 아랫줄에 왔고(poop_y 가 4) '그리고(and)' 그 칸이 주인공 칸(poop_x 가 x) → 부딪힘!\n" +
      "    똥이 바닥에 왔어도 주인공과 다른 칸이면, 한 조건만 참이라 아직 안 부딪혀요.\n\n" +
      "아래 퀴즈를 풀어 봐요. 퀴즈 ① 은 and 의 뜻, 퀴즈 ②③ 은 그림을 보고 참/거짓을 골라 맞혀 봐요.\n" +
      "(여기서 익힌 and 를 미션 1 에서 바로 써요.)",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "mb30_and_q1",
    phase: "problem",
    label: "퀴즈 ① — '그리고(and)' 는 언제 참일까?",
    hint: "두 조건을 and 로 묶었을 때, 전체가 '참' 이 되는 경우는 어느 것일까요?",
    kind: "choice",
    choices: [
      "두 조건이 '모두' 참일 때만",
      "두 조건 중 '하나라도' 참이면",
      "두 조건이 모두 거짓일 때",
    ],
    maxLength: 0,
  },
  {
    key: "mb30_and_q2",
    phase: "problem",
    label: "퀴즈 ② - 이 상황, 부딪힐까요? (서로 다른 칸)",
    hint:
      "오른쪽 그림을 보고, 두 조건이 각각 참(True)인지 거짓(False)인지 고르고, 둘을 and 로 묶은\n" +
      "전체 결과도 골라 보세요.",
    kind: "and_quiz",
    andQuiz: {
      cond1: "똥이 맨 아랫줄(바닥)에 닿았다",
      cond2: "똥이 주인공과 같은 칸이다",
      cond1True: true, // 똥이 바닥에 있음 → 참
      cond2True: false, // 주인공과 다른 칸 → 거짓
      imageUrl: "/mb30-and2.svg",
      imageAlt: "똥은 맨 아랫줄 오른쪽 칸, 주인공은 맨 아랫줄 왼쪽 칸에 있어 서로 다른 칸인 상황",
    },
    maxLength: 0,
  },
  {
    key: "mb30_and_q3",
    phase: "problem",
    label: "퀴즈 ③ - 이 상황, 부딪힐까요? (같은 칸)",
    hint:
      "이번에는 그림이 달라요. 두 조건이 각각 참(True)인지 거짓(False)인지 고르고, 둘을 and 로 묶은\n" +
      "전체 결과도 골라 보세요.",
    kind: "and_quiz",
    andQuiz: {
      cond1: "똥이 맨 아랫줄(바닥)에 닿았다",
      cond2: "똥이 주인공과 같은 칸이다",
      cond1True: true, // 바닥 → 참
      cond2True: true, // 같은 칸 → 참
      imageUrl: "/mb30-and3.svg",
      imageAlt: "똥이 맨 아랫줄에서 주인공과 같은 칸에 겹쳐 있는 충돌 상황",
    },
    maxLength: 0,
  },

  /* ── 미션 1 (build) — 충돌 → 게임오버 ── */
  {
    key: "_mb30_m1_note",
    phase: "build",
    label: "새 개념 — 켜짐/꺼짐 스위치와 '그리고(and)'",
    hint:
      "오늘은 똥피하기를 '완성' 해요! 먼저 똥에 맞으면 게임이 끝나게 만들어요.\n\n" +
      "· 켜짐/꺼짐 스위치(playing): True(켜짐)면 게임이 돌아가고, False(꺼짐)면 멈춰요. forever 맨 앞에서\n" +
      "  'if playing:' 으로 감싸, 꺼지면 아무 것도 안 움직이게 해요(똥도 주인공도 멈춤).\n" +
      "· 그리고(and)(앞 단계 복습): 두 조건이 '모두' 맞을 때만 참. 'poop_y 가 4 and poop_x 가 x' →\n" +
      "  똥이 맨 아랫줄에 왔고 '그리고' 그 칸이 주인공 칸일 때 (= 부딪힘!).\n" +
      "· 슬픈 얼굴로 '게임 끝' 알리기: 똥에 맞으면 게임이 끝났다는 걸 눈에 보이게 알려 줘야겠죠? 마이크로비트\n" +
      "  LED 화면에 '그림(아이콘) 보여주기' 명령을 쓰면, 기계에 미리 들어 있는 여러 표정 그림 중 하나를 골라\n" +
      "  띄울 수 있어요. 여기선 그중 '슬픈 얼굴' 그림을 골라 띄워요. 이 명령은 문법이 길어 외우기 어려우니,\n" +
      "  아래 예시를 그대로 보고 따라 쓰면 돼요:\n" +
      "      슬픈 얼굴은 이렇게 띄워요  →  basic.show_icon(IconNames.SAD)\n" +
      "  (이 한 줄을 쓰면 LED 에 슬픈 얼굴이 떠요. 괄호·점·대문자까지 똑같이 적어요.)\n\n" +
      "정리하면, 충돌하면 playing 을 꺼서(False) 멈추고, basic.show_icon(IconNames.SAD) 로 슬픈 얼굴을 띄워요.\n" +
      "아래 미션에서 직접 채워요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_mb30_m1",
    phase: "build",
    label: "미션 1 — 똥에 맞으면 게임 끝 (충돌 → 게임오버)",
    hint:
      "29차에서 만든 '똥이 계속 떨어지는' 코드예요. playing 스위치는 이미 켜 뒀어요.\n" +
      "forever 의 ✎ 편집칸에 '충돌 판정' 세 줄을 써요(들여쓰기는 Tab 으로 넣어요 — 칸마다 Tab 몇 번인지 아래에 적어 뒀어요):\n" +
      "   · 똥이 바닥줄(poop_y 가 4)에 닿았고 '그리고' 그 칸이 주인공 칸(poop_x 가 x)이면 (이 if 줄 — Tab 2번)\n" +
      "   · playing 을 꺼짐으로 바꾸고, 슬픈 얼굴을 보여 주기 (그 안 두 줄 — Tab 3번. : 다음 Enter 치면 자동으로 한 칸 더)\n" +
      "다 채우면 '완성 코드 복사' 로 복사해 MakeCode 'Python' 에 (기존 코드 다 지우고) 붙여넣어요.\n" +
      "(이제 똥에 맞으면 슬픈 얼굴이 뜨고 멈춰요. 점수는 미션 2에서 더해요.)",
    kind: "code_fill",
    imageUrl: "/mb30-m1.svg",
    imageAlt: "똥이 주인공과 같은 칸에서 바닥에 닿자 화면에 슬픈 얼굴이 뜨고 멈추는 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    codeTemplate: CODE_M1,
    codeSlots: SLOTS_M1,
    maxLength: 0,
  },

  /* ── 미션 2 (grill) — 점수 ── */
  {
    key: "_mb30_m2_note",
    phase: "grill",
    label: "새 개념 — 점수 세기와 숫자 보여주기",
    hint:
      "이제 '점수' 를 넣어요. 똥을 하나 피할 때마다 1점씩 올라가게요.\n\n" +
      "· 점수 그릇(score): 맨 위에서 score = 0 으로 시작해 뒀어요. 똥을 하나 피하면(똥이 바닥에서 다시\n" +
      "  떨어질 때) score 를 1 늘려요 — 'score = score + 1'(지금 값에 1 더해 다시 담기).\n" +
      "· 숫자 보여주기(show_number): 게임이 끝났을 때 'basic.show_number(score)' 로 모은 점수를 화면에\n" +
      "  숫자로 띄워요.\n\n" +
      "아래 미션에서 두 곳(점수 올리기·점수 보여주기)을 채워요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_mb30_m2",
    phase: "grill",
    label: "미션 2 — 점수 세기",
    hint:
      "충돌·게임오버는 미션 1에서 완성했어요. 이제 점수를 더해요.\n" +
      "forever 의 ✎ 편집칸 두 곳을 채워요(들여쓰기는 Tab 으로 넣어요 — 칸마다 Tab 몇 번인지 아래에 적어 뒀어요):\n" +
      "   ① 똥을 하나 피했을 때(바닥 리셋 안) — score 를 1 늘려서 다시 score 에 담기 (들여쓰기 Tab 3번)\n" +
      "   ② 게임이 끝났을 때 — 모은 score 를 숫자로 화면에 보여 주기 (들여쓰기 Tab 3번)\n" +
      "다 채우면 '완성 코드 복사' 로 복사해 MakeCode 'Python' 에 붙여넣어요.\n" +
      "(이제 오래 버틸수록 점수가 오르고, 게임오버 때 숫자로 보여요.)",
    kind: "code_fill",
    imageUrl: "/mb30-m2.svg",
    imageAlt: "게임오버 뒤 화면에 모은 점수가 숫자로 뜨는 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    codeTemplate: CODE_M2,
    codeSlots: SLOTS_M2,
    maxLength: 0,
  },

  /*
   * ── [31차 이월] 미션 3 (똥 2개 + 'or') ──
   * 2026-11-16 교사 지시: 30차 수업 시간이 모자라 미션3 을 못 함 → 31차로 넘긴다.
   * 바탕 코드·빈칸은 위 CODE_M3 / SLOTS_M3 상수에 그대로 보존(31차 seed 에서 재사용).
   * 되살릴 때: 아래 note+code_fill(phase "mvp")을 유효 코드로 풀고 phaseOrder/phaseLabels/focusExempt 에 "mvp" 추가.
   *
  { key:"_mb30_m3_note", phase:"mvp", label:"새 개념 — 똥 두 개와 '또는(or)'", kind:"note", maxLength:0, hint: ... },
  { key:"_mb30_m3", phase:"mvp", label:"미션 3 — 똥 두 개!", kind:"code_fill",
    codeTemplate: CODE_M3, codeSlots: SLOTS_M3, imageUrl:"/mb30-m3.svg", ... },
  */

  /*
   * ── [보류] 미션 4 (worksheet) — 바이브 코딩: AI로 나만의 기능 추가 (27차 메커니즘 재사용) ──
   * 2026-11-16 교사 지시로 30차에서 제거(시간 부족). 31차 등 재사용 위해 아래 네 항목 원문 그대로 주석 보존.
   * 되살릴 때: 이 블록을 유효 코드로 풀고 ① phaseOrder/phaseLabels/focusExempt 에 "worksheet" 추가
   *   ② rewardGame.requires.phase 와 mb30_share.phase 를 "worksheet" 로 되돌리고 mb30_share 를 이 블록 끝으로.
   *   (vibeBaseCode 는 위 DODGE_DONE 상수를 그대로 쓴다.)
   *
  {
    key: "_mb30_vibe_intro",
    phase: "worksheet",
    label: "미션 4 — AI에게 기능 하나를 부탁하기",
    hint:
      "똥피하기를 완성했어요! 이제 '나만의 기능' 을 하나 더해요. 더하고 싶은 기능을 한 문장으로 말하면,\n" +
      "AI가 '완성된 똥피하기 전체 + 그 기능' 이 든 코드를 만들어 줘요. 복사해서 MakeCode 'Python' 에\n" +
      "(기존 코드 모두 지우고) 붙여넣어 실행해요.\n\n" +
      "이런 걸 부탁해 볼 수 있어요:\n" +
      "  · 똥에 맞으면 '삐' 소리가 나게 해 줘\n" +
      "  · 점수가 10 을 넘으면 하트를 보여 줘\n" +
      "  · A+B 를 같이 누르면 게임을 처음부터 다시 시작하게 해 줘\n\n" +
      "한 번에 안 될 수도 있어요 — 설명을 읽고 다시 부탁하거나 조금씩 고쳐 봐요.\n" +
      "(내가 AI에게 보낸 말과 받은 코드는 저장되고, 선생님이 볼 수 있어요.)",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "mb30_vibe",
    phase: "worksheet",
    label: "AI에게 기능 부탁하기 — 똥피하기에 더할 기능을 말로 적어요",
    hint:
      "더하고 싶은 기능을 한 번에 하나씩, 동작으로 적어요. AI가 똥피하기 전체 코드에 그 기능을 더해 줘요.\n" +
      "'코드 복사하기' 로 복사해 아래 [MakeCode 열기] 로 열고 'Python' 에 붙여넣어 실행해요.",
    kind: "vibe_code",
    vibeTarget: "microbit",
    // 바탕 = 완성형 똥피하기. 서버 fallback(만보기)은 25차 전용이라, 똥피하기는 반드시 베이스를 넘긴다.
    vibeBaseCode: DODGE_DONE,
    vibeNoun: "똥피하기",
    vibePlaceholder: "예: 똥에 맞으면 '삐' 소리가 나게 해 줘",
    maxLength: 0,
  },
  {
    key: "mb30_vibe_what",
    phase: "worksheet",
    label: "AI가 준 코드는 무엇을 하나요? (한 줄)",
    hint: "AI가 더해 준 부분이 '무엇을 하는지' 한 줄로 적어 봐요. (예: 점수가 10 넘으면 하트가 나온다.)",
    kind: "text",
    maxLength: 200,
  },
  {
    key: "mb30_vibe_mine",
    phase: "worksheet",
    label: "내가 더한 기능 — 친구들과 나눌 한 줄",
    hint: "내 똥피하기에 어떤 기능을 더했는지, 자랑하듯 한 줄로 적어 봐요.",
    kind: "text",
    maxLength: 200,
  },
   */

  /* 미션3(똥 2개)·완성 공유링크(mb30_share) 는 31차로 이월. 30차는 미션1·2 완성 후 바로 성찰 → UNO. */
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "똥피하기 만들기 ③ (완성)",
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

  // 성찰 보상 게임 = UNO. 성찰을 제출하면 '제출하고 게임하기' 로 열린다.
  // 미션3(똥 2개)·공유링크를 31차로 이월했으므로 게이트는 비운다 → 성찰 제출만으로 UNO 가 열린다.
  rewardGame: {
    heading: "수고했어요! 🃏",
    body: "성찰을 제출했으면 잠깐 UNO 로 쉬어요. 선생님이 부르면 돌아오세요.",
    url: "https://uno-game-gilt.vercel.app/",
    requires: [],
  },

  progress: empty(),

  // 안내 보드 — 오늘 할 일(and 개념·퀴즈 + 미션 1·2) + 29차 이어가기 짚기.
  assessment: {
    heading: "오늘 할 일 — 똥피하기 완성하기",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "and 익히기 → 충돌 → 점수",
        note:
          "지난 시간엔 똥이 계속 떨어지게 만들었어요. 오늘은 '그리고(and)' 를 먼저 익히고, 똥피하기를\n" +
          "완성해요 — 똥에 맞으면 게임오버(미션1), 점수 세기(미션2). (똥 두 개는 다음 시간에 이어서 해요.)\n" +
          "좌표는 가로 x·세로 y 둘 다 0~4, 주인공은 맨 아랫줄(세로 4). 조작 A=왼쪽, B=오른쪽.",
        rows: [
          { label: "개념·퀴즈", value: "'그리고(and)' — 두 조건이 모두 맞을 때만 참 (퀴즈로 확인)" },
          { label: "미션 1", value: "똥에 맞으면 게임 끝 (충돌 → 슬픈 얼굴)" },
          { label: "미션 2", value: "점수 세기 (오래 버틸수록 +1, 끝나면 숫자로)" },
          { label: "채점은", value: "점수·자동채점 없어요 — 만들어 붙여넣어 보면 성공" },
        ],
        highlights: [
          "미션마다 스타터를 복사해 MakeCode 'Python' 에 붙여넣고, ✎ 편집칸만 채워요.",
          "새 개념(그리고 and / 켜짐·꺼짐 playing / 점수·show_number)은 미션 바로 앞 설명을 먼저 읽어요.",
        ],
      },
      {
        label: "오늘의 새 낱말",
        subtitle: "그리고(and) · 켜짐/꺼짐 스위치 · 점수",
        note:
          "'그리고(and)' 는 두 조건이 '모두' 맞아야 참이에요(하나라도 틀리면 거짓). playing 은 게임의\n" +
          "'켜짐/꺼짐 스위치' 예요(True/False) — 똥에 맞으면 꺼서 멈춰요. 점수(score)는 똥을 피할 때마다\n" +
          "1 씩 늘려(+1) 모았다가, 게임이 끝나면 숫자로 보여 줘요(show_number).",
        rows: [
          { label: "그리고 (and)", value: "두 조건이 모두 맞아야 참 (똥이 바닥 and 같은 칸)" },
          { label: "켜짐/꺼짐 (playing)", value: "True=게임 진행, False=멈춤" },
          { label: "점수 (score)", value: "피할 때마다 +1, 끝나면 숫자로 보여주기" },
          { label: "들여쓰기", value: "✎ 칸에서 Tab 1번 = 한 단계(공백 4칸). if 줄은 Tab 2번, 그 안은 Tab 3번" },
        ],
        highlights: [
          "and=두 조건 모두 맞아야 참 — 이것만 확실히 익히면 돼요.",
        ],
      },
    ],
  },

  video: empty(),

  // 성찰 — 쉬운 말로 가볍게 돌아보기. 개인적이라 비공개. 성찰 제출로 UNO 가 열린다.
  reflectionQuestions: [
    "똥피하기를 완성했어요. 오늘 가장 뿌듯했던 부분, 또는 가장 어려웠던 부분은 어디였나요?",
  ],
  reflectionPublic: false,

  // MakeCode(새 탭)·파이썬 타자(새 탭)가 붙은 단계에서 창을 옮기는 것을 이탈로 안 센다.
  // (problem=and 개념·퀴즈 는 포털 안에서만 하므로 면제 대상 아님.)
  focusExempt: ["waiting", "build", "grill"],
  phaseLabels: {
    assessment: "안내",
    problem: "and 개념·퀴즈",
    build: "미션 1 — 충돌(게임오버)",
    grill: "미션 2 — 점수",
  },
  phaseOrder: ["waiting", "assessment", "problem", "build", "grill", "reflection"],
  // 교사 확정: 되돌아가기 off — 교사가 단계를 몰아준다(안내 → and 개념·퀴즈 → 미션1 → 미션2 → 성찰).
  // 미션3(똥 2개)은 31차로 이월. 성찰 제출만으로 UNO 가 열린다(rewardGame.requires 비움).
  // 마음 체크인 강제 관문은 freeNav off 에서 유효하다.
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "똥피하기 만들기 ③ (완성)",
      body:
        "먼저 '그리고(and)' 를 퀴즈로 익히고, 지난 시간에 만든 '똥이 계속 떨어지는' 똥피하기를 완성해요 —\n" +
        "충돌·게임오버(미션1), 점수(미션2). 각 미션은 새 개념 설명을 먼저 읽고, 스타터를 복사해 MakeCode 에\n" +
        "붙여넣고 ✎ 빈자리만 채워요(들여쓰기는 Tab 으로). 다 만든 뒤 성찰을 내면 UNO 가 열려요.",
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (23~29차와 같은 MakeCode 통, 키 mb30_* 로 충돌 없음)`);
  console.log("단계: 대기(타자) → 기분 → 안내 → and 개념·퀴즈(problem) → 미션1(build 충돌) → 미션2(grill 점수) → 성찰. freeNav OFF. hideDoneButton true. 성찰 제출 → UNO.");
  console.log("개념·퀴즈: and(choice 2개, 교사와 함께 확인). 미션 앞 새 개념 note(playing / 점수·show_number). 들여쓰기 안내는 Tab 횟수(8칸=Tab 2번·12칸=Tab 3번).");
  console.log("※ 미션3(똥 2개)은 2026-11-16 수업 후 31차로 이월(CODE_M3/SLOTS_M3 보존). 미션4(바이브)는 앞서 보류. 게이트: rewardGame.requires = [] — 성찰 제출만으로 UNO.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
