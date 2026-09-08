/**
 * 「디지털 마음 톡톡」 4회기 노래 링크를 build_url → song_url 로 옮긴다 (일회성).
 *
 *   node --env-file=.env.local scripts/migrate-mt4-song-url.ts          # 미리보기
 *   node --env-file=.env.local scripts/migrate-mt4-song-url.ts --write  # 실제 반영
 *
 * ## 왜 필요한가
 *
 * 4회기(실패를 노래로 자랑하기, activityId `mt-2026-3`)의 노래 링크가 예전엔 진로탐색의
 * build_url(만든 앱 주소) 키를 재사용했다. 그 탓에 교사 대시보드가 마음 톡톡 작품을
 * 「앱 링크 미제출」로 잘못 읽어, 노래 링크를 전용 키 `song_url` 로 분리했다.
 *
 * 개명 뒤에는 이미 4회기를 한 반(화요일 1기 등)의 학생 노래 링크가 옛 키
 * `answers.build_url` 에만 남아 있어 갤러리·카드가 새 키(song_url)에서 못 읽는다.
 * 이 스크립트가 mt-2026-3 작품을 훑어 `answers.build_url` 값이 있고 `answers.song_url` 이
 * 비었으면 song_url 로 복사한다.
 *
 * ## build_url 은 지우지 않고 남긴다
 *
 * 원본 build_url 은 그대로 둔다. 마음 톡톡 작품(activityId = mt-2026-3)은 진로탐색 전용
 * 코드 경로(교사 대시보드 앱 링크 판정·pre-review·assistant tools)를 타지 않는다 —
 * 그 판정은 hai- 차시로 한정돼 있어, build_url 이 남아도 마음 톡톡 신호등에 다시
 * 잘못 뜨지 않는다. 지우기보다 남겨 두는 편이 되돌리기도 쉽다.
 *
 * ## 대상: 실제 + 리허설
 *
 * activityId 가 "mt-2026-3" 인 실제 작품과 "mt-2026-3__rehearsal" 인 리허설 작품을
 * 모두 훑는다(접두어 범위 쿼리). 리허설을 포함해도 진짜 작품과 섞이지 않는다 —
 * 리허설은 activityId 꼬리표(__rehearsal)로 그대로 구분된다.
 *
 * 기본은 미리보기다. 실제로 쓰려면 --write 를 붙인다. 두 번 돌려도 결과는 같다
 * (song_url 이 이미 차 있으면 건너뛴다).
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

/** 4회기 활동 통. 실제("mt-2026-3")와 리허설("mt-2026-3__rehearsal")을 함께 잡는다 */
const ACTIVITY_ID = "mt-2026-3";

const OLD_KEY = "build_url";
const NEW_KEY = "song_url";

const WRITE = process.argv.includes("--write");

async function main(): Promise<void> {
  // 접두어 범위 쿼리 — activityId 가 "mt-2026-3" 로 시작하는 문서를 모두 잡는다.
  // 끝 경계에 유니코드 상 아주 뒤쪽 문자(U+F8FF)를 붙이면 "mt-2026-3"(실제)와
  // "mt-2026-3__rehearsal"(리허설)이 한 범위에 든다. 다른 활동 통은 접두어가 달라 안 걸린다.
  const rangeEnd = ACTIVITY_ID + "";
  const snap = await db
    .collection("artifacts")
    .where("activityId", ">=", ACTIVITY_ID)
    .where("activityId", "<", rangeEnd)
    .get();

  let moved = 0;
  let already = 0;
  let empty = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as { answers?: Record<string, unknown> };
    const answers = data.answers ?? {};
    const oldVal = typeof answers[OLD_KEY] === "string" ? (answers[OLD_KEY] as string).trim() : "";
    const newVal = typeof answers[NEW_KEY] === "string" ? (answers[NEW_KEY] as string).trim() : "";

    if (!oldVal) {
      empty += 1;
      continue; // 옮길 노래 링크가 없다
    }
    if (newVal) {
      already += 1;
      console.log(`· [${doc.id}] song_url 이 이미 있어 건너뜁니다.`);
      continue;
    }

    moved += 1;
    if (!WRITE) {
      console.log(`(미리보기) [${doc.id}] build_url → song_url 로 복사: ${oldVal}`);
      continue;
    }

    // build_url 은 남겨 두고 song_url 만 얹는다 (merge 로 다른 답은 그대로).
    await doc.ref.set({ answers: { [NEW_KEY]: oldVal } }, { merge: true });
    console.log(`✓ [${doc.id}] song_url 채움: ${oldVal}`);
  }

  console.log(
    `\n대상 작품 ${snap.size}개 — 옮김 ${moved} · 이미 있음 ${already} · 노래 링크 없음 ${empty}`,
  );
  if (!WRITE) console.log("미리보기였습니다. 실제로 쓰려면 --write 를 붙이세요.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
