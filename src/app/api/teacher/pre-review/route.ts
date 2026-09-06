import { fail, guard, ok, readJson } from "@/lib/api";
import { artifactId, getArtifact, listRoster, updateArtifact } from "@/lib/db";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import type { ClassNo } from "@/lib/types";

/**
 * 「미리 피드백」 — 수업 전에 분반 전체를 한 페이지에서 검토한다 (인간과 인공지능 4차시).
 *
 * ## 왜 세션이 아니라 활동으로 다루는가
 *
 * 피드백은 **작품**(activityId__학번)에 저장된다. 세션이 아니라. 그래서 4차시 세션을
 * 아직 안 열었어도, 지난 시간 작품을 지금 열어 미리 써 둘 수 있다. 저장한 피드백은
 * 다음 시간 학생 화면(teacher_note)에 그대로 뜬다.
 *
 * ## AI 초안과 진짜 피드백은 다른 칸이다
 *
 * aiFeedbackDraft 는 AI가 앱을 눌러 보고 써 둔 **초안**이다. 학생에게는 안 보인다.
 * 교사가 그것을 바탕으로 고쳐서 teacherFeedback.note 에 저장하면, 그것만 학생에게 간다.
 *
 * 답 내용을 통째로 보여주지만(교사가 검토하는 화면이라 필요하다), 밑줄로 시작하는
 * 안내문 열쇠는 뺀다 — 답이 아니라 화면 설명이다.
 */

const MAX_NOTE = 800;

export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const params = new URL(request.url).searchParams;
    const activityId = (params.get("activity") ?? "").trim();
    const groupKey = (params.get("group") ?? "").trim();
    if (!activityId || !groupKey) return fail("invalid_input");

    // classNo 는 groupKey 가 있으면 안 쓰인다 (listRoster 는 groupKey 로 명단을 찾는다)
    const roster = await listRoster({ classNo: 1 as ClassNo, groupKey });

    const students = await Promise.all(
      roster.map(async (student) => {
        const artifact = await getArtifact(activityId, student.studentId);
        const answers = artifact?.answers ?? {};
        const shown = Object.entries(answers)
          .filter(([key, value]) => !key.startsWith("_") && String(value ?? "").trim())
          .map(([key, value]) => ({ key, value: String(value) }));
        return {
          studentId: student.studentId,
          name: student.name,
          number: student.number ?? null,
          hasArtifact: Boolean(artifact),
          answers: shown,
          aiDraft: artifact?.aiFeedbackDraft ?? "",
          teacherNote: artifact?.teacherFeedback?.note ?? "",
          reviewedAt: artifact?.teacherFeedback?.at ?? 0,
        };
      }),
    );

    // 번호 순. 이름을 가리지 않는다 — 교사 전용 화면이다
    students.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    return ok({ activityId, groupKey, students });
  });
}

export async function POST(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<{ activity?: string; studentId?: string; note?: string }>(request);
    const activityId = (body?.activity ?? "").trim();
    const studentId = (body?.studentId ?? "").trim();
    const note = (body?.note ?? "").trim().slice(0, MAX_NOTE);
    if (!activityId || !studentId) return fail("invalid_input");

    const artifact = await getArtifact(activityId, studentId);
    if (!artifact) return fail("not_found", "이 학생의 작품이 아직 없습니다.");

    /*
     * 진짜 피드백은 teacherFeedback.note 에 저장한다 — 학생 화면(teacher_note)이 읽는 곳.
     * 빈 note 로 저장하면 학생 화면에 빈 말풍선이 뜨므로, 비었으면 피드백 자체를 지운다.
     */
    if (!note) {
      await updateArtifact(artifact.id, { teacherFeedback: undefined });
      return ok({ cleared: true });
    }
    await updateArtifact(artifactId(activityId, studentId), {
      teacherFeedback: { at: Date.now(), chips: [], note },
    });
    return ok({ saved: true });
  });
}
