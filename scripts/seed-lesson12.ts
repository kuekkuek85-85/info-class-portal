/**
 * 12차시 차시 계획 등록 — 「정보 진단활동 ① · 블록 코딩 복습」.
 *
 *   node --env-file=.env.local scripts/seed-lesson12.ts
 *   node --env-file=.env.local scripts/seed-lesson12.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 왜 이 시간이 있나 (교사 확정)
 *
 * 앞으로 몇 번의 **진단활동**으로 **정보 모둠장(정보 도우미)** 을 뽑는 데 **참고**한다.
 * 오늘은 그 첫 번째로, 블록 코딩(엔트리) 미로를 풀며 컴퓨팅 사고를 가볍게 복습한다.
 * 점수를 매기거나 자동 채점하지 않는다 — 압박 없이, 못 뽑혀도 괜찮은 활동이다.
 *
 * (기존 파이썬 도우미선발 12차는 seed-lesson12-python-helper.ts 로 파킹됨. 오늘 것과 별개.)
 *
 * ## 흐름 — 심플하게 (교사 확정)
 *
 *   대기(지뢰찾기) → 안내(assessment) → 진단① 이상한 숲(build) → 진단② 티파티(emotion) → 성찰
 *
 * 미로는 **두 단계로 쪼갠다** — 미로1을 먼저 하고 교사가 넘겨야 미로2가 열린다(순서 강제·
 * 진도 확인). 파이썬·타자·리더보드·자동채점은 **전부 없다.** 기존 worksheet kind(note +
 * linkUrl)만 재사용하고, phase(build·emotion)+phaseLabels 로 단계를 나눈다(코드 변경 없음).
 * 미로는 새 탭 링크로 열고 **로그인이 필요 없다**.
 *
 * ## 40분에 맞춘 흐름
 *
 *   0–3   대기·기분·출석 (대기 중 지뢰찾기)
 *   3–7   안내 보드(assessment) — 진단활동 취지 + 오늘 할 일
 *   7–21  진단① 이상한 숲(build) — 미로1 풀기 → 교사가 다음 단계로
 *   21–35 진단② 이상한 티파티(emotion) — 미로2 풀기
 *   35–40 성찰(어느 미로 몇 미션까지) → 다음 시간 예고 → 정리
 *
 * ## 오늘 여는 미로 (교사 확정)
 *
 *   · 오늘은 **2개만** 연다: ① 이상한 숲 속의 엔트리봇, ② 이상한 티파티 (각 12미션).
 *   · ③ 여왕의 정원(2020-3/1)은 **다음 차시**에 3개로 열린다 — 오늘은 넣지 않는다.
 *
 * 대상 1~4반 중1. 각 반 30번은 테스트 학생(리허설). 숙제/집에 내주는 것 없음. seed 멱등(--force).
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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
const LESSON_NO = 12;

/** 9~11차시와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/**
 * **새 활동 통.** 진단활동 전용 — 파이썬 도우미선발(helper-selection)·마이크로비트
 * (physical-computing) 통과 섞지 않는다. 오늘은 점수 저장이 없다(성찰만 기록).
 */
const ACTIVITY_ID = "block-diagnostic";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/*
 * 미로 2개를 **두 단계로 쪼갠다** — 미로1(build) → 미로2(emotion).
 *
 * ## 왜 phase 로 나누나
 *
 * 한 페이지에 둘을 같이 두면 학생이 순서 없이 아무거나 누른다. STEP 단계(build·emotion)에
 * 하나씩 배정하면, 교사가 단계를 넘겨야 다음 미로가 열린다 — 미로1을 먼저 하게 순서가
 * 잡히고, 페이지가 나뉘어 교사가 "지금 어느 미로 단계인지" 진도를 본다(9·10차 STEP 방식).
 *
 * lesson10 이 활동1=build, 활동2=emotion 으로 쓴 것과 같다. STEP 전용 UI 는 kind 로만
 * 뜨므로(note 는 안 뜬다) note+linkUrl 카드가 그대로 그려진다. phaseLabels 로 이름을 덮고,
 * 하드 잠금 없이 교사 진행으로 순서만 잡는다(freeNavigation false).
 */
