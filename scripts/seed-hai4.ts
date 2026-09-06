/**
 * 「인간과 인공지능」(진로탐색 선택과목) 4차시.
 *
 *   node --env-file=.env.local scripts/seed-hai4.ts
 *
 * ## 이 차시가 노리는 것 — 기다림을 없앤다
 *
 * 3차시의 마지막 라운드는 "선생님의 눈"이었다. 교사가 스물두 명을 돌며 한마디씩
 * 남기는데, 그 말이 도착할 때까지 학생은 화면 앞에서 기다린다. 스물두 명이면 뒤에
 * 앉은 학생은 한참을 논다.
 *
 * 그래서 4차시는 **피드백을 수업 전에 미리 써 둔다.** 교사가 각 작품
 * (hai-2026-1기__학번)의 `teacherFeedback.note` 에 미리 피드백을 넣어 두면
 * (teacher/pre-review 화면), 수업이 열리는 순간 학생 화면에 그 말이 이미 떠 있다.
 * 3차시가 쓴 teacher_note 문항이 읽는 곳이 바로 그 칸이라, 통로를 그대로 재사용한다
 * (teacher-note-panel → /api/student/submit 의 teacherFeedback).
 *
 * ## 활동 ID 를 2·3차시와 같게 둔다
 *
 * 같은 `artifacts` 문서를 이어 쓴다. 3차시에 뽑은 링크(build_url), 프롬프트,
 * "다음 시간에 고칠 것"(will_fix)이 오늘 화면에 그대로 열린다. 열쇠가 같으면
 * 그 칸이 곧 그 답이다.
 *
 * ## 오늘의 진짜 재료 — Canva 시트로 저장한다
 *
 * 많은 아이디어가 "신청을 받는다 / 기록을 쌓는다 / 외부 정보를 불러온다" 인데,
 * Canva 코드 앱은 폼(입력칸)이 있으면 뒤에 '캔바 시트'가 자동으로 연결돼 넣은 내용을
 * 진짜로 저장한다. 그래서 오늘의 핵심 기술 메시지는 **"신청·기록은 캔바 시트로 진짜
 * 저장하라 — 프롬프트에 저장·불러오기를 또렷이 적어라"** 이다. 여기에 더해 키 없이 되는
 * 진짜 무료 API(Open-Meteo 날씨)도 하나 알려 준다. 단, 앱을 여는 누구나 데이터를 보므로
 * 개인정보는 넣지 않는다. 이 둘을 읽고 무엇을 어떻게 고칠지 스스로 정하게 한다.
 *
 * ## 세션은 열지 않는다
 *
 * 이 스크립트는 차시 계획(LessonPlan)만 짓는다. 학생에게 노출되는 것은 교사가
 * 흐름을 검토한 뒤 세션을 열 때다. 이미 열어 둔 scheduled 세션에는 반영하고,
 * 진행 중이거나 끝난 세션은 건드리지 않는다 (seed-hai3 와 같은 안전장치).
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

/** 저장소가 공개라 캔바 초대 주소는 .env.local 에서만 읽는다 (seed-hai3 와 같은 이유) */
const CANVA_INVITE_URL = process.env.CANVA_INVITE_URL ?? "";
const CANVA_BY_GROUP: Record<string, string> = {
  "hai-tue-1": process.env.CANVA_INVITE_TUE_1 ?? "",
  "hai-tue-2": process.env.CANVA_INVITE_TUE_2 ?? "",
  "hai-thu-1": process.env.CANVA_INVITE_THU_1 ?? "",
  "hai-thu-2": process.env.CANVA_INVITE_THU_2 ?? "",
};

