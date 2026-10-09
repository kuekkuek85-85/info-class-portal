/**
 * 「인간과 인공지능」(진로탐색 선택과목) 8차시 — 발표 파트 2.
 *
 *   node --env-file=.env.local scripts/seed-hai8.ts
 *
 * ## 이 차시가 하는 것 — 개인 앱 발표 (나머지 절반)
 *
 * 7차시에 무작위 10~11명이 발표했다. 8차시는 **7차에 발표하지 않은 나머지**가 발표한다.
 * 개인(1인) 프로젝트다. 7차(발표 파트 1)를 그대로 따르되 **두 가지만** 바꾼다.
 *
 *   1) **PPT 대신 앱 라이브 시연** — 발표자가 자기 **앱(build_url)** 을 새 탭으로 열어 직접
 *      돌려보며 발표한다. 슬라이드(slides_url)는 백업으로 함께 열 수 있다. 그래서 대시보드
 *      발표자 열기 버튼이 8차에서는 **앱 우선("앱 열기") + 슬라이드 백업 보조 버튼**이 된다
 *      (plan.presentPrimary: "app"). 7차는 이 값이 없어 지금처럼 슬라이드 우선이다(무영향).
 *   2) **질의응답(Q&A) 없음** — 약 3분 앱 시연 → 질문 없이 바로 다음 발표자.
 *
 * 진행 순서(교사 확정): ① 평가 기준 먼저 안내 → ② 발표(약 3분 앱 시연) → ③ 동료평가 → ④ 교사평가.
 * 평가 기준·동료평가·교사평가는 7차와 **완전히 같다**.
 *
 * ## 데이터가 어디에 저장되는가 (7차와 동일)
 *
 *   · 동료평가 — 라이브 발표 중 현재 발표자마다 pe_<발표자학번> 키로, 평가한 학생 본인의
 *     활동지(artifact.answers)에 저장된다. 발표자에게는 어디에도 안 나간다(galleryEnabled false).
 *     교사만 대시보드·CSV 로 본다.
 *   · 교사평가 — 교사 전용 /teacher/eval (별도 컬렉션 teacherEvals, teacherFeedback 과 분리).
 *     학생이 닿는 어떤 경로도 이 값을 읽지 않는다. 같은 활동(hai-2026-1기)이라 7·8차 발표자
 *     모두 같은 화면에서 평가한다.
 *   · 발표자 본인 자료 — 활동 ID 가 2~7차와 같아(hai-2026-1기) 6차에 낸 앱 링크(build_url)·
 *     발표 슬라이드(slides_url)·확정 소개(final_pitch)·대본(script)이 그대로 열린다.
 *
 * ## 발표자 선정
 *
 * 포털 자동 추첨은 없다. 7차 미발표자 중에서 교사가 순서대로/지명해 넘긴다(7차와 같은 방식).
 *
 * ## 대기 = 앱 리허설 (게임 대신 본인 앱 돌려보기)
 *
 * 발표 차시라 대기 화면에 게임을 띄우지 않는다. 대신 그 자리에 발표자 '본인'의 **앱(build_url)**
 * 을 띄워, 대기 시간에 자기 앱을 미리 돌려보며 시연 연습을 하게 한다(7차는 슬라이드 리허설,
 * 8차는 앱 리허설). game.url 을 "answer:build_url" 로 두면 lesson 화면이 그 학생의 앱 링크를
 * 새 창으로 크게 여는 단추를 낸다. 세션은 waiting 으로 열어, 기분 체크를 먼저 하고 리허설로.
 *
 * ## 세션은 열지 않는다
 *
 * 이 스크립트는 차시 계획(LessonPlan)만 짓는다. 학생 노출은 교사가 세션을 열 때다(open-hai8-*).
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

/*
 * 8차도 (7차와 같이) 캔바 로그인/초대 주소 단계를 두지 않는다(학생은 자기 발표 링크 하나로 발표).
 * 그래서 seed-hai6 과 달리 CANVA_* 초대 주소를 읽지 않는다.
 */

