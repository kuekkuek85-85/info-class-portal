/**
 * 10차시 차시 계획 등록 — 「디지털 윤리 ② 사이버 윤리」.
 *
 *   node --env-file=.env.local scripts/seed-lesson10.ts
 *
 * ## 9차시와 한 묶음이다
 *
 * 활동 통(activityId)을 9차시와 **같이 쓴다**(digital-ethics). 9·10·11차시가 한 통을
 * 공유하므로 오늘 쓴 논술 한 줄이 11차시 화면에서도 그대로 열린다. 문항 key 는 9차시와
 * 겹치지 않게 새로 짓는다(cyber_*, sc_*) — 같은 통에 나란히 담기되 서로 덮지 않는다.
 *
 * ## 이 차시가 하는 일
 *
 *   · 기분 체크와 출석
 *   · **오늘 할 일** 보드(assessment) — 학습목표 2개 + 저작권(CCL) 복습 + 사이버 폭력
 *     유형 6종 + 대처·예방 6단계. 되돌아가 볼 수 있는 읽기용 탭이다(슬라이드는 지나가면 없다)
 *   · **활동 1(build 단계)** — 스마트폰 중독 자가진단 15문항(1~4점). 먼저 한다.
 *     점수는 서열화·공개 금지, 교사만 본다
 *   · **활동 2(emotion 단계)** — 사이버 폭력. 논술(대처방안) 두 사례를 먼저 쓰고,
 *     체험 사이트(doran.edunet.net/cyverse/gl/web/)를 **맨 마지막**에 새 창으로 연다
 *   · 성찰
 *   · **다음 시간(progress)** — 수행평가 1 (2부): 디지털 시민 리포트
 *
 * ## 저작권(CCL) 복습은 "짚고 넘어가는" 수준이다
 *
 * 지난 시간에 이미 가르쳤다. 새로 가르치면 시간이 밀린다 — 이용허락조건 4가지와 그것을
 * 조합한 CC 라이선스 6종을 탭 하나에 담아 "한 번 더 본다" 로만 둔다.
 *
 * ## 자가진단은 자동 채점한다 (역채점 반영)
 *
 * scale_result 문항이 15문항 답에서 총점(60점 만점)과 결과 구간을 **실시간으로** 계산해
 * 보여준다. 8·10·13번은 역채점 문항이라(조절할 수 있다·불안하지 않다·방해가 되지 않는다 —
 * 건강한 쪽이 "매우 그렇다") scale-score 가 선지 index 로 점수를 뒤집어 계산한다.
 * 계산은 학생 본인 화면에서만 돌고 점수를 따로 저장하지 않는다 — 각 답(sc_q*)만 개인용으로
 * 저장되므로 교사는 응답으로 확인할 수 있다. 점수 서열화·공개는 없다.
 *
 * 응답을 버리지 않고 저장하는 이유: 자가진단의 목적이 "위험 신호가 있는 학생을 조용히
 * 살펴보는 것"이라, 교사가 개별 응답을 볼 수 있어야 한다. 대신 galleryEnabled 를 꺼서
 * 친구에게는 절대 안 나가게 한다(논술 답도 같다).
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
const LESSON_NO = 10;

/** 9차시와 같은 규칙 — 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/** 9차시와 **같은 통**. 9·10·11차시가 함께 쓴다(기사 통 career-plan 과는 다르다) */
const ACTIVITY_ID = "digital-ethics";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/** 자가진단 척도 — 4단계 공통 선지. 역채점 안내는 뒤 문항에서 따로 편다 */
const SCALE = ["전혀 그렇지 않다", "그렇지 않다", "그렇다", "매우 그렇다"];

/**
 * 스마트폰 중독 자가진단 15문항. 슬라이드 그대로 옮긴다.
 *
 * `reverse` 는 역채점 문항(8·10·13) 표시용 — 문항 자체는 안 바꾸고, 채점 안내에서
 * 이 셋을 뒤집어 계산하라고 설명한다.
 */
