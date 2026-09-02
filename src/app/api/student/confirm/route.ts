import { fail, guard, ok, readJson } from "@/lib/api";
import {
  carryOverSubmitStage,
  getSession,
  getStudent,
  isSessionClosed,
  recordAttendance,
  setSessionStatus,
  upsertStudents,
} from "@/lib/db";
import { activityIdFor } from "@/lib/gallery";
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

    // identify 와 마찬가지로 자동 만료를 여기서 다시 검사한다. 확인 팝업 앞에서 머무는 동안
    // 교시가 끝났다면 출석을 새로 기록해서는 안 된다.
    const session = await getSession(codeToken.sessionId);
    if (!session || isSessionClosed(session)) return fail("session_expired");
    // 반이 섞인 수업(선택과목)은 반 검사를 걸 수 없다 — identify 쪽 주석 참조
    if (!session.groupKey && parsed.classNo !== session.classNo) return fail("class_mismatch");

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

    // 실제 학생이 인증을 마친 시점에 수업을 시작 상태로 올린다. 이 시점부터 차시 계획을
    // 고쳐도 이 세션의 스냅샷은 바뀌지 않는다 (PRD 5.1).
    if (session.status === "scheduled") {
      await setSessionStatus(session.id, "active");
    }

    // 출석은 인증 완료 시각으로 확정한다. 감정 응답 여부는 출석 요건이 아니다 (PRD 3.3)
    await recordAttendance({
      studentId: parsed.studentId,
      sessionId: session.id,
      classNo: session.classNo,
      date: session.date,
      joinedAt: Date.now(),
    });

    /*
     * 지난 차시에서 이어지는 학생은 제출 단계를 물려받는다.
     *
     * 8차시는 7차시의 작품을 그대로 이어 쓴다. 이 줄이 없으면 7차시에 2차를 내고
     * 검토를 못 받은 학생이 오늘 교사의 대기 줄에 안 뜬다 — 학생 화면은 기다리는
     * 중인데 선생님 화면에는 아무도 없다 (db.ts 의 carryOverSubmitStage).
     *
     * 제출 칸이 없는 차시는 건너뛴다. 그런 차시에서는 옮겨 적을 단계 자체가 없다.
     */
    const activityId = activityIdFor(session);
    if (activityId && (session.activity?.worksheet ?? []).some((q) => q.kind === "submit")) {
      await carryOverSubmitStage(session.id, parsed.studentId, activityId);
    }

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
