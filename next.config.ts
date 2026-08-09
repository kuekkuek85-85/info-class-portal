import type { NextConfig } from "next";

/*
 * firebase-admin 을 serverExternalPackages 에 넣지 않는다.
 *
 * Next.js 는 firebase-admin 을 기본 external 목록에 이미 포함하고 있어 명시가 중복이고,
 * 명시했을 때 Vercel 배포에서 함수가 모듈 로드 단계에 죽는 현상(500 · 빈 본문)을 겪었다.
 * 로컬 `next start` 는 프로젝트 node_modules 를 그대로 쓰기 때문에 재현되지 않는다.
 */
const nextConfig: NextConfig = {};

export default nextConfig;
