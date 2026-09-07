import "server-only";

import {
  fetchCollectionRaw,
  getSession,
  listAllSessions,
  listArtifactsByStudent,
  listLessonPlans,
  listMoodEntriesByStudent,
  listMoodEntriesByStudents,
  listReflectionsByStudent,
  listRoster,
  listSessionsByDate,
  listStudents,
} from "@/lib/db";
import { getMood } from "@/lib/mood";
import type { ClassNo, ClassSession, MoodEntry, Student } from "@/lib/types";

import { COURSES, courseKeyFromText, courseOf, type CourseKey } from "./courses";
import type { Pseudonymizer } from "./pseudonymize";
import { COLLECTION_META } from "./schema";

/**
 * 챗봇이 부르는 조회 도구들.
 *
 * Gemini 는 질문을 읽고 여기 도구를 스스로 골라 부른다. 각 도구는 `db.ts` 위에 얇게 얹혀
 * Firestore 를 읽고, 결과를 **두 갈래로** 돌려준다:
 *
 *   - `result` — Gemini 로 되먹일 값. **이름은 가려져 있다** (학생A). 감정·성찰 내용은 담되
 *                정체는 담지 않는다.
 *   - `sources` — 화면(교사)용 출처. 실명·세션ID 가 그대로 있어 칩을 누르면 그리로 점프한다.
 *                Gemini 에는 가지 않는다.
 */

export interface SourceLink {
  /** 사람이 읽는 출처 표시: "정보 › 7차시 · 제목 › 2026-08-31" */
  label: string;
  course: CourseKey;
  /** 점프 대상 (있으면 그 날짜·세션으로 대시보드 이동) */
  date?: string;
  sessionId?: string;
  /** 산출물의 앱 링크처럼, 바로 열 수 있는 바깥 주소 */
  href?: string;
}

export interface ToolResult {
  result: unknown;
}

export interface ToolContext {
  pseud: Pseudonymizer;
  /** 같은 세션을 여러 감정 기록이 참조하므로 한 요청 안에서 캐시한다 */
  sessionCache: Map<string, ClassSession | null>;
  /**
   * 근거 표시(S1…) 등록소.
   *
   * 도구가 자료 한 줄을 낼 때마다 여기 하나씩 쌓고, 그 줄에 `근거: "S1"` 을 붙여 모델에게
   * 보낸다. 모델은 답에서 실제로 근거로 쓴 것을 [S1] 처럼 인용하고, 그렇게 인용된 것만
   * 나중에 화면의 「출처」 칩이 된다 (gemini-agent). 그래서 도구가 자료를 많이 가져와도
   * 답과 무관한 것은 칩으로 안 나온다.
   */
  sources: { id: string; link: SourceLink }[];
}

/** 출처를 등록하고 근거 표시(S1…)를 돌려준다. 자료 줄에 그대로 붙인다 */
function addSource(ctx: ToolContext, link: SourceLink): string {
  const id = `S${ctx.sources.length + 1}`;
  ctx.sources.push({ id, link });
  return id;
}

const isHttpUrl = (v: string): boolean => /^https?:\/\//i.test(v.trim());
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

async function resolveSession(ctx: ToolContext, id: string): Promise<ClassSession | null> {
  if (ctx.sessionCache.has(id)) return ctx.sessionCache.get(id) ?? null;
  const session = await getSession(id);
  ctx.sessionCache.set(id, session);
  return session;
}

function sessionBreadcrumb(session: ClassSession): { label: string; course: CourseKey } {
  const course = courseOf({
    activityId: session.activity?.activityId,
    groupKey: session.groupKey,
    lessonNo: session.lessonNo,
  });
  const where = session.groupLabel || `${session.classNo}반`;
  const label = `${course.label} › ${session.lessonNo}차시 · ${session.title} › ${session.date} · ${where}`;
  return { label, course: course.key };
}

// --------------------------------------------------------------- 도구 실행기

