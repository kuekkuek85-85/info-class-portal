/**
 * 24차시 차시 계획 등록 — 「나만의 LED 애니메이션 만들기」 (마이크로비트 MakeCode 아크).
 *
 *   node --env-file=.env.local scripts/seed-lesson24.ts
 *   node --env-file=.env.local scripts/seed-lesson24.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 23차에 바로 이어지는 MakeCode 아크 2번째 차시
 *
 * 23차(두근두근 하트)에서 LED 블록과 친해졌다. 오늘은 (1) 두근두근 하트에 일시 중지(pause)를 넣어
 * 천천히 뛰게 고치고(미션 1, 작은 워밍업), (2) **포털에서 5x5 LED 애니메이션을 클릭으로 그려 '코드
 * 생성' → MakeCode '파이썬 보기' 에 붙여 바로 돌리는** 나만의 애니메이션을 만든다(미션 2, 핵심).
 *
 * 코드를 손으로 치면 오타가 많으니, 포털 LED 애니메이터(led_animator kind, 순수 클라이언트)가 완성된
 * MakeCode Python 전체 코드를 뽑아 준다 — 학생은 복사해서 붙여넣기만 하면 실행된다.
 *
 * ## 파일·번호·통
 *
 *  · LESSON_NO = 24 (비어 있음 확인).
 *  · activityId = microbit-makecode (23차와 같은 통, 이어 씀). 파이썬 통(python-dodge-game)·파킹된
 *    MicroPython 통(physical-computing)과 섞지 않는다.
 *
 * ## 새 기능 — led_animator (worksheet kind)
 *
 * 순수 클라이언트(서버·AI 없음). 5x5 격자를 클릭해 프레임을 쌓고(각 프레임 뒤 지연 ms), '코드 생성' 으로
 * MakeCode Python 전체 코드(def on_forever + basic.show_leds/pause + basic.forever)를 뽑아 복사한다.
 * 주제·프레임은 answers[key] 에 JSON 으로 저장돼 지속·교사 열람 가능. 갤러리 노출은 안 한다(비공개).
 *
 * ## 구성 (40분, 정보 차시 관례) — 안내문 평문. 외부 링크는 makecode.microbit.org 하나.
 *
 * 대기(게임)·기분·출석 → 안내(assessment) → 미션 1·2(worksheet) → 성찰(reflection). freeNavigation.
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
const LESSON_NO = 24;

/** 18~23차와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/** 23차와 같은 MakeCode 피지컬 아크 전용 통. 파이썬 통·파킹된 MicroPython 통과 분리. */
const ACTIVITY_ID = "microbit-makecode";

