/**
 * 「디지털 마음 톡톡」 8회기 (마지막) — 나를 들여다보기 · 마음 건강 · 전체 돌아보기.
 *
 *   node --env-file=.env.local scripts/seed-mt8.ts
 *
 * ## 무엇인가 — 학기를 닫는 마무리 회기
 *
 * 교사 구성안을 포털 기능으로 옮긴 것이다. 네 묶음 + 성찰로 짠다:
 *   ① 나의 뇌구조 그리기   — 포털 내장 그림판(DrawBoard)으로 '상황→감정→색·크기' 표현
 *   ② 나의 행복?           — 영상 시청 + 가치관·행복한 삶·노력·나에게 보내는 응원
 *   ③ 마음 건강            — 자가진단(외부 링크) · 인생 그래프 · 마음건강 OX · 실천방안 · 도움 요청
 *   ④ 성찰(포트폴리오)     — 지난 8주 활동을 떠올리며 그때의 마음 적기
 *   ⑤ 마음일기             — 전체 수업 후기·배운 점·앞으로의 다짐
 *   → 다 하면 보상으로 테트리스(rewardGame).
 *
 * ## ★ 프라이버시 (이 과목 1순위) — 전면 비공개
 *
 * 뇌구조·인생 그래프·마음 건강·자가진단 소감은 전부 마음 이야기라 **친구에게 안 나간다.**
 *   · galleryEnabled: false  — 서버 갤러리 라우트가 응답 자체를 막는다(화면뿐 아니라 데이터로도 안 샘).
 *   · galleryAnswerKeys: []  — 켜져 있지 않으므로 빈 목록이 위험하지 않다(열기 스크립트가 false 를 재확인).
 *   · reflectionPublic: false — 마음일기는 각자에게만.
 * AI(Gemini)로 보내는 기능은 이 회기에 **하나도 넣지 않았다** — 감정 렌즈·챗봇 같은 것을 뺐다.
 * 마음 건강 자가진단 결과(민감정보)는 **포털에 저장하지 않는다** — 외부 사이트에서 각자 보기만 한다.
 *
 * ## ★ 위기/민감 — 안전장치를 활동 안에 녹였다
 *
 * '마음이 힘들 때 도움 요청하기' 묶음에 상담 창구(담임·상담선생님·부모님·1388·109 등)를 note 로
 * 박아 두고, OX 한 문항은 '친구가 죽고 싶다고 하면 꼭 어른에게 알린다'(정답)로 또래 위기 대응을
 * 가르친다. 학생 글을 AI로 보내는 곳이 없어 checkCrisis 호출 지점도 없다(보낼 데가 없으므로 샐 데도 없음).
 *
 * ## ★ 그림판 둘 — 배경만 다르게 (교사 지시 반영)
 *
 * 뇌구조·인생 그래프를 **둘 다 그림판**으로 한다. 작품(artifact)은 활동당 하나(activityId__학번)
 * 만 저장되므로, 두 번째 그림은 **슬롯**(activityId::graph__학번)에 따로 저장한다
 * (gallery.ts 의 activityIdForSlot · artifact 라우트의 slot · DrawBoard 의 saveSlot).
 *   · 뇌구조(draw 단계)  — 머리 옆모습 윤곽선(껍데기) 밑그림을 깔고(drawBackground:"head")
 *     그 안을 감정 색으로 채운다. 밑그림은 저장되는 획이 아니라 화면 가이드다.
 *   · 인생 그래프(wrapheal 단계) — 백지(밑그림 없음)에서 손으로 굴곡 그래프를 그린다.
 *     plan.activity.secondDraw 로 둔다. 장소 선택 없이 바로 캔버스가 뜬다(places 없음).
 *
 * ## 활동통·차시번호
 *
 * 새 통(mt-2026-8). 지난 회기(mt-2026-2/3/5/6/7)와 다른 통이라 지난 감정 글을 건드릴 위험이 없다.
 * 차시번호는 관례대로 208(2회기 202 … 7회기 207 → 8회기 208). 210(STREAMS 샘플)과 안 겹친다.
 *
 * ## 외부 링크는 교사 확인 필요 (직전 7회기 수업 후 메모)
 *
 * 7회기(9/29) 메모: "스케치풀·갈틱폰 등이 학교망에서 접속 안 됨 — 하나도 활용 못 함." 그래서 이 회기의
 * 외부 링크(유튜브 영상·mentalhealth.go.kr 자가진단) 접속 여부는 교사가 먼저 확인해야 한다. 테트리스는
 * 교사 소유 vercel 앱(정보과 17~20차에서 쓰던 것)이라 임베드로 동작한다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import type { LessonPlan, PhaseContent, QuizContent, WorksheetQuestion } from "../src/lib/types.ts";

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

/** 8회기 전용 새 활동통 (지난 회기와 다른 통 — 지난 감정 글 보호) */
const ACTIVITY_ID = "mt-2026-8";
/** 회기 관례대로 208 (2회기 202 … 7회기 207 → 8회기 208) */
const LESSON_NO = 208;

