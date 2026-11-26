/**
 * 34차시 계획 등록 - 「수행평가 ② 피지컬 컴퓨팅 프로젝트: 설계 다듬기와 구현」.
 *
 *   node --env-file=.env.local scripts/seed-lesson34.ts            (계획 + 아무도 안 들어온 열린 수업)
 *   node --env-file=.env.local scripts/seed-lesson34.ts --force    (이미 들어온 수업도 내용만 덮어씀)
 *
 * ## 흐름 (2026-11-27 교사 결정으로 다시 짬)
 *   대기(타자)·마음 체크인 → ① 문제 발견 → ② 문제 정의 → ③ 추상화 → ④ 알고리즘 (33차 단계 그대로, 같은 키라
 *   지난 시간 답이 그대로 불러와지고 이어서 고친다) → ⑤ 구현(바이브 코딩 → MakeCode 확인 → 공유 링크·구현·수정 내용)
 *   → 마무리(성찰 3문항 → 「선생님께 검토 받기」 → 바로 UNO. 선생님 피드백은 수업 뒤에 준다).
 *
 * ## 교사 결정
 *  · 붙여넣기·우클릭 차단은 ①~④·마무리만(noClipboardPhases). ⑤ 구현은 프롬프트에 앞 단계 내용을 옮기고
 *    코드·공유 링크를 붙여넣어야 하므로 연다.
 *  · ⑤ 구현 위에 ①~④ 답을 작은 글씨로 모아 보인다(echoCompact, 「전부 복사하기」). 앞 단계를 고치면 바로 바뀐다.
 *  · 「선생님께 검토 받기」는 요청하면 바로 게임이 열린다(stepReview.instantUnlock). 교사 대시보드 단계별 피드백(①~⑤)은 그대로.
 *  · 빼기: 지난 시간 단계, 동작 한 줄, AI 검토 기록, 오류 수정 기록, 예시 코드, 개념 고르기, 최종 코드, 사진, 확장 도전.
 *
 * ## 키 (artifacts/microbit-makecode__학번)
 *  33차 mb33_* 그대로 · mb34_vibe(바이브 코딩 기록) · mb34_link · mb34_impl · mb34_reflect(마무리 성찰 한 벌)
 */

import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import type { LessonPlan, PhaseContent, WorksheetQuestion } from "../src/lib/types.ts";
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
const LESSON_NO = 34;
const FORCE = process.argv.includes("--force");
const ACTIVITY_ID = "microbit-makecode";

/** 빈 출발 코드(빈 함수엔 pass) */
const EMPTY_START = `def on_forever():
    pass
basic.forever(on_forever)`;

/* ── ⑤ 구현 (worksheet 단계) ── */
const STEP5: WorksheetQuestion[] = [
  {
    key: "_mb34_impl_note",
    phase: "worksheet",
    label: "⑤ 구현 - 바이브 코딩으로 만들기",
    hint:
      "①~④ 에 쓴 내용을 보며 프롬프트를 직접 써서 바이브 코딩해요.\n" +
      "받은 코드는 MakeCode 'Python' 에 붙여 돌려 봐요. 실물(마이크로비트)로도 확인할 수 있습니다.\n" +
      "다 되면 MakeCode 에서 '공유' 를 눌러 링크를 아래에 붙여넣어요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_mb34_recap",
    phase: "worksheet",
    label: "①~④ 에 쓴 내용 (앞 단계를 고치면 여기도 바뀌어요)",
    hint: "",
    kind: "echo",
    echoCompact: true,
    echoKeys: [
      { key: "mb33_summary", label: "한 줄 소개" },
      { key: "mb33_who", label: "누가" },
      { key: "mb33_when", label: "어떤 상황에서" },
      { key: "mb33_what", label: "무엇이 불편" },
      { key: "mb33_state_now", label: "초기 상태" },
      { key: "mb33_state_goal", label: "목표 상태" },
      { key: "mb33_in", label: "입력(센서)" },
      { key: "mb33_out", label: "출력(액추에이터)" },
      { key: "mb33_func", label: "꼭 필요한 기능" },
      { key: "mb33_algo", label: "알고리즘" },
    ],
    maxLength: 0,
  },
  {
    key: "mb34_vibe",
    phase: "worksheet",
    label: "바이브 코딩",
    hint: "한 번에 하나씩 부탁해도 되고, 알고리즘을 통째로 부탁해도 돼요.",
    kind: "vibe_code",
    vibeTarget: "microbit",
    vibeBaseCode: EMPTY_START,
    vibeContinue: true,
    vibeNoun: "내 프로젝트",
    vibePromptLabel: "프롬프트 - 무엇을 만들어 달라고 할까요?",
    vibeSendLabel: "바이브 코딩 하기",
    vibePlaceholder: "전 단계의 내용들을 참고하여 직접 프롬프트를 작성하세요.",
    maxLength: 0,
  },
  {
    key: "mb34_link",
    phase: "worksheet",
    label: "MakeCode 공유 링크 (필수)",
    hint: "MakeCode 오른쪽 위 '공유' → 링크 복사 → 여기에 붙여넣어요.",
    kind: "text",
    maxLength: 300,
  },
  {
    key: "mb34_impl",
    phase: "worksheet",
    label: "오늘 구현한 내용과 수정한 내용 (필수)",
    hint: "바이브 코딩으로 무엇을 부탁했고, 돌려 보고 무엇을 고쳤는지 내 말로 써요.",
    kind: "long",
    maxLength: 1000,
  },
];

