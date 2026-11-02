/**
 * 리허설로 저장돼 버린 마음 톡톡 7회기(화요일 1기, 2026-09-29)를 **실제 지난 수업으로 복원**한다.
 *
 *   node --env-file=.env.local scripts/restore-mt7-tue1.ts            (드라이런 — 백업만, 변경 안 함)
 *   node --env-file=.env.local scripts/restore-mt7-tue1.ts --write    (실제 복원)
 *
 * ## 무슨 일이 있었나
 * 7회기(그림게임 링크 차단)를 2026-09-29 에 리허설 모드로 열어 진행 → 학생 실작업이 전부
 * activityId `mt-2026-7__rehearsal` 로 저장되고(activityIdFor 가 rehearsal 이면 꼬리표를 붙임),
 * 세션 문서(2026-09-29__9__mt-tue-1)는 clear-rehearsals 로 지워져 대시보드·포트폴리오에서 안 보인다.
 *
 * ## 복원 (6·7교시 = period 7 관례에 맞춤)
 * 1) 세션 문서 2026-09-29__7__mt-tue-1 생성(ended, rehearsal:false) — 계획 mt-2026-7 에서 내용 복사.
 * 2) 아티팩트 mt-2026-7__rehearsal__<학번> → mt-2026-7__<학번> (activityId 필드도 mt-2026-7).
 * 3) reflection sessionId 2026-09-29__9__mt-tue-1 → 2026-09-29__7__mt-tue-1 (활동 __rehearsal 도 정리).
 * 4) moodEntries·attendance 의 2026-09-29__9__mt-tue-1 참조분 → __7__ 로 이전.
 *
 * 멱등: 이미 옮긴 것은 건너뛴다. 드라이런은 백업 파일만 쓰고 아무것도 바꾸지 않는다.
 */
import { writeFileSync } from "node:fs";

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import type { LessonPlan, WorksheetQuestion } from "../src/lib/types.ts";

