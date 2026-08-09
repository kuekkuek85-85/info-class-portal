import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "정보 수업 포털",
  description: "장평중학교 1학년 정보과 수업 포털",
  // 학생 태블릿 브라우저에서 검색 결과로 노출될 이유가 없다
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 태블릿에서 두 손가락 확대는 막지 않는다 — 시력이 약한 학생에게 필요하다
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
