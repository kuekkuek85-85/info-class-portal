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
 * 색 12개.
 *
 * 검정을 첫 번째에 둔 것은 대부분의 학생이 윤곽선부터 그리기 때문이다.
 * 흰색은 넣지 않았다 — 배경과 같은 색은 "지운 것처럼 보이지만 안 지워진" 획을 만들고,
 * 중1은 그걸 지우개 문제로 오해한다. 지우기는 지우개 도구로만 한다.
 */
export const PALETTE = [
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
] as const;

/** 굵기 3단. 논리 좌표 기준 */
export const STROKE_WIDTHS = [4, 10, 22] as const;

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
