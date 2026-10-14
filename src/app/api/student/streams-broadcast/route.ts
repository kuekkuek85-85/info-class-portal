import { fail, guard, ok, readJson } from "@/lib/api";
import {
  autofillStreamsBoard,
  getStreamsBoard,
  getStreamsMatch,
  isSessionClosed,
  getSession,
  placeStreamsCard,
} from "@/lib/db";
import { readStudentSession } from "@/lib/session";
import { BOARD_SIZE, emptyBoard, scoreBoard } from "@/lib/streams";

/**
 * STREAMS 동기화 개인전 — 학생용. GET 은 공유 매치 + 내 판(폴링), POST 는 배치/타임아웃 자동배치.
 *
 * ## 프라이버시
 *
 * 보드·점수·학번만 다룬다 — 감정/마음일기(answers·갤러리)와 완전히 분리된 별도 컬렉션
 * (streamsMatches·streamsBoards)이다. Gemini 미사용. 아직 안 뽑은 뒷장은 응답에 싣지 않아
 * (drawn = 뽑힌 만큼만) 다음 카드가 새지 않는다.
 */

export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");
    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const match = await getStreamsMatch(session.id);
    if (!match) {
      return ok({ started: false });
    }

    const mine = await getStreamsBoard(session.id, me.studentId);
    const board = mine?.board ?? emptyBoard();
    const placed = mine?.placed ?? 0;

    return ok({
      started: true,
      status: match.status,
      drawCount: match.drawCount,
      // 뽑힌 숫자만 순서대로 — 아직 안 뽑은 뒷장은 숨긴다.
      drawn: match.deck.slice(0, match.drawCount),
      lastDrawAt: match.lastDrawAt,
      drawSeconds: match.drawSeconds,
      revealRank: match.revealRank,
      board,
      placed,
      boardSize: BOARD_SIZE,
      // 내 점수(실제) — 끝/발표 때 보여준다. 등수 집계도 이 실제 점수로 한다.
      myScore: scoreBoard(board).total,
    });
  });
}

export async function POST(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");
    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");
    if (isSessionClosed(session)) return fail("session_expired", "이 수업은 끝났어요.");

    const body = await readJson<{ slot?: number; autofill?: boolean }>(request);

    // 타임아웃 자동 배치 — 뽑혔지만 안 놓은 숫자를 빈 칸 맨 왼쪽부터 모두 채운다.
    if (body?.autofill) {
      const result = await autofillStreamsBoard({
        sessionId: session.id,
        studentId: me.studentId,
      });
      if (!result.ok) return fail("invalid_input", "지금은 배치할 수 없어요.");
      return ok({
        board: result.board?.board ?? emptyBoard(),
        placed: result.board?.placed ?? 0,
        placedNow: result.placedNow,
      });
    }

    // 수동 배치 — 값은 서버가 정한다(deck 순서). slot 만 받는다.
    const slot = Number(body?.slot);
    const result = await placeStreamsCard({ sessionId: session.id, studentId: me.studentId, slot });
    if (!result.ok) {
      const message =
        result.reason === "no_card"
          ? "아직 뽑힌 숫자가 없어요. 선생님이 뽑을 때까지 기다려요."
          : result.reason === "occupied"
            ? "그 칸에는 이미 숫자가 있어요. 빈 칸을 눌러요."
            : result.reason === "no_match"
              ? "아직 게임이 시작되지 않았어요."
              : "배치하지 못했어요. 다시 해 주세요.";
      return fail("invalid_input", message);
    }
    return ok({
      board: result.board?.board ?? emptyBoard(),
      placed: result.board?.placed ?? 0,
    });
  });
}
