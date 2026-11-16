/**
 * 11/16(월) 5교시 1-1반 30차 「똥피하기 만들기 ③ (완성)」 강제 재오픈 (실세션).
 *
 *   node --env-file=.env.local scripts/reopen-info-30-1-1.ts [날짜]
 *
 * 교사 지시(2026-11-16 수업 후): 30차를 재구성(미션3 31차 이월 + 'and 개념·퀴즈' 신설)하고
 *   5교시 1-1 을 새 버전으로 다시 연다. 기존 세션 `2026-11-16__5__1`(code 11, ended)을
 *   그 code 그대로 유지한 채 새 lessonPlan 스냅샷으로 덮어쓰고 status=scheduled/phase=waiting 로 되돌린다.
 *   ★ 학생 산출(artifacts)·성찰·기분 기록은 별도 컬렉션이라 지워지지 않는다. 세션의 활동지·단계만 교체된다.
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
const PERIOD = 5;
const CLASS_NO = 1;
const LESSON_NO = 30;

async function main(): Promise<void> {
  const sessionId = `${DATE}__${PERIOD}__${CLASS_NO}`;
  const ref = db.collection("classSessions").doc(sessionId);
  const existing = await ref.get();
  if (!existing.exists) {
    console.error(`✗ 세션 ${sessionId} 가 없습니다. (open-info-30-1-1.ts 로 먼저 열어야 합니다)`);
    process.exit(1);
  }
  const prev = existing.data() as { code?: string; status?: string };
  const code = prev.code ?? "";
  if (!code) {
    console.error("✗ 기존 세션에 code 가 없습니다. 중단합니다.");
    process.exit(1);
  }

  const plans = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  if (plans.empty) {
    console.error(`✗ ${LESSON_NO}차시 계획이 없습니다. seed-lesson${LESSON_NO}.ts 를 먼저 돌리세요.`);
    process.exit(1);
  }
  const plan = plans.docs[0];
  const p = plan.data() as Record<string, unknown>;

  // 새 plan 스냅샷으로 덮어쓰되 code 는 유지, 상태는 대기로 되돌린다. teacherNote 는 비운다(새 회차).
  await ref.set(
    {
      lessonPlanId: plan.id,
      lessonNo: LESSON_NO,
      title: p.title,
      classNo: CLASS_NO,
      date: DATE,
      period: PERIOD,
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
    },
    { merge: false },
  );

  const back = (await ref.get()).data() as Record<string, unknown> | undefined;
  const rg = (back?.rewardGame ?? {}) as { url?: string; requires?: unknown[] };
  console.log(
    `✓ 재오픈 ${PERIOD}교시 ${CLASS_NO}반 — ${LESSON_NO}차시 「${back?.title}」  수업 코드 ${back?.code} (이전 상태 ${prev.status} → ${back?.status})\n` +
      `  phaseOrder=${JSON.stringify(back?.phaseOrder)}\n` +
      `  phaseLabels=${JSON.stringify(back?.phaseLabels)}\n` +
      `  reward=${rg.url} requires=${JSON.stringify(rg.requires)}\n` +
      `  freeNav=${back?.freeNavigation} hideDone=${back?.hideDoneButton} mood=${back?.moodCheckEnabled}`,
  );
  console.log(`\n${sessionId} 재오픈 완료 — 상태 scheduled. 교사 화면에서 '수업 시작'. 학생 기존 답은 그대로 보존됩니다.`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
