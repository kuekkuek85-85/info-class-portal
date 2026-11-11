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

/**
 * 작품 답에서 「앱 열기」로 열 **게시(배포) 링크**를 고른다.
 *
 * ## 왜 build_url 한 칸만으로는 안 되는가
 *
 * 오래도록 「앱 열기」는 build_url 한 칸만 href 로 썼다. 그런데 실제 제출을 보면
 * build_url 에 캔바 **편집** 링크(`canva.com/design/.../edit`,
 * `canva.com/ai/code/thread/…`)가 들어가 있고, 진짜 **게시** 링크
 * (`…my.canva.site`, `canva.link`)는 '배포 링크' 칸(deploy_url)이나 드물게 소감·고침
 * 같은 텍스트 칸에 적힌 경우가 많다. 편집 링크는 본인 캔바 로그인이 있어야 열리고
 * 실행 화면이 아니라, 교사가 눌러도 앱이 안 뜬다. 그래서 편집 링크는 "앱"으로 치지 않는다.
 *
 * ## 규칙
 *
 *  1. **게시 도메인만** 열 수 있는 앱으로 본다 — `*.canva.site` · `canva.link` ·
 *     `*.vercel.app` · `*.netlify.app` · `*.github.io`. 편집 도메인
 *     (`canva.com/design/<id>/edit` · `canva.com/ai/thread/…` · `canva.com/ai/code/thread/…`)
 *     은 게시로 치지 않는다.
 *  2. **칸 우선순위**: `deploy_url` → `build_url` → 그 밖의 답 칸(fix2·fix4·grill_a2 …,
 *     `_` 로 시작하는 안내 칸은 제외). 지정 두 칸은 값 전체가 링크라 스킴만 채워 쓰고,
 *     그 밖의 텍스트 칸은 **본문은 건드리지 않고 http(s) URL 만 정규식으로 뽑는다**
 *     (감정·소감 본문을 읽거나 저장하지 않는다 — 이 과목의 프라이버시 선).
 *  3. 게시 링크가 하나도 없으면 `{ kind: "none" }` — 편집 링크라도 열지 않는다.
 *     화면은 이때 "게시 링크 없음"을 보여준다.
 *
 * 분반을 가리지 않는다. build_url 에 이미 게시 링크를 낸 반(대부분)은 결과가 그대로다.
 */
const EDITOR_URL_RE =
  /canva\.com\/(?:design\/[^\s/]+\/[^\s]*edit|ai\/thread\/|ai\/code\/thread\/)/i;
const PUBLISHED_URL_RE =
  /(?:\.canva\.site(?:[/:?#]|$)|\/\/(?:www\.)?canva\.link\/|\.vercel\.app(?:[/:?#]|$)|\.netlify\.app(?:[/:?#]|$)|\.github\.io(?:[/:?#]|$))/i;

/** 이 URL 이 로그인 없이 열리는 게시(배포) 링크인가 (편집 링크는 false) */
function isPublishedAppUrl(url: string): boolean {
  const s = url.toLowerCase();
  if (EDITOR_URL_RE.test(s)) return false;
  return PUBLISHED_URL_RE.test(s);
}

/** 한 답 칸에서 후보 URL 들을 뽑는다 (지정 링크 칸 vs 일반 텍스트 칸을 다르게 다룬다) */
function urlCandidates(key: string, value: unknown): string[] {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  // 지정 링크 칸: 값 전체가 주소다(스킴이 빠져 있을 수 있어 normalizeUrl 로 채운다)
  if (key === "deploy_url" || key === "build_url") return [normalizeUrl(raw)];
  // 그 밖의 텍스트 칸: 본문은 그대로 두고 명시적 http(s) 주소만 뽑는다 (끝의 구두점은 턴다)
  return [...raw.matchAll(/https?:\/\/[^\s"'<>]+/gi)].map((m) => m[0].replace(/[.,);]+$/, ""));
}

export function pickAppUrl(answers: Record<string, unknown> | null | undefined): {
  url: string;
  kind: "published" | "none";
} {
  const ans = answers ?? {};
  // 우선순위대로 칸을 늘어놓는다: deploy_url → build_url → 그 밖의 답 칸
  const ordered: [string, unknown][] = [];
  if ("deploy_url" in ans) ordered.push(["deploy_url", ans.deploy_url]);
  if ("build_url" in ans) ordered.push(["build_url", ans.build_url]);
  for (const [k, v] of Object.entries(ans)) {
    if (k === "deploy_url" || k === "build_url" || k.startsWith("_")) continue;
    ordered.push([k, v]);
  }
  for (const [key, value] of ordered) {
    for (const cand of urlCandidates(key, value)) {
      if (isPublishedAppUrl(cand)) return { url: cand, kind: "published" };
    }
  }
  return { url: "", kind: "none" };
}
