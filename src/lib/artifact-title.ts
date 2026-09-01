/**
 * 그림 제목을 만든다.
 *
 * 기본 틀 "○○년의 △△" 는 미래를 상상해 그리는 활동(정보과 3차시)에서 나온 것이다.
 * 그 활동에서는 연도가 제목의 절반을 차지할 만큼 중요했다.
 *
 * 그런데 그리기를 다른 활동에 빌려 쓰는 차시가 생겼다. 마음 톡톡의 힐링 스페이스는
 * 미래가 아니라 **지금 내가 쉬는 자리**라, "2026년의 내 방" 이 어색하게 읽힌다.
 * 그래서 차시가 틀을 정할 수 있게 하고, 안 정하면 지금까지 쓰던 문구로 물러난다.
 *
 * 화면 여러 곳에서 같은 제목을 써야 한다 — 그림판 머리글, 작품 카드, 교사 목록.
 * 한 군데서 만들지 않으면 그중 하나만 옛 문구로 남는다.
 */
export function artifactTitle(
  template: string | undefined,
  year: number,
  place: string,
  fallbackPlace = "어딘가",
): string {
  const shown = place?.trim() || fallbackPlace;
  if (!template?.trim()) return `${year}년의 ${shown}`;
  return template.replaceAll("{장소}", shown).replaceAll("{연도}", String(year));
}
