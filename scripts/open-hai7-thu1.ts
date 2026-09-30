/**
 * 「인간과 인공지능」 7차시 · 목요일 1기 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-hai7-thu1.ts
 *   node --env-file=.env.local scripts/open-hai7-thu1.ts 2026-09-30 1
 *
 * open-hai7-tue1.ts 를 복제해 목요일 1기로 맞춘 것이다. 교사 화면에서도 만들 수 있지만,
 * 분반 수업은 고를 것이 많아(분반·차시·날짜·교시) 수업 직전에 손으로 고르다 틀리기 쉽다.
 *
 * 날짜·교시는 인자로 바꿀 수 있다 (기본 2026-09-30 오늘 1교시). 화요일 1기는 사본
 * open-hai7-tue1.ts 를 쓴다 (seed-hai7 의 groups 표: hai-thu-1 = 목요일 1기 = CLASS_NO 3).
 *
 * ## 여기서 반드시 지켜야 하는 두 가지 (open-hai6 과 같다)
 *
 *  1. **분반 캔바 주소를 하나만 남긴다.** 계획에는 네 분반 주소가 다 들어 있는데,
 *     그대로 복사하면 학생 화면에 남의 분반 초대 토큰이 실려 간다.
 *  2. **코드가 이미 쓰이고 있지 않은지 본다.** 끝나지 않은 수업이 쥐고 있으면
 *     학생이 남의 수업에 들어간다.
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
    privateKey: requiredEnv("FIREBASE_PRIVATE_KEY").replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const LESSON_NO = 107;
const GROUP_KEY = "hai-thu-1";
const GROUP_LABEL = "목요일 1기";
/** 화면에 안 보이는 데이터 통 번호. 2~6차시와 같아야 6차 발표 자료·앱·대본이 열린다 */
const CLASS_NO = 3;
const DATE = process.argv[2] ?? "2026-09-30";
const PERIOD = Number(process.argv[3] ?? 1);

/**
 * 세션 문서 ID — db.ts 의 sessionDocId 와 **같은 규칙이어야 한다.**
 * `${날짜}__${교시}__${분반열쇠}` 이다 (분반은 데이터 통으로 classNo 1~4 를 나눠 쓴다).
 */
const SESSION_ID = `${DATE}__${PERIOD}__${GROUP_KEY}`;

/**
 * 안 쓰이는 두 자리 코드를 고르고 **예약까지 한다** (open-hai6 과 같은 이유).
 */
async function pickCode(): Promise<string> {
  const live = await db.collection("classSessions").where("status", "in", ["scheduled", "active"]).get();
  const taken = new Set(live.docs.map((d) => String((d.data() as { code?: string }).code ?? "")));

  for (let n = 10; n <= 99; n += 1) {
    const code = String(n);
    if (taken.has(code)) continue;
    try {
      await db.collection("codeReservations").doc(`${DATE}__${code}`).create({
        date: DATE,
        code,
        createdAt: Date.now(),
      });
      return code;
    } catch {
      // 이미 예약된 코드다. 다음 것으로 넘어간다
    }
  }
  throw new Error("남은 코드가 없습니다. 끝난 수업을 정리해 주세요.");
}

