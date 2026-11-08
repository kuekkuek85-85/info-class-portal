/**
 * 28차시 차시 계획 등록 — 「똥피하기 만들기 ① (뼈대)」 (마이크로비트 MakeCode 아크, 27차 다음).
 *
 *   node --env-file=.env.local scripts/seed-lesson28.ts
 *   node --env-file=.env.local scripts/seed-lesson28.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 27차(가위바위보)에 이어지는 MakeCode 아크 — 똥피하기 뼈대 (하이브리드 A)
 *
 * 23~27차에서 LED·변수·흔들기·randint·버튼·if/elif 를 익혔다. 28차는 **게임 루프(basic.forever)**,
 * **LED 좌표 그리기(led.plot / basic.clear_screen)**, **버튼 이벤트로 주인공 좌우 이동** 을 더해 '똥피하기'
 * 의 뼈대(주인공이 움직이고 똥이 떨어진다)를 만든다. 충돌·점수는 29차. 조작은 **버튼 A=왼쪽 / B=오른쪽**
 * (하이브리드 A — 버튼은 이벤트 핸들러라 즉시 반응, forever 는 그리기+똥만). 좌표는 가로 x·세로 y 둘 다 0~4,
 * 주인공은 맨 아랫줄(y=4).
 *
 *   미션1(build)   주인공 좌우 이동 — **벽 처리 없음**(화면 밖으로 나가는 버그를 일부러 드러냄). 빈칸: A의 x-1,
 *                  주인공 led.plot. (B·clear_screen 은 예시로 제공.)
 *   미션2(grill)   벽에서 멈추기 — if x<0:x=0 / if x>4:x=4 를 각 버튼에 더한다(미션1 버그를 고침).
 *   미션3(mvp)     똥 한 개 낙하 — **바닥 처리 없음**(한 번 떨어지고 사라지는 버그를 드러냄). 빈칸: poop_y+1, 똥 led.plot.
 *   미션4(problem) 바닥 처리 — if poop_y>4: poop_y=0; poop_x=randint(0,4) 로 계속 떨어지게(미션3 버그를 고침).
 *                  + 메이크코드 공유 링크 제출(mb28_share, long, 자동저장).
 *
 * 설계·실측: docs/superpowers/specs/2026-10-22-info-microbit-arc-lesson24-design.md 아크의 '똥피하기' 자리.
 *
 * ## MakeCode 실측 검증 (2026-11-08, makecode.microbit.org '파이썬 보기' — Monaco setValue → 블록 전환)
 *
 *  · 전체(미션4 완성형)를 넣어 **오류 마커 0개**, '블록' 전환 정상, 시뮬레이터 동작 확인.
 *  · input.on_button_pressed(Button.A/B, 함수) 이벤트 핸들러 안 global x + 경계(if x<0:x=0) →
 *    'A 버튼 누를 때: x에 x-1 저장, 만약 x<0 이면 x에 0 저장' 블록으로 변환 확인(즉시 반응).
 *  · led.plot(x, y) · basic.clear_screen() · randint(0, 4) · basic.forever · global(여러 변수) ·
 *    if/비교(<,>,==) — 모두 변환 확인. '___'/'★★★' 는 쓰지 않는다(블록 변환 깨짐 — 25차 실측).
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
const LESSON_NO = 28;
const FORCE = process.argv.includes("--force");

/** 23~27차와 같은 MakeCode 피지컬 아크 전용 통. */
const ACTIVITY_ID = "microbit-makecode";
const MAKECODE_URL = "https://makecode.microbit.org/";

/**
 * 미션1 스타터 — 주인공 좌우 이동(벽 처리 없음). 버튼은 이벤트(즉시 반응), forever 는 그리기만.
 * 빈칸: ① A 버튼의 'x 를 1 줄이기'(B 는 예시로 완성 제공 — 거꾸로 따라 보기), ② 주인공 led.plot.
 * clear_screen 은 완성 제공(미션1의 핵심은 '움직이기'). 벽이 없어 x 가 음수/5가 되면 주인공이 화면 밖으로
 * 사라지는 버그를 일부러 남긴다 → 미션2에서 고친다. 빈 블록 없음(모든 함수에 실제 문장 1줄 이상 — 변환 OK).
 */
