/**
 * 13차시 차시 계획 등록 — 「정보 진단활동 ② · 블록 코딩 진단평가 1~3 전체」.
 *
 *   node --env-file=.env.local scripts/seed-lesson13.ts
 *   node --env-file=.env.local scripts/seed-lesson13.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 왜 이 시간이 있나 (교사 확정)
 *
 * 12차 진단활동 ① 에 이어지는 **두 번째 진단활동**이다. 앞으로 몇 번의 진단활동으로
 * **정보 모둠장(정보 도우미)** 을 뽑는 데 **참고**한다. 점수를 매기거나 자동 채점하지 않는다 —
 * 압박 없이, 못 뽑혀도 괜찮은 활동이다.
 *
 * ## 12차와의 관계 — 예고했던 「3개 전체」를 여는 시간
 *
 * 12차(seed-lesson12.ts)는 진단활동 ① 로 엔트리 미로 **2개만** 열고, 안내 보드와 주석에
 * "③ 여왕의 정원(2020-3/1)은 **다음 차시에 3개로** 연다"고 예고해 뒀다. 이 13차가 바로 그
 * 다음 차시다. 그래서 13차 = 블록 코딩 진단평가 **1~3 전체**(미로 3개 모두)를 연다.
 *
 * ## 12차와 달라진 두 가지 (교사 확정)
 *
 *  1) **미로 3개 전체** — ① 이상한 숲(2020-1/1) · ② 이상한 티파티(2020-2/1) · ③ 여왕의
 *     정원(2020-3/1). 각 12미션. `enabledAfterOpen` 으로 ①→②→③ 순서를 강제한다.
 *  2) **진도 팝업 제거** — 12차의 10분 간격 진도 체크 팝업(progressChecks)을 이 차시엔 쓰지
 *     않는다. progressChecks 필드를 아예 넣지 않으면 팝업이 뜨지 않는다(progress-check-modal 은
 *     config 가 없으면 아무것도 그리지 않음). 진도는 활동지 맨 끝의 최종 기록 문항으로만 남긴다.
 *
 * ## 흐름 — 심플하게 (12차와 같은 규약)
 *
 *   대기(지뢰찾기) → 안내(assessment) → 진단활동(엔트리 미로 3개, 한 페이지) → 최종 기록
 *
 * 미로 3개는 한 페이지에 둔다. 페이지 분할·성찰 기록은 없다. 파이썬·타자·리더보드·자동채점도
 * 전부 없다. 기존 worksheet kind(note + linkUrl)만 재사용하고, 미로는 새 탭·**로그인 불필요**.
 *
 * ## 40분에 맞춘 흐름
 *
 *   0–3   대기·기분·출석 (대기 중 지뢰찾기)
 *   3–7   안내 보드(assessment) — 진단활동 취지 + 오늘 할 일
 *   7–38  진단활동 — 엔트리 미로 3개를 순서대로 풀기
 *   38–40 최종 기록(어느 미로 몇 미션) → 정리
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
const LESSON_NO = 13;

/** 9~11차시와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/**
 * **진단활동 ② 전용 새 통.** 12차 진단활동 ①(block-diagnostic)과 **물리적으로 다른 문서**로
 * 두어, 12차 최종 기록(bd_final_maze·bd_final_mission)과 키가 섞이거나 덮이지 않게 한다.
 * (같은 진단 아크지만 통을 분리하면 답이 절대 안 부딪힌다.) 파이썬 도우미선발(helper-selection)·
 * 마이크로비트(physical-computing) 통과도 당연히 섞지 않는다. 오늘도 점수 저장은 없다.
 */
const ACTIVITY_ID = "block-diagnostic-2";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/*
 * 미로 3개를 **한 페이지(worksheet)에** 세로로 둔다. 순서는 `enabledAfterOpen` 으로 강제한다 —
 * ②는 ①을, ③은 ②를 한 번 연 뒤에야 활성화된다. 진도 체크 팝업은 이 차시엔 쓰지 않는다
 * (progressChecks 필드 자체를 빼서 팝업이 아예 안 뜬다). 진도는 맨 끝 최종 기록으로만 남긴다.
 * 최종 기록 키는 12차와 구분되게 bd2_ 접두사를 쓴다(통도 다르지만 두 겹으로 안전하게).
 */
