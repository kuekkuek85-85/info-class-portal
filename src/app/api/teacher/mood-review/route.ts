import { fail, guard, ok, readJson } from "@/lib/api";
import { listMoodEntries, markMoodReviewed } from "@/lib/db";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";

/**
 * 감정 응답 확인 처리 (PRD 5.4).
 *
 * 교사는 매 수업 종료 후 그날 감정 응답을 확인한다. 확인 여부를 기록해 두어야
 * "받아두고 보지 않는" 상태를 화면에서 추적할 수 있다.
 */
export async function POST(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<{ sessionId?: string; studentIds?: string[]; all?: boolean }>(
      request,
    );
    if (!body?.sessionId) return fail("invalid_input");

    let studentIds = body.studentIds ?? [];
    if (body.all) {
      const entries = await listMoodEntries(body.sessionId);
      studentIds = entries.map((entry) => entry.studentId);
    }
    if (studentIds.length === 0) return ok({ reviewed: 0 });

    await markMoodReviewed(body.sessionId, studentIds);
    return ok({ reviewed: studentIds.length });
  });
}
