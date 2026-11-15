/**
 * 「인간과 인공지능」 2차시(= 2기에게는 1차시) — 목요일 2기 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-hai2-thu2.ts 2026-10-29 1
 *                                                         └날짜   └교시
 *
 * ## 무엇을 재사용하는가
 *
 * 화요일 2기 1차시(open-hai2-tue2.ts, 코드 11) 구성을 **그대로 복제**한 것이다.
 * 포털상 1기의 첫 수업 lessonNo 102("문제 찾기부터 딸깍까지")를 2기 1차시로 쓰고,
 * 로그인을 첫 화면으로 올린 개선판 + 대기 게임 제거·마음 체크인 유지·캔바 학번 자동계정
 * 복사(copyText)·phaseOrder(기분·서로구경 단계 숨김)·새 회고 질문까지 화요일과 동일하다.
 *
 * 바꾼 것은 **분반(요일)뿐**이다:
 *   GROUP_KEY  hai-tue-2 → hai-thu-2
 *   GROUP_LABEL 화요일 2기 → 목요일 2기
 *   CLASS_NO   2 → 4 (계획 groups 의 목요일 2기 통 번호)
 *   CANVA      화요일 2기 토큰 → 목요일 2기 토큰(CANVA_INVITE_THU_2, 없으면 기본 주소)
 *   날짜       실행 시각의 "오늘" → 인자로 받은 날짜(기본은 KST 오늘)
 *
 * 제출 방식(build_url 게시 링크)은 화요일과 동일하게 **그대로** 둔다.
 *
 * ## 반드시 지키는 두 가지 (open-hai3-tue1.ts 와 같은 이유)
 *  1. 분반별 캔바 주소 표(linkUrlByGroup)는 학생 화면에 안 내려보낸다 — 남의 분반 토큰이 샌다.
 *  2. 코드가 이미 쓰이고 있지 않은지 보고 고른다.
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

const LESSON_NO = 102;
const GROUP_KEY = "hai-thu-2";
const GROUP_LABEL = "목요일 2기";
/** 분반마다 다른 데이터 통 번호 (계획의 groups 와 같아야 한다) */
const CLASS_NO = 4;

/** KST 오늘 (서버가 UTC 든 KST 든 epoch 기준이라 결과가 같다) */
const KST_TODAY = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const DATE = process.argv[2] ?? KST_TODAY;
const PERIOD = Number(process.argv[3] ?? 1);

/**
 * 오늘 빼는 칸 (open-hai2-thu1.ts 와 동일).
 * 링크가 있어야 성립하는 AI 검토 묶음을 덜어내 캔바에 시간을 몰아준다.
 * 꼭 필요한 기능 셋은 그대로 둔다 — 하나면 뽑힌 화면이 앙상해 "어디가 어긋났나"를 못 찾는다.
 */
const DROP = new Set(["_grill_note", "_grill_recap", "grill_a1", "grill_a2", "ai_review"]);

/** 캔바 초대 주소. 목요일 2기 전용이 없으면 기본 주소로 물러난다 */
const CANVA_URL = process.env.CANVA_INVITE_THU_2 || process.env.CANVA_INVITE_URL || "";