/** 돈이 많으면 행복할까? (교사 제공). 임베드용 주소로 바꿔 둔다 — 학교망 접속 여부는 교사 확인 */
const HAPPY_VIDEO_EMBED = "https://www.youtube.com/embed/GxzF8iASY7E";
/** 정신건강 자가진단 (교사 제공). 민감정보라 결과는 포털에 저장하지 않고 새 탭에서 각자 본다 */
const SELFTEST_URL = "https://www.mentalhealth.go.kr/portal/mdexmn/getMdexmnuserJoin.do";
/** 보상 테트리스 — 교사 소유 vercel 앱(정보과 17~20차에서 쓰던 것). 학교망에서 동작 확인됨 */
const TETRIS_URL = "https://tetris-game-seven-nu.vercel.app/";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/** 뇌구조 그림판의 '상황(최근의 일)' 갈래 = 그림 제목의 {장소} 자리에 들어간다 */
const SITUATIONS = ["학교생활", "친구 관계", "가족", "공부·시험", "취미·여가", "요즘 전반적으로"];

/** 교사가 준 감정-색 매핑. 그림판 팔레트에 같은 색이 다 있다(빨강·노랑·회색·하늘). */
const COLOR_MAP_NOTE =
  "🔴 빨강 — 분노(화남)\n" +
  "🩵 하늘색 — 기쁨\n" +
  "🟡 노랑 — 설렘\n" +
  "⚪ 회색 — 슬픔\n" +
  "여기 없는 감정은 가장 가까운 색으로 칠해요(예: 편안함=초록, 불안=주황).";

