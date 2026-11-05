/**
 * 「디지털 마음 톡톡」 목요일 2기(mt-thu-2) — 203~207 **리허설 세션**을 한 번에 연다.
 *
 *   node --env-file=.env.local scripts/open-mt-reh-thu2.ts [--date=YYYY-MM-DD]
 *   (기본 날짜: 오늘 KST)
 *
 * 내일 목2기 공개수업 회기를 교사가 직접 걸어 보고 고르기 위한 테스트 세션이다.
 *
 * ── 왜 이렇게 여는가 ───────────────────────────────────────────────
 * · rehearsal: true  — 생기부 세특·실데이터 집계에 절대 안 잡힌다(만들 때 강제). 그날 자정에
 *   자동으로 닫히고 코드가 풀린다(db.ts isSessionClosed). **테스트할 그날 아침에 다시 돌려라.**
 * · 교시 91~95 — 시각표(1~7) 밖이라 시각으로 안 닫히고, 실세션(교시 ≤7)·서로와 doc ID 가
 *   안 겹친다. 세션 ID = 날짜__9x__mt-thu-2.
 * · 실제 수업 세션(오늘 정보 27차·hai 103·거둔 203 실세션 등)은 **건드리지 않는다** — 이
 *   스크립트는 교시 91~95 · mt-thu-2 doc 만 쓴다.
 *
 * ── 세션 모양을 실제 목2기 오프너와 똑같이 재현한다 ───────────────────
 * 두 계열이 있다(실제 오프너에서 그대로 옮김):
 *   A. 202 표준 덮어쓰기(203·204 = open-mt3-thu2 / open-mt4-tue2):
 *      game 비움 · freeNavigation off · hideDoneButton on · phaseOrder 명시(mood 제거)
 *      · _canva_login 은 목2기 env 토큰만 · 갤러리 설정은 계획 그대로
 *   B. 계획 복사(205·206·207 = open-mt5/6/7-thu1): planContent 전체 + phaseOrder 복사.
 *      205·206 은 galleryEnabled 를 false 로 못박는다(실제 오프너와 동일 — 감정/의견 글 차단).
 *      207 은 목요일 전용 계획(mt-2026-7-thu)을 쓰고 galleryEnabled: true·rule_ideas 유지.
 *
 * 외부 링크 토큰은 전부 mt-thu-2 것만 남기고 linkUrlByGroup 표는 지운다(남의 분반 누수 금지).
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

const GROUP_KEY = "mt-thu-2";
const GROUP_LABEL = "목요일 2기 (리허설)";
const CLASS_NO = 4; // 계획 groups 의 mt-thu-2 와 같아야 한다
const CANVA_THU_2 = process.env.CANVA_INVITE_MT_THU_2 ?? "";

const dateArg = process.argv.find((a) => a.startsWith("--date="))?.split("=")[1];
const DATE = dateArg ?? new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

const EMPTY = { heading: "", body: "", url: "" };
/** 별도 '마음 체크인'(mood) 단계만 뺀 전체 순서 — 202 표준(204 오프너와 동일) */
const PHASE_ORDER_STD = [
  "waiting", "wordquiz", "recheck", "progress", "assessment", "quiz", "video",
  "problem", "mvp", "build", "grill", "draw", "worksheet", "gallery", "emotion",
  "reflection", "wrapmap", "mooddiary", "wrapheal", "done",
];
/**
 * 203 전용 순서 — 교사 지시로 두 가지를 옮겼다:
 *  · '지난 차시 감정 캐릭터 감상'(gallery)을 맨 앞(대기 바로 뒤, 복습)으로.
 *  · '마음일기'(reflection)를 '힐링 스페이스'(wrapheal) 뒤로(마지막).
 * 표준(PHASE_ORDER_STD)에서 gallery·reflection 위치만 바꾼 것이라 204(표준)에는 영향이 없다.
 */
const PHASE_ORDER_203 = [
  "waiting", "gallery", "wordquiz", "recheck", "progress", "assessment", "quiz", "video",
  "problem", "mvp", "build", "grill", "draw", "worksheet", "emotion",
  "wrapmap", "mooddiary", "wrapheal", "reflection", "done",
];

