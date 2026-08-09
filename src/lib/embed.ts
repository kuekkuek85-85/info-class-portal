/**
 * 화면에 끼워 넣을 URL 변환.
 *
 * 유튜브는 새 창으로 열면 안 된다. 30명이 각자 다른 지점을 보고 있게 되고, 광고나 추천 영상으로
 * 흩어진다 (PRD 3.2). 그래서 시청 단계에서도 포털 안에 임베드한다.
 */

/** 유튜브 주소면 embed 형태로 바꾸고, 아니면 원래 주소를 그대로 돌려준다. */
export function toEmbedUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return "";

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const host = parsed.hostname.replace(/^www\./, "");
  let videoId = "";

  if (host === "youtu.be") {
    videoId = parsed.pathname.slice(1);
  } else if (host === "youtube.com" || host === "m.youtube.com") {
    if (parsed.pathname === "/watch") videoId = parsed.searchParams.get("v") ?? "";
    else if (parsed.pathname.startsWith("/embed/")) videoId = parsed.pathname.slice(7);
    else if (parsed.pathname.startsWith("/shorts/")) videoId = parsed.pathname.slice(8);
  }

  if (!videoId) return url;

  // 구간 재생 파라미터는 교사가 붙인 그대로 살린다 (예: 도입 영상 0:00~2:08)
  const embed = new URL(`https://www.youtube.com/embed/${videoId}`);
  for (const key of ["start", "end", "t"]) {
    const value = parsed.searchParams.get(key);
    if (!value) continue;
    // t=2m8s 같은 표기도 초로 바꿔 준다
    embed.searchParams.set(key === "t" ? "start" : key, String(toSeconds(value)));
  }
  embed.searchParams.set("rel", "0");
  embed.searchParams.set("modestbranding", "1");
  return embed.toString();
}

/** "128" · "2m8s" · "1h2m3s" → 초 */
function toSeconds(value: string): number {
  if (/^\d+$/.test(value)) return Number(value);

  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!match) return 0;

  const [, h, m, s] = match;
  return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
}

/** 임베드해도 되는 주소인지 — http(s) 만 허용해 javascript: 같은 것을 막는다 */
export function isEmbeddable(url: string): boolean {
  if (!url.trim()) return false;
  try {
    const protocol = new URL(url).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
