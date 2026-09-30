/**
 * 「디지털 마음 톡톡」 7회기(목요일 · 릴레이 그림 교체본) — 목요일 1기 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-mt7-thu1.ts [--rehearsal]
 *
 * open-mt7-tue1.ts 와 같은 꼴이되 목요일 1기(mt-thu-1 · CLASS_NO 2)이고, 계획은 목요일 전용
 * activityId(mt-2026-7-thu)로 집는다. --rehearsal 을 주면 rehearsal: true 로 열어(아무 때나 열림,
 * clear-rehearsals 로 정리) 먼저 테스트하고, 안 주면 실제 수업(rehearsal: false)으로 연다.
 *
 * ## 갤러리 설정을 그대로 복사한다
 *
 * 규칙 감상 때문에 galleryEnabled: true 가 필요하다. 계획의 activity 를 그대로 복사해
 * galleryEnabled: true · galleryAnswerKeys: ["rule_ideas"] 를 보존한다(감정 회기처럼 false 로
 * 덮지 않는다). 릴레이 그림은 answers 가 아니라 relayGroups 경로로 공개되므로 galleryAnswerKeys
 * 와 무관하다 — 친구에게 나가는 것은 규칙(rule_ideas)뿐이다.
 *
 * ## 세션은 7교시 하나로. 코드 자동 예약. 멱등(내용만 갈아끼움).
 *
 * ⚠ 배포 전제: relay_draw·dilemma_game·streams_solo·rules_result·관련 라우트는 코드 기능이라
 * main 배포 뒤에야 화면에 뜬다. AI 집계는 GEMINI_API_KEY 필요.
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

const LESSON_NO = 207;
const ACTIVITY_ID = "mt-2026-7-thu";
const GROUP_KEY = "mt-thu-1";
const GROUP_LABEL = "목요일 1기";
/** 분반마다 다른 데이터 통 번호 (계획의 groups 와 같아야 한다) */
const CLASS_NO = 2;
/** 6~7교시 블록. 7교시로 하나만 연다 — 6교시로 열면 코드가 중간에 만료된다 */
const PERIOD = 7;

/** --rehearsal 이면 rehearsal: true (아무 때나 열림, clear-rehearsals 로 정리). */
const REHEARSAL = process.argv.includes("--rehearsal");

/**
 * 계획에서 세션으로 복사 — snapshotOf 목록 + phaseOrder. activity 는 그대로 싣는다
 * (galleryEnabled: true · galleryAnswerKeys: ["rule_ideas"] 보존).
 */
function planContent(plan: LessonPlan, kept: WorksheetQuestion[]): Record<string, unknown> {
  return {
    lessonNo: plan.lessonNo,
    title: plan.title,
    moodCheckEnabled: plan.moodCheckEnabled,
    game: plan.game,
    gameExplainer: plan.gameExplainer,
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
    activity: { ...plan.activity, worksheet: kept },
  };
}

async function main(): Promise<void> {
  const byLesson = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  const planDoc = byLesson.docs.find(
    (d) => (d.data() as LessonPlan).activity?.activityId === ACTIVITY_ID,
  );
  if (!planDoc) {
    console.error("✗ 목요일 7회기(mt-2026-7-thu) 계획이 없습니다. scripts/seed-mt7-thu.ts 를 먼저 돌리세요.");
    process.exit(1);
  }
  const plan = planDoc.data() as LessonPlan;

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

  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const id = `${today}__${PERIOD}__${GROUP_KEY}`;
  const existing = await db.collection("classSessions").doc(id).get();

  if (existing.exists) {
    const s = existing.data() as { code: string; status: string };
    await db.collection("classSessions").doc(id).set({ lessonPlanId: planDoc.id, ...content }, { merge: true });
    console.log(`↻ 이미 열려 있던 수업(코드 ${s.code}, ${s.status})의 내용을 갈아 끼웠습니다`);
    report(id, s.code, kept, plan);
    process.exit(0);
  }

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
  report(id, code, kept, plan);
  process.exit(0);
}

function report(id: string, code: string, kept: WorksheetQuestion[], plan: LessonPlan): void {
  console.log(`   ${id}`);
  console.log(`   수업 코드 ${code}\n`);
  console.log("교사 버튼 순서: 대기 → 마음 체크인 →");
  console.log("  [mvp] 릴레이 그림 → [worksheet] 이어 그리기 돌아보기 → [grill] 죄수의 딜레마 → [wrapmap] STREAMS");
  console.log("  [problem] 규칙 rows+피드백 → [gallery] 서로 감상·피드백 → [build] 규칙 완성 → 마음일기\n");
  console.log(`활동지 문항 ${kept.length}개.`);

  const gEnabled = plan.activity?.galleryEnabled === true;
  const gKeys = plan.activity?.galleryAnswerKeys ?? [];
  const onlyRules = gKeys.length === 1 && gKeys[0] === "rule_ideas";
  console.log(`\n★ 갤러리: ${gEnabled ? "켬" : "끔"} · 나가는 칸(galleryAnswerKeys): [${gKeys.join(", ")}]`);
  console.log(
    onlyRules
      ? "   ✓ 규칙(rule_ideas) 하나만 노출 — 릴레이(별도 공개 경로)·성찰·게임 답은 비공개."
      : "   ✗ 문제! galleryAnswerKeys 가 [\"rule_ideas\"] 하나가 아닙니다. 감정/게임 칸이 샐 수 있습니다.",
  );
  console.log("\n릴레이 그림: 대시보드에서 [모둠 나누기](접속 학생 기준) → 학생이 차례로 이어 그림 → [건너뛰기] → [공개].");
  console.log(
    REHEARSAL
      ? "리허설 모드 — 목요일 1기 30번으로 로그인해 테스트하고, node --env-file=.env.local scripts/clear-rehearsals.ts --write 로 정리하세요."
      : "실제 수업 모드. 리허설로 먼저 확인하려면 --rehearsal 을 붙여 여세요.",
  );
  console.log("\n⚠ 배포 전제: relay_draw·dilemma_game·streams_solo·rules_result·라우트는 코드 기능이라 main 배포 후에야 화면에 뜹니다. AI 집계는 GEMINI_API_KEY 필요.");
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
