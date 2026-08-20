import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const TODAY = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const plan = (await db.collection("lessonPlans").where("lessonNo", "==", 4).get()).docs[0];
const p = plan.data() as Record<string, never>;

await db.collection("codeReservations").doc(`${TODAY}__11`).set({ date: TODAY, code: "11", createdAt: Date.now() });
await db.collection("classSessions").doc(`${TODAY}__8__4`).set({
  lessonPlanId: plan.id, classNo: 4, date: TODAY, period: 8, code: "11",
  ...p,
  status: "active", phase: "gallery", rehearsal: true, demo: false,
  freeNavigation: false, teacherNote: "", startedAt: Date.now(), endedAt: null, createdAt: Date.now(),
});

const ACT = "future-job__rehearsal";
const now = Date.now();
const ROWS: [string, string, string, string[], string[]][] = [
  ["10491", "데이터 분석가", "교사", ["번역가", "캐셔"], ["AI 전문가", "유튜버"]],
  ["10492", "교사", "의사", ["번역가", "은행원"], ["AI 전문가", "로봇 정비사"]],
  ["10493", "디자이너", "가수", ["캐셔", "텔레마케터"], ["유튜버", "환경 전문가"]],
];
for (const [id, ai, my, vanish, rise] of ROWS) {
  const answers: Record<string, string> = { ai_job: ai, my_job: my };
  vanish.forEach((v, i) => (answers[`vanish${i + 1}_job`] = v));
  rise.forEach((v, i) => (answers[`rise${i + 1}_job`] = v));
  await db.collection("artifacts").doc(`${ACT}__${id}`).set({
    activityId: ACT, studentId: id, classNo: 4, place: "", year: 2040,
    strokes: [], texts: [], answers, traits: [],
    sources: { site: "", ai: "" }, status: "draft", hidden: false,
    saveRev: 0, createdAt: now, updatedAt: now,
  });
}
console.log("코드 11 · 8교시 4반 리허설 (4차시 / 활동지 감상) · 학생 3명분");
process.exit(0);