const CODE_M1 = `# 똥피하기 ① — 주인공을 좌우로 움직이기 (A=왼쪽, B=오른쪽)
# 좌표: 가로 x 는 0~4. 주인공은 맨 아랫줄(세로 y=4)에 있어요.
x = 2

def on_button_pressed_a():
    global x
{{a}}
input.on_button_pressed(Button.A, on_button_pressed_a)

def on_button_pressed_b():
    global x
    x = x + 1
input.on_button_pressed(Button.B, on_button_pressed_b)

def on_forever():
    basic.clear_screen()
{{b}}
    basic.pause(200)
basic.forever(on_forever)`;

/**
 * 미션2 스타터 — 벽에서 멈추기. 각 버튼 함수에 'x 가 0보다 작아지면 0으로 / 4보다 커지면 4로' 를 더한다.
 * 함수 본문에 x = x - 1 / x = x + 1 이 실제 문장으로 있으니, 학생이 그 아래 빈자리에 if 두 줄을 쓴다.
 */
const CODE_M2 = `# 똥피하기 ② — 벽에서 멈추기 (화면 밖으로 안 나가게)
# 가로 x 는 0~4 만 될 수 있어요. 더 가면 벽에서 멈춰요.
x = 2

def on_button_pressed_a():
    global x
    x = x - 1
{{a}}
input.on_button_pressed(Button.A, on_button_pressed_a)

def on_button_pressed_b():
    global x
    x = x + 1
{{b}}
input.on_button_pressed(Button.B, on_button_pressed_b)

def on_forever():
    basic.clear_screen()
    led.plot(x, 4)
    basic.pause(200)
basic.forever(on_forever)`;

/**
 * 미션3 스타터 — 똥 한 개 낙하(바닥 처리 없음). 주인공 부분(미션1·2 완성형)은 그대로 제공, 학생은 forever 에
 * 똥 낙하 두 줄만 더한다. 빈칸: ① poop_y 를 1 늘리기(세로로 한 칸 내려오기), ② 똥 led.plot. 바닥 처리가
 * 없어 poop_y 가 4를 넘으면 화면 밖이라 똥이 한 번 떨어지고 사라지는 버그를 남긴다 → 미션4에서 고친다.
 */
const CODE_M3 = `# 똥피하기 ③ — 똥 한 개 떨어뜨리기
# 똥은 아무 칸(가로 poop_x)에서 맨 위(세로 0)부터 아래로 내려와요.
x = 2
poop_x = randint(0, 4)
poop_y = 0

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
    global poop_x, poop_y
    basic.clear_screen()
    led.plot(x, 4)
{{a}}
{{b}}
    basic.pause(300)
basic.forever(on_forever)`;

/**
 * 미션4 스타터 — 바닥 처리. 똥이 바닥(4)을 지나면 맨 위(0)·새 칸에서 다시 떨어지게. forever 에 if 세 줄을 더한다.
 * 빈칸: if poop_y > 4: / poop_y = 0 / poop_x = randint(0, 4). forever 본문에 clear_screen·led.plot·poop_y+1 이
 * 실제 문장으로 있어 변환 OK. 이걸 채우면 28차 뼈대(주인공 움직이고 똥이 계속 떨어짐) 완성.
 */
const CODE_M4 = `# 똥피하기 ④ — 바닥에 닿으면 다시 위에서 (계속 떨어지게)
# 똥이 바닥(세로 4)을 지나면 맨 위(0)로 올리고, 새 칸(무작위)에서 다시 떨어뜨려요.
x = 2
poop_x = randint(0, 4)
poop_y = 0

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
    global poop_x, poop_y
    basic.clear_screen()
    led.plot(x, 4)
    poop_y = poop_y + 1
{{a}}
    led.plot(poop_x, poop_y)
    basic.pause(300)
basic.forever(on_forever)`;

