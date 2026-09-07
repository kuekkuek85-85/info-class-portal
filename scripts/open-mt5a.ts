/**
 * 「디지털 마음 톡톡」 5회기 1차시(실패 노래 준비·생성) 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-mt5a.ts [날짜] [교시] [분반]
 *   예) node --env-file=.env.local scripts/open-mt5a.ts 2026-09-15 7 mt-tue-1
 *
 * open-mt3-tue1.ts 와 같은 모양이되, 분반을 세 번째 인자로 받는다(2차시까지 요일별로
 * 여러 번 열어야 해서 파일을 늘리는 대신 인자로 고른다). 아무 것도 안 주면 화요일 1기.
 *
 * ## 반드시 지키는 두 가지 (open-mt3-tue1.ts 와 같음)
 *
 *  1. 세션 문서 ID 는 **분반 열쇠**를 쓴다(반 번호 아님) — 같은 교시 정보과와 안 겹치게.
 *  2. **코드를 예약**한다 — 예약 문서를 안 남기면 다음 수업이 같은 코드를 받아 학생이
 *     남의 수업에 들어간다.
 *
 * Suno 는 분반 무관 단일 주소라 분반별 토큰이 없다. 그래도 분반별 주소를 거르는 줄은
 * 그대로 둔다 — 나중에 문항을 늘렸을 때 조용히 남의 분반 토큰이 실려 가는 쪽이 더 위험하다.
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

/** 분반 열쇠 → 표시명·데이터 통 번호. seed-mt5a 의 groups 와 같아야 한다 */
const GROUPS: Record<string, { label: string; classNo: number }> = {
  "mt-tue-1": { label: "화요일 1기", classNo: 1 },
  "mt-thu-1": { label: "목요일 1기", classNo: 2 },
  "mt-tue-2": { label: "화요일 2기", classNo: 3 },
  "mt-thu-2": { label: "목요일 2기", classNo: 4 },
};

const DATE = process.argv[2] ?? "2026-09-15";
const PERIOD = Number(process.argv[3] ?? 7);
const GROUP_KEY = process.argv[4] ?? "mt-tue-1";

const group = GROUPS[GROUP_KEY];
if (!group) {
  console.error(`✗ 모르는 분반: ${GROUP_KEY}. 하나를 고르세요 — ${Object.keys(GROUPS).join(" · ")}`);
  process.exit(1);
}
const { label: GROUP_LABEL, classNo: CLASS_NO } = group;

const SESSION_ID = `${DATE}__${PERIOD}__${GROUP_KEY}`;

/** 안 쓰이는 두 자리 코드를 고르고 예약까지 한다 (open-mt3-tue1.ts 와 같음) */
async function pickCode(): Promise<string> {
  const live = await db.collection("classSessions").where("status", "in", ["scheduled", "active"]).get();
  const taken = new Set(live.docs.map((d) => String((d.data() as { code?: string }).code ?? "")));

  for (let n = 10; n <= 99; n += 1) {
    const code = String(n);
    if (taken.has(code)) continue;
    try {
      await db.collection("codeReservations").doc(`${DATE}__${code}`).create({
        date: DATE,
        code,
        createdAt: Date.now(),
      });
      return code;
    } catch {
      // 이미 예약된 코드다. 다음 것으로
    }
  }
  throw new Error("남은 코드가 없습니다. 끝난 수업을 정리해 주세요.");
}

async function main(): Promise<void> {
  const plans = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  if (plans.empty) {
    console.error(`✗ ${LESSON_NO}차시 계획이 없습니다. 먼저 scripts/seed-mt5a.ts 를 돌리세요.`);
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
  // 분반별 주소가 있으면 이 분반 것만 남기고 표는 지운다 (남의 분반 토큰 유출 방지)
  const worksheet = (activity?.worksheet ?? []).map((q) => {
    const byGroup = q.linkUrlByGroup as Record<string, string> | undefined;
    if (!byGroup) return q;
    const rest = { ...q };
    delete rest.linkUrlByGroup;
    const picked = byGroup[GROUP_KEY] ?? (q.linkUrl as string | undefined);
    return picked ? { ...rest, linkUrl: picked } : rest;
  });

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
    teacherNote: "",
    startedAt: null,
    endedAt: null,
    activity: { ...activity, worksheet },
    moodCheckEnabled: p.moodCheckEnabled,
    game: p.game,
    gameExplainer: p.gameExplainer,
    progress: p.progress,
    assessment: p.assessment,
    video: p.video,
    videoPrompts: [],
    reflectionQuestions: p.reflectionQuestions,
    reflectionPublic: p.reflectionPublic,
    phaseLabels: p.phaseLabels ?? {},
    focusExempt: p.focusExempt ?? [],
    freeNavigation: p.freeNavigation ?? false,
  });

  const back = (await db.collection("classSessions").doc(SESSION_ID).get()).data() as
    | Record<string, unknown>
    | undefined;
  if (!back?.code) {
    console.error("✗ 문서가 제대로 안 써졌습니다.");
    process.exit(1);
  }

  const act = back.activity as Record<string, unknown>;
  console.log(`✓ 열림  ${SESSION_ID}`);
  console.log(`  ${DATE} ${PERIOD}교시 · ${GROUP_LABEL} · ${LESSON_NO}차시 (실패 노래 준비·생성)`);
  console.log(`  수업 코드  ${back.code}`);
  console.log(`  상태 ${back.status} · 단계 ${back.phase} · 되돌아가기 ${back.freeNavigation ? "켬" : "끔"}`);
  console.log(`  서로의 마음 읽기 ${act.galleryEnabled ? "켬" : "끔"} · 친구에게 나가는 칸 ${(act.galleryAnswerKeys as string[])?.join(" · ")}`);
  console.log(`  남의 분반 토큰 실림  ${JSON.stringify(act).includes("linkUrlByGroup") ? "예 ← 문제" : "아니오"}`);
  console.log("  [교사] 수업 전 Suno 사전 테스트(로그인~생성 완주)·짝 편성(짝당 1계정)을 마쳐 두세요.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
