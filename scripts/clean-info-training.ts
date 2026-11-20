/**
 * 교사 연수(info-training) 흔적 정리. 기본은 미리보기(아무것도 안 지움).
 *
 *   node --env-file=.env.local scripts/clean-info-training.ts                 # 미리보기
 *   node --env-file=.env.local scripts/clean-info-training.ts --write         # 실제 삭제
 *   node --env-file=.env.local scripts/clean-info-training.ts --write --plan  # 연수 계획(lessonPlans/info-training)까지
 *   node --env-file=.env.local scripts/clean-info-training.ts --only-rehearsal [--write]  # 리허설 세션·흔적만
 *     (--only-rehearsal 에서도 임시 학생 문서는 지운다 - 본 세션에서 확정할 때 다시 만들어진다)
 *
 * 지우는 것 - 연수 세션과 연수 자리 번호에 묶인 것만. 전 과목을 훑는 clear-rehearsals 방식은 쓰지 않는다.
 *   · classSessions   groupKey == "info-training" (본 세션 + 리허설 세션)
 *   · codeReservations 그 세션들의 날짜__코드
 *   · seatMaps        그 세션들의 성함 배정표 (참가자 성함이 담긴 문서)
 *   · attendance · moodEntries · reflections · quizAnswers   sessionId 가 그 세션들 (출석의 displayName 에도 성함)
 *   · aiQuota         문서 ID 가 "세션ID__" 로 시작
 *   · artifacts       activityId 가 microbit-makecode__training(__rehearsal)
 *   · aiCallLogs      연수 자리 학번 + (sessionId 가 연수 세션, 또는 sessionId 없이 연수 세션 날짜(KST) 안에 생긴 것)
 *   · students        연수 자리 학번 중 temporary 이고 이름이 빈 문서만 (이름 있는 문서는 절대 안 지움)
 *   · typingScores    연수 자리 학번 문서(있으면)
 */

import { cert, initializeApp } from "firebase-admin/app";
import { FieldPath, getFirestore, type DocumentReference } from "firebase-admin/firestore";

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

const WRITE = process.argv.includes("--write");
const WITH_PLAN = process.argv.includes("--plan");
/** 리허설 세션과 그 흔적만 (본 세션을 연 뒤 리허설만 치울 때) */
const ONLY_REHEARSAL = process.argv.includes("--only-rehearsal");

const GROUP_KEY = "info-training";
const PLAN_ID = "info-training";
const ACTIVITY_IDS = ["microbit-makecode__training", "microbit-makecode__training__rehearsal"];

/** 연수 자리: 6반·7반 테스트(30) + 임시(90~99) = 22개 */
const SEATS: string[] = [];
for (const cls of ["06", "07"]) {
  SEATS.push(`1${cls}30`);
  for (let n = 90; n <= 99; n += 1) SEATS.push(`1${cls}${n}`);
}

/** 그 날짜(KST) 하루의 시작 epoch ms */
function kstDayStart(date: string): number {
  return Date.parse(`${date}T00:00:00+09:00`);
}

