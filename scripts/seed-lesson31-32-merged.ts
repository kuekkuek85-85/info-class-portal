/**
 * 반별 합본 계획 - 31차(리스트 개념) + 32차(마무리·수행평가 준비)를 한 차시(45분)에.
 *
 *   node --env-file=.env.local scripts/seed-lesson31-32-merged.ts --class 2          # 1-2: 계획 + 11/23 5교시 세션 반영
 *   node --env-file=.env.local scripts/seed-lesson31-32-merged.ts --class 4          # 1-4: 계획만 (11/25 세션은 아직 안 열림)
 *   ... --force    # 이미 들어온 학생이 있어도 세션에 반영(상태·단계·출석·답 유지)
 *
 * 교사 지시(2026-11-23): 1-2 는 11/23 5교시, 1-4 는 11/25 수업에서 31·32차를 다 끝내고 수행평가 안내까지 한다.
 * 두 반 모두 다음 수업이 33차로 당겨진다. 두 반 합본은 같은 구조다(1-4 도 30차를 끝까지 마쳐 같은 출발점).
 * 1-4 의 옛 32차 압축판(lesson32-c4, 미션① 없음)은 '32차 하나만 줄이기' 였고, 31차 개념을 함께 하는 합본에서는
 * 미션①(리스트로 정리)이 그 개념을 바로 써 보는 자리라 넣는다.
 *
 * ## 흐름 (약 43분)
 *   대기(타자)·마음 체크인 3 → ① 리스트 개념·확인 퀴즈(31차, problem) 6 → ② 리스트로 정리(32차 미션①, build) 8
 *   → ③ AI로 나만의 기능(32차 미션②, grill) 6 → 마이크로비트 총정리(mvp, 그림 두 장) 3 → 수행평가 안내(assessment, 탭 5개) 9
 *   → 성찰 한 페이지(reflection: [0] 실생활 속 불편 · [1] 써 보고 싶은 입력·출력) 5 → UNO
 *
 * ## 뺀 것
 *   31차 미션 ①(변수 하나하나 빈칸, 8분) - 그 완성 코드가 32차 미션① 왼쪽 비교 코드로 그대로 보인다.
 *   31차 안내 보드(오늘 할 일 탭)·31차 성찰 질문 - 하나로 합친 안내 글과 32차 성찰로 대신.
 *   (총정리는 problem 칸을 리스트 개념이 써서 mvp 칸에 둔다. 32차의 입력·출력 고르기는 성찰 글쓰기 [1] 로 합쳤다.)
 *
 * ## 이어짐
 *   활동 ID 는 31·32차와 같은 microbit-makecode, 키도 mb31_*·mb32_* 그대로 - 33차 echo(mb32_pa_problem·want_in·out)가 이어진다.
 *   31차 문항은 운영 31차 계획(오늘 range 표현 뺀 판)에서 key 로 복사한다. 32차는 lesson32-plan.ts(오늘 수정본).
 */

import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import type { LessonPlan, WorksheetQuestion } from "../src/lib/types.ts";
import { MISSION_AI, MISSION_LIST, PLAN, RECAP } from "./lesson32-plan.ts";

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

const FORCE = process.argv.includes("--force");
const classAt = process.argv.indexOf("--class");
const CLASS_NO = Number(classAt !== -1 ? process.argv[classAt + 1] : NaN);
/** 반별 설정. sessionId 가 null 이면 세션은 아직 없다(계획만 넣는다). */
const TARGETS: Record<number, { planDocId: string; variant: string; sessionId: string | null }> = {
  2: { planDocId: "lesson31-32-c2", variant: "c2", sessionId: "2026-11-23__5__2" },
  4: { planDocId: "lesson31-32-c4", variant: "c4m", sessionId: null },
};
const TARGET = TARGETS[CLASS_NO];
if (!TARGET) {
  console.error("✗ --class 2 또는 --class 4 를 붙이세요.");
  process.exit(1);
}
const PLAN_DOC_ID = TARGET.planDocId;
const SESSION_ID = TARGET.sessionId;
const LESSON31_ID = "9tyBPCAlqK5s4divI3yn";
const LIST31_KEYS = ["_mb31_list_note", "mb31_list_q1", "mb31_list_q2", "mb31_list_q3"];

