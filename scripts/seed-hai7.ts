/**
 * 「인간과 인공지능」(진로탐색 선택과목) 7차시 — 발표 파트 1.
 *
 *   node --env-file=.env.local scripts/seed-hai7.ts
 *
 * ## 이 차시가 하는 것 — 개인 앱 발표 (첫 절반)
 *
 * 6차시까지 각자 앱을 만들고, AI·선생님·친구 피드백을 반영해 발표 자료(슬라이드)와 대본을
 * 준비했다. 7차시는 그 앱을 **남 앞에서 발표**한다. 개인(1인) 프로젝트다.
 *
 * 한 반 22명 중 **이번 7차에 무작위 10~11명이 발표**하고, 나머지는 **8차시**에 발표한다
 * (8차는 따로 만든다 — 이 스크립트는 7차만). 40분 ÷ 약 10명 ≈ **1인 3분 발표 + 질의응답**.
 *
 * 진행 순서(교사 확정): ① 평가 기준 먼저 안내 → ② 발표(3분+Q&A) → ③ 동료평가 → ④ 교사평가.
 * 평가 기준은 6차(seed-hai6)에서 정한 동료평가·교사평가 기준을 그대로 재사용한다.
 *
 * ## 데이터가 어디에 저장되는가 (조사 결과)
 *
 *   · 동료평가 — 새 문항 peer_eval(kind: rows). 발표를 들으며 발표자마다 한 줄씩(발표자 번호
 *     · 점수 · 잘한 점 · 더 나아지려면). 답은 **평가한 학생 본인의 활동지 답**(artifact.answers
 *     ["peer_eval"])에 JSON 배열로 쌓인다. 발표자에게는 어디에도 안 나간다(서로 구경하기를
 *     끄고 galleryAnswerKeys 에도 안 넣는다) — 발표자 익명 노출 금지가 기본으로 지켜진다.
 *     교사만 대시보드·CSV 로 모아 본다.
 *   · 교사평가 — **교사 전용 화면 /teacher/eval** 에서 발표자별로 루브릭 점수(6차 기준
 *     5항목 × 0~3)와 코멘트를 매긴다. 저장은 teacherFeedback 이 아니라 **별도 컬렉션
 *     teacherEvals**(문서 ID = 활동ID__학번) — 학생이 닿는 어떤 라우트·컴포넌트도 이 값을
 *     읽지 않는다(teacherFeedback 을 절대 안 건드려 6차 '받은 피드백'·teacher-note-panel 로
 *     새지 않는다). 발표 때 학생이 교사 대시보드에서 발표를 진행하고 교사는 폰에서 이 화면으로
 *     평가한다 — 목록은 기본 접힘이라 발표자를 펼치기 전엔 점수가 안 보인다. 이 차시에
 *     teacher_note 문항을 두지 않아 학생 화면에는 교사평가가 나타나지 않는다(채점용).
 *   · 발표자 본인 자료 — 활동 ID 가 2~6차시와 같아(hai-2026-1기) 6차에 낸 발표 슬라이드 링크
 *     (slides_url)·앱 링크(build_url)·확정 소개(final_pitch)·대본(script)이 그대로 열린다.
 *     발표자가 자기 차례에 열어 보도록 echo 로 편다.
 *
 * ## 발표자 무작위 선정
 *
 * 포털에는 발표자 무작위 추첨 기능이 없다(서로 구경하기의 peerAssign random 은 작품 배정용).
 * 교사가 10~11명을 무작위로 뽑아(주사위·뽑기·번호표 등) 이름을 알려 준다. 안내 note 로만 돕는다.
 *
 * ## 대기·기분 — 6차 관례를 따른다
 *
 * 대기(waiting) 게임 단계를 흐름에서 빼고(game 비움 + phaseOrder 에서 제외 + 세션을 mood 로
 * 연다), 기분 체크만 하고 곧바로 발표 안내로 넘어간다. 발표 차시라 대기 게임은 방해가 된다.
 *
 * ## 세션은 열지 않는다
 *
 * 이 스크립트는 차시 계획(LessonPlan)만 짓는다. 학생 노출은 교사가 세션을 열 때다(open-hai7-*).
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

/** 저장소가 공개라 캔바 초대 주소는 .env.local 에서만 읽는다 (seed-hai6 와 같은 이유) */
const CANVA_INVITE_URL = process.env.CANVA_INVITE_URL ?? "";
const CANVA_BY_GROUP: Record<string, string> = {
  "hai-tue-1": process.env.CANVA_INVITE_TUE_1 ?? "",
  "hai-tue-2": process.env.CANVA_INVITE_TUE_2 ?? "",
  "hai-thu-1": process.env.CANVA_INVITE_THU_1 ?? "",
  "hai-thu-2": process.env.CANVA_INVITE_THU_2 ?? "",
};

