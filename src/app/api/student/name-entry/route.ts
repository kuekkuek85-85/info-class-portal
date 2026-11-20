import { deviceKey, fail, guard, networkKey, ok, rateLimit, readJson } from "@/lib/api";
import {
  claimNamedSeat,
  getSession,
  isSessionClosed,
  recordAttendance,
  setAttendanceDisplayName,
} from "@/lib/db";
import { nameKey, normalizeName } from "@/lib/name-entry";
import { createStudentSession, readCodeToken } from "@/lib/session";

/**
 * 성함 입장 - 교사 연수처럼 세션에 nameEntry 가 켜진 수업에서만 쓴다.
 *
 * 수업 코드를 맞춘 뒤(코드 토큰) 학번 대신 성함을 받는다. 서버가 임시 자리 풀에서 자리를 배정하고
 * (같은 이름이면 같은 자리), 출석에 표시 이름을 얹은 뒤 학생 세션을 발급한다.
 *
 * 정규 수업은 여기 오지 않는다 - 세션에 nameEntry 가 없으면 거절하고, 학번 입장(identify·confirm)은
 * 이 파일과 무관하게 그대로다. 이름은 이 세션의 배정표(seatMaps)와 출석 문서에만 남고, 명렬표
 * (students)에는 쓰지 않는다.
 */
export async function POST(request: Request) {
  return guard(async () => {
    if (!rateLimit(await deviceKey("name-entry"), 15, 60_000)) {
      return fail("too_many_attempts");
    }
    if (!rateLimit(networkKey(request, "name-entry"), 600, 60_000)) {
      return fail("too_many_attempts");
    }

    const codeToken = await readCodeToken();
    if (!codeToken) return fail("no_code_token");

    const session = await getSession(codeToken.sessionId);
    if (!session || isSessionClosed(session)) return fail("session_expired");
    if (session.nameEntry !== true) {
      return fail("invalid_input", "이 수업은 학번으로 들어와요.");
    }

    const body = await readJson<{ name?: string }>(request);
    const name = normalizeName(body?.name);
    if (!name) return fail("invalid_input", "성함을 적어 주세요.");

    const pick = await claimNamedSeat(session.id, name, nameKey(name));
    if (pick.kind === "full") {
      return fail("too_many_attempts", "자리가 다 찼어요. 강사에게 알려 주세요.");
    }
    const studentId = pick.seat;

    // 시작 전 수업은 코드 단계에서 이미 걸러진다. 혹시 남아 있어도 정규 confirm 과 달리 여기서 시작시키지 않는다.
    await recordAttendance({
      studentId,
      sessionId: session.id,
      classNo: session.classNo,
      date: session.date,
      joinedAt: Date.now(),
    });
    await setAttendanceDisplayName(session.id, studentId, name);

    await createStudentSession({
      studentId,
      name,
      classNo: session.classNo,
      sessionId: session.id,
      temporary: true,
    });

    return ok({ studentId, name, rejoined: pick.kind === "existing" });
  });
}
