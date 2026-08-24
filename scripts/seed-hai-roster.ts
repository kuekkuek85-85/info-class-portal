/**
 * 「인간과 인공지능」 화요일 1기 22명을 명렬표에 올린다.
 *
 *   node --env-file=.env.local scripts/seed-hai-roster.ts
 *
 * 이 학생들은 5·6·7·8반이다 — 정보과(1~4반) 명렬표에 없다. 명렬표에 없으면
 * 학번을 눌러도 "명단에서 학번을 찾지 못했어요" 로 막힌다.
 *
 * **기존 학생은 건드리지 않는다.** 이미 있는 학번이면 건너뛴다. 정보과 명렬표를
 * 덮어쓰면 그쪽 수업이 통째로 흔들린다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`✗ 환경변수 ${name} 가 없습니다.`);
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

/** [반, 번호, 이름] — 교사가 준 명단 그대로 */
const ROSTER: [number, number, string][] = [
  [5, 8, "김시윤"],
  [5, 10, "박세홍"],
  [5, 13, "심이삭"],
  [5, 19, "이유원"],
  [5, 21, "정해인"],
  [5, 24, "진룡환"],
  [6, 8, "김지유"],
  [6, 14, "손현서"],
  [6, 20, "이시현"],
  [6, 24, "최서준"],
  [6, 26, "한석희"],
  [6, 27, "김준우"],
  [7, 2, "고여울"],
  [7, 17, "이원재"],
  [7, 21, "이하은"],
  [7, 22, "장민서"],
  [7, 25, "주유준"],
  [7, 26, "차유나"],
  [8, 2, "권오은"],
  [8, 6, "김재우"],
  [8, 9, "김하음"],
  [8, 15, "유슬아"],
];

async function main(): Promise<void> {
  let added = 0;
  let skipped = 0;

  for (const [classNo, number, name] of ROSTER) {
    const studentId = `1${String(classNo).padStart(2, "0")}${String(number).padStart(2, "0")}`;
    const ref = db.collection("students").doc(studentId);
    const existing = await ref.get();

    if (existing.exists) {
      // 이미 있는 학생은 손대지 않는다. 이름이 다르면 알리기만 한다.
      const before = (existing.data() as { name?: string }).name ?? "";
      console.log(`· ${studentId} 이미 있음 (${before || "이름 없음"}) — 건너뜀`);
      skipped += 1;
      continue;
    }

    await ref.set({
      studentId,
      name,
      classNo,
      number,
      temporary: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    console.log(`✓ ${studentId}  ${classNo}반 ${number}번  ${name}`);
    added += 1;
  }

  console.log(`\n새로 올림 ${added}명 · 건너뜀 ${skipped}명 (전체 ${ROSTER.length}명)`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
