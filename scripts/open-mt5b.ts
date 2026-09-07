/**
 * 「디지털 마음 톡톡」 5회기 2차시(실패 노래 감상·시상) 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-mt5b.ts [날짜] [교시] [분반]
 *   예) node --env-file=.env.local scripts/open-mt5b.ts 2026-09-22 7 mt-tue-1
 *
 * open-mt5a.ts 와 같은 모양이고 차시 번호만 206 이다. 1차시와 같은 분반으로 열어야
 * 같은 데이터 통(classNo)을 이어 써서 지난 시간 노래가 갤러리에 뜬다.
 *
 * ## 반드시 지키는 두 가지 (open-mt5a.ts 와 같음)
 *
 *  1. 세션 문서 ID 는 **분반 열쇠**를 쓴다 — 같은 교시 정보과와 안 겹치게.
 *  2. **코드를 예약**한다 — 안 남기면 다음 수업이 같은 코드를 받는다.
 *
 * 이 차시는 서로 구경하기가 켜져 있다. 친구에게 나가는 칸이 네 개(노래 링크·자랑
 * 타이틀·가사 한 줄·별점)뿐인지 아래 확인 줄에서 매번 눈으로 확인한다.
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

const LESSON_NO = 206;

/** 분반 열쇠 → 표시명·데이터 통 번호. seed-mt5b 의 groups 와 같아야 한다 */
const GROUPS: Record<string, { label: string; classNo: number }> = {
  "mt-tue-1": { label: "화요일 1기", classNo: 1 },
  "mt-thu-1": { label: "목요일 1기", classNo: 2 },
  "mt-tue-2": { label: "화요일 2기", classNo: 3 },
  "mt-thu-2": { label: "목요일 2기", classNo: 4 },
};

const DATE = process.argv[2] ?? "2026-09-22";
const PERIOD = Number(process.argv[3] ?? 7);
const GROUP_KEY = process.argv[4] ?? "mt-tue-1";

const group = GROUPS[GROUP_KEY];
if (!group) {
  console.error(`✗ 모르는 분반: ${GROUP_KEY}. 하나를 고르세요 — ${Object.keys(GROUPS).join(" · ")}`);
  process.exit(1);
}
const { label: GROUP_LABEL, classNo: CLASS_NO } = group;

const SESSION_ID = `${DATE}__${PERIOD}__${GROUP_KEY}`;

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
    console.error(`✗ ${LESSON_NO}차시 계획이 없습니다. 먼저 scripts/seed-mt5b.ts 를 돌리세요.`);
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
  console.log(`  ${DATE} ${PERIOD}교시 · ${GROUP_LABEL} · ${LESSON_NO}차시 (실패 노래 감상·시상)`);
  console.log(`  수업 코드  ${back.code}`);
  console.log(`  상태 ${back.status} · 단계 ${back.phase} · 되돌아가기 ${back.freeNavigation ? "켬" : "끔"}`);
  console.log(`  서로의 마음 읽기 ${act.galleryEnabled ? "켬" : "끔"} · 친구에게 나가는 칸 ${(act.galleryAnswerKeys as string[])?.join(" · ")}`);
  console.log(`  남의 분반 토큰 실림  ${JSON.stringify(act).includes("linkUrlByGroup") ? "예 ← 문제" : "아니오"}`);
  console.log("  반응 이모지 = 시상 부문: ❤️나도그랬어 · 💡다시일어섰다 · 😮실패예술가 · 👍솔직담백");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