const SELF_CHECK: { text: string; reverse?: boolean }[] = [
  { text: "스마트폰의 지나친 사용으로 학교 성적이 떨어졌다." },
  { text: "가족이나 친구들과 함께 있는 것보다 스마트폰을 사용하고 있는 것이 더 즐겁다." },
  { text: "스마트폰을 사용할 수 없게 된다면 견디기 힘들 것이다." },
  { text: "스마트폰 사용 시간을 줄이려고 해보았지만 실패했다." },
  { text: "스마트폰 사용으로 계획한 일(공부, 숙제 또는 학원 수강 등)을 하기 어렵다." },
  { text: "스마트폰을 사용하지 못하면 온 세상을 잃은 것 같은 생각이 든다." },
  { text: "스마트폰이 없으면 안절부절 못하고 초조해진다." },
  { text: "스마트폰 사용 시간을 스스로 조절할 수 있다.", reverse: true },
  { text: "수시로 스마트폰을 사용하다가 지적을 받은 적이 있다." },
  { text: "스마트폰이 없어도 불안하지 않다.", reverse: true },
  { text: "스마트폰을 사용할 때 ‘그만해야지’라는 생각은 하면서도 계속한다." },
  { text: "스마트폰을 너무 자주 또는 오래 한다고 가족이나 친구들로부터 불평을 들은 적이 있다." },
  { text: "스마트폰 사용이 지금 하고 있는 공부에 방해가 되지 않는다.", reverse: true },
  { text: "스마트폰을 사용할 수 없을 때 패닉 상태에 빠진다." },
  { text: "스마트폰 사용에 많은 시간을 보내는 것이 습관화되었다." },
];

