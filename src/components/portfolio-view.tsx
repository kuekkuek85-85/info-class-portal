"use client";

import { useEffect, useState } from "react";

import { ArtifactCanvas } from "@/components/artifact-canvas";
import type { Stroke, TextItem } from "@/lib/types";

/**
 * 포트폴리오 — 학생 본인의 지난 회기 활동/작품 + 회기별 기분 추이 (마음 톡톡 8회기 성찰).
 *
 * ★ 프라이버시: /api/student/portfolio 가 **본인 것만** 모아 준다. 친구 것은 없고, AI 전송도
 * 없다. 이 화면은 읽기 전용 — 아래 활동지(그때 마음 적기)에 쓰도록 떠올리게 하는 자리다.
 */

interface Highlight {
  label: string;
  value: string;
  link: boolean;
}
interface Work {
  activityId: string;
  label: string;
  highlights: Highlight[];
  drawing: { strokes: Stroke[]; texts: TextItem[]; title: string } | null;
}
interface MoodPoint {
  lessonNo: number;
  title: string;
  date: string;
  moodLabel: string;
  valence: number;
  arousal: number;
  color: string;
}
interface PortfolioData {
  works: Work[];
  moodTrend: MoodPoint[];
}

/** 회기 번호 라벨 — 마음 톡톡은 lessonNo 202~208 → "2회기"~"8회기" */
function sessionLabel(lessonNo: number): string {
  return lessonNo > 200 && lessonNo < 221 ? `${lessonNo - 200}회기` : `${lessonNo}차시`;
}

export function PortfolioView() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/student/portfolio");
        const result = await response.json();
        if (cancelled) return;
        if (result.ok) setData({ works: result.works ?? [], moodTrend: result.moodTrend ?? [] });
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
  if (!data) {
    return <p className="rounded-xl border border-line bg-card px-4 py-4 text-sm text-muted">내 기록을 불러오는 중…</p>;
  }

  const { works, moodTrend } = data;

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="t-headline">지난 8주, 내 마음의 기록</h2>
        <p className="t-body mt-1">
          그동안 내가 남긴 것들이에요. 천천히 넘겨 보고, 그때 내 마음이 어땠는지 아래 활동지에 적어 봐요.
        </p>
        <p className="t-caption mt-1">이 기록은 나만 봐요 — 친구에게 보이지 않아요.</p>
      </div>

      {moodTrend.length > 0 && <MoodTrend points={moodTrend} />}

      {works.length === 0 ? (
        <p className="rounded-xl border border-line bg-card px-4 py-4 text-sm text-muted">
          지난 회기에 저장된 작품을 아직 못 찾았어요. 아래 활동지에 기억나는 활동과 그때 마음을 적어 봐요.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {works.map((work) => (
            <li key={work.activityId} className="rounded-2xl border border-line bg-card px-4 py-3">
              <h3 className="t-subhead">{work.label}</h3>

              {work.drawing && (
                <figure className="mt-3">
                  <ArtifactCanvas
                    strokes={work.drawing.strokes}
                    texts={work.drawing.texts}
                    pixelWidth={360}
                    className="h-auto w-full max-w-sm rounded-lg border border-line bg-white"
                  />
                  <figcaption className="t-caption mt-1">{work.drawing.title}</figcaption>
                </figure>
              )}

              {work.highlights.map((h, i) => (
                <div key={i} className="mt-3">
                  <p className="text-sm font-medium text-muted">{h.label}</p>
                  {h.link ? (
                    <a
                      href={h.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block break-all text-base underline"
                    >
                      {h.value}
                    </a>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed">{h.value}</p>
                  )}
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </section>
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
