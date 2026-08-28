import type { Metadata } from "next";

import "./theme.css";

/**
 * 교사개발자 나눔 세션 슬라이드.
 *
 * 이 라우트는 **포털 어디에서도 링크되지 않는다.** 주소를 아는 사람만 들어오는
 * 하루짜리 행사 화면이라, 검색에 걸릴 이유가 없다.
 *
 * 색과 모양은 theme.css 가 `sendev` 클래스 안쪽에만 입힌다. 학생 수업 화면과 완전히
 * 갈라 두었으므로, 되돌리려면 아래 className 만 떼면 된다.
 */
export const metadata: Metadata = {
  title: "제1호 교사개발자 홈커밍데이",
  robots: { index: false, follow: false },
};

export default function SendevLayout({ children }: { children: React.ReactNode }) {
  return <div className="sendev">{children}</div>;
}
