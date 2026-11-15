/**
 * 10/2(금) 정보과 16차시를 세 반 연다.
 *   2반 3교시 · 1반 5교시 · 3반 6교시 (전부 lessonNo 16).
 *
 *   node --env-file=.env.local scripts/open-info-10-2.ts [날짜]
 *
 * open-info-9-30.ts 를 복제했다. 세션 문서 ID 는 `날짜__교시__반`, 코드는 예약까지 한다.
 * 이미 있는 수업은 건드리지 않는다(두 번 돌려도 안전). 살아 있는 수업의 코드는 피해서 새 코드를
 * 고른다.
 *
 * ★ 16차 계획은 phaseOrder(무대·거북이·펜·좌표·이동 단계 순서)를 세션이 실어야 대시보드에
 *   단계 버튼이 순서대로 뜬다. game(끝없는 계단)·phaseLabels·focusExempt·freeNavigation 도
 *   함께 복사한다(9-30 과 동일).
 *
 * 세션은 기본(대기)으로 연다 — 세 반 모두 이동(wrapmap) 주제부터 진행 예정이지만, 그건 교사가
 * 대시보드 단추로 몬다. 여는 시점엔 설정 불필요.
 * python-intro 공유 통이라 앞 주제(무대·거북이·펜·좌표) 제출은 그대로 prefill — 활동통·키 건드리지 않는다.
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

const DATE = process.argv[2] ?? "2026-10-02";
const PLAN_LIST: { period: number; classNo: number; lessonNo: number }[] = [
  { period: 3, classNo: 2, lessonNo: 16 },
  { period: 5, classNo: 1, lessonNo: 16 },
  { period: 6, classNo: 3, lessonNo: 16 },
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
      game: p.game,
      gameExplainer: p.gameExplainer,
      progress: p.progress,
      assessment: p.assessment,
      video: p.video,
      videoPrompts: [],
      reflectionQuestions: p.reflectionQuestions,
      reflectionPublic: p.reflectionPublic,
      // ★ 16차 대시보드의 단계 버튼(무대·거북이·펜·좌표·이동) 순서는 phaseOrder 로 정해진다.
      phaseOrder: p.phaseOrder ?? [],
      phaseLabels: p.phaseLabels ?? {},
      focusExempt: p.focusExempt ?? [],
      freeNavigation: p.freeNavigation ?? false,
    });

    const back = (await db.collection("classSessions").doc(sessionId).get()).data() as
      | Record<string, unknown>
      | undefined;
    if (!back?.code || !back?.activity) {
      console.error(`✗ ${period}교시 ${classNo}반 문서가 제대로 안 써졌습니다.`);
      process.exit(1);
    }
    console.log(`✓ ${period}교시 ${classNo}반 — ${lessonNo}차시 「${back.title}」  수업 코드 ${back.code}`);
  }

  console.log(`\n${DATE} 16차시 준비됐습니다. 상태 scheduled — 교사 화면에서 시작하세요.`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
