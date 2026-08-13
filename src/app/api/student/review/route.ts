import { fail, guard, ok } from "@/lib/api";
import {
  getSession,
  listArtifacts,
  listQuizAnswers,
  listReflections,
  listSessionsByClass,
  updateSession,
} from "@/lib/db";
import {
  buildSummary,
  findPreviousSession,
  hardestQuestion,
  pickDrawings,
  pickQuotes,
  worthReasking,
  type Review,
} from "@/lib/review";
import { readStudentSession } from "@/lib/session";

/**
 * 지난 차시 복습 — 기분 체크를 마친 학생 화면에 이어서 뜬다.
 *
 * **한 번 만들고 세션에 저장해 둔다.**
 * 이 화면 하나를 만들려면 지난 차시의 그림·성찰·퀴즈 응답을 모두 읽어야 한다. 한 반이면
 * 70건이 넘는데, 28명이 각자 읽으면 수업 한 번에 2천 건이다. 무료 한도(하루 5만)를
 * 며칠이면 태운다 (PRD 10장 D2).
 *
 * 그래서 **먼저 들어온 학생 한 명이 만들고, 나머지는 그것을 그대로 받는다.** 지난 시간
 * 기록은 이미 끝난 것이라 도중에 바뀌지 않으므로 캐시가 낡을 일이 없다.
 */
export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    // 이미 만들어 둔 것이 있으면 그대로 (null 로 저장된 경우 = 지난 차시가 없다)
    if (session.reviewCache !== undefined) {
      return ok({ review: session.reviewCache });
    }

    const review = await buildReview(session);
    // 없으면 null 로 저장한다 — 없다는 사실도 캐시해야 매번 다시 뒤지지 않는다
    await updateSession(session.id, { reviewCache: review });

    return ok({ review });
  });
}

async function buildReview(session: {
  id: string;
  classNo: 1 | 2 | 3 | 4;
  lessonNo: number;
}): Promise<Review | null> {
  // 1차시는 지난 차시가 없다
  if (session.lessonNo <= 1) return null;

  const all = await listSessionsByClass(session.classNo);
  const previous = findPreviousSession(all, session as never);
  if (!previous) return null;

  const [reflections, quizAnswers] = await Promise.all([
    listReflections(previous.id),
    listQuizAnswers(previous.id),
  ]);

  // 지난 차시에 그리기 활동이 없었으면 그림은 건너뛴다 (1차시가 그렇다)
  const activityId = previous.activity?.activityId;
  const artifacts = activityId ? await listArtifacts(activityId, previous.classNo) : [];

  const drawings = pickDrawings(artifacts);
  const quotes = pickQuotes(reflections);
  const worst = hardestQuestion(previous, quizAnswers);
  // 잘 맞힌 반에게는 다시 묻지 않는다. 교사 요약에는 그 사실이 그대로 들어간다.
  const question = worthReasking(worst) ? worst : null;

  // 셋 다 비었으면 보여줄 것이 없다 — 빈 화면을 띄우느니 건너뛴다
  if (drawings.length === 0 && quotes.length === 0 && !question) return null;

  return {
    lessonNo: previous.lessonNo,
    title: previous.title,
    drawings,
    quotes,
    question,
    summary: buildSummary(previous, drawings, worst, quotes.length),
  };
}
