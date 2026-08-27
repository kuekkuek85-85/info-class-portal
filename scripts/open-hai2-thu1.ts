/**
 * 「인간과 인공지능」 2차시 — 목요일 1기 수업을 연다 (화요일과 다른 구성).
 *
 *   node --env-file=.env.local scripts/open-hai2-thu1.ts
 *
 * ## 왜 따로 여는가
 *
 * 대시보드에서 열면 102차시 계획을 그대로 복사한다. 그런데 목요일 1기는 **화요일에서
 * 배운 것을 반영해 덜어낸 구성**으로 가야 한다. 계획 자체를 고치면 화요일 1기가 실제로
 * 한 수업의 기록이 바뀌므로(PRD 5.1), 계획은 그대로 두고 이 세션에만 손을 댄다.
 *
 * ## 화요일 1기에서 실제로 일어난 일
 *
 * 22명 중 각 칸에 답한 사람 수 (활동 통 hai-2026-1기 에 남은 기록):
 *
 *   불편한 것 21 · 누구의 불편 22 · 제일 작게 22 · 기능① 23 · 기능② 22 · 기능③ 18
 *   캔바 프롬프트 22  →  만들어진 링크 3  →  AI 검토 0 · 다음에 고칠 것 0
 *
 * 프롬프트까지는 전원이 갔고 **캔바에서 막혔다.** 그 뒤 검증 단계는 아무도 못 갔다.
 * 그러니 뒤를 자르는 것으로는 안 된다 — 뒤는 이미 안 하고 있었다. 앞을 덜어서 캔바에
 * 시간을 몰아줘야 한다.
 *
 * 막힌 지점은 교사 확인 결과 **로그인**이었다. 학교 계정 비밀번호를 잊은 학생이 많아
 * 교사가 office.com 에서 하나씩 초기화해 줬다. 10분은 잡아야 한다.
 *
 * ## 그래서 이렇게 바꾼다
 *
 *  1. **캔바 로그인을 첫 활동으로 뺀다.** build 단계 안에 ① 로 묻혀 있던 것을, 대기 다음
 *     첫 화면으로 올린다. 로그인이 10분이면 그것을 수업 중간에 두면 안 된다 — 늦게 끝나는
 *     학생을 교사가 돌 시간이 없다.
 *     빈 wordquiz 자리를 빌린다 (LESSON_PHASES 에서 waiting 바로 다음, progress 앞).
 *
 *  2. **비밀번호를 잊었을 때 무엇을 할지 화면에 적는다.** 화요일에는 이것이 없어서
 *     학생이 혼자 붙들고 있었다. 손을 들면 교사가 초기화해 준다는 것을 못 박는다.
 *     "로그인 됐나요?" 한 칸을 둬서, 막힌 학생이 스스로 손을 들게 만든다.
 *
 *  3. **AI 검토와 서로 구경하기를 뺀다.** 둘 다 만들어진 링크가 있어야 성립하는데
 *     화요일에 링크가 3개였다. 회고 한 줄(will_fix)만 남겨 grill 단계를 그것 하나로 만든다.
 *
 * 꼭 필요한 기능은 셋을 그대로 받는다. 한 번 ②③ 을 뺐다가 되돌렸다 — 기능이 하나면
 * 프롬프트가 한 줄이 되고, 뽑힌 화면이 앙상해서 "어디가 어긋났나" 를 찾을 거리가 없다.
 * 오늘 수업의 본체가 그 찾기다.
 *
 * 45분 배분 — 로그인 10 · 오늘 할 일 2 · 문제 찾기 6 · 꼭 필요한 것 7 · 만들기 14 ·
 *             다음에 고칠 것 3 · 여유 3
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
const GROUP_KEY = "hai-thu-1";
const GROUP_LABEL = "목요일 1기";
/** 분반마다 다른 데이터 통 번호 (계획의 groups 와 같아야 한다) */
const CLASS_NO = 3;
const PERIOD = 1;

/**
 * 오늘 빼는 칸.
 *
 * 꼭 필요한 기능 ②③ 도 한 번 뺐다가 되돌렸다. 기능이 하나뿐이면 캔바에 넣는 프롬프트가
 * 한 줄이 되고, 그러면 뽑힌 화면이 너무 앙상해서 "어디가 어긋났나" 를 찾을 거리가 없다.
 * 오늘 수업의 본체가 그 찾기라, 셋을 다 받는다.
 */
const DROP = new Set(["_grill_note", "_grill_recap", "grill_a1", "grill_a2", "ai_review"]);

/** 캔바 초대 주소. 목요일 1기 것이 없으면 기본 주소로 물러난다 */
const CANVA_URL = process.env.CANVA_INVITE_THU_1 || process.env.CANVA_INVITE_URL || "";

