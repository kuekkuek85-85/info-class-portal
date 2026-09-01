/**
 * 7차시에 「잘했다」로 받은 학생에게 통과 판정을 뒤늦게 찍는다.
 *
 *   node --env-file=.env.local scripts/backfill-lesson7-pass.ts [--write]
 *
 * ## 왜 손으로 골라야 했나
 *
 * 8/31 검토 때는 교사 화면의 단추가 하나였다. 그래서 그때 남은 피드백에는 통과인지
 * 고치기인지가 없다. 남은 것은 칩과 글뿐인데, 그 글로 기계가 가르게 하면 틀린다 —
 * 칭찬과 지적이 한 문장에 섞여 있는 경우가 실제로 있었다.
 *
 * 그래서 **선생님이 직접 고른 네 명**을 여기 적어 둔다. 목록을 코드에 박아 두는 것이
 * 이 스크립트의 요점이다. 실행할 때마다 같은 네 명에게만 찍히고, 두 번 돌려도 같다.
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

/** 5~8차시가 같이 쓰는 활동 통. 작품은 차시가 아니라 활동에 묶인다 */
const ACTIVITY_ID = "career-plan";

/** 선생님이 8/31 검토에서 「잘했다」로 보낸 학생. 이 목록 밖은 손대지 않는다 */
const PASSED = ["10102", "10123", "10403", "10409"];

const WRITE = process.argv.includes("--write");

async function main(): Promise<void> {
  const students = await db.collection("students").get();
  const nameOf = new Map<string, string>();
  for (const d of students.docs) {
    const s = d.data() as { studentId?: string; name?: string; classNo?: number };
    if (s.studentId) nameOf.set(s.studentId, `${s.classNo}반 ${s.name ?? "?"}`);
  }

  for (const studentId of PASSED) {
    const ref = db.collection("artifacts").doc(`${ACTIVITY_ID}__${studentId}`);
    const snap = await ref.get();
    const who = nameOf.get(studentId) ?? "(명단에 없음)";

    if (!snap.exists) {
      console.log(`✗ [${studentId}] ${who} — 작품이 없습니다. 건너뜁니다.`);
      continue;
    }
    const fb = (snap.data() as { teacherFeedback?: { verdict?: string } }).teacherFeedback;
    if (!fb) {
      console.log(`✗ [${studentId}] ${who} — 피드백 기록이 없습니다. 건너뜁니다.`);
      continue;
    }
    if (fb.verdict === "pass") {
      console.log(`· [${studentId}] ${who} — 이미 통과입니다.`);
      continue;
    }

    if (!WRITE) {
      console.log(`(미리보기) [${studentId}] ${who} — 통과로 찍습니다.`);
      continue;
    }

    /*
     * 판정만 얹는다.
     *
     * merge 는 map 안쪽까지 합치므로 선생님이 그때 쓴 칩과 글은 그대로 남는다.
     * 학생 화면의 「선생님이 남긴 말」 이 그 기록을 그대로 보여준다.
     */
    await ref.set({ teacherFeedback: { verdict: "pass" } }, { merge: true });
    console.log(`✓ [${studentId}] ${who} — 통과`);
  }

  if (!WRITE) console.log("\n미리보기였습니다. 실제로 쓰려면 --write 를 붙이세요.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
