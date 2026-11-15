/**
 * 생기부 세특 과목 분할에 맞춰, 옛 합본 subjectKey(mt-1·hai-1)로 저장된 초안을
 * 그 학생의 분반 열쇠(groupKey)로 다시 매긴다. 문서 ID 도 `회차__분반열쇠__학번` 으로 바꾼다.
 *
 *   node --env-file=.env.local scripts/migrate-rc-split-groups.ts         # 미리보기
 *   node --env-file=.env.local scripts/migrate-rc-split-groups.ts --write # 실제 이전
 *
 * 분반 1기만 대상(mt-1→mt-tue-1/mt-thu-1, hai-1→hai-tue-1/hai-thu-1). groupKey 필드가
 * 비어 있으면 enrollments 에서 해당 1기 분반을 찾아 채운다. 겹치면(이미 새 키 문서 존재) 건너뛴다.
 */
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const req = (n: string) => { const v = process.env[n]; if (!v) { console.error("no env " + n); process.exit(1);} return v; };
const app = initializeApp({ credential: cert({ projectId: req("FIREBASE_PROJECT_ID"), clientEmail: req("FIREBASE_CLIENT_EMAIL"), privateKey: req("FIREBASE_PRIVATE_KEY").replace(/^["']|["']$/g, "").replace(/\\n/g, "\n") }) });
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });
const WRITE = process.argv.includes("--write");

const OLD_TO_GROUPS: Record<string, string[]> = {
  "mt-1": ["mt-tue-1", "mt-thu-1"],
  "hai-1": ["hai-tue-1", "hai-thu-1"],
};

async function groupOf(studentId: string, candidates: string[]): Promise<string | null> {
  const enr = await db.collection("enrollments").where("studentId", "==", studentId).get();
  const groups = enr.docs.map((d) => (d.data() as any).groupKey as string);
  return candidates.find((g) => groups.includes(g)) ?? null;
}

let moved = 0, skipped = 0;
for (const [oldKey, candidates] of Object.entries(OLD_TO_GROUPS)) {
  const snap = await db.collection("recordComments").where("subjectKey", "==", oldKey).get();
  for (const d of snap.docs) {
    const x = d.data() as any;
    const newKey = (typeof x.groupKey === "string" && candidates.includes(x.groupKey))
      ? x.groupKey
      : await groupOf(x.studentId, candidates);
    if (!newKey) { console.log(`  ? ${d.id} — 분반을 못 찾아 건너뜀 (학번 ${x.studentId})`); skipped++; continue; }
    const newId = `${x.round}__${newKey}__${x.studentId}`;
    const newRef = db.collection("recordComments").doc(newId);
    if ((await newRef.get()).exists) { console.log(`  = ${d.id} → ${newId} 이미 있음, 건너뜀`); skipped++; continue; }
    console.log(`  → ${d.id}  →  ${newId}  (groupKey ${newKey})`);
    if (WRITE) {
      await newRef.set({ ...x, id: newId, subjectKey: newKey, groupKey: newKey, updatedAt: Date.now() });
      await d.ref.delete();
    }
    moved++;
  }
}
console.log(WRITE ? `\n✓ 이전 ${moved}건, 건너뜀 ${skipped}건` : `\n미리보기: 이전 대상 ${moved}건, 건너뜀 ${skipped}건 (실제로 옮기려면 --write)`);
process.exit(0);
