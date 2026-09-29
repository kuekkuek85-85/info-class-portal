/**
 * 「디지털 마음 톡톡」 — 함께 잇는 이야기 (Gartic Phone). 독립 활동, 재사용 가능.
 *
 *   node --env-file=.env.local scripts/seed-mt-gartic.ts
 *
 * ## 무엇인가 — 이어그리기/이어쓰기로 의사소통·조망수용·협력
 *
 * Gartic Phone 을 **새 탭 하이퍼링크**로 걸고, 협력형 이어잇기를 한다: 한 명이 문장을 쓰면 →
 * 다음 사람이 그림으로 그리고 → 다음 사람이 그 그림을 보고 문장으로 쓰고 → … 마지막에 처음
 * 문장이 어떻게 바뀌었는지 체인 전체를 함께 본다. "내 생각이 남에게 전달되며 어떻게 바뀌는가
 * (오해가 생기는 지점), 남이 알아보게 표현하려는 조망수용, 함께 만드는 협력" 을 겪는다.
 * 스케치풀 활동(seed-mt-sketchful)의 형제 활동이다(같은 방식: 링크 + 안내 + 성찰).
 *
 * ## 접속 구조 — 방장이 초대 링크를 만들어 공유
 *
 * 방장이 접속해 **초대 링크를 생성**하면 친구들이 그 링크로 입장한다. 안내 note 에 이 절차를
 * 반드시 담는다("방장이 방을 만들어 초대 링크를 공유하면 친구들이 들어와요").
 *
 * ## 새 코드가 없다 — 기존 kind 만으로 된다 (시드만, 배포 불필요)
 *
 * 안내는 note + linkUrl(새 탭 링크)이고, 성찰은 long/text 활동지다. Gartic Phone 은 CSP 상
 * iframe 임베드가 막히므로 **반드시 새 탭 링크**로 연다(worksheet-view 의 linkUrl 은 늘
 * target="_blank"). 새 컴포넌트·라우트·kind 가 없으므로 이 시드만 반영하면 된다.
 *
 * ## 프라이버시
 *
 * 기분·감정 서술이 있어 이 과목 관례대로 **개인 비공개**로 둔다: galleryEnabled: false,
 * galleryAnswerKeys 없음 — 성찰 글은 친구에게 안 나간다(서버 갤러리 라우트가 막는다). AI 호출
 * 없음. 감정 서술이 비공개라, 규칙 만들기(갤러리 켬) 활동과 **활동 통을 섞지 않는다**.
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
const ACTIVITY_ID = "mt-2026-gartic";
/** 차시 번호 — 200번대. 회기 미배정이라 209 로 임시 등록(스케치풀 208 의 형제). */
const LESSON_NO = 209;

