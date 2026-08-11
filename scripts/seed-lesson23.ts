/**
 * 2·3차시 차시 계획 등록 스크립트.
 *
 *   node --env-file=.env.local scripts/seed-lesson23.ts
 *   npm run seed:lesson23
 *
 * 왜 화면이 아니라 스크립트인가:
 * 차시 편집기에 퀴즈·활동 입력 UI 를 만드는 것은 이번 범위가 아니다. 문항 4개와 활동지
 * 5문항을 손으로 넣는 UI 를 만들다 보면 정작 수업에 쓸 기능을 못 만든다. 대신 내용이
 * 확정된 지금 시점에 코드로 박아 두고, 나중에 필요해지면 편집기를 붙인다.
 *
 * **이미 같은 차시 번호가 있으면 덮어쓰지 않고 경고만 하고 넘어간다.**
 * 교사가 화면에서 고쳐 둔 내용을 스크립트 재실행이 조용히 되돌리면, 그날 수업이 통째로
 * 어긋난다. 되돌리는 쪽이 훨씬 비싸므로 기본을 "건드리지 않음"으로 둔다.
 *
 * 이 파일은 Next.js 밖에서 돈다. `src/lib/*` 중 "server-only" 를 import 하는 모듈은
 * 여기서 쓸 수 없으므로(로드 즉시 예외) firebase-admin 을 직접 초기화한다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import type { ActivityContent, LessonPlan, PhaseContent, QuizContent } from "../src/lib/types.ts";

// ------------------------------------------------------------------ 설정

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

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

// ------------------------------------------------------------- 공유 활동

/**
 * 2차시와 3차시가 **같은 값**을 써야 한다. 이 값으로 그림 문서가 묶이므로,
 * 다르면 3차시에 빈 캔버스가 열리고 2차시에 그린 것이 사라진 것처럼 보인다.
 */
const ACTIVITY_ID = "future-2040";

const PLACES = [
  "음식점",
  "학교",
  "병원",
  "집",
  "도로",
  "편의점",
  "놀이공원",
  "경기장",
  "농장",
  "미용실",
];

/** 2차시 — 그리기만 한다. 활동지는 3차시에 채운다. */
const ACTIVITY_LESSON2: ActivityContent = {
  activityId: ACTIVITY_ID,
  places: PLACES,
  year: 2040,
  worksheet: [],
};

const ACTIVITY_LESSON3: ActivityContent = {
  activityId: ACTIVITY_ID,
  places: PLACES,
  year: 2040,
  worksheet: [
    {
      key: "place_year",
      label: "내 그림은 몇 년도의 어디인가요?",
      hint: "장소는 위에 이미 적혀 있어요. 연도만 적어 주세요.",
      kind: "text",
      maxLength: 20,
    },
    {
      key: "techs",
      label: "그림에 넣은 핵심 기술의 이름 — 2개 이상",
      hint: "예) 자동 배달 로봇, 얼굴 인식 출입문",
      kind: "long",
      maxLength: 200,
    },
    {
      key: "definition",
      label: "그중 하나를 골라 내 말로 설명해 주세요",
      hint: "60자까지. 짧게 쓰려면 이해해야 해서, 일부러 짧게 제한했어요.",
      kind: "text",
      maxLength: 60,
    },
    {
      key: "example",
      label: "이 기술이 지금 실제로 쓰이는 곳을 하나 적어 주세요",
      hint: "이미 세상에 있는 비슷한 것을 찾아보세요.",
      kind: "long",
      maxLength: 200,
    },
    {
      key: "traits",
      label: "내 기술이 특히 강한 특성은?",
      hint: "2차시 퀴즈에서 본 다섯 가지예요. 여러 개 골라도 됩니다.",
      kind: "traits",
      maxLength: 0,
    },
  ],
};

// -------------------------------------------------------------- 2차시 퀴즈

