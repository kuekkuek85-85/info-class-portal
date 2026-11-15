/**
 * 정보 24차시 「두근두근 완성 + 흔들면 깨지기」 리허설 세션을 연다 (교사 테스트용).
 *
 *   node --env-file=.env.local scripts/open-info-24-rehearsal.ts [날짜] [반] [교시]
 *   (기본: 2026-10-22 · 1반 · 9교시)
 *
 * open-info-10-15.ts 를 복제했다. 차이:
 *  · rehearsal: true — 시각표 밖 교시(9교시)라도 열리고, 날짜가 넘어가면 저절로 닫힌다
 *    (db.ts isSessionClosed: 리허설은 dateKeyKST(now) > session.date 일 때만 닫힘).
 *    그래서 "내일 테스트" 하려면 날짜를 그 테스트할 날(기본 10-16)로 둔다.
 *  · status: "active" — 교사가 '수업 시작' 을 누르지 않아도 코드로 바로 들어가진다
 *    (findSessionByCode 는 active 만 open 으로 본다). 각 반 30번(테스트 학생)으로 로그인.
 *
 * ★★ 22차는 성찰 보상 게임(rewardGame: 테트리스)·단계 순서(phaseOrder)가 핵심이라 세션 문서에
 *   반드시 싣는다 — rewardGame·phaseOrder·phaseLabels·focusExempt·freeNavigation 모두 실어야
 *   보상 게임이 열리고 단계 순서가 안 틀어진다(informatics.md 규칙).
 *
 * 세션 id 는 `날짜__교시__반` — 9교시를 써 오늘 실제 수업(1~7교시)과 겹치지 않게 한다.
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

const DATE = process.argv[2] ?? "2026-10-22";
const CLASS_NO = Number(process.argv[3] ?? "1");
const PERIOD = Number(process.argv[4] ?? "9");
const LESSON_NO = 24;

async function pickCode(): Promise<string> {
  // 지금 살아 있는(active/scheduled) 세션의 코드는 피한다 — 같은 코드면 접속이 섞인다.
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
    // 리허설 — 코드로 바로 들어가지도록 active 로 연다. 교사 30번으로 로그인.
    status: "active",
    phase: "waiting",
    rehearsal: true,
    teacherNote: "",
    startedAt: Date.now(),
    endedAt: null,
    createdAt: Date.now(),
    activity: p.activity,
    moodCheckEnabled: p.moodCheckEnabled,
    game: p.game,
    gameExplainer: p.gameExplainer,
    // ★★ 성찰 보상 게임(테트리스) — 빠지면 '제출하고 게임하기' 가 안 열린다.
    rewardGame: p.rewardGame ?? null,
    progress: p.progress,
    assessment: p.assessment,
    video: p.video,
    videoPrompts: [],
    quiz: p.quiz,
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
    console.error(`✗ 문서가 제대로 안 써졌습니다 (code/activity/rewardGame 확인).`);
    process.exit(1);
  }
  console.log(
    `✓ [리허설] ${PERIOD}교시 ${CLASS_NO}반 — ${LESSON_NO}차시 「${back.title}」  수업 코드 ${back.code}  (active)\n` +
      `  reward=${(back.rewardGame as { heading?: string }).heading}  phaseOrder=${JSON.stringify(back.phaseOrder)}\n` +
      `  세션 id: ${sessionId}\n` +
      `  접속: 학생 로그인 → 코드 ${back.code} → 학번 1${String(CLASS_NO).padStart(2, "0")}30 (${CLASS_NO}반 30번 테스트 학생)\n` +
      `  리허설이라 ${DATE} 이 지나면 저절로 닫힙니다. 수동 정리: scripts/clear-rehearsals.ts`,
  );
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
