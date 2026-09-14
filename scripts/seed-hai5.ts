/**
 * 「인간과 인공지능」(진로탐색 선택과목) 5차시.
 *
 *   node --env-file=.env.local scripts/seed-hai5.ts
 *
 * ## 이 차시가 노리는 것 — 서로 보고 고친다
 *
 * 4차시까지 각자 앱을 하나씩 뽑고, 자기 눈 → AI → 선생님 순으로 고쳐 왔다.
 * 5차시는 그 위에 **동료 검토** 를 얹는다. 접속한 친구들의 앱을 서로 열어 보고,
 * 정해진 기준으로 짧게 남긴다. 넷째 관점(친구의 눈)이 여기서 열린다.
 *
 * 동료 검토 인프라는 이미 있는 것을 **그대로 재사용**한다 (src/lib/gallery.ts):
 *  - 서버가 **배정한 3편만** 검토한다. 자유 선택도, 전체 둘러보기도 없다 (교사 확정).
 *    배정 외 앱은 응답·화면 어디에도 안 나온다(galleryAssignedOnly). "내 뒤 3명" 순환이라
 *    모든 앱이 정확히 세 번씩 배정돼 아무도 빠지지 않는다(peerCount: 3).
 *  - 이 분반은 여러 반이 섞여 있어, 배정을 **진짜 랜덤(peerAssign: "random")** 으로 켠다.
 *    세션 시드로 한 번 섞은 순서에 같은 순환을 얹어, 반이 섞이면서도 균등·안정·전원 커버가
 *    유지된다. 이 세 플래그(random·count·assignedOnly)를 안 켠 다른 차시는
 *    **필수 2편 + 자유 1편 + 전체 둘러보기 학번순 순환** 그대로다 (회귀 없음).
 *  - 카드 밑 두 칸짜리 피드백 폼(gallery-view 의 FeedbackForm)은 그대로 두고,
 *    **문구만** 좋은 점·개선할 점 두 칸으로 바꾼다(feedbackPrompts). 폼 필드 자체는 코드
 *    변경이라 건드리지 않는다 — 검토 기준은 안내(note)로 주고 기존 칸을 재사용한다.
 *  - privacy: 친구에게는 **앱 주소(build_url)만** 연다(galleryAnswerKeys). 앱은 서로 눌러
 *    열어 봐야 검토가 되므로 링크는 보이되, 자기 성찰·기획 칸은 목록에 없어 안 나간다. 익명 유지.
 *
 * ## 활동 ID 를 2·3·4차시와 같게 둔다
 *
 * 같은 `artifacts` 문서를 이어 쓴다. 지난 시간에 낸 앱 링크(build_url)·프롬프트·
 * 고친 것이 오늘 화면에 그대로 열리고, 그 링크가 곧 동료 검토에 올라가는 작품이다.
 * 열쇠가 같으면 그 칸이 곧 그 답이다.
 *
 * ## 40분 흐름 (교사 확정 — 대기·기분·안내·성찰까지 포함해 40분 안)
 *
 *   0–3   대기(지뢰찾기) · 기분 · 출석
 *   3–7   오늘 안내 + Canva 대화 이어가기 팁 · 함께 세팅 (교사와 함께)
 *   7–12  교사 피드백 먼저 반영 (아직 반영 안 한 것부터, 약 5분)   → build 단계
 *   12–26 동료 검토 3편 (약 14분)                                → grill(기준) + 감상 탭
 *   26–38 받은 피드백 읽고 수정 반영 (약 12분)                    → emotion 단계
 *   38–40 성찰(짧게) → 정리
 *
 * 동료 검토·반영은 빠듯하다. 안내 문구는 내내 "다 못 해도 괜찮다" 톤으로 둔다 —
 * 한 편이라도 제대로 보고, 한 가지라도 제대로 고치는 게 낫다.
 *
 * ## 세션은 열지 않는다
 *
 * 이 스크립트는 차시 계획(LessonPlan)만 짓는다. 학생에게 노출되는 것은 교사가
 * 흐름을 검토한 뒤 세션을 열 때다(open-hai5-* 는 분반·날짜·교시가 필요해 따로 만든다).
 * 이미 열어 둔 scheduled 세션에는 반영하고, 진행 중·끝난 세션은 건드리지 않는다
 * (seed-hai4 와 같은 안전장치).
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

/** 저장소가 공개라 캔바 초대 주소는 .env.local 에서만 읽는다 (seed-hai4 와 같은 이유) */
const CANVA_INVITE_URL = process.env.CANVA_INVITE_URL ?? "";
const CANVA_BY_GROUP: Record<string, string> = {
  "hai-tue-1": process.env.CANVA_INVITE_TUE_1 ?? "",
  "hai-tue-2": process.env.CANVA_INVITE_TUE_2 ?? "",
  "hai-thu-1": process.env.CANVA_INVITE_THU_1 ?? "",
  "hai-thu-2": process.env.CANVA_INVITE_THU_2 ?? "",
};

