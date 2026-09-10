/**
 * 1-2반 9+10 통합 차시 한 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-info-9-10-combo.ts [날짜] [교시]
 *   예) node --env-file=.env.local scripts/open-info-9-10-combo.ts 2026-09-11 3
 *
 * ## 이 스크립트가 여는 것은 딱 하나다
 *
 * 1학년 2반이 건강검진으로 9차시를 못 해서, 내일 한 교시에 9+10 을 압축한 통합 차시
 * (lessonNo 910)를 지난다. 다른 반은 정상 진도라 건드리지 않는다 — 그래서 여기엔
 * **2반 한 줄만** 있다.
 *
 * ## 반드시 지켜야 하는 두 가지 (open-info-9-02.ts 와 같다)
 *
 *  1. 세션 문서 ID 는 `날짜__교시__반` (db.ts 의 sessionDocId). 분반이 아니라 반 번호다.
 *  2. 코드를 예약한다. 예약 문서를 안 남기면 교사 화면이 같은 코드를 또 내주고,
 *     학생이 남의 수업에 들어간다.
 *
 * 이미 있는 세션은 건드리지 않고 넘어간다 — 두 번 돌려도 안전하다.
 *
 * ※ 날짜·교시는 인자로 넘긴다. 기본은 2026-09-11(금)·미지정. 실제 2반 시간표에 맞춰
 *   교사가 교시를 반드시 확인해 넘긴다 — 안 넘기면 멈춘다.
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

const DATE = process.argv[2] ?? "2026-09-11";
const PERIOD = Number(process.argv[3]);

if (!Number.isInteger(PERIOD) || PERIOD < 1) {
  console.error("✗ 교시를 넘겨 주세요. 예) node --env-file=.env.local scripts/open-info-9-10-combo.ts 2026-09-11 3");
  console.error("  (2반 시간표를 확인하고 실제 교시를 넣습니다 — 틀리면 학생이 빈 화면 앞에 앉습니다.)");
  process.exit(1);
}

/** 2반 한 줄만. lessonNo 910 = 9+10 통합 차시 */
const PLAN: { period: number; classNo: number; lessonNo: number }[] = [
  { period: PERIOD, classNo: 2, lessonNo: 910 },
];

/** 그날 안 쓰이는 두 자리 코드를 고르고 예약까지 한다 */
async function pickCode(taken: Set<string>): Promise<string> {
  for (let n = 10; n <= 99; n += 1) {
    const code = String(n);
    if (taken.has(code)) continue;
    try {
      // create 라서 이미 예약돼 있으면 던진다 — 같은 코드를 두 번 못 잡는다
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
  throw new Error("남은 코드가 없습니다. 끝난 수업을 정리해 주세요.");
}

async function main(): Promise<void> {
  // 살아 있는 수업이 쓰고 있는 코드. 오늘 열려 있는 다른 수업과도 안 겹치게 한다
  const live = await db
    .collection("classSessions")
    .where("status", "in", ["scheduled", "active"])
    .get();
  const taken = new Set(live.docs.map((d) => String((d.data() as { code?: string }).code ?? "")));

  const plans = new Map<number, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const lessonNo of new Set(PLAN.map((p) => p.lessonNo))) {
    const found = await db.collection("lessonPlans").where("lessonNo", "==", lessonNo).get();
    if (found.empty) {
      console.error(`✗ ${lessonNo}차시(통합) 계획이 없습니다. seed-lesson9-10-combo.ts 를 먼저 돌리세요.`);
      process.exit(1);
    }
    plans.set(lessonNo, found.docs[0]);
  }

  for (const { period, classNo, lessonNo } of PLAN) {
    const sessionId = `${DATE}__${period}__${classNo}`;
    const existing = await db.collection("classSessions").doc(sessionId).get();
    if (existing.exists) {
      const s = existing.data() as { code: string; status: string; lessonNo: number };
      console.log(`· 이미 있음  ${period}교시 ${classNo}반 — ${s.lessonNo}차시 코드 ${s.code} (${s.status})`);
      continue;
    }

    const plan = plans.get(lessonNo)!;
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
      game: p.game,
      gameExplainer: p.gameExplainer,
      progress: p.progress,
      assessment: p.assessment,
      video: p.video,
      videoPrompts: [],
      reflectionQuestions: p.reflectionQuestions,
      reflectionImage: p.reflectionImage ?? "",
      reflectionPublic: p.reflectionPublic,
      phaseLabels: p.phaseLabels ?? {},
      focusExempt: p.focusExempt ?? [],
      freeNavigation: p.freeNavigation ?? false,
    });

    // 읽어서 확인한다. 반쪽만 써진 세션 문서가 남는 사고를 겪은 적이 있다
    const back = (await db.collection("classSessions").doc(sessionId).get()).data() as
      | Record<string, unknown>
      | undefined;
    if (!back?.code || !back?.activity) {
      console.error(`✗ ${period}교시 ${classNo}반 문서가 제대로 안 써졌습니다.`);
      process.exit(1);
    }
    console.log(`✓ ${period}교시 ${classNo}반 — 통합 차시 「${back.title}」  수업 코드 ${back.code}`);
  }

  console.log(`\n${DATE} 1-2반 통합 차시가 준비됐습니다. 상태는 scheduled — 교사 화면에서 시작하세요.`);
  console.log("※ 열기 전 확인: digital-ethics 통에 2반 학생 문서가 이미 있으면 backfill-carryover.ts 로 이월하세요.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
