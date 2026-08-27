/**
 * 「디지털 마음 톡톡」 2회기 — 목요일 1기 수업을 연다 (화요일과 다른 구성).
 *
 *   node --env-file=.env.local scripts/open-mt2-thu1.ts
 *
 * ## 왜 따로 여는가
 *
 * 대시보드에서 열면 202차시 계획을 그대로 복사한다. 그런데 이 분반은 **뒤쪽 활동
 * 셋을 이번 회기에 하지 않고 다음 회기로 미룬다.** 계획 자체를 고치면 다른 분반이
 * 그 활동을 영영 못 하게 되므로(PRD 5.1), 계획은 그대로 두고 이 세션에서만 덜어낸다.
 *
 * ## 이번 회기에 하는 것
 *
 *   대기 → 마음 체크인 → 감정 낱말 퀴즈 → 다시 마음 체크인 → 인사이드 아웃 2
 *        → 영화 활동지 → 감정 캐릭터 만들기 → 마음일기
 *
 * ## 미루는 것 — 지우는 것이 아니다
 *
 *   영화·예능 속 내 마음 (mvp) · 나의 감정 쓰기 (worksheet)
 *   서로의 마음 읽기 (gallery) · AI 감정 렌즈 (emotion)
 *
 * 넷 다 계획에는 그대로 있고 다음 회기에 쓴다. 여기서는 **그 단계의 문항을 빼는**
 * 방식으로 감춘다. 교사 대시보드가 "문항이 없는 단계" 는 단추를 아예 만들지 않기
 * 때문이다 (teacher/dashboard 의 availablePhase). 단추가 없으면 수업 중에 잘못
 * 누를 일도 없다 — 잘못 누르면 스물두 명 화면이 동시에 빈 화면이 된다.
 *
 * 서로의 마음 읽기는 문항 수로 판정하지 않아서 galleryEnabled 를 따로 끈다.
 * 어차피 보여 줄 칸(share_feel · share_line)이 이번엔 없다.
 *
 * ## 90분에 맞추려는 것이다
 *
 * 계획 전체는 합치면 110분쯤 된다. 화요일 1기에서 시간이 모자랐고, 이번에는 영상도
 * 11분 28초짜리로 바뀌었다. 앞쪽(체크인 → 낱말 퀴즈 → 다시 체크인 → 영상 → 활동지)을
 * 제대로 하고 캔바로 마무리하는 편이, 열 가지를 겉핥기로 지나는 것보다 낫다.
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

const LESSON_NO = 202;
const GROUP_KEY = "mt-thu-1";
const GROUP_LABEL = "목요일 1기";
/** 분반마다 다른 데이터 통 번호 (계획의 groups 와 같아야 한다) */
const CLASS_NO = 2;
/** 6~7교시 블록. 7교시로 하나만 연다 — 6교시로 열면 코드가 중간에 만료된다 */
const PERIOD = 7;

/** 이번 회기에 미루는 단계 */
const HOLD_PHASES = new Set(["mvp", "worksheet", "emotion"]);