async function resolveStudents(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const name = str(args.name);
  const number = num(args.number);
  const classNo = num(args.classNo);

  const matches = name
    ? ctx.pseud.findByName(name)
    : number !== undefined
      ? ctx.pseud.findByNumber(number, classNo)
      : [];

  const students = matches.map((entry) => ({
    student: ctx.pseud.pseudoFor(entry.studentId),
    // 반·번호는 준식별자(명렬표로 곧 실명 복원)라 모델(Gemini)로 보내지 않는다.
    // 교사 화면 출처(칩)에만 남겨, 누가 누구인지는 화면에서만 드러나게 한다.
    근거: addSource(ctx, { label: `${entry.classNo}반 ${entry.number}번`, course: "informatics" }),
  }));

  return {
    result:
      students.length > 0
        ? { students }
        : { students: [], 안내: "그런 학생을 명렬표에서 못 찾았어요. 이름·번호를 확인하세요." },
  };
}

async function studentWork(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const realId = ctx.pseud.realFor(str(args.student));
  if (!realId) {
    return { result: { 오류: "먼저 resolveStudents 로 학생을 찾으세요 (student 는 학생A 형태)." } };
  }
  const wantCourse = str(args.course) ? courseKeyFromText(str(args.course)) : null;

  const artifacts = await listArtifactsByStudent(realId);
  const items: unknown[] = [];

  for (const artifact of artifacts) {
    const course = courseOf({ activityId: artifact.activityId });
    if (wantCourse && course.key !== wantCourse) continue;

    const url = str(artifact.answers?.build_url);
    const answers: Record<string, string> = {};
    for (const [key, value] of Object.entries(artifact.answers ?? {})) {
      if (key.startsWith("_") || key === "build_url") continue;
      const text = str(value);
      if (text) answers[key] = ctx.pseud.mask(text);
    }

    const 근거 = addSource(ctx, {
      label: `${course.label} › 활동:${artifact.activityId}`,
      course: course.key,
      href: isHttpUrl(url) ? url : undefined,
    });
    items.push({
      근거,
      과목: course.label,
      활동: artifact.activityId,
      제출단계: artifact.submitStage ?? 0,
      앱링크: isHttpUrl(url) ? "있음" : url ? "링크아님" : "없음",
      그림: (artifact.strokes?.length ?? 0) > 0 ? "있음" : "없음",
      답: answers,
    });
  }

  return {
    result: items.length > 0 ? { student: str(args.student), 산출물: items } : { student: str(args.student), 산출물: [], 안내: "이 학생의 산출물이 없어요." },
  };
}

async function studentEmotions(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const realId = ctx.pseud.realFor(str(args.student));
  if (!realId) {
    return { result: { 오류: "먼저 resolveStudents 로 학생을 찾으세요 (student 는 학생A 형태)." } };
  }

  const [moods, reflections] = await Promise.all([
    listMoodEntriesByStudent(realId),
    listReflectionsByStudent(realId),
  ]);

  const emotions: unknown[] = [];
  const reflectionOut: unknown[] = [];

  for (const mood of moods) {
    const session = await resolveSession(ctx, mood.sessionId);
    const crumb = session ? sessionBreadcrumb(session) : { label: `${mood.date}`, course: "informatics" as CourseKey };
    const 근거 = addSource(ctx, { label: crumb.label, course: crumb.course, date: mood.date, sessionId: mood.sessionId });
    emotions.push({
      근거,
      일자: mood.date,
      과목: COURSES[crumb.course].label,
      차시: session?.lessonNo,
      기분: getMood(mood.mood)?.label ?? mood.mood,
      쾌불쾌: mood.valence,
      각성: mood.arousal,
      사유: ctx.pseud.mask(str(mood.reason)),
      교사확인: mood.reviewedByTeacher,
    });
  }

  for (const reflection of reflections) {
    const session = await resolveSession(ctx, reflection.sessionId);
    const crumb = session ? sessionBreadcrumb(session) : { label: `${reflection.date}`, course: "informatics" as CourseKey };
    const answers = (reflection.answers ?? []).map((a) => ctx.pseud.mask(str(a))).filter(Boolean);
    if (answers.length === 0) continue;
    const 근거 = addSource(ctx, { label: crumb.label, course: crumb.course, date: reflection.date, sessionId: reflection.sessionId });
    reflectionOut.push({
      근거,
      일자: reflection.date,
      과목: COURSES[crumb.course].label,
      차시: session?.lessonNo,
      작성중: reflection.draft,
      성찰: answers,
    });
  }

  return {
    result: {
      student: str(args.student),
      감정기록: emotions,
      성찰: reflectionOut,
      안내: emotions.length === 0 && reflectionOut.length === 0 ? "이 학생의 감정·성찰 기록이 없어요." : undefined,
    },
  };
}