function chunks<T>(list: T[], size = 30): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function main(): Promise<void> {
  const victims: { label: string; ref: DocumentReference }[] = [];
  const add = (label: string, ref: DocumentReference) => victims.push({ label, ref });

  // 세션 + 코드 예약
  const all = await db.collection("classSessions").where("groupKey", "==", GROUP_KEY).get();
  const targets = all.docs.filter((d) => !ONLY_REHEARSAL || (d.data() as { rehearsal?: boolean }).rehearsal === true);
  const sessionIds = targets.map((d) => d.id);
  for (const d of targets) {
    add(`classSessions/${d.id}`, d.ref);
    const s = d.data() as { date?: string; code?: string };
    if (s.date && s.code) {
      const res = db.collection("codeReservations").doc(`${s.date}__${s.code}`);
      if ((await res.get()).exists) add(`codeReservations/${res.id}`, res);
    }
  }

  // 세션에 묶인 기록
  for (const name of ["attendance", "moodEntries", "reflections", "quizAnswers"]) {
    for (const part of chunks(sessionIds)) {
      if (part.length === 0) continue;
      const snap = await db.collection(name).where("sessionId", "in", part).get();
      for (const d of snap.docs) add(`${name}/${d.id}`, d.ref);
    }
  }
  // 성함 배정표 (참가자 성함이 담긴 문서) - 문서 ID = 세션ID
  for (const id of sessionIds) {
    const seatMap = db.collection("seatMaps").doc(id);
    if ((await seatMap.get()).exists) add(`seatMaps/${id} (성함 배정표)`, seatMap);
  }
  for (const id of sessionIds) {
    const snap = await db
      .collection("aiQuota")
      .where(FieldPath.documentId(), ">=", `${id}__`)
      .where(FieldPath.documentId(), "<", `${id}__`)
      .get();
    for (const d of snap.docs) add(`aiQuota/${d.id}`, d.ref);
  }

  // 연수 활동 통의 작품
  for (const activityId of ACTIVITY_IDS.filter((a) => !ONLY_REHEARSAL || a.endsWith("__rehearsal"))) {
    const snap = await db.collection("artifacts").where("activityId", "==", activityId).get();
    for (const d of snap.docs) add(`artifacts/${d.id}`, d.ref);
  }

  // AI 호출 기록 - 연수 자리 + (연수 세션 ID 가 찍힌 것, 또는 세션 ID 없이 연수 세션 날짜 안에 생긴 것)
  const sessionSet = new Set(sessionIds);
  const dates = targets.map((d) => String((d.data() as { date?: string }).date ?? "")).filter(Boolean).sort();
  const LOG_FROM = dates.length ? kstDayStart(dates[0]) : Number.POSITIVE_INFINITY;
  const LOG_TO = dates.length ? kstDayStart(dates[dates.length - 1]) + 24 * 60 * 60 * 1000 : 0;
  for (const part of chunks(SEATS)) {
    const snap = await db.collection("aiCallLogs").where("studentId", "in", part).get();
    for (const d of snap.docs) {
      const log = d.data() as { sessionId?: string; createdAt?: number };
      const inTime = (log.createdAt ?? 0) >= LOG_FROM && (log.createdAt ?? 0) < LOG_TO;
      const ours = log.sessionId ? sessionSet.has(log.sessionId) : inTime;
      if (ours) add(`aiCallLogs/${d.id}`, d.ref);
    }
  }

  // 임시 학생 문서 - 이름이 빈 임시 문서만
  for (const part of chunks(SEATS)) {
    const snap = await db.collection("students").where(FieldPath.documentId(), "in", part).get();
    for (const d of snap.docs) {
      const s = d.data() as { name?: string; temporary?: boolean };
      if (s.temporary === true && !String(s.name ?? "").trim()) add(`students/${d.id} (임시)`, d.ref);
      else console.log(`  · 건너뜀 students/${d.id} - 이름이 있거나 임시가 아님`);
    }
    const typing = await db.collection("typingScores").where(FieldPath.documentId(), "in", part).get();
    for (const d of typing.docs) add(`typingScores/${d.id}`, d.ref);
  }

  if (WITH_PLAN) {
    const plan = db.collection("lessonPlans").doc(PLAN_ID);
    if ((await plan.get()).exists) add(`lessonPlans/${PLAN_ID}`, plan);
  }

  console.log(`연수 세션 ${sessionIds.length}개: ${sessionIds.join(", ") || "(없음)"}`);
  console.log(`지울 문서 ${victims.length}개:`);
  for (const v of victims) console.log(`  · ${v.label}`);

  if (!WRITE) {
    console.log("\n미리보기였습니다. 실제로 지우려면 --write 를 붙이세요.");
    process.exit(0);
  }
  for (const part of chunks(victims, 400)) {
    const batch = db.batch();
    for (const v of part) batch.delete(v.ref);
    await batch.commit();
  }
  console.log(`\n✓ ${victims.length}개 삭제 완료.`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
