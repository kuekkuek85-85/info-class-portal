"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * LED 애니메이터 — 포털에서 5x5 LED 애니메이션을 클릭으로 그려(프레임), '코드 생성' 을 누르면
 * MakeCode Python 전체 코드를 뽑아 복사하는 활동 (24차 나만의 LED 애니메이션).
 *
 * ## 순수 클라이언트 (서버·AI 없음)
 *
 * 그리기·코드 생성은 모두 이 컴포넌트 안에서 돈다. 프라이버시 민감 정보가 없다. 상태(주제·프레임)는
 * JSON 으로 answers[key] 에 저장돼(onChange) 지속되고, 교사는 활동지 아티팩트로 열람할 수 있다
 * (streams-solo 와 같은 저장 구조 — 서버·Gemini 안 씀).
 *
 * ## 코드 생성 — MakeCode Python (makecode.microbit.org '파이썬 보기' 용)
 *
 * 각 프레임 → basic.show_leds(\"\"\"...\"\"\") + basic.pause(<지연>). 전체를 def on_forever(): 안에 넣고
 * 끝에 basic.forever(on_forever) — 반복 애니메이션. 복사→붙여넣기만 하면 바로 도는 완성 프로그램이다.
 * (python.microbit.org 의 MicroPython display.show/Image 아님 — MakeCode Python 이다.)
 */

interface Frame {
  /** 5x5 = 25칸. 켜짐 true. 위→아래, 왼→오 순서 */
  on: boolean[];
  /** 이 프레임 뒤 pause (ms) */
  delay: number;
}
interface Doc {
  theme: string;
  frames: Frame[];
}

const CELLS = 25;
const MIN_DELAY = 100;
const MAX_DELAY = 5000;

function blankFrame(): Frame {
  return { on: Array(CELLS).fill(false), delay: 500 };
}

function clampDelay(value: number): number {
  if (!Number.isFinite(value)) return 500;
  return Math.max(MIN_DELAY, Math.min(MAX_DELAY, Math.round(value)));
}

function parse(raw: string): Doc {
  if (raw.trim()) {
    try {
      const value = JSON.parse(raw) as Doc;
      if (Array.isArray(value.frames) && value.frames.length > 0) {
        const frames = value.frames.map((f) => ({
          on: Array.isArray(f.on) && f.on.length === CELLS ? f.on.map(Boolean) : Array(CELLS).fill(false),
          delay: clampDelay(Number(f.delay)),
        }));
        return { theme: typeof value.theme === "string" ? value.theme : "", frames };
      }
    } catch {
      // 깨진 저장값 — 아래 기본값으로
    }
  }
  return { theme: "", frames: [blankFrame()] };
}

/** 프레임 하나를 5줄 격자 문자열로 (각 줄 8칸 들여쓰기, 칸 사이 공백, 켜짐 # 꺼짐 .) */
function frameToGrid(on: boolean[]): string {
  const rows: string[] = [];
  for (let r = 0; r < 5; r += 1) {
    const cells: string[] = [];
    for (let c = 0; c < 5; c += 1) cells.push(on[r * 5 + c] ? "#" : ".");
    rows.push(`        ${cells.join(" ")}`);
  }
  return rows.join("\n");
}

/** 전체 MakeCode Python 프로그램을 만든다 (복사→붙여넣기로 바로 도는 완성본). */
function generateCode(frames: Frame[]): string {
  const body = frames
    .map(
      (f) =>
        `    basic.show_leds("""\n${frameToGrid(f.on)}\n        """)\n    basic.pause(${f.delay})`,
    )
    .join("\n");
  return `def on_forever():\n${body}\nbasic.forever(on_forever)`;
}

export function LedAnimator({
  questionKey,
  raw,
  onChange,
  disabled,
}: {
  questionKey: string;
  raw: string;
  onChange: (raw: string) => void;
  disabled?: boolean;
}) {
  const initial = useMemo(() => parse(raw), [raw]);
  const [theme, setTheme] = useState(initial.theme);
  const [frames, setFrames] = useState<Frame[]>(initial.frames);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  // 미리보기(재생) — 별도 격자에 프레임을 지연(ms)만큼씩 보여주고 끝나면 반복(생성 코드의 forever 와 동일).
  const [playing, setPlaying] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  // 재생 루프: 현재 프레임을 그 지연만큼 보여준 뒤 다음으로. 정지·언마운트 시 타이머 정리.
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const current = frames[previewIndex % frames.length];
    const timer = setTimeout(() => {
      setPreviewIndex((i) => (i + 1) % frames.length);
    }, clampDelay(current.delay));
    return () => clearTimeout(timer);
  }, [playing, previewIndex, frames]);

  function persist(nextTheme: string, nextFrames: Frame[]) {
    onChange(JSON.stringify({ theme: nextTheme, frames: nextFrames }));
  }

  function updateFrames(next: Frame[]) {
    // 편집하면 미리보기를 멈춘다(재생 중 프레임이 바뀌어 어긋나는 것을 막는다).
    setPlaying(false);
    setFrames(next);
    persist(theme, next);
  }

  function updateTheme(next: string) {
    setTheme(next);
    persist(next, frames);
  }

  function toggleCell(frameIndex: number, cell: number) {
    if (disabled) return;
    updateFrames(
      frames.map((f, i) =>
        i === frameIndex ? { ...f, on: f.on.map((v, c) => (c === cell ? !v : v)) } : f,
      ),
    );
  }

  function setDelay(frameIndex: number, value: number) {
    updateFrames(frames.map((f, i) => (i === frameIndex ? { ...f, delay: clampDelay(value) } : f)));
  }

  function addFrame(copyLast: boolean) {
    const last = frames[frames.length - 1];
    const next = copyLast && last ? { on: [...last.on], delay: last.delay } : blankFrame();
    updateFrames([...frames, next]);
  }

  function duplicateFrame(frameIndex: number) {
    const f = frames[frameIndex];
    const copy = { on: [...f.on], delay: f.delay };
    updateFrames([...frames.slice(0, frameIndex + 1), copy, ...frames.slice(frameIndex + 1)]);
  }

  function removeFrame(frameIndex: number) {
    if (frames.length <= 1) return;
    updateFrames(frames.filter((_, i) => i !== frameIndex));
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 복사 막힘 — 칸을 눌러 직접 복사하도록 둔다
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 주제 */}
      <div className="flex flex-col gap-1">
        <label htmlFor={`led-theme-${questionKey}`} className="t-body-sm font-semibold">
          무슨 애니메이션인가요? (짧게)
        </label>
        <input
          id={`led-theme-${questionKey}`}
          value={theme}
          onChange={(event) => updateTheme(event.target.value.slice(0, 60))}
          disabled={disabled}
          placeholder="예) 두근두근 하트, 반짝이는 별, 걸어가는 사람"
          className="field"
        />
      </div>

      {/* 프레임 목록 */}
      <div className="flex flex-col gap-3">
        {frames.map((frame, frameIndex) => (
          <div key={frameIndex} className="flex flex-col gap-2 rounded-lg border-2 border-line bg-canvas p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="t-body-sm font-semibold">프레임 {frameIndex + 1}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => duplicateFrame(frameIndex)}
                  disabled={disabled}
                  className="pill pill-secondary t-caption"
                >
                  복제
                </button>
                <button
                  type="button"
                  onClick={() => removeFrame(frameIndex)}
                  disabled={disabled || frames.length <= 1}
                  className="pill pill-secondary t-caption disabled:opacity-40"
                >
                  삭제
                </button>
              </div>
            </div>

            {/* 5x5 격자 */}
            <div className="grid w-fit grid-cols-5 gap-1">
              {frame.on.map((cellOn, cell) => (
                <button
                  key={cell}
                  type="button"
                  aria-label={`${frameIndex + 1}번 프레임 ${cell + 1}번 칸`}
                  aria-pressed={cellOn}
                  onClick={() => toggleCell(frameIndex, cell)}
                  disabled={disabled}
                  className={`h-8 w-8 rounded-sm border ${
                    cellOn ? "border-ink bg-ink" : "border-line bg-surface"
                  }`}
                />
              ))}
            </div>

            {/* 지연 */}
            <label className="flex items-center gap-2 t-body-sm">
              이 프레임 뒤 기다리기(ms):
              <input
                type="number"
                value={frame.delay}
                min={MIN_DELAY}
                max={MAX_DELAY}
                step={100}
                onChange={(event) => setDelay(frameIndex, Number(event.target.value))}
                disabled={disabled}
                className="field w-24"
              />
            </label>
          </div>
        ))}
      </div>

      {/* 프레임 추가 */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => addFrame(false)}
          disabled={disabled}
          className="pill pill-secondary t-body-sm"
        >
          + 빈 프레임 추가
        </button>
        <button
          type="button"
          onClick={() => addFrame(true)}
          disabled={disabled}
          className="pill pill-secondary t-body-sm"
        >
          + 직전 프레임 복사해 추가
        </button>
      </div>

      {/* 미리보기(재생) — 생성 코드(forever)와 똑같이 프레임을 지연만큼씩 보여주고 반복한다. */}
      <div className="flex flex-col gap-2 rounded-lg border-2 border-line bg-surface p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="t-body-sm font-semibold">미리보기 (MakeCode에 붙이기 전에 확인)</span>
          <button
            type="button"
            onClick={() => {
              if (playing) {
                setPlaying(false);
              } else {
                setPreviewIndex(0);
                setPlaying(true);
              }
            }}
            disabled={disabled || frames.length === 0}
            className="pill pill-secondary t-body-sm disabled:opacity-40"
          >
            {playing ? "정지" : "미리보기"}
          </button>
        </div>
        <div className="grid w-fit grid-cols-5 gap-1" aria-label="미리보기 화면">
          {(frames[previewIndex % frames.length] ?? frames[0]).on.map((cellOn, cell) => (
            <div
              key={cell}
              className={`h-8 w-8 rounded-sm border ${
                cellOn ? "border-ink bg-ink" : "border-line bg-canvas"
              }`}
            />
          ))}
        </div>
        <p className="t-caption text-muted">
          {playing
            ? `재생 중 — 프레임 ${(previewIndex % frames.length) + 1} / ${frames.length} (끝나면 처음부터 반복)`
            : "미리보기를 누르면 프레임이 순서대로 재생돼요. 편집하면 멈춰요."}
        </p>
      </div>

      {/* 코드 생성 */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setCode(generateCode(frames))}
          disabled={disabled || frames.length === 0}
          className="pill pill-primary self-start disabled:opacity-60"
        >
          코드 생성 (MakeCode Python)
        </button>

        {code && (
          <>
            <textarea
              readOnly
              value={code}
              rows={Math.min(code.split("\n").length, 28)}
              spellCheck={false}
              onFocus={(event) => event.currentTarget.select()}
              className="field font-mono text-sm"
            />
            <button type="button" onClick={() => void copyCode()} className="pill pill-secondary t-body-sm self-start">
              {copied ? "복사됐어요" : "코드 복사하기"}
            </button>
            <a
              href="https://makecode.microbit.org/"
              target="_blank"
              rel="noreferrer"
              className="pill pill-primary t-body-sm self-start"
            >
              MakeCode 열기 (새 탭)
            </a>
            <p className="t-caption text-muted">
              MakeCode 를 열고 위쪽 메뉴에서 JavaScript 를 Python 으로 바꾼 뒤, 이 코드를 붙여넣으면 바로 돌아가요.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