async function classEmotions(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const classNo = num(args.class);
  const group = str(args.group);

  let roster: Student[];
  let courseKey: CourseKey;
  if (group) {
    roster = await listRoster({ classNo: 1 as ClassNo, groupKey: group });
    courseKey = courseOf({ groupKey: group }).key;
  } else if (classNo !== undefined && classNo >= 1 && classNo <= 4) {
    roster = await listStudents(classNo as ClassNo);
    courseKey = "informatics";
  } else {
    return { result: { 오류: "반(class 1~4) 또는 분반(group)을 알려주세요." } };
  }
  roster = roster.filter((s) => !s.temporary);
  if (roster.length === 0) return { result: { 학생: [], 안내: "그 반에 학생이 없어요." } };

  const moods = await listMoodEntriesByStudents(roster.map((s) => s.studentId));
  const byStudent = new Map<string, MoodEntry[]>();
  for (const m of moods) {
    const arr = byStudent.get(m.studentId) ?? [];
    arr.push(m);
    byStudent.set(m.studentId, arr);
  }

  const students = roster
    .map((s) => {
      const list = byStudent.get(s.studentId) ?? []; // createdAt 내림차순
      if (list.length === 0) return null;
      const latest = list[0];
      const 근거 = addSource(ctx, {
        label: `${s.classNo}반 ${s.number}번 · 감정 (${latest.date})`,
        course: courseKey,
        date: latest.date,
        sessionId: latest.sessionId,
      });
      return {
        근거,
        학생: ctx.pseud.pseudoFor(s.studentId),
        // 번호(출석번호)는 준식별자라 모델로 보내지 않는다. 반·번호는 위 출처(근거) 라벨로 교사 화면에만.
        기록수: list.length,
        부정기분수: list.filter((m) => m.valence < 0).length,
        미확인수: list.filter((m) => !m.reviewedByTeacher).length,
        최근기분: list.slice(0, 3).map((m) => ({
          일자: m.date,
          기분: getMood(m.mood)?.label ?? m.mood,
          쾌불쾌: m.valence,
          각성: m.arousal,
          사유: ctx.pseud.mask(str(m.reason)),
        })),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.부정기분수 - a.부정기분수 || b.미확인수 - a.미확인수);

  return {
    result: {
      반: group || `${classNo}반`,
      학생수: students.length,
      학생: students,
      안내:
        students.length === 0
          ? "이 반의 감정 기록이 없어요."
          : "부정 기분(쾌불쾌 음수)·미확인·반복되는 어두운 기분을 근거로, 감정적으로 눈여겨볼 학생을 골라 사유와 함께 짧게 설명하세요.",
    },
  };
}

async function findSessions(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const date = str(args.date);
  const wantCourse = str(args.course) ? courseKeyFromText(str(args.course)) : null;
  const lesson = num(args.lesson);

  let sessions: ClassSession[];
  if (date) {
    sessions = await listSessionsByDate(date);
    for (const s of sessions) ctx.sessionCache.set(s.id, s);
  } else {
    sessions = await listAllSessions();
  }

  const filtered = sessions
    .filter((s) => {
      const course = courseOf({ activityId: s.activity?.activityId, groupKey: s.groupKey, lessonNo: s.lessonNo });
      if (wantCourse && course.key !== wantCourse) return false;
      if (lesson !== undefined && s.lessonNo !== lesson) return false;
      return true;
    })
    .slice(0, 40);

  const rows = filtered.map((s) => {
    const crumb = sessionBreadcrumb(s);
    const 근거 = addSource(ctx, { label: crumb.label, course: crumb.course, date: s.date, sessionId: s.id });
    return {
      근거,
      일자: s.date,
      교시: s.period,
      반: s.groupLabel || `${s.classNo}반`,
      과목: COURSES[crumb.course].label,
      차시: s.lessonNo,
      제목: s.title,
      상태: s.status,
      활동: s.activity?.activityId,
    };
  });

  return {
    result: rows.length > 0 ? { 수업: rows } : { 수업: [], 안내: "조건에 맞는 수업이 없어요." },
  };
}

async function lessonContent(args: Record<string, unknown>): Promise<ToolResult> {
  const wantCourse = str(args.course) ? courseKeyFromText(str(args.course)) : null;
  const lesson = num(args.lesson);

  const plans = await listLessonPlans();
  const filtered = plans
    .filter((p) => {
      const course = courseOf({ activityId: p.activity?.activityId, groupKey: p.groups?.[0]?.key, lessonNo: p.lessonNo });
      if (wantCourse && course.key !== wantCourse) return false;
      if (lesson !== undefined && p.lessonNo !== lesson) return false;
      return true;
    })
    .slice(0, 20);

  const rows = filtered.map((p) => {
    const course = courseOf({ activityId: p.activity?.activityId, groupKey: p.groups?.[0]?.key, lessonNo: p.lessonNo });
    return {
      과목: course.label,
      차시: p.lessonNo,
      제목: p.title,
      성찰질문: p.reflectionQuestions,
      활동: p.activity?.activityId,
      게임: p.game?.heading,
      영상: p.video?.heading,
    };
  });

  return {
    result: rows.length > 0 ? { 차시: rows } : { 차시: [], 안내: "조건에 맞는 차시 계획이 없어요." },
  };
}

// --------------------------------------------------- 범용 조회 (queryData)

/** 필터 값 정규화 — 모델이 문자열로 넘겨도 숫자·불리언으로 맞춘다 (Firestore 값과 타입이 맞아야 걸린다) */
function normalizeValue(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const t = v.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if (/^-?\d+$/.test(t)) return Number(t);
  return v;
}

function applyOp(fieldVal: unknown, op: string, value: unknown): boolean {
  switch (op) {
    case "eq":
    case "==":
      return fieldVal === value;
    case "ne":
    case "!=":
      return fieldVal !== value;
    case "lt":
      return typeof fieldVal === "number" && typeof value === "number" && fieldVal < value;
    case "lte":
      return typeof fieldVal === "number" && typeof value === "number" && fieldVal <= value;
    case "gt":
      return typeof fieldVal === "number" && typeof value === "number" && fieldVal > value;
    case "gte":
      return typeof fieldVal === "number" && typeof value === "number" && fieldVal >= value;
    case "in":
      return Array.isArray(value) && value.includes(fieldVal);
    case "contains":
      return typeof fieldVal === "string" && typeof value === "string" && fieldVal.includes(value);
    default:
      return true;
  }
}

/** 자유서술 안의 학생 이름까지 재귀로 가린다 (answers 는 배열·객체일 수 있다) */
function maskDeep(value: unknown, ctx: ToolContext): unknown {
  if (typeof value === "string") return ctx.pseud.mask(value);
  if (Array.isArray(value)) return value.map((v) => maskDeep(v, ctx));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = maskDeep(v, ctx);
    return out;
  }
  return value;
}

/** 한 줄을 Gemini 로 보낼 수 있게: 정체는 가명으로, 자유서술은 마스킹, 큰 필드·문서ID 는 뺀다 */
function maskRow(
  collection: string,
  meta: (typeof COLLECTION_META)[string],
  row: Record<string, unknown>,
  ctx: ToolContext,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "id" || key === "studentId" || key === "name") continue; // 정체·문서ID(학번 포함) 제외
    if (key === "number" || key === "classNo") continue; // 반·번호(준식별자)는 모델로 보내지 않는다 — 재식별 차단
    if (meta.heavyFields.includes(key)) continue;
    out[key] = meta.textFields.includes(key) ? maskDeep(value, ctx) : value;
  }
  if (typeof row.studentId === "string") out["학생"] = ctx.pseud.pseudoFor(row.studentId);

  // 출처: 날짜·세션이 있으면 그 수업으로 점프. 세션 자체(classSessions)는 문서ID 가 세션ID.
  const date = typeof row.date === "string" ? row.date : undefined;
  const sessionId =
    typeof row.sessionId === "string"
      ? row.sessionId
      : collection === "classSessions" && typeof row.id === "string"
        ? row.id
        : undefined;
  const buildUrl =
    row.answers && typeof (row.answers as Record<string, unknown>).build_url === "string"
      ? ((row.answers as Record<string, unknown>).build_url as string)
      : undefined;
  const href = buildUrl && isHttpUrl(buildUrl) ? buildUrl : undefined;
  if (date || sessionId || href) {
    out["근거"] = addSource(ctx, {
      label: `${meta.label}${date ? " · " + date : ""}`,
      course: "informatics",
      date,
      sessionId,
      href,
    });
  }
  return out;
}

