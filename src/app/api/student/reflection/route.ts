import { fail, guard, ok, readJson } from "@/lib/api";
import { getSession, upsertReflection } from "@/lib/db";
import { readStudentSession } from "@/lib/session";

const MAX_CONTENT_LENGTH = 1000;

/**
 * 한 줄 성찰 저장.
 *
 * `draft: true`는 입력 중 자동 임시저장이다. 30분 수업의 마지막 활동이라 종이 울려
 * 미완성 상태로 태블릿을 반납해도 쓰던 내용이 남아야 한다 (PRD 3.4).
 */
export async function PUT(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const body = await readJson<{ content?: string; draft?: boolean }>(request);
    if (typeof body?.content !== "string") return fail("invalid_input");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");
    // 교시가 끝난 뒤에는 기록을 바꿀 수 없다. 코드 만료와 같은 시점이다 (PRD 8).
    if (session.status === "ended") {
      return fail("session_expired", "수업이 끝나서 저장할 수 없어요.");
    }

    const saved = await upsertReflection({
      studentId: me.studentId,
      sessionId: session.id,
      classNo: session.classNo,
      date: session.date,
      content: body.content.slice(0, MAX_CONTENT_LENGTH),
      draft: body.draft !== false,
    });

    return ok({ draft: saved.draft, updatedAt: saved.updatedAt });
  });
}
