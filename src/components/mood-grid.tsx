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
 *
 * ## 백 칸이 한 화면에 다 보여야 한다
 *
 * 처음에는 칸에 넉넉한 크기를 주고 표를 가로로 밀게 했다. 그랬더니 실제 수업에서
 * **스크롤 밖으로 나간 낱말은 아무도 안 골랐다.** 백 칸으로 늘린 이유가 통째로 사라진다.
 *
 * 그래서 칸 크기를 화면에 맞춰 줄인다. 글자는 `clamp()` 로 화면 폭을 따라가고,
 * 줄 높이는 `dvh` 로 잡아 세로로도 넘치지 않게 한다. 좁은 화면에서 글자가 작아지는
 * 것은 감수한다 — 작아도 보이는 것이, 커도 안 보이는 것보다 낫다.
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
    <div
      className="grid w-full gap-px"
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
              onClick={() => onChange(option.key)}
              style={{
                ...(selected ? {} : cell),
                // 열 칸 × 열 줄이 화면 안에 들어가야 한다. 폭·높이 둘 다 화면을 따라간다
                fontSize: "clamp(8px, 0.95vw, 12px)",
                minHeight: "clamp(34px, 4.6dvh, 56px)",
              }}
              className={`flex items-center justify-center rounded-[3px] px-px py-0.5 text-center leading-[1.15] font-semibold break-keep transition active:scale-95 disabled:opacity-50 ${
                selected ? "bg-ink text-canvas outline outline-2 outline-offset-1 outline-ink" : ""
              }`}
            >
              {option.label}
            </button>
          );
        }),
      )}
    </div>
  );
}

/**
 * 고른 낱말과 **그 뜻**을 표 위에 띄운다.
 *
 * 뜻풀이가 이 자리에 있는 이유: 칸에 떠 있는 말풍선으로 만들면 백 칸짜리 표에서
 * 옆 칸을 가리고, 태블릿에서는 손가락이 그 위에 얹혀 읽을 수가 없다. 늘 같은 자리에
 * 나오면 "누르면 여기에 뜬다" 를 한 번만 익히면 된다.
 *
 * 백 칸 중 하나가 테두리만 달라지는 것으로는 무엇을 골랐는지 확인하기도 어렵다.
 */
export function MoodBanner({ value, empty }: { value: string; empty: string }) {
  const picked = getMood(value);
  return (
    <div
      className="rounded-lg border-2 border-ink px-4 py-3"
      role="status"
      style={picked ? moodCellStyle(picked) : undefined}
    >
      {picked ? (
        <>
          <p className="t-body">
            <b>{picked.label}</b> <span className="t-caption">{picked.en}</span>
          </p>
          <p className="t-body-sm mt-1">{picked.def}</p>
        </>
      ) : (
        <p className="t-body">{empty}</p>
      )}
    </div>
  );
}
