import "server-only";

import { FieldPath, type Query } from "firebase-admin/firestore";

import { db } from "./firebase-admin";
import { todayKST } from "./datetime";
import type {
  Attendance,
  ClassNo,
  ClassSession,
  LessonPlan,
  MoodEntry,
  Reflection,
  SessionStatus,
  Student,
} from "./types";

/**
 * Firestore 접근 레이어.
 *
 * 정렬은 대부분 메모리에서 한다. 한 반 28명 × 한 학기 규모라 복합 인덱스를 만들어 두는
 * 운영 부담보다 낫고, equality 필터만 쓰면 Firestore 자동 인덱스로 충분하다.
 */

export const COLLECTIONS = {
  students: "students",
  lessonPlans: "lessonPlans",
  classSessions: "classSessions",
  attendance: "attendance",
  moodEntries: "moodEntries",
  reflections: "reflections",
  meta: "meta",
} as const;

const PURGE_LOG_DOC = "purgeLog";

/** 세션 × 학생 조합당 문서 하나. 중복 기록을 구조적으로 막는다. */
export function entryId(sessionId: string, studentId: string): string {
  return `${sessionId}__${studentId}`;
}

function withId<T>(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): T {
  return { id: doc.id, ...doc.data() } as T;
}

async function collectAll<T>(query: Query): Promise<T[]> {
  const snap = await query.get();
  return snap.docs.map((doc) => withId<T>(doc));
}

// ------------------------------------------------------------------- 학생

export async function getStudent(studentId: string): Promise<Student | null> {
  const doc = await db().collection(COLLECTIONS.students).doc(studentId).get();
  return doc.exists ? withId<Student>(doc) : null;
}

export async function listStudents(classNo?: ClassNo): Promise<Student[]> {
  const base = db().collection(COLLECTIONS.students);
  const query = classNo ? base.where("classNo", "==", classNo) : base;
  const students = await collectAll<Student>(query);
  return students.sort((a, b) => a.studentId.localeCompare(b.studentId));
}

/** 학번 → 이름 조회용 맵. 활동 기록에 이름을 조인할 때 쓴다. */
export async function studentNameMap(studentIds: string[]): Promise<Map<string, Student>> {
  const unique = [...new Set(studentIds)].filter(Boolean);
  const map = new Map<string, Student>();
  if (unique.length === 0) return map;

  // Firestore `in` 쿼리는 한 번에 30개까지만 받는다.
  for (let i = 0; i < unique.length; i += 30) {
    const chunk = unique.slice(i, i + 30);
    const snap = await db()
      .collection(COLLECTIONS.students)
      .where(FieldPath.documentId(), "in", chunk)
      .get();
    for (const doc of snap.docs) map.set(doc.id, withId<Student>(doc));
  }
  return map;
}

export async function upsertStudents(students: Omit<Student, "createdAt">[]): Promise<number> {
  const now = Date.now();
  let written = 0;

  // 배치는 500개 제한. 112명이면 한 배치지만 안전하게 나눠 쓴다.
  for (let i = 0; i < students.length; i += 400) {
    const batch = db().batch();
    for (const student of students.slice(i, i + 400)) {
      const ref = db().collection(COLLECTIONS.students).doc(student.studentId);
      batch.set(ref, { ...student, createdAt: now }, { merge: true });
      written += 1;
    }
    await batch.commit();
  }
  return written;
}

export async function deleteStudent(studentId: string): Promise<void> {
  await db().collection(COLLECTIONS.students).doc(studentId).delete();
}

/** 임시 번호로 진입한 학생을 실제 학번에 연결한다 (PRD 3.1 전입·오류 대응) */
export async function linkTemporaryStudent(
  temporaryId: string,
  realStudentId: string,
): Promise<void> {
  await db()
    .collection(COLLECTIONS.students)
    .doc(temporaryId)
    .set({ linkedStudentId: realStudentId }, { merge: true });
}

// --------------------------------------------------------------- 차시 계획

export async function listLessonPlans(): Promise<LessonPlan[]> {
  const plans = await collectAll<LessonPlan>(db().collection(COLLECTIONS.lessonPlans));
  return plans.sort((a, b) => a.lessonNo - b.lessonNo);
}

export async function getLessonPlan(id: string): Promise<LessonPlan | null> {
  const doc = await db().collection(COLLECTIONS.lessonPlans).doc(id).get();
  return doc.exists ? withId<LessonPlan>(doc) : null;
}

