/**
 * 그림판 공통 규격. 클라이언트(캔버스)와 서버(검증·용량 계산)가 같은 값을 본다.
 *
 * 색·굵기를 인덱스로 주고받는 이유는 문서 크기다. 획마다 "#e8453c" 같은 문자열을 반복하면
 * 좌표보다 색 이름이 더 큰 자리를 차지한다. Firestore 문서 한 개는 1MiB 를 넘을 수 없고,
 * 30분을 꽉 채워 그린 그림은 생각보다 쉽게 그 근처에 간다.
 */

/** 논리 캔버스. 화면 크기와 무관하게 이 좌표계로 저장한다 — 폰에서 이어 그려도 같은 그림이다. */
export const CANVAS_WIDTH = 1600;
export const CANVAS_HEIGHT = 1200;

/**
 * 색.
 *
 * 검정을 첫 번째에 둔 것은 대부분의 학생이 윤곽선부터 그리기 때문이다.
 * 흰색은 넣지 않았다 — 배경과 같은 색은 "지운 것처럼 보이지만 안 지워진" 획을 만들고,
 * 중1은 그걸 지우개 문제로 오해한다. 지우기는 지우개 도구로만 한다.
 *
 * ## 이 배열은 뒤에만 붙인다. 순서를 바꾸거나 중간에 끼워 넣으면 안 된다
 *
 * 획은 색 이름이 아니라 **이 배열의 자리 번호**로 저장된다. 3차시에 101명이 그린 그림이
 * 이미 0~11번을 가리키고 있어서, 중간에 하나만 끼워 넣어도 그 뒤가 전부 밀리면서
 * 저장된 그림의 색이 통째로 바뀐다. 색을 더 줄 때는 반드시 **끝에 붙인다**.
 */
export const PALETTE = [
  // ── 0~11: 도구창에 늘 떠 있는 기본 12색. 자리 번호를 절대 바꾸지 않는다 ──
  "#111111", // 검정
  "#8a8a8a", // 회색
  "#e5484d", // 빨강
  "#f76b15", // 주황
  "#f5c518", // 노랑
  "#4cb944", // 초록
  "#1f9d8f", // 청록
  "#3b82f6", // 파랑
  "#1e40af", // 남색
  "#8b5cf6", // 보라
  "#ec4899", // 분홍
  "#8b5e3c", // 갈색

  /*
   * ── 12~66: 팝업으로 여는 넓은 팔레트 ──
   *
   * 색깔 11 갈래 × 옅은 것에서 진한 것까지 5단. 아래 PALETTE_SHADES 가 이 55개를
   * 그대로 표로 세우므로, 여기 순서(같은 갈래끼리 옅은 것부터)를 흐트러뜨리지 않는다.
   *
   * 가장 옅은 단도 흰 종이 위에서 또렷하게 보이는 데까지만 내렸다. 더 옅게 두면
   * 기본 12색에서 흰색을 뺀 이유("그은 것 같은데 안 보인다")가 그대로 돌아온다.
   */
  "#fca5a5", "#f87171", "#ef4444", "#dc2626", "#991b1b", // 빨강
  "#fdba74", "#fb923c", "#f97316", "#ea580c", "#9a3412", // 주황
  "#fde68a", "#fcd34d", "#f59e0b", "#d97706", "#92400e", // 노랑
  "#86efac", "#4ade80", "#22c55e", "#16a34a", "#166534", // 초록
  "#5eead4", "#2dd4bf", "#14b8a6", "#0d9488", "#115e59", // 청록
  "#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7", "#075985", // 하늘
  "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1e3a8a", // 파랑
  "#d8b4fe", "#c084fc", "#a855f7", "#9333ea", "#6b21a8", // 보라
  "#f9a8d4", "#f472b6", "#ec4899", "#db2777", "#9d174d", // 분홍
  "#d6bb92", "#c19a6b", "#a97449", "#8b5e3c", "#5c3a21", // 갈색
  "#d4d4d4", "#a3a3a3", "#737373", "#525252", "#262626", // 무채색
] as const;

/** 도구창에 늘 떠 있는 색의 개수. 그 뒤는 팝업에서만 고른다. */
export const QUICK_COLORS = 12;

/**
 * 팝업 팔레트를 세울 표. [갈래 이름, 옅은 것 → 진한 것 5단의 자리 번호].
 *
 * 자리 번호를 여기에 적어 두는 이유는 위 배열이 앞으로도 뒤로만 자라기 때문이다.
 * 화면은 이 표만 보고 그리므로, 나중에 색을 더 붙여도 표가 흐트러지지 않는다.
 */
