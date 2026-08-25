"use client";

import { MOOD_GRID, getMood, moodCellStyle } from "@/lib/mood";

/**
 * 무드미터 표(10×10) 자체.
 *
 * 기분 체크(mood-picker)와 낱말을 배운 뒤 다시 고르는 화면(mood-recheck)이 같은 것을
 * 쓴다. 두 곳에 따로 그리면 한쪽만 고쳐져서 같은 수업 안에서 표가 달라진다.
 *
 * 가로축은 기분(불쾌↔쾌), 세로축은 기운(낮음↔높음)이다. **배치가 곧 축이라서**
 * 줄과 칸을 흐트러뜨리면 화면 안내("위로 갈수록 기운이 높고…")와 어긋난다.
 *
 * 색은 장식이 아니다. 가운데에서 멀수록 진해지는 그러데이션이 "얼마나 센 감정인가" 를
 * 읽는 단서다 (mood.ts 의 moodCellStyle).
 */
export function MoodGrid({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (mood: string) => void;
  disabled?: boolean;
}) {
  return (
    <>
      {/*
        열 칸을 한 줄에 넣으면 태블릿 세로에서 글자가 뭉갠다. 표를 가로로 밀 수 있게
        두고 최소 너비를 준다 — 칸을 접거나 줄여서 표 모양이 깨지면 축을 읽을 수 없다.
      */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div
          className="grid min-w-[52rem] gap-1"
          style={{ gridTemplateColumns: "repeat(10, minmax(0, 1fr))" }}
          role="group"
          aria-label="무드미터 감정 표"
        >
          {MOOD_GRID.flatMap((row) =>
            row.map((option) => {
              const selected = value === option.key;
              const cell = moodCellStyle(option);
              return (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled}
                  title={`${option.label} (${option.en})`}
                  onClick={() => onChange(option.key)}
                  style={selected ? undefined : cell}
                  className={`flex min-h-16 items-center justify-center rounded px-0.5 py-1 text-center text-[11px] leading-tight font-semibold break-keep transition active:scale-95 disabled:opacity-50 ${
                    selected ? "bg-ink text-canvas ring-4 ring-ink ring-offset-2" : ""
                  }`}
                >
                  {option.label}
                </button>
              );
            }),
          )}
        </div>
      </div>
      <p className="t-caption">표가 잘리면 좌우로 밀어서 볼 수 있어요.</p>
    </>
  );
}

/**
 * 고른 낱말을 표 위에 크게 띄운다.
 *
 * 백 칸 중 하나가 테두리만 달라지는 것으로는 무엇을 골랐는지 확인하기 어렵고,
 * 밀어서 보다 보면 고른 칸이 화면 밖으로 나간다.
 */
export function MoodBanner({ value, empty }: { value: string; empty: string }) {
  const picked = getMood(value);
  return (
    <p
      className="rounded-lg border-2 border-ink px-4 py-3 t-body"
      role="status"
      style={picked ? moodCellStyle(picked) : undefined}
    >
      {picked ? (
        <>
          <b>{picked.label}</b> <span className="t-caption">{picked.en}</span>
        </>
      ) : (
        empty
      )}
    </p>
  );
}
