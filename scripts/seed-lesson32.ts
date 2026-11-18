/**
 * 32차시 차시 계획 등록 - 「똥피하기 ⑤ - 마무리와 수행평가 준비」 (MakeCode 아크 마지막 + 33~34차 수행평가 예고).
 *
 *   node --env-file=.env.local scripts/seed-lesson32.ts
 *   node --env-file=.env.local scripts/seed-lesson32.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * 설계: docs/superpowers/specs/2026-11-18-info-lesson32-design.md (교사 결정 2026-11-18 반영)
 *
 * ## 흐름 (45분)
 *   대기(타자)·마음 체크인 3분
 *   미션 ① (build)     리스트로 정리 - 31차 미션② 그대로(좌우 대비 보기 고르기, 색 짝). 10분
 *   미션 ② (grill)     AI로 나만의 기능 - 31차 미션③ 그대로. **모두 함**(보너스 아님, 교사 결정). 9분
 *   총정리 (problem)    다섯 작품 입력·처리·출력 표 + 본체 부품 그림 + 써 보고 싶은 입력·출력 고르기. 8분
 *   수행평가 안내 (assessment)  탭 5개: 한눈에 · 채점① · 채점② · 33~34차 흐름 · AI 규칙. 11분
 *   성찰 → UNO          "해결하고 싶은 학교생활 속 불편" - 33차에서 다시 보여 준다(reflectionAnswerKey). 4분
 *
 * ## 교사 결정 (2026-11-18)
 *  · AI 미션은 모두. 하드웨어는 본체 내장 부품만(외부 부품 없음). AI 는 33~34차 모두 **포털 AI만**.
 *  · 수행평가 안내는 끝. 답 키는 mb32 로 새로(31차에 고르다 만 답이 미리 채워지지 않게).
 *  · 채점 기준 문구는 평가 계획 그대로(아래 RUBRIC_*).
 *  · 성찰은 수행평가로 잇기. 성찰 글을 학번별 공유 답안 문서의 mb32_pa_problem 에도 한 벌 저장한다
 *    (세션 reflectionAnswerKey -> /api/student/reflection). 33차는 echoKeys:[{key:"mb32_pa_problem"}] 로 읽는다.
 *    이 키는 32차 활동지 문항이 아니라서 학생 자동 저장이 덮어쓰지 않는다.
 *
 * ## 세션 운영 (정보 수업 표준)
 *  · 대기 = 파이썬 타자 링크. 보상 = UNO(requires 비움, 성찰 제출만으로). hideDoneButton. 되돌아가기 off.
 *  · 글은 블록당 3줄 이내(lesson-text-3-lines), 코드 줄 번호·Tab 표기는 공용 컴포넌트가 처리.
 *  · 그림: /mb31-loop.svg · /mb31-m2.svg · /mb31-vibe-ideas.svg(재사용) + /mb32-recap.svg · /mb32-parts.svg ·
 *    /mb32-pa-flow.svg(새로). 새 그림은 배포 뒤에 세션을 열어야 404 가 안 난다.
 *  · 세션을 열 때는 open 스크립트가 reflectionAnswerKey 도 실어야 한다(open-info-32-31-1123.ts 는 싣는다).
 */

import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import type { LessonPlan, PhaseContent, WorksheetQuestion } from "../src/lib/types.ts";
import { LIST_REFACTOR_QUESTIONS, VIBE_QUESTIONS, retarget } from "./lesson32-carryover.ts";

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
const LESSON_NO = 32;
const FORCE = process.argv.includes("--force");

/** 23~31차와 같은 MakeCode 통 (키 mb32_* 로 31차와 안 겹침). */
const ACTIVITY_ID = "microbit-makecode";

/** 성찰 글의 한 벌 저장 키 - 33차 수행평가 첫 단계(문제 발견)에서 echo 로 다시 보여 준다. */
const PA_PROBLEM_KEY = "mb32_pa_problem";

/** 라벨만 32차 번호로 바꾼다(내용·정답·색 짝·그림은 31차 그대로). */
function relabel(qs: WorksheetQuestion[], labels: Record<string, string>): WorksheetQuestion[] {
  return qs.map((q) => (labels[q.key] ? { ...q, label: labels[q.key] } : q));
}

