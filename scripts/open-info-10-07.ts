/**
 * 10/7(수) 정보과 수업을 네 반 연다.
 *   4반 2교시(18차) · 2반 3교시(18차) · 1반 5교시(17차) · 3반 6교시(18차).
 *
 *   node --env-file=.env.local scripts/open-info-10-07.ts [날짜]
 *
 * open-info-10-2.ts 를 복제했다. 세션 문서 ID 는 `날짜__교시__반`, 코드는 예약까지 한다.
 * 이미 있는 수업은 건드리지 않는다(두 번 돌려도 안전). 살아 있는 수업의 코드는 피해서 새 코드를 고른다.
 *
 * ★ 반별 차시가 다르다 — 4·2·3반은 어제(10/6) 17차를 끝내 오늘 18차로, 1반은 17차가
 *   밀려 오늘 17차다. PLAN_LIST 의 lessonNo 를 반마다 지정한다.
 *
 * ★★ 17·18차는 성찰 보상 게임(rewardGame)과 단계 순서(phaseOrder)가 핵심이라 세션 문서에
 *   반드시 실어야 한다. 기존 open-info 템플릿(16차용)은 rewardGame 을 빠뜨리는 함정이 있어,
 *   이 스크립트의 세션 생성부에 `rewardGame`·`phaseOrder`·`phaseLabels`·`focusExempt`·
 *   `freeNavigation` 을 모두 복사했다(없으면 보상 게임이 안 열리고 단계 순서가 기본으로 틀어짐).
 *   추가 안전장치로, 연 뒤 seed-lesson18.ts --force / seed-lesson17.ts --force 로 전체
 *   플랜 스냅샷을 다시 메꾼다.
 *
 * 세션은 기본(대기)으로 연다 — 진행은 교사가 대시보드 단추로 몬다. python-dodge-game 공용 통이라
 * 앞 차시(17차: 분석·설계·주인공 이동) 제출은 그대로 prefill — 활동통·키 건드리지 않는다.
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

const DATE = process.argv[2] ?? "2026-10-07";
const PLAN_LIST: { period: number; classNo: number; lessonNo: number }[] = [
  { period: 2, classNo: 4, lessonNo: 18 },
  { period: 3, classNo: 2, lessonNo: 18 },
  { period: 5, classNo: 1, lessonNo: 17 },
  { period: 6, classNo: 3, lessonNo: 18 },
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
      // ★★ 성찰 보상 게임(테트리스) — 16차 템플릿엔 없던 필드. 빠지면 '제출하고 게임하기' 가 안 열린다.
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
    if (!back?.code || !back?.activity) {
      console.error(`✗ ${period}교시 ${classNo}반 문서가 제대로 안 써졌습니다.`);
      process.exit(1);
    }
    console.log(
      `✓ ${period}교시 ${classNo}반 — ${lessonNo}차시 「${back.title}」  수업 코드 ${back.code}  ` +
        `(reward=${back.rewardGame ? "Y" : "-"} phaseOrder=${Array.isArray(back.phaseOrder) ? (back.phaseOrder as unknown[]).length : "none"})`,
    );
  }

  console.log(`\n${DATE} 준비됐습니다. 상태 scheduled — 교사 화면에서 시작하세요.`);
  console.log("※ 연 뒤 seed-lesson18.ts --force / seed-lesson17.ts --force 로 전체 플랜 스냅샷을 메꾸세요.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