/**
 * code_fill 빈칸(토큰) 설정 — 위 템플릿의 `{{a}}`/`{{b}}` 자리에 뜨는 인라인 편집칸. 힌트(label·hint)는
 * 정답 영어 키워드를 직접 쓰지 않고 뜻으로 돌려 적는다(coding-hint-indirect-answers). ★입력칸 안에
 * 정답을 흐리게 보여주는 placeholder 는 두지 않는다(교사 요청 2026-11-09 — 정답 노출 방지). 들여쓰기는
 * 공백 4칸 — hint 로만 안내한다.
 */
type Slot = NonNullable<WorksheetQuestion["codeSlots"]>[number];

const SLOTS_M1: Slot[] = [
  {
    token: "a",
    label: "왼쪽으로 한 칸",
    hint: "x 를 1 줄여서 다시 x 에 담기 (바로 아래 B 버튼이 '1 늘리기' 예시예요 — 거꾸로)",
    rows: 2,
  },
  {
    token: "b",
    label: "주인공 켜기",
    hint: "가로 x, 세로 4 자리에 불 하나 켜기 (화면에 점 하나 찍는 명령)",
    rows: 2,
  },
];

const SLOTS_M2: Slot[] = [
  {
    token: "a",
    label: "왼쪽 벽",
    hint: "x 가 0 보다 작아지면 x 를 0 으로 (갈림길 if 두 줄, 들여쓰기 4칸)",
    rows: 2,
  },
  {
    token: "b",
    label: "오른쪽 벽",
    hint: "x 가 4 보다 커지면 x 를 4 로 (갈림길 if 두 줄)",
    rows: 2,
  },
];

const SLOTS_M3: Slot[] = [
  {
    token: "a",
    label: "똥 한 칸 아래로",
    hint: "poop_y 를 1 늘려서 다시 poop_y 에 담기 (세로로 한 칸 내려오기)",
    rows: 2,
  },
  {
    token: "b",
    label: "똥 켜기",
    hint: "가로 poop_x, 세로 poop_y 자리에 불 하나 켜기",
    rows: 2,
  },
];