/* ── 미션 ① (build) - 리스트로 정리 (31차 미션②) ── */
const MISSION_LIST = relabel(retarget(LIST_REFACTOR_QUESTIONS, { prefix: "mb32", phase: "build" }), {
  _mb32_m2_note: "복습 - 리스트로 다시 쓰기 (인덱스 xs[i] · 반복)",
  _mb32_m2: "미션 ① - 리스트 + 반복으로 정리하기 (보기 골라 채우기)",
});

/* ── 미션 ② (grill) - AI로 나만의 기능 (31차 미션③, 모두 함) ── */
const MISSION_AI = relabel(retarget(VIBE_QUESTIONS, { prefix: "mb32", phase: "grill" }), {
  _mb32_vibe_intro: "미션 ② - AI에게 기능 하나를 부탁하기",
});

/* ── 총정리 (problem) - 입력·처리·출력 + 본체 부품 + 써 보고 싶은 것 고르기 ── */
const RECAP: WorksheetQuestion[] = [
  {
    key: "_mb32_recap_note",
    phase: "problem",
    label: "마이크로비트 총정리 - 입력 · 처리 · 출력",
    hint:
      "지금까지 만든 작품은 모두 입력 → 처리 → 출력이었어요.\n" +
      "23차에 배운 센서 · 프로세서 · 액추에이터예요. 아래 표로 한눈에 봐요.",
    kind: "note",
    imageUrl: "/mb32-recap.svg",
    imageAlt:
      "다섯 작품의 입력·처리·출력 표. 하트 두근두근: 입력 없음·반복·LED 하트, 만보기: 흔들기·걸음 수+1·LED 숫자, " +
      "주사위: 흔들기·무작위+갈림길·LED 눈, 가위바위보: 버튼·로고·무작위+승패·LED 그림, 똥피하기: 버튼·반복·충돌·점수·리스트·LED",
    maxLength: 0,
  },
  {
    key: "_mb32_parts_note",
    phase: "problem",
    label: "수행평가에서 쓸 수 있는 부품",
    hint:
      "수행평가에서는 마이크로비트 본체 안의 부품만 써요.\n" +
      "어떤 입력(센서)과 출력(액추에이터)이 있는지 살펴봐요.",
    kind: "note",
    imageUrl: "/mb32-parts.svg",
    imageAlt:
      "마이크로비트 본체 부품. 입력: 버튼 A·B, 로고 터치, 기울기·흔들기(가속도), 빛·온도, 소리 감지(마이크), 나침반. " +
      "출력: LED 5×5, 스피커",
    maxLength: 0,
  },
  {
    key: "mb32_want_in",
    phase: "problem",
    label: "다음 프로젝트에 써 보고 싶은 입력 (여러 개 가능)",
    hint: "끌리는 것을 골라요. 33차에 다시 보여 줄게요.",
    kind: "multi",
    choices: [
      "버튼 A·B",
      "로고 터치",
      "기울기·흔들기 (가속도)",
      "빛",
      "온도",
      "소리 감지 (마이크)",
      "나침반",
    ],
    maxLength: 0,
  },
  {
    key: "mb32_want_out",
    phase: "problem",
    label: "써 보고 싶은 출력 (여러 개 가능)",
    hint: "LED 와 스피커 중 골라요. 둘 다 골라도 돼요.",
    kind: "multi",
    choices: ["LED 5×5 (그림·글자·숫자)", "스피커 (소리·음악)"],
    maxLength: 0,
  },
];

const WORKSHEET: WorksheetQuestion[] = [...MISSION_LIST, ...MISSION_AI, ...RECAP];

