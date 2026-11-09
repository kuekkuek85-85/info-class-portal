/**
 * 「인간과 인공지능」 4차시(= 2기에게는 4번째 만남) — 화요일 2기 **실세션**을 연다.
 *
 *   node --env-file=.env.local scripts/open-hai4-tue2.ts 2026-11-10 1 [--force]
 *
 * ## 무엇을 재사용하고 무엇을 바꿨나
 *
 * open-hai3-tue2.ts(2기 3차시)의 틀(코드 예약·강제 재오픈·표준 설정)을 그대로 쓰되,
 * 104 계획(피드백 받고 고치기)으로 연다. 세션 ID 는 `${날짜}__${교시}__hai-tue-2`.
 *
 * ### 제출 방식 = 링크 제출 포함 (교사 결정, 3차시의 방식 A 와 다름)
 * 3차시(103)는 캔바 '게시' 가 막혀 링크 제출을 빼고 '선생님께 보여주기' 로 갔다. 그런데
 * 그 결과 링크가 하나도 안 모였다. 교사가 이번엔 **학생이 직접 게시 링크를 붙여넣어
 * 제출**하도록 요청했다(포털이 자동 추출하는 건 여전히 막혀 있지만, 학생이 손으로
 * 붙여넣는 제출은 된다). 104 계획에 이미 build_url 제출칸(emotion 단계)이 있으므로
 * **그대로 둔다** — 방식 A 변환을 하지 않는다.
 *
 * ### 되돌아가기 = on (교사 선호 확정, 캔바 차시 예외)
 * 표준은 off 지만, 캔바를 여러 번 드나드는 차시라 앞뒤 칸으로 오갈 수 있어야 한다.
 * 교사가 캔바 차시는 on 을 선호한다고 확정했다.
 *
 * ### 3차(선생님) 피드백 = 미리 피드백
 * build 단계의 teacher_note(_r4_teacher 등)는 그대로 둔다. 교사가 수업 전에
 * teacher/pre-review 화면에서 화요일 2기를 골라 각 작품 teacherFeedback.note 를 채워
 * 두면, 학생이 '지난 피드백 돌아보기' 단계의 '선생님이 남긴 말' 에서 바로 확인한다.
 *
 * ## 반드시 지키는 것
 *  - 분반 캔바 주소 표(linkUrlByGroup)는 이 분반(hai-tue-2) 것 하나만 남긴다(남의 토큰 유출 금지).
 *  - 코드가 이미 쓰이고 있지 않은지 보고 고른다.
 *  - 활동 ID 는 2·3차시와 같아(hai-2026-1기) 지난 답·AI 질문이 그대로 열린다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldPath } from "firebase-admin/firestore";

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

const LESSON_NO = 104;
const GROUP_KEY = "hai-tue-2";
const GROUP_LABEL = "화요일 2기";
/** 데이터 통 번호 — 2·3차시와 같아야 지난 답이 열린다 */
const CLASS_NO = 2;

const KST_TODAY = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const DATE = process.argv[2] ?? KST_TODAY;
const PERIOD = Number(process.argv[3] ?? 1);

/** 캔바 초대 주소 — 화요일 2기 전용(없으면 기본 주소로 물러남) */
const CANVA_URL = process.env.CANVA_INVITE_TUE_2 || process.env.CANVA_INVITE_URL || "";

/**
 * 분반 캔바 토큰 표만 떼고 이 분반 주소 하나만 남긴다. 문항 구조·build_url 제출칸은
 * 그대로 둔다(링크 제출 포함). 방식 A 변환 없음.
 */
function transform(questions: WorksheetQuestion[]): WorksheetQuestion[] {
  return questions.map((q): WorksheetQuestion => {
    const next: WorksheetQuestion = { ...q };
    if (next.linkUrlByGroup) {
      const picked = next.linkUrlByGroup[GROUP_KEY];
      delete next.linkUrlByGroup;
      if (picked) next.linkUrl = picked;
    }
    return next;
  });
}

