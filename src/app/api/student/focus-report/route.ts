import { deviceKey, fail, guard, ok, rateLimit, readJson } from "@/lib/api";
import { addAwayEpisode, getSessionCached, isSessionClosed } from "@/lib/db";
import { readStudentSession } from "@/lib/session";
import { AWAY_MIN_MS, countsFocus } from "@/lib/types";

/**
 * 이탈 에피소드 보고 — 학생이 화면으로 **돌아온 순간** 한 번 들어온다.
 *
 * 클라이언트가 이미 10초 필터와 제외 단계 필터를 거치지만, 여기서 한 번 더 본다.
 * 요청은 학생이 직접 만들어 보낼 수도 있는 것이라 클라이언트 값만 믿을 수 없다.
 *
 * 새 컬렉션을 만들지 않고 출석 문서에 누적한다 — 대시보드 읽기가 늘지 않는다 (PRD 10장 D2).
 */

/** 한 수업에서 이 이상은 이탈로 세지 않는다. 조작된 초대형 값이 통계를 무너뜨리지 않게 */
const AWAY_MAX_MS = 45 * 60_000;

export async function POST(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    /*
     * 분당 10회.
     *
     * 10초 필터가 1차, 이 제한이 2차다. 화면을 빠르게 껐다 켰다 반복하는 장난은
     * 반드시 나온다(중1이다). 그것이 쓰기 폭주로 이어지지 않게 막는다.
     */
    if (!rateLimit(await deviceKey("focus"), 10, 60_000)) {
      return fail("too_many_attempts");
    }

    const session = await getSessionCached(me.sessionId);
    if (!session) return fail("session_expired");
    if (isSessionClosed(session)) return ok({ counted: false });

    // 서버가 아는 지금 단계로 다시 본다. 학생이 보낸 단계 값은 쓰지 않는다.
    if (!countsFocus(session.phase, session.focusExempt)) return ok({ counted: false });

    const body = await readJson<{ awayMs?: number; kind?: string }>(request);
    const raw = Number(body?.awayMs);
    if (!Number.isFinite(raw)) return fail("invalid_input");

    const awayMs = Math.round(Math.min(Math.max(raw, 0), AWAY_MAX_MS));
    if (awayMs < AWAY_MIN_MS) return ok({ counted: false });

    await addAwayEpisode(session.id, me.studentId, awayMs);

    return ok({ counted: true, awayMs });
  });
}