const QUERY_CAP = 500;

async function queryData(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const collection = str(args.collection);
  const meta = COLLECTION_META[collection];
  if (!meta) {
    return { result: { 오류: `조회할 수 없는 컬렉션이에요. 가능: ${Object.keys(COLLECTION_META).join(", ")}` } };
  }

  const whereRaw = Array.isArray(args.where) ? (args.where as unknown[]) : [];
  const filters = whereRaw
    .map((w) => (Array.isArray(w) ? { field: str(w[0]), op: str(w[1]) || "eq", value: w[2] } : null))
    .filter((f): f is { field: string; op: string; value: unknown } => f !== null && f.field !== "");

  // 학생 참조(가명 '학생A')를 학번으로 번역. 그 외 값은 타입 정규화.
  for (const f of filters) {
    if (f.field === "학생" || f.field === "student") f.field = "studentId";
    if (f.field === "studentId") {
      if (typeof f.value === "string") f.value = ctx.pseud.realFor(f.value) ?? f.value;
      else if (Array.isArray(f.value)) f.value = f.value.map((v) => (typeof v === "string" ? ctx.pseud.realFor(v) ?? v : v));
    } else {
      f.value = Array.isArray(f.value) ? f.value.map(normalizeValue) : normalizeValue(f.value);
    }
  }

  // Firestore 로 밀 primary: indexable 필드의 첫 동등 필터
  const primary =
    filters.find((f) => (f.op === "eq" || f.op === "==") && meta.indexable.includes(f.field) && f.value !== undefined) ?? null;
  const rows = await fetchCollectionRaw(collection, primary ? { field: primary.field, value: primary.value } : null, QUERY_CAP);

  const rest = filters.filter((f) => f !== primary);
  let filtered = rows.filter((row) => rest.every((f) => applyOp(row[f.field], f.op, f.value)));

  const orderBy = (args.orderBy ?? null) as { field?: string; dir?: string } | null;
  if (orderBy?.field) {
    const field = orderBy.field;
    const dir = orderBy.dir === "asc" ? 1 : -1;
    filtered = [...filtered].sort((a, b) => {
      const av = a[field] as never;
      const bv = b[field] as never;
      if (av < bv) return -dir;
      if (av > bv) return dir;
      return 0;
    });
  }

  const limit = Math.min(Math.max(num(args.limit) ?? 50, 1), 200);
  const 자료 = filtered.slice(0, limit).map((row) => maskRow(collection, meta, row, ctx));

  return {
    result: {
      컬렉션: collection,
      개수: 자료.length,
      전체후보: filtered.length,
      자료,
      안내:
        !primary && rows.length >= QUERY_CAP
          ? `필터가 넓어 ${QUERY_CAP}건까지만 훑었어요 — 반·날짜 같은 조건을 더하면 정확해집니다.`
          : undefined,
    },
  };
}

