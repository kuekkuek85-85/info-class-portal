import "server-only";

import {
  getSession,
  listAllSessions,
  listArtifactsByStudent,
  listLessonPlans,
  listMoodEntriesByStudent,
  listReflectionsByStudent,
  listSessionsByDate,
} from "@/lib/db";
import { getMood } from "@/lib/mood";
import type { ClassSession } from "@/lib/types";

import { COURSES, courseKeyFromText, courseOf, type CourseKey } from "./courses";
import type { Pseudonymizer } from "./pseudonymize";

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
  sources: SourceLink[];
}

export interface ToolContext {
  pseud: Pseudonymizer;
  /** 같은 세션을 여러 감정 기록이 참조하므로 한 요청 안에서 캐시한다 */
  sessionCache: Map<string, ClassSession | null>;
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
    반: entry.classNo,
    번호: entry.number,
  }));

  return {
    result:
      students.length > 0
        ? { students }
        : { students: [], 안내: "그런 학생을 명렬표에서 못 찾았어요. 이름·번호를 확인하세요." },
    sources: [],
  };
}

async function studentWork(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const realId = ctx.pseud.realFor(str(args.student));
  if (!realId) {
    return { result: { 오류: "먼저 resolveStudents 로 학생을 찾으세요 (student 는 학생A 형태)." }, sources: [] };
  }
  const wantCourse = str(args.course) ? courseKeyFromText(str(args.course)) : null;

  const artifacts = await listArtifactsByStudent(realId);
  const items: unknown[] = [];
  const sources: SourceLink[] = [];

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

    items.push({
      과목: course.label,
      활동: artifact.activityId,
      제출단계: artifact.submitStage ?? 0,
      앱링크: isHttpUrl(url) ? "있음" : url ? "링크아님" : "없음",
      그림: (artifact.strokes?.length ?? 0) > 0 ? "있음" : "없음",
      답: answers,
    });
    sources.push({
      label: `${course.label} › 활동:${artifact.activityId}`,
      course: course.key,
      href: isHttpUrl(url) ? url : undefined,
    });
  }

  return {
    result: items.length > 0 ? { student: str(args.student), 산출물: items } : { student: str(args.student), 산출물: [], 안내: "이 학생의 산출물이 없어요." },
    sources,
  };
}

async function studentEmotions(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const realId = ctx.pseud.realFor(str(args.student));
  if (!realId) {
    return { result: { 오류: "먼저 resolveStudents 로 학생을 찾으세요 (student 는 학생A 형태)." }, sources: [] };
  }

  const [moods, reflections] = await Promise.all([
    listMoodEntriesByStudent(realId),
    listReflectionsByStudent(realId),
  ]);

  const sources: SourceLink[] = [];
  const emotions: unknown[] = [];
  const reflectionOut: unknown[] = [];

  for (const mood of moods) {
    const session = await resolveSession(ctx, mood.sessionId);
    const crumb = session ? sessionBreadcrumb(session) : { label: `${mood.date}`, course: "informatics" as CourseKey };
    emotions.push({
      일자: mood.date,
      과목: COURSES[crumb.course].label,
      차시: session?.lessonNo,
      기분: getMood(mood.mood)?.label ?? mood.mood,
      쾌불쾌: mood.valence,
      각성: mood.arousal,
      사유: ctx.pseud.mask(str(mood.reason)),
      교사확인: mood.reviewedByTeacher,
    });
    sources.push({ label: crumb.label, course: crumb.course, date: mood.date, sessionId: mood.sessionId });
  }

  for (const reflection of reflections) {
    const session = await resolveSession(ctx, reflection.sessionId);
    const crumb = session ? sessionBreadcrumb(session) : { label: `${reflection.date}`, course: "informatics" as CourseKey };
    const answers = (reflection.answers ?? []).map((a) => ctx.pseud.mask(str(a))).filter(Boolean);
    if (answers.length === 0) continue;
    reflectionOut.push({
      일자: reflection.date,
      과목: COURSES[crumb.course].label,
      차시: session?.lessonNo,
      작성중: reflection.draft,
      성찰: answers,
    });
    sources.push({ label: crumb.label, course: crumb.course, date: reflection.date, sessionId: reflection.sessionId });
  }

  return {
    result: {
      student: str(args.student),
      감정기록: emotions,
      성찰: reflectionOut,
      안내: emotions.length === 0 && reflectionOut.length === 0 ? "이 학생의 감정·성찰 기록이 없어요." : undefined,
    },
    sources,
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

  const sources: SourceLink[] = [];
  const rows = filtered.map((s) => {
    const crumb = sessionBreadcrumb(s);
    sources.push({ label: crumb.label, course: crumb.course, date: s.date, sessionId: s.id });
    return {
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
    sources,
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
    sources: [],
  };
}

export const toolExecutors: Record<string, (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>> = {
  resolveStudents,
  studentWork,
  studentEmotions,
  findSessions,
  lessonContent: (args) => lessonContent(args),
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
] as const;