const WORKSHEET: WorksheetQuestion[] = [
  /* ═══════════ ① 나의 뇌구조 그리기 — 그림판 옆 활동지 탭(worksheet) ═══════════
   *
   * DrawBoard 가 뜨는 '그리기(draw)' 단계의 활동지 탭은 phase:"worksheet" 문항을 보여준다
   * (lesson/page.tsx 의 questionsFor). 그래서 아래 '상황→감정→색·크기' 준비 칸을 worksheet 에 둔다.
   */
  {
    key: "_brain_intro",
    phase: "worksheet",
    label: "나의 뇌구조 — 지금 내 머릿속을 그려 봐요",
    hint:
      "요즘 내 머릿속을 차지하고 있는 감정들을 색과 크기로 표현해 볼 거예요.\n" +
      "먼저 아래에 '어떤 일'과 '그때 감정·색·마음 크기'를 정하고,\n" +
      "오른쪽 [그림 그리기] 에서 머리 모양을 그린 뒤 그 안을 감정 색으로 칠해요.\n\n" +
      COLOR_MAP_NOTE,
    kind: "note",
    maxLength: 0,
  },
  {
    key: "brain_situation",
    phase: "worksheet",
    label: "요즘 가장 마음이 가는 '최근의 일'은 무엇인가요?",
    hint: "한 줄로 적어요. 이름은 ○○ 로 적어 주세요.\n예) 곧 있을 시험 / ○○랑 서먹해진 일 / 새로 시작한 취미",
    kind: "long",
    maxLength: 200,
  },
  {
    key: "brain_emotions",
    phase: "worksheet",
    label: "그 일과 관련해 지금 드는 감정을 적어 봐요 — 색과 마음 크기도 함께",
    hint:
      "한 줄에 감정 하나씩. 색은 눌러서 고르고, 마음 크기는 퍼센트(%)로 적어요.\n" +
      "'마음 크기'는 지금 그 감정이 내 머릿속을 얼마나 차지하는지예요(다 합쳐 100% 가 아니어도 돼요).",
    kind: "rows",
    maxRows: 6,
    rowColumns: [
      { key: "emotion", label: "감정", placeholder: "예) 긴장됨" },
      {
        key: "color",
        label: "색",
        emojis: ["빨강(분노)", "하늘(기쁨)", "노랑(설렘)", "회색(슬픔)", "초록(편안)", "주황(불안)", "기타"],
        // '기타' 를 고르면 아래에 직접 색 이름을 적는 칸이 뜬다(보기에 없는 색). 입력값은 `기타: <색>` 으로 함께 저장된다.
        otherOption: "기타",
        placeholder: "직접 색 이름을 적어요 (예: 보라색, 분홍색)",
      },
      { key: "size", label: "마음 크기(%)", placeholder: "예) 40%" },
    ],
    maxLength: 2000,
  },
  {
    key: "_brain_draw_guide",
    phase: "worksheet",
    label: "이제 오른쪽 [그림 그리기] 에서 그려요",
    hint:
      "① 머리(얼굴·뇌) 모양을 크게 하나 그려요.\n" +
      "② 위에서 정한 감정들을 그 안에 색으로 칠해요 — 마음 크기가 큰 감정일수록 넓게.\n" +
      "③ 잘 그리는 시간이 아니에요. 색과 크기로 '지금 내 머릿속'이 보이면 충분해요.",
    kind: "note",
    maxLength: 0,
  },

  /* ═══════════ ② 나의 행복? — 영상 뒤 생각 쓰기 (problem) ═══════════ */
  {
    key: "_happy_intro",
    phase: "problem",
    label: "나의 행복? — 영상을 보고 나서",
    hint:
      "방금 '돈이 많으면 행복할까?' 영상을 봤어요. 돈 말고, 나에게 행복은 무엇일지 생각해 봐요.\n" +
      "정답은 없어요. 지금 내 생각을 솔직하게 적으면 됩니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "happy_values",
    phase: "problem",
    label: "내가 중요하게 생각하는 가치는 무엇인가요? (내가 추구하는 것)",
    hint: "두세 개 적어도 좋아요.\n예) 좋은 친구, 건강, 배우는 즐거움, 자유로움, 가족",
    kind: "long",
    maxLength: 250,
    examples: ["우정", "건강", "가족", "성취·배움", "자유", "재미·즐거움", "정직", "도전", "안정", "배려"],
    examplesNote: { heading: "이런 가치들이 있어요 (골라도 되고 내 말로 써도 돼요)", hint: "" },
  },
  {
    key: "happy_life",
    phase: "problem",
    label: "내가 생각하는 '행복한 삶'은 어떤 모습인가요?",
    hint: "어떻게 살면 행복할 것 같은지 한두 문장으로 적어 봐요.\n예) 좋아하는 일을 하면서 가까운 사람들과 자주 웃는 삶",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "happy_efforts",
    phase: "problem",
    label: "앞으로 더 행복해지기 위해 내가 노력할 것들",
    hint: "작고 구체적인 것이 좋아요. [+ 칸 추가] 로 늘릴 수 있어요.\n예) 하루 10분 산책하기 / 고마운 사람에게 먼저 말 걸기",
    kind: "list",
    minItems: 2,
    maxItems: 5,
    itemPlaceholder: "예) 자기 전에 휴대폰 10분 덜 보기",
    maxLength: 1000,
  },
  {
    key: "happy_cheer",
    phase: "problem",
    label: "지금의 나에게 보내는 응원 메시지 한마디",
    hint: "힘들 때 다시 꺼내 볼 수 있는, 나를 위한 따뜻한 한마디를 적어 봐요.\n예) 느려도 괜찮아. 지금도 충분히 잘하고 있어.",
    kind: "long",
    maxLength: 200,
  },

  /* ═══════════ ③-가 마음 건강 — 자가진단(외부 링크, 저장 안 함) (mvp) ═══════════ */
  {
    key: "_selftest_intro",
    phase: "mvp",
    label: "마음 건강 — 내 마음 상태를 스스로 살펴봐요",
    hint:
      "아래 [정신건강 자가진단] 을 눌러 새 탭에서 열고, 안내에 따라 각자 해 봐요.\n" +
      "★ 결과는 '나만' 보는 거예요 — 포털에 저장하지 않고, 친구에게도 보이지 않아요.\n" +
      "결과가 걱정되면 담임·상담 선생님께 편하게 이야기해도 좋아요(아래 '도움 요청' 참고).",
    kind: "note",
    linkUrl: SELFTEST_URL,
    linkLabel: "정신건강 자가진단 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "selftest_feel",
    phase: "mvp",
    label: "(선택) 자가진단을 해 본 소감을 한 줄로 — 안 써도 괜찮아요",
    hint:
      "점수나 결과를 적는 칸이 아니에요. 그냥 해 보니 어땠는지 느낌만 편하게.\n" +
      "예) 생각보다 괜찮았다 / 좀 신경 쓰이는 게 있었다 / 잘 모르겠다. (이 칸은 나만 봐요)",
    kind: "text",
    maxLength: 120,
  },

  /* ═══════════ ③-나 인생 그래프 돌아보기 (build) ═══════════
   *
   * 인생 그래프 '그리기'는 wrapheal 단계의 두 번째 그림판(백지)에서 한다(plan.activity.secondDraw).
   * 이 build 단계는 **그리고 나서** 그래프를 보며 가장 힘들었던 때를 글로 돌아보는 자리다.
   * (교사 버튼 순서: … mvp → wrapheal[그래프 그리기] → build[여기, 돌아보기] → quiz …)
   */
  {
    key: "_lifegraph_intro",
    phase: "build",
    label: "방금 그린 인생 그래프를 보면서",
    hint:
      "내가 그린 그래프에서 가장 낮았던(힘들었던) 지점을 다시 봐요.\n" +
      "그 시기를 어떻게 지나왔는지 떠올려 아래에 적어 봐요 — 그게 다음에 또 힘들 때의 힌트가 돼요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "lifegraph_crisis",
    phase: "build",
    label: "가장 힘들었던 때는 언제였고, 그 시기를 어떻게 지나왔나요?",
    hint:
      "무엇이(누가) 도움이 됐는지도 함께 적어 봐요 — 그게 다음에 또 힘들 때의 힌트가 돼요.\n" +
      "예) ○○랑 멀어졌을 때. 가족이랑 이야기하고 시간이 지나니 괜찮아졌다.",
    kind: "long",
    maxLength: 400,
  },

  /* ═══════════ ③-라 마음 건강 실천방안 + 도움 요청 (grill) ═══════════
   * (OX 퀴즈는 ③-다로 quiz 단계에 따로 둔다 — plan.quiz) */
  {
    key: "_practice_intro",
    phase: "grill",
    label: "마음 건강을 지키는 나만의 실천 방안",
    hint:
      "방금 OX 로 확인한 것처럼, 마음 건강도 몸처럼 '평소 습관'으로 지켜요.\n" +
      "내가 실제로 할 수 있는 작은 실천을 적어 봐요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "mh_practice",
    phase: "grill",
    label: "내가 실천할 마음 건강 방법들",
    hint: "[+ 칸 추가] 로 늘려요.\n예) 잘 자기 / 햇빛 보며 걷기 / 힘들면 혼자 참지 말고 말하기 / 좋아하는 음악 듣기",
    kind: "list",
    minItems: 3,
    maxItems: 6,
    itemPlaceholder: "예) 자기 전에 오늘 좋았던 일 하나 떠올리기",
    maxLength: 1000,
  },
  {
    key: "_help_intro",
    phase: "grill",
    label: "마음이 힘들 때, 혼자 버티지 말고 도움을 요청해요",
    hint:
      "힘든 마음은 도움을 받으면 가벼워져요. 도움을 청하는 건 용기 있는 일이에요.\n\n" +
      "🧑‍🏫 학교 — 담임 선생님, 상담(Wee클래스) 선생님\n" +
      "👪 집 — 부모님, 믿을 수 있는 어른\n" +
      "📞 청소년 상담 1388 (전화·문자, 24시간)\n" +
      "📞 자살예방 상담전화 109 (24시간)\n" +
      "친구가 '죽고 싶다' 같은 말을 하면, 비밀로 하지 말고 꼭 어른(선생님·부모님)에게 알려 함께 도와요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "mh_help_who",
    phase: "grill",
    label: "내가 힘들 때 도움을 청할 수 있는 사람·곳을 골라 봐요",
    hint: "여러 개 골라도 돼요. 없으면 위 안내의 번호(1388·109)를 기억해 두세요.",
    kind: "multi",
    choices: ["담임 선생님", "상담 선생님", "부모님", "형제·자매", "친한 친구", "청소년상담 1388", "자살예방 109"],
    maxLength: 0,
  },
  {
    key: "mh_help_msg",
    phase: "grill",
    label: "(선택) 도움을 요청하는 말을 한 문장 연습해 봐요",
    hint: "막상 힘들 땐 말이 안 나와요. 미리 한 문장 만들어 두면 꺼내기 쉬워요.\n예) \"선생님, 요즘 마음이 좀 힘든데 이야기해도 될까요?\"",
    kind: "text",
    maxLength: 150,
  },

  /* ═══════════ ④ 성찰(포트폴리오) — 지난 8주 돌아보기 (wrapmap) ═══════════
   *
   * ★ #2 포트폴리오 — activity.portfolio:true 를 켜면 이 단계 맨 위에 학생 '본인'의 지난
   * 활동/작품과 회기별 기분 추이가 읽기 전용으로 뜬다(/api/student/portfolio → PortfolioView).
   * 그 아래 아래 rows 에 '그때 마음'을 떠올려 적는다 — 작품을 보며 쓰므로 회상이 구체적이다.
   * 철저히 본인 것만, 친구에게 안 나가고 AI 전송 없음(리허설 꼬리표는 서버가 걸러 낸다).
   */
  {
    key: "_portfolio_intro",
    phase: "wrapmap",
    label: "지난 8주를 돌아봐요",
    hint:
      "우리가 함께한 활동들이에요. 그때그때 내 마음이 어땠는지 떠올려 적어 봐요.\n" +
      "· 2·3회기 — 내 감정 알아차리기 (무드미터·AI 감정 렌즈)\n" +
      "· 4회기 — 실패를 노래로 자랑하기\n" +
      "· 5·6회기 — 관점과 감정 읽기 · 의사소통과 공감\n" +
      "· 7회기 — 그림으로 마음 전하기 · 우리 학교 규칙 만들기\n" +
      "· 8회기(오늘) — 나의 뇌구조 · 마음 건강",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "portfolio",
    phase: "wrapmap",
    label: "기억에 남는 활동과 그때의 마음을 적어 봐요 (한 줄에 하나씩)",
    hint: "활동을 눌러 고르고, 그때 기분과 기억에 남는 것을 적어요. [+ 줄 추가] 로 늘려요.",
    kind: "rows",
    maxRows: 6,
    rowColumns: [
      {
        key: "activity",
        label: "활동",
        emojis: ["2·3회기 감정알기", "4회기 실패자랑", "5·6회기 관계·공감", "7회기 그림·규칙", "8회기 오늘"],
      },
      { key: "feel", label: "그때 마음", placeholder: "예) 쑥스러웠다 / 후련했다" },
      { key: "memory", label: "기억에 남는 것", placeholder: "예) 친구도 나랑 비슷한 감정이었다" },
    ],
    maxLength: 2000,
  },
];

