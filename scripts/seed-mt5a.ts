/**
 * 「디지털 마음 톡톡」(자유학기 주제선택) 5회기 · 1차시 —
 * 실패를 노래로 자랑하기 · 준비와 생성.
 *
 *   node --env-file=.env.local scripts/seed-mt5a.ts
 *
 * ## 자기 영역을 닫는 회기다
 *
 * 2·3회기가 감정 인식, 4회기가 감정 조절이었다. 5회기는 자기 영역(자기 이해)의
 * 마지막이다 — 나를 이해하고(강점) → 넘어져도 일어서고(실패) → 그것을 노래로
 * 표현한다. KAIST 실패연구소의 「망한 과제 자랑대회」를 중1 교실로 옮겨,
 * 실패를 부끄러워하지 말고 **노래로 자랑**하게 한다.
 *
 * 서울시교육청 사회정서교육자료 활동지 11·12(약점·강점 인식·구체화)와
 * 10-1·10-2(실패 이력서)를 재료로 삼되, 산출물은 이력서가 아니라 Suno AI 노래다.
 *
 * ## 두 차시가 한 작품 문서를 이어 쓴다
 *
 * 이 1차시(205)에서 강점 문장·자랑 타이틀·가사 한 줄·노래 링크를 쓰고,
 * 2차시(206·seed-mt5b)에서 그 값을 그대로 열어 서로 감상하고 반응한다.
 * 그래서 **활동 ID(mt-2026-3)를 두 차시가 같게** 둔다 — hai 연속 차시와 같은 방식
 * (gallery.ts 의 activityIdFor · hai4 의 build_url 이어받기).
 *
 * 이 회기는 감정 인식 3회기까지의 mt-2026-2 와 다른 통을 쓴다. 실패→노래는
 * 지난 감정 캐릭터와 이어지는 활동이 아니라 새 작품이라, 통을 새로 연다.
 *
 * ## 프라이버시 — 이 과목의 1순위
 *
 * 실패 선정·관점 전환·강점 문장은 **취약한 자기노출**이라 본인·교사만 본다.
 * 1차시는 서로 구경하기를 아예 닫는다(galleryEnabled: false). 친구에게 나가는 것은
 * 2차시에서, 그것도 **노래 링크·자랑 타이틀·가사 한 줄·별점** 네 칸뿐이다
 * (거르는 자리는 서버다 — gallery 라우트의 galleryAnswerKeys).
 *
 * AI 감정 렌즈는 켜지 않는다. emotion_lens 종류 문항이 하나도 없으면 Gemini 호출이
 * 아예 없다(emotion/route.ts). 위기 신호는 2차시 갤러리에서 서버가 로컬로 걸러
 * 교사에게 사실만 알린다(checkCrisis → flagCareAlert, 무엇을 썼는지는 안 보냄).
 *
 * ## Suno 로그인 로지스틱스 (교사 안내 — 흐름은 아래 활동을 그대로 따른다)
 *
 *  · Microsoft 로그인이 약 10분 걸리고 Outlook 코드 인증이 필요할 수 있다.
 *    학생 계정은 26학번5자리@jangpyung.sen.ms.kr, 비번은 개인별.
 *  · 로그인을 활동 시간에서 빼라 — **짝당 1계정**으로 로그인 횟수를 절반으로 줄이고,
 *    도입의 종이(강점 문장·실패 선정)와 **병렬**로 돌린다. 이 활동지의 build 단계 맨
 *    위 로그인 안내가 그 자리다. 가능하면 전날 조례/숙제로 미리 뚫어 둔다.
 *  · 학교 MS 테넌트가 외부앱 로그인을 막을 수 있다 — 수업 전 교사가 본인/테스트
 *    계정으로 로그인~노래 생성까지 실제로 완주해 확인하라. 막히면 교사 공용 계정으로
 *    대표 생성하거나, 아래 '가사만/카드만' 대체 경로로 돌린다.
 *  · 학교 이메일과 가사(실패담)가 제3자(Suno)로 전송된다. 민감한 실패는 가사에서
 *    빼도록 안내하고, 학부모/학교 고지가 필요한지는 학교 지침에 따라 교사가 판단한다.
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

/** ★ 2차시(seed-mt5b)와 같은 값. 이 값이 같아야 오늘 쓴 노래·타이틀이 다음 시간에 열린다 */
const ACTIVITY_ID = "mt-2026-3";
const LESSON_NO = 205;

