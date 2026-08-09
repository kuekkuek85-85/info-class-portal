import { fail, guard, ok } from "@/lib/api";
import { listMoodEntriesByStudent, listReflectionsByStudent, listAllSessions } from "@/lib/db";
import { getMood } from "@/lib/mood";
import { readStudentSession } from "@/lib/session";
import { hasAnswer } from "@/lib/types";

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
      .filter((row) => hasAnswer(row))
      .map((row) => {
        const session = sessionById.get(row.sessionId);
        const mood = moodBySession.get(row.sessionId);
        const questions = session?.reflectionQuestions ?? [];

        return {
          date: row.date,
          lessonNo: session?.lessonNo ?? null,
          title: session?.title ?? "",
          // 질문과 답을 짝지어 보낸다. 세션 스냅샷 덕분에 그날 실제로 받은 질문이 남아 있다.
          entries: row.answers
            .map((answer, index) => ({ question: questions[index] ?? "", answer }))
            .filter((entry) => entry.answer.trim()),
          moodLabel: mood ? (getMood(mood.mood)?.label ?? "") : "",
          updatedAt: row.updatedAt,
        };
      });

    return ok({ items });
  });
}
