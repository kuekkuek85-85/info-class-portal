/**
 * 13차시 차시 계획 등록 — 「정보 진단활동 ② · 블록 코딩 이어서」.
 *
 * 12차(진단활동 ①)에 **이어서** 하는 차시다 — 같은 활동 통(block-diagnostic)을 쓰고,
 * 오늘은 미로 ②·③을 푼다(미로 ①은 12차에서 함). 제목·안내를 12차와 나란한 시리즈로 둔다.
 *
 *   node --env-file=.env.local scripts/seed-lesson13.ts
 *   node --env-file=.env.local scripts/seed-lesson13.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 왜 이 시간이 있나 (교사 확정)
 *
 * 12차 진단활동 ① 에 이어지는 **두 번째 진단활동**이다. 앞으로 몇 번의 진단활동으로
 * **정보 모둠장(정보 도우미)** 을 뽑는 데 **참고**한다. 점수를 매기거나 자동 채점하지 않는다.
 *
 * ## 12차와 한 통(activityId) — 이어가기가 목적
 *
 * **12차와 같은 활동 통 `block-diagnostic` 을 쓴다.** 작품은 activityId__학번 문서 하나라
 * (db.ts artifactId), 12차에 남긴 미로 ② 기록(maze2_*)과 요약(bd_final_*)이 13차에서
 * **그대로 프리필**된다 — 학생은 지난 시간 진도가 채워진 채로 들어와 미로 ②부터 이어서 한다.
 * (12차의 미로 ① 기록 maze1_* 도 같은 문서에 있지만, 13차는 미로 ①을 다루지 않아 화면에
 * 띄우지 않는다.) 별도 echo 코드가 필요 없다(같은 통이라 activityId__학번 문서가 곧 지난 기록).
 *
 * ## 12차와 달라진 점 (교사 확정)
 *
 *  1) **미로 ②·③** — 미로 ② 이상한 티파티(2020-2/1) · ③ 여왕의 정원(2020-3/1). 각 12미션.
 *     미로 ① 이상한 숲(2020-1/1)은 12차에서 하고 13차엔 두지 않는다(교사 확정).
 *  2) **순서 잠금 없음** — 12차는 enabledAfterOpen 으로 ①→② 를 잠갔지만, 13차는 **두 미로를
 *     모두 열어 두고** 학생이 지난 시간 멈춘 미로부터 바로 이어서 하게 한다(enabledAfterOpen 미사용).
 *     `freeNavigation: true` 로 단계 사이도 자유 이동한다.
 *  3) **이어가기 안내(resume)** — 안내 보드와 활동지 맨 위 '지난 시간 진도' 배너로 "둘 중 더
 *     나아간 미로부터 이어서" 를 보여 준다. 배너는 기존 carryOver 기능으로 같은 통의 기록을
 *     읽어 띄운다(공유 코드 변경 없음, 아래 자세히).
 *  4) **진도 팝업 없음** — 12차와 같이 progressChecks 를 넣지 않는다(교사 확정).
 *
 * ## 이어가기 시작점을 왜 '자동 점프' 로 안 했나 (공유 코드 안전)
 *
 * 자동 점프(초기 viewPhase 를 지난 기록으로 세팅)는 미로를 각각 STEP 단계(phase)로 쪼개야 하는데,
 * page.tsx 의 되돌아가기(backPhases)는 **교사가 있는 단계까지만** 열려서(LESSON_PHASES.slice(0,
 * teacherPhase+1)) 학생이 교사보다 앞선 미로 단계로 스스로 못 간다 — 자기 속도 이어가기가 깨진다.
 * 게다가 자동 점프는 활동별 기록 해석 로직을 4개 과목이 공유하는 page.tsx 에 넣어야 해 회귀 위험이
 * 크다. 그래서 **한 페이지에 미로 ②·③ 구획 + 미로별 기록** 으로 두어 자기 속도를 지키고, 시작점은
 * '지난 시간 진도' 배너로 **명확히 안내**한다(자동 점프 대신 안내 — 교사 지침의 최소 대안).
 *
 * ## 40분에 맞춘 흐름
 *
 *   0–3   대기·기분·출석 (대기 중 지뢰찾기)
 *   3–7   안내 보드(assessment) — 이어가기 취지 + 오늘 할 일
 *   7–38  진단활동 — 미로 ②(지난 시간 이어서) → 미로 ③ (미로마다 상태·미션 기록)
 *         · 미로 ②·③을 다 푼 학생은 마지막 지뢰찾기 게임 단계로 넘어가 쉰다(_bd_game).
 *   38–40 미로별 기록 확인 → 정리
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
 * **12차와 같은 통.** 진단활동 ①(12차)·②(13차)가 한 통을 이어 쓴다 — 작품 answers 에 쌓인
 * 미로 ② 기록(maze2_ 칸)과 요약(bd_final_ 칸)을 13차가 그대로 읽어 이어간다. 미로 ③ 기록
 * (maze3_*)은 13차에서 새로 쌓인다. (12차의 미로 ① 기록 maze1_* 도 같은 통에 있지만 13차는
 * 미로 ①을 다루지 않아 안 쓴다.) 파이썬 도우미선발(helper-selection)·마이크로비트
 * (physical-computing) 통과는 섞지 않는다.
 */
