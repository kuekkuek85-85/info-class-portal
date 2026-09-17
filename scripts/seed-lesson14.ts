/**
 * 14차시 차시 계획 등록 — 「피지컬 컴퓨팅 개념 — 센서와 액추에이터」.
 *
 *   node --env-file=.env.local scripts/seed-lesson14.ts
 *   node --env-file=.env.local scripts/seed-lesson14.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 이 자리(LESSON_NO 14)는 원래 마이크로비트 실습이었다 — 실습은 15차로 옮겼다
 *
 * 예전 14차는 「마이크로비트 파이썬 첫걸음」(하드코딩 실습, activityId physical-computing)이었다.
 * 실제 보드/편집기 실습 앞에 **피지컬 컴퓨팅이 무엇인지 개념부터 잡는 입문 차시**가 있는 편이
 * 자연스러워, 이 14차를 **개념 입문**으로 새로 두고 마이크로비트 실습은 **15차로 옮겼다**
 * (seed-lesson15.ts, LESSON_NO 15, 내용 그대로). 아크: **개념 입문(14) → 마이크로비트
 * 파이썬(15) → 바이브 코딩 → 햄스터**. (13차 신설 때 마이크로비트를 13→14 로 옮긴 것과 같은 요령.)
 *
 * ## 이 시간의 목적 — 감(感) 잡기 (실습은 다음 시간)
 *
 * 중1이 "피지컬 컴퓨팅"이라는 말을 처음 만난다. 어려운 정의를 외우게 하지 않는다.
 * **입력(센서로 감지) → 처리(마이크로프로세서) → 출력(액추에이터로 반응)** 한 줄과, 주변에서 이미
 * 그렇게 움직이는 실물(자동문·스마트 가로등 등)을 이어 붙여 "아, 저게 그거구나" 하는
 * 감을 잡게 한다. 그 감이 잡히면 다음 시간(마이크로비트)에서 코드가 무엇을 하는지 보인다.
 *
 * ## 활동 통(activityId) — 실습 통과 분리
 *
 * 새 통 `physical-computing-intro` 를 판다. 이 차시는 **코드 기록이 없고** 개념 퀴즈·구상
 * 글만 남긴다 — 마이크로비트~햄스터 실습이 이어 쓰는 `physical-computing` 통(코드/보드 기록)과
 * 물리적으로 다른 문서라 섞이지 않는다. 디지털 윤리 통(digital-ethics)도 재사용하지 않는다.
 *
 * ## 단계 배치와 실제 진행 순서 (교사 확정 뼈대대로)
 *
 * 포털 단계 순서(LESSON_PHASES)는 assessment(안내) → quiz(퀴즈) → worksheet(활동지)로
 * 고정돼 있지만, 이 차시의 실제 진행은 교사가 단추로 몬다(freeNavigation). 교사 뼈대 순서:
 *
 *   0–3   대기(지뢰찾기) · 기분 · 출석
 *   3–7   안내 보드(assessment) — 오늘 순서 + 피지컬 컴퓨팅 살짝 예고
 *   7–12  파이썬 타자 도우미 (worksheet 첫 칸, 새 탭 링크) — 5분 워밍업
 *   12–22 피지컬 컴퓨팅 개념 (worksheet 개념 note) → 개념 확인 퀴즈(quiz, 교사가 몰아 진행)
 *   22–35 실생활의 피지컬 컴퓨팅 구상하기 (worksheet 구상 칸)
 *   35–40 성찰 → 정리
 *
 * 즉 타자 도우미·개념 note·구상 칸은 **한 worksheet 단계**에 위→아래로 있고, 그 중간에
 * 교사가 **개념 퀴즈(quiz 단계)** 를 몰아 진행한다(개념 note 를 읽은 뒤 퀴즈를 여는 것이
 * 자연스럽다 — 개념 → 확인 순서). 점수·자동채점은 없다. 진도 팝업(progressChecks)은 없다.
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
 * **개념 입문 통.** 코드 기록이 없는 이 차시(개념 퀴즈·구상 글)만 쓴다. 마이크로비트~햄스터
 * 실습 통(physical-computing)·디지털 윤리 통(digital-ethics)과 물리적으로 다른 문서라 안 섞인다.
 */