/** 로그인을 첫 화면으로 올릴 때 쓸 안내 두 칸 */
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

  /* ── 활동지 다시 짜기 ────────────────────────────────── */
  const original = plan.activity?.worksheet ?? [];
  const kept: WorksheetQuestion[] = [];

  for (const q of original) {
    if (DROP.has(q.key)) continue;

    // 로그인 안내는 앞으로 올렸으니 build 단계에서는 뺀다
    if (q.key === "_build_login") continue;

    const next: WorksheetQuestion = { ...q };

    // 분반 주소 표는 학생 화면에 내려보내지 않는다
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

  /* ── 코드 정하기 + (있으면) 강제 재오픈 ──────────────────
   *
   * 교사 방침: 이 과목 세션은 수정이 생길 때마다 --force 로 강제 재오픈해 반영한다.
   *   node ... scripts/open-hai2-thu2.ts 2026-10-29 1 --force
   *
   * 안전장치: 재오픈 대상 통(classNo)에 **실제 학생 답**이 있으면 멈춘다 — 테스트 흔적만
   * 지운다. 세션 범위 기록(출석·기분·회고·퀴즈, 문서 ID = 세션ID__학번)만 지우고,
   * 작품(artifacts, activityId__학번)은 답이 없으면 그대로 둔다(빈 것은 재입장 시 재사용).
   */
  const FORCE = process.argv.includes("--force");
  const id = `${DATE}__${PERIOD}__${GROUP_KEY}`;
  const existing = await db.collection("classSessions").doc(id).get();

  let code = "";

  if (existing.exists) {
    const ex = existing.data() as { code: string; status: string; activity?: { activityId?: string } };
    if (!FORCE) {
      console.error(`✗ ${id} 가 이미 있습니다 (코드 ${ex.code}, ${ex.status}).`);
      console.error("  강제 재오픈하려면 --force 를 붙이세요 (테스트/빈 세션만). 대시보드에서 지워도 됩니다.");
      process.exit(1);
    }

    const actId = ex.activity?.activityId ?? plan.activity?.activityId;
    const acts = actId
      ? await db.collection("artifacts").where("activityId", "==", actId).where("classNo", "==", CLASS_NO).get()
      : null;
    const withAns = acts
      ? acts.docs.filter((d) =>
          Object.values((d.data() as { answers?: Record<string, unknown> }).answers ?? {}).some(
            (v) => String(v ?? "").trim() !== "",
          ),
        ).length
      : 0;
    if (withAns > 0) {
      console.error(`✗ 강제 재오픈 중단 — classNo ${CLASS_NO} 통에 실제 답이 있는 작품 ${withAns}개.`);
      console.error("  테스트 흔적이 아니라 수업 데이터일 수 있습니다. 코디네이터에게 먼저 알리세요.");
      process.exit(1);
    }

    for (const col of ["attendance", "moodEntries", "reflections", "quizAnswers"]) {
      const snap = await db
        .collection(col)
        .where(FieldPath.documentId(), ">=", `${id}__`)
        .where(FieldPath.documentId(), "<", `${id}__`)
        .get();
      for (const d of snap.docs) await d.ref.delete();
      if (snap.size) console.log(`  정리: ${col} ${snap.size}건 삭제`);
    }

    code = String(ex.code); // 코드 유지
    await existing.ref.delete();
    await db.collection("codeReservations").doc(`${DATE}__${code}`).delete().catch(() => {});
    await db.collection("codeReservations").doc(`${DATE}__${code}`).create({ date: DATE, code, createdAt: Date.now() });
    console.log(`  강제 재오픈 — 코드 ${code} 유지, 테스트 세션 삭제`);
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

    // 계획에서 복사하는 것 (snapshotOf 와 같은 목록)
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

    // 오늘만 다른 것
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
    rehearsal: false,
    demo: false,
    freeNavigation: false,
    teacherNote: "",
    startedAt: null,
    endedAt: null,
    createdAt: Date.now(),
  });

  // 읽어서 확인
  const back = (await db.collection("classSessions").doc(id).get()).data() as
    | Record<string, unknown>
    | undefined;
  const dumped = JSON.stringify(back?.activity ?? {});

  console.log(`✓ ${GROUP_LABEL} ${PERIOD}교시 수업을 만들었습니다`);
  console.log(`   ${id}`);
  console.log(`   수업 코드 ${code} · 대기 상태 (대시보드에서 시작하세요)`);
  console.log(`   날짜 ${DATE} · 데이터 통 classNo ${CLASS_NO} · 되돌아가기 ${back?.freeNavigation ? "켬" : "끔"}`);
  console.log(`   남의 분반 토큰 실림: ${dumped.includes("linkUrlByGroup") ? "예 ← 문제" : "아니오"}\n`);

  console.log("단계: 대기 → 캔바 로그인 → 오늘 할 일 → 문제 정의 → 꼭 필요한 것만 → 만들기 → 다음 시간에 고칠 것 → 회고");
  console.log("45분 — 로그인 10 · 안내 2 · 문제 6 · 줄이기 5 · 만들기 16 · 고칠 것 3 · 여유 3\n");
  console.log(`뺀 칸: ${[...DROP].join(", ")}`);

  const shown = CANVA_URL
    ? CANVA_URL.replace(/token=([^&]{4})[^&]*/, "token=$1…")
    : "없음 — 로그인 단추가 안 나옵니다";
  const which = process.env.CANVA_INVITE_THU_2 ? "목요일 2기 전용" : "⚠ 기본 주소 (목요일 2기 전용 주소 없음)";
  console.log(`캔바 초대 주소: ${shown}  [${which}]`);

  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
