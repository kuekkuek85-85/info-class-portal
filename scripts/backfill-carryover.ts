/**
 * 이미 들어와 있는 학생의 제출 단계를 출석 문서에 옮겨 적는다.
 *
 *   node --env-file=.env.local scripts/backfill-carryover.ts <세션ID> [--write]
 *
 * ## 언제 쓰나
 *
 * `carryOverSubmitStage` 는 학생이 **들어올 때** 돈다. 그 코드가 배포되기 전에 이미
 * 들어와 있는 학생은 출석 문서가 0차인 채로 남아, 지난 차시에서 2차를 내고 검토를
 * 못 받은 학생이 교사의 대기 줄에 안 뜬다. 수업 중에는 배포를 할 수 없으므로
 * (학생 화면이 새로 고쳐지면 쓰던 것이 끊긴다) 이 스크립트로 데이터만 맞춘다.
 *
 * 배포가 끝난 뒤로는 필요 없다 — 들어오는 학생이 알아서 물려받는다.
 *
 * 기본은 미리보기다. 실제로 쓰려면 --write 를 붙인다.
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
    privateKey: requiredEnv("FIREBASE_PRIVATE_KEY")
      .replace(/^["']|["']$/g, "")
      .replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const SESSION_ID = process.argv[2];
const WRITE = process.argv.includes("--write");

async function main(): Promise<void> {
  if (!SESSION_ID) {
    console.error("✗ 세션 ID 를 주세요. 예: 2026-09-02__2__4");
    process.exit(1);
  }

  const sessionSnap = await db.collection("classSessions").doc(SESSION_ID).get();
  if (!sessionSnap.exists) {
    console.error(`✗ ${SESSION_ID} 세션이 없습니다.`);
    process.exit(1);
  }
  const session = sessionSnap.data() as {
    rehearsal?: boolean;
    activity?: { activityId?: string };
  };
  const base = session.activity?.activityId;
  if (!base) {
    console.error("✗ 이 수업에는 활동이 없습니다.");
    process.exit(1);
  }
  // 리허설 세션은 활동 ID 뒤에 꼬리표가 붙는다 (gallery.ts 의 activityIdFor)
  const activityId = session.rehearsal ? `${base}__rehearsal` : base;

  const students = await db.collection("students").get();
  const nameOf = new Map<string, string>();
  for (const d of students.docs) {
    const s = d.data() as { studentId?: string; name?: string };
    if (s.studentId) nameOf.set(s.studentId, s.name ?? "?");
  }

  const attendance = await db.collection("attendance").where("sessionId", "==", SESSION_ID).get();
  let moved = 0;
  let queued = 0;

  for (const doc of attendance.docs) {
    const entry = doc.data() as { studentId?: string; submitStage?: number };
    const studentId = entry.studentId ?? "";
    // 오늘 이미 뭔가 낸 학생은 손대지 않는다 — 오늘 것이 최신이다
    if (!studentId || (entry.submitStage ?? 0) > 0) continue;

    const art = await db.collection("artifacts").doc(`${activityId}__${studentId}`).get();
    if (!art.exists) continue;
    const a = art.data() as {
      submitStage?: number;
      answers?: Record<string, string>;
      teacherFeedback?: { at?: number; verdict?: string };
    };
    const stage = a.submitStage ?? 0;
    if (stage < 1) continue;

    const reviewedAt = a.teacherFeedback?.at ?? 0;
    const willQueue = stage >= 2 && !reviewedAt;
    if (willQueue) queued += 1;
    moved += 1;

    const who = `${nameOf.get(studentId) || "임시"}(${studentId.slice(3)}번)`;
    const mark = willQueue
      ? "→ 대기 줄"
      : reviewedAt
        ? `→ 이미 ${a.teacherFeedback?.verdict === "pass" ? "통과" : "검토함"}`
        : "→ 아직 1차";
    console.log(`${WRITE ? "✓" : "(미리보기)"} ${who} · ${stage}차 ${mark}`);

    if (WRITE) {
      await doc.ref.set(
        {
          submitStage: stage,
          reviewedAt,
          selfCheck: a.answers?.news_check2 ?? "",
        },
        { merge: true },
      );
    }
  }

  console.log(`\n옮긴 학생 ${moved}명 · 그중 대기 줄에 서는 학생 ${queued}명`);
  if (!WRITE) console.log("미리보기였습니다. 실제로 쓰려면 --write 를 붙이세요.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
