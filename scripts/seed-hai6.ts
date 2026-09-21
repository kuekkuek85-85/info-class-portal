/**
 * 「인간과 인공지능」(진로탐색 선택과목) 6차시 — 발표 준비.
 *
 *   node --env-file=.env.local scripts/seed-hai6.ts
 *
 * ## 이 차시가 노리는 것 — 발표를 준비한다 (발표는 7·8차)
 *
 * 5차시까지 각자 앱을 하나씩 만들고, 내 눈 → AI → 선생님 → 친구(동료 검토) 순으로
 * 고쳐 왔다. 6차시는 그 앱을 **남 앞에서 발표할 준비**를 한다.
 *
 *   ① 발표 자료 만들기 — 캔바 로그인 → 앱 소개·링크·개선점 확정 → 지금까지 받은 피드백
 *      참고 표 → 발표 필수 요소·평가 기준 확인 → 캔바로 발표 슬라이드 제작.
 *   ② 대본 쓰고 리허설 — 발표 대본을 쓰고, 혼자 조용히 읽어 보며 연습한다.
 *
 * 오늘 목표는 **구현이 아니라 발표 준비**다. 피드백은 참고만 하고 앱을 크게 고치지 않는다 —
 * 못 반영한 것은 발표의 '앞으로 개선할 점' 으로 말하면 된다.
 *
 * **실제 발표는 6차가 아니라 7·8차시**다(교사 확정). 한 차시에 10~11명씩 나눠 두 차시로
 * 반 전체를 소화한다. 그래서 6차는 순수 준비 차시이고, 대본·안내 문구에 "다음 시간에
 * 발표한다" 를 넣어 학생이 실제 발표를 대비하게 한다. 1인 발표 시간(약 2~3분)과 발표 필수
 * 요소·평가 기준은 안내(note)로 미리 보여 준다 — 숫자·배점은 교사가 조정할 수 있다는 톤.
 *
 * ## 받은 피드백은 grill 안 참고 표로 본다 ('받은 피드백 보기'·'최종 피드백 반영' 단계는 없앴다)
 *
 * 이 앱은 개인(1인) 발표 프로젝트다. AI·교사·동료 3차에 걸쳐 받은 피드백은 3~5차에서 이미
 * 봤다. 6차에 이를 다시 한자리에 모으던 '최종 피드백 반영'(build) 단계는 없앴고, 이번에는
 * '받은 피드백 보기'([앱 감상]/gallery) 단계도 없앴다(교사 확정 — [앱 감상] 탭이 발표 준비
 * 흐름을 끊었다). 대신 지금까지 받은 피드백 셋(🤖 AI · 🧑‍🏫 선생님 · 🧑‍🤝‍🧑 친구)을 발표 자료
 * 만들기(grill) 안에 **읽기 전용 참고 표**(received_feedback 문항)로 한자리에 편다. 데이터는
 * /api/student/received-feedback 에서 **본인 것만** 온다 — AI 는 내 answers["ai_review"],
 * 선생님은 내 teacherFeedback, 친구는 내 작품에 달린 동료 피드백(작성자 신원은 안 실림).
 * 활동 ID 가 2~5차와 같아 그때 받은 것이 그대로 열린다. 앱 소개·링크·개선점은 grill 맨 앞에서
 * 확정한다. 서로 구경하기(gallery)는 꺼서 [앱 감상] 탭·단추를 닫는다(privacy — 남의 담벼락 비노출).
 *
 * ## 캔바 초대 주소 — .env.local 에서만 읽는다
 *
 * 저장소가 공개라 분반별 초대 토큰은 코드에 적지 않는다(seed-hai5 와 같은 이유).
 * 수업을 열 때(open-hai6-*) 그 분반 것 하나만 남기고 linkUrlByGroup 표는 지운다.
 *
 * ## 세션은 열지 않는다
 *
 * 이 스크립트는 차시 계획(LessonPlan)만 짓는다. 학생 노출은 교사가 세션을 열 때다.
 * 이미 열어 둔 scheduled 세션에는 반영하고, 진행 중·끝난 세션은 건드리지 않는다.
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

/** 저장소가 공개라 캔바 초대 주소는 .env.local 에서만 읽는다 (seed-hai5 와 같은 이유) */
const CANVA_INVITE_URL = process.env.CANVA_INVITE_URL ?? "";
const CANVA_BY_GROUP: Record<string, string> = {
  "hai-tue-1": process.env.CANVA_INVITE_TUE_1 ?? "",
  "hai-tue-2": process.env.CANVA_INVITE_TUE_2 ?? "",
  "hai-thu-1": process.env.CANVA_INVITE_THU_1 ?? "",
  "hai-thu-2": process.env.CANVA_INVITE_THU_2 ?? "",
};

/** ★ 2~5차시와 같은 값. 이 값이 같아야 지난 앱·답·받은 피드백이 오늘 화면에 열린다 */
const ACTIVITY_ID = "hai-2026-1기";

