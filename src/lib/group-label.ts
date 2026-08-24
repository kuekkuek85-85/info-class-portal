/**
 * 수업을 부르는 이름 — "1반" 이냐 "화요일 1기" 냐.
 *
 * 정보과는 반으로 수업을 열고, 선택과목은 분반으로 연다. 화면 여섯 군데가 저마다
 * `{classNo}반` 을 찍고 있었는데, 선택과목에서는 그게 거짓말이 된다 —
 * 「인간과 인공지능」에는 1반이라는 것이 없다. 실제로 대시보드에 "1교시 · 1반" 이 떴다.
 *
 * classNo 는 선택과목에서 화면에 보이지 않는 **데이터 통 번호**로만 쓰인다.
 * 통 번호를 사람에게 보여줄 이유가 없다.
 */

/** 분반이면 분반 이름, 아니면 "N반" */
export function groupName(session: { classNo: number; groupLabel?: string }): string {
  return session.groupLabel || `${session.classNo}반`;
}