/* ═══════════ ③-다 마음 건강 OX (plan.quiz · quiz 단계) ═══════════
 *
 * 형성평가처럼 O/X 2지선다. 정답이 있으므로 hideReveal 은 켜지 않는다(정답 공개 O).
 * stickers 는 정보과 특성용이라 빈 배열. nowText 에 해설을 적어 정답 공개 때 함께 뜬다.
 */
const QUIZ: QuizContent = {
  label: "마음 건강 OX",
  questions: [
    {
      prompt: "충분한 잠과 휴식은 마음 건강에도 도움이 된다.",
      choices: ["⭕ 맞아요", "❌ 아니에요"],
      answerIndex: 0,
      nowText: "맞아요. 잠이 부족하면 감정 조절이 더 어려워져요. 몸과 마음은 이어져 있어요.",
      stickers: [],
      group: "quiz",
    },
    {
      prompt: "힘든 감정은 무조건 참고 혼자 버티는 것이 가장 좋다.",
      choices: ["⭕ 맞아요", "❌ 아니에요"],
      answerIndex: 1,
      nowText: "아니에요. 믿을 만한 사람에게 이야기하면 마음이 가벼워져요. 참기만 하면 더 커지기도 해요.",
      stickers: [],
      group: "quiz",
    },
    {
      prompt: "몸이 아프면 병원에 가듯, 마음이 아플 때도 도움을 받을 수 있다.",
      choices: ["⭕ 맞아요", "❌ 아니에요"],
      answerIndex: 0,
      nowText: "맞아요. 상담도 치료처럼 도움을 받는 일이에요. 부끄러운 일이 아니에요.",
      stickers: [],
      group: "quiz",
    },
    {
      prompt: "다른 사람과 나를 자주 비교할수록 마음이 더 건강해진다.",
      choices: ["⭕ 맞아요", "❌ 아니에요"],
      answerIndex: 1,
      nowText: "아니에요. 비교는 나를 작게 느끼게 만들기 쉬워요. 어제의 나와 비교하는 게 더 좋아요.",
      stickers: [],
      group: "quiz",
    },
    {
      prompt: "친구가 '죽고 싶다' 같은 말을 하면, 비밀로 지켜 주는 것이 친구를 위한 것이다.",
      choices: ["⭕ 맞아요", "❌ 아니에요"],
      answerIndex: 1,
      nowText:
        "아니에요. 그럴 때는 꼭 어른(선생님·부모님)에게 알려 함께 도와야 해요. 알리는 건 친구를 지키는 일이에요. (1388·109)",
      stickers: [],
      group: "quiz",
    },
  ],
};

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "디지털 마음 톡톡 8회기 — 나를 들여다보기 · 마음 건강 (마지막)",

  // 매 회기 첫 화면: 대기에서 기분 체크 먼저, 제출하면 대기 게임으로(교사 표준).
  moodCheckEnabled: true,

  groups: [
    { key: "mt-tue-1", label: "화요일 1기", classNo: 1 },
    { key: "mt-thu-1", label: "목요일 1기", classNo: 2 },
    { key: "mt-tue-2", label: "화요일 2기", classNo: 3 },
    { key: "mt-thu-2", label: "목요일 2기", classNo: 4 },
  ],

  // 대기 게임은 지뢰찾기(교사 소유 vercel). 테트리스는 마지막 보상으로 아껴 둔다.
  game: {
    heading: "기다리는 동안 — 지뢰찾기",
    body:
      "친구들이 다 모일 때까지 잠깐 쉬어요.\n" +
      "숫자는 그 칸 둘레에 숨은 지뢰의 개수예요. 지뢰가 없는 칸을 골라 열어 보세요.",
    url: "https://mine-sweeper-game-seven.vercel.app/home",
  },
  gameExplainer: empty(),

  progress: empty(),
  assessment: empty(),

  // 나의 행복? 영상 (돈이 많으면 행복할까?). ★ 학교망 유튜브 접속 여부는 교사 확인 필요.
  video: {
    heading: "돈이 많으면 행복할까?",
    body: "영상을 보고, '나에게 행복은 무엇일까'를 생각하며 다음 활동으로 가요.",
    url: HAPPY_VIDEO_EMBED,
  },
  videoPrompts: ["돈이 많으면 정말 행복할까?", "나에게 행복이란 무엇일까?", "지금 나를 행복하게 하는 것은?"],

  // 마음일기 겸 전체 수업 후기. reflectionPublic 은 반드시 false.
  reflectionQuestions: [
    "지난 8주 '디지털 마음 톡톡' 중 가장 기억에 남는 활동은 무엇인가요? 왜 그런지도 적어 주세요.",
    "이 수업을 하며 내 마음(감정)에 대해 새로 알게 되었거나 달라진 점이 있다면 무엇인가요?",
    "앞으로 마음이 힘들 때 나는 어떻게 하면 좋을까요? 오늘의 나에게 다짐 한마디를 적어 주세요.",
  ],
  reflectionPublic: false,

  /*
   * 이탈 면제 — 뇌구조 그림판(draw)은 다른 화면처럼 잡히고, 자가진단(mvp)은 외부 사이트를 새 탭으로 연다.
   * 영상(video)은 포털 안 임베드라 면제가 필요 없다.
   */
  // draw(뇌구조)·wrapheal(인생 그래프)은 포털 내장 그림판이라 이탈로 안 잡히게, mvp 는 외부 새 탭.
  focusExempt: ["draw", "wrapheal", "mvp"],

  // 되돌아가기 기본 off (새 수업 표준).
  freeNavigation: false,

  /*
   * 교사 버튼 순서. 마음 체크인(mood)은 대기 화면에서 하므로 phaseOrder 에 두지 않는다.
   * 인생 그래프는 wrapheal(그리기) → build(돌아보기) 로 흐르므로 wrapheal 을 build 앞에 둔다.
   */
  phaseOrder: [
    "waiting", "draw", "video", "problem", "mvp",
    "wrapheal", "build", "quiz", "grill", "wrapmap", "reflection",
  ],

  // 단계명 — 화면에 'draw'·'wrapheal'·'wrapmap' 같은 말은 안 보인다.
  phaseLabels: {
    draw: "나의 뇌구조 그리기",
    video: "나의 행복? (영상)",
    problem: "나의 행복? (가치·행복·응원)",
    mvp: "마음 건강 자가진단",
    wrapheal: "나의 인생 그래프 그리기",
    build: "인생 그래프 돌아보기",
    quiz: "마음 건강 OX",
    grill: "마음 건강 실천 · 도움 요청",
    wrapmap: "지난 8주 돌아보기",
    reflection: "마음일기 · 전체 후기",
  },

  quiz: QUIZ,

  activity: {
    activityId: ACTIVITY_ID,
    // 뇌구조 그림판을 켠다(장소=상황 갈래). 비우면 그림판이 아예 안 뜬다.
    places: SITUATIONS,
    year: 2026,
    worksheet: WORKSHEET,

    // 그림 제목 틀. {장소} 자리에 고른 '상황'이 들어간다.
    artifactTitle: "나의 뇌구조 ({장소})",

    /*
     * ★ #3-가 뇌구조 그림판 배경 — 빈 머리 옆모습 윤곽선(껍데기)을 깔아 준다.
     * 학생은 이 윤곽 안을 감정 색으로 채운다. 밑그림은 저장되는 획이 아니라 화면 가이드다
     * (artifact-canvas 의 drawHeadOutline). 캔버스는 활동당 하나뿐이라, 두 번째 그림판
     * (인생 그래프, 백지)은 아래 secondDraw 로 wrapheal 단계에 따로 둔다.
     */
    drawBackground: "head",

    // 활동지(상황·감정·색·크기 준비)를 먼저, 그림을 나중에.
    worksheetFirst: true,

    drawPrompt: {
      heading: "나의 뇌구조",
      body:
        "왼쪽 [활동지 쓰기] 에 정한 감정·색·크기대로, 화면에 그려진 '머리 윤곽선 안'을 채워요.\n" +
        "① 머리 모양은 이미 깔려 있어요(옅은 회색 윤곽). 그 안을 감정 색으로 칠해요.\n" +
        "② 마음 크기가 큰 감정일수록 넓게 칠해요.\n\n" +
        COLOR_MAP_NOTE +
        "\n잘 그리는 시간이 아니에요. 색과 크기로 '지금 내 머릿속'이 보이면 충분합니다.\n" +
        "먼저 어떤 '상황(최근의 일)'에 대한 머릿속인지 골라 주세요.",
    },

    /*
     * ★ #3-나 두 번째 그림판 — 나의 인생 그래프 (백지). wrapheal 단계에서 장소 선택 없이
     * 바로 캔버스가 뜬다. graph 슬롯(activityId::graph)에 따로 저장돼 뇌구조 그림과 안 섞인다.
     * 교사 버튼 순서상 mvp(자가진단) → wrapheal(여기, 그리기) → build(돌아보기) 로 흐른다.
     */
    secondDraw: {
      heading: "나의 인생 그래프",
      body:
        "태어나서 지금까지를 떠올리며, 빈 종이에 손으로 '굴곡 그래프'를 그려요.\n" +
        "· 가로(→): 시간 — 왼쪽이 어릴 때, 오른쪽이 지금\n" +
        "· 세로(↕): 기분 — 위로 갈수록 좋았던 때, 아래로 갈수록 힘들었던 때\n" +
        "좋았던 때와 힘들었던 때를 이어 선을 그리고, 중요한 지점엔 [글자] 로 간단히 적어도 좋아요.\n" +
        "(가운데에 가로선을 하나 긋고 시작하면 그리기 쉬워요.)",
      title: "나의 인생 그래프",
    },

    worksheetIntro: {
      heading: "나의 뇌구조 준비",
      body: "먼저 여기에 상황·감정·색·마음 크기를 적어요. 그 다음 오른쪽 [그림 그리기] 에서 그대로 그려요.",
    },

    /*
     * ★ 프라이버시 — 서로의 마음 읽기(갤러리)는 끈다. 뇌구조·인생 그래프·마음 건강·자가진단 소감은
     * 전부 비공개다. galleryEnabled 가 false 이므로 서버 갤러리 라우트가 응답 자체를 막는다
     * (galleryAnswerKeys 가 비어도 위험하지 않다 — 열기 스크립트가 false 를 재확인한다).
     */
    galleryEnabled: false,
    galleryAnswerKeys: [],

    /*
     * ★ #2 포트폴리오 — wrapmap(지난 8주 돌아보기) 단계에서 학생 '본인'의 지난 활동/작품과
     * 회기별 기분 추이를 읽기 전용으로 보여준다(/api/student/portfolio). 철저히 본인 것만 —
     * 친구에게 안 나가고 AI 전송도 없다. 지난 회기 통의 리허설 꼬리표는 서버가 걸러 낸다.
     */
    portfolio: true,

    // 정보과 수행평가용 출처 두 칸은 이 수업과 무관하므로 끈다.
    sourcesEnabled: false,
  },

  /*
   * 보상 테트리스 — 마음일기를 제출하면 열린다(rewardGame). requires 를 비워 두면 '제출' 만으로
   * 바로 열린다(이 회기엔 AI 채점 통과 같은 조건이 없다). 교사 소유 vercel 앱이라 학교망에서 동작한다.
   */
  rewardGame: {
    heading: "테트리스",
    body: "8주 동안 정말 수고했어요 — 마지막 상으로 테트리스 한 판! 수업이 끝나면 정리해요.",
    url: TETRIS_URL,
    requires: [],
  },
};