export const toolExecutors: Record<string, (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>> = {
  resolveStudents,
  studentWork,
  studentEmotions,
  classEmotions,
  findSessions,
  lessonContent: (args) => lessonContent(args),
  queryData,
};

// ------------------------------------------------- Gemini 함수 선언 (v1beta)

/** Gemini 에 넘기는 도구 선언. parameters 는 OpenAPI 서브셋(타입은 대문자). */
export const TOOL_DECLARATIONS = [
  {
    name: "resolveStudents",
    description:
      "학생 이름이나 번호로 학생을 찾아 익명 식별자(학생A 형태)를 돌려준다. 다른 학생 도구를 부르기 전에 먼저 부른다. 질문에 이미 '학생A'가 있으면 그대로 써도 된다.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "학생 이름 또는 익명 식별자(학생A). 이름이면 그대로 적는다." },
        number: { type: "INTEGER", description: "출석 번호" },
        classNo: { type: "INTEGER", description: "반 번호(1~4). 번호로 찾을 때 함께 주면 한 명으로 좁혀진다." },
      },
    },
  },
  {
    name: "studentWork",
    description: "한 학생이 만든 산출물(앱·활동지 답)을 과목·차시를 통틀어 찾는다. student 는 학생A 형태의 식별자.",
    parameters: {
      type: "OBJECT",
      properties: {
        student: { type: "STRING", description: "resolveStudents 가 준 익명 식별자(학생A)" },
        course: { type: "STRING", description: "과목으로 좁히기(선택): 정보 / 디지털 마음 톡톡 / 인간과 인공지능 / 하트아이로봇" },
      },
      required: ["student"],
    },
  },
  {
    name: "studentEmotions",
    description: "한 학생의 감정 기록(기분 체크)과 성찰 글을 날짜별로 뽑는다. student 는 학생A 형태의 식별자.",
    parameters: {
      type: "OBJECT",
      properties: {
        student: { type: "STRING", description: "resolveStudents 가 준 익명 식별자(학생A)" },
      },
      required: ["student"],
    },
  },
  {
    name: "classEmotions",
    description:
      "한 반(또는 분반) 전체의 감정 기록을 한 번에 가져온다. '어느 반에서 감정적으로 눈여겨볼 학생' 처럼 반 단위로 감정을 살필 때 반드시 이 도구를 쓴다 — 학생을 하나씩 studentEmotions 로 돌지 마라. 학생마다 최근 기분·부정 기분 수·미확인 수가 온다.",
    parameters: {
      type: "OBJECT",
      properties: {
        class: { type: "INTEGER", description: "반 번호(1~4). 정보 정규수업." },
        group: { type: "STRING", description: "분반 열쇠(hai-tue-1 등). 선택과목일 때." },
      },
    },
  },
  {
    name: "findSessions",
    description: "언제 어느 반에서 무슨 수업을 했는지 찾는다. 날짜(YYYY-MM-DD), 과목, 차시로 좁힐 수 있다.",
    parameters: {
      type: "OBJECT",
      properties: {
        date: { type: "STRING", description: "YYYY-MM-DD (KST)" },
        course: { type: "STRING", description: "과목: 정보 / 디지털 마음 톡톡 / 인간과 인공지능 / 하트아이로봇" },
        lesson: { type: "INTEGER", description: "차시 번호" },
      },
    },
  },
  {
    name: "lessonContent",
    description: "차시 계획의 내용(제목·성찰 질문·활동·영상 등)을 조회한다. 수업 내용 자체를 물을 때 쓴다.",
    parameters: {
      type: "OBJECT",
      properties: {
        course: { type: "STRING", description: "과목: 정보 / 디지털 마음 톡톡 / 인간과 인공지능 / 하트아이로봇" },
        lesson: { type: "INTEGER", description: "차시 번호" },
      },
    },
  },
  {
    name: "queryData",
    description:
      "교사 대시보드가 보는 학생 데이터를 직접 조회한다. 전용 도구로 안 되는 임의의 질문은 이걸로 컬렉션·필터를 정해 조회하고, 결과를 읽어 해석해 답한다. 컬렉션·필드·값은 지침의 '데이터' 설명을 따른다. 학생 참조는 가명('학생A')을 값에 그대로 쓴다.",
    parameters: {
      type: "OBJECT",
      properties: {
        collection: {
          type: "STRING",
          description:
            "students / moodEntries / reflections / artifacts / classSessions / attendance / quizAnswers / enrollments / lessonPlans",
        },
        where: {
          type: "ARRAY",
          description: '필터 목록. 각 항목은 [필드, 연산자, 값] 세 칸. 예: [["classNo","eq","1"],["valence","lt","0"]]',
          items: { type: "ARRAY", items: { type: "STRING" } },
        },
        orderBy: {
          type: "OBJECT",
          description: "정렬(선택). field 와 dir(asc|desc).",
          properties: { field: { type: "STRING" }, dir: { type: "STRING" } },
        },
        limit: { type: "INTEGER", description: "최대 개수(기본 50, 최대 200)" },
      },
      required: ["collection"],
    },
  },
] as const;
