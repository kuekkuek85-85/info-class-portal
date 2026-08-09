"use client";

import { useState } from "react";

import type { ContentCard, ContentTab } from "@/lib/types";

/**
 * 안내 단계 화면.
 *
 * 디자인 시스템의 색 블록을 그대로 쓴다 — 그림자 없이 색면이 구획을 만든다.
 * 태블릿을 무릎에 두고 보는 중1이 대상이라 글자를 키우고 덩어리로 끊는다.
 */

export interface Content {
  heading: string;
  body: string;
  url: string;
  cards?: ContentCard[];
  tabs?: ContentTab[];
}

export function ContentView({ content, fallback }: { content: Content; fallback: string }) {
  const hasAnything =
    content.heading || content.body || content.url || content.cards?.length || content.tabs?.length;

  if (!hasAnything) {
    return (
      <section className="block flex flex-col items-center gap-2 bg-surface py-16 text-center">
        <h2 className="t-headline">{fallback}</h2>
        <p className="t-body-sm">선생님 화면을 봐 주세요.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <h2 className="t-display">{content.heading || fallback}</h2>

      {content.cards && content.cards.length > 0 && <Cards cards={content.cards} />}
      {content.tabs && content.tabs.length > 0 && <Tabs tabs={content.tabs} />}

      {/* 구조화된 내용이 없을 때만 원문 그대로 */}
      {!content.cards?.length && !content.tabs?.length && content.body && (
        <p className="card t-body-lg whitespace-pre-wrap">{content.body}</p>
      )}

      {content.url && (
        <div className="overflow-hidden rounded-md border border-line">
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

/*
 * 카드마다 다른 파스텔 면을 준다. 디자인 문서는 한 화면에 색 블록 하나를 권하지만,
 * 여기서는 카드가 곧 "단원 구분"이라 색이 분류 기능을 한다 — 나란히 놓아야 비교가 된다.
 */
const CARD_TONES = ["bg-lime", "bg-mint", "bg-cream", "bg-lilac"];

function Cards({ cards }: { cards: ContentCard[] }) {
  return (
    <div className="flex flex-col gap-4">
      {cards.map((card, index) => (
        <article key={index} className={`block ${CARD_TONES[index % CARD_TONES.length]}`}>
          <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="rounded-full bg-ink px-3 py-1 text-sm font-semibold text-canvas">
              {card.badge}
            </span>
            <h3 className="t-card-title">{card.title}</h3>
            {card.note && <span className="t-body-sm ml-auto font-semibold">{card.note}</span>}
          </header>

          {card.lines.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {card.lines.map((line, i) => (
                <li key={i} className="t-body-lg">
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
      {/* 선택된 탭은 기본 CTA 와 같은 검은 면 — 디자인 문서의 pricing-tab 규칙 */}
      <div role="tablist" aria-label="수행평가" className="flex gap-2">
        {tabs.map((item, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={active === index}
            onClick={() => setActive(index)}
            className={`pill flex-1 ${active === index ? "pill-primary" : "pill-secondary"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="block flex flex-col gap-5 bg-surface">
        <header className="flex flex-wrap items-baseline gap-x-3">
          <h3 className="t-headline">{tab.subtitle}</h3>
          {tab.note && (
            <span className="rounded-full bg-ink px-3 py-1 text-sm font-semibold text-canvas">
              {tab.note}
            </span>
          )}
        </header>

        {tab.rows.length > 0 && (
          <dl className="overflow-hidden rounded-md border border-line bg-canvas">
            {tab.rows.map((row, index) => (
              <div
                key={index}
                className={`grid grid-cols-[6.5rem_1fr] gap-4 px-4 py-4 ${
                  index > 0 ? "border-t border-line-soft" : ""
                }`}
              >
                <dt className="t-body-sm font-bold">{row.label}</dt>
                <dd className="t-body whitespace-pre-wrap">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {tab.highlights.length > 0 && (
          <ul className="flex flex-col gap-3">
            {tab.highlights.map((line, index) => (
              <li key={index} className="rounded-md bg-lilac px-4 py-4 t-body font-medium">
                ★ {line}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
