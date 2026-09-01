/**
 * 「디지털 마음 톡톡」(자유학기 주제선택) 4회기 — 감정 조절하기.
 *
 *   node --env-file=.env.local scripts/seed-mt4.ts
 *
 * ## 인식에서 조절로 넘어간다
 *
 * 3회기까지가 자기 영역의 **감정 인식하기** 였다. 낱말로 구별하고, 글로 적고,
 * AI 추측과 견줘 보며 "정답은 나에게 있다" 까지 갔다. 4회기는 **감정 조절하기** 다 —
 * 알아차린 다음에 무엇을 하느냐.
 *
 * 서울시교육청 사회정서교육자료 활동지 3(감정 지도 만들기)·4(힐링 스페이스 만들기)
 * 두 개를 옮긴 것이다. 원본에 있던 발표·전시는 뺐다.
 *
 * ## 그림판은 힐링 스페이스가 가져간다
 *
 * 한 차시에 캔버스는 하나뿐이다 (artifact.strokes). 두 활동이 다 그림을 요구하는데,
 * 힐링 스페이스는 "선·모양·패턴으로 나타낸다" 가 활동의 본체라 그림 없이는 성립하지 않는다.
 *
 * 감정 지도는 배치도를 **읽기용 그림**으로 크게 띄우고(imageUrl), 장소와 감정은 칸으로
 * 받는다. 1403x992 배치도에 태블릿 손가락으로 정확히 찍는 것이 어렵기도 하고,
 * 칸으로 받으면 "우리 반이 힘들어하는 장소" 를 모아 볼 수 있다 — 종이로는 못 하던 것이다.
 *
 * ## 발표를 안 한다
 *
 * 원본 활동지 3의 "친구들의 발표에서 배운 점" 과 활동지 4의 "완성된 그림을 교실에
 * 전시하고 친구들과 감정을 나눠봅니다" 를 뺐다. 서로 구경하기도 닫는다 —
 * 이번 회기는 안에서 끝난다.
 *
 * ## 활동 ID 는 그대로 이어 쓴다
 *
 * 3회기까지 쓴 mt-2026-2 를 그대로 쓴다. 지난 시간에 고른 감정을 첫 화면에 띄우려면
 * 같은 문서여야 한다 — 인식에서 조절로 넘어가는 이 회기에서 그 연결이 특히 중요하다.
 * 2·3회기는 그리기가 없어서 캔버스가 비어 있다. 오늘 처음 쓴다.
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
    privateKey: requiredEnv("FIREBASE_PRIVATE_KEY").replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

/** ★ 2·3회기와 같은 값. 지난 시간에 고른 감정이 오늘 첫 화면에 뜬다 */
const ACTIVITY_ID = "mt-2026-2";
const LESSON_NO = 204;

/** 교실배치도. public 아래 파일이라 주소가 그대로 학생 화면으로 간다 */
const SCHOOL_MAP = "/school-map.png";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/**
 * 감정 조절 전략 보기. 원본 활동지 3의 예시를 그대로 쓴다.
 *
 * 고르는 칸으로 두는 이유는 둘이다. 백지에 "전략을 적어 보세요" 라고 하면 중1은
 * "참는다" 를 쓴다 — 그건 조절이 아니라 억누르기다. 그리고 고른 값이 글자로 같아야
 * 반 전체에서 무엇이 많이 쓰이는지 셀 수 있다.
 */
const STRATEGIES = [
  "심호흡 — 천천히 크게 숨쉬기",
  "자기 대화하기 — 나에게 말 걸어 주기",
  "명상 — 잠깐 눈 감고 가만히 있기",
  "운동하기 — 몸을 움직이기",
  "주의 돌리기 — 다른 것에 집중하기",
  "편안한 사람 만나기",
  "안전지대 만들기 — 내가 편한 자리로 가기",
  "음악 감상",
  "산책",
  "일기 쓰기",
];

