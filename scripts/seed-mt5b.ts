/**
 * 「디지털 마음 톡톡」(자유학기 주제선택) 5회기 · 2차시 —
 * 실패를 노래로 자랑하기 · 감상과 시상.
 *
 *   node --env-file=.env.local scripts/seed-mt5b.ts
 *
 * ## 1차시가 만든 노래를 서로 듣는 시간이다
 *
 * 1차시(205·seed-mt5a)에서 각자 실패 노래를 만들고 링크를 냈다. 2차시는 그 노래들을
 * 익명 갤러리에서 서로 듣고, 부문별로 반응을 남기고, 시상으로 자기 영역을 닫는다.
 *
 * ## 같은 작품 문서를 이어 쓴다
 *
 * 활동 ID(mt-2026-3)를 1차시와 **같게** 둔다. 그래야 지난 시간에 쓴 자랑 타이틀·
 * 가사 한 줄·노래 링크·별점이 오늘 화면에 그대로 열리고, 갤러리 카드에도 그 값이 뜬다
 * (gallery.ts 의 activityIdFor · toCard).
 *
 * ## 부문 투표는 기존 반응 이모지 4종으로 대체한다
 *
 * 부문 투표 전용 기능은 만들지 않는다(추후 결정). 대신 이미 있는 반응 이모지 네 개
 * (types.ts 의 REACTIONS = 👍 😮 💡 ❤️)를 네 시상 부문에 대응시켜 시드한다.
 * 이모지 옆에 이름표를 못 붙이므로(gallery-view 는 이모지만 그린다), 대응표를 진도
 * 안내와 build 단계 안내(_legend)에 글로 박아 학생이 보고 누르게 한다:
 *
 *   ❤️ 나도그랬어상   — 마음이 닿은 실패 노래(공감)
 *   💡 다시일어섰다상 — 극복·배움이 멋진 노래
 *   😮 실패예술가상   — 표현이 놀라운 노래(창의)
 *   👍 솔직담백상     — 진솔해서 여운이 남는 노래
 *
 * 순수 ‘누가 더 크게 망했나’ 부문은 두지 않는다 — 경쟁이 조롱으로 흐르지 않게,
 * 무게는 공감·극복·표현·진솔에 둔다.
 *
 * ## 프라이버시 — 이 과목의 1순위
 *
 * 서로 구경하기를 연다(galleryEnabled: true). 하지만 친구에게 나가는 것은
 * **노래 링크·자랑 타이틀·가사 한 줄·별점** 네 칸뿐이다(galleryAnswerKeys).
 * 실패 상세(fail_pick)·관점 전환(reframe)·강점 문장(strength_line)·배움 한 줄(learn_line)은
 * 1차시에 썼어도 이 목록에 없으므로 서버가 카드에서 빼고 내보낸다(gallery 라우트의 toCard).
 * 가사 한 줄은 1차시에서 “원할 때만” 쓰게 했으므로, 비운 학생 것은 애초에 나갈 내용이 없다.
 *
 * 위기 신호는 공유 칸(위 네 칸)에서 서버가 로컬로 걸러(checkCrisis), 걸리면 그 카드를
 * 친구 목록에서 빼고 교사에게 사실만 알린다(flagCareAlert) — 무엇을 썼는지는 안 보낸다.
 * AI 감정 렌즈는 켜지 않는다(emotion_lens 문항 없음 → Gemini 호출 없음).
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

/** ★ 1차시(seed-mt5a)와 같은 값. 지난 시간에 만든 노래·타이틀이 오늘 열린다 */
const ACTIVITY_ID = "mt-2026-3";
const LESSON_NO = 206;

