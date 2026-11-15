/**
 * 10/29(목) 정보과 정식 수업을 두 반 연다 (리허설 아님, 실제 수업).
 *   1반 2교시(25차 — 만보기+AI) · 4반 4교시(24차 — 나만의 LED 애니메이션).
 *
 *   node --env-file=.env.local scripts/open-info-10-29.ts [날짜]
 *
 * ★ 반별 차시가 다르다 — 1반은 24차를 마쳐 25차, 4반은 10/28 축제 부스 기획으로 24차를 못 해서
 *   24차부터(교사 확정). PLAN_LIST 의 lessonNo 를 반마다 지정한다.
 *
 * open-info-10-28.ts 를 복제했다. 세션 문서 ID 는 `날짜__교시__반`, 코드는 예약까지 한다.
 * 이미 있는 수업은 건드리지 않는다(두 번 돌려도 안전). 살아 있는 수업의 코드는 피해서 새 코드를 고른다.
 *
 * ★★ 24·25차는 성찰 보상 게임(24차=스네이크 / 25차=사과 게임)·단계 순서(phaseOrder)가 핵심이라 세션
 *   문서에 반드시 싣고, '다 했어요' 버튼 숨김(hideDoneButton: true)도 실어야 한다(route.ts 가
 *   session.hideDoneButton 을 읽음 — 빠지면 false 로 떨어져 버튼이 뜬다). rewardGame·phaseOrder·
 *   phaseLabels·focusExempt·freeNavigation 모두 plan 스냅샷에서 복사한다(informatics.md 규칙).
 *
 * 세션은 기본(대기)으로 연다 — status: scheduled, 진행은 교사가 대시보드 단추로 몬다.
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

/** 보상 게임(성찰 제출 후). 세션 문서에 싣는 모양 그대로. */
interface RewardGame {
  heading: string;
  body: string;
  url: string;
}

/**
 * rewardGame?: 이 엔트리에서만 쓰는 보상 게임 override(차시 plan 을 안 건드림).
 * 10/29 4반(24차)은 교사 요청으로 보상 게임을 스네이크 → 사과 게임으로 이 세션에 한해 바꾼다.
 * 24차 plan 자체는 그대로 둬 다른 반 24차에는 영향 없다(25차가 하던 방식과 동일한 엔트리 override).
 */
const DATE = process.argv[2] ?? "2026-10-29";
const PLAN_LIST: { period: number; classNo: number; lessonNo: number; rewardGame?: RewardGame }[] = [
  { period: 2, classNo: 1, lessonNo: 25 },
  {
    period: 4,
    classNo: 4,
    lessonNo: 24,
    // ★ 이 세션 한정 override — 1-4 24차 보상 게임을 사과 게임으로(교사 확정). 24차 plan 불변.
    rewardGame: {
      heading: "수고했어요! 🍎",
      body: "성찰을 제출했으면 잠깐 사과 게임으로 쉬어요. 선생님이 부르면 돌아오세요.",
      url: "https://fruit-box-game-delta.vercel.app/",
    },
  },
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

  for (const { period, classNo, lessonNo, rewardGame: rewardOverride } of PLAN_LIST) {
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
      // ★ 24·25차 — '다 했어요' 버튼 숨김. 안 실으면 route 가 false 로 떨어진다.
      hideDoneButton: p.hideDoneButton ?? false,
      game: p.game,
      gameExplainer: p.gameExplainer,
      // ★★ 성찰 보상 게임 — 엔트리 override(4반 사과 게임)가 있으면 그걸, 없으면 plan 값(25차 사과 /
      //    24차 스네이크). 빠지면 '제출하고 게임하기' 가 안 열린다.
      rewardGame: rewardOverride ?? p.rewardGame ?? null,
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
