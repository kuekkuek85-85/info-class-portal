import "server-only";

import { FieldPath, type Query } from "firebase-admin/firestore";

import { db } from "./firebase-admin";
import { todayKST } from "./datetime";
import { isPeriodOver } from "./timetable";
import type {
  Artifact,
  ArtifactFeedback,
  Attendance,
  ClassNo,
  ClassSession,
  LessonPhase,
  LessonPlan,
  MoodEntry,
  QuizAnswer,
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
  codeReservations: "codeReservations",
  quizAnswers: "quizAnswers",
  artifacts: "artifacts",
  artifactFeedbacks: "artifactFeedbacks",
  meta: "meta",
} as const;

const PURGE_LOG_DOC = "purgeLog";

/** 이미 존재하는 문서에 create()를 호출했을 때 Firestore가 주는 코드 */
const ALREADY_EXISTS = 6;

function isAlreadyExists(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === ALREADY_EXISTS;
}

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

/**
 * 이 세션이 닫혔는가 — 교사가 종료했거나, 시각표상 그 교시가 끝났거나.
 * 학생 쓰기 API가 공통으로 쓴다.
 */
export function isSessionClosed(session: ClassSession, now: Date = new Date()): boolean {
  return session.status === "ended" || isPeriodOver(session.date, session.period, now);
}

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
 * 교시 종료 시 만료된다 (PRD 8 확정 사항) — 교사가 종료를 누른 세션과, 시각표상 이미 끝난
 * 교시를 모두 제외한다. 교사가 버튼 누르는 것을 깜빡해도 코드가 하교 후까지 살아 있지 않다.
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
  const usable = sessions.filter(
    (s) => s.status !== "ended" && !isPeriodOver(s.date, s.period),
  );
  return usable[0] ?? null;
}

/**
 * 같은 날 중복 없는 2자리 코드를 **원자적으로** 예약한다. 다음 날에는 재사용 가능.
 *
 * 조회 후 배정하는 방식은 두 세션을 거의 동시에 만들 때 같은 코드를 내줄 수 있다.
 * 그러면 findSessionByCode()가 둘 중 하나만 반환하고, 다른 반 학생 전원이 반 불일치로 막힌다.
 * 예약 문서 ID를 `날짜__코드`로 고정하고 create()로 만들어 Firestore가 중복을 거부하게 한다.
 */
export async function reserveCode(date: string): Promise<string> {
  const existing = await db()
    .collection(COLLECTIONS.codeReservations)
    .where("date", "==", date)
    .get();
  const used = new Set(existing.docs.map((doc) => doc.data().code as string));

  const candidates: string[] = [];
  for (let n = 10; n <= 99; n += 1) {
    const code = String(n);
    if (!used.has(code)) candidates.push(code);
  }
  // 뒤에서부터 순서대로 주면 코드를 추측하기 쉬워지므로 섞는다
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (const code of candidates) {
    try {
      await db()
        .collection(COLLECTIONS.codeReservations)
        .doc(codeReservationId(date, code))
        .create({ date, code, createdAt: Date.now() });
      return code;
    } catch (error) {
      // 그 사이 다른 요청이 먼저 가져갔다면 다음 후보로
      if (isAlreadyExists(error)) continue;
      throw error;
    }
  }

  throw new Error(`${date}에 발급 가능한 수업 코드가 없습니다.`);
}

function codeReservationId(date: string, code: string): string {
  return `${date}__${code}`;
}

async function releaseCode(date: string, code: string): Promise<void> {
  await db().collection(COLLECTIONS.codeReservations).doc(codeReservationId(date, code)).delete();
}

/** 세션 문서 ID. (날짜, 교시, 반)이 곧 식별자라 중복 생성이 Firestore 단계에서 막힌다. */
export function sessionDocId(date: string, period: number, classNo: ClassNo): string {
  return `${date}__${period}__${classNo}`;
}

