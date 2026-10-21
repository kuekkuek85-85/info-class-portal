/**
 * 「디지털 마음 톡톡」 8회기(마지막) — 목요일 1기 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-mt8-thu1.ts            (실제 수업)
 *   node --env-file=.env.local scripts/open-mt8-thu1.ts --rehearsal (리허설)
 *
 * open-mt8-tue1.ts 와 같은 꼴이되 목요일 1기(mt-thu-1 · CLASS_NO 2)로 연다.
 * 계획(mt-2026-8)은 화·목 공용이라 activityId 로 그대로 집는다.
 *
 * ## 세션은 7교시 하나로 (6~7교시 블록)
 *
 * 마음 톡톡 관례대로 세션은 **7교시로 하나만** 연다 — 6교시로 열면 코드가 6교시 끝에 만료돼
 * 뒷시간에 학생이 못 들어온다. 세션 문서 ID = 날짜__7__mt-thu-1 (같은 교시 정보과와 안 겹침).
 *
 * ## ★ 프라이버시 — galleryEnabled 를 false 로 못박는다 (감정 회기 방식)
 *
 * 뇌구조·인생 그래프·마음 건강·자가진단 소감·마음일기는 전부 마음 이야기라 친구에게 안 나간다.
 * 계획(seed-mt8)이 이미 galleryEnabled: false 지만, 이 세션에서도 명시적으로 false·[] 로 덮어
 * 쓴다(이중 안전장치). 서버 갤러리 라우트가 galleryEnabled 를 보고 응답 자체를 막는다. 열고 나서
 * report 로 그 값을 반드시 확인한다.
 *
 * ## rewardGame(스네이크)도 세션에 복사한다
 *
 * snapshotOf 수기 목록에 rewardGame 을 포함한다 — 빠지면 마음일기 '제출하고 게임하기' 가 안 열린다.
 *
 * ## 멱등 — 이미 열려 있으면 내용만 갈아끼운다
 *
 * 코드·상태·지금 단계·출석·teacherNote 는 그대로 두고 계획에서 오는 부분만 바꾼다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import type { LessonPlan, WorksheetQuestion } from "../src/lib/types.ts";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`✗ 환경변수 ${name} 가 없습니다.`);
    process.exit(1);
  }
  return value;
}

const app = initializeApp({
  credential: cert({
    projectId: requiredEnv("FIREBASE_PROJECT_ID"),
    clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
    privateKey: requiredEnv("FIREBASE_PRIVATE_KEY").replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const LESSON_NO = 208;
const ACTIVITY_ID = "mt-2026-8";
const GROUP_KEY = "mt-thu-1";
const GROUP_LABEL = "목요일 1기";
/** 분반마다 다른 데이터 통 번호 (계획의 groups 와 같아야 한다) */
const CLASS_NO = 2;
/** 6~7교시 블록. 7교시로 하나만 연다 — 6교시로 열면 코드가 중간에 만료된다 */
const PERIOD = 7;

/** --rehearsal 이면 rehearsal: true (아무 때나 열림, clear-rehearsals 로 정리). */
const REHEARSAL = process.argv.includes("--rehearsal");

/**
 * 계획에서 세션으로 복사되는 부분 — snapshotOf(src/lib/db.ts) 목록 + phaseOrder + rewardGame.
 * worksheet 은 분반 주소 정리분(kept)으로 바꾸고, galleryEnabled 는 false·[] 로 못박는다.
 */
function planContent(plan: LessonPlan, kept: WorksheetQuestion[]): Record<string, unknown> {
  return {
    lessonNo: plan.lessonNo,
    title: plan.title,
    moodCheckEnabled: plan.moodCheckEnabled,
    game: plan.game,
    gameExplainer: plan.gameExplainer,
    rewardGame: plan.rewardGame, // ★ 빠지면 마음일기 뒤 스네이크가 안 열린다
    progress: plan.progress,
    assessment: plan.assessment,
    video: plan.video,
    videoPrompts: plan.videoPrompts ?? [],
    reflectionQuestions: plan.reflectionQuestions,
    reflectionPublic: plan.reflectionPublic,
    quiz: plan.quiz,
    phaseOrder: plan.phaseOrder ?? [],
    phaseLabels: plan.phaseLabels ?? {},
    focusExempt: plan.focusExempt ?? [],
    progressChecks: plan.progressChecks,
    freeNavigation: plan.freeNavigation ?? false,
    activity: {
      ...plan.activity,
      worksheet: kept,
      // ★ 감정 회기 방식 — 서로의 마음 읽기는 끈다(이중 안전장치).
      galleryEnabled: false,
      galleryAnswerKeys: [],
    },
  };
}