/**
 * 발표자료(PPT) 템플릿 링크 — 교사가 캔바에 올려 수업에 배정한 공용 템플릿.
 * 누르면 수정 가능한 발표용 슬라이드(학생별 편집본)가 새 탭에 뜬다.
 *
 * **분반 상관없이 모두 같은 공용 단축링크**라 여기 그대로 적는다 — 캔바 브랜드 초대
 * (CANVA_INVITE_*, linkUrlByGroup)와 달리 비밀 토큰이 아니다. 로그인 단계는 그대로 두고,
 * '발표자료 만들기' 에서 이 링크를 연다. 공용이라 open 스크립트의 linkUrlByGroup 정리와
 * 무관하다(그 정리는 linkUrlByGroup 만 지운다 — 이 linkUrl 은 그대로 학생 화면까지 간다).
 */
const CANVA_SLIDE_TEMPLATE_URL = "https://canva.link/e8ib7npsxzirh0a";
/** 차시 번호가 정보과와 겹치므로 100번대로 띄운다 (2차시 102 … 5차시 105) */
const LESSON_NO = 106;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const WORKSHEET: WorksheetQuestion[] = [
  /*
   * ── ① 발표 준비 시작 — 캔바 로그인 · 앱 확정 (grill 칸) ─────────
   *
   * '최종 피드백 반영'(build)·'받은 피드백 보기'([앱 감상]/gallery) 단계는 없앴다(교사 확정).
   * 발표 준비에 꼭 필요한 것 — 캔바 로그인 · 확정 앱 소개 · 최종 앱 링크 · 개선점 한 줄 — 을
   * 발표 자료 만들기(grill) 맨 앞으로 옮겨 둔다. 로그인을 제일 위에 둔다(3~5차와 같은 이유 —
   * 제일 오래 걸리는 일을 먼저). 오늘 목표는 구현이 아니라 발표 준비다. 그다음 지금까지 받은
   * 피드백 셋(AI·선생님·친구)을 grill 안 참고 표(_l6_received)로 한자리에서 훑고 자료를 만든다.
   */
  {
    key: "_l6_login",
    phase: "grill",
    label: "① 캔바에 다시 들어가기 — 먼저 눌러 두세요",
    hint:
      "아래 [캔바 열기] 를 누르고 [Microsoft로 계속하기] 를 고르세요.\n" +
      "내 학교 계정은 아래 칸에 있어요. [복사하기] 를 눌러 그대로 붙여 넣으면 됩니다.\n" +
      "비밀번호는 학교 계정 비밀번호예요.\n\n" +
      "지난 시간에 만든 앱은 캔바에 그대로 저장돼 있어요 — 오늘은 그 앱으로 발표 자료(슬라이드)를\n" +
      "만듭니다. 필요하면 앱도 가볍게 손볼 수 있어요.\n" +
      "· 다른 계정으로 로그인돼 있다 → 로그아웃하고 위 주소로 다시\n" +
      "· 비밀번호가 기억 안 난다 → 손을 드세요\n" +
      "· 화면이 안 넘어간다 → 30초 기다려 보고, 그래도 그대로면 손을 드세요",
    kind: "note",
    // 학생마다 자기 계정 주소가 복사된다 (worksheet-view 의 named 가 치환한다)
    copyText: "{학교계정}",
    linkUrl: CANVA_INVITE_URL,
    linkUrlByGroup: Object.fromEntries(Object.entries(CANVA_BY_GROUP).filter(([, url]) => url)),
    linkLabel: "캔바 열기 (새 창)",
    maxLength: 0,
  },
  {
    key: "final_pitch",
    phase: "grill",
    /*
     * 확정된 앱 소개(한두 줄). 발표 도입에서 쓸 한 줄이다. mvp_one 을 불러와 다듬게 한다.
     * 이미 쓴 것은 덮지 않는다(prefillTemplate 은 빈 칸일 때 한 번만 채운다).
     */
    label: "② 확정된 앱 소개 — 발표 첫마디로 쓸 한두 줄",
    hint:
      "지난 시간에 쓴 한 줄 소개가 아래에 들어와 있어요. 발표 첫마디로 쓸 수 있게 다듬어 주세요.\n" +
      "예) 급식을 매일 확인하기 번거로운 친구를 위해, 날짜를 누르면 오늘 급식이 바로 뜨는 앱이에요.",
    kind: "long",
    prefillTemplate: "{mvp_one}",
    maxLength: 200,
  },
  {
    key: "build_url",
    phase: "grill",
    /*
     * 2~5차시와 같은 키 — 이 칸이 곧 "앱 링크 제출함" 이자 발표 때 시연할 앱 주소다.
     * 지난 시간에 낸 주소가 채워져 있다. 오늘 앱을 고쳐 게시를 다시 했을 때만 새 주소로 바꾼다.
     */
    label: "최종 앱 링크 — 발표 때 시연할 주소",
    hint:
      "아래에 지난 시간에 낸 앱 주소가 들어 있어요. 그대로 두면 됩니다.\n" +
      "혹시 오늘 앱을 고쳐 캔바에서 [게시] 를 다시 눌러 주소가 바뀌었으면, 그때만 새 주소로 고치세요.\n" +
      "주소는 https:// 로 시작하지 않아도 저장할 때 자동으로 맞춰 줍니다.",
    kind: "text",
    maxLength: 300,
  },
  {
    key: "fix6",
    phase: "grill",
    /*
     * 개선점 한 줄. 지난 시간까지 받은 피드백 중 반영한 것 또는 앞으로 개선할 점.
     * 이 한 줄이 대본의 [개선] 자리와 슬라이드 재료로 그대로 들어간다(script prefillTemplate).
     * 발표 필수 요소 5번(피드백과 개선점)과도 이어진다.
     */
    label: "③ 개선점 — 반영한 것, 또는 앞으로 개선할 점",
    hint:
      "오늘은 발표 자료를 만드는 게 목표라, 앱을 크게 고치지 않아도 돼요.\n" +
      "지난 시간까지 받은 피드백(선생님·친구·AI) 중 지금 바로 손볼 수 있는 게 있으면 가볍게 반영하고,\n" +
      "그렇지 않은 것은 ‘앞으로 이렇게 개선하고 싶어요’ 로 적어 주세요. 여기 적은 한 줄이\n" +
      "발표의 ‘개선점’ 자리(대본·슬라이드)에 그대로 들어갑니다.\n" +
      "예) (반영) 첫 화면에 앱 이름과 한 줄 설명을 넣었어요 / (앞으로) 알림 기능을 더 넣고 싶어요",
    kind: "long",
    maxLength: 200,
  },
  {
    key: "_l6_received",
    phase: "grill",
    /*
     * 지금까지 받은 피드백 셋(AI·선생님·친구)을 한 표로 참고용으로 편다.
     *
     * '받은 피드백 보기'(gallery) 단계를 없애고(교사 확정 — [앱 감상] 탭이 발표 준비 흐름을
     * 끊었다), 그 자리를 여기로 옮겼다. 로그인·앱 확정(①②③) 다음, 발표 필수 요소·슬라이드
     * 만들기(④~⑥) 앞에 두어 **피드백을 보고 자료를 만들게** 한다. 읽기 전용 — 데이터는
     * /api/student/received-feedback 에서 **본인 것만** 온다(친구 신원 비노출, received-feedback-panel).
     * 오늘 목표는 고치는 게 아니라 참고다.
     */
    label: "지금까지 받은 피드백 (참고) — 🤖 AI · 🧑‍🏫 선생님 · 🧑‍🤝‍🧑 친구",
    hint:
      "3~5차에 걸쳐 받은 피드백을 한자리에 모았어요. 아래 표를 참고해 발표 자료와 대본을 준비하세요.\n" +
      "오늘은 이걸 다시 고치는 시간이 아니라 참고하는 시간이에요 — 지금 바로 반영할 수 있는 건 위\n" +
      "③ 개선점 칸에 적고, 못 한 건 발표의 ‘앞으로 개선할 점’ 으로 말하면 됩니다.\n" +
      "· 내가 받은 것만 보여요. 친구가 누구인지는 나오지 않아요.\n" +
      "· 아직 받은 게 없으면 비어 있을 수 있어요 — 괜찮아요.",
    kind: "received_feedback",
    maxLength: 0,
  },

  /*
   * ── ④~⑥ 발표 기준과 자료 만들기 (grill 칸, 위 ①~③ 에 이어짐) ──────
   *
   * 먼저 발표 필수 요소와 동료·교사 평가 기준을 보여 준다 — 같은 기준으로 준비 → 발표 →
   * 평가가 이어지게(교사 확정). 그다음 그 기준대로 캔바 발표 슬라이드를 만든다. 용어는
   * 5차까지의 활동 통 필드와 맞춘다(문제-누구의 불편 / 해결-한 줄 소개 / 핵심 기능 / 시연 /
   * 동료 피드백과 개선점 / 느낀 점). 요소 개수·발표 시간·배점은 교사가 조정할 수 있다는 톤.
   */
  {
    key: "_l6_checklist",
    phase: "grill",
    /*
     * 발표에 꼭 들어가야 하는 요소(교사 확정). 발표자료와 대본이 이 요소를 다 담게 하는
     * 기준이다. 슬라이드 만들기·대본 쓰기 바로 앞에 두어 요소 누락을 줄인다.
     */
    label: "④ 발표에 꼭 들어가야 하는 것 — 자료와 대본에 이 여섯 가지를 담으세요",
    hint:
      "아래 여섯 가지가 다 들어가면 좋은 발표예요. 슬라이드도, 대본도 이 순서로 준비하세요.\n" +
      "(요소 개수와 발표 시간은 선생님이 조정할 수 있어요.)\n\n" +
      "1. 문제 정의 — 내가 발견한 문제, 누구의 어떤 불편함인지\n" +
      "2. 해결 아이디어 — 우리 앱이 무엇을 하는지 한 줄 소개\n" +
      "3. 핵심 기능 — 주요 기능 2~3가지\n" +
      "4. 시연 — 실제 앱 화면 보여 주기 (캡처를 넣거나, 발표 때 직접 열어 보여 줄 계획)\n" +
      "5. 피드백과 개선점 — 받은 피드백 중 반영한 것, 또는 앞으로 개선하고 싶은 점\n" +
      "6. 느낀 점·배운 점 — 만들면서 배운 것, 또는 앞으로 발전시키고 싶은 방향",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_l6_peereval",
    phase: "grill",
    /*
     * 발표 평가 기준을 미리 본다(교사 확정). 실제 평가는 7·8차 발표 때 하지만, 기준을
     * 미리 보고 그 기준대로 준비하게 한다 — 위 필수 요소와 같은 기준이라 준비 → 발표 →
     * 평가가 이어진다. 이 항목은 7·8차 실제 평가 폼으로도 그대로 재사용한다. 배점·척도는
     * 교사 조정 가능.
     */
    label: "⑤ 다음 시간 발표는 이렇게 평가돼요 (1) 친구 평가 — 작품(앱) 보기",
    hint:
      "다음 시간에는 친구 발표를 들으며 '작품(앱) 자체' 를 봐요. 아래 두 가지만 3점 척도로 매기면 돼요.\n" +
      "(잘함 3 / 보통 2 / 아쉬움 1. 배점은 선생님이 조정할 수 있어요.)\n\n" +
      "· 유용성 — 이 앱이 실제로 쓸모 있고, 문제를 잘 풀어 주나요?\n" +
      "· 완성도 — 앱이 실제로 잘 동작하고, 핵심 기능이 잘 보였나요?\n\n" +
      "발표 전달력이나 태도·전체적인 인상 같은 것은 친구가 아니라 선생님이 평가해요.\n" +
      "여러분은 '앱' 만 보면 됩니다. (평가와 별개로, 잘한 점 한 가지와 더 좋아질 점 한 가지를 한 줄로 남겨 주면 친구에게 큰 도움이 돼요.)",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_l6_teachereval",
    phase: "grill",
    label: "⑤ 다음 시간 발표는 이렇게 평가돼요 (2) 선생님 평가 (루브릭)",
    hint:
      "발표 전달력과 전체적인 완성은 친구가 아니라 선생님이 아래 기준(루브릭)으로 봐요.\n" +
      "(항목별 배점·척도는 선생님이 조정할 수 있어요.)\n\n" +
      "· 전달력 — 이해하기 쉬운 설명, 태도와 목소리\n" +
      "· 내용 충실성 — 발표 필수 요소(문제·해결·핵심 기능·시연·개선점·소감)를 담았는가\n" +
      "· 문제·해결의 적절성과 창의성 — 문제가 분명하고, 해결이 그에 맞고 새로운가\n" +
      "· 시연 — 실제 앱·화면을 보여 주었는가\n" +
      "· 동료 피드백 반영 — 5차 검토에서 받은 피드백을 반영해 개선한 점이 보이는가",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_l6_slides_intro",
    phase: "grill",
    /*
     * 발표자료 시작점 — 교사가 배정한 캔바 템플릿을 연다.
     * linkUrl 은 분반 공용(공개 단축링크)이라 linkUrlByGroup 을 쓰지 않는다. 새 탭으로 열려
     * 수정 가능한 학생별 편집본이 바로 뜬다. 채우는 순서는 위 발표 필수 여섯 가지와 이어진다.
     */
    label: "⑥ 발표 슬라이드 만들기 — 템플릿을 열어 채워요",
    hint:
      "아래 [발표자료 템플릿 열기] 를 누르면, 선생님이 준비한 발표용 슬라이드가 새 탭에 떠요.\n" +
      "그대로 고칠 수 있는 내 편집본이에요. 위에서 본 발표 필수 요소 순서대로 채우면 됩니다\n" +
      "· 표지 (앱 이름 · 발표자)\n" +
      "· 문제 (누구의 어떤 불편함인지)\n" +
      "· 해결 아이디어 (앱이 무엇을 하는지 한 줄)\n" +
      "· 핵심 기능 (주요 기능 2~3가지)\n" +
      "· 시연 (실제 앱 화면 캡처나 시연 계획)\n" +
      "· 피드백과 개선점 (받은 피드백을 반영한 것, 또는 앞으로 개선할 점)\n" +
      "· 느낀 점 (배운 것·앞으로 발전 방향)\n\n" +
      "글씨는 크게, 한 장에 한 가지만 담으세요. 아래 ‘담을 재료’ 를 그대로 옮겨 넣어도 돼요.",
    kind: "note",
    // 분반 공용 발표 템플릿(공개 단축링크). 새 탭으로 열려 학생별 편집본이 뜬다
    linkUrl: CANVA_SLIDE_TEMPLATE_URL,
    linkLabel: "발표자료 템플릿 열기 (새 탭)",
    maxLength: 0,
  },
  {
    key: "_l6_slides_recap",
    phase: "grill",
    /*
     * 슬라이드에 옮겨 담을 재료를 옆에 편다. 앞 단계에서 확정한 소개·기능·앱 링크·최종 수정.
     */
    label: "슬라이드에 담을 재료 (지금까지 쓴 것)",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "problem_who", label: "누구의 불편 (문제)" },
      { key: "final_pitch", label: "확정된 앱 소개 (해결)" },
      { key: "mvp_must1", label: "핵심 기능 ①" },
      { key: "mvp_must2", label: "핵심 기능 ②" },
      { key: "mvp_must3", label: "핵심 기능 ③" },
      { key: "fix6", label: "개선점 (반영·향후)" },
      { key: "build_url", label: "내 앱 링크 (시연)" },
    ],
    maxLength: 0,
  },
  {
    key: "slides_url",
    phase: "grill",
    /*
     * 발표 슬라이드 링크(캔바 공유/게시). build_url(앱 링크)과 다른 새 키 —
     * 앱 링크 제출 판정(build_url)을 흐리지 않게 따로 둔다.
     */
    label: "발표 슬라이드 링크 (만들었으면 붙여 넣기)",
    hint:
      "캔바 오른쪽 위 [공유] → [링크 복사] 로 나온 주소를 붙여 넣으세요.\n" +
      "아직 만드는 중이면 비워 둬도 됩니다 — 다음 시간 발표 전까지 완성하면 돼요.\n" +
      "주소는 https:// 로 시작하지 않아도 저장할 때 자동으로 맞춰 줍니다.",
    kind: "text",
    maxLength: 300,
  },

  /*
   * ── ③ 대본 쓰고 리허설 (emotion 칸) ───────────────────────
   *
   * emotion 은 이 차시가 쓰는 STEP_PHASES 중 마지막이라 제출·출처 칸이 붙는다면 여기 붙는다
   * (lesson/page.tsx 의 finalWorkPhase). sourcesEnabled 를 꺼 두어 출처 칸은 안 붙는다.
   */
  {
    key: "_l6_script_intro",
    phase: "emotion",
    /*
     * 대본 틀 안내 + 다음 시간(7·8차) 발표 안내. 대본 틀을 발표 필수 요소와 대응시켜
     * (도입-문제-해결-기능-시연-개선-마무리) 요소 누락을 줄인다. 발표 시간 2~3분은 교사 조정 가능.
     */
    label: "⑦ 발표 대본 쓰기 — 이 틀대로 채우면 필수 요소가 다 들어가요",
    hint:
      "실제 발표는 다음 시간(7·8차)에 해요. 한 시간에 10~11명씩 나눠, 두 시간에 걸쳐 반 전체가\n" +
      "발표합니다. 한 사람당 약 2~3분이에요 (시간은 선생님이 조정할 수 있어요).\n\n" +
      "아래 대본 칸에 틀이 들어와 있어요. 틀의 각 줄이 발표 필수 요소와 이어집니다\n" +
      "· 도입 → 확정된 앱 소개\n" +
      "· 문제 → 누구의 불편\n" +
      "· 해결 → 앱이 무엇을 하는지\n" +
      "· 핵심 기능 → 주요 기능 2~3가지\n" +
      "· 시연 → 실제 앱 화면 보여 주기\n" +
      "· 개선 → 친구 피드백으로 고친 점\n" +
      "· 마무리 → 느낀 점·배운 점 + 인사\n\n" +
      "빈 곳(___)을 내 말로 채우고, 어색한 문장은 실제 말하듯 고치세요. 쓰는 대로 저장됩니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_l6_script_recap",
    phase: "emotion",
    label: "대본에 넣을 재료 (지금까지 쓴 것)",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "final_pitch", label: "확정된 앱 소개" },
      { key: "problem_who", label: "누구의 불편" },
      { key: "mvp_must1", label: "핵심 기능 ①" },
      { key: "mvp_must2", label: "핵심 기능 ②" },
      { key: "mvp_must3", label: "핵심 기능 ③" },
      { key: "fix6", label: "개선점 (반영·향후)" },
    ],
    maxLength: 0,
  },
  {
    key: "script",
    phase: "emotion",
    /*
     * 발표 대본. long 이라 입력이 멈추면 자동 저장된다. 틀을 prefill 로 넣어 빈 화면이
     * 아니라 채워진 종이로 시작하게 한다(빈 칸일 때 한 번만 채운다). 틀은 발표 필수 요소
     * 순서와 같다 — 도입/문제/해결/기능/시연/개선/마무리.
     */
    label: "발표 대본 — 틀을 채우고 다듬으세요 (쓰는 대로 저장돼요)",
    hint: "혼자 속으로(또는 아주 작게) 읽어 보며 어색한 곳을 고치면 좋아요. 너무 길면 2~3분에 안 맞아요 — 짧게.",
    kind: "long",
    maxLength: 800,
    prefillTemplate:
      "[도입] 안녕하세요. 제가 만든 앱을 소개합니다. {final_pitch}\n" +
      "[문제] 이 앱은 {problem_who} 의 불편함에서 시작했어요.\n" +
      "[해결] 그래서 이런 앱을 만들었습니다.\n" +
      "[핵심 기능] 주요 기능은 {mvp_must1}, {mvp_must2}, {mvp_must3} 입니다.\n" +
      "[시연] 지금 실제 화면을 보여 드리겠습니다. (여기서 앱을 열어 시연)\n" +
      "[개선] 받은 피드백을 이렇게 반영했어요 (또는 앞으로 개선할 점) — {fix6}\n" +
      "[마무리] 만들면서 느낀 점은 ___ 입니다. 들어주셔서 감사합니다.",
    copyable: true,
  },
  {
    key: "_l6_rehearsal_note",
    phase: "emotion",
    label: "⑧ 리허설 — 혼자 조용히 읽어 보며 연습해요",
    hint:
      "대본이 있어도, 혼자 한 번 읽어 보면 어디가 어색한지 바로 보여요. 소리 내어 크게 읽을\n" +
      "필요는 없어요 — 혼자 속으로, 또는 입속말로 살짝살짝 읽어 보며 연습하면 됩니다.\n" +
      "· 혼자 조용히 읽어 보기 — 눈으로만 넘기지 말고, 입속말로 한 번 짚어 보기\n" +
      "· 시간 가늠해 보기 — 2~3분에 맞는지 (너무 길면 대본을 줄이세요)\n" +
      "· 대본을 덜 보고 흐름 떠올려 보기 — 통째로 외우지 않아도, 큰 흐름만 기억하면 돼요\n" +
      "아래 칸에 해 본 것을 체크해 주세요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "rehearsal_done",
    phase: "emotion",
    label: "리허설 점검 — 해 본 것을 골라 주세요 (여러 개 가능)",
    hint: "다 못 해도 괜찮아요. 혼자 속으로 한 번이라도 읽어 보는 게 제일 중요해요.",
    kind: "multi",
    choices: [
      "혼자 조용히 읽어 봤어요",
      "시간을 가늠해 봤어요 (2~3분 안)",
      "대본을 덜 보고 흐름을 떠올려 봤어요",
      "어색한 문장을 고쳐 봤어요",
    ],
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "인간과 인공지능 6차시 — 발표 준비 (발표자료·대본)",

  // 3~5차시에서 켠 기분 체크를 이어 간다 (매일 하는 루틴)
  moodCheckEnabled: true,

  // 분반은 2~5차시와 같은 값을 유지한다. 바꾸면 데이터 통이 갈려 지난 답·앱이 안 열린다
  groups: [
    { key: "hai-tue-1", label: "화요일 1기", classNo: 1 },
    { key: "hai-tue-2", label: "화요일 2기", classNo: 2 },
    { key: "hai-thu-1", label: "목요일 1기", classNo: 3 },
    { key: "hai-thu-2", label: "목요일 2기", classNo: 4 },
  ],

  /*
   * 대기 단계를 쓰지 않는다 (교사 확정 — 기분 체크 뒤 곧바로 첫 활동으로).
   *
   * 세션 시작 단계를 'mood' 로 연다(open-hai6-*). 그러면 학생은 대기(waiting) 화면
   * (게임/placeholder)에 머물지 않고, 기분 체크(mood 단계: MoodPicker) → 곧바로 발표 준비
   * (grill: 캔바 로그인부터)로 넘어간다. game 은 대기 화면에서만 쓰이므로 비워 둔다 —
   * 어차피 대기 단계를 지나지 않아 렌더될 자리가 없다.
   *
   * ※ 대기(waiting) 단추도 대시보드에서 없앤다. availablePhase(dashboard/page.tsx)가
   *   "phaseOrder 를 명시했는데 waiting 이 없으면 대기 단추를 만들지 않는다"로 바뀌어,
   *   아래 phaseOrder(waiting 없음)면 대기 단추가 뒤에 붙지 않는다. 시작 단계를 mood 로
   *   여는 것과 합쳐, 교사 대시보드에도 학생 화면에도 대기 단계가 나타나지 않는다.
   */
  game: empty(),
  gameExplainer: empty(),

  // '오늘 할 일'(progress) 단계는 두지 않는다 (교사 확정 — 뒤에 붙는 안내 단추를 뺀다).
  // 오늘 흐름 안내는 발표 준비(grill) 첫 카드와 각 단계 note 로 충분하다. 비워 두면
  // availablePhase(progress)=hasContent 가 false 라 대시보드에 progress 단추가 안 생긴다.
  progress: empty(),
  assessment: empty(),
  video: empty(),

  /*
   * 오늘의 메타 학습은 "만든 것을 남에게 전할 준비를 한다" 이다.
   * 준비하며 신경 쓴 점·걱정되는 점을 열어 놓고 묻는다.
   */
  reflectionQuestions: [
    "오늘 발표 자료와 대본을 준비하면서 가장 신경 쓴 점은 무엇인가요?",
    "다음 시간 발표에서 가장 걱정되는 점, 또는 자신 있는 점을 한 가지 적어 보세요.",
  ],
  reflectionPublic: false,

  /*
   * 만들기·검토 단계에서 캔바로 나가는 것은 활동 자체라 이탈로 세지 않는다.
   * 발표 슬라이드도 캔바로 만든다. 받은 피드백은 이제 grill 안 표(received_feedback)로 보므로
   * [앱 감상](gallery) 단계는 없앴다 — 면제 목록에서도 gallery 를 뺀다.
   */
  focusExempt: ["grill", "emotion", "worksheet"],

  // 오늘도 캔바를 여러 번 드나든다. 앞뒤 칸으로 오갈 수 있어야 한다
  freeNavigation: true,

  /*
   * 단계 이름.
   *
   * grill → emotion 순서는 types.ts 의 LESSON_PHASES 가 정한 차례 그대로다. grill 에 발표 준비
   * 대부분(로그인·앱 확정·받은 피드백 참고 표·필수 요소·평가 기준·슬라이드)을, emotion 에
   * 대본·리허설을 얹는다. gallery(받은 피드백 보기) 단계는 없앴다 — 받은 피드백은 이제 grill 안
   * 표(received_feedback 문항)로 보고, build(최종 피드백 반영)도 앞서 없앴다.
   */
  phaseLabels: {
    grill: "발표 자료 만들기",
    emotion: "대본 쓰고 리허설",
    reflection: "회고",
  },

  /*
   * 단계 버튼 순서 (교사 확정 — 대기·오늘할일·최종피드백반영·받은피드백보기 단계를 흐름에서 뺀다).
   *
   * 대시보드는 [...phaseOrder, ...LESSON_PHASES 중 안 적은 것] 을 availablePhase 로 걸러
   * 버튼을 만든다. 여기 적은 실제 흐름(mood→grill→emotion→reflection→done)만 단추로 뜬다.
   * gallery(받은 피드백 보기)는 없앴다 — 받은 피드백을 grill 안 표(received_feedback)로 옮겼고,
   * gallery 단추는 phaseOrder 에서 빼는 것만으로는 안 사라진다(availablePhase 가 galleryEnabled
   * 로 판단해 뒤에 붙는다). 그래서 아래 activity.galleryEnabled 를 false 로 두어 교사 대시보드·
   * 학생 [앱 감상] 탭 양쪽에서 닫는다. build(최종 피드백 반영)는 앞서 없앴다 — 필수 항목
   * (로그인·앱 소개·앱 링크·개선점)은 grill 로 옮겨 build 에 남은 문항이 없어 단추가 안 뜬다.
   * waiting 은 여기 없고 availablePhase 가 "phaseOrder 에 waiting 없으면 숨김"으로 바뀌어 안
   * 뜬다. progress(오늘 할 일)·assessment 는 내용을 비워(empty) 안 뜬다. phaseOrder 는
   * snapshotOf·open 스크립트 양쪽으로 세션에 실린다.
   */
  phaseOrder: ["mood", "grill", "emotion", "reflection", "done"],

  activity: {
    activityId: ACTIVITY_ID,
    // 그리기가 없는 활동. 장소를 비우면 그리기 화면이 안 뜬다
    places: [],
    year: 2026,
    worksheet: WORKSHEET,

    // 자료를 찾는 시간이 아니라 발표를 준비하는 시간이라 출처 두 칸을 안 띄운다
    sourcesEnabled: false,

    /*
     * 서로 구경하기(gallery)를 끈다 — [앱 감상] 단계를 없앤다 (교사 확정).
     *
     * 받은 동료 피드백은 이제 [앱 감상] 탭이 아니라 grill 안의 참고 표(received_feedback 문항 →
     * /api/student/received-feedback)로 본다. 그 조회는 **내 작품에 달린 피드백만** 읽고 남의
     * 작품 목록을 열지 않으므로 galleryEnabled 에 기대지 않는다. 5차와 같은 활동 ID 라 그때
     * 받은 코멘트가 그대로 표에 열린다.
     *
     * false 로 두는 것이 privacy 상 더 안전하고(남의 작품 담벼락이 아예 안 열린다), 동시에
     * 교사 대시보드의 [앱 감상] 단추와 학생 [앱 감상] 탭을 함께 닫는다(availablePhase·canShare 가
     * 이 값을 본다). 아래 peerAssign·galleryAnswerKeys 등 서로구경 설정은 gallery 를 끄면
     * 작동하지 않지만, 5차 privacy 설정을 기록으로 남겨 둔다(다시 켤 일이 있으면 그대로 쓴다).
     */
    galleryEnabled: false,
    peerAssign: "random",
    peerCount: 3,
    galleryAssignedOnly: true,
    galleryNoun: "앱",

    // 왼쪽 활동지 탭 이름 (이 필드는 lesson 라우트가 학생 화면까지 실어 나른다)
    worksheetTabLabel: "발표 준비",

    /*
     * 친구에게 보여줄 답 칸(privacy — 5차와 같다). gallery 를 끈 오늘은 쓰이지 않지만,
     * 앱 주소 + 앱 소개·기획 칸만 여는 범위를 기록으로 남긴다. 성찰·회고·대본은 목록 밖이다.
     */
    galleryAnswerKeys: [
      "problem_who",
      "mvp_one",
      "mvp_must1",
      "mvp_must2",
      "mvp_must3",
      "build_url",
    ],
    galleryAnswerLabels: {
      problem_who: "누구의 불편",
      mvp_one: "한 줄 소개",
      mvp_must1: "기능 ①",
      mvp_must2: "기능 ②",
      mvp_must3: "기능 ③",
    },

    /*
     * 친구 앱에 남기는 두 칸의 문구(5차와 같음). gallery 를 끈 오늘은 안 쓰이지만, 5차 검토에서
     * 쌓인 좋은 점·개선점 두 칸이 grill 참고 표(친구 줄)에 그대로 열리므로 라벨을 남겨 둔다.
     */
    feedbackPrompts: {
      found: {
        label: "좋은 점 한 가지 — 눌러 써 보고",
        placeholder: "예) 버튼을 누르니 진짜로 오늘 급식이 떠서 좋았어요",
      },
      question: {
        label: "개선하면 좋을 점 한 가지",
        placeholder: "예) 첫 화면에 무슨 앱인지 제목이 있으면 더 좋겠어요",
      },
    },
  },
};

