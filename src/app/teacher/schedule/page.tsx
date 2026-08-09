"use client";

import { useState } from "react";

import { TeacherShell } from "@/components/teacher-shell";
import { todayKST } from "@/lib/datetime";
import { periodTime, scheduleFor } from "@/lib/timetable";

/**
 * 시간표 → 학기 전체 세션 자동 생성 (PRD 4).
 *
 * 반별 요일·교시를 등록하면 시작일~종료일 사이 모든 수업 날짜에 세션이 만들어진다.
 * 반마다 날짜순으로 1차시, 2차시… 가 매겨지고, 같은 번호의 차시 계획이 있으면 스냅샷이 복사된다.
 */

interface Slot {
  classNo: number;
  weekday: number;
  period: number;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 2학기 월요일 시간표. 나머지 요일은 줄을 추가해 채운다.
 * 처음 열었을 때 빈 화면이 아니라 실제 시간표가 들어 있어야 첫날 준비가 빠르다.
 */
const DEFAULT_SLOTS: Slot[] = [
  { classNo: 1, weekday: 1, period: 2 },
  { classNo: 4, weekday: 1, period: 3 },
  { classNo: 2, weekday: 1, period: 5 },
  { classNo: 3, weekday: 1, period: 6 },
];

export default function SchedulePage() {
  return (
    <TeacherShell>
      <Schedule />
    </TeacherShell>
  );
}

function Schedule() {
  const [startDate, setStartDate] = useState(todayKST());
  const [endDate, setEndDate] = useState("2026-12-31");
  const [slots, setSlots] = useState<Slot[]>(DEFAULT_SLOTS);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  function updateSlot(index: number, patch: Partial<Slot>) {
    setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  }

  async function generate() {
    setBusy(true);
    setResult("");

    const response = await fetch("/api/teacher/sessions/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, slots }),
    });
    const data = await response.json();
    setBusy(false);

    setResult(
      data.ok
        ? `${data.created}개를 만들었습니다. (이미 있어서 건너뜀 ${data.skipped}개 / 전체 ${data.total}개)`
        : (data.message ?? "생성하지 못했습니다."),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-bold">시간표로 학기 수업 만들기</h1>
        <p className="mt-1 text-sm text-muted">
          반별 요일·교시를 등록하면 기간 안의 모든 수업이 한 번에 만들어집니다. 이미 있는
          (날짜·교시·반)은 건너뜁니다.
        </p>
        {scheduleFor(startDate) && (
          <p className="mt-2 text-xs text-muted">
            {startDate} 은 <b>{scheduleFor(startDate)!.label}</b> 적용 기간입니다
            ({scheduleFor(startDate)!.from} ~ {scheduleFor(startDate)!.to}).
          </p>
        )}
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">시작일</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="rounded-lg border border-line bg-card px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">종료일</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="rounded-lg border border-line bg-card px-3 py-2"
          />
        </label>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">시간표</h2>

        {slots.map((slot, index) => (
          <div key={index} className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-card px-4 py-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">반</span>
              <select
                value={slot.classNo}
                onChange={(event) => updateSlot(index, { classNo: Number(event.target.value) })}
                className="rounded-lg border border-line bg-background px-3 py-2"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}반
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">요일</span>
              <select
                value={slot.weekday}
                onChange={(event) => updateSlot(index, { weekday: Number(event.target.value) })}
                className="rounded-lg border border-line bg-background px-3 py-2"
              >
                {WEEKDAYS.map((label, value) => (
                  <option key={value} value={value}>
                    {label}요일
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">교시</span>
              <input
                type="number"
                min={1}
                max={8}
                value={slot.period}
                onChange={(event) => updateSlot(index, { period: Number(event.target.value) })}
                className="w-24 rounded-lg border border-line bg-background px-3 py-2"
              />
            </label>

            <span className="pb-2 text-xs text-muted">
              {periodTime(startDate, slot.period)
                ? `${periodTime(startDate, slot.period)!.start}~${periodTime(startDate, slot.period)!.end}`
                : ""}
            </span>

            <button
              type="button"
              onClick={() => setSlots((prev) => prev.filter((_, i) => i !== index))}
              disabled={slots.length === 1}
              className="rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-40"
            >
              삭제
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setSlots((prev) => [...prev, { classNo: 1, weekday: 1, period: 1 }])}
          className="self-start rounded-lg border border-line px-4 py-2 text-sm"
        >
          + 줄 추가
        </button>
      </section>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "만드는 중…" : "수업 만들기"}
        </button>
        {result && <p className="text-sm">{result}</p>}
      </div>
    </div>
  );
}
