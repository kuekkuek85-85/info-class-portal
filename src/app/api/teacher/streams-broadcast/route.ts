import { fail, guard, ok, readJson } from "@/lib/api";
import {
  clearStreamsMatch,
  drawStreamsCard,
  getSession,
  getStreamsMatch,
  listStreamsBoards,
  setStreamsReveal,
  setStreamsRevealStep,
  setupStreamsMatch,
  studentNameMap,
} from "@/lib/db";
import { activityIdFor, displayName } from "@/lib/gallery";
import { BOARD_SIZE, scoreBoard } from "@/lib/streams";
import { DEFAULT_STREAMS_DRAW_SECONDS } from "@/lib/streams-broadcast";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import type { WorksheetQuestion } from "@/lib/types";

/**
 * STREAMS 동기화 개인전 — 교사용. GET 은 매치 상태 + 전원 판·점수(등수 발표용), POST 는 동작:
 *  · setup   — 공용 덱을 셔플해 새 매치를 연다(기존 매치·판을 지운다). drawSeconds 는 문항에서.
 *  · draw    — 다음 숫자 한 장을 뽑아 전원에게 보낸다(drawCount +1).
 *  · reveal  { reveal } — 등수 발표를 켜고 끈다.
 *  · reset   — 매치·전원 판을 완전히 지운다.
 *
 * 학번·이름은 등수 발표(학교 안 게임 기록)에 쓴다 — 감정 글이 아니다. Gemini 미사용.
 */

export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;
    const sessionId = (new URL(request.url).searchParams.get("sessionId") ?? "").trim();
    if (!sessionId) return fail("invalid_input");
    const session = await getSession(sessionId);
    if (!session) return fail("not_found");

    const match = await getStreamsMatch(sessionId);
    if (!match) {
      return ok({ started: false });
    }

    const boards = await listStreamsBoards(sessionId);
    const names = await studentNameMap(boards.map((b) => b.studentId));

    // 실제 점수(scoreBoard.total)로 순위를 매긴다 — 학생 자가 계산과 무관하게 공정하게.
    const ranked = boards
      .map((b) => ({
        studentId: b.studentId,
        name: displayName(names.get(b.studentId)),
        placed: b.placed,
        score: scoreBoard(b.board).total,
        board: b.board,
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

    return ok({
      started: true,
      status: match.status,
      drawCount: match.drawCount,
      boardSize: BOARD_SIZE,
      drawSeconds: match.drawSeconds,
      revealRank: match.revealRank,
      revealStep: match.revealStep ?? 0,
      // 뽑힌 숫자만(교사도 뒷장은 미리 안 보이게 — 공정한 라이브 진행).
      drawn: match.deck.slice(0, match.drawCount),
      boards: ranked,
    });
  });
}

export async function POST(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<{
      sessionId?: string;
      action?: string;
      reveal?: boolean;
      step?: number;
    }>(request);
    const sessionId = (body?.sessionId ?? "").trim();
    if (!sessionId) return fail("invalid_input");
    const session = await getSession(sessionId);
    if (!session) return fail("not_found");

    if (body?.action === "setup") {
      const activityId = activityIdFor(session);
      if (!activityId) return fail("invalid_input", "이 수업에는 활동이 없습니다.");
      const question = (session.activity?.worksheet ?? []).find(
        (q: WorksheetQuestion) => q.kind === "streams_broadcast",
      );
      const drawSeconds = Math.max(
        0,
        Math.floor(question?.streamsDrawSeconds ?? DEFAULT_STREAMS_DRAW_SECONDS),
      );
      const match = await setupStreamsMatch({
        sessionId,
        classNo: session.classNo,
        activityId,
        drawSeconds,
      });
      return ok({ started: true, drawSeconds: match.drawSeconds });
    }

    if (body?.action === "draw") {
      const result = await drawStreamsCard(sessionId);
      if (!result.ok) {
        const message =
          result.reason === "finished"
            ? "20장을 모두 뽑았어요. 등수를 발표해 보세요."
            : result.reason === "no_match"
              ? "먼저 ‘새 게임 시작’을 눌러 주세요."
              : "뽑지 못했어요. 다시 해 주세요.";
        return fail("invalid_input", message);
      }
      return ok({ drawCount: result.match?.drawCount, status: result.match?.status });
    }

    if (body?.action === "reveal") {
      const done = await setStreamsReveal(sessionId, body?.reveal === true);
      if (!done) return fail("invalid_input", "먼저 게임을 시작해 주세요.");
      return ok({ revealRank: body?.reveal === true });
    }

    if (body?.action === "revealStep") {
      const done = await setStreamsRevealStep(sessionId, Number(body?.step ?? 0));
      if (!done) return fail("invalid_input", "먼저 ‘등수 발표 시작’을 눌러 주세요.");
      return ok({ revealStep: Math.max(0, Math.min(3, Math.floor(Number(body?.step ?? 0)))) });
    }

    if (body?.action === "reset") {
      await clearStreamsMatch(sessionId);
      return ok({ started: false });
    }

    return fail("invalid_input", "모르는 동작입니다.");
  });
}
