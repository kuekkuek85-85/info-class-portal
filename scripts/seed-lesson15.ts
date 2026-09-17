/**
 * 15차시 차시 계획 등록 — 「똥피하기 게임 — 분석·설계 + 첫 기능(주인공 좌우 이동)」.
 *
 *   node --env-file=.env.local scripts/seed-lesson15.ts
 *   node --env-file=.env.local scripts/seed-lesson15.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 이 자리(LESSON_NO 15)는 교사가 아크를 바꾸며 새로 지었다
 *
 * 14차(프로그래밍 언어 개론 + 파이썬 맛보기, seed-lesson14.ts)에 이어지는, 게임 제작 아크의
 * **두 번째 수업**. 익숙한 똥피하기를 파이썬(터틀)으로 직접 만든다. 오늘은 게임을 뜯어보고
 * (분석) → 만들 순서를 정하고(설계) → 첫 기능 하나(주인공 좌우 이동)를 만든다.
 *
 * 아크: **개론+맛보기(14) → 똥피하기 분석·설계+첫 기능(15, 이 파일) → 기능을 하나씩 붙이는
 *   구현 차시들(≈이후 6차시, 같은 python-dodge-game 통을 이어 씀) → 피지컬 컴퓨팅 개념(122)
 *   → 마이크로비트(123) → 바이브 코딩 → 햄스터**.
 *
 * 예전 15차(마이크로비트)는 게임 아크 뒤로 밀려 123(seed-lesson-microbit.ts)에 파킹했다.
 *
 * ## 이 시간의 목적 — "만들기 전에 뜯어보고, 순서를 정한다"
 *
 * 코드부터 치지 않는다. 먼저 익숙한 게임을 **구성요소로 뜯어**(도메인 분석) 무엇이 필요한지
 * 보고, **어떤 순서로 붙일지**(설계) 정한다. 좌표(화면은 x·y, 주인공은 (x,y) 위치) 개념을
 * 쉬운 note 로 먼저 잡은 뒤, 오늘의 첫 기능 **주인공 좌우 이동**만 터틀로 만들어 성공을 맛본다.
 * 나머지 기능(똥 떨어뜨리기·충돌·점수)은 다음 차시들에서 하나씩 붙인다.
 *
 * ## 활동 통(activityId) — 게임 제작 아크 공용 통
 *
 * `python-dodge-game` 를 판다. **이후 구현 차시들이 같은 통을 이어 쓴다** — 분석·설계·코드
 * 기록이 한 문서에 쌓여 이어지게. 14차 개론/맛보기 통(python-intro)·마이크로비트~햄스터 실습
 * 통(physical-computing)·디지털 윤리 통(digital-ethics)과 물리적으로 다른 문서라 안 섞인다.
 *
 * ## 단계 배치와 실제 진행 순서
 *
 * 포털 단계 순서(LESSON_PHASES)는 assessment(안내) → worksheet(활동지)로 흐르고, 실제
 * 진행은 교사가 단추로 몬다(freeNavigation). 교사 뼈대 순서:
 *
 *   0–3   대기(똥피하기) · 기분 · 출석
 *   3–8   안내 보드(assessment) — 오늘: 분석 → 설계 → 첫 기능
 *   8–13  좌표 개념 note (화면은 x·y, 주인공은 (x,y))
 *   13–23 게임 분석 — 필요한 구성요소와 하는 일 적기(rows)
 *   23–30 게임 설계 — 만들 순서 정하기(note + 순서 적기 list)
 *   30–38 첫 기능 구현 — 주인공 좌우 이동(터틀 예제 따라 치기)
 *   38–40 성찰 → 정리
 *
 * 점수·자동채점은 없다. 진도 팝업(progressChecks)은 없다.
 *
 * 대상 1~4반 중1. 각 반 30번은 테스트 학생(리허설). 숙제/집에 내주는 것 없음. seed 멱등(--force).
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
const LESSON_NO = 15;

/** 9~11차시와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/**
 * **게임 제작 아크 공용 통.** 똥피하기 분석·설계·구현 차시들이 한 문서에 이어 쓴다 — 코드·설계
 * 기록이 쌓이게. 14차 개론/맛보기 통(python-intro)·마이크로비트~햄스터 실습 통
 * (physical-computing)·디지털 윤리 통(digital-ethics)과 물리적으로 다른 문서라 안 섞인다.
 */
