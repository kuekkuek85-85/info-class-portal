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
      /*
       * 성찰 공개 여부도 얹는다. 세션 문서에 이미 들어 있어 추가 조회가 없다.
       *
       * 친구들 글 자체를 여기서 보내지는 않는다. 그러려면 성찰 문서를 매번 다 읽어야 하는데,
       * 4초마다 28명이 28건씩 읽으면 분당 만 건이 넘는다 (PRD 10장 D2). 이 값이 바뀌는
       * 순간에만 화면이 수업 내용을 한 번 다시 받아 간다.
       */
      reflectionPublic: session.reflectionPublic,
      // 지나온 단계로 되돌아갈 수 있는가. 세션 문서에 이미 있는 값이라 추가 조회가 없다.
      freeNavigation: session.freeNavigation ?? false,
      // 이 차시에서만 이탈을 세지 않는 단계 — 화면 쪽에서 1차로 거른다
      focusExempt: session.focusExempt ?? [],
    });
  });
}
