"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useDriver } from "./live-sync";
import { NOTES, SLIDES, Slide, TIMER_MINUTES, type SlideKey } from "./slides";

/**
 * 넘기는 화면 — 프로젝터와 강사 노트북이 같은 것을 쓴다.
 *
 * ## 두 화면의 차이는 곁가지뿐이다
 *
 * 프로젝터는 슬라이드만 크게. 강사 화면은 거기에 **진행자 노트와 다음 슬라이드 미리보기**
 * 를 붙인다. 슬라이드 자체는 같은 컴포넌트라 둘이 어긋날 일이 없다.
 *
 * 어느 쪽에서 넘기든 서버를 거쳐 나머지가 따라온다 (live-sync.ts). 그래서 강사가
 * 노트북에서 넘기면 프로젝터와 참가자 휴대폰이 함께 움직인다.
 *
 * ## 진행 방법
 *
 *  · ← → : 앞뒤          · Space : 다음
 *  · 빈 곳 클릭 : 다음    · 하단 단추 : 앞뒤 · 목차
 *  · N : 진행자 노트 (프로젝터 화면에서는 청중에게도 보인다)
 */

export function SendevDeck({ code, presenter }: { code: string; presenter?: boolean }) {
  const [entered, setEntered] = useState(false);
  const [showIndex, setShowIndex] = useState(false);
  const [showNote, setShowNote] = useState(presenter ?? false);

  const { state, go, jump, reveal, setNames } = useDriver(code, SLIDES.length);
  const slide = SLIDES[Math.min(state.slide, SLIDES.length - 1)];
  const next = SLIDES[state.slide + 1];

  useEffect(() => {
    if (!entered) return;

    function onKey(event: KeyboardEvent) {
      // 이름을 치는 중에는 방향키가 글자 사이를 움직여야 한다
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        go(1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
      }
      if (event.key === "n" || event.key === "N") setShowNote((prev) => !prev);
      if (event.key === "Escape") setShowIndex(false);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entered, go]);

  if (!entered) return <Gate code={code} onPass={() => setEntered(true)} />;

  /*
   * 빈 곳을 눌러도 넘어가지 않는다.
   *
   * 처음에는 클릭으로도 넘길 수 있게 했는데, 노트북 터치패드나 터치 화면에서 손이
   * 스치기만 해도 슬라이드가 넘어갔다. 진행 중에 한 장이 훌쩍 넘어가면 되돌리는
   * 동안 흐름이 끊기고, 무엇보다 참가자 열두 명 화면이 함께 넘어간다.
   *
   * 넘기는 것은 이전·다음 단추와 방향키뿐이다.
   */
  return (
    <main className="relative flex min-h-dvh flex-col bg-canvas">
      <header className="flex items-center justify-between gap-4 px-8 pt-6">
        <p className="t-eyebrow">
          {presenter ? "강사 화면" : "교사개발자 1기 나눔 세션"}
        </p>
        <div className="flex items-center gap-5">
          {TIMER_MINUTES[slide.key] && (
            <Timer key={slide.key} minutes={TIMER_MINUTES[slide.key]!} />
          )}
          <p className="t-headline">{slide.corner}</p>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-8 py-4">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <Slide
            key={slide.key}
            slideKey={slide.key}
            revealed={state.revealed}
            onReveal={reveal}
            names={state.names}
            onNames={setNames}
          />
        </div>
      </div>

      {/* 강사 화면에만 붙는 곁가지 — 프로젝터는 슬라이드만 깨끗하게 */}
      {presenter && (
        <div className="mx-8 mb-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border-2 border-ink bg-cream px-5 py-4">
            <p className="t-caption mb-1">진행자 노트</p>
            <p className="t-body whitespace-pre-line">
              {NOTES[slide.key] ?? "이 슬라이드에는 따로 적어 둔 것이 없습니다."}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface px-5 py-4">
            <p className="t-caption mb-1">다음</p>
            <p className="t-headline">{next ? next.corner : "마지막입니다"}</p>
          </div>
        </div>
      )}

      {/* 프로젝터에서는 눌러야만 뜬다 — 띄우면 청중도 같이 읽는다 */}
      {!presenter && showNote && NOTES[slide.key] && (
        <div className="mx-8 mb-3 rounded-xl border-2 border-ink bg-cream px-5 py-4">
          <p className="t-caption mb-1">진행자 노트 — N 을 다시 누르면 닫힙니다</p>
          <p className="t-body whitespace-pre-line">{NOTES[slide.key]}</p>
        </div>
      )}

      {showIndex && (
        <nav className="mx-8 mb-3 flex flex-wrap gap-2 rounded-xl border border-line bg-surface p-4">
          {SLIDES.map((item, i) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                jump(i);
                setShowIndex(false);
              }}
              className={`pill text-sm ${i === state.slide ? "pill-primary" : "pill-secondary"}`}
            >
              {i + 1}. {item.corner}
            </button>
          ))}
        </nav>
      )}

      <footer className="flex items-center justify-between gap-3 px-8 pb-6">
        <button type="button" onClick={() => go(-1)} className="pill pill-secondary">
          ← 이전
        </button>
        <div className="flex items-center gap-3">
          {!presenter && NOTES[slide.key] && (
            <button
              type="button"
              onClick={() => setShowNote((prev) => !prev)}
              aria-pressed={showNote}
              className="pill pill-secondary text-sm"
            >
              진행자 노트
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowIndex((prev) => !prev)}
            className="pill pill-secondary text-sm"
          >
            {state.slide + 1} / {SLIDES.length}
          </button>
        </div>
        <button type="button" onClick={() => go(1)} className="pill pill-primary">
          다음 →
        </button>
      </footer>
    </main>
  );
}

