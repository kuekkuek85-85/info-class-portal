/**
 * 9+10 통합 차시 계획 등록 — 「디지털 윤리 — 개인정보와 사이버 윤리」 (1-2반 전용).
 *
 *   node --env-file=.env.local scripts/seed-lesson9-10-combo.ts
 *
 * ## 왜 이 파일이 따로 있나
 *
 * 1학년 2반이 건강검진으로 9차시(개인정보 보호)를 통째로 못 했다. 다른 반은 9차·10차를
 * 정상 진도로 지났다. 2반만 내일 한 교시에 9+10의 핵심을 **압축해 한 번에** 지난다.
 *
 * 그래서 원본 seed-lesson9.ts / seed-lesson10.ts 는 **건드리지 않는다.** 그것을 고치면
 * 정상 진도 반의 화면까지 흔들린다. 대신 **별도 lessonNo(910)** 로 계획 하나를 새로
 * 만들어 2반 세션만 여기에 걸어 연다.
 *
 * ## 같은 통(digital-ethics)을 그대로 쓴다
 *
 * activityId 는 9·10·11차시가 함께 쓰는 `digital-ethics` 통이다. lessonNo 만 910 으로
 * 다를 뿐, **속아 보기·논술 문항 key 는 9·10 원본 그대로 재사용**한다(pi_sim·cyber_essay2).
 * 그래서 오늘 1-2반이 쓴 한 줄이 11차시 수행평가(디지털 시민 리포트) 화면에서 그대로
 * 열린다 — 다른 반과 똑같은 자리에 담긴다.
 *
 * worksheet 단계만 다르다. 개인정보 마스킹(pi_mask) 대신 **비밀번호 강함 체크 체험**
 * (pw_check)을 둔다 — 이 통에 새 key 하나가 더 생기는 것뿐이라 11차 리포트/대시보드는
 * 그대로다(pi_mask 를 직접 참조하는 곳이 없다). 마스킹은 정상 진도 반에서 여전히 쓴다.
 *
 * ## 40분에 맞춘 압축 (교사 확정)
 *
 * 실제 교시는 45분이지만 끝 5분은 태블릿 정리라, 활동은 38~40분 안에 끝낸다.
 *
 *   0–3   대기·기분·출석
 *   3–8   오늘 할 일 보드(assessment) — 개념 3주제 + 저작권 복습, 읽기용
 *   8–20  한 번 속아 보기(problem, pi_sim) — 피싱·파밍·스미싱·보이스피싱   ← 최우선
 *   20–24 비밀번호 강함 체크 체험(worksheet, pw_check) — 짧게 (40분 넘으면 여기부터 축약)
 *   24–36 사이버 폭력 논술 1사례(emotion, cyber_essay2) — 단톡방 언어폭력
 *   36–38 통합 성찰 1문항(reflection)
 *   38–40 다음 시간(progress) — 디지털 시민 리포트(수행평가) 안내 → 태블릿 정리
 *
 * ## 수업에서 뺀 것 (교사 확정)
 *
 *   · cyverse 메타버스 체험 — **완전 제외.** 자율 링크로도 넣지 않는다.
 *   · 스마트폰 중독 자가진단(sc_q*·scale_result) — 이 차시에선 뺀다. 자율 링크로도 안 넣는다
 *     (40분이 빠듯하다). 위험군 파악이 필요하면 별도 회차에서 다룬다.
 *   · wordwall 개인정보 퀴즈 — 필수 흐름에서 뺀다. 다음 시간 보드에 「자율(선택)」 로만
 *     가볍게 둔다 — 활동을 다 한 사람이 남는 시간에 눌러 보는 것.
 *     (요즘은 집에 내주는 과제를 두지 않는다. 어디에도 그런 안내를 넣지 않는다.)
 *   · security.org 비밀번호 테스트 — 이제 worksheet 정규 활동(비밀번호 강함 체크 체험)과
 *     겹쳐 자율 링크에서도 뺐다. 체험은 화면 안에서 도는 자립형이라 바깥 링크가 필요 없다.
 *
 * ## worksheet 단계 (1-2반 한정 교체)
 *
 *   개인정보 마스킹(pi_mask, masking) 대신 **비밀번호 강함 체크 체험**(pw_check,
 *   pw_strength)을 둔다. 마스킹보다 학생이 직접 쳐 보는 재미가 있고, 개인정보를 지키는
 *   실천(강한 비밀번호)으로 곧장 이어진다. 마스킹은 정상 진도 반에서 그대로 쓴다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import type {
  LessonPlan,
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

/**
 * 통합 차시 전용 번호. 1~11 과 안 겹치게 910 을 쓴다 — 정상 진도 반의 9·10차 계획과
 * 물리적으로 다른 문서라, 여기를 고쳐도 다른 반은 안 흔들린다.
 */
