/**
 * 「디지털 마음 톡톡」 2회기(= 2기의 첫 수업) — 목요일 2기 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-mt2-thu2.ts
 *
 * 화요일 2기(open-mt2-tue2.ts)와 **구성 100% 동일**. 바뀐 것은 분반(mt-thu-2)·데이터 통
 * (classNo 4)·캔바 토큰(CANVA_INVITE_MT_THU_2)·수업일(2026-10-29)뿐이다.
 *
 * ## 왜 이 스크립트인가 — 1기 1회기를 2기 1회기로 그대로 재사용
 *
 * 포털의 「디지털 마음 톡톡」은 회기 1(오리엔테이션)이 포털에 없고, **학생이 실제로
 * 포털에서 처음 한 수업이 회기 2 "내 감정 알아차리기"(lessonNo 202)** 였다.
 * 그 내용을 기수·날짜·분반만 바꿔 목요일 2기 1회기로 그대로 연다.
 *
 * ## 2기는 데이터 통이 다르다 (classNo 4)
 *
 * 계획(seed-mt2)의 groups 에 mt-thu-2 = classNo 4 로 이미 정의돼 있다.
 * 1기(classNo 1·2)·화요일 2기(classNo 3)와 통 번호가 달라 기록이 **안 섞인다.**
 * 계획(lessonPlan 202)·활동 통(activityId mt-2026-2)은 공유 자원이라 그대로 쓴다.
 *
 * ## ★ 프라이버시 — 1기와 똑같은 표준 설정을 유지한다
 *
 * - galleryEnabled: true, galleryAnswerKeys: ["share_feel","share_line","canva_url"]
 *   서로의 마음 읽기는 **고른 감정·한 줄·캔바 작품 링크** 세 칸만 친구에게 나간다.
 *   경험 글(draft)·AI 감정 렌즈 비교(lens/verdict/compare_*)·인사이드아웃 메모(io_*)·
 *   장면 메모(scene_*)는 목록 밖이라 서버 갤러리 라우트에서 막힌다. 위기 신호도 거른다.
 * - reflectionPublic: false — 마음일기는 닫혀 있다.
 *
 * ## ★ 캔바 토큰 — env 의 목요일 2기 토큰을 유일한 원천으로 쓴다
 *
 * 계획의 _canva_login 기본값은 mt-tue-1 토큰(CANVA_MT)이라, 그대로 두면 남의 분반 토큰이
 * 학생 브라우저로 샌다. 그래서 여기서는 CANVA_INVITE_MT_THU_2 로 직접 채운다. 토큰이
 * 없으면 링크를 **빈 값으로 못박는다**(남의 분반 토큰 비전송).
 *
 * ## 블록타임 — 7교시 하나로 (6~7교시 90분)
 *
 * 6교시로 열면 코드가 6교시 끝에 만료된다. 세션 ID = 날짜__7__mt-thu-2.
 * 수업 전날 미리 열어 두므로 날짜는 수업일(2026-10-29)로 못박는다.
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
const GROUP_KEY = "mt-thu-2";
const GROUP_LABEL = "목요일 2기";
/** 분반마다 다른 데이터 통 번호 (계획의 groups 와 같아야 한다) */
const CLASS_NO = 4;

/** --rehearsal 이면 rehearsal: true (그날 안에서만 삶 — 자정 KST 넘으면 닫힘). */
const REHEARSAL = process.argv.includes("--rehearsal");

/**
 * --force 강제 재오픈 (교사 지시: 마음톡톡 수정 시 매번 강제 재오픈).
 * 기존 세션을 **통째로 새로 써** 코드만 유지하고 대기 상태로 초기화한다(merge 아님 →
 * 옛 필드 잔존 없음). 단, 실제 제출물(answers)이 쌓인 세션은 날리지 않도록 아래에서 막는다.
 */
const FORCE = process.argv.includes("--force");