function req(n: string): string { const v = process.env[n]; if (!v) { console.error(`missing ${n}`); process.exit(1); } return v; }
const app = initializeApp({ credential: cert({ projectId: req("FIREBASE_PROJECT_ID"), clientEmail: req("FIREBASE_CLIENT_EMAIL"), privateKey: req("FIREBASE_PRIVATE_KEY").replace(/^["']|["']$/g, "").replace(/\\n/g, "\n") }) });
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const WRITE = process.argv.includes("--write");
const BACKUP = process.argv.find((a) => a.startsWith("--backup="))?.split("=")[1]
  ?? "C:/Users/kuekk/AppData/Local/Temp/claude/C--claude-code-project---------/71fc48ef-a0ab-4f5f-b7d5-c17af23e2a86/scratchpad/mt7-backup.json";

const GROUP_KEY = "mt-tue-1";
const OLD_ACT = "mt-2026-7__rehearsal";
const NEW_ACT = "mt-2026-7";
const OLD_SESSION = "2026-09-29__9__mt-tue-1";
const NEW_SESSION = "2026-09-29__7__mt-tue-1";
const DATE = "2026-09-29";
const PERIOD = 7;
const CODE = "10";
// 09-29 14:00 / 15:30 KST (UTC 기준 -9h)
const STARTED = Date.UTC(2026, 8, 29, 5, 0, 0);
const ENDED = Date.UTC(2026, 8, 29, 6, 30, 0);

function planContent(plan: LessonPlan, kept: WorksheetQuestion[]): Record<string, unknown> {
  return {
    lessonNo: plan.lessonNo,
    title: plan.title,
    moodCheckEnabled: plan.moodCheckEnabled,
    game: plan.game,
    gameExplainer: plan.gameExplainer,
    progress: plan.progress,
    assessment: plan.assessment,
    video: plan.video,
    videoPrompts: plan.videoPrompts ?? [],
    reflectionQuestions: plan.reflectionQuestions,
    reflectionPublic: plan.reflectionPublic,
    quiz: plan.quiz,
    phaseOrder: plan.phaseOrder ?? [],
    phaseLabels: plan.phaseLabels ?? {},
    focusExempt: plan.focusExempt ?? [],
    progressChecks: plan.progressChecks,
    freeNavigation: plan.freeNavigation ?? false,
    activity: { ...plan.activity, worksheet: kept },
  };
}

async function main() {
  console.log(WRITE ? "=== 복원 실행(--write) ===" : "=== 드라이런(백업만, 변경 없음) ===");

  // ── 계획 ──
  const lp = await db.collection("lessonPlans").where("lessonNo", "==", 207).get();
  const planDoc = lp.docs.find((d) => (d.data() as LessonPlan).activity?.activityId === NEW_ACT);
  if (!planDoc) { console.error("✗ 7회기 계획(mt-2026-7) 없음"); process.exit(1); }
  const plan = planDoc.data() as LessonPlan;
  const kept: WorksheetQuestion[] = (plan.activity?.worksheet ?? []).map((q) => {
    const next = { ...q } as WorksheetQuestion;
    if (next.linkUrlByGroup) { const picked = next.linkUrlByGroup[GROUP_KEY] ?? next.linkUrl; delete next.linkUrlByGroup; if (picked) next.linkUrl = picked; }
    return next;
  });

  // ── 영향받는 문서 수집 ──
  const arts = await db.collection("artifacts").where("activityId", "==", OLD_ACT).get();
  const allRefl = await db.collection("reflections").get();
  const refls = allRefl.docs.filter((d) => String((d.data() as Record<string, unknown>).sessionId ?? "") === OLD_SESSION
    || String((d.data() as Record<string, unknown>).activityId ?? "") === OLD_ACT);
  const allMood = await db.collection("moodEntries").get();
  const moods = allMood.docs.filter((d) => String((d.data() as Record<string, unknown>).sessionId ?? "") === OLD_SESSION);
  const allAtt = await db.collection("attendance").get();
  const atts = allAtt.docs.filter((d) => d.id.startsWith(`${OLD_SESSION}__`) || String((d.data() as Record<string, unknown>).sessionId ?? "") === OLD_SESSION);

  console.log(`수집: artifacts ${arts.size} · reflections ${refls.length} · moodEntries ${moods.length} · attendance ${atts.length}`);

  // ── 백업 (항상) ──
  const backup = {
    at: new Date().toISOString(),
    plan: { id: planDoc.id, data: plan },
    existingNewSession: (await db.collection("classSessions").doc(NEW_SESSION).get()).data() ?? null,
    artifacts: arts.docs.map((d) => ({ id: d.id, data: d.data() })),
    reflections: refls.map((d) => ({ id: d.id, data: d.data() })),
    moodEntries: moods.map((d) => ({ id: d.id, data: d.data() })),
    attendance: atts.map((d) => ({ id: d.id, data: d.data() })),
  };
  writeFileSync(BACKUP, JSON.stringify(backup, null, 2), "utf8");
  console.log(`백업 저장: ${BACKUP}`);

  // ── 계획안 (드라이런이면 여기까지 출력) ──
  console.log(`\n[1] 세션 생성: ${NEW_SESSION} (ended, rehearsal:false, code ${CODE}, ${DATE} period ${PERIOD})`);
  console.log(`[2] 아티팩트 이전: ${arts.size}개  ${OLD_ACT}__<학번> → ${NEW_ACT}__<학번> (activityId=${NEW_ACT})`);
  console.log(`[3] reflection sessionId ${OLD_SESSION} → ${NEW_SESSION}: ${refls.length}개`);
  console.log(`[4] moodEntries sessionId → ${NEW_SESSION}: ${moods.length}개`);
  console.log(`[5] attendance ${OLD_SESSION}__ → ${NEW_SESSION}__: ${atts.length}개`);

  if (!WRITE) { console.log("\n드라이런 종료. 실제 복원하려면 --write 를 붙이세요."); process.exit(0); }

  // ── [1] 세션 ──
  await db.collection("classSessions").doc(NEW_SESSION).set({
    lessonPlanId: planDoc.id,
    classNo: 1, groupKey: GROUP_KEY, groupLabel: "화요일 1기",
    date: DATE, period: PERIOD, code: CODE,
    ...planContent(plan, kept),
    status: "ended", phase: "done", rehearsal: false, demo: false,
    teacherNote: "리허설로 저장됐던 7회기를 실제 수업으로 복원(2026-09-29).",
    startedAt: STARTED, endedAt: ENDED, createdAt: STARTED,
  }, { merge: true });
  console.log("✓ 세션 생성");

  // ── [2] 아티팩트 이전 (create new + delete old) ──
  let moved = 0;
  for (const d of arts.docs) {
    const sid = String((d.data() as Record<string, unknown>).studentId ?? "");
    if (!sid) continue;
    const newId = `${NEW_ACT}__${sid}`;
    const newRef = db.collection("artifacts").doc(newId);
    if (!(await newRef.get()).exists) {
      await newRef.set({ ...d.data(), activityId: NEW_ACT });
      await d.ref.delete();
      moved += 1;
    }
  }
  console.log(`✓ 아티팩트 이전 ${moved}개`);

  // ── [3] reflection ──
  let rMoved = 0;
  for (const d of refls) {
    const patch: Record<string, unknown> = {};
    if (String((d.data() as Record<string, unknown>).sessionId ?? "") === OLD_SESSION) patch.sessionId = NEW_SESSION;
    if (String((d.data() as Record<string, unknown>).activityId ?? "") === OLD_ACT) patch.activityId = NEW_ACT;
    if (Object.keys(patch).length) { await d.ref.set(patch, { merge: true }); rMoved += 1; }
  }
  console.log(`✓ reflection 이전 ${rMoved}개`);

  // ── [4] moodEntries ──
  let mMoved = 0;
  for (const d of moods) { await d.ref.set({ sessionId: NEW_SESSION }, { merge: true }); mMoved += 1; }
  console.log(`✓ moodEntries 이전 ${mMoved}개`);

  // ── [5] attendance (id 에 sessionId 포함 → 새 id 로 복제 후 삭제) ──
  let aMoved = 0;
  for (const d of atts) {
    const data = d.data() as Record<string, unknown>;
    const sid = String(data.studentId ?? d.id.split("__").pop() ?? "");
    const newId = `${NEW_SESSION}__${sid}`;
    const newRef = db.collection("attendance").doc(newId);
    if (!(await newRef.get()).exists) {
      await newRef.set({ ...data, sessionId: NEW_SESSION });
      if (d.id !== newId) await d.ref.delete();
      aMoved += 1;
    }
  }
  console.log(`✓ attendance 이전 ${aMoved}개`);

  console.log("\n복원 완료.");
  process.exit(0);
}
main().catch((e) => { console.error("✗ 실패:", e instanceof Error ? e.message : e); process.exit(1); });
