/**
 * 23차시 차시 계획 등록 — 「마이크로비트 MakeCode 첫 차시 — LED와 친해지기(두근두근 하트)」.
 *
 *   node --env-file=.env.local scripts/seed-lesson23-microbit.ts
 *   node --env-file=.env.local scripts/seed-lesson23-microbit.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 피지컬 컴퓨팅 MakeCode 아크의 첫 시간
 *
 * 파이썬 터틀 '똥피하기'(17~21차)와 같은 게임을 이번엔 MakeCode·마이크로비트로 다시 만드는 아크의
 * 시작. 23차는 MakeCode(블록)·LED와 친해지는 **탐색 첫 차시** — 16차 터틀 '찍어보기' 와 같은 결이다.
 * 블록을 하나씩 찾아 끌어다 놓고 시뮬레이터로 결과를 바로 보며 감을 잡는다.
 *
 *  · 에디터: makecode.microbit.org (블록 코딩), 시뮬레이터 중심(첫 차시라 실물 보드 플래싱 없음).
 *  · 파일 가져오기 없음 — 다음 차시부터 '기본 코드 포털에 심기 → 내려받기 → MakeCode 가져오기' 로
 *    간다. 23차는 성찰에서 그 예고만 한다.
 *
 * ## 파일명·번호·통 (주의)
 *
 *  · LESSON_NO = 23 (비어 있음: 20·21·22만 사용). 파일명 seed-lesson23.ts 는 이미 타임머신(2·3차)이
 *    차지해 이 파일은 seed-lesson23-microbit.ts 로 둔다.
 *  · activityId = microbit-makecode (MakeCode 피지컬 아크 전용 새 통). 파이썬 통(python-dodge-game)·
 *    파킹된 MicroPython 통(physical-computing, seed-lesson-microbit.ts 의 lessonNo 123)과 섞지 않는다.
 *    ※ 파킹된 seed-lesson-microbit.ts 는 MicroPython(블록 아님) 계획이라 방향이 달라 재사용하지 않는다.
 *
 * ## 구성 (40분, 정보 차시 관례) — 코드 기능 없이 시드만(기존 worksheet kind 재사용)
 *
 * 대기(게임)·기분·출석 → 안내(assessment) → LED 탐색(worksheet) → 성찰(reflection). freeNavigation.
 * MakeCode 는 블록이라 파이썬식 copy&paste code 필드가 핵심이 아니다 — '어떤 블록을 찾아 무엇을
 * 하는지' 평문 안내 + 관찰 기록(note/list/text)으로 구성한다. 외부 링크는 makecode.microbit.org 공식 하나.
 *
 * 대상 1~4반 중1. 각 반 30번은 테스트 학생(리허설). 숙제/집에 내주는 것 없음. seed 멱등(--force).
 */

import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import type { LessonPlan, PhaseContent, WorksheetQuestion } from "../src/lib/types.ts";

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
const LESSON_NO = 23;

/** 18~22차와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/**
 * MakeCode 피지컬 아크 전용 새 통. 파이썬 통(python-dodge-game)·파킹된 MicroPython 통
 * (physical-computing)과 물리적으로 다른 문서다 — 섞이지 않는다.
 */
const ACTIVITY_ID = "microbit-makecode";

/** MakeCode 블록 에디터(공식). 새 탭으로 열고 시뮬레이터로 바로 확인한다. */
const MAKECODE_URL = "https://makecode.microbit.org/";

/**
 * 마이크로비트 소개 영상(유튜브). video 단계(전자칠판)에서 toEmbedUrl 로 임베드돼 재생된다.
 * 학생 태블릿에는 주소를 내려보내지 않고 전자칠판에서만 튼다(PRD 3.2) — 교사가 같이 재생.
 */
const VIDEO_URL = "https://youtu.be/7WMCgUIcKnk";

/** 대기 화면 = 파이썬 타자 도우미(정보 수업 표준). game.url 이 "link:" 면 설명+새 탭 링크 카드로 뜬다. */
const TYPING_URL = "https://python-typing-helper.vercel.app/";
/** 성찰 보상 게임 = 스네이크. 성찰을 제출하면 '제출하고 게임하기' 로 열린다. */
const SNAKE_URL = "https://snake-game-iota-puce.vercel.app/";

