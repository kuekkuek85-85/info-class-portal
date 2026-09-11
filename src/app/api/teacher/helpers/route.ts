import { fail, guard, ok, readJson } from "@/lib/api";
import { getClassHelpers, getSession, saveClassHelpers } from "@/lib/db";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";

/**
 * 반별 도우미 명단 저장·조회 (12차 도우미 선발).
 *
 * 대시보드가 실시간 리더보드로 자동 top7 을 계산해 보여주고, 교사가 「도우미 확정」을
 * 누르면 그 순간의 학번 목록을 이 엔드포인트로 보내 반별 helpers 문서에 저장한다.
 * 이후 프로그래밍·피지컬 차시가 반 단위로 읽어 모둠 도우미로 세운다.
 *
 * 명단 수정(결석·판단 보정)은 후속이다 — 지금은 교사가 화면의 자동 top7 을 그대로
 * 확정하거나, 다시 눌러 최신 순위로 덮어쓰는 것까지다.
 */

/** 한 반 도우미 수의 안전 상한. 기본 선발은 7명이지만 여유를 둔다 */
const MAX_HELPERS = 12;

export async function POST(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<{ sessionId?: string; studentIds?: unknown }>(request);
    const sessionId = (body?.sessionId ?? "").trim();
    if (!sessionId) return fail("invalid_input");

    const studentIds = Array.isArray(body?.studentIds)
      ? body.studentIds
          .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          .map((s) => s.trim())
          .slice(0, MAX_HELPERS)
      : [];
    if (studentIds.length === 0) return fail("invalid_input", "저장할 도우미가 없습니다.");

    const session = await getSession(sessionId);
    if (!session) return fail("not_found");

    // 반 번호로 저장한다 — 이후 차시가 반 단위로 읽는다
    await saveClassHelpers(session.classNo, studentIds, sessionId);
    return ok({ classNo: session.classNo, count: studentIds.length });
  });
}

/** 확정된 반 도우미 명단 조회. classNo 쿼리로 받는다 */
export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const classNo = Number(new URL(request.url).searchParams.get("classNo"));
    if (!Number.isInteger(classNo)) return fail("invalid_input");

    const saved = await getClassHelpers(classNo);
    return ok({ helpers: saved });
  });
}
