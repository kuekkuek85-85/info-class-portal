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
      "아래 [캔바 열기] 를 누르고 [Microsoft로 계속하기] 를 고르세요.\n" +
      "내 학교 계정은 아래 칸에 있어요. [복사하기] 를 눌러 그대로 붙여 넣으면 됩니다.\n" +
      "비밀번호는 학교 계정 비밀번호예요.\n\n" +
      "이럴 때는 이렇게 하세요\n" +
      "· 다른 계정으로 이미 로그인돼 있다 → 로그아웃하고 위 주소로 다시\n" +
      "· 비밀번호가 기억 안 난다 → 손을 드세요. 혼자 시도해도 안 풀립니다\n" +
      "· 팀에 들어갈지 물어본다 → [참여] 를 누르세요\n" +
      "· 화면이 안 넘어간다 → 30초는 기다려 보고, 그래도 그대로면 손을 드세요",
    kind: "note",
    // 학생마다 자기 계정 주소가 복사된다 (worksheet-view 의 named 가 치환한다)
    copyText: "{학교계정}",
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

  /*
   * ── 살펴보기 세 번 ─────────────────────────────────────
   *
   * 관점이 안에서 바깥으로 넓어진다 — 내 눈 → 기계의 눈 → 어른의 눈.
   * 라운드마다 **고친 것을 한 줄 적는다.** 적게 하지 않으면 "봤다" 로 끝나고,
   * 무엇을 고쳤는지는 학생 자신도 다음 시간에 기억하지 못한다.
   *
   * 단계 셋을 담을 자리.
   *
   * 「뽑기(build)」 뒤에서 활동지를 띄울 수 있는 칸은 셋이고, 목록에 박힌 차례가
   * **grill → worksheet → emotion** 이다 (types.ts 의 LESSON_PHASES).
   * 그 차례대로 1·2·3차를 얹는다 — 되돌아가기 목록과 교사 단추가 이 순서를 따르므로,
   * 뒤집어 넣으면 학생 화면에 3차가 2차보다 앞에 뜬다. 실제로 한 번 그렇게 넣었다가
   * 리허설에서 잡았다.
   *
   * worksheet 과 emotion 은 원래 다른 차시가 쓰는 칸이다(정보과 활동지, 마음 톡톡의
   * 감정 렌즈). 이름이 하는 일과 안 맞지만 그 칸은 문항을 담는 그릇일 뿐이고 화면
   * 이름은 phaseLabels 가 정한다. 새 단계를 만드는 것이 더 큰 변경이라 이쪽을 골랐다.
   *
   * 3차를 emotion 에 두는 이유가 하나 더 있다. 제출 단추와 출처 칸은 **그 차시가 쓰는
   * STEP_PHASES 중 마지막**에 붙는데(lesson/page.tsx 의 lastStepPhase), 그 목록에
   * worksheet 은 없고 emotion 은 있다. 3차를 worksheet 에 두면 제출 단추가 2차 화면에
   * 붙어 학생이 중간에 끝낸다.
   */

  // ── 1차 살펴보기 · 내 눈 (grill) ───────────────────────
  {
    key: "_r1_note",
    phase: "grill",
    label: "1차 — 내 눈으로 보기",
    hint:
      "만든 화면을 띄워 놓고, 내가 쓰려던 것과 견줘 보세요.\n" +
      "아래에 지난 시간에 적은 ‘만들려던 것’ 과 ‘꼭 필요한 기능’ 이 있어요. 그것과 화면을 하나씩 맞춰 봅니다.\n" +
      "찾기만 하는 게 아니라, 오늘 한 가지는 실제로 고칩니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_r1_recap",
    phase: "grill",
    /*
     * 견줄 대상을 옆에 편다.
     *
     * "생각한 것과 어디가 다른가" 를 물으려면 생각한 것이 눈앞에 있어야 한다.
     * 기억으로 답하게 하면 화면에 있는 것만 보고 "잘 된 것 같아요" 로 끝난다.
     * 프롬프트까지 넣는 이유: 안 나온 기능이 애초에 프롬프트에 없었던 경우가 많다.
     */
    label: "",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "build_url", label: "내가 만든 화면" },
      { key: "mvp_one", label: "내가 만들려던 것" },
      { key: "mvp_must1", label: "꼭 필요한 기능 ①" },
      { key: "mvp_must2", label: "꼭 필요한 기능 ②" },
      { key: "mvp_must3", label: "꼭 필요한 기능 ③" },
      { key: "build_prompt", label: "캔바에 넣은 프롬프트" },
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
    label: "내가 만들려던 것과 어디가 다른가요?",
    hint:
      "위의 ‘꼭 필요한 기능’ 과 화면을 하나씩 맞춰 보세요.\n" +
      "예) 날짜를 누르는 칸이 아예 없어요 / 알레르기 표시가 안 나와요",
    kind: "long",
    maxLength: 200,
  },
  {
    key: "fix1",
    phase: "grill",
    /*
     * 라운드마다 이 칸이 하나씩 있다.
     *
     * "고쳤다" 가 아니라 "무엇을 어떻게" 를 적게 한다. 한 줄이라도 적고 나면
     * 다음 라운드에서 같은 것을 또 고치지 않고, 회고에서 쓸 재료가 남는다.
     */
    label: "고친 것 한 가지 — 무엇을 어떻게 고쳤나요?",
    hint:
      "캔바로 가서 실제로 고치고 오세요. 프롬프트를 고쳐 다시 만들어도 되고, 화면을 직접 손봐도 됩니다.\n" +
      "예) 날짜 고르는 칸이 없어서 프롬프트에 ‘날짜를 고르는 달력’ 을 넣고 다시 만들었어요",
    kind: "long",
    maxLength: 200,
  },

  // ── 2차 살펴보기 · 기계의 눈 (worksheet 칸을 빌려 쓴다) ─
  {
    key: "_r2_note",
    phase: "worksheet",
    label: "2차 — AI의 눈으로 보기",
    hint:
      "이번엔 내가 못 본 것을 AI에게 물어봅니다.\n" +
      "AI는 점수를 매기지 않아요. 질문만 세 개 합니다 — 답은 내가 찾는 겁니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_r2_recap",
    phase: "worksheet",
    label: "",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "build_url", label: "내가 만든 화면" },
      { key: "fix1", label: "1차에서 고친 것" },
    ],
    maxLength: 0,
  },
  {
    key: "ai_review",
    phase: "worksheet",
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
      { key: "fix1", label: "1차에서 이미 고친 것" },
    ],
  },
  {
    key: "fix2",
    phase: "worksheet",
    label: "고친 것 한 가지 — AI 질문을 보고 무엇을 고쳤나요?",
    hint:
      "세 질문 중 제일 뜨끔한 것 하나만 고르면 됩니다. 세 개 다 안 해도 돼요.\n" +
      "예) ‘처음 보는 사람이 쓸 수 있나’ 를 보고, 버튼 이름을 ‘확인’ 에서 ‘오늘 급식 보기’ 로 바꿨어요",
    kind: "long",
    maxLength: 200,
  },

  // ── 3차 살펴보기 · 어른의 눈 (emotion 칸을 빌려 쓴다) ───
  {
    key: "_r3_note",
    phase: "emotion",
    label: "3차 — 선생님의 눈으로 보기",
    hint:
      "선생님이 돌아다니며 화면을 보고 한마디 남깁니다.\n" +
      "아직 안 왔으면 기다리는 동안 1·2차에서 못 고친 것을 더 고쳐도 좋아요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_r3_recap",
    phase: "emotion",
    label: "",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "build_url", label: "내가 만든 화면" },
      { key: "fix1", label: "1차에서 고친 것" },
      { key: "fix2", label: "2차에서 고친 것" },
    ],
    maxLength: 0,
  },
  {
    key: "_r3_teacher",
    phase: "emotion",
    /*
     * 선생님 말이 학생 화면에 닿는 유일한 통로다.
     *
     * 작품 목록의 두 칸짜리 서식은 **친구 작품 보기용**이라, 서로 구경하기를 끈
     * 이 차시에서는 써 넣어도 학생 화면에 나올 자리가 없다. 이 문항이 있으면
     * 교사 화면이 한 칸짜리 서식으로 바뀌고, 그 값이 여기로 온다
     * (teacher-note-panel · teacher/artifacts 의 hasSubmit 판정).
     */
    label: "선생님이 남긴 말",
    hint: "",
    kind: "teacher_note",
    maxLength: 0,
  },
  {
    key: "fix3",
    phase: "emotion",
    label: "고친 것 한 가지 — 선생님 말을 보고 무엇을 고쳤나요?",
    hint: "예) ‘이 버튼 눌렀는데 아무 일도 안 일어나던데?’ 라고 하셔서, 버튼에 메뉴가 뜨게 고쳤어요",
    kind: "long",
    maxLength: 200,
  },
  {
    key: "will_fix",
    phase: "emotion",
    /*
     * 이 한 줄이 4차시 첫 화면에 뜬다. 빈 종이에서 다음 시간을 시작하지 않게 하는 장치다.
     * 2차시에는 아무도 여기까지 못 왔다 (0/23) — 오늘은 반드시 채우고 끝낸다.
     */
    label: "다음 시간에 고치거나 더할 것 한 가지는?",
    hint:
      "이 줄은 다음 시간 화면 맨 위에 그대로 뜹니다. 나에게 남기는 쪽지예요.\n" +
      "오늘 못 고친 것을 적어도 좋아요.",
    kind: "text",
    maxLength: 80,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "인간과 인공지능 3차시 — 오늘은 반드시 뽑는다",

  /*
   * 기분 체크를 켠다.
   *
   * 2차시에는 껐다 — 정보과에서 한 학기 내내 하는 활동이라 같은 학생이 화요일에 또
   * 만나면 성의껏 안 고른다는 이유였다. 선생님이 앞에 넣기로 정하셔서 켠다.
   * 매일 하는 루틴이라는 쪽이 더 무겁다.
   */
  moodCheckEnabled: true,

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
      "① 뽑기 — 캔바에서 내 화면 뽑고 링크 내기. 오늘 반드시\n" +
      "② 1차 살펴보기 — 내 눈으로. 만들려던 것과 견줘 보고 한 가지 고치기\n" +
      "③ 2차 살펴보기 — AI의 눈으로. 질문 세 개를 받고 한 가지 고치기\n" +
      "④ 3차 살펴보기 — 선생님의 눈으로. 남긴 말을 보고 한 가지 고치기\n\n" +
      "살펴보기는 세 번 다 같은 모양이에요 — 보고, 한 가지 고치고, 무엇을 고쳤는지 적습니다.\n" +
      "세 번 다 못 해도 괜찮습니다. 한 번이라도 제대로 고치는 게 낫습니다.\n\n" +
      "오늘 뽑는 화면도 허접할 거예요. 그게 정상입니다.\n" +
      "왜 허접한지 찾아내는 것이 오늘의 진짜 과제예요.",
    url: "",
  },
  assessment: empty(),
  video: empty(),

  /*
   * 오늘의 메타 학습은 "검토는 여러 사람에게 받는 것" 이다.
   * 세 눈을 견주게 해야 그것이 활동이 아니라 말로 남는다.
   */
  reflectionQuestions: [
    "바로 만들지 않고 여러 번 검토받았습니다. 오늘 느낀 점이 있나요?",
  ],
  reflectionPublic: false,

  /*
   * 만들기와 검토 단계는 이탈로 세지 않는다.
   *
   * 캔바로 나가서 뽑아 오는 것이 활동 자체다. 그걸 이탈로 세면 기록이 온통 빨갛게
   * 되고 아무 의미가 없다. 더 나쁜 것은 학생이 눈치를 보느라 안 나가는 것이다.
   */
  focusExempt: ["build", "grill", "emotion", "worksheet"],

  /*
   * 학생이 단계를 오갈 수 있게 한다.
   *
   * 오늘은 캔바를 여러 번 드나든다. 돌아왔을 때 교사가 넘긴 단계에 갇혀 있으면
   * 링크를 넣을 칸으로 돌아갈 수가 없다. 이미 뽑아 둔 네 명이 앞서 나가는 것도
   * 이 설정으로 열린다.
   */
  freeNavigation: true,

  /*
   * 단계 이름.
   *
   * worksheet 과 emotion 은 원래 다른 차시가 쓰는 칸이다 (정보과의 활동지, 마음 톡톡의
   * 감정 렌즈). 여기서는 살펴보기 2·3차를 담는 그릇으로만 쓰고, 학생과 교사가 보는
   * 이름은 이 표가 정한다. 목록에 박힌 차례가 grill → worksheet → emotion 이라
   * 화면 순서와 되돌아가기가 그대로 맞는다.
   */
  phaseLabels: {
    progress: "오늘 할 일",
    build: "뽑기",
    grill: "1차 살펴보기 · 내 눈",
    worksheet: "2차 살펴보기 · AI의 눈",
    emotion: "3차 살펴보기 · 선생님의 눈",
    reflection: "회고",
  },

  activity: {
    activityId: ACTIVITY_ID,
    // 그리기가 없는 활동. 장소를 비우면 그리기 화면이 안 뜬다
    places: [],
    year: 2026,
    worksheet: WORKSHEET,

    /*
     * 출처 두 칸을 안 띄운다.
     *
     * 그 칸은 수행평가1의 "출처 밝히기 태도" 때문에 고정으로 붙어 있는 것이다(PRD 7).
     * 오늘 하는 일은 자료를 찾는 것이 아니라 만든 것을 고치는 것이라, 마지막 단계마다
     * 안 쓰는 상자를 하나 더 지나게 된다.
     */
    sourcesEnabled: false,

    /*
     * 서로 구경하기를 끈다.
     *
     * 40분에 뽑기와 살펴보기 세 번이 들어간다. 넷째 관점을 얹을 자리가 없다.
     * 링크가 다 모이면 다음 시간에 제대로 연다.
     *
     * **끄는 자리가 여기인 것이 중요하다.** 화면에서 탭만 감추면 주소를 직접 치는
     * 것으로 열리고, 그러면 아직 못 뽑은 학생의 빈 화면이 반 전체에 보인다.
     * 이 값이 false 면 서버가 갤러리 조회 자체를 거절한다 (student/gallery 라우트).
     *
     * 이 값을 끄면 교사가 작품 목록에서 쓰는 두 칸짜리 서식은 갈 곳이 없어진다.
     * 그래서 3차 살펴보기에 teacher_note 문항을 두었다 — 그 문항이 있으면 교사 화면이
     * 한 칸짜리 서식으로 바뀌고, 그 말이 학생 화면에 뜬다.
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (2차시와 같음 — 지난 시간 답이 그대로 열립니다)`);
  console.log(`차시 번호 ${LESSON_NO} (정보과와 안 겹치게)`);
  console.log("단계: 대기 → 기분 → 오늘 할 일 → 뽑기 → 1차(내 눈) → 2차(AI) → 3차(선생님) → 회고");
  console.log("  ※ 2차는 worksheet 칸, 3차는 emotion 칸을 빌려 씁니다 (이름은 phaseLabels 가 정함)");
  console.log("AI 검토는 질문 3개. 실패하면 고정 질문 3개로 내려갑니다 (학생 화면에는 표시 안 됨).");
  console.log("서로 구경하기는 껐습니다 (galleryEnabled: false).");
  console.log("교사 피드백은 작품 목록의 한 칸짜리 서식으로 쓰면 3차 화면에 뜹니다.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
