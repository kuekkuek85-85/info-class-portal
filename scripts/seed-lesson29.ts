/**
 * 29차시 차시 계획 등록 — 「똥피하기 만들기 ② (똥 떨어뜨리기)」 (MakeCode 아크, 28차 이어가기).
 *
 *   node --env-file=.env.local scripts/seed-lesson29.ts
 *   node --env-file=.env.local scripts/seed-lesson29.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 28차 이어가기 — 미션3·4만 떼어 독립 차시로 (교사 확정 2026-11-10)
 *
 * 28차에서 '똥피하기 뼈대'의 미션1(주인공 이동)·미션2(벽 처리)까지만 하고 미션3·4를 다음 시간으로
 * 미뤘다. 29차는 그 **미션3(똥 낙하)·미션4(바닥 처리 + 공유링크 제출)** 를 그대로 가져와, 28차에서
 * 만든 뼈대(주인공 좌우 이동 + 벽 처리는 스타터에 완성된 채로 제공) 위에 '똥을 얹는' 흐름이다.
 * 충돌·점수·여러 똥(하이브리드 A 연속)은 30차로 보존 — 여기서는 건드리지 않는다.
 *
 *   미션1(build) = 28차 미션3   똥 한 개 낙하 — **바닥 처리 없음**(한 번 떨어지고 사라지는 버그를 드러냄).
 *                              빈칸: poop_y+1, 똥 led.plot. (주인공+벽은 완성 제공.)
 *   미션2(grill) = 28차 미션4   바닥 처리 — if poop_y>4: poop_y=0; poop_x=randint(0,4) 로 계속 떨어지게.
 *                              + 메이크코드 공유 링크 제출(mb29_share, long, 자동저장).
 *
 * 출처: seed-lesson28.ts 의 CODE_M3/M4·SLOTS_M3/M4 그대로. 난이도 조정 없음(교사 확정 #1).
 * 실행결과 SVG 는 28차 자산을 그대로 참조해 배포 없이 쓴다 — 미션1=/mb28-m3.svg(똥 한 번 떨어짐),
 *   미션2=/mb28-m4.svg(똥 계속 떨어짐). 새 SVG 파일을 만들지 않아 정적 배포가 필요 없다.
 *
 * ## 세션 운영 (교사 확정)
 *  · freeNavigation: false (#2) — 되돌아가기 off, 교사가 단계를 몰아준다. 마음 체크인 강제 관문 유효.
 *    공유링크(grill)가 성찰 바로 앞 단계라, 선형 흐름에서 성찰에 닿기 전에 링크가 제출된다 →
 *    성찰 '제출하고 게임하기' 에서 UNO 게이트(requires mb29_share)가 바로 통과된다.
 *  · 완성 코드 제출칸 없음 (#3) — 공유링크(500자)만. code_fill 미션은 maxLength 0(붙여넣기 아님).
 *  · 대기=파이썬 타자 도우미(링크), 보상=UNO(성찰 제출 게이트), hideDoneButton true, 활동 통 microbit-makecode.
 *
 * ## MakeCode 실측 (28차에서 검증 완료, 2026-11-08) — 코드가 28차 미션3·4와 동일하므로 그대로 유효.
 *  · forever 안 poop_y+1·led.plot·clear_screen, if/비교(>,==), randint(0,4), global 여러 변수 — 변환 확인.
 *  · '___'/'★★★' 는 쓰지 않는다(블록 변환 깨짐). 빈칸은 code_fill ✎ 편집칸으로.
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
const LESSON_NO = 29;
const FORCE = process.argv.includes("--force");

/** 23~28차와 같은 MakeCode 피지컬 아크 전용 통 (키가 겹치지 않으므로 공유해도 안전). */
const ACTIVITY_ID = "microbit-makecode";

/**
 * 미션1 스타터 (= 28차 미션3) — 똥 한 개 낙하(바닥 처리 없음). 주인공 이동+벽 처리는 완성 제공(28차에서
 * 만든 뼈대). 학생은 ✎ 세 곳을 채운다: ① 똥 시작 칸(poop_x 초기화, 맨 바깥 줄 — randint 로 무작위),
 * ② poop_y 1 늘리기(세로로 한 칸 내려오기), ③ 똥 led.plot. 토큰은 읽기 순서(위→아래) = a·b·c.
 * 바닥 처리가 없어 poop_y 가 4를 넘으면 화면 밖이라 똥이 한 번 떨어지고 사라진다 → 미션2에서 고침.
 */
