/**
 * 14차시 차시 계획 등록 — 「프로그래밍 언어 개론 + 파이썬 맛보기」.
 *
 *   node --env-file=.env.local scripts/seed-lesson14.ts
 *   node --env-file=.env.local scripts/seed-lesson14.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 이 자리(LESSON_NO 14)는 교사가 아크를 바꾸며 새로 지었다
 *
 * 교사 확정 흐름: 익숙한 **똥피하기 게임을 파이썬(터틀)으로 직접 만들며** 기능을 하나씩 붙이고,
 * 마지막에 **마이크로비트로 실물 제어**까지 잇는다. 그 아크의 **첫 수업**이 이 14차다.
 * 아크: **프로그래밍 언어 개론+파이썬 맛보기(14, 이 파일) → 똥피하기 게임 분석·설계+구현
 *   (15~약7차시, seed-lesson15.ts) → 피지컬 컴퓨팅 개념(122, seed-lesson-pc-concept.ts)
 *   → 마이크로비트 파이썬(123, seed-lesson-microbit.ts) → 바이브 코딩 → 햄스터**.
 *
 * 예전 14차(피지컬 컴퓨팅 개념)·15차(마이크로비트)는 게임 아크 뒤로 밀려 122·123 에 임시
 * 파킹했다(파이썬 도우미선발이 121에 파킹된 관례와 같게). 아크 차시 수가 확정되면 실번호 재배정.
 *
 * ## 이 시간의 목적 — "프로그래밍 언어가 뭔지" 감 잡고, 파이썬을 살짝 만져 보기
 *
 * 중1이 텍스트 코딩(파이썬)을 처음 만난다. 어려운 정의를 외우게 하지 않는다.
 *   (1) 블록 코딩(엔트리)과 텍스트 코딩(파이썬)이 어떻게 다른지
 *   (2) 프로그래밍 언어가 점점 **사람 말에 가까워진다**는 흐름(기계어→…→바이브코딩)
 *   (3) 터틀로 몇 줄 따라 쳐서 **그림이 그려지는** 첫 성공
 * 이 셋이면 충분하다. 다음 시간부터 똥피하기를 직접 만들기 시작한다는 예고로 마친다.
 *
 * ## 활동 통(activityId) — 개론/맛보기 통(실습 통과 분리)
 *
 * 새 통 `python-intro` 를 판다. 이 차시는 개념 퀴즈·성찰 글만 남기는 맛보기라, 똥피하기 게임
 * 제작이 이어 쓰는 `python-dodge-game` 통·마이크로비트~햄스터 실습 통(physical-computing)·
 * 디지털 윤리 통(digital-ethics)과 물리적으로 다른 문서라 섞이지 않는다.
 *
 * ## 단계 배치와 실제 진행 순서
 *
 * 포털 단계 순서(LESSON_PHASES)는 assessment(안내) → quiz(퀴즈) → worksheet(활동지)로
 * 고정돼 있지만, 이 차시의 실제 진행은 교사가 단추로 몬다(freeNavigation). 교사 뼈대 순서:
 *
 *   0–3   대기(똥피하기) · 기분 · 출석
 *   3–7   안내 보드(assessment) — 오늘 순서 + 앞으로의 아크 살짝 예고
 *   7–20  개론 note ①②(프로그래밍 언어란 · 추상화 흐름) → 개념 확인 퀴즈(quiz, 교사 진행)
 *   20–35 파이썬 맛보기 — 터틀 예제 코드를 앞 화면에서 시연하고 따라 치기(worksheet)
 *   35–40 성찰 → 정리
 *
 * 즉 개론 note·파이썬 맛보기 note 는 **한 worksheet 단계**에 위→아래로 있고, 그 사이에 교사가
 * **개념 퀴즈(quiz 단계)** 를 몰아 진행한다(개론을 읽은 뒤 퀴즈로 확인 — 개념 → 확인 순서).
 * 점수·자동채점은 없다. 진도 팝업(progressChecks)은 없다.
 *
 * 대상 1~4반 중1. 각 반 30번은 테스트 학생(리허설). 숙제/집에 내주는 것 없음. seed 멱등(--force).
 */

