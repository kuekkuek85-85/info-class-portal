/**
 * 정보과 11차시 — 「디지털 윤리 ③ — 디지털 시민 리포트 (2부)」 = 수행평가 1 의 2부.
 *
 *   node --env-file=.env.local scripts/seed-lesson11.ts
 *   node --env-file=.env.local scripts/seed-lesson11.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * ## 9·10차시와 한 통이다
 *
 * 활동 통(activityId)을 9·10차시와 **같이 쓴다**(digital-ethics). 그래서 10차시에 쓴
 * 논술(cyber_essay1/2)과 성찰이 오늘 화면에서도 열린다. 문항 key 는 9·10과 겹치지
 * 않게 새로 짓는다(de11_*) — 단, **자기 점검만 news_check2 로 재사용**한다.
 * 대시보드 대기 줄 정렬(selfCheckOk)과 이월(carryOverSubmitStage)이 그 키를 하드코딩해
 * 읽기 때문이다. 새 키를 쓰면 대기 줄이 조용히 깨진다.
 *
 * ## 오늘 하는 일 — 사례 하나를 골라 깊게
 *
 * 디지털 윤리 위반 상황 네 가지(데이터 셔틀 · 카카오톡 감옥 · 신상 유출 · 초상권·저작권)를
 * 주고, 학생이 **그중 하나를 골라** 원인·피해를 분석하고 대처·예방(개인+공동체)을 쓴다.
 * 빠른 학생은 두 번째 사례를 더 볼 여지를 둔다(안내 문구).
 *
 * ## 복붙 방지 — 둘 다 건다
 *
 *  1. **붙여넣기 차단** — 답 칸(long)에 noPaste 를 켜 onPaste·우클릭·Ctrl/⌘+V 를 막는다.
 *     노트북 전제이고 완벽 차단은 아니다. 재타이핑을 번거롭게 해 자기 말로 쓰게 하는 것.
 *  2. **Grill me** — 학생 답 + 고른 사례를 근거로 AI 가 꼬리질문 2개 → 학생이 꼬리답변을
 *     자기 말로 쓴다. 그 꼬리답변이 제출 문턱(submitFields)에 걸려, 비우거나 한 줄로
 *     때우면 2차 통과가 안 된다. 오픈북이라 AI 참고는 허용하되 통과의 문턱은 "내 말".
 *
 * ## AI Grill 은 논술용으로 부른다
 *
 * ai_review 기본 프롬프트는 진로탐색의 "앱 기획 검토" 전용이라, 이 문항이 논술용
 * persona 와 폴백 질문을 직접 준다(reviewPersona·reviewFallback). 안 주는 다른 차시는
 * 그대로 앱 기획 검토로 돈다 (ai-review.ts 참조).
 *
 * ## 25분 핵심 + 10분 보상
 *
 *   기분 2 · 오늘 할 일 3 · 사례 고르기 3~4 · 의견 작성 8~9 · Grill 꼬리답변 4~5 · 다듬고 제출 3
 *   = 약 25분. 교사가 「통과」 준 학생은 남은 ~10분 동안 게임 4종(doneLinks)으로 넘어간다.
 *
 * ## 통과 = 게임 (보상)
 *
 * 교사가 「통과」를 준 학생(teacherFeedback.verdict==="pass" / 출석 passed)에게만
 * submit 칸에 게임 4종 링크가 뜬다(done-portal). 최종 제출이 아니라 **통과**로 열린다.
 * 통과 전 학생은 계속 활동한다.
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
    privateKey: requiredEnv("FIREBASE_PRIVATE_KEY")
      .replace(/^["']|["']$/g, "")
      .replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const LESSON_PLANS = "lessonPlans";
const LESSON_NO = 11;

/** 9차시와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/** 9·10차시와 **같은 통**. 9·10·11차시가 함께 쓴다(기사 통 career-plan 과는 다르다) */
const ACTIVITY_ID = "digital-ethics";

/** 답 칸 글자 수 상한 — 논술 세 줄 정도가 편하게 들어가되 붙여넣기 사고로 부풀지 않게 */
const ESSAY_MAX = 800;