async function main(): Promise<void> {
  const plans = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  if (plans.empty) {
    console.error("✗ 104차시 계획이 없습니다. scripts/seed-hai4.ts 를 먼저 돌리세요.");
    process.exit(1);
  }
  const planDoc = plans.docs[0];
  const plan = planDoc.data() as LessonPlan;

  const worksheet = transform(plan.activity?.worksheet ?? []);

  /* ── 코드 정하기 + (있으면) 강제 재오픈 (open-hai3-tue2 와 같은 로직) ── */
  const FORCE = process.argv.includes("--force");
  const id = `${DATE}__${PERIOD}__${GROUP_KEY}`;
  const existing = await db.collection("classSessions").doc(id).get();

  let code = "";

  if (existing.exists) {
    const ex = existing.data() as { code: string; status: string };
    if (!FORCE) {
      console.error(`✗ ${id} 가 이미 있습니다 (코드 ${ex.code}, ${ex.status}).`);
      console.error("  강제 재오픈하려면 --force 를 붙이세요 (실학생 데이터 있으면 먼저 확인).");
      process.exit(1);
    }

    // 안전장치: 이 세션 ID 에 출석이 있으면(이미 진행된 수업일 수 있음) 멈춘다.
    const att = await db
      .collection("attendance")
      .where(FieldPath.documentId(), ">=", `${id}__`)
      .where(FieldPath.documentId(), "<", `${id}__z`)
      .get();
    if (att.size > 0) {
      console.error(`✗ 강제 재오픈 중단 — ${id} 에 출석 ${att.size}건(이미 진행된 수업일 수 있음).`);
      console.error("  코디네이터에게 먼저 알리세요.");
      process.exit(1);
    }

    for (const col of ["attendance", "moodEntries", "reflections", "quizAnswers"]) {
      const snap = await db
        .collection(col)
        .where(FieldPath.documentId(), ">=", `${id}__`)
        .where(FieldPath.documentId(), "<", `${id}__z`)
        .get();
      for (const d of snap.docs) await d.ref.delete();
      if (snap.size) console.log(`  정리: ${col} ${snap.size}건 삭제`);
    }

    code = String(ex.code);
    await existing.ref.delete();
    await db.collection("codeReservations").doc(`${DATE}__${code}`).delete().catch(() => {});
    await db.collection("codeReservations").doc(`${DATE}__${code}`).create({ date: DATE, code, createdAt: Date.now() });
    console.log(`  강제 재오픈 — 코드 ${code} 유지`);
  } else {
    const live = (await db.collection("classSessions").get()).docs
      .map((d) => d.data() as { code: string; status: string; date: string })
      .filter((s) => s.status !== "ended" || s.date === DATE);
    const taken = new Set(live.map((s) => s.code));
    for (let n = 11; n <= 99; n += 1) {
      if (!taken.has(String(n))) {
        code = String(n);
        break;
      }
    }
    if (!code) {
      console.error("✗ 쓸 수 있는 수업 코드가 없습니다.");
      process.exit(1);
    }
    await db.collection("codeReservations").doc(`${DATE}__${code}`).create({ date: DATE, code, createdAt: Date.now() });
  }

  await db.collection("classSessions").doc(id).set({
    lessonPlanId: planDoc.id,
    classNo: CLASS_NO,
    groupKey: GROUP_KEY,
    groupLabel: GROUP_LABEL,
    date: DATE,
    period: PERIOD,
    code,

    lessonNo: plan.lessonNo,
    title: plan.title,
    // 표준: 기분 체크 on, 대기 게임 없음 — 대기 화면은 마음 체크인만(게임으로 안 넘어감)
    moodCheckEnabled: true,
    game: { heading: "", body: "", url: "" },
    gameExplainer: plan.gameExplainer,
    progress: plan.progress,
    assessment: plan.assessment,
    video: plan.video,
    videoPrompts: plan.videoPrompts ?? [],
    reflectionQuestions: plan.reflectionQuestions,
    reflectionPublic: plan.reflectionPublic,
    quiz: plan.quiz,
    focusExempt: plan.focusExempt ?? [],

    // 분반 토큰만 뗀 활동지 (build_url 제출칸·teacher_note 그대로)
    activity: { ...plan.activity, worksheet },
    phaseLabels: plan.phaseLabels ?? {},
    // 기분 '단계'는 숨긴다(대기 화면 기분 체크는 유지). 104 단계 순서대로 나열, mood 제외.
    phaseOrder: ["waiting", "progress", "build", "grill", "emotion", "reflection"],

    // 캔바 차시 예외: 되돌아가기 on (교사 선호 확정). '다 했어요' 단추 숨김 on
    freeNavigation: true,
    hideDoneButton: true,

    status: "scheduled",
    phase: "waiting",
    rehearsal: false,
    demo: false,
    teacherNote: "",
    startedAt: null,
    endedAt: null,
    createdAt: Date.now(),
  });

  const back = (await db.collection("classSessions").doc(id).get()).data() as Record<string, unknown> | undefined;
  const dumped = JSON.stringify(back?.activity ?? {});
  const backWs = ((back?.activity as { worksheet?: WorksheetQuestion[] })?.worksheet ?? []);
  const hasBuildUrlSubmit = backWs.some((q) => q.key === "build_url");
  const hasTeacherNote = backWs.some((q) => q.kind === "teacher_note");
  const hasReview = backWs.some((q) => q.key === "_l4_review_self") && backWs.some((q) => q.key === "ai_review");
  const tok = CANVA_URL.match(/token=([^&]{4})/)?.[1] ?? "";

  console.log(`✓ ${GROUP_LABEL} ${PERIOD}교시 (${LESSON_NO}차시 — 피드백 받고 고치기) 실세션을 열었습니다`);
  console.log(`   세션 ID  ${id}`);
  console.log(`   접속 코드  ${code} · 상태 ${back?.status} · classNo ${CLASS_NO} · rehearsal=${back?.rehearsal}`);
  console.log(`   되돌아가기 ${back?.freeNavigation ? "켬(캔바 예외)" : "끔"} · 다했어요 단추 ${back?.hideDoneButton ? "숨김" : "보임"} · 기분체크 ${back?.moodCheckEnabled ? "켬" : "끔"}`);
  console.log(`   대기 게임: ${(back?.game as { url?: string })?.url ? "있음 ← 문제" : "없음 (대기 화면 = 마음 체크인만)"}`);
  console.log(`   1·2차 피드백 정리 단계: ${hasReview ? "OK" : "✗ 없음"} · 캔바 링크 제출칸(build_url): ${hasBuildUrlSubmit ? "OK" : "✗ 없음"} · 선생님 피드백 자리(teacher_note): ${hasTeacherNote ? "OK" : "✗ 없음"}`);
  console.log(`   남의 분반 토큰 실림: ${dumped.includes("linkUrlByGroup") ? "예 ← 문제" : "아니오"}`);
  console.log(`   캔바 토큰 앞4: ${tok} ${process.env.CANVA_INVITE_TUE_2 ? "(화2기 전용)" : "(⚠ 기본 주소)"}`);
  console.log(`   phaseOrder=${JSON.stringify(back?.phaseOrder)} (mood 없음)`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