/** 같은 (날짜, 교시, 반) 세션이 이미 있으면 null을 반환한다. 코드 예약도 함께 되돌린다. */
export async function createSession(
  input: Omit<ClassSession, "id" | "createdAt">,
): Promise<ClassSession | null> {
  const now = Date.now();
  const id = sessionDocId(input.date, input.period, input.classNo);

  try {
    await db()
      .collection(COLLECTIONS.classSessions)
      .doc(id)
      .create({ ...input, createdAt: now });
  } catch (error) {
    if (isAlreadyExists(error)) {
      // 이 세션 때문에 잡아둔 코드를 놓아준다. 안 그러면 90개가 조용히 말라붙는다.
      await releaseCode(input.date, input.code).catch(() => undefined);
      return null;
    }
    throw error;
  }

  return { id, ...input, createdAt: now };
}

export async function updateSession(
  id: string,
  patch: Partial<Omit<ClassSession, "id" | "createdAt">>,
): Promise<void> {
  await db().collection(COLLECTIONS.classSessions).doc(id).set(patch, { merge: true });
}

export async function deleteSession(id: string): Promise<void> {
  const session = await getSession(id);
  await db().collection(COLLECTIONS.classSessions).doc(id).delete();

  // 코드 예약을 함께 풀어 같은 날 다시 쓸 수 있게 한다
  if (session) await releaseCode(session.date, session.code).catch(() => undefined);
}

export async function setSessionStatus(id: string, status: SessionStatus): Promise<void> {
  const patch: Partial<ClassSession> = { status };
  if (status === "active") patch.startedAt = Date.now();
  if (status === "ended") {
    patch.endedAt = Date.now();
    patch.phase = "done";
  }
  await updateSession(id, patch);
}

/** 학생 화면 단계를 바꾼다. 교사만 호출한다. */
export async function setSessionPhase(id: string, phase: LessonPhase): Promise<void> {
  await updateSession(id, { phase });
  phaseCache.delete(id);
}

/**
 * 세션 캐시를 버린다. 교사가 세션 문서를 고친 직후에 부른다.
 *
 * 퀴즈 문항 이동처럼 교실에서 즉시 반영돼야 하는 변경이 캐시 때문에 몇 초 늦으면,
 * 교사는 버튼이 안 먹은 줄 알고 다시 누른다.
 */
export function invalidateSessionCache(id: string): void {
  phaseCache.delete(id);
}

/**
 * 학생 화면이 단계를 따라오려면 짧은 주기로 물어야 한다. 28명이 5초마다 묻는데 그때마다
 * Firestore 를 읽으면 한 차시에 만 건이 넘어 무료 한도(하루 5만 읽기)를 위협한다.
 * 몇 초짜리 캐시만 둬도 읽기가 한 자릿수 배로 줄고, 단계 전환 지연은 체감되지 않는다.
 */
const phaseCache = new Map<string, { session: ClassSession; at: number }>();
const PHASE_CACHE_MS = 3000;

export async function getSessionCached(id: string): Promise<ClassSession | null> {
  const hit = phaseCache.get(id);
  if (hit && Date.now() - hit.at < PHASE_CACHE_MS) return hit.session;

  const session = await getSession(id);
  if (session) phaseCache.set(id, { session, at: Date.now() });
  return session;
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
    batch.set(doc.ref, snapshotOf(plan), { merge: true });
  }
  await batch.commit();
  return snap.size;
}

/** 차시 계획에서 세션으로 복사되는 부분. 생성·재배정·동기화가 모두 이 한 곳을 쓴다. */
export function snapshotOf(plan: LessonPlan) {
  return {
    moodCheckEnabled: plan.moodCheckEnabled,
    game: plan.game,
    gameExplainer: plan.gameExplainer,
    progress: plan.progress,
    assessment: plan.assessment,
    video: plan.video,
    reflectionQuestions: plan.reflectionQuestions,
    reflectionPublic: plan.reflectionPublic,
    // 퀴즈·활동도 스냅샷에 포함한다. 교사가 2반 수업 전에 문항을 고쳐도 1반이 실제로
    // 답한 문항이 그대로 남아야 응답 분포를 읽을 수 있다 (PRD 5.1).
    quiz: plan.quiz,
    activity: plan.activity,
    lessonNo: plan.lessonNo,
    title: plan.title,
  };
}

// ------------------------------------------------------------- 퀴즈 응답

