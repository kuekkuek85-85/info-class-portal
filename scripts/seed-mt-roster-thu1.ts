/**
 * 「디지털 마음 톡톡」 목요일 1기 22명을 명렬표와 수강 명단에 올린다.
 *
 *   node --env-file=.env.local scripts/seed-mt-roster-thu1.ts
 *
 * 화요일 1기(seed-mt-roster.ts)와 하는 일이 같고 명단만 다르다. 한 파일에서 분반을
 * 바꿔 가며 쓰지 않고 따로 두는 이유는, 이 파일이 **그 분반의 명단 원본**이기 때문이다.
 * "목요일 1기에 누가 있었나" 를 나중에 찾을 곳이 코드 안에 있어야 한다.
 *
 * ## 겹치는 학생이 많다
 *
 * 이 분반은 1~8반에서 모였다. 1~4반은 정보과 명렬표에, 5~8반 일부는 「인간과 인공지능」
 * 명단에 이미 올라와 있다. 그래서 대부분 "건너뜀" 이 뜬다 — 정상이다.
 *
 * **기존 학생은 건드리지 않는다.** 이름을 덮어쓰면 그 학생의 정보과 출석·그림·활동지가
 * 엉뚱한 이름으로 딸려 간다. 이름이 다르면 알리기만 하고 사람이 판단한다.
 *
 * 수강 명단(enrollments)은 명렬표와 별개다. 명렬표에 있어도 이 분반 수강생으로
 * 등록해야 대시보드의 "아직 안 들어온 학생" 이 맞는다.
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

/** seed-mt2.ts 의 groups 와 열쇠가 같아야 한다 */
const GROUP_KEY = "mt-thu-1";
const GROUP_LABEL = "목요일 1기";

/** [반, 번호, 이름] — 교사가 준 명단 그대로. 학번은 반·번호에서 만든다 (5반 9번 → 10509) */
const ROSTER: [number, number, string][] = [
  [1, 4, "김나현"],
  [1, 7, "김지후"],
  [1, 15, "이서우"],
  [2, 6, "김하율"],
  [2, 10, "박효은"],
  [3, 10, "박소연"],
  [3, 18, "이호진"],
  [3, 19, "임윤서"],
  [4, 11, "김주은"],
  [4, 17, "신지율"],
  [4, 27, "이서아"],
  [5, 9, "김준희"],
  [5, 22, "조윤우"],
  [6, 10, "박강우"],
  [6, 21, "이태랑"],
  [6, 26, "한석희"],
  [7, 8, "김태욱"],
  [7, 15, "유이현"],
  [7, 17, "이원재"],
  [8, 18, "이소현"],
  [8, 24, "조원희"],
  [8, 26, "최다율"],
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
      const before = (existing.data() as { name?: string }).name ?? "";
      if (before && before !== name) {
        mismatched.push(`${studentId} 명렬표[${before}] ≠ 이번 명단[${name}]`);
      }
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

  /* 문서 ID 를 `분반열쇠__학번` 으로 고정해 두 번 돌려도 늘어나지 않는다 */
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

  /*
   * 다른 분반과 겹치는 학생을 알려 준다.
   *
   * 같은 학생이 두 선택과목을 함께 듣는 경우가 있다. 문제가 되지는 않지만 (활동 통이
   * 달라서 섞이지 않는다), 그 학생이 같은 활동을 두 번 만나지 않는지는 교사가 알아야 한다.
   */
  const mine = new Set(
    ROSTER.map(([c, n]) => `1${String(c).padStart(2, "0")}${String(n).padStart(2, "0")}`),
  );
  const others = (await db.collection("enrollments").get()).docs
    .map((d) => d.data() as { groupKey: string; groupLabel: string; studentId: string })
    .filter((e) => e.groupKey !== GROUP_KEY && mine.has(e.studentId));

  if (others.length > 0) {
    const byGroup = new Map<string, string[]>();
    for (const e of others) {
      const names = byGroup.get(e.groupKey) ?? [];
      const st = ROSTER.find(
        ([c, n]) => `1${String(c).padStart(2, "0")}${String(n).padStart(2, "0")}` === e.studentId,
      );
      names.push(`${e.studentId} ${st?.[2] ?? ""}`);
      byGroup.set(e.groupKey, names);
    }
    console.log("\n다른 분반과 겹치는 학생");
    for (const [key, names] of byGroup) {
      console.log(`  ${key} — ${names.join(" · ")}`);
    }
  }

  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
