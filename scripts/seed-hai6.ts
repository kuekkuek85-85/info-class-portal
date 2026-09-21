/**
 * 「인간과 인공지능」(진로탐색 선택과목) 6차시 — 발표 준비.
 *
 *   node --env-file=.env.local scripts/seed-hai6.ts
 *
 * ## 이 차시가 노리는 것 — 발표를 준비한다 (발표는 7·8차)
 *
 * 5차시까지 각자 앱을 하나씩 만들고, 내 눈 → AI → 선생님 → 친구(동료 검토) 순으로
 * 고쳐 왔다. 6차시는 그 앱을 **남 앞에서 발표할 준비**를 한다. 세 가지를 한다.
 *
 *   ① 최종 피드백 반영 — 5차에서 친구들이 남긴 동료 검토 피드백을 다시 읽고, 최종으로
 *      고칠 것을 확정한다(앱 소개도 확정).
 *   ② 발표자료 제작 — 캔바로 발표 슬라이드를 만든다.
 *   ③ 대본 쓰고 리허설 — 발표 대본을 쓰고, 소리 내어 연습한다.
 *
 * **실제 발표는 6차가 아니라 7·8차시**다(교사 확정). 한 차시에 10~11명씩 나눠 두 차시로
 * 반 전체를 소화한다. 그래서 6차는 순수 준비 차시이고, 대본·안내 문구에 "다음 시간에
 * 발표한다" 를 넣어 학생이 실제 발표를 대비하게 한다. 1인 발표 시간(약 2~3분)과 발표 필수
 * 요소·평가 기준은 안내(note)로 미리 보여 준다 — 숫자·배점은 교사가 조정할 수 있다는 톤.
 *
 * ## 5차 동료 검토 피드백을 어떻게 다시 보여 주는가
 *
 * 두 갈래로 이어받는다. 활동 ID 가 2~5차시와 같아서(hai-2026-1기) 지난 답·앱·받은
 * 피드백이 그대로 열린다.
 *   · 앱 소개·기획·5차에 고친 것(mvp_one·build_url·fix_teacher·fix5) → echo 문항으로 다시
 *     보여 준다(이전 활동 통에서 그대로 읽어 온다 — 열쇠가 같으면 그 칸이 곧 그 답이다).
 *   · 친구들이 남긴 **검토 코멘트**(좋은 점·개선할 점) → 이 코멘트는 활동지 답이 아니라
 *     피드백 문서(활동ID__학번)에 쌓여 있다. echo 로는 못 읽는다. 그래서 서로 구경하기를
 *     그대로 켜 두고([앱 감상] 탭 → [내 앱]), 5차에 받은 코멘트를 다시 읽게 한다.
 *     서로 구경하기 설정(배정·노출 칸·피드백 문구)은 5차와 똑같이 둔다(privacy 유지).
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
/** 차시 번호가 정보과와 겹치므로 100번대로 띄운다 (2차시 102 … 5차시 105) */
const LESSON_NO = 106;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const WORKSHEET: WorksheetQuestion[] = [
  /*
   * ── ① 최종 피드백 반영 (build 칸) ─────────────────────────
   *
   * 로그인을 맨 위에 둔다 — 3~5차시와 같은 이유(제일 오래 걸리는 일을 먼저 누르게).
   * 오늘도 캔바로 들어가 앱을 마지막으로 손보고, 발표 슬라이드도 캔바로 만든다.
   */
  {
    key: "_l6_login",
    phase: "build",
    label: "① 캔바에 다시 들어가기 — 먼저 눌러 두세요",
    hint:
      "아래 [캔바 열기] 를 누르고 [Microsoft로 계속하기] 를 고르세요.\n" +
      "내 학교 계정은 아래 칸에 있어요. [복사하기] 를 눌러 그대로 붙여 넣으면 됩니다.\n" +
      "비밀번호는 학교 계정 비밀번호예요.\n\n" +
      "지난 시간에 만든 앱은 캔바에 그대로 저장돼 있어요 — 오늘은 그걸 마지막으로 고치고,\n" +
      "발표 슬라이드도 캔바에서 새로 만듭니다.\n" +
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
    key: "_l6_recap",
    phase: "build",
    /*
     * 지난 시간까지 한 것을 편다 (같은 활동 ID 라 그대로 여기 있다).
     * 검토 코멘트 자체는 피드백 문서라 아래 [앱 감상] 탭에서 읽는다 — 여기선 내 앱·소개와
     * 5차에 이미 고친 것만 다시 보여 준다.
     */
    label: "지난 시간까지 여기까지 했어요",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "mvp_one", label: "내가 만든 앱 (한 줄 소개)" },
      { key: "build_url", label: "내가 낸 앱 링크" },
      { key: "fix_teacher", label: "선생님 피드백으로 고친 것" },
      { key: "fix5", label: "친구 피드백으로 고친 것 (5차)" },
    ],
    maxLength: 0,
  },
  {
    key: "_l6_received_note",
    phase: "build",
    /*
     * 5차에 받은 동료 검토 코멘트를 다시 읽게 한다.
     *
     * 이 코멘트는 활동지 답이 아니라 피드백 문서(활동ID__학번)에 쌓여 있어 echo 로는 못
     * 읽는다. 서로 구경하기를 켜 두었으므로 [앱 감상] 탭 → [내 앱] 에서 그대로 다시 뜬다
     * (gallery 라우트의 received — 같은 활동 ID 라 5차 코멘트가 그대로 남아 있다).
     * ※ 탭 이름은 화면에서 "앱 감상" 으로 뜬다(galleryNoun) — 여기 문구와 맞춰 둔다.
     */
    label: "② 친구들이 남긴 피드백부터 다시 읽어요",
    hint:
      "위쪽 [앱 감상] 탭을 누르고 [내 앱] 을 고르면, 지난 시간에 친구들이 내 앱에 남긴\n" +
      "좋은 점·개선할 점이 그대로 떠 있어요. 먼저 그걸 읽습니다.\n" +
      "오늘은 새로 검토하는 시간이 아니라, 받은 피드백을 보고 내 앱을 마지막으로 확정하는\n" +
      "시간이에요. (친구가 최종본을 어떻게 고쳤는지 궁금하면 [친구 앱] 도 참고로 볼 수 있어요.)",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_r6_teacher",
    phase: "build",
    /*
     * 선생님이 남긴 말이 학생 화면에 닿는 통로 (3~5차시와 같은 통로).
     * 화면이 /api/student/submit 을 조회해 artifact.teacherFeedback.note 를 그린다
     * (teacher-note-panel). 있으면 뜨고, 없으면 조용히 비어 있다.
     */
    label: "선생님이 남긴 말 (있으면)",
    hint: "",
    kind: "teacher_note",
    maxLength: 0,
  },
  {
    key: "fix6",
    phase: "build",
    /*
     * 최종 수정 사항. 5차 동료 검토 피드백 중 무엇을 어떻게 최종 반영했는지 한 줄.
     * 이 한 줄이 아래 대본의 [개선] 자리로 그대로 들어간다(script prefillTemplate).
     * 발표 필수 요소 5번(동료 피드백과 개선점)과도 이어진다.
     */
    label: "최종 수정 사항 — 친구 피드백을 보고 마지막으로 고친 것",
    hint:
      "친구들이 남긴 피드백 중 제일 납득된 것 하나를 골라, 캔바로 가서 마지막으로 고칩니다.\n" +
      "무엇을 어떻게 고쳤는지 한 줄로 적어 주세요. 이 문장은 발표 대본에도 그대로 들어갑니다.\n" +
      "예) ‘무슨 앱인지 첫 화면에 안 보인다’ 는 말을 듣고, 맨 위에 앱 이름과 한 줄 설명을 넣었어요\n" +
      "고치지 않기로 했다면 왜 그런지 적어도 좋아요 — 그것도 피드백을 받아들이는 방법이에요.",
    kind: "long",
    maxLength: 200,
  },
  {
    key: "build_url",
    phase: "build",
    /*
     * 2~5차시와 같은 키 — 이 칸이 곧 "앱 링크 제출함" 이자 발표 때 시연할 앱 주소다.
     * 오늘 마지막으로 고쳐 게시를 다시 했으면 새 주소로 바꾼다. 안 바뀌었으면 그대로.
     */
    label: "내 앱 링크 — 최종본 (발표 때 시연할 주소)",
    hint:
      "캔바 오른쪽 위 [게시] 를 다시 눌러 나온 주소를 붙여 넣으세요.\n" +
      "아래에 지난 시간에 낸 주소가 들어 있어요. 게시를 다시 해서 주소가 바뀐 경우에만\n" +
      "새것으로 고치면 됩니다 (안 바뀌었으면 그대로 두세요).\n" +
      "주소는 https:// 로 시작하지 않아도 저장할 때 자동으로 맞춰 줍니다.",
    kind: "text",
    maxLength: 300,
  },
  {
    key: "final_pitch",
    phase: "build",
    /*
     * 확정된 앱 소개(한두 줄). 발표 도입에서 쓸 한 줄이다. mvp_one 을 불러와 다듬게 한다.
     * 이미 쓴 것은 덮지 않는다(prefillTemplate 은 빈 칸일 때 한 번만 채운다).
     */
    label: "확정된 앱 소개 — 발표 첫마디로 쓸 한두 줄",
    hint:
      "지난 시간에 쓴 한 줄 소개가 아래에 들어와 있어요. 발표 첫마디로 쓸 수 있게 다듬어 주세요.\n" +
      "예) 급식을 매일 확인하기 번거로운 친구를 위해, 날짜를 누르면 오늘 급식이 바로 뜨는 앱이에요.",
    kind: "long",
    prefillTemplate: "{mvp_one}",
    maxLength: 200,
  },

  /*
   * ── ② 발표 기준과 자료 만들기 (grill 칸) ──────────────────
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
    label: "③ 발표에 꼭 들어가야 하는 것 — 자료와 대본에 이 여섯 가지를 담으세요",
    hint:
      "아래 여섯 가지가 다 들어가면 좋은 발표예요. 슬라이드도, 대본도 이 순서로 준비하세요.\n" +
      "(요소 개수와 발표 시간은 선생님이 조정할 수 있어요.)\n\n" +
      "1. 문제 정의 — 내가 발견한 문제, 누구의 어떤 불편함인지\n" +
      "2. 해결 아이디어 — 우리 앱이 무엇을 하는지 한 줄 소개\n" +
      "3. 핵심 기능 — 주요 기능 2~3가지\n" +
      "4. 시연 — 실제 앱 화면 보여 주기 (캡처를 넣거나, 발표 때 직접 열어 보여 줄 계획)\n" +
      "5. 동료 피드백과 개선점 — 5차 검토에서 받은 피드백 중 무엇을 어떻게 반영했는지\n" +
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
    label: "④ 다음 시간 발표는 이렇게 평가돼요 (1) 친구 평가 (동료평가)",
    hint:
      "다음 시간에는 친구 발표를 들으며 서로 평가해요. 아래 기준으로 준비하면 좋은 발표가 됩니다.\n" +
      "(항목별로 3점 척도로 매길 수 있어요 — 잘함 3 / 보통 2 / 아쉬움 1. 배점은 선생님이 조정할 수 있어요.)\n\n" +
      "· 내용 이해 — 문제와 해결 아이디어가 잘 이해됐나요?\n" +
      "· 아이디어·유용성 — 핵심 기능이 쓸모 있어 보였나요?\n" +
      "· 전달력 — 발표가 명확하고 잘 들렸나요?\n" +
      "· 건설적 피드백 — 잘한 점 한 가지 + 더 좋아지려면 한 가지를 남겨 주세요",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_l6_teachereval",
    phase: "grill",
    label: "④ 다음 시간 발표는 이렇게 평가돼요 (2) 선생님 평가 (루브릭)",
    hint:
      "선생님은 아래 기준(루브릭)으로 봅니다. 이 기준이 곧 위에서 본 필수 요소와 같아요.\n" +
      "(항목별 배점·척도는 선생님이 조정할 수 있어요.)\n\n" +
      "· 내용 충실성 — 발표 필수 요소(문제·해결·핵심 기능·시연·개선점·소감)를 담았는가\n" +
      "· 문제·해결의 적절성과 창의성 — 문제가 분명하고, 해결이 그에 맞고 새로운가\n" +
      "· 전달력 — 이해하기 쉬운 설명, 태도와 목소리\n" +
      "· 시연 — 실제 앱·화면을 보여 주었는가\n" +
      "· 동료 피드백 반영 — 5차 검토에서 받은 피드백을 반영해 개선한 점이 보이는가",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_l6_slides_intro",
    phase: "grill",
    label: "⑤ 캔바로 발표 슬라이드 만들기",
    hint:
      "이제 위 기준대로 발표 슬라이드를 만듭니다.\n" +
      "캔바 왼쪽 위 [디자인 만들기] → [프레젠테이션] 을 골라 새 슬라이드를 시작하세요.\n" +
      "직접 만들어도 되고, [Canva AI] 에게 초안을 부탁한 뒤 고쳐도 됩니다.\n" +
      "아래 [복사하기] 의 문장을 Canva AI 에 붙이면 6장짜리 초안을 만들어 줘요 —\n" +
      "그걸 내 앱 내용으로 고쳐 채우면 됩니다. 글씨는 크게, 한 장에 한 가지만 담으세요.",
    kind: "note",
    // Canva AI 에 붙일 초안 요청. 학생이 뒤에 자기 앱 이름을 이어 붙인다
    copyText:
      "발표용 프레젠테이션 초안을 만들어줘. 슬라이드는 6장이고 순서는 " +
      "1) 문제 2) 해결 아이디어 3) 핵심 기능 4) 시연 5) 개선한 점 6) 느낀 점 이야. " +
      "글씨는 크고 한 장에 한 가지만 담아줘.",
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
      { key: "fix6", label: "최종 수정 (개선점)" },
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
    label: "⑥ 발표 대본 쓰기 — 이 틀대로 채우면 필수 요소가 다 들어가요",
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
      { key: "fix6", label: "최종 수정 (개선점)" },
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
    hint: "실제 말하듯 소리 내어 읽으며 고치면 좋아요. 너무 길면 2~3분에 안 맞아요 — 짧게.",
    kind: "long",
    maxLength: 800,
    prefillTemplate:
      "[도입] 안녕하세요. 제가 만든 앱을 소개합니다. {final_pitch}\n" +
      "[문제] 이 앱은 {problem_who} 의 불편함에서 시작했어요.\n" +
      "[해결] 그래서 이런 앱을 만들었습니다.\n" +
      "[핵심 기능] 주요 기능은 {mvp_must1}, {mvp_must2}, {mvp_must3} 입니다.\n" +
      "[시연] 지금 실제 화면을 보여 드리겠습니다. (여기서 앱을 열어 시연)\n" +
      "[개선] 친구들의 피드백을 받아 이렇게 고쳤어요 — {fix6}\n" +
      "[마무리] 만들면서 느낀 점은 ___ 입니다. 들어주셔서 감사합니다.",
    copyable: true,
  },
  {
    key: "_l6_rehearsal_note",
    phase: "emotion",
    label: "⑦ 리허설 — 소리 내어 연습해요",
    hint:
      "대본이 있어도, 소리 내어 해 보면 어디가 어색한지 바로 보여요. 다음 시간 발표 전에\n" +
      "꼭 한 번 연습하세요.\n" +
      "· 소리 내어 읽어 보기 — 눈으로만 읽으면 실제 발표에서 막혀요\n" +
      "· 시간 재 보기 — 2~3분에 맞는지 (너무 길면 대본을 줄이세요)\n" +
      "· 대본을 덜 보고 말해 보기 — 통째로 외우지 않아도, 큰 흐름만 기억하면 돼요\n" +
      "· 짝이나 모둠 앞에서 해 보기 — 들어 준 친구에게 잘한 점 한 가지를 물어보세요\n" +
      "아래 칸에 해 본 것을 체크해 주세요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "rehearsal_done",
    phase: "emotion",
    label: "리허설 점검 — 해 본 것을 골라 주세요 (여러 개 가능)",
    hint: "다 못 해도 괜찮아요. 소리 내어 한 번이라도 해 보는 게 제일 중요해요.",
    kind: "multi",
    choices: [
      "소리 내어 읽어 봤어요",
      "시간을 재 봤어요 (2~3분 안)",
      "대본을 덜 보고 말해 봤어요",
      "짝이나 모둠 앞에서 해 봤어요",
    ],
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "인간과 인공지능 6차시 — 발표 준비 (최종 반영·발표자료·대본)",

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
   * 대기 게임을 비운다 (교사 확정 — 이 차시 대기는 아케이드 게임 대신 '최종 피드백 확인').
   *
   * 대기 화면(lesson/page.tsx viewPhase==="waiting")은 기분 체크를 먼저 띄우고, 그다음
   * game.url 이 있으면 그 iframe 을, 없으면 중립 안내(placeholder)를 그린다. 학생별
   * 5차 피드백(echo·[앱 감상]→[내 앱])은 활동지·감상 화면에서만 렌더되고 대기 화면에는
   * 못 싣는다(CSP frame-src 'self' https: 라 data URI 카드도 불가). 그래서 아케이드 게임을
   * 제거해 대기를 조용히 두고, '5차 최종 피드백 확인'은 수업이 시작되는 즉시(대기→최종
   * 피드백 반영 단계) 첫 활동으로 오게 배치했다 — build 칸 맨 앞의 로그인 → echo(내 앱
   * 소개·5차에 고친 것) → [앱 감상]→[내 앱](5차 동료 코멘트 재확인) 순서가 그것이다.
   */
  game: empty(),
  gameExplainer: empty(),

  progress: {
    heading: "오늘 할 일 (40분)",
    body:
      "지난 시간까지 각자 앱을 만들고, 내 눈 → AI → 선생님 → 친구 순으로 고쳐 왔어요.\n" +
      "오늘은 그 앱을 남 앞에서 발표할 준비를 합니다. 실제 발표는 다음 시간(7·8차)에 해요.\n\n" +
      "먼저 오늘 기분을 남기고, 화면이 넘어가면 맨 위 [캔바 열기] 를 누르세요.\n" +
      "제일 먼저 지난 시간에 친구들이 내 앱에 남긴 피드백부터 다시 읽습니다.\n\n" +
      "① 최종 피드백 반영 — 친구들이 5차에 남긴 피드백을 다시 읽고, 앱을 마지막으로 확정\n" +
      "② 발표 기준·자료 만들기 — 꼭 들어갈 여섯 가지와 평가 기준을 보고, 캔바로 슬라이드 만들기\n" +
      "③ 대본 쓰고 리허설 — 발표 대본을 쓰고, 소리 내어 연습\n" +
      "④ 회고 — 짧게\n\n" +
      "다음 시간에는 한 시간에 10~11명씩 나눠 발표해요. 한 사람당 약 2~3분입니다.\n" +
      "오늘 발표 평가 기준도 미리 볼 수 있어요 — 그 기준대로 준비하면 됩니다.",
    url: "",
  },
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
   * 발표 슬라이드도 캔바로 만들고, 받은 피드백도 [앱 감상] 으로 연다 — gallery 도 면제에 넣는다.
   */
  focusExempt: ["build", "grill", "emotion", "worksheet", "gallery"],

  // 오늘도 캔바·받은 피드백을 여러 번 드나든다. 앞뒤 칸으로 오갈 수 있어야 한다
  freeNavigation: true,

  /*
   * 단계 이름.
   *
   * build → grill → emotion 순서는 types.ts 의 LESSON_PHASES 가 정한 차례 그대로다
   * (4차시와 같은 배치). 세 단계에 발표 준비 세 갈래를 얹는다. phaseOrder 는 쓰지 않는다 —
   * 자연 순서가 이미 맞아서 순서를 바꿀 이유가 없다. gallery(받은 피드백)는 활동지 문항이
   * 없고 [앱 감상] 탭으로만 열리므로 단계 버튼 이름만 참고로 둔다.
   */
  phaseLabels: {
    progress: "오늘 할 일",
    build: "최종 피드백 반영",
    grill: "발표 기준·자료 만들기",
    gallery: "받은 피드백 보기",
    emotion: "대본 쓰고 리허설",
    reflection: "회고",
  },

  activity: {
    activityId: ACTIVITY_ID,
    // 그리기가 없는 활동. 장소를 비우면 그리기 화면이 안 뜬다
    places: [],
    year: 2026,
    worksheet: WORKSHEET,

    // 자료를 찾는 시간이 아니라 발표를 준비하는 시간이라 출처 두 칸을 안 띄운다
    sourcesEnabled: false,

    /*
     * 서로 구경하기를 켠 채로 둔다 (5차와 같음).
     *
     * 오늘은 새로 검토하는 시간이 아니지만, 5차에 받은 동료 검토 코멘트를 [앱 감상] 탭 →
     * [내 앱] 에서 다시 읽게 하려면 이 값이 true 여야 한다(gallery 라우트의 received).
     * 같은 활동 ID 라 5차 코멘트가 그대로 남아 있다. 설정은 5차와 똑같이 두어 privacy 를
     * 유지한다 — 배정 3편만 노출, 앱 소개 칸만 열기, 좋은 점·개선점 두 칸.
     */
    galleryEnabled: true,
    peerAssign: "random",
    peerCount: 3,
    galleryAssignedOnly: true,
    galleryNoun: "앱",

    // 왼쪽 활동지 탭 이름 (이 필드는 lesson 라우트가 학생 화면까지 실어 나른다)
    worksheetTabLabel: "발표 준비",

    /*
     * 친구에게 보여줄 답 칸(privacy — 5차와 같다). 앱 주소 + 앱 소개·기획 칸만 연다.
     * 성찰·회고·대본 칸은 목록에 없어 안 나간다. 익명 유지(galleryShowNames 안 켠다).
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
     * 친구 앱에 남기는 두 칸의 문구(5차와 같음). 오늘은 주로 [내 앱] 을 읽지만, [친구 앱] 을
     * 참고로 보다 한마디 남길 수도 있어 문구를 그대로 둔다 — 폼 필드 자체는 코드라 안 건드린다.
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
  console.log("단계: 대기(기분 체크만·게임 없음) → 오늘 할 일 → ①최종 피드백 반영(build) → ②발표 기준·자료(grill) → ③대본 쓰고 리허설(emotion) → 회고");
  console.log("  ※ 대기 게임을 비웠습니다(game: empty). 기분 체크 뒤 대기 화면은 중립 안내만. 5차 최종 피드백 확인은 수업 시작 즉시 build 첫 활동으로: 로그인 → echo(내 앱·5차 수정) → [앱 감상]→[내 앱](5차 코멘트).");
  console.log("  ※ 실제 발표는 6차가 아니라 7·8차 (한 차시 10~11명씩, 1인 약 2~3분). 6차는 준비만.");
  console.log("  ※ 5차 동료 검토 코멘트는 [앱 감상] 탭 → [내 앱] 에서 다시 읽힙니다 (galleryEnabled·같은 활동 ID). 앱 소개·5차 수정은 echo 로 이어받습니다.");
  console.log("  ※ grill 앞부분에 발표 필수 요소 체크리스트 + 동료평가·교사평가 기준을 note 로 배치(자료·대본 앞). 배점·시간은 교사 조정 가능 톤. 7·8차 평가 폼 재사용 가능.");
  console.log("  ※ 대본은 필수 요소 순서(도입-문제-해결-기능-시연-개선-마무리) 틀을 prefill, long 이라 자동 저장.");
  console.log("  ※ 새 키: fix6(최종 수정)·final_pitch(확정 소개)·slides_url(발표자료 링크)·script(대본)·rehearsal_done(리허설 체크). build_url 은 그대로 앱 링크.");
  console.log("서로 구경하기를 켰습니다 (galleryEnabled: true, 5차와 같은 privacy 설정).");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
