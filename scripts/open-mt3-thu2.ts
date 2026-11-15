/**
 * 「디지털 마음 톡톡」 3회기 · 목요일 2기 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-mt3-thu2.ts [날짜] [교시]
 *   (기본: 2026-11-05 7교시 → 2026-11-05__7__mt-thu-2)
 *
 * open-mt3-tue2.ts(화2기)를 목2기로 옮긴 것. 바뀐 것은 분반(mt-thu-2)·데이터 통
 * (classNo 4)·캔바 토큰(CANVA_INVITE_MT_THU_2)·수업일(2026-11-05)뿐이다.
 * 203 플랜이 202 표준 수정 전이라 아래 표준을 세션에서 덮어쓴다(교사 지시):
 *   - game 비움(대기 게임 없음, 대기=마음 체크인만) · gameExplainer 비움
 *   - freeNavigation off · hideDoneButton on · moodCheckEnabled on
 *   - phaseOrder 명시(= LESSON_PHASES 전체에서 mood 만 뺌) → 별도 '마음 체크인' 단계 중복 제거,
 *     되돌아가기도 정상(phaseOrder 에 없는 단계는 숨고 mood 만 사라짐)
 *   - 캔바: mt-thu-2 토큰만(203엔 _canva_login 토큰이 없지만, linkUrlByGroup 은 이 분반 것만
 *     남기고 기본값으로 안 떨어지게 처리 — 누수 금지)
 *   - 공개 칸/마음일기 비공개는 203 플랜 그대로(galleryAnswerKeys=share_feel·share_line·canva_url)
 *
 * ## 목2기는 203 앞 단계를 이미 완료(10-29 202) → 새 부분은 감정 지도(wrapmap)+힐링 스페이스(wrapheal)
 * activityId 는 mt-2026-2(2회기와 같은 통)라, 앞 단계 답은 완료 표시로 그대로 열린다.
 * 교사는 대기(마음 체크인) 뒤 '감정 지도' 단추부터 눌러 이어 간다.
 *
 * 블록타임 — 6~7교시 90분을 7교시 하나로. 6교시로 열면 코드가 6교시 끝에 만료된다.
 * 세션 ID = 2026-11-05__7__mt-thu-2 (화2기 203도 period 7로 열렸음).
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

const LESSON_NO = 203;
const GROUP_KEY = "mt-thu-2";
const GROUP_LABEL = "목요일 2기";
/** 화면에 안 보이는 데이터 통 번호. 2회기(mt-thu-2)와 같아야 지난 기록과 이어진다 */
const CLASS_NO = 4;
/** 위치 인자(날짜·교시)는 --플래그 를 뺀 것에서 읽는다 */
const POSITIONAL = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const DATE = POSITIONAL[0] ?? "2026-11-05";
const PERIOD = Number(POSITIONAL[1] ?? 7);
const SESSION_ID = `${DATE}__${PERIOD}__${GROUP_KEY}`;
/**
 * --force: 이미 있는 세션을 덮어 다시 연다(계획 편집 반영). 단 **실데이터 가드** —
 * 아직 시작 안 한(scheduled·startedAt 없음) 세션만 덮는다. 수업이 시작됐거나(active·ended)
 * 출석/제출 흔적이 있으면 멈추고 보고한다. 없으면 기존 코드를 그대로 재사용해 덮는다.
 */
const FORCE = process.argv.includes("--force");

/** 2기 목요일 전용 캔바 토큰(있으면 _canva_login 에 직접, 남의 분반 기본값 금지) */
const CANVA_THU_2 = process.env.CANVA_INVITE_MT_THU_2 ?? "";

/** 표준: 대기 게임 없음·게임 설명 없음 */
const EMPTY = { heading: "", body: "", url: "" };