const ACTIVITY_ID = "physical-computing-intro";

/** 파이썬 타자 도우미 — 점수 연동 없이 그냥 하이퍼링크 워밍업 (5분) */
const TYPING_URL = "https://python-typing-helper.vercel.app";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 개념 확인 퀴즈 — 정답이 있는 지식 퀴즈 (의견형 아님).
//
// 센서/액추에이터 구분과 입력→처리→출력 흐름을 확인한다. 정답 공개 때 nowText 로
// "왜 그런지" 를 한 줄씩 덧붙여, 틀려도 개념이 남게 한다. stickers 는 디지털 사회 특성
// 태그라 이 개념 퀴즈엔 해당이 없어 빈 배열로 둔다(화면에 아무 태그도 안 뜬다).
// hideReveal 은 켜지 않는다 — 정답이 있으니 「정답 공개」를 그대로 쓴다.
// ─────────────────────────────────────────────────────────────
const QUIZ: QuizContent = {
  label: "피지컬 컴퓨팅",
  questions: [
    {
      prompt: "피지컬 컴퓨팅 장치는 보통 어떤 순서로 동작할까요?",
      choices: [
        "출력 → 처리 → 입력",
        "입력(감지) → 처리(마이크로프로세서) → 출력(반응)",
        "처리 → 출력 → 입력",
      ],
      answerIndex: 1,
      nowText:
        "센서로 감지하고(입력) → 마이크로프로세서가 처리하고 → 액추에이터로 반응해요(출력). 자동문도 이 순서예요.",
      stickers: [],
    },
    {
      prompt: "다음 중 '센서'는 무엇일까요? (센서 = 주변을 감지하는 부품)",
      choices: ["빛을 내는 LED", "밝기를 재는 조도 센서", "소리를 내는 버저"],
      answerIndex: 1,
      nowText:
        "조도 센서는 밝기를 '감지'하는 입력 부품이에요. LED·버저는 반응하는 출력(액추에이터)이고요.",
      stickers: [],
    },
    {
      prompt: "다음 중 '액추에이터'는 무엇일까요? (액추에이터 = 움직이거나 빛·소리로 반응하는 부품)",
      choices: ["온도 센서", "모터", "누르는 버튼"],
      answerIndex: 1,
      nowText:
        "모터는 명령을 받아 '움직이는' 출력 부품(액추에이터)이에요. 온도 센서·버튼은 감지하는 입력이고요.",
      stickers: [],
    },
    {
      prompt: "사람이 다가오면 열리는 자동문에서, 사람을 '감지'하는 부분은 무엇일까요?",
      choices: ["문을 여는 모터", "사람을 감지하는 센서", "천장의 전등"],
      answerIndex: 1,
      nowText:
        "자동문: 센서가 사람을 감지하면(입력) → 마이크로프로세서가 처리해서 → 모터가 문을 열어요(출력).",
      stickers: [],
    },
    {
      prompt: "어두워지면 저절로 켜지는 스마트 가로등에서 '반응(출력)'을 맡는 부품은 무엇일까요?",
      choices: ["밝기를 재는 조도 센서", "불을 켜는 전등", "전선"],
      answerIndex: 1,
      nowText:
        "조도 센서가 어둠을 감지하면(입력) → 마이크로프로세서가 처리 → 전등이 켜져요(출력). 켜지는 전등이 액추에이터예요.",
      stickers: [],
    },
    {
      prompt: "'센서로 감지 → 마이크로프로세서가 처리 → 액추에이터로 반응' 하는 것을 무엇이라고 부를까요?",
      choices: ["피지컬 컴퓨팅", "타자 연습", "인터넷 검색"],
      answerIndex: 0,
      nowText:
        "맞아요! 현실 세계를 감지하고 반응하는 컴퓨팅을 '피지컬 컴퓨팅'이라고 해요. 다음 시간부터 직접 만들어 봐요.",
      stickers: [],
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// 활동지 — 타자 도우미(워밍업) → 개념 note → 실생활 구상 칸.
// 한 worksheet 단계에 위→아래로 흐른다. 중간에 교사가 개념 퀴즈(quiz 단계)를 몰아 진행.
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── ① 파이썬 타자 도우미 (5분 워밍업, 점수 연동 없음) ── */
  {
    key: "_pci_typing",
    phase: "worksheet",
    label: "① 파이썬 타자 도우미 — 5분 워밍업",
    hint:
      "본격적으로 시작하기 전에, 파이썬 타자에 손을 풀어요. 아래 단추로 새 탭에서 열려요.\n" +
      "· 딱 5분만 해 봅니다. 점수를 매기지 않아요 — 편하게 쳐 보면 됩니다.\n" +
      "· 다 하고 이 화면으로 돌아오세요.",
    kind: "note",
    linkUrl: TYPING_URL,
    linkLabel: "파이썬 타자 도우미 열기 (새 탭)",
    maxLength: 0,
  },

  /* ── ② 피지컬 컴퓨팅 개념 note (입력=센서 → 처리 → 출력=액추에이터) ── */
  {
    key: "_pci_concept",
    phase: "worksheet",
    label: "② 피지컬 컴퓨팅이 뭐예요?",
    hint:
      "'피지컬 컴퓨팅' 은 컴퓨터가 현실 세계를 **감지하고, 처리하고, 반응**하게 만드는 거예요.\n" +
      "순서는 딱 세 칸입니다:\n\n" +
      "  · 입력(감지) — 센서로 주변을 느껴요. (예: 밝기·온도·소리·거리·사람 움직임)\n" +
      "  · 처리 — 마이크로프로세서가 '그러면 어떻게 할까' 를 정해요.\n" +
      "  · 출력(반응) — 액추에이터로 실제로 움직이거나 빛·소리를 내요. (예: 모터·전등·버저)\n\n" +
      "우리 주변엔 이미 이런 장치가 많아요:\n" +
      "  · 자동문 — 센서가 사람을 감지하면 → 모터가 문을 연다\n" +
      "  · 스마트 가로등 — 조도 센서가 어두워진 걸 감지하면 → 전등이 켜진다\n" +
      "  · 에어컨 — 온도 센서가 더위를 감지하면 → 바람을 세게 낸다\n\n" +
      "핵심 한 줄: **센서로 감지 → 마이크로프로세서가 처리 → 액추에이터로 반응.** 이 세 칸만 기억하면 돼요.\n" +
      "다 읽었으면 선생님이 여는 '개념 퀴즈' 로 같이 확인해 봐요.",
    kind: "note",
    maxLength: 0,
  },

  /* ── ③ 실생활의 피지컬 컴퓨팅 구상하기 (센서+액추에이터 조합) ── */
  /*
   * ★ 사진 예시 자리 (선생님이 추후 자료 공유 예정) — 지금은 글 예시만, 임의 URL 없음.
   *
   * 예시 장치 사진(자동문·스마트 가로등 등)을 학생에게 보여주려면, worksheet note 의
   * `imageUrl` 로 붙이면 된다(worksheet-view 가 note 밑에 <img> 로 그린다 — mt5 토끼오리와 같은 방식).
   * 넣는 법: ① 이미지 파일을 `public/lesson14/` 에 넣는다(예: public/lesson14/auto-door.png).
   *         ② 아래 _pci_design_intro note 에 `imageUrl: "/lesson14/auto-door.png"` 를 더하거나,
   *            사진마다 note 를 하나씩 추가해 각 note 에 imageUrl 을 준다(여러 장이면 note 여러 개).
   * 선생님이 사진을 주면 총괄이 이 자리에 imageUrl 을 채운다. (지금은 비워 둔다 — 빈 이미지 안 뜸.)
   */
  {
    key: "_pci_design_intro",
    phase: "worksheet",
    label: "③ 실생활의 피지컬 컴퓨팅 구상하기",
    hint:
      "내가 만들어 보고 싶은 피지컬 컴퓨팅 장치를 상상해 적어 봐요. 어렵게 생각하지 말고,\n" +
      "'어떤 문제를 / 무슨 센서로 감지해 / 무슨 액추에이터로 반응하는 장치' 인지 한 줄로 그려 봅니다.\n\n" +
      "예를 들면:\n" +
      "  · 자동 물주개 — 흙이 마른 걸(습도 센서) 감지하면 → 펌프가 물을 준다\n" +
      "  · 졸음 깨우개 — 고개가 숙여진 걸(기울기 센서) 감지하면 → 버저가 울린다\n" +
      "  · 밤길 안전등 — 사람이 다가온 걸(거리 센서) 감지하면 → 전등이 켜진다\n\n" +
      "아래 칸에 내 아이디어를 적어 보세요. 한 개만 적어도 되고, 더 떠오르면 [+ 줄 추가] 로 늘려요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "pci_ideas",
    phase: "worksheet",
    label: "내 피지컬 컴퓨팅 아이디어",
    hint:
      "칸을 나눠 적으면 쉬워요. '감지할 것' 엔 무슨 센서로 무엇을 느끼는지, '반응' 엔 무슨 " +
      "액추에이터가 무엇을 하는지 써요.",
    kind: "rows",
    rowColumns: [
      { key: "name", label: "아이디어 이름", placeholder: "예) 자동 물주개" },
      { key: "sensor", label: "감지할 것 (센서)", placeholder: "예) 흙이 마른 것 (습도 센서)" },
      { key: "actuator", label: "반응 (액추에이터)", placeholder: "예) 물을 주는 펌프" },
      {
        key: "action",
        label: "한 줄 동작 설명",
        placeholder: "예) 흙이 마르면 펌프가 물을 준다",
      },
    ],
    maxRows: 3,
    // JSON 배열로 한 칸에 담긴다 (rows-field). 세 줄 × 네 칸이라 넉넉히 잡아도 2,000 안쪽
    maxLength: 2000,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "피지컬 컴퓨팅 개념 — 센서와 액추에이터",
  moodCheckEnabled: true,

  game: {
    heading: "기다리는 동안 — 지뢰찾기",
    body:
      "수업이 시작되길 기다리는 동안 잠깐 쉬어요.\n" +
      "숫자는 그 칸 둘레에 숨은 지뢰의 개수예요. 지뢰가 없는 칸을 골라 열어 보세요.\n" +
      "수업이 시작되면 닫습니다.",
    url: "https://mine-sweeper-game-seven.vercel.app/home",
  },
  gameExplainer: empty(),

  // 다음 시간(progress) 단계는 두지 않는다 — 안내(assessment)가 이미 있어 중복이다.
  progress: empty(),

  /*
   * 안내 보드 — 오늘 순서 + 피지컬 컴퓨팅 살짝 예고. 활동 중 되돌아와 볼 수 있다.
   * (본격 개념 설명은 활동지 ② 개념 note 에서 한다 — 여기선 맛보기만.)
   */
  assessment: {
    heading: "오늘 할 일 — 피지컬 컴퓨팅이 뭘까?",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "'현실을 감지하고 반응하는' 컴퓨팅을 처음 만나요",
        note:
          "다음 시간부터 마이크로비트라는 작은 컴퓨터로 직접 만들어 봐요.\n" +
          "그 전에 오늘은 '피지컬 컴퓨팅' 이 무엇인지 감을 잡습니다 — 어렵지 않아요.",
        rows: [
          { label: "한 줄로", value: "센서로 감지 → 마이크로프로세서가 처리 → 액추에이터로 반응" },
          { label: "예를 들면", value: "자동문 · 스마트 가로등 · 에어컨 — 이미 우리 주변에 있어요" },
          { label: "오늘 할 일", value: "개념 잡기 → 퀴즈로 확인 → 내 장치 구상하기" },
          { label: "채점은", value: "점수·자동채점 없어요. 편하게 생각해 보는 시간이에요" },
        ],
        highlights: [
          "정답을 외우는 시간이 아니에요. '아, 저게 그거구나' 하고 감만 잡으면 돼요.",
        ],
      },
      {
        label: "오늘 순서",
        subtitle: "워밍업 → 개념 → 퀴즈 → 구상",
        note: "활동지가 위에서 아래로 이어져요. 순서대로 내려오면 됩니다.",
        rows: [
          { label: "1", value: "파이썬 타자 도우미 (5분 워밍업, 점수 없음)" },
          { label: "2", value: "피지컬 컴퓨팅 개념 읽기 (센서 → 처리 → 액추에이터)" },
          { label: "3", value: "개념 확인 퀴즈 (선생님과 함께)" },
          { label: "4", value: "실생활 장치 구상하기 (센서+액추에이터 조합)" },
          { label: "마지막", value: "성찰 한두 줄" },
        ],
        highlights: [
          "구상은 상상이면 돼요 — 진짜로 만들 수 있는지는 따지지 않아요.",
        ],
      },
    ],
  },

  video: empty(),

  quiz: QUIZ,

  /*
   * 성찰 — 오늘 잡은 개념 / 만들어 보고 싶은 장치. 개인적이라 비공개.
   */
  reflectionQuestions: [
    "오늘 '피지컬 컴퓨팅' 이 무엇인지 배웠어요. 센서·액추에이터 중 하나를 예로 들어, 한 줄로 설명해 봅시다.",
    "내가 진짜로 만들어 보고 싶은 피지컬 컴퓨팅 장치가 있다면 무엇인가요? 한 가지만 적어 주세요.",
  ],
  reflectionPublic: false,

  /*
   * 파이썬 타자 도우미가 새 탭(바깥)이라, worksheet 단계에서 창을 옮기는 것을 이탈로
   * 세지 않는다 (13차 미로 링크 단계를 focusExempt 로 둔 것과 같은 이유).
   */
  focusExempt: ["worksheet"],
  phaseLabels: {
    assessment: "안내",
    quiz: "개념 퀴즈",
    worksheet: "개념·구상",
  },
  /*
   * 되돌아가기 켬 — 학생이 안내·퀴즈·활동지 사이를 스스로 오갈 수 있다. 교사는 개념 note 를
   * 읽힌 뒤 개념 퀴즈(quiz 단계)를 몰아 진행하고, 다시 활동지 구상 칸으로 돌아온다.
   */
  freeNavigation: true,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리는 차시가 아니다 — 비우면 글만/기록만 하는 활동으로 잡는다
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "피지컬 컴퓨팅 — 감 잡고, 내 장치 구상하기",
      body:
        "위에서부터 순서대로 해요. 타자로 손을 풀고, 개념을 읽은 뒤,\n" +
        "내가 만들어 보고 싶은 장치를 '센서 + 액추에이터' 로 구상해 적어 봅니다.",
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
     * 이 lessonNo 14 자리에는 예전에 마이크로비트(physical-computing) 실습 계획이 있었다.
     * merge 로는 그때의 progress(다음 시간 탭)·progressChecks 가 남아 화면에 섞인다 —
     * FieldValue.delete() 로 명시 삭제한다. quiz 는 이번 차시가 새로 쓰므로 ...PLAN 으로 채운다.
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (개념 입문 통 — 코드 기록 없음. 실습 통 physical-computing 과 분리)`);
  console.log("단계: 대기(지뢰찾기) → 기분 → 안내(assessment) → 개념 퀴즈(quiz) → 활동지(worksheet: 타자·개념·구상) → 성찰");
  console.log("실제 진행: 안내 → 타자 도우미 5분 → 개념 note 읽기 → 개념 퀴즈(교사 진행) → 실생활 구상 → 성찰 (교사가 단추로 진행, freeNavigation)");
  console.log(`파이썬 타자 도우미: ${TYPING_URL} (새 탭, 점수 연동 없음). worksheet focusExempt 로 이탈 오탐 방지.`);
  console.log(`개념 퀴즈: ${QUIZ.questions.length}문항 (정답 있는 지식 퀴즈, 센서/액추에이터·입력→처리→출력). session.quiz — 대시보드 응답 분포로 확인.`);
  console.log("구상 칸(pci_ideas, rows): 아이디어 이름 / 감지할 것(센서) / 반응(액추에이터) / 한 줄 동작 설명 (maxRows 3).");
  console.log("성찰 2문항(오늘 개념 / 만들어 보고 싶은 장치). 진도 팝업 없음. galleryEnabled: false.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