type Family = "std" | "copy";
interface Spec {
  lessonNo: number;
  period: number;
  family: Family;
  /** 207 처럼 lessonNo 로 계획이 둘일 때 고를 활동통. 없으면 lessonNo 로 하나만 집는다. */
  activityId?: string;
  /** copy 계열에서 galleryEnabled 를 false 로 못박을지(205·206 true, 207 false) */
  pinGalleryFalse?: boolean;
  /** std 계열에서 PHASE_ORDER_STD 대신 쓸 순서(203 은 마음일기를 힐링 뒤로). */
  phaseOrderOverride?: string[];
}

const SPECS: Spec[] = [
  { lessonNo: 203, period: 91, family: "std", phaseOrderOverride: PHASE_ORDER_203 },
  { lessonNo: 204, period: 92, family: "std" },
  { lessonNo: 205, period: 93, family: "copy", pinGalleryFalse: true },
  { lessonNo: 206, period: 94, family: "copy", pinGalleryFalse: true },
  { lessonNo: 207, period: 95, family: "copy", activityId: "mt-2026-7-thu", pinGalleryFalse: false },
];

/** --lessons=203,204 로 일부 회기만 열 수 있다(없으면 전부). 다른 회기 세션은 건드리지 않는다. */
const lessonsArg = process.argv.find((a) => a.startsWith("--lessons="))?.split("=")[1];
const ONLY_LESSONS = lessonsArg
  ? new Set(lessonsArg.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n)))
  : null;

type WS = Record<string, unknown>;

/** 분반 주소를 mt-thu-2 것 하나로 줄인다. _canva_login 은 env 토큰(없으면 빈값). */
function resolveWorksheetStd(original: WS[]): WS[] {
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
      next.linkUrl = byGroup[GROUP_KEY] ?? "";
    }
    return next;
  });
}

/** 캔바 로그인 성격의 키 — 분반 초대 토큰이 붙는 자리(없으면 mt-thu-2 env 초대로). */
const CANVA_LOGIN_KEYS = new Set(["_canva_login", "_a4_calli_login"]);

/**
 * 계획 복사 계열: byGroup[mt-thu-2] 를 고르고 표는 지운다.
 * ★ 누수 차단: byGroup 이 있던(=분반별) 링크인데 mt-thu-2 항목이 없으면, 기본 linkUrl 로
 *   폴백하지 않는다 — 기본값에 다른 분반 토큰이 박혀 있을 수 있어서다(206 _a4_calli_login 이
 *   그렇다: 기본값=화1기 토큰). 캔바 로그인 키면 mt-thu-2 env 초대로, 아니면 비운다.
 * byGroup 이 애초에 없던 linkUrl(공용 자료 링크)은 그대로 둔다.
 */
function resolveWorksheetCopy(original: WS[]): WS[] {
  return original.map((q) => {
    const next = { ...q };
    if (next.linkUrlByGroup) {
      const byGroup = next.linkUrlByGroup as Record<string, string>;
      delete next.linkUrlByGroup;
      const mine = byGroup[GROUP_KEY];
      if (mine) next.linkUrl = mine;
      else if (CANVA_LOGIN_KEYS.has(String(next.key))) next.linkUrl = CANVA_THU_2;
      else next.linkUrl = "";
    }
    return next;
  });
}

async function pickPlan(spec: Spec): Promise<{ id: string; data: Record<string, any> }> {
  const q = await db.collection("lessonPlans").where("lessonNo", "==", spec.lessonNo).get();
  if (q.empty) throw new Error(`${spec.lessonNo}차시 계획 없음`);
  const doc = spec.activityId
    ? q.docs.find((d) => (d.data() as any).activity?.activityId === spec.activityId)
    : q.docs[0];
  if (!doc) throw new Error(`${spec.lessonNo}차시 (activityId=${spec.activityId}) 계획 없음`);
  return { id: doc.id, data: doc.data() as Record<string, any> };
}

interface Opened {
  lessonNo: number;
  period: number;
  title: string;
  code: string;
  id: string;
  galleryEnabled: boolean;
  galleryKeys: string[];
  reflectionPublic: boolean;
  leak: boolean;
  canva: string;
  note: string;
}

