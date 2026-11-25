/**
 * 「디지털 마음 톡톡」 5회기(관점과 감정 읽기 · 대인관계) · 목요일 2기 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-mt5-thu2.ts [날짜] [교시]
 *   (기본: 2026-11-26 7교시 → 2026-11-26__7__mt-thu-2)
 *
 * ## 왜 따로 여는가
 * 205 계획은 **202 표준(대기=마음 체크인만, 대기 게임 없음)이 정해지기 전**에 시드됐다.
 * 그래서 계획에는 (1) 대기 게임(지뢰찾기)·(2) phaseOrder 에 별도 '마음 체크인'(mood) 단계가
 * 남아 있다. open-mt5-tue2.ts(화2기 11/17)를 목2기로 옮긴 것. 목2기도 202·203·204·206 을 표준 덮어쓰기로 진행했으므로,
 * 5회기도 같은 방식으로 아래를 세션에서 덮어쓴다(교사 지시 · 전 과목 공통 표준):
 *   - game 비움(대기=마음 체크인만) · gameExplainer 비움
 *   - freeNavigation off(기본값) · hideDoneButton on · moodCheckEnabled on(= 세션당 1회 강제 관문)
 *   - phaseOrder = 계획의 phaseOrder 에서 mood 만 제거 → 별도 '마음 체크인' 단계 중복 제거.
 *     (계획의 버튼 순서는 그대로 보존: 착시 영상 → 토끼/오리 투표 … 순서가 어긋나지 않게.)
 *
 * ## 프라이버시 (이 과목 1순위)
 *   - 관점 성찰·문화 소감·AI 감정 분석·마음일기 등 서술 칸은 친구에게 안 나간다.
 *     galleryEnabled 를 계획대로 **false 로 못박는다**(서버 gallery 라우트가 이 값으로 응답을 막음).
 *   - 205 에는 _canva_login·분반 토큰 표(linkUrlByGroup)가 없다. 그래도 혹시 생기면 이 분반 것만
 *     남기고 기본값 누수가 없게 resolveWorksheet 에서 일괄 처리한다.
 *
 * ## 활동 통
 * 205 는 **별도 통(activityId mt-2026-5)** 이라 202/203(mt-2026-2)·204(mt-2026-3)와 캐리오버
 * 없음 → 처음 단계부터. (quiz·video·progress 전부 계획에서 스냅샷으로 복사한다.)
 *
 * ## 외부 사이트 (교사 수업 전 점검)
 *   - faan.netlify.app (표정 분석 체험) · teachablemachine.withgoogle.com (표정 모델 만들기)
 *   학교망에서 열리는지 먼저 확인할 것. 열리면 로그인 없이 체험 가능(TM 는 Google 로그인 시 저장).
 *
 * ## 교시
 * 6~7교시 90분 블록이지만 세션은 **하나**로 연다(6교시로 열면 코드가 교시 경계에서 만료). 기본 7교시.
 * 7교시가 시각표에 있어 코드 만료가 걱정되면 시각표 밖 교시(예: 8)를 argv 로 줄 수 있다
 * (화2기 203·204 가 그 방식). 세션 문서 ID 는 groupKey 라 같은 교시 정보과 수업과 안 겹친다.
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

const LESSON_NO = 205;
const GROUP_KEY = "mt-thu-2";
const GROUP_LABEL = "목요일 2기";
const CLASS_NO = 4; // seed-mt5 groups(mt-thu-2) 와 같아야 한다
const DATE = process.argv[2] ?? "2026-11-26";
const PERIOD = Number(process.argv[3] ?? 7);
const SESSION_ID = `${DATE}__${PERIOD}__${GROUP_KEY}`;

const CANVA_THU_2 = process.env.CANVA_INVITE_MT_THU_2 ?? "";
const EMPTY = { heading: "", body: "", url: "" };

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
      /* 이미 예약된 코드 - 다음 것 */
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
      next.linkUrl = CANVA_THU_2;
      return next;
    }
    if (next.linkUrlByGroup) {
      const byGroup = next.linkUrlByGroup as Record<string, string>;
      delete next.linkUrlByGroup;
      next.linkUrl = byGroup[GROUP_KEY] ?? ""; // 기본값(남의 분반)으로 안 떨어지게 - 없으면 비움
    }
    return next;
  });
}

