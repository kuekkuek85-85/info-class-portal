import { fail, guard, ok } from "@/lib/api";
import { getSession, listQuizAnswers } from "@/lib/db";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import { quizAnswersOf } from "@/lib/types";

/**
 * 문항별 응답 분포.
 *
 * **자동 폴링에 얹지 않는다.** 대시보드는 이미 5초마다 출석·감정·성찰·명렬표를 다시 읽고
 * 있어서 무료 읽기 한도가 빠듯하다 (PRD 10장 D2). 분포는 교사가 "지금 몇 명이 골랐지?"를
 * 궁금해할 때만 필요하므로 새로고침 버튼으로 부른다.
 *
 * 이름·학번은 내려보내지 않는다. 누가 틀렸는지를 교실 앞에서 보여줄 일은 없고,
 * 그럴 화면이 아예 없어야 실수로 뜨지 않는다.
 */
export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (!sessionId) return fail("invalid_input");

    const session = await getSession(sessionId);
    if (!session) return fail("not_found");

    const questions = session.quiz?.questions ?? [];
    if (questions.length === 0) return ok({ questions: [], responded: 0 });

    const rows = await listQuizAnswers(sessionId);

    const stats = questions.map((question, index) => {
      const counts = question.choices.map(() => 0);
      let answered = 0;

      for (const row of rows) {
        const choice = quizAnswersOf(row)[index];
        if (choice === undefined || choice < 0 || choice >= counts.length) continue;
        counts[choice] += 1;
        answered += 1;
      }

      return {
        prompt: question.prompt,
        choices: question.choices,
        answerIndex: question.answerIndex,
        counts,
        answered,
        correct: counts[question.answerIndex] ?? 0,
      };
    });

    return ok({ questions: stats, responded: rows.length });
  });
}
