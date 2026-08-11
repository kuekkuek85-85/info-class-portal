import { fail, guard, ok } from "@/lib/api";
import { getSessionCached, isSessionClosed } from "@/lib/db";
import { quizView } from "@/lib/quiz";
import { readStudentSession } from "@/lib/session";

/**
 * 지금 어느 단계인지만 돌려주는 경량 엔드포인트.
 *
 * 학생 화면은 교사가 단계를 넘기는 것을 따라가야 해서 짧은 주기로 물어본다. 수업 내용을 통째로
 * 다시 내려주면 28명 × 30분치 트래픽이 그대로 낭비된다. 여기서는 단계와 종료 여부만 본다.
 *
 * 퀴즈 진행 상태(문항 번호·정답 공개)도 여기에 얹었다. 세션 문서에 들어 있어 이미 읽고 있는
 * 값이라 추가 조회가 없다 — 퀴즈용 폴링을 따로 만들면 28명짜리 읽기가 하나 더 생긴다
 * (PRD 10장 D2 "새 폴링을 만들지 않는다").
 */
export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSessionCached(me.sessionId);
    if (!session) return fail("session_expired");

    return ok({
      phase: session.phase,
      closed: isSessionClosed(session),
      quiz: quizView(session),
    });
  });
}