async function main(): Promise<void> {
  if (!CANVA_INVITE_URL) {
    console.error(
      "✗ CANVA_INVITE_URL 이 없습니다.\n" +
        "  .env.local 에 캔바 학교 팀 초대 주소를 넣어 주세요:\n" +
        "  CANVA_INVITE_URL=https://www.canva.com/brand/join?token=...\n" +
        "  (저장소가 공개라 코드에 직접 적지 않습니다)",
    );
    process.exit(1);
  }

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

  console.log("\n캔바 초대 주소");
  for (const [key, label] of [
    ["hai-tue-1", "화요일 1기"],
    ["hai-tue-2", "화요일 2기"],
    ["hai-thu-1", "목요일 1기"],
    ["hai-thu-2", "목요일 2기"],
  ] as const) {
    const url = CANVA_BY_GROUP[key];
    // 토큰은 앞 네 글자만 찍는다. 저장소·로그에 통째로 남기지 않는다
    console.log(
      `  ${label}  ${url ? url.replace(/token=([^&]{4})[^&]*/, "token=$1…") : "없음 — 기본 주소로 물러남"}`,
    );
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} (2~5차시와 같음 — 지난 앱·답·받은 피드백이 그대로 열립니다)`);
  console.log(`차시 번호 ${LESSON_NO} (정보과와 안 겹치게)`);
  console.log("단계: 기분 체크(mood) → 발표 자료 만들기(grill: ①캔바로그인 ②앱소개 ③개선점 · 받은 피드백 참고 표 · ④필수요소 ⑤평가기준 ⑥슬라이드) → ⑦⑧대본·리허설(emotion) → 회고");
  console.log("  ※ 대기(waiting)·오늘할일(progress)·최종피드백반영(build)·받은피드백보기(gallery) 단계를 흐름·대시보드 단추에서 뺐습니다. 받은 피드백은 grill 안 참고 표(received_feedback 문항)로 옮김 — build 는 앞서 제거, gallery 는 이번에 제거. 세션을 mood 로 열어 학생은 대기 화면 없이 기분 체크 뒤 곧바로 발표 준비로 갑니다.");
  console.log("  ※ phaseOrder=[mood,grill,emotion,reflection,done]. gallery 단추는 phaseOrder 에서 빼는 것만으로는 안 사라져(availablePhase 가 galleryEnabled 로 판단), activity.galleryEnabled=false 로 두어 교사 대시보드·학생 [앱 감상] 탭을 함께 닫음. waiting·progress·assessment·build 는 문항/내용이 없어 안 뜸. game 도 비움.");
  console.log("  ※ 지금까지 받은 피드백(🤖 AI · 🧑‍🏫 선생님 · 🧑‍🤝‍🧑 친구)을 grill 안 읽기 전용 참고 표(received_feedback)로 한자리에 편다. 데이터는 /api/student/received-feedback — 본인 것만, 친구 신원 비노출. 오늘 목표는 고치는 게 아니라 참고.");
  console.log("  ※ 실제 발표는 6차가 아니라 7·8차 (한 차시 10~11명씩, 1인 약 2~3분). 6차는 준비만. 개인(1인) 프로젝트 — '모둠' 문구는 '친구'로 정리.");
  console.log("  ※ grill 앞부분: 발표 필수 요소 체크리스트 + 평가 기준. 동료평가는 '작품(앱)' 정량 2개(유용성·완성도)만, 전달력·전체 인상은 교사평가 루브릭으로. 배점·시간 교사 조정 가능.");
  console.log("  ※ 오늘 목표는 구현이 아니라 발표 준비 — 피드백은 참고, 크게 안 고쳐도 됨. 못 반영한 것은 발표의 '앞으로 개선할 점'(fix6)으로. 리허설은 혼자 조용히(입속말) 읽어 보는 톤.");
  console.log(`  ※ 발표자료 만들기(_l6_slides_intro)에 캔바 발표 템플릿 링크(새 탭) 연결: ${CANVA_SLIDE_TEMPLATE_URL} — 분반 공용 공개 단축링크(linkUrl, linkUrlByGroup 아님). 로그인 링크와 별개.`);
  console.log("  ※ 대본은 필수 요소 순서(도입-문제-해결-기능-시연-개선-마무리) 틀을 prefill, long 이라 자동 저장.");
  console.log("  ※ 새 키: fix6(최종 수정)·final_pitch(확정 소개)·slides_url(발표자료 링크)·script(대본)·rehearsal_done(리허설 체크)·_l6_received(받은 피드백 참고 표). build_url 은 그대로 앱 링크.");
  console.log("서로 구경하기(gallery)를 껐습니다 (galleryEnabled: false) — [앱 감상] 단계 제거. 받은 피드백은 grill 안 참고 표로 봅니다.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
