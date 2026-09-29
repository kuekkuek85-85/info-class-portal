/**
 * 「디지털 마음 톡톡」 7회기(Sketchful + 공동체 규칙 조합) — 화요일 1기 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-mt7-tue1.ts
 *
 * ## 세션은 7교시 하나로 (6~7교시 블록)
 *
 * 6·7교시 90분 블록이다. 마음 톡톡 관례대로 세션은 **7교시로 하나만** 연다 — 6교시로 열면
 * 코드가 6교시 끝에 만료돼 뒷시간에 학생이 못 들어온다. 세션 문서 ID = 날짜__7__mt-tue-1.
 *
 * ## ★ 갤러리 설정을 그대로 복사한다 (감정 회기와 반대)
 *
 * 감정 회기(open-mt5/mt6)는 galleryEnabled 를 false 로 **덮어썼다**. 7회기는 규칙 감상·피드백
 * 때문에 galleryEnabled: true 가 필요하다. 그래서 여기서는 계획의 activity 를 **그대로** 복사한다
 * (galleryEnabled: true · galleryAnswerKeys: ["rule_ideas"] · feedbackPrompts 보존). galleryAnswerKeys
 * 가 ["rule_ideas"] 하나라, 친구에게 나가는 것은 규칙뿐이고 감정 성찰·게임 결과·마음일기는
 * 비공개로 남는다. 열고 나서 리포트로 그 값을 반드시 확인한다.
 *
 * ## 계획은 activityId 로 집는다
 *
 * 회기번호 207 이 독립 샘플(seed-mt-rules 등)과 겹칠 수 있어, lessonNo==207 중 activity.activityId
 * 가 mt-2026-7 인 계획만 고른다(샘플 계획을 열지 않게).
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

const LESSON_NO = 207;
const ACTIVITY_ID = "mt-2026-7";
const GROUP_KEY = "mt-tue-1";
const GROUP_LABEL = "화요일 1기";
/** 분반마다 다른 데이터 통 번호 (계획의 groups 와 같아야 한다) */
const CLASS_NO = 1;
/** 6~7교시 블록. 7교시로 하나만 연다 — 6교시로 열면 코드가 중간에 만료된다 */
const PERIOD = 7;

/**
 * --rehearsal 을 주면 rehearsal: true 로 연다 — 교시 시각과 무관하게 열려 테스트할 수 있고,
 * scripts/clear-rehearsals.ts --write 로 정리된다. 안 주면 실제 수업(rehearsal: false).
 * 교사가 먼저 리허설로 207(STREAMS 포함)을 테스트한 뒤, 인자 없이 실제로 연다.
 */
const REHEARSAL = process.argv.includes("--rehearsal");

/**
 * 계획에서 세션으로 복사되는 부분 — snapshotOf 목록 + phaseOrder.
 *
 * ⚠ 감정 회기와 달리 activity 의 galleryEnabled·galleryAnswerKeys 를 **덮어쓰지 않는다** —
 * 계획 값(true · ["rule_ideas"])을 그대로 싣는다. worksheet 만 분반 주소 정리분(kept)으로 바꾼다.
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
    // 계획의 activity 를 그대로(galleryEnabled·galleryAnswerKeys·feedbackPrompts 포함) 싣고,
    // worksheet 만 분반 주소 정리분으로 교체한다.
    activity: {
      ...plan.activity,
      worksheet: kept,
    },
  };
}

async function main(): Promise<void> {
  const byLesson = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  const planDoc = byLesson.docs.find(
    (d) => (d.data() as LessonPlan).activity?.activityId === ACTIVITY_ID,
  );
  if (!planDoc) {
    console.error("✗ 7회기(mt-2026-7) 계획이 없습니다. scripts/seed-mt7.ts 를 먼저 돌리세요.");
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
    report(id, s.code, kept, plan);
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
  report(id, code, kept, plan);
  process.exit(0);
}

function report(id: string, code: string, kept: WorksheetQuestion[], plan: LessonPlan): void {
  console.log(`   ${id}`);
  console.log(`   수업 코드 ${code}\n`);

  console.log("교사 버튼 순서: 대기 → 마음 체크인 →");
  console.log("  [mvp] 그림으로 마음 전하기(Sketchful) → [worksheet] 게임 후 성찰");
  console.log("  [grill] 반복 죄수의 딜레마 → [problem] 규칙 rows+피드백 → [gallery] 서로 감상·피드백 → [build] 규칙 완성");
  console.log("  → 마음일기\n");
  console.log(`활동지 문항 ${kept.length}개.`);

  const gEnabled = plan.activity?.galleryEnabled === true;
  const gKeys = plan.activity?.galleryAnswerKeys ?? [];
  const onlyRules = gKeys.length === 1 && gKeys[0] === "rule_ideas";
  console.log(`\n★ 서로의 마음 읽기(갤러리): ${gEnabled ? "켬" : "끔"}`);
  console.log(`   친구에게 나가는 칸(galleryAnswerKeys): [${gKeys.join(", ")}]`);
  console.log(
    onlyRules
      ? "   ✓ 규칙(rule_ideas) 하나만 노출 — 스케치풀 성찰·게임 결과·마음일기는 비공개."
      : "   ✗ 문제! galleryAnswerKeys 가 [\"rule_ideas\"] 하나가 아닙니다. 감정/게임 칸이 샐 수 있습니다.",
  );
  const showNames = plan.activity?.galleryShowNames === true;
  console.log(`   작성자 이름: ${showNames ? "⚠ 실명(확인 필요)" : "익명(이름 안 붙음)"}`);
  console.log(`   남의 분반 토큰 실림: ${JSON.stringify(kept).includes("linkUrlByGroup") ? "예 ← 문제" : "아니오"}`);
  console.log(
    REHEARSAL
      ? "\n리허설 모드(rehearsal: true) — 아무 때나 열립니다. 화요일 1기 30번으로 로그인해 테스트하고, 끝나면 node --env-file=.env.local scripts/clear-rehearsals.ts --write 로 정리하세요."
      : "\n실제 수업 모드(rehearsal: false). 리허설로 먼저 확인하려면 --rehearsal 을 붙여 여세요.",
  );
  console.log("\n⚠ 배포 전제: streams_solo·dilemma_game·rules_result·집계 라우트는 코드 기능이라 main 배포가 되어 있어야 화면에 뜹니다. AI 집계는 GEMINI_API_KEY 필요.");
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
