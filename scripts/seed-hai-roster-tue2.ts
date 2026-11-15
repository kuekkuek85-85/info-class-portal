/**
 * 「인간과 인공지능」 화요일 2기 22명을 명렬표에 올린다.
 *
 *   node --env-file=.env.local scripts/seed-hai-roster-tue2.ts
 *
 * seed-hai-roster.ts(화요일 1기)와 같은 꼴이다. 이 학생들은 5·6·7·8반이다 —
 * 정보과(1~4반) 명렬표에 없다. 명렬표에 없으면 학번을 눌러도 막힌다.
 *
 * **기존 학생은 건드리지 않는다.** 이미 있는 학번이면 건너뛴다(화요일 1기는 같은 5~8반의
 * 다른 번호라 겹치지 않는다). 이름이 다르면 알리기만 한다.
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

/** 이 명단이 속한 분반 */
const GROUP_KEY = "hai-tue-2";
const GROUP_LABEL = "화요일 2기";

/** [반, 번호, 이름] — 교사가 준 명단 그대로 */
const ROSTER: [number, number, string][] = [
  [5, 1, "강하랑"],
  [5, 6, "김서아"],
  [5, 17, "이시은"],
  [5, 27, "이경섭"],
  [6, 1, "공지예"],
  [6, 2, "권나은"],
  [6, 3, "권지용"],
  [6, 10, "박강우"],
  [6, 18, "유시온"],
  [6, 22, "정아윤"],
  [7, 1, "강리해"],
  [7, 4, "김시아"],
  [7, 11, "박동은"],
  [7, 12, "박민준"],
  [7, 14, "서유찬"],
  [7, 20, "이준용"],
  [8, 5, "김예준"],
  [8, 8, "김태희"],
  [8, 17, "이근규"],
  [8, 19, "임선우"],
  [8, 26, "최다율"],
  [8, 27, "최윤아"],
];

async function main(): Promise<void> {
  let added = 0;
  let skipped = 0;

  for (const [classNo, number, name] of ROSTER) {
    const studentId = `1${String(classNo).padStart(2, "0")}${String(number).padStart(2, "0")}`;
    const ref = db.collection("students").doc(studentId);
    const existing = await ref.get();

    if (existing.exists) {
      const before = (existing.data() as { name?: string }).name ?? "";
      const flag = before && before !== name ? `  ⚠ 이름 다름(명렬표: ${before})` : "";
      console.log(`· ${studentId} 이미 있음 (${before || "이름 없음"}) — 건너뜀${flag}`);
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
    console.log(`✓ ${studentId}  ${classNo}반 ${number}번`);
    added += 1;
  }

  console.log(`\n명렬표 — 새로 올림 ${added}명 · 건너뜀 ${skipped}명 (전체 ${ROSTER.length}명)`);

  /* 수강 명단. 문서 ID 를 `분반열쇠__학번` 으로 고정해 두 번 돌려도 늘어나지 않는다. */
  for (const [classNo, number] of ROSTER) {
    const studentId = `1${String(classNo).padStart(2, "0")}${String(number).padStart(2, "0")}`;
    await db.collection("enrollments").doc(`${GROUP_KEY}__${studentId}`).set({
      groupKey: GROUP_KEY,
      groupLabel: GROUP_LABEL,
      studentId,
      createdAt: Date.now(),
    });
  }
  console.log(`수강 명단 — ${GROUP_LABEL}(${GROUP_KEY}) ${ROSTER.length}명`);

  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
