import { fail, guard, ok } from "@/lib/api";
import { getSession } from "@/lib/db";
import { getOrBuildReview } from "@/lib/review-data";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";

/**
 * 교실 앞 화면에 띄우는 지난 차시 복습.
 *
 * 학생 화면과 **같은 것**을 본다 (review-data.ts 를 함께 쓴다). 학생 태블릿의 그림과
 * 앞 화면의 그림이 다르면 "지금 무슨 얘기지?"가 된다.
 *
 * 다른 점은 하나 — 여기서는 교사용 한 줄(summary)을 함께 내려보낸다. 학생만 혼자
 * 복습하고 끝나면 남는 것이 없다. 교사가 그 한 줄을 읽고 자기 말로 짚어 줘야 한다.
 */
export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (!sessionId) return fail("invalid_input");

    const session = await getSession(sessionId);
    if (!session) return fail("not_found");

    return ok({ review: await getOrBuildReview(session) });
  });
}