export const PALETTE_SHADES: readonly (readonly [string, readonly number[]])[] = [
  ["빨강", [12, 13, 14, 15, 16]],
  ["주황", [17, 18, 19, 20, 21]],
  ["노랑", [22, 23, 24, 25, 26]],
  ["초록", [27, 28, 29, 30, 31]],
  ["청록", [32, 33, 34, 35, 36]],
  ["하늘", [37, 38, 39, 40, 41]],
  ["파랑", [42, 43, 44, 45, 46]],
  ["보라", [47, 48, 49, 50, 51]],
  ["분홍", [52, 53, 54, 55, 56]],
  ["갈색", [57, 58, 59, 60, 61]],
  ["검회색", [62, 63, 64, 65, 66]],
] as const;

/**
 * 굵기. 논리 좌표 기준.
 *
 * PALETTE 와 같은 이유로 **뒤에만 붙인다** — 저장된 획이 자리 번호를 가리킨다.
 * 그래서 배열 순서가 굵은 차례가 아니다. 화면에 세울 차례는 STROKE_WIDTH_ORDER 를 쓴다.
 */
export const STROKE_WIDTHS = [4, 10, 22, 16, 34] as const;

/** 도구창에 얇은 것부터 세울 차례 (STROKE_WIDTHS 의 자리 번호) — 4 · 10 · 16 · 22 · 34 */
export const STROKE_WIDTH_ORDER = [0, 1, 3, 2, 4] as const;

/** 텍스트 크기 3단 */
export const TEXT_SIZES = [32, 48, 72] as const;

/** 되돌리기 단계 */
export const UNDO_LIMIT = 20;

/** 한 획에 담을 수 있는 점 개수 상한. 넘으면 획을 끊는다. */
export const MAX_POINTS_PER_STROKE = 2000;

/**
 * 용량 경고선과 거부선 (Firestore 문서 1MiB).
 *
 * 700KB 에서 학생에게 "정리해 달라"고 알리고, 900KB 를 넘으면 새 획을 거부한다.
 * 1MiB 를 그대로 두면 저장이 통째로 실패하면서 **그때까지 그린 것도 못 올린다** —
 * 수업 막바지에 그러면 손쓸 방법이 없다. 거부선을 조금 아래 둬서 기존 그림은 지킨다.
 */
export const SIZE_WARN_BYTES = 700_000;
export const SIZE_REJECT_BYTES = 900_000;

/**
 * 획 단순화 (Ramer-Douglas-Peucker).
 *
 * 손가락으로 그으면 포인터 이벤트가 1~2px 간격으로 쏟아진다. 사람 눈에 똑같은 곡선을
 * 점 1/5 로 표현할 수 있고, 그만큼 문서가 작아지고 저장이 빨라진다.
 */
export const SIMPLIFY_EPSILON = 2;

/** [x0,y0,x1,y1,…] 평면 배열을 단순화한다. 반환도 같은 형식. */
export function simplifyPoints(flat: number[], epsilon = SIMPLIFY_EPSILON): number[] {
  const count = Math.floor(flat.length / 2);
  if (count <= 2) return flat.slice(0, count * 2);

  const keep = new Array<boolean>(count).fill(false);
  keep[0] = true;
  keep[count - 1] = true;

  // 재귀 대신 스택 — 획 하나가 수천 점이면 재귀는 콜스택을 넘길 수 있다
  const stack: [number, number][] = [[0, count - 1]];

  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    if (last <= first + 1) continue;

    let maxDistance = 0;
    let index = first;

    for (let i = first + 1; i < last; i += 1) {
      const distance = perpendicular(flat, i, first, last);
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }

    if (maxDistance > epsilon) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }

  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    if (keep[i]) out.push(flat[i * 2], flat[i * 2 + 1]);
  }
  return out;
}

/** 점 i 에서 선분(first, last)까지의 수직 거리 */
function perpendicular(flat: number[], i: number, first: number, last: number): number {
  const x = flat[i * 2];
  const y = flat[i * 2 + 1];
  const x1 = flat[first * 2];
  const y1 = flat[first * 2 + 1];
  const x2 = flat[last * 2];
  const y2 = flat[last * 2 + 1];

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  // 시작점과 끝점이 같으면 (원을 그린 경우) 점까지의 직선 거리로 본다
  if (lengthSquared === 0) return Math.hypot(x - x1, y - y1);

  return Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / Math.sqrt(lengthSquared);
}

/** 좌표를 논리 캔버스 안 정수로 맞춘다. 소수점은 용량만 먹고 눈에는 보이지 않는다. */
export function quantize(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

export function isValidColorIndex(value: unknown): boolean {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < PALETTE.length;
}

export function isValidWidthIndex(value: unknown): boolean {
  return (
    Number.isInteger(value) && (value as number) >= 0 && (value as number) < STROKE_WIDTHS.length
  );
}