/** ★ 2~6차시와 같은 값. 이 값이 같아야 6차에 낸 발표 자료·앱·대본이 오늘 화면에 열린다 */
const ACTIVITY_ID = "hai-2026-1기";
/** 차시 번호가 정보과와 겹치므로 100번대로 띄운다 (2차시 102 … 6차시 106) */
const LESSON_NO = 107;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const WORKSHEET: WorksheetQuestion[] = [
  /*
   * ── ① 평가 기준과 발표 진행 안내 (build 칸) ────────────────
   *
   * 교사 확정 순서대로, 발표 전에 평가 기준을 먼저 읽힌다(같은 기준으로 준비→발표→평가).
   * 로그인을 맨 위에 둔다 — 발표자가 자기 캔바 슬라이드를 열려면 로그인이 필요하다(병목 관례).
   */
  {
    key: "_l7_login",
    phase: "build",
    label: "① 캔바에 다시 들어가기 — 발표자는 먼저 눌러 두세요",
    hint:
      "아래 [캔바 열기] 를 누르고 [Microsoft로 계속하기] 를 고르세요.\n" +
      "내 학교 계정은 아래 칸에 있어요. [복사하기] 를 눌러 그대로 붙여 넣으면 됩니다.\n\n" +
      "발표할 때 6차에 만든 발표 슬라이드와 앱을 열어 보여 줍니다.\n" +
      "· 화면이 안 넘어간다 → 30초 기다려 보고, 그래도 그대로면 손을 드세요",
    kind: "note",
    copyText: "{학교계정}",
    linkUrl: CANVA_INVITE_URL,
    linkUrlByGroup: Object.fromEntries(Object.entries(CANVA_BY_GROUP).filter(([, url]) => url)),
    linkLabel: "캔바 열기 (새 창)",
    maxLength: 0,
  },
  {
    key: "_l7_today",
    phase: "build",
    label: "② 오늘 순서",
    hint:
      "오늘은 그동안 만든 앱을 발표해요. 이 발표는 나 혼자 만든 개인 프로젝트예요.\n" +
      "오늘(7차)은 무작위로 뽑힌 10~11명이 발표하고, 나머지는 다음 시간(8차)에 발표합니다.\n\n" +
      "1) 평가 기준 먼저 보기 (아래)\n" +
      "2) 발표 — 한 사람당 약 3분, 발표 뒤 짧게 질의응답\n" +
      "3) 동료평가 — 발표를 들으며 발표자마다 점수와 한마디를 남깁니다 ([동료평가] 탭)\n" +
      "4) 교사평가 — 선생님이 발표를 보며 평가합니다\n\n" +
      "발표 시간과 인원은 선생님이 조정할 수 있어요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_l7_run",
    phase: "build",
    label: "③ 발표는 이렇게 진행해요",
    hint:
      "· 오늘 발표할 10~11명은 선생님이 무작위로 뽑아 알려 줍니다.\n" +
      "· 뽑히면 앞으로 나와, 6차에 만든 발표 슬라이드를 띄우고 약 3분 동안 발표합니다.\n" +
      "· 발표가 끝나면 듣던 친구들이 궁금한 것을 한두 개 묻습니다 (질의응답).\n" +
      "· 오늘 발표 안 한 사람도 다음 시간(8차)에 발표하니, 오늘은 열심히 들어 주고 평가해요.\n" +
      "· 발표자는 아래 ‘내 발표 자료’ 에서 슬라이드·앱·대본을 열 수 있어요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_l7_peereval_criteria",
    phase: "build",
    /*
     * 동료평가 기준 — 6차(_l6_peereval)와 같은 문구. 발표 전에 무엇을 보고 평가할지 읽힌다.
     */
    label: "④ 평가 기준 (1) 친구 평가 (동료평가)",
    hint:
      "친구 발표를 들으며 아래 기준으로 봅니다. 점수는 3점 척도예요 — 잘함 3 / 보통 2 / 아쉬움 1.\n" +
      "(배점은 선생님이 조정할 수 있어요.)\n\n" +
      "· 내용 이해 — 문제와 해결 아이디어가 잘 이해됐나요?\n" +
      "· 아이디어·유용성 — 핵심 기능이 쓸모 있어 보였나요?\n" +
      "· 시연 — 실제 앱 화면을 보여 주었나요?\n" +
      "· 전달력 — 발표가 명확하고 잘 들렸나요?\n" +
      "· 건설적 피드백 — 잘한 점 한 가지 + 더 좋아지려면 한 가지를 남겨 주세요",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_l7_teachereval_criteria",
    phase: "build",
    /*
     * 교사평가 기준(루브릭) — 6차(_l6_teachereval)와 같은 문구. 학생이 어떻게 평가받는지 미리 안다.
     */
    label: "④ 평가 기준 (2) 선생님 평가 (루브릭)",
    hint:
      "선생님은 아래 기준(루브릭)으로 봅니다. 발표를 준비한 필수 요소와 같은 기준이에요.\n" +
      "(항목별 배점·척도는 선생님이 조정할 수 있어요.)\n\n" +
      "· 내용 충실성 — 문제·해결·핵심 기능·시연·개선점·소감을 담았는가\n" +
      "· 문제·해결의 적절성과 창의성 — 문제가 분명하고, 해결이 그에 맞고 새로운가\n" +
      "· 전달력 — 이해하기 쉬운 설명, 태도와 목소리\n" +
      "· 시연 — 실제 앱·화면을 보여 주었는가\n" +
      "· 동료 피드백 반영 — 받은 피드백을 반영해 개선한 점이 보이는가",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_l7_presenter",
    phase: "build",
    label: "⑤ 발표자라면 — 내 발표 자료를 열어 두세요",
    hint:
      "오늘 발표로 뽑혔다면, 아래에 6차에 만든 내 발표 슬라이드·앱 링크·대본이 있어요.\n" +
      "슬라이드 링크를 눌러 띄워 놓고, 대본을 참고해 약 3분 동안 발표하세요.\n" +
      "슬라이드가 없으면 앱(앱 링크)을 직접 열어 보여 주며 설명해도 됩니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_l7_my_materials",
    phase: "build",
    /*
     * 발표자 본인 자료 — 같은 활동 ID 라 6차 답이 그대로 열린다. build_url 은 URL_ANSWER_KEYS 라
     * 스킴 없이 저장돼도 눌리고, slides_url 은 https 로 시작하면 링크로 뜬다(캔바 공유 링크는 https).
     * script(대본)는 긴 글이라 그대로 펼쳐 읽는다.
     */
    label: "내 발표 자료 (발표자용)",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "slides_url", label: "발표 슬라이드 링크" },
      { key: "build_url", label: "내 앱 링크 (시연)" },
      { key: "final_pitch", label: "확정된 앱 소개 (첫마디)" },
      { key: "script", label: "발표 대본" },
    ],
    maxLength: 0,
  },

  /*
   * ── ③ 동료평가 (grill 칸) ─────────────────────────────────
   *
   * 발표를 들으며 발표자마다 한 줄씩 남긴다. rows 라 발표자 수만큼 줄을 늘려 적는다.
   * 답은 평가한 학생 본인의 활동지에만 저장된다 — 발표자에게는 안 나간다(서로 구경하기 끔).
   */
  {
    key: "_l7_peereval_note",
    phase: "grill",
    label: "⑥ 동료평가 — 발표를 들으며 남겨요",
    hint:
      "발표를 한 사람 들을 때마다 아래에 한 줄씩 추가하세요 ([+ 줄 추가]).\n" +
      "· 발표자 번호 — 몇 번 친구인지 (예: 3)\n" +
      "· 점수 — 3점이 제일 잘함, 1점이 아쉬움 (위 기준으로)\n" +
      "· 잘한 점 한 가지 · 더 좋아지려면 한 가지\n\n" +
      "여기 적은 것은 발표자에게 보이지 않아요 — 솔직하게, 그리고 예의 있게 적어요.\n" +
      "다 못 적어도 괜찮아요. 한 명이라도 제대로 봐 주는 게 낫습니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "peer_eval",
    phase: "grill",
    /*
     * 발표자 × (번호·점수·코멘트). rows 답은 JSON 배열로 이 학생 본인 답에 저장된다.
     * 발표자에게 노출되지 않는다(galleryEnabled false · galleryAnswerKeys 미지정).
     * 점수는 이모지 칸으로 3점 척도(하나만 고름). 코멘트 칸은 40자 상한(rows-field 기본).
     */
    label: "발표자별 평가",
    hint: "",
    kind: "rows",
    maxRows: 12,
    rowColumns: [
      { key: "num", label: "발표자 번호", placeholder: "예) 3" },
      { key: "score", label: "점수 (3이 제일 잘함)", emojis: ["1", "2", "3"] },
      { key: "good", label: "잘한 점 한 가지", placeholder: "예) 시연이 실제로 잘 됐어요" },
      { key: "improve", label: "더 좋아지려면", placeholder: "예) 목소리가 조금 더 크면 좋겠어요" },
    ],
    maxLength: 4000,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "인간과 인공지능 7차시 — 발표 (1)",

  // 6차와 같이 기분 체크를 이어 간다 (매일 하는 루틴)
  moodCheckEnabled: true,

  // 분반은 2~6차시와 같은 값을 유지한다. 바꾸면 데이터 통이 갈려 6차 발표 자료가 안 열린다
  groups: [
    { key: "hai-tue-1", label: "화요일 1기", classNo: 1 },
    { key: "hai-tue-2", label: "화요일 2기", classNo: 2 },
    { key: "hai-thu-1", label: "목요일 1기", classNo: 3 },
    { key: "hai-thu-2", label: "목요일 2기", classNo: 4 },
  ],

  /*
   * 대기 게임을 비운다 (6차와 같음 — 세션을 mood 로 열어 대기 화면을 지나지 않는다).
   * 발표 차시라 대기 게임은 방해가 된다.
   */
  game: empty(),
  gameExplainer: empty(),

  progress: {
    heading: "오늘 할 일 (40분)",
    body:
      "그동안 만든 앱을 오늘 발표해요. 나 혼자 만든 개인 프로젝트를 남 앞에서 소개합니다.\n\n" +
      "오늘(7차)은 무작위로 뽑힌 10~11명이 발표하고, 나머지는 다음 시간(8차)에 발표해요.\n" +
      "한 사람당 약 3분 발표하고, 끝나면 짧게 질문을 주고받습니다.\n\n" +
      "① 평가 기준 먼저 보기 — 친구 평가·선생님 평가 기준\n" +
      "② 발표 — 뽑힌 사람부터 앞에 나와 슬라이드를 띄우고 발표\n" +
      "③ 동료평가 — 발표를 들으며 발표자마다 점수와 한마디 ([동료평가] 탭)\n" +
      "④ 회고 — 짧게\n\n" +
      "발표 안 한 사람도 다음 시간에 발표하니, 오늘은 잘 듣고 좋은 피드백을 남겨 줘요.",
    url: "",
  },
  assessment: empty(),
  video: empty(),

  reflectionQuestions: [
    "오늘 친구들의 발표를 들으며 새로 배운 점이나 인상 깊었던 점을 적어 보세요.",
    "내가 발표했다면, 잘된 점과 다음에 고치고 싶은 점을 한 가지씩 적어 보세요. (다음 시간 발표라면 각오를 적어도 좋아요.)",
  ],
  reflectionPublic: false,

  /*
   * 발표 중 캔바 슬라이드·앱을 새 창으로 여는 것은 활동 자체라 이탈로 세지 않는다.
   */
  focusExempt: ["build", "grill", "worksheet"],

  // 발표자는 자기 자료(build)와 동료평가(grill)를 오간다. 되돌아가기를 켜 둔다
  freeNavigation: true,

  /*
   * 단계 이름. build(평가 기준·발표 진행) → grill(동료평가) → reflection(회고).
   * 대기(waiting)는 흐름에서 뺀다(아래 phaseOrder). teacher 평가는 학생 단계가 아니라
   * teacher/pre-review 에서 이뤄지므로 여기 단계가 없다.
   */
  phaseLabels: {
    progress: "오늘 할 일",
    build: "평가 기준·발표 진행",
    grill: "동료평가",
    reflection: "회고",
  },

  /*
   * 단계 버튼 순서 (6차와 같은 이유로 대기를 흐름에서 뺀다).
   * 대시보드는 [...phaseOrder, ...LESSON_PHASES 중 안 적은 것] 을 availablePhase 로 걸러
   * 버튼을 만든다. mood→build→grill→reflection→done 을 앞세우고, 여기 없는 waiting 은
   * 맨 뒤로 밀린다(availablePhase 기본 true 라 버튼 자체는 못 없앰 — 세션을 mood 로 열어
   * 학생은 대기 화면을 지나지 않는다). phaseOrder 는 snapshotOf·open 스크립트로 세션에 실린다.
   */
  phaseOrder: ["mood", "build", "grill", "reflection", "done"],

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2026,
    worksheet: WORKSHEET,

    // 발표·평가 시간이라 출처 두 칸을 안 띄운다
    sourcesEnabled: false,

    /*
     * 서로 구경하기를 끈다.
     *
     * 오늘은 라이브 발표라 갤러리가 필요 없고, 무엇보다 동료평가(peer_eval)를 발표자에게
     * 노출하지 않으려면 이 값이 false 여야 안전하다. false 면 서버가 갤러리 조회 자체를
     * 거절한다(student/gallery 라우트). peer_eval 답은 평가한 학생 본인 활동지에만 남고
     * 교사만 대시보드·CSV 로 본다.
     */
    galleryEnabled: false,
  },
};