const WORKSHEET: WorksheetQuestion[] = [
  // ── 활동지 3 · 감정 지도 만들기 (35분) ───────────────────
  {
    key: "_map_recap",
    phase: "problem",
    /*
     * 지난 시간에 고른 감정을 먼저 편다.
     *
     * 오늘은 그 감정을 **어떻게 다룰지** 를 하는 시간이다. 무엇을 조절할지 모르는 채로
     * 전략부터 고르면 남의 이야기가 된다.
     */
    label: "지난 시간에 내가 고른 감정",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "share_feel", label: "요즘 나를 가장 크게 흔든 감정" },
      { key: "share_line", label: "그때 내 이야기" },
    ],
    maxLength: 0,
  },
  {
    key: "_map_note",
    phase: "problem",
    /*
     * 배치도를 답하는 칸 바로 위에 둔다.
     *
     * 새 창으로 띄우면 학생이 그 창에서 안 돌아오고, 돌아와도 그림을 다시 못 찾는다.
     * 태블릿에서는 두 손가락으로 키워 볼 수 있다.
     */
    label: "우리 학교 어디에서, 나는 어떤 마음이 되나요?",
    hint:
      "같은 학교 안에서도 장소마다 마음이 달라져요. 편해지는 곳이 있고 굳어지는 곳이 있습니다.\n" +
      "아래 배치도를 보면서 떠올려 보세요. 손가락 두 개로 벌리면 크게 볼 수 있어요.",
    kind: "note",
    imageUrl: SCHOOL_MAP,
    imageAlt: "2026 장평중학교 교실배치도",
    maxLength: 0,
  },
  {
    key: "map_most",
    phase: "problem",
    label: "학교에서 가장 많이 찾는 장소는 어디인가요?",
    hint: "쉬는 시간이나 점심시간에 자연스럽게 발이 가는 곳이요.\n예) 급식실 앞 복도",
    kind: "text",
    maxLength: 60,
  },
  {
    key: "map_marks",
    phase: "problem",
    /*
     * 원본의 "배치도에 이모티콘·색상·짧은 단어로 감정을 표시" 자리.
     *
     * 그림 대신 줄로 받는다. 한 줄에 하나씩 적게 하면 세 곳이 서로 견줘지고,
     * 반 전체를 모아 보면 "우리 학교의 감정 지도" 가 실제로 만들어진다.
     */
    label: "장소마다 내 마음을 적어 주세요 — 세 곳 이상",
    hint:
      "한 줄에 한 곳씩, 「장소 — 감정 낱말 — 이모지」 로 적어요.\n" +
      "예) 도서실 — 편안함 😌\n" +
      "예) 3층 복도 — 긴장됨 😬\n" +
      "예) 운동장 — 신남 😄",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "map_hard",
    phase: "problem",
    label: "그중에서 부정적인 감정이 자주 드는 곳은 어디인가요?",
    hint: "없으면 「없음」 이라고 적어도 됩니다. 그것도 답이에요.",
    kind: "text",
    maxLength: 60,
  },
  {
    key: "map_strategy",
    phase: "problem",
    /*
     * 원본은 세 가지를 고르게 한다. 화면에서 개수를 막지는 않는다 —
     * 못 고르게 막으면 그 자리에서 손을 들고, 그 사이 나머지가 멈춘다.
     * 개수는 안내로 두고 판단은 학생에게 남긴다.
     */
    label: "그곳에서 써 볼 수 있는 감정 조절 전략을 골라 주세요 (세 가지)",
    hint: "여기 없는 방법이 있으면 아래 칸에 적어도 좋아요.",
    kind: "multi",
    choices: STRATEGIES,
    maxLength: 0,
  },
  {
    key: "map_why",
    phase: "problem",
    /*
     * 원본 4번에서 "친구들의 발표에서 배운 점" 을 뺀 나머지.
     * 발표를 안 하므로 그 칸은 답할 것이 없다.
     */
    label: "그 전략이 나에게 효과가 있을 것 같은 이유는?",
    hint: "예) 복도에서 긴장될 때 숨을 천천히 쉬면 심장 뛰는 게 가라앉는 걸 느낀 적이 있어요.",
    kind: "long",
    maxLength: 250,
  },
  {
    key: "map_mine",
    phase: "problem",
    /*
     * 원본 5번 "나만의 감정 조절 전략 (상황, 행동이 구체적으로 드러나게)".
     * 이 칸이 활동지 3의 결론이다 — 고른 것이 아니라 만든 것이라야 실제로 쓴다.
     */
    label: "나만의 감정 조절 전략을 한 문장으로 만들어 주세요",
    hint:
      "언제(상황)와 무엇을 할지(행동)가 다 들어가야 해요.\n" +
      "예) 쉬는 시간에 3층 복도가 시끄러워 짜증날 때 → 도서실에 가서 5분 앉아 있기",
    kind: "long",
    maxLength: 250,
  },

  // ── 활동지 4 · 힐링 스페이스 준비 (10분) ──────────────────
  {
    key: "_heal_note",
    phase: "worksheet",
    label: "이번엔 내가 회복되는 자리를 만들어 봅시다",
    hint:
      "최근에 마음이 편안했던 순간을 떠올려 보세요. 그때 주변에 무엇이 있었나요?\n" +
      "그 요소들을 모아서, 조금 뒤에 나만의 공간을 그림으로 그릴 거예요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "heal_color",
    phase: "worksheet",
    label: "나를 차분하게 해주는 색은?",
    hint: "예) 연한 초록",
    kind: "text",
    maxLength: 40,
  },
  {
    key: "heal_place",
    phase: "worksheet",
    label: "마음이 편안해지는 공간은?",
    hint: "예) 창가 옆 햇빛 드는 자리",
    kind: "text",
    maxLength: 60,
  },
  {
    key: "heal_thing",
    phase: "worksheet",
    label: "감정을 회복시켜 주는 물건은?",
    hint: "예) 푹신한 쿠션, 작은 화분",
    kind: "text",
    maxLength: 60,
  },
  {
    key: "heal_etc",
    phase: "worksheet",
    label: "그밖에 도움이 되는 것이 있나요?",
    hint: "소리·냄새·사람 무엇이든 좋아요. 없으면 비워 둬도 됩니다.\n예) 빗소리",
    kind: "text",
    maxLength: 60,
  },

  // ── 활동지 4 · 활용 계획 (15분) ──────────────────────────
  {
    key: "_plan_note",
    phase: "emotion",
    /*
     * 그림을 그리고 나서 채우는 칸들이다.
     *
     * 원본이 "활용 계획 세우기" 를 따로 둔 이유가 여기 있다 — 예쁜 공간을 그려 놓고
     * 끝내면 그림 시간이지 감정 조절 시간이 아니다. 언제·어디서·어떻게 를 적어야
     * 교실 밖에서 한 번이라도 쓰인다.
     */
    label: "그린 공간을 실제로 쓰려면",
    hint: "그림을 다 그렸다면 이제 언제 어디서 어떻게 쓸지 정해 봅시다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "plan_name",
    phase: "emotion",
    label: "내가 만든 힐링 스페이스의 이름과 특징은?",
    hint: "예) 초록이 가득한 독서 코너 — 창가 옆, 작은 화분과 푹신한 쿠션이 있는 공간",
    kind: "text",
    maxLength: 100,
  },
  {
    key: "plan_when",
    phase: "emotion",
    label: "언제 쓸까요? (시간·상황)",
    hint: "예) 시험 공부하다 집중이 안 될 때 / 마음이 불안하거나 짜증이 날 때",
    kind: "text",
    maxLength: 100,
  },
  {
    key: "plan_where",
    phase: "emotion",
    label: "어디서 쓸까요? (장소)",
    hint: "진짜로 갈 수 있는 곳이어야 해요.\n예) 내 침대 옆, 우리집 베란다, 학교 도서실",
    kind: "text",
    maxLength: 100,
  },
  {
    key: "plan_how",
    phase: "emotion",
    /*
     * 화살표 형식을 예시로 못박는다. "음악 듣기" 만 적으면 언제 무엇을 하는지가
     * 빠져서 실제로 쓸 수가 없다 — 활동지 3의 map_mine 과 같은 이유다.
     */
    label: "어떻게 활용할까요? (구체적으로)",
    hint:
      "「~할 때 → ~하기」 로 적으면 쉬워요.\n" +
      "예) 집에서 숙제하다 지칠 때 → 10분간 내 힐링 스페이스에서 음악 듣기",
    kind: "long",
    maxLength: 250,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "디지털 마음 톡톡 4회기 — 감정 조절하기",

  // 매 회기 첫 화면. 학기 전체 감정 변화를 되돌아보는 원재료가 여기서 쌓인다
  moodCheckEnabled: true,

  groups: [
    { key: "mt-tue-1", label: "화요일 1기", classNo: 1 },
    { key: "mt-thu-1", label: "목요일 1기", classNo: 2 },
    { key: "mt-tue-2", label: "화요일 2기", classNo: 3 },
    { key: "mt-thu-2", label: "목요일 2기", classNo: 4 },
  ],

  game: {
    heading: "기다리는 동안 — 똥 피하기",
    body:
      "위에서 떨어지는 똥을 좌우로 피하세요. 한 번이라도 맞으면 끝이에요.\n" +
      "화살표 키나 화면 좌·우를 누르면 움직입니다.",
    url: "https://dodge-poop-game.vercel.app/",
  },
  gameExplainer: empty(),

  progress: {
    heading: "오늘 할 일",
    body:
      "지금까지는 내 감정을 알아차리는 연습을 했어요. 낱말로 구별하고, 글로 적고, AI와 견줘 봤습니다.\n" +
      "오늘은 그 다음입니다 — 알아차린 감정을 어떻게 다룰 것인가.\n\n" +
      "① 감정 지도 — 학교 어디에서 내 마음이 어떻게 되는지 살펴보고, 힘든 곳에서 쓸 전략 고르기\n" +
      "② 힐링 스페이스 — 내가 회복되는 자리를 직접 그리고, 언제 어떻게 쓸지 정하기\n" +
      "③ 마음일기\n\n" +
      "오늘은 발표하지 않아요. 쓴 것은 나와 선생님만 봅니다.\n" +
      "잘 그리는 시간이 아니라, 진짜로 쓸 수 있는 것을 하나 만드는 시간이에요.",
    url: "",
  },
  assessment: empty(),
  video: empty(),

  /*
   * 마음일기 — 매 회기 반복 루틴이다. reflectionPublic 은 반드시 false.
   * 오늘 주제가 조절이라 세 번째 문항을 오늘 것으로 바꾼다.
   */
  reflectionQuestions: [
    "오늘 마음에 남는 순간은 언제였나요? 무엇 때문에 그랬는지도 함께 적어 주세요.",
    "지금 내 기분은 어떤가요? 그리고 왜 그런 것 같나요?",
    "오늘 만든 전략 중에 이번 주에 한 번 써 볼 것 하나를 골라 적어 주세요.",
  ],
  reflectionPublic: false,

  /*
   * 그리기는 이탈로 세지 않는다. 그림판이 다른 화면처럼 잡히는 구간이 있다.
   */
  focusExempt: ["draw"],

  /*
   * 학생이 지나온 단계로 돌아갈 수 있게 한다.
   * 그림을 그리다 "아 색을 뭐라고 썼더라" 하고 앞 칸을 보러 가는 흐름이 자연스럽다.
   */
  freeNavigation: true,

  /*
   * 단계 이름.
   *
   * 자리를 이렇게 잡은 이유가 있다. 제출 단추는 **그 차시가 쓰는 STEP_PHASES 중
   * 마지막**에 붙는데(lesson/page.tsx 의 lastStepPhase), 그 목록에 draw 와 worksheet 은
   * 없고 problem·emotion 은 있다. 활용 계획을 worksheet 에 두었더니 제출 단추가
   * 「힐링 스페이스 준비」에 붙어, 그리기도 전에 "다 했어요" 를 누를 수 있었다.
   * 리허설에서 잡았다.
   *
   * 그래서 활용 계획을 emotion(목록에서 draw·worksheet 보다 뒤)으로 옮겼다.
   * 준비 표는 worksheet 에 남겨 그리기 화면의 「활동지 쓰기」 탭을 채운다 —
   * 비워 두면 그리는 동안 그 탭이 빈 화면이 된다.
   *
   * worksheet 은 교사 단추에 따로 안 뜬다 (장소가 있는 차시라 그리기가 대표로 선다).
   */
  phaseLabels: {
    mood: "마음 체크인",
    progress: "오늘 할 일",
    // 문항을 담는 그릇으로 빌려 쓴다. 화면에 "problem" 같은 말은 안 보인다
    problem: "감정 지도",
    draw: "힐링 스페이스 그리기",
    worksheet: "힐링 스페이스 준비",
    emotion: "활용 계획",
    reflection: "마음일기",
  },

  activity: {
    activityId: ACTIVITY_ID,
    /*
     * 그리기를 켠다. 이 값이 비어 있으면 그림판이 아예 안 뜬다.
     *
     * 원래 "무엇을 그릴 장소인가" 를 고르는 칸인데, 여기서는 **내 힐링 스페이스가
     * 어디에 있는 곳인지** 를 고르는 데 쓴다. 고른 값이 그림 제목에 들어간다.
     */
    places: ["내 방", "우리 집 어딘가", "학교 안", "동네", "상상 속의 곳"],
    year: 2026,
    worksheet: WORKSHEET,

    /*
     * 그리기 첫 화면 문구.
     *
     * 기본값은 미래 도시를 그리는 정보과 차시용이다. 그대로 두면 학생이 그쪽을 그린다 —
     * 그리기 화면은 활동지와 따로 뜨는 화면이라 안내를 여기 두지 않으면 닿을 방법이 없다.
     */
    drawPrompt: {
      heading: "나만의 힐링 스페이스",
      body:
        "앞에서 적은 색·공간·물건을 모아서 내가 회복되는 자리를 그려 보세요.\n" +
        "잘 그리는 시간이 아니에요. 선·모양·무늬만으로도 충분합니다.\n" +
        "먼저 그 공간이 어디에 있는 곳인지 골라 주세요.",
    },

    /*
     * 활동지 첫 화면 문구. 기본값("무엇을 그렸는지 적어 주세요")을 그대로 두면
     * 그림 설명을 적는 칸으로 읽힌다 — 여기는 활용 계획을 적는 자리다.
     */
    worksheetIntro: {
      heading: "힐링 스페이스 준비",
      body: "먼저 재료를 모읍니다. 여기 적은 색·공간·물건을 가지고 옆 [그림 그리기] 에서 그려요.",
    },

    /*
     * 서로 구경하기를 닫는다. 오늘은 발표도 전시도 안 한다.
     *
     * 화면에서 탭만 감추면 주소를 직접 치는 것으로 열린다. 이 값이 false 여야
     * 서버가 조회 자체를 거절한다 (student/gallery 라우트).
     */
    galleryEnabled: false,

    /*
     * 출처 두 칸을 안 띄운다. 정보과 수행평가1의 채점 항목이라 붙어 있던 것이고,
     * 이 프로그램에는 그 평가가 없다 (3회기와 같은 판단).
     */
    sourcesEnabled: false,
  },
};