/**
 * 사례 4편 — 제목(choice 보기)과 10줄짜리 고정 지문을 한 배열로 묶는다.
 *
 * ## 왜 한 배열인가
 *
 * choice 의 보기 문구(label)와 case_story 의 match 가 **글자 하나까지 같아야** 고른
 * 사례의 이야기가 뜬다. 따로 적으면 한쪽만 고칠 때 조용히 안 뜬다. 여기서 만들어
 * choices 와 stories 를 이 배열에서 함께 뽑는다.
 *
 * ## 고정 지문이다 (실시간 AI 생성 아님)
 *
 * 미리 써 둔 네 편이라 같은 사례를 고른 학생은 모두 같은 이야기를 본다 — 수행평가
 * 공정성·AI 상한·안정 때문이다. 새 Gemini 호출이 생기지 않는다.
 *
 * ## 톤
 *
 * 중1이 겪을 법한 현실감으로 쓰되 자극적이지 않게, 실명·실제 신상은 넣지 않는다.
 * 피해자의 마음(무섭다·말 못 한다)은 담아 학생이 대처·예방을 진지하게 고민하게 한다.
 */
const CASES: { label: string; story: string }[] = [
  {
    label: "① 데이터 셔틀 — 힘센 친구들이 매번 내 폰 데이터를 빌려 써 요금이 다 나간다",
    story:
      "쉬는 시간마다 같은 친구들이 내 자리로 온다.\n" +
      "“핫스팟 좀 켜 봐, 데이터 조금만 쓸게.” 처음엔 한두 명이었다.\n" +
      "거절하면 분위기가 싸해질 것 같아 그냥 켜 줬다.\n" +
      "그런데 한 명이 두 명이 되고, 이제는 다른 반 아이들까지 와서 내 데이터를 쓴다.\n" +
      "게임을 내려받고 영상을 보느라 내 데이터는 월초에 벌써 바닥났다.\n" +
      "속도가 느려져 정작 나는 인터넷을 제대로 못 쓴다.\n" +
      "이번 달엔 요금제 데이터가 다 나가서 부모님이 추가 요금을 결제하셨다.\n" +
      "“무슨 데이터를 이렇게 많이 쓰냐”고 걱정하셨지만, 사실대로 말하지 못했다.\n" +
      "괜히 말했다가 일이 커질까 봐, 그리고 부모님이 걱정하실까 봐 겁이 났다.\n" +
      "그렇다고 계속 이렇게 데이터를 빌려주는 건 이상하다는 생각이 든다.",
  },
  {
    label: "② 카카오톡 감옥 — 단톡방에서 여러 명이 나에게 욕을 하고, 나가도 다시 초대한다",
    story:
      "모르는 번호로 단체 대화방 초대가 왔다.\n" +
      "들어가 보니 평소 나를 못마땅해하던 아이들과, 얼굴도 모르는 다른 반 아이들이 있었다.\n" +
      "인사를 하기도 전에 한 명이 나에게 욕을 하기 시작했다.\n" +
      "곧 여러 명이 돌아가며 나를 놀리고 비웃는 말을 쏟아 냈다.\n" +
      "불쾌해서 대화방을 나갔다.\n" +
      "그런데 10초도 지나지 않아 나는 다시 그 방에 초대되어 있었다.\n" +
      "나가면 초대되고, 나가면 또 초대되기를 반복했다.\n" +
      "이제는 내 이야기를 넘어 부모님에 대한 험한 말까지 나온다.\n" +
      "화도 나고 무섭기도 한데, 어떻게 해야 이 상황을 멈출 수 있을지 모르겠다.\n" +
      "휴대폰 알림이 울릴 때마다 가슴이 철렁 내려앉는다.",
  },
  {
    label: "③ 신상 유출 — 내 사진·이름·학교가 단톡방과 SNS에 퍼져 모르는 사람들이 조롱한다",
    story:
      "아침에 등교하니 반 아이들이 나를 보며 수군거렸다.\n" +
      "알고 보니 누군가 내 사진과 함께 이름, 학교, 사는 동네까지 단톡방과 SNS에 올려 놓았다.\n" +
      "사진은 내가 예전에 올린 것을 누군가 몰래 저장해 둔 것 같았다.\n" +
      "글에는 사실이 아닌 이야기까지 덧붙어 있었다.\n" +
      "모르는 계정들이 그 글에 몰려와 나를 비웃는 댓글을 달았다.\n" +
      "지우고 싶어도 이미 여기저기 퍼져서 어디서부터 손대야 할지 모르겠다.\n" +
      "누가 처음 올렸는지도 알 수 없다.\n" +
      "길에서 모르는 사람이 나를 알아볼까 봐 밖에 나가기가 두렵다.\n" +
      "학교에 가는 것도, 휴대폰을 켜는 것도 무섭다.\n" +
      "내 정보가 내 허락도 없이 이렇게 돌아다녀도 되는 걸까.",
  },
  {
    label: "④ 초상권·저작권 — 카드뉴스에 친구 얼굴과 남의 이미지를 무단으로 써서 문제가 됐다",
    story:
      "동아리 홍보를 하려고 카드뉴스를 만들었다.\n" +
      "더 멋져 보이라고 친구가 나온 사진을 넣고, 인터넷에서 검색한 예쁜 이미지도 몇 장 가져다 붙였다.\n" +
      "출처는 굳이 적지 않았다. 다들 그렇게 하는 줄 알았다.\n" +
      "완성한 카드뉴스를 SNS에 올렸더니 반응이 꽤 좋았다.\n" +
      "그런데 사진 속 친구가 화가 나서 연락해 왔다. “내 사진을 왜 마음대로 올렸어?”\n" +
      "나는 홍보에 도움이 될 것 같아서 그랬다고 했지만, 친구는 허락한 적이 없다고 했다.\n" +
      "며칠 뒤에는 내가 가져다 쓴 이미지의 원작자에게서 “허락 없이 썼으니 내려 달라”는 경고가 왔다.\n" +
      "저작권을 어겼을 수 있다는 말에 덜컥 겁이 났다.\n" +
      "좋은 마음으로 만든 건데 왜 문제가 된 걸까.\n" +
      "남의 얼굴과 남이 만든 이미지를 쓸 때는 무엇을 지켜야 했을까.",
  },
];

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const WORKSHEET: WorksheetQuestion[] = [
  /*
   * 사례 네 가지를 한 화면에 펼친다. 학생은 아래 choice 에서 하나를 고른다.
   *
   * 데이터 셔틀·카카오톡 감옥은 10차시 논술 사례와 같은 상황이라 이어진다. 신상 유출과
   * 초상권·저작권을 더해 개인정보·저작권까지 걸친다.
   */
  {
    key: "_de11_intro",
    phase: "worksheet",
    label: "오늘의 사례 — 하나를 고르면 그 이야기가 아래에 나타납니다",
    hint:
      "네 가지 모두 디지털 윤리를 어긴 상황이에요. 하나를 골라 상황 이야기를 읽고,\n" +
      "원인·피해를 분석한 뒤 대처와 예방을 씁니다.\n" +
      "(다 쓰고 선생님을 기다리는 동안엔 다른 사례도 읽고 생각해 봐도 좋아요.)",
    kind: "note",
    maxLength: 0,
  },
  {
    /*
     * 고른 사례. 보기(제목)를 고르면 아래 case_story 가 그 사례의 10줄 지문을 펼친다.
     * 이 답(제목)이 Grill 프롬프트에도 사례로 함께 실린다(reviewFields 에 de11_case).
     * 고정 지문 전문을 Gemini 로 또 보낼 필요는 없다 — 제목만으로 어느 사례인지 충분하다.
     */
    key: "de11_case",
    phase: "worksheet",
    label: "나는 이 사례를 고릅니다",
    hint: "하나만 고르세요. 고른 사례의 이야기가 바로 아래에 나타납니다.",
    kind: "choice",
    choices: CASES.map((c) => c.label),
    maxLength: 0,
  },
  {
    /*
     * 고른 사례의 10줄 고정 지문. de11_case 답과 stories[].match 를 견줘 하나만 뜬다.
     * 안 고르면 안내만. 실시간 생성이 아니라 미리 써 둔 것이라 같은 사례=같은 이야기다.
     */
    key: "de11_story",
    phase: "worksheet",
    label: "상황 이야기",
    hint: "",
    kind: "case_story",
    storySourceKey: "de11_case",
    stories: CASES.map((c) => ({ match: c.label, text: c.story })),
    maxLength: 0,
  },

  /*
   * 루브릭 차원 ① 원인·피해 분석.
   *
   * 붙여넣기를 막는다(noPaste). 오픈북이라 AI 에게 물어봐도 되지만, 옮길 때 한 번은
   * 자기 손을 거치게 한다.
   */
  {
    key: "de11_cause",
    phase: "worksheet",
    label: "① 원인·피해 분석 — 왜 일어났고, 누가 어떤 피해를 입나",
    hint:
      "위 상황 이야기를 읽고, 두 문장 이상 씁니다. 사람의 잘못만이 아니라 '구조나 습관'에서도\n" +
      "원인을 찾아보세요.\n" +
      "예) 거절하기 어려운 분위기가 원인이다. 피해자는 돈과 마음 둘 다 잃고, 혼자 참게 된다.",
    kind: "long",
    maxLength: ESSAY_MAX,
    noPaste: true,
  },

  /* 루브릭 차원 ② 대처방안 (근거 포함) */
  {
    key: "de11_cope",
    phase: "worksheet",
    label: "② 대처방안 — 이 상황에서 어떻게 대처할까 (근거도 함께)",
    hint:
      "이 상황 이야기 속 '나'가 지금 할 수 있는 일을 두 문장 이상 쓰고, 왜 그 방법이 맞는지\n" +
      "근거를 한 문장 붙이세요. 지난 시간 '대처 6단계'를 근거로 써도 좋아요.\n" +
      "예) 먼저 증거를 화면 캡처로 남긴다. 감정으로 맞서면 상황이 커지고 증거만 흐려지기 때문이다.",
    kind: "long",
    maxLength: ESSAY_MAX,
    noPaste: true,
  },

  /* 루브릭 차원 ③ 예방(개인+공동체) 실천방안 (근거 포함) */
  {
    key: "de11_prevent",
    phase: "worksheet",
    label: "③ 예방방법 — 개인이 할 일 + 우리 반·사회가 할 일 (근거도 함께)",
    hint:
      "두 문장 이상. **나 혼자** 할 예방 하나와, **우리 반이나 사회**가 함께 할 예방 하나를\n" +
      "각각 쓰고, 왜 그것이 예방이 되는지 근거를 붙이세요.\n" +
      "예) 개인 — 개인정보를 함부로 올리지 않는다. 공동체 — 목격하면 편들어 주고 함께 신고한다.\n" +
      "    방관하지 않는 반 분위기가 있어야 가해가 힘을 잃기 때문이다.",
    kind: "long",
    maxLength: ESSAY_MAX,
    noPaste: true,
  },

  /* Grill 전에 내 답을 한 번 되본다 — 되돌아가기가 꺼진 화면에서 다시 읽을 자리 */
  {
    key: "_de11_grill_recap",
    phase: "worksheet",
    label: "",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "de11_case", label: "내가 고른 사례" },
      { key: "de11_cause", label: "① 원인·피해" },
      { key: "de11_cope", label: "② 대처방안" },
      { key: "de11_prevent", label: "③ 예방방법" },
    ],
    maxLength: 0,
  },

  /*
   * Grill me — 여기서부터가 진짜 AI 검토다.
   *
   * 학생 답 + 고른 사례를 함께 보내고, 아직 안 짚은 것을 질문 2개로 돌려받는다. AI 는
   * 점수·칭찬 없이 질문만 한다. persona·fallback 을 논술용으로 갈아끼운다 — 안 주면
   * 앱 기획 검토로 도는 기본값이라, 이 문항이 직접 준다.
   */
  {
    key: "de11_grill",
    phase: "worksheet",
    label: "이제 AI에게 검토받아 봅시다 — Grill me",
    hint:
      "지금까지 쓴 것과 내가 고른 사례를 모아 AI에게 보냅니다. AI는 점수를 매기지 않고,\n" +
      "내 분석·대처·예방에서 아직 약한 곳을 질문으로 되물어요. 그 질문에 아래 칸에서\n" +
      "내 말로 답하면 됩니다.",
    kind: "ai_review",
    maxLength: 0,
    reviewCount: 2,
    /* 고른 사례(보기 문구)까지 함께 보내 "학생 답 + 사례" 를 근거로 캐묻게 한다 */
    reviewFields: [
      { key: "de11_case", label: "학생이 고른 사례" },
      { key: "de11_cause", label: "원인·피해 분석" },
      { key: "de11_cope", label: "대처방안" },
      { key: "de11_prevent", label: "예방방법(개인+공동체)" },
    ],
    /* 앱 기획용 기본 프롬프트를 논술용으로 갈아끼운다 (ai-review.ts) */
    reviewPersona: {
      role: "중학교 1학년의 디지털 윤리 글쓰기를 함께 살펴보는 조력자",
      subject: "학생이 고른 디지털 윤리 위반 사례와, 그에 대한 학생의 원인·피해 분석과 대처·예방 의견",
    },
    /* Gemini 가 죽어도 논술 맥락에 맞는 질문이 나가게 한다(기본 폴백은 앱 기획용이라 안 맞음) */
    reviewFallback: [
      "네가 쓴 대처 방법을 네가 고른 사례에 그대로 넣어 보면 정말 통할까? 어디서 막힐까?",
      "이 일이 왜 일어났는지, 사람 말고 ‘구조나 습관’에서 원인을 하나 더 댈 수 있을까?",
      "네가 말한 예방을 나 혼자 말고 우리 반 전체가 하려면 무엇이 더 필요할까?",
    ],
  },

  /*
   * 꼬리답변 — 복붙 방지의 핵심 한 칸.
   *
   * AI 가 되물은 것에 자기 말로 답한다. 이 칸이 submitFields 에 걸려, 비우거나 한 줄로
   * 때우면 2차 통과가 안 된다(gateItems). 붙여넣기도 막는다.
   */
  {
    key: "de11_grill_ans",
    phase: "worksheet",
    label: "④ 꼬리답변 — AI가 되물은 것에 내 말로 답하기",
    hint:
      "두 문장 이상. 위에서 AI가 물어본 두 질문에, 내 사례와 내 생각으로 답해 보세요.\n" +
      "베껴 쓰는 칸이 아니라, 다시 생각해서 채우는 칸이에요.",
    kind: "long",
    maxLength: ESSAY_MAX,
    noPaste: true,
  },

  /*
   * 2차로 내기 전 자기 점검. **키는 news_check2 로 재사용**한다.
   *
   * 대시보드가 첫 보기("괜찮다"류)가 아닌 것을 고른 학생을 대기 줄 앞에 세운다
   * (dashboard route 의 selfCheckOk 가 이 키의 첫 보기를 읽는다). 문구로 맞히지 않고
   * 자리로 가리므로, 여기 글자를 고쳐도 그쪽이 안 깨진다. 첫 보기를 "다 들어 있다"로 둔다.
   */
  {
    key: "news_check2",
    phase: "worksheet",
    label: "2차로 내기 전에 — 스스로 확인해 보세요",
    hint:
      "①②③④ 를 다시 읽고, 가장 마음에 걸리는 것 하나를 고르세요.\n" +
      "고른 것에 따라 선생님이 오는 순서가 정해집니다. 솔직하게 고르는 편이 이득이에요.",
    kind: "choice",
    choices: [
      "① 원인·피해 · ② 대처 · ③ 예방 · ④ 꼬리답변이 다 들어 있다",
      "① 원인·피해 — ‘왜 일어났나’가 약한 것 같다",
      "② 대처방안 — 이 사례에 실제로 통할지 자신이 없다",
      "③ 예방방법 — 개인만 있고 우리 반·사회(공동체)가 빠진 것 같다",
      "④ 꼬리답변 — AI 질문에 내 말로 답한 게 맞는지 모르겠다",
      "잘 모르겠다 — 선생님께 여쭙겠습니다",
    ],
    maxLength: 0,
  },

  {
    key: "de11_submit",
    phase: "worksheet",
    label: "다 썼으면 제출하세요",
    hint: "",
    kind: "submit",
    maxLength: 0,
    /*
     * 문장 수 문턱. 분석·대처·예방·꼬리답변이 비거나 한 줄이 안 되면 2차에서 되돌린다.
     * 서버가 저장된 답을 다시 세서 판정하므로 「고쳤어요」만 눌러도 통과 안 된다.
     */
    submitFields: [
      { key: "de11_cause", label: "① 원인·피해 분석", minSentences: 2 },
      { key: "de11_cope", label: "② 대처방안", minSentences: 2 },
      { key: "de11_prevent", label: "③ 예방방법(개인+공동체)", minSentences: 2 },
      { key: "de11_grill_ans", label: "④ 꼬리답변", minSentences: 2 },
    ],
    /*
     * 교사가 「통과」를 준 학생에게만 뜨는 게임 4종 (done-portal).
     * lesson7·8 의 세 게임(하노이탑·2048·똥 피하기)에 한붓그리기를 더해 넷으로.
     * 최종 제출이 아니라 통과로 열린다 — 낸 것은 "냈다" 이지 "됐다" 가 아니다.
     */
    doneLinks: [
      { label: "한붓그리기", url: "https://euler-path-game.vercel.app/" },
      { label: "똥 피하기", url: "https://dodge-poop-game.vercel.app/" },
      { label: "하노이탑", url: "https://hanoi-tower-game-rosy.vercel.app/" },
      { label: "2048", url: "https://2048-game-gilt-kappa.vercel.app/" },
    ],
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  /* 9·10차시와 같은 규칙 — 묶음은 번호(9·10·11)로 보인다. 줄표 뒤가 오늘 하는 일 */
  title: "디지털 윤리 ③ — 디지털 시민 리포트 (2부)",
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
  progress: empty(),
  video: empty(),

  /*
   * 오늘 할 일 보드 — 오픈북 규칙·Grill 안내·제출 3단계. 활동 중 되돌아와 볼 수 있다.
   */
  assessment: {
    heading: "오늘 할 일 — 디지털 시민 리포트 (2부)",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘 할 일",
        subtitle: "디지털 윤리 위반 사례 하나를 골라 깊게 다룹니다",
        note: "지금까지 배운 개인정보 보호·저작권·사이버 윤리가 오늘 글의 바탕이 됩니다.",
        rows: [
          { label: "기분", value: "기분 체크로 시작합니다" },
          { label: "안내", value: "오픈북 규칙 · Grill me · 제출 방법을 함께 봅니다" },
          { label: "고르기", value: "네 사례 중 하나를 고릅니다" },
          { label: "쓰기", value: "① 원인·피해 · ② 대처 · ③ 예방(개인+공동체, 근거 포함)" },
          { label: "Grill", value: "AI가 되물으면 ④ 꼬리답변을 내 말로 씁니다" },
          { label: "제출", value: "1차 제출 → AI 점검 → 2차 제출 → 선생님 검토 → 통과" },
          { label: "통과 후", value: "선생님이 「통과」를 누르면 게임 4종으로 넘어갑니다" },
        ],
        highlights: [
          "핵심 활동은 약 25분입니다. 통과한 학생은 남은 시간에 게임을 할 수 있어요.",
          "빨리 끝내고 선생님을 기다리는 동안엔 다른 사례도 생각해 봐도 좋아요.",
        ],
      },
      {
        label: "오픈북 규칙",
        subtitle: "AI를 참고해도 됩니다 — 다만 밝히고, 내 말로 씁니다",
        note: "",
        rows: [
          { label: "써도 되는 것", value: "막힐 때 AI·인터넷에 물어보기, 낱말 찾기, 내 문장 다듬기" },
          { label: "밝히는 곳", value: "「출처」 칸에 무엇을 물었고 어디까지 썼는지 한 줄" },
          { label: "직접 입력", value: "답 칸은 붙여넣기가 꺼져 있어요 — 참고한 것을 내 말로 다시 씁니다" },
          { label: "안 되는 것", value: "AI 답을 통째로 옮겨 붙이기" },
        ],
        highlights: [
          "AI를 쓰는 것은 괜찮아요. 밝히지 않고 그대로 내는 것이 문제입니다.",
          "AI 답을 그대로 내면, 내가 쓴 것이 없어서 채점할 것도 없어집니다.",
        ],
      },
      {
        label: "Grill me 란",
        subtitle: "AI가 내 답을 근거로 되묻습니다",
        note: "",
        rows: [
          { label: "무엇을", value: "내가 고른 사례와 내 분석·대처·예방을 AI가 읽습니다" },
          { label: "AI가 하는 일", value: "점수가 아니라, 아직 약한 곳을 질문 2개로 되묻습니다" },
          { label: "내가 하는 일", value: "그 질문에 ④ 꼬리답변 칸에서 내 말로 답합니다" },
        ],
        highlights: [
          "AI 질문에 자기 말로 답하는 것까지가 오늘 평가의 한 부분입니다.",
        ],
      },
    ],
  },

  /*
   * 성찰 한 줄 — 마감 뒤라 가볍게. 오늘 고른 사례에서 실천할 것 하나.
   */
  reflectionQuestions: [
    "오늘 고른 사례에서, 내가 오늘부터 실천할 예방·대처 한 가지를 적어 봅시다.",
  ],
  reflectionPublic: false,

  /*
   * 활동지 중에는 이탈로 세지 않는다 — 오픈북이라 검색·AI 참고를 해야 한다.
   * 이탈로 세면 눈치를 보느라 안 찾고, 그러면 오픈북이 무의미해진다(5·6·7차시와 같은 이유).
   */
  focusExempt: ["worksheet"],
  phaseLabels: {
    assessment: "오늘 할 일",
    worksheet: "사례 골라 쓰고 제출하기",
  },
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리는 차시가 아니다 — 비우면 글만 쓰는 활동으로 잡는다
    places: [],
    year: 2036,
    worksheetIntro: {
      heading: "디지털 시민 리포트 (2부) — 사례 하나를 골라 깊게",
      body:
        "네 가지 디지털 윤리 위반 상황 중 하나를 골라, 원인·피해를 분석하고 대처와 예방을 씁니다.\n" +
        "AI에게 물어봐도 되지만(오픈북), 답 칸은 붙여넣기가 꺼져 있어요 — 내 말로 다시 씁니다.",
    },
    worksheet: WORKSHEET,
    /*
     * 서로 구경하기를 **막는다.** 사례 답에 실제 경험이 드러날 수 있어 친구에게 나가면
     * 안 된다(10차시 논술과 같다). 특히 신상 유출·사이버 폭력 사례라 더 그렇다.
     */
    galleryEnabled: false,
    /*
     * 출처 두 칸을 **켠다** — 오픈북이라 AI·인터넷 참고를 밝히는 것이 평가 항목이다
     * (수행평가1의 출처 밝히기 태도). 10차시는 껐지만 오늘은 켠다.
     */
    sourcesEnabled: true,
    sourceHints: {
      site: "예) 학교 누리집 사이버폭력 대처 안내 (2026)",
      ai: "예) 챗지피티 — ‘단톡방에서 욕을 당할 때 대처법’ 물어봄. 답 중 ‘증거 캡처’ 만 참고하고 나머지는 내가 씀",
    },
  },
};

