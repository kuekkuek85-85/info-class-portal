/**
 * 10/22(목) 정보과 수업을 연다.
 *   3교시 1-4(23차) · 5교시 1-2(23차).
 *
 *   node --env-file=.env.local scripts/open-info-10-22.ts [날짜]
 *
 * open-info-10-21.ts 를 복제했다. 세션 문서 ID 는 `날짜__교시__반`, 코드는 예약까지 한다.
 * 이미 있는 수업은 건드리지 않는다(두 번 돌려도 안전). 살아 있는 수업의 코드는 피해서 새 코드를 고른다.
 *
 * ★ 23차 「마이크로비트 MakeCode — LED와 친해지기(두근두근 하트)」(seed-lesson23-microbit.ts) —
 *   대기=파이썬 타자 도우미, 안내→피지컬 컴퓨팅(problem)→마이크로비트(video)→LED 탐색(worksheet)→성찰.
 *   보상=스네이크(rewardGame.requires=[mb_share_link submitted] — 공유 링크 제출해야 열림), freeNavigation 기본 off.
 *   activityId microbit-makecode. quiz 없음.
 *
 * ★★ 세션 생성부는 lessonPlan 의 필드를 그대로 싣는다 — rewardGame(requires 포함)·progress·assessment·
 *   video·videoPrompts·quiz·phaseOrder·phaseLabels·focusExempt·freeNavigation 을 모두 싣는다.
 *   (그래도 안전하게, 연 뒤 seed-lesson23-microbit.ts --force 로 전체 내용을 한 번 더 맞춘다.)
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

const DATE = process.argv[2] ?? "2026-10-22";
const PLAN_LIST: { period: number; classNo: number; lessonNo: number }[] = [
  { period: 3, classNo: 4, lessonNo: 23 },
  { period: 5, classNo: 2, lessonNo: 23 },
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
      game: p.game,
      gameExplainer: p.gameExplainer,
      // ★★ 성찰 보상 게임 — 22차=게임 고르기, 23차=지뢰찾기. 빠지면 '제출하고 게임하기' 가 안 열린다.
      rewardGame: p.rewardGame ?? null,
      progress: p.progress,
      assessment: p.assessment,
      video: p.video,
      videoPrompts: p.videoPrompts ?? [],
      // ★ 개념 퀴즈 — 22·23차 모두 quiz 가 있다. 빠지면 퀴즈 단계가 비어 보인다.
      quiz: p.quiz,
      reflectionQuestions: p.reflectionQuestions,
      reflectionPublic: p.reflectionPublic,
      // ★ 단계 버튼 순서 — 없으면 LESSON_PHASES 기본으로 틀어진다(23차는 기분이 따로 뜸).
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
        `(reward=${back.rewardGame ? "Y" : "-"} quiz=${back.quiz ? "Y" : "-"} ` +
        `phaseOrder=${Array.isArray(back.phaseOrder) ? (back.phaseOrder as unknown[]).length : "none"})`,
    );
  }

  console.log(`\n${DATE} 준비됐습니다. 상태 scheduled — 교사 화면에서 시작하세요.`);
  console.log("테스트 로그인: 코드 입력 → 학번 1{반}30 (예: 1-1 → 10130, 1-3 → 10330).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