async function main(): Promise<void> {
  const byLesson = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  const planDoc = byLesson.docs.find(
    (d) => (d.data() as LessonPlan).activity?.activityId === ACTIVITY_ID,
  );
  if (!planDoc) {
    console.error("✗ 8회기(mt-2026-8) 계획이 없습니다. scripts/seed-mt8.ts 를 먼저 돌리세요.");
    process.exit(1);
  }
  const plan = planDoc.data() as LessonPlan;

  /* ── 분반별 주소가 있으면 이 분반 것 하나로 줄인다(이 회기엔 없지만 관례상 처리) ── */
  const original = plan.activity?.worksheet ?? [];
  const kept: WorksheetQuestion[] = [];
  for (const q of original) {
    const next: WorksheetQuestion = { ...q };
    if (next.linkUrlByGroup) {
      const picked = next.linkUrlByGroup[GROUP_KEY] ?? next.linkUrl;
      delete next.linkUrlByGroup;
      if (picked) next.linkUrl = picked;
    }
    kept.push(next);
  }

  const content = planContent(plan, kept);

  /* ── 오늘 날짜(KST) ─────────────────────────────────────── */
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const id = `${today}__${PERIOD}__${GROUP_KEY}`;
  const existing = await db.collection("classSessions").doc(id).get();

  if (existing.exists) {
    const s = existing.data() as { code: string; status: string };
    await db
      .collection("classSessions")
      .doc(id)
      .set({ lessonPlanId: planDoc.id, ...content }, { merge: true });
    console.log(`↻ 이미 열려 있던 수업(코드 ${s.code}, ${s.status})의 내용을 갈아 끼웠습니다`);
    report(id, s.code, kept);
    process.exit(0);
  }

  /* ── 새로 연다 ──────────────────────────────────────────── */
  const taken = new Set(
    (await db.collection("classSessions").get()).docs
      .map((d) => d.data() as { code?: string; status?: string; date?: string })
      .filter((s) => s.status !== "ended" || s.date === today)
      .map((s) => s.code),
  );
  let code = "";
  for (let n = 11; n <= 99; n += 1) {
    if (!taken.has(String(n))) {
      code = String(n);
      break;
    }
  }
  if (!code) {
    console.error("✗ 오늘 쓸 수 있는 수업 코드가 없습니다.");
    process.exit(1);
  }

  await db.collection("codeReservations").doc(`${today}__${code}`).set({
    date: today,
    code,
    createdAt: Date.now(),
  });

  await db.collection("classSessions").doc(id).set({
    lessonPlanId: planDoc.id,
    classNo: CLASS_NO,
    groupKey: GROUP_KEY,
    groupLabel: GROUP_LABEL,
    date: today,
    period: PERIOD,
    code,

    ...content,

    status: "scheduled",
    phase: "waiting",
    rehearsal: REHEARSAL,
    demo: false,
    teacherNote: "",
    startedAt: null,
    endedAt: null,
    createdAt: Date.now(),
  });

  console.log(
    `✓ ${GROUP_LABEL} ${PERIOD}교시 수업을 만들었습니다 (대기 상태${REHEARSAL ? " · rehearsal" : ""})`,
  );
  report(id, code, kept);
  process.exit(0);
}

function report(id: string, code: string, kept: WorksheetQuestion[]): void {
  console.log(`   ${id}`);
  console.log(`   수업 코드 ${code}\n`);

  console.log("교사 버튼 순서: 대기(마음 체크인) →");
  console.log("  [draw] 뇌구조 그리기 → [video] 행복? 영상 → [problem] 가치·행복·응원 →");
  console.log("  [mvp] AI 과의존 자가진단(외부, 저장X) → [wrapheal] 인생 그래프 그리기 → [build] 인생 그래프 돌아보기 →");
  console.log("  [quiz] 마음 건강 OX → [grill] 실천방안·도움 요청 → [wrapmap] 지난 8주 돌아보기(포트폴리오 아코디언) →");
  console.log("  [mooddiary] 마음일기(마음 체크인 리포트+AI 총평) → [reflection] 전체 후기(제출→스네이크)\n");
  console.log(`활동지 문항 ${kept.length}개 · 마음 건강 OX 퀴즈 5문항.`);

  /*
   * 프라이버시 재검 — planContent 가 activity.galleryEnabled 를 false·[] 로 못박으므로 전면 비공개다.
   * 혹시라도 worksheet 에 분반 토큰이 남았는지만 추가로 확인한다.
   */
  console.log("\n★ 서로의 마음 읽기(갤러리): 끔 (galleryEnabled: false · galleryAnswerKeys: [])");
  console.log("   ✓ 전면 비공개 — 뇌구조·인생 그래프·마음 건강·자가진단 소감·마음일기 어느 것도 친구에게 안 나감.");
  console.log(`   남의 분반 토큰 실림: ${JSON.stringify(kept).includes("linkUrlByGroup") ? "예 ← 문제" : "아니오"}`);
  console.log("   AI(Gemini) 전송: 뇌구조 이미지(answers 답)·마음일기 총평(기분 라벨·valence/arousal·회기 번호만)뿐 —");
  console.log("     둘 다 학번·이름·기분 이유(reason) 비전송, 위기 신호는 호출 전 checkCrisis 로 차단. 자가진단 결과 포털 저장: 안 함(외부 새 탭).");
  console.log(
    REHEARSAL
      ? "\n리허설 모드 — 아무 때나 열립니다. 목요일 1기 번호로 로그인해 테스트하고, 끝나면\n  node --env-file=.env.local scripts/clear-rehearsals.ts --write 로 정리하세요."
      : "\n실제 수업 모드. 리허설로 먼저 확인하려면 --rehearsal 을 붙여 여세요.",
  );
  console.log("\n⚠ 교사 확인 필요: 유튜브 영상·maum-sopoong.or.kr AI 과의존 자가진단의 학교망 접속 여부(7회기 메모: 외부 사이트 차단 사례).");
  console.log("⚠ 배포 전제: 스네이크 보상·OX 퀴즈 UI 는 main 배포 기능. 스네이크는 교사 vercel 앱.");
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
