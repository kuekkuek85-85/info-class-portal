/**
 * 26차시 차시 계획 등록 — 「주사위 게임 만들기」 (마이크로비트 MakeCode 아크, 25차 연장선).
 *
 *   node --env-file=.env.local scripts/seed-lesson26.ts
 *   node --env-file=.env.local scripts/seed-lesson26.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 25차(만보기)에 이어지는 MakeCode 아크 — 주사위
 *
 * 25차에서 익힌 흔들기 이벤트(on_gesture_shake + global)에 **이어붙여** "흔들면 주사위" 를 만든다.
 * 새 개념은 난수 randint(1,6) 와 조건 분기 if/elif/else, 그리고 노가다를 줄이는 포털 '주사위 코드
 * 조립기'(dice_builder). 미션 4개:
 *   1(build)  흔들면 randint(1,6) → show_number (숫자 주사위). 25차 코드 붙여넣기 + 빈칸. 공유 링크 제출(long).
 *   2(grill)  dice_builder — 눈 1~6 자유 그리기 + if/elif/else 드롭다운 조립 → 전체 코드 생성(제출칸 없음).
 *   3(problem) 디버깅 — "흔들어도 같은 숫자만"(randint 를 처음에 한 번만 굴린 버그). 제출 대신 **선택형(choice) 1문항 + 이유(text)** 로 바꿈(교사 2026-11-04). 코드/링크 제출칸 없음.
 *   4(mvp)    바이브(vibe_code, microbit) — "6이 나오면 소리·불빛" 등 기능 얹기. 베이스 = 눈 주사위. 제출칸 없음.
 *
 * 설계 문서: docs/superpowers/specs/2026-11-01-info-lesson26-dice-design.md (교사 승인 확정본).
 *
 * ## MakeCode 실측 검증 (2026-11-01, makecode.microbit.org '파이썬 보기')
 *
 *  · randint(1, 6) — 전역 호출(접두어 없음)로 '1부터 6 사이 랜덤' 블록 변환 확인.
 *  · show_leds("""…""") 멀티라인(# / . , 칸 사이 공백, 8칸 들여쓰기) 블록 변환 확인.
 *  · if / elif / else + == 분기, 흔들기 이벤트 이어붙이기(on_gesture_shake + global roll) 변환 확인.
 *  · ★디버깅 설계 실측: 'global roll' 만 빼면 MakeCode 가 핸들러 안에 **새 지역변수 roll2** 를 만들어
 *    숫자가 '그래도 바뀐다' → '같은 숫자만' 증상이 안 난다. 그래서 버그는 **randint 를 핸들러 밖(시작에
 *    한 번)에 둔 것**으로 잡았다(이건 확실히 같은 숫자만 나옴). 고치기 = randint 를 핸들러 안으로 옮기고
 *    'global roll' 도 더하기 → 자리(placement) + global 을 한 번에 익힌다(교사 '같은 숫자만' 의도 충족).
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
const LESSON_NO = 26;
const FORCE = process.argv.includes("--force");

/** 23~25차와 같은 MakeCode 피지컬 아크 전용 통. */
const ACTIVITY_ID = "microbit-makecode";
const MAKECODE_URL = "https://makecode.microbit.org/";

/**
 * 미션1 스타터 — 25차 흔들기 뼈대에 '숫자 주사위' 를 얹는다. 복사해 MakeCode 'Python' 에 붙여넣고,
 * 각 '# (미션)' 왼쪽 빈자리에 ① roll = randint(1, 6)  ② basic.show_number(roll) 를 써서 완성한다.
 * 'global roll' 은 밖에서 만든 roll 을 핸들러 안에서 바꾼다는 뜻(그대로 둔다). 빈 칸 방식은 25차와 동일
 * (주석을 오른쪽에 밀어 둔 줄 — 학생이 그 줄 왼쪽에 코드를 쓴다. '___' 는 변환 불가라 안 씀).
 */
const CODE_M1 = `# 흔들면 1~6 중 아무 숫자가 나오는 주사위
roll = 0

def on_gesture_shake():
    global roll
                             # (미션) ① roll 에 1~6 중 아무 수를 담기 (무작위로 하나 뽑기)
                             # (미션) ② roll 을 화면에 숫자로 보여주기
input.on_gesture(Gesture.SHAKE, on_gesture_shake)`;