const WORKSHEET: WorksheetQuestion[] = [...WORKSHEET33, ...STEP5];

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "수행평가 ② 피지컬 컴퓨팅 프로젝트 - 설계 다듬기와 구현",
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
  // 보상 = UNO. 「선생님께 검토 받기」를 누르면 바로 열린다(instantUnlock, 교사 결정 2026-11-27).
  rewardGame: {
    heading: "수고했어요! 🃏",
    body: "검토 요청을 보냈어요. 잠깐 UNO 로 쉬어요. 선생님이 부르면 돌아오세요.",
    url: "https://uno-game-gilt.vercel.app/",
    requires: [],
  },

  progress: empty(),
  assessment: empty(),
  video: empty(),

  reflectionQuestions: [
    "기대 효과와 장점 - 내 작품이 있으면 누가, 어떻게 좋아질까요?",
    "확장·개선 아이디어 - 더 좋게 만들려면 무엇을 바꾸거나 더할까요?",
    "후기 - 두 시간 동안 여러 번 검토를 받으며 기획·설계하고, 바이브 코딩으로 만들어 테스트해 봤어요. 어땠나요?",
  ],
  reflectionPublic: false,
  reflectionAnswerKey: "mb34_reflect",

  focusExempt: ["waiting", "worksheet"],
  phaseLabels: {
    problem: "① 문제 발견",
    mvp: "② 문제 정의",
    build: "③ 추상화",
    grill: "④ 알고리즘",
    worksheet: "⑤ 구현",
    reflection: "마무리",
  },
  phaseOrder: ["waiting", "problem", "mvp", "build", "grill", "worksheet", "reflection"],
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "피지컬 컴퓨팅 프로젝트 ② 다듬고 구현하기",
      body: "① 문제 발견 → ② 문제 정의 → ③ 추상화 → ④ 알고리즘 → ⑤ 구현 → 마무리\n지난 시간에 쓴 답이 그대로 있어요. 고치고 이어서 해요.",
    },
    worksheet: WORKSHEET,
    galleryEnabled: false,
    sourcesEnabled: false,
    noClipboard: true,
    noClipboardPhases: ["problem", "mvp", "build", "grill", "reflection"],
    stepReview: {
      instantUnlock: true,
      steps: [
        ...STEPS33,
        {
          phase: "worksheet",
          label: "⑤ 구현",
          fields: [
            { key: "mb34_vibe", label: "바이브 코딩 프롬프트" },
            { key: "mb34_link", label: "MakeCode 공유 링크", minLines: 1 },
            { key: "mb34_impl", label: "구현·수정 내용", minLines: 1, minChars: 10 },
          ],
        },
      ],
    },
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
    await doc.ref.set({ ...PLAN, updatedAt: now, quiz: FieldValue.delete() }, { merge: true });
    // 통째로 바꿔야 하는 맵(옛 단계 이름·옛 활동지 남김 방지)
    await doc.ref.update({ phaseLabels: PLAN.phaseLabels, activity: PLAN.activity });
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
      // 내용만 바꾼다 - 상태·단계·되돌아가기·코드·출석은 그대로
      await session.ref.set(
        {
          title: PLAN.title,
          moodCheckEnabled: PLAN.moodCheckEnabled,
          hideDoneButton: PLAN.hideDoneButton,
          game: PLAN.game,
          rewardGame: PLAN.rewardGame,
          assessment: PLAN.assessment,
          reflectionQuestions: PLAN.reflectionQuestions,
          reflectionAnswerKey: PLAN.reflectionAnswerKey,
          focusExempt: PLAN.focusExempt,
          phaseOrder: PLAN.phaseOrder,
        },
        { merge: true },
      );
      await session.ref.update({ phaseLabels: PLAN.phaseLabels, activity: PLAN.activity });
      applied += 1;
    }
    console.log(`   열린 수업 ${applied}개에 반영`);
  }
  console.log("단계: 대기 → 기분 → ① → ② → ③ → ④ (33차 그대로) → ⑤ 구현 → 마무리(검토 받기 → 바로 UNO).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
