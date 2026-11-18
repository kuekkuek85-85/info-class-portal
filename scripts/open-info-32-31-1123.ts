/**
 * 11/23(월) 정보과 정식 수업 열기 - 준비만 해 둔 스크립트 (교사 지시 전 실행 금지).
 *
 *   node --env-file=.env.local scripts/open-info-32-31-1123.ts [날짜]
 *
 * 시간표(교사 제공 2026-11-18):
 *   2교시 1-1 → 32차 · 3교시 1-4 → (압축안 결정 대기) · 5교시 1-2 → 새 31차 · 6교시 1-3 → 32차
 *
 * open-info-31-1-3.ts 복제. 차이:
 *  · reflectionAnswerKey 를 세션에 싣는다 - 32차 성찰을 공유 답안 문서(mb32_pa_problem)에도 저장해
 *    33차에서 다시 보여 주려면 꼭 필요하다(옛 open 스크립트엔 없다).
 *  · 1-4 는 압축안(32차 설계 C)이 정해질 때까지 lessonNo 를 비워 두고 건너뛴다.
 *  · 31차·32차 모두 phaseOrder·phaseLabels·rewardGame·focusExempt·freeNavigation 을 계획에서 그대로 싣는다.
 *
 * 열기 전 확인: 32차 새 그림(/mb32-*.svg)이 배포돼 있어야 한다(푸시 뒤). seed-lesson32.ts 로 계획을 먼저 넣는다.
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

const DATE = process.argv[2] ?? "2026-11-23";
/** lessonNo 가 null 이면 결정 대기로 건너뛴다. */
const PLAN_LIST: { period: number; classNo: number; lessonNo: number | null; note?: string }[] = [
  { period: 2, classNo: 1, lessonNo: 32 },
  { period: 3, classNo: 4, lessonNo: null, note: "1-4 압축안(32차 설계 C) 결정 대기" },
  { period: 5, classNo: 2, lessonNo: 31 },
  { period: 6, classNo: 3, lessonNo: 32 },
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

async function main(): Promise<void> {
  const live = await db.collection("classSessions").where("status", "in", ["scheduled", "active"]).get();
  const taken = new Set(live.docs.map((d) => String((d.data() as { code?: string }).code ?? "")));

  for (const { period, classNo, lessonNo, note } of PLAN_LIST) {
    if (lessonNo === null) {
      console.log(`· 건너뜀  ${period}교시 ${classNo}반 - ${note ?? "결정 대기"}`);
      continue;
    }
    const sessionId = `${DATE}__${period}__${classNo}`;
    const existing = await db.collection("classSessions").doc(sessionId).get();
    if (existing.exists) {
      const s = existing.data() as { code: string; status: string; lessonNo: number };
      console.log(`· 이미 있음  ${period}교시 ${classNo}반 - ${s.lessonNo}차시 코드 ${s.code} (${s.status})`);
      continue;
    }

    const plans = await db.collection("lessonPlans").where("lessonNo", "==", lessonNo).get();
    if (plans.empty) {
      console.error(`✗ ${lessonNo}차시 계획이 없습니다. seed-lesson${lessonNo}.ts 를 먼저 돌리세요.`);
      process.exit(1);
    }
    const plan = plans.docs[0];
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
    if (!back?.code || !back?.activity || !back?.rewardGame) {
      console.error(`✗ ${period}교시 ${classNo}반 문서가 제대로 안 써졌습니다 (code/activity/rewardGame).`);
      process.exit(1);
    }
    console.log(
      `✓ ${period}교시 ${classNo}반 - ${lessonNo}차시 「${back.title}」 수업 코드 ${back.code}\n` +
        `  phaseOrder=${JSON.stringify(back.phaseOrder)} reflectionAnswerKey=${back.reflectionAnswerKey ?? "-"}\n` +
        `  freeNav=${back.freeNavigation} hideDone=${back.hideDoneButton} mood=${back.moodCheckEnabled}`,
    );
  }

  console.log(`\n${DATE} 준비됐습니다. 상태 scheduled - 교사 화면에서 시작하세요.`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
