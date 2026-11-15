/**
 * 25차시 차시 계획 등록 — 「만보기 만들고 AI로 기능 더하기」 (마이크로비트 MakeCode 아크).
 *
 *   node --env-file=.env.local scripts/seed-lesson25.ts
 *   node --env-file=.env.local scripts/seed-lesson25.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 24차에 이어지는 MakeCode 아크 3번째 차시
 *
 * 23차(두근두근 하트)·24차(나만의 LED 애니메이션)에서 LED·반복과 친해졌다. 오늘은 (1) '걸음' 변수를
 * 만들어 화면에 보여주고(미션 1), (2) **흔들면(가속도 센서)** 걸음이 1씩 늘어나는 만보기를 완성하고
 * (미션 2), (3) **AI에게 말로 기능을 부탁해** 만보기에 기능 하나를 더한 전체 코드를 받아 붙여 실행한다
 * (미션 3, 바이브 코딩의 마이크로비트판). 변수(만들기·증가·출력) + 흔들기 이벤트 + 'AI로 기능 추가' 를
 * 한 차시에서 이어 익히고, 수행평가의 '코딩에 생성형 AI 활용 가능' 으로 자연스럽게 잇는다.
 *
 * ## 파일·번호·통
 *
 *  · LESSON_NO = 25 (비어 있음 확인).
 *  · activityId = microbit-makecode (23·24차와 같은 통, 이어 씀). 파이썬 통(python-dodge-game)·파킹된
 *    MicroPython 통(physical-computing)과 섞지 않는다.
 *
 * ## 미션 1·2 — 뼈대 코드 + 빈칸 채우기 (24차 관례 계승, [[makecode-paste-fill-missions]])
 *
 * 각 미션의 note 에 뼈대 코드(code 필드, 복사 가능)를 준다. "기존 코드 모두 지우고(Ctrl+A → Delete) 맨
 * 처음에 붙여넣기" 안내 뒤, 각 '# (미션)' 자리의 pass 를 지우고 한글 미션 주석대로 한두 줄을 채운다.
 * '코드 복사하기' 바로 밑에 [MakeCode 열기] 를 둔다(24차와 동일 — note 에 code + linkUrl). 각 미션 끝에
 * 공유 링크 제출(long, 자동저장)을 둔다.
 *
 * ## ★ 미션 3 — AI로 기능 추가 (바이브 코딩의 마이크로비트판)
 *
 * vibe_code 문항(vibeTarget: "microbit")이다. 학생이 "A+B 누르면 0으로 초기화" 같은 기능을 말로 적으면,
 * 서버가 Gemini 를 불러 **만보기 전체 + 그 기능**이 든 완성 MakeCode static Python 코드를 돌려준다(추가분만
 * 아님). 바탕 만보기 코드는 서버의 vibe-code.ts MICROBIT_MANBOGI_BASE 를 쓴다(차시가 vibeBaseCode 를 안
 * 주면 그 값으로 물러남 — 한곳에서 관리). 생성 코드 패널에 '코드 복사하기 + 바로 밑 MakeCode 열기' 가
 * 24차 애니메이터처럼 붙는다. 프롬프트·AI 답은 저장돼 교사가 열람하고, "선생님이 볼 수 있어요" 를 늘 띄운다.
 *
 * ## 에디터 검증 (2026-10-25, makecode.microbit.org '파이썬 보기')
 *
 *  · 한글 변수 '걸음' — 붙여넣기·블록 변환·시뮬레이터 동작 확인(숫자 출력/흔들기/버튼 모두). steps 로
 *    바꿀 필요 없음.
 *  · 미션 1·2 뼈대(완성형: steps=0 + show_number, 흔들기 + global steps + steps += 1 + show_number) 확인.
 *  · 미션 3 생성 예시(A+B 초기화, 소리 추가) — 전체 코드 붙여넣기·블록 변환·시뮬레이터 동작 확인.
 *
 * ## 구성 (40분, 정보 차시 관례) — 안내문 평문. 외부 링크는 makecode.microbit.org 하나.
 *
 * 대기(파이썬 타자 도우미)·기분·출석 → 안내(assessment) → 미션 1·2·3 → 성찰(스네이크 보상). freeNavigation off.
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
const LESSON_NO = 25;

/** 18~24차와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/** 23·24차와 같은 MakeCode 피지컬 아크 전용 통. 파이썬 통·파킹된 MicroPython 통과 분리. */
const ACTIVITY_ID = "microbit-makecode";