async function main(): Promise<void> {
  const existing = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  const now = Date.now();

  if (existing.empty) {
    const ref = await db.collection("lessonPlans").add({ ...PLAN, createdAt: now, updatedAt: now });
    console.log(`✓ 등록 — ${PLAN.title} (${ref.id})`);
  } else {
    for (const doc of existing.docs) {
      await doc.ref.set({ ...PLAN, updatedAt: now }, { merge: true });
      console.log(`↻ 갱신 — ${PLAN.title} (${doc.id})`);

      // 아직 시작하지 않은 수업에만 다시 복사한다 (PRD 5.1)
      const all = await db.collection("classSessions").where("lessonPlanId", "==", doc.id).get();
      const scheduled = all.docs.filter(
        (s) => (s.data() as { status: string }).status === "scheduled",
      );
      for (const s of scheduled) await s.ref.set({ ...PLAN }, { merge: true });
      console.log(`   아직 시작하지 않은 수업 ${scheduled.length}개에 반영`);

      for (const s of all.docs.filter((x) => (x.data() as { status: string }).status !== "scheduled")) {
        const x = s.data() as { status: string; code: string };
        console.warn(`   ⚠ ${s.id} (코드 ${x.code}) 는 ${x.status} 상태라 건너뛰었습니다.`);
      }
    }
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} (3회기와 같음 — 지난 시간 고른 감정이 첫 화면에 뜹니다)`);
  console.log(`차시 번호 ${LESSON_NO}`);
  console.log("단계: 대기 → 마음 체크인 → 오늘 할 일 → 감정 지도");
  console.log("      → 힐링 스페이스 그리기(+준비 표) → 활용 계획 → 마음일기");
  console.log(`\n교실배치도: ${SCHOOL_MAP} (public 아래 파일)`);
  console.log("발표·전시 없음 · 서로 구경하기 닫음 · 출처 칸 없음");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
