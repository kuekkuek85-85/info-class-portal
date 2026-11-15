/**
 * STREAMS 리허설 — '완료된 매치 + 점수 다른 판 3개'를 바로 넣는다(발표/시상대 테스트용 임시).
 *
 *   node --env-file=.env.local scripts/seed-streams-rehearsal-finished.ts
 *   node --env-file=.env.local scripts/seed-streams-rehearsal-finished.ts --clear
 *
 * 20장 뽑기를 수동으로 돌리지 않고 등수 발표(대시보드 ↔ 교실 앞 공유 화면 단계 동기화)를
 * 확인하려고 만든 스크립트다. 세션은 open-streams-broadcast-rehearsal 과 같은 리허설 세션
 * (2026-10-15__9__mt-tue-1)을 쓴다. rehearsal: true 라 실제 데이터와 격리된다.
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

const DATE = "2026-10-15";
const PERIOD = 9;
const GROUP_KEY = "mt-tue-1";
const SESSION_ID = `${DATE}__${PERIOD}__${GROUP_KEY}`;
const ACTIVITY_ID = "streams-broadcast-rehearsal";
const CLASS_NO = 1;

const clear = process.argv.includes("--clear");

// 점수 다른 판 3개 — scoreBoard 로 A>B>C.
const BOARD_A = Array.from({ length: 20 }, (_, i) => i + 1); // 1..20 오름차순 한 줄기 = +300
const BOARD_B = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5]; // 5칸×4 = +28
const BOARD_C = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2]; // 2칸×10 = +10

const STUDENTS = [
  { studentId: "10191", board: BOARD_A },
  { studentId: "10192", board: BOARD_B },
  { studentId: "10193", board: BOARD_C },
];

async function clearAll(): Promise<void> {
  const boards = await db.collection("streamsBoards").where("sessionId", "==", SESSION_ID).get();
  const batch = db.batch();
  for (const d of boards.docs) batch.delete(d.ref);
  batch.delete(db.collection("streamsMatches").doc(SESSION_ID));
  await batch.commit();
  console.log(`✓ 매치·판 지움 (판 ${boards.size}개). 세션은 그대로 — open-...-rehearsal --clear 로 지우세요.`);
  process.exit(0);
}

async function main(): Promise<void> {
  if (clear) return clearAll();

  const sess = await db.collection("classSessions").doc(SESSION_ID).get();
  if (!sess.exists) {
    console.error(`✗ 세션 ${SESSION_ID} 없음. 먼저 open-streams-broadcast-rehearsal.ts 로 여세요.`);
    process.exit(1);
  }

  const now = Date.now();
  const batch = db.batch();

  // 완료된 매치(20장 뽑음, 발표 전). 발표는 교사가 대시보드에서 켠다.
  batch.set(db.collection("streamsMatches").doc(SESSION_ID), {
    id: SESSION_ID,
    sessionId: SESSION_ID,
    classNo: CLASS_NO,
    activityId: ACTIVITY_ID,
    deck: Array.from({ length: 20 }, (_, i) => (i % 30) + 1),
    drawCount: 20,
    lastDrawAt: now,
    drawSeconds: 30,
    status: "finished",
    revealRank: false,
    revealStep: 0,
    rev: 1,
    updatedAt: now,
  });

  for (const s of STUDENTS) {
    batch.set(db.collection("streamsBoards").doc(`${SESSION_ID}__${s.studentId}`), {
      id: `${SESSION_ID}__${s.studentId}`,
      sessionId: SESSION_ID,
      studentId: s.studentId,
      classNo: CLASS_NO,
      activityId: ACTIVITY_ID,
      board: s.board,
      placed: 20,
      rev: 1,
      updatedAt: now,
    });
  }

  await batch.commit();
  console.log(`✓ 완료 매치 + 판 3개 넣음 — 세션 ${SESSION_ID}`);
  console.log("  학번 10191(A·최고) / 10192(B·중간) / 10193(C·낮음)");
  console.log("  대시보드에서 세션 선택 → '등수 발표 시작' → 3등→2등→1등 공개.");
  console.log("  공유 화면(/teacher/board) 'STREAMS 등수' 탭이 같은 단계로 크게 따라옵니다.");
  console.log("  정리: node --env-file=.env.local scripts/seed-streams-rehearsal-finished.ts --clear");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
