import { fail, guard, ok } from "@/lib/api";
import { getSession } from "@/lib/db";
import { readStudentSession } from "@/lib/session";

/**
 * 학생용 — 「우리 학교 규칙」 완성 지면 읽기 (읽기 전용, 학급 공용).
 *
 * 교사가 「규칙 완성하기」로 만든 학급 공용 결과(session.rulesResult)를 그대로 돌려준다. 개인
 * 답이 아니라 공동체 산출물이라 모든 학생이 같은 표를 본다. 저자 신원은 애초에 없다.
 * rules_result 문항이 이 값을 폴링해 완성 지면을 그린다.
 */
export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    return ok({ result: session.rulesResult ?? null });
  });
}