async function main(): Promise<void> {
  const plans = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  if (plans.empty) {
    console.error("✗ 202차시 계획이 없습니다. scripts/seed-mt2.ts 를 먼저 돌리세요.");
    process.exit(1);
  }
  const planDoc = plans.docs[0];
  const plan = planDoc.data() as LessonPlan;

  /* ── 활동지에서 미루는 단계를 덜어낸다 ─────────────────── */
  const original = plan.activity?.worksheet ?? [];
  const kept: WorksheetQuestion[] = [];
  const held: string[] = [];

  for (const q of original) {
    if (HOLD_PHASES.has(q.phase ?? "worksheet")) {
      held.push(q.key);
      continue;
    }

    const next: WorksheetQuestion = { ...q };

    // 분반 주소 표는 학생 화면에 내려보내지 않는다 (db.ts 의 resolveGroupLinks 와 같은 이유)
    if (next.linkUrlByGroup) {
      const picked = next.linkUrlByGroup[GROUP_KEY];
      delete next.linkUrlByGroup;
      if (picked) next.linkUrl = picked;
    }

    kept.push(next);
  }

  /* ── 오늘 날짜 ───────────────────────────────────────── */
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const id = `${today}__${PERIOD}__${GROUP_KEY}`;
  const existing = await db.collection("classSessions").doc(id).get();

  /*
   * 이미 열어 둔 수업이면 **내용만 갈아 끼운다.**
   *
   * 교사가 대시보드에서 먼저 열어 두는 일이 흔하다. 그때 지우고 새로 만들면 수업 코드가
   * 바뀌어서 칠판에 적어 둔 번호가 틀리게 된다. 코드·상태·지금 단계·출석은 그대로 두고
   * 계획에서 오는 부분만 바꾼다.
   *
   * 학생이 벌써 쓴 것이 있으면 멈춘다 — 미루는 단계에 이미 답이 있다면 그 단계를
   * 빼는 것이 그 답을 화면에서 지우는 일이 된다.
   */
  if (existing.exists) {
    const s = existing.data() as { code: string; status: string };
    const arts = await db
      .collection("artifacts")
      .where("activityId", "==", plan.activity?.activityId ?? "")
      .get();
    const wroteHeld = arts.docs.filter((d) => {
      const a = d.data() as { classNo?: number; answers?: Record<string, string> };
      if (a.classNo !== CLASS_NO) return false;
      return held.some((k) => String(a.answers?.[k] ?? "").trim());
    });
    if (wroteHeld.length > 0) {
      console.error(`✗ 이미 ${wroteHeld.length}명이 미루려는 칸에 썼습니다. 바꾸지 않습니다.`);
      process.exit(1);
    }

    await db.collection("classSessions").doc(id).update({
      lessonPlanId: planDoc.id,
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
      phaseLabels: plan.phaseLabels ?? {},
      focusExempt: plan.focusExempt ?? [],
      activity: { ...plan.activity, worksheet: kept, galleryEnabled: false },
    });
    console.log(`↻ 이미 열려 있던 수업(코드 ${s.code}, ${s.status})의 내용을 갈아 끼웠습니다`);
    report(id, s.code, kept, held);
    process.exit(0);
  }

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

    // 계획에서 복사하는 것 (snapshotOf 와 같은 목록)
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
    phaseLabels: plan.phaseLabels ?? {},
    focusExempt: plan.focusExempt ?? [],

    // 오늘만 다른 것
    activity: {
      ...plan.activity,
      worksheet: kept,
      /*
       * 서로의 마음 읽기를 막는다. 보여 줄 칸(share_feel · share_line)이 이번엔
       * 활동지에 없고, 감정 글이 반 전체에 걸리는 일을 단추 하나 잘못 눌러서
       * 일어나게 두면 안 된다.
       */
      galleryEnabled: false,
    },

    status: "scheduled",
    phase: "waiting",
    rehearsal: false,
    demo: false,
    freeNavigation: false,
    teacherNote: "",
    startedAt: null,
    endedAt: null,
    createdAt: Date.now(),
  });

  console.log(`✓ ${GROUP_LABEL} ${PERIOD}교시 수업을 만들었습니다 (대기 상태)`);
  report(id, code, kept, held);
  process.exit(0);
}

function report(id: string, code: string, kept: WorksheetQuestion[], held: string[]): void {
  console.log(`   ${id}`);
  console.log(`   수업 코드 ${code}\n`);

  console.log("단계: 대기 → 마음 체크인 → 감정 낱말 퀴즈 → 다시 마음 체크인");
  console.log("      → 인사이드 아웃 2 → 영화 활동지 → 감정 캐릭터 만들기 → 마음일기 → 마침\n");

  console.log(`다음 회기로 미룬 칸 ${held.length}개`);
  console.log(`  ${held.join(" · ")}`);
  console.log("  → 이 단계들은 대시보드에 단추 자체가 안 생깁니다. 잘못 누를 일이 없어요.\n");

  const canva = kept.find((q) => q.key === "_canva_login")?.linkUrl ?? "";
  const shown = canva
    ? canva.replace(/token=([^&]{4})[^&]*/, "token=$1…")
    : "없음 — 캔바 단추가 안 나옵니다";
  const which = process.env.CANVA_INVITE_MT_THU_1 ? "목요일 1기 전용" : "⚠ 기본 주소 (목요일 1기 전용 주소 없음)";
  console.log(`캔바 초대 주소: ${shown}  [${which}]`);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
