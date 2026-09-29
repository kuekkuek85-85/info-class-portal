"use client";

import { useState } from "react";

import {
  BOARD_SIZE,
  emptyBoard,
  makeDeck,
  scoreBoard,
  segmentIndexOfSlot,
  shuffle,
  tileLabel,
  type Slot,
  type Tile,
} from "@/lib/streams";

/**
 * STREAMS 개인전 — 클라이언트 자체 완결(서버·AI 불필요).
 *
 * 한 장씩 뽑아 빈 칸을 탭해 배치한다(놓으면 못 옮김). 20장 놓으면 자동 채점 — 오름차순 구간을
 * 색으로 묶고 점수를 합산해 보여준다. "다시 하기" 로 여러 판. 최고 점수만 answers 에 저장한다.
 *
 * 보드는 20칸을 왼→오른쪽, 윗줄 다음 아랫줄 순서로 잇는다(모바일에서 한 줄 20칸은 넘쳐서
 * 그리드로 접는다 — 순서는 칸에 적힌 번호를 따른다).
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

/** 구간 색(길이 2 이상만). 길이 1 구간·빈 칸은 중립색. 확인된 팔레트 토큰만 쓴다. */
const SEGMENT_CLASSES = ["bg-lime", "bg-mint", "bg-lilac", "bg-pink", "bg-cream"];

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

  const currentTile: Tile | null =
    game && !game.finished ? (game.deck[game.drawnIndex] ?? null) : null;

  const scored = game ? scoreBoard(game.board) : { segments: [], total: 0 };

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

  return (
    <div className="flex flex-col gap-3">
      {/* 점수 안내(짧게) */}
      <div className="rounded-lg border border-line bg-cream px-3 py-2">
        <p className="t-caption font-semibold">놓는 법 · 점수</p>
        <p className="mt-1 t-body-sm">
          뽑힌 타일을 빈 칸에 놓아요(한 번 놓으면 못 옮겨요). 왼쪽부터 숫자가 같거나 커지면 한
          줄기로 이어져요. 조커는 아무 데나 이어 주는 만능 타일이에요. 긴 줄기일수록 점수가 확
          커져요.
        </p>
        {saved && (
          <p className="mt-1 t-caption">
            최고 점수 {saved.bestScore}점 · 지난 점수 {saved.lastScore}점 · {saved.plays}판
          </p>
        )}
      </div>

      {!game ? (
        <button
          type="button"
          onClick={start}
          disabled={disabled}
          className="pill pill-primary pill-block py-3 disabled:opacity-60"
        >
          게임 시작
        </button>
      ) : (
        <>
          {/* 현재 타일 / 결과 */}
          <div className="flex items-center justify-between gap-2">
            {game.finished ? (
              <p className="t-body font-bold">완성! 총점 {scored.total}점</p>
            ) : (
              <p className="t-body">
                이번 타일{" "}
                <span className="ml-1 inline-flex min-w-9 items-center justify-center rounded-lg border-2 border-ink bg-canvas px-2 py-1 t-body font-bold">
                  {currentTile === null ? "-" : tileLabel(currentTile)}
                </span>
              </p>
            )}
            <p className="t-body-sm">{game.placed} / {BOARD_SIZE} 놓음</p>
          </div>

          {/* 보드 — 왼→오른쪽, 윗줄 다음 아랫줄 순서 */}
          <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
            {game.board.map((slot, index) => {
              const empty = slot === null;
              const canPlace = !game.finished && empty && !disabled;
              const segIndex = game.finished ? segmentIndexOfSlot(scored.segments, index) : -1;
              const seg = segIndex >= 0 ? scored.segments[segIndex] : null;
              const colored = seg && seg.length >= 2;
              const bg = colored
                ? SEGMENT_CLASSES[segIndex % SEGMENT_CLASSES.length]
                : empty
                  ? "bg-surface"
                  : "bg-canvas";
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => placeAt(index)}
                  disabled={!canPlace}
                  aria-label={`${index + 1}번 칸`}
                  className={`flex aspect-square flex-col items-center justify-center rounded-lg border ${
                    canPlace ? "border-2 border-ink" : "border-line"
                  } ${bg}`}
                >
                  <span className="t-caption opacity-60">{index + 1}</span>
                  <span className="t-body font-bold">{empty ? "" : tileLabel(slot)}</span>
                </button>
              );
            })}
          </div>

          {game.finished && (
            <div className="rounded-lg border-2 border-ink bg-canvas p-3">
              <p className="t-body font-bold">총점 {scored.total}점</p>
              <p className="mt-1 t-body-sm">
                이어진 줄기{" "}
                {scored.segments.filter((s) => s.length >= 2).length}개 —{" "}
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
    </div>
  );
}
