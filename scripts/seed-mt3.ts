/**
 * 「디지털 마음 톡톡」(자유학기 주제선택) 3회기.
 *
 *   node --env-file=.env.local scripts/seed-mt3.ts
 *
 * ## 2회기에서 못 하고 넘어간 다섯 걸음만 남긴다
 *
 * 90분에 아홉 단계를 넣었더니 뒤쪽 다섯이 통째로 남았다. 기록을 세어 보면 어디서
 * 멈췄는지가 분명하다 (화요일 1기 21명 기준).
 *
 *   감정 낱말 퀴즈      21/21   ← 했다
 *   영화 활동지          20/21   ← 했다
 *   감정 캐릭터(캔바)    15/21   ← 절반쯤
 *   감정 낱말 ①②③      15·13·9  ← 절반쯤
 *   나눌 감정 · 한 줄    12 · 9   ← 절반쯤
 *   나의 감정 쓰기        10/21   ← 절반쯤
 *   영화·예능 속 내 마음   0/21   ← 못 했다
 *   AI 감정 렌즈          0/21   ← 못 했다
 *
 * 그래서 오늘은 영화·예능 → 나의 감정 쓰기 → 서로의 마음 읽기 → AI 감정 렌즈 →
 * 마음일기 다섯만 한다. 낱말 퀴즈와 영화 활동지는 다시 하지 않는다.
 *
 * ## 활동 ID 를 2회기와 같게 둔다
 *
 * 같은 `artifacts` 문서를 이어 쓴다. 절반쯤 쓴 칸(낱말·나눌 감정·경험 글)이 오늘
 * 화면에 그대로 열려서, 쓴 학생은 이어서 가고 안 쓴 학생은 오늘 채운다.
 * 지난 시간 것을 다시 치게 하면 그 자체로 10분이 날아간다.
 *
 * ## 단계 차례가 곧 설계다
 *
 * 목록에 박힌 차례가 mvp → worksheet → gallery → emotion → reflection 이고
 * (types.ts 의 LESSON_PHASES), 선생님이 말씀하신 순서와 정확히 같다. 장면을 먼저
 * 떠올린 뒤에 낱말을 고르는 것이 훨씬 쉽고, 낱말을 고른 뒤라야 친구를 찾을 수 있다.
 *
 * ## 무엇이 친구에게 보이는가
 *
 * 고른 감정(share_feel)과 한 줄(share_line), 그리고 2회기에 만든 감정 캐릭터
 * 주소뿐이다. 경험 글(draft)·AI 비교·마음일기는 나가지 않는다. 거르는 자리는
 * 화면이 아니라 서버다 (gallery 라우트의 galleryAnswerKeys).
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

/** ★ 2회기와 같은 값. 이 값이 같아야 절반쯤 쓴 칸이 오늘 열린다 */
const ACTIVITY_ID = "mt-2026-2";
/** 차시 번호가 정보과·인간과AI 와 겹치지 않게 200번대 (2회기가 202) */
const LESSON_NO = 203;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/**
 * 무드미터 16낱말. `src/lib/mood.ts` 의 MOOD_OPTIONS 와 같은 낱말·같은 순서다.
 *
 * 값 import 를 안 하는 이유는 이 스크립트가 node 로 직접 실행되기 때문이다 —
 * `.ts` 확장자가 필요한데 그러면 타입 검사가 막힌다. 낱말을 고칠 일이 생기면
 * seed-mt2.ts · mood.ts 와 **세 곳을 같이** 고쳐야 한다.
 */
const MOOD_WORDS = [
  "화남", "긴장됨", "불안함", "짜증남",
  "신남", "기대됨", "즐거움", "자신있음",
  "슬픔", "외로움", "지침", "심심함",
  "뿌듯함", "홀가분함", "편안함", "차분함",
];

const MOOD_WORDS_NOTE = {
  heading: "무드미터 낱말이에요. 여기 없는 낱말을 써도 좋아요.",
  hint: "낱말만 적지 말고 언제 그랬는지를 붙여 보세요.\n짜증남 → 아침에 늦잠 자서 뛰어왔을 때 짜증남",
};

/** 교실배치도. public 아래 파일이라 주소가 그대로 학생 화면으로 간다 */
const SCHOOL_MAP = "/school-map.png";

/**
 * 감정 조절 전략 보기. 원본 활동지 3의 예시를 그대로 쓴다.
 *
 * 고르는 칸으로 두는 이유는 둘이다. 백지에 "전략을 적어 보세요" 라고 하면 중1은
 * "참는다" 를 쓴다 — 그건 조절이 아니라 억누르기다. 그리고 고른 값이 글자로 같아야
 * 반 전체에서 무엇이 많이 쓰이는지 셀 수 있다.
 */
