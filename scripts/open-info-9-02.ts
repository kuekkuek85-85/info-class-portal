/**
 * 9/2(수) 정보과 네 수업을 한 번에 연다.
 *
 *   node --env-file=.env.local scripts/open-info-9-02.ts [날짜]
 *
 * ## 반마다 차시가 다르다
 *
 * 1·3·4반은 8/31에 7차시를 했고 아직 마감을 못 했다 → **8차시**(마감).
 * 2반만 8/31에 6차시를 했다 → **7차시**. 여기를 틀리면 2반이 안 쓴 기사를 마감하는
 * 화면 앞에 앉는다. 그래서 반별 차시를 표로 못 박아 두고, 계획이 없으면 멈춘다.
 *
 * ## 반드시 지켜야 하는 두 가지 (open-mt3-tue1.ts 와 같다)
 *
 *  1. 세션 문서 ID 는 `날짜__교시__반` (db.ts 의 sessionDocId). 분반이 아니라 반 번호다.
 *  2. 코드를 예약한다. 예약 문서를 안 남기면 교사 화면이 같은 코드를 또 내주고,
 *     학생이 남의 수업에 들어간다.
 *
 * 이미 있는 세션은 건드리지 않고 넘어간다 — 두 번 돌려도 안전하다.
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

const DATE = process.argv[2] ?? "2026-09-02";

/** 수요일 시간표 그대로 — 8/26 과 같은 순서다 */
const PLAN: { period: number; classNo: number; lessonNo: number }[] = [
  { period: 2, classNo: 4, lessonNo: 8 },
  { period: 3, classNo: 2, lessonNo: 7 },
  { period: 5, classNo: 1, lessonNo: 8 },
  { period: 6, classNo: 3, lessonNo: 8 },
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
  // 살아 있는 수업이 쓰고 있는 코드. 오늘 열려 있는 마음 톡톡과도 안 겹치게 한다
  const live = await db
    .collection("classSessions")
    .where("status", "in", ["scheduled", "active"])
    .get();
  const taken = new Set(live.docs.map((d) => String((d.data() as { code?: string }).code ?? "")));

  const plans = new Map<number, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const lessonNo of new Set(PLAN.map((p) => p.lessonNo))) {
    const found = await db.collection("lessonPlans").where("lessonNo", "==", lessonNo).get();
    if (found.empty) {
      console.error(`✗ ${lessonNo}차시 계획이 없습니다. seed-lesson${lessonNo}.ts 를 먼저 돌리세요.`);
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
    console.log(`✓ ${period}교시 ${classNo}반 — ${lessonNo}차시 「${back.title}」  수업 코드 ${back.code}`);
  }

  console.log(`\n${DATE} 정보과 네 수업이 준비됐습니다. 상태는 모두 scheduled — 교사 화면에서 시작하세요.`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
