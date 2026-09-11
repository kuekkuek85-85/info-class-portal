/**
 * 12차시 차시 계획 등록 — 「프로그래밍 시작 · 도우미 선발」.
 *
 *   node --env-file=.env.local scripts/seed-lesson12.ts
 *   node --env-file=.env.local scripts/seed-lesson12.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 왜 이 시간이 있나 (교사 확정)
 *
 * 프로그래밍·피지컬 컴퓨팅 단원(12차~약51차)은 **도우미·모둠 기반 또래 지원**으로 굴러간다.
 * 그래서 12차시를 **도우미 선발** 시간으로 쓴다: 파이썬을 좀 하는·컴퓨팅 사고가 있는
 * 학생을 **순위로 뽑아** 이후 차시 도우미로 세운다. 선생님은 이 시간 동안 대시보드
 * 리더보드로 경쟁을 유도하며 지켜본다.
 *
 * 마이크로비트 첫 시간은 그 뒤 **13차(seed-lesson13.ts)** 로 밀렸다.
 *
 * ## 선발 규칙 (교사 확정)
 *
 *   · 도우미 7명 / 순위 = **진단 70% + 타자 30%** / 진단 10문항 / 리더보드 전체 실명 공개.
 *   · 종합점수 = 진단×0.7 + 타자×0.3. 두 점수 모두 0~100 이라 종합도 0~100.
 *   · 순위·top7 계산과 리더보드는 **교사 대시보드**가 실시간으로 한다(dashboard route).
 *   · 교사가 「도우미 7명 확정」을 누르면 반별 helpers 문서에 저장 → 이후 차시가 읽는다.
 *
 * ## 40분 흐름 (교사 톤: 9·10차와 같음)
 *
 *   0–3   대기·기분·출석
 *   3–8   오늘 할 일 보드 — 도우미 선발 안내 + 파이썬 아주 조금(문법 미니, 읽기용)
 *   8–13  파이썬 문법 미리보기(worksheet 첫 카드, print·변수·for·if 를 코드로)
 *   13–23 파이썬 타자 게임(typing_game) — 정확+속도 0~100
 *   23–35 진단평가 10문항(diagnostic) — 자동 채점 0~100
 *   35–38 성찰
 *   38–40 도우미 발표(대시보드) → 다음 시간(마이크로비트) 예고 → 정리
 *
 * 대상 1~4반 중1. 각 반 30번은 테스트 학생(리허설). 숙제/집에 내주는 것 없음.
 *
 * ## 저장·리더보드 (구현)
 *
 *   · 타자·진단은 worksheet-view 에 배선된 컴포넌트(typing_game·diagnostic). 각자 **최고점
 *     한 줄**만 answers 에 저장한다(helper_typing·helper_diag). 무엇을 쳤는지·문항별 답은
 *     저장하지 않는다.
 *   · 대시보드 route 가 이 차시에서만 작품을 한 번 읽어(hai 링크 판정과 같은 방식) 점수를
 *     모으고, 종합점수로 순위·top7 을 계산해 리더보드로 보낸다. 확정 저장은 교사가 누른다.
 *
 * ## 열어 둔 선택 (첫 초안 — 선생님이 보고 확정)
 *
 *   · **진단 10문항은 초안이다.** 문법·컴퓨팅 사고 난이도·문구를 선생님이 고칠 것.
 *   · 타자 점수 공식(정확 0.6 + 속도 0.4, 만점 기준 150 CPM)은 반 수준에 맞춰 조정 가능.
 *   · **모둠 구성**(도우미 1명 + 몇 명)은 이 차시 범위 밖 — 이후 차시에서 helpers 명단을
 *     읽어 짠다. 여기서는 top7 선발·저장까지만 한다.
 *   · **도우미 명단 수정**(결석·판단 보정)은 후속. 지금은 자동 top7 확정/덮어쓰기까지.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import type {
  DiagnosticItem,
  LessonPlan,
  PhaseContent,
  WorksheetQuestion,
} from "../src/lib/types.ts";

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
const LESSON_NO = 12;

/** 9~11차시와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/**
 * **새 활동 통.** 도우미 선발 세션 전용 — 마이크로비트·햄스터가 쓰는
 * physical-computing 통과 섞지 않는다(점수만 담는 통이라 분리한다).
 */
const ACTIVITY_ID = "helper-selection";

/** 리더보드가 읽는 점수 키. 대시보드 route 는 kind 로 문항을 찾아 이 키의 값을 읽는다 */
const TYPING_KEY = "helper_typing";
const DIAG_KEY = "helper_diag";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/* ──────────────────────────────────────────────────────────────
 * 파이썬 문법 미리보기 코드 — code 필드로 준다(들여쓰기 보존).
 * ────────────────────────────────────────────────────────────── */
