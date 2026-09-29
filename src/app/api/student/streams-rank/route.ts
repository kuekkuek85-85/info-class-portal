import { fail, guard, ok } from "@/lib/api";
import { getSession, listArtifacts, listRoster } from "@/lib/db";
import { activityIdFor } from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";
import type { WorksheetQuestion } from "@/lib/types";

/**
 * 학생용 — STREAMS 개인전 순위(리더보드).
 *
 * 각 학생이 낸 **최고 점수**(streams_solo 문항 답의 bestScore)를 이 분반 안에서 모아 높은 순으로
 * 돌려준다. 게임 점수는 비민감 정보라 이름과 함께 보여준다(감정 글이 아니라 게임 기록이다).
 * 학생은 여러 번 플레이할 수 있고, 최고 점수가 갱신되면 순위도 바뀐다. "순위 보기" 버튼이 연다.
 */
export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const streamsKey = (session.activity?.worksheet ?? []).find(
      (q: WorksheetQuestion) => q.kind === "streams_solo",
    )?.key;
    const activityId = activityIdFor(session);
    if (!streamsKey || !activityId) return ok({ ranks: [], myRank: null, total: 0 });

    const [artifacts, roster] = await Promise.all([
      listArtifacts(activityId, session.classNo),
      listRoster(session),
    ]);
    const nameOf = new Map(roster.map((s) => [s.studentId, s.name]));

    const rows: { studentId: string; name: string; score: number; plays: number }[] = [];
    for (const a of artifacts) {
      const raw = a.answers?.[streamsKey];
      if (!raw?.trim()) continue;
      try {
        const v = JSON.parse(raw) as { bestScore?: unknown; plays?: unknown };
        const score = typeof v.bestScore === "number" ? v.bestScore : 0;
        if (score <= 0) continue;
        rows.push({
          studentId: a.studentId,
          name: nameOf.get(a.studentId) ?? a.studentId,
          score,
          plays: typeof v.plays === "number" ? v.plays : 0,
        });
      } catch {
        // 깨진 JSON 은 순위에서 뺀다
      }
    }
    // 높은 점수부터. 같으면 이름 가나다순으로 순서를 고정한다.
    rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

    const myRank = rows.findIndex((r) => r.studentId === me.studentId);
    const ranks = rows.map((r, i) => ({
      rank: i + 1,
      name: r.name,
      score: r.score,
      plays: r.plays,
      me: r.studentId === me.studentId,
    }));

    return ok({ ranks, myRank: myRank >= 0 ? myRank + 1 : null, total: ranks.length });
  });
}
