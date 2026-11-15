/**
 * 11/16(월) 정보과 수업을 연다.
 *   4교시 1-4(24차) · 5교시 1-1(24차).
 *
 *   node --env-file=.env.local scripts/open-info-11-16.ts [날짜]
 *
 * open-info-10-22.ts 를 복제했다. 세션 문서 ID 는 `날짜__교시__반`, 코드는 예약까지 한다.
 * 이미 있는 수업은 건드리지 않는다(두 번 돌려도 안전). 살아 있는 수업의 코드는 피해서 새 코드를 고른다.
 *
 * ★ 24차 「나만의 LED 애니메이션 만들기」(마이크로비트 MakeCode 아크 2번째, seed-lesson24.ts) —
 *   23차에 바로 이어진다. 대기=지뢰찾기, 기분 → 안내(assessment) → 미션 1(build, 두근두근 하트에 pause)
 *   → 미션 2(grill, 포털 LED 애니메이터로 그려서 코드 생성 → MakeCode Python 붙여 실행) → 성찰.
 *   activityId microbit-makecode(23차와 같은 통). quiz·rewardGame·video·progress 없음. freeNavigation.
 *   ★ hideDoneButton: true — '다 했어요' 버튼 숨김(제출·통과·보상 없음, 공유 링크·애니메이터 자동저장).
 *   두 반 모두 10/22까지 23차를 마친 상태라 다음 차시 24가 같다.
 *
 * ★★ 세션 생성부는 lessonPlan 의 필드를 그대로 싣는다 — hideDoneButton·rewardGame(이 차시는 null)·
 *   progress·assessment·video·quiz(이 차시는 없음)·phaseOrder·phaseLabels·focusExempt·freeNavigation 을
 *   모두 싣는다. 특히 hideDoneButton·phaseOrder 가 빠지면 '다 했어요' 버튼이 뜨거나 단계 순서가 틀어진다.
 *   (그래도 안전하게, 연 뒤 `node --env-file=.env.local scripts/seed-lesson24.ts --force` 로 전체 내용을 한 번 더 맞춘다.)
 *
 * 각 반 30번(학번 1{반}30)은 테스트 학생(리허설) 관례 — 같은 scheduled 세션에 그 번호로 로그인하면 된다
 * (별도 리허설 세션을 만들지 않는다). 세션은 기본(대기)으로 연다 — 진행은 교사가 대시보드 단추로 몬다.
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

const DATE = process.argv[2] ?? "2026-11-16";
const PLAN_LIST: { period: number; classNo: number; lessonNo: number }[] = [
  { period: 4, classNo: 4, lessonNo: 24 },
  { period: 5, classNo: 1, lessonNo: 24 },
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
      console.error(`✗ ${lessonNo}차시 계획이 없습니다. seed 를 먼저 돌리세요.`);
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
      // ★ '다 했어요 — 선생님께 알리기' 버튼 숨김(24차). 세션 API 가 session.hideDoneButton 을 읽으므로
      //   여기 빠지면 버튼이 그대로 뜬다. 24차는 제출·통과·보상이 없고 공유 링크·애니메이터가 자동저장이다.
      hideDoneButton: p.hideDoneButton ?? false,
      game: p.game,
      gameExplainer: p.gameExplainer,
      // ★★ 성찰 보상 게임 — 24차는 보상이 없어 null 로 들어간다(빠져도 되지만 명시해 둔다).
      rewardGame: p.rewardGame ?? null,
      progress: p.progress,
      assessment: p.assessment,
      video: p.video,
      videoPrompts: p.videoPrompts ?? [],
      // ★ 개념 퀴즈 — 24차는 quiz 가 없다(undefined → ignoreUndefinedProperties 로 안 실림).
      quiz: p.quiz,
      reflectionQuestions: p.reflectionQuestions,
      reflectionPublic: p.reflectionPublic,
      // ★ 단계 버튼 순서 — 없으면 LESSON_PHASES 기본으로 틀어진다(24차는 미션 1·2 가 build·grill 순).
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
    console.log(
      `✓ ${period}교시 ${classNo}반 — ${lessonNo}차시 「${back.title}」  수업 코드 ${back.code}  ` +
        `(hideDone=${back.hideDoneButton ? "Y" : "-"} reward=${back.rewardGame ? "Y" : "-"} quiz=${back.quiz ? "Y" : "-"} ` +
        `phaseOrder=${Array.isArray(back.phaseOrder) ? (back.phaseOrder as unknown[]).length : "none"})`,
    );
  }

  console.log(`\n${DATE} 준비됐습니다. 상태 scheduled — 교사 화면에서 시작하세요.`);
  console.log("테스트 로그인: 코드 입력 → 학번 1{반}30 (예: 1-4 → 10430, 1-1 → 10130).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
