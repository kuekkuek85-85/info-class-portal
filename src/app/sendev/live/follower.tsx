"use client";

import Link from "next/link";

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

      {/*
        방침은 참가자 화면에만 둔다.

        강사·프로젝터 화면은 슬라이드 한 장이 화면 높이에 딱 맞게 짜여 있어서, 아래에
        줄을 하나 더 넣으면 열일곱 장이 전부 다시 넘친다. 그리고 행사 중에 프로젝터로
        이용약관을 읽을 사람도 없다 — 링크가 쓸모 있는 곳은 손에 든 화면이다.
      */}
      <footer className="flex flex-col items-center gap-2 border-t border-line px-5 py-3">
        <p className="t-caption text-center">진행자가 넘기면 이 화면도 함께 넘어갑니다</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 t-caption">
          <Link href="/terms" className="underline underline-offset-4">
            이용약관
          </Link>
          <Link href="/privacy" className="underline underline-offset-4">
            개인정보처리방침
          </Link>
        </nav>
      </footer>
    </main>
  );
}
