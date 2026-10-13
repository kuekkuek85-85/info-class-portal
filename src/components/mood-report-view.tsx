"use client";

import { useEffect, useState } from "react";

/**
 * 마음일기 — 학기 내내 고른 마음 체크인을 모아 계산·시각화한 리포트 (마음 톡톡 8회기, 본인만 봄).
 *
 * ★ 프라이버시: /api/student/mood-report 가 **본인 것만** 모아 준다. AI 총평은 기분 라벨·숫자·
 * 회기 번호만 보고 쓴 것으로, 학번·이름·기분 이유는 Gemini 로 보내지 않는다. 기분 이유(reason)는
 * 화면에도 싣지 않는다(교사 전용). AI 총평이 없으면 계산 리포트만 보여 준다.
 */

interface MoodPoint {
  lessonNo: number;
  title: string;
  date: string;
  moodLabel: string;
  valence: number;
  arousal: number;
  color: string;
  /** 그때 내가 쓴 기분 이유 — 본인 화면에만 (AI·친구 비전송). 없으면 빈 문자열 */
  reason: string;
}
interface MoodStats {
  count: number;
  averageValence: number;
  topMood: { label: string; times: number } | null;
  best: { lessonNo: number; moodLabel: string; valence: number };
  hardest: { lessonNo: number; moodLabel: string; valence: number };
}
interface MoodReport {
  trend: MoodPoint[];
  stats: MoodStats | null;
  summary: string | null;
}

/** 회기 번호 라벨 — 마음 톡톡은 lessonNo 202~208 → "2회기"~"8회기" */
function sessionLabel(lessonNo: number): string {
  return lessonNo > 200 && lessonNo < 221 ? `${lessonNo - 200}회기` : `${lessonNo}차시`;
}

