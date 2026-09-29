/**
 * STREAMS(스트림스) 보드게임 — 공유 게임 엔진.
 *
 * 덱 생성·셔플·비복원 뽑기, 20칸 보드, 구간 채점(조커 와일드), 기본 점수표를 담는다.
 * 순수 함수라 **개인전(클라이언트)과 협력전(서버) 이 함께** import 한다 — server-only 가 아니다.
 *
 * ## 규칙 요약
 *
 * - 타일 40개: 1~10 각 1개(10) + 11~19 각 2개(18) + 20~30 각 1개(11) + 조커 1개 = 40.
 * - 보드 20칸(왼→오른쪽). 뽑힌 타일을 빈 칸에 놓으면 못 옮긴다. 20개 놓으면 끝.
 * - 채점: 인접 칸이 비내림차순(각 칸 ≥ 왼쪽)이면 한 '오름차순 구간'. 조커는 와일드로 구간을
 *   잇는다(자기는 ≥ 제약을 받지 않고, 다음 칸은 조커 앞의 실제 값과 견준다). 보드를 최대
 *   구간들로 나눠 각 구간 길이를 점수표로 환산해 모두 합산.
 */

/** 조커 타일. 실제 타일은 1~30 이라 0 을 조커로 쓴다. */
export const JOKER = 0;

/** 타일 값 (1~30, 또는 JOKER). */
export type Tile = number;
/** 보드 칸 — 타일이 놓였으면 그 값, 비었으면 null. */
export type Slot = Tile | null;

/** 보드 칸 수. */
export const BOARD_SIZE = 20;

/**
 * 기본 점수표 — 배열 index = 구간 길이. 길이 0·1 은 0점.
 * 2:+1 3:+3 4:+5 5:+7 6:+9 7:+11 8:+15 9:+20 10:+25 11:+30 12:+35 13:+40
 * 14:+50 15:+60 16:+70 17:+85 18:+100 19:+150 20:+300.
 */
export const STREAM_SCORE_TABLE: readonly number[] = [
  0, 0, 1, 3, 5, 7, 9, 11, 15, 20, 25, 30, 35, 40, 50, 60, 70, 85, 100, 150, 300,
];

/** 구간 길이 → 점수. 표를 벗어난 길이는 상한(20)으로 본다. */
export function segmentScore(length: number): number {
  if (length <= 1) return 0;
  return STREAM_SCORE_TABLE[Math.min(length, BOARD_SIZE)] ?? 0;
}

/** 40장 덱을 만든다(셔플 전, 항상 같은 구성). */
export function makeDeck(): Tile[] {
  const deck: Tile[] = [];
  for (let n = 1; n <= 10; n += 1) deck.push(n); // 1~10 각 1개
  for (let n = 11; n <= 19; n += 1) {
    deck.push(n);
    deck.push(n); // 11~19 각 2개
  }
  for (let n = 20; n <= 30; n += 1) deck.push(n); // 20~30 각 1개
  deck.push(JOKER); // 조커 1개
  return deck;
}

/** Fisher-Yates 셔플(원본 불변, 새 배열 반환). rng 기본 Math.random. */
export function shuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 빈 보드(20칸 null). */
export function emptyBoard(): Slot[] {
  return Array<Slot>(BOARD_SIZE).fill(null);
}

/** 타일을 사람이 읽는 라벨로. */
export function tileLabel(tile: Tile): string {
  return tile === JOKER ? "조커" : String(tile);
}

export interface Segment {
  /** 구간 시작 칸 index (0부터) */
  start: number;
  /** 구간 끝 칸 index (포함) */
  end: number;
  length: number;
  score: number;
}

/**
 * 보드를 최대 오름차순 구간들로 나눠 채점한다. null 칸은 구간을 끊는다(빈 칸은 어느 구간에도
 * 안 든다). 조커는 와일드 — 구간을 잇고, 다음 칸은 조커 앞의 실제 값과 견준다.
 */
export function scoreBoard(board: readonly Slot[]): { segments: Segment[]; total: number } {
  const segments: Segment[] = [];
  let i = 0;
  while (i < board.length) {
    if (board[i] === null) {
      i += 1;
      continue;
    }
    const start = i;
    // 구간 안의 마지막 '실제(비조커)' 값. 조커로 시작하면 아직 제약이 없다(null).
    let lastReal: number | null = board[i] === JOKER ? null : (board[i] as number);
    let j = i + 1;
    while (j < board.length && board[j] !== null) {
      const t = board[j] as number;
      if (t === JOKER) {
        j += 1; // 조커는 언제나 구간을 잇는다 (제약 없음)
        continue;
      }
      if (lastReal === null || t >= lastReal) {
        lastReal = t;
        j += 1;
      } else {
        break; // 실제 값이 앞의 실제 값보다 작으면 구간이 끊긴다
      }
    }
    const length = j - start;
    segments.push({ start, end: j - 1, length, score: segmentScore(length) });
    i = j;
  }
  const total = segments.reduce((sum, seg) => sum + seg.score, 0);
  return { segments, total };
}

/** 각 칸이 몇 번째 구간에 속하는지 (없으면 -1). 화면 하이라이트용. */
export function segmentIndexOfSlot(segments: readonly Segment[], slot: number): number {
  return segments.findIndex((seg) => slot >= seg.start && slot <= seg.end);
}