/**
 * 미션3 디버깅 버그 코드 — "흔들어도 똑같은 숫자만" 나온다. randint 가 핸들러 밖(시작)에 있어 주사위가
 * 딱 한 번만 굴려진다(흔들면 그 고정된 수만 다시 보여 줌). 고치기: randint 줄을 흔들기 핸들러 안으로
 * 옮기고(흔들 때마다 굴리기) 그 함수 첫 줄에 'global roll' 을 더한다(바깥 roll 을 바꾸기 위해).
 * (정답 모양은 25차 만보기 완성형과 같은 꼴 — roll=0 / 핸들러 안 global+randint+show_number.)
 */
const CODE_BUG = `# (버그) 흔들어도 똑같은 숫자만 나와요! 주사위가 '처음에 딱 한 번만' 굴려지고 있어요.
# 흔들 때마다 새로 굴리게 고쳐 보세요. (randint 줄을 어디로 옮겨야 할까요? 무엇을 더해야 할까요?)
roll = randint(1, 6)

def on_gesture_shake():
    basic.show_number(roll)
input.on_gesture(Gesture.SHAKE, on_gesture_shake)`;

/**
 * 미션4 바이브 베이스 — '눈 주사위' 완성형(흔들면 randint → 표준 눈 show_leds). AI가 여기에 기능을 더한다.
 * ※ src/lib/vibe-code.ts 의 MICROBIT_DICE_BASE 와 **같은 문자열**이어야 한다(seed 는 server-only 모듈을
 *    import 못 해 복제함 — 한쪽을 고치면 다른 쪽도). makecode.microbit.org 에서 변환·동작 확인(2026-11-01).
 */