const ACTIVITY_ID = "python-dodge-game";

/* ──────────────────────────────────────────────────────────────
 * 첫 기능 예제 코드 — 주인공 좌우 이동. code 필드로 준다(등폭 readonly, 들여쓰기 보존 + 복사).
 * 14차와 같은 **터틀**로 일관한다. 방향키(Left/Right)로 주인공의 x 좌표를 바꿔 움직인다 —
 * 좌표 개념 note 와 바로 이어진다(왼쪽 = x 줄이기, 오른쪽 = x 늘리기).
 * ────────────────────────────────────────────────────────────── */
const CODE_PLAYER_MOVE = `import turtle

screen = turtle.Screen()
screen.setup(400, 500)          # 게임 화면 크기(가로 400, 세로 500)

# 주인공 만들기
player = turtle.Turtle()
player.shape("square")          # 네모 모양
player.penup()                  # 선을 안 그리고 이동만
player.goto(0, -200)            # 화면 아래쪽 가운데 (x=0, y=-200)

# 왼쪽으로 — x 좌표를 20만큼 줄인다
def go_left():
    x = player.xcor()           # 지금 x 좌표를 읽어서
    player.setx(x - 20)         # 20만큼 왼쪽으로

# 오른쪽으로 — x 좌표를 20만큼 늘린다
def go_right():
    x = player.xcor()
    player.setx(x + 20)         # 20만큼 오른쪽으로

# 방향키를 누르면 위 함수가 실행되게 연결
screen.listen()
screen.onkeypress(go_left, "Left")
screen.onkeypress(go_right, "Right")

screen.mainloop()`;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 활동지 — 좌표 note → 게임 분석(rows) → 게임 설계(note + 순서 list) → 첫 기능(터틀 코드).
// 한 worksheet 단계에 위→아래로 흐른다. 오늘 남기는 기록: 분석 표 · 만들 순서.
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── ① 좌표 개념 note (화면은 x·y, 주인공은 (x,y) 위치) ── */
  {
    key: "_dg_coord",
    phase: "worksheet",
    label: "① 화면은 좌표로 되어 있어요 (x · y)",
    hint:
      "게임을 만들려면 '어디에 있는지' 를 숫자로 말할 수 있어야 해요. 그게 **좌표** 예요.\n\n" +
      "  · x — 좌우 위치. 오른쪽으로 갈수록 커지고, 왼쪽으로 갈수록 작아져요.\n" +
      "  · y — 위아래 위치. 위로 갈수록 커지고, 아래로 갈수록 작아져요.\n\n" +
      "화면 한가운데가 (0, 0) 이에요. 주인공이 (0, -200) 에 있다면 '가로는 가운데, 세로는 아래쪽'\n" +
      "이라는 뜻이에요.\n\n" +
      "그래서 주인공을 **왼쪽으로** 옮기려면 x 를 줄이고(-20), **오른쪽으로** 옮기려면 x 를\n" +
      "늘리면(+20) 돼요. 오늘 첫 기능이 바로 이거예요.",
    kind: "note",
    maxLength: 0,
  },

  /* ── ② 게임 분석 (도메인 분석): 필요한 구성요소와 하는 일 ── */
  {
    key: "_dg_analyze_intro",
    phase: "worksheet",
    label: "② 게임을 뜯어보기 — 무엇이 필요할까?",
    hint:
      "똥피하기 게임을 만들려면 무엇무엇이 필요한지 '구성요소' 로 뜯어봐요. 대기 화면에서\n" +
      "해 본 게임을 떠올리면 쉬워요. 예를 들면:\n\n" +
      "  · 주인공(플레이어) — 좌우로 움직여 똥을 피한다\n" +
      "  · 똥(장애물) — 위에서 아래로 떨어진다\n" +
      "  · 좌표(위치) — 주인공·똥이 화면 어디에 있는지 (x, y)\n" +
      "  · 충돌(부딪힘) — 똥이 주인공에게 닿았는지\n" +
      "  · 점수 — 피한 만큼 올라간다 / 화면 경계 — 주인공이 밖으로 못 나가게\n\n" +
      "아래 표에 '이 게임에 필요한 것' 과 '그게 하는 일' 을 나눠 적어 봐요. 위 예시를 참고해\n" +
      "내 말로 적으면 됩니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "dg_components",
    phase: "worksheet",
    label: "게임 구성요소 분석",
    hint:
      "왼쪽 칸엔 필요한 것(구성요소) 이름을, 오른쪽 칸엔 그게 게임에서 하는 일을 한 줄로 적어요. " +
      "[+ 줄 추가] 로 늘릴 수 있어요.",
    kind: "rows",
    rowColumns: [
      { key: "part", label: "필요한 것 (구성요소)", placeholder: "예) 주인공" },
      { key: "role", label: "하는 일", placeholder: "예) 좌우로 움직여 똥을 피한다" },
    ],
    maxRows: 6,
    // JSON 배열로 한 칸에 담긴다 (rows-field). 여섯 줄 × 두 칸이라 넉넉히 잡아도 2,000 안쪽
    maxLength: 2000,
  },

  /* ── ③ 게임 설계 (만들 순서 정하기) ── */
  {
    key: "_dg_design_intro",
    phase: "worksheet",
    label: "③ 만들 순서를 정하기 — 한 번에 다 만들지 않아요",
    hint:
      "게임은 한 번에 통째로 만들지 않아요. 쉬운 것부터 **하나씩** 붙여 갑니다. 보통 이 순서예요:\n\n" +
      "  ① 주인공 그리기 + 좌우로 움직이기   ← 오늘 여기까지!\n" +
      "  ② 똥을 위에서 아래로 떨어뜨리기\n" +
      "  ③ 똥이 주인공에 닿았는지 확인하기(충돌 처리)\n" +
      "  ④ 점수 세기 · 게임 끝내기\n\n" +
      "이렇게 순서를 정해 두면, 한 기능이 될 때마다 게임이 조금씩 완성돼요. 아래 칸에 '내가\n" +
      "생각한 만들 순서' 를 적어 봐요. 위 순서를 그대로 써도 되고, 내 생각대로 바꿔도 좋아요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "dg_build_order",
    phase: "worksheet",
    label: "내가 만들 순서",
    hint: "한 칸에 기능 하나씩, 만들 순서대로 적어 봐요. [+ 칸 추가] 로 늘릴 수 있어요.",
    kind: "list",
    minItems: 4,
    maxItems: 6,
    itemPlaceholder: "예) 1. 주인공을 그리고 좌우로 움직이게 하기",
    // 문자열 배열을 JSON 으로 한 칸에 담는다(list-field). 여섯 칸이라 넉넉히 잡아도 1,500 안쪽
    maxLength: 1500,
  },

  /* ── ④ 첫 기능 구현 — 주인공 좌우 이동 (터틀 예제) ── */
  /*
   * ★ 인터랙티브 편집기 링크 자리 (선생님이 추후 링크 공유 예정) — 지금은 임의 URL 없음.
   *
   * 학생이 브라우저에서 바로 파이썬 터틀을 돌려 보게 하려면(예: trinket.io/python 등),
   * 아래 note 에 `linkUrl`·`linkLabel` 을 더하면 문항 밑에 새 탭 링크 단추가 뜬다
   * (14차 맛보기 note 와 같은 방식). 지금은 코드를 note+code(복사 단추)로 보여주고 교사가
   * 앞 화면에서 시연 → 학생이 따라 치는 톤이다.
   * 넣는 법: 선생님이 편집기 링크를 주면 총괄이 이 note 에
   *   linkUrl: "<선생님이 준 주소>", linkLabel: "파이썬 터틀 편집기 열기 (새 탭)"
   * 를 채운다. (링크가 붙어도 이 문항이 focusExempt(worksheet)로 덮여 이탈 오탐이 안 난다.)
   */
  {
    key: "_dg_feature_move",
    phase: "worksheet",
    label: "④ 첫 기능 만들기 — 주인공 좌우 이동",
    hint:
      "설계한 ①번(주인공 좌우 이동)을 오늘 만들어 봐요. 아래 코드를 선생님과 함께 한 줄씩 읽고,\n" +
      "그대로 따라 쳐서 실행합니다. 네모 주인공이 뜨고, **방향키(← →)로 좌우로 움직이면 성공!**\n\n" +
      "· player.goto(0, -200) — 주인공을 화면 아래 가운데에 놓아요.\n" +
      "· go_left / go_right — 방향키를 누르면 x 좌표를 20씩 줄이거나 늘려요(왼쪽/오른쪽).\n" +
      "· onkeypress(go_left, \"Left\") — 왼쪽 방향키에 그 동작을 연결해요.\n\n" +
      "성공했으면 한 군데 바꿔 봐요: setx(x - 20) 의 20 을 크게(40)/작게(10) 바꾸면 움직이는\n" +
      "폭이 달라져요. 다음 시간엔 여기에 '똥 떨어뜨리기(②)' 를 붙입니다.",
    kind: "note",
    code: CODE_PLAYER_MOVE,
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "똥피하기 게임 — 분석·설계 + 첫 기능",
  moodCheckEnabled: true,

  game: {
    heading: "기다리는 동안 — 똥피하기",
    body:
      "수업이 시작되길 기다리는 동안 잠깐 쉬어요.\n" +
      "위에서 떨어지는 똥을 좌우로 움직여 피하면 돼요.\n" +
      "오늘은 이 게임을 뜯어보고, 직접 만들기 시작합니다! 수업이 시작되면 닫습니다.",
    url: "https://dodge-poop-game.vercel.app/",
  },
  gameExplainer: empty(),

  // 다음 시간(progress) 단계는 두지 않는다 — 안내(assessment)가 이미 있어 중복이다.
  progress: empty(),

  /*
   * 안내 보드 — 오늘 순서(분석 → 설계 → 첫 기능). 활동 중 되돌아와 볼 수 있다.
   */
  assessment: {
    heading: "오늘 할 일 — 똥피하기를 뜯어보고, 만들기 시작",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "만들기 전에 뜯어보고, 순서를 정해요",
        note:
          "지난 시간에 파이썬을 살짝 만져 봤죠? 오늘부터 그 파이썬으로 **익숙한 똥피하기 게임**을\n" +
          "직접 만들기 시작해요. 오늘은 게임을 뜯어보고(분석), 만들 순서를 정하고(설계), 첫 기능\n" +
          "하나(주인공 좌우 이동)까지 만듭니다.",
        rows: [
          { label: "분석", value: "게임을 구성요소로 뜯어보기 — 무엇이 필요한가" },
          { label: "설계", value: "기능을 어떤 순서로 붙일지 정하기" },
          { label: "첫 기능", value: "주인공을 그리고 방향키로 좌우로 움직이기" },
          { label: "채점은", value: "점수·자동채점 없어요. 뜯어보고 따라 만들면 됩니다" },
        ],
        highlights: [
          "코드부터 치지 않아요. 뜯어보고 순서를 정하는 것도 '만들기' 의 중요한 부분이에요.",
        ],
      },
      {
        label: "오늘 순서",
        subtitle: "좌표 → 분석 → 설계 → 첫 기능",
        note: "활동지가 위에서 아래로 이어져요. 순서대로 내려오면 됩니다.",
        rows: [
          { label: "1", value: "화면 좌표(x·y) 알기 — 어디에 있는지 숫자로 말하기" },
          { label: "2", value: "게임 분석 — 필요한 구성요소와 하는 일 적기" },
          { label: "3", value: "게임 설계 — 만들 순서 정하기" },
          { label: "4", value: "첫 기능 — 주인공 좌우 이동(터틀 코드 따라 치기)" },
          { label: "마지막", value: "성찰 한두 줄" },
        ],
        highlights: [
          "오늘은 ①번 기능(좌우 이동)까지만 만들어요. 나머지는 다음 시간부터 하나씩 붙여요.",
        ],
      },
    ],
  },

  video: empty(),

  /*
   * 성찰 — 게임을 뜯어본 소감 / 다음에 붙이고 싶은 기능. 개인적이라 비공개.
   */
  reflectionQuestions: [
    "익숙한 게임을 구성요소로 뜯어보니 어땠나요? 새로 알게 된 점을 한 줄로 적어 봅시다.",
    "다음 시간에 붙이고 싶은 기능이 있다면 무엇인가요? (똥 떨어뜨리기·충돌·점수 등)",
  ],
  reflectionPublic: false,

  /*
   * 첫 기능 예제에 편집기 링크(외부 새 탭)를 나중에 붙일 수 있어, worksheet 단계에서 창을
   * 옮기는 것을 이탈로 세지 않는다 (14차 맛보기 링크 단계를 focusExempt 로 둔 것과 같은 이유).
   * 지금은 링크 자리(주석 placeholder)만 있고 실제 linkUrl 은 선생님이 주면 총괄이 채운다.
   */
  focusExempt: ["worksheet"],
  phaseLabels: {
    assessment: "안내",
    worksheet: "분석·설계·첫 기능",
  },
  /*
   * 되돌아가기 켬 — 학생이 안내·활동지 사이를 스스로 오갈 수 있다. 교사는 좌표 → 분석 →
   * 설계 → 첫 기능 순으로 단추로 몬다.
   */
  freeNavigation: true,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리는 차시가 아니다 — 비우면 글만/기록만 하는 활동으로 잡는다
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "똥피하기 게임 — 뜯어보고, 순서 정하고, 첫 기능 만들기",
      body:
        "위에서부터 순서대로 해요. 좌표를 알고, 게임을 구성요소로 뜯어본 뒤, 만들 순서를 정하고,\n" +
        "첫 기능(주인공 좌우 이동)을 터틀로 만들어 봅니다.",
    },
    worksheet: WORKSHEET,
    // 서로 구경하기·출처 칸은 이 차시에서 쓰지 않는다
    galleryEnabled: false,
    sourcesEnabled: false,
  },
};

