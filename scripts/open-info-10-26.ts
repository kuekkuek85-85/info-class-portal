/**
 * 10/26(월) 정보과 정식 수업을 네 반 연다 (리허설 아님, 실제 수업).
 *   1반 2교시(25차) · 4반 3교시(24차) · 2반 5교시(24차) · 3반 6교시(25차).
 *
 *   node --env-file=.env.local scripts/open-info-10-26.ts [날짜]
 *
 * open-info-10-07.ts 를 복제했다. 세션 문서 ID 는 `날짜__교시__반`, 코드는 예약까지 한다.
 * 이미 있는 수업은 건드리지 않는다(두 번 돌려도 안전). 살아 있는 수업의 코드는 피해서 새 코드를 고른다.
 *
 * ★ 반별 차시가 다르다 — 1·3반은 25차(만보기+AI), 2·4반은 24차(LED 애니메이터). PLAN_LIST 에 지정.
 *
 * ★★ 24·25차는 성찰 보상 게임(rewardGame)·단계 순서(phaseOrder)가 핵심이라 세션 문서에 반드시
 *   싣는다. 24·25차는 또 '다 했어요' 버튼을 숨기므로(hideDoneButton: true) 이 필드도 세션에 실어야
 *   한다 — route.ts 가 session.hideDoneButton 을 읽는데, 빠지면 false 로 떨어져 버튼이 뜬다
 *   (open-info-10-07 템플릿엔 없던 필드라 여기 추가했다). rewardGame·phaseOrder·phaseLabels·
 *   focusExempt·freeNavigation 도 모두 복사한다(informatics.md 규칙).
 *
 * 세션은 기본(대기)으로 연다 — status: scheduled, 진행은 교사가 대시보드 단추로 몬다.
 * microbit-makecode 공용 통이라 앞 차시 제출은 그대로 prefill — 활동통·키 건드리지 않는다.
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

const DATE = process.argv[2] ?? "2026-10-26";
const PLAN_LIST: { period: number; classNo: number; lessonNo: number }[] = [
  { period: 2, classNo: 1, lessonNo: 25 },
  { period: 3, classNo: 4, lessonNo: 24 },
  { period: 5, classNo: 2, lessonNo: 24 },
  { period: 6, classNo: 3, lessonNo: 25 },
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
      // ★ 24·25차 — '다 했어요' 버튼 숨김. 안 실으면 route 가 false 로 떨어진다(10-07 템플릿엔 없던 필드).
      hideDoneButton: p.hideDoneButton ?? false,
      game: p.game,
      gameExplainer: p.gameExplainer,
      // ★★ 성찰 보상 게임(24차 스네이크 / 25차 사과 게임) — 빠지면 '제출하고 게임하기' 가 안 열린다.
      rewardGame: p.rewardGame ?? null,
      progress: p.progress,
      assessment: p.assessment,
      video: p.video,
      videoPrompts: [],
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
      console.error(`✗ ${period}교시 ${classNo}반 문서가 제대로 안 써졌습니다 (code/activity/rewardGame).`);
      process.exit(1);
    }
    console.log(
      `✓ ${period}교시 ${classNo}반 — ${lessonNo}차시 「${back.title}」  수업 코드 ${back.code}  ` +
        `(reward=${back.rewardGame ? "Y" : "-"} phaseOrder=${Array.isArray(back.phaseOrder) ? (back.phaseOrder as unknown[]).length : "none"} hideDone=${back.hideDoneButton})`,
    );
  }

  console.log(`\n${DATE} 준비됐습니다. 상태 scheduled — 교사 화면에서 시작하세요.`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
