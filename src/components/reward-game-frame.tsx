"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * 보상 게임(테트리스) iframe — 세로 스크롤 없이 화면에 '맞춰' 보여 준다.
 *
 * 게임 페이지는 최소 높이(약 508px)가 있어서, 성찰 화면의 상자(100dvh-200px)가 그보다
 * 낮은 노트북에서는 iframe 안에 세로 스크롤이 생겼다(교사 보고). 그래서 iframe 을 '고정
 * 설계 크기'(1000×600 — 게임이 스크롤 없이 다 들어가는 크기)로 그린 뒤, 상자에 맞춰
 * 통째로 축소·확대(transform: scale)한다. 상자가 작으면 %로 줄고(스크롤 대신), 크면 조금
 * 키운다. 비율은 그대로라 잘리지 않는다. ResizeObserver 로 상자 크기가 바뀔 때마다 다시 맞춘다.
 */
const DESIGN_W = 1000;
const DESIGN_H = 600;
const MAX_SCALE = 1.3; // 큰 화면에서 너무 키워 흐릿해지지 않게 상한

export function RewardGameFrame({ url, title }: { url: string; title: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const fit = () => {
      const { clientWidth: w, clientHeight: h } = box;
      if (w && h) setScale(Math.min(w / DESIGN_W, h / DESIGN_H, MAX_SCALE));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  return (
    <section
      ref={boxRef}
      className="flex h-[calc(100dvh-200px)] min-h-[320px] items-center justify-center overflow-hidden rounded-lg border border-line"
    >
      <iframe
        src={url}
        title={title}
        allow="fullscreen"
        className="shrink-0 border-0"
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      />
    </section>
  );
}
