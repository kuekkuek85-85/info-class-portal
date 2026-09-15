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
 * 문항을 **활동 순서대로** 담고 각 prompt 앞에 [활동1]/[활동2] 라벨을 붙여 교사가
 * 제어판에서 구분하게 했다(아래 QUIZ 참조). 총 13문항:
 *  · [0]    [활동1] 토끼/오리 (의견형)
 *  · [1~10] [활동2] 노래 10곡 (단답형 — 가수·제목 적기, 정답 공개)
 *  · [11]   [활동2] 감정(내용만·의견형)   · [12] [활동2] 감정(억양+맥락·의견형)
 * 완전히 분리하려면 "활동마다 별도 퀴즈 단계" 가 필요한데 포털에 그 구조가 없다 —
 * 대신 문항별 opinion 플래그로 정답형(노래)·의견형(투표)을 한 퀴즈에서 다르게 다룬다.
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
 * 노래 10곡은 가사 스니펫을 **미리 TTS(하이미 ko-KR)로 만들어 두었다** — public/mt5/audio/
 * song01~10.wav. 이 음성은 **교사 화면(퀴즈 패널)에서만** 재생하고, 학생 태블릿엔 주소를
 * 안 내려보낸다(video 와 같은 앞-화면 전용). 저작권상 가사 전문이 아니라 **짧은 스니펫**만
 * 담고 수업(교사 화면)에서만 튼다. 문장 감정(②③) 낭독은 여전히 교사가 외부 TTS 로 한다.
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
 * quiz-stats + teacher-quiz-panel)을 그대로 쓴다. **정답형과 의견형이 섞여** 있어 문항별
 * `opinion` 플래그로 나눠 다룬다:
 *
 *  · **정답형** — [1~10] 노래 10곡. 단답형(answerType:"text")이라 학생이 가수·제목을 직접
 *    적는다. 답은 서버로 안 모으고(자기 채점), 교사가 [정답 공개] 를 누르면 nowText 의
 *    정답이 학생 화면에 뜬다. 음성은 교사 화면 퀴즈 패널의 ▶ 로 재생한다.
 *  · **의견형(opinion:true)** — [0] 토끼/오리, [11]·[12] 감정 추측. 정답이 없다. 이 문항에서는
 *    「정답 공개」 버튼과 "← 정답"·초록/분홍 강조가 **코드로 숨겨진다**(quiz.ts·teacher-quiz-
 *    panel·quiz-view·screen 이 opinion 을 본다). 교사는 [응답 분포 새로고침] 으로 집계만 본다.
 *    stickers 는 모두 비운다(디지털 특성 스티커는 이 과목과 무관).
 *
 * 활동2 의 감정 추측([11]·[12])은 집계 자체가 수업의 핵심이다 — 같은 문장을 **내용만**
 * 들었을 때([11])와 **억양·맥락**까지 들었을 때([12]) 반의 감정 분포가 어떻게 달라지는지를
 * 두 집계로 나란히 보며 "맥락이 감정 읽기를 바꾼다" 를 확인한다.
 *
 * (예전 초안의 "[남은 갈림] — 타임머신 문구·토끼 옆 ← 정답" 은 해결됐다: 퀴즈 label("투표")과
 *  문항별 opinion 플래그가 그 겉표시를 없앤다.)
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import type {
  LessonPlan,
  PhaseContent,
  QuizContent,
  QuizQuestion,
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
 * 활동2 ① 노래 맞히기 — **단답형 10곡** (교사가 준 「10곡 수업자료」).
 *
 * 각 곡의 가사 한두 줄을 AI 목소리(TTS)로 만들어 `public/mt5/audio/songNN.wav` 에 두었다.
 * 그 음성은 **교사 화면(퀴즈 패널)에서만** 재생하고, 학생 태블릿에는 주소를 안 내려보낸다
 * (video 와 같은 앞-화면 전용 규칙 — quiz.ts studentMedia/quizView 참조). 학생은 듣고
 * 가수·제목을 **직접 적는다**(answerType:"text"). 교사가 「정답 공개」를 누르면 nowText 의
 * 정답이 학생 화면에 떠 **스스로 채점**한다 — 답은 서버로 모으지 않는다.
 *
 * 저작권: 가사 전문이 아니라 **짧은 스니펫(한두 줄)** 만 음성으로 담고, 수업(교사 화면)에서만
 * 재생한다. 제목·가수는 사실 정보라 그대로 적는다.
 */
const SONGS: { title: string; artist: string; audio: string }[] = [
  { title: "LOVE ATTACK", artist: "RESCENE (리센느)", audio: "/mt5/audio/song01.wav" },
  { title: "이 별로부터", artist: "아이유", audio: "/mt5/audio/song02.wav" },
  { title: "BiiiG", artist: "BIGBANG (빅뱅)", audio: "/mt5/audio/song03.wav" },
  { title: "갑자기", artist: "아이오아이 (I.O.I)", audio: "/mt5/audio/song04.wav" },
  { title: "REDRED", artist: "CORTIS (코르티스)", audio: "/mt5/audio/song05.wav" },
  { title: "BAD", artist: "ATEEZ (에이티즈)", audio: "/mt5/audio/song06.wav" },
  { title: "LEMONADE", artist: "aespa (에스파)", audio: "/mt5/audio/song07.wav" },
  { title: "It's Me", artist: "아일릿 (ILLIT)", audio: "/mt5/audio/song08.wav" },
  { title: "Drowning", artist: "WOODZ (우즈)", audio: "/mt5/audio/song09.wav" },
  { title: "사랑은 늘 도망가", artist: "임영웅", audio: "/mt5/audio/song10.wav" },
];

/**
 * ① 노래 맞히기(동기유발) — 단답형 10곡. group:"wordquiz" 단계에서 뜬다.
 * answerType:"text" + audioUrl(교사 화면 재생) + nowText(정답). 학생은 가수·제목을 적고
 * 교사가 정답 공개하면 스스로 채점한다.
 */
const SONG_QUESTIONS: QuizQuestion[] = SONGS.map((song, i) => ({
  prompt: `[동기유발] 🎧 ${i + 1}번째 노래 — AI 목소리로 가사를 들려줄게요. 가수와 제목을 적어 보세요.`,
  choices: [],
  answerIndex: -1, // 단답형이라 선지 정답이 없다 (정답은 nowText)
  answerType: "text",
  group: "wordquiz",
  audioUrl: song.audio,
  answerFields: [
    { key: "artist", label: "가수", placeholder: "예) 아이유" },
    { key: "title", label: "제목", placeholder: "예) 이 별로부터" },
  ],
  nowText: `가수: ${song.artist}\n제목: ${song.title}`,
  stickers: [],
}));

/**
 * ② 감정 추측 — 듣고 맞히기. group:"grill" 단계. 문장을 AI 목소리(TTS)로 듣고 어떤
 * 감정인지 고른다(의견형 투표). 정답이 없어 「분포 공개」로 우리 반 분포를 학생 화면에 띄운다.
 *
 * 음성은 미리 만들어 둔 짧은 문장 클립(public/mt5/audio/sent0N.wav) — 교사 화면에서만 재생.
 * 문장·선지는 예시다. 같은 문장도 맥락·억양에 따라 다르게 들린다는 것을 분포로 보여준다.
 */
const EMOTION_VOTES: QuizQuestion[] = [
  {
    prompt: "[활동2] 🎧 방금 들은 문장 「왜 이제 왔어.」 — 어떤 감정으로 들렸나요?",
    choices: ["반가움", "서운함", "화남", "걱정"],
    answerIndex: 0,
    opinion: true,
    group: "grill",
    audioUrl: "/mt5/audio/sent01.wav",
    nowText:
      "정답은 없어요. 같은 말도 오래 기다린 반가움일 수도, 서운함일 수도 있어요 —\n" +
      "맥락과 억양에 따라 다르게 들립니다. 우리 반 분포가 여러 갈래로 갈렸지요?",
    stickers: [],
  },
  {
    prompt: "[활동2] 🎧 방금 들은 문장 「그래, 너 참 잘났다.」 — 어떤 감정으로 들렸나요?",
    choices: ["진심 칭찬", "비꼼(빈정거림)", "부러움", "놀림"],
    answerIndex: 0,
    opinion: true,
    group: "grill",
    audioUrl: "/mt5/audio/sent02.wav",
    nowText:
      "정답은 없어요. 글자만 보면 칭찬 같지만, 상황에 따라 비꼼으로도 들려요.\n" +
      "말의 ‘내용’ 만으로는 감정을 확정하기 어렵다는 걸 확인했어요.",
    stickers: [],
  },
  {
    prompt: "[활동2] 🎧 방금 들은 문장 「괜찮아. 나 신경 안 써.」 — 어떤 감정으로 들렸나요?",
    choices: ["정말 괜찮음", "속상함을 숨김", "화가 남", "무관심"],
    answerIndex: 0,
    opinion: true,
    group: "grill",
    audioUrl: "/mt5/audio/sent03.wav",
    nowText:
      "정답은 없어요. ‘괜찮다’ 는 말이 정말 괜찮은 걸 수도, 속상함을 감춘 걸 수도 있어요.\n" +
      "우리는 말의 내용뿐 아니라 맥락으로 감정을 읽습니다.",
    stickers: [],
  },
];

/**
 * ③ AI로 감정 분석하기. group:"emotion" 단계. 문장 3개를 주고, 학생이 감정과 근거를
 * 적는다(단답형 text). 교사가 「정답 공개」를 누르면 참고 답(사람·AI 가 읽는 감정과 근거)이
 * 학생 화면에도 뜬다 — 자기 답과 비교한다.
 *
 * 문장·참고 답은 예시다(교사가 바꿀 수 있다). 텍스트 AI(제미나이)의 감정 분석은 교사가
 * 공유화면에서 시연하고, 포털은 학생 기록과 참고 답만 담는다(포털에서 Gemini 호출 안 함).
 */
const AI_EMOTION_QUESTIONS: QuizQuestion[] = [
  {
    prompt:
      "[활동2] 다음 문장의 감정은 무엇일까요? 그리고 왜 그렇게 생각했는지 ‘근거’ 도 적어 보세요.\n" +
      "문장: 「왜 이제 왔어.」",
    choices: [],
    answerIndex: -1,
    answerType: "text",
    group: "emotion",
    answerFields: [
      { key: "emotion", label: "감정", placeholder: "예) 서운함" },
      { key: "reason", label: "근거", placeholder: "예) ‘이제’ 에 오래 기다린 마음이 담겨서" },
    ],
    nowText:
      "참고 답 — 감정: 맥락에 따라 ‘반가움’ 또는 ‘서운함’.\n" +
      "근거: ‘이제’ 에 오래 기다린 마음이 담겨, 상황을 모르면 서운함·화남으로 읽기 쉽다.\n" +
      "텍스트 AI 도 글자만 보면 대개 부정 감정으로 판단한다 — 맥락을 아는 사람과 다를 수 있다.",
    stickers: [],
  },
  {
    prompt:
      "[활동2] 다음 문장의 감정은 무엇일까요? 그리고 왜 그렇게 생각했는지 ‘근거’ 도 적어 보세요.\n" +
      "문장: 「그래, 너 참 잘났다.」",
    choices: [],
    answerIndex: -1,
    answerType: "text",
    group: "emotion",
    answerFields: [
      { key: "emotion", label: "감정", placeholder: "예) 비꼼" },
      { key: "reason", label: "근거", placeholder: "예) 상황상 칭찬이 아니라 빈정거림 같아서" },
    ],
    nowText:
      "참고 답 — 감정: 표면은 칭찬이지만 맥락상 ‘비꼼(빈정거림)’ 인 경우가 많다.\n" +
      "근거: 다툰 뒤·비꼬는 상황이면 칭찬이 아니다. 텍스트 AI 는 글자만 보면 ‘칭찬(긍정)’ 으로 오해하기 쉽다.",
    stickers: [],
  },
  {
    prompt:
      "[활동2] 다음 문장의 감정은 무엇일까요? 그리고 왜 그렇게 생각했는지 ‘근거’ 도 적어 보세요.\n" +
      "문장: 「괜찮아. 나 신경 안 써.」",
    choices: [],
    answerIndex: -1,
    answerType: "text",
    group: "emotion",
    answerFields: [
      { key: "emotion", label: "감정", placeholder: "예) 속상함" },
      { key: "reason", label: "근거", placeholder: "예) 말과 달리 속상함을 감춘 것 같아서" },
    ],
    nowText:
      "참고 답 — 감정: 말은 ‘괜찮다’ 지만 속상함·서운함을 감춘 경우가 많다.\n" +
      "근거: ‘신경 안 쓴다’ 를 굳이 말하는 건 신경이 쓰인다는 뜻일 때가 있다. 사람은 맥락으로, AI 는 글자로 읽는다.",
    stickers: [],
  },
];

/**
 * 활동2 ⑤ Teachable Machine(구글) — 얼굴 표정 이미지 분류.
 * 이미지 프로젝트를 새 탭으로 연다. 학습·분류가 브라우저(기기) 안에서 돌아 얼굴 이미지가
 * 서버로 올라가지 않는다(프라이버시 안내에 못박음).
 */
const TEACHABLE_MACHINE_URL = "https://teachablemachine.withgoogle.com/train/image";
/** 활동2 이미지 AI 체험 — 먼저 얼굴 표정 분석을 바로 해보는 사이트(교사 제공). */
const FAAN_URL = "https://faan.netlify.app/";

/* ─────────────── 활동3·4 「Canva」 공통 재료 ─────────────── */

/**
 * Canva 학교 팀 초대 주소 — 활동4(관계 캘리그래피)가 쓴다.
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

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/**
 * 퀴즈 — 이제 문항이 **여러 단계에 나뉘어** 뜬다(문항별 group). 한 배열에 담되, 각
 * 문항의 group 이 그 문항이 뜰 단계를 정한다. quizIndex 는 글로벌(전체 배열 기준)로 저장돼
 * 집계와 어긋나지 않고, 화면 표시·이동만 그 단계 안으로 좁혀진다(quiz.ts 참조).
 *
 *  · group "quiz"     — [활동1] 토끼/오리 투표 (의견형)
 *  · group "wordquiz" — [동기유발] 노래 맞히기 10곡 (단답형)
 *  · group "grill"    — [활동2] 감정 추측: 문장 듣고 감정 맞히기 (의견형 투표 3문항)
 *  · group "emotion"  — [활동2] AI로 감정 분석: 문장 3개, 감정+근거 적기 (단답형 · 정답 공개)
 *
 * 정답형(단답 노래·AI 감정분석)은 「정답 공개」로 nowText 를 띄우고, 의견형(토끼오리·감정
 * 투표)은 「분포 공개」로 응답 분포를 학생 화면에 띄운다(둘 다 문항별로 자동 구분).
 */
const QUIZ: QuizContent = {
  // "타임머신" 대신 "퀴즈" 로 표시한다 (학생·교사·전자칠판 공통).
  label: "퀴즈",
  questions: [
    // ── [활동1] 토끼/오리 투표 (group "quiz") ─────────────────────
    {
      prompt: "[활동1] 방금 본 그 그림, 여러분에게는 무엇으로 보였나요? 토끼일까요, 오리일까요?",
      choices: ["토끼", "오리"],
      answerIndex: 0, // 형식상 index — 정답 아님
      opinion: true, // 의견형 — 「분포 공개」로 분포만 보인다
      group: "quiz",
      nowText:
        "사실 여기엔 정답이 없어요. 같은 그림인데 누구는 토끼로, 누구는 오리로 봅니다.\n" +
        "보는 사람마다 관점이 다를 수 있다는 것 — 그게 오늘 우리가 확인한 거예요.",
      stickers: [],
      // 토끼-오리 그림을 투표하는 동안 선지 위에 크게 띄운다(그림 보며 투표).
      media: {
        kind: "image",
        url: RABBIT_DUCK_IMG,
        caption: "토끼로도 오리로도 보이는 유명한 착시 그림",
        credit: "",
      },
      mediaWhileVoting: true,
    },
    // ── [동기유발] 노래 맞히기 10곡 (group "wordquiz") ─────────────
    ...SONG_QUESTIONS,
    // ── [활동2] 감정 추측: 듣고 맞히기 (group "grill") ─────────────
    ...EMOTION_VOTES,
    // ── [활동2] AI로 감정 분석: 감정+근거 (group "emotion") ────────
    ...AI_EMOTION_QUESTIONS,
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
     * 직접 예시 찾기 — 위 문화 카드처럼, 같은 행동·말이 문화마다 다르게 읽히는 예를
     * 스스로 찾아 적는다. 개인 기록(친구에게 안 나간다).
     */
    label: "이처럼 같은 행동이나 언어인데, 다른 나라·문화에서는 다른 뜻으로 쓰이는 예시를 찾아서 적어 보세요",
    hint:
      "위 예시들처럼, 같은 행동·말·손짓이 문화에 따라 다르게 읽히는 경우를 찾아 적어요.\n" +
      "예) 손가락으로 만든 ‘OK(동그라미)’ 표시가 어떤 나라에서는 무례한 뜻이 된다.\n" +
      "예) 검지로 사람을 가리키는 것이 어떤 문화에서는 매우 무례하게 여겨진다.\n" +
      "책·인터넷에서 찾아봐도 좋아요. 이 칸은 나와 선생님만 봐요.",
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

  /* ══════════════ 활동2-④ 「이미지 AI 체험」 (worksheet) ══════════════
   *
   * 감정 추측(grill·듣고 맞히기)과 AI 감정 분석(emotion·감정+근거)은 이제 각 단계의
   * 퀴즈로 뜬다(위 QUIZ 의 group 참조). 이 worksheet 단계는 그다음 "이미지 AI 로 표정
   * 분석" 체험이다: 먼저 faan 사이트에서 얼굴 표정 분석을 바로 해보고 → Teachable Machine
   * 으로 직접 표정 모델을 만들고 → 만든 모델의 공유 링크를 포털에 제출한다.
   *
   * 얼굴 이미지는 두 사이트 모두 브라우저(기기) 안에서만 처리돼 서버로 안 올라간다 —
   * 프라이버시 안내를 못박는다. 제출하는 것은 '모델 링크'(URL)뿐이라 얼굴 사진이 아니다.
   */
  {
    key: "_a2_img_intro",
    phase: "worksheet",
    label: "이미지 AI 도 감정을 읽을까? — 표정 분석 체험",
    hint:
      "지금까지는 ‘글자·소리’ 로 감정을 다뤘어요. 이번엔 ‘표정 사진’ 으로 감정을 읽는\n" +
      "이미지 AI 를 체험합니다. ① 먼저 표정 분석 사이트를 써 보고 → ② 직접 표정 모델을 만들어\n" +
      "→ ③ 만든 모델 링크를 아래에 제출해요.\n\n" +
      "🔒 얼굴 사진은 ‘기기(브라우저) 안에서만’ 쓰여요 — 인터넷에 올라가거나 저장되지 않아요.\n" +
      "   원하지 않으면 내 얼굴 대신 이모지 그림·인형·사진 속 표정으로 해도 됩니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_a2_faan_note",
    phase: "worksheet",
    // ① faan.netlify.app — 얼굴 표정 분석을 바로 체험. 새 탭 링크.
    label: "① 먼저 표정 분석 사이트를 체험해요",
    hint:
      "아래 [표정 분석 체험 열기] 를 눌러 새 탭에서 열어요. 웹캠이나 사진 속 얼굴 표정을\n" +
      "AI 가 어떻게 읽는지(예: 기쁨·슬픔·놀람 등) 직접 확인해 보세요.\n" +
      "‘사람이 보는 감정’ 과 ‘AI 가 읽는 감정’ 이 같은지 견줘 봅니다.\n\n" +
      "🔒 얼굴 이미지는 이 기기 안에서만 분석돼요 — 저장·전송되지 않아요.",
    kind: "note",
    linkUrl: FAAN_URL,
    linkLabel: "표정 분석 체험 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "_a2_tm_note",
    phase: "worksheet",
    // ② Teachable Machine — 직접 표정 모델을 만든다. 새 탭 링크.
    label: "② 이제 직접 표정 모델을 만들어요 — Teachable Machine",
    hint:
      "아래 [Teachable Machine 열기] 를 눌러 새 탭에서 이미지 프로젝트를 만들어요.\n" +
      "표정(예: 웃는 얼굴 · 무표정 · 놀란 얼굴)을 몇 장씩 학습시킨 뒤, 새 표정을 잘 알아맞히는지\n" +
      "확인해 보세요.\n\n" +
      "🔒 학습·분류는 기기 안에서 돌아요 — 얼굴 사진이 인터넷에 올라가지 않아요.",
    kind: "note",
    linkUrl: TEACHABLE_MACHINE_URL,
    linkLabel: "Teachable Machine 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "a2_tm_model_url",
    phase: "worksheet",
    /*
     * ③ 산출물 = 만든 모델의 공유 링크. Teachable Machine 에서 [모델 내보내기(Export)] →
     * [Upload my model] 로 나온 공유 링크(URL)를 붙인다. 얼굴 사진이 아니라 링크만 제출.
     */
    label: "③ 내가 만든 표정 모델 링크를 붙여 주세요",
    hint:
      "Teachable Machine 오른쪽 위 [모델 내보내기(Export Model)] → [Upload my model] 을 누르면\n" +
      "공유 링크(URL)가 나와요. 그 주소를 복사해 여기에 붙여넣어요.\n" +
      "예) https://teachablemachine.withgoogle.com/models/....  이 칸은 나와 선생님만 봐요.",
    kind: "text",
    maxLength: 300,
  },
  {
    key: "a2_tm_reflect",
    phase: "worksheet",
    label: "AI 는 표정으로 감정을 잘 맞혔나요? 사람과 다르다고 느낀 점이 있다면 적어 주세요",
    hint:
      "예) 활짝 웃는 건 잘 맞혔는데, 억지웃음과 진짜웃음은 구별 못 했다.\n" +
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
      "[활동2] 감정 읽기\n" +
      " ① 노래 맞히기 (동기유발 — 가사 듣고 가수·제목 적기)\n" +
      " ② 감정 추측 — 문장을 듣고 어떤 감정인지 맞히기\n" +
      " ③ AI로 감정 분석 — 문장의 감정·근거 적고 견주기\n" +
      " ④ 이미지 AI 체험 — 표정 분석 사이트 → Teachable Machine 으로 모델 만들기",
    // 학생 화면엔 영상을 임베드하지 않는다 — 앞 화면(전자칠판)에서 교사가 틀고,
    // 학생은 앞을 본다. 영상은 아래 video 단계(교사 대시보드 '영상 재생')에 둔다.
    url: "",
  },

  /*
   * 토끼-오리 그림은 이제 quiz[0](투표) 문항에 붙어 "그림 보며 투표"로 합쳐졌다
   * (media + mediaWhileVoting). 별도 assessment(토끼? 오리?) 단계는 두지 않는다.
   */
  assessment: empty(),

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
   * emotion 은 Teachable Machine·faan 을, wrapmap(활동4)은 Canva 를 새 탭으로 열기 때문에
   * 면제한다(활동이라 이탈로 안 센다). wrapheal(활동5)은 외부 창을 안 열지만, 마무리 활동이라
   * 함께 면제해 둔다.
   */
  focusExempt: ["progress", "emotion", "wrapmap", "wrapheal"],

  // 교사 버튼 순서. 퀴즈가 여러 단계에 나뉘어(문항별 group) 뜨므로, 그 단계들도 순서에
  // 명시한다: 토끼오리(quiz) → 관점(problem·mvp·build) → 노래(wordquiz) → 감정추측(grill)
  // → AI 감정분석(emotion) → 이미지 AI(worksheet) → 마음일기 → 활동4·5. 안 적은 단계는
  // LESSON_PHASES 순서로 뒤에 붙는다(대시보드가 처리).
  phaseOrder: [
    "waiting",
    "mood",
    "progress",
    "video",
    "quiz",
    "problem",
    "mvp",
    "build",
    "wordquiz",
    "grill",
    "emotion",
    "worksheet",
    "reflection",
    "wrapmap",
    "wrapheal",
  ],

  phaseLabels: {
    mood: "마음 체크인",
    // ── 활동1 관점 ──
    progress: "오늘 할 일",
    video: "착시 영상 (앞 화면 재생)",
    quiz: "토끼? 오리? 투표",
    problem: "관점 차이 깨닫기",
    mvp: "문화마다 다른 감정 표현",
    build: "정리 — 감정 표현과 문화",
    // ── 활동2 감정 ──
    wordquiz: "노래 맞히기 (동기유발)",
    grill: "감정 추측 — 듣고 맞히기",
    emotion: "AI로 감정 분석하기",
    worksheet: "이미지 AI 체험 (표정 분석)",
    reflection: "마음일기",
    // ── 활동4·5 (마음일기 뒤 얹는 활동) ──
    wrapmap: "효과적인 의사소통",
    wrapheal: "공감 문장 · 감정 대화",
  },

  // 퀴즈 — 문항별 group 으로 여러 단계에 나뉘어 뜬다(토끼오리·노래·감정추측·AI 감정분석).
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} · 차시 번호 ${LESSON_NO} (5회기 대인관계 — 활동1·2 + 활동4·5)`);
  console.log("교사 버튼 순서: 대기 → 마음 체크인 →");
  console.log("  [활동1 관점] 오늘 할 일 → 착시 영상 → 토끼? 오리? 투표(quiz) → 관점 차이 → 문화별 감정 → 정리");
  console.log("  [활동2 감정] 노래 맞히기(wordquiz) → 감정 추측 듣고 맞히기(grill) → AI로 감정 분석(emotion) → 이미지 AI 체험(worksheet)");
  console.log("  → 마음일기 → [활동4] 효과적인 의사소통(wrapmap) → [활동5] 공감 문장·감정 대화(wrapheal) → 마침");
  console.log("\n★ 퀴즈가 이제 단계마다 뜹니다(문항별 group): 토끼오리→quiz, 노래 10곡→wordquiz, 감정 추측 3문항→grill, AI 감정분석 3문항→emotion.");
  console.log("   각 단계로 가면 그 단계 문항만 뜨고, 이전·다음·정답공개(또는 분포공개)를 그 안에서 합니다. quizIndex 는 글로벌이라 집계와 안 어긋납니다.");
  console.log("   노래(wordquiz): 교사 패널 ▶ 재생 → 학생이 가수·제목 적기 → [정답 공개](자기 채점). 답은 서버로 안 모읍니다.");
  console.log("   감정 추측(grill): 문장 TTS(sent01~03.wav) ▶ 재생 → 학생이 감정 투표 → [분포 공개] 누르면 학생 화면에도 응답 분포가 뜹니다(정답 없음).");
  console.log("   AI 감정분석(emotion): 문장 3개, 학생이 감정+근거 적기 → [정답 공개]로 참고 답을 학생 화면에 띄웁니다. 텍스트 AI(제미나이) 시연은 교사가 공유화면에서(포털 호출 없음).");
  console.log("   토끼오리(quiz): [분포 공개]로 우리 반 토끼/오리 분포를 학생 화면에 보입니다.");
  console.log("\n이미지 AI 체험(worksheet): ① faan.netlify.app 로 표정 분석 체험 → ② Teachable Machine 으로 표정 모델 만들기 → ③ 만든 모델 링크(Export→Upload my model)를 포털에 제출. 얼굴 이미지는 두 사이트 모두 기기 안에서만 처리(제출은 링크뿐).");
  console.log(`\n⚠ 토끼-오리 그림: public${RABBIT_DUCK_IMG} 필요(있으면 화면에 뜸). 착시 영상: video 단계에서 교사가 앞 화면 재생(${ILLUSION_VIDEO_WATCH}).`);
  console.log("노래 퀴즈(10곡): SONGS 배열(제목·가수·음성) 순서대로 단답형 문항. 곡을 바꾸려면 SONGS 와 songNN.wav(TTS)를 함께 바꾸세요. 저작권상 가사 전문이 아니라 짧은 스니펫만, 교사 화면 전용 재생.");
  console.log("프라이버시: 서로 구경하기 꺼짐(galleryEnabled: false) — 서술 칸은 모두 본인·교사만. 투표·분포는 익명 집계 수치(누가 뭘 골랐는지 안 뜸). 포털에서 Gemini/외부 API 호출 없음.");
  console.log("리허설: 재시드하면 아직 시작 안 한 세션에 반영됩니다. 진행 중(active) 세션은 건너뜁니다.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
