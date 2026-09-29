"use client";

import { useState } from "react";

import {
  BOARD_SIZE,
  emptyBoard,
  JOKER,
  makeDeck,
  scoreBoard,
  segmentIndexOfSlot,
  shuffle,
  STREAM_SCORE_TABLE,
  type Slot,
  type Tile,
} from "@/lib/streams";

/**
 * STREAMS 개인전 — 클라이언트 자체 완결(서버·AI 불필요).
 *
 * 한 장씩 뽑아 빈 칸을 탭해 배치한다(놓으면 못 옮김). 20장 놓으면 자동 채점 — 오름차순 구간을
 * 색으로 묶고 점수를 합산해 보여준다. "다시 하기" 로 여러 판. 최고 점수만 answers 에 저장한다.
 *
 * ## 화면 (교사 요청)
 *  · 보드는 20칸을 **뱀처럼(ㄴ자) 이어지는 트랙**으로 — 줄마다 방향이 바뀐다. 칸 번호는 안 적고
 *    시작·끝만 표시. 빈 칸은 초록, 놓인 칸은 숫자.
 *  · 지금까지 **나온 숫자**를 순서대로 띠로 보여줘, 흐름을 따라가기 쉽게.
 *  · 점수표는 늘 띄우지 않고 **[점수표 보기] 버튼 → 팝업**으로 필요할 때 본다.
 */

interface Saved {
  bestScore: number;
  lastScore: number;
  plays: number;
}

interface GameState {
  deck: Tile[];
  board: Slot[];
  drawnIndex: number; // 지금까지 뽑은 장수 - 1 (currentTile 의 deck 위치)
  placed: number;
  finished: boolean;
}

function parse(raw: string): Saved | null {
  if (!raw.trim()) return null;
  try {
    const v = JSON.parse(raw) as Saved;
    return typeof v.bestScore === "number" ? v : null;
  } catch {
    return null;
  }
}

function freshGame(): GameState {
  const deck = shuffle(makeDeck());
  return { deck, board: emptyBoard(), drawnIndex: 0, placed: 0, finished: false };
}

/** 타일을 칸에 짧게 — 조커는 ★. */
function label(tile: Tile): string {
  return tile === JOKER ? "★" : String(tile);
}

/** 구간 색(길이 2 이상만). 확인된 팔레트 토큰만 쓴다. */
const SEGMENT_CLASSES = ["bg-lime", "bg-mint", "bg-lilac", "bg-pink", "bg-cream"];
/** 한 줄에 몇 칸. 줄마다 방향을 바꿔 뱀처럼 잇는다. */
const COLS = 5;