import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import type {
  LessonPlan,
  PhaseContent,
  QuizContent,
  WorksheetQuestion,
} from "../src/lib/types.ts";

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
const LESSON_NO = 14;

/** 9~11차시와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/**
 * **개론/맛보기 통.** 개념 퀴즈·성찰 글만 남기는 이 차시만 쓴다. 똥피하기 게임 제작 통
 * (python-dodge-game)·마이크로비트~햄스터 실습 통(physical-computing)·디지털 윤리 통
 * (digital-ethics)과 물리적으로 다른 문서라 안 섞인다.
 */
const ACTIVITY_ID = "python-intro";

/* ──────────────────────────────────────────────────────────────
 * 파이썬 맛보기 — 터틀 예제 코드. code 필드로 준다(등폭 readonly, 들여쓰기 보존 + 복사 단추).
 * 백틱(템플릿 리터럴)이라 파이썬 들여쓰기가 글자 그대로 남는다. 14·15차 모두 **터틀**로 일관한다
 * (15차 똥피하기 주인공 이동도 터틀 onkeypress 로 만든다).
 * ────────────────────────────────────────────────────────────── */

/** 맛보기 ① 사각형 그리기 — for 반복으로 앞으로 가고 도는 것을 4번 */
const CODE_SQUARE = `import turtle

t = turtle.Turtle()

# 사각형 그리기 — 앞으로 가고, 오른쪽으로 90도 돌기를 4번
for i in range(4):
    t.forward(100)
    t.right(90)

turtle.done()`;