/** ★ 2·3·4차시와 같은 값. 이 값이 같아야 지난 시간에 낸 앱 링크가 오늘 검토에 올라간다 */
const ACTIVITY_ID = "hai-2026-1기";
/** 차시 번호가 정보과와 겹치므로 100번대로 띄운다 (2차시 102, 3차시 103, 4차시 104) */
const LESSON_NO = 105;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const WORKSHEET: WorksheetQuestion[] = [
  /*
   * ── ① 이어가기 · 교사 피드백 (build 칸) ────────────────────
   *
   * 로그인을 맨 위에 둔다 — 3·4차시와 같은 이유다. 제일 오래 걸리는 일을 먼저 누르게
   * 하고, 캔바가 뜨는 동안 아래(회상 → 대화 이어가기 팁 → 교사 피드백)를 읽힌다.
   */
  {
    key: "_l5_login",
    phase: "build",
    label: "① 캔바에 다시 들어가기 — 먼저 눌러 두세요",
    hint:
      "아래 [캔바 열기] 를 누르고 [Microsoft로 계속하기] 를 고르세요.\n" +
      "내 학교 계정은 아래 칸에 있어요. [복사하기] 를 눌러 그대로 붙여 넣으면 됩니다.\n" +
      "비밀번호는 학교 계정 비밀번호예요.\n\n" +
      "지난 시간에 만든 앱은 캔바에 그대로 저장돼 있어요 — 오늘은 그걸 열어 고칩니다.\n" +
      "· 다른 계정으로 로그인돼 있다 → 로그아웃하고 위 주소로 다시\n" +
      "· 비밀번호가 기억 안 난다 → 손을 드세요\n" +
      "· 화면이 안 넘어간다 → 30초 기다려 보고, 그래도 그대로면 손을 드세요",
    kind: "note",
    // 학생마다 자기 계정 주소가 복사된다 (worksheet-view 의 named 가 치환한다)
    copyText: "{학교계정}",
    linkUrl: CANVA_INVITE_URL,
    linkUrlByGroup: Object.fromEntries(Object.entries(CANVA_BY_GROUP).filter(([, url]) => url)),
    linkLabel: "캔바 열기 (새 창)",
    maxLength: 0,
  },
  {
    key: "_l5_recap",
    phase: "build",
    /*
     * 지난 시간 끝에 자기에게 남긴 쪽지(will_fix)와 낸 앱을 편다.
     * 활동 ID 가 같아 따로 실어 나르지 않아도 여기 그대로 있다.
     */
    label: "지난 시간에 여기까지 했어요",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "mvp_one", label: "내가 만든 앱" },
      { key: "build_url", label: "내가 낸 앱 링크" },
      { key: "will_fix", label: "다음에 고치려고 적어 둔 것" },
      { key: "fix4", label: "지난 시간에 실제로 고친 것" },
    ],
    maxLength: 0,
  },
  {
    key: "_l5_continue_tip",
    phase: "build",
    /*
     * Canva 대화 이어가기 팁 (교사 outline 4번).
     *
     * 대화창이 길어지면 캔바 AI 의 컨텍스트 메모리가 꽉 차 앱을 더 못 고치게 된다.
     * 그때는 새 대화창을 열고, 기존 대화의 코드와 지금까지의 요약을 옮겨 이어 간다.
     * 교사가 앞에서 함께 세팅한다는 톤으로, 단계를 또렷이 나눠 준다.
     */
    label: "② Canva 대화 이어가기 — 대화창이 길어지면 (선생님과 함께)",
    hint:
      "앱을 여러 번 고치다 보면 캔바 AI 가 느려지거나 “대화가 너무 길어요” 라고 해요.\n" +
      "AI 가 기억하는 공간(메모리)이 꽉 찬 거예요. 이럴 땐 새 대화창으로 옮겨서 이어 갑니다.\n\n" +
      "순서대로 해 보세요 (한 줄씩 선생님과 함께)\n" +
      "1) [Canva AI] → [</> 코드] 에서 새 대화를 엽니다\n" +
      "2) 지금 앱의 코드를 전부 복사해, 새 대화창에 붙여 넣습니다\n" +
      "3) 지금까지 무엇을 만들고 무엇을 고쳤는지 두세 줄로 요약해 함께 붙여 넣습니다\n" +
      "4) “이 코드를 이어서 고쳐 줘” 라고 부탁하고 계속 진행합니다\n\n" +
      "아래 [복사하기] 의 안내문을 요약 앞에 붙이면 AI 가 무엇을 할지 더 잘 알아들어요.",
    kind: "note",
    // 새 대화창에 붙일 머리말. 학생이 그 뒤에 자기 코드·요약을 이어 붙인다
    copyText:
      "아래는 지금까지 캔바로 만든 앱의 코드와, 지금까지의 작업 요약이야. 이 앱을 이어서 고쳐 줘.",
    maxLength: 0,
  },
  {
    key: "_l5_teacher_intro",
    phase: "build",
    /*
     * 이 안내가 있어야 아래 teacher_note 가 "왜 벌써 떠 있지?" 로 안 읽힌다.
     * 오늘 제일 먼저 하는 일은 **아직 반영 안 한 교사 피드백** 을 고치는 것이다.
     */
    label: "③ 선생님 피드백부터 반영해요 (약 5분)",
    hint:
      "지난 시간에 선생님이 남긴 말 중, 아직 안 고친 것이 있으면 그것부터 고칩니다.\n" +
      "아래에 선생님이 남긴 말이 그대로 떠 있어요. 새로 온 말이 있을 수도 있어요.\n" +
      "동료 검토에 들어가기 전에, 눈에 보이는 것 하나만이라도 먼저 고쳐 두면 좋아요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_r5_teacher",
    phase: "build",
    /*
     * 선생님이 남긴 피드백이 학생 화면에 닿는 통로 (3·4차시와 같은 통로).
     * 화면이 /api/student/submit 을 조회해 artifact.teacherFeedback.note 를 그린다
     * (teacher-note-panel). 그 칸은 teacher/pre-review 화면·수업 중 보충으로 채워진다.
     */
    label: "선생님이 남긴 말",
    hint: "",
    kind: "teacher_note",
    maxLength: 0,
  },
  {
    key: "fix_teacher",
    phase: "build",
    label: "선생님 피드백 중 오늘 반영한 것",
    hint:
      "선생님 말을 보고 실제로 고친 것을 한 줄 적어 주세요. 아직 다 못 고쳤으면 어디까지 했는지 적어도 돼요.\n" +
      "예) ‘첫 화면에 무슨 앱인지 안 보인다’ 고 하셔서, 맨 위에 제목을 넣었어요",
    kind: "long",
    maxLength: 200,
  },

  /*
   * ── ② 동료 검토 기준 (grill 칸) ────────────────────────────
   *
   * 감상(gallery) 탭으로 넘어가기 전에, 무엇을 보고 무엇을 남길지 기준을 먼저 읽힌다.
   * 중1이 남의 앱을 볼 때 쓸 **쉽고 구체적인 기준** 이라야 "잘했어요" 로 끝나지 않는다.
   * 기준은 여기 안내(note)로 주고, 실제로 남기는 두 칸은 아래 감상 탭의 폼을 그대로 쓴다
   * (feedbackPrompts 로 문구만 앱 검토에 맞췄다).
   */
  {
    key: "_l5_review_criteria",
    phase: "grill",
    label: "④ 친구 앱 검토 — 이렇게 봐 주세요 (약 14분)",
    hint:
      "위쪽 [앱 감상] 탭을 누르면 선생님이 정해 준 친구 3명의 앱이 떠 있어요.\n" +
      "자유 선택은 없어요 — 이 3명을 봐 주세요. 내 앱도 다른 친구 3명이 보게 돼 있어요.\n\n" +
      "먼저 앱을 눌러 실제로 써 보세요. 그런 다음 카드 밑 두 칸에 한 가지씩 남깁니다\n" +
      "· 좋은 점 한 가지 — 써 보니 무엇이 좋았는지 구체적으로\n" +
      "· 개선하면 좋을 점 한 가지 — 깎아내리지 말고, 도움이 되게\n\n" +
      "이모지도 눌러 주세요. ‘잘했어요’ 한 마디로 끝내지 말고, 실제로 눌러 본 것에서 적어요.\n" +
      "3명을 다 못 봐도 괜찮아요 — 한 명이라도 제대로 봐 주는 게 낫습니다.",
    kind: "note",
    maxLength: 0,
  },

  /*
   * ── ③ 받은 피드백 반영 (emotion 칸) ────────────────────────
   *
   * emotion 은 이 차시가 쓰는 STEP_PHASES 중 감상(gallery) 뒤에 오는 자리다
   * (types.ts 의 LESSON_PHASES). 친구 피드백을 받은 뒤 고치는 단계라 여기 둔다.
   * 제출·출처 칸이 붙는다면 여기 붙지만(lastStepPhase), sourcesEnabled 를 꺼 두어
   * 실제로 붙는 것은 없다.
   */
  {
    key: "_l5_received_note",
    phase: "emotion",
    label: "⑤ 받은 피드백 읽고 고치기 (약 12분)",
    hint:
      "위쪽 [앱 감상] 탭 → [내 앱] 을 누르면, 친구들이 내 앱에 남긴 말이 보여요.\n" +
      "읽어 보고, 납득되는 것만 골라 고칩니다. 전부 다 따를 필요는 없어요.\n" +
      "‘그건 이래서 이렇게 했어’ 하고 답을 달아 줘도 좋아요.\n" +
      "고칠 게 있으면 캔바로 가서 고치고, 게시를 다시 눌러 새 주소를 받으세요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_r5_received_recap",
    phase: "emotion",
    label: "",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "mvp_one", label: "내가 만든 앱" },
      { key: "build_url", label: "내가 낸 앱 링크" },
      { key: "fix_teacher", label: "선생님 피드백으로 고친 것" },
    ],
    maxLength: 0,
  },
  {
    key: "build_url",
    phase: "emotion",
    /*
     * 2·3·4차시와 같은 키 — 이 칸이 곧 "앱 링크 제출함" 이자 동료 검토에 올라간 작품이다.
     * 교사 대시보드·미리 피드백·감상이 모두 이 build_url 하나를 보고 "링크를 냈나" 를
     * 판정한다(teacher/dashboard 의 LINK_KEY). 링크 칸은 이것 하나뿐이어야 한다.
     * 오늘 고쳐서 게시를 다시 했으면 여기 주소를 새것으로 바꾼다. 안 바뀌었으면 그대로.
     */
    label: "내 앱 링크 — 오늘 고쳐서 주소가 바뀌었으면 새것으로",
    hint:
      "캔바 오른쪽 위 [게시] 를 다시 눌러 나온 주소를 붙여 넣으세요.\n" +
      "아래에 지난 시간에 낸 주소가 들어 있어요. 게시를 다시 해서 주소가 바뀐 경우에만\n" +
      "새것으로 고치면 됩니다 (안 바뀌었으면 그대로 두세요).\n" +
      "주소는 https:// 로 시작하지 않아도 저장할 때 자동으로 맞춰 줍니다.",
    kind: "text",
    maxLength: 300,
  },
  {
    key: "fix5",
    phase: "emotion",
    label: "받은 피드백을 보고 고친 것 한 가지",
    hint:
      "친구 피드백 중 제일 납득된 것 하나만 골라 고치면 됩니다. 여러 개 다 안 해도 돼요.\n" +
      "예) ‘무슨 앱인지 모르겠다’ 는 말을 듣고, 첫 화면에 한 줄 설명을 넣었어요\n" +
      "고치지 않기로 했다면 왜 그런지 적어도 좋아요 — 그것도 검토를 받아들이는 방법이에요.",
    kind: "long",
    maxLength: 200,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "인간과 인공지능 5차시 — 서로 보고 고치기",

  // 3·4차시에서 켠 기분 체크를 이어 간다 (매일 하는 루틴)
  moodCheckEnabled: true,

  // 분반은 2·3·4차시와 같은 값을 유지한다. 바꾸면 데이터 통이 갈려 지난 답·앱이 안 열린다
  groups: [
    { key: "hai-tue-1", label: "화요일 1기", classNo: 1 },
    { key: "hai-tue-2", label: "화요일 2기", classNo: 2 },
    { key: "hai-thu-1", label: "목요일 1기", classNo: 3 },
    { key: "hai-thu-2", label: "목요일 2기", classNo: 4 },
  ],

  game: {
    heading: "기다리는 동안 — 지뢰찾기",
    body:
      "숫자는 둘레에 지뢰가 몇 개 있는지 알려 줘요. 지뢰가 아닌 칸을 모두 열면 이깁니다.\n" +
      "지뢰가 있을 것 같은 칸은 깃발로 표시해 두세요.",
    url: "https://mine-sweeper-game-seven.vercel.app/home",
  },
  gameExplainer: empty(),

  progress: {
    heading: "오늘 할 일 (40분)",
    body:
      "지난 시간까지 각자 앱을 하나씩 만들고, 내 눈 → AI → 선생님 순으로 고쳐 왔어요.\n" +
      "오늘은 여기에 ‘친구의 눈’ 을 더합니다 — 서로 앱을 보고, 고쳐요.\n\n" +
      "다음 화면이 뜨면 맨 위 [캔바 열기] 를 먼저 누르세요. 지난 시간에 만든 앱은 그대로 있어요.\n\n" +
      "① 이어가기 · 교사 피드백 — 대화가 길어졌으면 새 대화로 옮기는 법을 함께 익히고,\n" +
      "   선생님이 남긴 말 중 아직 안 고친 것부터 고칩니다 (약 5분)\n" +
      "② 친구 앱 검토 — 선생님이 정해 준 친구 3명의 앱을 보고 한마디씩 남깁니다 (약 14분)\n" +
      "③ 받은 피드백 반영 — 친구들이 내 앱에 남긴 말을 읽고, 납득되면 고칩니다 (약 12분)\n" +
      "④ 성찰 — 짧게 (약 2분)\n\n" +
      "시간이 빠듯해요. 3명을 다 못 보거나 다 못 고쳐도 괜찮습니다 —\n" +
      "한 명이라도 제대로 보고, 한 가지라도 제대로 고치는 게 낫습니다.",
    url: "",
  },
  assessment: empty(),
  video: empty(),

  /*
   * 오늘의 메타 학습은 "만든 것은 남에게 보여 주며 나아진다" 이다.
   * 친구 앱을 보거나 친구 피드백을 받으며 새로 알게 된 것·느낀 것을 열어 놓고 묻는다.
   */
  reflectionQuestions: [
    "친구 앱을 보거나 친구에게 피드백을 받으면서 새로 알게 된 점이나 느낀 점을 적어 보세요.",
  ],
  reflectionPublic: false,

  /*
   * 만들기·검토 단계에서 캔바로 나가는 것은 활동 자체라 이탈로 세지 않는다.
   * 오늘은 친구 앱(캔바 링크)도 새 창으로 열어 본다 — 감상(gallery)도 면제에 넣는다.
   */
  focusExempt: ["build", "grill", "emotion", "worksheet", "gallery"],

  // 오늘도 캔바·친구 앱을 여러 번 드나든다. 돌아왔을 때 앞뒤 칸으로 오갈 수 있어야 한다
  freeNavigation: true,

  /*
   * 단계 이름.
   *
   * build → grill → gallery → emotion 순서는 types.ts 의 LESSON_PHASES 가 정한 차례
   * 그대로다. grill(검토 기준)을 감상(gallery) 바로 앞에 두어, 기준을 읽고 감상 탭으로
   * 넘어가게 한다. emotion 은 감상 뒤라 받은 피드백 반영 자리로 맞다.
   * grill·emotion 은 원래 다른 뜻의 칸이지만 화면 이름은 이 표가 정한다.
   */
  phaseLabels: {
    progress: "오늘 할 일",
    build: "이어가기 · 교사 피드백",
    grill: "동료 검토 기준",
    gallery: "친구 앱 검토",
    emotion: "받은 피드백 반영",
    reflection: "회고",
  },

  activity: {
    activityId: ACTIVITY_ID,
    // 그리기가 없는 활동. 장소를 비우면 그리기 화면이 안 뜬다
    places: [],
    year: 2026,
    worksheet: WORKSHEET,

    // 자료를 찾는 시간이 아니라 서로 보고 고치는 시간이라 출처 두 칸을 안 띄운다
    sourcesEnabled: false,

    /*
     * 동료 검토를 **연다.** 3·4차시에는 껐던 것을 오늘 제대로 켠다.
     * 이 값이 true 라야 서버가 감상 조회를 허락하고(student/gallery 라우트), 화면에
     * [앱 감상] 탭이 뜬다(lesson/page.tsx 의 canShare).
     */
    galleryEnabled: true,

    /*
     * 필수 배정을 **진짜 랜덤**으로 켠다 (기본은 학번순 순환 "cyclic").
     *
     * 이 분반은 여러 반이 섞여 있어, 학번순 순환이면 같은 반끼리 이어져 몰린다.
     * "random" 은 제출자 순서를 **세션마다 한 번** 결정적으로 섞은 뒤 같은 순환을 얹어,
     * 반이 섞이면서도(랜덤) 폴링마다 다시 섞이지 않고(안정), 모든 앱이 정확히 배정 수만큼
     * 배정된다(균등·전원 커버). 이 플래그를 안 켠 다른 차시는 기존 학번순 순환 그대로다
     * (gallery.ts 의 assignPeers · types.ts 의 PeerAssignMode).
     */
    peerAssign: "random",

    /*
     * 배정 편수를 **3편**으로 (기본 2). 아래 galleryAssignedOnly 와 함께 써서
     * "자유 선택 없이 배정된 3편만 검토" 가 된다. "내 뒤 3명" 순환이라 제출자가 4명
     * 이상이면 모든 앱이 정확히 세 번씩 배정된다 (균등·전원 커버).
     */
    peerCount: 3,

    /*
     * 배정된 3편만 감상에 노출한다 (기본 false = 전체 + 자유 선택).
     *
     * true 라 서버가 배정 편만 내려보내고(나머지는 응답·화면 어디에도 없다), 화면은
     * 자유 선택·필터·전체 둘러보기를 감춘다. 교사 확정: 자유 선택 없이 정해 준 3명만 본다.
     */
    galleryAssignedOnly: true,

    /*
     * 감상 화면에서 부르는 말. 그림이 아니라 앱이라 "앱" 으로 둔다 —
     * 탭이 "친구 앱 (n)" · "내 앱" · "앱 감상" 이 되어 무엇을 보러 가는지 그대로 읽힌다.
     */
    galleryNoun: "앱",

    /*
     * 친구에게 보여줄 답 칸을 딱 집는다 (privacy — 서버가 toCard 에서 거른다).
     *
     * **앱 주소(build_url) 하나만 연다.** 앱은 서로 눌러 열어 봐야 검토가 되므로 링크는
     * 보여야 한다 — build_url 은 URL 칸이라 카드에서 "눌러서 작품 보기" 로 뜨고, 눌러
     * 들어가면 실제 앱이 새 창으로 열린다(card-news).
     * 반대로 mvp_one·fix1·grill_a2 같은 **자기 성찰·기획 칸은 목록에 없으니 안 나간다.**
     * 익명은 그대로 유지한다(galleryShowNames 를 켜지 않는다).
     */
    galleryAnswerKeys: ["build_url"],

    /*
     * 친구 앱에 남기는 두 칸의 문구를 **좋은 점 · 개선할 점** 두 칸으로 바꾼다 (교사 확정).
     * 폼 필드 자체(gallery-view 의 FeedbackForm)는 그대로 두고 label·placeholder 만 바꾼다 —
     * 코드 변경 없이 재사용. 첫 칸은 좋은 점, 둘째 칸은 개선하면 좋을 점이다.
     * '찾은 기술/궁금한 점' 기본 문구는 앱 검토에 안 맞아 지운다.
     */
    feedbackPrompts: {
      found: {
        label: "좋은 점 한 가지 — 눌러 써 보고",
        placeholder: "예) 버튼을 누르니 진짜로 오늘 급식이 떠서 좋았어요",
      },
      question: {
        label: "개선하면 좋을 점 한 가지",
        placeholder: "예) 첫 화면에 무슨 앱인지 제목이 있으면 더 좋겠어요",
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (2·3·4차시와 같음 — 지난 시간에 낸 앱이 그대로 검토에 올라갑니다)`);
  console.log(`차시 번호 ${LESSON_NO} (정보과와 안 겹치게)`);
  console.log("단계: 대기(지뢰찾기) → 기분 → 오늘 할 일 → ①이어가기·교사 피드백(build) → ②동료 검토 기준(grill) → 친구 앱 검토(감상) → ③받은 피드백 반영(emotion) → 회고");
  console.log("  ※ 동료 검토는 gallery.ts 재사용: 배정한 3편만(자유 선택·전체 둘러보기 없음), 모든 앱 정확히 3번 배정 (peerCount 3 · galleryAssignedOnly).");
  console.log("  ※ 배정은 진짜 랜덤 (peerAssign: \"random\") — 세션 시드로 섞어 반 쏠림을 풀되 균등·안정·전원 커버 유지. 세 플래그 안 켠 다른 차시는 필수 2 + 자유 1 + 전체 그대로.");
  console.log("  ※ 피드백 폼은 좋은 점·개선할 점 두 칸 (feedbackPrompts) — 폼 필드 자체는 그대로.");
  console.log("  ※ 친구에게 보이는 칸은 build_url(앱 주소) 하나뿐 (galleryAnswerKeys) — 자기 성찰·기획 칸은 안 나갑니다. 익명 유지.");
  console.log("  ※ 교사 피드백은 teacher/pre-review 에서 각 학생 teacherFeedback.note 를 미리 채워 두세요 (build 화면에 바로 뜹니다).");
  console.log("서로 구경하기를 켰습니다 (galleryEnabled: true). 40분 흐름 — 5/14/12분 배분, ‘다 못 해도 괜찮다’ 톤.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
