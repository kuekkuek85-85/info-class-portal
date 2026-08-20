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
 * 이미 넘친다. 여기에 "내 희망 직업의 전망·필요 역량·준비 사항" 심화 활동을 넣으면
 * 8분이 더 붙어 44분이 된다. 들어갈 수 없다.
 *
 * 그래서 두 가지를 했다.
 *  ① 조사를 3개+3개에서 **2개+2개**로 줄였다. 여섯 개를 억지로 채우면 뒤 세 개는
 *    베껴 쓴다 — 개수보다 이유와 출처가 남는 것이 중요하다.
 *  ② 심화 활동은 **5차시로 넘겼다.** 성찰에 끼워 넣어 볼까 했지만 접었다.
 *    자기 진로를 파고드는 별도 활동인데 3분에 욱여넣으면 양쪽 다 어설퍼진다.
 *
 * 다시 계산하면 5 + 7 + 3 + 9 + 5 + 3 = **32분**. 3분이 남는다 —
 * 태블릿이 늦게 켜지거나 카메라 권한에서 막히는 학생이 반드시 나온다.
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

/** 직업 세 개를 (이름, 이유) 짝으로 묻는 칸을 만든다 */
function jobFields(prefix: "vanish" | "rise", label: string, sample: [string, string]) {
  const fields = [];
  for (let i = 1; i <= 3; i += 1) {
    fields.push({
      key: `${prefix}${i}_job`,
      label: `${label} 직업 ${i}`,
      hint: i === 1 ? `예) ${sample[0]}` : "",
      kind: "text" as const,
      maxLength: 30,
    });
    fields.push({
      key: `${prefix}${i}_why`,
      label: `↳ 왜 그렇게 생각하나요?`,
      hint: i === 1 ? `예) ${sample[1]}` : "",
      kind: "text" as const,
      maxLength: 80,
    });
  }
  return fields;
}

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
   * 화면에 제목·설명·링크를 띄우는 칸이 이것뿐이다. 대신 교사 화면의 버튼 이름을
   * phaseLabels 로 바꿔 둔다 — "진도 안내" 라고 뜨면 수업 중에 잘못 누른다.
   */
  progress: {
    heading: "AI가 내 얼굴을 보고 직업을 추천한다면",
    body:
      "아래 버튼을 누르면 새 창이 열립니다. 카메라로 얼굴을 찍으면 AI가 어울리는 직업을 추천해 줍니다.\n" +
      "재미로 하는 체험이에요. 결과가 마음에 안 들어도 괜찮습니다 — 왜 그렇게 나왔을지 생각해 보세요.\n" +
      "다 하면 이 창으로 돌아와서, 활동지에 추천받은 직업과 원래 되고 싶던 직업을 적습니다.",
    url: "https://aijobtest.github.io",
    // 카메라는 iframe 안에서 권한이 막힌다. 새 창으로 연다.
    openInNewTab: true,
    cards: [],
    tabs: [],
  },

  /*
   * 이 차시에서만 쓰는 단계 이름.
   * 그림이 없는 차시라 "작품 감상"이 아니라 "활동지 감상"이다.
   */
  phaseLabels: { progress: "AI 직업 관상 체험", gallery: "활동지 감상" },

  /*
   * 체험 단계에서는 자리 비움을 세지 않는다.
   *
   * 새 창으로 나가서 카메라를 켜는 것이 활동 그 자체다. 그것을 이탈로 세면 반 전체가
   * 노란 칸이 되고, 정작 봐야 할 학생이 묻힌다.
   */
  focusExempt: ["progress"],

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
   * 성찰은 **오늘 한 두 가지**에 하나씩 붙인다.
   *
   * 처음에는 "내 희망 직업의 전망 · 지금부터 준비할 것" 을 성찰에 넣어 심화 활동을
   * 대신하려 했다. 접었다 — 그건 자기 진로를 파고드는 별도 활동이고, 성찰 3분에
   * 끼워 넣으면 양쪽 다 어설퍼진다. 5차시에서 제대로 다룬다.
   *
   * 대신 오늘 실제로 한 것만 되짚는다. AI 관상 체험이 하나, 조사와 갤러리 워크가 하나.
   */
  reflectionQuestions: [
    "AI가 추천한 직업과 내가 원래 되고 싶던 직업이 같았나요, 달랐나요? 그 결과를 보고 든 생각을 적어 주세요.",
    "친구들이 적은 직업 중에 내가 생각하지 못했던 것이 있었나요? 하나를 골라, 그 직업이 왜 사라지거나 잘 나갈 거라고 하는지 내 말로 설명해 주세요.",
  ],
  reflectionPublic: false,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리기가 없는 차시다. 장소를 비우면 그리기 화면이 뜨지 않는다.
    places: [],
    year: 2040,
    /*
     * 활동지 아래 출처 두 칸의 예시.
     *
     * 기본값은 그림 활동을 전제한다("나무위키 — 자율주행"). 직업을 조사한 학생에게
     * 그걸 보여 주면 무엇을 찾아보라는 것인지 어긋난다 — 중1은 예시를 지시로 읽어서,
     * 엉뚱한 예시는 아예 없는 것보다 나쁘다.
     *
     * 사이트 쪽은 워크넷으로 든다. 이 수업에서 실제로 찾아볼 만한 곳이고,
     * 나무위키만 알던 학생에게 직업 정보를 어디서 찾는지 한 번 보여 주는 값도 있다.
     */
    sourceHints: {
      site: "예) 워크넷 — 직업 전망",
      ai: "예) 챗지피티 — 10년 뒤에 사라질 직업은?",
    },
    /*
     * 친구 활동지를 보고 남기는 두 칸.
     *
     * 그림 차시의 "이 그림에 어떤 기술이 쓰였을까요" 를 그대로 두면 볼 그림이 없어서
     * 답할 수가 없다. 성격은 유지한다 — 첫 칸은 **읽어야 답할 수 있는 것**을 묻는다.
     *
     * 성찰 2번("생각하지 못했던 직업 하나")과 겹치지 않게, 여기서는 **덧붙이기**를
     * 묻는다. 같은 직업에 다른 근거를 대 보게 하면 감상이 대화가 된다.
     */
    feedbackPrompts: {
      found: {
        label: "친구가 적은 직업 하나를 골라, 왜 그렇게 될지 내 생각을 덧붙여 주세요",
        placeholder: "예) 번역가 — 그래도 소설 번역은 사람이 해야 할 것 같아요",
      },
      question: {
        label: "이 친구에게 물어보고 싶은 것",
        placeholder: "예) 그 직업은 어디서 찾았어요?",
      },
    },
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
      /*
       * 직업과 이유를 **다른 칸에** 적는다.
       *
       * 처음에는 한 칸에 "직업 — 이유" 를 여러 줄로 적게 했는데, 중1에게는 무엇을
       * 어디에 쓰라는 건지 헷갈린다. 칸이 나뉘면 쓸 것이 분명해지고, 교사 집계도
       * 글을 쪼개 볼 필요 없이 직업 칸만 세면 된다.
       */
      ...jobFields("vanish", "사라질", [
        "톨게이트 요금 수납원",
        "하이패스가 대신하니까",
      ]),
      ...jobFields("rise", "생겨나거나 잘 나갈", [
        "AI 윤리 전문가",
        "AI가 잘못 판단할 때 책임을 정해야 하니까",
      ]),
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
