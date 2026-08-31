/**
 * 「디지털 마음 톡톡」 3회기 · 화요일 1기 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-mt3-tue1.ts [날짜] [교시]
 *
 * open-hai3-tue1.ts 와 같은 모양이다. 분반 수업은 고를 것이 많아(분반·차시·날짜·교시)
 * 수업 직전에 화면에서 손으로 고르다 틀리기 쉽다.
 *
 * ## 여기서 반드시 지켜야 하는 두 가지
 *
 *  1. **세션 문서 ID 는 분반 열쇠를 쓴다** (db.ts 의 sessionDocId 와 같은 규칙).
 *     분반은 데이터 통으로 classNo 1~4 를 나눠 쓰므로, 반 번호로 두면 같은 날 같은
 *     교시의 정보과 수업과 문서 ID 가 겹친다.
 *  2. **코드를 예약한다.** 예약 문서를 안 남기면 교사 화면에서 다음 수업을 만들 때
 *     reserveCode 가 이 코드를 비어 있는 것으로 보고 같은 값을 내준다 — 학생이 남의
 *     수업에 들어간다.
 *
 * 이 회기는 캔바 단추가 없지만, 분반별 주소를 거르는 줄은 그대로 둔다. 나중에 문항을
 * 늘렸을 때 조용히 남의 분반 토큰이 실려 가는 쪽이 더 위험하다.
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
const GROUP_KEY = "mt-tue-1";
const GROUP_LABEL = "화요일 1기";
/** 화면에 안 보이는 데이터 통 번호. 2회기와 같아야 지난 기록과 이어진다 */
const CLASS_NO = 1;
const DATE = process.argv[2] ?? "2026-09-01";
const PERIOD = Number(process.argv[3] ?? 7);

const SESSION_ID = `${DATE}__${PERIOD}__${GROUP_KEY}`;

/** 안 쓰이는 두 자리 코드를 고르고 예약까지 한다 */
async function pickCode(): Promise<string> {
  const live = await db.collection("classSessions").where("status", "in", ["scheduled", "active"]).get();
  const taken = new Set(live.docs.map((d) => String((d.data() as { code?: string }).code ?? "")));

  for (let n = 10; n <= 99; n += 1) {
    const code = String(n);
    if (taken.has(code)) continue;
    try {
      // create 라서 이미 예약돼 있으면 던진다 — 두 스크립트가 같은 코드를 못 잡는다
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
    console.error(`✗ ${LESSON_NO}차시 계획이 없습니다. 먼저 scripts/seed-mt3.ts 를 돌리세요.`);
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

  // 읽어서 확인한다. 반쪽만 써진 세션 문서가 남는 사고를 겪은 적이 있다
  const back = (await db.collection("classSessions").doc(SESSION_ID).get()).data() as
    | Record<string, unknown>
    | undefined;
  if (!back?.code) {
    console.error("✗ 문서가 제대로 안 써졌습니다.");
    process.exit(1);
  }

  const act = back.activity as Record<string, unknown>;
  console.log(`✓ 열림  ${SESSION_ID}`);
  console.log(`  ${DATE} ${PERIOD}교시 · ${GROUP_LABEL} · ${LESSON_NO}차시`);
  console.log(`  수업 코드  ${back.code}`);
  console.log(`  상태 ${back.status} · 단계 ${back.phase} · 되돌아가기 ${back.freeNavigation ? "켬" : "끔"}`);
  console.log(`  마음 체크인 ${back.moodCheckEnabled ? "켬" : "끔"} · 대기 게임 ${(back.game as { heading?: string })?.heading ?? "없음"}`);
  console.log(`  서로의 마음 읽기 ${act.galleryEnabled ? "켬" : "끔"} · 친구에게 나가는 칸 ${(act.galleryAnswerKeys as string[])?.join(" · ")}`);
  console.log(`  남의 분반 토큰 실림  ${JSON.stringify(act).includes("linkUrlByGroup") ? "예 ← 문제" : "아니오"}`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