/** Gartic Phone — 이어그리기/이어쓰기. CSP 상 iframe 임베드가 막혀 새 탭으로만 연다. */
const GARTIC_URL = "https://garticphone.com/ko";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const WORKSHEET: WorksheetQuestion[] = [
  /* ═══════════ ① 게임 안내 + Gartic Phone 새 탭 링크 (problem) ═══════════ */
  {
    key: "_gp_intro",
    phase: "problem",
    label: "함께 잇는 이야기 — Gartic Phone",
    hint:
      "여럿이 함께 이야기를 이어 만드는 게임이에요. 문장 → 그림 → 문장 → 그림 … 으로 이어져요.\n" +
      "① 방장이 아래 [Gartic Phone 열기] 로 접속해 방을 만들고, ‘초대 링크’ 를 만들어 공유해요.\n" +
      "② 친구들은 그 초대 링크로 들어와요(같은 방).\n" +
      "③ 먼저 각자 한 문장을 써요. → 다음 사람이 그 문장을 보고 그림으로 그려요.\n" +
      "④ 다음 사람은 그 그림만 보고 다시 문장으로 써요. 이렇게 계속 이어져요.\n" +
      "⑤ 끝나면 ‘처음 문장 → 마지막’ 까지 어떻게 바뀌었는지 체인을 다 같이 봐요.\n\n" +
      "오늘의 포인트: 내 생각이 남에게 전해질 때 어디서 뜻이 달라지는지, 남이 알아보게\n" +
      "그리거나 쓰려면 ‘보는 사람의 눈’ 으로 어떻게 표현해야 하는지 느껴 봐요.",
    kind: "note",
    linkUrl: GARTIC_URL,
    linkLabel: "Gartic Phone 열기 (새 탭)",
    maxLength: 0,
  },

  /* ═══════════ ② 게임 후 성찰 (개인, 비공개 — build) ═══════════ */
  {
    key: "_gp_reflect_intro",
    phase: "build",
    label: "게임을 하고 나서 — 잠깐 돌아봐요",
    hint: "아래 칸들은 나와 선생님만 봐요. 편하게 적어 주세요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "gp_change",
    phase: "build",
    label: "내 문장이나 그림이 마지막에 어떻게 바뀌었나요? 놀란 점을 적어 보세요",
    hint:
      "예) 나는 ‘강아지가 공을 물고 있다’ 라고 썼는데 마지막엔 ‘사자가 축구한다’ 가 됐다.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "gp_why",
    phase: "build",
    label: "왜 그렇게 바뀌었을까요? 어디서 뜻이 달라진 것 같나요?",
    hint:
      "그림이 헷갈렸던 부분, 문장이 여러 뜻으로 읽힌 부분을 떠올려 봐요. 이것이 ‘오해’ 가\n" +
      "생기는 지점이에요. 이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "gp_perspective",
    phase: "build",
    label: "남이 알아보게 그리거나 쓰려고 어떻게 했나요? 상대 입장에서 생각해 본 점을 적어 보세요",
    hint:
      "예) 누구나 아는 모양으로 단순하게 그렸다 / 문장을 짧고 분명하게 썼다.\n" +
      "‘받는 사람이 무엇을 떠올릴까’ 를 생각한 순간을 적어 봐요. 이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "gp_fun",
    phase: "build",
    // (선택) 함께 웃은 결과 — 개인 기록, 비공개.
    label: "(선택) 가장 웃겼거나 기억에 남는 결과가 있다면 적어 주세요",
    hint: "안 적어도 괜찮아요. 이 칸은 나와 선생님만 봐요.",
    kind: "text",
    maxLength: 200,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "디지털 마음 톡톡 — 함께 잇는 이야기 (Gartic Phone · 의사소통·조망수용)",

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
    heading: "오늘 할 일 — 함께 잇는 이야기",
    body:
      "① Gartic Phone 이어잇기 게임 — 문장 → 그림 → 문장 … 으로 함께 이야기 만들기\n" +
      "② 게임 후 돌아보기 — 내 말이 어떻게 바뀌었나, 어디서 뜻이 달라졌나, 상대 입장 헤아리기\n" +
      "③ 마음일기로 오늘을 마무리해요\n\n" +
      "포인트: 내 생각이 전해질 때 어디서 오해가 생길까? ‘받는 사람의 눈’ 으로 표현해 봐요.",
    url: "",
  },

  assessment: empty(),
  video: empty(),

  reflectionQuestions: [
    "오늘 활동에서 마음에 남는 순간은 언제였나요? 무엇 때문에 그랬는지도 함께 적어 주세요.",
    "지금 내 기분은 어떤가요? 그리고 왜 그런 것 같나요?",
    "‘상대가 알아듣게 전하기’ 를, 이번 주에 친구 관계에서 어떻게 써볼 수 있을까요?",
  ],
  reflectionPublic: false,

  /*
   * 게임(problem)은 Gartic Phone 을 새 탭으로 열어 학생이 포털을 잠시 떠난다 — 활동이라
   * 이탈로 세지 않게 면제한다.
   */
  focusExempt: ["problem"],

  // 교사 버튼 순서. 대기 → 마음 체크인 → 게임(problem) → 게임 후 돌아보기(build) → 마음일기.
  phaseOrder: ["waiting", "mood", "problem", "build", "reflection"],

  phaseLabels: {
    mood: "마음 체크인",
    problem: "게임: Gartic Phone",
    build: "게임 후 돌아보기",
    reflection: "마음일기",
  },

  activity: {
    activityId: ACTIVITY_ID,
    // 포털 안에서 그림을 그리는 활동이 아니다(그리기는 Gartic Phone 에서). 그림판 없음.
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} · 차시 번호 ${LESSON_NO} (함께 잇는 이야기 — Gartic Phone)`);
  console.log("교사 버튼 순서: 대기 → 마음 체크인 → 게임(Gartic Phone) → 게임 후 돌아보기 → 마음일기");
  console.log(`Gartic Phone: 새 탭 링크(${GARTIC_URL}) — CSP 상 임베드 불가라 새 탭으로만 엽니다.`);
  console.log("접속: 방장이 방을 만들어 ‘초대 링크’ 를 공유 → 친구들이 그 링크로 입장(안내 note 에 반영).");
  console.log("성찰 활동지 4문항(내 말이 바뀐 점·오해가 생긴 지점·상대 입장·(선택) 웃긴 결과). 모두 개인·비공개.");
  console.log("프라이버시: 서로 구경하기 꺼짐(galleryEnabled: false), galleryAnswerKeys 없음. AI 호출 없음.");
  console.log("새 코드 없음 — 기존 kind(note+linkUrl · long · text)만 씀. 이 시드만 반영하면 됩니다(배포 불필요).");
  console.log("세션 열기: 기존 open-mt* 꼴 복제(세션 ID 는 분반 열쇠). galleryEnabled: false 유지.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