const WORKSHEET: WorksheetQuestion[] = [
  {
    key: "_bd_maze1",
    phase: "build",
    label: "① 이상한 숲 속의 엔트리봇 (12미션)",
    hint:
      "먼저 이 미로부터 풀어요. 엔트리봇을 움직여 길을 찾는 활동이에요. 로그인은 필요 없어요.\n" +
      "· 총 12미션이에요. 처음부터 순서대로 풀어 봅니다.\n" +
      "· 다 해 보면 선생님이 다음 단계(② 이상한 티파티)로 넘겨 줍니다.\n" +
      "· 새 탭으로 열려요 — 열었다가 이 화면으로 돌아오면 됩니다.",
    kind: "note",
    linkUrl: "https://playentry.org/maze/2020-1/1",
    linkLabel: "① 이상한 숲 속의 엔트리봇 열기",
    maxLength: 0,
  },
  {
    key: "_bd_maze2",
    phase: "emotion",
    label: "② 이상한 티파티 (12미션)",
    hint:
      "①을 해 봤으면 이 미로에 도전해요. 조금 더 생각이 필요한 미션들이에요. 로그인은 필요 없어요.\n" +
      "· 총 12미션이에요. 다 못 풀어도 괜찮아요 — 어디까지 했는지는 마지막에 적어요.\n" +
      "· 새 탭으로 열려요 — 열었다가 이 화면으로 돌아오면 됩니다.",
    kind: "note",
    linkUrl: "https://playentry.org/maze/2020-2/1",
    linkLabel: "② 이상한 티파티 열기",
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "정보 진단활동 ① · 블록 코딩 복습",
  moodCheckEnabled: true,

  game: {
    heading: "기다리는 동안 — 지뢰찾기",
    body:
      "수업이 시작되길 기다리는 동안 잠깐 쉬어요.\n" +
      "숫자는 그 칸 둘레에 숨은 지뢰의 개수예요. 지뢰가 없는 칸을 골라 열어 보세요.\n" +
      "수업이 시작되면 닫습니다.",
    url: "https://mine-sweeper-game-seven.vercel.app/home",
  },
  gameExplainer: empty(),

  /*
   * 다음 시간(progress) — 교사가 수업 끝에 눌러 보여준다. 다음엔 미로 3개 + 도우미 뽑기 예고.
   */
  progress: {
    heading: "다음 시간 — 진단활동 ②",
    body: "",
    url: "",
    tabs: [
      {
        label: "다음 시간에 할 일",
        subtitle: "미로를 더 풀고, 정보 도우미를 뽑기 시작해요",
        note:
          "다음 시간에는 미로가 3개로 늘어나요(여왕의 정원 추가).\n" +
          "여러 번의 진단활동을 참고해 정보 모둠장(정보 도우미)을 뽑기 시작합니다.",
        rows: [
          { label: "오늘", value: "엔트리 미로 2개 (이상한 숲 · 이상한 티파티)" },
          { label: "다음", value: "미로 3개 (여왕의 정원 추가)" },
          { label: "무엇을 위해", value: "정보 모둠장(정보 도우미) 뽑기에 참고" },
        ],
        highlights: [
          "점수로 줄 세우는 게 아니에요 — 여러 번 해 보는 것 자체가 오늘 하는 일이에요.",
        ],
      },
    ],
  },

  /*
   * 안내 보드 — 진단활동 취지 + 오늘 할 일. 활동 중 되돌아와 볼 수 있다.
   */
  assessment: {
    heading: "오늘 할 일 — 정보 진단활동 ①",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "블록 코딩(엔트리) 미로로 가볍게 복습해요",
        note:
          "앞으로 몇 번의 진단활동으로 **정보 모둠장(정보 도우미)** 을 뽑는 데 참고해요.\n" +
          "오늘은 그 첫 번째 — 엔트리 미로를 풀며 블록 코딩을 복습합니다.",
        rows: [
          { label: "무엇을", value: "엔트리 미로 2개를 순서대로 풀기 (각 12미션)" },
          { label: "채점은", value: "점수·자동채점 없어요. 여러 번 해 보는 것이 목적이에요" },
          { label: "기록", value: "마지막에 어디까지 풀었는지·느낀 점만 짧게 적어요" },
        ],
        highlights: [
          "도우미로 뽑히면 좋지만, 못 뽑혀도 괜찮아요 — 압박 없이 편하게 풀어 보세요.",
          "미로는 로그인 없이 새 탭에서 바로 열려요.",
        ],
      },
      {
        label: "오늘 순서",
        subtitle: "미로1 → (다음 단계) → 미로2 → 성찰",
        note: "미로는 한 번에 하나씩 열려요. ①을 해 보면 선생님이 ②로 넘겨 줍니다.",
        rows: [
          { label: "1단계", value: "① 이상한 숲 속의 엔트리봇 (12미션)" },
          { label: "2단계", value: "② 이상한 티파티 (12미션)" },
          { label: "마무리", value: "어느 미로 몇 번째 미션까지 했는지 적기" },
        ],
        highlights: [
          "③ 여왕의 정원은 다음 시간에 열려요 — 오늘은 위 2개만 하면 됩니다.",
        ],
      },
    ],
  },

  video: empty(),

  /*
   * 성찰(마무리) — 기록 한 가지만. "어느 미로를 몇 번째 미션까지 깼는지"만 남긴다
   * (재밌던/어려웠던 점 문항은 뺐다 — 교사 요구). 개인적이라 비공개.
   */
  reflectionQuestions: [
    "오늘 어디까지 했는지 적어 봅시다 — ① 이상한 숲: 몇 번째 미션까지 / ② 이상한 티파티: 몇 번째 미션까지.",
  ],
  reflectionPublic: false,

  /*
   * 미로는 새 탭(외부)이라 창을 옮기는 것을 이탈로 세지 않는다 — 미로가 있는 두 단계
   * (build·emotion)를 면제한다 (마이크로비트·보안 링크 차시와 같은 이유).
   */
  focusExempt: ["build", "emotion"],
  /*
   * 두 미로를 STEP 단계에 배정하고 이름을 덮는다.
   *  · 미로1 → build 단계   · 미로2 → emotion 단계
   * LESSON_PHASES 순서상 build(먼저) < emotion(나중) 이라 단추도 이 순서로 뜬다
   * (lesson10 의 활동1·활동2 와 같은 방식). 성찰은 그 뒤 마무리 단계다.
   */
  phaseLabels: {
    assessment: "안내",
    build: "진단활동 ① 이상한 숲",
    emotion: "진단활동 ② 이상한 티파티",
    progress: "다음 시간",
  },
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    // worksheetIntro 는 두지 않는다 — 미로는 STEP 단계(build·emotion)라 각 단계 이름
    // (phaseLabels)이 머리글이 되고, 안내는 각 미로 카드의 hint 가 맡는다.
    worksheet: WORKSHEET,
    // 점수·산출물을 서로 보는 활동이 아니다
    galleryEnabled: false,
    sourcesEnabled: false,
  },
};

async function main(): Promise<void> {
  const existing = await db.collection(LESSON_PLANS).where("lessonNo", "==", LESSON_NO).get();
  const now = Date.now();

  if (!existing.empty) {
    const doc = existing.docs[0];
    await doc.ref.set({ ...PLAN, updatedAt: now }, { merge: true });
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
          progress: PLAN.progress,
          assessment: PLAN.assessment,
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (진단활동 전용 통 — 파이썬 도우미선발/마이크로비트와 분리)`);
  console.log("단계: 대기(지뢰찾기) → 기분 → 안내(assessment) → 진단① 이상한 숲(build) → 진단② 티파티(emotion) → 성찰 → 다음 시간 → 마침");
  console.log("미로를 두 STEP 단계로 분할(build·emotion) — 교사가 넘겨야 미로2가 열림(순서 강제). 로그인 불필요, 새 탭.");
  console.log("① 이상한 숲 playentry.org/maze/2020-1/1 · ② 이상한 티파티 2020-2/1 (각 12미션). ③ 여왕의 정원은 다음 차시.");
  console.log("점수·자동채점 없음. 성찰은 '어느 미로 몇 미션까지' 한 문항만.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
