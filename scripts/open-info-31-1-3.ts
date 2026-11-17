/**
 * 11/18(수) 정보과 정식 수업 - 3교시 1-1반·4교시 1-3반, 31차 「똥피하기 ④ - 리스트로 똥 여러 개」 (실세션).
 *
 *   node --env-file=.env.local scripts/open-info-31-1-3.ts [날짜]
 *
 * 교사 지시(2026-11-17): 1-1(3교시)·1-3(4교시)을 11/18 에 31차로 연다. 두 반 다 11/16 에 30차를
 *   완료(2026-11-16__5__1 · 2026-11-16__2__3 둘 다 ended)해 31차 차례. 새 문서
 *   `2026-11-18__3__1` · `2026-11-18__4__3` 로 연다. open-info-30-1-2.ts 복제(반 두 개로 확장).
 *
 * ★★ 31차는 rewardGame(UNO, requires=[] - 성찰 게이트 비움)·phaseOrder·phaseLabels·freeNavigation(false)·
 *   focusExempt·moodCheckEnabled·hideDoneButton 가 모두 핵심이라 lessonPlan 에서 읽어 세션에 그대로 싣는다
 *   (informatics.md). 세션은 기본(대기) scheduled 로 연다.
 *   흐름: 안내 → 미션①(노가다) → 리스트 개념 → 미션②(리팩토링) → 미션③(AI) → 성찰.
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

const DATE = process.argv[2] ?? "2026-11-18";
const PLAN_LIST: { period: number; classNo: number; lessonNo: number }[] = [
  { period: 3, classNo: 1, lessonNo: 31 },
  { period: 4, classNo: 3, lessonNo: 31 },
];

async function pickCode(taken: Set<string>): Promise<string> {
  for (let n = 10; n <= 99; n += 1) {
    const code = String(n);
    if (taken.has(code)) continue;
    try {
      await db.collection("codeReservations").doc(`${DATE}__${code}`).create({
        date: DATE,
        code,
        createdAt: Date.now(),
      });
      taken.add(code);
      return code;
    } catch {
      taken.add(code);
    }
  }
  throw new Error("남은 코드가 없습니다.");
}

async function main(): Promise<void> {
  const live = await db
    .collection("classSessions")
    .where("status", "in", ["scheduled", "active"])
    .get();
  const taken = new Set(live.docs.map((d) => String((d.data() as { code?: string }).code ?? "")));

  for (const { period, classNo, lessonNo } of PLAN_LIST) {
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
      phaseOrder: p.phaseOrder ?? [],
      phaseLabels: p.phaseLabels ?? {},
      focusExempt: p.focusExempt ?? [],
      freeNavigation: p.freeNavigation ?? false,
    });

    const back = (await db.collection("classSessions").doc(sessionId).get()).data() as
      | Record<string, unknown>
      | undefined;
    if (!back?.code || !back?.activity || !back?.rewardGame) {
      console.error(`✗ ${period}교시 ${classNo}반 문서가 제대로 안 써졌습니다 (code/activity/rewardGame).`);
      process.exit(1);
    }
    const rg = back.rewardGame as { url?: string; requires?: { key?: string; phase?: string }[] };
    console.log(
      `✓ ${period}교시 ${classNo}반 - ${lessonNo}차시 「${back.title}」  수업 코드 ${back.code}\n` +
        `  reward=${rg.url} requires=${JSON.stringify(rg.requires)}\n` +
        `  phaseOrder=${JSON.stringify(back.phaseOrder)}\n` +
        `  phaseLabels=${JSON.stringify(back.phaseLabels)}\n` +
        `  focusExempt=${JSON.stringify(back.focusExempt)} freeNav=${back.freeNavigation} hideDone=${back.hideDoneButton} mood=${back.moodCheckEnabled}`,
    );
  }

  console.log(`\n${DATE} 준비됐습니다. 상태 scheduled - 교사 화면에서 시작하세요.`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
