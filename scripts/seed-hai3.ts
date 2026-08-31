/**
 * 「인간과 인공지능」(진로탐색 선택과목) 3차시.
 *
 *   node --env-file=.env.local scripts/seed-hai3.ts
 *
 * ## 왜 이 차시가 계획서와 다른가
 *
 * 구현계획서는 "2차시에 각자 MVP 를 하나씩 뽑았다" 를 전제로 네 번의 검토
 * (나 → AI → 친구 → 선생님)를 넣으라고 한다. 그런데 2차시 기록을 세어 보니
 * 그 전제가 서지 않았다.
 *
 *   화요일 1기 23명 — 캔바에 넣을 프롬프트 22/23, **만든 링크 4/23**
 *   목요일 1기 22명 — 프롬프트 16/22, 만든 링크 7/22
 *   두 반 모두 AI 검토(grill)에 도달한 학생 0명
 *
 * 프롬프트까지는 다 썼는데 캔바에서 뽑아 게시하는 데서 끊겼다. 이 상태로 네 라운드
 * 검토를 열면 열아홉 명이 40분 동안 검토할 것이 없다. 그래서 3차시는 **뽑기를
 * 끝내는 시간**이고, 그 위에 2차시가 설계해 둔 자기검토 → AI 검토를 그대로 얹는다.
 * 동료 검토와 교사 검토는 앱이 다 모인 다음, 4차시로 미룬다.
 *
 * ## 활동 ID 를 2차시와 같게 둔다
 *
 * 같은 `artifacts` 문서를 이어 쓰므로, 지난 시간에 쓴 답이 오늘 화면에 그대로 열린다.
 * carryOver 로 따로 실어 나를 필요가 없다 — 열쇠가 같으면 그 칸이 곧 그 답이다.
 * 그래서 오늘 활동지는 **빈 종이가 아니라 지난 시간에 쓰다 만 종이**로 시작한다.
 *
 * ## AI 검토는 죽어도 수업을 안 멈춘다
 *
 * 상한 초과·시간 초과·형식 오류·키 없음 무엇이든 고정 질문 세 개로 내려간다
 * (ai-review.ts 의 FALLBACK_QUESTIONS). 학생 화면에는 어느 경로로 왔는지 표시하지
 * 않는다 — "저는 AI가 안 왔어요" 가 한 명 나오면 나머지 수업이 멈춘다.
 * 폴백 비율은 교사 대시보드에만 뜬다.
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

/** 저장소가 공개라 캔바 초대 주소는 .env.local 에서만 읽는다 (seed-hai2.ts 와 같은 이유) */
const CANVA_INVITE_URL = process.env.CANVA_INVITE_URL ?? "";
const CANVA_BY_GROUP: Record<string, string> = {
  "hai-tue-1": process.env.CANVA_INVITE_TUE_1 ?? "",
  "hai-tue-2": process.env.CANVA_INVITE_TUE_2 ?? "",
  "hai-thu-1": process.env.CANVA_INVITE_THU_1 ?? "",
  "hai-thu-2": process.env.CANVA_INVITE_THU_2 ?? "",
};