async function main(): Promise<void> {
  if (!CANVA_INVITE_URL) {
    console.error(
      "✗ CANVA_INVITE_URL 이 없습니다.\n" +
        "  .env.local 에 캔바 학교 팀 초대 주소를 넣어 주세요:\n" +
        "  CANVA_INVITE_URL=https://www.canva.com/brand/join?token=...\n" +
        "  (저장소가 공개라 코드에 직접 적지 않습니다)",
    );
    process.exit(1);
  }

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
        console.warn(
          `   ⚠ ${s.id} (코드 ${x.code}) 는 ${x.status} 상태라 건너뛰었습니다.\n` +
            `     학생 화면은 옛 내용 그대로입니다.`,
        );
      }
    }
  }

  console.log("\n캔바 초대 주소");
  for (const [key, label] of [
    ["hai-tue-1", "화요일 1기"],
    ["hai-tue-2", "화요일 2기"],
    ["hai-thu-1", "목요일 1기"],
    ["hai-thu-2", "목요일 2기"],
  ] as const) {
    const url = CANVA_BY_GROUP[key];
    console.log(
      `  ${label}  ${url ? url.replace(/token=([^&]{4})[^&]*/, "token=$1…") : "없음 — 기본 주소로 물러남"}`,
    );
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} (2~6차시와 같음 — 6차 발표 자료·앱·대본이 그대로 열립니다)`);
  console.log(`차시 번호 ${LESSON_NO} (정보과와 안 겹치게)`);
  console.log("단계: 기분 체크(mood) → ①평가 기준·발표 진행(build) → ②발표 → ③동료평가(grill) → 회고");
  console.log("  ※ 발표는 7차에 무작위 10~11명, 나머지는 8차 (8차는 미제작). 1인 약 3분 + 질의응답. 발표자 무작위 추첨은 교사가(포털 추첨 기능 없음).");
  console.log("  ※ 동료평가 = peer_eval(kind: rows): 발표자별 번호·점수(3점 이모지)·잘한 점·더 나아지려면. 답은 평가자 본인 활동지에만 저장 → 발표자 비노출(galleryEnabled false).");
  console.log("  ※ 교사평가 = 교사 전용 /teacher/eval (별도 컬렉션 teacherEvals, 발표자별 5항목×0~3 + 코멘트). teacherFeedback 과 분리 → 학생 어떤 경로도 비노출. 발표 때 폰에서 입력, 기본 접힘(점수 비노출).");
  console.log("  ※ 발표자 본인 자료(6차 slides_url·build_url·final_pitch·script)는 build 의 echo 로 열립니다.");
  console.log("  ※ 평가 기준은 6차 동료·교사 기준 재사용. 대기 게임 없음(mood 로 시작). 서로 구경하기 끔.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
