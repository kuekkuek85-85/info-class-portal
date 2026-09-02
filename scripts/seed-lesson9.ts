/**
 * 9차시 차시 계획 등록 — 「디지털 윤리 ① 개인정보 보호」.
 *
 *   node --env-file=.env.local scripts/seed-lesson9.ts
 *
 * ## 이 차시는 슬라이드가 주인공이다
 *
 * 전년도 슬라이드 23장이 이미 있다. 포털이 그것을 옮겨 담을 이유가 없다 — 옮기면
 * 두 벌이 되고, 고칠 때마다 어느 쪽이 최신인지 알 수 없게 된다. 포털은 슬라이드가
 * 못 하는 것만 맡는다.
 *
 *   · 기분 체크와 출석
 *   · **속아 보기** — 피싱·파밍·스미싱을 한 장면씩 겪는다 (scam-sim)
 *   · **마스킹 해 보기** — 어디까지가 개인정보인지 눌러서 가린다 (masking-field)
 *   · 활동 주소를 **누를 수 있게** 주기 (칠판의 bit.ly 를 손으로 옮겨 적으면 5분이 간다)
 *   · 성찰
 *
 * ## 슬라이드를 겪는 것으로 바꾼 자리
 *
 * 슬라이드 8~15는 피싱·파밍·스미싱·보이스피싱을 **설명한다.** 설명을 먼저 들으면
 * "조심해야겠다" 로 끝나고 그 다음 주에 똑같이 당한다. 그래서 설명 앞에 한 번 속아
 * 보는 자리를 둔다 — 틀린 다음에 듣는 설명만 남는다.
 *
 * 슬라이드 18의 마스킹 체험(뤼튼 스토어)은 **도메인 자체가 없어져서**(store.wrtn.ai)
 * 포털 안에 직접 만들었다. 개인정보 수업에서 개인정보가 든 문장을 남의 서비스에
 * 넣게 하는 것이 앞뒤가 안 맞기도 했다.
 *
 * 나머지 둘은 접속을 확인하고 그대로 쓴다 — wordwall 퀴즈와 security.org.
 *
 * ## 진짜 비밀번호를 넣게 하지 않는다
 *
 * 슬라이드 19는 "자신의 비밀번호를 테스트해보세요" 라고 한다. 그런데 오늘 수업이
 * 가르치는 것이 바로 **모르는 사이트에 비밀번호를 넣지 말라**는 것이다. 시키는 대로
 * 하면 수업이 스스로를 뒤집는다. 학생도 그 모순을 알아챈다.
 *
 * 그래서 "길이와 모양만 비슷한 가짜를 넣어 보라" 로 바꾼다. 충격은 그대로 남고
 * (여덟 자리 소문자가 몇 초에 뚫리는 것은 진짜든 가짜든 같다), 모순은 사라진다.
 * 오히려 "왜 진짜를 넣으면 안 될까" 가 그 자리에서 생기는 질문이 된다.
 *
 * ## 수행평가 재료는 여기서 안 모은다
 *
 * 원래 끝 10분에 원인·피해 두 칸을 두려 했다가 뺐다. 슬라이드 23장에 활동까지 있어
 * 40분이 빠듯하다. 대신 성찰 한 문항이 그 자리를 가볍게 대신한다 — 11차시에 쓸 때
 * 자기가 쓴 한 줄을 다시 열어 보면 된다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import type {
  LessonPlan,
  MaskLine,
  PhaseContent,
  ScamScene,
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
    privateKey: requiredEnv("FIREBASE_PRIVATE_KEY")
      .replace(/^["']|["']$/g, "")
      .replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const LESSON_PLANS = "lessonPlans";
const LESSON_NO = 9;

/**
 * 학생이 들어와 있는 수업에도 계획을 덮어쓴다.
 *
 * 기본은 안 덮는다 — 수업 중에 화면이 바뀌면 쓰던 것이 끊긴다. 다만 수업 전날
 * **시험 삼아 한 명 들어와 본 것** 때문에 정작 그날 계획이 안 들어가는 일이 있어서
 * 열어 둔다. 아무도 아직 안 썼는지 눈으로 확인하고 쓰는 스위치다.
 */
const FORCE = process.argv.includes("--force");

/**
 * 새 활동 통. 기사(career-plan)와 **섞지 않는다.**
 *
 * 같은 통에 넣으면 어제 통과받은 스물넷의 "끝났다" 가 풀린다 — 게임 화면이 활동지로
 * 되돌아가고, 판정도 다시 계산된다. 9·10·11차시는 이 통을 함께 쓰므로, 오늘 쓴 한 줄이
 * 11차시 수행평가 화면에서 그대로 열린다.
 */
