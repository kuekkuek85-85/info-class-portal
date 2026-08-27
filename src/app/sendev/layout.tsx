import type { Metadata } from "next";

/**
 * 교사개발자 나눔 세션 슬라이드.
 *
 * 이 라우트는 **포털 어디에서도 링크되지 않는다.** 주소를 아는 사람만 들어오는
 * 하루짜리 행사 화면이라, 검색에 걸릴 이유가 없다.
 */
export const metadata: Metadata = {
  title: "제1호 교사개발자 홈커밍데이",
  robots: { index: false, follow: false },
};

export default function SendevLayout({ children }: { children: React.ReactNode }) {
  return children;
}
