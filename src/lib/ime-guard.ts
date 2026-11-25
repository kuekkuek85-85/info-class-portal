/**
 * 한글 조합 중 글자 지키기 - 판정 로직(브라우저 없이 시험할 수 있게 따로 둔다).
 *
 * 「가나다」의 「다」가 아직 조합 중(밑줄)일 때 다른 탭으로 가면, 일부 IME(윈도 한글 IME +
 * 크롬 등)는 조합을 **확정하지 않고 취소**한다. 그러면 입력칸에서 「다」가 지워지고, 그
 * input 이벤트를 받은 React 상태도 「가나」가 되어 자동 저장까지 「가나」로 올라간다.
 *
 * 그래서 조합 중 마지막으로 본 값(prev)을 들고 있다가, **탭 이탈·복귀 무렵** 조합이 끝나며
 * 값이 「조합 글자 한 덩어리만큼」 줄어든 경우에만 prev 로 되돌린다. 학생이 지운 것
 * (백스페이스·Esc)은 탭 이탈과 겹치지 않으므로 그대로 둔다.
 */

/** 탭 이탈·복귀 앞뒤 이 시간 안에 생긴 조합 취소만 되돌린다 */
export const IME_RESTORE_WINDOW_MS = 800;
/** 조합 한 덩어리로 볼 최대 글자 수(한글은 보통 1자, 여유를 둔다) */
export const IME_MAX_LOST_CHARS = 2;

/**
 * cur 가 prev 에서 연속한 한 조각(1~max 자)만 빠진 값인가. 맞으면 빠진 자리(앞에서 몇 자째)를,
 * 아니면 -1 을 돌려준다.
 */
export function lostSegmentAt(prev: string, cur: string, max = IME_MAX_LOST_CHARS): number {
  const lost = prev.length - cur.length;
  if (lost < 1 || lost > max) return -1;
  let i = 0;
  while (i < cur.length && prev[i] === cur[i]) i += 1;
  return prev.slice(i + lost) === cur.slice(i) ? i : -1;
}

/** 이 조합 취소를 되돌려야 하는가 */
export function shouldRestore(input: {
  prev: string;
  cur: string;
  /** 조합이 시작된 시각 */
  startedAt: number;
  /** 조합이 끝난(취소된) 시각 */
  endedAt: number;
  /** 가장 가까운 탭 이탈·복귀(창 blur/focus, visibilitychange) 시각 */
  focusChangedAt: number;
  /** 가장 가까운 지우기 키(백스페이스·Delete·Esc) 시각 */
  deleteKeyAt: number;
}): boolean {
  if (lostSegmentAt(input.prev, input.cur) < 0) return false;
  if (Math.abs(input.endedAt - input.focusChangedAt) > IME_RESTORE_WINDOW_MS) return false;
  // 탭 이탈·복귀가 조합 도중(또는 취소 직후)에 있었어야 한다. 돌아와서 새로 친 글자를 지운 것은 아니다
  if (input.focusChangedAt < input.startedAt) return false;
  // 지우기 키 바로 뒤의 취소는 학생이 지운 것이다
  if (input.endedAt - input.deleteKeyAt >= 0 && input.endedAt - input.deleteKeyAt < 300) return false;
  return true;
}