async function main(): Promise<void> {
  const existing = await db.collection(LESSON_PLANS).where("lessonNo", "==", LESSON_NO).get();
  const now = Date.now();

  if (!existing.empty) {
    const doc = existing.docs[0];
    /*
     * 이 lessonNo 15 자리에는 예전에 마이크로비트 계획이 있었다(123으로 옮김). merge 로는
     * 그때의 progress(다음 시간 탭)·progressChecks 가 남아 화면에 섞인다 — FieldValue.delete()
     * 로 명시 삭제한다. 이 차시엔 quiz 단계가 없어, 옛 quiz 도 함께 지운다.
     */
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

    /* 9~11차시와 같은 규칙 — 아직 아무도 안 들어온 수업에만 반영한다 */
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
          game: PLAN.game,
          gameExplainer: PLAN.gameExplainer,
          // progress(다음 시간)·진도 팝업·옛 quiz 제거 — merge 로 안 비워지므로 세션에서도 지운다.
          progress: FieldValue.delete(),
          progressChecks: FieldValue.delete(),
          quiz: FieldValue.delete(),
          assessment: PLAN.assessment,
          video: PLAN.video,
          reflectionQuestions: PLAN.reflectionQuestions,
          reflectionPublic: PLAN.reflectionPublic,
          focusExempt: PLAN.focusExempt,
          phaseLabels: PLAN.phaseLabels,
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (게임 제작 아크 공용 통 — 이후 구현 차시가 이어 씀. 개론 통 python-intro·실습 통 physical-computing 과 분리)`);
  console.log("단계: 대기(똥피하기) → 기분 → 안내(assessment) → 활동지(worksheet: 좌표·분석·설계·첫 기능) → 성찰");
  console.log("실제 진행: 안내 → 좌표 note → 게임 분석(rows) → 게임 설계(순서 list) → 첫 기능 주인공 좌우 이동(터틀 코드) → 성찰 (freeNavigation)");
  console.log("분석 칸(dg_components, rows): 필요한 것(구성요소) / 하는 일 (maxRows 6). 설계 칸(dg_build_order, list): 만들 순서 4~6칸.");
  console.log("첫 기능: 주인공 좌우 이동 — 터틀 onkeypress(Left/Right)로 x 좌표 ±20. code 필드로 제시(등폭 readonly, 복사 단추). 14·15차 모두 터틀로 일관.");
  console.log("★ 인터랙티브 편집기 링크는 자리(주석 placeholder)만 — 선생님이 링크 주면 총괄이 _dg_feature_move note 에 linkUrl/linkLabel 채움.");
  console.log("성찰 2문항(뜯어본 소감 · 다음에 붙이고 싶은 기능). 진도 팝업 없음. quiz 없음. galleryEnabled: false.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