const ACTIVITY_ID = "block-diagnostic";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/*
 * 미로 ②·③을 **한 페이지(worksheet)에** 세로로 둔다. 12차와 달리 순서 잠금(enabledAfterOpen)을
 * 걸지 않는다 — 두 미로가 모두 열려 있어 학생이 지난 시간 멈춘 미로(②)부터 바로 이어서 한다.
 * 미로 ② 기록 두 칸(maze2_status·maze2_mission)은 12차와 같은 키라 프리필되고, 미로 ③만
 * 새 키(maze3_*)다. 진도 팝업은 쓰지 않는다.
 */
const STATUS_CHOICES = ["다 풀었어요", "푸는 중이에요", "아직 시작 못 했어요"];

const WORKSHEET: WorksheetQuestion[] = [
  {
    key: "_bd_intro",
    phase: "worksheet",
    label: "진단활동 — 지난 시간에 이어서 (오늘은 미로 ②·③)",
    hint:
      "지난 시간(12차)에 미로 ①·②를 했어요. 오늘은 미로 ②를 마저 풀고 미로 ③까지 도전합니다.\n" +
      "· 미로 ②·③ 이 모두 열려 있어요 — 앞뒤로 자유롭게 오갈 수 있습니다.\n" +
      "· 각 미로는 총 12미션이에요. 미로마다 아래에 '다 풀었는지 · 몇 미션까지 했는지' 를 남겨 주세요.\n" +
      "· 지난 시간에 적은 미로 ② 기록은 그대로 채워져 있어요 — 더 풀었으면 고쳐 주세요.\n" +
      "· 미로를 열었다가 이 화면으로 돌아오면 됩니다.",
    kind: "note",
    maxLength: 0,
  },

  /*
   * 미로 ① 이상한 숲은 12차에서 하고, 13차는 **미로 ②·③만** 한다(교사 확정). 그래서 여기엔
   * 미로 ① 항목을 두지 않는다. (미로 ① 기록 maze1_status 는 12차 것이 같은 통에 남아 있어도
   * 이 차시에서 다시 묻지 않고, 게임 잠금·carryOver 도 미로 ①을 보지 않는다.)
   */

  /* ── 미로 ② 이상한 티파티 (순서 잠금 없음) ── */
  {
    key: "_bd_maze2",
    phase: "worksheet",
    label: "미로 ② 이상한 티파티 (12미션)",
    hint:
      "지난 시간에 여기서 멈췄다면 이 미로부터 이어서 하면 돼요.\n" +
      "새 탭으로 열려요 — 다 하고 이 화면으로 돌아와 아래 두 칸을 남겨 주세요.",
    kind: "note",
    linkUrl: "https://playentry.org/maze/2020-2/1",
    linkLabel: "미로 ② 이상한 티파티 열기",
    maxLength: 0,
  },
  {
    key: "maze2_status",
    phase: "worksheet",
    label: "미로 ② — 어디까지 했나요?",
    hint: "지금 이 미로의 상태를 골라 주세요. (지난 시간 기록이 채워져 있으면 그대로 두거나 고쳐요.)",
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

  /* ── 미로 ③ 여왕의 정원 (13차에서 처음 여는 미로) ── */
  {
    key: "_bd_maze3",
    phase: "worksheet",
    label: "미로 ③ 여왕의 정원 (12미션)",
    hint:
      "①·②를 마쳤다면 마지막 미로예요. 가장 도전적인 미션들입니다 — 천천히 생각하며 풀어 보세요.\n" +
      "새 탭으로 열려요 — 다 하고 이 화면으로 돌아와 아래 두 칸을 남겨 주세요.",
    kind: "note",
    linkUrl: "https://playentry.org/maze/2020-3/1",
    linkLabel: "미로 ③ 여왕의 정원 열기",
    maxLength: 0,
  },
  {
    key: "maze3_status",
    phase: "worksheet",
    label: "미로 ③ — 어디까지 했나요?",
    hint: "지금 이 미로의 상태를 골라 주세요.",
    kind: "choice",
    choices: STATUS_CHOICES,
    maxLength: 20,
  },
  {
    key: "maze3_mission",
    phase: "worksheet",
    label: "미로 ③ — 몇 번째 미션까지?",
    hint: "숫자로 적어 주세요 (1~12). 아직 시작 안 했으면 비워 둬도 돼요.",
    kind: "text",
    maxLength: 10,
  },

  /*
   * 미로 ②·③을 다 푼 학생을 위한 **지뢰찾기 게임 단계**(교사 요청). 이 차시는 미로 ②·③만
   * 하므로, 미로 ②③ 의 status 가 **모두 "다 풀었어요"** 일 때만 링크가 켜진다(enabledWhen —
   * 답값 기반 잠금). 학생이 마지막 "다 풀었어요" 를 고르는 순간 화면이 다시 그려져 바로 열린다.
   * 그전에는 잠긴 상태로 보이고 enabledWhenNote 안내가 뜬다. 대기 게임(game 필드)과 같은
   * 지뢰찾기 주소를 새 탭으로 연다.
   */
  {
    key: "_bd_game",
    phase: "worksheet",
    label: "🎉 미로 ②·③ 을 다 풀었나요? — 지뢰찾기로 쉬어요",
    hint:
      "미로 ②·③ 을 모두 풀고 위에서 둘 다 '다 풀었어요' 를 고르면, 아래 지뢰찾기가 켜져요.\n" +
      "남은 시간엔 지뢰찾기 게임으로 쉬어요. 새 탭에서 열려요.",
    kind: "note",
    linkUrl: "https://mine-sweeper-game-seven.vercel.app/home",
    linkLabel: "지뢰찾기 열기 (새 탭)",
    // 미로 ②③ status 가 모두 "다 풀었어요" 일 때만 켜진다 (답값 기반 잠금)
    enabledWhen: [
      { key: "maze2_status", equals: "다 풀었어요" },
      { key: "maze3_status", equals: "다 풀었어요" },
    ],
    enabledWhenNote: "미로 ②·③ 을 다 풀고 둘 다 '다 풀었어요' 를 고르면 켜져요.",
    maxLength: 0,
  },

  /*
   * '오늘 최종 진도 요약(bd_final_*)' 은 제거했다(교사 확정, 12차와 동일) — 미로별 기록
   * (maze2/3_status·mission)과 중복이라 한 번 더 묻지 않는다. 학생별 종료 단계는 미로별
   * 기록이 그대로 남긴다. (아래 carryOver 는 옛 12차 1반의 bd_final_* 를 계속 읽어 이어가기
   * 안내를 띄우므로 1반 대비는 유지된다 — 값을 읽을 뿐 이 차시에서 다시 입력받지는 않는다.)
   */
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "정보 진단활동 ② · 블록 코딩 이어서",
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
   * 안내 보드 — 이어가기 취지 + 오늘 할 일. 활동 중 되돌아와 볼 수 있다.
   */
  assessment: {
    heading: "오늘 할 일 — 정보 진단활동 ②",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "지난 시간에 이어서 — 미로 ②·③",
        note:
          "지난 시간(진단활동 ①)에 미로 ①·②를 했어요. 오늘은 미로 ②를 마저 풀고 미로 ③까지 도전합니다.\n" +
          "미로 ②는 지난 시간 멈춘 곳부터 이어서 하면 돼요 — 처음부터 다시 하지 않아도 됩니다.",
        rows: [
          { label: "이어서", value: "미로 ②는 지난 시간 진도부터, 그다음 미로 ③" },
          { label: "무엇을", value: "미로 ②·③ (각 12미션) — 둘 다 열려 있어요" },
          { label: "채점은", value: "점수·자동채점 없어요. 여러 번 해 보는 것이 목적이에요" },
          { label: "기록", value: "미로마다 '다 풀었는지·몇 미션까지' 를 남겨요" },
        ],
        highlights: [
          "지난 시간에 적은 미로 ② 기록은 그대로 채워져 있어요 — 더 풀었으면 고쳐 주세요.",
          "미로는 로그인 없이 새 탭에서 바로 열려요. 앞뒤로 자유롭게 오갈 수 있어요.",
        ],
      },
      {
        label: "오늘 순서",
        subtitle: "미로 ②를 마저 → 미로 ③",
        note: "미로 ②·③ 이 다 열려 있어요. 미로 ②를 지난 시간 멈춘 곳부터 마저 풀고, 미로 ③으로 넘어가면 됩니다.",
        rows: [
          { label: "먼저", value: "활동지 맨 위 '지난 시간 진도' 확인 (미로 ② 어디까지 했는지)" },
          { label: "1", value: "미로 ② 이상한 티파티 (12미션)" },
          { label: "2", value: "미로 ③ 여왕의 정원 (12미션)" },
          { label: "마지막", value: "미로마다 어디까지 했는지 기록 → 둘 다 다 풀면 지뢰찾기" },
        ],
        highlights: [
          "끝까지 다 못 풀어도 괜찮아요. 어디까지 했는지만 미로마다 남겨 주세요.",
        ],
      },
    ],
  },

  video: empty(),

  /*
   * 성찰(마무리 기록 문항)은 두지 않는다 — 진도는 미로별 기록·요약 문항이 남긴다.
   */
  reflectionQuestions: [],
  reflectionPublic: false,

  /*
   * 진도 체크 팝업(progressChecks)은 이 차시엔 **넣지 않는다** (교사 확정).
   * 필드를 아예 두지 않으면 progress-check-modal 이 config 가 없어 아무것도 그리지 않는다.
   * (혹시 옛 계획 문서에 남아 있을 progressChecks 는 아래 main() 에서 FieldValue.delete() 로 지운다.)
   */

  /*
   * 미로는 새 탭(외부)이라 창을 옮기는 것을 이탈로 세지 않는다.
   */
  focusExempt: ["worksheet"],
  phaseLabels: {
    assessment: "안내",
    worksheet: "진단활동",
    progress: "다음 시간",
  },
  /*
   * 되돌아가기 켬 — 학생이 안내·활동지 사이를 스스로 오갈 수 있다. 오늘은 한 페이지 안에
   * 미로 ②·③ 구획이 모두 있어 미로 이동은 스크롤로 자유롭고, 이 값은 단계 사이 이동을 연다.
   */
  freeNavigation: true,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    /*
     * '지난 시간 진도' 배너 — 활동지 맨 위에 읽기 전용으로 뜬다(worksheet-view 의 carried).
     * **같은 통(block-diagnostic)** 의 작품 answers 를 읽어, 12차에 남긴 요약(bd_final_*)과
     * 미로 ② 상태(maze2_status)를 보여 준다. 오늘은 미로 ②·③만 하므로 미로 ② 어디까지
     * 했는지가 이어가기 신호다. 1반(옛 12차)은 bd_final_maze 만 있어도 그 한 줄이 뜬다(빈 칸은
     * 자동 생략). carryOverOf 가 리허설은 리허설 기록만 읽으므로(gallery.ts), 30번 테스트도 안전.
     */
    carryOver: {
      activityId: "block-diagnostic",
      heading: "지난 시간 진도 — 미로 ②부터 이어서 하세요",
      fields: [
        { key: "bd_final_maze", label: "지난 시간 마지막으로 푼 미로" },
        { key: "bd_final_mission", label: "지난 시간까지 푼 미션" },
        { key: "maze2_status", label: "미로 ② 상태" },
      ],
    },
    worksheetIntro: {
      heading: "진단활동 — 미로 ②부터 이어서",
      body:
        "맨 위 '지난 시간 진도' 에서 미로 ② 를 어디까지 했는지 보고, 그다음부터 이어서 풀어 보세요.\n" +
        "미로 ②·③ 이 열려 있어요. 미로마다 아래에 '다 풀었는지 · 몇 미션까지 했는지' 를 남겨 주세요.",
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (12차와 같은 통 — 12차 미로별 기록/요약을 13차가 이어 읽음. 파이썬/마이크로비트와 분리)`);
  console.log("단계: 대기(지뢰찾기) → 기분 → 안내(assessment) → 진단활동(worksheet, 미로 ②·③ 한 페이지, 순서 잠금 없음) → 정리 (진도 팝업 없음)");
  console.log("미로 ② 2020-2/1 · ③ 2020-3/1 (각 12미션). 미로 ①(2020-1/1)은 12차에서 함. 순서 잠금 없음 — 지난 시간 멈춘 미로(②)부터 자유 이어가기.");
  console.log("다 푼 학생용 지뢰찾기 게임 단계(_bd_game): 미로 ②③ status 가 모두 '다 풀었어요' 일 때만 켜짐(enabledWhen, 답값 기반). 대기 게임과 같은 주소, 새 탭.");
  console.log("미로별 기록: maze2/3_status·mission (maze2 는 12차와 같은 키라 프리필). 최종 요약(bd_final_*)은 중복이라 제거(12차와 동일).");
  console.log("이어가기 배너: carryOver 로 같은 통(block-diagnostic)의 bd_final_*·maze2_status 를 활동지 맨 위에 읽기 전용 표시(공유 코드 변경 없음).");
  console.log("freeNavigation: true. 로그인 불필요·새 탭. 점수·자동채점 없음.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