/** 노래를 못 끝낸 학생이 마저 여는 자리. 1차시와 같은 단일 공개 주소 */
const SUNO_URL = "https://suno.com/";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const WORKSHEET: WorksheetQuestion[] = [
  // ── ① 지난 시간 내 노래 (build) ─────────────────────────────
  {
    key: "_recap",
    phase: "build",
    /*
     * 지난 시간에 쓴 값을 편다. echo 는 같은 작품 문서(activityId)의 답을 읽으므로
     * 1차시에 쓴 타이틀·가사·링크·별점이 그대로 뜬다.
     */
    label: "지난 시간에 만든 내 실패 노래",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "brag_title", label: "내 자랑 타이틀" },
      { key: "lyric_line", label: "내 가사 한 줄" },
      { key: "build_url", label: "내 노래 링크" },
      { key: "stars", label: "내 능력치 별점" },
    ],
    maxLength: 0,
  },
  {
    key: "_reopen",
    phase: "build",
    /*
     * 지난 시간에 노래를 못 끝냈거나 링크를 못 낸 학생을 위한 자리. 짧게 마저 만들게 한다.
     * 로그인은 지난 시간에 했으므로 대개 바로 열린다.
     */
    label: "① 노래를 아직 못 냈다면 — 여기서 마저 만들어 링크를 채우세요",
    hint:
      "지난 시간에 링크를 못 낸 사람은 [Suno 열기] 로 들어가 노래를 완성하고,\n" +
      "위 ‘내 노래 링크’ 칸(지난 시간 활동지)에 Share 주소를 채우면 돼요.\n" +
      "노래 대신 자랑 타이틀·가사만으로 참여해도 괜찮아요 — 똑같이 한 표씩 받습니다.",
    kind: "note",
    copyText: "{학교계정}",
    linkUrl: SUNO_URL,
    linkLabel: "Suno 열기 (새 창)",
    maxLength: 0,
  },
  {
    key: "_legend",
    phase: "build",
    /*
     * 반응 이모지 ↔ 시상 부문 대응표. gallery-view 는 이모지만 그리므로, 무엇을
     * 뜻하는지 여기서 글로 못 박는다. 놀림 금지 규칙도 함께.
     */
    label: "② 친구 노래에 남길 반응 — 이모지 = 시상 부문이에요",
    hint:
      "다음 시간 [실패 노래 자랑대회] 에서 친구 노래를 듣고, 마음에 닿는 부문에 눌러요.\n" +
      "한 사람이 여러 개 눌러도 되지만, 응원으로만 — 서로 비웃지 않기.\n\n" +
      "❤️ 나도그랬어상 — 마음이 닿은 실패 노래(공감)\n" +
      "💡 다시일어섰다상 — 극복·배움이 멋진 노래\n" +
      "😮 실패예술가상 — 표현이 놀라운 노래(창의)\n" +
      "👍 솔직담백상 — 진솔해서 여운이 남는 노래",
    kind: "note",
    maxLength: 0,
  },

  // ── ② 서로 듣고 반응하기 (gallery) ──────────────────────────
  //   갤러리 단계는 gallery-view 가 그린다 — 여기 문항을 두지 않는다.
  //   교사가 단계를 [작품 감상] 으로 넘기면 학생이 반 노래를 듣고 이모지를 누른다.

  // ── ③ 시상과 마무리 (emotion) ──────────────────────────────
  {
    key: "_award_note",
    phase: "emotion",
    label: "③ 시상 — 오늘의 명예 실패자들",
    hint:
      "부문별로 반응을 많이 받은 노래를 선생님이 읽어 줍니다. 상은 잘 망한 게 아니라\n" +
      "**잘 꺼내 보인 용기**에 주는 거예요. 다 함께 박수!",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "closing_line",
    phase: "emotion",
    /*
     * 자기 영역을 닫는 통합 한 문장. 강점(1차시)과 실패·극복을 하나로 잇게 한다.
     * 성찰 등급의 글이라 친구에게 내보내지 않는다(갤러리 키에 없음).
     */
    label: "자기 영역 마무리 한 문장 — 나는 ___한 사람이고, ___할 때 다시 일어선다",
    hint:
      "예) 나는 잘 웃는 사람이고, 넘어져도 툭툭 털고 다시 도전할 때 다시 일어선다.\n" +
      "이 문장은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 200,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "디지털 마음 톡톡 5회기 2차시 — 실패를 노래로 자랑하기 (감상·시상)",

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
      "친구들이 들어오길 기다리는 동안 잠깐 쉬어요.\n" +
      "위에서 떨어지는 똥을 좌우로 피하세요. 한 번이라도 맞으면 끝이에요.",
    url: "https://dodge-poop-game.vercel.app/",
  },
  gameExplainer: empty(),

  progress: {
    heading: "오늘 할 일 — 실패 노래 자랑대회 (2차시)",
    body:
      "지난 시간에 만든 실패 노래를 오늘 서로 들어요. 자기 영역의 마지막 시간입니다.\n\n" +
      "① 내 노래 확인 — 지난 시간에 낸 노래·타이틀 열어 보고, 못 낸 사람은 마저 완성\n" +
      "② 자랑대회 — 친구 노래를 익명으로 듣고, 마음에 닿는 부문에 반응 남기기\n" +
      "③ 시상·마무리 — 부문별 명예 실패자에게 박수, 자기 영역을 한 문장으로 닫기\n\n" +
      "반응 이모지 = 시상 부문이에요:\n" +
      "❤️ 나도그랬어상(공감) · 💡 다시일어섰다상(극복) · 😮 실패예술가상(창의) · 👍 솔직담백상(진솔)\n\n" +
      "누구 노래인지는 안 보여요(익명). 응원으로만 눌러요 — 서로 비웃지 않기.\n" +
      "친구에게 보이는 건 노래·제목·가사 한 줄·별점뿐이에요. 실패 이야기 원문은 안 보입니다.",
    url: "",
  },
  assessment: empty(),
  video: empty(),

  reflectionQuestions: [
    "오늘 친구들의 실패 노래를 들으며 마음에 남는 순간은 언제였나요?",
    "지금 내 기분은 어떤가요? 그리고 왜 그런 것 같나요?",
    "‘나만 실패하는 게 아니구나’ 를 느낀 적이 있나요? 오늘 자기 영역을 지나며 나에 대해 새로 알게 된 것을 적어 주세요.",
  ],
  reflectionPublic: false,

  // Suno 로 마저 나가는 것·감상은 이탈로 세지 않는다
  focusExempt: ["build", "gallery", "emotion"],

  freeNavigation: true,

  phaseLabels: {
    mood: "마음 체크인",
    progress: "오늘 할 일",
    build: "지난 시간 내 노래",
    gallery: "실패 노래 자랑대회",
    emotion: "시상·마무리",
    reflection: "마음일기",
  },

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2026,
    worksheet: WORKSHEET,
    sourcesEnabled: false,

    /*
     * 오늘은 서로 구경하기를 연다. 단, 나가는 것은 네 칸뿐이다.
     * 거르는 자리는 서버다 — 화면에서 숨기는 것만으로는 개발자 도구로 읽힌다.
     */
    galleryEnabled: true,
    galleryAnswerKeys: ["build_url", "brag_title", "lyric_line", "stars"],
    galleryNoun: "노래",

    /*
     * 왼쪽 필터를 별점으로 세운다. 정하지 않으면 기본값(디지털 사회의 특성·장소)이
     * 서는데, 이 활동엔 특성도 장소도 없어 아무것도 거르지 못하는 체크박스만 남는다
     * (gallery 라우트의 facetsFor 기본 분기). 별점은 1차시에 쓴 공유 칸이라 그대로 쓴다.
     */
    galleryFacets: [{ key: "stars", label: "능력치 별점", answerKeys: ["stars"] }],
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (1차시 seed-mt5a 와 같음 — 지난 시간에 만든 노래·타이틀이 열립니다)`);
  console.log(`차시 번호 ${LESSON_NO}`);
  console.log("단계: 대기 → 마음 체크인 → 오늘 할 일 → 지난 시간 내 노래 → 실패 노래 자랑대회(감상·반응) → 시상·마무리 → 마음일기");
  console.log("서로 구경하기: 켬(galleryEnabled: true).");
  console.log("친구에게 나가는 칸: build_url · brag_title · lyric_line · stars 네 칸뿐. 실패 상세·관점 전환·강점 문장·배움 한 줄·마무리 문장은 뺐습니다.");
  console.log("부문 투표: 반응 이모지 4종으로 대체 — ❤️나도그랬어 · 💡다시일어섰다 · 😮실패예술가 · 👍솔직담백 (대응표는 진도 안내·_legend 에 있음).");
  console.log("AI 감정 렌즈: 꺼짐. 위기 신호는 공유 칸에서 서버가 걸러 교사에게 사실만 알림.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