/**
 * 별도 '마음 체크인'(mood) 단계만 뺀 전체 순서. types.ts LESSON_PHASES 기준이되,
 * 교사 지시로 두 가지를 옮겼다:
 *  · '지난 차시 감정 캐릭터 감상'(gallery)을 **맨 앞(복습)** 으로 — 대기 바로 뒤.
 *  · '마음일기'(reflection)를 '힐링 스페이스'(wrapheal) **뒤** 로 — 마지막에 쓴다.
 * 영화·예능(mvp)·나의 감정 쓰기(build) 단계는 그대로 둔다(교사가 수업 중 건너뛸 수 있음).
 */
const PHASE_ORDER = [
  "waiting", "gallery", "wordquiz", "recheck", "progress", "assessment", "quiz", "video",
  "problem", "mvp", "build", "grill", "draw", "worksheet", "emotion",
  "wrapmap", "mooddiary", "wrapheal", "reflection", "done",
];

async function pickCode(): Promise<string> {
  const live = await db.collection("classSessions").where("status", "in", ["scheduled", "active"]).get();
  const taken = new Set(live.docs.map((d) => String((d.data() as { code?: string }).code ?? "")));
  for (let n = 10; n <= 99; n += 1) {
    const code = String(n);
    if (taken.has(code)) continue;
    try {
      await db.collection("codeReservations").doc(`${DATE}__${code}`).create({ date: DATE, code, createdAt: Date.now() });
      return code;
    } catch {
      /* 이미 예약된 코드 — 다음 것 */
    }
  }
  throw new Error("남은 코드가 없습니다. 끝난 수업을 정리해 주세요.");
}

/** 분반 주소 표를 이 분반 것 하나로 줄인다. _canva_login 은 env 토큰(없으면 빈값), 그 밖은 mt-thu-2 값 or 빈값. */
function resolveWorksheet(original: Record<string, unknown>[]): Record<string, unknown>[] {
  return original.map((q) => {
    const next = { ...q };
    if (next.key === "_canva_login") {
      delete next.linkUrlByGroup;
      next.linkUrl = CANVA_THU_2; // 203엔 보통 없지만, 생기면 이 분반 토큰만
      return next;
    }
    if (next.linkUrlByGroup) {
      const byGroup = next.linkUrlByGroup as Record<string, string>;
      delete next.linkUrlByGroup;
      next.linkUrl = byGroup[GROUP_KEY] ?? ""; // 기본값(남의 분반)으로 안 떨어지게 — 없으면 비움
    }
    return next;
  });
}

