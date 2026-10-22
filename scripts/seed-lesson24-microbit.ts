/**
 * 24차시 차시 계획 등록 — 「마이크로비트 MakeCode — 나만의 LED 애니메이션」.
 *
 *   node --env-file=.env.local scripts/seed-lesson24-microbit.ts
 *   node --env-file=.env.local scripts/seed-lesson24-microbit.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 23차에 이어 — MakeCode 피지컬 아크의 두 번째 시간 (LED만, 소리·흔들기 없음)
 *
 * 23차(큰 하트·작은 하트 2줄까지, pause 못 함)에 이어, 처음부터 안 짜고 **23차에서 만든 코드(큰
 * 하트·작은 하트)를 주고** MakeCode '파이썬(Python) 보기' 에 **붙여넣어 이어서** 완성한다. 미션은
 * 코드 안 **오른쪽 `# 한글 주석`**, **왼쪽 빈자리에 학생이 채운다**(23차 '직접 타이핑' 에서 진화).
 *
 * 23차 두근두근(show_icon 큰/작은 하트)을 **show_leds(직접 그린 LED 그림)** 로 바꿔 미리 넣어둔다.
 *  · 미션1) 두 show_leds 사이에 0.5초 멈추기(pause) → 두근두근 애니 완성.
 *  · 미션2) show_leds(새 장면) + pause 를 더 붙여 **나만의 애니메이션**(아무 그림이나, 하트 포함 OK).
 *
 * ★ 소리·흔들기는 뺐다(교사 확정 2026-10-22). LED(show_leds + pause)만. 23차(2줄)에서 조금만 늘어난
 *   분량이라 느린 반도 한 차시에 된다.
 *
 * ## ★ MakeCode 에디터 실제 검증 완료 (makecode.microbit.org v9.0.12, 파이썬 보기)
 *
 *  · 붙여넣기용 스타터 → 파이썬 보기에 **열 0에서 그대로 붙고**(기존 코드 전체 선택 후 교체) 블록으로
 *    변환됨(오류 0). 특히 **show_leds 다중행 문자열(`"""..."""`)이 안 깨지고** LED 그림 블록(큰 하트·
 *    작은 하트)으로 변환됨. 오른쪽 한글 주석·맨 아래 미션2 주석도 안 깨짐.
 *      ※ 붙여넣기는 반드시 '열 0' 에서(빈 에디터이거나 전체 선택 후 교체). 들여쓰기된 자리에 붙이면
 *        Monaco 가 기준 들여쓰기를 더해 어긋난다 → 활동 안내에 '기존 코드 모두 지우고 붙여넣기' 명시.
 *      ※ `#` 주석은 반드시 show_leds 문자열(`"""..."""`) **바깥**(장면·pause 사이)에 둔다 — 안에 들어가면
 *        LED 그림이 깨진다. 스타터는 그렇게 배치돼 있다.
 *  · 미션 정답 블록 유효·블록 왕복 확인:
 *      - 미션1 일시중지:  basic.pause(500)        → 블록 '일시중지 500 (ms)' (show_leds 사이에 삽입 OK)
 *      - 미션2 새 장면:   basic.show_leds("""...""") + basic.pause(500) 추가  → 블록 'LED 출력' + '일시중지'
 *
 * ## 파일명·번호·통
 *
 *  · LESSON_NO = 24 (새 번호). 파일명 seed-lesson24-microbit.ts.
 *  · activityId = microbit-makecode — 23차와 **같은 통**(MakeCode 피지컬 아크 이어쓰기). 파이썬 통
 *    (python-dodge-game)·파킹된 MicroPython 통(physical-computing)과 섞지 않는다.
 *
 * ## 구성 (40분, 정보 차시 관례) — 코드 기능 없이 시드만(기존 worksheet kind 재사용)
 *
 * 대기(파이썬 타자 링크)·기분(대기 화면) → 안내(assessment) → 나만의 LED 애니메이션(worksheet) → 성찰.
 * 23차의 '피지컬 컴퓨팅(problem)·마이크로비트(video)' 소개 단계는 이미 23차에서 했으므로 뺀다(이어지는
 * 차시, 짧게). freeNavigation 기본 off. 외부 링크는 MakeCode 공식 하나 + 대기 타자 도우미.
 *
 * 대상 1~4반 중1(내일 10/23 1-3·1-1). 각 반 30번은 테스트 학생(리허설). 숙제 없음. seed 멱등(--force).
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
const LESSON_NO = 24;

/** 18~23차와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/** 23차와 같은 통 — MakeCode 피지컬 아크 이어쓰기(파이썬 통·파킹된 MicroPython 통과 분리) */
const ACTIVITY_ID = "microbit-makecode";

