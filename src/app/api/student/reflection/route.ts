import { fail, guard, ok, readJson } from "@/lib/api";
import { getSession, isSessionClosed, upsertReflection } from "@/lib/db";
import { readStudentSession } from "@/lib/session";

const MAX_ANSWER_LENGTH = 1000;

/**
 * 성찰 저장. 질문마다 답이 따로 있다.
 *
 * `draft: true`는 입력 중 자동 임시저장이다. 30분 수업의 마지막 활동이라 종이 울려
 * 미완성 상태로 태블릿을 반납해도 쓰던 내용이 남아야 한다 (PRD 3.4).
 */
export async function PUT(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const body = await readJson<{ answers?: unknown[]; draft?: boolean }>(request);
    const given = body?.answers;
    if (!Array.isArray(given)) return fail("invalid_input");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");
    // 교시가 끝난 뒤에는 기록을 바꿀 수 없다. 코드 만료와 같은 시점이다 (PRD 8).
    if (isSessionClosed(session)) {
      return fail("session_expired", "수업이 끝나서 저장할 수 없어요.");
    }

    // 질문 수만큼만 받는다. 클라이언트가 보낸 배열 길이를 그대로 믿지 않는다.
    const questionCount = (session.reflectionQuestions ?? []).length;
    const answers = Array.from({ length: questionCount }, (_, index) => {
      const value = given[index];
      return typeof value === "string" ? value.slice(0, MAX_ANSWER_LENGTH) : "";
    });

    const saved = await upsertReflection({
      studentId: me.studentId,
      sessionId: session.id,
      classNo: session.classNo,
      date: session.date,
      answers,
      draft: body?.draft !== false,
    });

    return ok({ draft: saved.draft, updatedAt: saved.updatedAt });
  });
}