async function main(): Promise<void> {
  // 코드 후보: 오늘 살아있는 세션들이 쓰는 코드는 피한다.
  const all = await db.collection("classSessions").get();
  const taken = new Set(
    all.docs
      .map((d) => d.data() as { code?: string; status?: string; date?: string })
      .filter((s) => s.status !== "ended" || s.date === DATE)
      .map((s) => String(s.code ?? "")),
  );

  function nextCode(): string {
    for (let n = 11; n <= 99; n += 1) {
      const c = String(n);
      if (!taken.has(c)) { taken.add(c); return c; }
    }
    throw new Error("남은 코드가 없습니다.");
  }

  const opened: Opened[] = [];

  const specs = ONLY_LESSONS ? SPECS.filter((s) => ONLY_LESSONS.has(s.lessonNo)) : SPECS;
  if (specs.length === 0) {
    console.error(`✗ --lessons 로 고른 회기가 SPECS 에 없습니다: ${lessonsArg}`);
    process.exit(1);
  }
  for (const spec of specs) {
    const id = `${DATE}__${spec.period}__${GROUP_KEY}`;
    const existing = await db.collection("classSessions").doc(id).get();
    if (existing.exists && (existing.data() as any).rehearsal !== true) {
      console.error(`✗ ${id} 가 리허설이 아닌 세션입니다 — 안전을 위해 건너뜁니다.`);
      continue;
    }

    const plan = await pickPlan(spec);
    const p = plan.data;
    const activity = (p.activity ?? {}) as Record<string, any>;

    let session: Record<string, unknown>;
    if (spec.family === "std") {
      const worksheet = resolveWorksheetStd(activity.worksheet ?? []);
      session = {
        id,
        lessonPlanId: plan.id,
        lessonNo: spec.lessonNo,
        title: p.title,
        classNo: CLASS_NO,
        groupKey: GROUP_KEY,
        groupLabel: GROUP_LABEL,
        date: DATE,
        period: spec.period,
        status: "scheduled",
        phase: "waiting",
        rehearsal: true,
        demo: false,
        teacherNote: "",
        startedAt: null,
        endedAt: null,
        activity: { ...activity, worksheet },
        moodCheckEnabled: p.moodCheckEnabled,
        // 202 표준 덮어쓰기
        game: EMPTY,
        gameExplainer: EMPTY,
        freeNavigation: false,
        hideDoneButton: true,
        phaseOrder: spec.phaseOrderOverride ?? PHASE_ORDER_STD,
        // 계획 그대로
        progress: p.progress,
        assessment: p.assessment,
        video: p.video,
        videoPrompts: [],
        reflectionQuestions: p.reflectionQuestions,
        reflectionPublic: p.reflectionPublic,
        phaseLabels: p.phaseLabels ?? {},
        focusExempt: p.focusExempt ?? [],
      };
    } else {
      const worksheet = resolveWorksheetCopy(activity.worksheet ?? []);
      const nextActivity: Record<string, unknown> = { ...activity, worksheet };
      if (spec.pinGalleryFalse) nextActivity.galleryEnabled = false; // 감정/의견 글 차단
      session = {
        id,
        lessonPlanId: plan.id,
        lessonNo: spec.lessonNo,
        title: p.title,
        classNo: CLASS_NO,
        groupKey: GROUP_KEY,
        groupLabel: GROUP_LABEL,
        date: DATE,
        period: spec.period,
        status: "scheduled",
        phase: "waiting",
        rehearsal: true,
        demo: false,
        teacherNote: "",
        startedAt: null,
        endedAt: null,
        moodCheckEnabled: p.moodCheckEnabled,
        game: p.game,
        gameExplainer: p.gameExplainer,
        progress: p.progress,
        assessment: p.assessment,
        video: p.video,
        videoPrompts: p.videoPrompts ?? [],
        reflectionQuestions: p.reflectionQuestions,
        reflectionPublic: p.reflectionPublic,
        quiz: p.quiz,
        phaseOrder: p.phaseOrder ?? [],
        phaseLabels: p.phaseLabels ?? {},
        focusExempt: p.focusExempt ?? [],
        progressChecks: p.progressChecks,
        freeNavigation: p.freeNavigation ?? false,
        activity: nextActivity,
      };
    }

    // 코드: 기존 리허설이면 그 코드 재사용, 아니면 새로 뽑아 예약
    let code: string;
    if (existing.exists) {
      code = String((existing.data() as any).code ?? nextCode());
    } else {
      code = nextCode();
      await db.collection("codeReservations").doc(`${DATE}__${code}`).set({ date: DATE, code, createdAt: Date.now() });
    }
    (session as any).code = code;
    (session as any).createdAt = Date.now();

    await db.collection("classSessions").doc(id).set(session);

    // 검증: 되읽어 스냅샷 확인
    const back = (await db.collection("classSessions").doc(id).get()).data() as Record<string, any>;
    const act = back.activity as Record<string, any>;
    const leak = JSON.stringify(act).includes("linkUrlByGroup");
    const ws = (act.worksheet ?? []) as WS[];
    const canvaQ = ws.find((w) => (w as any).key === "_canva_login" || (w as any).key === "_a4_calli_login") as any;
    const canva = canvaQ?.linkUrl ?? "";
    opened.push({
      lessonNo: spec.lessonNo,
      period: spec.period,
      title: String(back.title),
      code,
      id,
      galleryEnabled: act.galleryEnabled === true,
      galleryKeys: (act.galleryAnswerKeys as string[]) ?? [],
      reflectionPublic: back.reflectionPublic === true,
      leak,
      canva,
      note: spec.family === "std"
        ? `202표준(game 비움·freeNav off·hideDone on·phaseOrder ${(back.phaseOrder as string[]).length}단계·mood ${((back.phaseOrder as string[]) ?? []).includes("mood") ? "포함⚠" : "없음✓"})`
        : `계획복사(phaseOrder ${(back.phaseOrder as string[] ?? []).length}단계${spec.activityId ? " · " + spec.activityId : ""})`,
    });
  }

  console.log(`\n✓ 목요일 2기(mt-thu-2) 리허설 ${opened.length}개 — 날짜 ${DATE}\n`);
  console.log("차시 | 코드 | 교시 | 갤러리 | 마음일기 | 토큰누수 | 제목");
  console.log("-----+------+------+--------+----------+----------+------------------------------");
  for (const o of opened) {
    const g = o.galleryEnabled ? `켬[${o.galleryKeys.join(",")}]` : "끔✓";
    console.log(
      `${o.lessonNo}  |  ${o.code}  |  ${o.period} | ${g} | ${o.reflectionPublic ? "공개⚠" : "비공개✓"} | ${o.leak ? "예⚠" : "아니오✓"} | ${o.title}`,
    );
  }
  console.log("\n[상세]");
  for (const o of opened) {
    const thu2Tok = CANVA_THU_2.match(/token=([^&]+)/)?.[1] ?? "";
    const myTok = o.canva.match(/token=([^&]+)/)?.[1] ?? "";
    const label = !o.canva
      ? ""
      : myTok && myTok === thu2Tok
        ? " [목2기 env 초대 ✓]"
        : " [⚠ 목2기 env 초대와 다른 토큰 — 확인]";
    const canvaShown = o.canva
      ? o.canva.replace(/token=([^&]{4})[^&]*/, "token=$1…") + label
      : "(링크 없음)";
    console.log(`  ${o.lessonNo}차 "${o.title}"`);
    console.log(`     코드 ${o.code} · ${o.id} · rehearsal=true`);
    console.log(`     ${o.note}`);
    console.log(`     갤러리 ${o.galleryEnabled ? "켬 · 나가는 칸 [" + o.galleryKeys.join(", ") + "]" : "끔"} · 마음일기 ${o.reflectionPublic ? "공개⚠" : "비공개✓"} · 외부링크 ${canvaShown} · 남의분반토큰 ${o.leak ? "실림⚠" : "없음✓"}`);
  }
  console.log("\n⚠ 리허설은 오늘(" + DATE + ") 안에서만 삽니다 — 자정 넘으면 자동으로 닫히고 코드가 풀립니다.");
  console.log("   테스트할 그날 아침에 다시: node --env-file=.env.local scripts/open-mt-reh-thu2.ts");
  console.log("   정리: node --env-file=.env.local scripts/clear-rehearsals.ts --write");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
