/**
 * ⚠️ 실세션 오픈용 — 날짜·교시·반 확정 전에는 실행 금지 (교사 별도 지시 대기, 2026-11-11 기준).
 *
 * 정보 30차 「똥피하기 만들기 ③ (완성 + AI로 나만의 기능)」 을 네 반에 연다 (실제 수업).
 *
 *   node --env-file=.env.local scripts/open-info-30.ts [날짜]
 *
 * ★ 실행 전 반드시 확인:
 *   1) Firestore 로 각 반(1~4) 진도를 재서, 네 반 모두 29차를 마쳐 30차 차례인지 확인(반별 진도 다를 수 있음).
 *   2) 아래 DATE 기본값과 PLAN_LIST(교시·반)를 확정 시간표로 교체. (현재 값은 open-info-11-11.ts 배치를 본뜬
 *      예시 틀일 뿐 — 그대로 쓰지 말 것.)
 *   3) 수업 시간(교시)에는 배포 금지 — 이 스크립트는 세션 문서만 쓰므로 배포와 무관하나, seed-lesson30 코드가
 *      이미 배포돼 있어야 학생 화면에 뜬다(SVG /mb30-*.svg 포함).
 *
 * open-info-11-11.ts 복제. 세션 ID `날짜__교시__반`, 코드 예약까지. 이미 있는 수업은 안 건드린다(두 번 돌려도 안전).
 *
 * ★★ 30차는 rewardGame(UNO)·phaseOrder·phaseLabels·freeNavigation(false)·focusExempt·moodCheckEnabled·
 *   hideDoneButton 가 모두 핵심이라 세션에 반드시 싣는다(informatics.md). lessonPlan 에서 읽어 그대로 싣는다.
 *   세션은 기본(대기) scheduled 로 연다 — 교사가 화면에서 '수업 시작'.
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

// ⚠️ 확정 전 실행 금지 안전장치 — 날짜를 인자로 주지 않으면 멈춘다(실수 방지).
const DATE = process.argv[2];
if (!DATE) {
  console.error(
    "✗ 실행 금지/미확정: 확정된 날짜를 인자로 주세요 (예: node --env-file=.env.local scripts/open-info-30.ts 2026-11-18).\n" +
      "  그리고 PLAN_LIST(교시·반)를 확정 시간표로 교체했는지 먼저 확인하세요. 반별 진도도 Firestore 로 재 보세요.",
  );
  process.exit(1);
}

// 예시 틀(open-info-11-11.ts 배치). ★ 확정 시간표로 교체 후 실행.
const PLAN_LIST: { period: number; classNo: number; lessonNo: number }[] = [
  { period: 2, classNo: 4, lessonNo: 30 },
  { period: 3, classNo: 2, lessonNo: 30 },
  { period: 5, classNo: 1, lessonNo: 30 },
  { period: 6, classNo: 3, lessonNo: 30 },
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
        `(reward=${(back.rewardGame as { url?: string }).url} phaseOrder=${Array.isArray(back.phaseOrder) ? (back.phaseOrder as unknown[]).length : "none"} freeNav=${back.freeNavigation} hideDone=${back.hideDoneButton})`,
    );
  }

  console.log(`\n${DATE} 준비됐습니다. 상태 scheduled — 교사 화면에서 시작하세요.`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