async function main(): Promise<void> {
  const plans = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  if (plans.empty) {
    console.error(`✗ ${LESSON_NO}차시 계획이 없습니다. 먼저 scripts/seed-mt5.ts 를 돌리세요.`);
    process.exit(1);
  }
  const plan = plans.docs[0];
  const p = plan.data() as Record<string, unknown>;

  const existing = await db.collection("classSessions").doc(SESSION_ID).get();
  if (existing.exists) {
    const s = existing.data() as { code: string; status: string; lessonNo: number };
    console.log(`이미 있습니다 - ${SESSION_ID}  코드 ${s.code}  ${s.lessonNo}차시  ${s.status}`);
    process.exit(0);
  }

  const activity = p.activity as { worksheet?: Record<string, unknown>[]; galleryEnabled?: boolean } | undefined;
  const worksheet = resolveWorksheet(activity?.worksheet ?? []);

  // phaseOrder: 계획 순서에서 '마음 체크인'(mood) 단계만 제거(= 별도 단계 중복 제거, 나머지 순서 보존).
  const planOrder = (p.phaseOrder as string[] | undefined) ?? [];
  const PHASE_ORDER = planOrder.filter((ph) => ph !== "mood");

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
    // 활동 - 서로의 마음 읽기는 false 로 못박는다(감정·관점 글 누수 차단)
    activity: { ...activity, worksheet, galleryEnabled: false },
    moodCheckEnabled: p.moodCheckEnabled, // true (세션당 1회 강제 관문)
    // ── 표준 덮어쓰기 ──
    game: EMPTY, // 대기 게임 없음(대기=마음 체크인만)
    gameExplainer: EMPTY,
    freeNavigation: false,
    hideDoneButton: true,
    phaseOrder: PHASE_ORDER, // 별도 '마음 체크인' 단계 제거 + 되돌아가기 정상
    // ── 205 계획 그대로 스냅샷 ──
    progress: p.progress,
    progressChecks: p.progressChecks,
    assessment: p.assessment,
    video: p.video,
    videoPrompts: p.videoPrompts ?? [],
    quiz: p.quiz, // 토끼/오리 투표·노래 맞히기·감정 추측·AI 감정 - 문항별 group/media 포함
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
  console.log(`✓ 열림  ${SESSION_ID}`);
  console.log(`  ${DATE} ${PERIOD}교시 · ${GROUP_LABEL} · ${LESSON_NO}차시 "${back.title}"`);
  console.log(`  수업 코드  ${back.code}  · 상태 ${back.status} · 단계 ${back.phase}`);
  console.log(`  표준: 대기게임 ${(back.game as { heading?: string })?.heading ? "있음⚠" : "없음✓"} · freeNav ${back.freeNavigation ? "켬⚠" : "끔✓"} · hideDoneButton ${back.hideDoneButton ? "켬✓" : "끔⚠"} · 마음체크 ${back.moodCheckEnabled ? "켬✓" : "끔⚠"}`);
  console.log(`  phaseOrder ${po.length}단계 · mood ${po.includes("mood") ? "포함⚠" : "없음✓"}`);
  console.log(`  서로의 마음 읽기 ${act.galleryEnabled ? "켬⚠" : "끔✓"} · 마음일기 ${back.reflectionPublic ? "공개⚠" : "비공개✓"}`);
  console.log(`  남의 분반 토큰 실림 ${JSON.stringify(act).includes("linkUrlByGroup") ? "예⚠" : "아니오✓"}`);
  console.log("\n  시작(새 통 mt-2026-5, 캐리오버 없음 → 처음부터):");
  console.log("  대기(마음 체크인) → 오늘 할 일 → 착시 영상 → 토끼/오리 투표 → 관점 차이 → 문화별 감정 → 정리");
  console.log("   → 노래 맞히기 → 감정 추측 → AI 감정 분석 → 이미지 AI 체험(faan·Teachable Machine) → 마음일기");
  console.log("  [교사] 수업 전 faan.netlify.app · teachablemachine.withgoogle.com 학교망에서 열리는지 확인.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
