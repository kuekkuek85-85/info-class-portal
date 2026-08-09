import { fail, guard, ok } from "@/lib/api";
import { todayKST, isDateKey } from "@/lib/datetime";
import {
  getSession,
  listAttendance,
  listMoodEntries,
  listReflections,
  listSessionsByDate,
  listStudents,
} from "@/lib/db";
import { getMood } from "@/lib/mood";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";

/**
 * 교사 대시보드 — 출석·감정 개별 응답·성찰을 이름과 함께 본다.
 *
 * 교실 앞 화면에 띄우는 공유용 집계는 /api/teacher/board 로 완전히 분리했다.
 * 이름과 이유가 응답에 실리는 곳은 이 엔드포인트뿐이다 (PRD 3.3).
 */
export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const params = new URL(request.url).searchParams;
    const sessionId = params.get("sessionId");
    const dateParam = params.get("date");
    const date = isDateKey(dateParam) ? dateParam : todayKST();

    const sessions = await listSessionsByDate(date);

    if (!sessionId) {
      return ok({ date, sessions, session: null });
    }

    const session = await getSession(sessionId);
    if (!session) return fail("not_found");

    const [attendance, moods, reflections, roster] = await Promise.all([
      listAttendance(session.id),
      listMoodEntries(session.id),
      listReflections(session.id),
      listStudents(session.classNo),
    ]);

    const nameOf = new Map(roster.map((s) => [s.studentId, s.name]));
    const joined = new Set(attendance.map((a) => a.studentId));
    const moodByStudent = new Map(moods.map((m) => [m.studentId, m]));
    const reflectionByStudent = new Map(reflections.map((r) => [r.studentId, r]));

    // 명렬표에 있으나 아직 안 들어온 학생 — 출석 확인용
    const missing = roster
      .filter((s) => !s.temporary && !joined.has(s.studentId))
      .map((s) => ({ studentId: s.studentId, name: s.name }));

    const rows = attendance.map((entry) => {
      const mood = moodByStudent.get(entry.studentId);
      const reflection = reflectionByStudent.get(entry.studentId);
      return {
        studentId: entry.studentId,
        name: nameOf.get(entry.studentId) ?? "",
        temporary: !nameOf.get(entry.studentId),
        joinedAt: entry.joinedAt,
        mood: mood
          ? {
              key: mood.mood,
              label: getMood(mood.mood)?.label ?? mood.mood,
              quadrant: getMood(mood.mood)?.quadrant ?? null,
              reason: mood.reason,
              reviewed: mood.reviewedByTeacher,
            }
          : null,
        reflection: reflection
          ? { content: reflection.content, draft: reflection.draft, updatedAt: reflection.updatedAt }
          : null,
      };
    });

    // PRD 5.4 — 받아두고 보지 않는 상태가 가장 위험하다. 미확인 개수를 항상 노출한다.
    const unreviewed = moods.filter((m) => m.reason.trim() && !m.reviewedByTeacher).length;

    return ok({
      date,
      sessions,
      session,
      rows,
      missing,
      stats: {
        rosterCount: roster.filter((s) => !s.temporary).length,
        joinedCount: attendance.length,
        moodCount: moods.length,
        reflectionCount: reflections.filter((r) => r.content.trim()).length,
        unreviewed,
      },
    });
  });
}