async function main(): Promise<void> {
  const plans = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  if (plans.empty) {
    console.error("✗ 107차시 계획이 없습니다. 먼저 scripts/seed-hai7.ts 를 돌리세요.");
    process.exit(1);
  }
  const plan = plans.docs[0];
  const p = plan.data() as Record<string, unknown>;

  const existing = await db.collection("classSessions").doc(SESSION_ID).get();
  if (existing.exists) {
    const s = existing.data() as { code: string; status: string; lessonNo: number };
    console.log(`이미 있습니다 — ${SESSION_ID}  코드 ${s.code}  ${s.lessonNo}차시  ${s.status}`);
    process.exit(0);
  }

  /*
   * 이 분반 주소 하나만 남긴다. 나머지는 통째로 지운다 —
   * 화면으로 내려가는 문서에 남의 분반 토큰이 남아 있으면 안 된다.
   */
  const activity = p.activity as { worksheet?: Record<string, unknown>[] } | undefined;
  const worksheet = (activity?.worksheet ?? []).map((q) => {
    const byGroup = q.linkUrlByGroup as Record<string, string> | undefined;
    if (!byGroup) return q;
    const rest = { ...q };
    delete rest.linkUrlByGroup;
    const picked = byGroup[GROUP_KEY] ?? (q.linkUrl as string | undefined);
    return picked ? { ...rest, linkUrl: picked } : rest;
  });

  const code = await pickCode();

  await db.collection("classSessions").doc(SESSION_ID).set({
    id: SESSION_ID,
    lessonPlanId: plan.id,
    lessonNo: LESSON_NO,
    title: p.title,
    classNo: CLASS_NO,
    groupKey: GROUP_KEY,
    groupLabel: GROUP_LABEL,
    date: DATE,
    period: PERIOD,
    code,
    status: "scheduled",
    /*
     * 시작 단계를 'waiting' 으로 연다 — 7차 대기 화면은 발표 리허설이다.
     * moodCheckEnabled 가 true 라 학생은 먼저 기분 체크(교사 표준)를 하고, 제출하면
     * 그 자리에 본인 발표 자료(game.url = "answer:slides_url")가 떠 넘겨보며 연습한다.
     * 교사가 발표를 시작하면 build(평가 기준·발표 진행)로 넘긴다.
     */
    phase: "waiting",
    rehearsal: false,
    teacherNote: "",
    startedAt: null,
    endedAt: null,
    activity: { ...activity, worksheet },
    moodCheckEnabled: p.moodCheckEnabled,
    game: p.game,
    gameExplainer: p.gameExplainer,
    progress: p.progress,
    assessment: p.assessment,
    video: p.video,
    videoPrompts: [],
    reflectionQuestions: p.reflectionQuestions,
    reflectionPublic: p.reflectionPublic,
    phaseLabels: p.phaseLabels ?? {},
    // 단계 버튼 순서. 7차 계획은 phaseOrder 로 대기를 흐름에서 뺀다 — 세션에 함께 실어 나른다
    // (snapshotOf 도 같은 값을 싣는다; 여기서도 실어 화면·open 세션이 같은 순서가 되게)
    ...(p.phaseOrder ? { phaseOrder: p.phaseOrder } : {}),
    // 라이브 발표 진행 단계 (grill). 이게 있어야 학생·교사 화면에 발표 진행 UI 가 뜬다
    ...(p.presentationPhase ? { presentationPhase: p.presentationPhase } : {}),
    focusExempt: p.focusExempt ?? [],
    freeNavigation: p.freeNavigation ?? false,
  });

  // 읽어서 확인한다. 반쪽만 써진 문서가 남는 사고를 겪은 적이 있다
  const back = (await db.collection("classSessions").doc(SESSION_ID).get()).data() as
    | Record<string, unknown>
    | undefined;
  if (!back?.code) {
    console.error("✗ 문서가 제대로 안 써졌습니다.");
    process.exit(1);
  }

  const dumped = JSON.stringify(back.activity);
  const act = back.activity as { galleryEnabled?: boolean } | undefined;
  console.log(`✓ 열림  ${SESSION_ID}`);
  console.log(`  ${DATE} ${PERIOD}교시 · ${GROUP_LABEL} · ${LESSON_NO}차시`);
  console.log(`  수업 코드  ${back.code}`);
  console.log(`  상태 ${back.status} · 단계 ${back.phase} · 되돌아가기 ${back.freeNavigation ? "켬" : "끔"}`);
  console.log(`  남의 분반 토큰 실림  ${dumped.includes("linkUrlByGroup") ? "예 ← 문제" : "아니오"}`);
  console.log(`  서로 구경하기  ${act?.galleryEnabled ? "켬 ← 확인" : "끔 (동료평가는 발표자 비노출)"}`);
  console.log(`  시작 단계  ${back.phase}${back.phase === "waiting" ? " (대기=발표 리허설 — 기분 체크 먼저→내 슬라이드)" : ""}`);
  console.log(`  단계 순서(phaseOrder)  ${Array.isArray(back.phaseOrder) ? (back.phaseOrder as string[]).join(" → ") : "없음(LESSON_PHASES 기본)"}`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
