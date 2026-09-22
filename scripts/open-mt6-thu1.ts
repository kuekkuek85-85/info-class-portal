/**
 * 「디지털 마음 톡톡」 6회기(효과적인 의사소통·공감, 활동4·5) — 목요일 1기 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-mt6-thu1.ts
 *
 * open-mt6-tue1.ts 와 같은 뼈대다(세션은 7교시 하나 · 분반 토큰은 목요일 1기 것만 ·
 * phaseOrder 포함 · galleryEnabled false 못박음 · 멱등). 한 가지만 다르다:
 *
 * ## 화요일 1기 메모 이어받기 (create 분기에서만)
 *
 * 교사가 화요일 1기(mt-tue-1) 6회기 세션에 적어 둔 교사 메모(teacherNote)를, 새로 여는
 * 목요일 1기 세션의 teacherNote 로 이어받는다. 화요일 세션이 없거나 메모가 비어 있으면
 * 그냥 빈 메모로 연다. update 분기에서는 손대지 않는다(교사가 목요일 세션에 이미 적어 둔
 * 메모를 덮으면 안 된다).
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

const LESSON_NO = 206;
const GROUP_KEY = "mt-thu-1";
const GROUP_LABEL = "목요일 1기";
/** 분반마다 다른 데이터 통 번호 (계획의 groups 와 같아야 한다) */
const CLASS_NO = 2;
/** 6~7교시 블록. 7교시로 하나만 연다 — 6교시로 열면 코드가 중간에 만료된다 */
const PERIOD = 7;

/** 화요일 1기 세션에서 메모를 이어받을 때 원문 앞에 붙이는 짧은 표시 (원문은 그대로 보존) */
const TUE_NOTE_PREFIX = "[화요일 1기 메모] ";

/**
 * 계획에서 세션으로 복사되는 부분 — snapshotOf(src/lib/db.ts) 의 목록 + phaseOrder.
 * create·update 두 분기가 이 한 곳을 똑같이 쓴다. worksheet 은 분반 주소를 그 분반 것 하나로
 * 줄이고, galleryEnabled 는 false 로 못박는다.
 */
function planContent(
  plan: LessonPlan,
  kept: WorksheetQuestion[],
): Record<string, unknown> {
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
    // 6회기엔 퀴즈가 없다 — 있으면 그대로 싣고, 없으면 ignoreUndefinedProperties 로 안 실린다.
    quiz: plan.quiz,
    // snapshotOf 가 빠뜨리는 필드. wrapmap·wrapheal 을 마음일기 앞에 두는 버튼 순서.
    phaseOrder: plan.phaseOrder ?? [],
    phaseLabels: plan.phaseLabels ?? {},
    focusExempt: plan.focusExempt ?? [],
    progressChecks: plan.progressChecks,
    freeNavigation: plan.freeNavigation ?? false,
    activity: {
      ...plan.activity,
      worksheet: kept,
      /*
       * 서로의 마음 읽기를 막는다 — 의사소통·공감·감정 대화 글은 친구에게 안 나간다.
       * 서버 갤러리 라우트가 이 값을 보고 응답 자체를 막는다(gallery/route.ts).
       */
      galleryEnabled: false,
    },
  };
}

/** 화요일 1기 6회기 세션의 교사 메모를 가장 최근 것에서 읽는다 (create 분기에서만 쓴다). */
async function readTuesdayNote(): Promise<string> {
  const snap = await db
    .collection("classSessions")
    .where("lessonNo", "==", LESSON_NO)
    .where("groupKey", "==", "mt-tue-1")
    .get();
  if (snap.empty) return "";

  const rows = snap.docs
    .map((d) => d.data() as { date?: string; createdAt?: number; teacherNote?: string })
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || (b.createdAt ?? 0) - (a.createdAt ?? 0));

  return String(rows[0]?.teacherNote ?? "").trim();
}

