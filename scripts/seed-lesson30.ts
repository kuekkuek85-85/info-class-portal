/**
 * 30차시 차시 계획 등록 — 「똥피하기 만들기 ③ (점수 + 게임 완성)」 (MakeCode 아크, 29차 이어가기).
 *
 *   node --env-file=.env.local scripts/seed-lesson30.ts
 *   node --env-file=.env.local scripts/seed-lesson30.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 29차 이어가기 — 똥피하기 아크의 마지막(완성) 차시 (신규 설계 2026-11-15)
 *
 * 28차(뼈대: 주인공 좌우이동 + 벽)·29차(똥 낙하 + 바닥 리셋)로 '계속 떨어지는 똥을 피하는' 게임까지
 * 왔다. 30차는 거기에 **점수(피하면 +1)** 와 **충돌(맞으면 점수 보여주고 다시 시작)** 을 얹어 게임을
 * 완성한다. 아크 설계 스펙(docs/superpowers/specs/2026-10-22-info-microbit-arc-lesson24-design.md)의
 * 똥피하기 자리 — "게임 루프·떨어지는 똥·충돌·점수" 중 **충돌·점수**가 바로 이 차시다. 29차 성찰·안내에서
 * "충돌·점수는 다음 시간(30차)" 이라고 예고한 그대로 이어진다. 다음(31차~)은 수행평가(내 프로젝트).
 *
 *   미션1(build) = 점수   잘 피할 때(똥이 바닥을 지날 때)마다 score 를 1 올린다. 빈칸: score=0 초기화,
 *                        score=score+1(바닥 리셋 가지 안). global 에 score 는 스타터에 미리 넣어둔다.
 *   미션2(grill) = 충돌   똥이 주인공과 같은 칸(poop_x==x and poop_y==4)이면 점수(show_number)와 슬픈
 *                        얼굴(show_icon)을 띄우고 score·poop_y 를 0 으로 되돌려 다시 시작. + 공유링크 제출.
 *
 * ## 쓰는 문법은 전부 23~29차에서 MakeCode 에디터 변환이 검증된 것만 (새 SVG·배포 불필요)
 *  · global 여러 변수·if·비교(==, >)·randint·led.plot·clear_screen·pause — 28·29차에서 확인.
 *  · and(두 조건) — 27차(가위바위보) 승패 판정에서 변환 확인(마커 0). show_number — 25·26차. show_icon/
 *    IconNames — 23·24·27차. → 30차는 **이미 검증된 블록만 조합**한다(그래도 build-time 에디터 확인 권장, 아래).
 *  · 실행결과 SVG 는 아크 기존 자산 재사용: 미션1=/mb29-m2.svg(똥 계속 떨어짐), 미션2=/mb26-dice-num.svg
 *    (LED 에 숫자 — 충돌 시 점수 표시 대체 이미지). 새 파일을 안 만들어 정적 배포가 필요 없다(29차 관례).
 *
 * ## 세션 운영 (29차와 동일 표준)
 *  · 대기=파이썬 타자 도우미(링크), 보상=스네이크(성찰 제출 게이트 requires mb30_share), hideDoneButton true,
 *    freeNavigation false(교사가 단계 몰기, 마음 체크인 강제 관문 유효), 활동 통 microbit-makecode.
 *  · 완성 코드 제출칸 없음 — 공유링크(500자)만. code_fill 미션은 maxLength 0(붙여넣기 아님).
 *
 * ## ★ build-time 확인 권장 (아크 스펙 상시 요구) — 클라우드 세션은 MakeCode 에디터 실행 불가라 미실측
 *  · CODE_M2 의 `if poop_x == x and poop_y == 4:`(두 조건 and) + 그 안 show_number/show_icon/대입 네 줄이
 *    파이썬 보기에 붙여넣어 블록 변환되는지 교사가 makecode.microbit.org 에서 한 번 확인. 쓰인 문법은 모두
 *    27차(and)·25/26차(show_number)·23/24/27차(show_icon)에서 이미 변환 검증됐으므로 위험은 낮다.
 *  · 설계 의도(점수=피하면+1, 충돌=맞으면 점수 보여주고 다시)를 유지하며 문법만 고쳐야 하면 교사에게 보고.
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
 * 미션1 스타터 — 29차에서 완성한 '계속 떨어지는 똥 피하기' 전체 코드에 점수만 얹는다. 주인공·똥 낙하·바닥
 * 리셋은 완성 제공. 학생은 ✎ 두 곳을 채운다: {{a}} score 초기화(맨 바깥), {{b}} 피했을 때 score+1(바닥
 * 리셋 if 안, 8칸 들여쓰기). global 에 score 는 미리 넣어둔다(기존 global 줄에 끼워넣기는 헷갈려서).
 */
