import {
  listArtifacts,
  listQuizAnswers,
  listReflections,
  listSessionsByClass,
  updateSession,
} from "./db";
import {
  buildSummary,
  findPreviousSession,
  hardestQuestion,
  pickDrawings,
  pickQuotes,
  worthReasking,
  type Review,
} from "./review";
import type { ClassSession } from "./types";

/**
 * 지난 차시 복습을 가져온다 — 없으면 만들어 세션에 넣어 둔다.
 *
 * **서버에서만 부른다.** 학생 화면과 교사 공유 화면이 같은 것을 봐야 하므로 두 라우트가
 * 이 함수 하나를 쓴다. 학생이 보는 그림·문장·문항과 교사가 짚는 것이 어긋나면
 * "지금 뭘 말하는 거지?"가 된다.
 *
 * 캐시를 두는 이유는 읽기 비용이다. 이 화면 하나에 지난 차시 기록 70건이 드는데,
 * 28명이 각자 읽으면 수업 한 번에 2천 건이다 (PRD 10장 D2). 지난 시간 기록은 이미
 * 끝난 것이라 도중에 바뀌지 않으므로 캐시가 낡을 일이 없다.
 */
export async function getOrBuildReview(session: ClassSession): Promise<Review | null> {
  if (session.reviewCache !== undefined) {
    return session.reviewCache as Review | null;
  }

  const review = await buildReview(session);
  // 없으면 null 로 저장한다 — 없다는 사실도 캐시해야 매번 다시 뒤지지 않는다
  await updateSession(session.id, { reviewCache: review });
  return review;
}

async function buildReview(session: ClassSession): Promise<Review | null> {
  // 1차시는 지난 차시가 없다
  if (session.lessonNo <= 1) return null;

  const all = await listSessionsByClass(session.classNo);
  const previous = findPreviousSession(all, session);
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