async function main(): Promise<void> {
  const plans = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  if (plans.empty) {
    console.error(`✗ ${LESSON_NO}차시 계획이 없습니다. 먼저 scripts/seed-mt3.ts 를 돌리세요.`);
    process.exit(1);
  }
  const plan = plans.docs[0];
  const p = plan.data() as Record<string, unknown>;

  const existing = await db.collection("classSessions").doc(SESSION_ID).get();
  let reuseCode = "";
  if (existing.exists) {
    const s = existing.data() as { code?: string; status?: string; lessonNo?: number; startedAt?: unknown };
    if (!FORCE) {
      console.log(`이미 있습니다 — ${SESSION_ID}  코드 ${s.code}  ${s.lessonNo}차시  ${s.status}`);
      console.log("  (덮어 다시 열려면 --force. 실데이터가 없을 때만 덮습니다.)");
      process.exit(0);
    }
    // 실데이터 가드: 이 세션에 '진짜 학생'(학번 끝 2자리 1~39) 출석이 있으면 멈춘다.
    // active 상태·테스트 계정(90번 등)은 선생님 테스트라 덮어도 된다(교사 지시 — 재오픈 시 대기로 초기화).
    const att = await db.collection("attendance").where("sessionId", "==", SESSION_ID).get();
    const realStudents = att.docs.filter((a) => {
      const n = Number(String((a.data() as { studentId?: string }).studentId ?? "").slice(-2));
      return Number.isFinite(n) && n >= 1 && n < 40;
    });
    if (realStudents.length > 0) {
      console.error(`✗ ${SESSION_ID} 에 진짜 학생 출석 ${realStudents.length}명이 있어 덮지 않습니다 — 멈춥니다.`);
      process.exit(1);
    }
    reuseCode = String(s.code ?? "");
    console.log(`↻ --force: 기존 세션(코드 ${reuseCode}, ${s.status}${att.size ? `, 테스트출석 ${att.size}명` : ""})을 덮어 다시 엽니다.`);
  }

  const activity = p.activity as { worksheet?: Record<string, unknown>[] } | undefined;
  const worksheet = resolveWorksheet(activity?.worksheet ?? []);

  const code = reuseCode || (await pickCode());

  await db.collection("classSessions").doc(SESSION_ID).set({
    id: SESSION_ID,
    lessonPlanId: plan.id,
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
    activity: { ...activity, worksheet },
    moodCheckEnabled: p.moodCheckEnabled, // 203 플랜 true
    // ── 표준 덮어쓰기 ──
    game: EMPTY, // 대기 게임 없음
    gameExplainer: EMPTY,
    freeNavigation: false, // 203 플랜은 true 였음 → off 로 덮음
    hideDoneButton: true, // 마침 버튼 숨김
    phaseOrder: PHASE_ORDER, // 별도 '마음 체크인' 단계 제거 + 되돌아가기 정상
    // ── 203 플랜 그대로 ──
    progress: p.progress,
    assessment: p.assessment,
    video: p.video,
    videoPrompts: [],
    reflectionQuestions: p.reflectionQuestions,
    reflectionPublic: p.reflectionPublic, // 비공개
    phaseLabels: p.phaseLabels ?? {},
    focusExempt: p.focusExempt ?? [],
  });

  const back = (await db.collection("classSessions").doc(SESSION_ID).get()).data() as Record<string, unknown> | undefined;
  if (!back?.code) {
    console.error("✗ 문서가 제대로 안 써졌습니다.");
    process.exit(1);
  }
  const act = back.activity as Record<string, unknown>;
  const po = (back.phaseOrder as string[]) ?? [];
  console.log(`✓ 열림  ${SESSION_ID}`);
  console.log(`  ${DATE} ${PERIOD}교시 · ${GROUP_LABEL} · ${LESSON_NO}차시 "${back.title}"`);
  console.log(`  수업 코드  ${back.code}  · 상태 ${back.status} · 단계 ${back.phase}`);
  console.log(`  표준: 대기게임 ${(back.game as { heading?: string })?.heading ? "있음⚠" : "없음✓"} · freeNav ${back.freeNavigation ? "켬⚠" : "끔✓"} · hideDoneButton ${back.hideDoneButton ? "켬✓" : "끔⚠"} · 마음체크 ${back.moodCheckEnabled ? "켬✓" : "끔⚠"}`);
  console.log(`  phaseOrder ${po.length}단계 · mood ${po.includes("mood") ? "포함⚠" : "없음✓(별도 단계 제거)"}`);
  console.log(`  서로의 마음 읽기 ${act.galleryEnabled ? "켬" : "끔"} · 나가는 칸 ${(act.galleryAnswerKeys as string[])?.join(" · ")} · 마음일기 ${back.reflectionPublic ? "공개⚠" : "비공개✓"}`);
  console.log(`  남의 분반 토큰 실림  ${JSON.stringify(act).includes("linkUrlByGroup") ? "예 ← 문제⚠" : "아니오✓"}`);
  const canva = (act.worksheet as { key?: string; linkUrl?: string }[] | undefined)?.find((q) => q.key === "_canva_login")?.linkUrl ?? "";
  console.log(`  캔바 초대  ${canva ? canva.replace(/token=([^&]{4})[^&]*/, "token=$1…") + " [목2기 전용]" : "없음(링크 비어 있음)"}`);
  console.log("\n  시작: 대기(마음 체크인) → 교사가 '감정 지도'(wrapmap) 단추부터 → '힐링 스페이스'(wrapheal).");
  console.log("  (앞 단계 영화·예능~마음일기는 목2기가 10-29에 이미 완료 → 완료 표시로 열림. 같은 통 mt-2026-2 이어쓰기.)");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