const SLOTS_M4: Slot[] = [
  {
    token: "a",
    label: "바닥 처리",
    hint: "똥이 바닥을 지나면(poop_y 가 4 보다 커지면) poop_y 를 0 으로 되돌리고, poop_x 에 0~4 중 무작위 수 담기 (갈림길 if 세 줄)",
    rows: 3,
  },
];

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 활동지 — 미션 4개를 build·grill·mvp·problem 네 단계에 하나씩. 범용 슬롯을 빌려 이름은 phaseLabels 로 붙인다.
// 각 미션은 code_fill(고정 코드 + 빈칸 + 실행결과 SVG). 미션4 끝에 메이크코드 공유 링크 제출(long, 자동저장).
// 링크 기록은 비공개(갤러리 off). 각 미션에 실행결과 SVG(설명 우측 1/3 폭).
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── 미션 1 (build) — 주인공 좌우 이동 (벽 처리 없음) ── */
  {
    key: "_mb28_m1",
    phase: "build",
    label: "미션 1 — 주인공을 좌우로 움직이기",
    hint:
      "똥피하기를 만들어요! 먼저 주인공(아랫줄 불 하나)을 A·B 버튼으로 좌우로 움직여요.\n" +
      "좌표는 가로 x(0~4), 주인공은 맨 아랫줄(세로 4) 이에요.\n" +
      "아래 코드에서 ✎ 표시된 편집칸만 채워요(나머지는 그대로 둬요):\n" +
      "   ① A 버튼: 왼쪽으로 — x 를 1 줄여서 다시 x 에 담기 (바로 아래 B 버튼이 '1 늘리기' 예시예요)\n" +
      "   ② 주인공 켜기 — 가로 x, 세로 4 자리에 불 하나 켜기 (화면에 점 하나 찍는 명령)\n" +
      "다 채우면 '완성 코드 복사' 로 복사해 MakeCode 'Python' 에 (기존 코드 다 지우고) 붙여넣어요.\n" +
      "(A·B 로 움직여 봐요. 끝까지 가면 주인공이 화면 밖으로 사라지죠? 그건 미션 2에서 고쳐요.)",
    kind: "code_fill",
    imageUrl: "/mb28-m1.svg",
    imageAlt: "주인공 불 하나가 아랫줄에서 좌우로 움직이다 화면 밖으로 사라지는 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    codeTemplate: CODE_M1,
    codeSlots: SLOTS_M1,
    maxLength: 0,
  },

  /* ── 미션 2 (grill) — 벽에서 멈추기 ── */
  {
    key: "_mb28_m2",
    phase: "grill",
    label: "미션 2 — 벽에서 멈추기",
    hint:
      "미션 1에서 주인공이 화면 밖으로 사라졌죠? 가로 x 는 0~4 만 되게, 벽에서 멈추게 고쳐요.\n" +
      "아래 코드의 ✎ 편집칸 두 곳에 '갈림길(if)' 두 줄씩을 써요(들여쓰기 그대로):\n" +
      "   ① 왼쪽: x 가 0 보다 작아지면 → x 를 0 으로\n" +
      "   ② 오른쪽: x 가 4 보다 커지면 → x 를 4 로\n" +
      "다 채우면 '완성 코드 복사' 로 복사해 MakeCode 'Python' 에 붙여넣어요.\n" +
      "(이제 끝까지 가도 주인공이 벽에서 딱 멈춰요.)",
    kind: "code_fill",
    imageUrl: "/mb28-m2.svg",
    imageAlt: "주인공이 좌우로 움직이다 양쪽 끝(0과 4)에서 멈추는 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    codeTemplate: CODE_M2,
    codeSlots: SLOTS_M2,
    maxLength: 0,
  },

  /* ── 미션 3 (mvp) — 똥 한 개 낙하 (바닥 처리 없음) ── */
  {
    key: "_mb28_m3",
    phase: "mvp",
    label: "미션 3 — 똥 한 개 떨어뜨리기",
    hint:
      "이제 똥을 떨어뜨려요! 똥은 아무 칸(가로 poop_x)에서 맨 위(세로 0)부터 아래로 내려와요.\n" +
      "주인공 부분은 다 해 놨어요. forever 의 ✎ 편집칸 두 곳을 채워요:\n" +
      "   ① 똥을 한 칸 아래로 — poop_y 를 1 늘려서 다시 poop_y 에 담기 (세로로 내려오기)\n" +
      "   ② 똥 켜기 — 가로 poop_x, 세로 poop_y 자리에 불 켜기\n" +
      "다 채우면 '완성 코드 복사' 로 복사해 MakeCode 'Python' 에 붙여넣어요.\n" +
      "(똥이 한 번 떨어지면… 그 뒤로 안 보이죠? 바닥 처리가 없어서예요 — 미션 4에서 고쳐요.)",
    kind: "code_fill",
    imageUrl: "/mb28-m3.svg",
    imageAlt: "똥 불 하나가 위에서 아래로 한 번 떨어진 뒤 사라지는 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    codeTemplate: CODE_M3,
    codeSlots: SLOTS_M3,
    maxLength: 0,
  },

  /* ── 미션 4 (problem) — 바닥 처리 + 메이크코드 공유 링크 제출 ── */
  {
    key: "_mb28_m4",
    phase: "problem",
    label: "미션 4 — 바닥에 닿으면 다시 위에서",
    hint:
      "똥이 한 번만 떨어지고 끝났죠? 바닥(세로 4)을 지나면 맨 위(0)로 올리고, 새 칸에서 다시 떨어지게 고쳐요.\n" +
      "forever 의 ✎ 편집칸에 '갈림길(if)' 세 줄을 써요(들여쓰기 그대로):\n" +
      "   · 똥이 바닥을 지나면(poop_y 가 4 보다 커지면) → poop_y 를 0 으로 되돌리고,\n" +
      "   · 새 칸에서 다시 — poop_x 에 0~4 중 '무작위' 로 수 하나 담기 (26차 주사위에서 쓴 그 명령)\n" +
      "다 채우면 '완성 코드 복사' 로 복사해 MakeCode 'Python' 에 붙여넣어요.\n" +
      "(이제 똥이 계속 떨어져요! 주인공으로 피해 보세요. 충돌·점수는 다음 시간(29차)에 더해요.)",
    kind: "code_fill",
    imageUrl: "/mb28-m4.svg",
    imageAlt: "주인공이 아래에 있고 똥이 위에서 아래로 계속 반복해서 떨어지는 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    codeTemplate: CODE_M4,
    codeSlots: SLOTS_M4,
    maxLength: 0,
  },
  {
    key: "mb28_share",
    phase: "problem",
    label: "메이크코드 공유 링크 붙여넣기",
    hint:
      "똥이 계속 떨어지면 완성이에요! 만든 걸 선생님께 보여 줄 링크를 만들어 붙여넣어요.\n" +
      "MakeCode 위쪽 '공유(Share)' → '프로젝트 공유' → 나온 링크를 '복사' 해서 아래 칸에 붙여넣기.\n" +
      "붙여넣으면 자동으로 저장돼요(선생님이 볼 수 있어요).",
    kind: "long",
    maxLength: 500,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "똥피하기 만들기 ① (뼈대)",
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

  // 성찰 보상 게임 = UNO(교사 요청 2026-11-09). 성찰을 제출하면 '제출하고 게임하기' 로 열린다.
  // rewardGame.url 은 외부 게임 주소를 그대로 받는다(reward-game-frame 이 iframe/링크로 연다).
  rewardGame: {
    heading: "수고했어요! 🃏",
    body: "성찰을 제출했으면 잠깐 UNO 로 쉬어요. 선생님이 부르면 돌아오세요.",
    url: "https://uno-game-gilt.vercel.app/",
  },

  progress: empty(),

  // 안내 보드 — 오늘 할 일(미션 1·2·3·4) + 새 개념(게임 루프 / 좌표 그리기 / 버튼 이동).
  assessment: {
    heading: "오늘 할 일 — 똥피하기 뼈대 만들기",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "주인공 움직이기 → 똥 떨어뜨리기",
        note:
          "오늘은 똥피하기의 '뼈대' 를 만들어요 — 주인공이 좌우로 움직이고, 똥이 위에서 떨어져요.\n" +
          "충돌(맞으면 게임오버)·점수는 다음 시간(29차)에 더해요. 좌표는 가로 x·세로 y 둘 다 0~4,\n" +
          "주인공은 맨 아랫줄(세로 4) 이에요. 조작은 A=왼쪽, B=오른쪽.",
        rows: [
          { label: "미션 1", value: "A·B 로 주인공 좌우 이동 (벽 없음 — 사라져요)" },
          { label: "미션 2", value: "벽에서 멈추기 (x 0~4 밖으로 안 나가게)" },
          { label: "미션 3", value: "똥 한 개 떨어뜨리기 (한 번 떨어지고 사라져요)" },
          { label: "미션 4", value: "바닥에 닿으면 다시 위에서 (계속 떨어지게)" },
          { label: "채점은", value: "점수·자동채점 없어요 — 만들어 붙여넣어 보면 성공" },
        ],
        highlights: [
          "미션마다 스타터를 복사해 MakeCode 'Python' 에 붙여넣고, '# (미션)' 왼쪽 빈자리만 채워요.",
          "미션 1·3 은 일부러 '버그' 가 있어요 — 미션 2·4 에서 직접 고쳐요. (바이브만 하면 얕으니까!)",
        ],
      },
      {
        label: "오늘의 새 낱말",
        subtitle: "게임 루프 · 좌표 · 지우고 다시 그리기",
        note:
          "무한반복(forever)은 '게임 루프' 예요 — 아주 빠르게 되풀이하며 화면을 새로 그려요. 좌표는 가로 x,\n" +
          "세로 y(둘 다 0~4) 로 LED 한 칸을 가리켜요. 매번 '화면을 지우고(clear) 다시 켜기' 를 해야 주인공·똥이\n" +
          "움직이는 것처럼 보여요(안 지우면 지나간 자리가 다 켜진 채 남아요). 버튼은 '누르면 바로' 반응해요.",
        rows: [
          { label: "무한반복(게임 루프)", value: "빠르게 되풀이하며 화면 다시 그리기" },
          { label: "좌표 (x, y)", value: "가로 x·세로 y, 둘 다 0~4 — LED 한 칸" },
          { label: "화면 지우고 그리기", value: "매번 지우고 다시 켜야 움직여 보여요" },
          { label: "버튼 (A·B)", value: "누르면 바로 주인공이 움직여요 (A=왼쪽·B=오른쪽)" },
        ],
        highlights: [
          "자세한 설명은 선생님이 함께 해요. 여기선 '게임 루프' 와 '좌표(x, y)' 두 가지만 기억해요.",
        ],
      },
    ],
  },

  video: empty(),

  // 성찰 — 쉬운 말로 가볍게 돌아보기. 개인적이라 비공개. 성찰 제출로 사과 게임이 열린다.
  reflectionQuestions: [
    "오늘 만든 똥피하기 뼈대에서 가장 재미있었던 점은 무엇이었나요? 한 줄로 적어 봐요.",
    "미션 1·3 의 '버그'(주인공이 사라지거나 똥이 한 번만 떨어짐)를 직접 고쳐 보니 어땠나요?",
  ],
  reflectionPublic: false,

  // MakeCode(새 탭)·파이썬 타자(새 탭)가 붙은 단계에서 창을 옮기는 것을 이탈로 안 센다.
  focusExempt: ["waiting", "build", "grill", "mvp", "problem"],
  phaseLabels: {
    assessment: "안내",
    build: "미션 1 — 주인공 이동",
    grill: "미션 2 — 벽 처리",
    mvp: "미션 3 — 똥 낙하",
    problem: "미션 4 — 바닥 처리",
  },
  phaseOrder: ["waiting", "assessment", "build", "grill", "mvp", "problem", "reflection"],
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "똥피하기 만들기 ① (뼈대)",
      body:
        "주인공을 A·B 로 좌우로 움직이고(미션1), 벽에서 멈추게 고치고(미션2), 똥을 한 개 떨어뜨리고(미션3),\n" +
        "바닥에 닿으면 다시 위에서 떨어지게 고쳐요(미션4). 각 미션은 스타터를 복사해 MakeCode 에 붙여넣고\n" +
        "'# (미션)' 빈자리만 채워요. 충돌·점수는 다음 시간(29차).",
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (23~27차와 같은 MakeCode 통)`);
  console.log("단계: 대기(타자) → 기분 → 안내 → 미션1(build) → 미션2(grill) → 미션3(mvp) → 미션4(problem) → 성찰. freeNav off. hideDoneButton true. 성찰 제출 → 사과 게임.");
  console.log("하이브리드 A: 버튼=이벤트 핸들러(즉시 반응), forever=그리기+똥. 조작 A=왼쪽/B=오른쪽. 좌표 x·y 0~4, 주인공 아랫줄(y=4).");
  console.log("미션1 주인공 이동(벽 없음·버그) → 미션2 벽 처리 → 미션3 똥 낙하(바닥 없음·버그) → 미션4 바닥 리셋 + 메이크코드 공유 링크 제출(mb28_share, long).");
  console.log("MakeCode 실측(2026-11-08): on_button_pressed 이벤트 안 global x+경계·led.plot·clear_screen·randint·forever 변환 확인. '___'/'★★★' 안 씀.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
