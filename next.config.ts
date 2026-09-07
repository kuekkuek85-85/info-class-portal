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

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
