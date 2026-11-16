/**
 * 화2기 105차 세션에 '앱 링크 제출 모달' 대상 학번을 세팅한다.
 *
 *   node --env-file=.env.local scripts/set-link-prompt-tue2.ts
 *   node --env-file=.env.local scripts/set-link-prompt-tue2.ts 2026-11-17 1
 *
 * 세션 `${날짜}__${교시}__hai-tue-2` 가 **이미 있을 때만** linkPromptStudentIds 를 merge 한다.
 * 세션이 아직 없으면 **아무것도 만들지 않는다** — 반쪽짜리 세션 문서가 남으면 안 된다.
 * 세션을 처음 열 때는 open-hai5-tue2.ts 가 같은 학번을 이미 심어 두므로, 이 세터는 "이미
 * 열어 둔 세션에 뒤늦게 대상만 바꾸고 싶을 때" 쓰는 보조 도구다. 읽고 다시 읽어 확인한다.
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

const GROUP_KEY = "hai-tue-2";
const DATE = process.argv[2] ?? "2026-11-17";
const PERIOD = Number(process.argv[3] ?? 1);
const ID = `${DATE}__${PERIOD}__${GROUP_KEY}`;

/** 지난 차시 링크 미제출(권지용·박동은·이준용)·죽은 링크(정아윤) 4명 */
const LINK_PROMPT_STUDENT_IDS = ["10603", "10711", "10720", "10622"];

async function main(): Promise<void> {
  const ref = db.collection("classSessions").doc(ID);
  const snap = await ref.get();

  if (!snap.exists) {
    console.log(`· 세션 ${ID} 가 아직 없습니다 — 아무것도 쓰지 않습니다.`);
    console.log("  세션을 열면 open-hai5-tue2.ts 가 같은 4명을 자동으로 심습니다.");
    console.log(`  대상(참고): ${JSON.stringify(LINK_PROMPT_STUDENT_IDS)}`);
    process.exit(0);
  }

  await ref.set({ linkPromptStudentIds: LINK_PROMPT_STUDENT_IDS }, { merge: true });

  const back = (await ref.get()).data() as { linkPromptStudentIds?: string[]; status?: string };
  console.log(`✓ ${ID} 에 세팅했습니다 (status=${back?.status})`);
  console.log(`  linkPromptStudentIds = ${JSON.stringify(back?.linkPromptStudentIds ?? [])}`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