/** MakeCode 블록/파이썬 에디터(공식). 새 탭으로 열어 '파이썬(Python) 보기' 에 뼈대/생성 코드를 붙인다. */
const MAKECODE_URL = "https://makecode.microbit.org/";

/**
 * 미션 1 뼈대 코드 — 복사해 MakeCode 'Python' 의 기존 코드를 지우고 맨 처음에 붙여넣는다.
 * 맨 위 'steps = 0' 으로 변수를 만들고, on_forever 안의 pass 를 지우고 걸음 수를 화면에 숫자로 보여준다.
 * (완성형: basic.show_number(steps) — 에디터에서 블록 변환·동작 확인됨.)
 */
const CODE_M1 = `# 걸음 수를 담을 변수 steps (0부터 시작)
steps = 0

def on_forever():
    # (미션) 아래 pass 를 지우고, 걸음 수를 화면에 숫자로 보여주세요
    pass

basic.forever(on_forever)`;

/**
 * 미션 2 뼈대 코드 — 흔들면 걸음이 1 늘고 화면에 보여주는 만보기. pass 를 지우고 두 줄을 채운다.
 * global steps 은 '밖에서 만든 steps 변수를 이 안에서 바꾼다' 는 뜻(그대로 둔다 — MakeCode Python 규칙).
 * (완성형: steps += 1 / basic.show_number(steps) — 에디터에서 블록 변환·흔들기 동작 확인됨.)
 */
