/**
 * 「인간과 인공지능」 화요일 2기 1차시 — **리허설 세션**을 연다.
 *
 *   node --env-file=.env.local scripts/open-hai2-tue2-rehearsal.ts [날짜] [교시]
 *   (기본: 오늘(KST) · 9교시)
 *
 * 정식 세션(2026-10-27__1__hai-tue-2, 코드 11)은 건드리지 않는다. 교사가 지금 직접
 * 들어가 캔바 로그인 단계까지 걸어 보기 위한 별개 세션이다.
 *
 * 내용은 open-hai2-tue2.ts(= 목요일 1기 개선판, 로그인 우선 구성)와 동일하고,
 * 캔바 2기 화 토큰(CANVA_INVITE_TUE_2)이 반영된 상태로 연다.
 *
 * rehearsal=true 라, 날짜가 넘어가면(자정) 저절로 닫히고 코드도 풀린다
 * (db.ts 의 isSessionClosed: rehearsal 은 그날 안에서만 산다). 그러니 **오늘 안에** 테스트해야 한다.
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

const LESSON_NO = 102;
const GROUP_KEY = "hai-tue-2";
const GROUP_LABEL = "화요일 2기 (리허설)";
const CLASS_NO = 2;

const KST_TODAY = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const DATE = process.argv[2] ?? KST_TODAY;
const PERIOD = Number(process.argv[3] ?? 9); // 시각표에 없는 교시 — 시각으로 안 닫힌다

const DROP = new Set(["_grill_note", "_grill_recap", "grill_a1", "grill_a2", "ai_review"]);
const CANVA_URL = process.env.CANVA_INVITE_TUE_2 || process.env.CANVA_INVITE_URL || "";

function loginQuestions(): WorksheetQuestion[] {
  return [
    {
      key: "_login_note",
      phase: "wordquiz",
      label: "먼저 캔바에 들어갑니다",
      hint:
        "아래 단추를 누르고 [Microsoft로 계속하기] 를 고릅니다.\n" +
        "로그인 창에 아래 '내 캔바 아이디'를 복사해서 붙여 넣으세요.\n" +
        "비밀번호는 학교 계정 비밀번호예요.\n\n" +
        "비밀번호가 기억나지 않아도 괜찮습니다. 혼자 붙들고 있지 말고 손을 드세요 —\n" +
        "선생님이 그 자리에서 새로 만들어 줍니다. 오늘은 이것부터 하고 시작해요.",
      kind: "note",
      // 학번으로 학교 계정 주소(26+학번@도메인)를 만들어 복사 버튼으로 준다 (worksheet-view 의 named {학교계정})
      copyText: "{학교계정}",
      linkUrl: CANVA_URL,
      linkLabel: "캔바 열기 (새 창)",
      maxLength: 0,
    },
    {
      key: "login_ok",
      phase: "wordquiz",
      label: "캔바에 들어갔나요?",
      hint: "",
      kind: "choice",
      choices: [
        "들어갔어요",
        "비밀번호가 안 돼요 — 손을 들겠습니다",
        "다른 데서 막혔어요 — 손을 들겠습니다",
      ],
      maxLength: 0,
    },
  ];
}

async function main(): Promise<void> {
  const plans = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  if (plans.empty) {
    console.error("✗ 102차시 계획이 없습니다. scripts/seed-hai2.ts 를 먼저 돌리세요.");
    process.exit(1);
  }
  const planDoc = plans.docs[0];
  const plan = planDoc.data() as LessonPlan;

  const original = plan.activity?.worksheet ?? [];
  const kept: WorksheetQuestion[] = [];
  for (const q of original) {
    if (DROP.has(q.key)) continue;
    if (q.key === "_build_login") continue;
    const next: WorksheetQuestion = { ...q };
    if (next.linkUrlByGroup) {
      const picked = next.linkUrlByGroup[GROUP_KEY];
      delete next.linkUrlByGroup;
      if (picked) next.linkUrl = picked;
    }
    if (next.key === "_build_make") next.label = "① 웹 앱 만들기";
    if (next.key === "_build_publish") next.label = "② 링크 가져오기";
    if (next.key === "will_fix") {
      next.hint =
        "이 줄은 다음 시간 화면 맨 위에 그대로 뜹니다. 나에게 남기는 쪽지예요.\n" +
        "뽑힌 화면을 보면서 “이건 아닌데” 싶었던 것 하나면 됩니다.\n" +
        "아직 못 뽑았으면, 프롬프트를 다시 읽고 빠진 것 같은 것을 적으세요.";
    }
    kept.push(next);
  }
  const worksheet = [...loginQuestions(), ...kept];

  const live = (await db.collection("classSessions").get()).docs
    .map((d) => d.data() as { code: string; status: string; date: string })
    .filter((s) => s.status !== "ended" || s.date === DATE);
  const taken = new Set(live.map((s) => s.code));
  let code = "";
  for (let n = 11; n <= 99; n += 1) {
    if (!taken.has(String(n))) { code = String(n); break; }
  }
  if (!code) { console.error("✗ 쓸 수 있는 수업 코드가 없습니다."); process.exit(1); }

  const id = `${DATE}__${PERIOD}__${GROUP_KEY}`;
  const existing = await db.collection("classSessions").doc(id).get();
  if (existing.exists) {
    const s = existing.data() as { code: string; status: string };
    console.error(`✗ ${id} 가 이미 있습니다 (코드 ${s.code}, ${s.status}). 대시보드에서 지운 뒤 다시 돌리세요.`);
    process.exit(1);
  }

  try {
    await db.collection("codeReservations").doc(`${DATE}__${code}`).create({ date: DATE, code, createdAt: Date.now() });
  } catch {
    console.error(`✗ 코드 ${code} 예약이 이미 있습니다. 다시 실행해 주세요.`);
    process.exit(1);
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
    // 교사 요청(2기 1차시): 대기 게임 제거 + 마음 체크인 유지 — 기분 체크 후 바로 캔바 로그인으로
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
    activity: { ...plan.activity, worksheet },
    phaseLabels: {
      ...(plan.phaseLabels ?? {}),
      wordquiz: "캔바 로그인",
      grill: "다음 시간에 고칠 것",
    },
    // 교사 요청(2기 1차시): 기분(mood)·서로 구경하기(gallery) 단계를 대시보드에서 뺀다.
    // phaseOrder 를 명시하면 availablePhase 가 mood 단추를 안 만든다(대기 화면 기분 체크는 유지).
    // gallery 는 계획의 galleryEnabled=false 로 꺼진다.
    phaseOrder: ["waiting", "wordquiz", "progress", "problem", "mvp", "build", "grill", "reflection"],
    status: "scheduled",
    phase: "waiting",
    rehearsal: true,
    demo: false,
    freeNavigation: false,
    teacherNote: "",
    startedAt: null,
    endedAt: null,
    createdAt: Date.now(),
  });

  const back = (await db.collection("classSessions").doc(id).get()).data() as Record<string, unknown> | undefined;
  const dumped = JSON.stringify(back?.activity ?? {});
  const tok = CANVA_URL.match(/token=([^&]{4})/)?.[1] ?? "";

  console.log(`✓ [리허설] ${GROUP_LABEL} ${PERIOD}교시 세션을 만들었습니다`);
  console.log(`   세션 ID  ${id}`);
  console.log(`   접속 코드  ${code}`);
  console.log(`   rehearsal=${back?.rehearsal} · classNo ${CLASS_NO} · 상태 ${back?.status}`);
  console.log(`   캔바 토큰 앞4: ${tok} (화2기=dfXh) · 남의 분반 토큰 실림: ${dumped.includes("linkUrlByGroup") ? "예 ← 문제" : "아니오"}`);
  console.log(`   ⚠ 리허설은 오늘(${DATE}) 안에서만 삽니다 — 자정 넘으면 자동으로 닫히고 코드가 풀립니다.`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