async function main(): Promise<void> {
  const plans = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  if (plans.empty) {
    console.error("✗ 206차시 계획이 없습니다. scripts/seed-mt6.ts 를 먼저 돌리세요.");
    process.exit(1);
  }
  const planDoc = plans.docs[0];
  const plan = planDoc.data() as LessonPlan;

  /* ── 활동지에서 분반 캔바 주소를 이 분반 것 하나로 줄인다 ── */
  const original = plan.activity?.worksheet ?? [];
  const kept: WorksheetQuestion[] = [];
  let canvaLink = "";

  for (const q of original) {
    const next: WorksheetQuestion = { ...q };
    if (next.linkUrlByGroup) {
      const picked = next.linkUrlByGroup[GROUP_KEY] ?? next.linkUrl;
      delete next.linkUrlByGroup;
      if (picked) {
        next.linkUrl = picked;
        canvaLink = picked;
      }
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
    // teacherNote·code·status·phase·출석은 건드리지 않는다 — 계획에서 오는 부분만 바꾼다.
    await db
      .collection("classSessions")
      .doc(id)
      .set({ lessonPlanId: planDoc.id, ...content }, { merge: true });
    console.log(`↻ 이미 열려 있던 수업(코드 ${s.code}, ${s.status})의 내용을 갈아 끼웠습니다`);
    report(id, s.code, kept, canvaLink, null);
    process.exit(0);
  }

  /* ── 새로 연다 ──────────────────────────────────────────── */
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

  // 화요일 1기 세션의 교사 메모를 이어받는다 (create 분기에서만).
  const tueNote = await readTuesdayNote();
  const teacherNote = tueNote ? `${TUE_NOTE_PREFIX}${tueNote}` : "";

  await db.collection("classSessions").doc(id).set({
    lessonPlanId: planDoc.id,
    classNo: CLASS_NO,
    groupKey: GROUP_KEY,
    groupLabel: GROUP_LABEL,
    date: today,
    period: PERIOD,
    code,

    // 계획에서 복사하는 것 (snapshotOf 목록 + phaseOrder)
    ...content,

    status: "scheduled",
    phase: "waiting",
    rehearsal: false,
    demo: false,
    teacherNote,
    startedAt: null,
    endedAt: null,
    createdAt: Date.now(),
  });

  console.log(`✓ ${GROUP_LABEL} ${PERIOD}교시 수업을 만들었습니다 (대기 상태)`);
  report(id, code, kept, canvaLink, tueNote);
  process.exit(0);
}

function report(
  id: string,
  code: string,
  kept: WorksheetQuestion[],
  canvaLink: string,
  tueNote: string | null,
): void {
  console.log(`   ${id}`);
  console.log(`   수업 코드 ${code}\n`);

  console.log("교사 버튼 순서: 대기 → 마음 체크인 → 오늘 할 일 →");
  console.log("  [활동4] 언어·비언어·톤 → 나 전달법 → 갈등 분석 → 관계 캘리그래피(Canva)");
  console.log("  [활동5] 공감 문장 → 감정 말풍선 → 감정 대화 이어가기 → 만화 생성 프롬프트 정리 → 마음일기\n");

  console.log(`활동지 문항 ${kept.length}개 · 퀴즈 없음.`);

  const shown = canvaLink
    ? canvaLink.replace(/token=([^&]{4})[^&]*/, "token=$1…")
    : "없음 — 캔바 단추가 안 나옵니다(.env.local 의 CANVA_INVITE_MT_THU_1 확인)";
  const which = process.env.CANVA_INVITE_MT_THU_1 ? "목요일 1기 전용" : "⚠ 기본 주소 (목요일 1기 전용 토큰 없음)";
  console.log(`캔바 초대 주소: ${shown}  [${which}]`);
  console.log(`남의 분반 토큰 실림: ${JSON.stringify(kept).includes("linkUrlByGroup") ? "예 ← 문제" : "아니오"}`);
  console.log("서로의 마음 읽기: 끔(galleryEnabled: false) · 친구에게 나가는 칸: 없음");

  if (tueNote === null) {
    console.log("화요일 1기 메모 이어받기: (해당 없음 — 이미 열려 있던 세션이라 teacherNote 는 건드리지 않음)");
  } else if (tueNote) {
    console.log("화요일 1기 메모 이어받기: 있음 — 화요일 1기 세션의 교사 메모를 목요일 세션 teacherNote 로 옮겼습니다.");
  } else {
    console.log("화요일 1기 메모 이어받기: 없음 — 화요일 1기 세션이 없거나 메모가 비어 빈 메모로 열었습니다.");
  }
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