/** 로그인을 첫 화면으로 올릴 때 쓸 안내 두 칸 */
function loginQuestions(): WorksheetQuestion[] {
  return [
    {
      key: "_login_note",
      phase: "wordquiz",
      label: "먼저 캔바에 들어갑니다",
      hint:
        "아래 단추를 누르고 [Microsoft로 계속하기] 를 고릅니다.\n" +
        "학교 계정으로 로그인해요 — 26 뒤에 내 학번 5자리를 붙입니다.\n" +
        "  예) 학번이 10104면 → 2610104@jangpyung.sen.ms.kr\n" +
        "비밀번호는 학교 계정 비밀번호예요.\n\n" +
        "비밀번호가 기억나지 않아도 괜찮습니다. 혼자 붙들고 있지 말고 손을 드세요 —\n" +
        "선생님이 그 자리에서 새로 만들어 줍니다. 오늘은 이것부터 하고 시작해요.",
      kind: "note",
      linkUrl: CANVA_URL,
      linkLabel: "캔바 열기 (새 창)",
      maxLength: 0,
    },
    {
      /*
       * 스스로 표시하게 한다. 스물두 명이 지금 어디쯤인지 교사가 눈으로 세려면
       * 그 시간에 초기화를 못 해 준다. 무엇보다 마지막 선택지가 **손을 드는 계기**다 —
       * 화요일에는 막힌 학생이 조용히 앉아 있었다.
       */
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

  /* ── 활동지 다시 짜기 ────────────────────────────────── */
  const original = plan.activity?.worksheet ?? [];
  const kept: WorksheetQuestion[] = [];

  for (const q of original) {
    if (DROP.has(q.key)) continue;

    // 로그인 안내는 앞으로 올렸으니 build 단계에서는 뺀다
    if (q.key === "_build_login") continue;

    const next: WorksheetQuestion = { ...q };

    // 분반 주소 표는 학생 화면에 내려보내지 않는다 (db.ts 의 resolveGroupLinks 와 같은 이유)
    if (next.linkUrlByGroup) {
      const picked = next.linkUrlByGroup[GROUP_KEY];
      delete next.linkUrlByGroup;
      if (picked) next.linkUrl = picked;
    }

    // ① 이 앞으로 빠졌으니 남은 단계의 번호를 당긴다
    if (next.key === "_build_make") next.label = "① 웹 앱 만들기";
    if (next.key === "_build_publish") next.label = "② 링크 가져오기";

    // AI 검토를 뺐으니 "AI가 물어본 것 중 하나를 골라" 라는 안내가 갈 곳이 없다
    if (next.key === "will_fix") {
      next.hint =
        "이 줄은 다음 시간 화면 맨 위에 그대로 뜹니다. 나에게 남기는 쪽지예요.\n" +
        "뽑힌 화면을 보면서 “이건 아닌데” 싶었던 것 하나면 됩니다.\n" +
        "아직 못 뽑았으면, 프롬프트를 다시 읽고 빠진 것 같은 것을 적으세요.";
    }

    kept.push(next);
  }

  const worksheet = [...loginQuestions(), ...kept];

  /* ── 오늘 날짜·코드 ──────────────────────────────────── */
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

  const live = (await db.collection("classSessions").get()).docs
    .map((d) => d.data() as { code: string; status: string; date: string })
    .filter((s) => s.status !== "ended" || s.date === today);
  const taken = new Set(live.map((s) => s.code));
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

  const id = `${today}__${PERIOD}__${GROUP_KEY}`;
  const existing = await db.collection("classSessions").doc(id).get();
  if (existing.exists) {
    const s = existing.data() as { code: string; status: string };
    console.error(`✗ ${id} 가 이미 있습니다 (코드 ${s.code}, ${s.status}).`);
    console.error("  대시보드에서 지운 뒤 다시 돌리거나, 그 수업을 그대로 쓰세요.");
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
    focusExempt: plan.focusExempt ?? [],

    // 오늘만 다른 것
    activity: { ...plan.activity, worksheet },
    phaseLabels: {
      ...(plan.phaseLabels ?? {}),
      wordquiz: "캔바 로그인",
      grill: "다음 시간에 고칠 것",
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

  console.log(`✓ ${GROUP_LABEL} ${PERIOD}교시 수업을 만들었습니다`);
  console.log(`   ${id}`);
  console.log(`   수업 코드 ${code} · 대기 상태 (대시보드에서 시작하세요)\n`);

  console.log("단계: 대기 → 캔바 로그인 → 오늘 할 일 → 문제 정의 → 꼭 필요한 것만 → 만들기 → 다음 시간에 고칠 것 → 회고");
  console.log("45분 — 로그인 10 · 안내 2 · 문제 6 · 줄이기 5 · 만들기 16 · 고칠 것 3 · 여유 3\n");

  console.log(`뺀 칸: ${[...DROP].join(", ")}`);
  console.log("서로 구경하기 단계는 넘기지 마세요 (링크가 몇 개 안 나옵니다).\n");

  const shown = CANVA_URL
    ? CANVA_URL.replace(/token=([^&]{4})[^&]*/, "token=$1…")
    : "없음 — 로그인 단추가 안 나옵니다";
  const which = process.env.CANVA_INVITE_THU_1 ? "목요일 1기 전용" : "⚠ 기본 주소 (목요일 1기 전용 주소 없음)";
  console.log(`캔바 초대 주소: ${shown}  [${which}]`);

  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
