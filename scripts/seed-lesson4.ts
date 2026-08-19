import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * 4차시 — 미래 사회와 나의 진로.
 *
 * 3차시까지 "세상이 어떻게 바뀌는가"를 봤다. 4차시는 그 변화를 **자기 진로에** 붙인다.
 *
 * ## 35분에 맞춰 깎은 기록
 *
 * 이번 주는 40분 수업에 정리 5분을 빼면 **35분**이다. 처음 구상은 이랬다.
 *
 *   인증·기분 5 + AI 관상 7 + 영상 3 + 조사(3+3) 13 + 갤러리 5 + 성찰 3 = 36분
 *
 * 이미 넘친다. 여기에 "내 희망 직업의 전망·필요 역량·준비 사항" 심화 활동을 별도로
 * 넣으면 8분이 더 붙어 44분이 된다. 들어갈 수 없다.
 *
 * 그래서 두 가지를 했다.
 *  ① 조사를 3개+3개에서 **2개+2개**로 줄였다. 여섯 개를 억지로 채우면 뒤 세 개는
 *    베껴 쓴다 — 개수보다 이유와 출처가 남는 것이 중요하다.
 *  ② 심화 활동을 **성찰 질문으로 흡수**했다. 별도 단계를 만들지 않으니 시간이 거의
 *    들지 않으면서, "내 희망 직업은 어느 쪽인가 · 그래서 무엇을 준비할까"라는
 *    이 수업의 진짜 목적은 그대로 남는다.
 *
 * 다시 계산하면 5 + 7 + 3 + 9 + 5 + 5 = **34분**이다.
 */

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const empty = () => ({ heading: "", body: "", url: "", cards: [], tabs: [] });

/**
 * 3차시(그림)와 **다른 활동 ID**를 쓴다.
 *
 * 같은 값을 쓰면 4차시 활동지 답이 3차시 그림 문서에 얹혀서, 그림과 직업 조사가
 * 한 카드에 섞여 나온다.
 */
const ACTIVITY_ID = "future-job";

const PLAN = {
  lessonNo: 4,
  title: "미래 사회와 나의 진로",
  moodCheckEnabled: true,

  // 대기 게임을 2048로 바꾼다. 하노이 탑은 세 차시를 했으니 새것이 낫다.
  game: {
    heading: "기다리는 동안 — 2048",
    body: "같은 숫자를 붙이면 두 배가 됩니다. 2048을 만들어 보세요.\n화살표나 손가락으로 밀면 됩니다.",
    url: "https://2048-game-gilt-kappa.vercel.app/",
    cards: [],
    tabs: [],
  },
  gameExplainer: empty(),

  /*
   * AI 관상 체험을 "진도 안내" 칸에 싣는다.
   *
   * 단계 이름과 내용이 어긋나지만, 화면에 제목·설명·링크를 띄우는 칸이 이것뿐이다.
   * 학생에게는 단계 이름이 보이지 않고 내용만 보이므로 수업에는 지장이 없다.
   */
  progress: {
    heading: "AI가 내 얼굴을 보고 직업을 추천한다면",
    body:
      "아래 주소를 눌러 카메라로 얼굴을 찍으면, AI가 어울리는 직업을 추천해 줍니다.\n" +
      "재미로 하는 체험이에요. 결과가 마음에 안 들어도 괜찮습니다 — 왜 그렇게 나왔을지 생각해 보세요.\n" +
      "체험이 끝나면 활동지에 추천받은 직업과 원래 되고 싶던 직업을 적습니다.",
    url: "https://aijobtest.github.io",
    cards: [],
    tabs: [],
  },

  assessment: empty(),

  video: {
    heading: "AI 시대, 일자리는 사라질까 늘어날까",
    body:
      "앞 화면을 봐 주세요.\n" +
      "숫자 두 개를 귀담아들으세요 — 사라지는 일자리와 새로 생기는 일자리입니다.\n" +
      "그리고 '어떤 일'이 로봇에게 넘어가는지도요.",
    url: "https://youtu.be/wf7aMiXpVPc",
    cards: [],
    tabs: [],
  },

  /*
   * 성찰이 곧 심화 활동이다.
   *
   * 앞의 세 질문은 오늘 실제로 한 일에 붙고, 마지막 질문이 "그래서 나는"으로 닫는다.
   * 별도 단계를 만들지 않았으므로 시간은 성찰 5분 안에서 해결된다.
   */
  reflectionQuestions: [
    "AI가 추천한 직업과 내가 원래 되고 싶던 직업이 같았나요, 달랐나요? 그 결과를 보고 든 생각을 적어 주세요.",
    "내 희망 직업은 앞으로 어느 쪽에 가까울까요 — 유망해질까요, 줄어들까요? 오늘 찾아본 것을 근거로 들어 설명해 주세요.",
    "그래서 지금부터 준비할 것 하나를 적어 주세요. (배워 둘 것 · 해 볼 경험 · 눈여겨볼 학과 무엇이든)",
  ],
  reflectionPublic: false,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리기가 없는 차시다. 장소를 비우면 그리기 화면이 뜨지 않는다.
    places: [],
    year: 2040,
    worksheet: [
      {
        key: "ai_job",
        label: "AI가 추천해 준 직업",
        hint: "체험 결과에 나온 직업 이름을 그대로 적어 주세요.",
        kind: "text",
        maxLength: 40,
      },
      {
        key: "my_job",
        label: "내가 원래 되고 싶던 직업",
        hint: "아직 없으면 '관심 있는 분야'를 적어도 됩니다.",
        kind: "text",
        maxLength: 40,
      },
      {
        key: "vanish",
        label: "앞으로 사라질 가능성이 높은 직업 2가지 — 이유와 함께",
        hint: "예) 톨게이트 요금 수납원 — 하이패스가 대신하니까. 한 줄에 하나씩 적어 주세요.",
        kind: "long",
        maxLength: 300,
      },
      {
        key: "rise",
        label: "앞으로 생겨나거나 잘 나갈 직업 2가지 — 이유와 함께",
        hint: "예) AI 윤리 전문가 — AI가 잘못 판단할 때 책임을 정해야 하니까.",
        kind: "long",
        maxLength: 300,
      },
    ],
  },
} as const;

async function main(): Promise<void> {
  const existing = await db.collection("lessonPlans").where("lessonNo", "==", 4).get();
  const now = Date.now();

  if (existing.empty) {
    const ref = await db.collection("lessonPlans").add({ ...PLAN, createdAt: now, updatedAt: now });
    console.log(`✓ 4차시 등록 — ${PLAN.title} (${ref.id})`);
  } else {
    for (const doc of existing.docs) {
      await doc.ref.set({ ...PLAN, updatedAt: now }, { merge: true });
      console.log(`↻ 4차시 갱신 — ${PLAN.title} (${doc.id})`);

      // 아직 시작하지 않은 수업에 내용을 다시 복사한다 (진행 중인 수업은 건드리지 않는다)
      const sessions = await db
        .collection("classSessions")
        .where("lessonPlanId", "==", doc.id)
        .where("status", "==", "scheduled")
        .get();
      for (const s of sessions.docs) {
        await s.ref.set({ ...PLAN }, { merge: true });
      }
      console.log(`   아직 시작하지 않은 수업 ${sessions.size}개에 반영`);
    }
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} (3차시 그림과 분리됨)`);
  console.log("대기 게임: 2048 · 체험: AI 직업 관상 · 영상: AI 시대 일자리");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
