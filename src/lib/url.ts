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

/**
 * 「주소로 취급하는」 활동지 답 키 모음.
 *
 * 이 키에 담긴 값은 저장·표시 양쪽에서 normalizeUrl 로 스킴을 채우고, 카드/갤러리에서
 * 글자가 아니라 **눌러서 여는 링크**로 그린다(card-news·gallery-view·worksheet-view 의
 * echo·student/artifact 라우트). 새 URL 문항을 늘릴 때는 그 문항 key 를 여기 한 곳에만
 * 더하면 네 자리가 함께 따라온다 — 각 자리에 키를 하드코딩하지 않는다.
 *
 *  - build_url : 진로탐색 「인간과 인공지능」 — 학생이 만든 앱 화면 주소
 *  - song_url  : 「디지털 마음 톡톡」 4회기 — 학생이 만든 Suno 노래 주소
 *
 * ※ 이 집합은 "URL 로 그리기"만 정한다. 갤러리에 실제로 나가는지는 세션의
 *   galleryAnswerKeys 화이트리스트가, 앱 링크 제출 판정은 교사 대시보드가 따로 정한다
 *   (그 대시보드 로직은 진로탐색 build_url 전용이라 여기 song_url 을 섞지 않는다).
 */
export const URL_ANSWER_KEYS = new Set<string>(["build_url", "song_url"]);
