/**
 * 「디지털 마음 톡톡」 화요일 2기(mt-tue-2) 명단을 명렬표·수강 명단에 올린다.
 *
 *   node --env-file=.env.local scripts/seed-mt-roster-tue2.ts
 *
 * seed-mt-roster.ts 와 같은 형식·필드. 이미 있는 학번(정보과·인간과AI 등)은 건드리지
 * 않고 건너뛴다 — enrollments(수강 명단)만 이 분반 것으로 새로 만든다.
 * 문서 ID = `mt-tue-2__학번` 이라 두 번 돌려도 늘어나지 않는다.
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

const GROUP_KEY = "mt-tue-2";
const GROUP_LABEL = "화요일 2기";

/** [반, 번호, 이름] — 교사가 준 명단 그대로. 학번 = 1 + 반(2자리) + 번호(2자리). */
const ROSTER: [number, number, string][] = [
  [1, 10, "박서준"],
  [1, 13, "손주원"],
  [1, 17, "이재아"],
  [2, 16, "윤지원"],
  [2, 20, "장이준"],
  [3, 3, "김가현"],
  [3, 8, "김태윤"],
  [3, 15, "이윤정"],
  [4, 12, "김지안"],
  [4, 15, "남윤우"],
  [5, 20, "장수지"],
  [5, 26, "황성민"],
  [5, 27, "이경섭"],
  [6, 15, "송경섭"],
  [6, 19, "이루다"],
  [6, 20, "이시현"],
  [7, 6, "김지민"],
  [7, 24, "조효빈"],
  [8, 1, "고윤하"],
  [8, 13, "백서연"],
  [8, 15, "유슬아"],
  [8, 20, "임예서"],
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
      const note = before && before !== name ? ` — 명단은 "${name}" 인데 등록된 이름은 "${before}"` : "";
      console.log(`· ${studentId} 이미 있음 (${before || "이름 없음"}) — 건너뜀${note}`);
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

  console.log(`\n명렬표 — 새로 올림 ${added}명 · 건너뜀 ${skipped}명 (전체 ${ROSTER.length}명)`);

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
