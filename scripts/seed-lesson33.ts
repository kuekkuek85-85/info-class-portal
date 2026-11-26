/**
 * 33차시 계획 등록 - 「수행평가 ① 피지컬 컴퓨팅 프로젝트: 문제 찾기와 설계」 (교사 지시 전 실행 금지).
 *
 *   node --env-file=.env.local scripts/seed-lesson33.ts
 *   node --env-file=.env.local scripts/seed-lesson33.ts --force
 *
 * 설계: docs/superpowers/specs/2026-11-19-info-lesson33-34-assessment-design.md (교사 결정 2026-11-19 반영)
 *
 * ## 흐름 (2026-11-25 교사 피드백으로 다시 짬, 40분 가정)
 *   대기·체크인 → 안내 → ① 문제 발견(problem) → ② 문제 정의(mvp: 초기·목표 상태) → ③ 추상화(build: 센서·액추에이터·꼭 필요한 기능)
 *   → ④ 알고리즘(grill: 자연어 단계) → 마무리(reflection: 성찰 → 선생님께 검토 받기 → 단계별 피드백·잘했어요 → UNO)
 *   단계마다 AI 검토(ai_review, 답 없이 질문만, 단계당 3번), 화면 전체 복사·붙여넣기 막기(noClipboard),
 *   최소 분량(stepReview, 2026-11-25 2차 피드백): ① 뜻·사례 3·누가·상황·불편 각 1줄 ② 상태 각 1줄·5자 ③ 기능 1개+ 각 5자 ④ 2줄·20자.
 *
 * ## 키 (artifacts/microbit-makecode__학번 - 34차가 echo 로 이어받는다)
 *  mb33_pc_def · mb33_pc_case1~3 · mb33_who · mb33_when · mb33_what · mb33_state_now · mb33_state_goal · mb33_in · mb33_out · mb33_func(list) · mb33_algo
 *  · AI 검토 mb33_ai1~4 · mb33_summary(성찰 한 벌 저장). 32차 mb32_pa_problem · mb32_want_in·out 을 echo 한다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import type { LessonPlan, PhaseContent, WorksheetQuestion } from "../src/lib/types.ts";
import { PLAN as PLAN32 } from "./lesson32-plan.ts";
import { STEPS33, WORKSHEET33 } from "./lesson33-steps.ts";

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
    privateKey: requiredEnv("FIREBASE_PRIVATE_KEY")
      .replace(/^["']|["']$/g, "")
      .replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const LESSON_PLANS = "lessonPlans";
const LESSON_NO = 33;
const FORCE = process.argv.includes("--force");
const ACTIVITY_ID = "microbit-makecode";

/*
 * 2026-11-25 교사 피드백으로 다시 짰다 (수행평가 ① 생각하는 차시, 40분 가정).
 *   ① 문제 발견(problem) → ② 문제 정의(mvp) → ③ 추상화(build) → ④ 알고리즘(grill) → 마무리(reflection)
 *   · 단계마다 「AI에게 검토 받기」(답·완성 문장 없이 방향 질문만, 단계당 3번까지)
 *   · 화면 전체 복사·붙여넣기 막기(noClipboard), 단계마다 최소 분량(stepReview)
 *   · 마무리: 성찰 제출 → 「선생님께 검토 받기」 → 선생님이 단계별 피드백이나 「잘했어요」 → UNO
 * 구현(포털 AI 코드 받기)은 34차로 미룬다. 2차 피드백: 불편을 누가·상황·무엇 세 칸(mb33_who·when·what)으로, 비슷한 기기 칸 삭제,
 * 새 키 mb33_state_now · mb33_state_goal · mb33_func · mb33_algo · AI 검토 mb33_ai1~4.
 */

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/** 32차 안내 탭에서 채점 기준 두 탭을 그대로 가져온다(평가 계획 문구). */
const RUBRIC_TABS = (PLAN32.assessment?.tabs ?? []).filter((t) => t.label.startsWith("채점"));

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "수행평가 ① 피지컬 컴퓨팅 프로젝트 - 문제 발견부터 알고리즘까지",
  moodCheckEnabled: true,
  hideDoneButton: true,

  game: {
    heading: "기다리는 동안 - 파이썬 타자 연습",
    body:
      "수업이 시작되길 기다리는 동안 파이썬 타자 연습을 해 봐요.\n" +
      "아래 단추로 새 탭에서 열려요. 수업이 시작되면 돌아오세요.",
    url: "link:https://python-typing-helper.vercel.app/",
  },
  gameExplainer: empty(),
  // 보상 = UNO. 성찰 제출 → 선생님 검토(단계별 피드백이나 잘했어요)가 오면 열린다(교사 결정 2026-11-25).
  rewardGame: {
    heading: "수고했어요! 🃏",
    body: "선생님 검토가 끝났어요. 잠깐 UNO 로 쉬어요. 선생님이 부르면 돌아오세요.",
    url: "https://uno-game-gilt.vercel.app/",
    requires: [],
  },

  progress: empty(),

  assessment: {
    heading: "수행평가 ① - 오늘은 생각하고 설계하기",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘 할 일",
        subtitle: "네 단계, 단계마다 AI 검토 → 마지막에 선생님 검토",
        note: "복사·붙여넣기는 안 돼요. 내 말로 직접 써요.",
        rows: [
          { label: "① 문제 발견", value: "피지컬 컴퓨팅 뜻 · 사례 3개 찾기 → 누가 · 어떤 상황 · 무엇이 불편" },
          { label: "② 문제 정의", value: "초기 상태(지금) → 목표 상태(해결된 모습)" },
          { label: "③ 추상화", value: "꼭 필요한 센서 · 액추에이터 · 기능(1개 이상)만 골라내기" },
          { label: "④ 알고리즘", value: "전체 흐름을 말로, 번호를 붙여 차례대로 (2줄 이상)" },
        ],
        highlights: [],
      },
      ...RUBRIC_TABS,
      {
        label: "AI 규칙",
        subtitle: "33~34차 모두",
        note: "보낸 말과 받은 답은 기록되고 선생님이 볼 수 있어요.",
        rows: [],
        highlights: [
          "포털 AI만 써요. 다른 AI 사이트(제미나이·챗GPT 등)는 안 돼요.",
          "AI 검토는 답을 주지 않아요. 받은 질문을 보고 내 글을 고쳐요.",
          "개인정보는 넣지 않아요.",
        ],
      },
    ],
  },

  video: empty(),

  // 마무리 - 한 줄 소개는 mb33_summary 에도 저장돼 34차에서 다시 보인다.
  reflectionQuestions: ["오늘 정한 내 프로젝트를 한 줄로 소개해요. (다음 시간에 다시 보여 줘요)"],
  reflectionPublic: false,
  reflectionAnswerKey: "mb33_summary",

  focusExempt: ["waiting"],
  phaseLabels: {
    assessment: "안내",
    problem: "① 문제 발견",
    mvp: "② 문제 정의",
    build: "③ 추상화",
    grill: "④ 알고리즘",
    reflection: "마무리",
  },
  phaseOrder: ["waiting", "assessment", "problem", "mvp", "build", "grill", "reflection"],
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "피지컬 컴퓨팅 프로젝트 ① 생각하고 설계하기",
      body: "① 문제 발견 → ② 문제 정의 → ③ 추상화 → ④ 알고리즘 → 마무리\n단계마다 AI 검토를 받고, 마지막에 선생님께 검토를 받아요.",
    },
    worksheet: WORKSHEET33,
    galleryEnabled: false,
    sourcesEnabled: false,
    noClipboard: true,
    stepReview: { steps: STEPS33 },
  },
};
async function main(): Promise<void> {
  const found = await db.collection(LESSON_PLANS).where("lessonNo", "==", LESSON_NO).get();
  const mine = found.docs.filter((d) => !(d.data() as { variant?: string }).variant);
  const now = Date.now();
  if (mine.length === 0) {
    const ref = await db.collection(LESSON_PLANS).add({ ...PLAN, createdAt: now, updatedAt: now });
    console.log(`＋ 등록 - ${PLAN.title} (${ref.id})`);
  } else {
    const doc = mine[0];
    await doc.ref.set(
      { ...PLAN, updatedAt: now, quiz: FieldValue.delete() },
      { merge: true },
    );
    await doc.ref.update({ phaseLabels: PLAN.phaseLabels });
    console.log(`↻ 갱신 - ${PLAN.title} (${doc.id})`);

    const live = await db
      .collection("classSessions")
      .where("lessonNo", "==", LESSON_NO)
      .where("status", "in", ["scheduled", "active"])
      .get();
    let applied = 0;
    for (const session of live.docs.filter((s) => (s.data() as { lessonPlanId?: string }).lessonPlanId === doc.id)) {
      const joined = await db.collection("attendance").where("sessionId", "==", session.id).limit(1).get();
      if (!joined.empty && !FORCE) {
        console.log(`· ${session.id} - 이미 학생이 들어와 있어 건드리지 않습니다 (--force 로 덮어쓸 수 있습니다)`);
        continue;
      }
      await session.ref.set(
        {
          title: PLAN.title,
          moodCheckEnabled: PLAN.moodCheckEnabled,
          hideDoneButton: PLAN.hideDoneButton,
          game: PLAN.game,
          assessment: PLAN.assessment,
          reflectionQuestions: PLAN.reflectionQuestions,
          reflectionAnswerKey: PLAN.reflectionAnswerKey,
          focusExempt: PLAN.focusExempt,
          phaseOrder: PLAN.phaseOrder,
          freeNavigation: PLAN.freeNavigation,
          activity: PLAN.activity,
          rewardGame: PLAN.rewardGame,
        },
        { merge: true },
      );
      await session.ref.update({ phaseLabels: PLAN.phaseLabels });
      applied += 1;
    }
    console.log(`   열린 수업 ${applied}개에 반영`);
  }
  console.log("단계: 대기 → 기분 → 안내 → ① 문제 발견 → ② 문제 정의 → ③ 추상화 → ④ 알고리즘 → 마무리(성찰 → 선생님 검토 → UNO).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
