/**
 * STREAMS 동기화 개인전(streams_broadcast) **리허설** 세션을 연다 — 로컬 테스트용 임시 스크립트.
 *
 *   node --env-file=.env.local scripts/open-streams-broadcast-rehearsal.ts [날짜] [교시]
 *
 * 아직 어느 차시에도 이 게임을 꽂지 않았으므로(교사가 나중에 지정), 기능만 걸어 보려고 만든
 * 독립 리허설 세션이다. **rehearsal: true** 라 활동 ID 뒤에 __rehearsal 꼬리표가 붙어(gallery.ts
 * 의 activityIdFor) 실제 학생 데이터와 절대 섞이지 않는다. streamsMatches·streamsBoards 문서도
 * 이 리허설 세션 ID 로만 쓰인다 — 다른 수업에 영향 없음.
 *
 * 세션 문서 ID 는 분반 열쇠를 쓴다(정보과 수업과 안 겹치게). 코드도 예약한다(open-mt3 과 동일).
 *
 * 다 쓰면 지운다:
 *   node --env-file=.env.local scripts/open-streams-broadcast-rehearsal.ts --clear [날짜] [교시]
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
    privateKey: requiredEnv("FIREBASE_PRIVATE_KEY").replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const GROUP_KEY = "mt-tue-1";
const GROUP_LABEL = "화요일 1기";
const CLASS_NO = 1;
const ACTIVITY_ID = "streams-broadcast-rehearsal";

const args = process.argv.slice(2);
const clear = args.includes("--clear");
const positional = args.filter((a) => !a.startsWith("--"));
const DATE = positional[0] ?? "2026-10-15";
const PERIOD = Number(positional[1] ?? 9);
const SESSION_ID = `${DATE}__${PERIOD}__${GROUP_KEY}`;

async function pickCode(): Promise<string> {
  const live = await db.collection("classSessions").where("status", "in", ["scheduled", "active"]).get();
  const taken = new Set(live.docs.map((d) => String((d.data() as { code?: string }).code ?? "")));
  for (let n = 10; n <= 99; n += 1) {
    const code = String(n);
    if (taken.has(code)) continue;
    try {
      await db.collection("codeReservations").doc(`${DATE}__${code}`).create({
        date: DATE,
        code,
        createdAt: Date.now(),
      });
      return code;
    } catch {
      // 이미 예약됨 — 다음 것
    }
  }
  throw new Error("남은 코드가 없습니다. 끝난 수업을 정리해 주세요.");
}

async function clearAll(): Promise<void> {
  // 매치·학생 판·세션을 모두 지운다(리허설 흔적 정리).
  const boards = await db.collection("streamsBoards").where("sessionId", "==", SESSION_ID).get();
  const batch = db.batch();
  for (const d of boards.docs) batch.delete(d.ref);
  batch.delete(db.collection("streamsMatches").doc(SESSION_ID));
  batch.delete(db.collection("classSessions").doc(SESSION_ID));
  await batch.commit();
  console.log(`✓ 지움 — 세션 ${SESSION_ID} · 매치 · 학생 판 ${boards.size}개`);
  process.exit(0);
}

async function main(): Promise<void> {
  if (clear) return clearAll();

  const existing = await db.collection("classSessions").doc(SESSION_ID).get();
  if (existing.exists) {
    const s = existing.data() as { code: string; status: string };
    console.log(`이미 있습니다 — ${SESSION_ID}  코드 ${s.code}  ${s.status}`);
    console.log("지우려면 --clear 를 붙이세요.");
    process.exit(0);
  }

  const code = await pickCode();

  await db.collection("classSessions").doc(SESSION_ID).set({
    id: SESSION_ID,
    lessonPlanId: "",
    lessonNo: 999,
    title: "STREAMS 동기화 개인전 (리허설)",
    classNo: CLASS_NO,
    groupKey: GROUP_KEY,
    groupLabel: GROUP_LABEL,
    date: DATE,
    period: PERIOD,
    code,
    status: "active",
    phase: "worksheet",
    rehearsal: true,
    teacherNote: "",
    startedAt: Date.now(),
    endedAt: null,
    moodCheckEnabled: false,
    freeNavigation: false,
    phaseLabels: { worksheet: "STREAMS 동기화 개인전" },
    focusExempt: [],
    // 대시보드가 정상 세션처럼 읽는 필드(없으면 성찰 통계 등에서 크래시) — 리허설은 성찰 없음.
    reflectionQuestions: [],
    reflectionPublic: false,
    activity: {
      activityId: ACTIVITY_ID,
      heading: "STREAMS 동기화 개인전",
      intro: "선생님이 뽑는 숫자를 모두 같이 받아요. 각자 자기 판에 놓고, 끝나면 등수를 발표해요.",
      places: [],
      galleryEnabled: false,
      galleryAnswerKeys: [],
      worksheet: [
        {
          key: "streams_broadcast",
          label: "STREAMS 동기화 개인전",
          hint: "선생님이 숫자를 뽑으면 빈 칸을 눌러 놓아요. 30초가 지나면 자동으로 놓여요.",
          kind: "streams_broadcast",
          streamsDrawSeconds: 30,
        },
      ],
    },
  });

  const back = (await db.collection("classSessions").doc(SESSION_ID).get()).data() as
    | Record<string, unknown>
    | undefined;
  if (!back?.code) {
    console.error("✗ 문서가 제대로 안 써졌습니다.");
    process.exit(1);
  }
  const act = back.activity as Record<string, unknown>;
  console.log(`✓ 리허설 열림  ${SESSION_ID}`);
  console.log(`  ${DATE} ${PERIOD}교시 · ${GROUP_LABEL} · 리허설(rehearsal: true)`);
  console.log(`  수업 코드  ${back.code}`);
  console.log(`  상태 ${back.status} · 단계 ${back.phase}`);
  console.log(`  서로의 마음 읽기 ${act.galleryEnabled ? "켬" : "끔"} (감정 데이터 없음 — 게임 점수만)`);
  console.log(`  활동 ID (리허설 꼬리표가 붙음)  ${act.activityId}__rehearsal`);
  console.log("  교사 대시보드에서 '숫자 뽑기'·'등수 발표' 를 제어하세요. 끝나면 --clear 로 지우세요.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
