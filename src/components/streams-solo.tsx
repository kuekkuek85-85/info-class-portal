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
 * 한 장씩 뽑아 빈 칸을 탭해 배치한다(놓으면 못 옮김). 20장 놓으면 게임 끝. 이때 **점수는
 * 자동으로 보여주지 않는다** — 학생이 색으로 묶인 오름차순 줄기를 보고 점수표로 **직접 계산**한 뒤,
 * [검증하기] 로 자기 답이 맞는지 확인한다(교사 요청). 최고 점수만 answers 에 저장한다.
 *
 * ## 화면
 *  · 보드는 20칸을 **ㄴ자 트랙**(아래 가로줄 → 오른쪽 세로줄, 시작→끝)으로 놓는다. 칸 번호는
 *    안 적고 시작·끝만 표시. 빈 칸은 초록, 놓인 칸은 숫자. 끝나면 오름차순 줄기를 색으로 묶는다.
 *  · 지금까지 **나온 숫자**를 순서 띠로 보여준다.
 *  · 점수표는 [점수표 보기] 버튼 → 팝업.
 */

interface Saved {
  bestScore: number;
  lastScore: number;
  plays: number;
}

interface GameState {
  deck: Tile[];
  board: Slot[];
  drawnIndex: number;
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
/** ㄴ자 트랙 — 아래 가로줄 칸 수(나머지는 오른쪽 세로줄). BOTTOM + (20-BOTTOM) = 20. */
const BOTTOM = 12;

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
  const [guess, setGuess] = useState("");
  const [checked, setChecked] = useState<{ actual: number; correct: boolean } | null>(null);

  const currentTile: Tile | null =
    game && !game.finished ? (game.deck[game.drawnIndex] ?? null) : null;
  const scored = game ? scoreBoard(game.board) : { segments: [], total: 0 };
  const drawn = game ? game.deck.slice(0, game.drawnIndex + (game.finished ? 0 : 1)) : [];

  function start() {
    if (disabled) return;
    setGuess("");
    setChecked(null);
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
    setGame({ ...game, board, placed, drawnIndex: game.drawnIndex + 1, finished });

    if (finished) {
      // 실제 점수는 자동 저장(최고점 갱신)하되 화면엔 안 띄운다 — 학생이 직접 계산·검증한다.
      const total = scoreBoard(board).total;
      const prev = parse(raw);
      onChange(
        JSON.stringify({
          bestScore: Math.max(total, prev?.bestScore ?? 0),
          lastScore: total,
          plays: (prev?.plays ?? 0) + 1,
        } satisfies Saved),
      );
    }
  }

  /** ㄴ자 트랙에서 이 칸의 grid 위치 (아래 가로줄 → 오른쪽 세로줄). */
  function cellPos(index: number): { gridColumn: number; gridRow: number } {
    const ROWS = BOARD_SIZE - BOTTOM + 1; // 세로줄 칸 수 + 가로줄 1
    if (index < BOTTOM) return { gridColumn: index + 1, gridRow: ROWS };
    return { gridColumn: BOTTOM, gridRow: ROWS - (index - BOTTOM + 1) };
  }
  const ROWS = BOARD_SIZE - BOTTOM + 1;

