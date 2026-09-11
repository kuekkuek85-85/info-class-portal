/**
 * 13차시 차시 계획 등록 — 「피지컬 컴퓨팅 ① — 마이크로비트 파이썬 첫걸음」.
 *
 *   node --env-file=.env.local scripts/seed-lesson13.ts
 *   node --env-file=.env.local scripts/seed-lesson13.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ※ 12차시는 「도우미 선발」(별도 seed-lesson12.ts, activityId helper-selection)로 바뀌었다.
 *   마이크로비트 첫 시간은 그 뒤 13차로 밀렸다 — 내용은 그대로다.
 *
 * ## 새 단원의 첫 시간이다 (디지털 문화 단원은 11차로 끝)
 *
 * 12차(도우미 선발)에 이어, 13차부터 마이크로비트 파이썬으로 실제 코딩을 시작한다
 * (두 번째 큰 단원 **프로그래밍 + 피지컬 컴퓨팅**, 약 40차시, 12월 말까지).
 * 아크: **마이크로비트 파이썬 → 바이브 코딩(포털 내부 Gemini) → 햄스터 파이썬(수행평가2)**.
 * 블록 코딩은 쓰지 않는다 — 파이썬 한 언어로 마이크로비트에서 햄스터까지 관통한다.
 *
 * 그래서 활동 통(activityId)을 **새로** 판다: `physical-computing`. 디지털 윤리 통
 * (digital-ethics)은 재사용하지 않는다. 이후 마이크로비트·햄스터 차시가 이 통을 이어 쓴다.
 *
 * ## 이 시간의 목적 — 첫 성공 경험 (문법 절벽 회피가 최우선)
 *
 * 중1의 첫 텍스트 코딩이다. **빈 화면을 주지 않는다.** 스캐폴딩된 스타터 코드를 주고,
 * 그걸 **고쳐 써서(copy & modify)** 보드가 즉시 반응하는 것을 경험하게 한다. 목표는
 * (1) 단원이 뭘 향하는지 감 잡기 (2) 편집기 진입 (3) 스타터 코드 고쳐 써서 보드가
 * 반응하는 것 보기 (4) 작은 "내 것으로 바꾸기" 한 번. 첫 성공이 목적이다.
 *
 * ## 채점 철학 (이 단원 공통) — 코드 글자를 읽어 채점하지 않는다
 *
 * 보드/로봇이 되나 안 되나(행동)로 판단하고, 학생이 "무엇을 시켰고 → 뭐가 틀렸고 →
 * 어떻게 고쳤나"를 자기 말로 설명하게 한다. 오늘은 그 씨앗으로 ④ 설명 칸을 가볍게 둔다.
 *
 * ## 포털의 역할 — 진행 틀·안내·기록 (실제 코딩은 외부 편집기)
 *
 * 실제 코딩은 **python.microbit.org**(공식 MicroPython 편집기: 시뮬레이터 + WebUSB
 * 플래싱, v2 지원)에서 일어난다. 포털은 대기 게임·기분·오늘 할 일 보드·단계별 미션 카드
 * (고쳐 쓸 스타터 코드 제시)·짧은 기록·성찰·다음 시간을 담는다.
 *
 * 스타터 코드는 worksheet 문항의 **`code` 필드**로 준다 — 등폭 readonly 칸이라 파이썬
 * 들여쓰기가 보존되고, 학생이 복사해 편집기에 붙여 고쳐 쓴다(hint 는 들여쓰기가 뭉개짐).
 *
 * ## 40분에 맞춘 압축 (교사 톤: 9·10차와 같음)
 *
 * 교시 45분 중 끝 5분은 태블릿·보드 정리라 실활동은 약 40분:
 *
 *   0–3   대기·기분·출석
 *   3–8   오늘 할 일 보드(assessment) — 단원 소개 + 오늘 목표 + 편집기 진입 + 채점 방식
 *   8–13  편집기 들어가기 — python.microbit.org 열고 시뮬레이터 확인, 보드 연결
 *   13–23 미션 1 · 얼굴 하나 띄우기 → 다른 그림으로 바꿔 보기
 *   23–33 미션 2 · 표정 바꾸기(깜빡이기) → 속도·그림 바꿔 보기
 *   33–38 ③ 내 것으로 바꾸기 + ④ 설명 짧게 기록
 *   38–40 성찰 → 다음 시간 → 정리
 *
 * 숙제/집에 내주는 것은 없다(단어도 쓰지 않는다). 각 반 30번은 테스트 학생(리허설)이다.
 *
 * ## 열어 둔 선택 (첫 초안 — 선생님이 보고 확정)
 *
 *  · 편집기: python.microbit.org 를 기본으로 잡았다. 학교 PC(크롬/엣지)에서 WebUSB
 *    플래싱이 되는지 확인 필요. 대안: MakeCode 파이썬 뷰. 시뮬레이터만으로도 첫 시간은
 *    돌아가므로, 플래싱이 막혀도 수업은 성립한다(보드 연결은 되는 학생부터).
 *  · 첫 미션 소재: 하트/표정(LED 매트릭스). v2 의 마이크·스피커·터치 로고는 다음 시간
 *    소재로 남겨 두었다(오늘은 성공률 높은 LED 부터).
 *  · 스크린샷 기록: 사진 업로드(m12_shot)를 **선택**으로 넣었다. 40분이 빠듯하면 빼도 된다.
 *  · 공유(galleryEnabled): 지금은 꺼 두었다. "내가 만든 것" 을 서로 보게 열 수도 있다(후속).
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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
const LESSON_NO = 13;

/** 9~11차시와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/**
 * **새 활동 통.** 프로그래밍·피지컬 컴퓨팅 단원(12차~)이 이어 쓴다 — 마이크로비트에서
 * 햄스터까지 한 통. 디지털 윤리 통(digital-ethics)과 물리적으로 다른 문서라 안 섞인다.
 */
