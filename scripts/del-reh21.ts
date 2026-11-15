/**
 * 10/13 리허설 21차시 테스트 세션(2026-10-13__9__1, rehearsal=true, 테스트 10130) 삭제.
 *   node --env-file=.env.local scripts/del-reh21.ts            (드라이런 — 백업만)
 *   node --env-file=.env.local scripts/del-reh21.ts --write    (실제 삭제)
 * 삭제: 세션 + attendance(이 세션) + moodEntries(이 세션) + codeReservation(2026-10-13__88)
 *      + 빈 리허설 아티팩트 python-dodge-game__rehearsal__10130.
 * 유지: python-dodge-game__10130 (리허설 아님, 게임아크 누적) — 안 건드림.
 */
import { writeFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
function req(n: string): string { const v = process.env[n]; if (!v) { console.error(`missing ${n}`); process.exit(1); } return v; }
const app = initializeApp({ credential: cert({ projectId: req("FIREBASE_PROJECT_ID"), clientEmail: req("FIREBASE_CLIENT_EMAIL"), privateKey: req("FIREBASE_PRIVATE_KEY").replace(/^["']|["']$/g, "").replace(/\\n/g, "\n") }) });
const db = getFirestore(app);
const WRITE = process.argv.includes("--write");
const SID = "2026-10-13__9__1";
const CODE_RES = "2026-10-13__88";
const REH_ART = "python-dodge-game__rehearsal__10130";
const BACKUP = "C:/Users/kuekk/AppData/Local/Temp/claude/C--claude-code-project---------/71fc48ef-a0ab-4f5f-b7d5-c17af23e2a86/scratchpad/del-reh21-backup.json";

async function main() {
  const session = await db.collection("classSessions").doc(SID).get();
  const att = (await db.collection("attendance").where("sessionId", "==", SID).get()).docs;
  const mood = (await db.collection("moodEntries").get()).docs.filter((x) => String((x.data() as Record<string,unknown>).sessionId ?? "") === SID);
  const cr = await db.collection("codeReservations").doc(CODE_RES).get();
  const reh = await db.collection("artifacts").doc(REH_ART).get();

  const backup = {
    at: new Date().toISOString(),
    session: session.exists ? { id: session.id, data: session.data() } : null,
    attendance: att.map((d) => ({ id: d.id, data: d.data() })),
    moodEntries: mood.map((d) => ({ id: d.id, data: d.data() })),
    codeReservation: cr.exists ? { id: cr.id, data: cr.data() } : null,
    rehearsalArtifact: reh.exists ? { id: reh.id, data: reh.data() } : null,
  };
  writeFileSync(BACKUP, JSON.stringify(backup, null, 2), "utf8");
  console.log(`백업 저장: ${BACKUP}`);
  console.log(`삭제 대상: 세션 ${session.exists ? "1" : "0"} · attendance ${att.length} · mood ${mood.length} · codeRes ${cr.exists ? "1" : "0"} · 리허설아티팩트 ${reh.exists ? `1(ans ${Object.keys((reh.data() as Record<string,unknown>).answers ?? {}).length})` : "0"}`);
  console.log(`유지: python-dodge-game__10130 (안 건드림)`);

  if (!WRITE) { console.log("드라이런. 실제 삭제하려면 --write"); process.exit(0); }

  if (session.exists) await session.ref.delete();
  for (const d of att) await d.ref.delete();
  for (const d of mood) await d.ref.delete();
  if (cr.exists) await cr.ref.delete();
  if (reh.exists) await reh.ref.delete();
  console.log("✓ 삭제 완료");
  process.exit(0);
}
main().catch((e) => { console.error("✗ 실패:", e instanceof Error ? e.message : e); process.exit(1); });
