import { fail, guard, ok, readJson } from "@/lib/api";
import {
  getArtifact,
  getTeacherEval,
  listArtifacts,
  listStudents,
  listTeacherEvals,
  setTeacherEval,
  studentNameMap,
} from "@/lib/db";
import {
  PA_ACTIVITY,
  PA_MAX_COMMENT,
  PA_REQUIRED,
  PA_SOURCE_ACTIVITY,
  PA_TEXT_KEYS,
  PA_VIBE_KEYS,
  parseVibeLog,
  sanitizePaScores,
} from "@/lib/pa-grading";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import type { ClassNo } from "@/lib/types";

/**
 * 교사 전용 - 정보 33~34차 수행평가 「피지컬 컴퓨팅 프로젝트」 채점.
 *
 *  GET  ?classNo=1~4        → 반 목록(가볍게): 학생별 필수 칸 빠짐·단계별 작성 여부·채점 값
 *  GET  ?studentId=10101     → 학생 한 명 상세: 32~34차 글·AI 대화 기록(온전/잘림 구분)·사진·채점 값
 *  POST { studentId, scores:{understand,build}, comment } → teacherEvals(activityId=PA_ACTIVITY)에 저장
 *
 * 점수는 학생이 닿는 라우트가 읽지 않는 teacherEvals 에만 간다(teacher-eval.ts 와 같은 원칙).
 * 산출물은 진짜 답안 문서(microbit-makecode__학번)만 읽는다 - 리허설 문서는 안 본다.
 */

const CLASSES = new Set([1, 2, 3, 4]);

function filled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0 && value.trim() !== "[]";
}

export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const params = new URL(request.url).searchParams;
    const studentId = (params.get("studentId") ?? "").trim();

    // ── 학생 한 명 상세 ──
    if (studentId) {
      const student = (await studentNameMap([studentId])).get(studentId);
      if (!student) return fail("not_found", "명단에 없는 학생입니다.");
      const [artifact, evalRow] = await Promise.all([
        getArtifact(PA_SOURCE_ACTIVITY, studentId),
        getTeacherEval(PA_ACTIVITY, studentId),
      ]);
      const answers = artifact?.answers ?? {};
      const texts: Record<string, string> = {};
      for (const key of PA_TEXT_KEYS) texts[key] = String(answers[key] ?? "");
      const vibes = PA_VIBE_KEYS.map((v) => ({ ...v, ...parseVibeLog(answers[v.key]) }));
      return ok({
        student: { studentId, name: student.name, number: student.number, classNo: student.classNo },
        texts,
        vibes,
        photo: String(answers.mb34_photo ?? ""),
        missing: PA_REQUIRED.filter((r) => !filled(answers[r.key])).map((r) => r.label),
        scores: evalRow?.scores ?? {},
        comment: evalRow?.comment ?? "",
        gradedAt: evalRow ? (evalRow as unknown as { at?: number }).at ?? null : null,
      });
    }

    // ── 반 목록 ──
    const classNo = Number(params.get("classNo"));
    if (!CLASSES.has(classNo)) return fail("invalid_input");
    const [roster, artifacts, evals] = await Promise.all([
      listStudents(classNo as ClassNo),
      listArtifacts(PA_SOURCE_ACTIVITY, classNo as ClassNo),
      listTeacherEvals(PA_ACTIVITY, classNo as ClassNo),
    ]);
    const answersOf = new Map(artifacts.map((a) => [a.studentId, a.answers ?? {}]));
    const evalOf = new Map(evals.map((e) => [e.studentId, e]));

    const students = roster.map((s) => {
      const a = answersOf.get(s.studentId) ?? {};
      const e = evalOf.get(s.studentId);
      return {
        studentId: s.studentId,
        name: s.name,
        number: s.number,
        temporary: s.temporary === true,
        steps: {
          problem: filled(a.mb33_problem),
          design: filled(a.mb33_flow) || filled(a.mb33_in),
          build: filled(a.mb34_vibe) || filled(a.mb33_vibe),
          submit: PA_REQUIRED.every((r) => filled(a[r.key])),
          reflect: filled(a.mb34_effect) || filled(a.mb34_extend),
        },
        missing: PA_REQUIRED.filter((r) => !filled(a[r.key])).map((r) => r.label),
        scores: e?.scores ?? {},
      };
    });
    students.sort((x, y) => x.number - y.number);
    return ok({ classNo, students });
  });
}

export async function POST(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<{ studentId?: string; scores?: unknown; comment?: string }>(request);
    const studentId = (body?.studentId ?? "").trim();
    if (!studentId) return fail("invalid_input");

    // 반 번호는 명단에서 얻는다 (화면이 보낸 값을 믿지 않는다)
    const student = (await studentNameMap([studentId])).get(studentId);
    if (!student) return fail("not_found", "명단에 없는 학생입니다.");

    await setTeacherEval({
      activityId: PA_ACTIVITY,
      studentId,
      classNo: student.classNo,
      scores: sanitizePaScores(body?.scores),
      comment: (body?.comment ?? "").trim().slice(0, PA_MAX_COMMENT),
      by: me.uid,
    });
    return ok({ saved: true, at: Date.now() });
  });
}
