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

/*
 * 정답을 공개할 때 함께 띄우는 자료.
 *
 * 사진은 모두 위키미디어 공용의 자유 이용 저작물이다. 수업에서 남의 사진을 쓰면서
 * 출처를 안 밝히면, 정작 수행평가1에서 학생에게 출처 밝히기를 요구할 명분이 없다.
 * 그래서 credit 을 화면에 함께 띄운다.
 *
 * 3번만 영상이다. 지도·카세트·통장은 실물 사진 한 장으로 충분하지만, 삐삐는 중1이
 * 실물을 본 적조차 없어서 "어떻게 쓰는 물건인지"를 봐야 이해가 된다.
 */
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
      media: {
        kind: "image",
        url: "https://upload.wikimedia.org/wikipedia/commons/6/62/Exploring_new_destinations_with_a_map_and_vintage_car_at_sunset.jpg",
        caption: "종이 지도를 펴 놓고 길을 찾는 모습",
        credit: "Nenad Stojković, 위키미디어 공용, CC BY 2.0",
      },
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
      media: {
        kind: "image",
        url: "https://upload.wikimedia.org/wikipedia/commons/5/5b/AIWA_TPR-950_-_4_Band_Radio_Cassette_Recorder_%28edited_and_cropped%29.jpg",
        caption: "라디오와 카세트가 하나로 붙어 있다. 노래가 나오면 녹음 버튼을 눌렀다",
        credit: "Brad.K · Pittigrilli, 위키미디어 공용, CC BY 2.0",
      },
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
      media: {
        kind: "video",
        url: "https://www.youtube.com/watch?v=Y4XH-RSXDus",
        caption: "숫자로 사랑 고백했던 90년대 인싸템 삐삐 — 486은 '사랑해'",
        credit: "크랩 (KBS)",
      },
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
      /*
       * 이 사진만 자유 이용 저작물이 아니다 (나머지 셋은 위키미디어 공용).
       * IBK기업은행 블로그의 전표 작성 안내 이미지이고, 수업 목적으로 출처를 밝혀 쓴다.
       *
       * 저장소에 파일을 복사해 두지 않고 원본 주소를 그대로 가리킨다 — 이 저장소는
       * 공개되어 있어서, 남의 저작물을 복사해 두면 수업이 아니라 재배포가 된다.
       */
      media: {
        kind: "image",
        url: "https://t1.daumcdn.net/cfile/tistory/23103A485350B20332",
        caption:
          "은행 창구에서 쓰던 무통장 입금 전표. 계좌번호·금액·받는 사람·보내는 사람을 손으로 적어 창구에 냈다",
        credit: "IBK기업은행 블로그 (blog.ibk.co.kr/1173)",
      },
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
    /*
     * 대기 시간 게임. 1차시와 같은 하노이 탑을 쓴다.
     *
     * 태블릿 부팅과 주소 오타 때문에 학생마다 도착 시각이 5분씩 벌어진다. 먼저 온
     * 학생의 그 시간을 그냥 버리지 않으려는 것이고, 이미 해 본 게임이라 설명 없이
     * 바로 손이 간다는 점에서 오히려 낫다.
     */
    game: {
      heading: "기다리는 동안 — 하노이 탑",
      body: "원판을 옮겨 탑을 통째로 오른쪽으로 보내세요.\n한 번에 한 개씩, 큰 원판을 작은 원판 위에 올릴 수 없어요.\n1차시보다 원판을 하나 더 늘려서 해 보세요.",
      url: "https://hanoi-tower-game-rosy.vercel.app/",
    },
    /*
     * 원리 설명 팝업은 넣지 않는다.
     *
     * 재귀·알고리즘 이야기는 1차시에 이미 4장짜리로 했다. 같은 것을 또 띄우면
     * 30분짜리 수업의 앞머리를 1분 넘게 먹으면서 "아까 본 거"라는 인상만 남는다.
     */
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
      "타임머신 퀴즈에서 1996년과 지금을 비교했어요. 가장 놀랐던 변화 하나를 고르고, 왜 놀랐는지 써 주세요.",
      "내가 그린 장소에 넣고 싶은 기술을 하나만 적어 주세요. 이름만이라도 좋아요.",
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

