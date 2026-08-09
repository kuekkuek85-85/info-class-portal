import { clientKey, fail, guard, ok, rateLimit, readJson } from "@/lib/api";
import { findSessionByCode, setSessionStatus } from "@/lib/db";
import { createCodeToken } from "@/lib/session";

/**
 * ① 수업 코드 (숫자 2자리)
 *
 * 코드를 먼저 받는 이유: 학번이 규칙적(10101)이라 학번을 먼저 받으면 아무 숫자나 넣어
 * 이름을 조회할 수 있다. 코드가 앞에 있으면 그 교실에 있는 학생만 이름 확인 화면에 도달한다.
 * (PRD 3.1)
 */
export async function POST(request: Request) {
  return guard(async () => {
    if (!rateLimit(clientKey(request, "code"), 30, 60_000)) {
      return fail("too_many_attempts");
    }

    const body = await readJson<{ code?: string }>(request);
    const code = body?.code?.trim();
    if (!code || !/^\d{2}$/.test(code)) {
      return fail("invalid_input", "수업 코드는 숫자 2자리예요.");
    }

    const session = await findSessionByCode(code);
    if (!session) return fail("code_not_found");

    // 첫 학생이 들어오는 순간 세션을 시작 상태로 바꾼다. 스냅샷은 생성 시점에 이미 고정되어 있다.
    if (session.status === "scheduled") {
      await setSessionStatus(session.id, "active");
    }

    await createCodeToken({ sessionId: session.id, classNo: session.classNo });

    return ok({
      classNo: session.classNo,
      lessonNo: session.lessonNo,
      title: session.title,
      period: session.period,
    });
  });
}
