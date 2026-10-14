"use client";

import { scoreBoard, segmentIndexOfSlot, JOKER, BOARD_SIZE, type Slot, type Tile } from "@/lib/streams";

/**
 * STREAMS 20칸 보드 — ㄴ자 트랙 렌더(읽기/배치 공용).
 *
 * streams-solo 의 보드 모양(아래 가로줄 → 오른쪽 세로줄, 칸 번호 없이 시작·끝만, 끝나면
 * 오름차순 줄기를 색으로 묶기)을 그대로 따른다. 동기화 개인전의 학생 배치 화면과 교사 등수
 * 발표(남의 판 크게 보기)가 함께 쓴다. streams-solo.tsx 는 건드리지 않는다(기존 그대로).
 */

/** 구간 색(길이 2 이상만). 확인된 팔레트 토큰만. */
const SEGMENT_CLASSES = ["bg-lime", "bg-mint", "bg-lilac", "bg-pink", "bg-cream"];
/** ㄴ자 트랙 — 아래 가로줄 칸 수(나머지는 오른쪽 세로줄). BOTTOM + (20-BOTTOM) = 20. */
const BOTTOM = 12;
const ROWS = BOARD_SIZE - BOTTOM + 1;

/** 타일을 칸에 짧게 — 조커는 ★. */
function label(tile: Tile): string {
  return tile === JOKER ? "★" : String(tile);
}

/** ㄴ자 트랙에서 이 칸의 grid 위치(아래 가로줄 → 오른쪽 세로줄). */
function cellPos(index: number): { gridColumn: number; gridRow: number } {
  if (index < BOTTOM) return { gridColumn: index + 1, gridRow: ROWS };
  return { gridColumn: BOTTOM, gridRow: ROWS - (index - BOTTOM + 1) };
}

export function StreamsBoardView({
  board,
  colorSegments = false,
  onPlace,
  canPlace = false,
  cellSize = 46,
}: {
  board: Slot[];
  /** true 면 오름차순 줄기를 색으로 묶어 보여준다(게임 끝/발표용). */
  colorSegments?: boolean;
  /** 칸을 누르면 호출(배치). 없으면 읽기 전용. */
  onPlace?: (slot: number) => void;
  /** 지금 배치할 수 있는 상태인지(뽑힌 숫자가 있고 내 차례). */
  canPlace?: boolean;
  cellSize?: number;
}) {
  const scored = colorSegments ? scoreBoard(board) : { segments: [], total: 0 };

  return (
    <div className="overflow-x-auto pb-1">
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${BOTTOM}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${ROWS}, ${cellSize}px)`,
        }}
      >
        {board.map((slot, index) => {
          const empty = slot === null;
          const tappable = canPlace && empty && !!onPlace;
          const segIndex = colorSegments ? segmentIndexOfSlot(scored.segments, index) : -1;
          const seg = segIndex >= 0 ? scored.segments[segIndex] : null;
          const colored = !!seg && seg.length >= 2;
          const isStart = index === 0;
          const isEnd = index === BOARD_SIZE - 1;
          const bg = colored
            ? SEGMENT_CLASSES[segIndex % SEGMENT_CLASSES.length]
            : empty
              ? tappable
                ? "bg-lime"
                : "bg-canvas"
              : "bg-cream";
          return (
            <button
              key={index}
              type="button"
              onClick={() => tappable && onPlace?.(index)}
              disabled={!tappable}
              aria-label={isStart ? "시작 칸" : isEnd ? "끝 칸" : "칸"}
              style={{ ...cellPos(index), fontSize: cellSize < 30 ? "0.7rem" : "1.125rem" }}
              className={`relative flex items-center justify-center rounded-lg border-2 ${
                tappable ? "border-ink" : "border-line"
              } ${bg}`}
            >
              {(isStart || isEnd) && (
                <span className="absolute left-0 top-0 rounded-br rounded-tl bg-ink px-1 py-0.5 text-[9px] font-bold leading-none text-canvas">
                  {isStart ? "시작" : "끝"}
                </span>
              )}
              <span className="font-bold">{empty ? "" : label(slot)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
