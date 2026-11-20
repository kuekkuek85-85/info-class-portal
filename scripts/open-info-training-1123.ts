/**
 * 교사 연수 세션 열기 (2026-11-22(일) 20:00, 줌 - 11/23 에서 정정). 파일 이름은 옛 날짜 그대로 둔다.
 *
 *   node --env-file=.env.local scripts/open-info-training-1123.ts                        # 본 세션: 11/22 8교시
 *   node --env-file=.env.local scripts/open-info-training-1123.ts --date 2026-11-23      # 본 세션 날짜를 바꿀 때
 *   node --env-file=.env.local scripts/open-info-training-1123.ts --rehearsal 2026-11-21 # 리허설: 그날 9교시 (본 세션 날짜 전날까지)
 *
 * 먼저 seed-info-training.ts 로 lessonPlans/info-training 을 넣어 둔다.
 *
 * ## 왜 8교시인가
 *   1~7교시는 학교 시각표에 있어 교시 끝+10분에 코드가 닫힌다(7교시 15:55 끝 → 20:00 엔 이미 닫힘).
 *   8교시는 시각표에 없어 교시 만료가 없고, 「수업 시작」 뒤 6시간 상한만 걸린다(src/lib/db.ts isSessionClosed).
 *   → **19:30 이후에** 대시보드에서 「수업 시작」을 누른다. 이 스크립트는 예정(scheduled) 상태로만 만든다.
 *
 * ## 분리
 *   groupKey "info-training" (반 검사 생략 → 6반·7반 임시 번호를 한 세션에 받는다), 데이터 통 반 번호 7,
 *   activityId microbit-makecode__training (리허설이면 서버가 __rehearsal 를 더 붙인다).
 *   분반 명단(enrollments)은 만들지 않는다 - 대시보드 「안 들어온 학생」이 비어 깔끔하다.
 *   세션 문서에 계획 전체를 복사하므로 rewardGame(없음)·phaseOrder·phaseLabels·focusExempt·freeNavigation 이 다 실린다.
 *
 * ## 낮 수업과 안 섞이게
 *   코드는 50번부터 빈 번호를 예약한다(정규 수업 10번대와 거리를 둔다). 이미 있으면 다시 만들지 않는다.
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

const PLAN_ID = "info-training";
const ACTIVITY_ID = "microbit-makecode__training";
const GROUP_KEY = "info-training";
const GROUP_LABEL = "교사 연수";
/** 데이터 통 반 번호. 연수 학번(10690~ · 10790~)의 반과 상관없이 출석·작품에 이 값이 붙는다 */
const CLASS_BUCKET = 7;

/** 연수 날짜 (2026-11-22 일요일 20:00 으로 정정, 교사 확인). --date 로 바꿀 수 있다 */
const MAIN_DATE_DEFAULT = "2026-11-22";
const dateAt = process.argv.indexOf("--date");
const MAIN_DATE = dateAt !== -1 ? (process.argv[dateAt + 1] ?? "") : MAIN_DATE_DEFAULT;
const rehearsalAt = process.argv.indexOf("--rehearsal");
const REHEARSAL = rehearsalAt !== -1;
const DATE = REHEARSAL ? (process.argv[rehearsalAt + 1] ?? "") : MAIN_DATE;
/** 본 세션 8교시(시각표 밖, 6시간 상한). 리허설은 대시보드 리허설과 같은 9교시(그날이 지나면 닫힘) */
const PERIOD = REHEARSAL ? 9 : 8;

if (!/^\d{4}-\d{2}-\d{2}$/.test(DATE)) {
  console.error("✗ 날짜 형식은 2026-11-22 입니다. 예) --rehearsal 2026-11-22");
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(MAIN_DATE)) {
  console.error("✗ --date 형식은 2026-11-22 입니다.");
  process.exit(1);
}
if (REHEARSAL && DATE >= MAIN_DATE) {
  console.error("✗ 리허설은 연수 전날까지만 엽니다(본 세션과 같은 날 리허설 세션을 두면 대시보드 선택이 헷갈린다).");
  process.exit(1);
}

