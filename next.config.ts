import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin은 Node 네이티브 모듈에 의존한다. 번들링하지 않고 런타임에서 그대로 require 한다.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