/**
 * 네 자리 입장 코드.
 *
 * 코드는 번들에 그대로 실린다 (NEXT_PUBLIC_). 감출 수 있는 값이 아닌데, 이건 금고
 * 자물쇠가 아니라 **문패**다 — 주소를 우연히 연 사람이 슬라이드를 미리 보거나 남의
 * 화면을 넘기는 것만 막으면 된다.
 */
function Gate({ code, onPass }: { code: string; onPass: () => void }) {
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (value.trim() === code) onPass();
    else {
      setWrong(true);
      setValue("");
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-canvas p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="t-eyebrow">2026 · 08 · 28</p>
        <h1 className="t-display">제1호 교사개발자 홈커밍데이</h1>
      </div>

      <form onSubmit={submit} className="flex flex-col items-center gap-3">
        <label htmlFor="sendev-code" className="t-body">
          입장 코드 네 자리
        </label>
        <input
          id="sendev-code"
          value={value}
          onChange={(event) => {
            setValue(event.target.value.replace(/\D/g, "").slice(0, 4));
            setWrong(false);
          }}
          inputMode="numeric"
          autoFocus
          className="field w-48 text-center text-3xl tracking-[0.4em]"
          placeholder="0000"
        />
        <button type="submit" className="pill pill-primary" disabled={value.length < 4}>
          들어가기
        </button>
        {wrong && <p className="t-body-sm">코드가 다릅니다.</p>}
      </form>
    </main>
  );
}

/**
 * 카운트다운.
 *
 * 남은 밀리초를 깎지 않고 **끝나는 시각**을 잡아 둔다. 15분짜리를 조금씩 빼면 탭이
 * 뒤로 갔다 오는 사이에 몇 초씩 어긋나는데, 발표 시간은 그 몇 초로 다툰다.
 *
 * 타이머는 이 화면 것이다 — 서버로 보내지 않는다. 참가자 휴대폰에 초가 흘러가면
 * 발표자만 쫓기고, 정작 시간을 재는 것은 진행자다.
 */
function Timer({ minutes }: { minutes: number }) {
  const total = minutes * 60_000;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const endAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const remain = Math.max(0, endAt.current - Date.now());
      setLeft(remain);
      if (remain === 0) setRunning(false);
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [running]);

  const mm = Math.floor(left / 60_000);
  const ss = Math.floor((left % 60_000) / 1000);
  // 1분 아래로 내려가면 눈에 띄어야 한다. 색만 바꾸고 깜빡이지 않는다 — 발표자가 흔들린다
  const urgent = left <= 60_000 && left > 0;

  const toggle = useCallback(() => {
    if (!running) endAt.current = Date.now() + left;
    setRunning(!running);
  }, [left, running]);

  return (
    <div className="flex items-center gap-2">
      <span className={`tabular-nums text-4xl font-bold ${urgent ? "text-magenta" : ""}`}>
        {mm}:{String(ss).padStart(2, "0")}
      </span>
      <button type="button" onClick={toggle} className="pill pill-secondary text-sm">
        {running ? "멈춤" : left === total ? "시작" : "이어서"}
      </button>
      <button
        type="button"
        onClick={() => {
          setRunning(false);
          setLeft(total);
        }}
        className="pill pill-secondary text-sm"
      >
        되돌리기
      </button>
    </div>
  );
}

export type { SlideKey };
