"use client";

import { useEffect, useRef } from "react";

import { CANVAS_HEIGHT, CANVAS_WIDTH, PALETTE, STROKE_WIDTHS } from "@/lib/drawing";
import type { Stroke, TextItem } from "@/lib/types";

/**
 * 저장된 획을 다시 그리는 읽기 전용 캔버스.
 *
 * 활동지 미리보기·카드뉴스·갤러리가 모두 이걸 쓴다. 이미지 파일을 만들어 저장하지 않는
 * 이유는 Cloud Storage 가 Spark 플랜에서 빠졌기 때문이다 — 이미지를 저장하는 순간
 * Blaze 전환이 필요해진다 (PRD 3.5). 획 데이터만 있으면 언제든 다시 그릴 수 있다.
 */

interface ArtifactCanvasProps {
  strokes: Stroke[];
  texts: TextItem[];
  className?: string;
  /**
   * 그릴 실제 픽셀 폭. 작게 주면 축소해서 그린다.
   *
   * 격자에 스물다섯 장을 늘어놓을 때 이걸 안 주면 캔버스 하나가 1600×1200 을 붙잡는다.
   * 스물다섯 장이면 190MB — 태블릿에서 화면이 그대로 죽는다.
   */
  pixelWidth?: number;
}

export function ArtifactCanvas({ strokes, texts, className, pixelWidth }: ArtifactCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const width = pixelWidth ?? CANVAS_WIDTH;
  const height = Math.round((width / CANVAS_WIDTH) * CANVAS_HEIGHT);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 논리 좌표(1600×1200)로 그려진 그림을 실제 크기에 맞춰 줄인다
    ctx.save();
    ctx.scale(width / CANVAS_WIDTH, height / CANVAS_HEIGHT);
    drawArtifact(ctx, strokes, texts);
    ctx.restore();
  }, [strokes, texts, width, height]);

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      className={className ?? "h-auto w-full rounded-lg border border-line bg-white"}
    />
  );
}

/** 캔버스 컨텍스트에 그림 전체를 그린다. 그림판도 같은 함수를 쓴다. */
export function drawArtifact(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  texts: TextItem[],
): void {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const stroke of strokes) {
    const points = stroke.p;
    if (points.length < 2) continue;

    ctx.strokeStyle = PALETTE[stroke.c] ?? PALETTE[0];
    ctx.lineWidth = STROKE_WIDTHS[stroke.w] ?? STROKE_WIDTHS[0];
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);

    if (points.length === 2) {
      // 점 하나만 찍은 획 — 선으로는 아무것도 안 보이므로 아주 짧은 선을 긋는다
      ctx.lineTo(points[0] + 0.1, points[1] + 0.1);
    } else {
      for (let i = 2; i + 1 < points.length; i += 2) {
        ctx.lineTo(points[i], points[i + 1]);
      }
    }
    ctx.stroke();
  }

  for (const text of texts) {
    ctx.fillStyle = "#111111";
    ctx.font = `bold ${text.size}px sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(text.content, text.x, text.y);
  }

  ctx.restore();
}