const ACTIVITY_ID = "physical-computing";

/** 공식 MicroPython 편집기 (시뮬레이터 + WebUSB 플래싱, v2 지원). 선생님 확인 후 확정 */
const EDITOR_URL = "https://python.microbit.org/";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/* ──────────────────────────────────────────────────────────────
 * 스타터 코드 — 고쳐 쓸 것. code 필드로 주어 들여쓰기를 보존한다.
 * 백틱(템플릿 리터럴)으로 두어 파이썬 들여쓰기가 글자 그대로 남게 한다.
 * ────────────────────────────────────────────────────────────── */

/** 미션 1 — 얼굴 하나 띄우기 (들여쓰기 없음, 가장 쉬운 첫 코드) */
const CODE_M1 = `from microbit import *

display.show(Image.HEART)`;

/** 미션 2 — 표정 바꾸기(깜빡이기). while 반복과 들여쓰기가 처음 나온다 */
const CODE_M2 = `from microbit import *

while True:
    display.show(Image.HAPPY)
    sleep(500)
    display.show(Image.ASLEEP)
    sleep(500)`;

const WORKSHEET: WorksheetQuestion[] = [
  /*
   * 모두 worksheet 한 단계에 순서대로 둔다(9·10차의 STEP 분리와 달리, 오늘은 미션이
   * 짧게 이어져 한 화면에서 위→아래로 흐르는 편이 낫다). 문항 순서가 곧 학생이 보는 순서.
   */

  /* ── 편집기 들어가기 ── */
  {
    key: "_m12_enter",
    phase: "worksheet",
    label: "편집기 들어가기 — 마이크로비트 파이썬",
    hint:
      "아래 단추로 파이썬 편집기를 새 창에서 엽니다(크롬 또는 엣지에서 열어 주세요).\n" +
      "· 먼저 편집기 안 시뮬레이터로 코드를 실행해 볼 수 있어요.\n" +
      "· 보드를 USB로 연결하고 「Send to micro:bit(연결·플래시)」 를 누르면 진짜 보드로 보냅니다.\n" +
      "· 연결이 안 되면: 편집기에서 파일을 내려받아(.hex), 컴퓨터에 뜬 MICROBIT 드라이브에 끌어다 놓으세요.\n" +
      "다 하고 이 화면으로 돌아오세요.",
    kind: "note",
    linkUrl: EDITOR_URL,
    linkLabel: "마이크로비트 파이썬 편집기 열기 (새 창)",
    maxLength: 0,
  },

  /* ── 미션 1 · 얼굴 하나 띄우기 ── */
  {
    key: "_m12_m1",
    phase: "worksheet",
    label: "미션 1 · 얼굴 하나 띄우기",
    hint:
      "아래 코드를 편집기에 그대로 넣고 실행해 보세요(시뮬레이터 → 보드).\n" +
      "빨간 LED로 하트가 떠야 성공이에요.\n\n" +
      "성공했으면 이제 내 것으로 한 번 바꿔 봅니다:\n" +
      "· Image.HEART 를 다른 그림으로 바꿔 보세요.\n" +
      "  예) Image.HAPPY · Image.DUCK · Image.GHOST · Image.YES · Image.NO · Image.SURPRISED\n" +
      "· 바꾼 뒤 다시 실행해서 그림이 바뀌는지 확인!",
    kind: "note",
    code: CODE_M1,
    maxLength: 0,
  },

  /* ── 미션 2 · 표정 바꾸기(깜빡이기) — while 반복과 들여쓰기 첫 등장 ── */
  {
    key: "_m12_m2",
    phase: "worksheet",
    label: "미션 2 · 표정 바꾸기 (깜빡이기)",
    hint:
      "이번엔 두 표정이 번갈아 나오게 해 봅니다. 아래 코드를 넣고 실행해 보세요.\n" +
      "· while True: 아래 줄들은 앞에 **띄어쓰기(들여쓰기)** 가 있어야 해요 — 복사하면 그대로 들어갑니다.\n" +
      "· sleep(500) 은 0.5초 기다리라는 뜻이에요.\n\n" +
      "성공했으면 내 것으로 바꿔 봅니다:\n" +
      "· sleep 숫자를 바꿔 더 빠르게/느리게 (예: 200, 1000)\n" +
      "· 두 표정을 다른 그림으로 바꿔 보기",
    kind: "note",
    code: CODE_M2,
    maxLength: 0,
  },

  /* ── ③ 내 것으로 바꾸기 (짧은 기록) ── */
  {
    key: "m12_make_mine",
    phase: "worksheet",
    label: "③ 내 것으로 바꾸기 — 무엇을 어떻게 바꿨나요",
    hint:
      "위 미션에서 코드를 어떻게 바꿔 봤는지 한두 줄로 적어 주세요.\n" +
      "예) 하트를 오리로 바꿨다. / sleep 을 200으로 줄여서 더 빨리 깜빡이게 했다.",
    kind: "long",
    maxLength: 300,
  },

  /* ── ④ 설명 (채점 철학의 씨앗: 시킨 것 → 틀린 것 → 고친 것) ── */
  {
    key: "m12_explain",
    phase: "worksheet",
    label: "④ 설명 — 무엇을 시켰고, 뭐가 안 됐고, 어떻게 고쳤나요",
    hint:
      "오늘 코드로 보드에게 무엇을 시켰나요? 하다가 안 된 것이 있었다면 무엇이었고, 어떻게 " +
      "고쳤나요? (안 막혔으면 '무엇을 시켰나' 만 적어도 돼요.)\n" +
      "코드를 잘 썼는지가 아니라, 내가 무엇을 했는지 설명하는 칸이에요.",
    kind: "long",
    maxLength: 400,
  },

  /* ── (선택) 사진 기록 ── */
  {
    key: "m12_shot",
    phase: "worksheet",
    label: "(선택) 내 보드·화면 사진",
    hint:
      "원하면 보드에 뜬 모습이나 편집기 화면을 사진으로 올려도 좋아요. 안 올려도 됩니다.\n" +
      "카메라로 찍어 고르거나, 화면을 캡처해 붙여넣을 수 있어요.",
    kind: "image",
    // 데이터 URL 로 답에 담기므로 maxLength 가 곧 용량 상한이다(image-field). mt3 와 같은 값
    maxLength: 260_000,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "피지컬 컴퓨팅 ① — 마이크로비트 파이썬 첫걸음",
  moodCheckEnabled: true,

  game: {
    heading: "기다리는 동안 — 한붓그리기",
    body:
      "수업이 시작되길 기다리는 동안 잠깐 쉬어요.\n" +
      "선을 한 번도 떼지 않고, 같은 길을 두 번 지나지 않게 모든 선을 그려 보세요.\n" +
      "점과 점을 이으면 됩니다. 막히면 다시 시작할 수 있어요.\n수업이 시작되면 닫습니다.",
    url: "https://euler-path-game.vercel.app/",
  },
  gameExplainer: empty(),

  /*
   * 다음 시간(progress) — 교사가 수업 끝에 눌러 보여준다(9·10차와 같은 방식).
   * 이 단원이 향하는 곳을 짧게 예고한다.
   */
  progress: {
    heading: "다음 시간 — 마이크로비트로 더",
    body: "",
    url: "",
    tabs: [
      {
        label: "다음 시간에 할 일",
        subtitle: "오늘 성공한 것 위에 조금씩 더 쌓아 갑니다",
        note:
          "다음 시간에는 버튼·소리·움직임처럼 마이크로비트로 할 수 있는 것을 더 해 봅니다.\n" +
          "이 단원이 가는 길: 마이크로비트 파이썬 → 컴퓨터와 함께 만들기(바이브 코딩) → 햄스터 로봇.",
        rows: [
          { label: "오늘", value: "스타터 코드를 고쳐 써서 보드가 반응하는 것 경험" },
          { label: "다음", value: "버튼·소리 등으로 보드에 반응 더 넣기" },
          { label: "나중", value: "컴퓨터와 함께 코딩 → 햄스터 로봇 움직이기(수행평가 2)" },
        ],
        highlights: [
          "코드를 잘 외우는 게 아니라, 시켜 보고 안 되면 고치는 것 — 그게 프로그래밍이에요.",
        ],
      },
    ],
  },

  /*
   * 오늘 할 일 보드 — 단원 소개 + 오늘 목표 + 편집기 진입 + 채점 방식. 활동 중 되돌아와 본다.
   */
  assessment: {
    heading: "오늘 할 일 — 마이크로비트 파이썬 첫걸음",
    body: "",
    url: "",
    tabs: [
      {
        label: "새 단원 소개",
        subtitle: "이제부터 '만드는' 공부를 합니다 — 프로그래밍과 로봇",
        note:
          "지난 단원(디지털 문화)은 끝났어요. 이제부터는 파이썬으로 직접 코드를 써서\n" +
          "작은 컴퓨터(마이크로비트)와 로봇(햄스터)을 움직여 봅니다.",
        rows: [
          { label: "무엇을", value: "마이크로비트 파이썬 → 컴퓨터와 함께 코딩 → 햄스터 로봇" },
          { label: "언어", value: "파이썬 하나로 갑니다 (블록 코딩은 쓰지 않아요)" },
          { label: "방식", value: "빈 화면부터 쓰지 않아요 — 주어진 코드를 고쳐 쓰며 시작합니다" },
          { label: "평가는", value: "코드 글자가 아니라, 보드가 되는지 + 내가 한 걸 설명하는지" },
        ],
        highlights: [
          "처음이라 어렵지 않아요. 오늘은 '고쳐 써서 보드가 반응하는 것' 한 번 성공하면 됩니다.",
        ],
      },
      {
        label: "오늘 목표",
        subtitle: "스타터 코드를 고쳐 써서 보드가 반응하게",
        note: "설명은 앞 화면으로 같이 봅니다. 이 탭들은 활동 중에 되돌아와 볼 수 있어요.",
        rows: [
          { label: "목표 ①", value: "파이썬 편집기에 들어가 코드를 실행할 수 있다." },
          { label: "목표 ②", value: "주어진 코드를 고쳐 써서 마이크로비트가 반응하게 할 수 있다." },
          { label: "오늘 순서", value: "편집기 들어가기 → 미션 1(얼굴) → 미션 2(깜빡이기) → 내 것으로 바꾸기 → 설명" },
        ],
        highlights: [
          "코드는 복사해서 넣고, 한 군데씩 바꿔 보세요. 바꾸면 보드가 바로 달라져요.",
        ],
      },
      {
        label: "편집기 들어가기",
        subtitle: "python.microbit.org — 크롬 또는 엣지에서",
        note:
          "실제 코딩은 이 편집기에서 합니다. 아래 순서대로 하면 돼요.\n" +
          "(먼저 시뮬레이터로 확인하고, 그다음 진짜 보드로 보냅니다.)",
        rows: [
          { label: "1. 열기", value: "아래 미션의 「편집기 열기」 단추 — 크롬/엣지에서 새 창으로" },
          { label: "2. 확인", value: "편집기 안 시뮬레이터에서 코드를 먼저 실행해 보기" },
          { label: "3. 연결", value: "보드를 USB로 꽂고 「Send to micro:bit(연결·플래시)」" },
          { label: "안 되면", value: "파일 내려받기(.hex) → 뜬 MICROBIT 드라이브에 끌어다 놓기" },
        ],
        highlights: [
          "연결이 안 돼도 시뮬레이터로 코드가 되는 것을 볼 수 있어요 — 먼저 그것부터 성공해요.",
        ],
      },
      {
        label: "채점은 이렇게",
        subtitle: "코드 글자를 읽어 채점하지 않아요",
        note: "",
        rows: [
          { label: "무엇으로", value: "보드(로봇)가 시킨 대로 되는지 — 행동으로 봅니다" },
          { label: "설명하기", value: "무엇을 시켰고 → 뭐가 안 됐고 → 어떻게 고쳤나 (④ 칸)" },
          { label: "안 막혀도", value: "'무엇을 시켰나' 만 적어도 됩니다" },
        ],
        highlights: [
          "틀리는 건 문제가 아니에요. 안 되면 고쳐 보는 것 자체가 오늘 하는 일이에요.",
        ],
      },
    ],
  },

  video: empty(),

  /*
   * 성찰 한 문항 — 처음 코드를 고쳐 보드를 움직여 본 소감. 개인적이라 비공개.
   */
  reflectionQuestions: [
    "오늘 처음으로 코드를 고쳐서 마이크로비트를 움직여 봤어요. 어땠는지, 또는 다음에 " +
      "해 보고 싶은 것을 한 가지 적어 봅시다.",
  ],
  reflectionPublic: false,

  /*
   * 편집기가 바깥 창(python.microbit.org)이라, worksheet 단계에서 창을 옮기는 것을
   * 이탈로 세지 않는다 (10차시 체험 링크 단계를 focusExempt 로 둔 것과 같은 이유).
   */
  focusExempt: ["worksheet"],
  phaseLabels: {
    assessment: "오늘 할 일",
    worksheet: "마이크로비트 코딩",
    progress: "다음 시간",
  },
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리는 차시가 아니다 — 비우면 글만/기록만 하는 활동으로 잡는다
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "마이크로비트 파이썬 — 고쳐 써서 움직이기",
      body:
        "위에서부터 순서대로 해요. 편집기를 열고, 미션 코드를 넣어 실행한 뒤,\n" +
        "한 군데씩 바꿔 보세요. 바꾸면 보드가 바로 달라져요.",
    },
    worksheet: WORKSHEET,
    /*
     * 서로 구경하기는 지금은 **막는다.** 첫 시간은 기록이 가벼운 편이라 공유의 득이 작고,
     * 사진에 얼굴 등이 들어갈 수 있어 안전하게 둔다. 후속 차시에서 열 수 있다(열어 둔 선택).
     */
    galleryEnabled: false,
    // 출처 두 칸은 수행평가1(기사)의 항목이라 붙던 것 — 이 단원에선 쓰지 않는다
    sourcesEnabled: false,
  },
};