const GRAMMAR_CODE = `# print — 화면에 글자 보여주기
print("안녕하세요")

# 변수 = 값을 담는 상자
name = "지민"
age = 14
print(name)

# for — 여러 번 반복하기
for i in range(3):
    print(i)      # 0, 1, 2 가 차례로

# if — 조건에 따라 다르게
if age > 10:
    print("열 살보다 크다")`;

/* ──────────────────────────────────────────────────────────────
 * 파이썬 타자 게임 프롬프트 — 키워드에서 짧은 코드 줄로.
 * ────────────────────────────────────────────────────────────── */
const TYPING_PROMPTS = [
  "print",
  "for",
  "if",
  "range(5)",
  'print("Hello")',
  "name = 10",
  "for i in range(3):",
  "if x > 5:",
  "total = a + b",
  "print(name)",
];

/* ──────────────────────────────────────────────────────────────
 * 진단 10문항 (초안 — 선생님이 고칠 것). 문법 + 컴퓨팅 사고.
 * 출력 예측 / 오류 찾기 / 줄 순서(보기로) / 빈칸 채우기 혼합. 모두 자동 채점.
 * ────────────────────────────────────────────────────────────── */
const DIAGNOSTIC: DiagnosticItem[] = [
  {
    type: "mc",
    prompt: "이 코드를 실행하면 화면에 무엇이 나올까요?",
    code: 'print("안녕")',
    choices: ["안녕", '"안녕"', "print(안녕)", "아무것도 안 나온다"],
    answerIndex: 0,
    explain: "print 는 따옴표 안의 글자를 그대로 보여줘요. 따옴표는 화면에 안 나옵니다.",
  },
  {
    type: "mc",
    prompt: "출력 결과는?",
    code: "x = 3\ny = 4\nprint(x + y)",
    choices: ["7", "34", "x + y", "12"],
    answerIndex: 0,
    explain: "x 와 y 는 숫자라서 + 는 더하기. 3 + 4 = 7.",
  },
  {
    type: "mc",
    prompt: "출력 결과는?",
    code: 'print("2" + "3")',
    choices: ["5", "23", "2 + 3", "오류가 난다"],
    answerIndex: 1,
    explain: "따옴표가 있으면 글자예요. 글자끼리 + 는 이어 붙이기라 23 이 됩니다.",
  },
  {
    type: "mc",
    prompt: "다음 중 오류가 나는(실행되지 않는) 줄은?",
    choices: ['print("Hi")', "print(Hi)", "x = 5", "print(x)"],
    answerIndex: 1,
    explain: "Hi 에 따옴표가 없으면 파이썬은 변수로 찾으려다 못 찾아 오류가 나요.",
  },
  {
    type: "mc",
    prompt: "출력 결과는?",
    code: "for i in range(3):\n    print(i)",
    choices: ["0 1 2 (세 줄)", "1 2 3", "0 1 2 3", "3"],
    answerIndex: 0,
    explain: "range(3) 은 0, 1, 2. 세 번 반복하며 한 줄씩 출력해요.",
  },
  {
    type: "mc",
    prompt: "출력 결과는?",
    code: 'x = 5\nif x > 3:\n    print("크다")\nelse:\n    print("작다")',
    choices: ["크다", "작다", "오류가 난다", "아무것도 안 나온다"],
    answerIndex: 0,
    explain: "x 는 5 이고 5 > 3 은 참이라 if 쪽인 '크다' 가 출력돼요.",
  },
  {
    type: "fill",
    prompt: "0부터 4까지 다섯 번 반복하려고 해요. 빈칸(______)에 들어갈 것을 쓰세요.",
    code: "for i in ______:\n    print(i)",
    answer: "range(5)",
    explain: "range(5) 는 0, 1, 2, 3, 4 — 다섯 번 반복합니다.",
  },
  {
    type: "mc",
    prompt: "name 에 \"김\" 을 담고 화면에 보여주려 합니다. 알맞은 순서는?",
    choices: ['name = "김"  →  print(name)', 'print(name)  →  name = "김"'],
    answerIndex: 0,
    explain: "변수에 값을 먼저 담아야 출력할 수 있어요. 순서가 중요합니다.",
  },
  {
    type: "mc",
    prompt: "출력 결과는?",
    code: 'friends = ["가", "나", "다"]\nprint(len(friends))',
    choices: ["3", "2", "가나다", "오류가 난다"],
    answerIndex: 0,
    explain: "len 은 개수를 세요. 목록에 3개가 들어 있으니 3.",
  },
  {
    type: "mc",
    prompt: "for 문 바로 아래, 반복할 줄은 어떻게 써야 할까요?",
    code: "for i in range(3):\n???  print(i)",
    choices: [
      "앞에 띄어쓰기(들여쓰기)를 넣는다",
      "맨 앞에 붙여 쓴다",
      "줄 끝에 세미콜론(;)을 붙인다",
      "대문자로 쓴다",
    ],
    answerIndex: 0,
    explain: "파이썬은 들여쓰기로 '이 줄이 for 에 속한다' 를 나타내요.",
  },
];

