/**
 * 학생이 붙여 넣은 링크에 빠진 스킴을 채운다.
 *
 * 캔바 게시 주소를 옮길 때 앞의 `https://` 를 빼고 `www.○○.my.canva.site/...`,
 * `example.com/app` 처럼 넣는 일이 잦다. 그대로 `<a href>` 에 넣으면 브라우저가
 * 상대경로로 읽어(같은 사이트 안의 주소로) 눌러도 엉뚱한 데로 가거나 안 열린다.
 *
 *  - 빈 값(공백만 있는 것 포함) → 그대로 빈 문자열
 *  - 이미 스킴이 있으면(`http:`, `https:`, `mailto:`, `tel:` …) 손대지 않는다
 *  - 스킴이 없으면 앞에 `https://` 를 붙인다
 *
 * 앞뒤 공백은 다듬는다. 저장할 때(입력 정규화)와 그릴 때(이미 저장된 스킴 없는
 * 링크도 눌리게) 양쪽에서 방어적으로 부른다.
 */
export function normalizeUrl(raw: string): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  // 스킴(예: `https:`, `mailto:`)이 이미 붙어 있으면 그대로 둔다.
  // 스킴은 글자로 시작해 글자·숫자·`+`·`.`·`-` 뒤에 `:` 가 온다 (RFC 3986).
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
