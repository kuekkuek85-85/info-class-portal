"use client";

import { useCallback, useEffect, useState } from "react";

import { HanoiQr } from "../hanoi-qr";
import { ARCHIVE, CHAPTERS, type ArchiveSlide } from "./slides";

/**
 * 끝난 행사를 넘겨 보는 화면.
 *
 * ## 읽기만 한다
 *
 * 여는 단추도, 답을 적는 칸도, 따라오기도 없다. 서버로 나가는 요청이 한 건도 없고
 * 상태는 "몇 번째 장인가" 하나뿐이다. 그래서 링크를 아무에게나 줘도 이 화면으로
 * 무엇을 바꿀 수 없다.
 *
 * ## 주소에 장 번호를 남긴다
 *
 * 아흔 장이 넘는다. 새로고침 한 번에 처음으로 돌아가면 "아까 그 장" 을 다시 찾는 데
 * 한참 걸리고, 남에게 특정 장을 가리킬 방법도 없다. 해시(`#12`)로 남겨 두면 둘 다
 * 풀린다 — 서버가 관여하지 않으므로 정적인 채로 그대로다.
 */
export function SendevArchive() {
  const [at, setAt] = useState(0);
  const last = ARCHIVE.length - 1;

  const go = useCallback(
    (delta: number) => {
      setAt((prev) => Math.min(last, Math.max(0, prev + delta)));
    },
    [last],
  );

  // 주소에 남은 장이 있으면 거기서 시작한다. 첫 그림은 서버와 같아야 하므로 붙은 뒤에 읽는다
  useEffect(() => {
    const read = () => {
      const n = Number.parseInt(window.location.hash.slice(1), 10);
      if (Number.isFinite(n) && n >= 1 && n <= ARCHIVE.length) setAt(n - 1);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  useEffect(() => {
    // replaceState 로 남긴다 — pushState 면 뒤로가기를 아흔 번 눌러야 나간다
    window.history.replaceState(null, "", `#${at + 1}`);
  }, [at]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
        event.preventDefault();
        go(1);
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        go(-1);
      }
      if (event.key === "Home") setAt(0);
      if (event.key === "End") setAt(last);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, last]);

  const here = CHAPTERS.filter((c) => c.at <= at).at(-1);

  return (
    <main className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-6 pt-5 sm:px-8">
        <p className="t-eyebrow">제1호 교사개발자 홈커밍데이 · 2026.08.28</p>
        <p className="t-caption">{here?.label}</p>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-4 sm:px-8">
        <div key={at} className="sendev-slide-enter mx-auto w-full max-w-5xl">
          <Panel slide={ARCHIVE[at]} />
        </div>
      </div>

      {/* 장 건너뛰기. 아흔 장을 이전·다음으로만 오가게 두면 아무도 뒤쪽을 안 본다 */}
      <nav className="flex flex-wrap items-center justify-center gap-2 px-4 pb-2">
        {CHAPTERS.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setAt(c.at)}
            aria-current={here?.label === c.label ? "true" : undefined}
            className={`pill text-sm ${here?.label === c.label ? "pill-primary" : "pill-secondary"}`}
          >
            {c.label}
          </button>
        ))}
      </nav>

      <footer className="flex items-center justify-between gap-3 px-6 pb-5 sm:px-8">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={at === 0}
          className="pill pill-secondary"
        >
          ← 이전
        </button>
        <p className="t-caption t-num">
          {at + 1} / {ARCHIVE.length}
        </p>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={at === last}
          className="pill pill-primary"
        >
          다음 →
        </button>
      </footer>
    </main>
  );
}

