/**
 * 「디지털 마음 톡톡」(자유학기 주제선택) 4회기 —
 * 실패를 노래로 자랑하기 (7·8차시 통합 · 단일 세션).
 *
 *   node --env-file=.env.local scripts/seed-mt4.ts
 *
 * ## 자기 영역을 닫는 회기다 — 한 세션으로
 *
 * 2회기가 감정 인식, 3회기가 감정 조절(감정 지도·힐링)이었다. 4회기는 자기 영역(자기 이해)의
 * 마지막이다 — 넘어져도 일어서는 이야기를 실패담 그림(Canva)과 노래(Suno)로 표현한다.
 * KAIST 실패연구소의 「망한 과제 자랑대회」를 중1 교실로 옮겨, 실패를 부끄러워하지 말고
 * **그림과 노래로 자랑**하게 한다.
 *
 * 7·8차시를 연속 블록으로 진행하므로 **한 세션**에 담는다(옛 seed-mt4a·mt4b 통합).
 * 흐름: 도입 영상① → (Suno 로그인·실패 선정·Canva 실패담 그림·가사·프롬프트) 노래 생성·제출
 * → 노래 갤러리(서로 듣기·응원, 실명) → 회복탄력성 영상②(마음일기 앞) → 마음일기.
 * (도입 토론·강점 문항, 그리고 시상·마무리 한 문장은 교사 요청으로 제거했다. 영상②는
 *  마음일기 단계로 옮겨 되살렸다 — reflection 이 note 를 못 받아 바로 앞 emotion 에 둔다.)
 *
 * 서울시교육청 사회정서교육자료 활동지 10-1·10-2(실패 이력서)를 재료로 삼되,
 * 산출물은 이력서가 아니라 Canva 실패담 그림 + Suno AI 노래다.
 *
 * ## 활동통은 mt-2026-3 하나
 *
 * 자랑 타이틀·가사 한 줄·노래 링크가 한 작품 문서(mt-2026-3__학번)에 쌓이고,
 * 같은 세션의 갤러리가 그 값을 읽어 카드로 그린다. 감정 인식·조절(mt-2026-2)과는
 * 다른 통이다 — 실패→노래는 새 작품이라 통을 새로 연다.
 *
 * ## 프라이버시 — 이 과목의 1순위
 *
 * 실패 선정·관점 전환·배움·Canva 실패담 그림·프롬프트는 **취약한 자기노출**이라 본인·교사만 본다.
 * 갤러리는 켜되(galleryEnabled: true), 친구에게 나가는 것은 **노래 링크·자랑 타이틀·
 * 가사 한 줄·별점** 네 칸뿐이다(거르는 자리는 서버다 — gallery 라우트의 galleryAnswerKeys).
 * 실명은 "이름"만 더해지는 것이지 이 목록을 넓히지 않는다.
 *
 * 실명 갤러리: 이 세션은 galleryShowNames: true 로 작성자 이름을 카드에 띄운다.
 * 서버가 displayName("○반 ○번 이름")으로 author 를 채우고 gallery-view 가 그린다.
 * 이 플래그가 없는 다른 갤러리(감정 글을 쓰는 마음 톡톡 차시·정보·인간과AI)는 그대로
 * 익명이다 — 기본이 익명이라 플래그를 켠 이 세션만 실명이다.
 *
 * AI 감정 렌즈는 켜지 않는다. emotion_lens 종류 문항이 하나도 없으면 Gemini 호출이
 * 아예 없다(emotion/route.ts). 위기 신호는 갤러리에서 서버가 로컬로 걸러
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

/** 4회기 하나의 활동통. 7·8차시를 연속 블록으로 한 세션에서 진행한다 */
const ACTIVITY_ID = "mt-2026-3";
const LESSON_NO = 204;

/** Suno. 분반 무관 단일 공개 주소라 분반별 토큰이 없다 — 남의 분반으로 샐 것이 없다 */
const SUNO_URL = "https://suno.com/";

