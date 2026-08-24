/**
 * 「디지털 마음 톡톡」 분반 명단을 명렬표와 수강 명단에 올린다.
 *
 *   node --env-file=.env.local scripts/seed-mt-roster.ts
 *
 * ## 먼저 아래 ROSTER 에 명단을 채워야 한다
 *
 * 이 과목은 학년 전체에서 모이므로, 명렬표에 없는 학번이면 학번을 눌러도
 * "명단에서 학번을 찾지 못했어요" 로 막힌다. **가장 먼저 해야 하는 일이다.**
 *
 * 임시 번호로도 수업은 돌아가지만(그렇게 들어온 학생은 이름 없이 기록된다),
 * 그러면 대시보드에서 누가 안 들어왔는지 알 수 없고 기록에 이름이 안 붙는다.
 *
 * ## 기존 학생은 건드리지 않는다
 *
 * 정보과(1~4반)와 「인간과 인공지능」에 이미 올라간 학생이 여기 또 있을 수 있다.
 * 이미 있는 학번은 **건너뛴다** — 덮어쓰면 그쪽 수업의 이름·반이 흔들린다.
 * 수강 명단(enrollments)만 이 분반 것으로 새로 만든다.
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

/**
 * 지금 올릴 분반. seed-mt2.ts 의 groups 와 열쇠가 같아야 한다.
 *
 *   mt-tue-1 화요일 1기 · mt-thu-1 목요일 1기
 *   mt-tue-2 화요일 2기 · mt-thu-2 목요일 2기
 *
 * 분반마다 한 번씩, 이 둘과 ROSTER 를 바꿔 가며 실행한다.
 */
const GROUP_KEY = "mt-tue-1";
const GROUP_LABEL = "화요일 1기";

/**
 * [반, 번호, 이름] — 교사가 준 명단 그대로.
 *
 * 학번은 반·번호에서 만든다 (5반 8번 → 10508).
 */
const ROSTER: [number, number, string][] = [
  // 예) [5, 8, "김시윤"],
];

async function main(): Promise<void> {
  if (ROSTER.length === 0) {
    console.error(
      `✗ ${GROUP_LABEL}(${GROUP_KEY}) 명단이 비어 있습니다.\n\n` +
        "  이 파일의 ROSTER 배열에 [반, 번호, 이름] 을 채운 뒤 다시 실행하세요:\n" +
        '    const ROSTER: [number, number, string][] = [\n' +
        '      [5, 8, "김시윤"],\n' +
        '      [6, 14, "손현서"],\n' +
        "    ];\n\n" +
        "  명단 없이도 수업은 열립니다 — 학생은 임시 번호로 들어옵니다.\n" +
        "  다만 대시보드에서 결석자를 알 수 없고, 기록에 이름이 안 붙습니다.",
    );
    process.exit(1);
  }

  let added = 0;
  let skipped = 0;

  for (const [classNo, number, name] of ROSTER) {
    const studentId = `1${String(classNo).padStart(2, "0")}${String(number).padStart(2, "0")}`;
    const ref = db.collection("students").doc(studentId);
    const existing = await ref.get();

    if (existing.exists) {
      // 이미 있는 학생은 손대지 않는다. 이름이 다르면 알리기만 한다.
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

  /*
   * 수강 명단. 문서 ID 를 `분반열쇠__학번` 으로 고정해 두 번 돌려도 늘어나지 않는다.
   * 이 명단이 대시보드의 "아직 안 들어온 학생" 을 만든다 — 없으면 엉뚱한 반 전체가 뜬다.
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
