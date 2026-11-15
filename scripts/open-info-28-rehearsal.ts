/**
 * 정보 28차시 「똥피하기 만들기 ① (뼈대)」 리허설 세션을 연다 (교사 테스트용).
 *
 *   node --env-file=.env.local scripts/open-info-28-rehearsal.ts [날짜] [반] [교시]
 *   (기본: 2026-11-08 · 1반 · 9교시)
 *
 * open-info-26-rehearsal.ts 를 복제했다. 차이는 LESSON_NO = 28.
 *  · rehearsal: true — 시각표 밖 교시(9교시)라도 열리고, 날짜가 넘어가면 저절로 닫힌다.
 *  · status: "active" — 교사가 '수업 시작' 을 누르지 않아도 코드로 바로 들어가진다. 각 반 30번으로 로그인.
 *
 * ★★ 28차는 rewardGame(사과)·phaseOrder·hideDoneButton 이 핵심이라 세션 문서에 반드시 싣는다.
 *
 * 세션 id 는 `날짜__교시__반` — 9교시를 써 실제 수업과 겹치지 않게 한다.
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

const DATE = process.argv[2] ?? "2026-11-08";
const CLASS_NO = Number(process.argv[3] ?? "1");
const PERIOD = Number(process.argv[4] ?? "9");
const LESSON_NO = 28;

async function pickCode(): Promise<string> {
  const live = await db
    .collection("classSessions")
    .where("status", "in", ["scheduled", "active"])
    .get();
  const taken = new Set(live.docs.map((d) => String((d.data() as { code?: string }).code ?? "")));
  for (let n = 20; n <= 99; n += 1) {
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
    const s = existing.data() as { code: string; status: string; lessonNo: number; rehearsal?: boolean };
    console.log(
      `· 이미 있음  ${PERIOD}교시 ${CLASS_NO}반 — ${s.lessonNo}차시 코드 ${s.code} (${s.status}${s.rehearsal ? " · rehearsal" : ""})`,
    );
    console.log("  (다시 열려면 먼저 이 세션을 지우세요: scripts/clear-rehearsals.ts --write)");
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
    status: "active",
    phase: "waiting",
    rehearsal: true,
    teacherNote: "",
    startedAt: Date.now(),
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
    quiz: p.quiz,
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
    console.error(`✗ 문서가 제대로 안 써졌습니다 (code/activity/rewardGame 확인).`);
    process.exit(1);
  }
  console.log(
    `✓ [리허설] ${PERIOD}교시 ${CLASS_NO}반 — ${LESSON_NO}차시 「${back.title}」  수업 코드 ${back.code}  (active)\n` +
      `  reward=${(back.rewardGame as { url?: string }).url}  phaseOrder=${JSON.stringify(back.phaseOrder)}  hideDone=${back.hideDoneButton}\n` +
      `  세션 id: ${sessionId}\n` +
      `  접속: 학생 로그인 → 코드 ${back.code} → 학번 1${String(CLASS_NO).padStart(2, "0")}30 (${CLASS_NO}반 30번 테스트 학생)\n` +
      `  리허설이라 ${DATE} 이 지나면 저절로 닫힙니다. 수동 정리: scripts/clear-rehearsals.ts --write`,
  );
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
