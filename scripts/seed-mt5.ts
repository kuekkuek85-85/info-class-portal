/**
 * 「디지털 마음 톡톡」(자유학기 주제선택) 5회기 — 대인관계 영역 (6·7교시 블록).
 *
 *   node --env-file=.env.local scripts/seed-mt5.ts
 *
 * ## 완성 회기가 아니라 "활동 모듈" 을 하나씩 붙여 가는 초안이다
 *
 * 선생님은 활동을 하나씩 만들고 리허설로 확인한 뒤, 나중에 순서를 재배치해 조합하려
 * 하신다. 그래서 이 스크립트는 5회기를 **모듈 단위로** 담는다. 지금은 다섯 모듈이 있다:
 *
 *   · 활동1 「우리는 왜 다르게 생각할까?」 — 관점 차이 → 문화별 감정 표현
 *   · 활동2 「감정 추측하기」          — 듣고 감정 맞히기 → AI로 감정 분석하기
 *   · 활동3 「감정 캐릭터 만들기」       — Canva AI 로 감정 아이콘 캐릭터 n종 창작 (SNS 이모티콘 맥락)
 *   · 활동4 「효과적인 의사소통」        — 언어·비언어·톤 → 나 전달법 → 갈등 분석 → 관계 캘리그래피(Canva)
 *   · 활동5 「공감 문장 · 감정 대화」     — 공감 문장·말풍선 → 감정 대화 이어가기 → 만화 생성 프롬프트
 *
 * 골격은 **대기 → 기분 체크 → 활동1 → 활동2 → 마음일기** 순서다(교사 단계 버튼이 이
 * 순서로 흐르게 phase 를 배치했다). 뒤에 활동이 더 붙고 순서가 재배치될 수 있게
 * 구조를 열어 둔다:
 *  · 활동통(ACTIVITY_ID)은 5회기 공용 — 붙는 활동이 같은 통을 이어 쓴다.
 *  · WORKSHEET 는 phase 별·활동별로 묶어, 통째로 옮기거나 빼기 쉽게 나눴다.
 *
 * ## 블록타임 — 세션은 7교시로 하나만 연다 (여는 스크립트에서)
 *
 * 6·7교시 90분 연속 블록이다. 마음 톡톡의 규칙대로 **세션은 7교시로 하나만** 연다
 * (세션 문서 ID = 날짜__7__groupKey). 이 규칙은 open-mt5-*.ts 가 지킬 몫이고, 계획(plan)
 * 자체는 교시·분반과 무관하다 — 그래서 이번엔 여는 스크립트를 만들지 않고 seed 만 둔다.
 *
 * ## 단계(phase) 배치 — 활동1 다음 활동2 (교사 버튼 순서 그대로)
 *
 * 포털의 단계 순서는 고정이다(types.ts 의 LESSON_PHASES). 그 고정 순서 위에 두 활동을
 * 얹으면 교사 단계 버튼이 이렇게 흐른다:
 *
 *   대기 → 기분(mood)
 *   ─ 활동1 ─ progress(오늘 할 일+착시 영상) → assessment(토끼? 오리?)
 *            → quiz(투표) → problem(관점 차이) → mvp(문화별 감정) → build(정리)
 *   ─ 활동2 ─ grill(듣고 감정 맞히기) → emotion(AI로 감정 분석하기)
 *   ─ 활동3 ─ worksheet(감정 캐릭터 만들기 · Canva AI)
 *   → reflection(마음일기)
 *   ─ 활동4 ─ wrapmap(효과적인 의사소통 · 나 전달법·갈등·캘리그래피)
 *   ─ 활동5 ─ wrapheal(공감 문장 · 감정 대화 · 만화 프롬프트)
 *   → done
 *
 *   ※ 단계 순서는 LESSON_PHASES 로 고정이라, 활동을 붙일 수 있는 **빈 단계**에 얹었다. 그래서:
 *     · 활동3(worksheet)은 고정 순서상 grill 과 emotion 사이라, 활동1·2·3 을 한 세션에 다
 *       켜면 활동3 버튼이 활동2 중간(grill 다음, emotion 앞)에 낀다. 원래 활동2 의 grill→emotion
 *       사이에도 빈 buttons(draw·worksheet·gallery)가 있어 교사가 이미 그 줄을 오간다 — 그 빈
 *       worksheet 자리를 활동3 이 채운 셈이다.
 *     · 활동4·5(wrapmap·wrapheal)는 마음일기(reflection) **뒤에 오는 "얹는 활동"** 단계다
 *       (types.ts 의 그 두 단계 설명 참조 — 3회기 감정조절이 같은 자리를 쓴다). 그래서 활동
 *       버튼이 마음일기 뒤에 붙는다. places 가 비어 있어(그리기 없음) wrapheal 에서도 그림판이
 *       안 뜨고 활동지 문항만 뜬다(lesson/page.tsx 의 canDraw = places.length>0).
 *     선생님이 모듈을 재배치해 조합할 때 이 자리를 감안한다(각 활동 상세 주석 참조).
 *
 * ## ⚠ 활동1/활동2 가 완벽히 안 나뉘는 한 곳 — 퀴즈 단계가 하나뿐
 *
 * 포털의 **퀴즈 단계(quiz)는 한 개**이고 그 안의 문항 배열(session.quiz.questions) 하나를
 * 교사가 quizIndex 로 넘겨 가며 쓴다. 그래서 활동1의 토끼오리 투표와 활동2의 퀴즈(가사·
 * 감정)가 **같은 퀴즈 단계에 모인다.** 게다가 퀴즈 단계는 고정 순서상 problem 보다 앞이라
 * (안내 화면 바로 뒤), 활동2의 투표를 하려면 교사가 grill/emotion 에서 **퀴즈 단계로 잠깐
 * 돌아가** quizIndex 를 맞추고 투표를 받은 뒤 다시 돌아온다.
 *
 * 이 초안은 코드 변경 없이 seed 로 되는 선에서, 문항을 **활동 순서대로** 담고 각 prompt
 * 앞에 [활동1]/[활동2] 라벨을 붙여 교사가 제어판에서 구분하게 했다(아래 QUIZ 참조).
 *  · quiz[0] [활동1] 토끼/오리   · quiz[1] [활동2] 가사 → 제목·가수
 *  · quiz[2] [활동2] 감정(내용만)  · quiz[3] [활동2] 감정(억양+맥락)
 * 완전히 분리하려면 "활동마다 별도 퀴즈 단계" 가 필요한데 포털에 그 구조가 없다 —
 * 새 단계·컴포넌트를 만들지 않는 한 seed 로는 여기까지가 최선이다.
 *
 * ## 프라이버시 — 이 과목의 1순위
 *
 * 개인 의견·감정 글은 친구에게 절대 안 나간다. 관점 성찰(problem)·문화 소감(mvp)·정리
 * 글(build)·마음일기는 모두 **본인·교사만** 본다. 그래서 이 세션은 서로 구경하기를
 * 아예 닫는다(galleryEnabled: false) — 서버의 갤러리 라우트가 이 값을 보고 응답 자체를
 * 막으므로(gallery/route.ts), 화면뿐 아니라 데이터로도 안 샌다. galleryAnswerKeys 는
 * 두지 않는다(열 것이 없다). 뒤에 대인관계 나눔 활동을 붙여 갤러리를 켤 일이 생기면,
 * 그때 **친구에게 나갈 칸만** galleryAnswerKeys 로 못박고 서버 목록도 함께 챙긴다.
 *
 * 토끼/오리 투표는 **익명 집계 수치**라 개인 글이 아니다 — 교사 대시보드가 선택지별
 * 응답 수만 보여주고(quiz-stats/route.ts), 누가 무엇을 골랐는지는 어디에도 안 뜬다.
 *
 * AI 감정 렌즈는 켜지 않는다(emotion_lens 문항 없음 → Gemini 호출 없음). 위기 신호를
 * 제3자로 보내거나 로그에 남길 자리가 이 두 활동엔 처음부터 없다.
 *
 * ## 활동2 의 도구는 어디서 도나 — 포털 vs 교사 외부 진행
 *
 * 포털에는 **내장 TTS 가 없다**(코드 확인 — speechSynthesis·tts 없음). 그래서 활동2 의
 * 소리(가사·문장 낭독)는 **교사가 외부 도구로 공유화면에서 재생**하고, 포털은 안내·퀴즈만
 * 담는다. 어느 곡/문장을 트는지는 교사 진행이다. 저작권상 K-pop **가사 전문은 seed 에
 * 넣지 않는다** — 곡 제목·가수(사실 정보)만 퀴즈 선택지에 두고, 곡은 교사가 고른다.
 *
 * 텍스트 감정 분석(Gemini)도 이 초안에서는 **교사가 공유화면에서 시연**한다(문장을
 * Gemini 에 넣어 감정·근거를 함께 보여줌). 포털은 학생이 **먼저 자기 감정 추측과 근거를
 * 적고**, 그 다음 **AI 답과 비교해 적는 기록 칸**만 둔다. 포털의 ai_review 는 감정 분석이
 * 아니라 소크라테스식 되묻기(질문 2개)라 이 활동에 안 맞고, emotion_lens 는 감정 추측을
 * 주지만 "근거" 가 얕아 비교 학습엔 부족하다 — 그래서 포털에서 학생이 직접 Gemini 를
 * 돌리게 만들려면 새 배선·배포가 필요하다. 부담을 줄이려 교사 시연 + 비교 기록으로 둔다
 * (그래서 이 활동도 포털에서 Gemini 를 호출하지 않는다 — 위 "감정 렌즈 없음" 이 유지된다).
 *
 * Teachable Machine(이미지 분류)은 외부 사이트라 **새 탭 링크**로 연다. 얼굴 표정 학습은
 * TM 이 **브라우저(기기) 안에서** 도므로 이미지가 서버로 올라가지 않는다 — 포털에도 얼굴
 * 이미지를 저장하지 않는다. 학생 안내에 "내 얼굴 사진은 이 기기 안에서만" 을 못박는다.
 *
 * ## 투표(퀴즈) = 포털의 "퀴즈" 로 만든다 (집계를 위해)
 *
 * 교사가 공유화면에서 실시간 집계를 보게 하려고 포털의 퀴즈 기능(session.quiz +
 * quiz-stats + teacher-quiz-panel)을 그대로 쓴다. 네 문항 중 **정답형과 의견형이 섞여** 있어
 * 각각 다르게 다룬다:
 *
 *  · **정답형** — quiz[1] 가사 → 제목·가수. 진짜 정답이 있다(answerIndex 가 정답).
 *    이 문항만 교사가 [정답 공개] 를 눌러 맞혔는지 함께 확인해도 좋다(nowText 에 정답 안내).
 *  · **의견형** — quiz[0] 토끼/오리, quiz[2]·quiz[3] 감정 추측. 정답이 없다. answerIndex 는
 *    형식상만(0). 교사는 이 문항들에서 [정답 공개] 를 **누르지 않고** [응답 분포 새로고침]
 *    으로 집계만 본다. 공개하면 학생 화면에서 answerIndex 칸이 초록 "정답" 으로, 다른 것을
 *    고른 학생 칸이 분홍 "내 선택(오답)" 으로 떠서 "너는 틀렸다" 는 잘못된 신호를 준다.
 *    (문항을 넘기면 정답 공개는 자동으로 꺼지므로 — teacher-quiz-panel — 문항별로 안전하다.)
 *    혹시 실수로 공개해도 어긋나지 않게 nowText 에 "정답이 없다" 는 재구성을 넣어 둔다.
 *    stickers 는 모두 비운다(디지털 특성 스티커는 이 과목과 무관).
 *
 * 활동2 의 감정 추측(quiz[2]·[3])은 집계 자체가 수업의 핵심이다 — 같은 문장을 **내용만**
 * 들었을 때(quiz[2])와 **억양·맥락**까지 들었을 때(quiz[3]) 반의 감정 분포가 어떻게
 * 달라지는지를 두 집계로 나란히 보며 "맥락이 감정 읽기를 바꾼다" 를 확인한다.
 *
 * [남은 갈림] 교사 화면 문구가 "타임머신 퀴즈" 로 뜨고(teacher-quiz-panel.tsx 하드코딩),
 * 교사 제어판 미리보기에 토끼 옆 "← 정답" 이 붙는다 — 둘 다 **교사 화면에만** 보이는
 * 겉표시이고 학생에겐 안 간다. 의견 투표에서 정답 강조를 코드로 없애려면 퀴즈에
 * opinionPoll 같은 optional 플래그를 더해 quiz-view·teacher-quiz-panel 에서 강조만 끄면
 * 되지만(비파괴·최소), 이번 초안은 배포를 늘리지 않으려 seed 로만 두고 운영(공개 안 하기)
 * 으로 처리한다. 필요하면 보고 후 플래그를 넣는다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import type {
  LessonPlan,
  PhaseContent,
  QuizContent,
  WorksheetQuestion,
} from "../src/lib/types.ts";

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
 * 5회기(대인관계 영역)의 활동통. 자기 영역(mt-2026-2·mt-2026-3)과 다른 새 통이다.
 * 이 첫 활동의 성찰 답이 여기에 쌓이고, 뒤에 붙는 대인관계 활동도 같은 통을 이어 쓴다.
 */
