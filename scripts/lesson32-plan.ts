/**
 * 32차 계획 내용(PLAN) - Firebase 없는 공통 모듈.
 *
 * seed-lesson32.ts(1-1·1-2·1-3 판)와 seed-lesson32-c4.ts(1-4 압축판)가 함께 쓴다. 여기엔 DB 초기화가 없어서
 * import 해도 아무것도 쓰지 않는다. 내용 설명은 seed-lesson32.ts 머리말 참조.
 */

import { readFileSync } from "node:fs";

import type { LessonPlan, PhaseContent, WorksheetQuestion } from "../src/lib/types.ts";
import { LIST_REFACTOR_QUESTIONS, VIBE_QUESTIONS, retarget } from "./lesson32-carryover.ts";

export const LESSON_NO = 32;
/** 23~31차와 같은 MakeCode 통 (키 mb32_* 로 31차와 안 겹침). */
export const ACTIVITY_ID = "microbit-makecode";

/** 성찰 글의 한 벌 저장 키 - 33차 수행평가 첫 단계(문제 발견)에서 echo 로 다시 보여 준다. */
export const PA_PROBLEM_KEY = "mb32_pa_problem";

/** 라벨만 32차 번호로 바꾼다(내용·정답·색 짝·그림은 31차 그대로). */
export function relabel(qs: WorksheetQuestion[], labels: Record<string, string>): WorksheetQuestion[] {
  return qs.map((q) => (labels[q.key] ? { ...q, label: labels[q.key] } : q));
}

/* ── 미션 ① (build) - 리스트로 정리 (31차 미션②) ── */
export const MISSION_LIST = relabel(retarget(LIST_REFACTOR_QUESTIONS, { prefix: "mb32", phase: "build" }), {
  _mb32_m2_note: "복습 - 리스트로 다시 쓰기 (인덱스 xs[i] · 반복)",
  _mb32_m2: "미션 ① - 리스트 + 반복으로 정리하기 (보기 골라 채우기)",
});

/* ── 미션 ② (grill) - AI로 나만의 기능 (31차 미션③, 모두 함) ── */
export const MISSION_AI = relabel(retarget(VIBE_QUESTIONS, { prefix: "mb32", phase: "grill" }), {
  _mb32_vibe_intro: "미션 ② - AI에게 기능 하나를 부탁하기",
});

/* ── 총정리 (problem) - 입력·처리·출력 + 본체 부품 + 써 보고 싶은 것 고르기 ── */
export const RECAP: WorksheetQuestion[] = [
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
];

/*
 * 성찰 ① (mvp 단계, 성찰 바로 앞) - 써 보고 싶은 입력·출력 고르기.
 *
 * 2026-11-23 교사 피드백: 총정리에서 빼서 성찰로 옮긴다. 성찰 화면(reflection)은 활동지 문항을 그리지 못해서
 * (프론트 변경 + 배포가 필요, 수업 중 배포 금지) 성찰 바로 앞에 '성찰 ①' 단계로 둔다. 키(mb32_want_in·out)와
 * 활동 ID 는 그대로라 이미 고른 답이 이어지고, 33차 echo 도 그대로 읽는다.
 */
export const REFLECT_PICK: WorksheetQuestion[] = [
  {
    key: "mb32_want_in",
    phase: "mvp",
    label: "다음 프로젝트에 써 보고 싶은 입력 (여러 개 가능)",
    hint: "수행평가 안내를 떠올리며 끌리는 것을 골라요. 33차에 다시 보여 줄게요.",
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
    phase: "mvp",
    label: "써 보고 싶은 출력 (여러 개 가능)",
    hint: "LED 와 스피커 중 골라요. 둘 다 골라도 돼요.",
    kind: "multi",
    choices: ["LED 5×5 (그림·글자·숫자)", "스피커 (소리·음악)"],
    maxLength: 0,
  },
];

export const WORKSHEET: WorksheetQuestion[] = [...MISSION_LIST, ...MISSION_AI, ...RECAP, ...REFLECT_PICK];

/**
 * 수행평가 진행 순서 그림(public/mb32-pa-flow.svg)을 데이터 주소로 싣는다.
 * 2026-11-23 '학교생활 속' → '실생활 속' 으로 고쳤는데 수업 중이라 배포를 못 해서, 그림을 계획 안에 넣는다.
 */
const PA_FLOW_IMAGE =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(readFileSync(new URL("../public/mb32-pa-flow.svg", import.meta.url), "utf8").trim());

/* ── 채점 기준 - 평가 계획 문구 그대로 ── */
export const RUBRIC_UNDERSTAND = {
  상: "컴퓨팅 시스템의 구성요소와 동작 원리를 명확히 설명하고, 생활 속 피지컬 컴퓨팅 사례를 분석하여 그 필요성과 가치를 판단함.",
  중: "구성요소와 동작 원리를 설명하고, 생활 속 사례를 조사하여 필요성과 가치를 설명함.",
  하: "구성요소와 피지컬 컴퓨팅의 개념을 부분적으로 설명함.",
};
export const RUBRIC_BUILD = {
  상: "해결할 문제를 스스로 정하고 목적에 맞는 구성요소를 선택하여 시스템을 구상하며, 프로그램을 작성하고 오류를 수정하여 의도한 대로 동작시킴.",
  중: "안내에 따라 목적에 맞는 구성요소를 선택하여 시스템을 구성하고, 프로그램을 작성하여 동작시킴.",
  하: "교사와 동료의 도움을 받아 구성요소를 연결하고, 예시 프로그램을 수정하여 일부 기능을 동작시킴.",
};

export function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

export const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
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
        note: "집·가족·운동·건강·동네·취미 등 실생활 속 불편을 마이크로비트로 해결해요.",
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
        imageUrl: PA_FLOW_IMAGE,
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
  // 2026-11-23: 학교생활 → 실생활로 넓힘(주제가 겹치지 않게). 예시는 학교 밖 상황을 섞는다.
  reflectionQuestions: [
    "마이크로비트로 해결하고 싶은 실생활 속 불편은 무엇인가요? (한두 줄)\n" +
      "예) 집에서 화분 물 주기를 잊어요 · 운동할 때 횟수를 자꾸 까먹어요 · 밤에 방이 깜깜해 넘어질 뻔해요",
  ],
  reflectionPublic: false,
  reflectionAnswerKey: PA_PROBLEM_KEY,

  // MakeCode(새 탭)·파이썬 타자(새 탭)가 붙은 단계만 이탈 면제. 총정리·안내는 포털 안.
  focusExempt: ["waiting", "build", "grill"],
  phaseLabels: {
    build: "미션 ① 리스트로 정리",
    grill: "미션 ② AI로 나만의 기능",
    problem: "마이크로비트 총정리",
    assessment: "수행평가 안내",
    mvp: "성찰 ① 써 보고 싶은 입력·출력",
    reflection: "성찰 ② 해결하고 싶은 불편",
  },
  phaseOrder: ["waiting", "build", "grill", "problem", "assessment", "mvp", "reflection"],
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "똥피하기 마무리 + 수행평가 준비",
      body:
        "미션① 리스트로 정리 → 미션② AI로 나만의 기능 → 총정리 → 수행평가 안내 → 성찰\n" +
        "다 한 뒤 성찰을 내면 UNO 가 열려요.",
    },
    worksheet: WORKSHEET,
    galleryEnabled: false,
    sourcesEnabled: false,
  },
};
