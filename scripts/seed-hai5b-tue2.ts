/**
 * 「인간과 인공지능」 5차시 보충 · 화요일 2기 - 동료 피드백 반영 수정.
 *
 *   node --env-file=.env.local scripts/seed-hai5b-tue2.ts
 *
 * 화2기는 11/17 5차시(105)에서 친구 앱 검토까지만 하고 '받은 피드백 보고 고치기'(fix5)를
 * 한 명도 못 했다. 교사 지시로 11/24 수업을 이 보충으로 바꾸고, 발표 준비(106)는 다음 시간으로 미룬다.
 *
 * 하는 일 두 가지
 *  1. 분반 변형 계획 `hai105b-tue-2` 를 심는다 (문서 ID 고정, 다시 돌려도 덮어쓰기).
 *     lessonNo 는 105.5 다. 105 로 두면 `where(lessonNo == 105).docs[0]` 로 계획을 고르는
 *     open-hai5-* 스크립트(목요일 2기가 아직 105 전이다)가 이 문서를 집을 수 있다.
 *  2. 이미 열어 둔 11/24 세션(2026-11-24__1__hai-tue-2)의 스냅샷을 이 계획으로 바꾼다.
 *     코드·상태·단계·되돌아가기 값은 그대로 둔다. 세션이 이미 시작됐으면(active/ended)
 *     또는 출석이 있으면 스냅샷 필드만 바꾸고 status·phase 는 절대 건드리지 않는다.
 *
 * 105 의 활동 통(hai-2026-1기)과 답 키(fix_teacher, fix5, build_url), 동료 검토 설정을 그대로 써서
 * 지난 시간에 쓴 답·검토 의견과 받은 피드백(AI·선생님·친구)이 이어서 보인다.
 * 흐름: 마음 체크인 → 동료 피드백 기준 → 동료 피드백 하기 → 받은 피드백 확인 → 캔바에서 고치기 → 회고
 * (교사 지시로 '캔바에서 고치기' 와 '고친 것 기록' 을 한 단계(emotion)로 합쳤다. emotion 을 남긴 것은
 *  lesson/page 의 finalWorkPhase 가 LESSON_PHASES 순서상 마지막 활동 단계를 고르기 때문이다.)
 * 캔바 초대 주소는 .env.local 의 CANVA_INVITE_TUE_2 에서만 읽는다(저장소에 토큰 없음).
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

const PLAN_ID = "hai105b-tue-2";
const GROUP_KEY = "hai-tue-2";
const SESSION_ID = process.argv[2] ?? "2026-11-24__1__hai-tue-2";
const CANVA_TUE_2 = requiredEnv("CANVA_INVITE_TUE_2");

const TITLE = "인간과 인공지능 - 동료 피드백 반영 수정";

const worksheet = [
  // ---------------------------------------------------------------- 동료 피드백 기준 (grill)
  {
    key: "_l5b_login",
    phase: "grill",
    label: "① 캔바에 먼저 들어가 두세요",
    hint:
      "[캔바 열기] → [Microsoft로 계속하기] → 아래 학교 계정을 [복사하기] 로 붙여 넣어요.\n" +
      "비밀번호는 학교 계정 비밀번호예요. 지난 시간에 만든 앱은 캔바에 그대로 있어요.\n" +
      "30초 기다려도 화면이 안 넘어가면 손을 드세요.",
    kind: "note",
    copyText: "{학교계정}",
    linkUrl: CANVA_TUE_2,
    linkLabel: "캔바 열기 (새 창)",
    maxLength: 0,
  },
  {
    // 105 의 _l5_review_criteria 를 3줄로 줄여 다시 쓴다
    key: "_l5_review_criteria",
    phase: "grill",
    label: "② 친구 앱 검토 - 이렇게 봐 주세요",
    hint:
      "다음 단계 [앱 검토] 탭에 선생님이 정한 친구 3명의 앱이 떠요. 먼저 눌러 써 보세요.\n" +
      "카드 밑에 좋은 점 한 가지, 개선하면 좋을 점 한 가지를 구체적으로 남겨요.\n" +
      "지난주에 이미 썼어도 오늘 뜬 친구 앱을 봐 주세요. 한 명이라도 제대로 보면 돼요.",
    kind: "note",
    maxLength: 0,
  },
  // ---------------------------------------------------------------- 동료 피드백 하기 (gallery)
  //   활동지 문항 없이 [앱 검토] 탭만 쓴다 (105 와 같다)
  // ---------------------------------------------------------------- 받은 피드백 확인 (build)
  {
    key: "_l5b_recap",
    phase: "build",
    label: "지난 시간에 여기까지 했어요",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "mvp_one", label: "내가 만든 앱" },
      { key: "build_url", label: "내 앱 링크" },
      { key: "fix_teacher", label: "선생님 피드백으로 고친 것" },
    ],
    maxLength: 0,
  },
  {
    key: "_l5b_received_intro",
    phase: "build",
    label: "③ 받은 피드백 읽기",
    hint:
      "아래 표에 AI·선생님·친구가 내 앱에 남긴 말이 모여 있어요.\n" +
      "읽어 보고, 납득되는 것 하나를 골라 두세요. 전부 따를 필요는 없어요.\n" +
      "친구 이름은 나오지 않아요. 아직 받은 게 없으면 선생님 말부터 보세요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_l5b_received",
    phase: "build",
    label: "내가 받은 피드백 - 🤖 AI · 🧑‍🏫 선생님 · 🧑‍🤝‍🧑 친구",
    hint: "",
    kind: "received_feedback",
    maxLength: 0,
  },
  {
    /*
     * AI 질문을 아직 한 번도 안 받은 학생이 많다(화2기 22명 중 12명). 104 와 같은 열쇠
     * "ai_review" 라 이미 받은 학생은 그 질문이 그대로 뜨고, 없는 학생은 여기서 받는다.
     * 받으면 위 표의 AI 칸에도 들어간다. 이름·학번은 안 보낸다 - 자유 서술 답만 간다.
     */
    key: "ai_review",
    phase: "build",
    label: "AI 질문이 아직 없으면 여기서 받아 보세요",
    hint:
      "버튼을 누르면 AI가 내 앱 설명을 보고 질문 세 개를 해 줘요. 점수는 없어요.\n" +
      "보내는 것은 내가 쓴 글뿐이에요. 이름과 학번은 보내지 않습니다.",
    kind: "ai_review",
    maxLength: 0,
    reviewCount: 3,
    reviewFields: [
      { key: "mvp_one", label: "만들려던 것" },
      { key: "mvp_must1", label: "꼭 필요한 기능 ①" },
      { key: "mvp_must2", label: "꼭 필요한 기능 ②" },
      { key: "mvp_must3", label: "꼭 필요한 기능 ③" },
      { key: "fix_teacher", label: "선생님 피드백으로 고친 것" },
    ],
  },
  // ---------------------------------------------------------------- 캔바에서 고치기 (emotion)
  {
    key: "_l5b_fix_guide",
    phase: "emotion",
    label: "④ 캔바에서 앱 고치기",
    hint:
      "골라 둔 피드백 하나를 캔바 AI 에게 그대로 부탁해 보세요.\n" +
      "예) 첫 화면에 앱 이름과 한 줄 설명을 넣어 줘\n" +
      "AI 가 대화가 너무 길다고 하면, 코드를 복사해 새 대화에 붙이고 이어 가요.",
    kind: "note",
    copyText: "지금 이 코드를 이어서 고쳐 줘. 바꾸고 싶은 점: ",
    maxLength: 0,
  },
  // 「선생님 피드백 중 반영한 것」(fix_teacher) 입력칸은 교사 지시(11/24)로 뺐다. 지난주 답은
  // 데이터에 그대로 있고, 위 '지난 시간에 여기까지 했어요' 와 AI 질문 재료로만 읽는다.
  {
    key: "fix5",
    phase: "emotion",
    label: "⑤ 받은 피드백을 보고 고친 것 한 가지",
    hint:
      "친구·AI 피드백 중 제일 납득된 것 하나를 고치고 적어요.\n" +
      "예) 무슨 앱인지 모르겠다는 말을 듣고, 첫 화면에 한 줄 설명을 넣었어요\n" +
      "고치지 않기로 했다면 그 까닭을 적어도 좋아요.",
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
  lessonNo: 105.5,
  title: TITLE,
  groups: [{ key: GROUP_KEY, label: "화요일 2기", classNo: 2 }],
  moodCheckEnabled: true,
  // 대기 = 마음 체크인만 (대기 게임 없음)
  game: { heading: "", body: "", url: "" },
  gameExplainer: { heading: "", body: "", url: "" },
  progress: { heading: "", body: "", url: "" },
  assessment: { heading: "", body: "", url: "" },
  video: { heading: "", body: "", url: "" },
  // 교사 지시(11/24): 내가 못 본 것을 다른 눈(AI·선생님·친구)이 찾아 준 경험을 돌아본다
  reflectionQuestions: [
    "친구·선생님·AI 피드백 중에서, 나는 몰랐는데 다른 사람이 찾아 준 것이 있었나요?\n" +
      "무엇이었고, 어떻게 고쳤는지(아직이면 어떻게 고칠지) 적어 보세요.\n" +
      "예) 버튼이 작아 누르기 어렵다는 걸 친구가 알려 줘서, 버튼을 크게 키웠어요.",
  ],
  reflectionPublic: false,
  // 교사 결정 대기 - 지난 화2기 세션들과 같은 값(켬)을 유지한다
  freeNavigation: true,
  phaseOrder: ["mood", "grill", "gallery", "build", "emotion", "reflection", "done"],
  phaseLabels: {
    grill: "동료 피드백 기준",
    gallery: "동료 피드백 하기",
    build: "받은 피드백 확인",
    emotion: "캔바에서 고치기",
    reflection: "회고",
  },
  focusExempt: ["grill", "gallery", "build", "emotion", "worksheet"],
  activity: {
    activityId: "hai-2026-1기",
    places: [],
    year: 2026,
    sourcesEnabled: false,
    worksheetTabLabel: "앱 수정",
    worksheet,
    /*
     * 동료 검토 설정은 105 세션과 같다. 배정은 assignPeers(random, 시드 = 세션 ID, 3편)라
     * 오늘 세션 ID 로 새로 섞인다 - 지난주 짝과는 대부분 다르다. 대상은 출석자가 아니라
     * 이 분반(classNo 2)에서 답이 있는 앱 전체다. 지난주 쓴 의견은 그대로 남아 받은 사람에게 보인다.
     */
    galleryEnabled: true,
    peerAssign: "random",
    peerCount: 3,
    galleryAssignedOnly: true,
    galleryNoun: "앱",
    galleryTabLabel: "앱 검토",
    galleryAnswerKeys: ["problem_who", "mvp_one", "mvp_must1", "mvp_must2", "mvp_must3", "build_url"],
    galleryAnswerLabels: {
      problem_who: "누구의 불편",
      mvp_one: "한 줄 소개",
      mvp_must1: "기능 ①",
      mvp_must2: "기능 ②",
      mvp_must3: "기능 ③",
    },
    feedbackPrompts: {
      found: { label: "좋은 점 한 가지 - 눌러 써 보고", placeholder: "예) 버튼을 누르니 진짜로 오늘 급식이 떠서 좋았어요" },
      question: { label: "개선하면 좋을 점 한 가지", placeholder: "예) 첫 화면에 무슨 앱인지 제목이 있으면 더 좋겠어요" },
    },
    reviewDescribe: {
      enabled: true,
      phases: ["grill", "gallery"],
      fields: [
        { key: "problem_who", label: "누구의 불편", maxLength: 120, multiline: true },
        { key: "mvp_one", label: "한 줄 소개", maxLength: 120, multiline: true },
        { key: "mvp_must1", label: "기능 ①", maxLength: 100 },
        { key: "mvp_must2", label: "기능 ②", maxLength: 100 },
        { key: "mvp_must3", label: "기능 ③", maxLength: 100 },
      ],
    },
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

  // 스냅샷 필드만 바꾼다. code·status·phase·startedAt·freeNavigation·teacherNote 는 건드리지 않는다
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
  });

  const back = (await sref.get()).data() as Record<string, unknown>;
  const dumped = JSON.stringify(back.activity);
  const others = ["CANVA_INVITE_URL", "CANVA_INVITE_TUE_1", "CANVA_INVITE_THU_1", "CANVA_INVITE_THU_2"]
    .map((k) => (process.env[k] ?? "").match(/token=([^&]+)/)?.[1] ?? "")
    .filter(Boolean);
  console.log(`✓ 세션 ${SESSION_ID} 스냅샷 교체 (출석 ${att}명이었음)`);
  console.log(`  코드 ${back.code} · 상태 ${back.status} · 단계 ${back.phase} · 되돌아가기 ${back.freeNavigation ? "켬" : "끔"}`);
  console.log(`  단계 순서 ${(back.phaseOrder as string[]).join(" → ")}`);
  console.log(`  캔바 초대 = 화2기  ${dumped.includes(CANVA_TUE_2) ? "예" : "아니오 <- 문제"}`);
  console.log(`  남의 토큰 실림  ${others.some((t) => dumped.includes(t)) || dumped.includes("linkUrlByGroup") ? "예 <- 문제" : "아니오"}`);
  console.log(`  원래 status 유지  ${back.status === s.status && back.phase === s.phase ? "예" : "아니오 <- 문제"}`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
