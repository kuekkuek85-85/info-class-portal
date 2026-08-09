"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { formatDateKorean } from "@/lib/datetime";

/**
 * 학생 본인의 누적 성찰 기록 (PRD 3.4 — 한 학기치 성장 기록).
 * 수행평가1 디지털 시민 리포트의 포트폴리오 근거가 되는 화면이다.
 */

interface HistoryItem {
  date: string;
  lessonNo: number | null;
  title: string;
  entries: { question: string; answer: string }[];
  moodLabel: string;
  updatedAt: number;
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/student/history");
      const result = await response.json();
      if (result.ok) setItems(result.items as HistoryItem[]);
      else setError(result.message ?? "기록을 불러오지 못했어요.");
    }
    void load();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내 기록</h1>
        <Link href="/lesson" className="rounded-lg border border-line px-3 py-1.5 text-sm">
          수업으로
        </Link>
      </header>

      {error && <p className="text-sm text-muted">{error}</p>}
      {!items && !error && <p className="text-sm text-muted">불러오는 중…</p>}

      {items?.length === 0 && (
        <p className="rounded-xl border border-line bg-card px-4 py-6 text-center text-sm text-muted">
          아직 남긴 성찰이 없어요. 오늘 수업에서 첫 기록을 남겨 보세요.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {items?.map((item, index) => (
          <li key={index} className="rounded-2xl border border-line bg-card px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <span>{formatDateKorean(item.date)}</span>
              {item.lessonNo && <span>· {item.lessonNo}차시</span>}
              {item.title && <span>· {item.title}</span>}
              {item.moodLabel && <span>· 그날 기분: {item.moodLabel}</span>}
            </div>
            {item.entries.map((entry, i) => (
              <div key={i} className="mt-3">
                {entry.question && (
                  <p className="text-sm font-medium text-muted">
                    {i + 1}. {entry.question}
                  </p>
                )}
                <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed">{entry.answer}</p>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