const DICE_BASE = `roll = 0

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

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 활동지 — 미션 4개: build(미션1 숫자) · grill(미션2 눈 도구) · problem(미션3 디버깅) · mvp(미션4 바이브).
// 범용 슬롯을 빌려 쓰고 이름은 phaseLabels 로 붙인다. 공유 링크·바이브·도구 기록은 비공개(갤러리 off).
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── 미션 1 (build) — 흔들면 숫자 주사위 ── */
  {
    key: "_mb26_m1",
    phase: "build",
    label: "미션 1 — 흔들면 숫자 주사위 (randint)",
    hint:
      "25차 흔들기(흔들면 뭔가 하기)를 주사위로 바꿔 봐요! 아래 '코드 복사하기' 로 뼈대를 복사해,\n" +
      "MakeCode 'Python' 의 기존 코드를 모두 지우고(Ctrl+A → Delete) 맨 처음에 붙여넣어요.\n" +
      "'global roll' 은 밖에서 만든 roll 을 흔들기 함수 안에서 바꾼다는 뜻이니 그대로 둬요.\n" +
      "각 '# (미션)' 왼쪽 빈자리에 한 줄씩 채워요:\n" +
      "   ① roll 에 1~6 중 아무 수를 담아요 — '무작위로 하나 뽑아 주는' 함수에 (1, 6) 을 넣어요.\n" +
      "   ② roll 을 화면에 숫자로 보여줘요 (25차에서 쓴 '숫자 보여주기' 명령과 같아요).\n" +
      "(아래 [MakeCode 열기] 로 새 탭에서 열고 'Python' 으로 바꾼 뒤 붙여넣어요. 위쪽 'SHAKE' 를 누르면\n" +
      "숫자가 바뀌면 성공!)",
    kind: "note",
    imageUrl: "/mb26-dice-num.svg",
    imageAlt: "마이크로비트 화면에 흔들 때마다 1~6 숫자가 바뀌는 움직이는 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    code: CODE_M1,
    linkUrl: MAKECODE_URL,
    linkLabel: "MakeCode 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "mb26_share1",
    phase: "build",
    label: "미션 1 — 숫자 주사위 공유 링크 제출",
    hint:
      "숫자 주사위가 되면(흔들면 1~6 숫자가 바뀜) MakeCode 위쪽 '공유(Share)' 를 눌러 만든 링크를 아래\n" +
      "칸에 붙여넣어요. 적으면 자동으로 저장돼요(따로 제출 버튼은 없어요).",
    kind: "long",
    maxLength: 500,
  },

  /* ── 미션 2 (grill) — 숫자를 주사위 눈으로 (dice_builder 도구) ── */
  {
    key: "_mb26_m2_intro",
    phase: "grill",
    label: "미션 2 — 숫자 대신 '주사위 눈'을 보여주기",
    hint:
      "진짜 주사위처럼 숫자 대신 점(눈)이 뜨게 해 봐요. 이번엔 손으로 코드를 길게 치지 않아요 — 아래\n" +
      "'주사위 코드 조립기' 로 만들어요.\n" +
      "   ① 눈 1~6을 5×5 칸에 직접 그려요. (옆에 '기준' 눈을 보고 따라 찍어요. 똑같지 않아도 괜찮아요.)\n" +
      "   ② '어떤 숫자일 때 어떤 눈을 보여줄까' 를 드롭다운으로 골라요 (기본은 숫자 1→눈 1 … 로 맞춰 뒀어요).\n" +
      "   ③ '코드 생성' 을 누르면 흔들기 + 무작위 + if/elif/else 가 다 든 전체 코드가 나와요.\n" +
      "   ④ '코드 복사하기' 로 복사해 [MakeCode 열기] 에서 'Python' 에 붙여넣고 흔들어 봐요 — 눈이 떠요!\n" +
      "(따로 '제출' 은 없어요. 그리고 고른 건 자동으로 저장돼요.)",
    kind: "note",
    imageUrl: "/mb26-dice-eyes.svg",
    imageAlt: "마이크로비트 화면에 흔들 때마다 주사위 눈(점 모양) 1~6이 바뀌는 움직이는 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    maxLength: 0,
  },
  {
    key: "mb26_dice",
    phase: "grill",
    label: "주사위 코드 조립기 — 눈 그리고, 분기 고르고, 코드 생성",
    hint:
      "눈 1~6을 그리고, 어떤 숫자에 어떤 눈을 보여줄지 고른 뒤 '코드 생성' 을 눌러요. 나온 코드를 복사해\n" +
      "MakeCode 'Python' 에 붙여넣어 흔들어 봐요.",
    kind: "dice_builder",
    maxLength: 0,
  },

  /* ── 미션 3 (problem) — 디버깅: 흔들어도 같은 숫자만 ── */
  {
    key: "_mb26_m3",
    phase: "problem",
    label: "미션 3 — 버그 고치기: 흔들어도 같은 숫자만 나와요",
    hint:
      "아래 코드는 '흔들어도 똑같은 숫자만' 나오는 고장난 주사위예요. 복사해서 MakeCode 'Python' 에\n" +
      "붙여넣고 흔들어 보면 — 숫자가 안 바뀌죠?\n" +
      "왜 그럴까요? 주사위(randint)가 '맨 처음에 딱 한 번만' 굴려지고 있어요. 흔들 때마다 새로 굴리게\n" +
      "하려면, randint 줄을 어디로 옮겨야 할까요? 그리고 옮긴 뒤 바깥 roll 을 바꾸려면 그 함수 첫 줄에\n" +
      "무엇을 더해야 할까요? (힌트: 25차 만보기에서 쓴 그 단어예요.)\n" +
      "고쳐서 흔들 때마다 숫자가 바뀌면 성공! 그다음 아래에서 '어떻게 고쳐야 할까요' 를 고르고, 이유를 한 줄 적어요.",
    kind: "note",
    imageUrl: "/mb26-dice-stuck.svg",
    imageAlt: "흔들어도 같은 숫자(3)만 계속 보이는 고장난 주사위 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    code: CODE_BUG,
    linkUrl: MAKECODE_URL,
    linkLabel: "MakeCode 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "mb26_q1",
    phase: "problem",
    label: "미션 3 — 어떻게 고쳐야 할까요? (하나 고르기)",
    hint:
      "흔들어도 똑같은 숫자만 나오는 주사위를, 흔들 때마다 새 숫자가 나오게 하려면 어떻게 고쳐야 할까요?\n" +
      "알맞은 것을 하나 골라요.",
    kind: "choice",
    choices: [
      "randint(1, 6) 줄을 흔들기 함수(on_gesture_shake) 안으로 옮기고, 함수 첫 줄에 global roll 을 더한다",
      "basic.show_number(roll) 을 한 줄 더 쓴다",
      "맨 위의 roll = randint(1, 6) 은 그대로 두고 basic.pause(500) 만 넣는다",
      "roll 이라는 변수 이름을 다른 이름으로 바꾼다",
    ],
    maxLength: 0,
  },
  {
    key: "mb26_why",
    phase: "problem",
    label: "미션 3 — 왜 그렇게 고치면 될까요? (이유 한 줄)",
    hint:
      "위에서 고른 방법으로 고치면 왜 흔들 때마다 숫자가 새로 바뀌는지, 내 말로 한 줄 적어 봐요.\n" +
      "(힌트: 주사위(randint)를 '언제' 굴리게 되는지 생각해 봐요.)",
    kind: "text",
    maxLength: 300,
  },

  /* ── 미션 4 (mvp) — AI로 기능 추가 (바이브) ── */
  {
    key: "_mb26_m4_intro",
    phase: "mvp",
    label: "미션 4 — AI에게 기능 하나를 부탁하기",
    hint:
      "내 주사위에 더하고 싶은 기능을 한 문장으로 말하면, AI가 '주사위 전체 + 그 기능' 이 든 완성 코드를\n" +
      "만들어 줘요. 복사해서 MakeCode 'Python' 에 붙여넣어 실행해요.\n\n" +
      "이런 걸 부탁해 볼 수 있어요:\n" +
      "  · 6이 나오면 '삐' 소리가 나게 해 줘\n" +
      "  · 6이 나오면 LED가 잠깐 반짝였다 눈을 보여주게 해 줘\n" +
      "  · A 버튼을 누르면 마지막에 나온 주사위 숫자를 다시 보여주게 해 줘\n\n" +
      "한 번에 안 될 수도 있어요 — 설명을 읽고 다시 부탁하거나 조금씩 고쳐 봐요.\n" +
      "(내가 AI에게 보낸 말과 받은 코드는 저장되고, 선생님이 볼 수 있어요.)",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "mb26_vibe",
    phase: "mvp",
    label: "AI에게 기능 부탁하기 — 주사위에 더할 기능을 말로 적어요",
    hint:
      "더하고 싶은 기능을 한 번에 하나씩, 동작으로 적어요. AI가 주사위 전체 코드에 그 기능을 더해 줘요.\n" +
      "'코드 복사하기' 로 복사해 아래 [MakeCode 열기] 로 열고 'Python' 에 붙여넣어 실행해요.",
    kind: "vibe_code",
    vibeTarget: "microbit",
    // 바탕 = 눈 주사위 완성형. 서버 fallback(만보기)은 25차 전용이라, 주사위는 반드시 베이스를 넘긴다.
    vibeBaseCode: DICE_BASE,
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "주사위 게임 만들기",
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

  // 성찰 보상 게임 = 사과 게임(교사 확정). 성찰을 제출하면 '제출하고 게임하기' 로 열린다.
  rewardGame: {
    heading: "수고했어요! 🍎",
    body: "성찰을 제출했으면 잠깐 사과 게임으로 쉬어요. 선생님이 부르면 돌아오세요.",
    url: "https://fruit-box-game-delta.vercel.app/",
  },

  progress: empty(),

  // 안내 보드 — 오늘 할 일(미션 1·2·3·4) + 새 개념(randint·if/elif/else) 짧은 설명.
  assessment: {
    heading: "오늘 할 일 — 주사위 게임 만들기",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "흔들면 주사위 → 눈 → 고치기 → AI",
        note:
          "25차에서 만든 '흔들기' 를 주사위로 바꿔요. 흔들면 아무 숫자가 나오고(미션1), 숫자 대신 주사위\n" +
          "눈을 보여주고(미션2), 고장난 주사위를 고치고(미션3), AI로 기능을 더해요(미션4).",
        rows: [
          { label: "미션 1", value: "흔들면 1~6 중 아무 숫자 (randint)" },
          { label: "미션 2", value: "숫자 대신 주사위 눈 — '조립기' 로 눈 그리고 분기 고르기" },
          { label: "미션 3", value: "고장난 주사위 고치기 (흔들어도 같은 숫자만)" },
          { label: "미션 4", value: "AI로 기능 추가 (6이면 소리·불빛 등)" },
          { label: "채점은", value: "점수·자동채점 없어요 — 만들어 보고 돌아가면 성공" },
        ],
        highlights: [
          "미션1은 뼈대 코드의 '# (미션)' 왼쪽 빈칸만 채워요. 미션2는 손으로 안 치고 조립기로 만들어요.",
          "미션3은 '왜 안 바뀌지?' 를 찾는 미션 — 바이브만 하면 얕으니까 직접 고쳐 봐요.",
        ],
      },
      {
        label: "오늘의 새 낱말",
        subtitle: "무작위 randint · 갈림길 if/elif/else",
        note:
          "randint(1, 6) 은 '1부터 6 중 아무 수나 하나 뽑아 줘' 예요(양끝 1·6 포함). if/elif/else 는\n" +
          "'만약 ~이면 … 아니고 만약 ~이면 … 아니면 …' 처럼 조건에 따라 다른 걸 하게 하는 갈림길이에요.\n" +
          "주사위는 '숫자가 1이면 눈 1, 2면 눈 2 …' 처럼 갈림길로 눈을 골라 보여 줘요.",
        rows: [
          { label: "randint(1, 6)", value: "1~6 중 무작위로 하나 (주사위 굴리기)" },
          { label: "if / elif / else", value: "조건에 따라 다른 걸 하는 '갈림길'" },
          { label: "== (등호 두 개)", value: "'같은지' 묻기 (roll == 1 → roll 이 1이면)" },
        ],
        highlights: [
          "자세한 설명은 선생님이 함께 해요. 여기선 '무작위' 와 '갈림길' 두 낱말만 기억해요.",
        ],
      },
    ],
  },

  video: empty(),

  // 성찰 — 분기·디버깅·AI 체험 소감. 개인적이라 비공개. 성찰 제출로 사과 게임 보상이 열린다.
  reflectionQuestions: [
    "오늘 주사위를 만들며 가장 재밌던/어려웠던 건 무엇이었나요? 한 줄로 적어 봐요. (미션3 '고장난 주사위 고치기' 나 미션4 'AI로 기능 추가' 이야기를 넣어도 좋아요.)",
  ],
  reflectionPublic: false,

  // MakeCode(새 탭)·조립기·파이썬 타자(새 탭)가 붙은 단계에서 창을 옮기는 것을 이탈로 안 센다.
  focusExempt: ["waiting", "build", "grill", "problem", "mvp"],
  phaseLabels: {
    assessment: "안내",
    build: "미션 1 — 숫자 주사위",
    grill: "미션 2 — 주사위 눈(도구)",
    problem: "미션 3 — 버그 고치기",
    mvp: "미션 4 — AI로 기능 추가",
  },
  phaseOrder: ["waiting", "assessment", "build", "grill", "problem", "mvp", "reflection"],
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "주사위 게임 만들기",
      body:
        "25차 흔들기에 이어, 흔들면 주사위가 되는 프로그램을 만들어요. 숫자 주사위(미션1) → 주사위 눈(미션2,\n" +
        "조립기) → 고장난 주사위 고치기(미션3) → AI로 기능 추가(미션4).",
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (23~25차와 같은 MakeCode 통)`);
  console.log("단계: 대기(타자) → 기분 → 안내 → 미션1(build) → 미션2(grill·조립기) → 미션3(problem·디버깅) → 미션4(mvp·바이브) → 성찰. freeNav off. hideDoneButton true. 성찰 제출 → 사과 게임.");
  console.log("미션1: 흔들기 뼈대 + randint(1,6)·show_number 빈칸 + 공유 링크 제출(mb26_share1, long). 미션2: dice_builder(제출칸 없음).");
  console.log("미션3: 디버깅 '흔들어도 같은 숫자만'(randint 를 핸들러 밖에 둔 버그) — 선택형 1문항(mb26_q1, choice) + 이유(mb26_why, text). 코드/링크 제출칸 없음. 미션4: vibe_code(microbit, 베이스=눈 주사위 DICE_BASE, 제출칸 없음).");
  console.log("MakeCode 실측(2026-11-01): randint 전역 호출·show_leds 멀티라인·if/elif/else·흔들기 이어붙이기 변환 확인. global 누락은 roll2 지역변수를 만들어 '같은 숫자' 증상이 안 나므로 버그는 randint 위치로 잡음.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