const WORKSHEET: WorksheetQuestion[] = [
  {
    key: "_bd2_intro",
    phase: "worksheet",
    label: "진단활동 — 엔트리 미로 풀기 (오늘은 3개)",
    hint:
      "아래 세 미로를 순서대로 열어 미션을 풀어 보세요. 새 탭에서 열리고, 로그인은 필요 없어요.\n" +
      "· 각 미로는 총 12미션이에요. ①부터 차례로 풀면 됩니다.\n" +
      "· ①을 열어야 ②가, ②를 열어야 ③이 활성화돼요 — 순서대로 풀어 주세요.\n" +
      "· 미로를 열었다가 이 화면으로 돌아오면 됩니다.\n" +
      "· 마지막에 '오늘 어디까지 했는지' 만 아래에 남기면 돼요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_bd2_maze1",
    phase: "worksheet",
    label: "① 이상한 숲 속의 엔트리봇 (12미션)",
    hint:
      "먼저 이 미로부터 풀어요. 엔트리봇을 움직여 길을 찾는 활동이에요.\n" +
      "새 탭으로 열려요 — 다 하고 이 화면으로 돌아오세요.",
    kind: "note",
    linkUrl: "https://playentry.org/maze/2020-1/1",
    linkLabel: "① 이상한 숲 속의 엔트리봇 열기",
    maxLength: 0,
  },
  {
    key: "_bd2_maze2",
    phase: "worksheet",
    label: "② 이상한 티파티 (12미션)",
    hint:
      "①을 하고 나면 이 미로에 도전해요. 조금 더 생각이 필요한 미션들이에요.\n" +
      "새 탭으로 열려요 — 다 하고 이 화면으로 돌아오세요.",
    kind: "note",
    linkUrl: "https://playentry.org/maze/2020-2/1",
    linkLabel: "② 이상한 티파티 열기",
    // ① 미로를 한 번 연 뒤에야 활성화된다 (순서 강제)
    enabledAfterOpen: "_bd2_maze1",
    maxLength: 0,
  },
  {
    key: "_bd2_maze3",
    phase: "worksheet",
    label: "③ 여왕의 정원 (12미션)",
    hint:
      "②까지 했다면 마지막 미로예요. 가장 도전적인 미션들입니다 — 천천히 생각하며 풀어 보세요.\n" +
      "새 탭으로 열려요 — 다 하고 이 화면으로 돌아오세요.",
    kind: "note",
    linkUrl: "https://playentry.org/maze/2020-3/1",
    linkLabel: "③ 여왕의 정원 열기",
    // ② 미로를 한 번 연 뒤에야 활성화된다 (순서 강제: ①→②→③)
    enabledAfterOpen: "_bd2_maze2",
    maxLength: 0,
  },
  /*
   * 맨 하단 — 최종 진도 기록. 진도 팝업이 없으므로, 오늘 끝에 어느 미로 몇 미션까지 했는지
   * 학생이 스스로 한 번 남긴다. 활동지 자동저장으로 작품 answers 에 들어간다.
   */
  {
    key: "_bd2_final_head",
    phase: "worksheet",
    label: "오늘 어디까지 했나요? (마지막 기록)",
    hint: "수업을 마치기 전에, 오늘 최종적으로 어느 미로 몇 번째 미션까지 풀었는지 아래에 남겨 주세요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "bd2_final_maze",
    phase: "worksheet",
    label: "오늘 마지막으로 푼 미로",
    hint: "오늘 마지막에 풀고 있던(또는 끝낸) 미로를 골라 주세요.",
    kind: "choice",
    choices: ["① 이상한 숲", "② 이상한 티파티", "③ 여왕의 정원"],
    maxLength: 20,
  },
  {
    key: "bd2_final_mission",
    phase: "worksheet",
    label: "몇 번째 미션까지 했나요?",
    hint: "숫자로 적어 주세요 (1~12).",
    kind: "text",
    maxLength: 10,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "정보 진단활동 ② · 블록 코딩 진단평가 1~3",
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

  // 다음 시간 단계는 두지 않는다 — 안내(assessment) 단계가 이미 있어 중복이다.
  progress: empty(),

  /*
   * 안내 보드 — 진단활동 취지 + 오늘 할 일. 활동 중 되돌아와 볼 수 있다.
   */
  assessment: {
    heading: "오늘 할 일 — 정보 진단활동 ②",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "블록 코딩(엔트리) 미로 3개로 마무리 진단해요",
        note:
          "앞으로 몇 번의 진단활동으로 **정보 모둠장(정보 도우미)** 을 뽑는 데 참고해요.\n" +
          "지난 시간(진단활동 ①)에 이어, 오늘은 엔트리 미로 **세 개 전체**를 순서대로 풀어 봅니다.",
        rows: [
          { label: "무엇을", value: "엔트리 미로 3개를 순서대로 풀기 (각 12미션)" },
          { label: "채점은", value: "점수·자동채점 없어요. 여러 번 해 보는 것이 목적이에요" },
          { label: "기록", value: "마지막에 어디까지 풀었는지만 짧게 골라 적어요" },
        ],
        highlights: [
          "도우미로 뽑히면 좋지만, 못 뽑혀도 괜찮아요 — 압박 없이 편하게 풀어 보세요.",
          "미로는 로그인 없이 새 탭에서 바로 열려요.",
        ],
      },
      {
        label: "오늘 순서",
        subtitle: "미로 3개를 ①→②→③ 순서대로",
        note: "①을 열어야 ②가, ②를 열어야 ③이 열려요. 차례대로 풀면 됩니다.",
        rows: [
          { label: "1", value: "① 이상한 숲 속의 엔트리봇 (12미션)" },
          { label: "2", value: "② 이상한 티파티 (12미션)" },
          { label: "3", value: "③ 여왕의 정원 (12미션)" },
          { label: "마지막", value: "오늘 어느 미로 몇 미션까지 했는지 한 번 기록" },
        ],
        highlights: [
          "오늘은 세 미로 다 열려 있어요 — ①부터 순서대로 풀어 보세요.",
          "끝까지 다 못 풀어도 괜찮아요. 어디까지 했는지만 마지막에 남겨 주세요.",
        ],
      },
    ],
  },

  video: empty(),

  /*
   * 성찰(마무리 기록 문항)은 두지 않는다 — 진도는 활동지 맨 끝 최종 기록 문항이 남긴다.
   */
  reflectionQuestions: [],
  reflectionPublic: false,

  /*
   * 진도 체크 팝업(progressChecks)은 이 차시엔 **넣지 않는다** (교사 확정).
   * 필드를 아예 두지 않으면 progress-check-modal 이 config 가 없어 아무것도 그리지 않는다.
   * (혹시 옛 계획 문서에 남아 있을 progressChecks 는 아래 main() 에서 FieldValue.delete() 로 지운다.)
   */

  /*
   * 미로는 새 탭(외부)이라 창을 옮기는 것을 이탈로 세지 않는다 (마이크로비트·보안 링크
   * 차시가 활동 링크 단계를 focusExempt 로 둔 것과 같은 이유).
   */
  focusExempt: ["worksheet"],
  phaseLabels: {
    assessment: "안내",
    worksheet: "진단활동",
    progress: "다음 시간",
  },
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "진단활동 — 엔트리 미로 3개",
      body:
        "아래 세 미로를 ①→②→③ 순서대로 열어 미션을 풀어 보세요. 새 탭으로 열리고 로그인은 필요 없어요.\n" +
        "①을 열어야 ②가, ②를 열어야 ③이 활성화돼요. 마지막에 어디까지 했는지만 남기면 됩니다.",
    },
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
    /*
     * 이 lessonNo 13 자리에는 예전에 마이크로비트(physical-computing) 계획이 있었을 수 있다.
     * merge 로는 그때의 progress(다음 시간 탭)·quiz·progressChecks 가 남아 화면에 섞인다 —
     * 12차가 옛 잔재를 지운 것과 같이 FieldValue.delete() 로 명시 삭제한다.
     * 특히 progressChecks 는 반드시 지워 진도 팝업이 되살아나지 않게 한다(교사 확정: 팝업 없음).
     */
    await doc.ref.set(
      {
        ...PLAN,
        updatedAt: now,
        quiz: FieldValue.delete(),
        progress: FieldValue.delete(),
        progressChecks: FieldValue.delete(),
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
          // progress(다음 시간) 단계 제거 — merge 로 안 비워지므로 세션에서도 지운다.
          progress: FieldValue.delete(),
          assessment: PLAN.assessment,
          reflectionQuestions: PLAN.reflectionQuestions,
          reflectionPublic: PLAN.reflectionPublic,
          focusExempt: PLAN.focusExempt,
          phaseLabels: PLAN.phaseLabels,
          freeNavigation: PLAN.freeNavigation,
          // 진도 팝업은 쓰지 않는다 — 세션에 남아 있던 config 도 지운다.
          progressChecks: FieldValue.delete(),
          activity: PLAN.activity,
          // 옛 마이크로비트/파이썬 차시에서 딸려 온 타임머신 퀴즈를 세션에서도 지운다.
          quiz: FieldValue.delete(),
        },
        { merge: true },
      );
    }
    console.log(`   아직 아무도 안 들어온 수업 ${scheduled.length}개에 반영`);
  } else {
    const ref = await db.collection(LESSON_PLANS).add({ ...PLAN, createdAt: now, updatedAt: now });
    console.log(`＋ 등록 — ${PLAN.title} (${ref.id})`);
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} (진단활동 ② 전용 통 — 12차 block-diagnostic 및 파이썬/마이크로비트와 분리)`);
  console.log("단계: 대기(지뢰찾기) → 기분 → 안내(assessment) → 진단활동(worksheet, 미로 3개 한 페이지) → 최종 기록 (진도 팝업 없음)");
  console.log("① 이상한 숲 2020-1/1 · ② 이상한 티파티 2020-2/1 · ③ 여왕의 정원 2020-3/1 (각 12미션, enabledAfterOpen 로 ①→②→③ 순서 강제).");
  console.log("최종 기록: bd2_final_maze(choice, 미로 3개) · bd2_final_mission(text). 진도 체크 팝업(progressChecks) 없음.");
  console.log("로그인 불필요·새 탭. 점수·자동채점·성찰 기록 없음(진도는 최종 기록 문항이 남김).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