const WORKSHEET: WorksheetQuestion[] = [
  /*
   * ── 활동 1 · 스마트폰 중독 자가진단 (STEP 단계: build) ──
   *
   * 자가진단을 **먼저** 한다. build 단계에 둔다 — LESSON_PHASES 순서에서 오늘 할 일
   * (assessment) 다음의 STEP 단계이고, 뒤의 사이버 폭력(emotion, 더 뒤 STEP)보다 앞선다.
   * 그래서 단추가 「활동 1 자가진단 → 활동 2 사이버 폭력」 순으로 뜬다. 두 단계 모두
   * 기본 이름을 phaseLabels 로 덮는다(build="만들기", emotion="AI 감정 렌즈").
   * 문항 kind 가 note/choice 라 STEP 전용 UI 는 뜨지 않는다(그 UI 는 kind 로만 뜬다).
   *
   * 15문항을 choice 로 하나씩 받고, 마지막 scale_result 문항이 총점·구간을 자동 계산한다.
   * 각 답은 개인용으로만 저장된다(galleryEnabled: false).
   */
  {
    key: "_selfcheck_intro",
    phase: "build",
    label: "활동 1 · 청소년 스마트폰 중독 자가진단",
    hint:
      "각 문항을 읽고 나에게 해당하는 정도를 하나 골라 표시해 보세요.\n" +
      "· 이 결과는 나만 보는 개인용입니다. 친구와 비교하거나 점수를 서로 말하지 않습니다.\n" +
      "· 정답이 있는 것이 아니라, 내 스마트폰 사용 습관을 스스로 돌아보는 것입니다.\n\n" +
      "선지: 전혀 그렇지 않다(1점) · 그렇지 않다(2점) · 그렇다(3점) · 매우 그렇다(4점)",
    kind: "note",
    maxLength: 0,
  },
  ...SELF_CHECK.map<WorksheetQuestion>((item, i) => ({
    key: `sc_q${i + 1}`,
    phase: "build",
    label: `${i + 1}. ${item.text}`,
    hint: "",
    kind: "choice",
    choices: SCALE,
    maxLength: 20,
  })),
  /*
   * 자동 채점 결과 — scale_result. 15문항 답에서 총점·구간을 실시간 계산해 보여준다.
   *
   * 역채점(8·10·13)은 scale-score 가 선지 index 로 뒤집어 계산한다(문구 하드코딩 없음).
   * 결과는 학생 본인 화면에서만 계산되고 저장하지 않는다 — 점수 서열화·공개 없음.
   * hint 에 역채점 문항이 무엇인지 한 줄만 남겨 학생이 이해하게 한다.
   */
  {
    key: "_selfcheck_score",
    phase: "build",
    label: "자가진단 결과",
    hint:
      "15문항을 다 고르면 아래에 총점(60점 만점)과 결과 구간이 자동으로 나옵니다.\n" +
      "· 8·10·13번은 거꾸로 채점됩니다(‘조절할 수 있다 / 불안하지 않다 / 방해가 되지 않는다’ " +
      "라서, 건강한 답이 오히려 낮은 점수예요). 자동으로 반영됩니다.\n" +
      "· 이 결과는 나만 보는 개인용입니다. 걱정되면 혼자 두지 말고 선생님이나 부모님께 " +
      "이야기해도 좋아요.",
    kind: "scale_result",
    scale: {
      sumKeys: SELF_CHECK.map((_, i) => `sc_q${i + 1}`),
      // 역채점 문항: 8·10·13번 (SELF_CHECK 의 reverse 표시와 일치)
      reverseKeys: SELF_CHECK.map((item, i) => (item.reverse ? `sc_q${i + 1}` : ""))
        .filter(Boolean),
      // 선지 배열 = SCALE (index+1 이 점수). 역채점은 (4+1-점수) 로 뒤집힌다
      choices: SCALE,
      // 큰 경계부터 맞춰 본다 (scale-score 가 정렬해 처리): 45↑ 고위험 · 42~44 잠재 · 41↓ 일반
      bands: [
        {
          min: 45,
          label: "고위험 사용자군 (45점 이상)",
          desc:
            "스마트폰 중독 경향이 높게 나왔어요. 도움이 필요하면 인터넷중독대응센터" +
            "(☎ 1599-0075)에 요청할 수 있습니다.",
        },
        {
          min: 42,
          label: "잠재적 위험 사용자군 (42~44점)",
          desc: "주의가 필요합니다. 스스로 조절하고 계획적으로 사용하도록 노력해요.",
        },
        {
          min: 0,
          label: "일반 사용자군 (41점 이하)",
          desc: "건전한 사용을 이어 가되, 가끔 스스로 점검해 봅시다.",
        },
      ],
    },
    maxLength: 0,
  },

  /*
   * ── 활동 2 · 사이버 폭력 (STEP 단계: emotion) ──
   *
   * 자가진단(build) 다음의 STEP 단계라 단추가 뒤에 뜬다. 이 단계 **안의 순서**가 설계다:
   * 논술(대처방안 작성)을 먼저 하고, 체험 사이트를 **맨 마지막**에 둔다 — 체험 사이트가
   * 로딩·진행이 오래 걸려서, 나머지를 끝낸 뒤 체험으로 이어지게 한다. 문항 배열 순서가
   * 곧 학생이 보는 순서다.
   *
   * 논술 답은 개인적인 의견이라 친구에게 안 나간다(galleryEnabled: false).
   */
  {
    key: "_cyber_essay_head",
    phase: "emotion",
    label: "활동 2 · 사이버 상황별 대처방안 작성",
    hint: "두 이야기를 읽고, 홍길동이 어떻게 대처해야 할지 자신의 의견을 각각 써 봅시다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "cyber_essay1",
    phase: "emotion",
    label: "사례 ①",
    hint:
      "장평중학교 1학년 10반 홍길동은 요즘 들어 등교하기가 너무 두렵다. 학교에 가면 반에 힘센 " +
      "친구들이 매번 스마트폰의 데이터 핫스팟을 틀어달라고 하며 내 스마트폰 데이터를 빌려 쓰기 " +
      "때문이다. 이것 때문에 이번 달 요금제의 데이터도 다 써버려서 부모님께 다시 말씀드려 추가 " +
      "결제하고 데이터를 충전하였다. 부모님께서는 충전해주시면서 학생이 무슨 데이터를 그렇게 " +
      "많이 쓰냐며 혼내셨지만, 걱정하실까 봐 이 사실을 솔직히 말씀드릴 수가 없었다. 상황은 점점 " +
      "더 심각해져서, 최근에는 다른 반까지 소문이 나서 다른 반의 친구들까지도 우리 반에 놀러 와 " +
      "내 스마트폰 데이터를 빌려 쓰기 시작했다. 홍길동은 화가 매우 났지만 이러한 상황에 어떻게 " +
      "대처해야 할지 몰라 당하고 있을 수밖에 없었다.\n\n" +
      "→ 홍길동은 어떻게 대처해야 할까요? 자신의 의견을 써 봅시다.(2줄 이상)",
    kind: "long",
    maxLength: 1000,
  },
  {
    key: "cyber_essay2",
    phase: "emotion",
    label: "사례 ②",
    hint:
      "장평중학교 1학년 10반 홍길동은 갑자기 단체 카카오톡 대화방에 초대되었다. 대화방에는 평소 " +
      "사이가 좋지 않았던 몇몇 친구들이 있었다. 이름을 모르는 친구들도 있는 것 보니 다른 반 " +
      "친구들도 대화방에 있는 것 같았다. 한 친구가 갑자기 홍길동에게 욕을 하기 시작했다. 홍길동은 " +
      "대항하고 싶었으나 대화방에 있던 다른 친구들도 함께 홍길동에게 단체로 욕을 하는 바람에 그럴 " +
      "수 없었다. 홍길동은 당황스럽고 불쾌해서 단체 대화방을 나갔다. 하지만 나간 뒤 10초도 지나지 " +
      "않아 다시 그 대화방에 초대되었다. 단체 대화방의 친구들은 계속해서 욕을 했고 심지어는 " +
      "홍길동의 부모님 욕도 하기 시작했다. 홍길동은 화가 매우 났지만 이러한 상황에 어떻게 대처해야 " +
      "할지 몰라 당하고 있을 수밖에 없었다.\n\n" +
      "→ 홍길동은 어떻게 대처해야 할까요? 자신의 의견을 써 봅시다.(2줄 이상)",
    kind: "long",
    maxLength: 1000,
  },

  /*
   * 사이버 폭력 간접 체험 — 이 단계의 **맨 마지막**. 새 창으로 열어 겪는다.
   *
   * 체험 사이트가 바깥이라 iframe 대신 링크 단추로 연다(worksheet linkUrl 은 새 창).
   * 로딩·진행이 오래 걸려, 논술을 끝낸 학생이 마지막에 이어서 체험한다.
   * 이 단계(emotion)를 focusExempt 로 두어, 학생이 창을 옮겨도 이탈로 세지 않는다.
   */
  {
    key: "_cyber_intro",
    phase: "emotion",
    label: "마지막 · 사이버 폭력 간접 체험",
    hint:
      "마지막으로, 아래 사이트에 들어가 사이버 폭력을 직접 체험해 봅시다.\n" +
      "사이트가 열리면 「혼자하기」를 누르고 시작하세요.\n" +
      "(사이트가 뜨는 데 조금 시간이 걸릴 수 있어요. 잠시 기다려 주세요.)\n" +
      "새 창으로 열려요 — 다 보고 이 화면으로 돌아오세요.",
    kind: "note",
    linkUrl: "https://doran.edunet.net/cyverse/gl/web/",
    linkLabel: "체험 사이트 열기",
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  /* 9차시와 같은 규칙 — 「디지털 시민 리포트」 이름을 안 쓴다. 묶음은 번호(9·10·11)로 보인다 */
  title: "디지털 윤리 ② — 사이버 윤리",
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
   * 진도 안내(progress)에 **다음 시간 = 수행평가 1 (2부)** 를 둔다.
   *
   * 슬라이드 순서상 맨 끝의 "다음 차시 안내"지만, 단계 순서에서 progress 는 앞쪽이다.
   * 교사가 수업 끝에 이 단계를 눌러 보여준다(phaseLabels 로 단추 이름을 "다음 시간" 으로).
   * assessment 는 오늘 할 일 보드로 이미 쓰고 있어, 다음 시간 안내는 progress 로 뺐다.
   *
   * ※ 슬라이드 표지는 "수행평가 2" 로 되어 있으나, 교사 지시대로 「수행평가 1 의 2부
   *    (디지털 시민 리포트)」 맥락으로 적는다.
   */
  progress: {
    heading: "다음 시간 — 수행평가 1 (2부)",
    body: "",
    url: "",
    tabs: [
      {
        label: "다음 시간에 할 일",
        subtitle: "디지털 시민 리포트 — 수행평가 1 의 2부",
        note:
          "다음 시간부터는 수행평가 1 의 2부, 「디지털 시민 리포트」 를 이어서 씁니다.\n" +
          "지금까지 배운 개인정보 보호와 사이버 윤리가 리포트의 바탕이 됩니다.",
        rows: [
          { label: "무엇을", value: "디지털 시민 리포트 (수행평가 1 · 2부)" },
          { label: "바탕이 되는 것", value: "개인정보 보호 · 사이버 윤리 · 저작권" },
          { label: "평가 방식", value: "1차 제출 → AI 점검 → 2차 제출 → 선생님 검토 → 통과" },
        ],
        highlights: [
          "오늘 쓴 논술과 성찰은 다음 시간 리포트를 쓸 때 다시 열어 볼 수 있습니다.",
        ],
      },
    ],
  },

  assessment: {
    heading: "오늘 할 일 — 사이버 윤리",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘 배울 것",
        subtitle: "사이버 윤리를 왜 지켜야 하고, 어떻게 실천하는가",
        note: "설명은 앞 화면으로 같이 봅니다. 이 탭들은 활동 중에 되돌아와 볼 수 있어요.",
        rows: [
          { label: "학습목표 ①", value: "사이버 윤리를 지켜야 하는 이유를 설명할 수 있다." },
          { label: "학습목표 ②", value: "사이버 폭력과 스마트폰 중독을 예방하는 방법을 실천할 수 있다." },
          { label: "오늘 순서", value: "저작권 복습 → 사이버 폭력 유형·대처 → 활동 1 자가진단 → 활동 2 논술 → 체험" },
        ],
        highlights: [
          "사이버 공간에서 한 일은 현실에도 그대로 영향을 줍니다. 화면 뒤에도 사람이 있어요.",
        ],
      },
      /*
       * 저작권(CCL) 복습 — 지난 시간에 배운 것을 한 번만 짚는다. 새로 가르치지 않는다.
       */
      {
        label: "저작권 복습 (CCL)",
        subtitle: "지난 시간에 배운 것 — 한 번만 짚고 갑니다",
        note:
          "이용허락조건 4가지를 조합하면 CC 라이선스 6종이 됩니다. 새로 외우지 않아도 돼요 — " +
          "마크를 보고 “무엇을 허락하고 무엇을 금지하는지” 만 읽을 수 있으면 됩니다.",
        rows: [
          { label: "저작자표시 (BY)", value: "저작자와 출처를 표시해야 합니다." },
          { label: "비영리 (NC)", value: "비영리 목적으로만 사용할 수 있습니다." },
          { label: "변경금지 (ND)", value: "원저작물 그대로 쓰고 수정하지 말아 주세요." },
          { label: "동일조건변경허락 (SA)", value: "이용해 새로 만든 창작물에 같은 라이선스를 붙여야 합니다." },
        ],
        highlights: [
          "CC 라이선스 6종: CC BY · BY-NC · BY-ND · BY-SA · BY-NC-SA · BY-NC-ND",
        ],
        // CC 라이선스 6종 배지 이미지를 텍스트와 함께 띄운다 (흰 배경 고정 — 테마 안전)
        imageUrl: "/ccl-licenses.svg",
        imageAlt: "CC 라이선스 6종 배지 — CC BY, BY-NC, BY-ND, BY-SA, BY-NC-SA, BY-NC-ND",
      },
      /*
       * 사이버 폭력 유형 6종 — 슬라이드 그대로. 간접 체험·논술 때 되돌아와 본다.
       */
      {
        label: "사이버 폭력 유형",
        subtitle: "여섯 가지 — 무엇이 사이버 폭력인지",
        note: "인터넷·스마트폰에서 다른 사람을 괴롭히는 행위는 모두 사이버 폭력입니다.",
        rows: [
          { label: "사이버 명예훼손", value: "인터넷에서 다른 사람에 대한 거짓된 이야기나 잘못된 이야기를 퍼뜨리는 행위" },
          { label: "사이버 언어폭력", value: "인터넷에서 누군가에게 욕설을 하거나 감정을 상하게 하는 행위" },
          { label: "사이버 스토킹", value: "상대가 싫어하는데도 전자우편·쪽지를 계속 보내거나, 블로그·SNS에 계속 방문해 글·사진을 남기는 행위" },
          { label: "사이버 따돌림(왕따)", value: "대화방·스마트폰 등에서 상대를 나가지 못하게 막고 놀리거나 욕하거나, 대화에 참여하지 못하게 하는 행위" },
          { label: "신상 정보 유출", value: "누군가의 신상 정보(이름, 사는 곳, 학교, 사진 등)를 인터넷에 퍼뜨리는 행위" },
          { label: "사이버 성폭력", value: "상대가 싫어할 줄 알면서도 인터넷에서 음란한 글·사진·동영상을 보내는 행위" },
        ],
        highlights: [
          "장난이라고 생각한 것도, 상대가 싫어하면 사이버 폭력입니다.",
        ],
      },
      /*
       * 대처·예방 6단계 — 슬라이드 그대로. 논술 활동의 근거가 된다.
       */
      {
        label: "대처와 예방",
        subtitle: "사이버 폭력에 대처하는 방법",
        note:
          "사이버 폭력을 당하거나 목격하면, 감정으로 맞서기 전에 아래 순서대로 움직입니다. " +
          "예방의 시작은 내 개인정보가 새어 나가지 않게 하는 것입니다.",
        rows: [
          { label: "1", value: "감정적으로 대응하지 말고, 거부 의사를 분명히 한다." },
          { label: "2", value: "사이버 폭력 증거를 수집한다(화면 캡처 등)." },
          { label: "3", value: "사이버 폭력 자료의 삭제와 사과를 요구한다." },
          { label: "4", value: "혼자 고민하지 말고 부모님·선생님·학교 전담 경찰관께 알린다." },
          { label: "5", value: "사이버 폭력 전문 기관에 도움을 요청한다." },
          { label: "6", value: "사이버 안전국 등 경찰에 신고한다(신고 전화: 117)." },
        ],
        highlights: [
          "혼자 참지 마세요. 증거를 남기고 어른에게 알리는 것이 가장 빠른 해결입니다. 급하면 117.",
        ],
      },
    ],
  },

  video: empty(),

  /*
   * 성찰 한 문항 — 오늘부터 실천할 것 하나. 개인적인 다짐이라 비공개.
   */
  reflectionQuestions: [
    "사이버 윤리를 지키기 위해 오늘부터 내가 실천할 것을 한 가지 적어 봅시다.",
  ],
  reflectionPublic: false,

  /*
   * 체험 사이트가 바깥 창이라, 그 단계(emotion, 활동 2)에서 창을 옮기는 것을 이탈로
   * 세지 않는다 (9차시가 활동 링크 단계를 focusExempt 로 둔 것과 같은 이유).
   */
  focusExempt: ["emotion"],
  /*
   * 두 활동을 STEP 단계에 배정하고 기본 이름을 덮는다.
   *  · 활동 1 자가진단 → build 단계 (기본 "만들기")   — 먼저
   *  · 활동 2 사이버 폭력 → emotion 단계 (기본 "AI 감정 렌즈") — 나중
   * LESSON_PHASES 순서상 build(먼저) < emotion(나중) 이라 단추도 이 순서로 뜬다.
   */
  phaseLabels: {
    assessment: "오늘 할 일",
    build: "활동 1 · 스마트폰 중독 자가진단",
    emotion: "활동 2 · 사이버 폭력 알아보기",
    progress: "다음 시간",
  },
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리는 차시가 아니다 — 비우면 글만 쓰는 활동으로 잡는다
    places: [],
    year: 2036,
    worksheet: WORKSHEET,
    /*
     * 서로 구경하기를 **막는다.** 논술 답도 자가진단 응답도 개인적인 내용이라 친구에게
     * 나가면 안 된다. 특히 자가진단 점수는 서열화·공개 금지 — 고위험군이 드러나면 공개
     * 망신이 된다. 교사 화면에서만 본다.
     */
    galleryEnabled: false,
    // 출처 두 칸은 수행평가1의 평가 항목이라 붙여 둔 것이다. 오늘은 쓸 일이 없다
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

    /* 9차시와 같은 규칙 — 아직 아무도 안 들어온 수업에만 반영한다 */
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (9·10·11차시가 함께 쓰는 통 — 문항 key 는 9차시와 안 겹칩니다)`);
  console.log(
    "단계: 대기 → 기분 → 오늘 할 일 → 활동 1 자가진단(build) → 활동 2 사이버 폭력(emotion) → 성찰 → 다음 시간 → 마침",
  );
  console.log("활동 1=자가진단(build), 활동 2=사이버 폭력(emotion). 활동 2 안: 논술 사례①·② → (맨 끝) 체험 사이트.");
  console.log("체험 사이트: https://doran.edunet.net/cyverse/gl/web/ (새 창)");
  console.log("자가진단 15문항 답에서 총점·구간을 자동 채점(역채점 8·10·13 반영)해 학생 화면에만 표시합니다.");
  console.log("galleryEnabled: false — 논술·자가진단이 친구에게 안 나갑니다.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