const CODE_M1 = `# 똥피하기 ③ — 똥 한 개 떨어뜨리기
# 똥은 아무 칸(가로 poop_x)에서 맨 위(세로 0)부터 아래로 내려와요.
x = 2
{{a}}
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
{{b}}
{{c}}
    basic.pause(300)
basic.forever(on_forever)`;

/**
 * 미션2 스타터 (= 28차 미션4) — 바닥 처리. 똥이 바닥(4)을 지나면 맨 위(0)·새 칸에서 다시 떨어지게.
 * forever 에 if 세 줄을 더한다. forever 본문에 clear_screen·led.plot·poop_y+1 이 실제 문장으로 있어 변환 OK.
 * 이걸 채우면 29차 목표(똥이 계속 떨어짐) 완성.
 */
const CODE_M2 = `# 똥피하기 ④ — 바닥에 닿으면 다시 위에서 (계속 떨어지게)
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
 * code_fill 빈칸(토큰) — 위 템플릿의 `{{a}}`/`{{b}}` 자리에 뜨는 인라인 편집칸. 힌트(label·hint)는 정답 영어
 * 키워드를 직접 쓰지 않고 뜻으로 돌려 적는다. answer 를 채워 blur 자동 힌트(규칙+AI 도움)가 작동하게 한다.
 * ★입력칸 안 placeholder 정답 노출 없음(교사 요청 2026-11-09). 들여쓰기 공백 4칸은 hint 로만 안내.
 */
type Slot = NonNullable<WorksheetQuestion["codeSlots"]>[number];

const SLOTS_M1: Slot[] = [
  {
    token: "a",
    label: "똥 시작 칸 정하기",
    hint: "똥이 처음 나타날 가로 칸(poop_x)을 0~4 중에서 '무작위' 로 하나 정해 담기 (주사위에서 쓴 그 명령, 맨 바깥 줄 — 들여쓰기 없음)",
    rows: 2,
    answer: "poop_x = randint(0, 4)",
  },
  {
    token: "b",
    label: "똥 한 칸 아래로",
    hint: "poop_y 를 1 늘려서 다시 poop_y 에 담기 (세로로 한 칸 내려오기)",
    rows: 2,
    answer: "    poop_y = poop_y + 1",
  },
  {
    token: "c",
    label: "똥 켜기",
    hint: "가로 poop_x, 세로 poop_y 자리에 불 하나 켜기",
    rows: 2,
    answer: "    led.plot(poop_x, poop_y)",
  },
];

const SLOTS_M2: Slot[] = [
  {
    token: "a",
    label: "바닥 처리",
    hint: "똥이 바닥을 지나면(poop_y 가 4 보다 커지면) poop_y 를 0 으로 되돌리고, poop_x 에 0~4 중 무작위 수 담기 (갈림길 if 세 줄)",
    rows: 3,
    answer: "    if poop_y > 4:\n        poop_y = 0\n        poop_x = randint(0, 4)",
  },
];

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 활동지 — 미션 2개를 build·grill 두 단계에 하나씩. 각 미션은 code_fill(고정 코드 + 빈칸 + 실행결과 SVG).
// 미션2 끝에 메이크코드 공유 링크 제출(long, 자동저장, 비공개). 실행결과 SVG 는 28차 자산 재사용(설명 우측 1/3 폭).
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── 미션 1 (build) — 똥 한 개 낙하 (바닥 처리 없음) ── */
  {
    key: "_mb29_m1",
    phase: "build",
    label: "미션 1 — 똥 한 개 떨어뜨리기",
    hint:
      "지난 시간에 만든 주인공(좌우로 움직이고 벽에서 멈추는) 은 코드에 이미 다 들어 있어요.\n" +
      "오늘은 그 위에 '똥' 을 얹어요! 똥은 아무 칸(가로 poop_x)에서 맨 위(세로 0)부터 아래로 내려와요.\n" +
      "주인공 부분은 그대로 두고, ✎ 편집칸 세 곳을 채워요:\n" +
      "   ① 똥 시작 칸 정하기 — 똥이 처음 나타날 가로 칸을 0~4 중 '무작위' 로 하나 정해요 (맨 위쪽, 들여쓰기 없는 줄)\n" +
      "   ② 똥을 한 칸 아래로 — poop_y 를 1 늘려서 다시 poop_y 에 담기 (세로로 내려오기)\n" +
      "   ③ 똥 켜기 — 가로 poop_x, 세로 poop_y 자리에 불 켜기\n" +
      "다 채우면 '완성 코드 복사' 로 복사해 MakeCode 'Python' 에 (기존 코드 다 지우고) 붙여넣어요.\n" +
      "(똥이 한 번 떨어지면… 그 뒤로 안 보이죠? 바닥 처리가 없어서예요 — 미션 2에서 고쳐요.)",
    kind: "code_fill",
    imageUrl: "/mb28-m3.svg",
    imageAlt: "똥 불 하나가 위에서 아래로 한 번 떨어진 뒤 사라지는 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    codeTemplate: CODE_M1,
    codeSlots: SLOTS_M1,
    maxLength: 0,
  },

  /* ── 미션 2 (grill) — 바닥 처리 + 메이크코드 공유 링크 제출 ── */
  {
    key: "_mb29_m2",
    phase: "grill",
    label: "미션 2 — 바닥에 닿으면 다시 위에서",
    hint:
      "똥이 한 번만 떨어지고 끝났죠? 바닥(세로 4)을 지나면 맨 위(0)로 올리고, 새 칸에서 다시 떨어지게 고쳐요.\n" +
      "forever 의 ✎ 편집칸에 '갈림길(if)' 세 줄을 써요(들여쓰기 그대로):\n" +
      "   · 똥이 바닥을 지나면(poop_y 가 4 보다 커지면) → poop_y 를 0 으로 되돌리고,\n" +
      "   · 새 칸에서 다시 — poop_x 에 0~4 중 '무작위' 로 수 하나 담기 (주사위에서 쓴 그 명령)\n" +
      "다 채우면 '완성 코드 복사' 로 복사해 MakeCode 'Python' 에 붙여넣어요.\n" +
      "(이제 똥이 계속 떨어져요! 주인공으로 피해 보세요. 충돌·점수는 다음 시간(30차)에 더해요.)",
    kind: "code_fill",
    imageUrl: "/mb29-m2.svg",
    imageAlt: "주인공이 아래에 있고 똥이 서로 다른 두 칸(가로)에서 번갈아 위에서 아래로 계속 떨어지는 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    codeTemplate: CODE_M2,
    codeSlots: SLOTS_M2,
    maxLength: 0,
  },
  {
    key: "mb29_share",
    phase: "grill",
    label: "메이크코드 공유 링크 붙여넣기",
    hint:
      "똥이 계속 떨어지면 완성이에요! 만든 걸 선생님께 보여 줄 링크를 만들어 붙여넣어요.\n" +
      "MakeCode 위쪽 '공유(Share)' → '프로젝트 공유' → 나온 링크를 '복사' 해서 아래 칸에 붙여넣기.\n" +
      "붙여넣으면 자동으로 저장돼요(선생님이 볼 수 있어요). 그다음 성찰을 내면 UNO 가 열려요.",
    kind: "long",
    maxLength: 500,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "똥피하기 만들기 ② (똥 떨어뜨리기)",
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
  // requires: 미션2 메이크코드 공유 링크(mb29_share)가 '제출(비어있지 않음)' 돼야 게임이 열린다.
  //   submitted:true → AI 채점이 아니라 입력만 본다. 비면 팝업으로 알리고 grill(미션2)로 보낸다.
  rewardGame: {
    heading: "수고했어요! 🃏",
    body: "성찰을 제출했으면 잠깐 UNO 로 쉬어요. 선생님이 부르면 돌아오세요.",
    url: "https://uno-game-gilt.vercel.app/",
    requires: [
      {
        key: "mb29_share",
        label: "메이크코드 공유 링크 (미션 2)",
        phase: "grill",
        submitted: true,
      },
    ],
  },

  progress: empty(),

  // 안내 보드 — 오늘 할 일(미션 1·2) + 28차 이어가기 짚기.
  assessment: {
    heading: "오늘 할 일 — 똥을 떨어뜨리자",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "지난 뼈대에 똥 낙하 얹기",
        note:
          "지난 시간엔 주인공을 좌우로 움직이고 벽에서 멈추게 했어요(뼈대). 오늘은 그 위에 '똥' 을 얹어요 —\n" +
          "똥이 위에서 아래로 떨어지고(미션1), 바닥에 닿으면 다시 위에서 계속 떨어지게(미션2) 만들어요.\n" +
          "주인공 코드는 스타터에 이미 완성돼 있어요. 충돌(맞으면 게임오버)·점수는 다음 시간(30차)에 더해요.\n" +
          "좌표는 가로 x·세로 y 둘 다 0~4, 주인공은 맨 아랫줄(세로 4). 조작은 A=왼쪽, B=오른쪽.",
        rows: [
          { label: "미션 1", value: "똥 한 개 떨어뜨리기 (한 번 떨어지고 사라져요)" },
          { label: "미션 2", value: "바닥에 닿으면 다시 위에서 (계속 떨어지게)" },
          { label: "마무리", value: "메이크코드 '공유' 링크 붙여넣기 → 성찰 → UNO" },
          { label: "채점은", value: "점수·자동채점 없어요 — 만들어 붙여넣어 보면 성공" },
        ],
        highlights: [
          "미션마다 스타터를 복사해 MakeCode 'Python' 에 붙여넣고, ✎ 편집칸만 채워요.",
          "미션 1 은 일부러 '버그'(똥이 한 번 떨어지고 사라짐) 가 있어요 — 미션 2에서 직접 고쳐요.",
        ],
      },
      {
        label: "오늘의 새 낱말",
        subtitle: "떨어뜨리기 · 지우고 다시 그리기 · 바닥 리셋",
        note:
          "무한반복(forever)은 '게임 루프' 예요 — 아주 빠르게 되풀이하며 화면을 새로 그려요. 똥은 세로 poop_y 를\n" +
          "조금씩 늘려 아래로 내려오고, 매번 '화면을 지우고(clear) 다시 켜기' 를 해야 움직이는 것처럼 보여요.\n" +
          "똥이 바닥(4)을 지나면 맨 위(0)로 '되돌리고' 새 칸(무작위)에서 다시 떨어뜨려야 끊기지 않고 계속 떨어져요.",
        rows: [
          { label: "똥 내려오기", value: "poop_y 를 조금씩 늘려 아래로" },
          { label: "화면 지우고 그리기", value: "매번 지우고 다시 켜야 움직여 보여요" },
          { label: "바닥 리셋", value: "바닥을 지나면 맨 위·새 칸에서 다시" },
          { label: "무작위 (randint)", value: "새 칸은 0~4 중 아무 데나 (주사위에서 썼죠)" },
        ],
        highlights: [
          "오늘은 '떨어뜨리기' 와 '바닥에서 다시' 두 가지만 기억하면 돼요.",
        ],
      },
    ],
  },

  video: empty(),

  // 성찰 — 앞줄은 오늘 한 일 요약 안내, 뒷줄이 학생이 답을 적는 질문(30차 예고: 충돌·점수·똥 2개·AI).
  // label 이 whitespace-pre-wrap 이라 \n 으로 두 줄이 그대로 뜬다. 자유 서술 1칸·자동저장, 비공개.
  // 이 질문은 보상 게이트(mb29_share)를 바꾸지 않는다 — 게이트는 공유링크 제출 그대로.
  reflectionQuestions: [
    "지난 시간에 만든 뼈대에 똥 낙하와 바닥 리셋을 얹었어요.\n다음 시간에 추가될 기능을 예상해 보세요.",
  ],
  reflectionPublic: false,

  // MakeCode(새 탭)·파이썬 타자(새 탭)가 붙은 단계에서 창을 옮기는 것을 이탈로 안 센다.
  focusExempt: ["waiting", "build", "grill"],
  phaseLabels: {
    assessment: "안내",
    build: "미션 1 — 똥 낙하",
    grill: "미션 2 — 바닥 처리",
  },
  phaseOrder: ["waiting", "assessment", "build", "grill", "reflection"],
  // 교사 확정(#2): 되돌아가기 off — 교사가 단계를 몰아준다. 공유링크(grill)가 성찰 바로 앞이라 게이트는
  // 선형 흐름으로 통과된다. 마음 체크인 강제 관문은 freeNav off 에서 유효하다.
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "똥피하기 만들기 ② (똥 떨어뜨리기)",
      body:
        "지난 시간에 만든 주인공 뼈대 위에 똥을 얹어요. 똥을 한 개 떨어뜨리고(미션1), 바닥에 닿으면 다시\n" +
        "위에서 계속 떨어지게 고쳐요(미션2). 각 미션은 스타터를 복사해 MakeCode 에 붙여넣고 ✎ 빈자리만\n" +
        "채워요. 마무리로 공유 링크를 내면 UNO 가 열려요. 충돌·점수는 다음 시간(30차).",
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (23~28차와 같은 MakeCode 통, 키 mb29_* 로 충돌 없음)`);
  console.log("단계: 대기(타자) → 기분 → 안내 → 미션1(build 똥 낙하) → 미션2(grill 바닥 처리 + 공유링크) → 성찰. freeNav OFF. hideDoneButton true. 성찰 제출 → UNO.");
  console.log("출처: 28차 미션3·4 그대로(난이도 조정 없음). SVG는 /mb28-m3.svg·/mb28-m4.svg 재사용(배포 불필요).");
  console.log("게이트: rewardGame.requires = mb29_share(submitted). 공유링크가 성찰 바로 앞 단계라 선형 흐름으로 통과.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