/** ★ 2차시와 같은 값. 이 값이 같아야 지난 시간 답이 오늘 화면에 열린다 */
const ACTIVITY_ID = "hai-2026-1기";
/** 차시 번호가 정보과와 겹치므로 100번대로 띄운다 (2차시가 102) */
const LESSON_NO = 103;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const WORKSHEET: WorksheetQuestion[] = [
  // ── 뽑기 완주 (4~24분) ────────────────────────────────
  /*
   * 로그인을 맨 위에 둔다.
   *
   * 지난 시간 순서는 「지난 내용 확인 → 오늘 할 일 → 로그인」 이었는데, 제일 오래
   * 걸리는 일이 세 번째에 있으면 앞의 둘을 읽는 동안 아무것도 안 굴러간다.
   * 먼저 누르게 하고, 캔바가 뜨는 동안 나머지를 읽게 한다.
   */
  {
    key: "_build_login",
    phase: "build",
    /*
     * 지난 시간에 여기서 제일 오래 걸렸다.
     *
     * 안내가 "26 뒤에 내 학번 5자리를 붙이세요" 였는데, 중1에게 이건 두 가지 일이다 —
     * 규칙을 이해하는 것과, 서른 자짜리 주소를 오타 없이 치는 것. 스물두 명이면 그중
     * 몇은 반드시 틀리고, 틀린 학생은 왜 안 되는지 스스로 못 찾아 손을 든다.
     * 그래서 {학교계정} 으로 아예 만들어서 보여준다 (worksheet-view 의 named 참조).
     *
     * 막히는 자리를 미리 적어 두는 것도 그래서다. "안 돼요" 하고 손을 들면 교사가
     * 가서 무엇이 안 되는지부터 물어야 하는데, 그 왕복이 스물두 번이면 수업이 없다.
     */
    label: "① 캔바에 들어가기 — 여기가 제일 오래 걸립니다",
    hint:
      "아래 단추를 누르고 [Microsoft로 계속하기] 를 고르세요.\n\n" +
      "내 학교 계정은 이거예요. 그대로 치면 됩니다.\n" +
      "  {학교계정}\n" +
      "비밀번호는 학교 계정 비밀번호예요.\n\n" +
      "이럴 때는 이렇게 하세요\n" +
      "· 다른 계정으로 이미 로그인돼 있다 → 로그아웃하고 위 주소로 다시\n" +
      "· 비밀번호가 기억 안 난다 → 손을 드세요. 혼자 시도해도 안 풀립니다\n" +
      "· 팀에 들어갈지 물어본다 → [참여] 를 누르세요\n" +
      "· 화면이 안 넘어간다 → 30초는 기다려 보고, 그래도 그대로면 손을 드세요",
    kind: "note",
    linkUrl: CANVA_INVITE_URL,
    linkUrlByGroup: Object.fromEntries(Object.entries(CANVA_BY_GROUP).filter(([, url]) => url)),
    linkLabel: "캔바 열기 (새 창)",
    maxLength: 0,
  },
  {
    key: "_l3_recap",
    phase: "build",
    /*
     * 지난 시간에 쓴 것을 편다.
     *
     * 일주일이 지났고, 중1은 자기가 무엇을 만들려 했는지 기억하지 못한다. 활동 ID 가
     * 같아서 따로 실어 나르지 않아도 여기 그대로 있다.
     *
     * 로그인 **아래**에 둔다. 이걸 먼저 읽히면 그동안 캔바는 아직 열리지도 않았다.
     */
    label: "캔바가 열리는 동안 — 지난 시간에 여기까지 했어요",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "mvp_one", label: "내가 만들려던 것" },
      { key: "mvp_must1", label: "꼭 필요한 기능 ①" },
      { key: "mvp_must2", label: "꼭 필요한 기능 ②" },
      { key: "mvp_must3", label: "꼭 필요한 기능 ③" },
      { key: "build_url", label: "이미 만든 화면 (있다면)" },
    ],
    maxLength: 0,
  },
  {
    key: "_l3_start",
    phase: "build",
    label: "오늘은 반드시 화면을 하나 뽑습니다",
    hint:
      "지난 시간에 프롬프트까지는 거의 다 썼는데, 실제로 뽑아서 링크를 낸 사람은 몇 명뿐이었어요.\n" +
      "오늘의 목표는 딱 하나입니다 — 내 화면 링크를 아래 칸에 넣는 것.\n" +
      "위 칸에 이미 링크가 있는 사람은 이 부분을 건너뛰고 바로 아래 ‘살펴보기’ 로 가세요.\n" +
      "오늘도 일부러 대충 갑니다. 허접해도 됩니다 — 왜 허접한지 찾는 게 다음 순서예요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "mvp_one",
    phase: "build",
    /*
     * 지난 시간에 쓴 학생은 그대로 차 있다 (같은 활동 ID). 한 명이 비어 있어서 둔다.
     * 이 칸이 비면 아래 프롬프트가 통째로 만들어지지 않는다.
     */
    label: "만들 것 한 줄 — 비어 있으면 지금 채우세요",
    hint: "위 칸에 이미 적혀 있으면 그대로 두세요.\n예) 오늘 날짜를 누르면 급식 메뉴가 뜨는 앱",
    kind: "text",
    maxLength: 80,
  },
  {
    key: "_build_make",
    phase: "build",
    label: "② 웹 앱 만들기",
    hint:
      "왼쪽 메뉴에서 [Canva AI] → [</> 코드] 를 누릅니다.\n" +
      "아래 칸의 [복사하기] 를 눌러 캔바에 붙여 넣고 만들어요.\n" +
      "만드는 데 1~2분 걸립니다. 그동안 화면을 닫지 마세요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "build_prompt",
    phase: "build",
    label: "캔바에 넣을 프롬프트",
    hint:
      "지난 시간에 쓴 것이 그대로 있어요. 그대로 써도 되고 고쳐도 됩니다.\n" +
      "오늘도 잘 쓰려고 애쓰지 마세요 — 왜 부족한지 찾는 게 다음 순서예요.",
    kind: "long",
    maxLength: 300,
    prefillTemplate:
      "{mvp_one} 을(를) 만들어줘.\n꼭 필요한 기능은 {mvp_must1} 이야.\n{mvp_must2} 도 있으면 좋겠어.\n{mvp_must3} 도 넣어줘.",
    copyable: true,
  },
  {
    key: "_build_publish",
    phase: "build",
    label: "③ 링크 가져오기 — 여기까지 해야 오늘 한 것이 됩니다",
    hint:
      "오른쪽 위 파란색 [게시] 단추를 누릅니다.\n" +
      "그러면 주소(URL)가 나와요. 그걸 복사해서 아래 칸에 붙여 넣습니다.\n" +
      "지난 시간에 여기서 제일 많이 막혔어요. 안 보이면 손을 드세요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "build_url",
    phase: "build",
    label: "만들어진 화면 링크",
    hint: "이게 오늘의 결과물입니다. 다음 시간에도 이 주소를 씁니다.",
    kind: "text",
    maxLength: 300,
  },

  // ── 살펴보기 · 자기검토와 AI 검토 (24~36분) ────────────
  {
    key: "_grill_note",
    phase: "grill",
    label: "만든 화면을 띄워 놓고 답해 주세요",
    hint:
      "고치는 시간이 아닙니다. 무엇이 어긋났는지 찾는 시간이에요.\n" +
      "답이 막히는 자리가 곧 내 기획의 구멍입니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_grill_recap",
    phase: "grill",
    // 방금 만든 화면 주소. 눌러서 새 창으로 연다 — 여기서 나가면 쓰던 답이 날아간다
    label: "",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "build_url", label: "내가 만든 화면" },
      { key: "mvp_one", label: "내가 만들려던 것" },
    ],
    maxLength: 0,
  },
  {
    key: "grill_a1",
    phase: "grill",
    label: "이 화면을 누가 쓸까요?",
    hint: "‘모두’ 는 답이 아니에요. 한 사람을 떠올려 이름을 대 보세요.\n예) 우리 반 김○○",
    kind: "text",
    maxLength: 80,
  },
  {
    key: "grill_a2",
    phase: "grill",
    label: "만들어진 화면이 내가 생각한 것과 어디가 다른가요?",
    hint: "예) 날짜를 누르는 칸이 아예 없어요",
    kind: "long",
    maxLength: 150,
  },
  {
    key: "ai_review",
    phase: "grill",
    /*
     * 스스로 답한 뒤에 부른다.
     *
     * 백지 기획을 보고 묻는 것보다, "이미 스스로 답한 것 말고 무엇을 놓쳤는지" 를
     * 짚어야 안 겹치는 새 관점이 나온다. AI 는 점수도 칭찬도 주지 않고 질문만 한다.
     *
     * 질문 세 개로 둔다 (2차시는 둘이었다). 셋이면 프롬프트가 각도까지 못 박는다 —
     * 누가 쓰는가 · 정말 필요한가 · 써 보면 헷갈리지 않는가. 오늘은 이 세 각도가
     * 그대로 다음 시간 고칠 거리가 된다.
     */
    label: "이제 AI에게 검토받아 봅시다",
    hint:
      "지금까지 쓴 것을 모아 AI에게 보여줘요. AI는 점수를 매기지 않고, 아직 생각 못한 것을 질문으로 물어봐요.\n" +
      "보내는 것은 위에 쓴 글뿐이에요. 이름과 학번은 보내지 않습니다.",
    kind: "ai_review",
    maxLength: 0,
    reviewCount: 3,
    reviewFields: [
      { key: "problem_what", label: "불편했던 것" },
      { key: "problem_who", label: "누구의 불편인가" },
      { key: "mvp_one", label: "제일 작게 만들면" },
      { key: "mvp_must1", label: "꼭 필요한 기능 ①" },
      { key: "mvp_must2", label: "꼭 필요한 기능 ②" },
      { key: "mvp_must3", label: "꼭 필요한 기능 ③" },
      { key: "grill_a1", label: "누가 쓸지 스스로 답한 것" },
      { key: "grill_a2", label: "생각과 다른 점을 스스로 답한 것" },
    ],
  },
  {
    key: "will_fix",
    phase: "grill",
    /*
     * 이 한 줄이 4차시 첫 화면에 뜬다. 빈 종이에서 다음 시간을 시작하지 않게 하는 장치다.
     * 2차시에는 아무도 여기까지 못 왔다 (0/23) — 오늘은 반드시 채우고 끝낸다.
     */
    label: "다음 시간에 고치거나 더할 것 한 가지는?",
    hint:
      "이 줄은 다음 시간 화면 맨 위에 그대로 뜹니다. 나에게 남기는 쪽지예요.\n" +
      "AI가 물어본 것 중 하나를 골라 답해도 좋아요.",
    kind: "text",
    maxLength: 80,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "인간과 인공지능 3차시 — 오늘은 반드시 뽑는다",

  // 정보과에서 한 학기 내내 하고 있다. 같은 학생이 화요일에 또 만나면 성의껏 안 고른다
  moodCheckEnabled: false,

  // 분반은 2차시와 같은 값을 유지한다. 바꾸면 데이터 통이 갈려 지난 답이 안 열린다
  groups: [
    { key: "hai-tue-1", label: "화요일 1기", classNo: 1 },
    { key: "hai-tue-2", label: "화요일 2기", classNo: 2 },
    { key: "hai-thu-1", label: "목요일 1기", classNo: 3 },
    { key: "hai-thu-2", label: "목요일 2기", classNo: 4 },
  ],

  game: {
    heading: "기다리는 동안 — 똥 피하기",
    body:
      "위에서 떨어지는 똥을 좌우로 피하세요. 한 번이라도 맞으면 끝이에요.\n" +
      "화살표 키나 화면 좌·우를 누르면 움직입니다.",
    url: "https://dodge-poop-game.vercel.app/",
  },
  gameExplainer: empty(),

  /*
   * 지난 시간에 어디서 멈췄는지를 먼저 말해 준다.
   *
   * "왜 또 만드나요" 가 나오기 전에 이유를 대는 편이 낫다. 못 한 것을 나무라는 말로
   * 읽히지 않게, 끊긴 지점을 사실로만 적는다.
   */
  progress: {
    heading: "오늘 할 일",
    body:
      "지난 시간에 프롬프트까지는 거의 다 썼어요. 그런데 실제로 뽑아서 링크를 낸 사람은 몇 명뿐이었습니다.\n" +
      "캔바 로그인에서 제일 오래 걸렸어요. 그래서 오늘은 그것부터 합니다.\n\n" +
      "다음 화면이 뜨면 맨 위 [캔바 열기] 를 먼저 누르세요.\n" +
      "로그인할 계정 주소는 화면이 만들어서 보여줍니다 — 직접 계산하지 않아도 돼요.\n" +
      "캔바가 열리는 동안 그 아래를 읽으면 됩니다.\n\n" +
      "① 캔바에서 내 화면 뽑고 링크 내기 — 오늘 반드시\n" +
      "② 뽑힌 화면을 보고 어디가 어긋났는지 스스로 찾기\n" +
      "③ AI에게 검토받기 — 점수가 아니라 질문 세 개를 받습니다\n" +
      "④ 다음 시간에 고칠 것 한 줄 남기기\n\n" +
      "오늘 뽑는 화면도 허접할 거예요. 그게 정상입니다.\n" +
      "왜 허접한지 찾아내는 것이 오늘의 진짜 과제예요.",
    url: "",
  },
  assessment: empty(),
  video: empty(),

  reflectionQuestions: [
    "오늘 AI가 물어본 세 가지 중에 가장 뜨끔했던 질문 하나와, 왜 그랬는지 적어 주세요.",
  ],
  reflectionPublic: false,

  /*
   * 만들기와 검토 단계는 이탈로 세지 않는다.
   *
   * 캔바로 나가서 뽑아 오는 것이 활동 자체다. 그걸 이탈로 세면 기록이 온통 빨갛게
   * 되고 아무 의미가 없다. 더 나쁜 것은 학생이 눈치를 보느라 안 나가는 것이다.
   */
  focusExempt: ["build", "grill", "gallery"],

  /*
   * 학생이 단계를 오갈 수 있게 한다.
   *
   * 오늘은 캔바를 여러 번 드나든다. 돌아왔을 때 교사가 넘긴 단계에 갇혀 있으면
   * 링크를 넣을 칸으로 돌아갈 수가 없다. 이미 뽑아 둔 네 명이 앞서 나가는 것도
   * 이 설정으로 열린다.
   */
  freeNavigation: true,

  phaseLabels: {
    progress: "오늘 할 일",
    build: "뽑기",
    grill: "살펴보기",
    gallery: "서로 구경하기",
    reflection: "회고",
  },

  activity: {
    activityId: ACTIVITY_ID,
    // 그리기가 없는 활동. 장소를 비우면 그리기 화면이 안 뜬다
    places: [],
    year: 2026,
    worksheet: WORKSHEET,

    sourceHints: {
      site: "예) 캔바 — AI 앱 생성",
      ai: "예) 챗지피티 — 버튼이 안 눌리는 이유를 물어봄",
    },

    /*
     * 서로 구경하기는 오늘 계획에 안 넣었다 — 링크가 다 모여야 성립한다.
     * 다만 반이 빨리 끝나면 교사가 단계를 넘겨 쓸 수 있게 설정만 맞춰 둔다.
     * 그림용 기본 문구를 그대로 두면 앱을 보고 "무슨 기술이 보이나요" 를 묻게 된다.
     */
    galleryFacets: [
      { key: "who", label: "누구의 불편인가", answerKeys: ["problem_who"] },
      { key: "made", label: "무엇을 만들었나", answerKeys: ["mvp_one"] },
    ],
    feedbackPrompts: {
      found: {
        label: "이 친구가 만든 화면에서, 좋았던 것 하나만 알려 주세요",
        placeholder: "예) 날짜 누르는 칸이 큼직해서 쓰기 편해 보여요",
      },
      question: {
        label: "써 보다가 헷갈렸던 것 하나",
        placeholder: "예) 저장 단추가 어디 있는지 못 찾았어요",
      },
    },
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

      /*
       * 아직 시작하지 않은 수업에만 다시 복사한다 (PRD 5.1).
       * 여기서 0개가 나오면 계획만 바뀌고 학생 화면은 옛 내용 그대로다.
       */
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
    // 토큰은 앞 네 글자만 찍는다. 저장소·로그에 통째로 남기지 않는다
    console.log(
      `  ${label}  ${url ? url.replace(/token=([^&]{4})[^&]*/, "token=$1…") : "없음 — 기본 주소로 물러남"}`,
    );
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} (2차시와 같음 — 지난 시간 답이 그대로 열립니다)`);
  console.log(`차시 번호 ${LESSON_NO} (정보과와 안 겹치게)`);
  console.log("단계: 대기 → 오늘 할 일 → 뽑기 → 살펴보기 → 회고");
  console.log("AI 검토는 질문 3개. 실패하면 고정 질문 3개로 내려갑니다 (학생 화면에는 표시 안 됨).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