function Panel({ slide }: { slide: ArchiveSlide }) {
  switch (slide.kind) {
    case "cover":
      return (
        <div className="flex flex-col items-center gap-5 text-center">
          <p className="t-eyebrow">2026 · 08 · 28 · 금</p>
          <h1 className="t-display">제1호 교사개발자 홈커밍데이</h1>
          <p className="t-headline">나눔 세션 기록</p>
          <p className="t-body-lg text-muted">
            그날 화면 그대로입니다. 손들기 답과 받은 질문, 세 분의 발표 자료를 함께 담았습니다.
          </p>
          <p className="t-caption">← → 또는 아래 단추로 넘기세요</p>
        </div>
      );

    case "flow":
      return (
        <div className="flex flex-col gap-5">
          <h1 className="t-display">오늘의 흐름</h1>
          <ol className="grid gap-3 sm:grid-cols-2">
            {slide.steps.map((step, i) => (
              <li key={step} className="block flex items-baseline gap-3 bg-surface t-headline">
                <span className="t-eyebrow">{String(i + 1).padStart(2, "0")}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      );

    case "text":
      return (
        <div className="flex flex-col gap-5">
          {slide.eyebrow && <p className="t-eyebrow">{slide.eyebrow}</p>}
          <h1 className="t-display">{slide.title}</h1>
          {slide.lines?.map((line) => (
            <p key={line} className="t-headline whitespace-pre-line">
              {line}
            </p>
          ))}
          {slide.foot && <p className="t-body-lg text-muted">{slide.foot}</p>}
        </div>
      );

    case "count":
      return (
        <div className="flex flex-col gap-6">
          <p className="t-eyebrow">{slide.eyebrow}</p>
          <h1 className="t-display">{slide.q}</h1>
          <p className="t-num text-7xl font-bold sm:text-8xl">{slide.n}명</p>
        </div>
      );

    case "bubbles":
      return (
        <div className="flex flex-col gap-5">
          <p className="t-eyebrow">{slide.eyebrow}</p>
          <h1 className="t-headline">{slide.q}</h1>
          <ul className="flex flex-wrap gap-3">
            {slide.items.map((item) => (
              <li key={item} className="rounded-xl bg-surface px-5 py-3 t-body-lg">
                {item}
              </li>
            ))}
          </ul>
          <p className="t-caption text-muted">{slide.items.length}명이 답했습니다</p>
        </div>
      );

    case "rent": {
      const total = slide.amounts.reduce((sum, n) => sum + n, 0);
      const won = (n: number) => n.toLocaleString("ko-KR");
      return (
        <div className="flex flex-col gap-5">
          <p className="t-eyebrow">{slide.eyebrow}</p>
          <h1 className="t-headline">{slide.q}</h1>
          <p className="t-num text-6xl font-bold sm:text-7xl">{won(slide.amounts[0])}원</p>
          <p className="t-body-lg text-muted">가장 많이 내시는 분</p>
          <ul className="flex flex-wrap gap-2">
            {slide.amounts.slice(1).map((n, i) => (
              <li
                key={`${n}-${i}`}
                className="t-num rounded-full bg-surface px-4 py-2 t-body-lg"
              >
                {won(n)}
              </li>
            ))}
          </ul>
          <p className="t-body-lg">
            {slide.amounts.length}명 합계 <b className="t-num">{won(total)}원</b>
          </p>
        </div>
      );
    }

    case "talk":
      return (
        <div className="flex flex-col gap-4">
          <p className="t-eyebrow">{slide.where}</p>
          <h1 className="t-display">{slide.title}</h1>
          <p className="t-headline">{slide.speaker}</p>
          <p className="t-body-lg text-muted">{slide.line}</p>
          <p className="t-caption">다음 장부터 발표 자료입니다</p>
        </div>
      );

    case "page":
      return (
        <figure className="flex flex-col items-center gap-3">
          {/*
            발표 자료를 편 정적 이미지다. 일흔 장 넘는 것을 최적화 파이프라인에 태울
            이유가 없고, 원본 비율 그대로 보이는 편이 발표자의 자료를 덜 건드린다.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.src}
            alt={`${slide.deck} — ${slide.page}쪽`}
            className="h-auto w-full rounded-lg border border-line"
          />
          <figcaption className="t-caption text-muted">
            {slide.deck} · <span className="t-num">{slide.page} / {slide.total}</span>
          </figcaption>
        </figure>
      );

    case "asks":
      return (
        <div className="flex flex-col gap-5">
          <p className="t-eyebrow">{slide.eyebrow}</p>
          <h1 className="t-headline">발표를 들으며 휴대폰으로 남긴 질문입니다</h1>
          <ul className="flex flex-col gap-3">
            {slide.items.map((item) => (
              <li key={item} className="rounded-xl bg-surface px-5 py-4 t-body-lg">
                {item}
              </li>
            ))}
          </ul>
        </div>
      );

    case "quiz":
      return (
        <div className="flex flex-col gap-5">
          <p className="t-eyebrow">{slide.eyebrow}</p>
          {slide.items.map((item) => (
            <div key={item.q} className="block flex flex-col gap-2 bg-cream">
              <p className="t-headline">{item.q}</p>
              <p className="t-display">{item.a}</p>
              {item.note && <p className="t-body-lg">{item.note}</p>}
            </div>
          ))}
        </div>
      );

    case "awards":
      return (
        <div className="flex flex-col gap-5">
          <h1 className="t-display">🏆 손목 산재 위로상</h1>
          <p className="t-body-lg">
            발표 준비로 혹사당한 손목에, 학교안전공제회를 대신하여
            <br />
            교사개발자 1기 일동이 위로의 뜻을 전합니다.
          </p>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex flex-1 flex-col gap-3">
              {slide.names.map((name) => (
                <p key={name} className="t-headline">
                  {name}
                </p>
              ))}
            </div>
            <Photo src={slide.photo} alt={slide.prize} className="max-w-[13rem]" />
          </div>
          <p className="t-headline">{slide.prize}</p>
        </div>
      );

    case "hall":
      return (
        <div className="flex flex-col gap-4">
          <h1 className="t-display">명예의 전당</h1>
          <div className="block flex flex-col gap-2 bg-lime">
            <p className="t-eyebrow">최소 이동 · 최단 시간</p>
            <p className="t-display">{slide.champion}</p>
          </div>
          <div className="block flex items-center gap-4 bg-coral">
            <div className="flex flex-1 flex-col gap-2">
              <p className="t-eyebrow">브루트포스 끈기상 · 최다 이동수</p>
              <p className="t-display">{slide.grit}</p>
              <p className="t-body-lg">집에서 연습하시라고 교구를 드렸습니다 🗼</p>
            </div>
            <Photo src={slide.photo} alt="하노이탑 나무 교구" className="max-w-[9rem]" />
          </div>
        </div>
      );

    case "photos":
      return (
        <div className="flex flex-col gap-5">
          <h1 className="t-display">{slide.title}</h1>
          {slide.lines.map((line) => (
            <p key={line} className="t-headline whitespace-pre-line">
              {line}
            </p>
          ))}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {slide.photos.map((src) => (
              <Photo key={src} src={src} alt="기념품 키캡" className="max-w-[13rem]" />
            ))}
          </div>
          <p className="t-headline text-center">🐾 전원 증정</p>
        </div>
      );

    case "hanoi":
      return (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="flex flex-col items-center gap-3">
            <HanoiQr className="h-44 w-44 sm:h-52 sm:w-52" />
            <p className="t-caption break-all text-center">{slide.url}</p>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <p className="t-eyebrow">하노이 탑</p>
            <h1 className="t-display">3분, 다 같이 한 판</h1>
            <ol className="flex flex-col gap-2 t-body-lg">
              {slide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {/* 기록 중에 하나뿐인 바깥 링크다. 새 창으로 열어 읽던 자리를 잃지 않게 한다 */}
            <a
              href={slide.url}
              target="_blank"
              rel="noreferrer"
              className="pill pill-primary self-start"
            >
              지금 해 보기 →
            </a>
            <p className="t-body-lg text-muted">{slide.foot}</p>
          </div>
        </div>
      );

    case "concat":
      return (
        <div className="flex flex-col gap-5">
          <p className="sendev-code px-6 py-3 text-center font-mono text-xl sm:text-3xl">
            {slide.command}
          </p>
          {slide.lines.map((line) => (
            <p key={line} className="t-headline whitespace-pre-line">
              {line}
            </p>
          ))}
        </div>
      );
  }
}

/** 파일이 없으면 아무것도 안 그린다 — 깨진 그림이 기록에 남는 것보다 낫다 */
function Photo({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 정적 기념 사진
    <img
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      className={`mx-auto h-auto w-full rounded-lg ${className}`}
    />
  );
}