/*
 * Canva 학교 팀 초대 주소 — 실패담을 그림(4컷 만화·삽화)으로 그리는 데 쓴다.
 * 분반마다 다른 토큰이라 저장소가 공개인 만큼 .env.local 에서만 읽는다(seed-mt2 와 같은 방식).
 * open-mt4.ts 가 세션을 열 때 그 분반 것 하나만 linkUrl 에 박고 linkUrlByGroup 은 지운다
 * (남의 분반 토큰이 학생 브라우저로 새지 않게). env 가 없으면 아래 기본 주소로 물러난다.
 */
const CANVA_BY_GROUP: Record<string, string> = {
  "mt-tue-1": process.env.CANVA_INVITE_MT_TUE_1 ?? "",
  "mt-thu-1": process.env.CANVA_INVITE_MT_THU_1 ?? "",
  "mt-tue-2": process.env.CANVA_INVITE_MT_TUE_2 ?? "",
  "mt-thu-2": process.env.CANVA_INVITE_MT_THU_2 ?? "",
};
/** 분반 토큰이 없을 때 물러날 기본 주소. 교사가 정확한 학교 Canva 초대 주소로 바꿀 수 있다 */
const CANVA_FALLBACK = "https://www.canva.com/";

/**
 * 도입 훅 영상 ① — EBS 지식채널e 「실패가 두려운 당신에게」 (5분 36초, 한글자막 없음).
 * 교사가 한국어로 흐름을 재구성했다. video 필드에 넣어 수업 맨 앞 영상 단계에서 재생한다.
 */
const VIDEO_URL = "https://www.youtube.com/watch?v=tLpfhASO0oE";

/**
 * 프레이밍 영상 ② — EBS 지식채널e 「5분 안에 알 수 있는 성공의 비밀, 회복탄력성」
 * (4분 41초, 한글자막 없음). 마음일기 바로 앞(emotion 단계)에서 본다 — reflection 단계는
 * reflectionQuestions 만 그려 worksheet note 를 못 받으므로, 감상(gallery)과 마음일기(reflection)
 * 사이의 emotion 에 note 로 붙여 교사가 그 자리에서 열어 재생한다.
 */
