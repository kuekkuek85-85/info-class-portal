/**
 * 「인간과 인공지능」 목요일 2기 22명을 명렬표에 올린다.
 *
 *   node --env-file=.env.local scripts/seed-hai-roster-thu2.ts
 *
 * seed-hai-roster.ts 와 같은 꼴이다. 이 학생들은 1·2·3·4반이다 — 정보과(1~4반)와
 * 학번이 겹친다. 같은 학년-반-번호는 같은 사람이므로 **이미 있으면 건너뛴다**(정보과
 * 명렬표를 덮어쓰면 그쪽 수업이 흔들린다). 이름이 다르면 알리기만 한다 — 그때는 교사
 * 확인이 필요하다.
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
const GROUP_KEY = "hai-thu-2";
const GROUP_LABEL = "목요일 2기";

/** [반, 번호, 이름] — 교사가 준 명단 그대로 */
const ROSTER: [number, number, string][] = [
  [1, 8, "노해은"],
  [1, 12, "박지안"],
  [1, 21, "이호건"],
  [1, 22, "장윤슬"],
  [1, 25, "최수진"],
  [2, 1, "김경도"],
  [2, 3, "김선호"],
  [2, 8, "남윤아"],
  [2, 14, "유민재"],
  [2, 15, "윤세영"],
  [2, 20, "장이준"],
  [3, 1, "이윤나"],
  [3, 5, "김도현"],
  [3, 14, "심재원"],
  [3, 19, "임윤서"],
  [3, 26, "탁상현"],
  [3, 27, "양건영"],
  [4, 5, "김건우"],
  [4, 6, "김경훈"],
  [4, 17, "신지율"],
  [4, 23, "이원행"],
  [4, 24, "임주완"],
];

async function main(): Promise<void> {
  let added = 0;
  let skipped = 0;
  let nameMismatch = 0;

  for (const [classNo, number, name] of ROSTER) {
    const studentId = `1${String(classNo).padStart(2, "0")}${String(number).padStart(2, "0")}`;
    const ref = db.collection("students").doc(studentId);
    const existing = await ref.get();

    if (existing.exists) {
      const before = (existing.data() as { name?: string }).name ?? "";
      if (before && before !== name) {
        console.log(`· ${studentId} 이미 있음 — 건너뜀  ⚠ 이름 다름(명렬표: ${before} / 명단: ${name})`);
        nameMismatch += 1;
      } else {
        console.log(`· ${studentId} 이미 있음 (${before || "이름 없음"}) — 건너뜀`);
      }
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
  if (nameMismatch > 0) {
    console.log(`⚠ 이름이 다른 학번 ${nameMismatch}건 — 정보과 명렬표와 교사 명단이 다릅니다. 확인 필요.`);
  }

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