const ACTIVITY_ID = "mt-2026-5";
/** 차시 번호가 정보과·인간과AI 와 안 겹치게 200번대 (2회기 202 · 3회기 203 · 4회기 204) */
const LESSON_NO = 205;

/**
 * ① 착시 영상 — 「11가지 착시 현상」 유튜브.
 *
 * 원본 링크는 https://youtu.be/6JgPeBPwRvY 다. progress 화면에 임베드하려고 iframe 이
 * 받아들이는 embed 주소 꼴로 바꿔 둔다(youtu.be/watch 주소는 iframe 안에서 막힌다).
 * 포털 CSP 는 frame-src 를 https: 로 열어 두어 유튜브 임베드가 허용된다(next.config.ts).
 * autoplay 파라미터를 넣지 않아 저절로 소리가 나지 않는다 — 학생이 눌러 보거나, 교사가
 * 같은 주소를 전자칠판에 띄워 함께 봐도 된다.
 *
 * [남은 선택] 이 포털의 관례는 "영상은 전자칠판(앞 화면)으로만"(video 단계)인데, 그
 * video 단계는 순서상 퀴즈보다 **뒤**라 쓰면 착시 영상 버튼이 투표 뒤로 간다. 그래서
 * 순서를 outline 대로 지키려 착시 영상을 안내 화면(progress)에 임베드했다. 앞 화면
 * 재생을 원하면 교사가 같은 링크를 전자칠판에 열면 된다(임베드는 그대로 둬도 무방).
 */
const ILLUSION_VIDEO_EMBED = "https://www.youtube.com/embed/6JgPeBPwRvY";
const ILLUSION_VIDEO_WATCH = "https://youtu.be/6JgPeBPwRvY";

