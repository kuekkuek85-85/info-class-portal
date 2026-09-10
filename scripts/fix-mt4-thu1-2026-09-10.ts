/**
 * 9/10 7교시 「디지털 마음 톡톡」 4회기를 **목요일 1기로 잘못 연 것 복원** (일회성).
 *
 *   node --env-file=.env.local scripts/fix-mt4-thu1-2026-09-10.ts          # 미리보기
 *   node --env-file=.env.local scripts/fix-mt4-thu1-2026-09-10.ts --write  # 실제 반영
 *
 * ## 무엇이 잘못됐나
 *
 * 목요일 1기(mt-thu-1, 데이터 통 classNo 2)로 열었어야 할 세션을 화요일 2기
 * (mt-tue-2, classNo 3)로 열었다. 그래서 이 세션에 딸린 출석·기분·성찰·작품이 전부
 * classNo 3 으로 들어갔고, 교사 대시보드는 세션의 분반(mt-tue-2)으로 명단을 이어
 * 목요일 학생을 못 찾아 **전원 임시**로 표시한다.
 *
 * ## 어떻게 복원하나 (세션은 그대로 두고 값만 고친다 — 가장 안전)
 *
 * 세션 문서를 지우거나 옮기지 않는다. 출석·기분·성찰은 `세션ID__학번` 으로 묶여 있어,
 * 세션ID 를 그대로 두면 재키잉(문서 이동) 없이 classNo 값만 바꾸면 된다. 작품은
 * 활동(activityId)에 학번으로 묶여 있어, 이 수업에 **출석한 학생**의 작품만 골라 classNo 를
 * 고친다(무관한 데이터는 건드리지 않는다).
 *
 *   1) 세션 문서: groupKey mt-tue-2 → mt-thu-1, groupLabel → "목요일 1기", classNo 3 → 2
 *   2) attendance / moodEntries / reflections (이 세션ID): classNo 3 → 2
 *   3) artifacts (이 세션의 activityId × 출석 학생): classNo 3 → 2
 *
 * 세션 문서 ID 문자열에는 여전히 "mt-tue-2" 가 남지만, 앱은 문서의 groupKey **필드**로
 * 판정하므로 동작에는 영향이 없다(대시보드·갤러리·명단 모두 필드를 읽는다).
 *
 * ## 이 스크립트가 안 하는 것
 *
 * - **명렬표(enrollments)** 는 손대지 않는다. 이름이 뜨려면 목요일 1기 명단이 있어야 하니,
 *   이 스크립트와 별개로 `seed-mt-roster-thu1.ts` 를 한 번 돌려 두어라(멱등).
 * - 캔바 초대 링크는 이미 지나간 것이라 그대로 둔다(수업이 끝났고, 다시 눌릴 일이 없다).
 *
 * 기본은 미리보기다. --write 를 붙여야 실제로 쓴다. 두 번 돌려도 결과는 같다(멱등 —
 * 이미 classNo 2 인 문서·이미 mt-thu-1 인 세션은 건너뛴다).
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

/** 잘못 연 세션 ID = `날짜__교시__분반열쇠` (db.ts 의 sessionDocId 규칙) */
const WRONG_SESSION_ID = "2026-09-10__7__mt-tue-2";

/** 바로잡을 목요일 1기 값 (open-mt4.ts 의 GROUPS 와 동일) */
const CORRECT = { groupKey: "mt-thu-1", groupLabel: "목요일 1기", classNo: 2 } as const;
const WRONG_CLASS_NO = 3; // mt-tue-2 의 데이터 통

const WRITE = process.argv.includes("--write");

/** sessionId 로 묶인 컬렉션의 classNo 를 3 → 2 로 바꾼다 */
async function fixBySession(collection: string): Promise<{ scanned: number; fixed: number }> {
  const snap = await db.collection(collection).where("sessionId", "==", WRONG_SESSION_ID).get();
  let fixed = 0;
  for (const doc of snap.docs) {
    const cur = (doc.data() as { classNo?: number }).classNo;
    if (cur === CORRECT.classNo) continue; // 이미 맞음
    fixed += 1;
    if (WRITE) await doc.ref.set({ classNo: CORRECT.classNo }, { merge: true });
  }
  return { scanned: snap.size, fixed };
}