/** MakeCode 블록/파이썬 에디터(공식). 새 탭으로 연다. */
const MAKECODE_URL = "https://makecode.microbit.org/";

/** 대기 화면 = 파이썬 타자 도우미(정보 수업 표준). game.url 이 "link:" 면 설명+새 탭 링크 카드로 뜬다. */
const TYPING_URL = "https://python-typing-helper.vercel.app/";
/** 성찰 보상 게임 = 스네이크(23차와 동일). 성찰을 제출하면 '제출하고 게임하기' 로 열린다. ※ 교사 확정 대기 */
const SNAKE_URL = "https://snake-game-iota-puce.vercel.app/";

/** 공유(Share) 버튼 위치 안내 그림 — MakeCode 상단 바, 공유 아이콘 강조(23차 자산 재사용). */
const SHARE_IMG = "/mb23-share.png";
/** 큰 하트 ↔ 작은 하트 두근두근 움직이는 그림(23차 자산 재사용 — 스타터가 바로 이 두 하트다). */
const HEART_IMG = "/mb23-heart.svg";

/**
 * 붙여넣기용 스타터(교사 최종 확정 2026-10-22, 설계안 그대로). 등폭 code 필드로 보여 주고 복사 허용
 * (noCopy 안 씀). MakeCode 파이썬 보기에 '열 0' 에서 그대로 붙으면(기존 코드 전체 선택 후 교체) 블록으로
 * 변환된다 — show_leds 다중행 문자열이 큰 하트·작은 하트 LED 블록으로 변환됨(에디터 검증: 오류 0).
 *  · 미션1 : 각 show_leds 뒤 오른쪽 `#` 왼쪽 빈자리에 basic.pause(500).
 *  · 미션2 : 맨 아래 왼쪽 주석 한 줄 — show_leds(새 장면)+pause 를 더 붙여 나만의 애니메이션.
 *  · `#` 주석은 반드시 show_leds 문자열(`"""..."""`) **바깥**에(장면·pause 사이). 검증: 오류 0.
 */