/**
 * ② 토끼-오리 착시 그림 (자체 호스팅).
 *
 * 교사가 올린 `public/mt5/rabbit-duck.png`(저장소에 있음)를 쓴다. 외부 호스트에 의존하지
 * 않아 학교망 차단·핫링크 문제가 없다. 정적 파일이라 **배포되어 있어야** 화면에 뜬다.
 */
const RABBIT_DUCK_IMG = "/mt5/rabbit-duck.png";

/* ─────────────── 활동2 「감정 추측하기」 재료 ─────────────── */

/**
 * 활동2 ① 동기유발용 K-pop 퀴즈의 **예시 곡**.
 *
 * 실제로는 교사가 곡을 골라 TTS(외부 도구)로 가사를 들려준다. 퀴즈 선택지엔 곡 제목·가수
 * (사실 정보)만 담고 **가사 전문은 넣지 않는다**(저작권). 아래는 리허설을 바로 걸 수 있게
 * 둔 **예시**다 — 교사가 다른 곡을 고르면 이 문항의 선택지·정답(answerIndex)을 대시보드나
 * 이 seed 에서 그 곡에 맞게 바꿔 주면 된다. (제목·가수는 저작물이 아니라 사실이라 넣어도 됨.)
 */
const KPOP_CHOICES = [
  "강남스타일 — 싸이(PSY)",
  "다이너마이트 — 방탄소년단(BTS)",
  "롤린(Rollin') — 브레이브걸스",
  "라이언 — (예시 오답)",
];
const KPOP_ANSWER_INDEX = 0;

/**
 * 활동2 ②③ 감정 추측용 **예시 문장**.
 *
 * 내용만 들으면 감정이 애매하지만, 억양·상황을 더하면 감정이 뒤집히는 문장을 쓴다.
 * 교사가 TTS 로 (2) 담담하게 한 번, (3) 억양·상황을 담아 한 번 들려준다. 문장은 교사가
 * 바꿔도 된다 — 그때 아래 상수와 quiz[2]·[3] prompt 의 예시 문구만 맞춰 주면 된다.
 */
const EMOTION_SENTENCE = "왜 이제 왔어.";
/** 감정 선택지 — (2)와 (3)에서 같은 보기를 써야 분포 변화를 비교할 수 있다 */
const EMOTION_CHOICES = ["기쁨 · 반가움", "슬픔 · 서운함", "화남 · 짜증", "불안 · 걱정"];

/**
 * 활동2 ⑤ Teachable Machine(구글) — 얼굴 표정 이미지 분류.
 * 이미지 프로젝트를 새 탭으로 연다. 학습·분류가 브라우저(기기) 안에서 돌아 얼굴 이미지가
 * 서버로 올라가지 않는다(프라이버시 안내에 못박음).
 */
const TEACHABLE_MACHINE_URL = "https://teachablemachine.withgoogle.com/train/image";

/* ─────────────── 활동3·4 「Canva」 공통 재료 ─────────────── */

/**
 * Canva 학교 팀 초대 주소 — 활동3(감정 캐릭터)·활동4(관계 캘리그래피)가 함께 쓴다.
 *
 * 분반마다 다른 토큰이라, 저장소가 공개인 만큼 **.env.local 에서만** 읽는다(seed-mt4 와 같은 방식).
 * 세션을 열 때(open-mt5-*.ts) 그 분반 것 하나만 각 문항의 linkUrl 에 박고 linkUrlByGroup 은
 * 지운다 — 남의 분반 토큰이 학생 브라우저로 새지 않게 한다(db.ts 의 snapshotOf). env 가 없으면
 * 아래 기본 주소로 물러난다.
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

/**
 * 활동3 감정 캐릭터 개수 — 원문의 "n종" 에 대한 현실적 기본값.
 *
 * 40분 블록에서 Canva Magic Media(AI 이미지)는 프롬프트를 쓰고 → 결과를 보고 → 다듬어 다시
 * 뽑는 반복이 필요하다. 감정 하나당 2~3분을 잡으면 3~4개가 현실적이다 — 너무 적으면 감정 폭이
 * 안 나오고, 많으면 시간에 쫓겨 대충 뽑는다. 선생님이 시간·수준에 맞게 이 값과 아래 문항 문구만
 * 바꾸면 된다.
 */
const EMOTION_ICON_COUNT = "3~4종";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/**
 * 투표(퀴즈) — 두 활동의 문항이 **하나의 퀴즈 단계**에 활동 순서대로 담긴다.
 * 교사는 quizIndex 로 넘겨 가며 쓰고, prompt 앞의 [활동1]/[활동2] 라벨로 구분한다.
 * 정답형(quiz[1])만 공개해도 되고, 의견형(quiz[0]·[2]·[3])은 공개하지 않는다
 * (위 파일 머리말 "투표(퀴즈)" 절 참조).
 */
const QUIZ: QuizContent = {
  // 이 회기 투표는 대부분 의견형(토끼/오리·감정)이라 정답 공개가 오해를 준다.
  // 교사 퀴즈 패널에서 「정답 공개」 버튼을 숨긴다 — 분포만 본다.
  hideReveal: true,
  questions: [
    // ── quiz[0] · [활동1] 토끼/오리 (의견형 · 공개 안 함) ─────────────
    {
      prompt: "[활동1] 방금 본 그 그림, 여러분에게는 무엇으로 보였나요? 토끼일까요, 오리일까요?",
      choices: ["토끼", "오리"],
      // 형식상 index — 정답이 아니다. 교사는 정답을 공개하지 않는다.
      answerIndex: 0,
      // 혹시 공개되더라도 메시지가 어긋나지 않게 "정답이 없다" 로 재구성해 둔다.
      nowText:
        "사실 여기엔 정답이 없어요. 같은 그림인데 누구는 토끼로, 누구는 오리로 봅니다.\n" +
        "보는 사람마다 관점이 다를 수 있다는 것 — 그게 오늘 우리가 확인한 거예요.",
      // 디지털 특성 스티커는 이 과목과 무관하다. 비워 두면 스티커가 안 붙는다.
      stickers: [],
    },
    // ── quiz[1] · [활동2-①] 가사 → 제목·가수 (정답형 · 공개해도 됨) ────
    {
      prompt:
        "[활동2] 방금 AI 목소리로 들은 가사, 무슨 노래일까요? (제목 — 가수)\n" +
        "※ 교사 안내: 교사가 고른 곡에 맞게 선택지·정답을 바꿔 주세요. 아래는 예시(강남스타일)입니다.",
      choices: KPOP_CHOICES,
      // ★ 진짜 정답이 있는 문항 — 이 문항은 [정답 공개] 를 눌러 함께 확인해도 좋다.
      answerIndex: KPOP_ANSWER_INDEX,
      nowText:
        "정답을 확인해 봐요. 멜로디 없이 가사(말)만 듣고도 노래를 떠올릴 수 있었나요?\n" +
        "우리는 ‘말의 내용’ 만으로도 꽤 많은 걸 알아채요. 다음엔 감정도 그렇게 알 수 있을까요?",
      stickers: [],
    },
    // ── quiz[2] · [활동2-②] 감정 추측: 내용만 (의견형 · 공개 안 함) ────
    {
      prompt:
        `[활동2] 방금 '내용만' 담담하게 들은 문장 「${EMOTION_SENTENCE}」 — 어떤 감정으로 들렸나요?\n` +
        "※ 아직 억양·상황 없이 말의 내용만 들은 상태예요. 느낀 대로 골라요(정답 없음).",
      choices: EMOTION_CHOICES,
      answerIndex: 0, // 형식상 — 정답 없음, 공개하지 않는다
      nowText:
        "정답은 없어요. 반 친구들의 추측이 여러 갈래로 갈렸을 거예요.\n" +
        "말의 내용만으로는 감정을 확실히 알기 어렵다는 뜻이에요. 이제 억양과 상황을 더해 볼까요?",
      stickers: [],
    },
    // ── quiz[3] · [활동2-③] 감정 재해석: 억양+맥락 (의견형 · 공개 안 함) ─
    {
      prompt:
        `[활동2] 같은 문장 「${EMOTION_SENTENCE}」 을 이번엔 '억양 + 상황' 까지 담아 다시 들었어요.\n` +
        "이제는 어떤 감정으로 들리나요? (교사가 상황을 안내해 줍니다 — 예: 다친 친구를 걱정하며 기다렸을 때)",
      choices: EMOTION_CHOICES,
      answerIndex: 0, // 형식상 — 정답 없음, 공개하지 않는다
      nowText:
        "같은 문장인데 감정 분포가 달라졌나요?\n" +
        "억양과 상황(맥락)이 더해지면 감정을 훨씬 더 잘 읽을 수 있어요 — 사람은 맥락으로 감정을 이해합니다.",
      stickers: [],
    },
  ],
};

