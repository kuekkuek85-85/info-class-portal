import { fail, guard, ok } from "@/lib/api";
import { getSession } from "@/lib/db";
import { getOrBuildReview } from "@/lib/review-data";
import { readStudentSession } from "@/lib/session";

/**
 * 지난 차시 복습 — 기분 체크를 마친 학생 화면에 이어서 뜬다.
 *
 * 만드는 일은 review-data.ts 가 한다. 교사 공유 화면(/api/teacher/review)도 같은
 * 함수를 쓰므로, 학생이 보는 그림·문장·문항과 교사가 짚는 것이 늘 같다.
 */
export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const review = await getOrBuildReview(session);

    /*
     * 교사용 한 줄은 빼고 보낸다.
     * "절반 넘게 틀렸습니다" 같은 말은 교사가 읽고 짚을 말이지, 학생 화면에 뜰 말이 아니다.
     */
    return ok({ review: review ? { ...review, summary: undefined } : null });
  });
}
