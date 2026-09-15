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
 *   대기(지뢰찾기) → 안내(assessment) → 진단활동(엔트리 미로 2개, 한 페이지) → 다음 시간
 *
 * 미로 2개는 한 페이지에 둔다. 순서는 `enabledAfterOpen`(①을 연 뒤에야 ②) 으로만 강제하고,
 * **진도 팝업은 쓰지 않는다**(교사 확정 — 10분마다 뜨는 진도 팝업 제거). 그래서 페이지 분할·
 * 성찰 기록은 없다. 파이썬·타자·리더보드·자동채점도 전부 없다. 기존 worksheet kind(note +
 * linkUrl)만 재사용하고, 미로는 새 탭·**로그인 불필요**.
 *
 * ## 40분에 맞춘 흐름
 *
 *   0–3   대기·기분·출석 (대기 중 지뢰찾기)
 *   3–7   안내 보드(assessment) — 진단활동 취지 + 오늘 할 일
 *   7–40  진단활동 — 엔트리 미로 2개를 순서대로 풀기
 *   ~40    다음 시간 예고 → 정리
 *
 * ## 오늘 여는 미로 (교사 확정)
 *
 *   · 오늘은 **2개만** 연다: ① 이상한 숲 속의 엔트리봇, ② 이상한 티파티 (각 12미션).
 *   · ③ 여왕의 정원(2020-3/1)은 **다음 차시**에 3개로 열린다 — 오늘은 넣지 않는다.
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
 * 미로 2개를 **한 페이지(worksheet)에** 세로로 둔다. 순서는 `enabledAfterOpen`(①을 연 뒤에야
 * ②가 열림) 으로만 강제하고, 진도 팝업은 쓰지 않는다(교사 확정).
 *
 * ## 미로별 진도 기록 (학생별 종료 단계) — 교사 요청
 *
 * 각 미로 아래에 그 미로 전용 기록 두 칸(status·mission)을 둔다. 그래서 "어떤 학생이 어느
 * 미로에서 멈췄는지" 가 미로별로 남는다. 이 기록은 활동 통(block-diagnostic)의 작품 answers 에
 * 저장되고, **13차가 같은 통에서 읽어** 학생을 이어 할 미로로 안내한다(이어가기의 핵심).
 *
 * ## 키 규약 — 미로별 + 요약 둘 다 (교사 확정)
 *
 *  · 미로별: maze1_status / maze1_mission, maze2_status / maze2_mission — 13차가 max 계산의
 *    한 신호(ⓐ)로 쓴다.
 *  · 요약: bd_final_maze / bd_final_mission — 마지막에 한 번 더 남기는 "오늘 최종 진도". 13차가
 *    두 번째 신호(ⓑ)로 쓰고, **옛 12차(1반)에도 있던 키**라 1반 대비도 된다(그 반은 미로별 기록이
 *    없어도 이 요약만으로 이어가기 계산이 동작).
 */
const STATUS_CHOICES = ["다 풀었어요", "푸는 중이에요", "아직 시작 못 했어요"];

