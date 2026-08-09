import { fail, guard, ok } from "@/lib/api";
import { listMoodEntriesByStudent, listReflectionsByStudent, listAllSessions } from "@/lib/db";
import { getMood } from "@/lib/mood";
import { readStudentSession } from "@/lib/session";

/**
 * 학생 본인의 누적 기록. 한 학기치 성장 기록으로 보여준다 (PRD 3.4).
 * 자기 것만 열람한다 — 다른 학생의 기록은 어떤 경로로도 내려가지 않는다.
 */
export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const [reflections, moods, sessions] = await Promise.all([
      listReflectionsByStudent(me.studentId),
      listMoodEntriesByStudent(me.studentId),
      listAllSessions(),
    ]);

    const sessionById = new Map(sessions.map((s) => [s.id, s]));
    const moodBySession = new Map(moods.map((m) => [m.sessionId, m]));

    const items = reflections
      .filter((row) => row.content.trim())
      .map((row) => {
        const session = sessionById.get(row.sessionId);
        const mood = moodBySession.get(row.sessionId);
        return {
          date: row.date,
          lessonNo: session?.lessonNo ?? null,
          title: session?.title ?? "",
          question: session?.reflectionQuestion ?? "",
          content: row.content,
          moodLabel: mood ? (getMood(mood.mood)?.label ?? "") : "",
          updatedAt: row.updatedAt,
        };
      });

    return ok({ items });
  });
}