/**
 * `--force` 를 붙이면 이미 있는 차시의 내용도 갱신한다.
 *
 * 기본값이 "건너뛰기"인 이유는 교사가 화면에서 고쳐 둔 것을 스크립트 재실행이 조용히
 * 되돌리면 안 되기 때문이다. 다만 퀴즈·활동처럼 화면에 입력칸이 없는 것을 고치려면
 * 이 길밖에 없어서, 명시적으로 요구할 때만 열어 둔다.
 */
/**
 * `--include-active` 는 `--force` 를 함께 뜻한다.
 *
 * 진행 중인 수업까지 갱신하겠다는 것은 이미 등록된 차시를 고치겠다는 뜻이다. 두 옵션을
 * 따로 두면 `--include-active` 만 붙였을 때 아무 일도 없이 "건너뜁니다"만 뜨고,
 * 왜 안 되는지 모른 채 수업 시간이 지나간다.
 */
const INCLUDE_ACTIVE = process.argv.includes("--include-active");
const FORCE = process.argv.includes("--force") || INCLUDE_ACTIVE;

/*
 * `--include-active` 를 붙이면 **이미 시작한 수업**의 스냅샷까지 덮어쓴다.
 *
 * 기본값이 "건드리지 않음"인 데는 이유가 있다. 수업 도중에 문항이나 질문이 바뀌면
 * 학생이 실제로 답한 내용과 기록이 어긋나고, 나중에 "이 반은 어떤 질문에 답한 것인가"를
 * 알 수 없게 된다 (PRD 5.1).
 *
 * 그러니 이 옵션은 **교사가 혼자 테스트하던 세션**처럼, 어긋나도 잃을 기록이 없다는 것을
 * 아는 경우에만 쓴다.
 */

/** 세션 스냅샷을 다시 복사한다. 기본은 아직 시작하지 않은 세션만 (PRD 5.1) */
async function syncScheduled(planId: string, seed: PlanSeed): Promise<number> {
  const base = db.collection("classSessions").where("lessonPlanId", "==", planId);
  const snap = INCLUDE_ACTIVE
    ? await base.where("status", "in", ["scheduled", "active"]).get()
    : await base.where("status", "==", "scheduled").get();

  if (snap.empty) return 0;

  const batch = db.batch();
  for (const doc of snap.docs) {
    // 세션이 들고 있는 진행 상태(phase·code 등)는 건드리지 않는다
    batch.set(
      doc.ref,
      {
        moodCheckEnabled: seed.moodCheckEnabled,
        game: seed.game,
        gameExplainer: seed.gameExplainer,
        progress: seed.progress,
        assessment: seed.assessment,
        video: seed.video,
        reflectionQuestions: seed.reflectionQuestions,
        reflectionPublic: seed.reflectionPublic,
        quiz: seed.quiz,
        activity: seed.activity,
        lessonNo: seed.lessonNo,
        title: seed.title,
      },
      { merge: true },
    );
  }
  await batch.commit();
  return snap.size;
}

async function main(): Promise<void> {
  for (const seed of SEEDS) {
    const existing = await db
      .collection(LESSON_PLANS)
      .where("lessonNo", "==", seed.lessonNo)
      .get();

    if (!existing.empty && !FORCE) {
      console.warn(
        `⚠ ${seed.lessonNo}차시가 이미 있습니다 (${existing.docs.length}개) — 건너뜁니다.\n` +
          `  내용을 갱신하려면 --force 를 붙여 다시 실행하세요.\n` +
          `  (이미 시작한 수업의 스냅샷은 --force 를 붙여도 그대로 보존됩니다)`,
      );
      continue;
    }

    const now = Date.now();

    if (!existing.empty) {
      for (const doc of existing.docs) {
        await doc.ref.set({ ...seed, updatedAt: now }, { merge: true });
        const synced = await syncScheduled(doc.id, seed);
        console.log(
          `↻ ${seed.lessonNo}차시 갱신 — ${seed.title} (${doc.id})` +
            `\n   ${INCLUDE_ACTIVE ? "진행 중인 수업까지 포함해" : "아직 시작하지 않은"} ` +
            `수업 ${synced}개에 반영`,
        );
      }
      continue;
    }

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
