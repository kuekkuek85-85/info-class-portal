/**
 * 7차시에도 게임 링크를 넣는다.
 *
 *   node --env-file=.env.local scripts/backfill-lesson7-games.ts [--write]
 *
 * ## 왜 스크립트인가
 *
 * 7차시와 8차시는 같은 활동이다 — 활동 통도(career-plan) 문항도 같고, 다른 것은
 * 진도뿐이다. 게임은 8차시에만 넣었는데, 그러면 아직 7차시를 하는 반에서 통과한
 * 학생만 빈 화면을 본다. 같은 것을 해낸 학생이 반에 따라 다른 대접을 받는다.
 *
 * 계획(lessonPlans)만 고치면 **이미 만들어진 수업에는 안 들어간다.** 세션은 만들 때
 * 계획을 통째로 복사해 두기 때문이다 (PRD 5.1 — 수업 중에 계획을 고쳐도 그날 화면이
 * 안 바뀌게 하려고 일부러 그렇게 했다). 그래서 아직 안 끝난 7차시 수업에도 직접 넣는다.
 *
 * 기본은 미리보기다. 실제로 쓰려면 --write 를 붙인다.
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

/** 8차시와 같은 것 (seed-lesson8.ts 의 doneLinks) */
const GAMES = [
  { label: "하노이탑", url: "https://hanoi-tower-game-rosy.vercel.app/" },
  { label: "2048", url: "https://2048-game-gilt-kappa.vercel.app/" },
  { label: "똥 피하기", url: "https://dodge-poop-game.vercel.app/" },
];

const WRITE = process.argv.includes("--write");

interface Q {
  key: string;
  kind?: string;
  doneLinks?: unknown[];
}

/** 제출 칸에 게임 링크를 얹은 문항 목록. 이미 있으면 null (건드릴 것이 없다) */
function withGames(worksheet: Q[]): Q[] | null {
  const submit = worksheet.find((q) => q.kind === "submit");
  if (!submit) return null;
  if ((submit.doneLinks?.length ?? 0) > 0) return null;
  return worksheet.map((q) => (q.kind === "submit" ? { ...q, doneLinks: GAMES } : q));
}

async function main(): Promise<void> {
  // 1) 계획 — 앞으로 만들 7차시 수업이 이것을 복사해 간다
  const plans = await db.collection("lessonPlans").where("lessonNo", "==", 7).get();
  for (const doc of plans.docs) {
    const p = doc.data() as { title?: string; activity?: { worksheet?: Q[] } };
    const next = withGames(p.activity?.worksheet ?? []);
    if (!next) {
      console.log(`· 계획 「${p.title}」 — 이미 있습니다`);
      continue;
    }
    console.log(`${WRITE ? "✓" : "(미리보기)"} 계획 「${p.title}」 — 게임 ${GAMES.length}개`);
    if (WRITE) await doc.ref.set({ activity: { ...p.activity, worksheet: next } }, { merge: true });
  }

  // 2) 아직 안 끝난 7차시 수업 — 세션은 계획의 사본이라 따로 넣어야 한다
  const sessions = await db
    .collection("classSessions")
    .where("lessonNo", "==", 7)
    .where("status", "in", ["scheduled", "active"])
    .get();
  for (const doc of sessions.docs) {
    const s = doc.data() as {
      period?: number;
      classNo?: number;
      activity?: { worksheet?: Q[] };
    };
    const next = withGames(s.activity?.worksheet ?? []);
    const who = `${s.period}교시 ${s.classNo}반`;
    if (!next) {
      console.log(`· 수업 ${who} — 이미 있습니다`);
      continue;
    }
    console.log(`${WRITE ? "✓" : "(미리보기)"} 수업 ${who} (${doc.id})`);
    if (WRITE) await doc.ref.set({ activity: { ...s.activity, worksheet: next } }, { merge: true });
  }

  if (!WRITE) console.log("\n미리보기였습니다. 실제로 쓰려면 --write 를 붙이세요.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
