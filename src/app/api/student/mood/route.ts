import { fail, guard, ok, readJson } from "@/lib/api";
import { getSession, upsertMoodEntry } from "@/lib/db";
import { getMood } from "@/lib/mood";
import { readStudentSession } from "@/lib/session";

const MAX_REASON_LENGTH = 200;

/** 감정 체크 저장. 다시 제출하면 덮어쓴다 (마음이 바뀌면 고칠 수 있어야 한다). */
export async function POST(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const body = await readJson<{ mood?: string; reason?: string }>(request);
    const option = getMood(body?.mood ?? "");
    if (!option) return fail("invalid_input", "기분을 하나 골라 주세요.");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");
    // 교시가 끝난 뒤에는 기록을 바꿀 수 없다. 코드 만료와 같은 시점이다 (PRD 8).
    if (session.status === "ended") {
      return fail("session_expired", "수업이 끝나서 저장할 수 없어요.");
    }
    if (!session.moodCheckEnabled) {
      return fail("invalid_input", "이 차시에는 감정 체크가 없어요.");
    }

    await upsertMoodEntry({
      studentId: me.studentId,
      sessionId: session.id,
      classNo: session.classNo,
      date: session.date,
      mood: option.key,
      valence: option.valence,
      arousal: option.arousal,
      reason: (body?.reason ?? "").trim().slice(0, MAX_REASON_LENGTH),
    });

    return ok();
  });
}
