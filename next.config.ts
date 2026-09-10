import type { NextConfig } from "next";

/*
 * firebase-admin 을 serverExternalPackages 에 넣지 않는다.
 *
 * Next.js 는 firebase-admin 을 기본 external 목록에 이미 포함하고 있어 명시가 중복이고,
 * 명시했을 때 Vercel 배포에서 함수가 모듈 로드 단계에 죽는 현상(500 · 빈 본문)을 겪었다.
 * 로컬 `next start` 는 프로젝트 node_modules 를 그대로 쓰기 때문에 재현되지 않는다.
 */

/*
 * 보안 헤더.
 *
 * 학생 개인정보(감정·성찰)를 다루는 공개 웹앱이라 기본 방어선을 응답 헤더로 깐다.
 *
 * CSP 설계 메모:
 *  - script-src 는 좁게. 'self' + Google 로그인(signInWithPopup)에 필요한 apis.google.com·
 *    gstatic 만. Next.js 는 하이드레이션용 인라인 <script> 를 nonce 없이 넣으므로
 *    'unsafe-inline' 이 불가피하다(그래도 바깥 스크립트 주입은 막힌다).
 *  - frame-src 는 https: 로 연다. 이 앱은 유튜브·교사 콘텐츠·보이스피싱 시뮬레이션 등
 *    임의 https 사이트를 iframe 으로 얹으므로 좁히면 수업 기능이 깨진다.
 *  - frame-ancestors 'none' — 우리를 남의 프레임에 못 얹게(클릭재킹 차단). frame-src 와 방향이 다르다.
 *  - connect-src 는 우리 서버 + Firebase Auth 엔드포인트만.
 *  Gemini 호출은 서버(Route Handler)에서 나가므로 브라우저 connect-src 에 넣지 않는다.
 *
 * 배포 후 반드시 교사 Google 로그인(팝업)이 되는지 확인할 것. 만약 팝업이 막히면
 * script-src 에 'unsafe-eval' 을 추가하거나 필요한 오리진을 넓힌다.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com",
  "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://*.googleapis.com",
  "frame-src 'self' https:",
  "worker-src 'self' blob:",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

/*
 * 피싱 체험 소품(public/phish-demo/*.html)만은 우리 페이지가 <iframe> 으로 얹어야 한다
 * (scam-sim 의 로그인 체험). 그런데 위의 방어선은 X-Frame-Options: DENY 와
 * frame-ancestors 'none' 을 모든 응답에 걸어, 이 정적 파일까지 **같은 오리진 프레이밍마저**
 * 막아 버린다 → 학생 화면에 "연결을 거부했습니다" 만 뜬다.
 *
 * 그래서 이 경로에만 프레이밍을 우리 오리진에 한해 연다(frame-ancestors 'self' ·
 * X-Frame-Options: SAMEORIGIN). 소품은 네트워크로 나가는 코드가 한 줄도 없는 자립형
 * 정적 HTML(인라인 <style>·<script>) 이라, 나머지는 오히려 기본보다 더 좁게 잠근다:
 * default-src 'none' 에 인라인 스타일·스크립트만 허용하고 폼 전송·바깥 리소스는 전부 차단.
 * 바깥 사이트가 이 소품을 훔쳐 얹는 것은 여전히 막힌다(프레이밍은 'self' 뿐).
 */
const PHISH_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src 'self' data:",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'self'",
].join("; ");

const PHISH_HEADERS = [
  { key: "Content-Security-Policy", value: PHISH_CSP },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      // 이 소품 경로만 프레이밍을 열고, 나머지 전 경로는 DENY 방어선을 그대로 받는다.
      // 넓은 규칙에서 phish-demo 를 빼지 않으면 두 규칙이 겹쳐 헤더가 충돌한다(브라우저는
      // 충돌하는 X-Frame-Options 를 DENY 로 처리 → 다시 막힌다). 그래서 부정형 룩어헤드로 뺀다.
      { source: "/phish-demo/:path*", headers: PHISH_HEADERS },
      { source: "/((?!phish-demo).*)", headers: SECURITY_HEADERS },
    ];
  },
};

export default nextConfig;