/** Suno. 분반 무관 단일 공개 주소라 분반별 토큰이 없다 — 남의 분반으로 샐 것이 없다 */
const SUNO_URL = "https://suno.com/";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const WORKSHEET: WorksheetQuestion[] = [
  // ── ① 나의 강점 (자기이해 · problem) ─────────────────────────
  {
    key: "_str_note",
    phase: "problem",
    label: "먼저, 나를 이해하는 것부터",
    hint:
      "오늘은 자기 영역의 마지막 시간이에요. 나를 이해하고 → 넘어져도 일어서고 →\n" +
      "그걸 노래로 표현하는 데까지 갑니다. 시작은 내 강점이에요.\n" +
      "실패를 자랑하려면, 그걸 딛고 설 내 밑천부터 챙겨야 하거든요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "strength_kw",
    phase: "problem",
    label: "나의 강점 키워드 3개 이상 (형용사·명사 다 좋아요)",
    hint: "예) #끈기 있는  #웃음을 잃지 않는  #도전적인  #성실한  #배려심",
    kind: "text",
    maxLength: 120,
  },
  {
    key: "strength_line",
    phase: "problem",
    /*
     * 활동지 12 의 문장 완성. 이 문장이 오늘 실패를 버틸 심리적 안전판이자,
     * 뒤에서 가사 후렴의 재료가 된다. 취약한 칸은 아니지만 친구에게 내보내지 않는다 —
     * 갤러리로 나가는 것은 자랑 타이틀·가사 한 줄뿐이다.
     */
    label: "그 강점을 한 문장으로 — 나는 ___할 때, ___한 강점이 있다",
    hint:
      "예) 나는 힘든 과제가 나와도 끝까지 해 볼 때, 끈기라는 강점이 있다.\n" +
      "이 문장은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 200,
  },

  // ── ② 실패를 노래로 만들기 (build) ───────────────────────────
  {
    key: "_login",
    phase: "build",
    /*
     * 로그인을 맨 위에 둔다 — hai 차시와 같은 이유. 제일 오래 걸리는 일(약 10분)을 먼저
     * 눌러 두고, 뜨는 동안 아래 실패 선정·가사 쓰기를 종이처럼 진행한다. 짝당 1계정 권장.
     */
    label: "① Suno 열기 — 먼저 눌러 두세요 (로그인이 오래 걸려요)",
    hint:
      "아래 [Suno 열기] 를 누르고 [Microsoft로 계속하기] 를 고르세요.\n" +
      "내 학교 계정은 아래 칸에 있어요. [복사하기] 로 그대로 붙여 넣으면 됩니다.\n" +
      "비밀번호는 학교 계정 비밀번호예요. 짝과 한 계정으로 함께 해도 좋아요.\n\n" +
      "· 코드를 물어보면 → 태블릿에서 학교 메일(Outlook) 을 열어 받은 코드를 넣으세요\n" +
      "· 로그인이 오래 걸려요 → 그 사이 아래 ‘실패 고르기·가사 쓰기’ 를 먼저 하세요\n" +
      "· 화면이 안 넘어가거나 막힌다 → 손을 드세요 (가사만 써도 괜찮아요)",
    kind: "note",
    // 학생마다 자기 학교 계정이 복사된다 (worksheet-view 의 named 치환)
    copyText: "{학교계정}",
    linkUrl: SUNO_URL,
    linkLabel: "Suno 열기 (새 창)",
    maxLength: 0,
  },
  {
    key: "_pick_note",
    phase: "build",
    label: "② 가장 화려하게 ‘망한’ 실패 하나를 고르세요",
    hint:
      "누가 더 크게 망했나를 노래로 자랑하는 대회예요. 부끄러워 말고 오히려 뻥튀기해서!\n" +
      "단, 웃으며 자랑할 수 있는 실패로 골라요. 아직 아픈 실패는 오늘 소재로 두지 말고\n" +
      "마음일기에만 적어도 됩니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "fail_pick",
    phase: "build",
    /*
     * 활동지 10-1 의 도전-결과. 취약한 자기노출이라 본인·교사만.
     * 갤러리 키에 들어가지 않는다.
     */
    label: "내 실패담 — 무엇에 도전했고, 어떻게 망했나요?",
    hint:
      "예) 두발자전거에 도전했다가 열 번 넘어졌다 / 학급 회장에 나갔다가 두 표 차로 떨어졌다\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "reframe",
    phase: "build",
    /*
     * 활동지 10-1 의 ‘긍정적으로 바라보기’ — ‘망했다’를 ‘~할 기회’로. 재의 꽃의 씨앗이다.
     * 취약 칸이라 갤러리에 안 나간다.
     */
    label: "그 실패를 뒤집어 보기 — ‘망했다’ 를 ‘~할 기회/배움’ 으로",
    hint:
      "예) 시험을 망쳤다 → 더 나은 공부법을 찾을 기회 / 넘어졌다 → 중심 잡는 법을 배웠다\n" +
      "이 칸도 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 250,
  },
  {
    key: "learn_line",
    phase: "build",
    /*
     * ‘재의 꽃’ — 실패에서 얻은 배움 한 줄. 노래 가사의 마지막 줄 재료.
     * 최종 결정상 갤러리로는 내보내지 않는다(자랑 타이틀·가사 한 줄만 공개).
     */
    label: "그 실패에서 얻은 것 한 줄 (재의 꽃)",
    hint: "예) 떨어져도 다시 도전할 용기를 얻었다. 이 칸은 나와 선생님만 봐요.",
    kind: "text",
    maxLength: 120,
  },
  {
    key: "brag_title",
    phase: "build",
    /*
     * ★ 갤러리 공개 키. 자랑 카드의 얼굴. 실패 상세 없이 유쾌한 제목만 친구에게 간다.
     */
    label: "③ 내 실패 자랑 타이틀 — 노래 제목이 돼요 (친구에게 공개)",
    hint:
      "실패를 자랑스러운 상 이름처럼! 예) ‘3년 연속 줄넘기 0개상’, ‘발표 울렁증 챔피언’\n" +
      "이 제목은 다음 시간에 친구들이 봅니다.",
    kind: "text",
    maxLength: 60,
  },
  {
    key: "lyric_line",
    phase: "build",
    /*
     * ★ 갤러리 공개 키 — 단, opt-in. 쓰면 공개되고 비워 두면 안 나간다.
     * 노래를 안 만드는 ‘가사만’ 경로 학생의 산출물이 되기도 한다.
     */
    label: "④ 노래 후렴에 넣을 가사 한 줄 (원하면 공개)",
    hint:
      "이 한 줄이 후렴이 돼요. 예) ‘넘어져도 나는 또 달린다’\n" +
      "⚠️ 이 줄은 친구에게 공개돼요. 공개하고 싶은 문장만 적으세요 — 비워 둬도 됩니다.",
    kind: "text",
    maxLength: 100,
  },
  {
    key: "_prompt_note",
    phase: "build",
    /*
     * 배포용 프롬프트 템플릿 3종. copyText 로 한 개를 통째로 복사하게 두고,
     * 학생은 대괄호만 자기 것으로 바꾼다.
     */
    label: "⑤ Suno 프롬프트 만들기 — 아래 틀에서 하나 골라 대괄호만 바꿔요",
    hint:
      "· 담담한 위로형: 장르: 잔잔한 K-발라드 / 무드: 담담하지만 희망적 / 주제: 나는 [실패]를 겪었지만 [배운 것]을 얻었다 / 한국어 가사, 후렴에 [자랑 타이틀]\n" +
      "· 뻔뻔한 자랑형: 장르: 신나는 힙합 / 무드: 당당하고 유쾌 / 주제: [화려하게 망한 일]을 자랑스럽게 뽐내기 / 후렴에 [자랑 타이틀] 반복, 한국어\n" +
      "· 씩씩한 극복형: 장르: 밝은 락 밴드 / 무드: 씩씩하게 다시 일어남 / 주제: [실패]에서 [극복한 행동]으로 일어선 이야기 / 한국어",
    kind: "note",
    copyText:
      "장르: 잔잔한 K-발라드 / 무드: 담담하지만 희망적 / 주제: 나는 [실패]를 겪었지만 [배운 것]을 얻었다 / 한국어 가사, 후렴에 [자랑 타이틀]",
    maxLength: 0,
  },

  // ── ③ 노래 생성하고 링크 내기 (emotion = 마지막 작업 단계) ──────
  {
    key: "_gen_note",
    phase: "emotion",
    /*
     * emotion 은 이 차시가 쓰는 STEP_PHASES 중 마지막이라 제출 단추가 여기 붙는다
     * (lesson/page.tsx 의 finalWorkPhase). 노래 링크를 이 단계에 둔다.
     */
    label: "⑥ Suno 에서 노래를 생성하세요 — 그리고 기다리는 동안",
    hint:
      "프롬프트를 넣고 [Create] 를 누르면 생성에 몇 분 걸려요. 기다리는 동안:\n" +
      "· 위 ③ 자랑 타이틀과 ④ 가사 한 줄, 아래 별점을 마저 채우세요\n" +
      "· 다 만들어지면 노래의 [Share] → 링크 복사 → 아래 칸에 붙여 넣으세요",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "build_url",
    phase: "emotion",
    /*
     * ★ 갤러리 공개 키. hai 의 build_url 과 같은 이름·역할 — 다음 차시에 그대로 열린다.
     * 노래를 못 만든 학생은 비워 둔다(가사만/카드만 경로). 비어도 카드는 뜬다.
     */
    label: "⑦ 내 노래 링크 (Suno 의 Share 주소를 붙여 주세요)",
    hint:
      "예) https://suno.com/song/....  다음 시간에 친구들이 이 링크로 노래를 들어요.\n" +
      "노래를 못 만들었으면 비워 둬도 괜찮아요 — 자랑 타이틀·가사만으로도 참여돼요.",
    kind: "text",
    maxLength: 300,
  },
  {
    key: "stars",
    phase: "emotion",
    /*
     * ★ 갤러리 공개 키. 활동지 10-2 의 ‘나의 능력치’ 를 별점 한 줄로 압축.
     * 2차시 갤러리 필터(facet)도 이 칸을 쓴다.
     */
    label: "⑧ 다시 도전하는 나의 능력치 — 별점으로 (예: ★★★★☆)",
    hint: "‘다시 도전하는 용기’ 를 스스로 별점으로 매겨 보세요. ★ 를 개수로 적으면 돼요.",
    kind: "text",
    maxLength: 20,
  },
  {
    key: "_relief_note",
    phase: "emotion",
    label: "노래 만들기가 어렵다면",
    hint:
      "괜찮아요. 참여하는 길은 여러 개예요 — 다음 시간에 똑같이 한 표씩 받습니다.\n" +
      "· 가사만: ④ 가사 한 줄만 채우기\n" +
      "· 카드만: ③ 자랑 타이틀 + ⑧ 별점만 채우기\n" +
      "무엇으로 참여할지는 내가 정해요.",
    kind: "note",
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "디지털 마음 톡톡 5회기 1차시 — 실패를 노래로 자랑하기 (준비·생성)",

  // 매 회기 첫 화면 루틴
  moodCheckEnabled: true,

  // 4·이전 회기와 같은 분반 표
  groups: [
    { key: "mt-tue-1", label: "화요일 1기", classNo: 1 },
    { key: "mt-thu-1", label: "목요일 1기", classNo: 2 },
    { key: "mt-tue-2", label: "화요일 2기", classNo: 3 },
    { key: "mt-thu-2", label: "목요일 2기", classNo: 4 },
  ],

  game: {
    heading: "기다리는 동안 — 똥 피하기",
    body:
      "노래가 만들어지길 기다리는 동안 잠깐 쉬어요.\n" +
      "위에서 떨어지는 똥을 좌우로 피하세요. 한 번이라도 맞으면 끝이에요.",
    url: "https://dodge-poop-game.vercel.app/",
  },
  gameExplainer: empty(),

  progress: {
    heading: "오늘 할 일 — 실패를 노래로 자랑하기 (1차시)",
    body:
      "자기 영역의 마지막 시간이에요. 오늘은 준비하고, 다음 시간에 서로 들어요.\n\n" +
      "① 나의 강점 — 실패를 딛고 설 밑천, 내 강점 한 문장 붙잡기\n" +
      "② 실패 노래 만들기 — 가장 화려하게 망한 실패 하나를 골라, 자랑 타이틀·가사·프롬프트 쓰기\n" +
      "③ 노래 생성 — Suno 로 노래를 만들고 링크 내기\n\n" +
      "맨 위 [Suno 열기] 를 먼저 누르세요. 로그인이 오래 걸리니, 뜨는 동안 아래 종이 작업을 먼저 합니다.\n" +
      "누가 더 크게 망했나를 자랑하는 대회예요 — 부끄러워 말고 유쾌하게! 단, 서로 비웃지 않기.\n" +
      "실패 상세·강점 문장은 나와 선생님만 봐요. 친구에게는 다음 시간에 노래·제목·가사 한 줄만 갑니다.",
    url: "",
  },
  assessment: empty(),
  video: empty(),

  /*
   * 마음일기 — 매 회기 루틴. reflectionPublic 은 반드시 false.
   * 세 번째 문항을 오늘 주제(실패·회복탄력성)로 둔다.
   */
  reflectionQuestions: [
    "오늘 마음에 남는 순간은 언제였나요? 무엇 때문에 그랬는지도 함께 적어 주세요.",
    "지금 내 기분은 어떤가요? 그리고 왜 그런 것 같나요?",
    "오늘 고른 실패를 노래로 만들어 보니 그 실패가 조금 다르게 느껴졌나요? 어떻게 달라졌는지 적어 주세요.",
  ],
  reflectionPublic: false,

  // Suno 로 나가는 것은 활동 자체라 이탈로 세지 않는다 (hai 의 build 단계와 같음)
  focusExempt: ["build", "emotion"],

  // 로그인·생성을 오가며 앞뒤 칸을 봐야 한다
  freeNavigation: true,

  phaseLabels: {
    mood: "마음 체크인",
    progress: "오늘 할 일",
    problem: "나의 강점",
    build: "실패 노래 만들기",
    emotion: "노래 생성·제출",
    reflection: "마음일기",
  },

  activity: {
    activityId: ACTIVITY_ID,
    // 그리기 없는 활동. 장소를 비우면 그림판이 안 뜬다
    places: [],
    year: 2026,
    worksheet: WORKSHEET,

    // 자료 찾기가 아니라 창작이라 출처 두 칸을 안 띄운다
    sourcesEnabled: false,

    /*
     * 1차시는 서로 구경하기를 닫는다. 감상·투표는 2차시에서 연다.
     * 이 값이 false 여야 서버가 갤러리 조회 자체를 거절한다(student/gallery 라우트).
     */
    galleryEnabled: false,

    /*
     * 아직 안 열리지만, 다음 차시와 같은 값을 미리 박아 둔다 — 문항을 늘렸을 때
     * 무엇이 친구에게 나가는지 한곳에서 관리하기 위해서다. 나가는 것은 이 네 칸뿐:
     * 노래 링크·자랑 타이틀·가사 한 줄·별점. 실패 상세·관점 전환·강점 문장·배움 한 줄은 뺀다.
     */
    galleryAnswerKeys: ["build_url", "brag_title", "lyric_line", "stars"],
    galleryNoun: "노래",
  },
};

async function main(): Promise<void> {
  const existing = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  const now = Date.now();

  if (existing.empty) {
    const ref = await db.collection("lessonPlans").add({ ...PLAN, createdAt: now, updatedAt: now });
    console.log(`✓ 등록 — ${PLAN.title} (${ref.id})`);
  } else {
    for (const doc of existing.docs) {
      await doc.ref.set({ ...PLAN, updatedAt: now }, { merge: true });
      console.log(`↻ 갱신 — ${PLAN.title} (${doc.id})`);

      // 아직 시작하지 않은 수업에만 다시 복사한다 (PRD 5.1)
      const all = await db.collection("classSessions").where("lessonPlanId", "==", doc.id).get();
      const scheduled = all.docs.filter(
        (s) => (s.data() as { status: string }).status === "scheduled",
      );
      for (const s of scheduled) await s.ref.set({ ...PLAN }, { merge: true });
      console.log(`   아직 시작하지 않은 수업 ${scheduled.length}개에 반영`);

      for (const s of all.docs.filter((x) => (x.data() as { status: string }).status !== "scheduled")) {
        const x = s.data() as { status: string; code: string };
        console.warn(`   ⚠ ${s.id} (코드 ${x.code}) 는 ${x.status} 상태라 건너뛰었습니다.`);
      }
    }
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} (2차시 seed-mt5b 와 같음 — 오늘 쓴 노래·타이틀이 다음 시간에 열립니다)`);
  console.log(`차시 번호 ${LESSON_NO}`);
  console.log("단계: 대기 → 마음 체크인 → 오늘 할 일 → 나의 강점 → 실패 노래 만들기 → 노래 생성·제출 → 마음일기");
  console.log("서로 구경하기: 1차시는 닫음(galleryEnabled: false) — 감상·투표·시상은 2차시.");
  console.log("친구에게 나가는 칸(2차시): build_url · brag_title · lyric_line · stars 네 칸뿐. 실패 상세·강점 문장·배움 한 줄은 뺐습니다.");
  console.log("AI 감정 렌즈: 꺼짐(emotion_lens 문항 없음 → Gemini 호출 없음).");
  console.log("\n[교사] Suno 로그인 약 10분·Outlook 코드·테넌트 차단 가능 — 짝당 1계정 + 도입 병렬, 수업 전 교사 사전 테스트, 막히면 공용 계정 대표 생성/가사·카드 경로.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