const CODE_M2 = `# 걸음 수를 담을 변수 steps (0부터 시작)
steps = 0

def on_gesture_shake():
    global steps
    # (미션) 아래 pass 를 지우고: ① 걸음을 1 늘리고  ② 걸음 수를 화면에 숫자로 보여주세요
    pass

input.on_gesture(Gesture.SHAKE, on_gesture_shake)`;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 활동지 — 미션을 세 단계로 쪼갠다(교사 확정): 미션 1(build) · 미션 2(grill) · 미션 3(mvp). 범용 슬롯을
// 빌려 쓰고 이름은 phaseLabels 로 붙인다. 각 단계 끝에 '공유 링크 제출' 칸(long, 자동저장)을 둔다.
// MakeCode 열기 링크는 미션 1·2 의 코드 note(linkUrl), 미션 3 은 바이브 코딩 패널 안에 붙는다. 화면 글자는
// 평문. 공유 링크는 학생 작품 링크라 갤러리 비공개(galleryAnswerKeys 에 안 넣는다).
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── 미션 1 (build) — steps 변수 만들고 화면에 보여주기 ── */
  {
    key: "_mb25_m1",
    phase: "build",
    label: "미션 1 — 걸음 수를 화면에 보여주기 (만보기 ①)",
    hint:
      "아래 '코드 복사하기' 로 뼈대 코드를 복사해, MakeCode 'Python' 의 기존 코드를 모두 지우고\n" +
      "(Ctrl+A → Delete) 맨 처음에 붙여넣어요. 맨 위 'steps = 0' 은 걸음 수를 담는 변수를 0으로 만드는\n" +
      "거예요. 그다음 on_forever 안의 pass 를 지우고 basic.show_number(steps) 을 넣어, 화면에 걸음 수\n" +
      "(지금은 0)가 보이게 완성해요.\n" +
      "(아래 [MakeCode 열기] 로 새 탭에서 열고, 위쪽을 'Python' 으로 바꾼 뒤 붙여넣어요. 왼쪽\n" +
      "시뮬레이터에 0 이 보이면 성공!)",
    kind: "note",
    imageUrl: "/mb25-num0.svg",
    imageAlt: "마이크로비트 화면에 숫자 0 이 떠 있는 실행 결과(아직 흔들기 전)",
    imageSide: "right",
    imageSideWidth: "third",
    code: CODE_M1,
    linkUrl: MAKECODE_URL,
    linkLabel: "MakeCode 열기 (새 탭)",
    maxLength: 0,
  },
  /* ── 미션 2 (grill) — 흔들면 걸음 1 늘리기 (만보기 완성) ── */
  {
    key: "_mb25_m2",
    phase: "grill",
    label: "미션 2 — 흔들면 걸음이 올라가게 (만보기 ②)",
    hint:
      "이번엔 '흔들면' 걸음이 1씩 늘어나는 진짜 만보기예요. 아래 '코드 복사하기' 로 뼈대 코드를 복사해,\n" +
      "MakeCode 'Python' 의 기존 코드를 모두 지우고 맨 처음에 붙여넣어요.\n" +
      "흔들림을 감지하면 on_gesture_shake 가 실행돼요. 그 안의 'global steps' 은 밖에서 만든 steps 변수를\n" +
      "여기서 바꾸겠다는 뜻이니 그대로 둬요. pass 를 지우고 두 줄을 넣어요:\n" +
      "   steps += 1            ← 걸음을 1 늘리기\n" +
      "   basic.show_number(steps)   ← 걸음 수를 화면에 보여주기\n" +
      "(시뮬레이터 위쪽 SHAKE 버튼을 눌러 숫자가 올라가면 성공! 실제 보드라면 흔들면 올라가요.)",
    kind: "note",
    imageUrl: "/mb25-count.svg",
    imageAlt: "마이크로비트 화면 숫자가 흔들 때마다 1씩 올라 0에서 10까지 세는 움직이는 실행 결과",
    imageSide: "right",
    imageSideWidth: "third",
    code: CODE_M2,
    linkUrl: MAKECODE_URL,
    linkLabel: "MakeCode 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "mb25_share2",
    phase: "grill",
    label: "미션 2 공유 링크 제출",
    hint:
      "만보기가 되면 MakeCode 위쪽 '공유(Share)' 를 눌러 만든 링크를 아래 칸에 붙여넣어요.\n" +
      "적으면 자동으로 저장돼요(따로 제출 버튼은 없어요).",
    kind: "long",
    maxLength: 300,
  },

  /* ── 미션 3 (mvp) — AI로 기능 추가 (바이브 코딩의 마이크로비트판) ── */
  {
    key: "_mb25_m3_intro",
    phase: "mvp",
    label: "미션 3 — AI에게 기능 하나를 부탁하기",
    hint:
      "이번엔 코드를 직접 쓰지 않고, AI에게 말로 부탁해요! 내 만보기에 더하고 싶은 기능을 한 문장으로\n" +
      "적으면, AI가 '만보기 전체 + 그 기능' 이 든 완성 코드를 만들어 줘요. 그걸 '코드 복사하기' 로 복사해\n" +
      "MakeCode 'Python' 에 (기존 코드 모두 지우고) 붙여넣어 실행해요.\n\n" +
      "이런 걸 부탁해 볼 수 있어요:\n" +
      "  · A와 B 버튼을 같이 누르면 걸음 수가 0으로 초기화되게 해 줘\n" +
      "  · 걸음이 올라갈 때마다 '삐' 소리가 나게 해 줘\n" +
      "  · A 버튼을 누르면 지금 걸음 수를 보여주게 해 줘\n\n" +
      "AI가 준 코드가 한 번에 안 될 수도 있어요 — 그게 정상이에요. 설명을 읽고, 다시 부탁하거나 조금씩\n" +
      "고쳐 봐요. (내가 AI에게 보낸 말과 받은 코드는 저장되고, 선생님이 볼 수 있어요.)",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "mb25_vibe",
    phase: "mvp",
    label: "AI에게 기능 부탁하기 — 만보기에 더할 기능을 말로 적어요",
    hint:
      "더하고 싶은 기능을 한 번에 하나씩, 동작으로 적어요. AI가 만보기 전체 코드에 그 기능을 더해 줘요.\n" +
      "'코드 복사하기' 로 복사해 아래 [MakeCode 열기] 로 열고 'Python' 에 붙여넣어 실행해요.",
    kind: "vibe_code",
    // 25차: 마이크로비트 MakeCode static Python. 바탕 만보기 코드는 서버 vibe-code.ts 의
    // MICROBIT_MANBOGI_BASE 를 쓴다(vibeBaseCode 를 안 주면 그 값으로 물러남 — 한곳에서 관리).
    vibeTarget: "microbit",
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "만보기 만들고 AI로 기능 더하기",
  moodCheckEnabled: true,
  // "다 했어요 — 선생님께 알리기" 버튼 숨김(24차와 동일) — 이 차시는 제출·통과가 없고, 공유 링크·바이브
  // 코딩 기록이 자동저장이라 제출 버튼이 필요 없다. 성찰 보상 게임은 성찰 제출로 열린다.
  hideDoneButton: true,

  // 대기 화면 = 파이썬 타자 도우미(정보 수업 표준, 교사 확정). url 이 "link:" 면 설명+새 탭 링크 카드로 뜬다.
  game: {
    heading: "기다리는 동안 — 파이썬 타자 연습",
    body:
      "수업이 시작되길 기다리는 동안 파이썬 타자 연습을 해 봐요.\n" +
      "아래 단추로 새 탭에서 열려요. 수업이 시작되면 돌아오세요.",
    url: "link:https://python-typing-helper.vercel.app/",
  },
  gameExplainer: empty(),

  // 성찰 보상 게임 = 스네이크(24차와 동일, 교사 확정). 성찰을 제출하면 '제출하고 게임하기' 로 열린다.
  rewardGame: {
    heading: "수고했어요! 🎮",
    body: "성찰을 제출했으면 잠깐 스네이크 게임으로 쉬어요. 선생님이 부르면 돌아오세요.",
    url: "https://snake-game-iota-puce.vercel.app/",
  },

  // 다음 시간(progress) 단계는 두지 않는다 — 안내(assessment)가 이미 있어 중복이다.
  progress: empty(),

  /*
   * 안내 보드 — 오늘 할 일(미션 1·2·3) + MakeCode. 여는 링크는 각 미션 note(미션1·2)·바이브 패널(미션3)에 둔다.
   */
  assessment: {
    heading: "오늘 할 일 — 만보기 만들고, AI로 기능 더하기",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "변수 → 흔들기 → AI로 기능 추가",
        note:
          "'steps' 라는 변수를 만들어 화면에 보여주고(미션 1), 흔들면 걸음이 1씩 늘어나는 만보기를\n" +
          "완성해요(미션 2). 그다음 AI에게 말로 기능을 부탁해, 만보기에 기능 하나를 더한 전체 코드를\n" +
          "받아 붙여 실행해요(미션 3).",
        rows: [
          { label: "미션 1", value: "steps 변수를 0으로 만들고, 화면에 걸음 수 보여주기" },
          { label: "미션 2", value: "흔들면(가속도 센서) 걸음이 1씩 올라가게 — 만보기 완성" },
          { label: "미션 3", value: "AI에게 말로 기능 부탁 → 만보기 전체 코드 받아 붙여 실행" },
          { label: "채점은", value: "점수·자동채점 없어요 — 만들어 보고 돌아가면 성공" },
        ],
        highlights: [
          "미션 1·2 는 뼈대 코드를 복사해 '# (미션)' 자리의 pass 를 채워 완성해요.",
          "미션 3 은 AI가 만보기 '전체' 코드를 줘요 — 복사해서 통째로 붙여넣어요.",
        ],
      },
      {
        label: "MakeCode 다시 보기",
        subtitle: "블록도, 파이썬도 같은 곳",
        note:
          "makecode.microbit.org 에서 해요(활동지 미션 칸의 'MakeCode 열기' 로 새 탭). 위쪽을 'Python'\n" +
          "으로 바꾸고, 기존 코드를 모두 지운 뒤(Ctrl+A → Delete) 복사한 코드를 붙여넣어요. 왼쪽\n" +
          "시뮬레이터로 바로 확인해요 — 흔들기는 'SHAKE' 버튼, A+B 는 가운데 버튼으로 눌러 봐요.",
        rows: [
          { label: "어디서", value: "makecode.microbit.org (활동지에서 새 탭)" },
          { label: "붙이기", value: "위쪽 'Python' 으로 바꾸고 기존 코드 지운 뒤 붙여넣기" },
          { label: "흔들기 확인", value: "시뮬레이터 위쪽 'SHAKE' 버튼 누르기" },
          { label: "확인", value: "왼쪽 시뮬레이터로 바로 보기(실물·다운로드 없이)" },
        ],
        highlights: [
          "오늘도 실물 보드 없이 시뮬레이터로만 해요. 틀려도 괜찮으니 여러 번 만들어 봐요.",
        ],
      },
    ],
  },

  video: empty(),

  /*
   * 성찰 — 변수·흔들기·AI로 기능 추가 체험 소감. 개인적이라 비공개. 성찰 제출로 스네이크 보상이 열린다.
   */
  reflectionQuestions: [
    "변수(steps)를 만들고 흔들면 올라가는 만보기를 만들어 보니 어땠나요? 한 줄로 적어 봐요.",
    "미션 3에서 AI에게 어떤 기능을 부탁했고, 코드가 잘 돌아갔나요? (안 되면 어떻게 고쳐 봤는지도 적어 봐요.)",
  ],
  reflectionPublic: false,

  /*
   * MakeCode(새 탭)·파이썬 타자(새 탭) 링크가 붙은 단계에서 창을 옮기는 것을 이탈로 세지 않는다.
   * waiting(타자 도우미) + 세 미션 단계(build·grill·mvp).
   */
  focusExempt: ["waiting", "build", "grill", "mvp"],
  phaseLabels: {
    assessment: "안내",
    build: "미션 1 — 걸음 보여주기",
    grill: "미션 2 — 흔들면 걸음 +1",
    mvp: "미션 3 — AI로 기능 추가",
  },
  /*
   * 미션을 세 단계로 쪼갠다 — 미션 1(build) → 미션 2(grill) → 미션 3(mvp). 범용 슬롯을 빌려 쓰고
   * 이름은 phaseLabels 로 붙인다(문항 있는 단계만 뜸). 교사는 안내 → 미션 1 → 2 → 3 순으로 몬다.
   */
  phaseOrder: ["waiting", "assessment", "build", "grill", "mvp", "reflection"],
  /*
   * 되돌아가기 끔 — 교사 표준(모든 차시 시작 시 off). 교사가 안내 → 미션1 → 2 → 3 순으로 단추로 몬다.
   * 필요하면 수업 중 대시보드에서 켠다.
   */
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리는 차시가 아니다(그림판 아님) — 비우면 글만/기록만 하는 활동으로 잡는다(저장: 공유 링크·바이브 기록)
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "만보기 만들고 AI로 기능 더하기",
      body:
        "미션 1·2 는 뼈대 코드를 복사해 '# (미션)' 자리를 채워 만보기를 완성해요. 미션 3 은 AI에게 말로\n" +
        "기능을 부탁해, 만보기에 기능 하나를 더한 전체 코드를 받아 MakeCode 'Python' 에 붙여 실행해요.",
    },
    worksheet: WORKSHEET,
    // 서로 구경하기·출처 칸은 이 차시에서 쓰지 않는다(공유 링크·바이브 기록은 비공개)
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

    /* 18~24차와 같은 규칙 — 아직 아무도 안 들어온 수업에만 반영한다 */
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
          hideDoneButton: PLAN.hideDoneButton,
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
          phaseLabels: PLAN.phaseLabels,
          phaseOrder: PLAN.phaseOrder,
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (23·24차와 같은 MakeCode 통 — 파이썬 통·파킹된 MicroPython 통과 분리)`);
  console.log("단계: 대기(파이썬 타자 도우미) → 기분 → 안내(assessment) → 미션 1(build) → 미션 2(grill) → 미션 3(mvp) → 성찰. freeNavigation off. quiz 없음. hideDoneButton: true. 성찰 제출 → 스네이크 보상(rewardGame).");
  console.log("미션 1(build): steps=0 변수 만들고 basic.show_number(steps) 로 화면에 보여주기. 뼈대 코드(복사)+빈칸.");
  console.log("미션 2(grill): 흔들면(on_gesture_shake) global steps + steps += 1 + show_number 로 만보기 완성. 뼈대+빈칸. 끝에 공유 링크 제출(mb25_share2).");
  console.log("미션 3(mvp): vibe_code(vibeTarget: microbit) — AI가 만보기 전체+요청 기능의 MakeCode Python 코드 생성 → 복사 → MakeCode 'Python' 붙여 실행. 바탕 코드는 vibe-code.ts MICROBIT_MANBOGI_BASE.");
  console.log(`외부 링크: makecode.microbit.org 하나(${MAKECODE_URL}) + 대기 타자 도우미(link:). focusExempt: waiting·build·grill·mvp. 성찰 2문항. reflectionPublic: false.`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