/**
 * 문항 하나의 답을 기록한다. **이미 고른 문항은 덮어쓰지 않는다.**
 *
 * 정답이 공개된 뒤 슬쩍 바꾸는 것을 막는 것이 목적이라, 잠금은 화면이 아니라 여기서 건다.
 * 화면에서만 막으면 요청을 직접 보내는 것으로 우회된다.
 *
 * @returns 실제로 기록됐는지 (이미 답한 문항이면 false)
 */
export async function recordQuizAnswer(
  input: { sessionId: string; studentId: string; classNo: ClassNo; date: string },
  questionIndex: number,
  choiceIndex: number,
  questionCount: number,
): Promise<boolean> {
  const id = entryId(input.sessionId, input.studentId);
  const ref = db().collection(COLLECTIONS.quizAnswers).doc(id);

  return db().runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const previous: number[] = doc.exists ? (doc.data()?.answers ?? []) : [];

    // 길이를 문항 수에 맞추고 빈 칸은 -1(미응답)로 채운다
    const answers = Array.from({ length: questionCount }, (_, i) => previous[i] ?? -1);
    if (answers[questionIndex] >= 0) return false;

    answers[questionIndex] = choiceIndex;
    tx.set(ref, { ...input, answers, updatedAt: Date.now() }, { merge: true });
    return true;
  });
}

export async function getQuizAnswer(
  sessionId: string,
  studentId: string,
): Promise<QuizAnswer | null> {
  const doc = await db()
    .collection(COLLECTIONS.quizAnswers)
    .doc(entryId(sessionId, studentId))
    .get();
  return doc.exists ? withId<QuizAnswer>(doc) : null;
}

export async function listQuizAnswers(sessionId: string): Promise<QuizAnswer[]> {
  return collectAll<QuizAnswer>(
    db().collection(COLLECTIONS.quizAnswers).where("sessionId", "==", sessionId),
  );
}

// ----------------------------------------------------------------- 작품

/** 문서 ID = activityId__학번. 차시가 아니라 활동에 묶여야 이어 그리기가 된다. */
export function artifactId(activityId: string, studentId: string): string {
  return `${activityId}__${studentId}`;
}

/**
 * 한 번에 뛸 수 있는 저장 순번의 최대 폭.
 *
 * 정상적인 사용에서 순번은 한 번에 1씩만 올라간다. 30분 수업 내내 그려도 수백을 넘지 않는다.
 */
const REV_MAX_JUMP = 100_000;

export async function getArtifact(
  activityId: string,
  studentId: string,
): Promise<Artifact | null> {
  const doc = await db()
    .collection(COLLECTIONS.artifacts)
    .doc(artifactId(activityId, studentId))
    .get();
  return doc.exists ? withId<Artifact>(doc) : null;
}

export async function getArtifactById(id: string): Promise<Artifact | null> {
  const doc = await db().collection(COLLECTIONS.artifacts).doc(id).get();
  return doc.exists ? withId<Artifact>(doc) : null;
}

export async function listArtifacts(activityId: string, classNo?: ClassNo): Promise<Artifact[]> {
  const base = db().collection(COLLECTIONS.artifacts).where("activityId", "==", activityId);
  const rows = await collectAll<Artifact>(
    classNo ? base.where("classNo", "==", classNo) : base,
  );
  return rows.sort((a, b) => a.studentId.localeCompare(b.studentId));
}

/**
 * 없으면 만들고 있으면 그대로 돌려준다. 그림판 첫 진입에서 쓴다.
 *
 * 만들 때는 반드시 create() 를 쓴다. merge 저장으로 만들면, 거의 동시에 들어온 두 요청 중
 * 늦은 쪽이 이미 만들어진 문서 위에 빈 기본값(`strokes: []`, `saveRev: 0`)을 덮어써서
 * 그 사이 저장된 그림과 순번을 날린다.
 */
