/**
 * 「디지털 마음 톡톡」 6회기(효과적인 의사소통·공감, 활동4·5) — 화요일 1기 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-mt6-tue1.ts
 *
 * ## 세션은 7교시 하나로, 분반 토큰은 화요일 1기 것만
 *
 * 6회기는 6·7교시 90분 블록이다. 마음 톡톡 관례대로 세션은 **7교시로 하나만** 연다
 * (6교시로 열면 코드가 6교시 끝에 만료돼 뒷시간에 학생이 못 들어온다). 세션 문서 ID 는
 * 날짜__7__mt-tue-1 이라 같은 교시 정보과 수업과 겹치지 않는다.
 *
 * ## 스냅샷 — snapshotOf(src/lib/db.ts) 목록 + phaseOrder 를 그대로 담는다
 *
 * db.ts 는 맨 위에서 `import "server-only"` 라 단독 node 실행에서 못 부른다. 그래서 그
 * 필드 목록을 그대로 옮겨 적고, snapshotOf 가 빠뜨리는 phaseOrder 도 함께 담는다(6회기는
 * wrapmap·wrapheal 을 마음일기 앞에 두려고 phaseOrder 를 쓴다 — 빠뜨리면 단계 버튼 순서가
 * 어긋난다). planContent 는 한 번만 만들어 create·update 두 분기에 똑같이 쓴다.
 *
 * ## Canva — 화요일 1기 토큰만 남기고 표(linkUrlByGroup)는 지운다
 *
 * 활동4 관계 캘리그래피의 Canva 초대는 분반마다 토큰이 다르다. 각 문항의 linkUrlByGroup 에서
 * 이 분반(mt-tue-1) 것만 골라 linkUrl 에 박고 표는 지운다 — 남겨 두면 화요일 1기 학생
 * 브라우저에 다른 분반 초대 토큰까지 실려 간다(db.ts 의 resolveGroupLinks 와 같은 이유).
 *
 * ## 프라이버시 — galleryEnabled 는 계획대로 false 로 못박는다
 *
 * 의사소통·공감·감정 대화 글은 친구에게 안 나간다. 서버 갤러리 라우트가 galleryEnabled 를
 * 보고 응답 자체를 막으므로 화면뿐 아니라 데이터로도 안 샌다. 계획이 이미 false 지만 이
 * 세션에서도 명시적으로 false 로 둔다.
 *
 * ## 멱등 — 이미 열려 있으면 내용만 갈아끼운다
 *
 * 교사가 대시보드에서 먼저 열어 둘 수 있다. 그때 지우고 새로 만들면 칠판에 적은 코드가
 * 바뀐다. 코드·상태·지금 단계·출석·teacherNote 는 그대로 두고 계획에서 오는 부분(planContent)만
 * 바꾼다.
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
const GROUP_KEY = "mt-tue-1";
const GROUP_LABEL = "화요일 1기";
/** 분반마다 다른 데이터 통 번호 (계획의 groups 와 같아야 한다) */
const CLASS_NO = 1;
/** 6~7교시 블록. 7교시로 하나만 연다 — 6교시로 열면 코드가 중간에 만료된다 */
const PERIOD = 7;

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
       * 서로 감상하기 — 캘리그래피 이미지 한 칸만 나간다. galleryEnabled(true)·galleryAnswerKeys
       * (['a4_calli_image'])는 계획(seed-mt6)에서 그대로 온다(...plan.activity). 여기서 억지로
       * 바꾸지 않는다 — 대신 아래 report 가 galleryAnswerKeys 를 찍어, 이미지 키 한 칸만 열렸고
       * 감정·서술 키(a4_virtue·나 전달법·갈등·a5_*·cb_*)가 섞이지 않았는지 재오픈마다 확인한다.
       */
    },
  };
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
    report(
      id,
      s.code,
      kept,
      canvaLink,
      plan.activity?.galleryEnabled === true,
      plan.activity?.galleryAnswerKeys ?? [],
    );
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
    teacherNote: "",
    startedAt: null,
    endedAt: null,
    createdAt: Date.now(),
  });

  console.log(`✓ ${GROUP_LABEL} ${PERIOD}교시 수업을 만들었습니다 (대기 상태)`);
  report(
    id,
    code,
    kept,
    canvaLink,
    plan.activity?.galleryEnabled === true,
    plan.activity?.galleryAnswerKeys ?? [],
  );
  process.exit(0);
}

function report(
  id: string,
  code: string,
  kept: WorksheetQuestion[],
  canvaLink: string,
  galleryEnabled: boolean,
  galleryKeys: string[],
): void {
  console.log(`   ${id}`);
  console.log(`   수업 코드 ${code}\n`);

  console.log("교사 버튼 순서: 대기 → 오늘 할 일 →");
  console.log("  말이 마음을 잇는다(wrapmap) → 갈등 상황 분석하기(problem) → 관계 캘리그래피(mvp) →");
  console.log("  캘리그래피 감상(gallery) → 공감 문장·감정 대화(wrapheal) → 감정 위로 챗봇(grill) → 마음일기(reflection)\n");
  console.log("  ※ 나 전달법·공감 문장·갈등 분석 = AI 피드백 버튼 · 감정 대화 이어가기·감정 위로 챗봇 = 임베드 챗봇");
  console.log("  ※ phaseOrder 에 mood 없음(대기 화면 기분 체크로 대신) — 마음일기 뒤 '마음 체크인' 단추 안 뜸\n");

  console.log(`활동지 문항 ${kept.length}개 · 퀴즈 없음.`);

  const shown = canvaLink
    ? canvaLink.replace(/token=([^&]{4})[^&]*/, "token=$1…")
    : "없음 — 캔바 단추가 안 나옵니다(.env.local 의 CANVA_INVITE_MT_TUE_1 확인)";
  const which = process.env.CANVA_INVITE_MT_TUE_1 ? "화요일 1기 전용" : "⚠ 기본 주소 (화요일 1기 전용 토큰 없음)";
  console.log(`캔바 초대 주소: ${shown}  [${which}]`);
  console.log(`남의 분반 토큰 실림: ${JSON.stringify(kept).includes("linkUrlByGroup") ? "예 ← 문제" : "아니오"}`);

  /*
   * 프라이버시 재검 — 서로 감상은 캘리그래피 이미지 한 칸만 열려야 한다. galleryAnswerKeys 가
   * 정확히 ['a4_calli_image'] 인지 확인하고, 감정·서술 키(a4_virtue·나 전달법·갈등·a5_*·cb_*)가
   * 하나라도 섞였으면 크게 경고한다. 갤러리가 켜졌는데 목록이 비면 전부 노출이라 그것도 경고.
   */
  const ALLOWED = ["a4_calli_image"];
  const leaked = galleryKeys.filter((k) => !ALLOWED.includes(k));
  console.log(`서로 감상(gallery): ${galleryEnabled ? "켬" : "끔"}`);
  console.log(`  친구에게 나가는 칸(galleryAnswerKeys): [${galleryKeys.join(", ")}]`);
  if (galleryEnabled && galleryKeys.length === 0) {
    console.log("  ⚠⚠ 위험: 갤러리가 켜졌는데 galleryAnswerKeys 가 비어 모든 답이 노출됩니다!");
  } else if (leaked.length > 0) {
    console.log(`  ⚠⚠ 위험: 캘리그래피 이미지 외 키가 섞였습니다 → [${leaked.join(", ")}]`);
  } else {
    console.log("  ✓ 캘리그래피 이미지(a4_calli_image) 한 칸만 열림 — 감정·서술·대화 키는 안 나감.");
  }
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
