import { deviceKey, fail, guard, ok, rateLimit, readJson } from "@/lib/api";
import { getSession, isSessionClosed, recordQuizAnswer } from "@/lib/db";
import { readStudentSession } from "@/lib/session";

/**
 * 타임머신 퀴즈 응답.
 *
 * 한 번 고른 문항은 바꿀 수 없다. 정답이 공개된 뒤 슬쩍 고쳐서 맞힌 것으로 만들면
 * 응답 분포가 무의미해지고, 교사가 "몇 명이 헷갈렸는지"를 볼 수 없게 된다.
 * 잠금은 화면이 아니라 서버(recordQuizAnswer)에서 건다 — 화면만 막으면 우회된다.
 */
export async function POST(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    // 28명이 동시에 누르는 화면이라 넉넉하게. 문항 4개면 정상 사용은 4회다.
    if (!rateLimit(await deviceKey("quiz"), 40, 60_000)) {
      return fail("too_many_attempts");
    }

    const body = await readJson<{ questionIndex?: number; choiceIndex?: number }>(request);
    const questionIndex = Number(body?.questionIndex);
    const choiceIndex = Number(body?.choiceIndex);

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");
    if (isSessionClosed(session)) {
      return fail("session_expired", "수업이 끝나서 저장할 수 없어요.");
    }

    const questions = session.quiz?.questions ?? [];
    if (questions.length === 0) return fail("invalid_input", "이 차시에는 퀴즈가 없어요.");

    if (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= questions.length) {
      return fail("invalid_input");
    }
    const choices = questions[questionIndex].choices ?? [];
    if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= choices.length) {
      return fail("invalid_input");
    }

    /*
     * 교사가 아직 열지 않은 문항에는 답할 수 없다.
     * 문항 목록은 처음에 통째로 내려가므로, 이 검사가 없으면 3번 문항이 화면에 뜨기 전에
     * 미리 답을 넣어 둘 수 있다. 다 같이 같은 문항을 보는 것이 이 활동의 전부다.
     */
    const openIndex = session.quizIndex ?? 0;
    if (questionIndex > openIndex) {
      return fail("invalid_input", "아직 열리지 않은 문제예요.");
    }

    const recorded = await recordQuizAnswer(
      {
        sessionId: session.id,
        studentId: me.studentId,
        classNo: session.classNo,
        date: session.date,
      },
      questionIndex,
      choiceIndex,
      questions.length,
    );

    // 이미 답한 문항이면 조용히 성공으로 돌려준다. 화면은 이미 잠겨 있고,
    // 여기서 오류를 띄우면 학생은 뭘 잘못했는지 모른 채 빨간 글씨만 본다.
    return ok({ recorded });
  });
}
