/**
 * 11/2(월) 정보과 정식 수업을 두 반 연다 (리허설 아님, 실제 수업).
 *   2반 1교시(25차) · 4반 3교시(25차).  (3반 6교시는 26차 차례라 교사 확인 후 별도로 연다 — 여기 없음)
 *
 *   node --env-file=.env.local scripts/open-info-11-02.ts [날짜]
 *
 * 반별 진도(세션 DB 확인): 2반·4반 모두 24차를 마쳐 오늘 25차(만보기+AI). 3반은 25차를 마쳐 26차 차례라
 * 제외했다(26차는 교사 확인 후). open-info-10-28.ts 복제. 세션 ID `날짜__교시__반`, 코드 예약까지.
 * 이미 있는 수업은 안 건드린다(두 번 돌려도 안전). 살아 있는 수업 코드는 피해서 새 코드를 고른다.
 *
 * ★★ 25차는 rewardGame(사과)·phaseOrder 가 핵심이라 세션에 반드시 싣고, hideDoneButton: true 도 싣는다
 *   (route.ts 가 session.hideDoneButton 을 읽음). rewardGame·phaseOrder·phaseLabels·focusExempt·
 *   freeNavigation 모두 plan 스냅샷에서 복사(informatics.md). 세션은 기본(대기) scheduled 로 연다.
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

const DATE = process.argv[2] ?? "2026-11-02";
const PLAN_LIST: { period: number; classNo: number; lessonNo: number }[] = [
  { period: 1, classNo: 2, lessonNo: 25 },
  { period: 3, classNo: 4, lessonNo: 25 },
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
      console.log(`· 이미 있음  ${period}교시 ${classNo}반 — ${s.lessonNo}차시 코드 ${s.code} (${s.status})`);
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
    console.log(
      `✓ ${period}교시 ${classNo}반 — ${lessonNo}차시 「${back.title}」  수업 코드 ${back.code}  ` +
        `(reward=${(back.rewardGame as { url?: string }).url} phaseOrder=${Array.isArray(back.phaseOrder) ? (back.phaseOrder as unknown[]).length : "none"} hideDone=${back.hideDoneButton})`,
    );
  }

  console.log(`\n${DATE} 준비됐습니다. 상태 scheduled — 교사 화면에서 시작하세요.`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
