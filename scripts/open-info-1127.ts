/**
 * 11/27(금) 정보과 정식 수업 열기 - 준비만 해 둔 스크립트 (교사 지시 전 실행 금지).
 *
 *   node --env-file=.env.local scripts/open-info-1127.ts [날짜]
 *
 * 시간표(2026-11-18 확정, 반마다 3차시):
 *   3교시 1-3 → 34차 · 5교시 1-1 → 34차 · 6교시 1-2 → 33차
 *
 * · 33·34차는 아직 없다 - 그 칸은 pending 으로 두고 건너뛴다. seed 를 만든 뒤 pending 을 지운다.
 * · 계획 고르기: planDocId 가 있으면 그 문서(반별 판), 없으면 lessonNo 로 찾되 variant 계획은 건너뛴다.
 * · reflectionAnswerKey 를 세션에 싣는다(32차 성찰 → 공유 답안 mb32_pa_problem, 33차 echo 용).
 * · 열기 전: 32차 새 그림이 배포돼 있어야 한다(푸시 뒤). seed-lesson32.ts · seed-lesson32-c4.ts 로 계획을 먼저 넣는다.
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

const DATE = process.argv[2] ?? "2026-11-27";
const PLAN_LIST: { period: number; classNo: number; lessonNo: number; planDocId?: string; pending?: string }[] = [
  { period: 3, classNo: 3, lessonNo: 34, pending: "34차 아직 없음 - seed-lesson34.ts 만든 뒤 pending 지우기" },
  { period: 5, classNo: 1, lessonNo: 34, pending: "34차 아직 없음 - seed-lesson34.ts 만든 뒤 pending 지우기" },
  { period: 6, classNo: 2, lessonNo: 33 },
];

async function pickCode(taken: Set<string>): Promise<string> {
  for (let n = 10; n <= 99; n += 1) {
    const code = String(n);
    if (taken.has(code)) continue;
    try {
      await db.collection("codeReservations").doc(`${DATE}__${code}`).create({ date: DATE, code, createdAt: Date.now() });
      taken.add(code);
      return code;
    } catch {
      taken.add(code);
    }
  }
  throw new Error("남은 코드가 없습니다.");
}

async function findPlan(lessonNo: number, planDocId?: string) {
  if (planDocId) {
    const doc = await db.collection("lessonPlans").doc(planDocId).get();
    return doc.exists ? doc : null;
  }
  const plans = await db.collection("lessonPlans").where("lessonNo", "==", lessonNo).get();
  return plans.docs.find((d) => !(d.data() as { variant?: string }).variant) ?? null;
}

async function main(): Promise<void> {
  const live = await db.collection("classSessions").where("status", "in", ["scheduled", "active"]).get();
  const taken = new Set(live.docs.map((d) => String((d.data() as { code?: string }).code ?? "")));

  for (const { period, classNo, lessonNo, planDocId, pending } of PLAN_LIST) {
    if (pending) {
      console.log(`· 건너뜀  ${period}교시 ${classNo}반 ${lessonNo}차시 - ${pending}`);
      continue;
    }
    const sessionId = `${DATE}__${period}__${classNo}`;
    const existing = await db.collection("classSessions").doc(sessionId).get();
    if (existing.exists) {
      const s = existing.data() as { code: string; status: string; lessonNo: number };
      console.log(`· 이미 있음  ${period}교시 ${classNo}반 - ${s.lessonNo}차시 코드 ${s.code} (${s.status})`);
      continue;
    }

    const plan = await findPlan(lessonNo, planDocId);
    if (!plan) {
      console.error(`✗ ${lessonNo}차시 계획(${planDocId ?? "기본"})이 없습니다. seed 를 먼저 돌리세요.`);
      process.exit(1);
    }
    const p = plan.data() as Record<string, unknown>;
    const code = await pickCode(taken);

    await db.collection("classSessions").doc(sessionId).set({
      lessonPlanId: plan.id,
      lessonNo,
      title: p.title,
      classNo,
      date: DATE,
      period,
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
      hideDoneButton: p.hideDoneButton ?? false,
      game: p.game,
      gameExplainer: p.gameExplainer,
      rewardGame: p.rewardGame ?? null,
      progress: p.progress,
      assessment: p.assessment,
      video: p.video,
      videoPrompts: [],
      reflectionQuestions: p.reflectionQuestions,
      reflectionPublic: p.reflectionPublic,
      reflectionAnswerKey: p.reflectionAnswerKey ?? undefined,
      phaseOrder: p.phaseOrder ?? [],
      phaseLabels: p.phaseLabels ?? {},
      focusExempt: p.focusExempt ?? [],
      freeNavigation: p.freeNavigation ?? false,
    });

    const back = (await db.collection("classSessions").doc(sessionId).get()).data() as Record<string, unknown> | undefined;
    if (!back?.code || !back?.activity || (p.rewardGame && !back?.rewardGame)) {
      console.error(`✗ ${period}교시 ${classNo}반 문서가 제대로 안 써졌습니다 (code/activity/rewardGame). 33·34차는 보상 게임이 없어 rewardGame 을 검사하지 않는다.`);
      process.exit(1);
    }
    console.log(
      `✓ ${period}교시 ${classNo}반 - ${lessonNo}차시 「${back.title}」 (${plan.id}) 수업 코드 ${back.code}\n` +
        `  phaseOrder=${JSON.stringify(back.phaseOrder)} reflectionAnswerKey=${back.reflectionAnswerKey ?? "-"}`,
    );
  }

  console.log(`\n${DATE} 준비됐습니다. 상태 scheduled - 교사 화면에서 시작하세요.`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
