/**
 * 「디지털 마음 톡톡」(자유학기 주제선택) 6회기 — 대인관계 영역 (11·12차시, 6·7교시 블록).
 *
 *   node --env-file=.env.local scripts/seed-mt6.ts
 *
 * ## 무엇인가 — 5회기에서 못 한 활동4·5 를 이어서 한다
 *
 * 5회기(205, 관점·감정 읽기)는 90분에 활동1·2 까지만 하고, 활동4(효과적인 의사소통)와
 * 활동5(공감 문장·감정 대화)를 다음으로 넘겼다(화요일 1기 교사 메모 확정). 6회기는 그
 * 두 활동을 제대로 한다. 활동3(감정 캐릭터)은 이번에도 뺀다.
 *
 * 두 활동의 문항·흐름은 5회기 시드에 이미 설계돼 있던 것을 그대로 되살렸다
 * (git 977812a 로 5회기에서 덜어내며 "6회기에서 되살림" 이라 남겨 둔 것). wrapmap 단계에
 * 활동4, wrapheal 단계에 활동5 를 담는 뼈대도 그대로다.
 *
 *   · 활동4 「효과적인 의사소통」 (wrapmap)
 *       ① 언어·비언어·목소리 톤 → ② 나 전달법(I-message) 바꿔 쓰기
 *       → ③ 갈등 상황 분석 → ④ 관계 캘리그래피(Canva) 로 덕목 표현
 *   · 활동5 「공감 문장 · 감정 대화」 (wrapheal)
 *       ① 공감 문장 만들기 → ② 감정 말풍선 채우기 → ③ 감정 대화 이어가기
 *       → ④ 대화로 '만화 생성 프롬프트' 정리
 *
 * ## 활동 통(ACTIVITY_ID) — 5회기와 다른 새 통(mt-2026-6)
 *
 * 5회기 시드 주석은 "뒤에 붙는 대인관계 활동도 같은 통(mt-2026-5)을 이어 쓴다" 고 했다.
 * 그 전제는 활동4·5 가 5회기 **같은 세션 안**에 얹히는 것이었다. 6회기는 **별도 세션**이라
 * 전제가 달라졌다. 이어서 그릴 그림(정보과 2·3차시처럼 activityId 로 이어지는 산출물)이
 * 없고, 문항 키(a4_*·a5_*)도 5회기와 겹치지 않는다. 그래서 6회기는 **새 통 mt-2026-6** 을
 * 쓴다 — 이렇게 하면 "6회기 활동만 리셋" 이 activityId 하나로 깔끔히 되고, 5회기 감정 글을
 * 건드릴 위험이 없다(이 과목의 1순위: 감정 글 보호). 같은 통을 원하면 아래 ACTIVITY_ID 만
 * mt-2026-5 로 바꾸면 된다(문항 키가 안 겹쳐 그래도 안전하다).
 *
 * ## 블록타임 — 세션은 7교시로 하나만 연다 (여는 스크립트에서)
 *
 * 6·7교시 90분 연속 블록이다. 마음 톡톡 규칙대로 **세션은 7교시로 하나만** 연다
 * (세션 문서 ID = 날짜__7__groupKey). 6교시로 열면 코드가 중간에 만료돼 뒷시간에 학생이
 * 못 들어온다. 이 규칙은 open-mt6-*.ts 가 지킨다.
 *
 * ## 프라이버시 — 이 과목의 1순위
 *
 * 나 전달법·갈등 분석·공감 문장·감정 대화·만화 프롬프트는 모두 개인 성찰/작성이라
 * 친구에게 절대 안 나간다. 그래서 서로 구경하기를 아예 닫는다(galleryEnabled: false) —
 * 서버 갤러리 라우트가 이 값을 보고 응답 자체를 막는다(gallery/route.ts). galleryAnswerKeys 는
 * 두지 않는다(열 것이 없다). 나중에 대인관계 나눔 활동을 붙여 갤러리를 켜게 되면, 그때
 * **친구에게 나갈 칸만** galleryAnswerKeys 로 못박고 서버 목록(galleryAnswerKeys)도 함께 챙긴다.
 *
 * AI 는 포털에서 호출하지 않는다 — 갈등 분석 챗봇·감정 대화 AI·만화 생성은 모두 새 API·새
 * kind·새 서버 라우트가 필요해 이번 초안 범위 밖이다(5회기의 Gemini·Teachable Machine 처리와
 * 같은 안전한 기본값). 학생은 자기 기록만 남기고, 심화/생성은 교사가 공유화면에서 시연하거나
 * 외부 도구로 둔다. 그래서 이 회기엔 위기 신호 텍스트를 제3자로 보내거나 로그에 남길 자리가
 * 처음부터 없다. 실제 API 연동을 원하면 별도 작업(API 키·비용·새 kind·서버 라우트)이 필요하다.
 *
 * ## Canva — 분반별 초대 토큰은 .env.local 에서만
 *
 * 활동4 ④ 관계 캘리그래피가 Canva 학교 팀 초대를 쓴다. 분반마다 다른 토큰이라, 저장소가
 * 공개인 만큼 **.env.local 에서만** 읽는다(CANVA_INVITE_MT_*). linkUrlByGroup 에 넷을 다
 * 담아 두고, 세션을 열 때(open-mt6-*.ts) 그 분반 것 하나만 linkUrl 에 박고 표는 지운다 —
 * 남의 분반 토큰이 학생 브라우저로 새지 않게 한다(db.ts 의 snapshotOf 와 같은 이유).
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

/**
 * 6회기(대인관계 · 활동4·5)의 활동통. 5회기(mt-2026-5)와 다른 새 통이다(위 주석 참조).
 * 활동4·5 서술 답이 여기에 쌓인다. "6회기만 리셋" 이 이 통 하나로 깔끔히 된다.
 */
