/**
 * 33차 ③ 추상화 입력 보기 이름 바꾸기에 맞춰, 이미 고른 답(mb33_in)을 새 이름으로 옮긴다 (2026-11-27 교사 결정).
 *
 *   node --env-file=.env.local scripts/migrate-mb33-inputs.ts          (몇 명이 바뀌는지만 본다)
 *   node --env-file=.env.local scripts/migrate-mb33-inputs.ts --write  (실제로 옮긴다)
 *
 * mb33_in 한 칸만 바꾼다(보기 이름만 바뀌고 뜻은 같다). 다른 답·상태는 건드리지 않는다.
 * 모르는 값이 있으면 그대로 두고 알린다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { INPUT_CHOICES, INPUT_RENAME } from "./lesson33-steps.ts";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`✗ 환경변수 ${name} 가 없습니다.`);
    process.exit(1);
  }
  return value;
}

initializeApp({
  credential: cert({
    projectId: requiredEnv("FIREBASE_PROJECT_ID"),
    clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
    privateKey: requiredEnv("FIREBASE_PRIVATE_KEY").replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();
const WRITE = process.argv.includes("--write");
const SEP = " · ";

async function main(): Promise<void> {
  const snap = await db.collection("artifacts").where("activityId", ">=", "microbit-makecode").where("activityId", "<=", "microbit-makecode").get();
  let changed = 0;
  let same = 0;
  const unknown = new Map<string, number>();
  for (const doc of snap.docs) {
    const raw = String((doc.data() as { answers?: Record<string, string> }).answers?.mb33_in ?? "");
    if (!raw.trim()) continue;
    const picked = raw.split(SEP).map((v) => v.trim()).filter(Boolean);
    const next = picked.map((v) => INPUT_RENAME[v] ?? v);
    for (const v of next) if (!INPUT_CHOICES.includes(v)) unknown.set(v, (unknown.get(v) ?? 0) + 1);
    // 보기 순서대로, 겹침 없이
    const ordered = INPUT_CHOICES.filter((c) => next.includes(c)).concat(next.filter((v) => !INPUT_CHOICES.includes(v)));
    const out = [...new Set(ordered)].join(SEP);
    if (out === raw) {
      same += 1;
      continue;
    }
    changed += 1;
    if (WRITE) await doc.ref.update({ "answers.mb33_in": out });
  }
  console.log(`답 있는 문서 중 바뀜 ${changed} · 그대로 ${same}${WRITE ? " (썼음)" : " (미리 보기)"}`);
  if (unknown.size > 0) console.log("모르는 값(그대로 둠):", JSON.stringify([...unknown]));
  process.exit(0);
}

void main();
