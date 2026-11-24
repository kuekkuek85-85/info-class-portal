/**
 * 34차시 계획 등록 - 「수행평가 ② 피지컬 컴퓨팅 프로젝트: 구현과 성찰」 (교사 지시 전 실행 금지).
 *
 *   node --env-file=.env.local scripts/seed-lesson34.ts
 *   node --env-file=.env.local scripts/seed-lesson34.ts --force
 *
 * 설계: docs/superpowers/specs/2026-11-19-info-lesson33-34-assessment-design.md (교사 결정 2026-11-19 반영)
 *
 * ## 흐름 (45분) - 34차 = 만드는 차시 + 성찰
 *   대기·체크인 3 → 지난 시간(problem) 3: 33차 문제·부품·입력·처리·출력 표·한 줄 소개 echo
 *   → ③ 구현 완성(grill) 20: 포털 AI 이어서(33차 마지막 코드에서) + AI 검토 기록 + 오류 수정 기록 + 예시 코드
 *   → 제출(build) 8: MakeCode 공유 링크(필수) · 동작 한 줄(필수) · 넣은 개념 고르기와 어디에 썼나 · 코드(선택) · 사진(선택)
 *        + 확장 도전(먼저 끝낸 학생): 제출본은 그대로 두고 별도 키(mb34_ext_*)에서 기능 하나 더 붙이기
 *   → ④ 성찰(worksheet) 8: 기대 효과·장점 / 확장·개선 아이디어(확장 도전 결과를 미리 채움)
 *
 * ## 교사 결정
 *  · 보상 게임 없음. 먼저 끝낸 학생은 '확장 도전'(교사 확정 2026-11-19). createAI 는 수행평가 뒤 수업에서.
 *  · 최종 제출 = MakeCode 공유 링크(필수, 학교망에서 막히지 않음 - 교사 확인) + 동작 한 줄 설명(필수).
 *    코드 붙여넣기(6000자)·사진은 선택. 코드 칸은 채점 화면에서 바로 보기 좋아서 남긴다.
 *  · 되돌아가기 off 라 모두 같은 단계에 있다 - 확장 도전은 제출과 같은 단계 아래에 둔다.
 *
 * ## 키 (학번별 공유 답안 - 채점 화면이 32~34차를 한 사람 단위로 모아 읽는다)
 *  mb34_vibe · mb34_ai_log · mb34_debug · mb34_link · mb34_works · mb34_concepts · mb34_concepts_where ·
 *  mb34_code · mb34_photo · mb34_ext_vibe · mb34_ext_idea · mb34_effect · mb34_extend
 */

import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import type { LessonPlan, PhaseContent, WorksheetQuestion } from "../src/lib/types.ts";
import { exampleBlocks } from "./microbit-examples.ts";

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

/** 33차와 같은 빈 출발 코드(빈 함수엔 pass). 보통은 '이어서' 로 33차 마지막 코드에서 출발한다. */
const EMPTY_START = `def on_forever():
    pass
basic.forever(on_forever)`;

/** 내 작품에 넣은 기능(개념) - 채점 화면에도 그대로 보인다. */
const CONCEPTS = [
  "변수",
  "반복 (계속 반복·for)",
  "조건 (if·그리고·또는)",
  "무작위 (randint)",
  "센서 입력 (빛·소리·기울기 등)",
  "이벤트 (버튼·흔들기·로고)",
  "점수·횟수 세기",
  "리스트",
  "소리 출력 (스피커)",
  "LED 그림·글자",
];

/* ── 지난 시간 (problem) ── */
const RECALL: WorksheetQuestion[] = [
  {
    key: "_mb34_echo33",
    phase: "problem",
    label: "지난 시간(33차)에 정한 내 프로젝트",
    hint: "오늘은 이걸 완성해요. 바꾸고 싶으면 ③ 에서 고쳐도 돼요.",
    kind: "echo",
    echoKeys: [
      { key: "mb33_summary", label: "한 줄 소개" },
      { key: "mb33_who", label: "누가" },
      { key: "mb33_when", label: "어떤 상황에서" },
      { key: "mb33_what", label: "무엇이 불편" },
      { key: "mb33_problem", label: "내가 풀 문제 (이전 판)" },
      { key: "mb33_in", label: "입력" },
      { key: "mb33_out", label: "출력" },
      { key: "mb33_state_goal", label: "목표 상태" },
      { key: "mb33_func", label: "꼭 필요한 기능" },
      { key: "mb33_algo", label: "알고리즘" },
      // 2026-11-25 이전 33차 판의 표(남아 있는 학생만 보인다)
      { key: "mb33_flow", label: "입력 → 처리 → 출력" },
    ],
    maxLength: 0,
  },
];

