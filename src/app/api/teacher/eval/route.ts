import { fail, guard, ok, readJson } from "@/lib/api";
import {
  getArtifact,
  getTeacherEval,
  listRoster,
  setTeacherEval,
  studentNameMap,
} from "@/lib/db";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import { TEACHER_EVAL_MAX_COMMENT, sanitizeScores } from "@/lib/teacher-eval";
import type { ClassNo } from "@/lib/types";

/**
 * 교사 전용 발표 평가 (인간과 인공지능 7·8차시).
 *
 * ## 학생에게 절대 안 보인다
 *
 * 저장은 teacherFeedback 이 아니라 **별도 컬렉션 teacherEvals** 로 간다(db.ts). 학생이 닿는
 * 라우트(student/lesson·gallery·submit·artifact)는 이 컬렉션을 조회하지 않는다 — 이 파일과
 * /teacher/eval 화면만 읽고 쓴다. 그래서 발표 점수가 학생 화면으로 샐 경로가 구조적으로 없다.
 *
 * ## 발표 참고 링크만 함께 준다
 *
 * 교사가 발표를 보며 앱·슬라이드를 열어 볼 수 있게 build_url·slides_url 만 얹는다. 이 값은
 * 학생 본인이 낸 자기 앱/자료 링크라 새로 공개되는 정보가 아니다(교사 화면 전용).
 */

export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const params = new URL(request.url).searchParams;
    const activityId = (params.get("activity") ?? "").trim();
    const groupKey = (params.get("group") ?? "").trim();
    if (!activityId || !groupKey) return fail("invalid_input");

    // classNo 는 groupKey 가 있으면 안 쓰인다 (listRoster 가 groupKey 로 명단을 찾는다)
    const roster = await listRoster({ classNo: 1 as ClassNo, groupKey });

    const students = await Promise.all(
      roster.map(async (student) => {
        const [artifact, evalRow] = await Promise.all([
          getArtifact(activityId, student.studentId),
          getTeacherEval(activityId, student.studentId),
        ]);
        const answers = artifact?.answers ?? {};
        return {
          studentId: student.studentId,
          name: student.name,
          number: student.number ?? null,
          // 발표를 보며 열어 볼 참고 링크 (학생 본인이 낸 자기 것)
          buildUrl: String(answers.build_url ?? ""),
          slidesUrl: String(answers.slides_url ?? ""),
          pitch: String(answers.final_pitch ?? answers.mvp_one ?? ""),
          // 이미 평가했는지 + 값 (점수는 화면에서 펼치기 전까지 감춘다)
          hasEval: Boolean(evalRow),
          scores: evalRow?.scores ?? {},
          comment: evalRow?.comment ?? "",
        };
      }),
    );

    students.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    return ok({ activityId, groupKey, students });
  });
}

export async function POST(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<{
      activity?: string;
      studentId?: string;
      scores?: unknown;
      comment?: string;
    }>(request);
    const activityId = (body?.activity ?? "").trim();
    const studentId = (body?.studentId ?? "").trim();
    if (!activityId || !studentId) return fail("invalid_input");

    // 반 번호는 학생 명단에서 얻는다 (화면이 보낸 값을 믿지 않는다)
    const byId = await studentNameMap([studentId]);
    const student = byId.get(studentId);
    if (!student) return fail("not_found", "명단에 없는 학생입니다.");

    const scores = sanitizeScores(body?.scores);
    const comment = (body?.comment ?? "").trim().slice(0, TEACHER_EVAL_MAX_COMMENT);

    await setTeacherEval({
      activityId,
      studentId,
      classNo: student.classNo,
      scores,
      comment,
      by: me.uid,
    });
    return ok({ saved: true });
  });
}