const STARTER = `def on_forever():
    basic.show_leds("""
        . # . # .
        # # # # #
        # # # # #
        . # # # .
        . . # . .
        """)
                                      # 미션1) 0.5초 멈추기
    basic.show_leds("""
        . . . . .
        . # . # .
        . # # # .
        . . # . .
        . . . . .
        """)
                                      # 미션1) 0.5초 멈추기
    # 미션2) 장면을 더 추가해 '나만의 애니메이션' 만들기! (show_leds + pause 반복, 아무 그림이나)
basic.forever(on_forever)`;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ─────────────────────────────────────────────────────────────
// 활동지 (worksheet 단계) — '나만의 LED 애니메이션'. MakeCode 열기 → 스타터 붙여넣기 →
// 미션1(pause) 채우기 → 미션2(나만의 장면 더 붙이기) → 공유 링크 제출. 안내는 note, 제출은 text.
// ─────────────────────────────────────────────────────────────
const WORKSHEET: WorksheetQuestion[] = [
  /* ── 먼저 — MakeCode 열고 파이썬 보기로 ── */
  {
    key: "_mb_open",
    phase: "worksheet",
    label: "먼저 — MakeCode 열기 → 파이썬(Python) 보기",
    hint:
      "아래 [MakeCode 열기] 로 새 탭에서 열고 '새 프로젝트' 를 하나 만들어요.\n" +
      "위쪽 가운데 '블록 / { } 파이썬(Python)' 에서 **파이썬(Python)** 을 눌러 코드 보기로 바꿔요.\n" +
      "오늘은 23차에 만든 '두근두근 하트' 를 이어서 '나만의 애니메이션' 으로 완성해요. 실물 없이 시뮬레이터로 확인해요.",
    kind: "note",
    linkUrl: MAKECODE_URL,
    linkLabel: "MakeCode 열기 (새 탭)",
    maxLength: 0,
  },

  /* ── 스타터 붙여넣기 (code 필드, 복사 허용) ── */
  {
    key: "_mb_paste",
    phase: "worksheet",
    label: "이어서 — 아래 코드를 파이썬 보기에 붙여넣기",
    hint:
      "아래 '코드 복사하기' 로 복사해서, MakeCode **파이썬 보기** 에 붙여넣어요. 순서가 중요해요:\n" +
      "① 파이썬 보기의 **기존 코드를 모두 지워요** — 코드 칸을 누르고 Ctrl+A(전체 선택) → Delete.\n" +
      "② 맨 처음(맨 왼쪽 위)에 커서를 두고 **붙여넣기(Ctrl+V)**.\n" +
      "   (※ 중간에 붙이면 들여쓰기가 어긋나요. 꼭 '전체 지우고 맨 처음' 에 붙여요.)\n\n" +
      "붙여넣으면 LED 그림으로 그린 '큰 하트 → 작은 하트' 가 나와요(블록 보기로 바꾸면 그림 블록이 보여요).\n" +
      "`show_leds` 안의 `#` 는 불이 켜진 칸, `.` 은 꺼진 칸이에요. 오른쪽에 `#` 로 적힌 미션이 보일 거예요 —\n" +
      "그 **왼쪽 빈자리** 에 코드를 채워 완성할 거예요.",
    kind: "note",
    code: STARTER,
    maxLength: 0,
  },

  /* ── 미션1 — pause 로 두근두근 완성 ── */
  {
    key: "_mb_mission1",
    phase: "worksheet",
    label: "미션1 — 두근두근 완성 (0.5초 멈추기)",
    hint:
      "지금은 두 하트가 너무 빨리 바뀌어서 그냥 켜진 것처럼 보여요. 사이에 **잠깐 멈춰야** 두근두근 보여요.\n\n" +
      "각 `show_leds(...)` **바로 아래 빈자리**(오른쪽 `#` 미션1 왼쪽, 큰 하트 아래·작은 하트 아래 두 곳)에\n" +
      "'0.5초 멈추기' 를 넣어요:\n" +
      "· 기본(Basic) 서랍의 '일시중지(pause)' 블록을 끌어와 500(ms)으로 맞추거나,\n" +
      "· 파이썬으로 바로: 그 줄 맨 앞에서 4칸 들여쓰고  basic.pause(500)\n\n" +
      "두 곳 모두 넣고 시뮬레이터를 보면 '큰 하트 ↔ 작은 하트' 가 두근두근 뛰어요. 성공!",
    kind: "note",
    imageUrl: HEART_IMG,
    imageAlt: "마이크로비트 LED가 큰 하트와 작은 하트로 번갈아 깜빡이는 움직이는 그림",
    imageSide: "right",
    imageSideWidth: "third",
    maxLength: 0,
  },

  /* ── 미션2 — 나만의 애니메이션 (창작) ── */
  {
    key: "_mb_mission2",
    phase: "worksheet",
    label: "미션2 — 나만의 애니메이션 만들기",
    hint:
      "이제 나만의 장면을 **더 이어 붙여요**! forever(무한반복) 안, 작은 하트 다음(맨 아래 미션2 주석 자리)에\n" +
      "'새 그림 → 잠깐 멈추기' 를 반복해서 넣으면 움직이는 애니메이션이 돼요.\n\n" +
      "· 기본(Basic) 서랍의 'LED 출력(show leds)' 블록을 끌어와 칸을 켜고 꺼서 **내 그림**을 그려요.\n" +
      "  (파이썬으로는  basic.show_leds(\"\"\" ... \"\"\")  모양 — `#` 는 켜짐, `.` 은 꺼짐.)\n" +
      "· 그 아래에 '일시중지 500(ms)' 를 넣어요. 이렇게 '그림 + 멈추기' 를 여러 번 반복!\n\n" +
      "예) 하트 → 웃는 얼굴 → 별 → 내 이름 첫 글자… 아무 그림이나 좋아요. 장면이 많을수록 더 재미있는\n" +
      "애니메이션이 돼요. 블록으로 그리고 파이썬 보기로 바꿔 보면 내 코드가 글로도 보여요.",
    kind: "note",
    maxLength: 0,
  },

  /* ── 제출 — 이름 바꾸기 + 공유 버튼(그림) 안내 + 링크 입력칸 (23차와 동일 방식) ── */
  {
    key: "mb_share_link",
    phase: "worksheet",
    label: "제출 — 이름 바꾸고 공유 링크 붙여넣기",
    hint:
      "다 만들었으면 제출해요. 순서대로 해요:\n" +
      "1) MakeCode 맨 아래 '프로젝트 이름' 칸을 '학번 이름 나만의 애니메이션' 으로 바꿔요. 예) 10130 홍길동 나만의 애니메이션\n" +
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
  title: "마이크로비트 MakeCode — 나만의 LED 애니메이션",
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

  // 성찰 보상 게임 = 스네이크(23차와 동일). '제출하고 게임하기' 를 누르면 공유 링크(mb_share_link)
  // 가 제출됐는지 본다 — 제출했으면 스네이크, 아니면 팝업으로 '나만의 LED 애니메이션' 단계로 보낸다.
  // ※ 보상 게임 종류는 교사 확정 대기(일단 23차 기준 스네이크).
  rewardGame: {
    heading: "수고했어요! 🎮",
    body: "성찰을 제출했으면 잠깐 스네이크 게임으로 쉬어요. 선생님이 부르면 돌아오세요.",
    url: SNAKE_URL,
    requires: [
      { key: "mb_share_link", label: "나만의 LED 애니메이션 — 공유 링크 제출", phase: "worksheet", submitted: true },
    ],
  },

  // 다음 시간(progress) 단계는 두지 않는다 — 안내(assessment)가 이미 있어 중복이다.
  progress: empty(),

  // 24차는 영상 단계가 없다(이어지는 차시). 타입 필수 필드라 빈 값으로 둔다 — url 이 비면 영상 버튼이 안 뜬다.
  video: empty(),

  /*
   * 안내 보드 — 23차 이어서, 오늘 할 일(큰 그림). 마이크로비트·피지컬 컴퓨팅 소개는 23차에서 이미 했다.
   */
  assessment: {
    heading: "오늘 할 일 — 두근두근 하트 → 나만의 LED 애니메이션",
    body: "",
    url: "",
    // 빈 배열로 둬서 옛 탭을 지운다(set merge 는 맵을 깊게 병합하므로 tabs:[] 로 배열을 통째로 비운다).
    tabs: [],
    cards: [
      {
        badge: "오늘",
        title: "이 순서로 해요",
        note: "40분",
        lines: [
          "① MakeCode 열고 '파이썬 보기' 로 바꾸기",
          "② 23차 코드(LED 큰 하트·작은 하트) 붙여넣기 — 기존 코드 모두 지우고 맨 처음에",
          "③ 미션1 — 하트 사이에 '0.5초 멈추기' 넣어 두근두근 완성",
          "④ 미션2 — 'LED 그림 + 멈추기' 를 더 붙여 나만의 애니메이션 만들기",
          "⑤ 이름 바꾸고 공유 링크 제출 → 성찰 쓰고 → 게임으로 쉬기",
        ],
      },
      {
        badge: "약속",
        title: "오늘 수업 방법",
        note: "",
        lines: [
          "처음부터 짜지 않아요 — 23차 코드를 '이어서' 완성해요.",
          "오른쪽 `#` 가 미션이에요. 그 왼쪽 빈자리에 블록을 넣거나 코드를 채워요.",
          "LED 그림(show leds)에서 `#` 는 켜진 칸, `.` 은 꺼진 칸이에요.",
          "실물 없이 시뮬레이터로 해요. 틀려도 괜찮으니 그림을 이것저것 그려 보며 완성해요.",
        ],
      },
    ],
  },

  /*
   * 성찰 — 오늘 만든 창작물(나만의 애니메이션)을 돌아보는 한 문항. 개인적이라 비공개.
   * (성찰을 제출하면 보상 게임이 열린다 — requireReflection 기본값.)
   */
  reflectionQuestions: [
    "오늘 만든 '나만의 LED 애니메이션' 은 어떤 장면들이었나요? 다음에 마이크로비트로 더 만들어 보고 싶은 그림이나 움직임이 있다면 함께 적어 보세요.",
  ],
  reflectionPublic: false,

  /*
   * 새 탭을 여는 단계는 창 이동을 이탈로 세지 않는다 — 대기(파이썬 타자 링크)와 worksheet(MakeCode 링크).
   */
  focusExempt: ["waiting", "worksheet"],
  /*
   * 단계 버튼 순서 — 대기 → 안내 → 나만의 LED 애니메이션 → 성찰. 기분(mood)은 대기 화면에서 받으므로
   * (moodCheckEnabled) 단독 '기분' 단계는 뺀다. 23차의 problem(피지컬)·video(마이크로비트) 소개
   * 단계는 이어지는 차시라 뺐다 — 짧게.
   */
  phaseOrder: ["waiting", "assessment", "worksheet", "reflection"],
  phaseLabels: {
    assessment: "안내",
    worksheet: "나만의 LED 애니메이션",
  },
  /*
   * 되돌아가기 끔 — 교사 표준(기본 off). 제출(mb_share_link)이 성찰보다 앞 단계(worksheet)라
   * 보상 게이트는 선형 진행만으로 충족된다(돌아갈 필요 없음 → freeNavigation 불필요). 필요하면
   * 수업 중 대시보드에서 켠다.
   */
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리는 차시가 아니다(화면 캔버스) — 비우면 글만/기록만 하는 활동으로 잡는다(저장 입력: 공유 링크)
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "마이크로비트 MakeCode — 나만의 LED 애니메이션",
      body:
        "23차에 만든 '두근두근 하트' 를 LED 그림(show leds)으로 바꿔 두었어요. 파이썬 보기에 붙여넣어\n" +
        "이어서, 하트 사이에 멈춤을 넣어 두근두근 완성하고, 나만의 장면을 더 붙여 애니메이션을 만들어 제출해요.",
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
    /* 다시 돌릴 때 옛 필드가 섞이지 않도록 progress·progressChecks·quiz·videoPrompts 를 명시 삭제 */
    await doc.ref.set(
      {
        ...PLAN,
        updatedAt: now,
        progress: FieldValue.delete(),
        progressChecks: FieldValue.delete(),
        quiz: FieldValue.delete(),
        videoPrompts: FieldValue.delete(),
      },
      { merge: true },
    );
    console.log(`↻ 갱신 — ${PLAN.title} (${doc.id})`);

    /* 18~23차와 같은 규칙 — 아직 아무도 안 들어온 수업에만 반영한다 */
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
          video: PLAN.video,
          videoPrompts: FieldValue.delete(),
          assessment: PLAN.assessment,
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (23차와 같은 통 — MakeCode 피지컬 아크 이어쓰기)`);
  console.log("단계(phaseOrder): 대기(파이썬 타자 링크) → [기분=대기 화면] → 안내(assessment) → 나만의 LED 애니메이션(worksheet) → 성찰. freeNavigation off, quiz/video 없음, 보상=스네이크(교사 확정 대기).");
  console.log(`worksheet: MakeCode 열기(${MAKECODE_URL}) → 파이썬 보기 → 스타터 붙여넣기(전체 지우고 맨 처음, code 복사 허용) → 미션1 basic.pause(500)(두 show_leds 사이) → 미션2 show_leds(새 장면)+pause 더 추가(나만의 애니메이션) → mb_share_link(text) 제출.`);
  console.log("LED 블록 확정(에디터 검증): show_leds 다중행 문자열이 열 0 붙여넣기 때 안 깨지고 LED 그림 블록(큰 하트/작은 하트)으로 변환. basic.pause(500)=일시중지 블록. 소리·흔들기 없음(LED만).");
  console.log("깨진 하트/소리/흔들기 전부 제거(교사 확정 2026-10-22). galleryEnabled/sourcesEnabled false. 실물 없이 시뮬레이터.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
