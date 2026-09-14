/**
 * 열려 있는 **리허설 수업**을 한 번에 지운다.
 *
 *   node --env-file=.env.local scripts/clear-rehearsals.ts          # 미리보기 (안 지움)
 *   node --env-file=.env.local scripts/clear-rehearsals.ts --write  # 실제 삭제
 *
 * ## 무엇을 지우나
 *
 * `classSessions` 중 **rehearsal === true** 인 문서만 지운다. 리허설은 시연·혼자 걸어보기용이라
 * 진짜 학생 기록이 아니고(만들 때 반드시 rehearsal 로 강제된다 — sessions/route.ts), 그날이
 * 지나면 자동으로 닫히지만(db.ts 의 isSessionClosed), 코드를 붙잡고 목록에 남는다. 이 스크립트는
 * 그것들을 **명시적으로 제거**한다.
 *
 * 함께 정리하는 것:
 *  · 그 리허설이 잡고 있던 코드 예약(codeReservations/`날짜__코드`) — 코드를 바로 풀어 준다.
 *
 * 손대지 않는 것:
 *  · 진짜 수업(rehearsal 아님)은 절대 건드리지 않는다.
 *  · 리허설 중 테스트 계정(각 반 30번)이 남긴 출석·작품 등은 그대로 둔다 — 무해하고, 다음
 *    리허설에서 덮인다. (세션만 지워도 목록·코드는 깨끗해진다.)
 *
 * 기본은 미리보기다. --write 를 붙여야 실제로 지운다. 여러 번 돌려도 안전하다(이미 지운 것은 없음).
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
    privateKey: requiredEnv("FIREBASE_PRIVATE_KEY")
      .replace(/^["']|["']$/g, "")
      .replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const WRITE = process.argv.includes("--write");

interface SessionDoc {
  rehearsal?: boolean;
  date?: string;
  period?: number;
  classNo?: number;
  lessonNo?: number;
  code?: string;
  status?: string;
}

async function main(): Promise<void> {
  const snap = await db.collection("classSessions").where("rehearsal", "==", true).get();

  if (snap.empty) {
    console.log("리허설 수업이 없습니다 — 지울 것이 없어요.");
    process.exit(0);
  }

  console.log(`리허설 수업 ${snap.size}개를 찾았습니다:\n`);
  for (const doc of snap.docs) {
    const s = doc.data() as SessionDoc;
    console.log(
      `  · ${doc.id}  (${s.date} ${s.period}교시 · ${s.lessonNo ?? "?"}차시 · 코드 ${s.code ?? "?"} · ${s.status ?? "?"})`,
    );
  }
  console.log("");

  if (!WRITE) {
    console.log("미리보기였습니다 — 실제로 지우려면 --write 를 붙이세요.");
    console.log("  node --env-file=.env.local scripts/clear-rehearsals.ts --write");
    process.exit(0);
  }

  let sessions = 0;
  let codes = 0;
  for (const doc of snap.docs) {
    const s = doc.data() as SessionDoc;
    // 안전장치: rehearsal 이 아닌 것은 절대 지우지 않는다 (쿼리로 걸렀지만 한 번 더 확인)
    if (s.rehearsal !== true) continue;

    // 코드 예약 먼저 푼다 (있으면)
    if (s.date && s.code) {
      const resRef = db.collection("codeReservations").doc(`${s.date}__${s.code}`);
      const res = await resRef.get();
      if (res.exists) {
        await resRef.delete();
        codes += 1;
      }
    }

    await doc.ref.delete();
    sessions += 1;
  }

  console.log(`✓ 삭제 완료 — 리허설 세션 ${sessions}개, 코드 예약 ${codes}개 정리.`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