function argValue(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

/**
 * 6~7교시 블록 → 7교시로 하나만. 6교시로 열면 코드가 중간에 만료된다.
 * 리허설은 시각표에 없는 교시(예: 9)로 열어 정식 수업과 안 겹치게 한다 → --period 로 덮는다.
 */
const PERIOD = Number(argValue("period") ?? 7);
/** 수업일(목). 전날 미리 여므로 '오늘'이 아니라 수업일로 못박는다. 리허설은 --date=오늘. */
const TARGET_DATE = argValue("date") ?? "2026-10-29";

/** 2기 목요일 전용 캔바 초대 — env 가 원천(계획의 frozen 값/1기 기본값을 믿지 않는다). */
const CANVA_THU_2 = process.env.CANVA_INVITE_MT_THU_2 ?? "";

/**
 * 활동지를 2기 목요일 기준으로 정리한다.
 * - 1기와 같은 전 단계 구성이라 문항을 빼지 않는다.
 * - 캔바 로그인(_canva_login)은 **env 의 mt-thu-2 토큰**으로 직접 채운다. 계획의
 *   linkUrlByGroup/기본값(mt-tue-1 토큰)을 믿지 않는다(남의 분반 토큰 누수 방지).
 * - 그 밖의 분반 주소 표(linkUrlByGroup)는 이 분반 것 하나로 줄이되, 없으면 비운다.
 */
function resolveWorksheet(original: WorksheetQuestion[]): WorksheetQuestion[] {
  return original.map((q) => {
    const next: WorksheetQuestion = { ...q };
    if (next.key === "_canva_login") {
      delete next.linkUrlByGroup; // 다른 분반 토큰이 담긴 표·기본값을 버린다
      next.linkUrl = CANVA_THU_2; // ★ 2기 목요일 토큰만(없으면 빈 값)
      return next;
    }
    if (next.linkUrlByGroup) {
      const picked = next.linkUrlByGroup[GROUP_KEY];
      delete next.linkUrlByGroup;
      next.linkUrl = picked ?? ""; // ★ 없으면 비운다(남의 분반 토큰 비전송)
    }
    return next;
  });
}

async function main(): Promise<void> {
  const plans = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  const planDoc = plans.docs.find((d) => (d.data() as LessonPlan).activity?.activityId === "mt-2026-2");
  if (!planDoc) {
    console.error("✗ 202차시(mt-2026-2) 계획이 없습니다. scripts/seed-mt2.ts 를 먼저 돌리세요.");
    process.exit(1);
  }
  const plan = planDoc.data() as LessonPlan;
  const kept = resolveWorksheet(plan.activity?.worksheet ?? []);

  const id = `${TARGET_DATE}__${PERIOD}__${GROUP_KEY}`;
  const existing = await db.collection("classSessions").doc(id).get();

  /* 계획에서 세션으로 복사되는 부분 (snapshotOf 목록과 같다). gallery 는 계획값 유지. */
  const content = {
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
    // 별도 '마음 체크인'(mood) 단계를 빼기 위해 계획의 phaseOrder(= LESSON_PHASES 에서 mood 제외)를 복사.
    phaseOrder: plan.phaseOrder ?? [],
    phaseLabels: plan.phaseLabels ?? {},
    focusExempt: plan.focusExempt ?? [],
    freeNavigation: plan.freeNavigation ?? false,
    activity: {
      ...plan.activity,
      worksheet: kept,
      // 1기와 동일한 표준 — 서로의 마음 읽기는 계획의 허용 목록 그대로.
      galleryEnabled: plan.activity?.galleryEnabled ?? false,
      galleryAnswerKeys: plan.activity?.galleryAnswerKeys ?? [],
    },
  };

  if (existing.exists) {
    const s = existing.data() as { code: string; status: string; teacherNote?: string; createdAt?: number };

    if (FORCE) {
      /*
       * 안전장치 — 실제 제출물이 쌓였으면 강제 재오픈을 막는다(교사 지시).
       * 이 세션의 데이터 통(classNo)에서 answers 에 실제로 쓴 값이 있는 작품을 센다.
       * 0 이면 테스트 흔적·빈 세션이라 그냥 재오픈한다.
       */
      const arts = await db
        .collection("artifacts")
        .where("activityId", "==", plan.activity?.activityId ?? "")
        .get();
      const real = arts.docs.filter((d) => {
        const a = d.data() as { classNo?: number; answers?: Record<string, string> };
        if (a.classNo !== CLASS_NO) return false;
        return Object.values(a.answers ?? {}).some((v) => String(v ?? "").trim());
      });
      if (real.length > 0) {
        console.error(
          `✗ 강제 재오픈 중단 — 이 세션(classNo ${CLASS_NO})에 실제 제출물이 ${real.length}건 있습니다.\n` +
            "  데이터가 날아갈 수 있어 멈춥니다. 교사에게 보존 여부를 확인한 뒤 진행하세요.",
        );
        process.exit(1);
      }

      const keepCode = s.code;
      await db.collection("classSessions").doc(id).set({
        lessonPlanId: planDoc.id,
        classNo: CLASS_NO,
        groupKey: GROUP_KEY,
        groupLabel: GROUP_LABEL,
        date: TARGET_DATE,
        period: PERIOD,
        code: keepCode,

        ...content,

        status: "scheduled",
        phase: "waiting",
        rehearsal: REHEARSAL,
        demo: false,
        teacherNote: s.teacherNote ?? "",
        startedAt: null,
        endedAt: null,
        createdAt: s.createdAt ?? Date.now(),
        forcedReopenAt: Date.now(),
      }); // merge 아님 — 통째로 새로 써서 옛 필드(예전 game·누락 phaseOrder)를 지운다
      console.log(`⟳ 강제 재오픈 — 코드 ${keepCode} 유지, 대기 상태로 초기화 (제출물 0건 확인)`);
      await report(id, keepCode, kept);
      process.exit(0);
    }

    await db.collection("classSessions").doc(id).set({ lessonPlanId: planDoc.id, ...content }, { merge: true });
    console.log(`↻ 이미 열려 있던 수업(코드 ${s.code}, ${s.status})의 내용을 갈아 끼웠습니다`);
    await report(id, s.code, kept);
    process.exit(0);
  }

  /* 코드 예약 — 끝나지 않았거나 같은 날짜인 세션들의 코드를 피한다. */
  const taken = new Set(
    (await db.collection("classSessions").get()).docs
      .map((d) => d.data() as { code?: string; status?: string; date?: string })
      .filter((s) => s.status !== "ended" || s.date === TARGET_DATE)
      .map((s) => s.code),
  );
  let code = "";
  for (let n = 11; n <= 99; n += 1) {
    if (!taken.has(String(n))) { code = String(n); break; }
  }
  if (!code) { console.error("✗ 쓸 수 있는 수업 코드가 없습니다."); process.exit(1); }

  await db.collection("codeReservations").doc(`${TARGET_DATE}__${code}`).set({
    date: TARGET_DATE,
    code,
    createdAt: Date.now(),
  });

  await db.collection("classSessions").doc(id).set({
    lessonPlanId: planDoc.id,
    classNo: CLASS_NO,
    groupKey: GROUP_KEY,
    groupLabel: GROUP_LABEL,
    date: TARGET_DATE,
    period: PERIOD,
    code,

    ...content,

    status: "scheduled",
    phase: "waiting",
    rehearsal: REHEARSAL,
    demo: false,
    teacherNote: "",
    startedAt: null,
    endedAt: null,
    createdAt: Date.now(),
  });

  console.log(`✓ ${GROUP_LABEL} ${PERIOD}교시 수업을 만들었습니다 (대기 상태${REHEARSAL ? " · rehearsal" : ""})`);
  await report(id, code, kept);
  process.exit(0);
}

async function report(id: string, code: string, kept: WorksheetQuestion[]): Promise<void> {
  console.log(`   ${id}`);
  console.log(`   수업 코드 ${code} · 수업일 ${TARGET_DATE} (목) 6~7교시\n`);

  console.log("단계: 대기(마음 체크인) → 감정 낱말 퀴즈 → 다시 마음 체크인 → 인사이드 아웃 2");
  console.log("      → 영화 활동지 → 영화·예능 속 내 마음 → 감정 낱말·경험 글 → 서로의 마음 읽기");
  console.log("      → AI 감정 렌즈 → 감정 캐릭터 만들기(캔바) → 마음일기\n");

  // 프라이버시 재검
  const keys = JSON.stringify(kept);
  const leak = keys.includes("linkUrlByGroup");
  console.log("★ 프라이버시 재검");
  console.log('   서로의 마음 읽기: 켬 · 나가는 칸 = ["share_feel","share_line","canva_url"] 뿐');
  console.log("     → 경험 글(draft)·AI 렌즈 비교(lens/verdict/compare_*)·메모(io_*/scene_*) 비공개(서버 차단).");
  console.log("   마음일기(reflection): 비공개(reflectionPublic: false).");
  console.log(`   남의 분반 토큰 실림: ${leak ? "예 ← 문제!" : "아니오"}`);

  // 캔바 상태
  const canva = kept.find((q) => q.key === "_canva_login")?.linkUrl ?? "";
  if (canva) {
    console.log(`   캔바 초대: ${canva.replace(/token=([^&]{4})[^&]*/, "token=$1…")} [목요일 2기 전용]`);
  } else {
    console.log("   ⚠ 캔바 초대 주소 없음 — '감정 캐릭터 만들기'(캔바) 단계에서 로그인 링크가 비어 있습니다.");
    console.log("     2기 목요일 전용 초대가 생기면 .env.local 에 CANVA_INVITE_MT_THU_2 를 넣고 다시 돌리세요(멱등).");
  }

  const enr = await db.collection("enrollments").where("groupKey", "==", GROUP_KEY).get();
  if (enr.size > 0) {
    console.log(`\n명단(enrollments): ${GROUP_LABEL} ${enr.size}명 등록됨 — 전원 명렬표에 있으면 이름으로 입장합니다.`);
  } else {
    console.log("\n⚠ 2기 목요일 명단(enrollments) 미등록 — 지금은 학생이 임시 번호로 들어옵니다(이름·결석 추적 불가).");
    console.log("   교사에게 2기 목요일 명단(반·번호·이름)을 받아 seed-mt-roster-thu2 를 돌려야 합니다.");
  }
  console.log(
    REHEARSAL
      ? "\n리허설 모드 — 아무 때나 열립니다. 끝나면 clear-rehearsals.ts --write 로 정리하세요."
      : "\n실제 수업 모드.",
  );
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
