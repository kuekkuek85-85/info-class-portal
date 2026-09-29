/**
 * 「디지털 마음 톡톡」 STREAMS 개인전 — 화요일 1기 **리허설** 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-mt-streams-tue1.ts [교시]
 *   예) node --env-file=.env.local scripts/open-mt-streams-tue1.ts 7
 *
 * open-mt6-tue1.ts / open-mt7-tue1.ts 와 같은 꼴이되, **rehearsal: true** 로 연다:
 *  · 리허설은 교시 시각과 무관하게 열려 있어(db.ts 의 isSessionClosed) 아무 때나 테스트할 수 있다.
 *  · 끝나면 scripts/clear-rehearsals.ts --write 로 rehearsal 세션과 코드 예약을 한 번에 지운다.
 *  · "지금 하는 수업" 자동 선택에서는 빠지므로 진짜 수업과 안 섞인다.
 *
 * 세션 문서 ID = 날짜__교시__mt-tue-1. 코드는 자동 예약한다. phaseOrder 를 세션에 복사하고,
 * galleryEnabled 는 계획대로 false 로 못박는다(성찰 비공개). 멱등 — 이미 열려 있으면 계획에서
 * 오는 부분만 갈아끼운다(코드·상태·단계·teacherNote 보존).
 *
 * ⚠ STREAMS 는 코드 기능(streams_solo kind·컴포넌트·엔진)이라, main 에 머지된 커밋(92f006c)이
 * **Vercel 에 재빌드·배포된 뒤**에야 학생 화면에 게임이 뜬다. 배포 전이면 그 단계가 비어 보인다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import type { LessonPlan, WorksheetQuestion } from "../src/lib/types.ts";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`✗ 환경변수 ${name} 가 없습니다.`);
    process.exit(1);
  }
  return value;
}

const app = initializeApp({
  credential: cert({
    projectId: requiredEnv("FIREBASE_PROJECT_ID"),
    clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
    privateKey: requiredEnv("FIREBASE_PRIVATE_KEY").replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const LESSON_NO = 210;
const ACTIVITY_ID = "mt-2026-streams";
const GROUP_KEY = "mt-tue-1";
const GROUP_LABEL = "화요일 1기";
/** 분반마다 다른 데이터 통 번호 (계획의 groups 와 같아야 한다) */
const CLASS_NO = 1;
/** 교시 — 인자로 받고, 없으면 관례대로 7교시. */
const PERIOD = Number(process.argv[2] ?? 7);

/**
 * 계획에서 세션으로 복사되는 부분 — snapshotOf 목록 + phaseOrder.
 * galleryEnabled 는 false 로 못박는다(STREAMS 성찰은 비공개).
 */
function planContent(plan: LessonPlan, kept: WorksheetQuestion[]): Record<string, unknown> {
  return {
    lessonNo: plan.lessonNo,
    title: plan.title,
    moodCheckEnabled: plan.moodCheckEnabled,
    game: plan.game,
    gameExplainer: plan.gameExplainer,
    progress: plan.progress,
    assessment: plan.assessment,
    video: plan.video,
    videoPrompts: plan.videoPrompts ?? [],
    reflectionQuestions: plan.reflectionQuestions,
    reflectionPublic: plan.reflectionPublic,
    quiz: plan.quiz,
    phaseOrder: plan.phaseOrder ?? [],
    phaseLabels: plan.phaseLabels ?? {},
    focusExempt: plan.focusExempt ?? [],
    progressChecks: plan.progressChecks,
    freeNavigation: plan.freeNavigation ?? false,
    activity: {
      ...plan.activity,
      worksheet: kept,
      // 성찰 기분 서술은 친구에게 안 나간다(gallery/route.ts 가 이 값을 보고 막는다).
      galleryEnabled: false,
    },
  };
}