/* ── 채점 기준 - 평가 계획 문구 그대로 ── */
const RUBRIC_UNDERSTAND = {
  상: "컴퓨팅 시스템의 구성요소와 동작 원리를 명확히 설명하고, 생활 속 피지컬 컴퓨팅 사례를 분석하여 그 필요성과 가치를 판단함.",
  중: "구성요소와 동작 원리를 설명하고, 생활 속 사례를 조사하여 필요성과 가치를 설명함.",
  하: "구성요소와 피지컬 컴퓨팅의 개념을 부분적으로 설명함.",
};
const RUBRIC_BUILD = {
  상: "해결할 문제를 스스로 정하고 목적에 맞는 구성요소를 선택하여 시스템을 구상하며, 프로그램을 작성하고 오류를 수정하여 의도한 대로 동작시킴.",
  중: "안내에 따라 목적에 맞는 구성요소를 선택하여 시스템을 구성하고, 프로그램을 작성하여 동작시킴.",
  하: "교사와 동료의 도움을 받아 구성요소를 연결하고, 예시 프로그램을 수정하여 일부 기능을 동작시킴.",
};

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "똥피하기 ⑤ - 마무리와 수행평가 준비",
  moodCheckEnabled: true,
  hideDoneButton: true,

  // 대기 화면 = 파이썬 타자 도우미(정보 수업 표준).
  game: {
    heading: "기다리는 동안 - 파이썬 타자 연습",
    body:
      "수업이 시작되길 기다리는 동안 파이썬 타자 연습을 해 봐요.\n" +
      "아래 단추로 새 탭에서 열려요. 수업이 시작되면 돌아오세요.",
    url: "link:https://python-typing-helper.vercel.app/",
  },
  gameExplainer: empty(),

  // 성찰 보상 = UNO. requires 비움 - 성찰 제출만으로 열린다.
  rewardGame: {
    heading: "수고했어요! 🃏",
    body: "성찰을 제출했으면 잠깐 UNO 로 쉬어요. 선생님이 부르면 돌아오세요.",
    url: "https://uno-game-gilt.vercel.app/",
    requires: [],
  },

  progress: empty(),

  // 수행평가 안내 - 끝에 둔다(교사 결정). 탭마다 글 3줄 이내, 표·그림 중심.
  assessment: {
    heading: "수행평가 안내 - 피지컬 컴퓨팅 프로젝트",
    body: "",
    url: "",
    tabs: [
      {
        label: "한눈에",
        subtitle: "33~34차, 2차시 동안 내 작품 만들기",
        note: "학교생활 속 불편을 마이크로비트로 해결해요.",
        rows: [
          { label: "방식", value: "개인 · 실험·실습 · 오픈북 · 포털 AI 도움 허용" },
          { label: "만들기", value: "마이크로비트 실물 + 파이썬 코드 제출" },
          { label: "부품", value: "본체 안의 부품만 (버튼·센서·LED·스피커)" },
          { label: "기록", value: "모든 과정이 포털에 자동으로 기록·제출돼요" },
          { label: "일정", value: "33차 문제 정의·설계 → 34차 구현·성찰" },
        ],
        highlights: [],
      },
      {
        label: "채점 ① 이해",
        subtitle: "피지컬 컴퓨팅 시스템의 이해",
        note: "상 · 중 · 하 세 단계로 봐요.",
        rows: [
          { label: "상", value: RUBRIC_UNDERSTAND.상 },
          { label: "중", value: RUBRIC_UNDERSTAND.중 },
          { label: "하", value: RUBRIC_UNDERSTAND.하 },
        ],
        highlights: [],
      },
      {
        label: "채점 ② 구현",
        subtitle: "피지컬 컴퓨팅 시스템 구현",
        note: "상 · 중 · 하 세 단계로 봐요.",
        rows: [
          { label: "상", value: RUBRIC_BUILD.상 },
          { label: "중", value: RUBRIC_BUILD.중 },
          { label: "하", value: RUBRIC_BUILD.하 },
        ],
        highlights: [],
      },
      {
        label: "진행 순서",
        subtitle: "33~34차, 네 단계로 만들어요",
        note: "③ 에서는 AI 답을 그대로 쓰지 말고, 따져 보고 고친 과정을 남겨요.",
        rows: [],
        highlights: [],
        imageUrl: "/mb32-pa-flow.svg",
        imageAlt: "33차: ① 문제 발견·정의, ② 구성요소 설계. 34차: ③ AI로 구현·검토, ④ 성찰. 그다음 제출(포털 자동 기록)",
      },
      {
        label: "AI 사용 규칙",
        subtitle: "33~34차 모두, 포털 AI만",
        note: "보낸 말과 받은 답은 기록되고 선생님이 볼 수 있어요.",
        rows: [],
        highlights: [
          "포털 AI만 써요. 다른 AI 사이트(제미나이·챗GPT 등)는 안 돼요.",
          "다른 사람의 개인정보는 절대 넣지 않아요.",
          "무엇을 묻고 답을 어떻게 썼는지 기록해요. 설명하지 못하면 채점에서 빠질 수 있어요.",
        ],
      },
    ],
  },

  video: empty(),

  // 성찰 - 수행평가로 잇기. 글은 mb32_pa_problem 에도 저장돼 33차에서 다시 보인다.
  reflectionQuestions: ["마이크로비트로 해결하고 싶은 학교생활 속 불편은 무엇인가요? (한두 줄)"],
  reflectionPublic: false,
  reflectionAnswerKey: PA_PROBLEM_KEY,

  // MakeCode(새 탭)·파이썬 타자(새 탭)가 붙은 단계만 이탈 면제. 총정리·안내는 포털 안.
  focusExempt: ["waiting", "build", "grill"],
  phaseLabels: {
    build: "미션 ① 리스트로 정리",
    grill: "미션 ② AI로 나만의 기능",
    problem: "마이크로비트 총정리",
    assessment: "수행평가 안내",
  },
  phaseOrder: ["waiting", "build", "grill", "problem", "assessment", "reflection"],
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "똥피하기 마무리 + 수행평가 준비",
      body:
        "미션① 리스트로 정리 → 미션② AI로 나만의 기능 → 총정리 → 수행평가 안내\n" +
        "다 한 뒤 성찰을 내면 UNO 가 열려요.",
    },
    worksheet: WORKSHEET,
    galleryEnabled: false,
    sourcesEnabled: false,
  },
};