/** MakeCode 블록/파이썬 에디터(공식). 새 탭으로 열어 '파이썬 보기' 에 생성 코드를 붙인다. */
const MAKECODE_URL = "https://makecode.microbit.org/";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 활동지 — 미션을 두 단계로 쪼갠다(교사 확정): 미션 1(build) · 미션 2(grill). 각 단계 끝에 '공유 링크
// 제출' 칸(long, 자동저장)을 둔다. MakeCode 열기 링크는 각 단계 첫 note 에 붙인다. 화면 글자는 평문.
// 공유 링크는 학생 작품 링크라 갤러리 비공개(galleryAnswerKeys 에 안 넣는다).
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── 미션 1 (build) — 두근두근 하트에 pause 두 줄 넣기 ── */
  {
    key: "_mb24_open1",
    phase: "build",
    label: "먼저 — MakeCode 열기",
    hint:
      "아래 [MakeCode 열기] 로 에디터를 새 탭에서 열어요. 미션 1은 23차처럼 블록으로 해요.\n" +
      "왼쪽 시뮬레이터로 바로 확인해요(실물 보드·다운로드 없이).",
    kind: "note",
    linkUrl: MAKECODE_URL,
    linkLabel: "MakeCode 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "_mb24_m1",
    phase: "build",
    label: "미션 1 — 두근두근 하트를 천천히 뛰게 (pause 두 줄)",
    hint:
      "23차에서 만든 '큰 하트 ↔ 작은 하트' 가 너무 빨리 깜빡이면, 아이콘 사이에 '일시 중지(pause)' 를\n" +
      "넣어 천천히 두근두근 되게 해요. 무한 반복(forever) 안을 이렇게 만들어요:\n\n" +
      "  1. 아이콘 출력(show icon) — 하트(Heart)\n" +
      "  2. 일시 중지(pause) — 500 ms   (한 줄 추가)\n" +
      "  3. 아이콘 출력(show icon) — 작은 하트(Small heart)\n" +
      "  4. 일시 중지(pause) — 500 ms   (또 한 줄 추가)\n\n" +
      "즉 아이콘 출력 다음마다 일시 중지를 한 줄씩, 모두 두 줄을 넣는 거예요. 숫자(500)를 바꿔\n" +
      "빠르기도 조절해 봐요. MakeCode에서 직접 블록으로 해 봅니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "mb24_share1",
    phase: "build",
    label: "미션 1 공유 링크 제출",
    hint:
      "완성했으면 MakeCode 위쪽 '공유(Share)' 를 눌러 만든 링크를 아래 칸에 붙여넣어요.\n" +
      "적으면 자동으로 저장돼요(따로 제출 버튼은 없어요).",
    kind: "long",
    maxLength: 300,
  },

  /* ── 미션 2 (grill) — 나만의 LED 애니메이션(그려서 코드 생성) ── */
  {
    key: "_mb24_m2_intro",
    phase: "grill",
    label: "미션 2 — 나만의 LED 애니메이션 만들기",
    hint:
      "이번엔 코드를 손으로 치지 않고, 포털에서 그림으로 만들어요! 아래 LED 애니메이터로:\n\n" +
      "  1. 무슨 애니메이션인지 '주제' 를 짧게 적어요.\n" +
      "  2. 5x5 칸을 눌러 불을 켜고 꺼서 한 장면(프레임)을 그려요.\n" +
      "  3. '프레임 추가' 로 다음 장면을 그려요(여러 장면이 번갈아 나오면 움직여 보여요).\n" +
      "  4. 각 프레임의 '기다리기(ms)' 로 장면이 바뀌는 속도를 정해요.\n" +
      "  5. '미리보기' 로 포털에서 어떻게 재생되는지 먼저 확인해요.\n" +
      "  6. '코드 생성' 을 누르면 전체 MakeCode Python 코드가 나와요. '코드 복사하기' 로 복사해요.\n\n" +
      "그다음 아래 [MakeCode 열기] 로 열어 위쪽을 'Python' 으로 바꾸고, 복사한 코드를 붙여넣으면\n" +
      "시뮬레이터에서 내 애니메이션이 바로 돌아가요. 프레임 두 장 이상이면 움직임이 더 잘 보여요.",
    kind: "note",
    linkUrl: MAKECODE_URL,
    linkLabel: "MakeCode 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "mb24_led_anim",
    phase: "grill",
    label: "LED 애니메이터 — 그리고, 미리보고, 코드 생성하기",
    hint:
      "5x5 칸을 눌러 그리고, 프레임을 더해 가며 만들어요. '미리보기' 로 확인한 뒤 '코드 생성' →\n" +
      "'코드 복사하기' 로 복사해서 MakeCode 'Python' 에 붙여넣어 실행해요. (내가 그린 것은 저장돼요.)",
    kind: "led_animator",
    maxLength: 0,
  },
  {
    key: "mb24_share2",
    phase: "grill",
    label: "미션 2 공유 링크 제출",
    hint:
      "코드를 붙여 실행했으면 MakeCode 위쪽 '공유(Share)' 를 눌러 만든 링크를 아래 칸에 붙여넣어요.\n" +
      "적으면 자동으로 저장돼요(따로 제출 버튼은 없어요).",
    kind: "long",
    maxLength: 300,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "나만의 LED 애니메이션 만들기",
  moodCheckEnabled: true,
  // "다 했어요 — 선생님께 알리기" 버튼 숨김 — 이 차시는 제출·통과·보상이 없고, 공유 링크/애니메이터가
  // 자동저장이라 제출 버튼이 필요 없다(기본값 false, 다른 차시는 그대로 버튼이 보인다).
  hideDoneButton: true,

  // 대기 화면 = 23차와 동일한 게임. (교사가 추후 스네이크 링크로 바꿀 예정 — 23차를 따라간다.)
  game: {
    heading: "기다리는 동안 — 지뢰찾기",
    body:
      "수업이 시작되길 기다리는 동안 잠깐 쉬어요.\n" +
      "숫자를 단서로 지뢰가 없는 칸을 찾아 열면 돼요.\n" +
      "수업이 시작되면 이 화면은 저절로 넘어가요.",
    url: "https://mine-sweeper-game-seven.vercel.app/home",
  },
  gameExplainer: empty(),

  // 다음 시간(progress) 단계는 두지 않는다 — 안내(assessment)가 이미 있어 중복이다.
  progress: empty(),

  /*
   * 안내 보드 — 오늘 할 일(미션 1·2) + MakeCode. 여는 링크는 활동지 첫 note(_mb24_open)에 둔다.
   */
  assessment: {
    heading: "오늘 할 일 — 두근두근 고치고, 나만의 애니메이션 만들기",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "손으로 안 치고, 그려서 코드 받기",
        note:
          "먼저 23차 두근두근 하트에 일시 중지(pause)를 넣어 천천히 뛰게 고쳐요(미션 1). 그다음 포털에서\n" +
          "5x5 LED 애니메이션을 그림으로 만들어 '코드 생성' 을 누르면, 완성된 MakeCode 코드가 나와요.\n" +
          "그걸 복사해 MakeCode 'Python' 에 붙여넣으면 내 애니메이션이 바로 돌아가요(미션 2).",
        rows: [
          { label: "미션 1", value: "두근두근 하트에 pause 두 줄 넣어 천천히 뛰게(MakeCode에서 직접)" },
          { label: "미션 2", value: "포털에서 그리기 → 코드 생성 → MakeCode에 붙여 실행" },
          { label: "왜 그리기?", value: "코드를 손으로 치면 오타가 많아요 — 그려서 코드를 받아요" },
          { label: "채점은", value: "점수·자동채점 없어요 — 만들어 보고 돌아가면 성공" },
        ],
        highlights: [
          "미션 2는 '코드 생성 → 복사 → MakeCode Python 에 붙여넣기 → 실행' 이 핵심이에요.",
        ],
      },
      {
        label: "MakeCode 다시 보기",
        subtitle: "블록도, 파이썬도 같은 곳",
        note:
          "makecode.microbit.org 에서 해요(활동지 첫 칸의 'MakeCode 열기' 로 새 탭). 미션 1은 블록으로,\n" +
          "미션 2는 위쪽을 'Python' 으로 바꿔 생성된 코드를 붙여넣어요. 왼쪽 시뮬레이터로 바로 확인해요.",
        rows: [
          { label: "어디서", value: "makecode.microbit.org (활동지에서 새 탭)" },
          { label: "미션 1", value: "블록으로 pause 넣기" },
          { label: "미션 2", value: "위쪽 'Python' 으로 바꿔 생성 코드 붙여넣기" },
          { label: "확인", value: "왼쪽 시뮬레이터로 바로 보기(실물·다운로드 없이)" },
        ],
        highlights: [
          "오늘도 실물 보드 없이 시뮬레이터로만 해요. 틀려도 괜찮으니 여러 장면을 만들어 봐요.",
        ],
      },
    ],
  },

  video: empty(),

  /*
   * 성찰 — 그려서 코드를 받아 본 체험 소감 + 코드 생성 붙여 실행 안내. 개인적이라 비공개.
   */
  reflectionQuestions: [
    "코드를 손으로 치지 않고 그림으로 만들어 '코드 생성' 으로 받아 보니 어땠나요? 한 줄로 적어 봐요.",
    "내가 만든 애니메이션은 무엇인가요? '코드 생성' 한 코드를 복사해 MakeCode 'Python' 에 붙여넣어 꼭 실행해 봐요.",
  ],
  reflectionPublic: false,

  /*
   * MakeCode(새 탭) 링크가 붙은 미션 단계(build·grill)에서 창을 옮기는 것을 이탈로 세지 않는다.
   * 대기 게임은 iframe(새 탭 아님)이라 focusExempt 가 필요 없다.
   */
  focusExempt: ["build", "grill"],
  phaseLabels: {
    assessment: "안내",
    build: "미션 1 — 두근두근 하트",
    grill: "미션 2 — 나만의 애니메이션",
  },
  /*
   * 미션을 두 단계로 쪼갠다 — 미션 1(build) → 미션 2(grill). 범용 슬롯을 빌려 쓰고 이름은
   * phaseLabels 로 붙인다(문항 있는 단계만 뜸). 교사는 안내 → 미션 1 → 미션 2 순으로 몬다.
   */
  phaseOrder: ["waiting", "assessment", "build", "grill", "reflection"],
  /*
   * 되돌아가기 켬 — 학생이 안내·미션 단계를 스스로 오갈 수 있다.
   */
  freeNavigation: true,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리는 차시가 아니다(그림판 아님) — 비우면 글만/기록만 하는 활동으로 잡는다(저장: 애니메이터 JSON)
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "나만의 LED 애니메이션 만들기",
      body:
        "미션 1은 두근두근 하트에 일시 중지를 넣어 천천히 뛰게 고쳐요. 미션 2는 포털에서 5x5 LED\n" +
        "애니메이션을 그려 '코드 생성' 하고, 그 코드를 MakeCode 'Python' 에 붙여넣어 실행해요.",
    },
    worksheet: WORKSHEET,
    // 서로 구경하기·출처 칸은 이 차시에서 쓰지 않는다(애니메이터 결과는 비공개)
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
     * 다시 돌릴 때 옛 필드가 섞이지 않도록 progress·progressChecks·quiz 를 명시 삭제해 둔다
     * (이 차시엔 셋 다 없다).
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

    /* 18~23차와 같은 규칙 — 아직 아무도 안 들어온 수업에만 반영한다 */
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (23차와 같은 MakeCode 통 — 파이썬 통·파킹된 MicroPython 통과 분리)`);
  console.log("단계: 대기(지뢰찾기, 23차와 동일) → 기분 → 안내(assessment) → 미션 1(build) → 미션 2(grill) → 성찰. freeNavigation. quiz·rewardGame 없음. hideDoneButton: true('다 했어요' 버튼 숨김 — 공유 링크·애니메이터 자동저장).");
  console.log("미션 1(build): 두근두근 하트에 pause 두 줄(아이콘 출력 다음마다 한 줄씩) 넣어 천천히. MakeCode에서 직접. 끝에 공유 링크 제출(mb24_share1, long 자동저장).");
  console.log("미션 2(grill, led_animator): 5x5 격자 클릭으로 프레임 그리기 + 지연(ms) + 주제 + 미리보기(재생) → '코드 생성' MakeCode Python 전체 코드 → 복사 → MakeCode 'Python' 붙여 실행. 끝에 공유 링크 제출(mb24_share2, long 자동저장).");
  console.log("저장: answers[mb24_led_anim] JSON({theme, frames:[{on:boolean[25], delay}]}) + 공유 링크(mb24_share1/2). 교사 열람 가능. galleryEnabled: false(비공개, 공유 링크도 galleryAnswerKeys 에 안 넣음).");
  console.log(`외부 링크: makecode.microbit.org 하나(${MAKECODE_URL}). focusExempt: worksheet. 성찰 2문항(그려서 코드 받기 소감 · 붙여 실행 안내). reflectionPublic: false.`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
