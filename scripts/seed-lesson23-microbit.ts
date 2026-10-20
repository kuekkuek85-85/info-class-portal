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

/** 대기 화면 = 파이썬 타자 도우미(정보 수업 표준). game.url 이 "link:" 면 설명+새 탭 링크 카드로 뜬다. */
const TYPING_URL = "https://python-typing-helper.vercel.app/";
/** 성찰 보상 게임 = 스네이크. 성찰을 제출하면 '제출하고 게임하기' 로 열린다. */
const SNAKE_URL = "https://snake-game-iota-puce.vercel.app/";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 활동지 (worksheet 단계) — LED 탐색. 블록을 하나씩 찾아 끌어다 놓고 시뮬레이터로 결과를 보며
// 감을 잡고, 값도 바꿔 본다(16차 '찍어보기' 톤). 블록 이름은 한글 MakeCode 표기 + 영어를 함께 준다.
// 기록은 list/text 로 가볍게 남긴다(저장). 안내는 note. 화면 글자는 평문.
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── 먼저 — MakeCode 열기 (새 탭, 시뮬레이터) ── */
  {
    key: "_mb_open",
    phase: "worksheet",
    label: "먼저 — MakeCode 열기",
    hint:
      "아래 [MakeCode 열기] 로 블록 에디터를 새 탭에서 열어요. '새 프로젝트' 를 하나 만들면 돼요.\n" +
      "왼쪽에 마이크로비트 그림(시뮬레이터)이 있어요 — 블록을 놓으면 여기서 바로 움직여요.\n" +
      "오늘은 실물 보드 없이 이 시뮬레이터로만 확인해요(연결·다운로드 안 해요).\n" +
      "가운데 블록 서랍(기본·입력·LED 등)에서 블록을 찾아 끌어다 놓으면 됩니다.",
    kind: "note",
    linkUrl: MAKECODE_URL,
    linkLabel: "MakeCode 열기 (새 탭)",
    maxLength: 0,
  },

  /* ── 탐색 1 — 아이콘 출력(show icon) ── */
  {
    key: "_mb_show_icon",
    phase: "worksheet",
    label: "① 아이콘 출력 — show icon",
    hint:
      "블록 서랍 '기본(Basic)' 에서 '아이콘 출력(show icon)' 블록을 찾아 '시작하면(on start)' 안에\n" +
      "끼워 넣어요. 시뮬레이터 LED에 그림이 떠요.\n" +
      "· 블록의 그림을 눌러 다른 아이콘으로 바꿔 봐요 — 하트, 웃는 얼굴, 네모 등 여러 개가 있어요.\n" +
      "· 마음에 드는 아이콘을 두세 개 바꿔 보며 LED가 어떻게 달라지는지 눈으로 확인해요.",
    kind: "note",
    maxLength: 0,
  },

  /* ── 탐색 2 — LED 출력(show leds): 25칸 직접 칠하기 ── */
  {
    key: "_mb_show_leds",
    phase: "worksheet",
    label: "② LED 출력 — show leds (내 그림 만들기)",
    hint:
      "'기본(Basic)' 에서 'LED 출력(show leds)' 블록을 가져와요. 블록에 5x5 = 25칸이 있어요.\n" +
      "· 칸을 눌러 켜고 끄며 내 그림을 직접 만들어 봐요(점, 네모, 큰 하트 모양 등).\n" +
      "· 마이크로비트 LED는 25개뿐이라, 큰 그림도 25칸 안에서 표현해야 해요 — 그 느낌을 체험해요.",
    kind: "note",
    maxLength: 0,
  },

  /* ── 탐색 3 — 문자열 출력(show string) ── */
  {
    key: "_mb_show_string",
    phase: "worksheet",
    label: "③ 문자열 출력 — show string (글자 흘려보내기)",
    hint:
      "'기본(Basic)' 에서 '문자열 출력(show string)' 블록을 가져와 내 이름이나 'HI' 같은 글자를 적어요.\n" +
      "· LED에 글자가 한 글자씩 흘러가며 지나가요(LED로 글자를 보여주는 한 가지 방법).\n" +
      "· 글자는 영어로 적어요 — 한글은 LED로 잘 안 나와요. 가볍게 한 번 해 보면 돼요.",
    kind: "note",
    maxLength: 0,
  },

  /* ── 탐색 4 — 시작하면 vs 계속 실행(on start / forever) ── */
  {
    key: "_mb_onstart_forever",
    phase: "worksheet",
    label: "④ 시작하면 vs 무한 반복 — on start / forever",
    hint:
      "블록을 어디에 넣느냐에 따라 '한 번' 할지 '계속' 할지가 달라져요.\n" +
      "· 시작하면(on start) 안에 넣으면 — 켜질 때 딱 한 번만 실행돼요.\n" +
      "· 무한 반복(forever) 안에 넣으면 — 멈추지 않고 계속 되풀이해요.\n" +
      "같은 '아이콘 출력' 블록을 시작하면 안과 무한 반복 안에 각각 넣어 보고 차이를 느껴 봐요.",
    kind: "note",
    maxLength: 0,
  },

  /* ── 탐색 5 — 일시 중지(pause ms) ── */
  {
    key: "_mb_pause",
    phase: "worksheet",
    label: "⑤ 일시 중지 — pause (ms), 기다리기",
    hint:
      "'기본(Basic)' 에서 '일시 중지(pause) (ms)' 블록을 가져와요. 숫자만큼 잠깐 기다려요.\n" +
      "· 1000 ms = 1초예요. 숫자를 500, 200 처럼 바꿔 보면 기다리는 시간이 달라져요.\n" +
      "· 두 아이콘 사이에 일시 중지를 넣으면, 바뀌는 속도(빠르기)를 내가 정할 수 있어요.\n" +
      "다음 미션에서 이걸로 하트가 '두근두근' 뛰게 만들어요.",
    kind: "note",
    maxLength: 0,
  },

  /* ── 탐색 기록 (list, 저장) ── */
  {
    key: "mb_explore_log",
    phase: "worksheet",
    label: "눌러본 블록 기록 — 무엇을 바꾸니 무엇이 달라졌나요?",
    hint:
      "위에서 눌러 본 블록 중 기억에 남는 것을 한 줄씩 적어요. [+ 칸 추가] 로 늘릴 수 있어요.\n" +
      "예) 아이콘을 하트에서 웃는 얼굴로 바꿨더니 LED 그림이 바뀌었다 / pause 를 200으로 줄였더니 더 빨라졌다.",
    kind: "list",
    minItems: 3,
    maxItems: 6,
    itemPlaceholder: "예) 어떤 블록을 / 무엇을 바꾸니 / 어떻게 달라졌는지",
    // 문자열 배열을 JSON 으로 한 칸에 담는다(list-field). 여섯 칸이라 넉넉히 잡아도 1,500 안쪽
    maxLength: 1500,
  },

  /* ── 최종 미션 — 두근두근 하트 (블록 순서 평문 안내) ── */
  {
    key: "_mb_mission",
    phase: "worksheet",
    label: "최종 미션 — 두근두근 하트 만들기",
    hint:
      "배운 블록을 모아 하트가 '두근두근' 뛰게 만들어요. 무한 반복(forever) 안에 아래 순서로 블록을 쌓아요:\n\n" +
      "  1. 아이콘 출력(show icon) — 하트(Heart)\n" +
      "  2. 일시 중지(pause) — 500 ms\n" +
      "  3. 아이콘 출력(show icon) — 작은 하트(Small heart)\n" +
      "  4. 일시 중지(pause) — 500 ms\n\n" +
      "이렇게 하면 큰 하트와 작은 하트가 번갈아 뜨면서 심장처럼 두근두근 뛰어요(0.5초마다 바뀌니 1초에 한 번 두근).\n" +
      "· 일시 중지 값(500)을 200이나 1000으로 바꿔 빠르기를 조절해 봐요 — 더 빠르게/느리게 뛰어요.\n" +
      "시뮬레이터에서 두 하트가 번갈아 뛰면 성공!",
    kind: "note",
    maxLength: 0,
  },

  /* ── 미션 기록 (text, 저장) ── */
  {
    key: "mb_mission_done",
    phase: "worksheet",
    label: "미션 확인 — 두근두근 하트, 어떻게 했나요?",
    hint:
      "두근두근 하트를 완성했으면, 일시 중지 값을 얼마로 했을 때 가장 마음에 들었는지 한 줄로 적어 봐요.\n" +
      "(예: 300으로 하니 심장이 빨리 뛰는 것 같아 재밌었다)",
    kind: "text",
    maxLength: 200,
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
   * 안내 보드 — 마이크로비트가 뭔지 + MakeCode(블록) 소개 + 오늘 할 일. 활동 중 되돌아와 볼 수 있다.
   * MakeCode 를 새 탭으로 여는 링크는 활동지 첫 note(_mb_open)에 둔다(탭은 worksheet 단계, focusExempt).
   */
  assessment: {
    heading: "오늘 할 일 — 마이크로비트와 MakeCode로 LED 켜 보기",
    body: "",
    url: "",
    tabs: [
      {
        label: "마이크로비트가 뭐예요?",
        subtitle: "손바닥만 한 작은 컴퓨터",
        note:
          "마이크로비트는 손바닥만 한 작은 컴퓨터예요. 앞면에 작은 불(LED) 25개가 5줄 x 5칸으로 박혀\n" +
          "있어서 그림이나 글자를 보여줄 수 있어요. 버튼 A·B 와 여러 센서(흔들기·밝기·온도 등)도 있어요.\n" +
          "오늘은 그중 'LED 25개' 와 친해져 봅니다.",
        rows: [
          { label: "LED", value: "앞면의 작은 불 25개(5x5) — 그림·글자를 보여줘요" },
          { label: "버튼", value: "A·B 두 개 — 다음 차시부터 입력으로 써요" },
          { label: "센서", value: "흔들기·밝기·온도 등 — 나중에 게임에 써요" },
        ],
        highlights: [
          "오늘은 실물 보드 없이 화면 속 '시뮬레이터' 로만 해 봐요(연결·다운로드 안 해요).",
        ],
      },
      {
        label: "MakeCode가 뭐예요?",
        subtitle: "블록을 끼워 맞춰 코딩하는 곳",
        note:
          "MakeCode 는 블록을 끼워 맞춰 마이크로비트를 움직이는 코딩 도구예요(엔트리처럼 블록 코딩).\n" +
          "블록을 놓으면 왼쪽 시뮬레이터(마이크로비트 그림)에서 바로 결과가 보여요. 오늘은 LED를\n" +
          "켜는 블록들을 하나씩 눌러 보며 감을 잡고, 마지막에 '두근두근 하트' 를 만들어요.",
        rows: [
          { label: "어디서", value: "makecode.microbit.org (활동지에서 새 탭으로 열어요)" },
          { label: "어떻게", value: "블록 서랍에서 블록을 찾아 끌어다 놓기" },
          { label: "확인", value: "왼쪽 시뮬레이터로 바로 보기(값도 바꿔 보기)" },
          { label: "채점은", value: "점수·자동채점 없어요 — 눌러 보고 감만 잡으면 됩니다" },
        ],
        highlights: [
          "파이썬처럼 글자를 치는 게 아니라, 블록을 끼워요. 틀려도 괜찮으니 이것저것 눌러 봐요.",
        ],
      },
    ],
  },

  video: empty(),

  /*
   * 성찰 — 블록으로 바로 반응하는 체험 소감 + 다음 시간 예고. 개인적이라 비공개.
   */
  reflectionQuestions: [
    "블록을 놓으니 마이크로비트(시뮬레이터)가 바로 반응했죠? 가장 재밌었던 블록과 그 이유를 한 줄로 적어 봐요.",
    "다음 시간엔 '기본 코드' 를 포털에서 내려받아 MakeCode로 가져와서 시작해요. 어떤 걸 만들어 보고 싶나요?",
  ],
  reflectionPublic: false,

  /*
   * 새 탭을 여는 단계는 창 이동을 이탈로 세지 않는다 — 대기(파이썬 타자 도우미 링크)와
   * worksheet(MakeCode 링크) 둘 다.
   */
  focusExempt: ["waiting", "worksheet"],
  /*
   * 단계 버튼 순서 — 기분(mood)은 대기 화면에서 받으므로(moodCheckEnabled) 교사 대시보드의
   * 단독 '기분' 단계는 뺀다. phaseOrder 를 명시하지 않으면 LESSON_PHASES 기본이라 기분이 따로 뜬다.
   */
  phaseOrder: ["waiting", "assessment", "worksheet", "reflection"],
  phaseLabels: {
    assessment: "안내",
    worksheet: "LED 탐색",
  },
  /*
   * 되돌아가기 켬 — 학생이 안내·활동지를 스스로 오갈 수 있다. 교사는 안내 → 탐색 블록들 →
   * 최종 미션 순으로 단추로 몬다.
   */
  freeNavigation: true,

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
  console.log("단계: 대기(파이썬 타자 도우미 링크) → 기분 → 안내(assessment: 마이크로비트·MakeCode 소개) → LED 탐색(worksheet) → 성찰. freeNavigation. quiz 없음, 보상=스네이크.");
  console.log(`LED 탐색: MakeCode 열기(${MAKECODE_URL}, 새 탭·focusExempt worksheet) → ① 아이콘 출력 ② LED 출력(25칸) ③ 문자열 출력 ④ 시작하면 vs 무한 반복 ⑤ 일시 중지. 블록 하나씩 눌러보고 값 바꿔 관찰.`);
  console.log("최종 미션: 두근두근 하트 — 무한 반복 안에 '아이콘 출력(하트) → 일시 중지 → 아이콘 출력(작은 하트) → 일시 중지' 반복. pause 값으로 빠르기 조절.");
  console.log("저장 입력: 탐색 기록(mb_explore_log, list 3~6) · 미션 기록(mb_mission_done, text). 블록 안내는 note(평문). 외부 링크는 makecode.microbit.org 하나.");
  console.log("성찰 2문항(재밌던 블록 · 다음 시간 예고: 기본 코드 내려받아 MakeCode 가져오기). galleryEnabled: false. sourcesEnabled: false. 실물 보드·플래싱 없음(시뮬레이터).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