const WORKSHEET: WorksheetQuestion[] = [
  /* ── 파이썬 문법 미리보기 (읽기용 코드 카드) ── */
  {
    key: "_g12_grammar",
    phase: "worksheet",
    label: "파이썬 아주 조금 — 오늘 진단에 나올 것만",
    hint:
      "아래 코드를 눈으로 읽어 보세요. 오늘 진단·타자에 나오는 건 이 네 가지예요:\n" +
      "· print(보여주기) · 변수(값 담기) · for(반복) · if(조건).\n" +
      "다 이해 못 해도 괜찮아요 — 모양만 익혀 두면 됩니다.",
    kind: "note",
    code: GRAMMAR_CODE,
    maxLength: 0,
  },

  /* ── 파이썬 타자 게임 (점수 30%) ── */
  {
    key: TYPING_KEY,
    phase: "worksheet",
    label: "① 파이썬 타자 — 정확하게, 빠르게",
    hint:
      "뜨는 파이썬 낱말·코드를 똑같이 입력해요. 대문자·기호·괄호까지 정확히!\n" +
      "정확도와 속도로 점수가 나오고, 여러 번 도전해 최고점을 올릴 수 있어요.\n" +
      "이 점수는 도우미 순위의 30%에 들어갑니다.",
    kind: "typing_game",
    typingPrompts: TYPING_PROMPTS,
    maxLength: 0,
  },

  /* ── 진단평가 10문항 (점수 70%) ── */
  {
    key: DIAG_KEY,
    phase: "worksheet",
    label: "② 진단 — 10문항",
    hint:
      "코드를 읽고 답을 고르거나 빈칸을 채우세요. 다 풀면 「채점하기」로 점수가 바로 나와요.\n" +
      "틀려도 괜찮아요. 이 점수는 도우미 순위의 70%에 들어갑니다.",
    kind: "diagnostic",
    diagnosticItems: DIAGNOSTIC,
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "프로그래밍 시작 · 도우미 선발",
  moodCheckEnabled: true,

  game: {
    heading: "기다리는 동안 — 한붓그리기",
    body:
      "수업이 시작되길 기다리는 동안 잠깐 쉬어요.\n" +
      "선을 한 번도 떼지 않고, 같은 길을 두 번 지나지 않게 모든 선을 그려 보세요.\n" +
      "점과 점을 이으면 됩니다. 막히면 다시 시작할 수 있어요.\n수업이 시작되면 닫습니다.",
    url: "https://euler-path-game.vercel.app/",
  },
  gameExplainer: empty(),

  /*
   * 다음 시간(progress) — 교사가 수업 끝에 눌러 보여준다. 마이크로비트 예고 + 도우미 안내.
   */
  progress: {
    heading: "다음 시간 — 마이크로비트로 코딩",
    body: "",
    url: "",
    tabs: [
      {
        label: "다음 시간에 할 일",
        subtitle: "이제 진짜 코드를 써서 작은 컴퓨터를 움직여요",
        note:
          "다음 시간부터는 마이크로비트에 파이썬 코드를 넣어 직접 움직여 봅니다.\n" +
          "오늘 뽑힌 도우미들이 모둠에서 친구를 돕게 됩니다.",
        rows: [
          { label: "오늘", value: "도우미 선발 (타자 + 진단)" },
          { label: "다음", value: "마이크로비트 파이썬 첫걸음 — 코드 고쳐 쓰기" },
          { label: "도우미", value: "뽑힌 7명은 모둠에서 친구를 돕습니다" },
        ],
        highlights: [
          "도우미가 아니어도 괜찮아요 — 이 단원은 서로 도우며 다 같이 해냅니다.",
        ],
      },
    ],
  },

  /*
   * 오늘 할 일 보드 — 도우미 선발 안내 + 파이썬 미니 문법(읽기용). 활동 중 되돌아와 본다.
   */
  assessment: {
    heading: "오늘 할 일 — 프로그래밍 시작 · 도우미 선발",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘은 이런 날",
        subtitle: "프로그래밍을 시작하고, 도우미를 뽑습니다",
        note:
          "이번 단원은 서로 도우며 코딩을 배워요. 그래서 오늘은 파이썬을 조금 해 보고,\n" +
          "타자와 진단으로 **모둠 도우미 7명**을 뽑습니다.",
        rows: [
          { label: "무엇을", value: "파이썬 타자 게임 + 진단 10문항" },
          { label: "순위는", value: "종합점수 = 진단 70% + 타자 30%" },
          { label: "도우미", value: "상위 7명 — 이후 시간에 모둠에서 친구를 돕습니다" },
          { label: "공개", value: "순위는 반 전체가 함께 봅니다 (실시간)" },
        ],
        highlights: [
          "도우미가 되면 좋지만, 못 돼도 괜찮아요 — 이 단원은 다 같이 해내는 것이 목표예요.",
          "타자·진단은 여러 번 도전해 최고점을 올릴 수 있어요.",
        ],
      },
      {
        label: "파이썬 아주 조금",
        subtitle: "진단에 나오는 네 가지",
        note: "설명은 앞 화면으로 같이 봅니다. 이 탭은 활동 중에 되돌아와 볼 수 있어요.",
        rows: [
          { label: "print", value: "화면에 글자를 보여준다 — print(\"안녕\")" },
          { label: "변수", value: "값을 담는 상자 — name = \"지민\"" },
          { label: "for", value: "여러 번 반복한다 — for i in range(3):" },
          { label: "if", value: "조건에 따라 다르게 한다 — if x > 3:" },
        ],
        highlights: [
          "따옴표가 있으면 글자, 없으면 숫자나 변수예요.",
          "for·if 아래 줄은 앞에 띄어쓰기(들여쓰기)를 넣어요.",
        ],
      },
      {
        label: "오늘 순서",
        subtitle: "문법 훑기 → 타자 → 진단 → 리더보드",
        note: "",
        rows: [
          { label: "1", value: "파이썬 문법 미리보기(읽기)" },
          { label: "2", value: "파이썬 타자 게임 (점수 30%)" },
          { label: "3", value: "진단 10문항 (점수 70%)" },
          { label: "4", value: "리더보드로 도우미 발표" },
        ],
        highlights: [
          "타자와 진단을 다 하면 화면 앞 리더보드에 내 순위가 실시간으로 올라가요.",
        ],
      },
    ],
  },

  video: empty(),

  /*
   * 성찰 한 문항 — 오늘 처음 파이썬을 해 본 소감·다짐. 개인적이라 비공개.
   */
  reflectionQuestions: [
    "오늘 파이썬을 처음 해 봤어요. 어땠는지, 또는 앞으로 도우미가 된다면(또는 도움을 " +
      "받는다면) 어떻게 하고 싶은지 한 가지 적어 봅시다.",
  ],
  reflectionPublic: false,

  // 이 차시는 바깥 창으로 나가는 활동이 없다 — 이탈 제외 단계를 두지 않는다
  focusExempt: [],
  phaseLabels: {
    assessment: "오늘 할 일",
    worksheet: "타자와 진단",
    progress: "다음 시간",
  },
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "도우미 선발 — 파이썬 타자와 진단",
      body:
        "위에서부터 순서대로 해요. 문법을 한 번 훑고, 타자 게임을 한 뒤, 진단 10문항을 풉니다.\n" +
        "두 점수로 순위가 정해져요. 여러 번 도전해 최고점을 올릴 수 있어요.",
    },
    worksheet: WORKSHEET,
    /*
     * 서로 구경하기는 **막는다.** 점수·순위는 교사 대시보드 리더보드로 공개하지, 서로의
     * 활동지를 여는 방식이 아니다.
     */
    galleryEnabled: false,
    sourcesEnabled: false,
  },
};