const QUIZ: QuizContent = {
  questions: [
    {
      prompt: "1996년, 처음 가는 곳은 어떻게 찾아갔을까?",
      choices: [
        "스마트폰 지도 앱으로 검색",
        "종이 지도를 펴거나 지나가는 사람에게 물어봄",
        "자동차에 내장된 내비게이션",
      ],
      answerIndex: 1,
      nowText:
        "지금은 내 위치를 알고 길을 알려 주는 내비가 있다. 나에게 맞춘 정보가 실시간으로 오는 것이다.",
      stickers: ["정보화", "개인화"],
    },
    {
      prompt: "1996년, 좋아하는 노래는 어떻게 들었을까?",
      choices: [
        "스트리밍 앱에서 검색",
        "라디오에서 나올 때까지 기다렸다가 테이프에 녹음",
        "유튜브 재생목록",
      ],
      answerIndex: 1,
      nowText: "지금은 내 취향을 학습한 스트리밍이 다음 곡까지 골라 준다.",
      stickers: ["개인화", "연결성"],
    },
    {
      prompt: "1996년, 친구에게 급한 연락은 어떻게 했을까?",
      choices: [
        "메신저로 바로 보냄",
        "집 전화를 걸거나 삐삐에 번호를 남기고 기다림",
        "영상통화를 검",
      ],
      answerIndex: 1,
      nowText: "지금은 어디에 있든 즉시 닿는다. 메시지도, 통화도, 영상까지도.",
      stickers: ["연결성", "가속화"],
    },
    {
      prompt: "1996년, 다른 도시에 사는 가족에게 용돈을 보내려면?",
      choices: [
        "앱에서 3초 만에 송금",
        "은행 창구에 직접 가서 송금 용지를 작성",
        "편지 봉투에 현금을 넣어 우편으로",
      ],
      answerIndex: 1,
      nowText:
        "지금은 앱에서 지문 인증으로 몇 초 만에 보낸다. 빨라졌지만 그만큼 안전장치도 함께 붙었다.",
      stickers: ["보안성", "가속화"],
    },
  ],
};

// ------------------------------------------------------------ 차시 계획

type PlanSeed = Omit<LessonPlan, "id" | "createdAt" | "updatedAt">;

const SEEDS: PlanSeed[] = [
  {
    lessonNo: 2,
    title: "타임머신 — 세상이 어떻게 바뀌었을까",
    moodCheckEnabled: true,
    game: empty(),
    gameExplainer: empty(),
    progress: empty(),
    assessment: empty(),
    /*
     * 도입 영상 — 사람을 닮아 가는 로봇.
     *
     * 퀴즈가 "과거 → 지금"을 보여줬다면, 영상은 "지금 → 앞으로"를 이어받는다.
     * 그 다음이 2040년 그리기라서, 학생이 미래를 상상할 재료를 여기서 받아 간다.
     *
     * 전체 6분 20초라 다 틀 시간이 없다. 전자칠판에서 아래 구간만 골라 튼다.
     *  · 0:00~1:05  사람과 구별되지 않는 외형 — 가장 강하게 걸리는 지점
     *  · 4:00~4:46  대량 양산 · 빠른 성장 · 가격 — "곧 우리 주변에 온다"는 실감
     *  · 5:42~6:16  실제로 일을 시킨다 (택배 분류 40시간) — 그리기로 이어지는 다리
     */
    video: {
      heading: "사람을 닮아 가는 로봇",
      body: "앞 화면을 봐 주세요.\n로봇이 '어디에서 무슨 일을 하는지' 를 눈여겨보세요. 조금 뒤에 2040년의 한 장소를 그릴 거예요.",
      url: "https://youtu.be/UtUyfRostjY",
    },
    reflectionQuestions: [
      "오늘 퀴즈에서 가장 놀란 변화는 무엇이고, 왜 놀랐나요?",
      "내가 고른 장소에 넣고 싶은 기술을 하나만 적어 주세요. 이름만이라도 좋아요.",
    ],
    reflectionPublic: false,
    quiz: QUIZ,
    activity: ACTIVITY_LESSON2,
  },
  {
    lessonNo: 3,
    title: "2040년의 ___ — 미래 그리기 완성",
    moodCheckEnabled: true,
    game: empty(),
    gameExplainer: empty(),
    progress: empty(),
    assessment: empty(),
    video: empty(),
    reflectionQuestions: [
      "친구 작품에서 처음 알게 된 기술 하나를 적어 주세요.",
      "내 그림을 진짜로 만들려면 무엇이 더 필요할까요? 한 줄로.",
    ],
    reflectionPublic: false,
    activity: ACTIVITY_LESSON3,
  },
];

// ------------------------------------------------------------------ 실행

async function main(): Promise<void> {
  for (const seed of SEEDS) {
    const existing = await db
      .collection(LESSON_PLANS)
      .where("lessonNo", "==", seed.lessonNo)
      .get();

    if (!existing.empty) {
      console.warn(
        `⚠ ${seed.lessonNo}차시가 이미 있습니다 (${existing.docs.length}개) — 건너뜁니다.\n` +
          `  덮어쓰려면 /teacher/lessons 에서 지운 뒤 다시 실행하세요. ` +
          `이미 시작한 수업의 스냅샷은 그대로 보존됩니다.`,
      );
      continue;
    }

    const now = Date.now();
    const ref = await db.collection(LESSON_PLANS).add({ ...seed, createdAt: now, updatedAt: now });
    console.log(`✓ ${seed.lessonNo}차시 등록 — ${seed.title} (${ref.id})`);
  }

  console.log(
    `\n활동 ID: ${ACTIVITY_ID}\n` +
      `2·3차시가 같은 값을 쓰므로 2차시에 그린 그림이 3차시에 그대로 열립니다.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
