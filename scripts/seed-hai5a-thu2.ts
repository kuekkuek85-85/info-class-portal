/**
 * 「인간과 인공지능」 5차시 변형 · 목요일 2기 - 선생님 피드백 보고 고치기.
 *
 *   node --env-file=.env.local scripts/seed-hai5a-thu2.ts
 *   node --env-file=.env.local scripts/seed-hai5a-thu2.ts 2026-11-26__1__hai-thu-2
 *
 * 교사 지시(11/26): 목2기 오늘 수업은 선생님 피드백을 보고 고치는 데만 쓴다. 동료 검토는 다음 주.
 *
 * 하는 일 두 가지
 *  1. 분반 변형 계획 `hai105a-thu-2` 를 심는다 (문서 ID 고정, 다시 돌려도 덮어쓰기).
 *     lessonNo 는 105.1 이다. 105 로 두면 `where(lessonNo == 105).docs[0]` 로 계획을 고르는
 *     스크립트가 이 문서를 집을 수 있다 (화2기 보충 hai105b-tue-2 = 105.5 와 같은 이유).
 *  2. 이미 열어 둔 세션의 스냅샷을 이 계획으로 바꾼다. 코드·상태·되돌아가기는 그대로 둔다.
 *     아직 시작 전(scheduled)이고 접속자가 없을 때만 시작 단계를 'mood' 로 맞춘다
 *     (이 계획의 단계 순서에 대기 단계가 없다 = 대기는 마음 체크인만).
 *
 * 105 의 활동 통(hai-2026-1기)과 교사 피드백 부분·답 키(_r5_teacher, fix_teacher, build_url)를
 * 그대로 써서, 지난 답과 선생님 피드백이 이어서 보이고 다음 주 동료 검토 차시와도 이어진다.
 * 캔바 초대 주소는 .env.local 의 CANVA_INVITE_THU_2 에서만 읽는다(저장소에 토큰 없음).
 *
 * 흐름: 마음 체크인 → 선생님 피드백 확인 → 캔바에서 고치기 → 회고
 *
 * ## 다음 주(12/3 목) 목2기 계획 메모 - 세션은 아직 열지 않는다
 *
 * 화2기 11/24 보충(seed-hai5b-tue2.ts, 계획 hai105b-tue-2)과 같은 구조로 간다.
 *   마음 체크인 → 동료 피드백 기준 → 동료 피드백 하기 → 받은 피드백 확인 → 캔바에서 고치기 → 회고
 * 만들 때는 seed-hai5b-tue2.ts 를 복제해 바꾼다: 계획 ID(hai105b-thu-2 등, lessonNo 105.x),
 * groups(hai-thu-2 · 목요일 2기 · classNo 4), 캔바 초대(CANVA_INVITE_THU_2), 세션 ID(12/3).
 * 동료 검토 배정은 그 세션 ID 로 섞이고, 대상은 classNo 4 에서 답이 있는 앱 전체다.
 * 세션은 open-hai*-thu2 꼴 스크립트로 열고 코드 예약을 함께 한다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

const PLAN_ID = "hai105a-thu-2";
const GROUP_KEY = "hai-thu-2";
const SESSION_ID = process.argv[2] ?? "2026-11-26__1__hai-thu-2";
const CANVA_THU_2 = requiredEnv("CANVA_INVITE_THU_2");

const TITLE = "인간과 인공지능 - 선생님 피드백 보고 고치기";

const worksheet = [
  // ---------------------------------------------------------------- 선생님 피드백 확인 (build)
  {
    key: "_l5a_login",
    phase: "build",
    label: "① 캔바에 먼저 들어가 두세요",
    hint:
      "[캔바 열기] → [Microsoft로 계속하기] → 아래 학교 계정을 [복사하기] 로 붙여 넣어요.\n" +
      "비밀번호는 학교 계정 비밀번호예요. 지난 시간에 만든 앱은 캔바에 그대로 있어요.\n" +
      "30초 기다려도 화면이 안 넘어가면 손을 드세요.",
    kind: "note",
    copyText: "{학교계정}",
    linkUrl: CANVA_THU_2,
    linkLabel: "캔바 열기 (새 창)",
    maxLength: 0,
  },
  {
    key: "_l5a_recap",
    phase: "build",
    label: "지난 시간에 여기까지 했어요",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "mvp_one", label: "내가 만든 앱" },
      { key: "build_url", label: "내 앱 링크" },
      { key: "fix_plan", label: "고치려고 정한 것" },
      { key: "fix4", label: "지난 시간에 고친 것" },
    ],
    maxLength: 0,
  },
  {
    key: "_l5_teacher_intro",
    phase: "build",
    label: "② 선생님이 남긴 말 읽기",
    hint:
      "아래에 선생님이 내 앱을 보고 남긴 말이 있어요.\n" +
      "읽어 보고, 오늘 고칠 것 하나를 골라 두세요.\n" +
      "무슨 뜻인지 모르겠으면 손을 들고 물어봐요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_r5_teacher",
    phase: "build",
    label: "선생님이 남긴 말",
    hint: "",
    kind: "teacher_note",
    maxLength: 0,
  },
  // ---------------------------------------------------------------- 캔바에서 고치기 (emotion)
  {
    key: "_l5a_fix_guide",
    phase: "emotion",
    label: "③ 캔바에서 앱 고치기",
    hint:
      "골라 둔 선생님 말 하나를 캔바 AI 에게 그대로 부탁해 보세요.\n" +
      "예) 첫 화면에 앱 이름과 한 줄 설명을 넣어 줘\n" +
      "AI 가 대화가 너무 길다고 하면, 코드를 복사해 새 대화에 붙이고 이어 가요.",
    kind: "note",
    copyText: "지금 이 코드를 이어서 고쳐 줘. 바꾸고 싶은 점: ",
    maxLength: 0,
  },
  {
    key: "fix_teacher",
    phase: "emotion",
    label: "④ 선생님 피드백 중 반영한 것",
    hint:
      "선생님 말을 보고 실제로 고친 것을 한 줄 적어요. 다 못 고쳤으면 어디까지 했는지 적어도 돼요.\n" +
      "예) 첫 화면에 무슨 앱인지 안 보인다고 하셔서, 맨 위에 제목을 넣었어요",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "build_url",
    phase: "emotion",
    label: "내 앱 링크 - 주소가 바뀌었을 때만 고치세요",
    hint:
      "지난 시간에 낸 주소가 들어 있어요. 바뀌지 않았으면 그대로 두세요.\n" +
      "게시가 막혀 링크가 안 나오면 비워 두고, 선생님께 화면을 보여 주세요.",
    kind: "text",
    maxLength: 300,
  },
];

const plan = {
  lessonNo: 105.1,
  title: TITLE,
  groups: [{ key: GROUP_KEY, label: "목요일 2기", classNo: 4 }],
  moodCheckEnabled: true,
  // 대기 = 마음 체크인만 (대기 게임 없음)
  game: { heading: "", body: "", url: "" },
  gameExplainer: { heading: "", body: "", url: "" },
  progress: { heading: "", body: "", url: "" },
  assessment: { heading: "", body: "", url: "" },
  video: { heading: "", body: "", url: "" },
  reflectionQuestions: [
    "오늘 선생님 피드백을 보고 내 앱에서 무엇을 고쳤나요?\n" +
      "고치고 나니 앱이 어떻게 달라졌는지도 한 줄 적어 보세요.\n" +
      "예) 글씨가 작다고 하셔서 크게 키웠더니, 화면이 훨씬 잘 보여요.",
  ],
  reflectionPublic: false,
  // 인간과 인공지능은 되돌아가기 켬 (11/24 교사 확정)
  freeNavigation: true,
  phaseOrder: ["mood", "build", "emotion", "reflection", "done"],
  phaseLabels: {
    build: "선생님 피드백 확인",
    emotion: "캔바에서 고치기",
    reflection: "회고",
  },
  focusExempt: ["build", "emotion", "worksheet"],
  activity: {
    activityId: "hai-2026-1기",
    places: [],
    year: 2026,
    sourcesEnabled: false,
    // 동료 검토는 다음 주. 오늘은 친구 앱을 열지 않는다
    galleryEnabled: false,
    galleryNoun: "앱",
    worksheetTabLabel: "앱 수정",
    worksheet,
  },
};

async function main(): Promise<void> {
  const now = Date.now();
  const ref = db.collection("lessonPlans").doc(PLAN_ID);
  const before = await ref.get();
  await ref.set({ ...plan, createdAt: before.exists ? before.data()?.createdAt ?? now : now, updatedAt: now });
  console.log(`✓ 계획 ${PLAN_ID} (${plan.lessonNo}) ${TITLE}`);

  const sref = db.collection("classSessions").doc(SESSION_ID);
  const snap = await sref.get();
  if (!snap.exists) {
    console.log(`세션 ${SESSION_ID} 없음 - 계획만 심었습니다.`);
    process.exit(0);
  }
  const s = snap.data() as Record<string, unknown>;
  const att = (await db.collection("attendance").where("sessionId", "==", SESSION_ID).count().get()).data().count;
  // 시작 전이고 아무도 안 들어왔을 때만 시작 단계를 바꾼다. 그 밖에는 교사 단계를 그대로 둔다
  const resetPhase = s.status === "scheduled" && att === 0 && s.phase === "waiting";

  // 스냅샷 필드만 바꾼다. code·status·startedAt·freeNavigation·teacherNote 는 건드리지 않는다
  await sref.update({
    lessonPlanId: PLAN_ID,
    lessonNo: 105,
    title: TITLE,
    activity: plan.activity,
    moodCheckEnabled: plan.moodCheckEnabled,
    game: plan.game,
    gameExplainer: plan.gameExplainer,
    progress: plan.progress,
    assessment: plan.assessment,
    video: plan.video,
    reflectionQuestions: plan.reflectionQuestions,
    reflectionPublic: plan.reflectionPublic,
    phaseOrder: plan.phaseOrder,
    phaseLabels: plan.phaseLabels,
    focusExempt: plan.focusExempt,
    ...(resetPhase ? { phase: "mood" } : {}),
  });

  const back = (await sref.get()).data() as Record<string, unknown>;
  const dumped = JSON.stringify(back.activity);
  const others = ["CANVA_INVITE_URL", "CANVA_INVITE_TUE_1", "CANVA_INVITE_TUE_2", "CANVA_INVITE_THU_1"]
    .map((k) => (process.env[k] ?? "").match(/token=([^&]+)/)?.[1] ?? "")
    .filter(Boolean);
  console.log(`✓ 세션 ${SESSION_ID} 스냅샷 교체 (출석 ${att}명이었음)`);
  console.log(`  코드 ${back.code} · 상태 ${back.status} · 단계 ${back.phase} · 되돌아가기 ${back.freeNavigation ? "켬" : "끔"}`);
  console.log(`  단계 순서 ${(back.phaseOrder as string[]).join(" → ")}`);
  console.log(`  캔바 초대 = 목2기  ${dumped.includes(CANVA_THU_2) ? "예" : "아니오 <- 문제"}`);
  console.log(`  남의 토큰 실림  ${others.some((t) => dumped.includes(t)) || dumped.includes("linkUrlByGroup") ? "예 <- 문제" : "아니오"}`);
  console.log(`  상태 유지  ${back.status === s.status ? "예" : "아니오 <- 문제"}`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