const CODE_M1 = `# 똥피하기 ⑤ — 똥을 피하면 점수 1점
# 지난 시간에 '계속 떨어지는 똥 피하기' 가 완성됐어요. 오늘은 잘 피할 때마다 점수를 1점 올려요.
x = 2
poop_x = randint(0, 4)
poop_y = 0
{{a}}

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
    global poop_x, poop_y, score
    basic.clear_screen()
    led.plot(x, 4)
    poop_y = poop_y + 1
    if poop_y > 4:
        poop_y = 0
        poop_x = randint(0, 4)
{{b}}
    led.plot(poop_x, poop_y)
    basic.pause(300)
basic.forever(on_forever)`;

/**
 * 미션2 스타터 — 미션1(점수)까지 완성된 코드에 충돌 처리를 얹는다. forever 의 led.plot 다음에 ✎ 한 칸:
 * 똥이 주인공과 같은 칸(and 두 조건)이면 점수와 슬픈 얼굴을 보여주고 score·poop_y 를 0 으로 되돌려 다시.
 * poop_y=0 으로 되돌리므로 충돌한 똥이 바닥 리셋(+1)으로 또 세지지 않는다(점수 튐 없음).
 */
const CODE_M2 = `# 똥피하기 ⑥ — 똥에 맞으면 점수 보여주고 다시 시작
# 똥이 주인공과 같은 칸에서 만나면(충돌!) 지금까지 점수를 보여주고 처음부터 다시 해요.
x = 2
poop_x = randint(0, 4)
poop_y = 0
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
    global poop_x, poop_y, score
    basic.clear_screen()
    led.plot(x, 4)
    poop_y = poop_y + 1
    if poop_y > 4:
        poop_y = 0
        poop_x = randint(0, 4)
        score = score + 1
    led.plot(poop_x, poop_y)
{{a}}
    basic.pause(300)
basic.forever(on_forever)`;

/**
 * code_fill 빈칸(토큰) — 템플릿의 `{{a}}`/`{{b}}` 자리에 뜨는 인라인 편집칸. 힌트는 정답 영어 키워드를
 * 직접 쓰지 않고 뜻으로 돌려 적는다(29차 관례). answer 를 채워 blur 자동 힌트(규칙+AI 도움)가 작동하게 한다.
 * 들여쓰기(공백 칸수)는 hint 로만 안내하고 placeholder 로 정답을 노출하지 않는다(교사 요청 2026-11-09).
 */
type Slot = NonNullable<WorksheetQuestion["codeSlots"]>[number];

const SLOTS_M1: Slot[] = [
  {
    token: "a",
    label: "점수 담을 그릇 만들기",
    hint: "점수를 담을 변수 score 를 만들고 처음엔 0 으로 정하기 (맨 바깥 줄 — 들여쓰기 없음)",
    rows: 2,
    answer: "score = 0",
  },
  {
    token: "b",
    label: "피하면 1점 올리기",
    hint: "똥이 바닥을 지나 다시 떨어지려는 순간(= 잘 피했어요!) score 를 1 늘려서 다시 score 에 담기 (갈림길 if 안쪽이라 8칸 들여쓰기)",
    rows: 2,
    answer: "        score = score + 1",
  },
];