  return (
    <div className="flex flex-col gap-3">
      {/* 상단 바 — 점수표 버튼 + 진행(점수는 안 보여준다: 직접 계산하도록) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => setShowTable(true)} className="pill pill-secondary">
          📋 점수표·숫자 구성
        </button>
        {game && (
          <p className="t-body-sm font-semibold">
            {game.placed}/{BOARD_SIZE}칸 놓음
          </p>
        )}
      </div>

      {!game ? (
        <>
          {saved && (
            <p className="t-caption">
              최고 {saved.bestScore}점 · 지난 {saved.lastScore}점 · {saved.plays}판
            </p>
          )}
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
            <p className="t-body font-bold">20칸을 다 놓았어요! 아래에서 점수를 직접 계산해 봐요.</p>
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

          {/* ㄴ자 트랙 — 아래 가로줄(시작) → 오른쪽 세로줄(끝). 칸 번호 없음, 시작·끝만. 끝나면 줄기 색 */}
          <div className="overflow-x-auto pb-1">
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${BOTTOM}, 46px)`,
                gridTemplateRows: `repeat(${ROWS}, 46px)`,
              }}
            >
              {game.board.map((slot, index) => {
                const empty = slot === null;
                const canPlace = !game.finished && empty && !disabled;
                const segIndex = game.finished ? segmentIndexOfSlot(scored.segments, index) : -1;
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
                    aria-label={isStart ? "시작 칸" : isEnd ? "끝 칸" : "칸"}
                    style={cellPos(index)}
                    className={`relative flex items-center justify-center rounded-lg border-2 ${
                      canPlace ? "border-ink" : "border-line"
                    } ${bg}`}
                  >
                    {(isStart || isEnd) && (
                      <span className="absolute left-0 top-0 rounded-br rounded-tl bg-ink px-1 py-0.5 text-[9px] font-bold leading-none text-canvas">
                        {isStart ? "시작" : "끝"}
                      </span>
                    )}
                    <span className="text-lg font-bold">{empty ? "" : label(slot)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 끝났을 때 — 점수 자동 표시 대신, 직접 계산 + 검증 */}
          {game.finished && (
            <div className="flex flex-col gap-2 rounded-lg border-2 border-ink bg-canvas p-3">
              <p className="t-body-sm">
                색으로 묶인 <b>줄기마다 칸 수</b>를 세고, <b>[점수표·숫자 구성]</b> 에서 점수를 찾아
                모두 더하면 내 점수예요.
              </p>
              {checked === null ? (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="t-body-sm font-semibold">내가 계산한 점수</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    placeholder="예) 28"
                    className="w-24 rounded-lg border-2 border-line px-2 py-1 t-body"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setChecked({ actual: scored.total, correct: Number(guess) === scored.total })
                    }
                    disabled={guess.trim() === ""}
                    className="pill pill-primary disabled:opacity-60"
                  >
                    검증하기
                  </button>
                </div>
              ) : (
                <div className={`rounded-lg px-3 py-2 ${checked.correct ? "bg-lime" : "bg-pink"}`}>
                  {checked.correct ? (
                    <p className="t-body font-bold">정답! 총점 {checked.actual}점 🎉</p>
                  ) : (
                    <p className="t-body font-bold">
                      아쉬워요 — 내가 쓴 점수 {guess}점, 실제는 {checked.actual}점이에요. 줄기 길이와
                      점수표를 다시 확인해 봐요.
                    </p>
                  )}
                  <p className="mt-1 t-body-sm">
                    이어진 줄기:{" "}
                    {scored.segments
                      .filter((s) => s.length >= 2)
                      .map((s) => `${s.length}칸(+${s.score})`)
                      .join(" · ") || "없음"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setChecked(null)}
                    className="pill pill-secondary mt-2"
                  >
                    다시 계산해 보기
                  </button>
                </div>
              )}
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
              <h3 className="t-body font-bold">점수표 · 숫자 구성</h3>
              <button
                type="button"
                onClick={() => setShowTable(false)}
                className="pill pill-secondary"
              >
                닫기
              </button>
            </div>

            {/* 숫자 구성(덱) — streams.ts makeDeck 과 같은 구성. 전략에 참고. */}
            <div className="mt-2 rounded-lg border border-line bg-cream px-3 py-2 t-body-sm">
              <p className="font-semibold">숫자 구성 (총 40장)</p>
              <ul className="mt-1 list-disc pl-5">
                <li>1~10 : 각 1장 (10장)</li>
                <li>11~19 : 각 2장 (18장) — 가장 흔해요</li>
                <li>20~30 : 각 1장 (11장)</li>
                <li>조커 ★ : 1장 (아무 숫자로나)</li>
              </ul>
            </div>

            <p className="mt-3 t-caption text-muted">이어진 칸 수(연속)가 길수록 점수가 커져요.</p>
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
