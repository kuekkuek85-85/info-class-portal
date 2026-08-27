"use client";

import { useFollower } from "../live-sync";
import { SLIDES, Slide } from "../slides";

/**
 * 참가자 휴대폰 화면.
 *
 * 진행자가 넘기는 대로 따라온다. 스스로 넘기는 방법은 없다 — 방향키도 단추도 안 만든다.
 *
 * ## 세로 화면이라 슬라이드를 그대로 못 쓴다
 *
 * 프로젝터는 16:9 가로다. 같은 배치를 휴대폰에 그리면 글자가 잘리거나 QR 이 화면을
 * 다 먹는다. 그래서 compact 로 넘겨, 이미 들어온 사람에게 쓸모없는 QR 같은 것은 뺀다.
 */
export function SendevFollower() {
  const state = useFollower();

  if (!state) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-canvas p-6 text-center">
        <p className="t-headline">들어가는 중…</p>
        <p className="t-body-sm text-muted">잠시만요</p>
      </main>
    );
  }

  const slide = SLIDES[Math.min(state.slide, SLIDES.length - 1)];

  return (
    <main className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-3">
        <p className="t-caption">교사개발자 1기 나눔 세션</p>
        <p className="t-body-sm font-bold">{slide.corner}</p>
      </header>

      <div className="flex-1 px-5 py-6">
        <Slide
          key={slide.key}
          slideKey={slide.key}
          revealed={state.revealed}
          names={state.names}
          compact
        />
      </div>

      <footer className="border-t border-line px-5 py-3">
        <p className="t-caption text-center">
          진행자가 넘기면 이 화면도 함께 넘어갑니다
        </p>
      </footer>
    </main>
  );
}