async function pickCode(): Promise<string> {
  const live = await db.collection("classSessions").where("status", "in", ["scheduled", "active"]).get();
  const taken = new Set(live.docs.map((d) => String((d.data() as { code?: string }).code ?? "")));
  for (let n = 50; n <= 99; n += 1) {
    const code = String(n);
    if (taken.has(code)) continue;
    try {
      await db.collection("codeReservations").doc(`${DATE}__${code}`).create({ date: DATE, code, createdAt: Date.now() });
      return code;
    } catch {
      /* 이미 예약 - 다음 번호 */
    }
  }
  throw new Error("50~99 에 남은 코드가 없습니다.");
}

async function main(): Promise<void> {
  const sessionId = `${DATE}__${PERIOD}__${GROUP_KEY}`;
  const ref = db.collection("classSessions").doc(sessionId);
  const existing = await ref.get();
  if (existing.exists) {
    const s = existing.data() as { code?: string; status?: string };
    console.log(`· 이미 있음 ${sessionId} - 코드 ${s.code} (${s.status}). 내용을 고치려면 seed-info-training.ts 를 다시 돌린다.`);
    process.exit(0);
  }

  const planDoc = await db.collection("lessonPlans").doc(PLAN_ID).get();
  if (!planDoc.exists) {
    console.error(`✗ lessonPlans/${PLAN_ID} 가 없습니다. seed-info-training.ts 를 먼저 돌리세요.`);
    process.exit(1);
  }
  const p = planDoc.data() as Record<string, unknown> & { activity?: { activityId?: string }; title?: string };
  if (p.activity?.activityId !== ACTIVITY_ID) {
    console.error(`✗ 계획의 activityId 가 ${ACTIVITY_ID} 가 아닙니다 (${p.activity?.activityId}). 실제 학생 작품과 섞일 수 있어 멈춥니다.`);
    process.exit(1);
  }

  const code = await pickCode();
  // 계획 전체를 복사한다(id·시각 필드 제외). variant·lessonNo 도 그대로 실린다.
  const { createdAt: _c, updatedAt: _u, ...planBody } = p;

  await ref.set({
    ...planBody,
    lessonPlanId: PLAN_ID,
    title: p.title,
    classNo: CLASS_BUCKET,
    groupKey: GROUP_KEY,
    groupLabel: GROUP_LABEL,
    date: DATE,
    period: PERIOD,
    code,
    status: "scheduled",
    phase: "waiting",
    rehearsal: REHEARSAL,
    // 성함 입장: 학번 대신 성함을 받고 서버가 6반·7반 임시 자리(20석)를 배정한다 (src/lib/name-entry.ts)
    nameEntry: true,
    rewardGame: null,
    videoPrompts: [],
    teacherNote: "",
    startedAt: null,
    endedAt: null,
    createdAt: Date.now(),
  });

  const back = (await ref.get()).data() as Record<string, unknown> & { activity?: { activityId?: string } };
  const problems: string[] = [];
  if (back.period !== PERIOD) problems.push(`period=${back.period}`);
  if (back.groupKey !== GROUP_KEY) problems.push("groupKey");
  if (back.activity?.activityId !== ACTIVITY_ID) problems.push("activityId");
  if (back.rewardGame) problems.push("rewardGame 이 남아 있음");
  if (back.freeNavigation !== false) problems.push("freeNavigation");
  if (!Array.isArray(back.phaseOrder) || (back.phaseOrder as unknown[]).length === 0) problems.push("phaseOrder");
  if (back.status !== "scheduled") problems.push(`status=${back.status}`);
  if (back.nameEntry !== true) problems.push("nameEntry");
  if (problems.length) {
    console.error(`✗ ${sessionId} 가 기대와 다릅니다: ${problems.join(", ")}`);
    process.exit(1);
  }

  console.log(
    `✓ ${REHEARSAL ? "리허설" : "본 세션"} ${sessionId}\n` +
      `  「${back.title}」 코드 ${back.code} · ${PERIOD}교시 · ${GROUP_LABEL} · 상태 scheduled\n` +
      `  phaseOrder=${JSON.stringify(back.phaseOrder)}\n` +
      `  reflection=${JSON.stringify(back.reflectionQuestions)} · focusExempt=${JSON.stringify(back.focusExempt)}\n` +
      (REHEARSAL
        ? "  대시보드에서 이 리허설을 직접 눌러 고른 뒤 「수업 시작」. 그날이 지나면 저절로 닫힌다."
        : "  ★ 19:30 이후에 대시보드에서 「8교시 · 교사 연수」를 직접 눌러 고른 뒤 「수업 시작」. 시작 6시간 뒤 닫힌다."),
  );
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