/** ★ 2·3차시와 같은 값. 이 값이 같아야 지난 시간에 뽑은 링크·프롬프트가 오늘 화면에 열린다 */
const ACTIVITY_ID = "hai-2026-1기";
/** 차시 번호가 정보과와 겹치므로 100번대로 띄운다 (2차시 102, 3차시 103) */
const LESSON_NO = 104;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const WORKSHEET: WorksheetQuestion[] = [
  /*
   * ── ① 선생님이 남긴 말 (build 칸) ─────────────────────────
   *
   * 로그인을 맨 위에 둔다 — 3차시와 같은 이유다. 제일 오래 걸리는 일을 먼저 누르게
   * 하고, 캔바가 뜨는 동안 아래(지난 시간 회상 → 선생님 피드백)를 읽힌다. 오늘도
   * 캔바로 들어가서 고쳐 와야 하므로 로그인은 그대로 필요하다.
   */
  {
    key: "_l4_login",
    phase: "build",
    label: "① 캔바에 다시 들어가기 — 먼저 눌러 두세요",
    hint:
      "아래 [캔바 열기] 를 누르고 [Microsoft로 계속하기] 를 고르세요.\n" +
      "내 학교 계정은 아래 칸에 있어요. [복사하기] 를 눌러 그대로 붙여 넣으면 됩니다.\n" +
      "비밀번호는 학교 계정 비밀번호예요.\n\n" +
      "지난 시간에 만든 화면은 캔바에 그대로 저장돼 있어요 — 오늘은 그걸 열어 고칩니다.\n" +
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
    key: "_l4_recap",
    phase: "build",
    /*
     * 지난 시간 끝에 자기에게 남긴 쪽지(will_fix)를 편다.
     *
     * 3차시 마지막 문항이 "다음 시간에 고치거나 더할 것 한 가지"였고, 그 값이 여기
     * 그대로 있다. 일주일이 지나 무엇을 하려 했는지 기억하지 못하는 학생에게 자기
     * 글씨로 된 출발점을 준다.
     */
    label: "지난 시간에 나에게 남긴 쪽지",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "will_fix", label: "다음 시간에 고치려고 적어 둔 것" },
      { key: "mvp_one", label: "내가 만들려던 것" },
      { key: "build_url", label: "지난 시간에 뽑은 화면" },
    ],
    maxLength: 0,
  },
  {
    key: "_l4_feedback_intro",
    phase: "build",
    /*
     * 이 안내가 있어야 아래 teacher_note 가 "왜 벌써 떠 있지?" 로 안 읽힌다.
     * 3차시에는 선생님이 그 자리에서 돌며 썼지만, 오늘은 미리 써 둔 것을 바로 본다.
     */
    label: "② 선생님이 미리 봐 두었어요",
    hint:
      "지난 시간에 만든 화면을 선생님이 수업 전에 하나씩 눌러 보고 한마디씩 남겨 두었어요.\n" +
      "그래서 오늘은 기다릴 필요가 없습니다 — 아래에 이미 떠 있어요.\n" +
      "이 말이 오늘 고칠 거리의 출발점입니다. 캔바가 열리는 동안 읽어 두세요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_r4_teacher",
    phase: "build",
    /*
     * 선생님이 미리 써 둔 피드백이 학생 화면에 닿는 통로.
     *
     * 화면이 /api/student/submit 을 조회해 artifact.teacherFeedback.note 를 그린다
     * (teacher-note-panel). 그 칸은 teacher/pre-review 화면이 수업 전에 채워 둔다.
     * 갤러리를 껐으므로 교사 작품 목록도 이 문항이 있을 때 한 칸짜리 서식으로 바뀐다
     * (teacher-artifact-panel 의 hasSubmit 판정) — 수업 중 보충 피드백도 여기로 온다.
     */
    label: "선생님이 남긴 말",
    hint: "",
    kind: "teacher_note",
    maxLength: 0,
  },

  /*
   * ── ② 무엇을 어떻게 고칠까 (grill 칸) ──────────────────────
   *
   * 바로 캔바로 보내지 않는다. 먼저 "무엇이 안 되는지"를 알아야 고칠 수 있다.
   * 여기서 오늘의 기술 메시지 둘을 읽히고, 그걸 바탕으로 고칠 것을 한 줄 정하게 한다.
   */
  {
    key: "_l4_tip_save",
    phase: "grill",
    /*
     * 오늘의 핵심 팁.
     *
     * Canva 코드 앱은 폼(입력칸)이 있으면 뒤에 '캔바 시트'가 자동으로 연결돼, 넣은 내용이
     * 거기에 저장된다. 그래서 신청·기록·순위처럼 쌓이는 것이 새로고침해도 남고 다시
     * 불러올 수 있다. 프롬프트에 "저장하고, 다시 열면 불러와 보여줘"를 또렷이 적는 것이 핵심이다.
     * 단, 앱을 여는 누구나 그 데이터를 보므로 개인정보는 넣지 않는다 — 이 과목의 1순위 가치와 맞물린다.
     */
    label: "고치기 팁 ① — 신청·기록은 ‘캔바 시트’ 로 진짜 저장돼요",
    hint:
      "Canva 코드 앱은 입력칸(폼)이 있으면 뒤에 ‘캔바 시트’ 가 저절로 연결돼요.\n" +
      "그래서 사람들이 넣은 내용을 진짜로 저장할 수 있어요 — 신청·기록·순위표처럼 쌓이는 것도요.\n\n" +
      "프롬프트에 저장과 불러오기를 또렷하게 적어 보세요:\n" +
      "· ‘신청한 내용을 저장하고, 다시 열면 지난 신청 목록을 불러와서 보여줘’\n" +
      "· ‘기록을 저장해서, 다음에 열 때 지난 기록이 그대로 남아 있게 해줘’\n\n" +
      "⚠️ 앱을 여는 사람은 누구나 그 내용을 볼 수 있어요. 이름·연락처 같은 개인정보는 넣지 마세요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_l4_tip_api",
    phase: "grill",
    /*
     * 저장(팁①)에 더해, 바깥 정보도 키 없이 진짜로 불러올 수 있음을 보여준다.
     * Open-Meteo 는 가입도 API 키도 없이 날씨를 준다 — 중1이 프롬프트에 붙일 수 있는
     * 거의 유일한 예다. copyText 로 주소를 그대로 복사하게 둔다.
     */
    label: "고치기 팁 ② — 바깥 정보도 불러올 수 있어요 (날씨)",
    hint:
      "저장뿐 아니라 바깥 정보도 가져올 수 있어요. 날씨는 가입도 키도 없이 진짜로 불러와져요.\n" +
      "‘Open-Meteo 라는 무료 날씨 API로 오늘 우리 지역 날씨를 불러와서 보여줘’ 라고\n" +
      "프롬프트에 넣어 보세요. 아래 주소를 함께 붙여 주면 더 잘 됩니다.",
    kind: "note",
    // 주소는 손으로 옮겨 적기 어려우니 그대로 복사하게 둔다
    copyText: "https://open-meteo.com/",
    maxLength: 0,
  },
  {
    key: "_l4_plan_recap",
    phase: "grill",
    label: "",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "will_fix", label: "지난 시간에 고치려던 것" },
      { key: "fix3", label: "3차시에 선생님 말을 보고 고친 것" },
    ],
    maxLength: 0,
  },
  {
    key: "fix_plan",
    phase: "grill",
    /*
     * 캔바로 가기 전에 계획을 한 줄 못 박는다. 백지로 캔바에 들어가면 이것저것
     * 만지다 시간을 다 쓴다. "선생님 말 + 위 두 팁" 을 재료로 하나만 정하게 한다.
     */
    label: "오늘 고칠 것을 한두 가지만 정해 보세요",
    hint:
      "선생님이 남긴 말과 위 두 팁을 보고, 오늘 실제로 고칠 것을 정합니다.\n" +
      "예) 신청한 내용이 저장돼서, 다시 열어도 목록에 남아 있게 하겠다\n" +
      "예) ‘확인’ 버튼 이름을 ‘오늘 급식 보기’ 로 바꾸겠다\n" +
      "예) 날씨 API를 붙여서 진짜 오늘 날씨가 뜨게 하겠다",
    kind: "long",
    maxLength: 200,
  },

  /*
   * ── ③ 고치고 다시 내기 (emotion 칸) ───────────────────────
   *
   * emotion 은 이 차시가 쓰는 STEP_PHASES 중 마지막이라, 제출·출처 칸이 붙는다면
   * 여기 붙는다 (lesson/page.tsx 의 lastStepPhase). 오늘은 제출 문항이 없고
   * sourcesEnabled 도 꺼 두어 실제로 붙는 것은 없지만, 마지막 작업 단계를 여기
   * 두는 것이 3차시와 같은 자리라 학생 화면·되돌아가기 순서가 그대로 맞는다.
   */
  {
    key: "_l4_fix_note",
    phase: "emotion",
    label: "③ 캔바로 가서 실제로 고쳐 오세요",
    hint:
      "위에서 정한 것을 캔바에서 실제로 고칩니다. 프롬프트를 고쳐 다시 만들어도 되고,\n" +
      "화면을 직접 손봐도 됩니다.\n" +
      "다 고쳤으면 오른쪽 위 [게시] 를 다시 눌러 새 주소를 받으세요.\n" +
      "주소가 그대로여도 괜찮아요 — 게시를 다시 하면 고친 내용이 반영됩니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_l4_fix_recap",
    phase: "emotion",
    label: "",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "fix_plan", label: "오늘 고치기로 정한 것" },
      { key: "build_url", label: "지금 화면 주소" },
    ],
    maxLength: 0,
  },
  {
    key: "build_url",
    phase: "emotion",
    /*
     * 2·3차시와 같은 키. 지난 링크가 이미 채워져 있고, 주소가 바뀌었으면 새 주소로
     * 덮어쓴다. 같은 작품 문서라 다음 시간(5차시 동료 검토)에 이 최신 주소가 열린다.
     */
    label: "고친 화면 링크 — 주소가 바뀌었으면 새 주소로 바꿔 주세요",
    hint: "지난 시간 주소가 이미 들어 있어요. 게시를 다시 해서 주소가 바뀌었으면 새것으로 고치세요.",
    kind: "text",
    maxLength: 300,
  },
  {
    key: "fix4",
    phase: "emotion",
    label: "오늘 무엇을 어떻게 고쳤나요?",
    hint:
      "한 줄이면 됩니다. 다 못 고쳤으면 어디까지 했는지 적어도 돼요.\n" +
      "예) 신청한 내용이 캔바 시트에 저장돼서, 다시 열어도 목록이 남아 있게 했어요",
    kind: "long",
    maxLength: 200,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "인간과 인공지능 4차시 — 피드백 받고 고치기",

  // 3차시에서 켠 기분 체크를 이어 간다 (매일 하는 루틴)
  moodCheckEnabled: true,

  // 분반은 2·3차시와 같은 값을 유지한다. 바꾸면 데이터 통이 갈려 지난 답이 안 열린다
  groups: [
    { key: "hai-tue-1", label: "화요일 1기", classNo: 1 },
    { key: "hai-tue-2", label: "화요일 2기", classNo: 2 },
    { key: "hai-thu-1", label: "목요일 1기", classNo: 3 },
    { key: "hai-thu-2", label: "목요일 2기", classNo: 4 },
  ],

  game: {
    heading: "기다리는 동안 — 한붓그리기",
    body:
      "선을 한 번도 떼지 않고, 같은 길을 두 번 지나지 않게 모든 선을 그려 보세요.\n" +
      "점과 점을 이으면 됩니다. 막히면 다시 시작할 수 있어요.",
    url: "https://euler-path-game.vercel.app/",
  },
  gameExplainer: empty(),

  progress: {
    heading: "오늘 할 일",
    body:
      "지난 시간에 각자 화면을 하나씩 뽑았어요. 오늘은 그걸 고쳐서 더 나은 것으로 만듭니다.\n\n" +
      "다음 화면이 뜨면 맨 위 [캔바 열기] 를 먼저 누르세요. 지난 시간에 만든 화면은 캔바에 그대로 있어요.\n\n" +
      "① 선생님이 남긴 말 — 수업 전에 선생님이 여러분 화면을 보고 미리 써 두었어요. 바로 떠 있습니다\n" +
      "② 무엇을 고칠까 — 고치기 팁 두 개를 읽고, 오늘 고칠 것을 정하기\n" +
      "③ 고치고 다시 내기 — 캔바에서 실제로 고치고, 무엇을 고쳤는지 적기\n\n" +
      "오늘의 큰 팁 하나: 캔바에는 ‘캔바 시트’ 가 있어서, 신청·기록처럼 쌓이는 데이터를\n" +
      "DB처럼 저장할 수 있어요. 자세한 건 안에서 설명해요.",
    url: "",
  },
  assessment: empty(),
  video: empty(),

  /*
   * 오늘의 메타 학습은 "만든 것은 고쳐 가며 나아진다" 이다.
   * 처음 뽑은 것과 오늘 것을 견주게 한다.
   *
   * ※ 정확한 문구는 교사가 확정 — 아래는 합리적 기본값이다.
   */
  reflectionQuestions: [
    "처음 뽑았을 때와 지금을 견주면, 무엇이 가장 좋아졌나요? 그리고 아직 아쉬운 것 하나는?",
  ],
  reflectionPublic: false,

  // 만들기·검토 단계에서 캔바로 나가는 것은 활동 자체라 이탈로 세지 않는다 (3차시와 같음)
  focusExempt: ["build", "grill", "emotion", "worksheet"],

  // 오늘도 캔바를 여러 번 드나든다. 돌아왔을 때 앞뒤 칸으로 오갈 수 있어야 한다
  freeNavigation: true,

  /*
   * 단계 이름.
   *
   * grill 과 emotion 은 원래 다른 뜻의 칸이지만(검증·감정 렌즈), 여기서는 4차시의
   * 흐름을 담는 그릇으로만 쓰고 화면 이름은 이 표가 정한다. 목록에 박힌 차례가
   * build → grill → emotion 이라 학생 화면 순서와 되돌아가기가 그대로 맞는다
   * (types.ts 의 LESSON_PHASES · lesson/page.tsx 의 STEP_PHASES).
   */
  phaseLabels: {
    progress: "오늘 할 일",
    build: "선생님이 남긴 말",
    grill: "무엇을 고칠까",
    emotion: "고치고 다시 내기",
    reflection: "회고",
  },

  activity: {
    activityId: ACTIVITY_ID,
    // 그리기가 없는 활동. 장소를 비우면 그리기 화면이 안 뜬다
    places: [],
    year: 2026,
    worksheet: WORKSHEET,

    // 자료를 찾는 시간이 아니라 만든 것을 고치는 시간이라 출처 두 칸을 안 띄운다 (3차시와 같음)
    sourcesEnabled: false,

    /*
     * 서로 구경하기는 아직 끈다.
     *
     * 동료 검토는 5차시에서 제대로 연다. 오늘은 선생님 피드백을 받고 고치는 데
     * 집중한다. 이 값이 false 면 서버가 갤러리 조회 자체를 거절하고
     * (student/gallery 라우트), 교사 작품 목록은 teacher_note 문항이 있을 때
     * 한 칸짜리 피드백 서식으로 바뀐다.
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (2·3차시와 같음 — 지난 시간에 뽑은 링크가 그대로 열립니다)`);
  console.log(`차시 번호 ${LESSON_NO} (정보과와 안 겹치게)`);
  console.log("단계: 대기 → 기분 → 오늘 할 일 → ①선생님 말(build) → ②무엇을 고칠까(grill) → ③고치고 다시 내기(emotion) → 회고");
  console.log("  ※ build 에 teacher_note 를 두어, 미리 써 둔 피드백이 수업 시작과 함께 바로 뜹니다.");
  console.log("  ※ 교사는 수업 전에 teacher/pre-review 에서 각 학생 teacherFeedback.note 를 채워 두세요.");
  console.log("서로 구경하기는 껐습니다 (galleryEnabled: false) — 동료 검토는 5차시.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