export async function createLessonPlan(
  input: Omit<LessonPlan, "id" | "createdAt" | "updatedAt">,
): Promise<LessonPlan> {
  const now = Date.now();
  const ref = await db()
    .collection(COLLECTIONS.lessonPlans)
    .add({ ...input, createdAt: now, updatedAt: now });
  return { id: ref.id, ...input, createdAt: now, updatedAt: now };
}

export async function updateLessonPlan(
  id: string,
  patch: Partial<Omit<LessonPlan, "id" | "createdAt">>,
): Promise<void> {
  await db()
    .collection(COLLECTIONS.lessonPlans)
    .doc(id)
    .set({ ...patch, updatedAt: Date.now() }, { merge: true });
}

export async function deleteLessonPlan(id: string): Promise<void> {
  await db().collection(COLLECTIONS.lessonPlans).doc(id).delete();
}

// ------------------------------------------------------------------- 세션

export async function getSession(id: string): Promise<ClassSession | null> {
  const doc = await db().collection(COLLECTIONS.classSessions).doc(id).get();
  return doc.exists ? withId<ClassSession>(doc) : null;
}

export async function listSessionsByDate(date: string): Promise<ClassSession[]> {
  const sessions = await collectAll<ClassSession>(
    db().collection(COLLECTIONS.classSessions).where("date", "==", date),
  );
  return sessions.sort((a, b) => a.period - b.period || a.classNo - b.classNo);
}

export async function listSessionsByClass(classNo: ClassNo): Promise<ClassSession[]> {
  const sessions = await collectAll<ClassSession>(
    db().collection(COLLECTIONS.classSessions).where("classNo", "==", classNo),
  );
  return sessions.sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period);
}

export async function listAllSessions(): Promise<ClassSession[]> {
  const sessions = await collectAll<ClassSession>(db().collection(COLLECTIONS.classSessions));
  return sessions.sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period);
}

/**
 * 수업 코드로 오늘 세션을 찾는다.
 *
 * 코드는 (날짜, 교시, 반)에 묶이므로 날짜까지 함께 조건에 넣는다. 어제 코드로는 들어올 수 없다.
 * 종료된 세션은 제외한다 — 교시 종료 시 만료 (PRD 8 확정 사항).
 */
export async function findSessionByCode(
  code: string,
  date: string = todayKST(),
): Promise<ClassSession | null> {
  const sessions = await collectAll<ClassSession>(
    db()
      .collection(COLLECTIONS.classSessions)
      .where("date", "==", date)
      .where("code", "==", code),
  );
  const usable = sessions.filter((s) => s.status !== "ended");
  return usable[0] ?? null;
}