const ACTIVITY_ID = "mt-2026-6";
/** 차시 번호가 정보과·인간과AI 와 안 겹치게 200번대 (2회기 202 · 3회기 203 · 4회기 204 · 5회기 205) */
const LESSON_NO = 206;

/* ─────────────── 활동4 ④ 관계 캘리그래피 「Canva」 재료 ─────────────── */

/**
 * Canva 학교 팀 초대 주소 — 분반마다 다른 토큰이라 **.env.local 에서만** 읽는다.
 * 세션을 열 때(open-mt6-*.ts) 그 분반 것 하나만 각 문항의 linkUrl 에 박고 linkUrlByGroup 은
 * 지운다 — 남의 분반 토큰이 학생 브라우저로 새지 않게 한다. env 가 없으면 아래 기본으로 물러난다.
 */
const CANVA_BY_GROUP: Record<string, string> = {
  "mt-tue-1": process.env.CANVA_INVITE_MT_TUE_1 ?? "",
  "mt-thu-1": process.env.CANVA_INVITE_MT_THU_1 ?? "",
  "mt-tue-2": process.env.CANVA_INVITE_MT_TUE_2 ?? "",
  "mt-thu-2": process.env.CANVA_INVITE_MT_THU_2 ?? "",
};
/** 분반 토큰이 없을 때 물러날 기본 주소. 교사가 정확한 학교 Canva 초대 주소로 바꿀 수 있다 */
const CANVA_FALLBACK = "https://www.canva.com/";
/** linkUrlByGroup 에 넣을 값 — 토큰이 있는 분반만 남긴다(빈 분반은 뺀다) */
const CANVA_GROUP_LINKS: Record<string, string> = Object.fromEntries(
  Object.entries(CANVA_BY_GROUP).filter(([, url]) => url),
);

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const WORKSHEET: WorksheetQuestion[] = [
  /* ══════════════ 활동4 「효과적인 의사소통」 (wrapmap) ══════════════
   *
   *   ① 의사소통 3요소(언어·비언어·목소리 톤) → ② 나 전달법(I-message) 바꿔 쓰기
   *   → ③ 갈등 상황 분석 → ④ 관계 캘리그래피(Canva) 로 덕목 표현
   *
   * ③ 갈등 예시 챗봇: 포털에 챗봇 kind 를 새로 만들지 않는다. 갈등 시나리오를 note 로
   * 제시하고, 심화가 필요하면 교사가 공유화면에서 챗봇을 시연한다. 포털은 학생의 갈등 분석
   * 기록(입장·감정·원하는 것)만 남긴다 — 챗봇 호출은 포털에서 안 한다.
   *
   * ④ 관계 캘리그래피: Canva 초대(위 CANVA_BY_GROUP)를 쓴다. 산출물은 공유 링크로 남긴다.
   * 모든 서술 칸은 개인 성찰이라 친구에게 안 나간다(galleryEnabled: false).
   */
  {
    key: "_a4_intro",
    phase: "wrapmap",
    label: "말이 마음을 잇는다 — 효과적인 의사소통",
    hint:
      "우리는 말로만 대화하지 않아요. 세 가지가 함께 전해집니다.\n" +
      " · 언어(말의 내용)   · 비언어(표정·몸짓·눈빛)   · 목소리 톤(높낮이·빠르기·세기)\n" +
      "같은 “괜찮아” 도 웃으며 하면 안심이 되고, 톤이 차가우면 서운하게 들려요.\n" +
      "오늘은 말이 관계를 살리는 몇 가지 방법을 익혀 봐요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_a4_imsg_note",
    phase: "wrapmap",
    label: "① 나 전달법(I-message) — ‘너’ 대신 ‘나’ 로 말하기",
    hint:
      "‘너 전달법’ 은 상대를 탓해요. 예) “너 왜 맨날 늦어?” → 상대는 방어하고 싸움이 커져요.\n" +
      "‘나 전달법’ 은 내 마음을 전해요. [상황] + [내 감정] + [바라는 것] 순서예요.\n" +
      "예) “네가 늦게 오면(상황) 나는 걱정돼(감정). 늦을 땐 미리 알려 주면 좋겠어(바람).”",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "a4_imsg",
    phase: "wrapmap",
    // 개인 연습·성찰. 비공개.
    label: "아래 ‘너 전달법’ 을 ‘나 전달법’ 으로 바꿔 써 보세요",
    hint:
      "바꿀 문장: “너는 왜 내 말을 안 들어?”\n" +
      "[상황] + [내 감정] + [바라는 것] 을 담아 직접 써 보세요.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "_a4_conflict_note",
    phase: "wrapmap",
    label: "② 갈등 상황 들여다보기",
    hint:
      "갈등은 나쁜 게 아니라, 서로 원하는 것이 부딪히는 자연스러운 일이에요. 잘 ‘분석’ 하면 풀려요.\n\n" +
      "상황 예시(하나 골라 분석해 보세요):\n" +
      " · [가정] 나는 시험이 끝나 쉬고 싶은데, 부모님은 바로 다음 공부를 시작하라고 하신다.\n" +
      " · [학교·사회] 모둠 과제에서 한 친구가 자기 방식만 고집해 다른 친구들이 불편해한다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "a4_conflict_analysis",
    phase: "wrapmap",
    // 갈등 분석 기록. 개인 글, 비공개. 챗봇 호출은 포털에서 안 한다(교사 시연/외부).
    label: "고른 갈등 상황을 분석해 보세요 — 양쪽의 ‘입장 · 감정 · 원하는 것’",
    hint: "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 400,
  },
  {
    key: "_a4_calli_login",
    phase: "wrapmap",
    // Canva 로그인 — 관계 캘리그래피. 아래 linkUrl 은 기본값이고, 세션을 열 때 그 분반 것으로 바뀐다.
    label: "③ 관계 캘리그래피 — Canva 열기",
    hint:
      "대인관계에서 중요하다고 생각하는 덕목을 하나 골라, Canva 로 캘리그래피(멋글씨) 작품을\n" +
      "만들어 볼 거예요. 아래 [Canva 열기] 를 눌러 새 창에서 열어요.",
    kind: "note",
    linkUrl: CANVA_BY_GROUP["mt-tue-1"] || CANVA_FALLBACK,
    linkUrlByGroup: CANVA_GROUP_LINKS,
    linkLabel: "Canva 열기 (새 창)",
    maxLength: 0,
  },
  {
    key: "_a4_calli_howto",
    phase: "wrapmap",
    label: "덕목 하나를 골라 캘리그래피로",
    hint:
      "예) 존중 · 경청 · 신뢰 · 배려 · 정직 · 공감 …\n" +
      "Canva 에서 글자 디자인(텍스트·폰트·색)이나 손글씨 요소로 그 덕목을 멋지게 표현해요.\n" +
      "직접 손으로 써서 사진으로 올려도 좋아요.\n\n" +
      "🔒 실명·개인정보는 작품이나 파일 이름에 넣지 않아요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "a4_virtue",
    phase: "wrapmap",
    // 개인 기록. 비공개.
    label: "내가 고른 덕목과, 그것이 관계에서 중요하다고 생각한 이유를 한두 줄로",
    hint:
      "예) 경청 — 잘 들어주는 것만으로도 상대가 존중받는다고 느끼니까.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 200,
  },
  {
    key: "a4_calli_url",
    phase: "wrapmap",
    /*
     * ★ 산출물 기록 = Canva 공유 링크(캘리그래피). 이 과목 관례대로 URL 로 남긴다. 비공개.
     */
    label: "④ 내 캘리그래피 작품 — Canva 공유 링크를 붙여 주세요",
    hint:
      "Canva 오른쪽 위 [공유] → [링크 복사] 로 주소를 받아 여기에 붙여넣어요.\n" +
      "손글씨 사진으로 했으면 그 사진 링크를 붙여도 돼요. 이 칸은 나와 선생님만 봐요.",
    kind: "text",
    maxLength: 300,
  },

  /* ══════════════ 활동5 「공감 문장 · 감정 대화」 (wrapheal) ══════════════
   *
   *   ① 생활 속 공감 문장 만들기 → ② 감정 말풍선 채우기 → ③ 감정 대화 이어가기
   *   → ④ 대화를 바탕으로 '만화 생성 프롬프트' 정리
   *
   * ⚠ [만화 생성 = 스코프 밖] 이 포털에는 이미지 생성 API 연동이 없다(AI 는 Gemini 기반
   * emotion-lens·ai-review 뿐). 그래서 새 API·새 kind·새 서버 라우트를 만들지 않는다. 학생은
   * 자기 감정 대화를 바탕으로 **만화 생성 프롬프트를 글로 정리해 기록**하고, 실제 만화 생성은
   * **교사 시연 / 외부 도구**로 둔다. 실제 API 연동을 원하면 별도 작업이 필요하다 — 보고에 남긴다.
   *
   * 모든 서술 칸은 개인 글이라 친구에게 안 나간다(galleryEnabled: false).
   * wrapheal 은 원래 그림판을 여는 단계지만, places 를 비워 그림판은 안 뜨고 활동지 문항만 뜬다.
   */
  {
    key: "_a5_intro",
    phase: "wrapheal",
    label: "공감으로 마음 잇기 — 오늘의 마무리",
    hint:
      "관계를 살리는 마지막 열쇠는 ‘공감’ 이에요. 상대의 감정을 알아주는 한마디가 큰 힘이 됩니다.\n" +
      "오늘은 ① 공감 문장 만들기 → ② 감정 말풍선 채우기 → ③ 감정 대화 이어가기 →\n" +
      "④ 그 대화로 만화 프롬프트 정리 순서로 해봐요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_a5_empathy_note",
    phase: "wrapheal",
    label: "① 공감 문장이란",
    hint:
      "공감 문장은 상대의 마음을 ‘읽어 주는’ 말이에요. [상황 되짚기] + [감정 알아주기] 로 만들어요.\n" +
      "예) “그랬구나, 열심히 준비했는데 결과가 아쉬워서 속상했겠다.”\n" +
      "충고·평가(“그러게 더 하지”)보다, 감정을 알아주는 한마디가 먼저예요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "a5_empathy",
    phase: "wrapheal",
    // 개인 작성. 비공개.
    label: "아래 상황에 건넬 ‘공감 문장’ 을 만들어 보세요",
    hint:
      "상황: 친구가 “시험 망친 것 같아…” 하고 시무룩하게 말한다.\n" +
      "[상황 되짚기] + [감정 알아주기] 로 한 문장. 이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "_a5_bubble_note",
    phase: "wrapheal",
    label: "② 감정 말풍선 채우기",
    hint:
      "한 장면을 떠올려 보세요. 아래 인물의 말풍선을, 그 감정에 어울리게 채워 봅니다.\n" +
      "장면: 넘어진 동생을 언니/오빠가 일으켜 준다. 동생은 창피하고 고맙다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "a5_bubble",
    phase: "wrapheal",
    // 개인 작성. 비공개.
    label: "동생의 말풍선과 언니/오빠의 말풍선을 감정에 맞게 채워 주세요",
    hint:
      "예) 동생: “아… 봤어? 창피해. 그래도… 고마워.”  언니/오빠: “괜찮아? 누구나 넘어져.”\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "_a5_dialogue_note",
    phase: "wrapheal",
    label: "③ 감정 대화 이어가기",
    hint:
      "감정이 담긴 짧은 대화(또는 이야기)를 이어 써 봐요. 짝과 한 줄씩 주고받아도 좋고,\n" +
      "선생님이 공유화면에서 AI 와 함께 이어가는 것을 보고 내 것을 써도 돼요.\n" +
      "한 인물이 속상한 마음을 꺼내면, 다른 인물이 공감으로 답하는 흐름이면 좋아요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "a5_dialogue",
    phase: "wrapheal",
    // 감정 대화 기록. 개인 글, 비공개. AI 대화는 교사 시연 — 포털에서 호출 안 함.
    label: "내가 이어 쓴 감정 대화를 적어 주세요 (3~6줄)",
    hint:
      "예) A: 나 오늘 발표 완전 망친 것 같아.\n" +
      "    B: 많이 긴장했겠다. 준비 많이 했잖아, 속상했겠어.\n" +
      "    A: 응… 근데 그렇게 말해주니까 좀 낫다.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 500,
  },
  {
    key: "_a5_comic_note",
    phase: "wrapheal",
    /*
     * ⚠ 만화 생성 = 포털 밖. 이미지 생성 API 연동이 없어 새로 만들지 않는다. 학생은 프롬프트를
     * 글로 정리하고, 실제 생성은 교사 시연/외부 도구로 둔다(위 활동5 머리말 참조).
     */
    label: "④ 이 대화로 ‘만화’ 를 만든다면? — 만화 생성 프롬프트 정리하기",
    hint:
      "내 감정 대화를 만화로 만든다고 상상해 봐요. 어떤 장면·인물·감정·분위기가 담기면 좋을까요?\n" +
      "그것을 ‘프롬프트(만들라고 주는 설명)’ 로 정리해 아래에 적어요.\n" +
      "실제 만화 생성은 선생님이 공유화면에서 함께 보여주거나 외부 도구로 시연할 거예요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "a5_comic_prompt",
    phase: "wrapheal",
    // 만화 생성 프롬프트 정리 기록. 개인 글, 비공개. 실제 생성은 포털 밖(교사 시연/외부).
    label: "만화 생성 프롬프트를 정리해 적어 주세요",
    hint:
      "예) ‘두 친구가 학교 복도에서 대화하는 2컷 만화. 1컷: 시무룩한 친구. 2컷: 어깨를 토닥이며\n" +
      "    공감해 주자 표정이 밝아짐. 따뜻하고 부드러운 색감, 귀여운 그림체.’\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 400,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "디지털 마음 톡톡 6회기 — 효과적인 의사소통과 공감 (대인관계 · 활동4+활동5)",

  // 매 회기 첫 화면 루틴
  moodCheckEnabled: true,

  // 이전 회기와 같은 분반 표 (계획엔 분반이 무관하지만 표기는 맞춰 둔다)
  groups: [
    { key: "mt-tue-1", label: "화요일 1기", classNo: 1 },
    { key: "mt-thu-1", label: "목요일 1기", classNo: 2 },
    { key: "mt-tue-2", label: "화요일 2기", classNo: 3 },
    { key: "mt-thu-2", label: "목요일 2기", classNo: 4 },
  ],

  game: {
    heading: "기다리는 동안 — 지뢰찾기",
    body:
      "친구들이 다 모일 때까지 잠깐 쉬어요.\n" +
      "숫자는 그 칸 둘레에 숨은 지뢰의 개수예요. 지뢰가 없는 칸을 골라 열어 보세요.",
    url: "https://mine-sweeper-game-seven.vercel.app/home",
  },
  gameExplainer: empty(),

  // 오늘 할 일 — 활동4·5 개요. cards·tabs 가 없어 body 가 그대로 뜬다. 영상 임베드는 없다.
  progress: {
    heading: "오늘 할 일 — 효과적인 의사소통과 공감",
    body:
      "[활동4] 효과적인 의사소통\n" +
      " ① 언어·비언어·목소리 톤  ② 나 전달법(I-message)  ③ 갈등 상황 분석\n" +
      " ④ 관계 캘리그래피 — Canva 로 덕목 표현하기\n\n" +
      "[활동5] 공감 문장·감정 대화\n" +
      " ① 공감 문장 만들기  ② 감정 말풍선 채우기  ③ 감정 대화 이어가기\n" +
      " ④ 만화 생성 프롬프트 정리 — 실제 생성은 선생님 시연/외부 도구",
    url: "",
  },

  // 6회기엔 평가 안내·영상이 없다.
  assessment: empty(),
  video: empty(),

  /*
   * 마음일기 — 매 회기 루틴. reflectionPublic 은 반드시 false(비공개).
   * 오늘 주제(의사소통·공감)를 관계로 잇는 물음을 둔다.
   */
  reflectionQuestions: [
    "오늘 활동에서 마음에 남는 순간은 언제였나요? 무엇 때문에 그랬는지도 함께 적어 주세요.",
    "지금 내 기분은 어떤가요? 그리고 왜 그런 것 같나요?",
    "오늘 배운 ‘나 전달법’ 이나 ‘공감 문장’ 을, 이번 주에 누구에게 어떻게 써볼 수 있을까요?",
  ],
  reflectionPublic: false,

  /*
   * 이탈 면제. wrapmap 은 Canva 를 새 탭으로 열어서(활동이라 이탈로 안 센다), wrapheal 은
   * 외부 창을 안 열지만 마무리 활동이라 함께 면제한다.
   */
  focusExempt: ["wrapmap", "wrapheal"],

  // 교사 버튼 순서. 대기 → 마음 체크인 → 오늘 할 일 → 활동4(wrapmap) → 활동5(wrapheal) → 마음일기.
  phaseOrder: ["waiting", "mood", "progress", "wrapmap", "wrapheal", "reflection"],

  phaseLabels: {
    mood: "마음 체크인",
    progress: "오늘 할 일",
    wrapmap: "활동4 · 효과적인 의사소통",
    wrapheal: "활동5 · 공감 문장·감정 대화",
    reflection: "마음일기",
  },

  // 6회기엔 퀴즈가 없다(노래 맞히기 등은 안 넣는다). quiz 를 비워 두면 퀴즈 단계가 안 뜬다.

  activity: {
    activityId: ACTIVITY_ID,
    // 그리기 없는 활동. 장소를 비우면 wrapheal 에서도 그림판이 안 뜬다.
    places: [],
    year: 2026,
    worksheet: WORKSHEET,

    // 자료 찾기가 아니라 관계·마음을 다루는 활동이라 출처 두 칸을 안 띄운다.
    sourcesEnabled: false,

    /*
     * ★ 서로 구경하기를 닫는다 — 의사소통·공감·감정 대화 글은 친구에게 안 나간다.
     * 서버 갤러리 라우트가 이 값을 보고 응답 자체를 막는다(gallery/route.ts).
     * 나중에 나눔 활동을 붙여 갤러리를 켤 때는, 친구에게 나갈 칸만 galleryAnswerKeys 로
     * 못박고 서버 목록도 함께 챙긴다.
     */
    galleryEnabled: false,
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} · 차시 번호 ${LESSON_NO} (6회기 대인관계 — 활동4·5. 5회기와 다른 새 통)`);
  console.log("교사 버튼 순서: 대기 → 마음 체크인 → 오늘 할 일 →");
  console.log("  [활동4 wrapmap] ① 언어·비언어·톤 → ② 나 전달법 → ③ 갈등 분석 → ④ 관계 캘리그래피(Canva)");
  console.log("  [활동5 wrapheal] ① 공감 문장 → ② 감정 말풍선 → ③ 감정 대화 이어가기 → ④ 만화 생성 프롬프트 정리");
  console.log("  → 마음일기(마무리) → 마침");
  console.log("\n프라이버시: 서로 구경하기 꺼짐(galleryEnabled: false) — 모든 서술 칸은 본인·교사만. 포털에서 Gemini/외부 API 호출 없음.");
  console.log("AI(갈등 분석 챗봇·감정 대화·만화 생성)는 포털 호출 없음 — 교사 시연/외부 도구. 실제 생성 API 연동은 별도 작업 필요.");
  console.log("Canva(활동4 캘리그래피): 분반별 초대 토큰은 .env.local(CANVA_INVITE_MT_TUE_1/THU_1 …). 세션 열 때 그 분반 것 하나만 남기고 표는 지웁니다(open-mt6-*).");
  console.log("세션은 7교시로 하나만 여세요(6교시로 열면 코드가 중간에 만료). 여는 스크립트: open-mt6-tue1.ts / open-mt6-thu1.ts");
  console.log("리허설: 재시드하면 아직 시작 안 한 세션에 반영됩니다. 진행 중(active) 세션은 건너뜁니다.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
