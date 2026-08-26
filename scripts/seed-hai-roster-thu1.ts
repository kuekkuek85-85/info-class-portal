/**
 * 「인간과 인공지능」 목요일 1기 22명을 명렬표에 올린다.
 *
 *   node --env-file=.env.local scripts/seed-hai-roster-thu1.ts
 *
 * 화요일 1기(seed-hai-roster.ts)와 하는 일이 같고 명단만 다르다. 한 파일에 분반을
 * 바꿔 가며 쓰지 않고 따로 둔 이유는, 이 파일이 **그 분반의 명단 원본**이기 때문이다.
 * 나중에 "목요일 1기에 누가 있었나" 를 찾을 곳이 코드 안에 있어야 한다.
 *
 * ## 이 분반은 1~4반 학생이다
 *
 * 화요일 1기는 5~8반이라 정보과 명렬표에 없었다. 목요일 1기는 **1~4반**이어서
 * 스물두 명이 이미 정보과 학생으로 올라와 있다. 그래서 대부분 "건너뜀" 이 뜬다 —
 * 정상이다. 기존 학생은 건드리지 않는다. 이름을 덮어쓰면 정보과 수업의 출석·작품이
 * 엉뚱한 이름으로 딸려 간다.
 *
 * 수강 명단(enrollments)은 별개다. 명렬표에 있어도 이 분반 수강생으로 등록해야
 * 대시보드의 "아직 안 들어온 학생" 이 맞는다.
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

/** 이 명단이 속한 분반 (seed-hai2.ts 의 groups 와 같은 열쇠여야 한다) */
const GROUP_KEY = "hai-thu-1";
const GROUP_LABEL = "목요일 1기";

/** [반, 번호, 이름] — 교사가 준 명단 그대로 */
const ROSTER: [number, number, string][] = [
  [1, 4, "김나현"],
  [1, 6, "김재현"],
  [1, 7, "김지후"],
  [1, 9, "박나현"],
  [1, 11, "박소미"],
  [1, 20, "이하엘"],
  [2, 4, "김슬아"],
  [2, 13, "온유"],
  [2, 18, "이도근"],
  [2, 21, "전재범"],
  [2, 23, "최민설"],
  [3, 8, "김태윤"],
  [3, 10, "박소연"],
  [3, 11, "성소율"],
  [3, 13, "송리후"],
  [3, 17, "이하은"],
  [3, 25, "최인웅"],
  [4, 3, "구다윤"],
  [4, 14, "나주혁"],
  [4, 16, "노서현"],
  [4, 20, "우시연"],
  [4, 25, "정서원"],
];

async function main(): Promise<void> {
  let added = 0;
  let skipped = 0;
  const mismatched: string[] = [];

  for (const [classNo, number, name] of ROSTER) {
    const studentId = `1${String(classNo).padStart(2, "0")}${String(number).padStart(2, "0")}`;
    const ref = db.collection("students").doc(studentId);
    const existing = await ref.get();

    if (existing.exists) {
      /*
       * 이미 있는 학생은 손대지 않는다. 다만 이름이 다르면 알린다 — 정보과 명렬표와
       * 어긋난다는 뜻이고, 둘 중 하나가 틀린 것이라 사람이 봐야 한다.
       */
      const before = (existing.data() as { name?: string }).name ?? "";
      if (before && before !== name) mismatched.push(`${studentId} 명렬표[${before}] ≠ 이번 명단[${name}]`);
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

  console.log(`\n명렬표 — 새로 올림 ${added}명 · 건너뜀 ${skipped}명 (전체 ${ROSTER.length}명)`);

  if (mismatched.length > 0) {
    console.log("\n⚠ 이름이 다릅니다 — 확인해 주세요");
    for (const line of mismatched) console.log(`   ${line}`);
  }

  /*
   * 수강 명단. 문서 ID 를 `분반열쇠__학번` 으로 고정해 두 번 돌려도 늘어나지 않는다.
   * 이 명단이 대시보드의 "아직 안 들어온 학생" 을 만든다.
   */
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
