/**
 * 정보 27차시 「가위바위보 게임 만들기」 정식 수업 세션을 연다 (리허설 아님, 실제 수업).
 *
 *   node --env-file=.env.local scripts/open-info-27.ts <날짜> <교시> <반>
 *   예) node --env-file=.env.local scripts/open-info-27.ts 2026-11-04 3 2   (11/4 3교시 2반)
 *
 * 세션 문서 ID 는 `날짜__교시__반`, 코드는 예약까지 한다. 이미 있는 수업은 건드리지 않는다(두 번
 * 돌려도 안전). 살아 있는 수업의 코드는 피해서 새 코드를 고른다.
 *
 * ★★ 27차는 성찰 보상 게임(rewardGame=사과)·단계 순서(phaseOrder)가 핵심이라 세션 문서에 반드시 싣고,
 *   '다 했어요' 버튼 숨김(hideDoneButton: true)도 실어야 한다(route.ts 가 session.hideDoneButton 을 읽음).
 *   rewardGame·phaseOrder·phaseLabels·focusExempt·freeNavigation 모두 plan 스냅샷에서 복사(informatics.md).
 *   공유 링크 제출칸(mb27_share)·고친 코드 제출칸(mb27_fix)은 activity.worksheet 스냅샷에 함께 실린다.
 *
 * 세션은 기본(대기)으로 연다 — status: scheduled, 진행은 교사가 대시보드 단추로 몬다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

const LESSON_NO = 27;
const DATE = process.argv[2];
const PERIOD = Number(process.argv[3]);
const CLASS_NO = Number(process.argv[4]);

if (!DATE || !/^\d{4}-\d{2}-\d{2}$/.test(DATE) || !Number.isInteger(PERIOD) || !Number.isInteger(CLASS_NO)) {
  console.error("사용법: node --env-file=.env.local scripts/open-info-27.ts <날짜 YYYY-MM-DD> <교시> <반>");
  console.error("예)     node --env-file=.env.local scripts/open-info-27.ts 2026-11-04 3 2");
  process.exit(1);
}

async function pickCode(): Promise<string> {
  const live = await db
    .collection("classSessions")
    .where("status", "in", ["scheduled", "active"])
    .get();
  const taken = new Set(live.docs.map((d) => String((d.data() as { code?: string }).code ?? "")));
  for (let n = 10; n <= 99; n += 1) {
    const code = String(n);
    if (taken.has(code)) continue;
    try {
      await db.collection("codeReservations").doc(`${DATE}__${code}`).create({
        date: DATE,
        code,
        createdAt: Date.now(),
      });
      return code;
    } catch {
      /* 이미 예약됨 — 다음 코드 */
    }
  }
  throw new Error("남은 코드가 없습니다.");
}

async function main(): Promise<void> {
  const sessionId = `${DATE}__${PERIOD}__${CLASS_NO}`;
  const existing = await db.collection("classSessions").doc(sessionId).get();
  if (existing.exists) {
    const s = existing.data() as { code: string; status: string; lessonNo: number };
    console.log(`· 이미 있음  ${PERIOD}교시 ${CLASS_NO}반 — ${s.lessonNo}차시 코드 ${s.code} (${s.status})`);
    process.exit(0);
  }

  const plans = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  if (plans.empty) {
    console.error(`✗ ${LESSON_NO}차시 계획이 없습니다. seed-lesson${LESSON_NO}.ts 를 먼저 돌리세요.`);
    process.exit(1);
  }
  const plan = plans.docs[0];
  const p = plan.data() as Record<string, unknown>;
  const code = await pickCode();

  await db.collection("classSessions").doc(sessionId).set({
    lessonPlanId: plan.id,
    lessonNo: LESSON_NO,
    title: p.title,
    classNo: CLASS_NO,
    date: DATE,
    period: PERIOD,
    code,
    status: "scheduled",
    phase: "waiting",
    rehearsal: false,
    teacherNote: "",
    startedAt: null,
    endedAt: null,
    createdAt: Date.now(),
    activity: p.activity,
    moodCheckEnabled: p.moodCheckEnabled,
    // ★ 27차 — '다 했어요' 버튼 숨김. 안 실으면 route 가 false 로 떨어진다.
    hideDoneButton: p.hideDoneButton ?? false,
    game: p.game,
    gameExplainer: p.gameExplainer,
    // ★★ 성찰 보상 게임(사과) — 빠지면 '제출하고 게임하기' 가 안 열린다.
    rewardGame: p.rewardGame ?? null,
    progress: p.progress,
    assessment: p.assessment,
    video: p.video,
    videoPrompts: [],
    reflectionQuestions: p.reflectionQuestions,
    reflectionPublic: p.reflectionPublic,
    // ★ 단계 버튼 순서 — 없으면 LESSON_PHASES 기본으로 틀어진다.
    phaseOrder: p.phaseOrder ?? [],
    phaseLabels: p.phaseLabels ?? {},
    focusExempt: p.focusExempt ?? [],
    freeNavigation: p.freeNavigation ?? false,
  });

  const back = (await db.collection("classSessions").doc(sessionId).get()).data() as
    | Record<string, unknown>
    | undefined;
  if (!back?.code || !back?.activity || !back?.rewardGame) {
    console.error(`✗ ${PERIOD}교시 ${CLASS_NO}반 문서가 제대로 안 써졌습니다 (code/activity/rewardGame).`);
    process.exit(1);
  }
  console.log(
    `✓ ${DATE} ${PERIOD}교시 ${CLASS_NO}반 — ${LESSON_NO}차시 「${back.title}」  수업 코드 ${back.code}  ` +
      `(reward=${back.rewardGame ? "Y" : "-"} phaseOrder=${Array.isArray(back.phaseOrder) ? (back.phaseOrder as unknown[]).length : "none"} hideDone=${back.hideDoneButton})`,
  );
  console.log(`  세션 id: ${sessionId}  (상태 scheduled — 교사 화면에서 시작)`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
