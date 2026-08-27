import { SendevDeck } from "./deck";

/**
 * 2026-08-28(금) 교사개발자 1기 나눔 세션 슬라이드.
 *
 * ## 이 페이지는 포털과 완전히 따로 논다
 *
 * 학생 데이터도, DB도, 로그인도 쓰지 않는다. 상태는 전부 브라우저 메모리에만 있고
 * 새로고침하면 처음으로 돌아간다 — 하루 저녁 한 대의 노트북에서만 도는 화면이라
 * 저장할 것이 없다. 기존 화면은 한 줄도 건드리지 않았다.
 *
 * ## 행사가 끝나면 문을 닫는다
 *
 * `SENDEV_OPEN` 을 false 로 두거나 `NEXT_PUBLIC_SENDEV_CODE` 를 지우면, 이 아래 슬라이드
 * 뭉치는 아예 그려지지 않고 "끝난 행사" 한 장만 남는다.
 */
export default function SendevPage() {
  const code = process.env.NEXT_PUBLIC_SENDEV_CODE ?? "";
  const open = process.env.SENDEV_OPEN !== "false" && code.length > 0;

  if (!open) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas p-8 text-center">
        <p className="t-display">끝난 행사입니다</p>
        <p className="t-body text-muted">
          제1호 교사개발자 홈커밍데이 · 2026년 8월 28일
        </p>
      </main>
    );
  }

  return <SendevDeck code={code} />;
}
