"use client";

import { useState } from "react";

import type { ContentCard, ContentTab } from "@/lib/types";

/**
 * 안내 단계 화면.
 *
 * 태블릿을 무릎에 두고 보는 중1이 대상이라 글자를 키우고 덩어리로 끊는다.
 * 긴 문단은 눈이 미끄러진다 — 단원은 카드로, 평가는 표와 탭으로 나눈다.
 */

export interface Content {
  heading: string;
  body: string;
  url: string;
  cards?: ContentCard[];
  tabs?: ContentTab[];
}

export function ContentView({
  content,
  fallback,
}: {
  content: Content;
  fallback: string;
}) {
  const hasAnything =
    content.heading || content.body || content.url || content.cards?.length || content.tabs?.length;

  if (!hasAnything) {
    return (
      <section className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-card px-6 py-16 text-center">
        <h2 className="text-xl font-semibold">{fallback}</h2>
        <p className="text-sm text-muted">선생님 화면을 봐 주세요.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-2xl font-bold">{content.heading || fallback}</h2>

      {content.cards && content.cards.length > 0 && <Cards cards={content.cards} />}
      {content.tabs && content.tabs.length > 0 && <Tabs tabs={content.tabs} />}

      {/* 구조화된 내용이 없을 때만 원문 그대로 */}
      {!content.cards?.length && !content.tabs?.length && content.body && (
        <p className="whitespace-pre-wrap rounded-xl border border-line bg-card px-4 py-3 text-lg leading-relaxed">
          {content.body}
        </p>
      )}

      {content.url && (
        <div className="overflow-hidden rounded-2xl border border-line bg-card">
          <iframe
            src={content.url}
            title={content.heading || fallback}
            className="h-[60vh] w-full"
            allow="fullscreen; autoplay; encrypted-media"
          />
        </div>
      )}
    </section>
  );
}

const CARD_TONES = [
  "border-sky-300 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40",
  "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
  "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
  "border-violet-300 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/40",
];

function Cards({ cards }: { cards: ContentCard[] }) {
  return (
    <div className="flex flex-col gap-3">
      {cards.map((card, index) => (
        <article
          key={index}
          className={`rounded-2xl border-2 px-5 py-4 ${CARD_TONES[index % CARD_TONES.length]}`}
        >
          <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="rounded-lg bg-foreground px-2.5 py-1 text-sm font-bold text-background">
              {card.badge}
            </span>
            <h3 className="text-2xl font-bold">{card.title}</h3>
            {card.note && (
              <span className="ml-auto text-base font-medium text-zinc-600 dark:text-zinc-300">
                {card.note}
              </span>
            )}
          </header>

          {card.lines.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {card.lines.map((line, i) => (
                <li key={i} className="text-lg leading-relaxed text-zinc-800 dark:text-zinc-100">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  );
}

function Tabs({ tabs }: { tabs: ContentTab[] }) {
  const [active, setActive] = useState(0);
  const tab = tabs[active] ?? tabs[0];

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="수행평가" className="flex gap-2">
        {tabs.map((item, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={active === index}
            onClick={() => setActive(index)}
            className={`flex-1 rounded-xl px-4 py-3 text-lg font-bold transition ${
              active === index
                ? "bg-accent text-white"
                : "border-2 border-line bg-card text-muted hover:border-accent"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border-2 border-line bg-card px-5 py-4">
        <header className="flex flex-wrap items-baseline gap-x-3">
          <h3 className="text-2xl font-bold">{tab.subtitle}</h3>
          {tab.note && (
            <span className="rounded-lg bg-accent/15 px-2.5 py-1 text-base font-semibold text-accent">
              {tab.note}
            </span>
          )}
        </header>

        {tab.rows.length > 0 && (
          <dl className="overflow-hidden rounded-xl border border-line">
            {tab.rows.map((row, index) => (
              <div
                key={index}
                className={`grid grid-cols-[7.5rem_1fr] gap-3 px-4 py-3 ${
                  index > 0 ? "border-t border-line" : ""
                }`}
              >
                <dt className="text-base font-bold text-muted">{row.label}</dt>
                <dd className="whitespace-pre-wrap text-lg leading-relaxed">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {tab.highlights.length > 0 && (
          <ul className="flex flex-col gap-2">
            {tab.highlights.map((line, index) => (
              <li
                key={index}
                className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-lg font-medium leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
              >
                ★ {line}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