/* ── ③ 구현 완성 (grill) ── */
const BUILD: WorksheetQuestion[] = [
  {
    key: "_mb34_ai_note",
    phase: "grill",
    label: "③ 구현 완성 - 포털 AI 로 고쳐 가며 완성하기",
    hint:
      "33차 알고리즘을 보며 AI 에게 한 단계씩 부탁해요(처음 코드에서 시작).\n" +
      "MakeCode 'Python' 에 붙여 실물로 돌려 보고, 안 되는 곳을 고쳐요.\n" +
      "다른 사람 이름·연락처 같은 개인정보는 넣지 않아요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "mb34_vibe",
    phase: "grill",
    label: "포털 AI 에게 부탁하기",
    hint: "한 번에 하나씩, 무엇이 어떻게 되면 좋을지 적어요.",
    kind: "vibe_code",
    vibeTarget: "microbit",
    vibeBaseCode: EMPTY_START,
    vibeContinue: true,
    vibeContinueFromKey: "mb33_vibe",
    vibeNoun: "내 프로젝트",
    vibePlaceholder: "예) 소리가 작아지면 웃는 얼굴로 바꿔 줘",
    maxLength: 0,
  },
  {
    key: "mb34_ai_log",
    phase: "grill",
    label: "AI 검토 기록 (채점에 들어가요)",
    hint: "AI 답을 그대로 믿지 말고, 실물로 돌려 보며 확인·고친 것을 적어요.",
    kind: "rows",
    rowColumns: [
      { key: "ask", label: "AI 에게 물어본 것", placeholder: "예) 소리가 작으면 웃는 얼굴" },
      { key: "check", label: "확인하거나 고친 것", placeholder: "예) 얼굴이 계속 깜빡여서 pause 를 늘림" },
      { key: "why", label: "왜", placeholder: "예) 화면이 너무 빨리 바뀌어서" },
    ],
    maxRows: 8,
    maxLength: 3000,
  },
  {
    key: "mb34_debug",
    phase: "grill",
    label: "오류 수정 기록",
    hint: "안 된 것과 어떻게 고쳤는지 적어요. 한 줄이어도 좋아요.",
    kind: "rows",
    rowColumns: [
      { key: "bug", label: "무엇이 안 됐나", placeholder: "예) 큰 소리에도 얼굴이 안 바뀜" },
      { key: "fix", label: "어떻게 고쳤나", placeholder: "예) 기준 숫자를 낮춤" },
    ],
    maxRows: 6,
    maxLength: 2000,
  },
  ...exampleBlocks("mb34", "grill"),
];

/* ── 제출 (build) + 확장 도전 ── */
const SUBMIT: WorksheetQuestion[] = [
  {
    key: "_mb34_submit_note",
    phase: "build",
    label: "최종 제출",
    hint:
      "MakeCode 에서 '공유' 를 눌러 링크를 만들고 붙여넣어요. (필수)\n" +
      "동작 한 줄 설명도 꼭 써요. 코드·사진은 선택이에요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "mb34_link",
    phase: "build",
    label: "MakeCode 공유 링크 (필수)",
    hint: "https://makecode.microbit.org/ 로 시작하는 링크예요.",
    kind: "text",
    maxLength: 300,
  },
  {
    key: "mb34_works",
    phase: "build",
    label: "내 작품은 이렇게 동작해요 (필수, 한 줄)",
    hint: "예) 방이 어두워지면 LED 가 켜지고 삐 소리로 알려 줘요.",
    kind: "text",
    maxLength: 200,
  },
  {
    key: "mb34_concepts",
    phase: "build",
    label: "내 작품에 넣은 기능(개념) - 모두 골라요",
    hint: "코드에 실제로 들어 있는 것만 골라요.",
    kind: "multi",
    choices: CONCEPTS,
    maxLength: 0,
  },
  {
    key: "mb34_concepts_where",
    phase: "build",
    label: "고른 개념을 어디에 썼나요?",
    hint: "개념마다 한 줄씩. 예) 조건 - 소리 크기가 기준보다 크면 화난 얼굴",
    kind: "long",
    maxLength: 600,
  },
  {
    key: "mb34_code",
    phase: "build",
    label: "최종 코드 붙여넣기 (선택)",
    hint: "MakeCode 'Python' 의 코드를 전부 복사해 붙여넣어요. 선생님이 바로 볼 수 있어요.",
    kind: "long",
    maxLength: 6000,
  },
  {
    key: "mb34_photo",
    phase: "build",
    label: "동작 사진 (선택)",
    hint: "마이크로비트가 동작하는 모습을 찍어 올려요.",
    kind: "image",
    // 데이터 URL 로 공유 답안에 담기므로 maxLength 가 곧 용량 상한이다(image-field). 기존 차시와 같은 값.
    maxLength: 260_000,
  },
  {
    key: "_mb34_ext_note",
    phase: "build",
    label: "먼저 끝났나요? - 확장 도전",
    hint:
      "제출한 것은 그대로 남아요. 여기서는 기능을 하나 더 붙여 봐요.\n" +
      "해 본 것은 다음 ④ 성찰의 '확장 아이디어' 로 이어져요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "mb34_ext_vibe",
    phase: "build",
    label: "확장 도전 - 포털 AI 에게 하나 더 부탁하기",
    hint: "'마지막으로 받은 코드에서 이어서' 를 고르면 제출한 코드에서 이어 가요.",
    kind: "vibe_code",
    vibeTarget: "microbit",
    vibeBaseCode: EMPTY_START,
    vibeContinue: true,
    vibeContinueFromKey: "mb34_vibe",
    vibeNoun: "내 프로젝트",
    vibePlaceholder: "예) A 버튼을 누르면 소리를 끌 수 있게 해 줘",
    maxLength: 0,
  },
  {
    key: "mb34_ext_idea",
    phase: "build",
    label: "확장 도전에서 더해 본 기능 (한 줄)",
    hint: "잘 안 됐어도 괜찮아요. 무엇을 해 봤는지 적어요.",
    kind: "text",
    maxLength: 200,
  },
];

