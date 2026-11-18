/**
 * 31차시 차시 계획 등록 - 「똥피하기 ④ - 똥 여러 개와 리스트」 (MakeCode 아크, 30차 이어가기).
 *
 *   node --env-file=.env.local scripts/seed-lesson31.ts
 *   node --env-file=.env.local scripts/seed-lesson31.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## ★ 2026-11-18 수업 후 범위 축소 (교사 결정) - 아래 본문보다 이 절이 우선
 *  · 1-1·1-3 실제 수업이 '리스트 개념' 까지 갔다. 31차는 미션①(변수 하나하나) + 리스트 개념에서 끝낸다.
 *    phaseOrder = waiting → assessment → build → problem → reflection.
 *  · 미션②(리스트로 정리, code_choose)·미션③(AI 바이브)은 32차로 옮긴다. 코드·빈칸·정답·refLines·why·그림·
 *    바이브 설정은 한 글자도 안 바꾸고 scripts/lesson32-carryover.ts 로 옮겼다(32차 seed 가 import).
 *  · 아래 본문에 남은 미션②③ 설명은 당시 설계 기록이다.
 *
 * ## 30차(똥피하기 완성, 똥 1개 + 충돌·점수)에 이어 '리스트' 를 배운다 (교사 확정 2026-11-17)
 *
 * 30차에서 충돌(게임오버)·점수까지 넣어 똥 1개짜리 똥피하기를 완성했다. 30차 수업 시간이 모자라
 * 미션3(똥 2개)은 31차로 이월됐다(seed-lesson30.ts 의 CODE_M3/SLOTS_M3). 31차는 그 이월분을
 * 출발점으로, '왜 리스트가 필요한가' 를 한 번의 고생으로 깨닫게 하는 데 집중한다.
 *
 * ## 흐름 (교사 확정 - 변수를 하나하나 만들어 보고 → 리스트로 편하게)
 *   미션 ① (build)   똥 여러 개를 '변수 하나하나' 로 - 둘째 똥 변수를 또 만들고 똑같은 코드를 또 복붙.
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
 *    waiting → assessment → build(변수 하나하나) → problem(리스트 개념) → grill(리팩토링) → worksheet(AI) → reflection.
 *  · 개념 단계의 확인 퀴즈(choice 3개: 인덱스 xs[0]·ys[1]·하나하나 vs 리스트)가 형성평가 겸 '고민거리' 역할.
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
 *    흐름: 대기→기분→안내→미션①(변수 하나하나)→리스트 개념→미션②(리팩토링)→미션③(AI)→성찰.
 *  · 구현 미션마다 실행결과 SVG 우측 1/3: /mb30-m3.svg(미션① 똥 2개 변수 하나하나·30차 자산 재사용)·
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
 * 미션 ① 스타터 (build) - 똥 '변수 하나하나'. = 30차 이월분(CODE_M3). 바탕 = 30차 완성(똥 1개·충돌·점수) +
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
      "바로 위 첫째 똥 처리를 거울처럼, 이름 끝에 2 를 붙여 그대로 써요.\n" +
      "들여쓰기: 갈림길 줄은 Tab 2번, 그 안쪽 세 줄은 Tab 3번.",
    rows: 4,
    answer: "        if poop_y2 > 4:\n            poop_y2 = 0\n            poop_x2 = randint(0, 4)\n            score = score + 1",
  },
  {
    token: "b",
    label: "둘 중 하나라도 맞으면",
    hint:
      "두 똥 중 하나라도 주인공 칸 바닥에 닿으면 게임오버예요.\n" +
      "'첫째 똥 조건' 또는 '둘째 똥 조건' 이면 → playing 끄기, 슬픈 얼굴, 점수 보이기.\n" +
      "슬픈 얼굴은 basic.show_icon(IconNames.SAD) · 들여쓰기 Tab 2번, 안쪽 Tab 3번.",
    rows: 4,
    answer:
      "        if (poop_y == 4 and poop_x == x) or (poop_y2 == 4 and poop_x2 == x):\n            playing = False\n            basic.show_icon(IconNames.SAD)\n            basic.show_number(score)",
  },
];

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 활동지 - 미션①(변수 하나하나, build) → 리스트 개념·퀴즈(problem). (미션②③은 32차 - lesson32-carryover.ts)
//   각 구현 미션 앞에 새 개념 note. 개념 단계엔 note(대비 그림) + 확인 퀴즈(choice 3개).
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── 미션 ① (build) - 똥 '변수 하나하나' (30차 이월분) ── */
  {
    key: "_mb31_m1_note",
    phase: "build",
    label: "지난 시간 복습 → 똥 두 개로 (변수 또 만들기)",
    hint:
      "오늘은 똥을 두 개로 늘려요. 지금 아는 방법은 하나뿐이에요.\n" +
      "둘째 똥 변수(poop_x2, poop_y2)를 또 만들고, 같은 코드를 또 쓰기!\n" +
      "채우면서 느껴 봐요. 똥이 10개면 열 번 복붙해야 해요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_mb31_m1",
    phase: "build",
    label: "미션 ① - 똥 두 개 (변수 하나하나)",
    hint:
      "✎ 두 칸만 채우고 '완성 코드 복사' 를 눌러요.\n" +
      "MakeCode 'Python' 에 다 지우고 붙여넣어요.\n" +
      "똥은 두 개가 됐는데, 코드는 길어졌죠?",
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
      "똥이 10개면 변수 20개, 복붙 열 번… 이걸 줄여 주는 게 '리스트' 예요.\n" +
      "리스트는 여러 값을 한 묶음에 담아요. 번호(인덱스)는 0번부터!\n" +
      "반복(for)으로 같은 일을 한 번만 써요. 아래 그림을 보고 퀴즈를 풀어요.",
    kind: "note",
    imageUrl: "/mb31-list.svg",
    imageAlt:
      "왼쪽은 poop_x·poop_x2·poop_x3 처럼 변수를 하나하나 따로 만드는 방식, 오른쪽은 xs=[1,3,…] 리스트 하나에 모아 인덱스(0,1,2)로 꺼내고 for 반복으로 한 번만 쓰는 모습을 대비한 그림",
    maxLength: 0,
  },
  {
    key: "mb31_list_q1",
    phase: "problem",
    label: "확인 ① - xs[0] 은 무엇일까요?",
    hint: "xs = [1, 3] 이에요. 리스트 번호는 1번이 아니라 0번부터 세요.",
    kind: "choice",
    choices: [
      "1 - 0번(맨 첫) 자리의 값, 리스트는 0번부터 세니까요",
      "3 - 1번(둘째) 자리의 값",
      "오류가 나요 - 자리 번호가 1번부터라고 생각해서 0번은 없다고 봄",
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
      "변수 하나하나 - 변수와 복붙을 여덟 벌 더 만들기",
      "둘 다 똑같이 힘들다",
    ],
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "똥피하기 ④ - 똥 여러 개와 리스트",
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

  // 안내 보드 - 오늘 할 일(변수 하나하나 → 리스트 개념) + 30차 이어가기 짚기.
  assessment: {
    heading: "오늘 할 일 - 똥 여러 개, 그리고 리스트",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "변수를 하나하나 → 리스트 알아보기",
        note:
          "지난 시간 똥 1개 → 오늘은 똥 여러 개! 아래 순서로 가요.\n" +
          "좌표 x·y 는 0~4, 주인공은 맨 아랫줄. A=왼쪽, B=오른쪽.",
        rows: [
          { label: "미션 ①", value: "똥 두 개 (변수 하나하나 - 같은 코드를 또 복붙)" },
          { label: "리스트 개념", value: "여러 값을 한 묶음에 · 번호(인덱스)는 0부터 · 반복(for)" },
        ],
        highlights: ["스타터를 MakeCode 'Python' 에 붙여넣고, 빈칸만 채워요."],
      },
      {
        label: "오늘의 새 낱말",
        subtitle: "리스트 · 인덱스(0부터) · 반복 for",
        note: "아래 세 낱말이 오늘의 핵심이에요.",
        rows: [
          { label: "리스트 (xs, ys)", value: "여러 값을 한 묶음에: xs = [1, 3]" },
          { label: "인덱스 (xs[0])", value: "번호로 꺼내기, ★0부터★: xs[0]=첫째, xs[1]=둘째" },
          { label: "반복 (for)", value: "for i in range(2): i 를 0,1 로 바꿔 같은 일 한 번만" },
          { label: "들여쓰기", value: "Tab 1번 = 한 단계. 갈림길 줄은 Tab 2번, 그 안은 Tab 3번" },
        ],
        highlights: [
          "리스트는 0부터 센다 - xs[0] 이 첫째 값. 이것만 확실히 익히면 돼요.",
        ],
      },
    ],
  },

  video: empty(),

  // 성찰 - 31차 범위(똥 여러 개 + 리스트 개념)만 돌아본다. 아크 전체 돌아보기("기억에 남는 기능")는 32차로.
  // 개인적이라 비공개. 성찰 제출로 UNO 가 열린다.
  reflectionQuestions: [
    "똥을 두 개로 늘리며 같은 코드를 또 써 봤어요. 리스트를 쓰면 무엇이 편해질까요?",
  ],
  reflectionPublic: false,

  // MakeCode(새 탭)·파이썬 타자(새 탭)가 붙은 단계에서 창을 옮기는 것을 이탈로 안 센다.
  // (problem=리스트 개념·퀴즈 는 포털 안에서만 하므로 면제 대상 아님.)
  focusExempt: ["waiting", "build"],
  phaseLabels: {
    assessment: "안내",
    build: "미션 ① 똥 여러 개(변수 하나하나)",
    problem: "리스트 개념",
  },
  // 2026-11-18 교사 결정: 31차는 '리스트 개념' 에서 끝낸다(실제 수업이 거기까지 갔다).
  // 미션②(리스트로 정리)·미션③(AI 바이브)은 32차로 - 내용은 scripts/lesson32-carryover.ts 에 보존.
  // 되돌아가기 off, 성찰 제출만으로 UNO(rewardGame.requires 비움), 마음 체크인 강제 관문 유효.
  phaseOrder: ["waiting", "assessment", "build", "problem", "reflection"],
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "똥 여러 개와 리스트",
      body:
        "미션① 변수 하나하나 → 리스트 개념(퀴즈)\n" +
        "다 한 뒤 성찰을 내면 UNO 가 열려요.",
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
    // merge 는 맵을 깊게 합쳐서, 빠진 단계 이름(grill·worksheet)이 phaseLabels 에 남는다 - 통째로 바꾼다.
    await doc.ref.update({ phaseLabels: PLAN.phaseLabels });
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
      await session.ref.update({ phaseLabels: PLAN.phaseLabels });
    }
    console.log(`   아직 아무도 안 들어온 수업 ${scheduled.length}개에 반영`);
  } else {
    const ref = await db.collection(LESSON_PLANS).add({ ...PLAN, createdAt: now, updatedAt: now });
    console.log(`＋ 등록 - ${PLAN.title} (${ref.id})`);
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} (23~30차와 같은 MakeCode 통, 키 mb31_* 로 충돌 없음)`);
  console.log("단계: 대기(타자) → 기분 → 안내 → 미션①(build 변수 하나하나) → 리스트 개념(problem) → 성찰. freeNav OFF. hideDoneButton true. 성찰 제출 → UNO. (미션②③은 32차)");
  console.log("리스트 개념: note(대비 그림 /mb31-list.svg) + 확인 choice 3개(xs[0]·ys[1]·하나하나vs리스트). 미션 앞 새 개념 note. 들여쓰기 안내는 Tab 횟수(for 안 if 는 Tab 3번·그 안은 Tab 4번).");
  console.log("게이트: rewardGame.requires = [] - 성찰 제출만으로 UNO.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