async function main(): Promise<void> {
  // ── 0) 세션 확인 ─────────────────────────────────────────────
  const sessionRef = db.collection("classSessions").doc(WRONG_SESSION_ID);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    console.error(`✗ 세션 ${WRONG_SESSION_ID} 이 없습니다. 세션 ID(날짜·교시·분반)를 확인하세요.`);
    process.exit(1);
  }
  const session = sessionSnap.data() as {
    groupKey?: string;
    classNo?: number;
    activity?: { activityId?: string };
  };
  const activityId = session.activity?.activityId ?? "";
  console.log(`세션: ${WRONG_SESSION_ID}`);
  console.log(`  현재 groupKey=${session.groupKey} · classNo=${session.classNo} · activityId=${activityId}`);

  // 안전장치: 정말 mt-tue-2 로 잘못 열린 세션인지 확인한다.
  if (session.groupKey && session.groupKey !== "mt-tue-2" && session.groupKey !== CORRECT.groupKey) {
    console.error(
      `✗ 이 세션의 분반이 mt-tue-2 도, mt-thu-1 도 아닙니다(${session.groupKey}). ` +
        `엉뚱한 세션을 고치지 않도록 멈춥니다. WRONG_SESSION_ID 를 확인하세요.`,
    );
    process.exit(1);
  }
  if (!activityId) {
    console.error("✗ 세션에 activityId 가 없습니다. 작품 classNo 를 고칠 수 없어 멈춥니다.");
    process.exit(1);
  }

  // ── 1) 세션 문서 필드 바로잡기 ──────────────────────────────
  const sessionNeedsFix =
    session.groupKey !== CORRECT.groupKey || session.classNo !== CORRECT.classNo;
  if (sessionNeedsFix) {
    console.log(
      `\n[세션] groupKey→${CORRECT.groupKey} · groupLabel→"${CORRECT.groupLabel}" · classNo→${CORRECT.classNo}`,
    );
    if (WRITE) {
      await sessionRef.set(
        {
          groupKey: CORRECT.groupKey,
          groupLabel: CORRECT.groupLabel,
          classNo: CORRECT.classNo,
        },
        { merge: true },
      );
    }
  } else {
    console.log("\n[세션] 이미 목요일 1기(classNo 2) — 건너뜁니다.");
  }

  // ── 2) 출석·기분·성찰 classNo 바로잡기 ──────────────────────
  const att = await fixBySession("attendance");
  const mood = await fixBySession("moodEntries");
  const refl = await fixBySession("reflections");
  console.log(
    `\n[출석] ${att.scanned}건 중 ${att.fixed}건 classNo→2` +
      ` · [기분] ${mood.scanned}건 중 ${mood.fixed}` +
      ` · [성찰] ${refl.scanned}건 중 ${refl.fixed}`,
  );

  // ── 3) 작품 classNo 바로잡기 (출석 학생 것만) ────────────────
  const attSnap = await db.collection("attendance").where("sessionId", "==", WRONG_SESSION_ID).get();
  const studentIds = attSnap.docs.map((d) => (d.data() as { studentId: string }).studentId);
  let artFixed = 0;
  let artMissing = 0;
  for (const studentId of studentIds) {
    const ref = db.collection("artifacts").doc(`${activityId}__${studentId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      artMissing += 1;
      continue; // 이 학생은 작품(노래·논술)을 안 냈다
    }
    const cur = (snap.data() as { classNo?: number }).classNo;
    if (cur === CORRECT.classNo) continue; // 이미 맞음
    artFixed += 1;
    if (WRITE) await ref.set({ classNo: CORRECT.classNo }, { merge: true });
  }
  console.log(
    `[작품] 출석 ${studentIds.length}명 — classNo→2 ${artFixed}건` +
      ` · 작품 없음 ${artMissing}명`,
  );

  // ── 마무리 ──────────────────────────────────────────────────
  console.log(
    `\n${WRITE ? "✓ 반영 완료" : "미리보기였습니다 — 실제로 쓰려면 --write 를 붙이세요"}.`,
  );
  console.log(
    "※ 이름이 뜨려면 목요일 1기 명단이 있어야 합니다 — 아직이면 " +
      "`node --env-file=.env.local scripts/seed-mt-roster-thu1.ts` 도 한 번 돌려 주세요(멱등).",
  );
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