const ACTIVITY_ID = "digital-ethics";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/**
 * 속아 보는 세 장면. 순서가 설계다.
 *
 * 피싱에서 "주소를 봐라" 를 배운 **직후에** 파밍이 온다. 주소를 제대로 보고도 당하는
 * 것을 겪어야 파밍이 무엇인지 남는다. 순서를 바꾸면 파밍은 그냥 어려운 낱말이 된다.
 *
 * 주소는 다 가짜다. 네이버를 흉내 내되 실제로 존재할 수 있는 주소는 피한다 — 화면에
 * 띄운 주소를 그대로 쳐 보는 학생이 반드시 나온다.
 */
const SCENES: ScamScene[] = [
  /*
   * 직접 당해 보기 — 가짜 로그인 화면에 실제로 쳐 본다.
   *
   * 설명을 먼저 들으면 "조심해야지" 로 끝난다. 자기 손으로 비밀번호를 치고 그것이
   * 그대로 튀어나오는 것을 봐야 남는다. 그래서 이것을 맨 앞에 둔다 — 당한 다음에
   * 듣는 "주소를 봤어야 했다" 만 기억에 붙는다.
   *
   * 이 화면은 학생이 친 것을 어디로도 안 보낸다 (public/phish-demo/naver-login.html).
   */
  {
    mode: "login",
    title: "① 직접 당해 봅시다",
    prompt:
      "네이버 로그인 화면입니다. 아무 아이디와 비밀번호나 넣고 로그인을 눌러 보세요. (진짜 비밀번호 말고요!)",
    embedUrl: "/phish-demo/naver-login.html",
    // 화면은 진짜 같아도 주소가 가짜다. 이 한 줄이 이 활동이 가르칠 것이다
    shownUrl: "http://naver.login-authkr.com/nidlogin",
    answer:
      "방금 친 비밀번호가 그대로 보였죠? 진짜였다면 그 순간 남의 손에 넘어갔습니다. 화면은 진짜 같아도 주소가 가짜였어요.",
    clues: [
      "주소를 보세요 — naver.com 이 아니라 login-authkr.com 입니다. 화면이 아니라 주소가 진짜와 가짜를 가릅니다",
      "http 로 시작하고 자물쇠가 없어요",
      "로그인 화면이 문자나 메일 링크로 열렸다면, 치기 전에 주소부터 의심하세요",
    ],
  },
  {
    mode: "compare",
    title: "② 이번엔 눈으로 — 어느 쪽이 가짜?",
    prompt: "두 로그인 화면의 주소입니다. 어느 쪽이 가짜일까요? 주소만 보세요.",
    sites: [
      { url: "https://nid.naver.com/nidlogin.login", caption: "가", fake: false },
      { url: "http://nid-naver.login-kr.com/nidlogin", caption: "나", fake: true },
    ],
    answer: "「나」 가 가짜입니다. 눌렀다면 아이디와 비밀번호가 그대로 넘어갔을 거예요.",
    clues: [
      "진짜 주소는 naver.com 으로 끝납니다. 가짜는 login-kr.com 으로 끝나요 — 앞에 naver 를 붙여 눈을 속입니다",
      "점(.) 앞뒤를 보세요. nid.naver.com 은 네이버의 방이고, nid-naver 는 이름만 흉내 낸 남의 집입니다",
      "가짜는 http 로 시작합니다. 자물쇠가 없어요",
    ],
  },
  {
    mode: "type",
    title: "③ 파밍 — 맞게 쳤는데도",
    prompt:
      "이번엔 링크를 안 누르고 주소창에 직접 칩니다. www.naver.com 을 쳐서 들어가 보세요.",
    expect: "www.naver.com",
    // 학생에게 익숙한 곳으로 튕겨야 "어? 네이버를 쳤는데 학교가?" 가 확실하게 온다
    redirectUrl: "jangpyung.sen.ms.kr",
    answer:
      "분명 www.naver.com 을 쳤는데 학교 홈페이지가 열렸죠? 이것이 파밍입니다 — 내 컴퓨터 속 ‘주소록’(hosts 파일)이 몰래 바뀌면, 맞는 주소를 쳐도 다른 곳으로 갑니다.",
    clues: [
      "피싱과 다른 점이 이거예요 — 주소를 아무리 잘 봐도 못 잡습니다. 내가 친 주소는 진짜였으니까요",
      "내 컴퓨터나 공유기가 나쁜 프로그램에 감염되면 이렇게 됩니다. 그래서 백신을 켜 두는 것이 막는 방법이에요",
      "PC방·카페 같은 공용 컴퓨터에서 로그인이나 결제를 안 하는 것도 파밍을 피하는 길입니다",
    ],
  },
  {
    mode: "message",
    title: "④ 스미싱 — 문자로 오는 낚싯바늘",
    prompt: "이런 문자가 왔습니다. 누르시겠어요?",
    sender: "[Web발신] 010-3XXX-9187",
    body: "[택배] 주소 불일치로 배송이 보류되었습니다.\n아래에서 주소를 다시 확인해 주세요.",
    linkText: "hxxp://bit.ly/dlv-check-kr",
    linkUrl: "http://cj-delivery.track-kr.top/login",
    answer:
      "안 누르는 것이 맞습니다. 눌렀다면 택배사를 흉내 낸 곳으로 갔고, 거기서 앱을 깔라고 했을 거예요.",
    clues: [
      "주문한 적 없는 택배입니다. 먼저 그것부터 생각하세요",
      "짧은 주소(bit.ly 같은 것)는 진짜 주소를 가립니다 — 어디로 가는지 볼 수가 없어요",
      "확인하려면 문자 속 링크가 아니라 택배사 앱이나 공식 번호로 확인합니다",
    ],
  },
];