const WORKSHEET: WorksheetQuestion[] = [
  {
    key: "_bd_intro",
    phase: "worksheet",
    label: "진단활동 — 엔트리 미로 풀기",
    hint:
      "아래 두 미로를 순서대로 열어 미션을 풀어 보세요. 새 탭에서 열리고, 로그인은 필요 없어요.\n" +
      "· 각 미로는 총 12미션이에요. ①부터 차례로 풀면 됩니다.\n" +
      "· 미로마다 아래에 '다 풀었는지 · 몇 미션까지 했는지' 를 남겨 주세요 — 다음 시간에 그 미로부터 이어서 해요.\n" +
      "· 미로를 열었다가 이 화면으로 돌아오면 됩니다.",
    kind: "note",
    maxLength: 0,
  },

  /* ── 미로 ① 이상한 숲 ── */
  {
    key: "_bd_maze1",
    phase: "worksheet",
    label: "미로 ① 이상한 숲 속의 엔트리봇 (12미션)",
    hint:
      "먼저 이 미로부터 풀어요. 엔트리봇을 움직여 길을 찾는 활동이에요.\n" +
      "새 탭으로 열려요 — 다 하고 이 화면으로 돌아와 아래 두 칸을 남겨 주세요.",
    kind: "note",
    linkUrl: "https://playentry.org/maze/2020-1/1",
    linkLabel: "미로 ① 이상한 숲 열기",
    maxLength: 0,
  },
  {
    key: "maze1_status",
    phase: "worksheet",
    label: "미로 ① — 어디까지 했나요?",
    hint: "지금 이 미로의 상태를 골라 주세요.",
    kind: "choice",
    choices: STATUS_CHOICES,
    maxLength: 20,
  },
  {
    key: "maze1_mission",
    phase: "worksheet",
    label: "미로 ① — 몇 번째 미션까지?",
    hint: "숫자로 적어 주세요 (1~12). 아직 시작 안 했으면 비워 둬도 돼요.",
    kind: "text",
    maxLength: 10,
  },

  /* ── 미로 ② 이상한 티파티 (① 을 연 뒤 열림) ── */
  {
    key: "_bd_maze2",
    phase: "worksheet",
    label: "미로 ② 이상한 티파티 (12미션)",
    hint:
      "①을 하고 나면 이 미로에 도전해요. 조금 더 생각이 필요한 미션들이에요.\n" +
      "새 탭으로 열려요 — 다 하고 이 화면으로 돌아와 아래 두 칸을 남겨 주세요.",
    kind: "note",
    linkUrl: "https://playentry.org/maze/2020-2/1",
    linkLabel: "미로 ② 이상한 티파티 열기",
    // ① 미로를 한 번 연 뒤에야 활성화된다 (순서 강제)
    enabledAfterOpen: "_bd_maze1",
    maxLength: 0,
  },
  {
    key: "maze2_status",
    phase: "worksheet",
    label: "미로 ② — 어디까지 했나요?",
    hint: "지금 이 미로의 상태를 골라 주세요.",
    kind: "choice",
    choices: STATUS_CHOICES,
    maxLength: 20,
  },
  {
    key: "maze2_mission",
    phase: "worksheet",
    label: "미로 ② — 몇 번째 미션까지?",
    hint: "숫자로 적어 주세요 (1~12). 아직 시작 안 했으면 비워 둬도 돼요.",
    kind: "text",
    maxLength: 10,
  },

  /*
   * 맨 하단 — 오늘 최종 진도 요약(한 번 더). 미로별 기록과 별개로, 오늘 마지막에 어느 미로
   * 몇 미션까지 했는지 한 줄로 남긴다. 13차가 미로별 기록과 이 요약 중 **더 나아간 미로**로
   * 이어가기 시작점을 정한다. 옛 12차(1반)에도 있던 키(bd_final_*)라 1반 대비도 된다.
   */
  {
    key: "_bd_final_head",
    phase: "worksheet",
    label: "오늘 어디까지 했나요? (마지막 요약)",
    hint: "수업을 마치기 전에, 오늘 최종적으로 어느 미로 몇 번째 미션까지 풀었는지 한 번 더 남겨 주세요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "bd_final_maze",
    phase: "worksheet",
    label: "오늘 마지막으로 푼 미로",
    hint: "오늘 마지막에 풀고 있던(또는 끝낸) 미로를 골라 주세요.",
    kind: "choice",
    choices: ["① 이상한 숲", "② 이상한 티파티"],
    maxLength: 20,
  },
  {
    key: "bd_final_mission",
    phase: "worksheet",
    label: "몇 번째 미션까지 했나요?",
    hint: "숫자로 적어 주세요 (1~12).",
    kind: "text",
    maxLength: 10,
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
  // 다음 시간 단계는 두지 않는다 — 안내(assessment) 단계가 이미 있어 중복이다.
  progress: empty(),

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
          { label: "기록", value: "미로마다 '다 풀었는지·몇 미션까지' 를 남겨요 — 다음 시간에 그 미로부터 이어서" },
        ],
        highlights: [
          "도우미로 뽑히면 좋지만, 못 뽑혀도 괜찮아요 — 압박 없이 편하게 풀어 보세요.",
          "미로는 로그인 없이 새 탭에서 바로 열려요.",
        ],
      },
      {
        label: "오늘 순서",
        subtitle: "미로 2개를 순서대로",
        note: "①을 먼저 열어야 ②가 열려요. 서두르지 말고 하나씩 미션을 풀어 봅니다.",
        rows: [
          { label: "1", value: "① 이상한 숲 속의 엔트리봇 (12미션)" },
          { label: "2", value: "② 이상한 티파티 (12미션)" },
        ],
        highlights: [
          "③ 여왕의 정원은 다음 시간에 열려요 — 오늘은 위 2개만 하면 됩니다.",
        ],
      },
    ],
  },

  video: empty(),

  /*
   * 성찰(마무리 기록 문항)은 두지 않는다 — 미로 자체가 활동이라 별도 기록을 강요하지 않는다.
   */
  reflectionQuestions: [],
  reflectionPublic: false,

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
      heading: "진단활동 — 엔트리 미로",
      body:
        "아래 두 미로를 순서대로 열어 미션을 풀어 보세요. 새 탭으로 열리고 로그인은 필요 없어요.\n" +
        "미로마다 아래에 '다 풀었는지 · 몇 미션까지 했는지' 를 남겨 주세요 — 다음 시간에 그 미로부터 이어서 합니다.",
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
    // quiz(타임머신 퀴즈)는 옛 12차시(파이썬 도우미선발)의 잔재다. 이 차시엔 안 쓰므로 지운다.
    // merge 로는 안 지워져서 FieldValue.delete() 로 명시 삭제한다.
    // progress 도 merge 로는 옛 tabs 가 남아 안 비워진다 — quiz 처럼 아예 지운다.
    await doc.ref.set(
      { ...PLAN, updatedAt: now, quiz: FieldValue.delete(), progress: FieldValue.delete() },
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
          // 진도 팝업 제거(교사 확정) — 이미 열린 세션에 남아 있을 수 있어 명시 삭제한다
          // (merge·ignoreUndefinedProperties 로는 안 비워진다).
          progressChecks: FieldValue.delete(),
          activity: PLAN.activity,
          // 옛 12차시(파이썬)에서 딸려 온 타임머신 퀴즈를 세션에서도 지운다.
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (진단활동 전용 통 — 13차가 같은 통을 이어 씀. 파이썬 도우미선발/마이크로비트와 분리)`);
  console.log("단계: 대기(지뢰찾기) → 기분 → 안내(assessment) → 진단활동(worksheet, 미로 2개 한 페이지, 미로별 기록) → 마침 (진도 팝업·퀴즈 단계 없음)");
  console.log("진도 팝업 없음(교사 확정): 순서는 enabledAfterOpen(①→②)으로만 강제. 이미 열린 세션의 progressChecks 도 재시드 때 지웁니다.");
  console.log("미로별 기록: maze1_status/maze1_mission · maze2_status/maze2_mission (학생별 종료 단계). 요약: bd_final_maze/bd_final_mission — 13차 이어가기 신호.");
  console.log("① 이상한 숲 playentry.org/maze/2020-1/1 · ② 이상한 티파티 2020-2/1 (각 12미션). ③ 여왕의 정원은 다음 차시(13차).");
  console.log("로그인 불필요·새 탭. 점수·자동채점 없음. 미로별 기록은 작품 answers 에 저장되어 13차가 읽음.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
