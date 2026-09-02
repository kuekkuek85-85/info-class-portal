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
    if (!studentId) continue;
    /*
     * 오늘 낸 학생도 그냥 다시 계산한다.
     *
     * 여기서 쓰는 값은 전부 작품에서 나온다. 오늘 학생이 내면 작품도 같이 올라가고,
     * 오늘 선생님이 판정하면 판정 시각도 작품에 있다. 그래서 몇 번을 돌려도 결과가
     * 같고, 필드를 새로 늘렸을 때 이미 한 번 돌린 반에도 다시 채울 수 있다.
     */

    const art = await db.collection("artifacts").doc(`${activityId}__${studentId}`).get();
    if (!art.exists) continue;
    const a = art.data() as {
      submitStage?: number;
      submitStageAt?: number;
      answers?: Record<string, string>;
      teacherFeedback?: { at?: number; verdict?: string };
    };
    const stage = a.submitStage ?? 0;
    if (stage < 1) continue;

    /*
     * 낸 것이 판정보다 나중이면 아직 기다리는 중이다 (db.ts 의 carryOverSubmitStage
     * 와 같은 규칙). 고치라는 말을 듣고 고쳐서 다시 낸 학생이 여기 걸린다.
     */
    const judgedAt = a.teacherFeedback?.at ?? 0;
    const reviewedAt = (a.submitStageAt ?? 0) > judgedAt ? 0 : judgedAt;
    const passed = reviewedAt > 0 && a.teacherFeedback?.verdict === "pass";
    const willQueue = stage >= 2 && !reviewedAt;
    if (willQueue) queued += 1;
    moved += 1;

    const who = `${nameOf.get(studentId) || "임시"}(${studentId.slice(3)}번)`;
    const mark = willQueue
      ? judgedAt
        ? "→ 대기 줄 (고쳐서 다시 냄)"
        : "→ 대기 줄"
      : reviewedAt
        ? `→ 이미 ${a.teacherFeedback?.verdict === "pass" ? "통과" : "검토함"}`
        : "→ 아직 1차";
    console.log(`${WRITE ? "✓" : "(미리보기)"} ${who} · ${stage}차 ${mark}`);

    if (WRITE) {
      await doc.ref.set(
        {
          // 통과는 최종 제출이다. 옛 기록이 2차인 채로 남아 있어도 3차로 본다
          submitStage: passed ? 3 : stage,
          reviewedAt,
          // 통과 명단 카드가 읽는 값 (Attendance 의 passed)
          passed,
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
