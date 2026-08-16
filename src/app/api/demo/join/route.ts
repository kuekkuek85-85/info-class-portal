import { fail, guard, ok } from "@/lib/api";
import { todayKST } from "@/lib/datetime";
import { claimDemoSeat, getSession, isSessionClosed, listSessionsByDate } from "@/lib/db";
import { createStudentSession, readStudentSession } from "@/lib/session";
import { MAX_CLASS_NO, TEMPORARY_NUMBER_MIN } from "@/lib/student-id";
import type { ClassNo } from "@/lib/types";

/**
 * 교사 연수 시연 참가 — 코드도 학번도 묻지 않는다.
 *
 * 스무 명에게 번호를 불러 주면 반드시 겹친다. 겹치면 한 문서에 둘이 써서 그림이 서로
 * 덮이고, 시연이 그 자리에서 무너진다. 그래서 **서버가 빈 번호를 하나씩 배정**한다.
 *
 * 시연용 수업은 리허설로 만든다. 진짜 학생 기록과 완전히 분리된다 (types.ts 의 demo 참조).
 */

/** 자리 후보 — 이 수업 반부터, 모자라면 다른 반 임시 번호까지 끌어 쓴다 */
function seatCandidates(classNo: ClassNo): string[] {
  const order: number[] = [classNo];
  for (let c = 1; c <= MAX_CLASS_NO; c += 1) if (c !== classNo) order.push(c);

  const seats: string[] = [];
  for (const c of order) {
    for (let n = TEMPORARY_NUMBER_MIN; n <= 99; n += 1) {
      seats.push(`1${String(c).padStart(2, "0")}${n}`);
    }
  }
  return seats;
}

export async function POST() {
  return guard(async () => {
    /*
     * 이미 참가한 사람이 새로고침한 경우 자리를 새로 잡지 않는다.
     * 그냥 두면 한 사람이 화면을 몇 번 새로 열 때마다 자리가 하나씩 사라진다.
     */
    const me = await readStudentSession();
    if (me) {
      const current = await getSession(me.sessionId);
      if (current?.demo && !isSessionClosed(current)) {
        return ok({ studentId: me.studentId, rejoined: true });
      }
    }

    const sessions = await listSessionsByDate(todayKST());
    const session = sessions.find((item) => item.demo && !isSessionClosed(item));
    if (!session) {
      return fail("not_found", "지금은 시연용 수업이 열려 있지 않아요.");
    }

    const studentId = await claimDemoSeat(session, seatCandidates(session.classNo));
    if (!studentId) {
      return fail("too_many_attempts", "시연 자리가 가득 찼어요. 선생님께 알려 주세요.");
    }

    await createStudentSession({
      studentId,
      name: "",
      // 출석·그림에 적히는 반은 수업 기준으로 통일한다 — 그래야 작품 감상에서 서로 다 보인다
      classNo: session.classNo,
      sessionId: session.id,
      temporary: true,
    });

    return ok({ studentId });
  });
}
