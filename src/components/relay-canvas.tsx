"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

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

/** 부모(릴레이 패널)가 타임아웃 자동 제출 때 현재 캔버스 이미지를 꺼내 쓰는 핸들. */
export interface RelayCanvasHandle {
  /** 지금 캔버스를 제출용 data URL 로 뽑는다(배경+내가 그린 것 합성). 준비 안 됐으면 null. */
  getDataUrl: () => string | null;
}

export const RelayCanvas = forwardRef<
  RelayCanvasHandle,
  {
    background: string;
    onSubmit: (dataUrl: string) => void;
    disabled?: boolean;
    submitting?: boolean;
  }
>(function RelayCanvas({ background, onSubmit, disabled, submitting }, ref) {
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

  const getDataUrl = useCallback((): string | null => {
    const canvas = canvasRef.current;
    return canvas ? canvas.toDataURL("image/jpeg", 0.6) : null;
  }, []);

  // 부모가 타임아웃 자동 제출 때 쓴다 — 지금 캔버스를 그대로 data URL 로 꺼낸다.
  useImperativeHandle(ref, () => ({ getDataUrl }), [getDataUrl]);

  function submit() {
    const url = getDataUrl();
    if (url) onSubmit(url);
  }

  return (
    // 도화지(왼쪽)와 도구(오른쪽)를 좌우로 — 한 화면에 함께 보이게. 좁은 화면(폰)에선 위아래로.
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      {/* 도화지 — 높이를 화면(약 64vh)에 맞춰 제한해 도구와 함께 한 화면에 들어오게 한다. */}
      <div className="flex min-w-0 justify-center sm:flex-1">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
          className="block w-full touch-none rounded-lg border-2 border-ink bg-white"
          // width:100% 로 열 너비를 채우되, maxWidth 로 '높이 64vh' 에 해당하는 너비 상한을 둔다
          // → 세로가 화면을 넘지 않으면서 가능한 한 크게.
          style={{ aspectRatio: "4 / 3", maxWidth: "calc(64vh * 4 / 3)" }}
        />
      </div>

      {/* 도구 — 오른쪽 세로 팔레트 */}
      <div className="flex flex-col gap-3 sm:w-44 sm:shrink-0">
        <div>
          <p className="t-caption text-muted mb-1">색 · 지우개</p>
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
        </div>

        <div className="flex flex-wrap gap-2 sm:flex-col">
          <button
            type="button"
            onClick={undo}
            disabled={strokeCount === 0}
            className="pill pill-secondary t-body-sm disabled:opacity-50 sm:w-full"
          >
            되돌리기
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={strokeCount === 0}
            className="pill pill-secondary t-body-sm disabled:opacity-50 sm:w-full"
          >
            전체 지우기
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={disabled || submitting}
            className="pill pill-primary t-body-sm disabled:opacity-60 sm:w-full"
          >
            {submitting ? "보내는 중…" : "제출하고 다음 사람에게"}
          </button>
        </div>
      </div>
    </div>
  );
});

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