async function main(): Promise<void> {
  const existing = await db.collection(LESSON_PLANS).where("lessonNo", "==", LESSON_NO).get();
  const now = Date.now();

  if (!existing.empty) {
    const doc = existing.docs[0];
    await doc.ref.set({ ...PLAN, updatedAt: now }, { merge: true });
    console.log(`↻ 갱신 — ${PLAN.title} (${doc.id})`);

    /* 9·10차시와 같은 규칙 — 아직 아무도 안 들어온 수업에만 반영한다 */
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (9·10·11차시가 함께 쓰는 통 — 문항 key 는 news_check2 만 재사용)`);
  console.log("단계: 대기 → 기분 → 오늘 할 일(assessment) → 사례 골라 쓰고 제출하기(worksheet) → 성찰 → 마침");
  console.log("25분 핵심 + ~10분 보상: 통과한 학생은 게임 4종(한붓그리기·똥 피하기·하노이탑·2048)으로 넘어갑니다.");
  console.log("사례 4편 고정 지문(각 ~10줄): 학생이 고르면 case_story 가 그 사례 이야기만 펼침(실시간 AI 생성 아님).");
  console.log("복붙 방지: 답 칸 noPaste + Grill me(논술 persona/폴백). 제출 문턱=분석·대처·예방·꼬리답변 각 2문장.");
  console.log("galleryEnabled: false / sourcesEnabled: true(오픈북 출처 밝히기).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