/**
 * 마스킹할 문장.
 *
 * 낱말 단위로 넉넉히 쪼갠다 — 누를 수 있는 조각이 곧 판단할 거리이고, 조사까지 눌리면
 * 무엇을 고르라는 것인지 흐려진다.
 *
 * 이름·전화번호는 누구나 고른다. 진짜 배울 것은 **학교·학년·반·번호**다. 하나씩 보면
 * 아무것도 아닌데 합치면 한 사람이 특정된다 — 슬라이드 4가 말하는 그것이다.
 */
const MASK_LINES: MaskLine[] = [
  {
    parts: [
      { text: "안녕하세요," },
      { text: "저는" },
      { text: "장평중학교", hide: true },
      { text: "1학년", hide: true },
      { text: "4반", hide: true },
      { text: "12번", hide: true },
      { text: "김민수", hide: true },
      { text: "입니다." },
    ],
  },
  {
    parts: [
      { text: "궁금한" },
      { text: "점이" },
      { text: "있으면" },
      { text: "010-1234-5678", hide: true },
      { text: "로" },
      { text: "연락" },
      { text: "주세요." },
      { text: "집은" },
      { text: "역곡역", hide: true },
      { text: "근처예요." },
    ],
  },
];

const WORKSHEET: WorksheetQuestion[] = [
  /*
   * 속아 보기 — 「함께 해 볼 것」 앞의 독립된 단계다.
   *
   * 같은 활동지에 이어 붙이지 않는다. 한 화면에 다 있으면 학생이 아래로 훑어 내려가면서
   * 답을 먼저 보고, 그러면 속아 보는 일이 안 일어난다. 교사가 단계를 넘겨야 다음이
   * 열리므로 셋을 같은 속도로 지날 수 있다.
   */
  {
    key: "pi_sim",
    phase: "problem",
    label: "한 번 속아 봅시다",
    hint:
      "설명을 듣기 전에 먼저 해 보세요. 틀려도 괜찮습니다 — 틀리는 것이 오늘 활동입니다.\n" +
      "고르고 나면 무엇을 보고 알 수 있었는지 알려 줍니다.",
    kind: "scam_sim",
    scenes: SCENES,
    maxLength: 20,
  },

  {
    key: "_pi_note",
    phase: "worksheet",
    label: "오늘은 화면으로 함께 봅니다",
    hint:
      "설명은 앞 화면으로 같이 봐요. 이 화면에서는 세 가지를 합니다.\n\n" +
      "· 마스킹 해 보기\n" +
      "· 개인정보 찾기 퀴즈 풀기\n" +
      "· 비밀번호가 얼마나 버티는지 보기",
    kind: "note",
    maxLength: 0,
  },

  /*
   * 마스킹 체험 — 슬라이드 18이 쓰던 뤼튼 앱을 대신한다 (도메인이 사라졌다).
   *
   * 바깥 사이트로 안 나간다. 그 편이 빠르기도 하지만, 개인정보 수업에서 개인정보가
   * 들어간 문장을 남의 서비스에 넣게 하는 것이 앞뒤가 안 맞기도 한다.
   */
  {
    key: "pi_mask",
    phase: "worksheet",
    label: "가려 봅시다 — 어디까지가 개인정보일까",
    hint:
      "아래 자기소개에서 개인정보라고 생각하는 낱말을 눌러 가려 보세요.\n" +
      "이름과 전화번호만 가리면 될까요? 한 번 더 생각해 보세요.",
    kind: "masking",
    maskLines: MASK_LINES,
    maxLength: 20,
  },

  {
    key: "_pi_quiz",
    phase: "worksheet",
    label: "활동 1 · 이건 개인정보일까?",
    hint: "두 개 중에서 개인정보인 쪽을 고르는 퀴즈입니다. 새 창으로 열려요.",
    kind: "note",
    linkUrl: "https://wordwall.net/ko/resource/73876091",
    linkLabel: "퀴즈 열기",
    maxLength: 0,
  },

  /*
   * 쓰는 칸을 따로 두지 않는다.
   *
   * 「다 했어요」 는 답이 하나라도 있어야 받아 준다. 그 자리는 마스킹과 속아 보기가
   * 채운다 — 둘 다 결과를 한 줄로 남긴다("7/7", "2/3"). 그래서 쓰기 칸이 없어도
   * 제출이 막히지 않는다.
   *
   * 40분에 슬라이드 23장과 활동 넷이 들어간다. 여기서 쓰기를 하나 더 얹으면 마지막
   * 활동이 밀려 나간다. 정리는 성찰 한 문항이 맡는다.
   */
  {
    key: "_pi_password",
    phase: "worksheet",
    label: "활동 2 · 이 비밀번호는 얼마나 버틸까",
    /*
     * 경고를 안내의 맨 앞에 둔다. 뒤에 붙이면 이미 자기 비밀번호를 치고 난 뒤에 읽는다.
     */
    hint:
      "진짜 비밀번호는 넣지 마세요. 오늘 배우는 것이 바로 그것입니다.\n\n" +
      "길이와 모양만 비슷한 가짜를 만들어 넣어 보세요.\n" +
      "예) 진짜가 영문 소문자 여덟 자리라면 → abcdefgh\n\n" +
      "그다음 대문자·숫자·기호를 하나씩 섞어 가며 시간이 어떻게 바뀌는지 보세요.",
    kind: "note",
    linkUrl: "https://www.security.org/how-secure-is-my-password/",
    linkLabel: "테스트 열기",
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  /*
   * 「디지털 시민 리포트」 를 안 쓴다.
   *
   * 그 이름은 진로 기사에 붙어 있고, 어제 스물넷이 그것을 끝냈다. 오늘 같은 이름이
   * 뜨면 "끝난 걸 또 하나" 로 읽힌다. 셋(9·10·11차시)이 한 묶음인 것은 번호로 보인다.
   */
  title: "디지털 윤리 ① — 개인정보 보호",
  moodCheckEnabled: true,

  game: {
    heading: "기다리는 동안 — 똥 피하기",
    body:
      "위에서 떨어지는 똥을 좌우로 피하세요. 한 번이라도 맞으면 끝이에요.\n화살표 키나 화면 좌·우를 누르면 움직입니다.\n수업이 시작되면 닫습니다.",
    url: "https://dodge-poop-game.vercel.app/",
  },
  gameExplainer: empty(),
  progress: empty(),
  video: empty(),

  assessment: {
    heading: "오늘 할 일 — 개인정보 보호",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘 배울 것",
        subtitle: "개인정보가 무엇이고, 어떻게 지키는가",
        note: "설명은 앞 화면으로 같이 봅니다.",
        rows: [
          { label: "① 개인정보란", value: "무엇이 개인정보인지, 어떤 종류가 있는지" },
          { label: "② 어떻게 빼앗기나", value: "피싱 · 파밍 · 스미싱 · 보이스피싱" },
          { label: "③ 어떻게 지키나", value: "보호 수칙과 안전한 비밀번호" },
        ],
        highlights: [
          "하나만으로는 누군지 몰라도, 다른 것과 합치면 알 수 있으면 그것도 개인정보입니다.",
        ],
      },
      /*
       * 정의와 유형을 화면에도 둔다 (슬라이드 4·6).
       *
       * 슬라이드는 한 번 지나가면 없다. 뒤에 나오는 활동 — 마스킹에서 "학교 이름도
       * 개인정보인가" 를 판단할 때 — 학생이 되돌아가 볼 곳이 있어야 한다. 앞 화면을
       * 다시 띄워 달라고 손을 드는 대신 이 탭을 열면 된다.
       *
       * 유형은 다섯 가지를 슬라이드 그대로 쓰되, 예를 중1이 가진 것 위주로 줄인다.
       * 소득·대출 같은 것은 읽어도 자기 이야기가 아니라 안 남는다.
       */
      {
        label: "개인정보란",
        subtitle: "나를 알아볼 수 있는 정보",
        note:
          "살아 있는 사람에 대한 정보로, 그 사람이 누구인지 알아볼 수 있는 정보입니다.\n" +
          "하나만으로는 몰라도 다른 것과 합쳐서 알아볼 수 있으면 그것도 개인정보예요.",
        rows: [
          { label: "신분 정보", value: "이름, 주민등록번호, 주소, 전화번호, 가족 관계" },
          { label: "신체적 정보", value: "키, 몸무게, 지문, 얼굴, 건강 상태, 병력" },
          { label: "사회적 정보", value: "학교, 학년·반·번호, 성적, 상벌 기록" },
          { label: "경제적 정보", value: "카드 번호, 계좌 번호, 용돈 쓴 내역" },
          { label: "기타 정보", value: "위치, 통화 내역, 접속한 사이트, 주고받은 메시지" },
        ],
        highlights: [
          "「1학년 4반 12번」 은 하나씩 보면 아무것도 아니지만, 학교 이름과 합치면 한 사람이 정해집니다.",
        ],
      },
      /*
       * 「함께 해 볼 것」 탭은 뺐다.
       *
       * 활동 안내는 그 활동을 하는 단계(함께 해 볼 것)에서 각 문항 위에 이미 있다.
       * 오늘 할 일 화면에 미리 한 번 더 두면, 아직 하지도 않은 활동을 여기서 훑어보고
       * 정작 할 때는 안내를 안 읽는다. 각 활동이 나올 때 그 자리에서 안내한다.
       */
    ],
  },

  /*
   * 성찰 한 문항 — 실천 방안을 묻는다.
   *
   * "오늘 무엇을 배웠나" 로 물으면 슬라이드 제목을 옮겨 적는다. **오늘부터 바꿀 것
   * 하나**를 정하라고 하면 오늘 배운 것을 자기 생활에 한 번은 대 봐야 답이 나온다.
   */
  reflectionQuestions: [
    "개인정보를 지키려고 오늘부터 바꿀 것을 하나만 정해 보세요. 무엇을 어떻게 바꿀 건가요?",
  ],
  reflectionPublic: false,

  /*
   * 활동 두 개가 다 바깥 사이트다. 이탈로 세면 반 전체가 빨간 신호등이 되고,
   * 그 화면을 본 선생님은 아무 판단도 못 한다 (5·6차시와 같은 이유).
   */
  focusExempt: ["worksheet", "problem"],
  phaseLabels: {
    assessment: "오늘 할 일",
    problem: "한 번 속아 보기",
    worksheet: "함께 해 볼 것",
  },
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리는 차시가 아니다. 비워 두면 화면이 글만 쓰는 활동으로 잡는다
    places: [],
    year: 2036,
    worksheet: WORKSHEET,
    // 서로 구경할 것이 없다 — 오늘 쓰는 것은 한 칸뿐이다
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

    /*
     * 아직 **아무도 안 들어온** 수업에 반영한다.
     *
     * 원래는 status 가 scheduled 인 것만 봤는데, 교사가 화면에서 한 번 열어 보기만 해도
     * active 로 바뀐다. 그러면 수업 전날 계획을 고쳐도 그 수업에는 안 들어가고, 다음
     * 날 아침에 옛 화면이 열린다 — 9차시를 만들면서 실제로 그렇게 됐다.
     *
     * 기준을 출석으로 바꾼다. 한 명이라도 들어왔으면 그날 화면을 흔들지 않는다.
     */
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (기사와 다른 통 — 어제 통과한 학생의 "끝났다" 가 안 풀립니다)`);
  console.log("단계: 대기 → 기분 → 오늘 할 일 → 한 번 속아 보기 → 함께 해 볼 것 → 성찰 → 마침");
  console.log("활동 링크 2개 — wordwall 퀴즈 · security.org 비밀번호 (둘 다 로그인 불필요, 접속 확인함)");
  console.log("슬라이드 18의 마스킹 체험은 뺐습니다 — store.wrtn.ai 도메인이 사라졌습니다.");
  console.log("비밀번호 활동은 「진짜 말고 가짜를 넣으라」 로 안내합니다.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
