"use client";

import { useEffect, useState } from "react";

/**
 * 포트폴리오 — 학생 본인의 지난 회기 활동을 **회기별 아코디언**으로 돌아본다 (마음 톡톡 8회기 성찰).
 *
 * ★ 프라이버시: /api/student/portfolio 가 **본인 것만** 모아 준다. 친구 것은 없고, AI 전송도
 * 없다. 이 화면은 읽기 전용 — 회기를 눌러 펼치면 그때 쓴 활동지 답과 성찰이 라벨과 함께 보인다.
 * 기분(mood) 분석은 '마음일기' 단계로 옮겼다 — 여기엔 없다.
 */

interface PortfolioItem {
  label: string;
  value: string;
  link: boolean;
}
interface PortfolioSession {
  activityId: string;
  heading: string;
  subhead: string;
  lessonNo: number;
  items: PortfolioItem[];
  reflections: { question: string; answer: string }[];
}

export function PortfolioView() {
  const [sessions, setSessions] = useState<PortfolioSession[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/student/portfolio");
        const result = await response.json();
        if (cancelled) return;
        if (result.ok) setSessions(result.sessions ?? []);
        else setError(result.message ?? "기록을 불러오지 못했어요.");
      } catch {
        if (!cancelled) setError("기록을 불러오지 못했어요.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="rounded-xl border border-line bg-card px-4 py-4 text-sm text-muted">{error}</p>;
  }
  if (!sessions) {
    return <p className="rounded-xl border border-line bg-card px-4 py-4 text-sm text-muted">내 기록을 불러오는 중…</p>;
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="t-headline">지난 8주, 내가 남긴 기록</h2>
        <p className="t-body mt-1">
          회기를 눌러 펼치면 그때 내가 쓴 활동지와 성찰이 보여요. 천천히 읽어 보고, 아래 활동지에 그때 마음을 적어 봐요.
        </p>
        <p className="t-caption mt-1">이 기록은 나만 봐요 — 친구에게 보이지 않아요.</p>
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-xl border border-line bg-card px-4 py-4 text-sm text-muted">
          지난 회기에 저장된 기록을 아직 못 찾았어요. 아래 활동지에 기억나는 활동과 그때 마음을 적어 봐요.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => {
            const isOpen = open[s.activityId] ?? false;
            return (
              <li key={s.activityId} className="overflow-hidden rounded-2xl border border-line bg-card">
                <button
                  type="button"
                  onClick={() => setOpen((prev) => ({ ...prev, [s.activityId]: !isOpen }))}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="flex flex-col">
                    <span className="t-subhead">{s.heading}</span>
                    {s.subhead && <span className="t-caption mt-0.5">{s.subhead}</span>}
                  </span>
                  <span className="t-caption shrink-0" aria-hidden="true">
                    {isOpen ? "접기 ▲" : "펼치기 ▼"}
                  </span>
                </button>

                {isOpen && (
                  <div className="flex flex-col gap-3 border-t border-line px-4 py-3">
                    {s.items.length === 0 && s.reflections.length === 0 && (
                      <p className="t-caption">이 회기에 저장된 답이 없어요.</p>
                    )}

                    {s.items.map((item, i) => (
                      <div key={`a-${i}`}>
                        <p className="text-sm font-medium text-muted">{item.label}</p>
                        {item.link ? (
                          <a
                            href={item.value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block break-all text-base underline"
                          >
                            {item.value}
                          </a>
                        ) : (
                          <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed">{item.value}</p>
                        )}
                      </div>
                    ))}

                    {s.reflections.length > 0 && (
                      <div className="mt-1 flex flex-col gap-3 rounded-xl border border-line bg-background px-3 py-3">
                        <p className="t-caption font-medium">그때의 성찰</p>
                        {s.reflections.map((r, i) => (
                          <div key={`r-${i}`}>
                            <p className="text-sm font-medium text-muted">{r.question}</p>
                            <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed">{r.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
