/**
 * 「디지털 마음 톡톡」 4회기(실패를 노래로 자랑하기) · 화요일 2기 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-mt4-tue2.ts [날짜] [교시]
 *   (기본: 2026-11-03 9교시 → 2026-11-03__9__mt-tue-2)
 *
 * 범용 open-mt4.ts 를 화2기로 옮기되, **204 플랜이 202 표준 수정 전**이라 아래 표준을
 * 세션에서 덮어쓴다(교사 지시):
 *   - game 비움(대기=마음 체크인만) · gameExplainer 비움
 *   - freeNavigation off(204 플랜은 true) · hideDoneButton on · moodCheckEnabled on
 *   - phaseOrder 명시(= LESSON_PHASES 에서 mood 만 뺌) → 별도 '마음 체크인' 단계 중복 제거
 *   - 캔바: _canva_login 은 **mt-tue-2 토큰만**(env). 204 기본값은 mt-tue-1/canva.com 로
 *     떨어지므로 그대로 두면 누수 — 이 분반 토큰(없으면 빈값)으로 못박는다.
 *   - 공개 칸/마음일기 비공개는 204 플랜 그대로(galleryAnswerKeys=song_url·brag_title·lyric_line·stars,
 *     reflectionPublic=false)
 *
 * 204 는 **별도 통(activityId mt-2026-3)** 이라 202/203 과 캐리오버 없음 → 처음 단계부터.
 * 슬롯 9교시(시각표 밖 → 코드 만료 없음). code 11(7교시)·code 12(8교시)와 doc ID 안 겹침.
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

const LESSON_NO = 204;
const GROUP_KEY = "mt-tue-2";
const GROUP_LABEL = "화요일 2기";
const CLASS_NO = 3; // seed-mt4 groups 와 같아야 한다
const DATE = process.argv[2] ?? "2026-11-03";
const PERIOD = Number(process.argv[3] ?? 9);
const SESSION_ID = `${DATE}__${PERIOD}__${GROUP_KEY}`;

const CANVA_TUE_2 = process.env.CANVA_INVITE_MT_TUE_2 ?? "";
const EMPTY = { heading: "", body: "", url: "" };
const PHASE_ORDER = [
  "waiting", "wordquiz", "recheck", "progress", "assessment", "quiz", "video",
  "problem", "mvp", "build", "grill", "draw", "worksheet", "gallery", "emotion",
  "reflection", "wrapmap", "mooddiary", "wrapheal", "done",
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

function resolveWorksheet(original: Record<string, unknown>[]): Record<string, unknown>[] {
  return original.map((q) => {
    const next = { ...q };
    if (next.key === "_canva_login") {
      delete next.linkUrlByGroup;
      next.linkUrl = CANVA_TUE_2; // 이 분반 토큰만(없으면 빈값) — 기본값(mt-tue-1/canva.com) 누수 차단
      return next;
    }
    if (next.linkUrlByGroup) {
      const byGroup = next.linkUrlByGroup as Record<string, string>;
      delete next.linkUrlByGroup;
      next.linkUrl = byGroup[GROUP_KEY] ?? ""; // 기본값으로 안 떨어지게 — 없으면 비움
    }
    return next;
  });
}

async function main(): Promise<void> {
  const plans = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  if (plans.empty) {
    console.error(`✗ ${LESSON_NO}차시 계획이 없습니다. 먼저 scripts/seed-mt4.ts 를 돌리세요.`);
    process.exit(1);
  }
  const plan = plans.docs[0];
  const p = plan.data() as Record<string, unknown>;

  const existing = await db.collection("classSessions").doc(SESSION_ID).get();
  if (existing.exists) {
    const s = existing.data() as { code: string; status: string; lessonNo: number };
    console.log(`이미 있습니다 — ${SESSION_ID}  코드 ${s.code}  ${s.lessonNo}차시  ${s.status}`);
    process.exit(0);
  }

  const activity = p.activity as { worksheet?: Record<string, unknown>[] } | undefined;
  const worksheet = resolveWorksheet(activity?.worksheet ?? []);

  const code = await pickCode();

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
    moodCheckEnabled: p.moodCheckEnabled, // 204 플랜 true
    // ── 표준 덮어쓰기 ──
    game: EMPTY,
    gameExplainer: EMPTY,
    freeNavigation: false, // 204 플랜은 true → off
    hideDoneButton: true,
    phaseOrder: PHASE_ORDER, // 별도 '마음 체크인' 단계 제거 + 되돌아가기 정상
    // ── 204 플랜 그대로 ──
    progress: p.progress,
    assessment: p.assessment,
    video: p.video,
    videoPrompts: [],
    reflectionQuestions: p.reflectionQuestions,
    reflectionPublic: p.reflectionPublic, // false
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
  const canva = (act.worksheet as Array<{ key?: string; linkUrl?: string }>).find((q) => q.key === "_canva_login")?.linkUrl ?? "";
  console.log(`✓ 열림  ${SESSION_ID}`);
  console.log(`  ${DATE} ${PERIOD}교시 · ${GROUP_LABEL} · ${LESSON_NO}차시 "${back.title}"`);
  console.log(`  수업 코드  ${back.code}  · 상태 ${back.status} · 단계 ${back.phase}`);
  console.log(`  표준: 대기게임 ${(back.game as { heading?: string })?.heading ? "있음⚠" : "없음✓"} · freeNav ${back.freeNavigation ? "켬⚠" : "끔✓"} · hideDoneButton ${back.hideDoneButton ? "켬✓" : "끔⚠"} · 마음체크 ${back.moodCheckEnabled ? "켬✓" : "끔⚠"}`);
  console.log(`  phaseOrder ${po.length}단계 · mood ${po.includes("mood") ? "포함⚠" : "없음✓"}`);
  console.log(`  서로의 마음 읽기 ${act.galleryEnabled ? "켬" : "끔"} · 나가는 칸 ${(act.galleryAnswerKeys as string[])?.join(" · ")} · 마음일기 ${back.reflectionPublic ? "공개⚠" : "비공개✓"}`);
  console.log(`  캔바 ${canva ? canva.replace(/token=([^&]{4})[^&]*/, "token=$1…") + " [화2기]" : "(빈값)"} · 남의 분반 토큰 실림 ${JSON.stringify(act).includes("linkUrlByGroup") ? "예⚠" : "아니오✓"}`);
  console.log("\n  시작(새 통 mt-2026-3, 캐리오버 없음 → 처음부터):");
  console.log("  대기(마음 체크인) → 실패의 날 영상 → '실패 노래 만들기' → '노래 생성·제출' → '노래 갤러리' → 회복탄력성 영상 → 마음일기");
  console.log("  [교사] 수업 전 Suno 사전 테스트(로그인~생성)·짝 편성(짝당 1계정) 준비.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