export function StreamsSolo({
  raw,
  onChange,
  disabled,
}: {
  questionKey: string;
  raw: string;
  onChange: (raw: string) => void;
  disabled?: boolean;
}) {
  const saved = parse(raw);
  const [game, setGame] = useState<GameState | null>(null);
  const [showTable, setShowTable] = useState(false);

  const currentTile: Tile | null =
    game && !game.finished ? (game.deck[game.drawnIndex] ?? null) : null;
  const scored = game ? scoreBoard(game.board) : { segments: [], total: 0 };
  // 지금까지 나온 숫자(뽑은 순서). 진행 중이면 마지막이 '이번 숫자'.
  const drawn = game ? game.deck.slice(0, game.drawnIndex + (game.finished ? 0 : 1)) : [];

  function start() {
    if (disabled) return;
    setGame(freshGame());
  }

  function placeAt(slot: number) {
    if (disabled || !game || game.finished) return;
    if (game.board[slot] !== null) return; // 이미 놓인 칸 — 못 옮김
    const tile = game.deck[game.drawnIndex];
    if (tile === undefined) return;

    const board = game.board.slice();
    board[slot] = tile;
    const placed = game.placed + 1;
    const finished = placed >= BOARD_SIZE;
    const next: GameState = { ...game, board, placed, drawnIndex: game.drawnIndex + 1, finished };
    setGame(next);

    if (finished) {
      const total = scoreBoard(board).total;
      const prev = parse(raw);
      const result: Saved = {
        bestScore: Math.max(total, prev?.bestScore ?? 0),
        lastScore: total,
        plays: (prev?.plays ?? 0) + 1,
      };
      onChange(JSON.stringify(result));
    }
  }

  const rows = Math.ceil(BOARD_SIZE / COLS);

  return (
    <div className="flex flex-col gap-3">
      {/* 상단 바 — 점수표 버튼 + 점수/진행 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowTable(true)}
          className="pill pill-secondary"
        >
          📋 점수표 보기
        </button>
        {game && (
          <p className="t-body font-bold">
            점수 {scored.total}점 · {game.placed}/{BOARD_SIZE}칸
          </p>
        )}
      </div>
      {saved && (
        <p className="t-caption">
          최고 {saved.bestScore}점 · 지난 {saved.lastScore}점 · {saved.plays}판
        </p>
      )}

      {!game ? (
        <>
          <div className="rounded-lg border border-line bg-cream px-3 py-2 t-body-sm">
            뽑힌 숫자를 빈 칸에 놓아요(한 번 놓으면 못 옮겨요). <b>시작 → 끝</b> 방향으로 숫자가 같거나
            커지면 한 줄기로 이어지고, 길수록 점수가 확 커져요. 조커(★)는 아무 데나 이어 주는 만능이에요.
          </div>
          <button
            type="button"
            onClick={start}
            disabled={disabled}
            className="pill pill-primary pill-block py-3 disabled:opacity-60"
          >
            게임 시작
          </button>
        </>
      ) : (
        <>
          {/* 이번 숫자 + 나온 순서 */}
          {game.finished ? (
            <p className="t-body font-bold">완성! 총점 {scored.total}점</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <p className="t-body">
                이번 숫자
                <span className="mx-1 inline-flex min-w-10 items-center justify-center rounded-lg border-2 border-ink bg-canvas px-2 py-1 text-lg font-bold">
                  {currentTile === null ? "-" : label(currentTile)}
                </span>
                <span className="t-caption text-muted">→ 놓을 초록 칸을 눌러요</span>
              </p>
              {drawn.length > 1 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  <span className="t-caption text-muted shrink-0">나온 순서</span>
                  {drawn.map((t, i) => (
                    <span
                      key={i}
                      className={`shrink-0 rounded border px-1.5 py-0.5 t-caption ${
                        i === drawn.length - 1
                          ? "border-2 border-ink font-bold"
                          : "border-line text-muted"
                      }`}
                    >
                      {label(t)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 뱀(ㄴ) 트랙 — 줄마다 방향이 바뀌며 이어진다. 칸 번호 없음, 시작·끝만 표시 */}
          <div className="flex flex-col gap-1">
            {Array.from({ length: rows }).map((_, r) => {
              const cells = game.board
                .slice(r * COLS, r * COLS + COLS)
                .map((slot, c) => ({ slot, index: r * COLS + c }));
              // 홀수 줄은 오른→왼으로 그려, 이어지는 뱀 트랙이 되게 한다
              const ordered = r % 2 === 1 ? [...cells].reverse() : cells;
              return (
                <div key={r} className="flex gap-1">
                  {ordered.map(({ slot, index }) => {
                    const empty = slot === null;
                    const canPlace = !game.finished && empty && !disabled;
                    const segIndex = game.finished
                      ? segmentIndexOfSlot(scored.segments, index)
                      : -1;
                    const seg = segIndex >= 0 ? scored.segments[segIndex] : null;
                    const colored = !!seg && seg.length >= 2;
                    const isStart = index === 0;
                    const isEnd = index === BOARD_SIZE - 1;
                    const bg = colored
                      ? SEGMENT_CLASSES[segIndex % SEGMENT_CLASSES.length]
                      : empty
                        ? "bg-lime"
                        : "bg-cream";
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => placeAt(index)}
                        disabled={!canPlace}
                        aria-label={isStart ? "시작 칸" : isEnd ? "끝 칸" : "빈 칸"}
                        className={`relative flex aspect-square flex-1 items-center justify-center rounded-lg border-2 ${
                          canPlace ? "border-ink" : "border-line"
                        } ${bg}`}
                      >
                        {(isStart || isEnd) && (
                          <span className="absolute left-0 top-0 rounded-br rounded-tl bg-ink px-1 py-0.5 text-[10px] font-bold leading-none text-canvas">
                            {isStart ? "시작" : "끝"}
                          </span>
                        )}
                        <span className="text-lg font-bold">{empty ? "" : label(slot)}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {game.finished && (
            <div className="rounded-lg border-2 border-ink bg-canvas p-3">
              <p className="t-body font-bold">총점 {scored.total}점</p>
              <p className="mt-1 t-body-sm">
                이어진 줄기 {scored.segments.filter((s) => s.length >= 2).length}개 —{" "}
                {scored.segments
                  .filter((s) => s.length >= 2)
                  .map((s) => `${s.length}칸(${s.score}점)`)
                  .join(" · ") || "없음"}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={start}
            disabled={disabled}
            className="pill pill-secondary self-start disabled:opacity-60"
          >
            {game.finished ? "다시 하기" : "새 판으로 다시"}
          </button>
        </>
      )}

      {/* 점수표 팝업 — 필요할 때만 본다 */}
      {showTable && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowTable(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-xs overflow-auto rounded-xl bg-canvas p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="t-body font-bold">점수표</h3>
              <button
                type="button"
                onClick={() => setShowTable(false)}
                className="pill pill-secondary"
              >
                닫기
              </button>
            </div>
            <p className="mt-1 t-caption text-muted">이어진 칸 수(연속)가 길수록 점수가 커져요.</p>
            <table className="mt-2 w-full border-collapse text-center t-body-sm">
              <thead>
                <tr className="bg-cream">
                  <th className="border border-line py-1">연속</th>
                  <th className="border border-line py-1">점수</th>
                </tr>
              </thead>
              <tbody>
                {STREAM_SCORE_TABLE.map((s, len) =>
                  len >= 2 ? (
                    <tr key={len}>
                      <td className="border border-line py-0.5">{len}칸</td>
                      <td className="border border-line py-0.5 font-semibold">+{s}</td>
                    </tr>
                  ) : null,
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