/** 맛보기 ② 앞으로 가기·색·모양 바꾸기 — 한 줄씩 바꿔 보며 감 잡기 */
const CODE_MOVE = `import turtle

t = turtle.Turtle()
t.color("blue")      # 펜 색을 파랑으로
t.shape("turtle")    # 커서를 거북이 모양으로

t.forward(150)       # 앞으로 150만큼 가기
t.left(120)          # 왼쪽으로 120도 돌기
t.forward(150)

turtle.done()`;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 개념 확인 퀴즈 — 정답이 있는 지식 퀴즈(의견형 아님).
//
// 블록/텍스트 구분과 추상화(사람 말에 가까워지는) 흐름을 확인한다. 정답 공개 때 nowText 로
// "왜 그런지" 를 한 줄씩 덧붙여, 틀려도 개념이 남게 한다. stickers 는 디지털 사회 특성
// 태그라 이 퀴즈엔 해당이 없어 빈 배열로 둔다. hideReveal 은 켜지 않는다(정답이 있으니
// 「정답 공개」를 그대로 쓴다).
// ─────────────────────────────────────────────────────────────
const QUIZ: QuizContent = {
  label: "프로그래밍 언어",
  questions: [
    {
      prompt: "엔트리처럼 블록을 끼워 맞춰 프로그램을 만드는 것을 무엇이라고 할까요?",
      choices: ["블록 코딩", "텍스트 코딩", "종이접기"],
      answerIndex: 0,
      nowText:
        "블록을 끼워 맞추는 것이 '블록 코딩'이에요(엔트리·스크래치). 글자를 직접 쓰는 것은 '텍스트 코딩'이고요.",
      stickers: [],
    },
    {
      prompt: "파이썬처럼 글자를 직접 써서 프로그램을 만드는 것은 무엇일까요?",
      choices: ["블록 코딩", "텍스트 코딩", "그림 그리기"],
      answerIndex: 1,
      nowText:
        "글자를 써서 만드는 것이 '텍스트 코딩'이에요. 우리는 이제부터 텍스트 코딩, 그중에서도 '파이썬'을 씁니다.",
      stickers: [],
    },
    {
      prompt:
        "프로그래밍 언어를 '사람이 쓰기 쉬운(사람 말에 가까운)' 순서로 놓으면 맞는 것은?",
      choices: [
        "기계어(0과 1) → 어셈블리 → 파이썬 → 자연어로 시키기",
        "파이썬 → 자연어 → 기계어",
        "자연어 → 파이썬 → 기계어(0과 1)",
      ],
      answerIndex: 0,
      nowText:
        "기계어(0·1)는 컴퓨터 쪽 말이라 사람에겐 어려워요. 파이썬쯤 오면 사람 말에 가까워지고, 자연어로 시키는 '바이브코딩'이 제일 사람 말에 가까워요.",
      stickers: [],
    },
    {
      prompt: "다음 중 '사람 말에 가장 가까운(쓰기 가장 쉬운)' 것은 무엇일까요?",
      choices: ["기계어 (0과 1)", "파이썬", "자연어로 시키기 (바이브코딩·AI)"],
      answerIndex: 2,
      nowText:
        "자연어로 '이렇게 만들어 줘'라고 말로 시키는 바이브코딩이 사람 말에 가장 가까워요. 우리 수업도 파이썬을 거쳐 나중에 여기까지 가 봅니다.",
      stickers: [],
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// 활동지 — 개론 note ①② → 파이썬 맛보기 note ①②.
// 한 worksheet 단계에 위→아래로 흐른다. 중간에 교사가 개념 퀴즈(quiz 단계)를 몰아 진행.
// 입력칸은 두지 않는다(모두 note) — 오늘은 읽고·따라 치고·성찰만 남긴다.
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── ① 개론: 프로그래밍 언어란 (블록 코딩 vs 텍스트 코딩) ── */
  {
    key: "_pi_langs",
    phase: "worksheet",
    label: "① 프로그래밍 언어가 뭐예요?",
    hint:
      "'프로그래밍 언어' 는 컴퓨터에게 일을 시키는 말이에요. 크게 두 가지가 있어요:\n\n" +
      "  · 블록 코딩 — 엔트리·스크래치처럼 **블록을 끼워 맞춰** 만들어요. 글자를 안 써도 돼서 쉬워요.\n" +
      "  · 텍스트 코딩 — **글자를 직접 써서** 만들어요. 파이썬·자바 같은 게 여기에 속해요.\n\n" +
      "우리는 이제부터 **텍스트 코딩, 그리고 그중에서도 '파이썬'** 을 씁니다.\n" +
      "파이썬은 텍스트 코딩 언어 중에서도 사람 말에 가깝고 읽기 쉬워서, 처음 배우기에 좋아요.\n" +
      "그리고 이 수업의 마지막엔 **바이브코딩**(자연어로, 말로 시키기)까지 가 봅니다.",
    kind: "note",
    maxLength: 0,
  },

  /* ── ② 개론: 추상화 흐름 (사람 말에 점점 가까워진다) ── */
  {
    key: "_pi_abstraction",
    phase: "worksheet",
    label: "② 언어는 점점 '사람 말'에 가까워져요",
    hint:
      "프로그래밍 언어는 시간이 지나며 점점 **사람이 쓰기 쉬워졌어요.** 순서로 보면:\n\n" +
      "  기계어(0과 1) → 어셈블리 → 고급 언어(파이썬) → … → 자연어(바이브코딩·AI)\n\n" +
      "  · 기계어 — 0과 1로만 된 컴퓨터 쪽 말. 사람이 읽기 아주 어려워요.\n" +
      "  · 어셈블리 — 기계어보다 조금 사람 말에 가깝지만 여전히 어려워요.\n" +
      "  · 고급 언어(파이썬) — 사람 말과 꽤 비슷해서 읽고 쓰기 쉬워요. ← 우리가 쓸 것!\n" +
      "  · 자연어(바이브코딩) — 그냥 우리말로 '이렇게 만들어 줘' 라고 AI에게 시켜요.\n\n" +
      "이렇게 **사람 말에 가까워지는 정도**를 '추상화가 높아진다' 고 해요.\n" +
      "추상화가 높아진다 = 컴퓨터 사정은 몰라도 되고, **사람이 쓰기 쉬워진다** 는 뜻이에요.\n" +
      "다 읽었으면 선생님이 여는 '개념 퀴즈' 로 같이 확인해 봐요.",
    kind: "note",
    maxLength: 0,
  },

  /* ── ③ 파이썬 맛보기: 터틀로 사각형 그리기 ── */
  /*
   * ★ 인터랙티브 편집기 링크 자리 (선생님이 추후 링크 공유 예정) — 지금은 임의 URL 없음.
   *
   * 학생이 브라우저에서 바로 파이썬 터틀을 돌려 보게 하려면(예: trinket.io/python 등),
   * 아래 note 에 `linkUrl`·`linkLabel` 을 더하면 문항 밑에 새 탭 링크 단추가 뜬다
   * (구 14차 타자 도우미 링크와 같은 방식). 지금은 코드를 note+code(복사 단추)로 보여주고
   * 교사가 앞 화면에서 시연 → 학생이 따라 치는 톤이다.
   * 넣는 법: 선생님이 편집기 링크를 주면 총괄이 이 note 에
   *   linkUrl: "<선생님이 준 주소>", linkLabel: "파이썬 터틀 편집기 열기 (새 탭)"
   * 를 채운다. (링크가 붙으면 이 문항이 focusExempt(worksheet)로 이미 덮여 이탈 오탐도 안 난다.)
   */
  {
    key: "_pi_taste_square",
    phase: "worksheet",
    label: "③ 파이썬 맛보기 — 터틀로 그림 그리기",
    hint:
      "이제 파이썬을 살짝 만져 봐요. '터틀' 은 거북이가 기어가며 선을 그리는 파이썬 도구예요.\n" +
      "아래 코드를 선생님과 함께 한 줄씩 읽고, 그대로 따라 쳐서 실행해 봅니다.\n\n" +
      "· turtle.Turtle() — 그림을 그릴 거북이를 하나 만들어요.\n" +
      "· t.forward(100) — 앞으로 100만큼 가면서 선을 그어요.\n" +
      "· t.right(90) — 오른쪽으로 90도 돌아요.\n" +
      "· for i in range(4): — 아래 줄을 4번 되풀이해요(그래서 네 변이 그려져 사각형!).\n\n" +
      "복사 단추로 코드를 복사해 편집기에 붙여 넣고 실행해 보세요. 사각형이 그려지면 성공!",
    kind: "note",
    code: CODE_SQUARE,
    maxLength: 0,
  },

  /* ── ④ 파이썬 맛보기: 앞으로 가기·색·모양 바꾸기 ── */
  {
    key: "_pi_taste_move",
    phase: "worksheet",
    label: "④ 한 줄씩 바꿔 보기 — 색·모양·방향",
    hint:
      "이번엔 거북이를 움직이고 꾸며 봐요. 아래 코드를 따라 친 뒤, **한 군데씩 바꿔** 보면\n" +
      "무엇이 달라지는지 눈으로 알 수 있어요.\n\n" +
      "· t.color(\"blue\") 의 blue 를 red · green 등으로 바꿔 보기\n" +
      "· t.forward(150) 의 숫자를 크게/작게 바꿔 보기\n" +
      "· t.left(120) 의 각도를 90 · 60 등으로 바꿔 보기\n\n" +
      "바꾼 뒤 다시 실행해서 거북이가 어떻게 달라지는지 확인해 보세요.\n" +
      "다음 시간부터는 이 파이썬으로 **익숙한 똥피하기 게임을 직접 만들기 시작**합니다!",
    kind: "note",
    code: CODE_MOVE,
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "프로그래밍 언어 개론 + 파이썬 맛보기",
  moodCheckEnabled: true,

  game: {
    heading: "기다리는 동안 — 똥피하기",
    body:
      "수업이 시작되길 기다리는 동안 잠깐 쉬어요.\n" +
      "위에서 떨어지는 똥을 좌우로 움직여 피하면 돼요.\n" +
      "이 게임을 다음 시간부터 파이썬으로 직접 만들어 볼 거예요! 수업이 시작되면 닫습니다.",
    url: "https://dodge-poop-game.vercel.app/",
  },
  gameExplainer: empty(),

  // 다음 시간(progress) 단계는 두지 않는다 — 안내(assessment)가 이미 있어 중복이다.
  progress: empty(),

  /*
   * 안내 보드 — 오늘 순서 + 앞으로의 아크 살짝 예고. 활동 중 되돌아와 볼 수 있다.
   * (본격 개론은 활동지 ①② note 에서 한다 — 여기선 맛보기만.)
   */
  assessment: {
    heading: "오늘 할 일 — 프로그래밍 언어와 파이썬 첫 만남",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "'프로그래밍 언어'가 뭔지 알고, 파이썬을 살짝 만져 봐요",
        note:
          "이제부터 우리는 코드를 글자로 써서(텍스트 코딩) 프로그램을 만듭니다.\n" +
          "오늘은 그 첫날 — 언어가 뭔지 감을 잡고, 파이썬 터틀로 그림을 그려 봐요. 어렵지 않아요.",
        rows: [
          { label: "한 줄로", value: "블록 코딩(엔트리) 말고, 이제 텍스트 코딩(파이썬)을 씁니다" },
          { label: "왜 파이썬?", value: "사람 말에 가깝고 읽기 쉬워서 처음 배우기 좋아요" },
          { label: "오늘 할 일", value: "개론 읽기 → 개념 퀴즈 → 파이썬 터틀 맛보기 → 성찰" },
          { label: "채점은", value: "점수·자동채점 없어요. 따라 쳐 보고 감만 잡으면 됩니다" },
        ],
        highlights: [
          "정답을 외우는 시간이 아니에요. '아, 이렇게 쓰는구나' 하고 감만 잡으면 돼요.",
        ],
      },
      {
        label: "앞으로 뭐 할까",
        subtitle: "익숙한 똥피하기를 파이썬으로 직접 만든다!",
        note:
          "대기 화면에서 하던 그 똥피하기 게임 있죠? 다음 시간부터 그걸 **파이썬으로 직접**\n" +
          "만들기 시작해요. 기능을 하나씩 붙여 가고, 아크의 마지막엔 마이크로비트로 실물까지 움직여요.",
        rows: [
          { label: "오늘", value: "프로그래밍 언어 개론 + 파이썬(터틀) 맛보기" },
          { label: "다음 시간", value: "똥피하기 게임 뜯어보기(분석) → 만들 순서 정하기(설계) → 첫 기능" },
          { label: "그다음", value: "기능을 하나씩 붙여 게임 완성 → 나중에 마이크로비트로 실물 제어" },
        ],
        highlights: [
          "익숙한 게임을 내 손으로 만들어 봐요 — 그게 이 단원의 목표예요.",
        ],
      },
    ],
  },

  video: empty(),

  quiz: QUIZ,

  /*
   * 성찰 — 오늘 잡은 개념 / 파이썬으로 만들어 보고 싶은 것. 개인적이라 비공개.
   */
  reflectionQuestions: [
    "블록 코딩(엔트리)과 텍스트 코딩(파이썬)은 무엇이 다른가요? 오늘 느낀 대로 한 줄로 적어 봅시다.",
    "파이썬으로 만들어 보고 싶은 것이 있다면 무엇인가요? (그림·게임 등 무엇이든 좋아요)",
  ],
  reflectionPublic: false,

  /*
   * 파이썬 맛보기에 편집기 링크(외부 새 탭)를 나중에 붙일 수 있어, worksheet 단계에서 창을
   * 옮기는 것을 이탈로 세지 않는다 (구 14차 타자 링크 단계를 focusExempt 로 둔 것과 같은 이유).
   * 지금은 링크 자리(주석 placeholder)만 있고 실제 linkUrl 은 선생님이 주면 총괄이 채운다.
   */
  focusExempt: ["worksheet"],
  phaseLabels: {
    assessment: "안내",
    quiz: "개념 퀴즈",
    worksheet: "개론·파이썬 맛보기",
  },
  /*
   * 되돌아가기 켬 — 학생이 안내·퀴즈·활동지 사이를 스스로 오갈 수 있다. 교사는 개론 note 를
   * 읽힌 뒤 개념 퀴즈(quiz 단계)를 몰아 진행하고, 다시 활동지 맛보기로 돌아온다.
   */
  freeNavigation: true,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리는 차시가 아니다 — 비우면 글만/기록만 하는 활동으로 잡는다
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "프로그래밍 언어 개론 + 파이썬 맛보기",
      body:
        "위에서부터 순서대로 해요. 프로그래밍 언어가 뭔지 읽고, 개념 퀴즈로 확인한 뒤,\n" +
        "파이썬 터틀 예제를 따라 쳐서 그림을 그려 봅니다.",
    },
    worksheet: WORKSHEET,
    // 서로 구경하기·출처 칸은 이 차시에서 쓰지 않는다
    galleryEnabled: false,
    sourcesEnabled: false,
  },
};