async function buildPlan() {
  const p31 = (await db.collection("lessonPlans").doc(LESSON31_ID).get()).data() as LessonPlan | undefined;
  if (!p31) throw new Error("31차 계획이 없습니다.");
  const list31 = LIST31_KEYS.map((k) => (p31.activity?.worksheet ?? []).find((q) => q.key === k));
  if (list31.some((q) => !q)) throw new Error("31차 리스트 개념 문항을 못 찾았습니다.");
  const concept = (list31 as WorksheetQuestion[]).map((q) => ({ ...q, phase: "problem" as const }));

  // 마이크로비트 총정리(mvp 단계) - 32차 총정리 그림 두 장(안내 글 그대로). 수행평가 안내와 다른 단계로 나눈다(교사 지시 2026-11-23).
  const recap = RECAP.filter((q) => q.kind === "note").map((q) => ({ ...q, phase: "mvp" as const }));

  const plan: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> & { variant: string } = {
    ...PLAN,
    lessonNo: 32,
    variant: TARGET.variant,
    title: `똥피하기 ④+⑤ 합본 - 리스트·마무리·수행평가 준비 (1-${CLASS_NO}반)`,
    focusExempt: ["waiting", "build", "grill"],
    phaseLabels: {
      problem: "① 리스트 개념",
      build: "② 리스트로 정리",
      grill: "③ AI로 나만의 기능",
      mvp: "마이크로비트 총정리",
      assessment: "수행평가 안내",
    },
    phaseOrder: ["waiting", "problem", "build", "grill", "mvp", "assessment", "reflection"],
    assessment: PLAN.assessment,
    activity: {
      ...PLAN.activity!,
      worksheetIntro: {
        heading: "오늘은 31·32차 합본 - 리스트부터 수행평가 준비까지",
        body:
          "① 리스트 개념 → ② 리스트로 정리 → ③ AI로 나만의 기능 → 총정리 → 수행평가 안내 → 성찰\n" +
          "다 한 뒤 성찰을 내면 UNO 가 열려요.",
      },
      worksheet: [...concept, ...MISSION_LIST, ...MISSION_AI, ...recap],
    },
  };
  return plan;
}

async function main(): Promise<void> {
  const plan = await buildPlan();
  const ref = db.collection("lessonPlans").doc(PLAN_DOC_ID);
  const before = await ref.get();
  const now = Date.now();
  await ref.set({ ...plan, createdAt: before.exists ? (before.data()?.createdAt ?? now) : now, updatedAt: now });
  console.log(`${before.exists ? "↻ 갱신" : "＋ 등록"} - ${plan.title} (${PLAN_DOC_ID})`);
  console.log(`단계: ${plan.phaseOrder!.join(" → ")}`);
  console.log(plan.activity!.worksheet!.map((q) => `   [${q.phase}] ${q.kind} ${q.key}`).join("\n"));

  // 그 반 세션 - 계획 스냅샷만 바꾼다(상태·단계·출석·답은 그대로). 세션이 아직 없으면 계획만.
  if (!SESSION_ID) {
    console.log(`· 1-${CLASS_NO} 세션은 아직 열지 않았습니다. 열 때 이 계획(${PLAN_DOC_ID})을 씁니다.`);
    process.exit(0);
  }
  const sref = db.collection("classSessions").doc(SESSION_ID);
  const s = (await sref.get()).data() as { status?: string; classNo?: number; groupKey?: string } | undefined;
  if (!s || s.classNo !== CLASS_NO || s.groupKey) throw new Error(`${SESSION_ID} 가 1-${CLASS_NO} 정규 세션이 아닙니다.`);
  if (s.status === "ended") {
    console.log(`· ${SESSION_ID} - 이미 끝난 수업이라 건드리지 않습니다.`);
    process.exit(0);
  }
  const joined = await db.collection("attendance").where("sessionId", "==", SESSION_ID).limit(1).get();
  if (!joined.empty && !FORCE) {
    console.log(`· ${SESSION_ID} - 이미 학생이 들어와 있어 건드리지 않습니다 (--force 로 덮어쓸 수 있습니다)`);
    process.exit(0);
  }
  await sref.set(
    {
      lessonPlanId: PLAN_DOC_ID,
      lessonNo: plan.lessonNo,
      title: plan.title,
      moodCheckEnabled: plan.moodCheckEnabled,
      hideDoneButton: plan.hideDoneButton,
      game: plan.game,
      gameExplainer: plan.gameExplainer,
      rewardGame: plan.rewardGame,
      progress: FieldValue.delete(),
      progressChecks: FieldValue.delete(),
      quiz: FieldValue.delete(),
      assessment: plan.assessment,
      video: plan.video,
      reflectionQuestions: plan.reflectionQuestions,
      reflectionPublic: plan.reflectionPublic,
      reflectionAnswerKey: plan.reflectionAnswerKey,
      focusExempt: plan.focusExempt,
      phaseOrder: plan.phaseOrder,
      freeNavigation: plan.freeNavigation,
      activity: plan.activity,
    },
    { merge: true },
  );
  await sref.update({ phaseLabels: plan.phaseLabels });
  console.log(`✓ ${SESSION_ID} 에 반영 (상태·단계·출석 유지)`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
