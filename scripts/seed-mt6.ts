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
 * 효과적인 의사소통은 대시보드에서 **세 단계**로 나뉜다(각각 다른 phase):
 *   · 「말이 마음을 잇는다」 (wrapmap) — 언어·비언어·목소리 톤 → 나 전달법(I-message) + AI 피드백
 *   · 「갈등 상황 분석하기」 (problem) — 상황 5개 중 선택 → 입장 선택 → 입장·감정·원하는 것 + AI 피드백
 *   · 「관계 캘리그래피」 (mvp) — Canva 로 덕목 표현(공유 링크). 서로 공유하면 좋은 작품이라 비공개 문구 없음
 * 이어서:
 *   · 「공감 문장 · 감정 대화」 (wrapheal) — 공감 문장 + AI 피드백 → 감정 대화 챗봇(임베드, empathy_dialogue)
 *   · 「감정 위로 챗봇」 (grill) — 상황 고르기 → 챗봇 설계 → 내 챗봇과 대화
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
 * 나 전달법·갈등 분석(입장/감정/원하는 것)·공감 문장·감정 대화·챗봇 설계/대화는 모두 개인
 * 성찰/작성이라 친구에게 절대 안 나간다. 서로 감상하기(gallery)는 켜지만(galleryEnabled: true),
 * galleryAnswerKeys 에 **오직 캘리그래피 이미지(a4_calli_image) 한 칸만** 넣는다. 서버 갤러리
 * 라우트(gallery/route.ts)의 toCard 는 이 목록의 키만 친구 카드에 실으므로, 그 밖의 서술·대화
 * (a4_virtue·나 전달법·갈등·모든 a5_*·모든 cb_*·감정 대화 transcript)는 친구에게 나갈 길이 없다.
 * 갤러리는 익명(galleryShowNames 기본 false)이고 성찰은 비공개(reflectionPublic: false)다.
 *
 * AI 는 포털에서 Gemini 로 호출한다: 나 전달법·공감 문장·갈등 분석의 AI 피드백(ai_feedback),
 * 감정 위로 챗봇(grill)·감정 대화 연습(wrapheal ②)의 임베드 챗봇(comfort_bot). 어느 쪽도 학번·
 * 이름을 Gemini 로 보내지 않고, 위기 신호는 Gemini 앞에서 서버가 막고 교사에게 신호만 보낸다.
 * 챗봇/감정 대화 transcript 는 answers 에 저장·교사 열람(학생 화면에 "선생님이 볼 수 있어요" 상시).
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

/* ─────────── 활동4 「갈등 상황 분석하기」 상황·입장 (choicesBySource 로 이어짐) ─────────── */

/**
 * 살펴볼 또래 갈등 상황 5개. choice(a4_conflict_situation)의 보기이자, 아래 입장표(CONFLICT_SIDES)의
 * 키다. 중학생 눈높이 — 학교·친구·가정을 고루 담았다.
 */
const CONFLICT_SITUATIONS = [
  "① 단짝 친구가 다른 친구와 더 친해진 것 같아 서운하다",
  "② 모둠 과제에서 나만 일을 많이 하고 점수는 똑같다",
  "③ 폰 사용 시간 때문에 부모님과 부딪힌다",
  "④ 빌려준 물건을 친구가 자꾸 안 돌려준다",
  "⑤ 친구들 주말 모임에 나만 초대받지 못했다",
];

/**
 * 상황별 두 입장(A·B). 키는 CONFLICT_SITUATIONS 문구와 **정확히 같아야** 한다 — choicesBySource 가
 * 고른 상황 라벨로 이 표에서 입장 보기를 찾는다. 상황을 고르면 그 상황의 두 입장만 아래에 뜬다.
 */
const CONFLICT_SIDES: Record<string, string[]> = {
  "① 단짝 친구가 다른 친구와 더 친해진 것 같아 서운하다": [
    "서운한 나의 입장",
    "새 친구와도 친해지고 싶은 단짝의 입장",
  ],
  "② 모둠 과제에서 나만 일을 많이 하고 점수는 똑같다": [
    "일을 많이 한 나의 입장",
    "참여가 적었던 모둠원의 입장",
  ],
  "③ 폰 사용 시간 때문에 부모님과 부딪힌다": [
    "쉬고 싶은 나의 입장",
    "폰 사용을 걱정하는 부모님의 입장",
  ],
  "④ 빌려준 물건을 친구가 자꾸 안 돌려준다": [
    "빌려준 것을 돌려받고 싶은 나의 입장",
    "자꾸 깜빡한 친구의 입장",
  ],
  "⑤ 친구들 주말 모임에 나만 초대받지 못했다": [
    "초대받지 못해 속상한 나의 입장",
    "급하게 모임을 정한 친구들의 입장",
  ],
};

/* ─────────── 감정 위로 챗봇(grill) 상황 전문 ───────────
 * 학생 화면(case_story)과 서버 시스템 프롬프트(cb_chat situations[].text)가 **같은 글**을 쓰도록
 * 한 곳에 둔다. 상황을 고르면 case_story 가 고른 전문만 펼치고, 서버는 그 상황을 챗봇에 심는다.
 */
