import { fail, guard, ok, readJson } from "@/lib/api";
import { getSession, getStudent, recordAttendance, upsertStudents } from "@/lib/db";
import { createStudentSession, readCodeToken } from "@/lib/session";
import { parseStudentId } from "@/lib/student-id";

/**
 * ③ 확인 팝업 "네, 맞아요" → 세션 발급 + 출석 기록
 *
 * ②의 응답을 신뢰하지 않고 코드 토큰·반 일치·명렬표를 여기서 다시 검증한다.
 * 클라이언트가 보낸 이름은 아예 쓰지 않고 서버가 조회한 값만 세션에 넣는다.
 */
export async function POST(request: Request) {
  return guard(async () => {
    const codeToken = await readCodeToken();
    if (!codeToken) return fail("no_code_token");

    const body = await readJson<{ studentId?: string }>(request);
    const parsed = parseStudentId(body?.studentId ?? "");
    if (!parsed) return fail("invalid_input");

    const session = await getSession(codeToken.sessionId);
    if (!session || session.status === "ended") return fail("session_expired");
    if (parsed.classNo !== session.classNo) return fail("class_mismatch");

    let name = "";
    if (parsed.temporary) {
      // 임시 학생도 명렬표에 흔적을 남겨 둔다. 교사 화면에서 실제 학번과 연결하기 위함이다.
      await upsertStudents([
        {
          studentId: parsed.studentId,
          name: "",
          classNo: parsed.classNo,
          number: parsed.number,
          temporary: true,
        },
      ]);
    } else {
      const student = await getStudent(parsed.studentId);
      if (!student) return fail("student_not_found");
      name = student.name;
    }

    // 출석은 인증 완료 시각으로 확정한다. 감정 응답 여부는 출석 요건이 아니다 (PRD 3.3)
    await recordAttendance({
      studentId: parsed.studentId,
      sessionId: session.id,
      classNo: session.classNo,
      date: session.date,
      joinedAt: Date.now(),
    });

    await createStudentSession({
      studentId: parsed.studentId,
      name,
      classNo: session.classNo,
      sessionId: session.id,
      temporary: parsed.temporary,
    });

    return ok({ studentId: parsed.studentId, name });
  });
}