/** ★ 2~7차시와 같은 값. 이 값이 같아야 6차에 낸 앱·발표 자료·대본이 오늘 화면에 열린다 */
const ACTIVITY_ID = "hai-2026-1기";
/** 차시 번호가 정보과와 겹치므로 100번대로 띄운다 (2차시 102 … 7차시 107) */
const LESSON_NO = 108;

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/* ──────────────────────────────────────────────────────────────
 * 평가 기준을 글로 나열하면 눈에 안 들어와(교사 지적), 동료·교사 기준을 표(SVG)로 그려
 * imageUrl 로 카드에 얹는다. worksheet-view 는 imageUrl 을 w-full img 로 그린다(15차와 같은 수법).
 * data:image/svg+xml + encodeURIComponent 로 한글··색코드가 안전하게 실린다.
 * ────────────────────────────────────────────────────────────── */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
/** 칸 폭에 맞춰 글자를 줄바꿈한다(한글 기준 대략적 글자수) */
function wrapCell(text: string, perLine: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const ch of text) {
    if (ch === "\n") {
      out.push(line);
      line = "";
      continue;
    }
    line += ch;
    if ([...line].length >= perLine) {
      out.push(line);
      line = "";
    }
  }
  if (line) out.push(line);
  return out.length ? out : [""];
}
function svgTable(o: {
  title: string;
  headers: string[];
  headFills: string[];
  headText: string[];
  rows: string[][];
  colW: number[];
}): string {
  const pad = 12;
  const fontS = 15;
  const lineH = 22;
  const cellPadX = 10;
  const cellPadY = 14;
  const titleH = 40;
  const headH = 38;
  const W = o.colW.reduce((a, b) => a + b, 0) + pad * 2;
  const perLine = o.colW.map((w) => Math.max(4, Math.floor((w - cellPadX * 2) / (fontS + 1))));
  const rowLines = o.rows.map((r) => r.map((cell, ci) => wrapCell(cell, perLine[ci])));
  const rowH = rowLines.map((cells) => Math.max(...cells.map((l) => l.length)) * lineH + cellPadY * 2);

  const parts: string[] = [];
  let y = titleH;
  // 헤더
  let x = pad;
  o.headers.forEach((h, ci) => {
    parts.push(`<rect x="${x}" y="${y}" width="${o.colW[ci]}" height="${headH}" fill="${o.headFills[ci]}" stroke="#e5e7eb"/>`);
    parts.push(`<text x="${x + cellPadX}" y="${y + 25}" font-size="15" font-weight="700" fill="${o.headText[ci]}">${esc(h)}</text>`);
    x += o.colW[ci];
  });
  y += headH;
  // 데이터 행
  rowLines.forEach((cells, ri) => {
    const h = rowH[ri];
    const fill = ri % 2 ? "#f8fafc" : "#ffffff";
    let cx = pad;
    cells.forEach((lines, ci) => {
      parts.push(`<rect x="${cx}" y="${y}" width="${o.colW[ci]}" height="${h}" fill="${fill}" stroke="#e5e7eb"/>`);
      lines.forEach((ln, li) => {
        const ty = y + cellPadY + fontS + li * lineH - 3;
        const weight = ci === 0 ? ` font-weight="700"` : "";
        const color = ci === 0 ? "#111827" : "#0f172a";
        parts.push(`<text x="${cx + cellPadX}" y="${ty}" font-size="${fontS}" fill="${color}"${weight}>${esc(ln)}</text>`);
      });
      cx += o.colW[ci];
    });
    y += h;
  });
  const H = y + pad;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ` +
    `font-family="'Malgun Gothic','Apple SD Gothic Neo',sans-serif">` +
    `<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>` +
    `<text x="${W / 2}" y="26" text-anchor="middle" font-size="18" font-weight="700" fill="#111827">${esc(o.title)}</text>` +
    parts.join("") +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** 동료평가(친구 평가) 기준 표 — 내용 이해·아이디어 유용성(3점) + 건설적 피드백(주관식) */
const PEER_CRITERIA_TABLE = svgTable({
  title: "친구 평가(동료평가) 기준",
  headers: ["평가 요소", "무엇을 보나요", "방식"],
  headFills: ["#bfdbfe", "#bfdbfe", "#fde68a"],
  headText: ["#1e40af", "#1e40af", "#92400e"],
  colW: [150, 340, 110],
  rows: [
    ["내용 이해", "문제와 해결 아이디어가 잘 이해됐나요?", "3점 척도"],
    ["아이디어·유용성", "핵심 기능이 쓸모 있어 보였나요?", "3점 척도"],
    ["건설적 피드백", "잘한 점 한 가지 + 더 좋아지려면 한 가지", "주관식"],
  ],
});

/** 선생님 평가(루브릭) 기준 표 — 시연 삭제, 문제·해결의 적절성/창의성 분리 */
const TEACHER_CRITERIA_TABLE = svgTable({
  title: "선생님 평가(루브릭) 기준",
  headers: ["평가 요소", "무엇을 보나요"],
  headFills: ["#bbf7d0", "#bbf7d0"],
  headText: ["#166534", "#166534"],
  colW: [175, 425],
  rows: [
    ["내용 충실성", "문제·해결·핵심 기능·개선점·소감을 담았는가"],
    ["문제·해결의 적절성", "문제가 분명하고, 해결이 그에 잘 맞는가"],
    ["창의성", "해결 방식이 새롭고 독창적인가"],
    ["전달력", "이해하기 쉬운 설명, 태도와 목소리"],
    ["동료 피드백 반영", "받은 피드백을 반영해 개선한 점이 보이는가"],
  ],
});

const WORKSHEET: WorksheetQuestion[] = [
  /*
   * ── 오늘 순서·발표 진행·평가 기준 안내 (build 칸) ────────────────
   *
   * 교사 확정 순서대로, 발표 전에 평가 기준을 먼저 읽힌다(같은 기준으로 준비→발표→평가).
   * (캔바 로그인 단계는 뺐다 — 학생은 자기 발표 링크 하나로 발표한다.)
   */
  {
    key: "_l8_today",
    phase: "build",
    label: "① 오늘 순서",
    hint:
      "오늘은 그동안 만든 앱을 발표해요. 이 발표는 나 혼자 만든 개인 프로젝트예요.\n" +
      "오늘(8차)은 지난 시간에 발표하지 않은 나머지가 발표합니다.\n\n" +
      "1) 평가 기준 먼저 보기 (아래)\n" +
      "2) 발표 — 한 사람당 약 3분, 자기 앱을 열어 직접 돌려보며 시연 (질문 없이 바로 다음 발표자)\n" +
      "3) 발표 진행 — 선생님이 발표자를 넘기면, 화면에 현재 발표자와 평가 창이 떠요\n" +
      "   (발표를 들으며 지금 발표자를 3점 평가 + 한마디)\n" +
      "4) 교사평가 — 선생님이 발표를 보며 평가합니다\n\n" +
      "발표 시간과 순서는 선생님이 조정할 수 있어요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_l8_run",
    phase: "build",
    label: "② 발표는 이렇게 진행해요",
    hint:
      "· 오늘 발표할 사람은 선생님이 순서대로/지명해 넘깁니다 (7차에 발표 안 한 사람).\n" +
      "· 차례가 되면 앞으로 나와, 자기 앱(앱 링크)을 열어 직접 돌려보며 약 3분 시연합니다.\n" +
      "· 발표가 끝나면 질문 없이 바로 다음 발표자로 넘어갑니다.\n" +
      "· 발표자는 아래 ‘내 발표 자료’ 에서 앱·슬라이드(백업)·대본을 열 수 있어요.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_l8_peereval_criteria",
    phase: "build",
    /*
     * 동료평가 기준 — 표(SVG)로 얹는다. 내용 이해·아이디어 유용성(3점 척도) + 건설적 피드백(주관식).
     * 아래 grill 의 peer_eval 입력 칸과 요소가 1:1 로 맞는다.
     */
    label: "③ 평가 기준 (1) 친구 평가 (동료평가)",
    hint:
      "친구 발표를 들으며 아래 표의 기준으로 봐요. 점수는 3점 척도 — 잘함 3 · 보통 2 · 아쉬움 1.\n" +
      "건설적 피드백은 글로 적어요. (배점은 선생님이 조정할 수 있어요.)",
    kind: "note",
    imageUrl: PEER_CRITERIA_TABLE,
    maxLength: 0,
  },
  {
    key: "_l8_teachereval_criteria",
    phase: "build",
    /*
     * 교사평가 기준(루브릭) — 표(SVG)로 얹는다. 시연 삭제, 문제·해결의 적절성/창의성 2개로 분리.
     */
    label: "③ 평가 기준 (2) 선생님 평가 (루브릭)",
    hint:
      "선생님은 아래 표의 기준(루브릭)으로 봐요. 발표를 준비한 필수 요소와 같은 기준이에요.\n" +
      "(항목별 배점·척도는 선생님이 조정할 수 있어요.)",
    kind: "note",
    imageUrl: TEACHER_CRITERIA_TABLE,
    maxLength: 0,
  },
  {
    key: "_l8_presenter",
    phase: "build",
    label: "④ 발표자라면 — 내 앱을 열어 두세요",
    hint:
      "오늘 발표 차례라면, 아래에 6차에 만든 내 앱 링크·발표 슬라이드·대본이 있어요.\n" +
      "앱 링크를 눌러 내 앱을 열어 놓고, 직접 돌려보며 약 3분 시연하세요.\n" +
      "슬라이드는 백업이에요 — 앱이 잘 안 열리면 슬라이드로 설명해도 됩니다.",
    kind: "note",
    maxLength: 0,
  },
  {
    key: "_l8_my_materials",
    phase: "build",
    /*
     * 발표자 본인 자료 — 같은 활동 ID 라 6차 답이 그대로 열린다. 8차는 앱 시연이라 앱(build_url)을
     * 맨 앞에 둔다. build_url 은 URL_ANSWER_KEYS 라 스킴 없이 저장돼도 눌리고, slides_url 은 https
     * 로 시작하면 링크로 뜬다(백업). script(대본)는 긴 글이라 그대로 펼쳐 읽는다.
     */
    label: "내 발표 자료 (발표자용)",
    hint: "",
    kind: "echo",
    echoKeys: [
      { key: "build_url", label: "내 앱 링크 (직접 시연)" },
      { key: "slides_url", label: "발표 슬라이드 (백업)" },
      { key: "final_pitch", label: "확정된 앱 소개 (첫마디)" },
      { key: "script", label: "발표 대본" },
    ],
    maxLength: 0,
  },

  /*
   * ── 발표 진행 (grill 칸) — 라이브 오케스트레이션 ─────────────
   *
   * 이 단계(grill) 학생 화면은 활동지 대신 lesson 페이지가 그리는 발표 화면으로 대체된다
   * (presentationPhase: "grill"). 교사가 발표자를 넘기면 현재 발표자와
   * 그 친구용 동료평가 창(내용 이해·아이디어 유용성 3점 + 건설적 피드백)이 뜬다.
   * 동료평가 답은 발표자마다 pe_<발표자학번> 키로 평가한 학생 본인 활동지에 저장된다 —
   * 발표자에게 노출 안 됨(galleryEnabled false). 교사만 대시보드·CSV 로 본다.
   *
   * 아래 note 는 화면에 뜨지 않는다(발표 화면이 대체함). 다만 대시보드가 이 단계 버튼을
   * 띄우려면 이 단계에 문항이 하나는 있어야 해서(availablePhase) 남겨 둔다.
   */
  {
    key: "_l8_present_intro",
    phase: "grill",
    label: "발표 진행",
    hint:
      "선생님이 발표자를 넘기면 현재 발표자와\n" +
      "그 친구를 평가하는 창이 이 화면에 나타나요.",
    kind: "note",
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  title: "인간과 인공지능 8차시 — 발표 (2)",

  // 7차와 같이 기분 체크를 이어 간다 (매일 하는 루틴)
  moodCheckEnabled: true,

  // 분반은 2~7차시와 같은 값을 유지한다. 바꾸면 데이터 통이 갈려 6차 발표 자료가 안 열린다
  groups: [
    { key: "hai-tue-1", label: "화요일 1기", classNo: 1 },
    { key: "hai-tue-2", label: "화요일 2기", classNo: 2 },
    { key: "hai-thu-1", label: "목요일 1기", classNo: 3 },
    { key: "hai-thu-2", label: "목요일 2기", classNo: 4 },
  ],

  /*
   * 대기 = 앱 리허설. 게임 대신 발표자 본인의 앱(6차 build_url)을 띄운다.
   * url 의 "answer:build_url" 는 lesson 화면이 읽어, 그 학생의 앱을 새 탭으로 크게 여는
   * 단추를 낸다. 대기 시간에 자기 앱을 미리 돌려보며 시연을 연습한다.
   * 아직 앱 링크를 안 낸 학생은 안내만 본다.
   */
  game: {
    heading: "앱 리허설 — 내 앱 미리 돌려보기",
    body:
      "발표 순서를 기다리는 동안, 아래 단추로 내 앱을 열어 미리 돌려보며 시연을 연습하세요.\n" +
      "새 탭에서 크게 열려요. (발표 때도 이렇게 앱을 열어 직접 보여 줍니다.)",
    url: "answer:build_url",
  },
  gameExplainer: empty(),

  progress: {
    heading: "오늘 할 일 (40분)",
    body:
      "그동안 만든 앱을 오늘 발표해요. 나 혼자 만든 개인 프로젝트를 남 앞에서 소개합니다.\n\n" +
      "오늘(8차)은 지난 시간에 발표하지 않은 나머지가 발표해요.\n" +
      "한 사람당 약 3분, 자기 앱을 열어 직접 돌려보며 시연합니다 (질문 없이 바로 다음 발표자).\n\n" +
      "① 평가 기준 먼저 보기 — 친구 평가·선생님 평가 기준\n" +
      "② 발표 — 차례가 된 사람이 앞에 나와 자기 앱을 열어 시연\n" +
      "③ 발표 진행 — 선생님이 발표자를 넘기면 화면에 현재 발표자·평가 창이 떠요\n" +
      "④ 회고 — 짧게\n\n" +
      "오늘은 잘 듣고 좋은 피드백을 남겨 줘요.",
    url: "",
  },
  assessment: empty(),
  video: empty(),

  reflectionQuestions: [
    "오늘 친구들의 발표를 들으며 새로 배운 점이나 인상 깊었던 점을 적어 보세요.",
    "내가 발표했다면, 잘된 점과 다음에 고치고 싶은 점을 한 가지씩 적어 보세요.",
  ],
  reflectionPublic: false,

  /*
   * 발표 중 캔바 슬라이드·앱을 새 창으로 여는 것은 활동 자체라 이탈로 세지 않는다.
   */
  focusExempt: ["build", "grill", "worksheet"],

  // 되돌아가기 끔 (교사 표준: 새 수업 기본 off). 발표는 대기(리허설)→build(발표)→grill(동료평가)
  // 로 앞으로만 가면 되고, 발표자 자료는 build 의 echo·대기 리허설에서 열리므로 뒤로 갈 일이 없다.
  freeNavigation: false,

  /*
   * 단계 이름. build(평가 기준·발표 진행) → grill(동료평가) → reflection(회고).
   * 대기(waiting)는 흐름에서 뺀다(아래 phaseOrder). teacher 평가는 학생 단계가 아니라
   * teacher/pre-review 에서 이뤄지므로 여기 단계가 없다.
   */
  phaseLabels: {
    progress: "오늘 할 일",
    build: "발표 안내",
    grill: "발표 진행",
    reflection: "회고",
  },

  /*
   * 라이브 발표 진행을 띄우는 단계. grill 단계에서 학생 화면은 활동지 대신
   * "현재 발표자 + 그 발표자용 동료평가"만 뜨고, 교사 대시보드에는 추첨·다음 넘김 패널이 뜬다.
   */
  presentationPhase: "grill",

  /*
   * 발표자 자료 열기 버튼이 **앱(build_url)을 먼저** 열게 한다 ("앱 열기" + 슬라이드 백업 보조).
   * 8차는 PPT 대신 앱 라이브 시연이라 앱 우선이다. 7차는 이 값이 없어 슬라이드 우선(무영향).
   * 대시보드 PresenterSlidesButton 이 session.presentPrimary 로 분기한다(open 스크립트가 세션에 실음).
   */
  presentPrimary: "app",

  /*
   * 단계 버튼 순서. 대기(waiting)를 맨 앞에 둔다 — 여기가 앱 리허설 화면이다.
   * 세션을 waiting 으로 열면 학생은 기분 체크(교사 표준) 먼저, 제출하면 리허설 화면을 만난다.
   * 교사가 발표를 시작하면 build 로 넘긴다. 리허설로 되돌리고 싶으면 [대기] 버튼을 다시 누른다.
   * mood 는 waiting 안에서 처리되므로 별도 단계로 두지 않는다.
   * phaseOrder 는 snapshotOf·open 스크립트로 세션에 실린다.
   */
  phaseOrder: ["waiting", "build", "grill", "reflection", "done"],

  activity: {
    activityId: ACTIVITY_ID,
    places: [],
    year: 2026,
    worksheet: WORKSHEET,

    // 발표·평가 시간이라 출처 두 칸을 안 띄운다
    sourcesEnabled: false,

    /*
     * 서로 구경하기를 끈다.
     *
     * 오늘은 라이브 발표라 갤러리가 필요 없고, 무엇보다 동료평가(peer_eval)를 발표자에게
     * 노출하지 않으려면 이 값이 false 여야 안전하다. false 면 서버가 갤러리 조회 자체를
     * 거절한다(student/gallery 라우트). peer_eval 답은 평가한 학생 본인 활동지에만 남고
     * 교사만 대시보드·CSV 로 본다.
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

  console.log(`\n활동 ID: ${ACTIVITY_ID} (2~7차시와 같음 — 6차 발표 자료·앱·대본이 그대로 열립니다)`);
  console.log(`차시 번호 ${LESSON_NO} (정보과와 안 겹치게)`);
  console.log("단계: 대기=앱 리허설(waiting) → 발표 안내(build: 오늘 순서·평가 기준 표·발표자 자료) → 발표 진행(grill: 라이브 넘김·발표·동료평가) → 회고");
  console.log("  ※ 발표 진행(grill) = 교사가 발표자를 넘기면(7차 미발표자, 순서대로/지명) 학생 화면이 4초 폴링으로 현재 발표자·평가창에 동기화. presentationPhase=grill.");
  console.log("  ※ 8차 = 7차 미발표자 발표. 1인 약 3분 앱 라이브 시연, 질의응답 없음(바로 다음). 발표자 선정은 교사가(포털 추첨 없음).");
  console.log("  ※ 발표 방식 = PPT 대신 앱(build_url) 라이브 시연. 대시보드 '앱 열기' 버튼(presentPrimary:\"app\") — 슬라이드는 '슬라이드 열기(백업)' 보조. 7차는 presentPrimary 없어 슬라이드 우선(무영향).");
  console.log("  ※ 동료평가 = 현재 발표자마다 pe_<발표자학번> 키(내용 이해·아이디어 유용성 3점 + 건설적 피드백). 답은 평가자 본인 활동지에만 저장 → 발표자 비노출(galleryEnabled false). 7차와 동일.");
  console.log("  ※ 평가 기준(동료·교사)은 카드에 표(SVG imageUrl)로 얹음.");
  console.log("  ※ 교사평가 = 교사 전용 /teacher/eval (별도 컬렉션 teacherEvals, teacherFeedback 과 분리 → 학생 어떤 경로도 비노출). 발표 때 폰에서 입력, 기본 접힘(점수 비노출).");
  console.log("  ※ 발표자 본인 자료(6차 build_url·slides_url·final_pitch·script)는 build 의 echo 로 열립니다(앱 우선).");
  console.log("  ※ 대기 화면 = 앱 리허설(본인 build_url, waiting 으로 시작). 서로 구경하기 끔.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
