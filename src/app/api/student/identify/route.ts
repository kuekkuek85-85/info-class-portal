import { clientKey, fail, guard, ok, rateLimit, readJson } from "@/lib/api";
import { getSession, getStudent } from "@/lib/db";
import { readCodeToken } from "@/lib/session";
import { describeStudentId, parseStudentId } from "@/lib/student-id";

/**
 * ② 학번 (숫자 5자리) → 확인 팝업에 띄울 이름을 돌려준다.
 *
 * 여기서는 세션을 만들지 않는다. 학생이 "아니에요"를 눌러 ②로 돌아갈 수 있어야 하고,
 * 확정은 /api/student/confirm 에서 다시 검증한 뒤 이뤄진다.
 */
export async function POST(request: Request) {
  return guard(async () => {
    if (!rateLimit(clientKey(request, "identify"), 60, 60_000)) {
      return fail("too_many_attempts");
    }

    // 코드 토큰이 없으면 학번 조회 자체를 막는다. 이것이 명렬표 열람의 1차 방어선이다.
    const codeToken = await readCodeToken();
    if (!codeToken) return fail("no_code_token");

    const body = await readJson<{ studentId?: string }>(request);
    const parsed = parseStudentId(body?.studentId ?? "");
    if (!parsed) {
      return fail("invalid_input", "학번은 숫자 5자리예요. 예) 10101");
    }

    const session = await getSession(codeToken.sessionId);
    if (!session || session.status === "ended") return fail("session_expired");

    // 반 불일치 차단 — 다른 반 코드를 알아내도 소용없게 만든다 (PRD 3.1)
    if (parsed.classNo !== session.classNo) {
      return fail(
        "class_mismatch",
        `이 코드는 ${session.classNo}반 수업이에요. 학번을 다시 확인해 주세요.`,
      );
    }

    // 명렬표에 없는 학생은 그 반 90번대 임시 번호로 이름 없이 통과시킨다.
    // 수업 흐름을 끊지 않는 것이 목적이고, 실제 학번 연결은 교사가 나중에 한다.
    if (parsed.temporary) {
      return ok({
        studentId: parsed.studentId,
        name: "",
        temporary: true,
        description: describeStudentId(parsed.studentId),
      });
    }

    const student = await getStudent(parsed.studentId);
    if (!student) return fail("student_not_found");

    return ok({
      studentId: student.studentId,
      name: student.name,
      temporary: false,
      description: describeStudentId(student.studentId),
    });
  });
}