async function main(): Promise<void> {
  if (!Number.isFinite(PERIOD) || PERIOD < 1 || PERIOD > 8) {
    console.error(`✗ 교시 값이 이상합니다: ${process.argv[2]}. 1~8 사이 숫자를 주세요.`);
    process.exit(1);
  }

  const plans = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  const planDoc =
    plans.docs.find((d) => (d.data() as LessonPlan).activity?.activityId === ACTIVITY_ID) ??
    plans.docs[0];
  if (!planDoc) {
    console.error("✗ 210차시(STREAMS) 계획이 없습니다. scripts/seed-mt-streams.ts 를 먼저 돌리세요.");
    process.exit(1);
  }
  const plan = planDoc.data() as LessonPlan;

  /* ── 분반별 주소가 있으면 이 분반 것 하나로 줄인다(이 활동엔 없지만 관례상 처리) ── */
  const original = plan.activity?.worksheet ?? [];
  const kept: WorksheetQuestion[] = [];
  for (const q of original) {
    const next: WorksheetQuestion = { ...q };
    if (next.linkUrlByGroup) {
      const picked = next.linkUrlByGroup[GROUP_KEY] ?? next.linkUrl;
      delete next.linkUrlByGroup;
      if (picked) next.linkUrl = picked;
    }
    kept.push(next);
  }

  const content = planContent(plan, kept);

  /* ── 오늘 날짜(KST) ─────────────────────────────────────── */
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const id = `${today}__${PERIOD}__${GROUP_KEY}`;
  const existing = await db.collection("classSessions").doc(id).get();

  if (existing.exists) {
    const s = existing.data() as { code: string; status: string };
    await db
      .collection("classSessions")
      .doc(id)
      .set({ lessonPlanId: planDoc.id, ...content }, { merge: true });
    console.log(`↻ 이미 열려 있던 리허설(코드 ${s.code}, ${s.status})의 내용을 갈아 끼웠습니다`);
    report(id, s.code, kept);
    process.exit(0);
  }

  /* ── 새로 연다 (rehearsal) ─────────────────────────────── */
  const taken = new Set(
    (await db.collection("classSessions").get()).docs
      .map((d) => d.data() as { code?: string; status?: string; date?: string })
      .filter((s) => s.status !== "ended" || s.date === today)
      .map((s) => s.code),
  );
  let code = "";
  for (let n = 11; n <= 99; n += 1) {
    if (!taken.has(String(n))) {
      code = String(n);
      break;
    }
  }
  if (!code) {
    console.error("✗ 오늘 쓸 수 있는 수업 코드가 없습니다.");
    process.exit(1);
  }

  await db.collection("codeReservations").doc(`${today}__${code}`).set({
    date: today,
    code,
    createdAt: Date.now(),
  });

  await db.collection("classSessions").doc(id).set({
    lessonPlanId: planDoc.id,
    classNo: CLASS_NO,
    groupKey: GROUP_KEY,
    groupLabel: GROUP_LABEL,
    date: today,
    period: PERIOD,
    code,

    ...content,

    status: "scheduled",
    phase: "waiting",
    // ★ 리허설: 교시 시각과 무관하게 열려 있고, clear-rehearsals 로 지워진다.
    rehearsal: true,
    demo: false,
    teacherNote: "",
    startedAt: null,
    endedAt: null,
    createdAt: Date.now(),
  });

  console.log(`✓ ${GROUP_LABEL} ${PERIOD}교시 STREAMS 리허설 수업을 만들었습니다 (대기 상태)`);
  report(id, code, kept);
  process.exit(0);
}

function report(id: string, code: string, kept: WorksheetQuestion[]): void {
  console.log(`   ${id}`);
  console.log(`   수업 코드 ${code}  · rehearsal: true (아무 때나 열림, clear-rehearsals 로 정리)\n`);
  console.log("교사 버튼 순서: 대기 → 마음 체크인 → STREAMS 개인전(problem) → 게임 후 돌아보기(build) → 마음일기");
  console.log(`활동지 문항 ${kept.length}개 · 서로의 마음 읽기: 끔(galleryEnabled: false).`);
  console.log("\n리허설 방법: 이 코드로 접속해 **화요일 1기 30번(테스트 학생)** 으로 로그인 → STREAMS 를 돌려보세요.");
  console.log("정리: node --env-file=.env.local scripts/clear-rehearsals.ts --write  (rehearsal 세션·코드 예약 삭제)");
  console.log("\n⚠ 배포 전제: STREAMS 는 코드 기능이라 92f006c 가 Vercel 에 재빌드·배포된 뒤에야 게임이 뜹니다.");
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