const CB_SIT1_TEXT = `중학교에 올라와서 새로 만난 수아, 민지, 유진이는 함께 붙어다니는 베프였다. 매일 점심을 같이 먹고, 집에 가서도 항상 문자메시지를 주고받으며 수다를 떨어야만 잠을 잘 수 있을 정도로 가까웠다. 특히 2학기에 들어 세 친구는 이번 도덕 수행평가에서도 한 조가 되면서 더욱 친해졌다. 갈등은 사소한 일에서 시작됐다. 발표 자료를 마무리하기 위해 방과 후 도서관에서 만나기로 한 날, 수아는 약속 시간에 15분이나 늦었다. 민지와 유진이는 이미 자료를 펼쳐 놓고 수아를 기다리고 있었다. 수아는 늦게 도착해서 미안하다고 사과했다. 민지는 살짝 짜증이 났다. 그래도 겉으로 티를 내지는 않았다. 그날 밤, 민지와 유진은 수행평가 일정 조율에 대해 다시 이야기할 필요를 느꼈다. 수아가 적극적이지 않은 것 같아 둘이 먼저 상의하고 싶었다. 민지는 기존의 세 명의 채팅방이 아닌, 새로운 채팅방을 만들어 유진만 초대했다. 다음 날 아침, 유진의 휴대폰 화면을 얼핏 본 수아는 알림 창에 뜬 '도덕 수행 (2)'라는 새로운 채팅방 이름을 발견했다. 게다가 민지와 유진이 어딘가 모르게 수군거리는 듯한 느낌을 받았다. 수아의 머릿속에는 오직 하나의 생각만 가득 찼다. '나 빼고 둘이서 뭘 얘기하는 거지? 약속에 늦은 것 때문에 화가 나서 나를 따돌리려는 건가?' 결국, 점심시간. 수아는 더 이상 참지 못하고 민지와 유진에게 다가갔다. "너희들, 나 빼고 만든 그 채팅방 뭐야?" 수아의 목소리는 떨렸고, 눈빛은 이미 상처로 가득 차 있었다. 민지는 당황했다. "아, 그거? 어젯밤에..." 수아는 민지의 말을 끊었다. "변명하지 마. 나한테는 말할 수 없는 비밀 이야기라도 있는 거야? 약속 늦은 거 미안하다고 했잖아. 꼭 이렇게 사람 기분 나쁘게 해야 해?" 민지도 억울함에 목소리를 높였다. "뭐? 우리가 너 따돌린다고? 그 방은 그냥 네가 도덕 수행을 힘들어하는 것 같아서 발표자료 우리가 만들자 얘기하려고 만든 거야! 왜 멋대로 오해하고 소리 질러?" 순식간에 세 친구 사이에는 차가운 침묵이 흘렀다.`;

const CB_SIT2_TEXT = `중학교 1학년 준서와 현우는 같은 반이자, 쉬는 시간마다 붙어 앉아 휴대폰 게임 이야기를 나누는 절친이었다. 특히 두 사람은 '배틀그라운드'라는 인기 모바일게임에 빠져 있었다. 현우에게는 오랜 염원이 있었다. 바로 게임의 랭킹을 올려 '골드' 단계가 되는 것이었다. 주말 내내 수십 번의 실패 끝에, 현우는 마침내 골드를 달성하는 데 성공했다. 현우는 이 소식을 당장 준서에게 자랑하고 싶어 월요일이 되기를 손꼽아 기다렸다. 월요일 점심시간, 현우는 설레는 마음으로 준서에게 다가갔다. "야, 준서야! 나 이제 골드야!" 현우는 승리감에 가득 차서 말했다. 준서는 급식을 먹다가 현우를 힐끗 보더니, 피식 웃으며 가볍게 말했다. "어? 겨우? 난 그거 이틀 만에 했는데. 골드면 이제 뉴비 벗어난거지 뭐." 준서는 정말 별 뜻 없이, 그저 자신과 비교해서 던진 흔한 '고수 티내기'였다. 하지만 현우는 자존심이 상했다. 자신이 노력했던 시간을 무시당한 기분이었다. '겨우? 나한테는 엄청 대단한 일이었는데. 나를 바보 취급하는 건가? 내가 못 하는 걸 알고 일부러 놀리는 건가?' 현우는 얼굴이 굳어졌다. "아, 그래. 너야 뭐 프로게이머급이니까." 현우는 퉁명스럽게 대답하고는 자기 자리로 돌아가 버렸다. 준서는 현우의 반응에 의아했지만, "쟤 왜 저래? 그냥 농담인데"라고 혼잣말하며 대수롭지 않게 넘겼다. 그때부터 현우는 준서를 피하기 시작했다. 준서가 옆에 오면 자리를 피하고, 눈도 마주치지 않았다. 현우의 눈에는 준서의 모든 행동이 자신을 놀리려는 의도로 보였다. 며칠 후, 체육 시간. 농구 경기 중 현우가 실수로 공을 놓치자, 준서가 "야, 집중 안 하냐?"라고 소리쳤다. 그러자 현우는 폭발했다. 그는 준서에게 다가서며 거칠게 말했다. "너 요즘 왜 그래? 재수 없게! 내가 게임 못 한다고, 농구도 못 한다고 생각하는 거지? 너 그렇게 잘났냐? 나 함부로 무시하지 마!" 준서는 깜짝 놀라 공을 내려놓았다. "무시? 내가 언제 너 무시했어? 그냥 공에 집중하라는 말이잖아!" "뻥치지 마! 네가 그때 '겨우 골드'라고 했잖아. 솔직히 말해봐 너 나 놀리는 거잖아! 너한테는 쉬워도 나한테는 힘든 것도 있어!" 현우는 목소리를 높이며 그동안 쌓아뒀던 감정을 터뜨렸다. 준서는 그제야 자신의 '농담'이 현우에게 얼마나 큰 상처가 되었는지 깨달았다.`;