async function main(): Promise<void> {
  const existing = await db.collection(LESSON_PLANS).where("lessonNo", "==", LESSON_NO).get();
  const now = Date.now();

  if (!existing.empty) {
    const doc = existing.docs[0];
    /*
     * 이 lessonNo 14 자리에는 예전에 피지컬 컴퓨팅 개념 계획이 있었다(122로 옮김). merge 로는
     * 그때의 필드가 남아 화면에 섞일 수 있어, progress·progressChecks 를 FieldValue.delete()
     * 로 명시 삭제한다. quiz 는 이번 차시가 새로 쓰므로 ...PLAN 으로 채운다.
     */
    await doc.ref.set(
      {
        ...PLAN,
        updatedAt: now,
        progress: FieldValue.delete(),
        progressChecks: FieldValue.delete(),
      },
      { merge: true },
    );
    console.log(`↻ 갱신 — ${PLAN.title} (${doc.id})`);

    /* 9~11차시와 같은 규칙 — 아직 아무도 안 들어온 수업에만 반영한다 */
    const live = await db
      .collection("classSessions")
      .where("lessonNo", "==", LESSON_NO)
      .where("status", "in", ["scheduled", "active"])
      .get();

    const scheduled: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    for (const session of live.docs) {
      const joined = await db
        .collection("attendance")
        .where("sessionId", "==", session.id)
        .limit(1)
        .get();
      if (joined.empty || FORCE) scheduled.push(session);
      else
        console.log(
          `· ${session.id} — 이미 학생이 들어와 있어 건드리지 않습니다 (--force 로 덮어쓸 수 있습니다)`,
        );
    }

    for (const session of scheduled) {
      await session.ref.set(
        {
          title: PLAN.title,
          moodCheckEnabled: PLAN.moodCheckEnabled,
          game: PLAN.game,
          gameExplainer: PLAN.gameExplainer,
          // progress(다음 시간)·진도 팝업 단계 제거 — merge 로 안 비워지므로 세션에서도 지운다.
          progress: FieldValue.delete(),
          progressChecks: FieldValue.delete(),
          assessment: PLAN.assessment,
          video: PLAN.video,
          quiz: PLAN.quiz,
          reflectionQuestions: PLAN.reflectionQuestions,
          reflectionPublic: PLAN.reflectionPublic,
          focusExempt: PLAN.focusExempt,
          phaseLabels: PLAN.phaseLabels,
          freeNavigation: PLAN.freeNavigation,
          activity: PLAN.activity,
        },
        { merge: true },
      );
    }
    console.log(`   아직 아무도 안 들어온 수업 ${scheduled.length}개에 반영`);
  } else {
    const ref = await db.collection(LESSON_PLANS).add({ ...PLAN, createdAt: now, updatedAt: now });
    console.log(`＋ 등록 — ${PLAN.title} (${ref.id})`);
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} (개론/맛보기 통 — 게임 제작 통 python-dodge-game·실습 통 physical-computing 과 분리)`);
  console.log("단계: 대기(똥피하기) → 기분 → 안내(assessment) → 개념 퀴즈(quiz) → 활동지(worksheet: 개론·파이썬 맛보기) → 성찰");
  console.log("실제 진행: 안내 → 개론 note ①②(블록/텍스트·추상화 흐름) → 개념 퀴즈(교사 진행) → 터틀 맛보기 따라 치기 → 성찰 (freeNavigation)");
  console.log(`개념 퀴즈: ${QUIZ.questions.length}문항 (정답 있는 지식 퀴즈, 블록/텍스트·추상화 순서). session.quiz — 대시보드 응답 분포로 확인.`);
  console.log("파이썬 맛보기: 터틀 예제 2개(사각형 그리기 for 반복 · 앞으로 가기+색·모양). code 필드로 제시(등폭 readonly, 복사 단추). 14·15차 모두 터틀로 일관.");
  console.log("★ 인터랙티브 편집기 링크는 자리(주석 placeholder)만 — 선생님이 링크 주면 총괄이 _pi_taste_square note 에 linkUrl/linkLabel 채움.");
  console.log("성찰 2문항(블록/텍스트 차이 · 만들어 보고 싶은 것). 진도 팝업 없음. galleryEnabled: false.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