export function MoodReportView() {
  const [data, setData] = useState<MoodReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/student/mood-report");
        const result = await response.json();
        if (cancelled) return;
        if (result.ok) {
          setData({
            trend: result.trend ?? [],
            stats: result.stats ?? null,
            summary: result.summary ?? null,
          });
        } else {
          setError(result.message ?? "마음일기를 불러오지 못했어요.");
        }
      } catch {
        if (!cancelled) setError("마음일기를 불러오지 못했어요.");
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
  if (!data) {
    return <p className="rounded-xl border border-line bg-card px-4 py-4 text-sm text-muted">내 마음일기를 불러오는 중…</p>;
  }

  const { trend, stats, summary } = data;

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="t-headline">나의 마음일기</h2>
        <p className="t-body mt-1">
          수업을 시작할 때마다 고른 마음을 한자리에 모았어요. 8주 동안 내 마음이 어떻게 흘러왔는지 살펴봐요.
        </p>
        <p className="t-caption mt-1">이 기록은 나만 봐요 — 친구에게 보이지 않아요.</p>
      </div>

      {trend.length === 0 ? (
        <p className="rounded-xl border border-line bg-card px-4 py-4 text-sm text-muted">
          아직 모인 마음 체크인이 없어요. 다음 수업부터 시작할 때 오늘의 기분을 골라 보면 여기에 쌓여요.
        </p>
      ) : (
        <>
          <MoodTrend points={trend} />

          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="체크인 횟수" value={`${stats.count}번`} />
              <StatTile
                label="가장 많이 고른 기분"
                value={stats.topMood ? `${stats.topMood.label}` : "—"}
                note={stats.topMood ? `${stats.topMood.times}번` : undefined}
              />
              <StatTile
                label="가장 좋았던 때"
                value={stats.best.moodLabel}
                note={sessionLabel(stats.best.lessonNo)}
              />
              <StatTile
                label="가장 힘들었던 때"
                value={stats.hardest.moodLabel}
                note={sessionLabel(stats.hardest.lessonNo)}
              />
            </div>
          )}

          {summary && (
            <div className="rounded-2xl border border-line bg-cream px-4 py-4">
              <p className="t-caption font-medium">AI가 내 마음일기를 보고 건네는 한마디</p>
              <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed">{summary}</p>
              <p className="t-caption mt-2 opacity-70">
                이 한마디는 내가 고른 기분 낱말과 숫자만 보고 쓴 거예요. 이름이나 적은 이유는 보내지 않았어요.
              </p>
            </div>
          )}

          {trend.some((t) => t.reason) && (
            <div className="rounded-2xl border border-line bg-card px-4 py-3">
              <h3 className="t-subhead">회기별 내가 쓴 기분 이유</h3>
              <p className="t-caption mt-1">내가 그때 적은 이유예요 — 나만 봐요(친구·AI에게 보내지 않아요).</p>
              <ul className="mt-2 flex flex-col gap-3">
                {trend
                  .filter((t) => t.reason)
                  .map((t, i) => (
                    <li key={`${t.lessonNo}-${i}`} className="flex flex-col">
                      <span className="text-sm font-medium text-muted">
                        {sessionLabel(t.lessonNo)} · {t.moodLabel}
                      </span>
                      <span className="mt-1 whitespace-pre-wrap text-base leading-relaxed">{t.reason}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col rounded-xl border border-line bg-card px-3 py-3">
      <span className="t-caption">{label}</span>
      <span className="mt-1 text-lg font-bold leading-tight">{value}</span>
      {note && <span className="t-caption mt-0.5 opacity-70">{note}</span>}
    </div>
  );
}

/**
 * 회기별 기분 추이 — 가로축은 회기 순서, 세로축은 기분(valence: 위 좋음 · 아래 힘듦).
 * 외부 라이브러리 없이 inline SVG 로 그린다(학교망 차단·용량과 무관하게 안전).
 */
function MoodTrend({ points }: { points: MoodPoint[] }) {
  const W = 600;
  const H = 190;
  const padX = 44;
  const top = 24;
  const bottom = 150; // valence 축 영역 바닥
  const mid = (top + bottom) / 2;
  const span = (bottom - top) / 2; // valence ±5 을 이 높이에 매핑

  const n = points.length;
  const xAt = (i: number) => (n <= 1 ? W / 2 : padX + (i * (W - padX * 2)) / (n - 1));
  const yAt = (valence: number) => mid - (Math.max(-5, Math.min(5, valence)) / 5) * span;

  const line = points.map((p, i) => `${xAt(i)},${yAt(p.valence)}`).join(" ");

  return (
    <div className="rounded-2xl border border-line bg-card px-4 py-3">
      <h3 className="t-subhead">회기별 마음 체크인 추이</h3>
      <p className="t-caption mt-1">수업을 시작할 때 고른 기분이에요. 위로 갈수록 기분 좋음, 아래로 갈수록 힘듦.</p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 h-auto w-full"
        role="img"
        aria-label="회기별 기분 추이 그래프"
      >
        {/* 가운데(보통) 기준선 */}
        <line x1={padX} y1={mid} x2={W - padX} y2={mid} stroke="var(--line, #ddd)" strokeWidth={1} strokeDasharray="4 4" />
        <text x={8} y={top + 4} className="fill-current" fontSize={13} opacity={0.6}>좋음</text>
        <text x={8} y={bottom + 4} className="fill-current" fontSize={13} opacity={0.6}>힘듦</text>

        {/* 추이 선 */}
        {n > 1 && <polyline points={line} fill="none" stroke="var(--ink, #333)" strokeWidth={2.5} opacity={0.5} />}

        {/* 점 + 회기 라벨 + 기분말 */}
        {points.map((p, i) => (
          <g key={`${p.lessonNo}-${i}`}>
            <circle cx={xAt(i)} cy={yAt(p.valence)} r={9} fill={p.color} stroke="var(--ink, #333)" strokeWidth={1.5}>
              <title>{`${sessionLabel(p.lessonNo)} · ${p.moodLabel}`}</title>
            </circle>
            <text x={xAt(i)} y={H - 20} textAnchor="middle" className="fill-current" fontSize={13} opacity={0.75}>
              {sessionLabel(p.lessonNo)}
            </text>
            <text x={xAt(i)} y={H - 4} textAnchor="middle" className="fill-current" fontSize={12} opacity={0.6}>
              {p.moodLabel}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
