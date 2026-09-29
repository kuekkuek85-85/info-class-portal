/**
 * 「디지털 마음 톡톡」 — 그림으로 마음 전하기 (Sketchful.io). 독립 활동, 재사용 가능.
 *
 *   node --env-file=.env.local scripts/seed-mt-sketchful.ts
 *
 * ## 무엇인가 — 그림 맞히기 게임으로 조망수용(상대 마음 헤아리기)
 *
 * 온라인 그림 맞히기 게임 Sketchful.io 를 **새 탭 하이퍼링크**로 걸고, 학생이 제시어를 그리면
 * 다른 학생이 맞힌다. "남이 알아보게 그리려면 상대가 무엇을 떠올릴지 헤아려야 한다" — 이
 * 조망수용이 핵심이다(대인관계·공동체 양쪽으로 볼 수 있다). 게임 뒤에는 활동지로 가볍게 성찰한다.
 *
 * ## 새 코드가 없다 — 기존 kind 만으로 된다 (시드만, 배포 불필요)
 *
 * 안내는 note + linkUrl(새 탭 링크)이고, 성찰은 long/text 활동지다. Sketchful.io 는 CSP 상
 * iframe 임베드가 막히므로 **반드시 새 탭 링크**로 연다(worksheet-view 의 linkUrl 은 늘
 * target="_blank" 로 열린다). 새 컴포넌트·라우트·kind 가 없으므로 이 시드만 반영하면 된다.
 *
 * ## 프라이버시
 *
 * 기분·감정 서술이 있어 이 과목 관례대로 **개인 비공개**로 둔다: galleryEnabled: false,
 * galleryAnswerKeys 없음 — 성찰 글은 친구에게 안 나간다(서버 갤러리 라우트가 막는다). AI 호출
 * 없음. 이 활동은 감정 서술이 비공개라, 규칙 만들기(갤러리 켬) 활동과 **활동 통을 섞지 않는다**.
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

/** 이 활동만의 활동통. 감정 서술이 비공개라, 갤러리를 쓰는 규칙 활동 통과 섞지 않는다. */
const ACTIVITY_ID = "mt-2026-sketchful";
/** 차시 번호 — 200번대(2회기 202 … 6회기 206 · 규칙활동 207). 회기 미배정이라 208 로 임시 등록. */
const LESSON_NO = 208;

