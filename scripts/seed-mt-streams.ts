/**
 * 「디지털 마음 톡톡」 공동체 — STREAMS 보드게임 개인전. 독립 활동, 재사용 가능.
 *
 *   node --env-file=.env.local scripts/seed-mt-streams.ts
 *
 * ## 무엇인가 — 확률·전략 판단으로 즐기는 STREAMS 개인전
 *
 * 타일을 한 장씩 뽑아 20칸 보드의 빈 칸에 놓는다(놓으면 못 옮김). 왼쪽부터 숫자가 같거나
 * 커지면 한 줄기로 이어지고, 긴 줄기일수록 점수가 커진다. 조커는 만능(와일드). "다음에 어떤
 * 수가 나올까" 를 가늠해 자리를 정하는 확률·전략 판단이 핵심이다. 게임 뒤 가볍게 성찰한다.
 *
 * ## 새 코드 (배포 필요)
 *
 * streams_solo kind + 컴포넌트(streams-solo) + 공유 엔진(streams.ts)은 코드다. main 머지·배포
 * 후에야 학생 화면에 게임이 뜬다. 계산·채점은 전부 클라이언트에서 — 서버·Gemini·외부 API 없음.
 *
 * ## 협력전은 추후
 *
 * 실시간 2팀 턴제 투표 협력전은 이후 별도 작업이다. 이 시드는 **개인전만** 담는다.
 *
 * ## 프라이버시
 *
 * 게임 점수는 비민감이지만, 성찰에 기분 서술이 있어 이 과목 관례대로 **개인 비공개**로 둔다:
 * galleryEnabled: false, galleryAnswerKeys 없음. AI 호출 없음.
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

/** 이 활동만의 활동통(게임 점수·성찰). 감정 성찰 비공개라 갤러리 쓰는 규칙 활동과 안 섞는다. */
const ACTIVITY_ID = "mt-2026-streams";
/** 차시 번호 — 200번대. 회기 미배정이라 210 로 임시 등록. */
const LESSON_NO = 210;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const WORKSHEET: WorksheetQuestion[] = [
  /* ═══════════ ① 규칙 안내 + 개인전 (problem) ═══════════ */
  {
    key: "_st_intro",
    phase: "problem",
    label: "STREAMS — 숫자 줄기 잇기 게임",
    hint:
      "타일을 한 장씩 뽑아 20칸에 놓는 게임이에요. 규칙은 간단해요.\n" +
      "① 뽑힌 타일을 빈 칸 하나에 놓아요. 한 번 놓으면 옮길 수 없어요.\n" +
      "② 왼쪽부터 숫자가 같거나 커지면(예: 3-3-7-9) 한 ‘줄기’ 로 이어져요.\n" +
      "③ 줄기가 길수록 점수가 훨씬 커져요(2칸 1점 … 10칸 25점 … 20칸 300점).\n" +
      "④ 조커는 아무 데나 이어 주는 만능 타일이에요.\n\n" +
      "다음에 어떤 숫자가 나올지 생각하며 자리를 잘 골라 봐요. 두어 판 해보고 최고 점수에\n" +
      "도전해요!",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "st_game",
    phase: "problem",
    // STREAMS 개인전. 클라이언트에서 계산·채점, 최고 점수만 저장. 개인 기록.
    label: "STREAMS 개인전",
    hint: "‘게임 시작’ 을 누르고, 뽑힌 타일을 빈 칸에 놓아요. 20칸을 다 채우면 점수가 나와요.",
    kind: "streams_solo",
    maxLength: 0,
  },

  /* ═══════════ ② 게임 후 성찰 (개인 비공개 · build) ═══════════ */
  {
    key: "_st_reflect_intro",
    phase: "build",
    label: "게임을 하고 나서 — 잠깐 돌아봐요",
    hint: "아래 칸들은 나와 선생님만 봐요. 편하게 적어 주세요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "st_strategy",
    phase: "build",
    label: "타일을 어디에 놓을지 어떻게 정했나요? 나만의 방법이 있었나요?",
    hint:
      "예) 큰 숫자는 오른쪽에 남겨 뒀다 / 조커는 아껴 뒀다 / 다음에 나올 숫자를 짐작해 봤다.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "st_feel",
    phase: "build",
    label: "게임하는 동안 기분이 어땠나요? 아쉬웠던 순간이나 짜릿했던 순간이 있었나요?",
    hint:
      "예) 긴 줄기가 이어질 때 신났다 / 큰 숫자가 일찍 나와서 아쉬웠다.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "st_learn",
    phase: "build",
    label: "(선택) 다음 판엔 어떻게 해보고 싶나요? 알게 된 점이 있다면 적어 주세요",
    hint: "안 적어도 괜찮아요. 이 칸은 나와 선생님만 봐요.",
    kind: "text",
    maxLength: 200,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "디지털 마음 톡톡 — STREAMS 보드게임 개인전 (공동체)",

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
    heading: "오늘 할 일 — STREAMS 보드게임",
    body:
      "① 규칙 익히기 — 타일을 놓아 숫자 줄기를 길게 이어요\n" +
      "② 개인전 두어 판 — 확률·전략을 생각하며 최고 점수에 도전\n" +
      "③ 게임 후 돌아보기 → 마음일기\n\n" +
      "(협력전은 다음에 함께 해볼 거예요.)",
    url: "",
  },

  assessment: empty(),
  video: empty(),

  reflectionQuestions: [
    "오늘 활동에서 마음에 남는 순간은 언제였나요? 무엇 때문에 그랬는지도 함께 적어 주세요.",
    "지금 내 기분은 어떤가요? 그리고 왜 그런 것 같나요?",
    "게임에서 ‘운’ 과 ‘전략’ 은 각각 얼마나 중요했다고 느꼈나요?",
  ],
  reflectionPublic: false,

  focusExempt: [],

  // 교사 버튼 순서. 대기 → 마음 체크인 → 규칙·개인전(problem) → 게임 후 돌아보기(build) → 마음일기.
  phaseOrder: ["waiting", "mood", "problem", "build", "reflection"],

  phaseLabels: {
    mood: "마음 체크인",
    problem: "STREAMS 개인전",
    build: "게임 후 돌아보기",
    reflection: "마음일기",
  },

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2026,
    worksheet: WORKSHEET,
    sourcesEnabled: false,

    /*
     * ★ 서로 구경하기를 닫는다 — 성찰의 기분 서술은 친구에게 안 나간다(게임 점수도 공유 안 함).
     * 서버 갤러리 라우트가 이 값을 보고 응답 자체를 막는다(gallery/route.ts).
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} · 차시 번호 ${LESSON_NO} (STREAMS 개인전)`);
  console.log("교사 버튼 순서: 대기 → 마음 체크인 → 규칙·개인전(problem) → 게임 후 돌아보기(build) → 마음일기");
  console.log("개인전: 한 장씩 뽑아 20칸 배치 → 오름차순 구간 채점(조커 와일드) → 최고 점수만 저장. 클라이언트 계산(서버·AI 없음).");
  console.log("프라이버시: 서로 구경하기 꺼짐(galleryEnabled: false), galleryAnswerKeys 없음. 성찰 비공개.");
  console.log("⚠ 코드(streams_solo kind·컴포넌트·엔진)라 main 머지·배포 후에야 화면에 게임이 뜹니다.");
  console.log("협력전(실시간 2팀 턴제 투표)은 추후 별도 작업 — 이 시드엔 없습니다.");
  console.log("세션 열기: 기존 open-mt* 꼴 복제(세션 ID 는 분반 열쇠). galleryEnabled: false 유지.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