const WORKSHEET: WorksheetQuestion[] = [
  // ── ④ 관점 차이 깨닫기 (problem) ─────────────────────────────
  {
    key: "_persp_note",
    phase: "problem",
    label: "우리는 왜 다르게 봤을까?",
    hint:
      "우리 반 투표 결과를 함께 봤어요. 토끼도, 오리도 있었지요.\n" +
      "똑같은 그림인데 사람마다 다르게 봤어요. 어느 쪽도 틀린 게 아니에요 —\n" +
      "보는 사람의 경험·기분·시선에 따라 같은 것도 다르게 보입니다. 이게 ‘관점의 차이’ 예요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "persp_reflect",
    phase: "problem",
    /*
     * 개인 성찰. 친구에게 안 나간다(galleryEnabled: false 라 애초에 나갈 길이 없다).
     * 관점이 갈렸던 경험을 자기 이야기로 꺼내게 하는 다리다.
     */
    label: "나는 토끼·오리 중 무엇으로 봤나요? 그리고 친구와 다르게 본 경험이 있다면 적어 주세요",
    hint:
      "예) 나는 오리로 봤는데 짝은 토끼래서 놀랐다.\n" +
      "예) 같은 영화를 보고 나는 슬펐는데 친구는 웃겼다고 했다.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },

  // ── ⑤ 문화권별 감정 표현 비교 (mvp) ──────────────────────────
  {
    key: "_culture_intro",
    phase: "mvp",
    /*
     * 관점 차이 → 문화 차이로 잇는 머리글. 문화 예시는 아래 note 카드들로 이어진다.
     * (콘텐츠 카드(ContentCard)는 안내 화면에서만 그려지고 퀴즈보다 앞이라, 투표 뒤에
     *  와야 하는 문화 비교는 활동지 note 로 카드처럼 담는다. 뒤 활동이 재배치할 때
     *  안내 화면으로 옮기려면 note→cards 로 바꾸면 된다.)
     */
    label: "관점은 ‘문화’ 에 따라서도 달라져요",
    hint:
      "그림을 다르게 보듯, 같은 감정도 문화권마다 다르게 표현해요.\n" +
      "아래 예시들을 보며 ‘이건 나라마다 다르구나’ 를 느껴 보세요. 어느 쪽도 맞고 틀림이 아니에요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_culture_smile",
    phase: "mvp",
    label: "😊 웃음 — ‘반가움’ 일까, ‘무례함’ 일까",
    hint:
      "서양에서는 처음 만난 사람에게 활짝 웃는 것이 예의이자 반가움의 표시예요.\n" +
      "반대로 어떤 문화권(예: 러시아)에서는 이유 없이 낯선 사람에게 웃으면 진심이 없거나\n" +
      "이상하게 여겨지기도 해요. 같은 미소가 정반대로 읽히는 거죠.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_culture_eye",
    phase: "mvp",
    label: "👀 눈 맞춤 — ‘당당함’ 일까, ‘무례함’ 일까",
    hint:
      "서양에서는 대화할 때 눈을 마주치는 것이 자신감과 존중의 표시예요.\n" +
      "한국·일본 등 동아시아에서는 어른의 눈을 똑바로 오래 쳐다보는 것을 버릇없다고\n" +
      "여기기도 했어요. 같은 행동인데 존중과 무례로 갈립니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_culture_show",
    phase: "mvp",
    label: "😢 슬픔·기쁨 — ‘드러내기’ 일까, ‘참기’ 일까",
    hint:
      "감정을 크게 겉으로 드러내는 것을 자연스럽게 여기는 문화가 있고(예: 이탈리아·라틴 문화),\n" +
      "감정을 절제하고 차분히 표현하는 것을 예의로 여기는 문화가 있어요(예: 동아시아).\n" +
      "장례식에서 소리 내어 우는 곳도, 조용히 슬퍼하는 곳도 있습니다. 표현 방식이 다를 뿐이에요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_culture_gesture",
    phase: "mvp",
    label: "👍 같은 손짓, 다른 뜻",
    hint:
      "엄지 척(👍)은 우리에겐 ‘좋아요’ 지만, 일부 문화권에서는 무례한 뜻이 되기도 해요.\n" +
      "고개를 끄덕이는 것이 ‘예’ 가 아니라 ‘아니오’ 인 나라도 있어요(예: 불가리아).\n" +
      "몸으로 하는 감정 표현도 문화라는 맥락 위에서 읽힙니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "culture_pick",
    phase: "mvp",
    /*
     * 개인 소감. 친구에게 안 나간다. 어느 예시가 인상 깊었는지 자기 말로 꺼내게 한다.
     */
    label: "가장 흥미로웠던 차이 하나와, 왜 그런지 내 생각을 적어 주세요",
    hint:
      "예) 눈을 안 마주치는 게 무례가 아니라 존중일 수도 있다는 게 신기했다.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },

  // ── ⑥ 문화 맥락 이해 정리 (build) ────────────────────────────
  {
    key: "_wrap_note",
    phase: "build",
    label: "오늘 알게 된 것 — 감정 표현은 ‘문화’ 라는 맥락 위에 있다",
    hint:
      "같은 그림도 사람마다 다르게 보이고, 같은 감정도 문화마다 다르게 표현돼요.\n" +
      "그러니 친구가 나와 다르게 표현하거나 반응해도, 그게 틀린 게 아니라 ‘다른’ 거예요.\n" +
      "이걸 알면, 나와 다른 사람을 이해하고 존중하기가 조금 더 쉬워집니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "wrap_apply",
    phase: "build",
    /*
     * 대인관계 영역다운 마무리 — 배운 것을 관계에 적용해 보게 한다. 개인 글, 비공개.
     */
    label: "‘나와 다른 관점·표현’ 을 존중하기 위해, 내가 해볼 수 있는 것 한 가지",
    hint:
      "예) 친구가 나와 반응이 다를 때 ‘틀렸다’ 대신 ‘너는 그렇게 봤구나’ 라고 말해보기.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 250,
  },

  /* ══════════════ 활동2 「감정 추측하기」 ══════════════
   *
   * 소리(가사·문장 낭독)는 교사가 외부 TTS 로 공유화면에서 재생한다. 포털은 안내·투표·
   * 기록만 담는다. 투표는 위 QUIZ(quiz[1]~[3])에 있고, 교사가 각 안내 뒤 퀴즈 단계로
   * 잠깐 이동해 해당 문항으로 투표를 받는다(파일 머리말의 "완벽히 안 나뉘는 곳" 참조).
   */

  // ── 활동2 ①②③ 듣고 감정 맞히기 (grill) ──────────────────────
  {
    key: "_a2_listen_intro",
    phase: "grill",
    label: "귀로 감정 읽기 — AI 목소리를 듣고 맞혀 볼게요",
    hint:
      "이제 ‘소리’ 로 감정을 읽어 봅니다. 선생님이 AI 목소리(TTS)로 들려줄 거예요.\n" +
      "들을 때마다 [토끼 vs 오리 투표] 가 있던 그 [투표] 단계로 가서 해당 문항에 투표해요.\n" +
      "① 노래 가사 맞히기  → ② 문장의 감정(내용만)  → ③ 같은 문장의 감정(억양·상황까지)",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_a2_kpop_note",
    phase: "grill",
    label: "① 가사만 듣고 노래 맞히기",
    hint:
      "멜로디 없이 ‘가사(말)’ 만 AI 목소리로 들려줄게요. 무슨 노래일까요?\n" +
      "다 듣고 [투표] 단계의 [활동2] 노래 맞히기 문항에 골라 주세요. 이건 정답이 있어요!",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_a2_words_note",
    phase: "grill",
    label: "② 말의 ‘내용’ 만 듣고 감정 맞히기",
    hint:
      `이번엔 한 문장을 억양 없이 담담하게 들려줄게요. 예: 「${EMOTION_SENTENCE}」\n` +
      "말의 내용만 듣고 ‘어떤 감정일까’ 를 [투표] 단계의 [활동2] 감정(내용만) 문항에 골라요.\n" +
      "정답은 없어요 — 느낀 대로 고르면 됩니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_a2_context_note",
    phase: "grill",
    label: "③ 억양과 상황을 더해 다시 듣기",
    hint:
      "같은 문장을, 이번엔 억양과 상황(맥락)을 담아 다시 들려줄게요.\n" +
      "선생님이 상황을 알려 줄 거예요(예: 다친 친구를 걱정하며 오래 기다렸을 때).\n" +
      "이제 감정이 다르게 들리나요? [투표] 단계의 [활동2] 감정(억양+맥락) 문항에 다시 골라요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "a2_reinterpret",
    phase: "grill",
    /*
     * 활동2 의 핵심 성찰 — 내용만 vs 맥락 포함. 개인 글, 비공개(galleryEnabled: false).
     */
    label: "내용만 들었을 때와 억양·상황까지 들었을 때, 내 감정 추측이 어떻게 달라졌나요?",
    hint:
      "예) 처음엔 화난 줄 알았는데, 걱정하며 기다렸다는 걸 아니까 ‘서운함·걱정’ 으로 들렸다.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },

  // ── 활동2 ④⑤ AI로 감정 분석하기 (emotion) ────────────────────
  {
    key: "_a2_ai_intro",
    phase: "emotion",
    label: "이번엔 AI 는 감정을 어떻게 읽을까?",
    hint:
      "우리는 귀(억양)와 맥락으로 감정을 읽었어요. 텍스트 분석 AI(제미나이)는 ‘글자’ 만 보고\n" +
      "감정을 분석해요. 먼저 내가 근거와 함께 답해 보고, 그다음 AI 의 분석과 견줘 봅니다.\n" +
      "(AI 분석은 선생님이 공유화면에서 함께 보여줄 거예요.)",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "a2_my_read",
    phase: "emotion",
    /*
     * AI 를 보기 전에 학생이 먼저 근거와 함께 답한다 — 순서가 곧 설계다(먼저 내 판단,
     * 그다음 AI 와 비교). 개인 글, 비공개. 포털은 Gemini 를 호출하지 않는다(교사 시연).
     */
    label: "이 문장의 감정은 무엇일까요? 그리고 왜 그렇게 생각했는지 ‘근거’ 도 적어 주세요",
    hint:
      `문장 예: 「${EMOTION_SENTENCE}」 (선생님이 분석할 문장을 알려 줍니다)\n` +
      "예) 감정: 서운함 / 근거: ‘이제’ 라는 말에 오래 기다린 마음이 담겨서.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "_a2_ai_demo_note",
    phase: "emotion",
    label: "이제 AI 의 분석을 함께 봐요",
    hint:
      "선생님이 같은 문장을 텍스트 분석 AI(제미나이)에 넣어, AI 가 고른 감정과 그 근거를\n" +
      "공유화면에 보여줄 거예요. 내 답과 무엇이 같고 다른지 살펴보세요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "a2_compare",
    phase: "emotion",
    /*
     * 자기 답안의 근거 vs AI 답안의 근거 비교 — outline 4번의 핵심. 개인 글, 비공개.
     */
    label: "내 감정·근거와 AI 의 감정·근거는 어떻게 같고, 어떻게 달랐나요?",
    hint:
      "예) 감정은 둘 다 ‘서운함’ 이었는데, 나는 상황을 떠올렸고 AI 는 단어(‘이제’)를 근거로 들었다.\n" +
      "예) AI 는 ‘화남’ 이라고 했는데, 나는 상황을 알아서 ‘걱정’ 으로 봤다 — 맥락을 아는 게 달랐다.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 350,
  },
  {
    key: "_a2_tm_note",
    phase: "emotion",
    /*
     * ⑤ Teachable Machine — 외부 사이트, 새 탭. linkUrl 로 큰 단추가 붙는다.
     * 얼굴 이미지는 기기 안에서만 처리되고 서버로 안 올라간다 — 프라이버시 안내를 못박는다.
     */
    label: "④ 이미지 AI 도 감정을 배울까? — Teachable Machine 체험",
    hint:
      "이번엔 ‘표정 사진’ 으로 감정을 배우는 이미지 AI 를 체험해요. 아래 [Teachable Machine 열기]\n" +
      "를 눌러 새 탭에서 열고, 표정(예: 웃는 얼굴 · 무표정 · 놀란 얼굴)을 몇 장씩 학습시킨 뒤\n" +
      "새 표정을 잘 알아맞히는지 확인해 보세요.\n\n" +
      "🔒 내 얼굴 사진은 이 ‘기기(브라우저) 안에서만’ 쓰여요 — 인터넷에 올라가거나 저장되지\n" +
      "   않아요. 원하지 않으면 내 얼굴 대신 이모지 그림·인형 표정으로 해도 됩니다.",
    kind: "note",
    linkUrl: TEACHABLE_MACHINE_URL,
    linkLabel: "Teachable Machine 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "a2_tm_reflect",
    phase: "emotion",
    label: "AI 는 표정으로 감정을 잘 맞혔나요? 사람과 다르다고 느낀 점이 있다면 적어 주세요",
    hint:
      "예) 활짝 웃는 건 잘 맞혔는데, 억지웃음과 진짜웃음은 구별 못 했다.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },

  /* ══════════════ 활동3 「감정 캐릭터 만들기」 (worksheet) ══════════════
   *
   * Canva AI 로 나만의 감정 아이콘 캐릭터를 3~4종 만들어, 카톡·인스타·유튜브 같은 SNS
   * 이모티콘처럼 쓸 수 있음을 체험하는 활동. 앞의 "감정을 알아차리고 표현한다" 흐름을 이어,
   * 이번엔 감정을 **시각 캐릭터로 표현·창작**한다.
   *
   * 산출물은 이 과목 관례대로 **Canva 공유 링크(URL)** 로 남긴다(그림 파일 업로드가 아니라
   * 링크 기록). 감정 캐릭터는 '그림' 창작이라 초상 프라이버시 부담이 낮지만, 실명·개인정보를
   * 캐릭터·파일명에 넣지 않도록 가볍게 안내한다. galleryEnabled: false 라 이 링크·성찰 글은
   * 친구에게 안 나가고 본인·교사만 본다(서버 갤러리 라우트가 막음).
   */
  {
    key: "_a3_intro",
    phase: "worksheet",
    label: "이번엔 감정을 ‘캐릭터’ 로 표현해 볼게요",
    hint:
      "앞에서 우리는 관점의 차이를 알아차리고(활동1), 소리·맥락으로 감정을 읽었어요(활동2).\n" +
      "이제 내 감정을 눈에 보이는 ‘캐릭터’ 로 만들어 표현해 봅니다.\n" +
      `Canva AI 로 나만의 감정 아이콘 캐릭터를 ${EMOTION_ICON_COUNT} 만들 거예요.`,
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_a3_canva_login",
    phase: "worksheet",
    // Canva 로그인 — 활동4·mt4 와 같은 패턴. 세션 생성 때 그 분반 것만 linkUrl 에 박고
    // linkUrlByGroup 은 지운다(남의 분반 토큰 유출 방지).
    label: "① Canva 열기 — 먼저 눌러 학교 계정으로 로그인해 두세요",
    hint:
      "아래 [Canva 열기] 를 눌러 새 창에서 열고, 학교 계정으로 로그인해요.\n" +
      "로그인되면 초대받은 팀에 들어가 있는지 확인하고, 새 디자인을 하나 만들어요.",
    kind: "note",
    linkUrl: CANVA_BY_GROUP["mt-tue-1"] || CANVA_FALLBACK,
    linkUrlByGroup: CANVA_GROUP_LINKS,
    linkLabel: "Canva 열기 (새 창)",
    maxLength: 0,
  },
  {
    key: "_a3_howto",
    phase: "worksheet",
    label: `② 감정별로 캐릭터를 ${EMOTION_ICON_COUNT} 만들기`,
    hint:
      "표현하고 싶은 감정을 3~4가지 골라요. 예) 기쁨 · 슬픔 · 화남 · 설렘\n" +
      "Canva 의 ‘Magic Media(AI 이미지)’ 에 감정을 담은 캐릭터를 글로 설명해 만들거나,\n" +
      "그리기·요소로 직접 꾸며도 좋아요.\n" +
      "예) ‘기쁨을 나타내는 둥근 노란 젤리 캐릭터, 활짝 웃는 얼굴, 심플한 아이콘’\n\n" +
      "🔒 실명·전화번호 같은 내 개인정보는 캐릭터나 파일 이름에 넣지 않아요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "a3_emotions",
    phase: "worksheet",
    // 개인 계획 메모 — 어떤 감정을 캐릭터로 만들지. 비공개(본인·교사만).
    label: `내가 캐릭터로 만들 감정 ${EMOTION_ICON_COUNT} 을 적어 보세요`,
    hint:
      "예) 기쁨, 슬픔, 화남, 설렘\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "text",
    maxLength: 100,
  },
  {
    key: "a3_canva_url",
    phase: "worksheet",
    /*
     * ★ 산출물 기록 = Canva 공유 링크. 이 과목 관례대로 그림 파일이 아니라 URL 로 남긴다.
     * galleryEnabled: false 라 친구에게 안 나가고 본인·교사만 본다.
     */
    label: "③ 내 감정 캐릭터 모음 — Canva 공유 링크를 붙여 주세요",
    hint:
      "Canva 오른쪽 위 [공유] → [링크 복사] 로 주소를 받아 여기에 붙여넣어요.\n" +
      "예) https://www.canva.com/design/....  이 칸은 나와 선생님만 봐요.",
    kind: "text",
    maxLength: 300,
  },
  {
    key: "_a3_sns_note",
    phase: "worksheet",
    label: "이렇게 쓸 수 있어요 — SNS 이모티콘처럼",
    hint:
      "내가 만든 감정 캐릭터는 카카오톡·인스타그램·유튜브 같은 SNS 에서 이모티콘·스티커처럼\n" +
      "쓸 수 있어요(프로필 그림, 댓글 스티커, 영상 자막 옆 감정 표시 등).\n" +
      "오늘은 ‘이렇게 쓸 수 있다’ 를 떠올려 보는 것으로 충분해요 — 실제로 올리거나 배포하지\n" +
      "않아도 됩니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "a3_reflect",
    phase: "worksheet",
    // 성찰 — 개인 글, 비공개.
    label: "캐릭터로 표현하기 가장 어려웠던 감정은 무엇이었고, 내 캐릭터가 가장 잘 담아낸 감정은 무엇인가요?",
    hint:
      "예) ‘설렘’ 은 기쁨과 비슷해 보여서 다르게 그리기 어려웠고, ‘화남’ 은 빨간 얼굴로 딱 담겼다.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },

  /* ══════════════ 활동4 「효과적인 의사소통」 (wrapmap) ══════════════
   *
   * 마음일기 뒤에 오는 "얹는 활동" 단계(wrapmap)에 담는다. 흐름:
   *   ① 의사소통 3요소(언어·비언어·목소리 톤) → ② 나 전달법(I-message) 바꿔 쓰기
   *   → ③ 갈등 상황 분석(사회·가정) → ④ 관계 캘리그래피(Canva) 로 덕목 표현
   *
   * ③ 갈등 예시 챗봇: 포털에 챗봇 kind 를 새로 만들지 않는다(활동2 의 Gemini·TM 처리와 같은
   * 패턴). 갈등 시나리오를 note 로 제시하고, 심화가 필요하면 교사가 공유화면에서 챗봇을 시연한다.
   * 포털은 학생의 **갈등 분석 기록**(입장·감정·원하는 것)만 남긴다 — 챗봇 호출은 포털에서 안 한다.
   *
   * ④ 관계 캘리그래피: 활동3 과 같은 Canva 초대(위 CANVA_BY_GROUP)를 쓴다. 산출물은 공유 링크로.
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
      "[상황] + [내 감정] + [바라는 것] 을 담아 보세요.\n" +
      "예) “내 말이 끊기면 서운해. 끝까지 들어주면 좋겠어.”  이 칸은 나와 선생님만 봐요.",
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
      " · [학교·사회] 모둠 과제에서 한 친구가 자기 방식만 고집해 다른 친구들이 불편해한다.\n\n" +
      "※ 선생님이 필요하면 공유화면에서 갈등 상황 챗봇으로 다른 예시도 함께 살펴볼 거예요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "a4_conflict_analysis",
    phase: "wrapmap",
    // 갈등 분석 기록. 개인 글, 비공개. 챗봇 호출은 포털에서 안 한다(교사 시연/외부).
    label: "고른 갈등 상황을 분석해 보세요 — 양쪽의 ‘입장 · 감정 · 원하는 것’",
    hint:
      "예) 나: 입장=쉬고 싶다 / 감정=지침·억울함 / 원하는 것=잠깐의 휴식\n" +
      "    부모님: 입장=성적이 걱정 / 감정=불안 / 원하는 것=내가 잘되는 것\n" +
      "양쪽 모두를 적어 보면, 서로 ‘원하는 것’ 이 보여요. 이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 400,
  },
  {
    key: "_a4_calli_login",
    phase: "wrapmap",
    // Canva 로그인 — 활동3 과 같은 초대(같은 세션이면 이미 로그인되어 이어짐).
    label: "③ 관계 캘리그래피 — Canva 열기",
    hint:
      "대인관계에서 중요하다고 생각하는 덕목을 하나 골라, Canva 로 캘리그래피(멋글씨) 작품을\n" +
      "만들어 볼 거예요. 아래 [Canva 열기] 를 눌러 새 창에서 열어요(이미 로그인했으면 이어져요).",
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
  {
    key: "a4_reflect",
    phase: "wrapmap",
    // 성찰 1문항 — 개인 글, 비공개.
    label: "오늘 배운 의사소통 방법 중, 실제 관계에서 써보고 싶은 것 한 가지를 적어 주세요",
    hint:
      "예) 화날 때 ‘너 왜 그래’ 대신 나 전달법으로 “나는 서운했어” 라고 말해보고 싶다.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },

  /* ══════════════ 활동5 「공감 문장 · 감정 대화」 (wrapheal) ══════════════
   *
   * 마음일기 뒤 "얹는 활동" 단계(wrapheal)에 담는다(places 가 비어 그림판은 안 뜨고 활동지 문항만
   * 뜬다). 흐름:
   *   ① 생활 속 공감 문장 만들기 → ② 감정 말풍선 채우기 → ③ 감정 대화 이어가기
   *   → ④ 대화를 바탕으로 '만화 생성 프롬프트' 정리
   *
   * ⚠ [만화 생성 = 스코프 밖] 이 포털에는 ChatGPT/DALL·E 같은 외부 이미지 생성 API 연동이
   * **없다**(코드 확인: AI 는 Gemini 기반 emotion-lens·ai-review 뿐, 이미지 생성 라우트 없음).
   * 그래서 이번 시드는 새 API·새 kind·새 서버 라우트를 만들지 않는다. 학생은 자기 감정 대화를
   * 바탕으로 **만화 생성 프롬프트를 글로 정리해 기록**하고, 실제 만화 생성은 **교사 시연 / 외부
   * 도구**로 둔다(활동2 의 Gemini·TM 처리와 같은 안전한 기본값). 실제 API 연동을 원하면 별도
   * 작업(API 키·비용·새 kind·서버 라우트)이 필요하다 — 보고에 남긴다.
   *
   * 모든 서술 칸은 개인 글이라 친구에게 안 나간다(galleryEnabled: false).
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
  {
    key: "a5_reflect",
    phase: "wrapheal",
    // 성찰 1문항 — 개인 글, 비공개.
    label: "감정을 말과 그림으로 표현해 보니 어땠나요? 공감이 관계에 어떤 도움이 될까요?",
    hint:
      "예) 내 마음을 말풍선으로 그려 보니 정리가 됐다. 공감 한마디가 사이를 풀어줄 것 같다.\n" +
      "이 칸은 나와 선생님만 봐요.",
    kind: "long",
    maxLength: 300,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "디지털 마음 톡톡 5회기 — 관점과 감정 읽기 (대인관계 · 활동1+활동2)",

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

  /*
   * 오늘 할 일 + ① 착시 영상.
   *
   * 안내 화면(progress)은 퀴즈보다 앞이라, 여기에 착시 영상을 임베드하면 버튼 순서가
   * outline 그대로(안내 → 토끼오리 그림 → 투표) 흐른다. body(오늘 할 일)와 url(착시
   * 영상 임베드)이 함께 그려진다 — cards·tabs 가 없을 때만 body 가 뜨므로 여기선 뜬다.
   */
  progress: {
    heading: "오늘 할 일 — 관점과 감정 읽기",
    body:
      "[활동1] 우리는 왜 다르게 생각할까?\n" +
      " ① 착시 영상  ② 토끼일까 오리일까? 투표  ③ 관점 차이 깨닫기\n" +
      " ④ 문화마다 다른 감정 표현  ⑤ 정리 — 다른 건 틀린 게 아니라 다른 것\n\n" +
      "[활동2] 감정 추측하기\n" +
      " ① 가사만 듣고 노래 맞히기  ② 말의 내용만 듣고 감정 맞히기\n" +
      " ③ 억양·상황까지 듣고 다시  ④ 텍스트 AI(제미나이)와 감정 분석 비교\n" +
      " ⑤ 이미지 AI(Teachable Machine)로 표정 분류 체험",
    // 학생 화면엔 영상을 임베드하지 않는다 — 앞 화면(전자칠판)에서 교사가 틀고,
    // 학생은 앞을 본다. 영상은 아래 video 단계(교사 대시보드 '영상 재생')에 둔다.
    url: "",
  },

  /*
   * ② 토끼-오리 착시 그림 제시.
   *
   * 안내 화면(assessment)은 퀴즈 바로 앞이라, 투표 직전에 그림을 크게 보여주기 좋다.
   * PhaseContent 는 그림을 탭(tab.imageUrl)으로만 그리므로 탭 하나에 담는다.
   * 그림은 자체 호스팅(public/mt5/rabbit-duck.png). 정적 파일이라 배포되어 있어야 뜬다.
   */
  assessment: {
    heading: "토끼일까요, 오리일까요?",
    body: "",
    url: "",
    tabs: [
      {
        label: "이 그림, 뭐로 보여요?",
        subtitle: "잘 보세요 — 토끼로도, 오리로도 보입니다",
        note: "착시",
        rows: [],
        highlights: [
          "정답은 없어요. 처음에 무엇으로 보였는지 마음속으로 정해 두세요.",
          "다음 화면에서 ‘토끼 / 오리’ 를 투표할 거예요. 우리 반 결과를 함께 봅니다.",
        ],
        imageUrl: RABBIT_DUCK_IMG,
        imageAlt: "토끼로도 오리로도 보이는 유명한 착시 그림",
      },
    ],
  },

  // 착시 영상은 교사가 앞 화면에서 튼다 — 교사 대시보드 '영상 재생'(video 단계)에 둔다.
  // 학생 '오늘 할 일' 화면엔 임베드하지 않는다(위 progress.url 비움).
  video: {
    heading: "착시 영상 — 11가지 착시 현상",
    body: "앞 화면(전자칠판)으로 함께 봅니다. 학생은 앞을 봐 주세요.",
    url: ILLUSION_VIDEO_EMBED,
  },

  /*
   * 마음일기 — 매 회기 루틴. reflectionPublic 은 반드시 false(비공개).
   * 오늘 주제(관점·다름의 존중)를 관계로 잇는 물음을 둔다.
   */
  reflectionQuestions: [
    "오늘 활동에서 마음에 남는 순간은 언제였나요? 무엇 때문에 그랬는지도 함께 적어 주세요.",
    "지금 내 기분은 어떤가요? 그리고 왜 그런 것 같나요?",
    "나와 생각·표현이 다른 친구를 떠올려 보세요. 오늘 배운 것을 그 친구에게 어떻게 써볼 수 있을까요?",
  ],
  reflectionPublic: false,

  /*
   * 이탈 면제. progress 는 착시 영상 임베드(화면 안 재생이라 원래 이탈 아님)라 혹시 몰라,
   * emotion 은 Teachable Machine 을, worksheet(활동3)·wrapmap(활동4)은 Canva 를 새 탭으로
   * 열기 때문에 면제한다(활동이라 이탈로 안 센다). wrapheal(활동5)은 외부 창을 안 열지만,
   * 마무리 활동이라 함께 면제해 둔다.
   */
  focusExempt: ["progress", "emotion", "worksheet", "wrapmap", "wrapheal"],

  // 교사 버튼 순서: 착시 영상(video)을 토끼/오리(assessment) 앞으로. 안 적은 단계는
  // LESSON_PHASES 순서로 뒤에 붙는다(대시보드가 처리). 버튼은 각자 phase 를 바로 지정.
  phaseOrder: ["waiting", "mood", "progress", "video", "assessment", "quiz"],

  phaseLabels: {
    mood: "마음 체크인",
    // ── 활동1 ──
    progress: "오늘 할 일",
    video: "착시 영상 (앞 화면 재생)",
    assessment: "토끼? 오리?",
    quiz: "투표 (활동1·2 문항 모음)",
    problem: "관점 차이 깨닫기",
    mvp: "문화마다 다른 감정 표현",
    build: "정리 — 감정 표현과 문화",
    // ── 활동2 ──
    grill: "감정 추측 — 듣고 맞히기",
    emotion: "AI로 감정 분석하기",
    // ── 활동3 (worksheet 자리) ──
    worksheet: "감정 캐릭터 만들기 (Canva AI)",
    reflection: "마음일기",
    // ── 활동4·5 (마음일기 뒤 얹는 활동) ──
    wrapmap: "효과적인 의사소통",
    wrapheal: "공감 문장 · 감정 대화",
  },

  // 투표(활동1 토끼오리 + 활동2 가사·감정) — 포털 퀴즈로. 교사가 공유화면에서 집계를 본다.
  quiz: QUIZ,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리기 없는 활동. 장소를 비우면 그림판이 안 뜬다.
    places: [],
    year: 2026,
    worksheet: WORKSHEET,

    // 자료 찾기가 아니라 마음을 들여다보는 활동이라 출처 두 칸을 안 띄운다.
    sourcesEnabled: false,

    /*
     * ★ 서로 구경하기를 닫는다 — 감정·의견 글은 친구에게 안 나간다.
     * 서버 갤러리 라우트가 이 값을 보고 응답 자체를 막는다(gallery/route.ts).
     * 뒤에 대인관계 나눔 활동을 붙여 갤러리를 켤 때는, 친구에게 나갈 칸만
     * galleryAnswerKeys 로 못박고 서버 목록도 함께 챙긴다.
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} · 차시 번호 ${LESSON_NO} (5회기 대인관계 — 활동1~5, 모듈 단위로 붙임)`);
  console.log("교사 버튼 순서(고정 단계 위): 대기 → 마음 체크인 →");
  console.log("  [활동1] 오늘 할 일+착시 영상 → 토끼? 오리? 그림 → (투표) → 관점 차이 → 문화별 감정 표현 → 정리");
  console.log("  [활동2] 감정 추측 — 듣고 맞히기(grill) → AI로 감정 분석하기(emotion)");
  console.log("  [활동3] 감정 캐릭터 만들기 · Canva AI (worksheet — 고정 순서상 grill 과 emotion 사이에 낌)");
  console.log("  → 마음일기");
  console.log("  [활동4] 효과적인 의사소통 (wrapmap — 마음일기 뒤 얹는 활동)");
  console.log("  [활동5] 공감 문장 · 감정 대화 (wrapheal — 마음일기 뒤 얹는 활동)");
  console.log("  → 마침");
  console.log("\n⚠ 단계 순서는 LESSON_PHASES 로 고정 — 활동3~5 는 붙일 수 있는 빈 단계에 얹었습니다. 활동3(worksheet)은 활동2 의 grill·emotion 사이에 낍니다. 활동4·5(wrapmap·wrapheal)는 마음일기 뒤 '얹는 활동' 자리입니다. 모듈을 재배치해 조합할 때 감안하세요.");
  console.log("Canva(활동3 감정 캐릭터 · 활동4 관계 캘리그래피): 분반별 초대 토큰은 .env.local(CANVA_INVITE_MT_*)에서만 읽습니다. 세션 열 때 open-mt5-*.ts 가 그 분반 것만 linkUrl 에 박고 linkUrlByGroup 은 지웁니다(남의 분반 토큰 유출 방지). 산출물은 그림 파일이 아니라 공유 링크(URL)로 기록합니다.");
  console.log("⚠ 활동5 만화 생성: 이 포털엔 ChatGPT/이미지 생성 API 연동이 없습니다 — 학생은 만화 생성 프롬프트만 글로 정리·기록하고, 실제 만화 생성은 교사 시연/외부 도구입니다. 실제 API 연동을 원하면 별도 작업(API 키·비용·새 kind·서버 라우트)이 필요합니다.");
  console.log("\n리허설: 위 seed 를 재실행(재시드)하면 아직 시작 안 한 세션에 반영됩니다. 리허설 세션을 열어 대기→기분→활동1→활동2 로 눌러 보세요. (리허설 흔적 __rehearsal 은 그대로 두면 됩니다.)");
  console.log("\n⚠ 투표(퀴즈)는 단계가 하나뿐 — 활동1·활동2 문항이 한 [투표] 단계에 모입니다(quiz[0] 토끼오리 · quiz[1] 가사 · quiz[2] 감정(내용만) · quiz[3] 감정(억양+맥락)).");
  console.log("   활동2 에서는 grill/emotion 에 있다가 투표할 때 [투표] 단계로 잠깐 돌아가 quizIndex 를 맞춰 투표를 받고 다시 옵니다. prompt 앞 [활동1]/[활동2] 라벨로 구분하세요.");
  console.log("   집계: 교사 대시보드 [응답 분포 새로고침]. 정답 공개는 quiz[1](가사)만 눌러도 됨 — quiz[0]·[2]·[3] 은 의견형이라 공개하지 마세요(오답 표시가 뜹니다).");
  console.log("\n활동2 도구(포털 vs 교사 외부): TTS 없음 → 가사·문장 낭독은 교사가 외부 TTS 로 공유화면 재생. Gemini 감정분석은 교사 시연 + 포털엔 비교 기록 칸(포털에서 Gemini 호출 안 함). Teachable Machine 은 새 탭 링크(얼굴 이미지는 기기 안에서만).");
  console.log(`\n⚠ 이미지: 토끼-오리 그림 파일이 아직 없습니다 — 교사가 public${RABBIT_DUCK_IMG} 로 넣어야 화면에 뜹니다. (예: 위키미디어 공용 "Kaninchen und Ente")`);
  console.log(`착시 영상: 안내 화면(progress)에 임베드 (${ILLUSION_VIDEO_WATCH}). 앞 화면 재생을 원하면 교사가 같은 링크를 전자칠판에 열면 됩니다.`);
  console.log("가사 퀴즈: quiz[1] 선택지·정답은 예시(강남스타일)입니다 — 교사가 고른 곡에 맞게 KPOP_CHOICES·KPOP_ANSWER_INDEX 를 바꾸거나 대시보드에서 수정하세요. 가사 전문은 넣지 않습니다(저작권).");
  console.log("프라이버시: 서로 구경하기 꺼짐(galleryEnabled: false) — 관점·문화·재해석·AI 비교·표정 소감·마음일기, 그리고 활동3~5(감정 캐릭터 링크·나 전달법·갈등 분석·캘리그래피 링크·공감 문장·감정 대화·만화 프롬프트) 모두 본인·교사만. 투표는 익명 집계 수치. 포털에서 Gemini/외부 API 호출 없음(galleryAnswerKeys 없음 — 열 것이 없음).");
  console.log("블록타임: 6·7교시 90분 연속 → 세션은 7교시로 하나만 엽니다 (여는 스크립트 open-mt5-*.ts 의 몫, 이번엔 seed 만).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