/** Sketchful.io — 그림 맞히기 게임. CSP 상 iframe 임베드가 막혀 새 탭으로만 연다. */
const SKETCHFUL_URL = "https://sketchful.io/";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const WORKSHEET: WorksheetQuestion[] = [
  /* ═══════════ ① 게임 안내 + Sketchful.io 새 탭 링크 (problem) ═══════════ */
  {
    key: "_sk_intro",
    phase: "problem",
    label: "그림으로 마음 전하기 — Sketchful.io",
    hint:
      "온라인 그림 맞히기 게임이에요. 한 사람이 제시어를 그리면, 다른 친구들이 맞혀요.\n" +
      "① 아래 [Sketchful.io 열기] 를 눌러 새 탭에서 열어요.\n" +
      "② 선생님 안내에 따라 같은 방에 들어가요(방 만들기 또는 방 코드로 입장).\n" +
      "③ 내 차례엔 제시어를 그리고, 다른 차례엔 채팅으로 정답을 맞혀요.\n\n" +
      "오늘의 포인트: 남이 알아보게 그리려면, 상대가 그 그림을 보고 무엇을 떠올릴지\n" +
      "먼저 생각해 봐야 해요. ‘내 눈’ 이 아니라 ‘보는 사람의 눈’ 으로 그려 봐요.",
    kind: "note",
    linkUrl: SKETCHFUL_URL,
    linkLabel: "Sketchful.io 열기 (새 탭)",
    maxLength: 0,
  },

  /* ═══════════ ② 게임 후 성찰 활동지 (개인, 비공개 — build) ═══════════ */
  {
    key: "_sk_reflect_intro",
    phase: "build",
    label: "게임을 하고 나서 — 잠깐 돌아봐요",
    hint: "아래 칸들은 나와 선생님만 봐요. 편하게 적어 주세요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "sk_word",
    phase: "build",
    label: "가장 인상에 남은 제시어는 무엇이었나요? 왜 그런가요?",
    hint:
      "그리기 어려웠던 것, 재미있었던 것, 뜻밖에 다들 잘 맞힌 것 무엇이든 좋아요.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "sk_feel",
    phase: "build",
    label: "그릴 때와 맞힐 때, 기분이 어땠나요?",
    hint:
      "예) 내 그림을 못 알아볼까 봐 조마조마했다 / 친구 그림을 맞혔을 때 신났다.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "sk_perspective",
    phase: "build",
    label: "남이 알아보게 그리려고 어떻게 신경 썼나요? 상대 입장에서 생각해 본 점을 적어 보세요",
    hint:
      "예) 특징을 크게 그렸다 / 다들 아는 모양으로 단순하게 그렸다 / 글자 대신 그림으로만.\n" +
      "‘보는 사람이 무엇을 떠올릴까’ 를 생각한 순간을 적어 봐요. 이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "sk_fun",
    phase: "build",
    // (선택) 함께 웃은 순간 — 개인 기록, 비공개.
    label: "(선택) 친구 그림 중 기억에 남는 것이나, 함께 웃었던 순간이 있다면 적어 주세요",
    hint: "안 적어도 괜찮아요. 이 칸은 나와 선생님만 봐요.",
    kind: "text",
    maxLength: 200,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "디지털 마음 톡톡 — 그림으로 마음 전하기 (Sketchful.io · 조망수용)",

  moodCheckEnabled: true,

  groups: [
    { key: "mt-tue-1", label: "화요일 1기", classNo: 1 },
    { key: "mt-thu-1", label: "목요일 1기", classNo: 2 },
    { key: "mt-tue-2", label: "화요일 2기", classNo: 3 },
    { key: "mt-thu-2", label: "목요일 2기", classNo: 4 },
  ],

  game: {
    heading: "기다리는 동안 — 지뢰찾기",
    body:
      "친구들이 다 모일 때까지 잠깐 쉬어요.\n" +
      "숫자는 그 칸 둘레에 숨은 지뢰의 개수예요. 지뢰가 없는 칸을 골라 열어 보세요.",
    url: "https://mine-sweeper-game-seven.vercel.app/home",
  },
  gameExplainer: empty(),

  progress: {
    heading: "오늘 할 일 — 그림으로 마음 전하기",
    body:
      "① Sketchful.io 그림 맞히기 게임 — 제시어를 그리고, 친구 그림을 맞혀요\n" +
      "② 게임 후 돌아보기 — 인상에 남은 제시어·기분·상대 입장 헤아리기\n" +
      "③ 마음일기로 오늘을 마무리해요\n\n" +
      "포인트: 남이 알아보게 그리려면 ‘보는 사람의 눈’ 으로 생각해 봐요.",
    url: "",
  },

  assessment: empty(),
  video: empty(),

  reflectionQuestions: [
    "오늘 활동에서 마음에 남는 순간은 언제였나요? 무엇 때문에 그랬는지도 함께 적어 주세요.",
    "지금 내 기분은 어떤가요? 그리고 왜 그런 것 같나요?",
    "‘상대의 눈으로 생각하기’ 를, 이번 주에 친구 관계에서 어떻게 써볼 수 있을까요?",
  ],
  reflectionPublic: false,

  /*
   * 게임(problem)은 Sketchful.io 를 새 탭으로 열어 학생이 포털을 잠시 떠난다 — 활동이라
   * 이탈로 세지 않게 면제한다.
   */
  focusExempt: ["problem"],

  // 교사 버튼 순서. 대기 → 마음 체크인 → 게임(problem) → 게임 후 돌아보기(build) → 마음일기.
  phaseOrder: ["waiting", "mood", "problem", "build", "reflection"],

  phaseLabels: {
    mood: "마음 체크인",
    problem: "게임: Sketchful.io",
    build: "게임 후 돌아보기",
    reflection: "마음일기",
  },

  activity: {
    activityId: ACTIVITY_ID,
    // 포털 안에서 그림을 그리는 활동이 아니다(그리기는 Sketchful.io 에서). 그림판 없음.
    places: [],
    year: 2026,
    worksheet: WORKSHEET,
    sourcesEnabled: false,

    /*
     * ★ 서로 구경하기를 닫는다 — 기분·감정 서술은 친구에게 안 나간다. 서버 갤러리 라우트가
     * 이 값을 보고 응답 자체를 막는다(gallery/route.ts). galleryAnswerKeys 는 두지 않는다.
     */
    galleryEnabled: false,
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} · 차시 번호 ${LESSON_NO} (그림으로 마음 전하기 — Sketchful.io)`);
  console.log("교사 버튼 순서: 대기 → 마음 체크인 → 게임(Sketchful.io) → 게임 후 돌아보기 → 마음일기");
  console.log(`Sketchful.io: 새 탭 링크(${SKETCHFUL_URL}) — CSP 상 임베드 불가라 새 탭으로만 엽니다.`);
  console.log("성찰 활동지 4문항(인상 제시어·기분·상대 입장·(선택) 함께 웃은 순간). 모두 개인·비공개.");
  console.log("프라이버시: 서로 구경하기 꺼짐(galleryEnabled: false), galleryAnswerKeys 없음. AI 호출 없음.");
  console.log("새 코드 없음 — 기존 kind(note+linkUrl · long · text)만 씀. 이 시드만 반영하면 됩니다(배포 불필요).");
  console.log("세션 열기: 기존 open-mt* 꼴 복제(세션 ID 는 분반 열쇠). galleryEnabled: false 유지.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
