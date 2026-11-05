/**
 * 「디지털 마음 톡톡」 6회기(효과적인 의사소통·공감, 활동4·5) — 목요일 2기 실세션을 연다.
 *
 *   node --env-file=.env.local scripts/open-mt6-thu2.ts [날짜] [교시]
 *   (기본: 2026-11-05 8교시 → 2026-11-05__8__mt-thu-2)
 *
 * open-mt6-thu1.ts(목1기)를 목2기로 옮긴 것. 오늘 공개수업은 7교시 203 + 8교시 206 두
 * 실세션으로 이어 진행한다(물리적으로 합치지 않음). 이 스크립트는 8교시 206만 연다.
 *
 * ── 목1기 오프너와 다른 점 ─────────────────────────────────────────
 *  · 분반(mt-thu-2)·데이터 통(classNo 4)·교시(8)·수업일(2026-11-05)
 *  · **누수 안전 캔바 리졸버** — 캔바 로그인 칸(_a4_calli_login)은 **목2기 토큰만**(env
 *    CANVA_INVITE_MT_THU_2). linkUrlByGroup 에 목2기가 없으면 기본값(=다른 분반 토큰)으로
 *    떨어지지 않고, 로그인 칸은 목2기 env 로, 그 밖은 빈값으로 못박는다(203 오프너와 동일 방식).
 *  · **목2기 표준 세션 모양** — 대기=마음 체크인만(대기 게임 없음), freeNavigation off,
 *    hideDoneButton on(마침 버튼 숨김). 계획의 game/freeNavigation 을 세션에서 덮는다.
 *  · 화요일 1기 메모 이어받기는 하지 않는다(공개수업 세션이라 빈 메모로 연다).
 *
 * ── 프라이버시(기존 206 설정 그대로) ──────────────────────────────
 *  · 서로의 마음 읽기(galleryEnabled)는 **끔**(목1기·화1기 오프너와 동일). 의사소통·공감·감정
 *    대화 글은 친구에게 안 나간다 — 서버 갤러리 라우트가 galleryEnabled:false 로 응답을 막는다.
 *  · 마음일기 비공개(reflectionPublic:false, 계획 그대로). 갤러리 익명 기본(galleryShowNames 없음).
 *  · 206 계획(seed-mt6) 내용은 **수정하지 않는다** — 세션으로 열기만 한다.
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
const GROUP_KEY = "mt-thu-2";
const GROUP_LABEL = "목요일 2기";
/** 화면에 안 보이는 데이터 통 번호. 계획 groups 의 mt-thu-2 와 같아야 한다 */
const CLASS_NO = 4;
const DATE = process.argv[2] ?? "2026-11-05";
const PERIOD = Number(process.argv[3] ?? 8);
const SESSION_ID = `${DATE}__${PERIOD}__${GROUP_KEY}`;

/** 목2기 전용 캔바 토큰(없으면 빈값). 기본값(다른 분반) 누수 금지 */
const CANVA_THU_2 = process.env.CANVA_INVITE_MT_THU_2 ?? "";
/** 캔바 로그인 성격의 키 — 분반 초대 토큰이 붙는 자리 */
const CANVA_LOGIN_KEYS = new Set(["_canva_login", "_a4_calli_login"]);

const EMPTY = { heading: "", body: "", url: "" };

/**
 * 분반 주소 표를 이 분반 것 하나로 줄인다(누수 안전).
 *  · byGroup 에 mt-thu-2 가 있으면 그것만.
 *  · 없으면: 캔바 로그인 칸이면 목2기 env 로, 아니면 **빈값**(기본값으로 안 떨어지게).
 *  · byGroup 이 애초에 없어도, 캔바 로그인 칸이면 목2기 env 로 못박는다(기본 linkUrl 누수 차단).
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
      else if (isCanvaLogin) next.linkUrl = CANVA_THU_2;
      else next.linkUrl = "";
    } else if (isCanvaLogin) {
      next.linkUrl = CANVA_THU_2;
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

  const existing = await db.collection("classSessions").doc(SESSION_ID).get();
  if (existing.exists) {
    const s = existing.data() as { code?: string; status?: string; lessonNo?: number };
    // 실데이터 가드: 이미 있는 세션은 덮지 않는다(공개수업 전이라 비어 있어야 정상).
    console.error(`✗ 이미 있습니다 — ${SESSION_ID} (코드 ${s.code}, ${s.status}, ${s.lessonNo}차시).`);
    console.error("  덮어쓰지 않고 멈춥니다. 비우려면 먼저 이 세션을 확인/삭제하세요.");
    process.exit(1);
  }

  const original = (p.activity?.worksheet ?? []) as WorksheetQuestion[];
  const { kept, canva } = resolveWorksheet(original);

  // 코드: 오늘 살아있는 세션들이 쓰는 코드는 피한다(리허설 코드13·14 포함).
  const all = await db.collection("classSessions").get();
  const taken = new Set(
    all.docs
      .map((d) => d.data() as { code?: string; status?: string; date?: string })
      .filter((s) => s.status !== "ended" || s.date === DATE)
      .map((s) => String(s.code ?? "")),
  );
  let code = "";
  for (let n = 11; n <= 99; n += 1) {
    if (!taken.has(String(n))) { code = String(n); break; }
  }
  if (!code) {
    console.error("✗ 오늘 쓸 수 있는 수업 코드가 없습니다.");
    process.exit(1);
  }
  await db.collection("codeReservations").doc(`${DATE}__${code}`).set({ date: DATE, code, createdAt: Date.now() });

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
    phaseOrder: p.phaseOrder ?? [],
    phaseLabels: p.phaseLabels ?? {},
    focusExempt: p.focusExempt ?? [],
    progressChecks: p.progressChecks,
    activity: {
      ...p.activity,
      worksheet: kept,
      // 기존 206 설정 그대로 — 서로의 마음 읽기 끔(의사소통·공감 글은 친구에게 안 나감)
      galleryEnabled: false,
    },
    // ── 목2기 표준 덮어쓰기 ──
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
  console.log(`  서로의 마음 읽기 ${act.galleryEnabled ? "켬⚠" : "끔✓"} · 마음일기 ${back.reflectionPublic ? "공개⚠" : "비공개✓"}`);
  const shown = canva ? canva.replace(/token=([^&]{4})[^&]*/, "token=$1…") : "(빈값)";
  const thu2Tok = CANVA_THU_2.match(/token=([^&]+)/)?.[1] ?? "";
  const myTok = canva.match(/token=([^&]+)/)?.[1] ?? "";
  const label = !canva ? "" : myTok && myTok === thu2Tok ? " [목2기 env 초대 ✓]" : " [⚠ 목2기 env와 다른 토큰]";
  console.log(`  캔바 초대(캘리그래피)  ${shown}${label}`);
  console.log(`  남의 분반 토큰 실림  ${JSON.stringify(act).includes("linkUrlByGroup") ? "예 ← 문제⚠" : "아니오✓"}`);
  console.log("\n  시작: 대기(마음 체크인) → 오늘 할 일 → 말이 마음을 잇는다 → 갈등 분석 → 관계 캘리그래피(Canva)");
  console.log("        → (캘리그래피 감상은 꺼져 있음) → 공감 문장·감정 대화 → 감정 위로 챗봇 → 마음일기");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
