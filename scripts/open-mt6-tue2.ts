/**
 * 「디지털 마음 톡톡」 6회기(효과적인 의사소통·공감, 활동4·5) - 화요일 2기 실세션을 연다.
 *
 *   node --env-file=.env.local scripts/open-mt6-tue2.ts [날짜] [교시] [--force]
 *   (기본: 2026-11-24 7교시 -> 2026-11-24__7__mt-tue-2)
 *
 * open-mt6-thu2.ts(목2기)를 화요일 2기로 옮긴 것. 화2기는 202(10/27)·203(11/3)·204(11/10)·
 * 205(11/17)를 마쳤고 다음이 206 이다(5회기에서 뺀 활동4·5).
 *
 * -- 교시 ---------------------------------------------------------
 *  · 6~7교시 2시간 연속이지만 세션은 **7교시 하나**로 연다(마음 톡톡 관례, 화2기 202~205 동일).
 *    6교시로 열면 6교시 끝(15:00+10분)에 코드가 닫힌다. 7교시면 15:55+10분까지 산다.
 *    scheduled 상태는 시각으로 닫히지 않으므로(isSessionClosed) 6교시 시작부터 써도 된다.
 *
 * -- 목2기 오프너와 다른 점 ----------------------------------------
 *  · 분반(mt-tue-2)·데이터 통(classNo 3)·수업일(2026-11-24)·교시(7)
 *  · 캔바 로그인 칸(_a4_calli_login)은 **화2기 토큰만**(env CANVA_INVITE_MT_TUE_2).
 *    linkUrlByGroup 에 화2기가 없으면 기본값(=다른 분반 토큰)으로 떨어지지 않게 env 로 못박는다.
 *  · 서로 감상(galleryEnabled)은 목2기 공개수업 강제 켬이 아니라 **계획값**을 따른다. 단 친구에게
 *    나가는 칸이 정확히 ['a4_calli_image'] 가 아니면 무조건 끈다(감정·서술 글 누수 차단).
 *
 * -- 표준 ---------------------------------------------------------
 *  · 대기=마음 체크인만(대기 게임 없음), freeNavigation off, hideDoneButton on,
 *    moodCheckEnabled on(세션당 1회 강제 관문). phaseOrder 에서 mood 는 뺀다.
 *
 * -- 프라이버시 -----------------------------------------------------
 *  · 공유는 캘리그래피 이미지 한 칸뿐(익명, galleryShowNames 없음). 덕목 이유·나 전달법·
 *    갈등 분석·공감 문장·감정 대화·위로 챗봇은 화이트리스트 밖이라 서버가 응답에 안 싣는다.
 *  · 마음일기 비공개(reflectionPublic:false). 206 계획(seed-mt6) 내용은 수정하지 않는다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import type { LessonPlan, WorksheetQuestion } from "../src/lib/types.ts";

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

const LESSON_NO = 206;
const GROUP_KEY = "mt-tue-2";
const GROUP_LABEL = "화요일 2기";
/** 화면에 안 보이는 데이터 통 번호. 계획 groups 의 mt-tue-2 와 같아야 한다 */
const CLASS_NO = 3;
/** 위치 인자(날짜·교시)는 --플래그 를 뺀 것에서 읽는다 */
const POSITIONAL = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const DATE = POSITIONAL[0] ?? "2026-11-24";
const PERIOD = Number(POSITIONAL[1] ?? 7);
const SESSION_ID = `${DATE}__${PERIOD}__${GROUP_KEY}`;
/** --force: 아직 시작 안 한(scheduled·실데이터 없음) 세션만 덮어 다시 연다 */
const FORCE = process.argv.includes("--force");

/** 화2기 전용 캔바 토큰(없으면 빈값). 기본값(다른 분반) 누수 금지 */
const CANVA_TUE_2 = process.env.CANVA_INVITE_MT_TUE_2 ?? "";
/** 캔바 로그인 성격의 키 - 분반 초대 토큰이 붙는 자리 */
const CANVA_LOGIN_KEYS = new Set(["_canva_login", "_a4_calli_login"]);

const EMPTY = { heading: "", body: "", url: "" };

/**
 * 분반 주소 표를 이 분반 것 하나로 줄인다(누수 안전).
 *  · byGroup 에 mt-tue-2 가 있으면 그것만.
 *  · 없으면: 캔바 로그인 칸이면 화2기 env 로, 아니면 **빈값**(기본값으로 안 떨어지게).
 *  · byGroup 이 애초에 없어도, 캔바 로그인 칸이면 화2기 env 로 못박는다(기본 linkUrl 누수 차단).
 */
