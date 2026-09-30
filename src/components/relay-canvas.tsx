"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 릴레이 그림판 — 배경(지금까지의 모둠 그림) 위에 덧그리고, 합쳐진 이미지를 축소 저장한다.
 *
 * 외부 요청 0(포털 내장). 터치+마우스(PointerEvent). 자유선·색 6개·지우개·되돌리기·전체 지우기.
 * 내부 해상도를 480x360 으로 고정해 toDataURL 이 곧 축소 이미지가 된다(jpeg 0.6).
 */

const W = 480;
const H = 360;

const COLORS = ["#1f2937", "#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a16207"] as const;
const PEN_WIDTH = 4;
const ERASER_WIDTH = 22;
const ERASER = "#ffffff";

interface Stroke {
  color: string;
  width: number;
  points: number[]; // x0,y0,x1,y1,...
}

export function RelayCanvas({
  background,
  onSubmit,
  disabled,
  submitting,
}: {
  background: string;
  onSubmit: (dataUrl: string) => void;
  disabled?: boolean;
  submitting?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgRef = useRef<HTMLImageElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef<Stroke | null>(null);
  const [color, setColor] = useState<string>(COLORS[0]);
  const [eraser, setEraser] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    const bg = bgRef.current;
    if (bg && bg.complete && bg.naturalWidth > 0) {
      ctx.drawImage(bg, 0, 0, W, H);
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke);
    }
  }, []);

  // 배경 이미지 로드 → 준비되면 다시 그린다. (턴마다 부모가 key 로 새로 마운트하므로 strokes 는
  // 처음부터 비어 있다 — 여기서 상태를 되돌릴 필요가 없다.)
  useEffect(() => {
    strokesRef.current = [];
    if (!background) {
      bgRef.current = null;
      redraw();
      return;
    }
    const img = new Image();
    img.onload = () => {
      bgRef.current = img;
      redraw();
    };
    img.src = background;
    bgRef.current = img;
    redraw();
  }, [background, redraw]);

  function toLogical(event: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    const y = ((event.clientY - rect.top) / rect.height) * H;
    return [Math.max(0, Math.min(W, x)), Math.max(0, Math.min(H, y))];
  }

  function handleDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled || submitting) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const [x, y] = toLogical(event);
    drawingRef.current = {
      color: eraser ? ERASER : color,
      width: eraser ? ERASER_WIDTH : PEN_WIDTH,
      points: [x, y],
    };
  }

  function handleMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = drawingRef.current;
    if (!stroke) return;
    const [x, y] = toLogical(event);
    stroke.points.push(x, y);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawStroke(ctx, stroke); // 즉시 반응 — 되돌리기 때 전체 다시 그림
  }

  function handleUp() {
    const stroke = drawingRef.current;
    drawingRef.current = null;
    if (!stroke || stroke.points.length < 2) return;
    strokesRef.current.push(stroke);
    setStrokeCount(strokesRef.current.length);
  }

  function undo() {
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
    redraw();
  }

  function clearAll() {
    strokesRef.current = [];
    setStrokeCount(0);
    redraw();
  }

  function submit() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSubmit(canvas.toDataURL("image/jpeg", 0.6));
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        className="w-full touch-none rounded-lg border-2 border-ink bg-white"
        style={{ aspectRatio: "4 / 3" }}
      />

      <div className="flex flex-wrap items-center gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setColor(c);
              setEraser(false);
            }}
            aria-label={`색 ${c}`}
            className={`h-8 w-8 rounded-full border-2 ${
              !eraser && color === c ? "border-ink" : "border-line"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        <button
          type="button"
          onClick={() => setEraser(true)}
          className={`pill t-body-sm ${eraser ? "pill-primary" : "pill-secondary"}`}
        >
          지우개
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={undo}
          disabled={strokeCount === 0}
          className="pill pill-secondary t-body-sm disabled:opacity-50"
        >
          되돌리기
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={strokeCount === 0}
          className="pill pill-secondary t-body-sm disabled:opacity-50"
        >
          전체 지우기
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={disabled || submitting}
          className="pill pill-primary t-body-sm disabled:opacity-60"
        >
          {submitting ? "보내는 중…" : "제출하고 다음 사람에게"}
        </button>
      </div>
    </div>
  );
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const p = stroke.points;
  if (p.length < 2) return;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  for (let i = 2; i + 1 < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
  ctx.stroke();
}