const VIDEO2_URL = "https://www.youtube.com/watch?v=0T8IziNtb18";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const WORKSHEET: WorksheetQuestion[] = [
  // ── ① 실패를 노래로 만들기 (build) ───────────────────────────
  {
    key: "_login",
    phase: "build",
    /*
     * 로그인을 맨 위에 둔다 — hai 차시와 같은 이유. 제일 오래 걸리는 일(약 10분)을 먼저
     * 눌러 두고, 뜨는 동안 아래 실패 선정·가사 쓰기를 종이처럼 진행한다. 짝당 1계정 권장.
     */
    label: "① Suno 열기 — 먼저 눌러 두세요 (로그인이 오래 걸려요)",
    hint:
      "아래 [Suno 열기] 를 누르고 우측 상단, Login 을 클릭한 뒤, [Microsoft로 계속하기] 를 고르세요.\n" +
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
    // 로그인 중 코드를 물어볼 때 여기서 학교 메일을 연다. hint 는 링크를 못 걸어
    // 문항의 linkUrl 로 「학교 메일 열기」 버튼을 따로 둔다 (① 은 linkUrl 을 Suno 가 씀).
    key: "_outlook",
    phase: "build",
    label: "학교 메일(Outlook) — 로그인 코드는 여기서 받아요",
    hint: "Suno 로그인 중 ‘코드’ 를 물어보면, 여기를 눌러 학교 메일을 열고 받은 코드를 넣으세요.",
    kind: "note",
    linkUrl: "https://outlook.office.com/",
    linkLabel: "학교 메일(Outlook) 열기 (새 창)",
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
    // Canva 로그인 — ① Suno 열기(_login) 패턴 그대로. 학생마다 자기 학교 계정이 복사된다
    // (worksheet-view 의 named 치환). Suno 에 이어 Canva 도 로그인하는 이중 로그인이라
    // hint 에 "Microsoft 로그인이 이미 돼 있으면 바로 들어가진다" 한 줄로 부담을 눌러 둔다.
    key: "_canva_login",
    phase: "build",
    label: "③ Canva 열기 — 실패담을 그림으로 그려요 (먼저 눌러 두세요)",
    hint:
      "내 실패담을 4컷 만화나 삽화로 그려 볼 거예요. 아래 [Canva 열기] 를 누르고\n" +
      "우측 상단 로그인 → [Microsoft로 계속하기] 를 고르세요. 학교 계정은 아래 칸을\n" +
      "[복사하기] 로 붙여 넣으면 됩니다(Suno 와 같은 계정 — 이미 로그인돼 있으면 바로 들어가져요).\n\n" +
      "Canva 안에서 ‘Magic Media(AI 이미지)’ 나 그리기로 내 실패담 장면을 만들어요.\n" +
      "예) ‘자전거 타다 넘어지는 4컷 만화, 마지막 컷은 씩 웃기’.",
    kind: "note",
    copyText: "{학교계정}",
    linkUrl: CANVA_BY_GROUP["mt-tue-1"] || CANVA_FALLBACK,
    linkUrlByGroup: Object.fromEntries(Object.entries(CANVA_BY_GROUP).filter(([, url]) => url)),
    linkLabel: "Canva 열기 (새 창)",
    maxLength: 0,
  },
  {
    /*
     * 실패담 그림 붙여넣기. ImageField(kind: "image")로 학생이 Canva 그림을 올린다.
     * 취약한 실패 노출이라 galleryAnswerKeys 에 넣지 않는다 — fail_pick 과 같이 비공개.
     */
    key: "fail_comic",
    phase: "build",
    label: "실패담을 4컷 만화나 삽화로 — Canva 그림을 여기에 붙여넣기",
    hint:
      "Canva 에서 만든 그림을 내려받거나 캡처해서 이 칸에 올리거나 붙여넣으세요.\n" +
      "이 그림은 나와 선생님만 봐요.",
    kind: "image",
    maxLength: 0,
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
    label: "그 실패에서 얻은 것 한 줄",
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
    label: "④ 내 실패 자랑 타이틀 — 노래 제목이 돼요 (친구에게 공개)",
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
    label: "⑤ 노래 후렴에 넣을 가사 한 줄 (원하면 공개)",
    hint:
      "이 한 줄이 후렴이 돼요. 예) ‘넘어져도 나는 또 달린다’\n" +
      "⚠️ 이 줄은 친구에게 공개돼요. 공개하고 싶은 문장만 적으세요 — 비워 둬도 됩니다.",
    kind: "text",
    maxLength: 100,
  },
  {
    key: "suno_prompt",
    phase: "build",
    /*
     * 배포용 프롬프트 템플릿 3종은 hint 에 참고로 두고, 학생이 자기 프롬프트를
     * 여러 줄로 직접 쓴다(빈 칸). 저장되지만 갤러리엔 안 나간다
     * (자랑 타이틀·가사 한 줄·노래 링크·별점만 공개).
     */
    label: "⑥ Suno 프롬프트 만들기 — 아래 틀을 참고해서 직접 프롬프트를 작성해 봐요",
    hint:
      "· 담담한 위로형: 장르: 잔잔한 K-발라드 / 무드: 담담하지만 희망적 / 주제: 나는 [실패]를 겪었지만 [배운 것]을 얻었다 / 한국어 가사, 후렴에 [자랑 타이틀]\n" +
      "· 뻔뻔한 자랑형: 장르: 신나는 힙합 / 무드: 당당하고 유쾌 / 주제: [화려하게 망한 일]을 자랑스럽게 뽐내기 / 후렴에 [자랑 타이틀] 반복, 한국어\n" +
      "· 씩씩한 극복형: 장르: 밝은 락 밴드 / 무드: 씩씩하게 다시 일어남 / 주제: [실패]에서 [극복한 행동]으로 일어선 이야기 / 한국어",
    kind: "long",
    maxLength: 500,
  },

  // ── ③ 노래 생성하고 링크 내기 (grill = 마지막 작업 단계, 갤러리 앞) ──────
  {
    key: "_gen_note",
    phase: "grill",
    /*
     * grill 에 둔다 — LESSON_PHASES 상 grill(만들기 뒤) → gallery(감상) → emotion 순서라,
     * "제출한 뒤 서로 노래를 듣는다" 는 교사 의도가 phase 차례로 그대로 맞는다.
     * grill 은 이 차시가 쓰는 STEP_PHASES 중 질문이 있는 마지막이라 제출 단추가 여기 붙고
     * (lesson/page.tsx 의 finalWorkPhase), 그 다음 감상(gallery)으로 넘어간다.
     */
    label: "⑦ Suno 에서 노래를 생성하세요 — 그리고 기다리는 동안",
    hint:
      "프롬프트를 넣고 [Create] 를 누르면 생성에 몇 분 걸려요. 기다리는 동안:\n" +
      "· 위 ④ 자랑 타이틀과 ⑤ 가사 한 줄, 아래 별점을 마저 채우세요\n" +
      "· 다 만들어지면 노래의 [Share] → 링크 복사 → 아래 칸에 붙여 넣으세요",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_prompt_echo",
    phase: "grill",
    /*
     * ⑤에서 학생이 직접 쓴 프롬프트(suno_prompt)를 여기 되보여 주고 복사 단추를 붙인다.
     * echo 는 같은 활동 문서(mt-2026-3)의 답을 읽으므로 방금 쓴 프롬프트가 그대로 나온다.
     * copy: true 라 평문 답 옆에 「복사하기」가 떠서, Suno 에 그대로 붙여넣을 수 있다.
     * suno_prompt 는 galleryAnswerKeys 에 없어 여전히 비공개다 — 본인 화면에서 자기 답을
     * 복사하는 것뿐이다.
     */
    label: "",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "suno_prompt", label: "내가 쓴 프롬프트 — 복사해서 Suno 에 붙여넣기", copy: true },
    ],
    maxLength: 0,
  },
  {
    key: "build_url",
    phase: "grill",
    /*
     * ★ 갤러리 공개 키. hai 의 build_url 과 같은 이름·역할 — 카드에서 새 창 링크로 열린다
     * (card-news.tsx 가 build_url 을 normalizeUrl 로 https 채워 target=_blank 앵커로 그린다).
     * 그래서 이 링크가 곧 "노래 듣기" 단추가 된다. 못 만든 학생은 비워 둔다(가사만/카드만).
     */
    label: "⑧ 내 노래 링크 (Suno 의 Share 주소를 붙여 주세요)",
    hint:
      "예) https://suno.com/song/....  다음 시간에 친구들이 이 링크로 노래를 들어요.\n" +
      "노래를 못 만들었으면 비워 둬도 괜찮아요 — 자랑 타이틀·가사만으로도 참여돼요.",
    kind: "text",
    maxLength: 300,
  },
  {
    key: "stars",
    phase: "grill",
    /*
     * ★ 갤러리 공개 키. 활동지 10-2 의 ‘나의 능력치’ 를 별점 한 줄로 압축.
     * 갤러리 필터(facet)도 이 칸을 쓴다.
     */
    label: "⑨ 다시 도전하는 나의 능력치 — 별점으로 (예: ★★★★☆)",
    hint: "‘다시 도전하는 용기’ 를 스스로 별점으로 매겨 보세요. ★ 를 개수로 적으면 돼요.",
    kind: "text",
    maxLength: 20,
  },
  {
    key: "_relief_note",
    phase: "grill",
    label: "노래 만들기가 어렵다면",
    hint:
      "괜찮아요. 참여하는 길은 여러 개예요 — 갤러리에 똑같이 올라가고 응원도 똑같이 받습니다.\n" +
      "· 가사만: ④ 가사 한 줄만 채우기\n" +
      "· 카드만: ③ 자랑 타이틀 + ⑧ 별점만 채우기\n" +
      "무엇으로 참여할지는 내가 정해요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_gallery_guide",
    phase: "grill",
    /*
     * 갤러리로 넘어가기 직전 안내. 갤러리 단계(phase: gallery)에는 활동지 문항이 안 뜨고
     * 감상 화면(gallery-view)이 뜨므로, 반응 이모지 ↔ 4부문 대응표와 규칙은 여기서 못박는다.
     * 카드의 [작품 보러 가기(새 창)] 단추가 곧 노래 듣기다.
     */
    label: "⑩ 이제 친구 노래를 들어요 — 곧 [노래 갤러리] 가 열려요",
    hint:
      "친구 노래 카드를 눌러 [작품 보러 가기(새 창)] 로 노래를 듣고, 반응·응원을 남겨요.\n" +
      "반응 이모지 = 응원 부문이에요:\n" +
      "❤️ 나도그랬어 · 💡 다시일어섰다 · 😮 실패예술가 · 👍 솔직담백\n" +
      "그리고 한 줄 응원도 남길 수 있어요. 놀리지 않기 — 응원으로만!\n\n" +
      "노래는 생성에 몇 분 걸려요 — 나온 곡부터 먼저 듣고, 아직 안 나온 곡은 마지막에 다시 들러요.",
    kind: "note",
    maxLength: 0,
  },

  // ── ④ 마음일기 바로 앞 — 회복탄력성 영상 ② (emotion) ────────────
  {
    key: "_resilience_video",
    phase: "emotion",
    /*
     * 감상(gallery) 다음, 마음일기(reflection) 바로 앞에서 본다. reflection 단계는
     * reflectionQuestions 만 그려 note 를 못 받으므로 여기(emotion)에 둔다.
     *
     * ★ [2:36] 반전을 hint 에 반드시 넣는다 — 잡스·조던·롤링 사례 셋만 보여주고 끝내면
     * 메시지가 "실패는 (반드시) 성공의 어머니" 로 뒤집힌다. 회복탄력성은 성공 보증이
     * 아니라 결과와 무관하게 다시 일어서는 근육이라는 선을 긋는다.
     * [교사] ★ [3:33] 자기 자비 구간을 반드시 함께 다뤄 주세요. "노력하면 강해진다" 가
     * 지금 마음이 힘든 학생에겐 "아직 네 노력이 부족하다" 는 압박으로 들릴 수 있습니다.
     * 영상의 마지막 메시지 ‘나를 용서하기’ 를 짚어, 회복탄력성이 채찍이 아니라 자기
     * 자비임을 분명히 해 주세요. (이 과목의 배려 원칙과 직결)
     */
    label: "회복탄력성 — 마음 근육을 키우고 싶어 (영상 ②, 마음일기 전에 함께 봐요)",
    hint:
      "여러분이 방금 실패를 노래로 꺼내 자랑한 것, 그게 바로 ‘회복탄력성’ 근육을 쓴 순간이에요.\n" +
      "타고나는 재능이 아니라 쓸수록 강해지는 마음의 근육이에요.\n\n" +
      "한 가지만 기억해요 — 회복탄력성은 ‘꼭 크게 성공한다’ 는 약속이 아니라,\n" +
      "결과가 어떻든 다시 일어서는 힘 그 자체예요. 그리고 그 시작은 나를 용서하는 것.\n" +
      "아래 [회복탄력성 영상 보기] 로 짧은 영상을 함께 본 뒤 마음일기를 써요.\n" +
      "(한글자막 없음 — 선생님이 [2:36] 반전과 ‘나를 용서하기’ 를 짚어 줍니다.)",
    kind: "note",
    linkUrl: VIDEO2_URL,
    linkLabel: "회복탄력성 영상 보기 (새 창)",
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "디지털 마음 톡톡 4회기 — 실패를 노래로 자랑하기",

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
    heading: "기다리는 동안 — 한붓그리기",
    body:
      "노래가 만들어지길 기다리는 동안 잠깐 쉬어요.\n" +
      "선을 한 번도 떼지 않고, 같은 길을 두 번 지나지 않게 모든 선을 그려 보세요.\n" +
      "점과 점을 이으면 됩니다. 막히면 다시 시작할 수 있어요.",
    url: "https://euler-path-game.vercel.app/",
  },
  gameExplainer: empty(),

  progress: {
    heading: "오늘 할 일 — 우리 반 ‘실패의 날’ (4회기 · 7·8차시)",
    body:
      "핀란드엔 매년 10월 13일 ‘실패의 날’ 이 있어요. 오늘 우리 반도 ‘실패의 날’ 을 엽니다 —\n" +
      "실패를 숨기지 말고 노래로 자랑하는 날이에요. 만들고, 서로 듣고 응원해요.\n\n" +
      "① 실패 노래 만들기 — 화려하게 망한 실패 하나를 골라, 그림(Canva)·자랑 타이틀·가사·프롬프트 쓰기\n" +
      "② 노래 생성 — Suno 로 노래를 만들고 링크 내기\n" +
      "③ 노래 갤러리 — 친구 노래를 눌러 듣고, 반응 이모지와 한 줄 응원 남기기\n\n" +
      "오늘은 Suno(노래)와 Canva(그림) 둘 다 로그인해요 — 같은 학교(Microsoft) 계정이라, 한 번 로그인하면\n" +
      "대체로 바로 이어져요. 노래는 생성에 몇 분 걸리니 나온 곡부터 먼저 듣고, 안 나온 곡은 마지막에 다시 들러요.\n" +
      "반응 이모지 = 응원 부문: ❤️ 나도그랬어 · 💡 다시일어섰다 · 😮 실패예술가 · 👍 솔직담백. 놀리지 않기!\n" +
      "친구에게 보이는 건 노래·제목·가사 한 줄·별점뿐이에요. 실패 이야기 원문·그림·프롬프트는 안 보입니다.",
    url: "",
  },
  assessment: empty(),

  /*
   * 도입 훅 영상 ①. 수업 맨 앞 영상 단계에서 재생한다. 한글자막이 없으므로 교사가
   * body 요약으로 흐름을 짚어 준다 — 핀란드 ‘실패의 날’ · 로비오 52번째 · 슈퍼셀 샴페인 ·
   * 파나넨 문장. 이 영상이 오늘 자랑대회 전체의 명분(“우리 반도 실패의 날을 연다”)이 된다.
   */
  video: {
    heading: "실패가 두려운 당신에게 (EBS 지식채널e · 5분 36초)",
    body:
      "핀란드는 노키아 몰락으로 국가적 실패를 겪었어요. 그런데 그 나라엔 매년 10월 13일\n" +
      "‘실패의 날(Day for Failure)’ 이 있습니다 — 2010년 알토대 학생들이 시작해, 지금은\n" +
      "국민 넷 중 하나가 지켜보며 기업인·정치인·학생이 자기 실패담을 공개해요.\n\n" +
      "· 로비오는 51번 실패하고 52번째에 ‘앵그리버드’ 를 성공시켰어요.\n" +
      "· 슈퍼셀은 중단한(실패한) 프로젝트에 샴페인을 터뜨리며 축하해요.\n" +
      "· 창업자 일카 파나넨: “실패가 없다는 건 충분히 위험을 감수하지 않았다는 뜻이고,\n" +
      "  그러면 혁신도 히트작도 없다.”\n\n" +
      "실패는 끝이 아니라 배움이 일어나는 지점이에요. 이런 성취는 실패를 격려하고 품는\n" +
      "사회 분위기 덕분이었죠. (영상은 한글자막이 없어요 — 선생님이 위 흐름을 짚어 줍니다.)",
    url: VIDEO_URL,
  },

  /*
   * 영상을 보는 동안 화면에 띄울 생각거리. 안 적으면 성찰 질문이 떠서 지금 답하라는
   * 것처럼 읽힌다(90분 뒤 마음일기인데). 도입 토론과 같은 물음을 걸어 둔다.
   */
  videoPrompts: [
    "핀란드는 왜 ‘실패의 날’ 을 만들었을까?",
    "슈퍼셀은 왜 실패한 프로젝트에 샴페인을 터뜨릴까?",
    "우리 반이 ‘실패의 날’ 을 연다면, 무엇을 축하할 수 있을까?",
  ],

  /*
   * 마음일기 — 매 회기 루틴. reflectionPublic 은 반드시 false(비공개).
   * 세 번째 문항은 바로 앞(emotion 단계)에서 본 회복탄력성 영상②의 ‘감사일기’ 를 잇되,
   * ‘좋았던 일’ 이 아니라 안 풀린 하루에서 그래도 건질 것 찾기로 조건을 바꾼다.
   */
  reflectionQuestions: [
    "오늘 친구들의 실패 노래를 들으며 마음에 남는 순간은 언제였나요? 무엇 때문에 그랬는지도 함께 적어 주세요.",
    "지금 내 기분은 어떤가요? 그리고 왜 그런 것 같나요?",
    "방금 본 영상의 ‘감사일기’ 를 조금 다르게 써 봐요 — 좋았던 일 말고, 오늘 잘 안 풀렸던 일에서 그래도 건질 것(배운 것·버틴 나) 하나를 찾아 적어 주세요.",
  ],
  reflectionPublic: false,

  // Suno·Canva·친구 노래 링크·영상② 링크로 나가는 것은 활동 자체라 이탈로 안 센다
  focusExempt: ["build", "grill", "gallery", "emotion"],

  // 로그인·생성을 오가며 앞뒤 칸을 봐야 한다
  freeNavigation: true,

  phaseLabels: {
    mood: "마음 체크인",
    progress: "오늘 할 일",
    // 영상①(실패의 날)은 video 단계에서 재생
    video: "실패의 날 영상",
    // 활동지는 build(실패 노래 만들기)부터 시작 — 도입 토론·강점 문항은 뺐다(problem 비움)
    build: "실패 노래 만들기",
    // 제출(grill) → 감상(gallery) → 회복탄력성 영상②(emotion) → 마음일기 — LESSON_PHASES 차례 그대로
    grill: "노래 생성·제출",
    gallery: "노래 갤러리 (듣고 응원하기)",
    emotion: "회복탄력성 영상",
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
     * 제출(⑧ 노래 링크) 다음에 서로 노래를 듣고 응원하는 갤러리를 연다.
     * 카드의 [작품 보러 가기(새 창)] 가 곧 노래 듣기(card-news.tsx 의 build_url 앵커).
     * 친구 노래엔 반응 이모지(4부문)와 두 칸짜리 응원(feedbackPrompts)을 남긴다.
     *
     * 실명 표시: 이 세션은 galleryShowNames 로 작성자 이름을 카드에 띄운다(교사 승인).
     * 서버가 displayName("○반 ○번 이름")으로 author 를 채우고 gallery-view 가 그린다.
     * 이 플래그는 4회기에만 있다 — 감정 글을 쓰는 다른 마음 톡톡 차시는 플래그가 없어
     * 그대로 익명이다. 실명은 "이름"만 더할 뿐 아래 galleryAnswerKeys 를 넓히지 않는다.
     */
    galleryEnabled: true,
    galleryShowNames: true,

    /*
     * 친구에게 나가는 것은 이 네 칸뿐 — 노래 링크·자랑 타이틀·가사 한 줄·별점.
     * 실패 상세·관점 전환·배움 한 줄·Canva 실패담 그림·프롬프트·마음일기는 뺀다.
     * 거르는 자리는 서버다(gallery 라우트의 toCard) — 화면에서 숨겨도 응답엔 실린다.
     * 실명이라도 "이름"만 더해지는 것이지 이 목록은 그대로다.
     */
    galleryAnswerKeys: ["build_url", "brag_title", "lyric_line", "stars"],
    galleryNoun: "노래",
    // 왼쪽 활동지 탭 이름 — 오른쪽 "노래 감상" 과 짝. 이 값이 없는 다른 세션은 "활동지 쓰기"
    worksheetTabLabel: "노래 생성하기",

    /*
     * 왼쪽 필터를 별점으로 세운다. 안 정하면 기본값(디지털 사회의 특성·장소)이 서는데
     * 이 활동엔 특성도 장소도 없어 아무것도 거르지 못하는 체크박스만 남는다(facetsFor 기본 분기).
     */
    galleryFacets: [{ key: "stars", label: "능력치 별점", answerKeys: ["stars"] }],

    /*
     * 친구 노래에 남기는 두 칸(자유 댓글 아님 — 정해진 질문·서버 200자 제한·rate limit).
     * 응원 톤으로만 유도한다. 안 정하면 그림 활동 기본값이 떠서 "이 그림에 어떤 기술이" 가 된다.
     */
    feedbackPrompts: {
      found: {
        label: "이 노래에서 좋았던 점 한 가지",
        placeholder: "예) 후렴이 씩씩해서 힘이 나요 / 가사가 솔직해서 마음에 남아요",
      },
      question: {
        label: "노래를 만든 친구에게 남기는 한 줄 응원",
        placeholder: "예) 그 실패 덕분에 이런 멋진 노래가 나왔네요! 응원해요",
      },
    },
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} · 차시 번호 ${LESSON_NO} (4회기 단일 세션 — 7·8차시 통합)`);
  console.log("단계: 대기 → 마음 체크인 → 오늘 할 일 → 영상①(실패가 두려운 당신에게) → 실패 노래 만들기(실패 고르기·Canva 그림·자랑 타이틀·가사·프롬프트, build) → 노래 생성·제출(grill) → 노래 갤러리(듣고 응원) → 회복탄력성 영상②(emotion) → 마음일기");
  console.log("영상②(회복탄력성): 마음일기 바로 앞(emotion)의 [회복탄력성 영상 보기] 링크로 재생. [교사] [2:36] 반전·[3:33] 자기 자비를 반드시 함께 다뤄 주세요.");
  console.log("탭: 왼쪽 '노래 생성하기'(worksheetTabLabel) · 오른쪽 '노래 감상'(galleryNoun). 도입 토론·강점 문항은 제거 — 활동지는 ① Suno 열기부터.");
  console.log("서로 구경하기: 켬(galleryEnabled: true) — 제출 뒤 친구 노래를 듣고 반응·응원. 생성 대기로 아직 안 나온 곡은 마지막에 다시 듣기.");
  console.log("친구에게 나가는 칸: build_url · brag_title · lyric_line · stars 네 칸뿐. 실패 상세·배움 한 줄·Canva 실패담 그림(fail_comic)·프롬프트·마음일기는 뺐습니다(비공개).");
  console.log("듣기: 카드의 [작품 보러 가기(새 창)] 가 노래 링크(build_url)를 새 창으로 연다 = 노래 듣기. / 피드백: 반응 이모지 4부문 + 두 칸 응원(feedbackPrompts, 서버 200자·rate limit).");
  console.log("실명 표시: galleryShowNames: true — 카드에 작성자 이름(○반 ○번 이름)이 뜹니다. 이 플래그는 4회기에만 — 다른 마음 톡톡 갤러리는 그대로 익명. (피드백 준 사람은 여전히 익명)");
  console.log("AI 감정 렌즈: 꺼짐(emotion_lens 문항 없음 → Gemini 호출 없음).");
  console.log("\n[교사] Suno·Canva 둘 다 학교(MS) 계정 로그인 — 이중 로그인이라 짝당 1계정·도입 병렬 권장, 수업 전 사전 테스트. 시상·회복탄력성 영상②·마무리 문장은 활동지에서 제거됨(아래 보고 참조).");
  console.log("[교사] Canva 초대 주소는 .env.local 의 CANVA_INVITE_MT_* 에서 읽습니다. 없으면 기본 https://www.canva.com/ 로 물러나니 정확한 학교 Canva 링크를 넣어 주세요.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