/* ── ④ 성찰 (worksheet) ── */
const REFLECT: WorksheetQuestion[] = [
  {
    key: "mb34_effect",
    phase: "worksheet",
    label: "④ 기대 효과와 장점",
    hint: "내 작품이 있으면 누가, 어떻게 좋아질까요? 2~3줄로 써요.",
    kind: "long",
    maxLength: 500,
  },
  {
    key: "mb34_extend",
    phase: "worksheet",
    label: "④ 확장·개선 아이디어",
    hint: "더 좋게 만들려면 무엇을 바꾸거나 더할까요? 확장 도전에서 해 본 것도 좋아요.",
    kind: "long",
    prefillTemplate: "{mb34_ext_idea}",
    maxLength: 500,
  },
];

const WORKSHEET: WorksheetQuestion[] = [...RECALL, ...BUILD, ...SUBMIT, ...REFLECT];

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "수행평가 ② 피지컬 컴퓨팅 프로젝트 - 구현과 성찰",
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
  // 보상 게임 없음(교사 결정). 먼저 끝낸 학생은 제출 단계의 '확장 도전'.

  progress: empty(),
  assessment: empty(),
  video: empty(),

  // ④ 성찰은 활동지(worksheet) 단계에 둔다 - 채점 화면이 공유 답안에서 한 번에 읽게.
  reflectionQuestions: [],
  reflectionPublic: false,

  focusExempt: ["waiting", "grill", "build"],
  phaseLabels: {
    problem: "지난 시간",
    grill: "③ 구현 완성",
    build: "제출 (+ 확장 도전)",
    worksheet: "④ 성찰",
  },
  phaseOrder: ["waiting", "problem", "grill", "build", "worksheet"],
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "피지컬 컴퓨팅 프로젝트 ② 구현과 성찰",
      body: "지난 시간 → ③ 구현 완성 → 제출 → ④ 성찰\n쓴 것과 AI 대화는 모두 자동으로 저장되고 제출돼요.",
    },
    worksheet: WORKSHEET,
    galleryEnabled: false,
    sourcesEnabled: false,
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
      { ...PLAN, updatedAt: now, rewardGame: FieldValue.delete(), quiz: FieldValue.delete() },
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
          reflectionQuestions: PLAN.reflectionQuestions,
          focusExempt: PLAN.focusExempt,
          phaseOrder: PLAN.phaseOrder,
          freeNavigation: PLAN.freeNavigation,
          activity: PLAN.activity,
          rewardGame: FieldValue.delete(),
        },
        { merge: true },
      );
      await session.ref.update({ phaseLabels: PLAN.phaseLabels });
      applied += 1;
    }
    console.log(`   열린 수업 ${applied}개에 반영`);
  }
  console.log("단계: 대기 → 기분 → 지난 시간 → ③ 구현 완성(AI 이어서) → 제출(+확장 도전) → ④ 성찰. 게임 없음.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