function resolveWorksheet(original: WorksheetQuestion[]): { kept: WorksheetQuestion[]; canva: string } {
  let canva = "";
  const kept = original.map((q) => {
    const next = { ...q } as WorksheetQuestion & { linkUrlByGroup?: Record<string, string>; linkUrl?: string; key?: string };
    const isCanvaLogin = CANVA_LOGIN_KEYS.has(String(next.key));
    if (next.linkUrlByGroup) {
      const byGroup = next.linkUrlByGroup;
      delete next.linkUrlByGroup;
      const mine = byGroup[GROUP_KEY];
      if (mine) next.linkUrl = mine;
      else if (isCanvaLogin) next.linkUrl = CANVA_TUE_2;
      else next.linkUrl = "";
    } else if (isCanvaLogin) {
      next.linkUrl = CANVA_TUE_2;
    }
    if (isCanvaLogin) canva = next.linkUrl ?? "";
    return next;
  });
  return { kept, canva };
}

async function main(): Promise<void> {
  const plans = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  if (plans.empty) {
    console.error(`✗ ${LESSON_NO}차시 계획이 없습니다. 먼저 scripts/seed-mt6.ts 를 돌리세요.`);
    process.exit(1);
  }
  const planDoc = plans.docs[0];
  const p = planDoc.data() as LessonPlan & Record<string, any>;

  const original = (p.activity?.worksheet ?? []) as WorksheetQuestion[];
  const { kept, canva } = resolveWorksheet(original);
  const activityId = (p.activity as { activityId?: string })?.activityId;

  const galleryKeys = ((p.activity as { galleryAnswerKeys?: string[] })?.galleryAnswerKeys ?? []) as string[];
  const GALLERY_ON =
    (p.activity as { galleryEnabled?: boolean })?.galleryEnabled === true &&
    galleryKeys.length === 1 &&
    galleryKeys[0] === "a4_calli_image";

  const existing = await db.collection("classSessions").doc(SESSION_ID).get();
  let code = "";
  if (existing.exists) {
    const s = existing.data() as { code?: string; status?: string; lessonNo?: number; startedAt?: unknown };
    if (!FORCE) {
      console.error(`✗ 이미 있습니다 - ${SESSION_ID} (코드 ${s.code}, ${s.status}, ${s.lessonNo}차시).`);
      console.error("  덮어쓰지 않고 멈춥니다. 다시 열려면 --force (실데이터 없을 때만 덮습니다).");
      process.exit(1);
    }
    // 실데이터 가드: '진짜 학생'(학번 끝 2자리 1~39)의 출석/작품이 있으면 멈춘다.
    // active 상태·테스트 계정(90번 등)은 선생님 테스트라 덮어도 된다(재오픈 시 대기로 초기화).
    const realNum = (sid: unknown) => {
      const n = Number(String(sid ?? "").slice(-2));
      return Number.isFinite(n) && n >= 1 && n < 40;
    };
    const att = await db.collection("attendance").where("sessionId", "==", SESSION_ID).get();
    const realAtt = att.docs.filter((a) => realNum((a.data() as { studentId?: string }).studentId));
    let realArt = 0;
    if (activityId) {
      const arts = await db.collection("artifacts").where("activityId", "==", activityId).where("classNo", "==", CLASS_NO).get();
      realArt = arts.docs.filter((a) => realNum((a.data() as { studentId?: string }).studentId)).length;
    }
    if (realAtt.length > 0 || realArt > 0) {
      console.error(`✗ ${SESSION_ID} 에 진짜 학생 데이터(출석 ${realAtt.length}·작품 ${realArt})가 있어 덮지 않습니다 - 멈춥니다.`);
      process.exit(1);
    }
    code = String(s.code ?? "");
    console.log(`↻ --force: 기존 세션(코드 ${code}, ${s.status}${att.size ? `, 테스트출석 ${att.size}명` : ""})을 덮어 다시 엽니다.`);
  } else {
    // 코드: 오늘 살아있는 세션들이 쓰는 코드는 피한다(리허설 코드13·14 포함).
    const all = await db.collection("classSessions").get();
    const taken = new Set(
      all.docs
        .map((d) => d.data() as { code?: string; status?: string; date?: string })
        .filter((s) => s.status !== "ended" || s.date === DATE)
        .map((s) => String(s.code ?? "")),
    );
    for (let n = 11; n <= 99; n += 1) {
      if (!taken.has(String(n))) { code = String(n); break; }
    }
    if (!code) {
      console.error("✗ 오늘 쓸 수 있는 수업 코드가 없습니다.");
      process.exit(1);
    }
    await db.collection("codeReservations").doc(`${DATE}__${code}`).set({ date: DATE, code, createdAt: Date.now() });
  }

  await db.collection("classSessions").doc(SESSION_ID).set({
    id: SESSION_ID,
    lessonPlanId: planDoc.id,
    lessonNo: LESSON_NO,
    title: p.title,
    classNo: CLASS_NO,
    groupKey: GROUP_KEY,
    groupLabel: GROUP_LABEL,
    date: DATE,
    period: PERIOD,
    code,
    status: "scheduled",
    phase: "waiting",
    rehearsal: false,
    demo: false,
    teacherNote: "",
    startedAt: null,
    endedAt: null,
    // ── 계획에서 그대로 ──
    moodCheckEnabled: p.moodCheckEnabled,
    progress: p.progress,
    assessment: p.assessment,
    video: p.video,
    videoPrompts: p.videoPrompts ?? [],
    reflectionQuestions: p.reflectionQuestions,
    reflectionPublic: p.reflectionPublic, // false(마음일기 비공개)
    quiz: p.quiz,
    phaseOrder: (p.phaseOrder ?? []).filter((ph: string) => ph !== "mood"),
    phaseLabels: p.phaseLabels ?? {},
    focusExempt: p.focusExempt ?? [],
    progressChecks: p.progressChecks,
    activity: {
      ...p.activity,
      worksheet: kept,
      // 계획값을 따르되, 나가는 칸이 캘리그래피 이미지 한 칸이 아니면 끈다(감정 글 누수 차단).
      galleryEnabled: GALLERY_ON,
    },
    // ── 화2기 표준 덮어쓰기 ──
    game: EMPTY, // 대기 게임 없음(대기=마음 체크인만)
    gameExplainer: EMPTY,
    freeNavigation: false,
    hideDoneButton: true,
    createdAt: Date.now(),
  });

  const back = (await db.collection("classSessions").doc(SESSION_ID).get()).data() as Record<string, any> | undefined;
  if (!back?.code) {
    console.error("✗ 문서가 제대로 안 써졌습니다.");
    process.exit(1);
  }
  const act = back.activity as Record<string, any>;
  const po = (back.phaseOrder as string[]) ?? [];
  console.log(`✓ 열림  ${SESSION_ID}`);
  console.log(`  ${DATE} ${PERIOD}교시 · ${GROUP_LABEL} · ${LESSON_NO}차시 "${back.title}"`);
  console.log(`  수업 코드  ${back.code}  · 상태 ${back.status} · 단계 ${back.phase} · rehearsal ${back.rehearsal}`);
  console.log(`  표준: 대기게임 ${(back.game as { heading?: string })?.heading ? "있음⚠" : "없음✓"} · freeNav ${back.freeNavigation ? "켬⚠" : "끔✓"} · hideDoneButton ${back.hideDoneButton ? "켬✓" : "끔⚠"} · 마음체크 ${back.moodCheckEnabled ? "켬✓" : "끔⚠"}`);
  console.log(`  phaseOrder ${po.length}단계 · mood ${po.includes("mood") ? "포함⚠" : "없음✓"}`);
  console.log(`  서로의 마음 읽기 ${act.galleryEnabled ? "켬" : "끔"} · 나가는 칸 ${JSON.stringify(act.galleryAnswerKeys)} · 실명 ${act.galleryShowNames ? "예⚠" : "아니오(익명)✓"} · 마음일기 ${back.reflectionPublic ? "공개⚠" : "비공개✓"}`);
  const shown = canva ? canva.replace(/token=([^&]{4})[^&]*/, "token=$1…") : "(빈값)";
  const tue2Tok = CANVA_TUE_2.match(/token=([^&]+)/)?.[1] ?? "";
  const myTok = canva.match(/token=([^&]+)/)?.[1] ?? "";
  const label = !canva ? "" : myTok && myTok === tue2Tok ? " [화2기 env 초대 ✓]" : " [⚠ 화2기 env와 다른 토큰]";
  console.log(`  캔바 초대(캘리그래피)  ${shown}${label}`);
  console.log(`  남의 분반 토큰 실림  ${JSON.stringify(act).includes("linkUrlByGroup") ? "예 ← 문제⚠" : "아니오✓"}`);
  const labels = (back.phaseLabels as Record<string, string>) ?? {};
  console.log(`\n  흐름: ${po.map((ph) => labels[ph] ?? ph).join(" > ")}`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
