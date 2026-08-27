import { SendevDeck } from "../deck";

/**
 * 강사용 화면 — 노트북에 띄운다.
 *
 * 프로젝터(/sendev)와 같은 덱을 쓰되 **진행자 노트와 다음 슬라이드**가 늘 붙어 있다.
 * 어느 쪽에서 넘겨도 프로젝터와 참가자 휴대폰이 함께 움직인다.
 *
 * 이 주소를 프로젝터에 띄우면 안 된다 — 노트가 청중에게 그대로 보인다.
 */
export default function SendevPresenterPage() {
  const code = process.env.NEXT_PUBLIC_SENDEV_CODE ?? "";
  const open = process.env.SENDEV_OPEN !== "false" && code.length > 0;

  if (!open) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas p-8 text-center">
        <p className="t-display">끝난 행사입니다</p>
      </main>
    );
  }

  return <SendevDeck code={code} presenter />;
}
