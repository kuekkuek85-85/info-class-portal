import { SendevFollower } from "./follower";

/**
 * 참가자 화면 — 휴대폰으로 QR 을 찍고 들어온다.
 *
 * ## 코드를 묻지 않는다
 *
 * 문 앞에서 네 자리를 치게 하면 열두 명이 동시에 막힌다. QR 을 찍은 사람은 이미 그 방에
 * 있는 사람이고, 이 화면은 **보기만 하는 화면**이라 지킬 것이 없다. 넘기는 쪽에만
 * 코드를 건다.
 *
 * ## 스스로 넘기지 못한다
 *
 * 앞뒤 단추도, 정답 공개 단추도 없다. 진행자가 열기 전에 참가자가 먼저 정답을 보면
 * 3초 퀴즈가 성립하지 않는다.
 */
export default function SendevLivePage() {
  const open = process.env.SENDEV_OPEN !== "false";

  if (!open) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas p-8 text-center">
        <p className="t-display">끝난 행사입니다</p>
        <p className="t-body text-muted">제1호 교사개발자 홈커밍데이 · 2026년 8월 28일</p>
      </main>
    );
  }

  return <SendevFollower />;
}