async function main(): Promise<void> {
  const existing = await db.collection(LESSON_PLANS).where("lessonNo", "==", LESSON_NO).get();
  const now = Date.now();

  if (!existing.empty) {
    const doc = existing.docs[0];
    await doc.ref.set({ ...PLAN, updatedAt: now }, { merge: true });
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
          progress: PLAN.progress,
          assessment: PLAN.assessment,
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (프로그래밍·피지컬 컴퓨팅 단원의 새 통 — 이후 마이크로비트·햄스터 차시가 이어 씀)`);
  console.log("단계: 대기 → 기분 → 오늘 할 일(assessment) → 마이크로비트 코딩(worksheet) → 성찰 → 다음 시간 → 마침");
  console.log(`편집기: ${EDITOR_URL} (공식 MicroPython, 시뮬레이터+WebUSB, v2). 학교 PC 크롬/엣지에서 확인 필요.`);
  console.log("미션: 1) 얼굴 하나 띄우기(하트→다른 그림)  2) 표정 깜빡이기(while+sleep, 속도·그림 바꾸기)");
  console.log("기록: ③ 내 것으로 바꾸기(long) · ④ 설명(long) · (선택) 사진(image). galleryEnabled: false.");
  console.log("스타터 코드는 worksheet code 필드로 제시(등폭 readonly, 들여쓰기 보존 + 복사 단추).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