/** 같은 날 중복 없는 2자리 코드를 뽑는다. 다음 날에는 재사용 가능. */
export async function allocateCode(date: string): Promise<string> {
  const sessions = await listSessionsByDate(date);
  const used = new Set(sessions.map((s) => s.code));

  const candidates: string[] = [];
  for (let n = 10; n <= 99; n += 1) {
    const code = String(n);
    if (!used.has(code)) candidates.push(code);
  }
  if (candidates.length === 0) {
    throw new Error(`${date}에 발급 가능한 수업 코드가 없습니다.`);
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export async function createSession(
  input: Omit<ClassSession, "id" | "createdAt">,
): Promise<ClassSession> {
  const now = Date.now();
  const ref = await db()
    .collection(COLLECTIONS.classSessions)
    .add({ ...input, createdAt: now });
  return { id: ref.id, ...input, createdAt: now };
}

export async function updateSession(
  id: string,
  patch: Partial<Omit<ClassSession, "id" | "createdAt">>,
): Promise<void> {
  await db().collection(COLLECTIONS.classSessions).doc(id).set(patch, { merge: true });
}

export async function deleteSession(id: string): Promise<void> {
  await db().collection(COLLECTIONS.classSessions).doc(id).delete();
}

export async function setSessionStatus(id: string, status: SessionStatus): Promise<void> {
  const patch: Partial<ClassSession> = { status };
  if (status === "active") patch.startedAt = Date.now();
  if (status === "ended") patch.endedAt = Date.now();
  await updateSession(id, patch);
}

/**
 * 차시 계획을 고쳤을 때, **아직 시작하지 않은** 세션의 스냅샷만 갱신한다.
 *
 * 교사는 1반 수업을 해보고 부족한 부분을 다음 반 수업 전에 고친다. 이때 이미 끝난 1반
 * 세션까지 소급 변경되면 "1반은 어떤 질문에 답한 것인가"를 알 수 없게 된다 (PRD 5.1).
 *
 * @returns 갱신된 세션 수
 */
export async function syncScheduledSessions(plan: LessonPlan): Promise<number> {
  const snap = await db()
    .collection(COLLECTIONS.classSessions)
    .where("lessonPlanId", "==", plan.id)
    .where("status", "==", "scheduled")
    .get();

  if (snap.empty) return 0;

  const batch = db().batch();
  for (const doc of snap.docs) {
    batch.set(
      doc.ref,
      {
        slideUrl: plan.slideUrl,
        reflectionQuestion: plan.reflectionQuestion,
        moodCheckEnabled: plan.moodCheckEnabled,
        reflectionPublic: plan.reflectionPublic,
        lessonNo: plan.lessonNo,
        title: plan.title,
      },
      { merge: true },
    );
  }
  await batch.commit();
  return snap.size;
}

/** 같은 (날짜, 교시, 반) 세션이 이미 있는지 — 시간표 일괄 생성 시 중복 방지 */
export async function findSessionSlot(
  date: string,
  period: number,
  classNo: ClassNo,
): Promise<ClassSession | null> {
  const sessions = await collectAll<ClassSession>(
    db()
      .collection(COLLECTIONS.classSessions)
      .where("date", "==", date)
      .where("classNo", "==", classNo)
      .where("period", "==", period),
  );
  return sessions[0] ?? null;
}

// ------------------------------------------------------------------- 출석

export async function recordAttendance(input: Omit<Attendance, "id">): Promise<void> {
  const id = entryId(input.sessionId, input.studentId);
  const ref = db().collection(COLLECTIONS.attendance).doc(id);
  // 이미 있으면 최초 접속 시각을 유지한다. 재접속으로 출석 시각이 밀리면 안 된다.
  const existing = await ref.get();
  if (existing.exists) return;
  await ref.set(input);
}

export async function listAttendance(sessionId: string): Promise<Attendance[]> {
  const rows = await collectAll<Attendance>(
    db().collection(COLLECTIONS.attendance).where("sessionId", "==", sessionId),
  );
  return rows.sort((a, b) => a.joinedAt - b.joinedAt);
}

// ------------------------------------------------------------------- 감정

export async function upsertMoodEntry(
  input: Omit<MoodEntry, "id" | "createdAt" | "updatedAt" | "reviewedByTeacher">,
): Promise<void> {
  const id = entryId(input.sessionId, input.studentId);
  const ref = db().collection(COLLECTIONS.moodEntries).doc(id);
  const existing = await ref.get();
  const now = Date.now();

  await ref.set(
    {
      ...input,
      createdAt: existing.exists ? (existing.data()?.createdAt ?? now) : now,
      updatedAt: now,
      // 내용이 바뀌면 교사 확인을 다시 받아야 한다 (PRD 5.4)
      reviewedByTeacher: false,
    },
    { merge: true },
  );
}

export async function getMoodEntry(
  sessionId: string,
  studentId: string,
): Promise<MoodEntry | null> {
  const doc = await db()
    .collection(COLLECTIONS.moodEntries)
    .doc(entryId(sessionId, studentId))
    .get();
  return doc.exists ? withId<MoodEntry>(doc) : null;
}

export async function listMoodEntries(sessionId: string): Promise<MoodEntry[]> {
  const rows = await collectAll<MoodEntry>(
    db().collection(COLLECTIONS.moodEntries).where("sessionId", "==", sessionId),
  );
  return rows.sort((a, b) => a.studentId.localeCompare(b.studentId));
}

export async function listMoodEntriesByStudent(studentId: string): Promise<MoodEntry[]> {
  const rows = await collectAll<MoodEntry>(
    db().collection(COLLECTIONS.moodEntries).where("studentId", "==", studentId),
  );
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function markMoodReviewed(sessionId: string, studentIds: string[]): Promise<void> {
  if (studentIds.length === 0) return;
  const batch = db().batch();
  for (const studentId of studentIds) {
    batch.set(
      db().collection(COLLECTIONS.moodEntries).doc(entryId(sessionId, studentId)),
      { reviewedByTeacher: true },
      { merge: true },
    );
  }
  await batch.commit();
}

// ------------------------------------------------------------------- 성찰

export async function upsertReflection(
  input: Omit<Reflection, "id" | "createdAt" | "updatedAt">,
): Promise<Reflection> {
  const id = entryId(input.sessionId, input.studentId);
  const ref = db().collection(COLLECTIONS.reflections).doc(id);
  const existing = await ref.get();
  const now = Date.now();
  const createdAt = existing.exists ? (existing.data()?.createdAt ?? now) : now;

  const doc = { ...input, createdAt, updatedAt: now };
  await ref.set(doc, { merge: true });
  return { id, ...doc };
}

export async function getReflection(
  sessionId: string,
  studentId: string,
): Promise<Reflection | null> {
  const doc = await db()
    .collection(COLLECTIONS.reflections)
    .doc(entryId(sessionId, studentId))
    .get();
  return doc.exists ? withId<Reflection>(doc) : null;
}

export async function listReflections(sessionId: string): Promise<Reflection[]> {
  const rows = await collectAll<Reflection>(
    db().collection(COLLECTIONS.reflections).where("sessionId", "==", sessionId),
  );
  return rows.sort((a, b) => a.studentId.localeCompare(b.studentId));
}

/** 학생 본인의 누적 기록. 한 학기치 성장 기록으로 보여준다 (PRD 3.4) */
export async function listReflectionsByStudent(studentId: string): Promise<Reflection[]> {
  const rows = await collectAll<Reflection>(
    db().collection(COLLECTIONS.reflections).where("studentId", "==", studentId),
  );
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

// ------------------------------------------------------- 보관·삭제 (PRD 5.2)

export type PurgeTarget =
  | "moodReasons"
  | "moodEntries"
  | "reflections"
  | "attendance"
  | "students";

/** 컬렉션을 페이지 단위로 지운다. 학기말 일괄 삭제·월 단위 이유 삭제에 쓴다. */
async function deleteQueryBatch(query: Query): Promise<number> {
  let deleted = 0;
  for (;;) {
    const snap = await query.limit(300).get();
    if (snap.empty) break;

    const batch = db().batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
    deleted += snap.size;

    if (snap.size < 300) break;
  }
  return deleted;
}

export interface PurgeRecord {
  at: number;
  affected: number;
}

/**
 * 마지막 삭제 일자를 서버에 남긴다 (PRD 5.2 — 교사 화면에 마지막 삭제 일자 표시).
 * 브라우저 로컬 저장이 아니라 서버에 두어야 다른 기기에서도 같은 값이 보인다.
 */
export async function recordPurge(target: PurgeTarget, affected: number): Promise<void> {
  await db()
    .collection(COLLECTIONS.meta)
    .doc(PURGE_LOG_DOC)
    .set({ [target]: { at: Date.now(), affected } }, { merge: true });
}

export async function readPurgeLog(): Promise<Partial<Record<PurgeTarget, PurgeRecord>>> {
  const doc = await db().collection(COLLECTIONS.meta).doc(PURGE_LOG_DOC).get();
  return doc.exists ? (doc.data() as Partial<Record<PurgeTarget, PurgeRecord>>) : {};
}

export async function purge(target: PurgeTarget): Promise<number> {
  switch (target) {
    case "moodReasons": {
      // 아이콘·색은 남기고 자유서술만 지운다. 가장 민감한 항목의 보관 기간을 짧게 가져간다.
      let cleared = 0;
      const snap = await db().collection(COLLECTIONS.moodEntries).get();
      for (let i = 0; i < snap.docs.length; i += 300) {
        const batch = db().batch();
        for (const doc of snap.docs.slice(i, i + 300)) {
          if (!doc.data().reason) continue;
          batch.set(doc.ref, { reason: "" }, { merge: true });
          cleared += 1;
        }
        await batch.commit();
      }
      return cleared;
    }
    case "moodEntries":
      return deleteQueryBatch(db().collection(COLLECTIONS.moodEntries));
    case "reflections":
      return deleteQueryBatch(db().collection(COLLECTIONS.reflections));
    case "attendance":
      return deleteQueryBatch(db().collection(COLLECTIONS.attendance));
    case "students":
      return deleteQueryBatch(db().collection(COLLECTIONS.students));
  }
}