/** 공유(Share) 버튼 위치 안내 그림 — MakeCode 상단 바, 공유 아이콘 강조(교사 제공 스크린샷). */
const SHARE_IMG = "/mb23-share.png";

/*
 * LED 탐색(worksheet)은 '미션 — 두근두근 하트' 하나로 간소화했다(교사와 함께 직접 타이핑).
 * 예전 스캐폴딩 코드 상수(스켈레톤·타이핑·큰 하트·미션 완성본)는 미션에서 코드를 빼면서 제거했다.
 */

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 피지컬 컴퓨팅(+피지컬 AI) 단계 — phase:"problem" (STEP 단계 슬롯을 '피지컬 컴퓨팅' 으로 이름만
// 바꿔 쓴다). 설명만 하는 note 묶음(입력칸 없음, maxLength:0). 센서/프로세서/액추에이터를
// 사람 몸 반사 반응 그림(/mb23-body.png, 생성형 이미지)을 note 오른쪽 1/2 폭으로 붙인다(imageSide). 중1 눈높이.
// ─────────────────────────────────────────────────────────────
const PHYSICAL: WorksheetQuestion[] = [
  {
    key: "_pc_intro",
    phase: "problem",
    label: "피지컬 컴퓨팅이 뭐예요?",
    hint:
      "지금까지 파이썬·블록으로 만든 건 모두 '화면 안' 에서만 움직였죠? 피지컬 컴퓨팅은 코드가\n" +
      "화면 밖 '진짜 세상' 과 주고받는 거예요 — 불을 켜고, 소리를 내고, 움직임을 느껴요.\n\n" +
      "움직이는 방법은 늘 세 단계예요:\n" +
      "  ① 입력 — 센서로 바깥을 '감지' 해요 (밝기·온도·흔들기 등)\n" +
      "  ② 처리 — 그 값을 보고 프로그램이 '어떻게 할지' 정해요\n" +
      "  ③ 출력 — 장치(LED·모터·스피커)로 '반응' 해요\n\n" +
      "우리 둘레에도 많아요: 스마트홈(공기가 나빠지면 공기청정기가 켜짐), 스마트워치(심장이\n" +
      "빨리 뛰면 알려 줌), 사물인터넷(문이 열리면 자동으로 잠금). 오늘 쓰는 마이크로비트가\n" +
      "바로 이 피지컬 컴퓨팅을 해 보는 작은 컴퓨터예요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_pc_parts",
    phase: "problem",
    label: "세 가지 — 센서 · 프로세서 · 액추에이터 (사람 몸으로 보면)",
    hint:
      "피지컬 컴퓨팅 장치는 사람 몸이랑 똑 닮았어요(오른쪽 그림):\n\n" +
      "· 센서 = 감각기관(눈·귀·피부) — 바깥을 '감지' 해요 … 입력\n" +
      "· 마이크로프로세서 = 뇌 — 받은 걸 보고 '생각하고 판단' 해요 … 처리\n" +
      "· 액추에이터 = 손발·근육 — '움직여서 반응' 해요(LED·모터·스피커) … 출력\n\n" +
      "사람이 '뜨거운 걸 손으로 느끼고(센서) → 앗 뜨거! 판단하고(뇌) → 손을 떼는(근육)' 것처럼,\n" +
      "장치도 '감지 → 판단 → 반응' 으로 움직여요. 마이크로비트의 LED는 이 중 '액추에이터(출력)' 예요.",
    kind: "note",
    imageUrl: "/mb23-body.png",
    imageAlt:
      "아이가 뜨거운 촛불에 손을 댔다 떼는 반사 그림. ① 센서(입력)=손이 뜨거움을 느낌, ② 마이크로프로세서(처리)=뇌가 '앗 뜨거!' 판단, ③ 액추에이터(출력)=근육이 손을 뗌. 아래에 입력→처리→출력 흐름.",
    imageSide: "right",
    imageSideWidth: "half",
    maxLength: 0,
  },
  {
    key: "_pc_ai",
    phase: "problem",
    label: "피지컬 AI 는 뭐가 다를까?",
    hint:
      "피지컬 AI 는 'AI가 몸을 가지고 세상 밖으로 나온 것' 이에요. 카메라·센서로 주변을 보고,\n" +
      "스스로 '이게 뭔지 알아보고(인식) → 어떻게 할지 생각해(추론) → 행동' 까지 해요.\n\n" +
      "  입력 → 인식 → 추론 → 행동 → (해 보고) 학습\n\n" +
      "앞의 피지컬 컴퓨팅이 '정해진 규칙대로(이러면 저렇게)' 움직인다면, 피지컬 AI 는 상황을\n" +
      "스스로 '이해하고 판단' 하고, 겪은 걸로 점점 더 똑똑해져요(학습).\n\n" +
      "예) 자율주행차(길·신호·사람을 알아보고 스스로 운전), 로봇청소기(집 구조를 익혀 길을 짬),\n" +
      "휴머노이드 로봇(아틀라스 — 걷고 뛰고 물건을 옮김).\n\n" +
      "▶ 아래 단추로 피지컬 AI 영상 '하늘을 나는 자동차' 를 같이 봐요.",
    kind: "note",
    linkUrl: "https://youtube.com/shorts/2e2PXcW4YZQ",
    linkLabel: "영상 보기 — 하늘을 나는 자동차 (새 탭)",
    maxLength: 0,
  },
];

// ─────────────────────────────────────────────────────────────
// 활동지 (worksheet 단계) — LED 탐색. 교사 주도로 '직접 타이핑(노가다) → 블록 드래그 = 코드 자동
// → 큰 하트 → 두근두근 미션 → 공유 링크 제출' 순으로 간다. MakeCode '파이썬 보기' 코드를 code
// 필드(등폭·readonly·noCopy)로 보여 주고, 들여쓰기를 그대로 익힌다. 안내는 note, 저장은 list/text.
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── 먼저 — MakeCode 열기 (새 탭, 시뮬레이터) ── */
  {
    key: "_mb_open",
    phase: "worksheet",
    label: "먼저 — MakeCode 열기",
    hint:
      "아래 [MakeCode 열기] 로 새 탭에서 열고 '새 프로젝트' 를 하나 만들어요.\n" +
      "왼쪽에 마이크로비트 그림(시뮬레이터)이 있어요 — 코드가 바뀌면 여기서 바로 움직여요.\n" +
      "오늘은 실물 보드 없이 이 시뮬레이터로만 확인해요(연결·다운로드 안 해요).\n" +
      "MakeCode 위쪽 가운데에서 '블록 ↔ { } 파이썬(Python)' 보기를 바꿀 수 있어요. 오늘은 둘 다 써 봐요.",
    kind: "note",
    linkUrl: MAKECODE_URL,
    linkLabel: "MakeCode 열기 (새 탭)",
    maxLength: 0,
  },

  /* ── 미션 — 두근두근 하트 (설명만. 코드·세부 힌트 없음 — 선생님과 함께 직접 타이핑) ── */
  {
    key: "_mb_mission",
    phase: "worksheet",
    label: "미션 — 두근두근 하트 (큰 하트 ↔ 작은 하트)",
    hint:
      "미션! 1초에 한 번씩 '큰 하트 → 작은 하트' 가 번갈아 뜨며 심장처럼 두근두근 뛰게 만들어요.\n" +
      "선생님과 함께 직접 타이핑해서 만들어요. 시뮬레이터에서 두 하트가 번갈아 뛰면 성공!",
    kind: "note",
    maxLength: 0,
  },

  /* ── 제출 (하나로 합침) — 이름 바꾸기 + 공유 버튼(그림) 안내 + 링크 입력칸 ── */
  {
    key: "mb_share_link",
    phase: "worksheet",
    label: "제출 — 이름 바꾸고 공유 링크 붙여넣기",
    hint:
      "다 만들었으면 제출해요. 순서대로 해요:\n" +
      "1) MakeCode 맨 아래 '프로젝트 이름' 칸을 '학번 이름 하트 두근두근' 으로 바꿔요. 예) 10130 홍길동 하트 두근두근\n" +
      "2) 오른쪽 위 '공유(Share)' 버튼(아래 그림의 강조된 아이콘)을 눌러요.\n" +
      "3) '공유하기 / 링크 만들기' 를 누르면 주소(링크)가 만들어져요 — 그 주소를 복사해요.\n" +
      "4) 아래 칸에 그 주소를 붙여넣어 제출해요. (선생님이 열어서 확인해요.)",
    kind: "text",
    imageUrl: SHARE_IMG,
    imageAlt: "MakeCode 상단 바에서 공유(Share) 버튼 아이콘이 네모로 강조된 모습",
    imageWidth: "half",
    maxLength: 300,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "마이크로비트 MakeCode — LED와 친해지기(두근두근 하트)",
  moodCheckEnabled: true,

  // 대기 화면 = 파이썬 타자 도우미(정보 수업 표준). 기분은 대기 앞에서 받는다(moodCheckEnabled).
  // url 이 "link:" 로 시작하면 iframe 이 아니라 설명+새 탭 링크 카드로 뜬다(focusExempt 에 waiting 필요).
  game: {
    heading: "기다리는 동안 — 파이썬 타자 연습",
    body:
      "수업이 시작되길 기다리는 동안 파이썬 타자 연습을 해 봐요.\n" +
      "아래 단추로 새 탭에서 열려요. 수업이 시작되면 돌아오세요.",
    url: `link:${TYPING_URL}`,
  },
  gameExplainer: empty(),

  // 성찰 보상 게임 = 스네이크. 성찰을 제출하면 '제출하고 게임하기' 로 열린다(requireReflection 생략=기본 검사).
  rewardGame: {
    heading: "수고했어요! 🎮",
    body: "성찰을 제출했으면 잠깐 스네이크 게임으로 쉬어요. 선생님이 부르면 돌아오세요.",
    url: SNAKE_URL,
  },

  // 다음 시간(progress) 단계는 두지 않는다 — 안내(assessment)가 이미 있어 중복이다.
  progress: empty(),

  /*
   * 안내 보드 — 오늘 전체 활동 안내만(큰 그림). 마이크로비트·MakeCode 소개는 '마이크로비트'
   * 단계(video)로, 센서·프로세서 비유는 '피지컬 컴퓨팅' 단계(problem 활동지)로 옮겼다.
   * 활동 중 되돌아와 오늘 순서를 다시 볼 수 있다.
   */
  assessment: {
    heading: "오늘 할 일 — 마이크로비트로 LED 켜 보기",
    body: "",
    url: "",
    // 빈 배열로 둬서 옛 마이크로비트·MakeCode 탭을 지운다. set(merge:true)는 맵을 깊게 병합해
    // 새 cards 만 넣으면 옛 tabs 가 그대로 남는다 — tabs:[] 로 배열을 통째로 덮어 비운다.
    tabs: [],
    cards: [
      {
        badge: "오늘",
        title: "이 순서로 해요",
        note: "40분",
        lines: [
          "① 피지컬 컴퓨팅 — 코드가 '현실' 과 주고받는 법 알아보기(센서·뇌·손발)",
          "② 마이크로비트 — 영상으로 어떤 컴퓨터인지 보기 + MakeCode 소개",
          "③ LED 탐색 — MakeCode 블록을 하나씩 눌러 보며 LED 켜 보기",
          "④ 두근두근 하트 만들기(최종 미션)",
          "⑤ 성찰 쓰고 → 스네이크 게임으로 쉬기",
        ],
      },
      {
        badge: "약속",
        title: "오늘 수업 방법",
        note: "",
        lines: [
          "오늘은 실물 보드 없이 화면 속 '시뮬레이터' 로만 해요(연결·다운로드 안 해요).",
          "점수·자동채점 없어요 — 블록을 눌러 보고 '감' 만 잡으면 됩니다.",
          "블록도 끌어와 보고, 코드(파이썬)도 직접 쳐 봐요. 틀려도 괜찮으니 이것저것 해 봐요.",
        ],
      },
    ],
  },

  /*
   * '마이크로비트' 단계(video) — 전자칠판에서 소개 영상(VIDEO_URL)을 교사가 같이 재생한다
   * (toEmbedUrl 임베드). 학생 태블릿에는 영상 주소를 안 내려보내고(PRD 3.2), body(마이크로비트·
   * MakeCode 설명)와 videoPrompts(영상 보며 생각할 것)만 뜬다. phaseLabels 로 '마이크로비트' 표시.
   */
  video: {
    heading: "마이크로비트가 뭐예요?",
    url: VIDEO_URL,
    body:
      "마이크로비트는 손바닥만 한 작은 컴퓨터예요. 앞면에 작은 불(LED)이 25개(5줄 x 5칸) 박혀 있어\n" +
      "그림·글자를 보여주고, 버튼 A·B 와 여러 센서(흔들기·밝기·온도 등)도 있어요. 오늘은 그중\n" +
      "'LED 25개' 와 친해져 봅니다.\n\n" +
      "코딩은 'MakeCode' 로 해요. makecode.microbit.org 에서 쓰고, 블록을 놓으면 왼쪽 시뮬레이터(마이크로비트\n" +
      "그림)에서 바로 결과가 보여요. '파이썬(Python) 보기' 로 바꾸면 같은 걸 코드로도 볼 수 있어요 —\n" +
      "오늘은 코드를 직접 쳐 보기도 하고 블록도 끌어와 봐요. 실물 없이 시뮬레이터로만 해 봐요.",
  },
  videoPrompts: [
    "마이크로비트 앞면의 작은 불(LED)은 몇 개일까요? (힌트: 5줄 x 5칸)",
    "LED 말고 또 뭐가 있었나요? (버튼·센서 — 흔들기·밝기·온도 등)",
    "오늘 우리는 실물 보드 없이 무엇으로 해 볼까요? (화면 속 시뮬레이터)",
  ],

  /*
   * 성찰 — 오늘 배운 '피지컬 컴퓨팅 3구성요소' 를 확인하는 한 문항. 개인적이라 비공개.
   * (성찰을 제출하면 보상 게임 스네이크가 열린다 — requireReflection 기본값.)
   */
  reflectionQuestions: ["피지컬 컴퓨팅의 3가지 구성 요소는 무엇인가요?"],
  reflectionPublic: false,

  /*
   * 새 탭을 여는 단계는 창 이동을 이탈로 세지 않는다 — 대기(파이썬 타자 도우미 링크)와
   * worksheet(MakeCode 링크) 둘 다.
   */
  focusExempt: ["waiting", "problem", "worksheet"],
  /*
   * 단계 버튼 순서 — 대기 → 안내 → 피지컬 컴퓨팅 → 마이크로비트 → LED 탐색 → 성찰.
   * 기분(mood)은 대기 화면에서 받으므로(moodCheckEnabled) 교사 대시보드의 단독 '기분' 단계는 뺀다.
   *  · 피지컬 컴퓨팅 = problem 슬롯(STEP 단계, 활동지 note — 사람 몸 비유 그림)
   *  · 마이크로비트 = video 슬롯(전자칠판 영상 + body·videoPrompts). video 는 session.video 에
   *    url 이 있으면 교사 대시보드에 버튼이 뜨므로(hasContent) 반드시 phaseOrder 에 넣어 자리를
   *    못 박는다 — 안 넣으면 '영상 시청' 단추가 성찰 뒤에 새서 붙는다.
   * problem(피지컬) 을 video(마이크로비트) 앞에 두려고 phaseOrder 로 순서를 명시한다
   * (LESSON_PHASES 전역 순서는 video 가 problem 보다 앞이라, phaseOrder 가 그걸 뒤집는다).
   */
  phaseOrder: ["waiting", "assessment", "problem", "video", "worksheet", "reflection"],
  phaseLabels: {
    assessment: "안내",
    problem: "피지컬 컴퓨팅",
    video: "마이크로비트",
    worksheet: "LED 탐색",
  },
  /*
   * 되돌아가기 끔 — 교사 표준(무조건 모든 차시 시작 시 off 기본값). 단계 진행은 교사가
   * 대시보드 단추로 몬다(안내 → 피지컬 컴퓨팅 → 마이크로비트 → LED 탐색 → 성찰). 필요하면
   * 수업 중 대시보드에서 켠다.
   */
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리는 차시가 아니다 — 비우면 글만/기록만 하는 활동으로 잡는다(저장 입력: 탐색 기록·미션 기록)
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "마이크로비트 MakeCode — LED 탐색",
      body:
        "MakeCode 를 새 탭으로 열고, LED 블록을 하나씩 찾아 끌어다 놓으며 시뮬레이터로 결과를 봐요.\n" +
        "값도 바꿔 보고, 마지막엔 배운 블록을 모아 '두근두근 하트' 를 만들어요.",
    },
    // 피지컬 컴퓨팅(problem) note 묶음 + LED 탐색(worksheet) 을 한 활동지에 담는다.
    // phase 필드로 각 단계에 갈린다(questionsFor). 피지컬이 먼저 오도록 앞에 붙인다.
    worksheet: [...PHYSICAL, ...WORKSHEET],
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
     * 다시 돌릴 때 옛 필드가 섞이지 않도록 progress·progressChecks·quiz 를 명시 삭제해 둔다
     * (이 차시엔 셋 다 없다).
     */
    await doc.ref.set(
      {
        ...PLAN,
        updatedAt: now,
        progress: FieldValue.delete(),
        progressChecks: FieldValue.delete(),
        quiz: FieldValue.delete(),
      },
      { merge: true },
    );
    console.log(`↻ 갱신 — ${PLAN.title} (${doc.id})`);

    /* 18~22차와 같은 규칙 — 아직 아무도 안 들어온 수업에만 반영한다 */
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
          rewardGame: PLAN.rewardGame,
          progress: FieldValue.delete(),
          progressChecks: FieldValue.delete(),
          quiz: FieldValue.delete(),
          assessment: PLAN.assessment,
          video: PLAN.video,
          videoPrompts: PLAN.videoPrompts,
          reflectionQuestions: PLAN.reflectionQuestions,
          reflectionPublic: PLAN.reflectionPublic,
          focusExempt: PLAN.focusExempt,
          phaseOrder: PLAN.phaseOrder,
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (MakeCode 피지컬 아크 전용 새 통 — 파이썬 통 python-dodge-game·파킹된 MicroPython 통 physical-computing 과 분리)`);
  console.log("단계(phaseOrder): 대기(파이썬 타자 링크) → [기분=대기 화면] → 안내(assessment: 오늘 순서) → 피지컬 컴퓨팅(problem: 센서·뇌·손발 비유 /mb23-body.svg) → 마이크로비트(video: 전자칠판 영상+body/videoPrompts) → LED 탐색(worksheet) → 성찰. freeNavigation. quiz 없음, 보상=스네이크.");
  console.log(`마이크로비트 영상: ${VIDEO_URL} (전자칠판 toEmbedUrl 임베드, 교사가 재생 — 학생 태블릿엔 주소 안 감).`);
  console.log(`LED 탐색(worksheet): MakeCode 열기(${MAKECODE_URL}, 새 탭) → ① 파이썬 스켈레톤 → ② 직접 타이핑(show_number→show_icon, noCopy code) → ③ 블록 드래그=코드 자동 → ④ forever 큰 하트 → ⑤ 미션 두근두근(HEART↔SMALL_HEART, pause 1000). code 필드 노가다(직접 타이핑).`);
  console.log("제출: 프로젝트 이름 '학번 이름 하트 두근두근' → 공유(Share) 버튼(/mb23-share.png 안내) → 링크 만들기 → mb_share_link(text, 공유 URL 제출). 저장: mb_explore_log(list 2~5) · mb_share_link(text).");
  console.log("성찰 1문항: '피지컬 컴퓨팅의 3가지 구성 요소는 무엇인가요?' (제출 시 보상 스네이크 열림). galleryEnabled: false. sourcesEnabled: false. 실물 보드·플래싱 없음(시뮬레이터).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