const SLOTS_M2: Slot[] = [
  {
    token: "a",
    label: "충돌! 맞으면 점수 보여주고 다시 시작",
    hint:
      "똥의 가로 칸이 주인공 칸과 같고(poop_x 가 x 와 같고) 똥이 바닥 줄(세로 poop_y 가 4)에 왔으면 → " +
      "지금 점수(score)를 숫자로 보여주고, 슬픈 얼굴을 띄운 뒤, score 와 poop_y 를 0 으로 되돌려 처음부터 다시. " +
      "(갈림길 if 한 줄 '~와 같고 ~이면'(두 조건), 그 안에 네 줄 — 들여쓰기 주의)",
    rows: 6,
    answer:
      "    if poop_x == x and poop_y == 4:\n" +
      "        basic.show_number(score)\n" +
      "        basic.show_icon(IconNames.SAD)\n" +
      "        score = 0\n" +
      "        poop_y = 0",
  },
];

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 활동지 — 미션 2개를 build·grill 두 단계에 하나씩. 각 미션은 code_fill(고정 코드 + 빈칸 + 실행결과 SVG).
// 미션2 끝에 메이크코드 공유 링크 제출(long, 자동저장, 비공개). 실행결과 SVG 는 아크 기존 자산 재사용(우측 1/3).
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── 미션 1 (build) — 점수(피하면 +1) ── */
  {
    key: "_mb30_m1",
    phase: "build",
    label: "미션 1 — 똥을 피하면 점수 1점",
    hint:
      "지난 시간에 '계속 떨어지는 똥 피하기' 를 완성했어요. 오늘은 거기에 '점수' 를 붙여요!\n" +
      "주인공·똥·바닥 리셋 코드는 스타터에 이미 다 들어 있어요. ✎ 편집칸 두 곳만 채워요:\n" +
      "   ① 점수 그릇 — 점수를 담을 score 를 만들고 처음엔 0 으로 (맨 위쪽, 들여쓰기 없는 줄)\n" +
      "   ② 피하면 1점 — 똥이 바닥을 지나 다시 떨어질 때(= 잘 피했어요!) score 를 1 늘리기 (if 안, 8칸 들여쓰기)\n" +
      "다 채우면 '완성 코드 복사' 로 복사해 MakeCode 'Python' 에 (기존 코드 다 지우고) 붙여넣어요.\n" +
      "(아직 점수가 눈에 안 보여도 괜찮아요 — 속으로 세고 있어요. 다음 미션에서 보여 줘요.)",
    kind: "code_fill",
    imageUrl: "/mb29-m2.svg",
    imageAlt: "주인공이 아래에 있고 똥이 서로 다른 칸에서 번갈아 위에서 아래로 계속 떨어지는 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    codeTemplate: CODE_M1,
    codeSlots: SLOTS_M1,
    maxLength: 0,
  },

  /* ── 미션 2 (grill) — 충돌(맞으면 점수 보여주고 다시) + 공유 링크 ── */
  {
    key: "_mb30_m2",
    phase: "grill",
    label: "미션 2 — 맞으면 점수 보여주고 다시 시작 (게임 완성!)",
    hint:
      "이제 '맞으면 어떻게 될까?' 를 넣어 게임을 완성해요. 똥이 주인공과 같은 칸에서 만나면(충돌!)\n" +
      "지금까지 점수를 보여주고, 슬픈 얼굴을 띄운 뒤, 처음부터 다시 해요.\n" +
      "forever 의 ✎ 편집칸에 '갈림길(if)' 을 써요(들여쓰기 그대로):\n" +
      "   · 똥의 가로 칸이 주인공 칸과 같고(poop_x 가 x 와 같고) 똥이 바닥 줄(poop_y 가 4)에 왔으면 →\n" +
      "   · 점수(score)를 숫자로 보여주고 → 슬픈 얼굴 → score 를 0 으로 → poop_y 도 0 으로(다시 위에서)\n" +
      "다 채우면 '완성 코드 복사' 로 복사해 MakeCode 'Python' 에 붙여넣어요.\n" +
      "(A·B 로 주인공을 움직여 피해 보세요. 맞으면 점수가 뜨고 다시 시작 — 게임 완성이에요! 🎮)",
    kind: "code_fill",
    imageUrl: "/mb26-dice-num.svg",
    imageAlt: "충돌했을 때 지금까지 점수(숫자)가 LED 화면에 떠 있는 모습",
    imageSide: "right",
    imageSideWidth: "third",
    codeTemplate: CODE_M2,
    codeSlots: SLOTS_M2,
    maxLength: 0,
  },
  {
    key: "mb30_share",
    phase: "grill",
    label: "메이크코드 공유 링크 붙여넣기",
    hint:
      "게임이 완성됐으면 만든 걸 선생님께 보여 줄 링크를 만들어 붙여넣어요.\n" +
      "MakeCode 위쪽 '공유(Share)' → '프로젝트 공유' → 나온 링크를 '복사' 해서 아래 칸에 붙여넣기.\n" +
      "붙여넣으면 자동으로 저장돼요(선생님이 볼 수 있어요). 그다음 성찰을 내면 스네이크가 열려요.",
    kind: "long",
    maxLength: 500,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "똥피하기 만들기 ③ (점수 + 게임 완성)",
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

  // 성찰 보상 게임 = 스네이크(아크에서 25차에 쓴 검증된 주소, 완성 차시라 변화를 준다). 성찰을 제출하면
  // '제출하고 게임하기' 로 열린다. requires: 미션2 공유 링크(mb30_share)가 '제출(비어있지 않음)' 돼야 열림.
  //   submitted:true → AI 채점이 아니라 입력만 본다. 비면 팝업으로 알리고 grill(미션2)로 보낸다.
  rewardGame: {
    heading: "게임 완성! 🐍",
    body: "똥피하기를 완성했어요. 성찰을 제출했으면 잠깐 스네이크로 쉬어요. 선생님이 부르면 돌아오세요.",
    url: "https://snake-game-iota-puce.vercel.app/",
    requires: [
      {
        key: "mb30_share",
        label: "메이크코드 공유 링크 (미션 2)",
        phase: "grill",
        submitted: true,
      },
    ],
  },

  progress: empty(),

  // 안내 보드 — 오늘 할 일(미션 1·2) + 아크 완성 짚기.
  assessment: {
    heading: "오늘 할 일 — 점수와 충돌로 게임 완성!",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "피하면 점수, 맞으면 다시 — 똥피하기 완성",
        note:
          "지난 시간엔 똥이 계속 떨어지고 주인공으로 피하는 데까지 만들었어요. 오늘은 '점수' 와 '충돌' 을\n" +
          "얹어 게임을 완성해요 — 잘 피하면 점수가 1점씩 오르고(미션1), 똥에 맞으면 점수를 보여주고 처음부터\n" +
          "다시 해요(미션2). 주인공·똥 코드는 스타터에 완성돼 있어요. 좌표는 가로 x·세로 y 둘 다 0~4,\n" +
          "주인공은 맨 아랫줄(세로 4). 조작은 A=왼쪽, B=오른쪽.",
        rows: [
          { label: "미션 1", value: "똥을 피할 때마다 점수 1점 (score 세기)" },
          { label: "미션 2", value: "똥에 맞으면 점수 보여주고 다시 시작 (충돌)" },
          { label: "마무리", value: "메이크코드 '공유' 링크 붙여넣기 → 성찰 → 스네이크" },
          { label: "채점은", value: "점수·자동채점 없어요 — 만들어 붙여넣어 보면 성공" },
        ],
        highlights: [
          "미션마다 스타터를 복사해 MakeCode 'Python' 에 붙여넣고, ✎ 편집칸만 채워요.",
          "오늘로 '똥피하기' 가 완성돼요. 다음 시간부터는 내가 만들고 싶은 작품을 기획해요.",
        ],
      },
      {
        label: "오늘의 새 낱말",
        subtitle: "점수 세기 · 충돌 · 보여주기",
        note:
          "'점수(score)' 는 숫자를 담는 그릇이에요 — 잘 피할 때마다 1씩 늘려요(만보기에서 걸음 센 것과 같아요).\n" +
          "'충돌' 은 두 가지가 같은 자리에서 만나는 것 — 똥의 칸과 주인공의 칸이 '같은지(==)' 를 '그리고(and)'\n" +
          "로 두 조건을 한꺼번에 따져요. 맞으면 숫자를 '보여주기(show_number)' 와 슬픈 얼굴(show_icon)로 알려요.",
        rows: [
          { label: "점수 (score)", value: "숫자 그릇 — 피할 때마다 +1" },
          { label: "충돌", value: "똥 칸 == 주인공 칸 (같은 자리에서 만남)" },
          { label: "그리고 (and)", value: "두 조건을 한꺼번에 — 가로도 같고 세로도 4" },
          { label: "보여주기", value: "show_number(점수) · show_icon(슬픈 얼굴)" },
        ],
        highlights: [
          "and(그리고)·show_number(숫자 보여주기)는 앞 시간(가위바위보·만보기)에서 써 본 거예요.",
        ],
      },
    ],
  },

  video: empty(),

  // 성찰 — 앞줄은 오늘 한 일 요약, 뒷줄이 학생이 답을 적는 질문(다음 아크 예고: 내 마이크로비트 프로젝트).
  // 자유 서술 1칸·자동저장, 비공개. 이 질문은 보상 게이트(mb30_share)를 바꾸지 않는다.
  reflectionQuestions: [
    "오늘 점수와 충돌까지 넣어 '똥피하기' 를 완성했어요.\n다음 시간부터는 내가 만들고 싶은 마이크로비트 작품을 기획해요 — 어떤 걸 만들어 보고 싶나요?",
  ],
  reflectionPublic: false,

  // MakeCode(새 탭)·파이썬 타자(새 탭)가 붙은 단계에서 창을 옮기는 것을 이탈로 안 센다.
  focusExempt: ["waiting", "build", "grill"],
  phaseLabels: {
    assessment: "안내",
    build: "미션 1 — 점수",
    grill: "미션 2 — 충돌(완성)",
  },
  phaseOrder: ["waiting", "assessment", "build", "grill", "reflection"],
  // 29차와 동일: 되돌아가기 off — 교사가 단계를 몰아준다. 공유링크(grill)가 성찰 바로 앞이라 게이트는
  // 선형 흐름으로 통과된다. 마음 체크인 강제 관문은 freeNav off 에서 유효하다.
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "똥피하기 만들기 ③ (점수 + 게임 완성)",
      body:
        "지난 시간에 완성한 '계속 떨어지는 똥 피하기' 에 점수와 충돌을 얹어 게임을 완성해요. 잘 피하면 점수가\n" +
        "오르고(미션1), 맞으면 점수를 보여주고 다시 시작해요(미션2). 각 미션은 스타터를 복사해 MakeCode 에\n" +
        "붙여넣고 ✎ 빈자리만 채워요. 마무리로 공유 링크를 내면 스네이크가 열려요. 다음 시간부터는 내 프로젝트.",
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
  console.log("단계: 대기(타자) → 기분 → 안내 → 미션1(build 점수) → 미션2(grill 충돌 + 공유링크) → 성찰. freeNav OFF. hideDoneButton true. 성찰 제출 → 스네이크.");
  console.log("문법: 23~29차 검증분만 조합(and=27차, show_number=25/26차, show_icon=23/24/27차, randint·led.plot·clear_screen=28/29차). SVG는 /mb29-m2.svg·/mb26-dice-num.svg 재사용(배포 불필요).");
  console.log("게이트: rewardGame.requires = mb30_share(submitted). 공유링크가 성찰 바로 앞 단계라 선형 흐름으로 통과.");
  console.log("★ build-time: CODE_M2 의 'if poop_x == x and poop_y == 4:' + 안쪽 네 줄을 MakeCode 파이썬 보기 붙여넣기로 한 번 확인 권장(문법은 모두 기검증, 위험 낮음).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