export async function ensureArtifact(input: {
  activityId: string;
  studentId: string;
  classNo: ClassNo;
  year: number;
}): Promise<Artifact> {
  const existing = await getArtifact(input.activityId, input.studentId);
  if (existing) return existing;

  const now = Date.now();
  const doc: Omit<Artifact, "id"> = {
    activityId: input.activityId,
    studentId: input.studentId,
    classNo: input.classNo,
    place: "",
    year: input.year,
    strokes: [],
    texts: [],
    answers: {},
    traits: [],
    sources: { site: "", ai: "" },
    status: "draft",
    hidden: false,
    saveRev: 0,
    createdAt: now,
    updatedAt: now,
  };
  const id = artifactId(input.activityId, input.studentId);
  try {
    await db().collection(COLLECTIONS.artifacts).doc(id).create(doc);
    return { id, ...doc };
  } catch (error) {
    // 그 사이 다른 요청이 먼저 만들었다면 그쪽 것을 그대로 쓴다
    if (!isAlreadyExists(error)) throw error;
    const created = await getArtifact(input.activityId, input.studentId);
    if (created) return created;
    throw error;
  }
}

export async function updateArtifact(
  id: string,
  patch: Partial<Omit<Artifact, "id" | "createdAt">>,
): Promise<void> {
  await db()
    .collection(COLLECTIONS.artifacts)
    .doc(id)
    .set({ ...patch, updatedAt: Date.now() }, { merge: true });
}

/**
 * 그림을 저장한다. append 는 새로 그은 획만, replace 는 통째로.
 *
 * 트랜잭션으로 읽고 쓰는 이유 두 가지.
 *  ① 두 요청이 겹치면 각자 읽은 배열에 각자 덧붙여 한쪽 획이 통째로 사라진다.
 *  ② **도착 순서가 뒤집힐 수 있다.** 자동저장이 날아가는 중에 학생이 화면을 떠나
 *     마지막 저장이 함께 출발하면, 늦게 도착한 옛 요청이 최신 그림을 덮어쓴다.
 *     그래서 저장 순번(saveRev)이 더 낮은 요청은 조용히 버린다.
 *
 * @returns 저장 뒤의 대략적인 문서 크기, 거부 여부, 뒤늦게 온 요청인지
 */
export async function writeStrokes(
  id: string,
  input: {
    mode: "append" | "replace";
    strokes: Artifact["strokes"];
    texts?: Artifact["texts"];
    rev: number;
  },
  limits: { warn: number; reject: number },
): Promise<{
  size: number;
  rejected: boolean;
  total: number;
  stale: boolean;
  /** 서버가 지금 들고 있는 순번. 클라이언트가 여기에 맞춰 다시 센다 */
  serverRev: number;
}> {
  return db().runTransaction(async (tx) => {
    const ref = db().collection(COLLECTIONS.artifacts).doc(id);
    const doc = await tx.get(ref);
    const current: Artifact["strokes"] = doc.exists ? (doc.data()?.strokes ?? []) : [];
    const storedRev: number = doc.exists ? (doc.data()?.saveRev ?? 0) : 0;

    /*
     * 순번이 터무니없이 크면 받지 않는다.
     *
     * 요청을 직접 만들어 순번을 아주 큰 값으로 한 번 저장해 버리면, 그 뒤로 정상적인
     * 저장이 전부 "옛 요청"으로 버려진다. 자기 그림만 못 쓰게 만드는 짓이지만,
     * 한 번 그렇게 되면 되돌릴 방법이 화면에 없다.
     */
    if (!Number.isSafeInteger(input.rev) || input.rev > storedRev + REV_MAX_JUMP) {
      return {
        size: roughSize(current),
        rejected: false,
        total: current.length,
        stale: true,
        serverRev: storedRev,
      };
    }

    // 이미 더 최신 저장이 들어와 있다 — 이 요청은 늦게 도착한 옛것이므로 버린다.
    // 현재 순번을 함께 돌려줘 클라이언트가 한 번에 따라잡게 한다 (그리기 화면을
    // 다시 열면 순번이 0부터 시작해 한동안 계속 버려지는 것을 막는다).
    if (input.rev <= storedRev) {
      return {
        size: roughSize(current),
        rejected: false,
        total: current.length,
        stale: true,
        serverRev: storedRev,
      };
    }

    const merged = input.mode === "replace" ? input.strokes : [...current, ...input.strokes];
    const size = roughSize(merged);

    // 한도를 넘으면 새 획만 거부한다. 통째로 실패시키면 이미 그린 것까지 못 올린다.
    // 순번도 올리지 않는다 — 아무것도 쓰지 않았으므로.
    if (size > limits.reject) {
      return {
        size: roughSize(current),
        rejected: true,
        total: current.length,
        stale: false,
        serverRev: storedRev,
      };
    }

    const patch: Record<string, unknown> = {
      strokes: merged,
      saveRev: input.rev,
      updatedAt: Date.now(),
    };
    // 텍스트도 같은 트랜잭션에서 쓴다. 따로 쓰면 획과 텍스트가 서로 다른 시점의
    // 상태로 섞일 수 있다.
    if (input.texts) patch.texts = input.texts;

    tx.set(ref, patch, { merge: true });
    return { size, rejected: false, total: merged.length, stale: false, serverRev: input.rev };
  });
}

