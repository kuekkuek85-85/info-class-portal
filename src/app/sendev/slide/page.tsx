import type { Metadata } from "next";

import { SendevArchive } from "./archive";

/**
 * 끝난 나눔 세션의 기록.
 *
 * ## 행사 화면과 달리 문을 닫지 않는다
 *
 * `/sendev` 는 `SENDEV_OPEN` 으로 닫히지만 여기는 열어 둔다. 나눠 보라고 만든 것이라
 * 코드도 묻지 않는다 — 대신 **읽기만 되고**, 서버로 나가는 요청이 한 건도 없다.
 *
 * ## 검색에는 걸리지 않게 둔다
 *
 * 세 분의 발표 자료가 통째로 펼쳐져 있다. 주소를 받은 사람이 보는 것과 검색으로
 * 낯선 사람이 닿는 것은 다른 일이라, 링크를 아는 사람까지만으로 둔다.
 */
export const metadata: Metadata = {
  title: "제1호 교사개발자 홈커밍데이 — 나눔 세션 기록",
  description: "2026년 8월 28일 교사개발자 1기 나눔 세션의 슬라이드와 그날의 기록입니다.",
  robots: { index: false, follow: false },
};

export default function SendevArchivePage() {
  return <SendevArchive />;
}