async function main(): Promise<void> {
  const now = Date.now();
  const byLesson = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  const mine = byLesson.docs.find(
    (d) => (d.data() as LessonPlan).activity?.activityId === ACTIVITY_ID,
  );

  if (!mine) {
    const ref = await db.collection("lessonPlans").add({ ...PLAN, createdAt: now, updatedAt: now });
    console.log(`✓ 등록 — ${PLAN.title} (${ref.id})`);
  } else {
    await mine.ref.set({ ...PLAN, updatedAt: now }, { merge: true });
    console.log(`↻ 갱신 — ${PLAN.title} (${mine.id})`);

    const all = await db.collection("classSessions").where("lessonPlanId", "==", mine.id).get();
    const scheduled = all.docs.filter((s) => (s.data() as { status: string }).status === "scheduled");
    for (const s of scheduled) await s.ref.set({ ...PLAN }, { merge: true });
    console.log(`   아직 시작하지 않은 수업 ${scheduled.length}개에 반영`);
    for (const s of all.docs.filter((x) => (x.data() as { status: string }).status !== "scheduled")) {
      const x = s.data() as { status: string; code: string };
      console.warn(`   ⚠ ${s.id} (코드 ${x.code}) 는 ${x.status} 상태라 건너뛰었습니다.`);
    }
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} · 차시 번호 ${LESSON_NO} (8회기 마지막)`);
  console.log("교사 버튼 순서: 대기(마음 체크인) →");
  console.log("  [draw] 나의 뇌구조 그리기(머리 윤곽선 배경) → [video] 나의 행복? 영상 → [problem] 가치·행복·응원");
  console.log("  → [mvp] 마음 건강 자가진단(외부, 저장X) → [wrapheal] 나의 인생 그래프 그리기(백지) → [build] 인생 그래프 돌아보기");
  console.log("  → [quiz] 마음 건강 OX → [grill] 실천방안·도움 요청 → [wrapmap] 지난 8주 돌아보기(포트폴리오) → [reflection] 마음일기(제출→테트리스)");
  console.log("\n★ 그림판 둘: 뇌구조(draw, head 배경) + 인생 그래프(wrapheal, 백지·graph 슬롯). 포트폴리오: wrapmap 에서 본인 지난 작품·기분 추이.");
  console.log("★ 프라이버시: galleryEnabled: false (전면 비공개) · reflectionPublic: false · AI 전송 기능 없음 · 포트폴리오도 본인 것만.");
  console.log("  자가진단 결과는 포털에 저장하지 않음(외부 새 탭). 도움 요청 안내·OX 로 위기 대응 녹임.");
  console.log("⚠ 교사 확인 필요: 유튜브 영상·mentalhealth.go.kr 자가진단의 학교망 접속 여부(7회기 메모: 외부 사이트 차단 사례).");
  console.log("세션 열기(화요일 1기): node --env-file=.env.local scripts/open-mt8-tue1.ts  (리허설: --rehearsal)");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