/** 획 배열이 Firestore 문서에서 차지하는 크기의 근사값. 숫자 하나를 8바이트로 본다. */
export function roughSize(strokes: Artifact["strokes"]): number {
  let bytes = 0;
  for (const stroke of strokes) {
    bytes += 32 + stroke.p.length * 8;
  }
  return bytes;
}

// --------------------------------------------------------------- 피드백

export function feedbackId(artifact: string, authorId: string): string {
  return `${artifact}__${authorId}`;
}

export async function upsertFeedback(
  input: Omit<ArtifactFeedback, "id" | "createdAt" | "updatedAt" | "authorReply">,
): Promise<void> {
  const id = feedbackId(input.artifactId, input.authorId);
  const ref = db().collection(COLLECTIONS.artifactFeedbacks).doc(id);
  const existing = await ref.get();
  const now = Date.now();

  await ref.set(
    {
      ...input,
      createdAt: existing.exists ? (existing.data()?.createdAt ?? now) : now,
      updatedAt: now,
    },
    { merge: true },
  );
}

/** 작품 주인이 남기는 한 줄 응답 */
export async function replyToFeedback(id: string, reply: string): Promise<void> {
  await db()
    .collection(COLLECTIONS.artifactFeedbacks)
    .doc(id)
    .set({ authorReply: reply, updatedAt: Date.now() }, { merge: true });
}

export async function listFeedbacksFor(artifactIds: string[]): Promise<ArtifactFeedback[]> {
  const unique = [...new Set(artifactIds)].filter(Boolean);
  if (unique.length === 0) return [];

  const rows: ArtifactFeedback[] = [];
  // Firestore `in` 은 한 번에 30개까지
  for (let i = 0; i < unique.length; i += 30) {
    rows.push(
      ...(await collectAll<ArtifactFeedback>(
        db()
          .collection(COLLECTIONS.artifactFeedbacks)
          .where("artifactId", "in", unique.slice(i, i + 30)),
      )),
    );
  }
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

/** 내가 쓴 피드백 — 갤러리에서 "이미 남겼는지" 표시에 쓴다 */
export async function listFeedbacksByAuthor(
  authorId: string,
  artifactIds: string[],
): Promise<ArtifactFeedback[]> {
  const all = await listFeedbacksFor(artifactIds);
  return all.filter((row) => row.authorId === authorId);
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

  // 한 번 제출한 글은 다시 초안으로 내려가지 않는다.
  // 제출 버튼을 누른 직후 늦게 도착한 자동 임시저장이 "제출 완료"를 지워 버리면,
  // 교사 화면에는 계속 "작성 중"으로 남는다.
  const alreadySubmitted = existing.exists && existing.data()?.draft === false;
  const draft = alreadySubmitted ? false : input.draft;

  // answers 는 배열이라 merge 로는 원소가 지워지지 않는다. 통째로 덮어쓴다.
  const doc = { ...input, draft, createdAt, updatedAt: now };
  await ref.set(doc);
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
  | "artifacts"
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
    case "artifacts": {
      // 작품·퀴즈 답·피드백은 한 덩어리로 지운다. 작품만 지우고 피드백을 남기면
      // 무엇에 대한 피드백인지 알 수 없는 문서만 떠다닌다.
      const removed =
        (await deleteQueryBatch(db().collection(COLLECTIONS.artifacts))) +
        (await deleteQueryBatch(db().collection(COLLECTIONS.artifactFeedbacks))) +
        (await deleteQueryBatch(db().collection(COLLECTIONS.quizAnswers)));
      return removed;
    }
    case "students":
      return deleteQueryBatch(db().collection(COLLECTIONS.students));
  }
}