const STRATEGIES = [
  "심호흡 — 천천히 크게 숨쉬기",
  "자기 대화하기 — 나에게 말 걸어 주기",
  "명상 — 잠깐 눈 감고 가만히 있기",
  "운동하기 — 몸을 움직이기",
  "주의 돌리기 — 다른 것에 집중하기",
  "편안한 사람 만나기",
  "안전지대 만들기 — 내가 편한 자리로 가기",
  "음악 감상",
  "산책",
  "일기 쓰기",
];

const WORKSHEET: WorksheetQuestion[] = [
  // ── 영화·예능 속 내 마음 (15분) ─────────────────────────
  {
    key: "_scene_note",
    phase: "mvp",
    /*
     * 서울시교육청 자료의 '명화 속 내 마음 찾기' 를 각색한 것. 명화 대신 영화·예능으로
     * 바꾼 이유는 둘이다.
     *  ① 중1에게 명화 넉 장은 감상 경험이 없으면 고를 근거가 없다. 그냥 예쁜 걸 고른다.
     *  ② 자기 이야기를 바로 꺼내는 것보다 남의 장면을 빌려 말하는 것이 쉽다.
     *     "나 요즘 외로워" 는 못 써도 "기쁨이가 밀려나는 장면" 은 쓴다.
     */
    label: "영화·예능 속에서 내 마음 찾기",
    hint:
      "요즘 내 마음과 가장 가까운 장면을 하나 떠올려 보세요.\n" +
      "영화·드라마·예능·애니메이션·웹툰 무엇이든 좋아요. 유명하지 않아도 됩니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "scene_what",
    phase: "mvp",
    label: "어떤 작품의 어떤 장면인가요?",
    hint: "예) 인사이드 아웃 2에서 기쁨이가 밀려나는 장면\n예) 흑백요리사에서 탈락하고 조용히 짐 싸는 장면",
    kind: "text",
    maxLength: 100,
  },
  {
    key: "scene_link",
    phase: "mvp",
    /*
     * 어디서 봤는지를 남긴다.
     *
     * 장면 이름만 적으면 나중에 교사도 학생도 그게 무엇이었는지 못 찾는다.
     * 못 찾아도 되는 칸이라 비워 두어도 넘어간다 — 이 활동의 본체는 아래 두 칸이다.
     */
    label: "그 장면을 어디서 봤나요? (주소가 있으면 붙여 주세요)",
    hint: "유튜브·넷플릭스·웹툰 주소 아무거나 좋아요. 없으면 비워 둬도 됩니다.",
    kind: "text",
    maxLength: 300,
  },
  {
    key: "scene_photo",
    phase: "mvp",
    /*
     * 사진은 화면에서 줄여 데이터 URL 로 답에 담긴다. 그래서 maxLength 가 곧 용량
     * 상한이다 (image-field.ts 참조). Firestore 문서 하나가 1MB 이고 이 활동지에는
     * 글도 여러 칸 들어가므로 26만 자(≈190KB)로 묶어 둔다.
     *
     * 친구에게는 안 나간다 — 나가는 칸은 galleryAnswerKeys 셋뿐이다.
     */
    label: "그 장면 사진을 붙여 주세요",
    hint:
      "[사진 고르기] 로 파일을 고르거나, 복사해 둔 사진이 있으면 Ctrl+V 로 바로 붙여넣어도 됩니다.\n" +
      "붙이면 아래에 바로 보여요. 없으면 비워 둬도 됩니다.",
    kind: "image",
    maxLength: 260_000,
  },
  {
    key: "scene_why",
    phase: "mvp",
    // 장면을 빌려 자기 이야기로 건너오게 하는 다리다
    label: "그 장면이 왜 지금 내 마음 같나요?",
    hint: "최근에 있었던 내 일과 이어서 적어 보세요.\n예) 친구들이 새로 친해지는데 나만 밖에 있는 것 같았어요.",
    kind: "long",
    maxLength: 250,
  },
  {
    key: "scene_help",
    phase: "mvp",
    /*
     * 감정을 알아차리는 것이 왜 쓸모 있는지를 학생 입으로 말하게 하는 자리라 뺄 수 없다.
     */
    label: "그 감정을 알아차리고 나니 무엇이 달라졌나요?",
    hint: "아무것도 안 달라졌으면 그렇게 적어도 됩니다.\n예) 화가 난 게 아니라 서운한 거였다는 걸 알고 나니 좀 가라앉았어요.",
    kind: "long",
    maxLength: 250,
  },

  // ── 나의 감정 쓰기 (25분) ───────────────────────────────
  {
    key: "_moodmeter_note",
    phase: "build",
    /*
     * 낱말을 고르기 직전에 축 설명을 다시 붙인다.
     * 지난주에 들은 것이라 일주일이 지나면 남아 있지 않다.
     */
    label: "감정에도 지도가 있어요",
    hint:
      "감정은 좋다/나쁘다 둘로 나뉘지 않아요. 두 개의 축으로 봅니다.\n" +
      "① 기운 — 몸이 들뜨는가, 가라앉는가\n" +
      "② 기분 — 편한가, 불편한가\n\n" +
      "🔴 빨강 — 기운 높음 · 기분 나쁨 (화남 · 긴장됨 · 불안함 · 짜증남)\n" +
      "🟡 노랑 — 기운 높음 · 기분 좋음 (신남 · 기대됨 · 즐거움 · 자신있음)\n" +
      "🔵 파랑 — 기운 낮음 · 기분 나쁨 (슬픔 · 외로움 · 지침 · 심심함)\n" +
      "🟢 초록 — 기운 낮음 · 기분 좋음 (뿌듯함 · 홀가분함 · 편안함 · 차분함)\n\n" +
      "같은 “기분 나쁨” 이라도 화남과 슬픔은 전혀 다른 칸에 있어요.\n" +
      "그 차이를 낱말로 구별하는 것이 오늘의 목표입니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_words_note",
    phase: "build",
    label: "쓰기① 나의 감정 낱말",
    hint:
      "최근 일주일 동안 느낀 감정을 세 개 적어 봅시다.\n" +
      "“기분 나빴다” 말고 더 정확한 낱말을 찾아보세요 — 아래 보기에서 골라도 좋아요.\n" +
      "지난 시간에 쓴 것이 남아 있으면 그대로 두어도 됩니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "word1",
    phase: "build",
    label: "감정 낱말 ① — 그리고 언제 그랬나요?",
    hint: "낱말 하나와, 그때가 언제였는지 한 줄로.\n예) 서운함 — 친구가 약속을 갑자기 취소했을 때",
    kind: "text",
    examples: MOOD_WORDS,
    examplesNote: MOOD_WORDS_NOTE,
    maxLength: 80,
  },
  {
    key: "word2",
    phase: "build",
    label: "감정 낱말 ② — 그리고 언제 그랬나요?",
    hint: "",
    kind: "text",
    examples: MOOD_WORDS,
    examplesNote: MOOD_WORDS_NOTE,
    maxLength: 80,
  },
  {
    key: "word3",
    phase: "build",
    label: "감정 낱말 ③ — 그리고 언제 그랬나요?",
    hint: "",
    kind: "text",
    examples: MOOD_WORDS,
    examplesNote: MOOD_WORDS_NOTE,
    maxLength: 80,
  },
  {
    key: "share_feel",
    phase: "build",
    /*
     * 친구 찾기의 열쇠가 되는 칸.
     *
     * 위 세 칸은 자유롭게 쓰게 두었더니 글자가 저마다 달라서 묶이지 않는다.
     * 감상 화면의 묶기는 글자가 정확히 같아야 걸린다. 그래서 고르는 칸을 하나 둔다.
     */
    label: "위 셋 중에서, 요즘 나를 가장 크게 흔든 감정 하나를 골라 주세요",
    hint: "이 칸으로 나와 비슷한 감정을 고른 친구들을 찾아볼 거예요.",
    kind: "choice",
    choices: MOOD_WORDS,
    maxLength: 0,
  },
  {
    key: "share_line",
    phase: "build",
    /*
     * 친구에게 실제로 보이는 유일한 글이다. 경험 글(draft)은 안 보인다.
     * 길게 쓰면 그만큼 누구인지 짚이고, 위로하는 쪽도 무엇에 답할지 흐려진다.
     */
    label: "그 감정을 한 줄로 적어 주세요 — 이 줄만 친구들에게 보입니다",
    hint:
      "이름은 쓰지 마세요. 친구 이야기는 ○○ 로 적어요.\n" +
      "예) 요즘 학원이 늘어서 지친다 / 친구랑 서먹해져서 서운하다\n" +
      "쓰기 싫으면 비워 둬도 됩니다. 비우면 친구들에게 안 보여요.",
    kind: "text",
    maxLength: 80,
  },
  {
    key: "_draft_note",
    phase: "build",
    label: "쓰기② AI에게 보여줄 글",
    hint:
      "잠시 뒤에 이 글을 AI가 읽고 “어떤 기분이었을까” 를 추측할 거예요.\n" +
      "감정 낱말은 쓰지 마세요. 무슨 일이 있었는지만 적으면 AI가 알아맞혀야 해요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "draft",
    phase: "build",
    /*
     * 렌즈에 보낼 글은 여기서 한 번만 쓴다. 렌즈 화면에 입력칸을 또 두면 학생은
     * 거기에 한 줄로 대충 적고, 그러면 추측이 얕아져서 견줄 것이 없어진다.
     */
    label: "최근에 있었던 일을 2~4문장으로 적어 주세요",
    hint:
      "예) 어제 급식 시간에 친구들이 먼저 가버렸다. 혼자 앉아서 먹었다. 아무도 부르지 않았다.\n" +
      "친구 이름은 ○○ 이라고 적어 주세요. 실명은 쓰지 않아요.\n" +
      "쓰기 싫은 이야기는 안 써도 됩니다 — 편하게 말할 수 있는 일로 고르세요.",
    kind: "long",
    maxLength: 400,
  },

  // ── AI 감정 렌즈 (25분) ─────────────────────────────────
  {
    key: "_lens_note",
    phase: "emotion",
    label: "이제 AI가 내 글을 읽습니다",
    hint:
      "AI는 내 마음을 아는 게 아니라 글자만 보고 추측해요.\n" +
      "맞을 수도 있고 틀릴 수도 있어요. 틀리면 오히려 좋습니다 — 그게 “AI가 못 본 나” 예요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_lens_recap",
    phase: "emotion",
    // 앞에서 쓴 글. 무엇을 보고 추측했는지 견주려면 옆에 있어야 한다
    label: "",
    hint: "",
    kind: "echo",
    echoKeys: [{ key: "draft", label: "내가 쓴 글" }],
    maxLength: 0,
  },
  {
    key: "lens",
    phase: "emotion",
    label: "AI에게 보여주기",
    hint: "위에 쓴 글을 AI가 읽고 감정을 추측해 줍니다. 점수를 매기는 게 아니에요.",
    kind: "emotion_lens",
    lensSourceKey: "draft",
    maxLength: 0,
  },
  {
    key: "verdict",
    phase: "emotion",
    /*
     * 판정이 이 활동의 본체다. AI 결과만 저장하면 수업이 아니라 측정이 된다.
     * 세 칸으로 나눈 이유: "맞았다/틀렸다" 둘로만 두면 가운데가 없어 아무 쪽이나 고른다.
     */
    label: "AI의 추측, 내 마음과 얼마나 비슷한가요?",
    hint: "",
    kind: "choice",
    choices: ["비슷해요", "조금 달라요", "전혀 달라요"],
    maxLength: 0,
  },
  {
    key: "compare_hit",
    phase: "emotion",
    label: "AI가 맞힌 것과 어긋난 것을 적어 주세요",
    hint: "예) 서운한 건 맞혔는데, 사실 화도 났다는 건 못 봤어요.",
    kind: "long",
    maxLength: 300,
  },
  {
    key: "compare_why",
    phase: "emotion",
    /*
     * "감정 차이가 발생한 이유" 를 AI 상대로 옮긴 문항. 이 답이 수행 기록의 핵심이다.
     * 「정답은 나에게 있다」 가 여기서 학생 입으로 나온다.
     */
    label: "AI가 내 글에서 못 본 것은 무엇일까요?",
    hint:
      "AI는 글에 적힌 것만 봐요. 글에 안 적힌 게 있지 않나요?\n" +
      "예) 그 친구랑 원래 제일 친해서 더 서운했다는 걸 안 적었어요.",
    kind: "long",
    maxLength: 300,
  },

  /*
   * ── 회고 뒤 · 감정 조절하기 ──────────────────────────────
   *
   * 여기까지가 자기 영역의 **감정 인식하기** 다. 낱말로 구별하고, 글로 적고, AI 추측과
   * 견줘 봤다. 남은 시간에 그 다음 걸음을 뗀다 — 알아차린 감정을 **어떻게 다룰 것인가.**
   *
   * 서울시교육청 사회정서교육자료 활동지 3(감정 지도)·4(힐링 스페이스)를 옮긴 것이다.
   * 원본의 발표와 전시는 뺐다 — "친구들의 발표에서 배운 점" 칸과 "완성된 그림을 교실에
   * 전시하고 친구들과 감정을 나눠봅니다" 가 그것이다.
   *
   * ## 단계 칸을 어떻게 나눴나
   *
   * 목록에 박힌 차례(types.ts 의 LESSON_PHASES)에서 AI 감정 렌즈(emotion) 뒤에 남은
   * 칸은 마음일기뿐이다. 그래서 앞쪽 빈 칸을 빌려 쓰고, **교사가 렌즈 다음에 이 단추를
   * 누른다.** 교사 화면은 단계를 자유롭게 오갈 수 있어서 순서가 강제되지 않는다.
   *
   * 그리기는 draw 칸에 묶여 있어 옮길 수가 없다. 그 칸이 활동지·감상과 한 묶음이라,
   * 힐링 스페이스 준비·계획을 worksheet 에 두어 그리기 화면의 「활동지 쓰기」 탭을 채운다.
   * 그래서 「나의 감정 쓰기」를 build 로 옮겼다 — worksheet 을 비워야 자리가 났다.
   */

  // ── 감정 지도 만들기 (회고 뒤) ───────────────────────────
  {
    key: "_map_note",
    phase: "wrapmap",
    /*
     * 배치도를 답하는 칸 바로 위에 둔다.
     *
     * 새 창으로 띄우면 학생이 그 창에서 안 돌아오고, 돌아와도 그림을 다시 못 찾는다.
     * 태블릿에서는 두 손가락으로 키워 볼 수 있다.
     */
    label: "우리 학교 어디에서, 나는 어떤 마음이 되나요?",
    hint:
      "여기까지는 내 감정을 알아차리는 연습이었어요. 이제 그 감정을 어떻게 다룰지 해 봅니다.\n" +
      "같은 학교 안에서도 장소마다 마음이 달라져요. 편해지는 곳이 있고 굳어지는 곳이 있습니다.\n" +
      "아래 배치도를 보면서 떠올려 보세요. 손가락 두 개로 벌리면 크게 볼 수 있어요.",
    kind: "note",
    imageUrl: SCHOOL_MAP,
    imageAlt: "2026 장평중학교 교실배치도",
    maxLength: 0,
  },
  {
    key: "map_most",
    phase: "wrapmap",
    label: "학교에서 가장 많이 찾는 장소는 어디인가요?",
    hint: "쉬는 시간이나 점심시간에 자연스럽게 발이 가는 곳이요.\n예) 급식실 앞 복도",
    kind: "text",
    maxLength: 60,
  },
  {
    key: "map_marks",
    phase: "wrapmap",
    /*
     * 원본의 "배치도에 이모티콘·색상·짧은 단어로 감정을 표시" 자리.
     *
     * 그림 대신 줄로 받는다. 한 줄에 하나씩 적게 하면 세 곳이 서로 견줘지고,
     * 반 전체를 모아 보면 "우리 학교의 감정 지도" 가 실제로 만들어진다 —
     * 종이 활동지로는 못 하던 것이다.
     */
    label: "장소마다 내 마음을 적어 주세요 — 세 곳 이상",
    hint: "한 줄에 한 곳씩 적어요. [+ 줄 추가] 로 늘리고, 필요 없는 줄은 지우면 됩니다.",
    kind: "rows",
    rowColumns: [
      { key: "place", label: "장소", placeholder: "예) 도서실" },
      { key: "feel", label: "그때 내 마음", placeholder: "예) 편안함" },
      {
        key: "emoji",
        label: "이모지 (골라도 되고 안 골라도 돼요)",
        /*
         * 무드미터 네 사분면에서 셋씩 골랐다 — 빨강·노랑·파랑·초록.
         * 열여섯을 다 두면 고르는 데 시간이 더 들고, 태블릿에서 두 줄을 넘긴다.
         */
        emojis: ["😠", "😬", "😰", "😄", "🤩", "😆", "😢", "😔", "🥱", "😌", "🙂", "😴"],
      },
    ],
    maxRows: 10,
    /*
     * JSON 배열로 한 칸에 담긴다 (rows-field 참조). 열 줄에 칸 셋이면 넉넉히 잡아도
     * 1,500자 안쪽이라 2,000 이면 잘릴 일이 없다.
     */
    maxLength: 2000,
  },
  {
    key: "map_hard",
    phase: "wrapmap",
    label: "그중에서 부정적인 감정이 자주 드는 곳은 어디인가요?",
    hint: "없으면 「없음」 이라고 적어도 됩니다. 그것도 답이에요.",
    kind: "text",
    maxLength: 60,
  },
  {
    key: "map_strategy",
    phase: "wrapmap",
    /*
     * 원본은 세 가지를 고르게 한다. 화면에서 개수를 막지는 않는다 —
     * 못 고르게 막으면 그 자리에서 손을 들고, 그 사이 나머지가 멈춘다.
     */
    label: "그곳에서 써 볼 수 있는 감정 조절 전략을 골라 주세요 (세 가지)",
    hint: "여기 없는 방법이 있으면 아래 칸에 적어도 좋아요.",
    kind: "multi",
    choices: STRATEGIES,
    maxLength: 0,
  },
  {
    key: "map_mine",
    phase: "wrapmap",
    /*
     * 원본 5번 "나만의 감정 조절 전략 (상황, 행동이 구체적으로 드러나게)".
     * 이 칸이 활동지 3의 결론이다 — 고른 것이 아니라 만든 것이라야 실제로 쓴다.
     *
     * 원본 4번(효과적일 것 같은 이유)은 뺐다. 회고 뒤 활동이라 시간이 짧고,
     * 이 칸이 그 답을 이미 품는다.
     */
    label: "나만의 감정 조절 전략을 한 문장으로 만들어 주세요",
    hint:
      "언제(상황)와 무엇을 할지(행동)가 다 들어가야 해요.\n" +
      "예) 쉬는 시간에 3층 복도가 시끄러워 짜증날 때 → 도서실에 가서 5분 앉아 있기",
    kind: "long",
    maxLength: 250,
  },

  // ── 힐링 스페이스 만들기 (그리기 화면의 활동지 탭) ────────
  {
    key: "_heal_note",
    phase: "wrapheal",
    label: "내가 회복되는 자리를 만들어 봅시다",
    hint:
      "최근에 마음이 편안했던 순간을 떠올려 보세요. 그때 주변에 무엇이 있었나요?\n" +
      "여기 적은 것을 가지고 옆 [그림 그리기] 에서 나만의 공간을 그립니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "heal_color",
    phase: "wrapheal",
    label: "나를 차분하게 해주는 색은?",
    hint: "예) 연한 초록",
    kind: "text",
    maxLength: 40,
  },
  {
    key: "heal_place",
    phase: "wrapheal",
    label: "마음이 편안해지는 공간은?",
    hint: "예) 창가 옆 햇빛 드는 자리",
    kind: "text",
    maxLength: 60,
  },
  {
    key: "heal_thing",
    phase: "wrapheal",
    label: "감정을 회복시켜 주는 물건은?",
    hint: "예) 푹신한 쿠션, 작은 화분",
    kind: "text",
    maxLength: 60,
  },
  {
    key: "plan_when",
    phase: "wrapheal",
    /*
     * 원본의 활용 계획 넷(이름·언제·어디서·어떻게)을 둘로 줄였다. 회고 뒤 활동이라
     * 시간이 짧고, 실제로 쓰이게 하는 데 필요한 것은 **언제**와 **어떻게** 다.
     */
    label: "언제 쓸까요? (시간·상황)",
    hint: "예) 시험 공부하다 집중이 안 될 때 / 마음이 불안하거나 짜증이 날 때",
    kind: "text",
    maxLength: 100,
  },
  {
    key: "plan_how",
    phase: "wrapheal",
    label: "어떻게 활용할까요? (구체적으로)",
    hint:
      "「~할 때 → ~하기」 로 적으면 쉬워요.\n" +
      "예) 집에서 숙제하다 지칠 때 → 10분간 내 힐링 스페이스에서 음악 듣기",
    kind: "long",
    maxLength: 250,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "디지털 마음 톡톡 3회기 — 내 감정 알아차리기 (이어서)",

  /*
   * 마음 체크인은 이 프로그램의 매 시간 첫 화면이다.
   *
   * 무드미터를 쓰는 것 자체가 오늘 배울 기술(감정 인식)의 연습이고, 8회기 발표회에서
   * 학기 전체 감정 변화를 되돌아보는 원재료가 여기서 쌓인다.
   */
  moodCheckEnabled: true,

  // 분반은 2회기와 같은 값을 유지한다. 바꾸면 데이터 통이 갈려 지난 답이 안 열린다
  groups: [
    { key: "mt-tue-1", label: "화요일 1기", classNo: 1 },
    { key: "mt-thu-1", label: "목요일 1기", classNo: 2 },
    { key: "mt-tue-2", label: "화요일 2기", classNo: 3 },
    { key: "mt-thu-2", label: "목요일 2기", classNo: 4 },
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
   * 오늘은 진도 안내 칸을 쓴다.
   *
   * 2회기에는 비워 두었다 — 단계 차례가 「진도 안내 → 영상」 으로 고정이라, 영상을
   * 맨 앞으로 옮기는 순간 이 칸이 영상보다 앞에 서기 때문이었다. 오늘은 영상이
   * 없으므로 그 문제가 없고, 다섯 걸음을 먼저 보여주는 편이 낫다.
   */
  progress: {
    heading: "오늘 할 일",
    body:
      "지난 시간에 감정 낱말 퀴즈와 인사이드 아웃 활동지까지 했어요. 오늘은 그 뒤를 합니다.\n\n" +
      "① 영화·예능 속 내 마음 — 내 마음과 가까운 장면 하나 고르기\n" +
      "② 나의 감정 쓰기 — 낱말 세 개, 그리고 AI에게 보여줄 글\n" +
      "③ 서로의 마음 읽기 — 같은 감정을 고른 친구 찾아보기\n" +
      "④ AI 감정 렌즈 — AI가 내 글을 읽고 감정을 추측합니다\n" +
      "⑤ 마음일기\n\n" +
      "마음일기까지 하고 나서, 시간이 남으면 두 가지를 더 합니다 — 감정 지도, 힐링 스페이스.\n" +
      "여기까지가 감정을 알아차리는 연습이었다면, 그 둘은 알아차린 감정을 다루는 연습이에요.\n\n" +
      "지난 시간에 쓴 것은 그대로 남아 있어요. 비어 있는 칸만 채우면 됩니다.\n" +
      "친구에게 보이는 것은 고른 감정과 한 줄뿐이에요. 나머지는 나만 봅니다.",
    url: "",
  },
  assessment: empty(),
  video: empty(),

  /*
   * 마음일기 — 매 회기 반복 루틴이다.
   *
   * 원본 자료가 멘티미터로 전체 시각화를 하는 자리인데, 감정 이야기를 교실 앞 화면에
   * 띄우는 것은 이 프로그램에서 하지 않는다. 대신 각자에게 남긴다.
   * reflectionPublic 은 반드시 false — 친구에게 보이면 아무도 솔직하게 안 쓴다.
   */
  reflectionQuestions: [
    "오늘 마음에 남는 순간은 언제였나요? 무엇 때문에 그랬는지도 함께 적어 주세요.",
    "지금 내 기분은 어떤가요? 그리고 왜 그런 것 같나요?",
    "오늘의 나에게 해주고 싶은 말 한마디를 적어 주세요.",
  ],
  reflectionPublic: false,

  /*
   * 서로의 마음 읽기에서 친구가 만든 감정 캐릭터를 새 창으로 연다.
   * 그걸 이탈로 세면 기록이 온통 빨갛게 되고, 더 나쁜 것은 학생이 눈치를 보느라
   * 안 열어 보는 것이다.
   */
  // 감상은 친구 캔바를 새 창으로 열고, 그리기는 그림판이 다른 화면처럼 잡힌다
  focusExempt: ["gallery", "draw"],

  /*
   * 학생이 지나온 단계로 돌아갈 수 있게 한다.
   *
   * AI 렌즈에서 "글에 이걸 안 적었네" 를 깨닫고 앞 글을 고치러 가는 것이 이 활동의
   * 자연스러운 흐름이다. 앞 단계로는 여전히 못 간다.
   */
  freeNavigation: true,

  /*
   * 단계 이름. 화면에 "mvp" 나 "wrapmap" 같은 말은 아무 데도 안 보인다.
   *
   * 감정 조절 두 활동은 회고 뒤 칸(wrapmap·wrapheal)에 있다. 그래서 교사 단추 줄과
   * 학생의 되돌아가기 목록이 실제 수업 차례와 같은 순서로 읽힌다.
   */
  phaseLabels: {
    mood: "마음 체크인",
    progress: "오늘 할 일",
    mvp: "영화·예능 속 내 마음",
    build: "나의 감정 쓰기",
    gallery: "서로의 마음 읽기",
    emotion: "AI 감정 렌즈",
    reflection: "마음일기",
    wrapmap: "감정 지도",
    wrapheal: "힐링 스페이스",
  },

  activity: {
    activityId: ACTIVITY_ID,
    /*
     * 그리기를 켠다 (회고 뒤 힐링 스페이스). 이 값이 비어 있으면 그림판이 아예 안 뜬다.
     *
     * 원래 "무엇을 그릴 장소인가" 를 고르는 칸인데, 여기서는 **내 힐링 스페이스가
     * 어디에 있는 곳인지** 를 고르는 데 쓴다.
     *
     * 켜는 순간 그리기·활동지·감상이 한 묶음으로 묶여 탭 세 개가 생긴다. 앞 단계
     * (영화·예능·나의 감정 쓰기)는 STEP 단계라 탭 없이 그대로다.
     */
    places: ["내 방", "우리 집 어딘가", "학교 안", "동네", "상상 속의 곳"],
    year: 2026,
    worksheet: WORKSHEET,

    /*
     * 그림 제목의 틀.
     *
     * 기본 틀은 "○○년의 △△" 인데, 그건 미래를 상상해 그리는 정보과 차시에서 나온
     * 것이다. 힐링 스페이스는 미래가 아니라 지금 내가 쉬는 자리라 "2026년의 내 방" 이
     * 어색하게 읽힌다. 그림판 제목과 작품 카드에 함께 쓴다 (artifact-title.ts).
     */
    artifactTitle: "나만의 힐링 스페이스: {장소}",

    /*
     * 활동지를 그리기 앞에 둔다.
     *
     * 색·공간·물건을 먼저 정하고 그것을 그리는 활동이다. 그림판이 먼저 뜨면 학생이
     * 백지부터 마주하고, 그러면 "뭘 그리지" 로 몇 분이 간다. 탭 차례가 곧 순서
     * 안내라서, 왼쪽에 활동지가 서 있어야 말로 일러 주지 않아도 그쪽부터 누른다.
     */
    worksheetFirst: true,

    /*
     * 그리기 첫 화면 문구. 기본값은 미래 도시를 그리는 정보과 차시용이라 그대로 두면
     * 학생이 그쪽을 그린다 — 그리기 화면은 활동지와 따로 뜨는 화면이라 안내를 여기
     * 두지 않으면 닿을 방법이 없다.
     */
    drawPrompt: {
      heading: "나만의 힐링 스페이스",
      body:
        "왼쪽 [활동지 쓰기] 에 적은 것을 그대로 그리면 됩니다.\n" +
        "· 적은 색으로 칠하고  · 적은 공간의 모양을 잡고  · 적은 물건을 그려 넣으세요.\n" +
        "새로 상상하지 않아도 돼요. 이미 다 적어 뒀습니다.\n" +
        "잘 그리는 시간이 아니에요 — 선·모양·무늬만으로도 충분합니다.\n" +
        "먼저 그 공간이 어디에 있는 곳인지 골라 주세요.",
    },

    /*
     * 그리기 옆 활동지 탭의 머리글. 기본값("무엇을 그렸는지 적어 주세요")을 그대로 두면
     * 그림 설명을 적는 칸으로 읽힌다 — 여기는 그리기 전에 재료를 모으는 자리다.
     */
    worksheetIntro: {
      heading: "힐링 스페이스",
      body:
        "먼저 여기에 색·공간·물건을 적습니다. 그 다음 오른쪽 [그림 그리기] 에서 적은 대로 그려요.",
    },

    /*
     * 서로의 마음을 나누는 시간을 연다. **다만 여는 칸을 딱 셋으로 못 박는다.**
     *
     * "나만 그런 게 아니구나" 는 사회정서학습에서 가장 크게 작동하는 경험이라 열 값이
     * 있다. 하지만 활동지를 통째로 열면 경험 글(draft)·AI 비교·마음일기까지 반 전체에
     * 걸린다 — 그건 나누는 것이 아니라 새는 것이다.
     *
     * 거르는 자리는 서버다 (gallery 라우트). 화면에서 고르면 안 보일 뿐 응답에는
     * 실려 있어서, 개발자 도구를 여는 학생 하나면 다 읽힌다.
     *
     * canva_url 은 2회기에 만든 감정 캐릭터다. 절반쯤만 있지만, 있는 사람 것은
     * 보이는 편이 낫다 — 오늘 새로 만들지는 않는다.
     */
    galleryEnabled: true,
    galleryAnswerKeys: ["share_feel", "share_line", "canva_url"],
    galleryNoun: "이야기",

    /*
     * 같은 감정을 고른 친구끼리 모이게 하는 묶음. 이 활동의 핵심 장치다.
     * 자유롭게 쓴 낱말 세 칸이 아니라 고르는 칸(share_feel)을 쓰는 이유는,
     * 묶기가 글자가 정확히 같아야 걸리기 때문이다.
     */
    galleryFacets: [{ key: "feel", label: "같은 감정을 고른 친구", answerKeys: ["share_feel"] }],

    /*
     * 남기는 칸은 **하나뿐이다.**
     *
     * 기본은 두 칸(관찰 하나, 질문 하나)인데, 둘째 칸을 그대로 두면 힘든 이야기를
     * 꺼낸 친구에게 "왜 그런 일이 있었어?" 가 달린다. 위로가 아니라 취조가 된다.
     * 이름표를 비우면 그 칸이 통째로 빠진다 (gallery-view 의 FeedbackForm).
     */
    feedbackPrompts: {
      found: {
        label: "이 친구에게 해주고 싶은 따뜻한 말 한마디",
        placeholder: "예) 나도 요즘 비슷해. 혼자만 그런 거 아니야.",
      },
      question: { label: "", placeholder: "" },
    },

    /*
     * 출처 두 칸을 안 띄운다.
     *
     * 그 칸은 정보과 수행평가1이 "출처 밝히기 태도" 를 평가해서 고정으로 붙어 있던
     * 것이다(PRD 7). 이 프로그램에는 그 평가가 없고, 오늘 하는 일은 자료를 찾는 것이
     * 아니라 내 마음을 들여다보는 것이다.
     *
     * 하필 붙는 자리가 AI 감정 렌즈다 — 마지막 단계에 붙기 때문이다(lastStepPhase).
     * 방금 내 이야기를 AI에게 보여주고 "AI가 못 본 나" 를 적은 화면 바로 아래에
     * "어디에서 찾아봤나요" 가 오면 그 흐름이 끊긴다.
     *
     * 2회기에는 끌 방법이 없어서 예시만 이 수업에 맞게 바꿔 두었었다.
     */
    sourcesEnabled: false,
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (2회기와 같음 — 절반쯤 쓴 칸이 그대로 열립니다)`);
  console.log(`차시 번호 ${LESSON_NO}`);
  console.log("단계: 대기 → 마음 체크인 → 오늘 할 일 → 영화·예능 속 내 마음");
  console.log("      → 나의 감정 쓰기 → 서로의 마음 읽기 → AI 감정 렌즈 → 마음일기");
  console.log("\n친구에게 보이는 칸: 고른 감정 · 한 줄 · 감정 캐릭터 주소");
  console.log("나가지 않는 것: 경험 글 · AI 비교 · 마음일기");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