const WORKSHEET: WorksheetQuestion[] = [
  /* ══════════════ 효과적인 의사소통 — 세 단계(wrapmap·problem·mvp) ══════════════
   *
   *   [wrapmap 말이 마음을 잇는다] 언어·비언어·톤 → 나 전달법(I-message) + AI 피드백
   *   [problem 갈등 상황 분석하기] 상황 5개 중 선택 → 입장 선택 → 입장·감정·원하는 것 + AI 피드백
   *   [mvp 관계 캘리그래피] Canva 로 덕목 표현 → 캘리그래피 이미지 제출
   *
   * 갈등 분석·나 전달법: 학생 서술만 Gemini 로 보내(학번·이름 제외) AI 피드백을 받는다.
   * 관계 캘리그래피: Canva 초대(위 CANVA_BY_GROUP)를 쓰고, 산출물은 image 로 붙여 감상한다.
   *
   * 프라이버시: 나 전달법·갈등(입장/감정/원하는 것)·a4_virtue 는 친구에게 안 나간다 —
   * galleryAnswerKeys 에 캘리그래피 이미지(a4_calli_image) 한 칸만 있다.
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
    label: "나 전달법(I-message) — ‘너’ 대신 ‘나’ 로 말하기",
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
    key: "a4_imsg_fb",
    phase: "wrapmap",
    /*
     * ★ 나 전달법 AI 피드백. 버튼을 누르면 서버가 a4_imsg 답을 Gemini 에 보내(학번·이름 제외)
     * 3요소(상황·감정·바람)가 담겼는지 보고 잘했다/힌트를 돌려준다. 채점이 아니다. 위기 신호는
     * Gemini 앞에서 차단(ai-feedback route). 코드 배포가 있어야 학생 화면에서 버튼이 동작한다.
     */
    label: "AI 도우미에게 내 나 전달법 피드백 받기",
    hint:
      "위 문장을 다 썼으면 아래 버튼을 눌러요. AI 도우미가 [상황]·[내 감정]·[바라는 것]이\n" +
      "잘 담겼는지 봐 주고, 부족하면 어디를 어떻게 고치면 좋을지 알려 줘요. 점수가 아니에요.",
    kind: "ai_feedback",
    feedbackVariant: "imessage",
    feedbackFields: [{ key: "a4_imsg", label: "나 전달법 문장" }],
    maxLength: 0,
  },
  /* ── 갈등 상황 분석하기 (phase: problem) — 상황 고르기 → 입장 고르기 → 입장·감정·원하는 것 → AI 피드백 ── */
  {
    key: "_a4_conflict_note",
    phase: "problem",
    label: "갈등 상황 들여다보기",
    hint:
      "갈등은 나쁜 게 아니라, 서로 원하는 것이 부딪히는 자연스러운 일이에요. 잘 ‘들여다보면’ 풀 실마리가 보여요.\n\n" +
      "오늘 살펴볼 상황(하나를 골라요):\n" +
      " ① 단짝 친구가 요즘 다른 친구와 더 붙어 다녀 서운하다.\n" +
      " ② 모둠 과제에서 나는 거의 다 했는데, 참여 적은 친구와 점수가 똑같다.\n" +
      " ③ 나는 학원 끝나고 잠깐 폰으로 쉬는데, 부모님은 줄이라고 하신다.\n" +
      " ④ 아끼는 물건을 빌려줬는데, 친구가 며칠째 깜빡했다며 안 돌려준다.\n" +
      " ⑤ 친구들이 주말에 모여 놀았는데, 나만 초대받지 못했다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "a4_conflict_situation",
    phase: "problem",
    // 상황 선택. choices 는 CONFLICT_SITUATIONS(아래 입장표의 키와 정확히 같다).
    label: "① 살펴볼 갈등 상황을 하나 고르세요",
    hint: "고른 상황에 따라 아래 ②에서 고를 입장이 달라져요.",
    kind: "choice",
    choices: CONFLICT_SITUATIONS,
    maxLength: 0,
  },
  {
    key: "a4_conflict_side",
    phase: "problem",
    // 입장 선택. 고른 상황(a4_conflict_situation)에 따라 보기가 바뀐다(choicesBySource).
    label: "② 그 상황에서 한 쪽 입장을 고르세요",
    hint: "두 입장 중 하나가 되어 그 사람의 마음을 들여다볼 거예요.",
    kind: "choice",
    choicesBySource: { sourceKey: "a4_conflict_situation", optionsByMatch: CONFLICT_SIDES },
    maxLength: 0,
  },
  {
    key: "_a4_conflict_fields_note",
    phase: "problem",
    label: "③ 고른 입장에서 세 가지를 나눠 적어요",
    hint:
      "‘입장’ 은 그 사람의 처지·생각, ‘감정’ 은 그때 마음(속상함·억울함·서운함 같은 마음의 낱말),\n" +
      "‘원하는 것’ 은 정말로 바라는 것이에요. 세 가지를 섞지 말고 따로따로 적어 보세요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "a4_conflict_stance",
    phase: "problem",
    // 개인 기록. 비공개.
    label: "입장 — 그 사람은 어떤 처지·생각인가요?",
    hint: "예) 나는 단짝과 늘 붙어 다녔는데 요즘 멀어진 것 같다. 이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 150,
  },
  {
    key: "a4_conflict_feeling",
    phase: "problem",
    // 개인 기록. 비공개.
    label: "감정 — 그때 마음은 어떤가요? (마음의 낱말로)",
    hint: "예) 서운함, 외로움, 조금 불안함. ‘생각’ 말고 ‘마음의 낱말’ 로. 이 칸은 나와 선생님만 봐요.",
    kind: "text",
    maxLength: 80,
  },
  {
    key: "a4_conflict_want",
    phase: "problem",
    // 개인 기록. 비공개.
    label: "원하는 것 — 정말 바라는 건 무엇인가요?",
    hint: "예) 단짝과 예전처럼 시간을 보내고 싶다. 이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 150,
  },
  {
    key: "a4_conflict_fb",
    phase: "problem",
    /*
     * ★ 갈등 분석 AI 피드백. 서버가 고른 상황·입장과 세 칸(입장·감정·원하는 것)을 Gemini 에
     * 보내(학번·이름 제외) 세 가지가 잘 구분됐는지 보고 잘했다/힌트를 돌려준다. 어느 편도 들지
     * 않는다. 위기 신호는 Gemini 앞에서 차단. 코드 배포가 있어야 학생 화면에서 버튼이 동작한다.
     */
    label: "AI 도우미에게 내 갈등 분석 피드백 받기",
    hint:
      "세 칸을 다 썼으면 아래 버튼을 눌러요. AI 도우미가 입장·감정·원하는 것이 잘 나뉘어\n" +
      "적혔는지 봐 주고, 부족하면 어느 칸을 어떻게 고치면 좋을지 알려 줘요. 점수가 아니에요.",
    kind: "ai_feedback",
    feedbackVariant: "conflict",
    feedbackFields: [
      { key: "a4_conflict_situation", label: "고른 상황" },
      { key: "a4_conflict_side", label: "고른 입장" },
      { key: "a4_conflict_stance", label: "입장" },
      { key: "a4_conflict_feeling", label: "감정" },
      { key: "a4_conflict_want", label: "원하는 것" },
    ],
    maxLength: 0,
  },
  /* ── 관계 캘리그래피 (phase: mvp) — Canva 로 덕목 표현. 서로 공유하면 좋은 작품이라 비공개 문구를 뺐다 ── */
  {
    key: "_a4_calli_login",
    phase: "mvp",
    // Canva 로그인 — 관계 캘리그래피. 아래 linkUrl 은 기본값이고, 세션을 열 때 그 분반 것으로 바뀐다.
    label: "관계 캘리그래피 — Canva 열기",
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
    phase: "mvp",
    label: "덕목 하나를 골라 캘리그래피로",
    hint:
      "예) 존중 · 경청 · 신뢰 · 배려 · 정직 · 공감 …\n" +
      "Canva 에서 글자 디자인(텍스트·폰트·색)이나 손글씨 요소로 그 덕목을 멋지게 표현해요.\n" +
      "완성하면 화면을 캡처(Win+Shift+S)해 아래에 붙여넣거나, 손글씨는 사진으로 올려요.\n\n" +
      "🔒 실명·개인정보는 작품이나 파일 이름에 넣지 않아요.\n" +
      "🎨 이 ‘캘리그래피 이미지’ 만 친구들과 서로 감상해요. 다른 칸(덕목 이유·공감·대화 등)은 나와 선생님만 봐요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "a4_virtue",
    phase: "mvp",
    // 덕목을 고른 이유(개인 성찰). 친구에게 안 나간다 — galleryAnswerKeys 에 없다(이미지 한 칸만 공유).
    label: "내가 고른 덕목과, 그것이 관계에서 중요하다고 생각한 이유를 한두 줄로",
    hint: "예) 경청 — 잘 들어주는 것만으로도 상대가 존중받는다고 느끼니까.",
    kind: "long",
    maxLength: 200,
  },
  {
    key: "a4_calli_image",
    phase: "mvp",
    /*
     * ★ 산출물 = 캘리그래피 이미지. 링크가 아니라 image kind 로 받아, 캡처 붙여넣기(Ctrl+V)나
     * 파일 업로드로 내면 그 자리에 바로 보인다(감상이 쉽다). image 는 데이터 URL 로 answers 에
     * 담기고 image-field 가 화면에서 축소한다(TARGET_CHARS 24만 자) — maxLength 를 그 위로 넉넉히
     * (Firestore 1MB 안). ★ 이 키만 galleryAnswerKeys 에 넣어 서로 감상한다(다른 칸은 절대 안 넣음).
     */
    label: "내 캘리그래피 작품 — 캡처해서 붙여넣거나 사진을 올려요",
    hint:
      "Canva 화면을 캡처(Win+Shift+S)한 뒤 아래에 Ctrl+V 로 붙여넣거나, [사진 고르기] 로 이미지\n" +
      "파일을 올려요. 붙이면 작품이 바로 보여요. 이 캘리그래피 이미지는 친구들과 서로 감상해요.",
    kind: "image",
    maxLength: 280_000,
  },

  /* ══════════════ 활동5 「공감 문장 · 감정 대화」 (wrapheal) ══════════════
   *
   *   ① 공감 문장 만들기 (AI 피드백)  →  ② 감정 대화 이어가기 (임베드 Gemini 챗봇)
   *
   * ① a5_empathy 에 공감 문장을 쓰고 a5_empathy_fb(ai_feedback, empathy)로 [상황 되짚기]+[감정
   *   알아주기] 두 요소가 담겼는지 피드백을 받는다(나 전달법과 같은 AI 피드백 방식).
   * ② a5_dialogue 는 comfort_bot 의 empathy_dialogue 프리셋 — 학습된 Gemini 챗봇이 감정 상황을
   *   꺼내면 학생이 배운 공감으로 응답을 이어 가며 실습한다. 감정 위로 챗봇(grill)과 별개 활동이다
   *   (시스템 프롬프트가 다르다). 대화 transcript 는 answers[a5_dialogue] 에 저장·교사 열람,
   *   화면에 "선생님이 볼 수 있어요" 상시 표시, 학번·이름 미전송, 위기 신호 서버 차단+교사 알림.
   *
   * 모든 서술·대화 칸(a5_empathy·a5_dialogue transcript 등)은 친구에게 안 나간다 —
   * galleryAnswerKeys 에 캘리그래피 이미지 한 칸만 있고 a5_* 는 하나도 없다.
   * wrapheal 은 원래 그림판을 여는 단계지만, places 를 비워 그림판은 안 뜨고 활동지 문항만 뜬다.
   */
  {
    key: "_a5_intro",
    phase: "wrapheal",
    label: "공감으로 마음 잇기",
    hint:
      "관계를 살리는 마지막 열쇠는 ‘공감’ 이에요. 상대의 감정을 알아주는 한마디가 큰 힘이 됩니다.\n" +
      "오늘은 ① 공감 문장 만들기 → ② 감정 대화 이어가기 순서로 해봐요.",
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
    key: "a5_empathy_fb",
    phase: "wrapheal",
    /*
     * ★ 공감 문장 AI 피드백(나 전달법과 같은 방식). 서버가 a5_empathy 답을 Gemini 에 보내
     * (학번·이름 제외) [상황 되짚기]+[감정 알아주기] 두 요소가 담겼는지 보고 잘했다/힌트를 준다.
     * 위기 신호는 Gemini 앞에서 차단. 코드 배포가 있어야 학생 화면에서 버튼이 동작한다.
     */
    label: "AI 도우미에게 내 공감 문장 피드백 받기",
    hint:
      "공감 문장을 썼으면 아래 버튼을 눌러요. AI 도우미가 [상황 되짚기]·[감정 알아주기]가\n" +
      "잘 담겼는지 봐 주고, 부족하면 어떻게 고치면 좋을지 알려 줘요. 점수가 아니에요.",
    kind: "ai_feedback",
    feedbackVariant: "empathy",
    feedbackFields: [{ key: "a5_empathy", label: "공감 문장" }],
    maxLength: 0,
  },
  {
    key: "_a5_dialogue_note",
    phase: "wrapheal",
    label: "② 감정 대화 이어가기",
    hint:
      "이번엔 챗봇과 실제로 감정 대화를 나눠 봐요. 챗봇이 먼저 속마음이 담긴 이야기를 꺼내면,\n" +
      "배운 공감([상황 되짚기] + [감정 알아주기])으로 답을 이어가 보세요.\n" +
      "이 대화는 선생님이 볼 수 있어요. 마음이 많이 힘들 땐 챗봇보다 선생님과 직접 이야기해도 돼요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "a5_dialogue",
    phase: "wrapheal",
    /*
     * ★ 감정 대화 연습 챗봇 = comfort_bot 의 empathy_dialogue 프리셋. 감정 위로 챗봇(grill)과는
     * 별개 활동이라 시스템 프롬프트가 다르다(comfort-bot.ts 의 EMPATHY_DIALOGUE_SYSTEM). 상황
     * 선택·설계 칸이 없어도 바로 시작한다(라우트가 아티팩트를 ensure). transcript 는
     * answers[a5_dialogue] 에 저장·교사 열람. 컴포넌트가 "선생님이 볼 수 있어요" 를 상시 표시.
     * 위기 신호는 서버가 Gemini 앞에서 차단 + 교사 알림. 코드 배포가 있어야 화면에 챗봇이 뜬다.
     */
    label: "감정 대화 챗봇과 이어가 보기",
    hint:
      "‘대화 시작하기’ 를 누르면 챗봇이 먼저 감정이 담긴 이야기를 꺼내요. 그 마음을 공감으로\n" +
      "알아주며 대화를 이어가 보세요. 이 대화는 선생님이 볼 수 있어요.",
    kind: "comfort_bot",
    botPreset: "empathy_dialogue",
    botNotice:
      "이 감정 대화는 선생님이 볼 수 있어요. 마음이 많이 힘들 땐 챗봇보다 선생님과 직접 이야기해도 돼요.",
    maxLength: 0,
  },

  /* ══════════════ 감정 위로 챗봇 만들기 (grill) ══════════════
   *
   * 활동5 다음, 마음일기 앞. 학생이 갈등 상황 하나를 골라 그 상황을 학습한 '감정 위로
   * 챗봇'을 직접 설계하고(페르소나·말투·물어볼 것·위로/조언 방식), 자기 챗봇과 대화한다.
   *
   * ## 프라이버시·안전 (이 과목의 1순위)
   *
   * - 대화 transcript 는 answers[cb_chat] 에 저장되고 교사가 대시보드에서 열람한다. 학생
   *   화면에는 컴포넌트가 "이 대화는 선생님이 볼 수 있어요" 를 상시 띄운다(투명성). 설계·대화
   *   칸 모두 개인 것이라 친구에게 안 나간다 — galleryAnswerKeys 에 캘리그래피 이미지 한 칸만
   *   있고 cb_* 키는 하나도 없다(절대 넣지 말 것).
   * - 위기 신호는 서버가 Gemini 앞에서 멈추고(checkCrisis), 교사에게 신호만 보낸다
   *   (flagCareAlert — 무엇을 썼는지는 빼고). 시스템 프롬프트에도 안전 가드레일이 심겨 있다.
   *   (comfort-bot.ts · /api/student/comfort-bot · comfort-bot-panel)
   *
   * ⚠ 코드 배포 필요: comfort_bot kind·라우트·패널은 코드다. main 머지 후 Vercel 재빌드가
   * 되어 있어야 학생 화면에 챗봇 패널이 뜨고 라우트가 동작한다. 시드만 얹고 배포 전이면
   * 패널이 안 뜬다.
   *
   * situations[].text(=CB_SIT*_TEXT)는 서버 시스템 프롬프트에 들어가고, 학생 화면에는 고른 상황
   * 하나만 cb_situation_story(case_story)로 펼쳐진다. match 는 cb_situation 보기 문구와 정확히 같다.
   */
  {
    key: "_cb_intro",
    phase: "grill",
    label: "내가 만드는 ‘감정 위로 챗봇’",
    hint:
      "갈등 상황 하나를 골라, 그 상황을 아는 위로 챗봇을 직접 만들어 볼 거예요.\n" +
      "① 상황 고르기 → ② 챗봇 설계(누구인지·말투·물어볼 것·위로 방식) → ③ 내 챗봇과 대화하기\n" +
      "이 대화는 선생님이 볼 수 있어요. 마음이 많이 힘들 땐 챗봇보다 선생님과 직접 이야기해도 돼요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "cb_situation",
    phase: "grill",
    // 상황 선택. choices 문구는 situations[].match·CB_SIT*_TEXT 매칭 라벨과 정확히 같아야 한다.
    label: "① 위로받고 싶은 갈등 상황을 하나 고르세요",
    hint: "아래 두 상황 중 하나를 고르면, 그 상황의 이야기가 펼쳐져요. 내 챗봇은 고른 그 상황을 알고 대화해요.",
    kind: "choice",
    choices: [
      "상황 1 — 친구 채팅방 오해 (수아·민지·유진)",
      "상황 2 — 게임 ‘겨우 골드’ (현우·준서)",
    ],
    maxLength: 0,
  },
  {
    key: "cb_situation_story",
    phase: "grill",
    /*
     * 고른 상황(cb_situation)의 전문만 펼쳐 보여준다(기존 case_story kind 재사용 — 새 코드 없음).
     * 처음엔 두 전문을 다 펼쳤지만 길어서, 고른 것 하나만 뜨게 바꿨다. match 는 cb_situation
     * choices 문구와 정확히 같아야 한다. 서버 cb_chat 은 situations[].text 를 그대로 계속 쓴다.
     */
    label: "고른 상황 이야기",
    hint: "",
    kind: "case_story",
    storySourceKey: "cb_situation",
    stories: [
      { match: "상황 1 — 친구 채팅방 오해 (수아·민지·유진)", text: CB_SIT1_TEXT },
      { match: "상황 2 — 게임 ‘겨우 골드’ (현우·준서)", text: CB_SIT2_TEXT },
    ],
    maxLength: 0,
  },
  {
    key: "_cb_design_note",
    phase: "grill",
    label: "② 내 위로 챗봇을 설계해요",
    hint:
      "챗봇이 어떤 성격이면 좋을지 정해요. 아래 네 칸을 채우면, 그 성격대로 챗봇이 대화해요.\n" +
      "먼저 챗봇이 자기소개를 하고(누구인지), 무슨 일이 있었는지·왜 그랬는지·어떤 감정인지\n" +
      "물으며 위로하고 조언해 줄 거예요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "cb_persona",
    phase: "grill",
    // 설계 칸(designKeys). 개인 작성, 비공개.
    label: "챗봇은 누구인가요? — 이름과 역할",
    hint: "예) 이름은 ‘마음이’, 상황 속 친구의 마음을 잘 아는 또래 상담 친구.",
    kind: "text",
    maxLength: 60,
  },
  {
    key: "cb_tone",
    phase: "grill",
    label: "챗봇의 말투는 어떤가요?",
    hint: "예) 다정하고 차분하게, 편안한 반말로.",
    kind: "text",
    maxLength: 60,
  },
  {
    key: "cb_ask",
    phase: "grill",
    label: "챗봇이 나에게 무엇을 물어봐 줬으면 하나요?",
    hint: "예) 그때 어떤 기분이었는지, 왜 그렇게 느꼈는지, 상대는 어떤 마음이었을지.",
    kind: "long",
    maxLength: 200,
  },
  {
    key: "cb_help",
    phase: "grill",
    label: "어떻게 위로하고 조언해 주면 좋을까요?",
    hint: "예) 먼저 내 마음을 알아주고, 그다음 부드럽게 방법을 알려주기. 다그치지 않기.",
    kind: "long",
    maxLength: 200,
  },
  {
    key: "cb_chat",
    phase: "grill",
    /*
     * ★ 감정 위로 챗봇 대화. situations[].text 는 서버 시스템 프롬프트 전용(학생 화면엔 위 note 로
     * 따로 읽힌다). designKeys 로 위 설계 칸을 읽어 챗봇 성격으로 심는다. transcript 는
     * answers[cb_chat] 에 저장되고 교사가 열람한다. 컴포넌트가 "선생님이 볼 수 있어요" 를 상시 표시.
     */
    label: "③ 내가 만든 챗봇과 대화해 보기",
    hint:
      "‘대화 시작하기’ 를 누르면 챗봇이 먼저 자기소개를 해요. 무슨 일이 있었는지 편하게\n" +
      "이야기해 보세요. 이 대화는 선생님이 볼 수 있어요.",
    kind: "comfort_bot",
    situationSourceKey: "cb_situation",
    designKeys: [
      { key: "cb_persona", label: "이름·역할" },
      { key: "cb_tone", label: "말투" },
      { key: "cb_ask", label: "물어볼 것" },
      { key: "cb_help", label: "위로·조언 방식" },
    ],
    situations: [
      { match: "상황 1 — 친구 채팅방 오해 (수아·민지·유진)", text: CB_SIT1_TEXT },
      { match: "상황 2 — 게임 ‘겨우 골드’ (현우·준서)", text: CB_SIT2_TEXT },
    ],
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "디지털 마음 톡톡 6회기 — 효과적인 의사소통과 공감 (대인관계)",

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

  // 오늘 할 일 — 효과적인 의사소통(3단계)·공감·챗봇 개요. cards·tabs 가 없어 body 가 그대로 뜬다.
  progress: {
    heading: "오늘 할 일 — 효과적인 의사소통과 공감",
    body:
      "효과적인 의사소통 — 세 단계로 나눠 해요\n" +
      " 1) 말이 마음을 잇는다 — 언어·비언어·목소리 톤, 그리고 나 전달법(AI 피드백)\n" +
      " 2) 갈등 상황 분석하기 — 상황을 골라 입장·감정·원하는 것으로 들여다보기(AI 피드백)\n" +
      " 3) 관계 캘리그래피 — Canva 로 덕목을 멋글씨로 만들어 이미지로 올리고, 친구 작품 감상하기\n\n" +
      "그다음\n" +
      " · 공감 문장·감정 대화 — 공감 문장 만들기(AI 피드백) → 감정 대화 챗봇과 이어가기\n" +
      " · 감정 위로 챗봇 — 내가 만든 챗봇과 대화하기\n" +
      " · 마음일기 — 오늘을 짧게 돌아보기",
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
   * 이탈 면제. 효과적인 의사소통 세 단계(wrapmap·problem·mvp) 중 mvp 는 Canva 를 새 탭으로
   * 열고(활동이라 이탈로 안 센다), 나머지도 활동/대화 단계라 함께 면제한다. wrapheal(공감 문장·
   * 감정 대화)·grill(감정 위로 챗봇)은 임베드 챗봇을 쓰지만 마무리 활동이라 면제에 둔다.
   */
  focusExempt: ["wrapmap", "problem", "mvp", "wrapheal", "grill"],

  /*
   * 교사 버튼 순서. 「효과적인 의사소통」을 세 단계로 쪼갰다:
   *   대기 → 오늘 할 일 → 말이 마음을 잇는다(wrapmap) → 갈등 상황 분석하기(problem)
   *   → 관계 캘리그래피(mvp) → 캘리그래피 감상(gallery) → 공감 문장·감정 대화(wrapheal)
   *   → 감정 위로 챗봇(grill) → 마음일기(reflection)
   * problem·mvp 는 STEP_PHASES 라 그 단계에 문항이 있으면 버튼이 뜬다(정보과·hai 와 안 겹치게
   * 내부 phase 슬롯만 빌려 쓰고, 화면 이름은 phaseLabels 로 붙인다). grill·wrapheal 과 안 겹친다.
   * gallery(캘리그래피 감상)는 galleryEnabled: true 라 뜬다 — 캘리그래피 이미지 한 칸만 서로 본다.
   * mood(마음 체크인)는 phaseOrder 에서 뺀다 — 기분은 대기 화면에서 먼저 받으므로 별도 단계가
   * 중복이다(availablePhase 가 "phaseOrder 에 mood 없으면 단추 숨김"). moodCheckEnabled 는 켜 둔다.
   */
  phaseOrder: [
    "waiting",
    "progress",
    "wrapmap",
    "problem",
    "mvp",
    "gallery",
    "wrapheal",
    "grill",
    "reflection",
  ],

  phaseLabels: {
    mood: "마음 체크인",
    progress: "오늘 할 일",
    wrapmap: "말이 마음을 잇는다",
    problem: "갈등 상황 분석하기",
    mvp: "관계 캘리그래피",
    gallery: "캘리그래피 감상",
    wrapheal: "공감 문장·감정 대화",
    grill: "감정 위로 챗봇",
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
     * ★ 서로 감상하기 — 캘리그래피 이미지 '한 칸만' 친구에게 나간다 (프라이버시 1순위).
     *
     * galleryEnabled: true 로 갤러리를 켜되, galleryAnswerKeys 에 오직 a4_calli_image(캘리그래피
     * 이미지)만 못박는다. 서버 갤러리 라우트(gallery/route.ts)의 toCard 는 이 목록의 키만 친구
     * 카드에 싣는다 — a4_virtue·나 전달법·갈등(입장/감정/원하는 것)·모든 a5_*(공감·감정 대화)·
     * 모든 cb_*(챗봇 설계·대화 transcript)는 목록에 없어 친구에게 절대 나가지 않는다(본인·교사만).
     * 익명 갤러리(galleryShowNames 기본 false) + 성찰 비노출(reflectionPublic: false) 유지.
     */
    galleryEnabled: true,
    galleryAnswerKeys: ["a4_calli_image"],
    feedbackPrompts: {
      found: {
        label: "이 작품에서 어떤 덕목이 느껴지나요?",
        placeholder: "예) 글씨가 단단해서 ‘신뢰’ 가 느껴져요",
      },
      question: {
        label: "작품을 만든 친구에게 남기고 싶은 말",
        placeholder: "예) 색이 참 잘 어울려요!",
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} · 차시 번호 ${LESSON_NO} (6회기 대인관계. 5회기와 다른 새 통)`);
  console.log("교사 버튼 순서: 대기 → 오늘 할 일 →");
  console.log("  [말이 마음을 잇는다 wrapmap] 언어·비언어·톤 → 나 전달법(작성 + AI 피드백 버튼)");
  console.log("  [갈등 상황 분석하기 problem] 상황 5개 중 선택 → 입장 선택 → 입장·감정·원하는 것 3칸 → AI 피드백 버튼");
  console.log("  [관계 캘리그래피 mvp] Canva 로 덕목 캘리그래피 → 이미지 붙여넣기/업로드(a4_calli_image)");
  console.log("  [캘리그래피 감상 gallery] 서로의 캘리그래피 이미지만 감상(익명). 감정·서술 칸은 안 나감");
  console.log("  [공감 문장·감정 대화 wrapheal] 공감 문장(AI 피드백) → 감정 대화 챗봇(임베드, empathy_dialogue)");
  console.log("  [감정 위로 챗봇 grill] 상황 고르기 → 챗봇 설계(4칸) → 내 챗봇과 대화(cb_chat)");
  console.log("  → 마음일기(마무리) → 마침");
  console.log("\n프라이버시: 서로 감상 켬(galleryEnabled: true)이되 galleryAnswerKeys=['a4_calli_image'] 한 칸만 — 캘리그래피 이미지만 친구에게 나감.");
  console.log("  a4_virtue·나 전달법·갈등(입장/감정/원하는 것)·모든 a5_*·모든 cb_*·감정 대화 transcript 는 galleryAnswerKeys 밖이라 친구에게 절대 안 나감(본인·교사만). 갤러리 익명·성찰 비공개.");
  console.log("AI 피드백(나 전달법·공감 문장·갈등): 앞 칸 답만 Gemini 로(학번·이름 제외). 위기 신호는 서버가 Gemini 앞에서 차단 + 교사 알림. 결과는 answers 에 저장(참고용, 비공개).");
  console.log("임베드 챗봇 2종: 감정 위로 챗봇(grill, cb_chat)·감정 대화 연습(wrapheal, a5_dialogue, empathy_dialogue 프리셋). transcript 는 answers 에 저장·교사 열람. '선생님이 볼 수 있어요' 상시 표시. 위기 신호 서버 차단 + 교사 알림.");
  console.log("⚠ AI 피드백·챗봇은 코드(ai_feedback·comfort_bot kind·라우트·패널)라 main 머지 후 Vercel 재빌드가 되어 있어야 학생 화면에서 버튼이 동작합니다(배포 전 404). GEMINI_API_KEY 필요.");
  console.log("Canva(활동4 캘리그래피): 분반별 초대 토큰은 .env.local(CANVA_INVITE_MT_TUE_1/THU_1 …). 세션 열 때 그 분반 것 하나만 남기고 표는 지웁니다(open-mt6-*).");
  console.log("세션은 7교시로 하나만 여세요(6교시로 열면 코드가 중간에 만료). 여는 스크립트: open-mt6-tue1.ts / open-mt6-thu1.ts");
  console.log("리허설: 재시드하면 아직 시작 안 한 세션에 반영됩니다. 진행 중(active) 세션은 건너뜁니다.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