const LESSON_NO = 910;

/** 9·10차와 같은 규칙 — 아직 아무도 안 들어온 수업에만 반영한다. --force 로 덮어쓸 수 있다 */
const FORCE = process.argv.includes("--force");

/** 9·10·11차시가 함께 쓰는 통. lessonNo 만 다르고 통은 같다 → 11차 리포트에서 이어짐 */
const ACTIVITY_ID = "digital-ethics";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/* ──────────────────────────────────────────────────────────────
 * 9차시에서 가져온 것 — 속아 보기 장면 (원본 seed-lesson9.ts 그대로)
 * 순서가 설계다: 피싱에서 "주소를 봐라" 를 배운 직후에 파밍이 온다.
 * ────────────────────────────────────────────────────────────── */
const SCENES: ScamScene[] = [
  {
    mode: "login",
    title: "① 직접 당해 봅시다",
    prompt:
      "네이버 로그인 화면입니다. 아무 아이디와 비밀번호나 넣고 로그인을 눌러 보세요. (진짜 비밀번호 말고요!)",
    embedUrl: "/phish-demo/naver-login.html",
    shownUrl: "http://naver.login-authkr.com/nidlogin",
    answer:
      "방금 친 비밀번호가 그대로 보였죠? 진짜였다면 그 순간 남의 손에 넘어갔습니다. 화면은 진짜 같아도 주소가 가짜였어요.",
    clues: [
      "주소를 보세요 — naver.com 이 아니라 login-authkr.com 입니다. 화면이 아니라 주소가 진짜와 가짜를 가릅니다",
      "http 로 시작하고 자물쇠가 없어요",
      "로그인 화면이 문자나 메일 링크로 열렸다면, 치기 전에 주소부터 의심하세요",
    ],
    concept:
      "피싱(Phishing): 개인정보(Private data)와 낚시(Fishing)의 합성어로서 유명 회사를 사칭하는 메일을 발송하거나 인터넷 광고, 대출 정보 게시 등을 통하여 위장된 사이트로 접속되게 한 후 금융 정보를 입력하도록 유도하는 사기 수법",
    rules: [
      "의심스러운 링크 클릭하지 않기",
      "의심스러운 첨부파일 열지 않기",
      "URL(웹사이트 주소) 확인하기",
      "https(데이터 암호화 전송) 확인하기",
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
    redirectUrl: "jangpyung.sen.ms.kr",
    answer:
      "분명 www.naver.com 을 쳤는데 학교 홈페이지가 열렸죠? 이것이 파밍입니다 — 내 컴퓨터 속 ‘주소록’(hosts 파일)이 몰래 바뀌면, 맞는 주소를 쳐도 다른 곳으로 갑니다.",
    clues: [
      "피싱과 다른 점이 이거예요 — 주소를 아무리 잘 봐도 못 잡습니다. 내가 친 주소는 진짜였으니까요",
      "내 컴퓨터나 공유기가 나쁜 프로그램에 감염되면 이렇게 됩니다. 그래서 백신을 켜 두는 것이 막는 방법이에요",
      "PC방·카페 같은 공용 컴퓨터에서 로그인이나 결제를 안 하는 것도 파밍을 피하는 길입니다",
    ],
    concept:
      "파밍(Pharming): 정상적인 누리집 주소를 입력해도 가짜 누리집으로 연결될 뿐 아니라 기존에 접속하던 즐겨찾기를 클릭해도 가짜 누리집으로 연결되어 정보를 훔치는 사기 수법",
    rules: [
      "URL(웹사이트 주소) 확인하기",
      "https(데이터 암호화 전송) 확인하기",
      "2단계 인증 및 강력한 암호 사용하기",
      "백신 프로그램 업데이트하기",
      "공용 WIFI 네트워크 사용 자제하기",
      "신뢰할 수 있는 네트워크 사용하기",
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
    concept:
      "스미싱(Smishing): 문자 메시지(SMS)와 피싱(phishing)의 합성어로, 인터넷 접속이 가능한 스마트폰의 문자 메시지를 이용한 휴대 전화 해킹",
    rules: [
      "의심스러운 메시지 주의하기(전화로 검증)",
      "링크 클릭 주의하기(특히 단축 URL)",
      "출처 불명의 앱 설치하지 않기",
      "보안 앱 설치하기",
    ],
  },
  {
    mode: "info",
    title: "⑤ 보이스피싱 — 전화로 낚는다",
    prompt: "",
    concept:
      "보이스 피싱(Voice Phishing): 음성(전화)를 이용해 개인정보를 낚아 올린다는 뜻으로, 스마트폰과 같은 전기전자통신수단을 이용해 피해자를 속여 재산상의 손해를 입히는 사기범죄",
    rules: [
      "의심스러운 전화 주의하기(발신자 검증)",
      "스팸 및 보이스 피싱 전화 차단 앱 사용하기",
      "금융기관의 정보 요청 절차 미리 확인하기",
      "가족 및 지인들과 긴급 상황에서의 대처 방법 미리 논의하기",
    ],
    videoUrl: "https://youtu.be/DMJ0Jrxu_Oo?si=kDeoDSJj_XGYnM7u",
    videoLabel: "영상 보기",
  },
];

/**
 * 활동지 — 세 조각만 담는다. 자가진단·wordwall·cyverse 는 다 뺐다.
 *
 *   · problem : pi_sim  — 한 번 속아 보기 (9차 심장)
 *   · worksheet: pw_check — 비밀번호 강함 체크 체험 (짧게)
 *   · emotion : cyber_essay2 — 사이버 폭력 논술 1사례
 *
 * pi_sim·cyber_essay2 key 는 9·10 원본 그대로라 11차시에서 열린다. worksheet 만 새 key
 * (pw_check)다 — 같은 digital-ethics 통에 새로 담기는 것뿐이라 무해하다.
 */
const WORKSHEET: WorksheetQuestion[] = [
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
    key: "pw_check",
    phase: "worksheet",
    label: "비밀번호 강하게 · 얼마나 안전할까",
    hint:
      "가짜 비밀번호를 지어서 쳐 보면 강함 정도가 실시간으로 나와요.\n" +
      "진짜 비밀번호는 절대 치지 마세요! 무엇을 바꾸면 더 강해지는지 살펴봅시다.",
    kind: "pw_strength",
    maxLength: 20,
  },
  /*
   * 사이버 폭력 논술 — 10차의 두 사례 중 사례②(단톡방 언어폭력·따돌림) 하나만. 중1에게
   * 가장 현실적인 상황이라 하나를 고른다면 이것이다. 개인적인 의견이라 친구에게 안 나간다.
   */
  {
    key: "_cyber_essay_head",
    phase: "emotion",
    label: "사이버 폭력 · 이럴 땐 어떻게",
    hint: "아래 이야기를 읽고, 홍길동이 어떻게 대처해야 할지 자신의 의견을 써 봅시다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "cyber_essay2",
    phase: "emotion",
    label: "사례 · 단체 대화방",
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
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  /* 9·10차와 같은 규칙 — 「디지털 시민 리포트」 이름은 11차 수행평가에 두고, 여기선 안 쓴다 */
  title: "디지털 윤리 — 개인정보와 사이버 윤리",
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
  video: empty(),

  /*
   * 다음 시간(progress) — 디지털 시민 리포트(수행평가) 안내.
   *
   * LESSON_PHASES 순서상 progress 단추는 assessment 앞에 뜨지만, 교사는 수업 끝(38~40분)에
   * 눌러 보여준다(9·10차와 같은 방식). 「자율(선택)」 탭에는 남는 시간에 눌러 볼 링크만
   * 가볍게 둔다 — 자가진단·cyverse 는 넣지 않고, 집에 내주는 안내도 넣지 않는다.
   */
  progress: {
    heading: "다음 시간 — 디지털 시민 리포트 (수행평가)",
    body: "",
    url: "",
    tabs: [
      {
        label: "다음 시간에 할 일",
        subtitle: "디지털 시민 리포트 — 수행평가",
        note:
          "다음 시간부터는 수행평가 「디지털 시민 리포트」 를 이어서 씁니다.\n" +
          "오늘 배운 개인정보 보호와 사이버 윤리가 리포트의 바탕이 됩니다.",
        rows: [
          { label: "무엇을", value: "디지털 시민 리포트 (수행평가)" },
          { label: "바탕이 되는 것", value: "개인정보 보호 · 사이버 윤리 · 저작권" },
          { label: "평가 방식", value: "1차 제출 → AI 점검 → 2차 제출 → 선생님 검토 → 통과" },
        ],
        highlights: [
          "오늘 쓴 논술과 성찰은 다음 시간 리포트를 쓸 때 다시 열어 볼 수 있습니다.",
        ],
      },
      /*
       * 자율(선택) — 오늘 활동을 다 한 사람이 남는 시간에 교실 안에서 눌러 보는 것.
       * 강제하지 않고, 집에 내주지도 않는다. cyverse·자가진단은 여기에도 넣지 않는다(교사 확정).
       */
      {
        label: "자율 (선택)",
        subtitle: "다 한 사람은 남는 시간에 해 봐도 좋아요 — 안 해도 됩니다",
        note:
          "꼭 하지 않아도 됩니다. 오늘 활동을 다 끝냈고 시간이 남으면 아래를 눌러 보세요.",
        rows: [
          {
            label: "개인정보 퀴즈",
            value: "wordwall.net/ko/resource/73876091 — 이건 개인정보일까? 고르기 퀴즈",
          },
        ],
        highlights: [
          "꼭 하지 않아도 됩니다 — 다 한 사람을 위한 선택 활동이에요.",
        ],
      },
    ],
  },

  assessment: {
    heading: "오늘 할 일 — 개인정보와 사이버 윤리",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘 배울 것",
        subtitle: "개인정보를 지키고, 사이버 윤리를 실천한다",
        note: "설명은 앞 화면으로 같이 봅니다. 이 탭들은 활동 중에 되돌아와 볼 수 있어요.",
        rows: [
          { label: "학습목표 ①", value: "개인정보가 무엇이고 어떻게 지키는지 설명할 수 있다." },
          { label: "학습목표 ②", value: "사이버 폭력을 예방하고 바르게 대처하는 방법을 실천할 수 있다." },
          { label: "오늘 순서", value: "한 번 속아 보기 → 비밀번호 강하게 → 사이버 폭력 논술 → 성찰" },
        ],
        highlights: [
          "하나만으로는 누군지 몰라도, 다른 것과 합치면 알 수 있으면 그것도 개인정보입니다.",
          "사이버 공간에서 한 일은 현실에도 그대로 영향을 줍니다. 화면 뒤에도 사람이 있어요.",
        ],
      },
      /* 개인정보란 — 9차 원본 탭. "이름·생일도 개인정보라 비밀번호에 쓰면 안 된다" 를 짚을 때 되돌아본다 */
      {
        label: "개인정보란",
        subtitle: "나를 알아볼 수 있는 정보",
        note:
          "살아 있는 개인에 대한 정보로, 개인을 알아볼 수 있는 정보입니다.\n" +
          "(한 개인을 식별할 수 있는 정보)\n\n" +
          "하나의 정보만으로는 특정 개인을 알아볼 수 없더라도, 다른 정보와 쉽게 결합하여 " +
          "알아볼 수 있는 경우에도 개인정보가 됩니다.",
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
      /* 사이버 폭력 유형 6종 — 10차 원본 탭. 논술 때 되돌아와 본다 */
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
      /* 대처와 예방 6단계 — 10차 원본 탭. 논술 답의 근거가 된다 */
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
      /* 저작권 복습(CCL) — 지난 시간에 배운 것을 한 번만 짚는다. 새로 가르치지 않는다 */
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
        imageUrl: "/ccl-licenses.svg",
        imageAlt: "CC 라이선스 6종 배지 — CC BY, BY-NC, BY-ND, BY-SA, BY-NC-SA, BY-NC-ND",
      },
    ],
  },

  /*
   * 통합 성찰 한 문항 — 개인정보와 사이버 윤리를 한데 묶어 오늘부터 실천할 것을 묻는다.
   * 개인적인 다짐이라 비공개. 실천 수칙 그림(9차)을 옆에 두어 고를 거리를 준다.
   */
  reflectionQuestions: [
    "개인정보를 지키고 사이버 윤리를 실천하기 위해, 오늘부터 내가 할 것을 한 가지 적어 봅시다.",
  ],
  reflectionImage: "/lesson9/privacy-rules.png",
  reflectionPublic: false,

  /*
   * 속아 보기(problem)는 파밍 재현에서 바깥 주소로 튕기는 장면이 있어 이탈로 세면 안 된다.
   * 비밀번호 체험·논술(worksheet·emotion)은 안에서 끝나지만, 9·10차와 같은 폭으로 함께 면제해
   * 두어 교사 화면이 헛되이 빨개지지 않게 한다.
   */
  focusExempt: ["problem", "worksheet", "emotion"],
  phaseLabels: {
    assessment: "오늘 할 일",
    problem: "한 번 속아 보기",
    worksheet: "비밀번호 강하게",
    emotion: "사이버 폭력 논술",
    progress: "다음 시간",
  },
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리는 차시가 아니다 — 비우면 글만 쓰는 활동으로 잡는다
    places: [],
    year: 2036,
    worksheet: WORKSHEET,
    // 논술·속아 보기 결과는 개인적이라 친구에게 안 나간다
    galleryEnabled: false,
    // 출처 두 칸은 수행평가1의 항목이라 붙여 둔 것 — 오늘은 쓸 일이 없다
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

    /* 9·10차와 같은 규칙 — 아직 아무도 안 들어온 수업에만 반영한다 */
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
          reflectionImage: PLAN.reflectionImage,
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

  console.log(`\nlessonNo: ${LESSON_NO} (1-2반 전용 통합 차시 — 정상 진도 반의 9·10차 계획과 별개)`);
  console.log(`활동 ID: ${ACTIVITY_ID} (9·10·11차 공유 통 — 문항 key 는 원본 그대로, 11차 리포트에서 이어짐)`);
  console.log("단계: 대기 → 기분 → 오늘 할 일 → 한 번 속아 보기 → 비밀번호 강하게 → 사이버 폭력 논술 → 성찰 → 다음 시간 → 마침");
  console.log("수업에서 뺀 것: cyverse 체험(완전 제외) · 자가진단(이 차시엔 안 넣음) · wordwall(남는 시간 자율 링크만)");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