async function main(): Promise<void> {
  const existing = await db.collection(LESSON_PLANS).where("lessonNo", "==", LESSON_NO).get();
  const now = Date.now();

  if (!existing.empty) {
    const doc = existing.docs[0];
    await doc.ref.set({ ...PLAN, updatedAt: now }, { merge: true });
    console.log(`↻ 갱신 — ${PLAN.title} (${doc.id})`);

    /* 9~11차시와 같은 규칙 — 아직 아무도 안 들어온 수업에만 반영한다 */
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
          progress: PLAN.progress,
          assessment: PLAN.assessment,
          reflectionQuestions: PLAN.reflectionQuestions,
          reflectionPublic: PLAN.reflectionPublic,
          focusExempt: PLAN.focusExempt,
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (도우미 선발 전용 통 — 마이크로비트 physical-computing 과 분리)`);
  console.log("단계: 대기 → 기분 → 오늘 할 일(assessment) → 타자와 진단(worksheet) → 성찰 → 다음 시간 → 마침");
  console.log(`점수 키: 타자=${TYPING_KEY}(30%) · 진단=${DIAG_KEY}(70%). 대시보드가 kind 로 문항을 찾아 읽음.`);
  console.log("리더보드·top7·확정 저장은 교사 대시보드(도우미 선발 섹션). 확정 시 helpers/{반번호} 문서에 저장.");
  console.log("진단 10문항·타자 공식은 초안 — 선생님이 대시보드로 확인하고 조정.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