async function main(): Promise<void> {
  const existing = await db.collection(LESSON_PLANS).where("lessonNo", "==", LESSON_NO).get();
  const now = Date.now();

  if (existing.empty) {
    const ref = await db.collection(LESSON_PLANS).add({ ...PLAN, createdAt: now, updatedAt: now });
    console.log(`＋ 등록 - ${PLAN.title} (${ref.id})`);
  } else {
    const doc = existing.docs[0];
    await doc.ref.set(
      { ...PLAN, updatedAt: now, progressChecks: FieldValue.delete(), quiz: FieldValue.delete() },
      { merge: true },
    );
    // merge 는 맵을 깊게 합쳐 빠진 단계 이름이 남는다 - phaseLabels 는 통째로 바꾼다.
    await doc.ref.update({ phaseLabels: PLAN.phaseLabels });
    console.log(`↻ 갱신 - ${PLAN.title} (${doc.id})`);

    const live = await db
      .collection("classSessions")
      .where("lessonNo", "==", LESSON_NO)
      .where("status", "in", ["scheduled", "active"])
      .get();
    let applied = 0;
    for (const session of live.docs) {
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
          gameExplainer: PLAN.gameExplainer,
          rewardGame: PLAN.rewardGame,
          progressChecks: FieldValue.delete(),
          quiz: FieldValue.delete(),
          assessment: PLAN.assessment,
          video: PLAN.video,
          reflectionQuestions: PLAN.reflectionQuestions,
          reflectionPublic: PLAN.reflectionPublic,
          reflectionAnswerKey: PLAN.reflectionAnswerKey,
          focusExempt: PLAN.focusExempt,
          phaseOrder: PLAN.phaseOrder,
          freeNavigation: PLAN.freeNavigation,
          activity: PLAN.activity,
        },
        { merge: true },
      );
      await session.ref.update({ phaseLabels: PLAN.phaseLabels });
      applied += 1;
    }
    console.log(`   열린 수업 ${applied}개에 반영`);
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} (키 mb32_*) · 성찰 한 벌 저장 키: ${PA_PROBLEM_KEY}`);
  console.log("단계: 대기(타자) → 기분 → 미션①(build 리스트) → 미션②(grill AI, 모두) → 총정리(problem) → 수행평가 안내(assessment) → 성찰 → UNO.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
