"use client";

import { MOOD_NOTICE, MOOD_OPTIONS, QUADRANTS, type Quadrant } from "@/lib/mood";

/**
 * 무드미터 4사분면 감정 선택.
 *
 * 가로축은 기분(불쾌↔쾌), 세로축은 기운(낮음↔높음)이다. 사분면 색은 무드미터 관례를 따른다.
 * 16개를 한 화면에 펼쳐 스크롤 없이 한 번에 고르게 했다 — 30분 수업의 도입 활동이다.
 */

const ORDER: Quadrant[][] = [
  ["blue", "red"],
  ["green", "yellow"],
];

interface MoodPickerProps {
  value: string;
  reason: string;
  onChange: (mood: string) => void;
  onReasonChange: (reason: string) => void;
  onSubmit: () => void;
  saving: boolean;
  saved: boolean;
  /** 수업이 끝난 뒤에는 읽기만 된다 */
  disabled?: boolean;
}

export function MoodPicker({
  value,
  reason,
  onChange,
  onReasonChange,
  onSubmit,
  saving,
  saved,
  disabled,
}: MoodPickerProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold">오늘 기분은 어때요?</h2>
        <p className="mt-1 text-sm text-muted">
          위로 갈수록 기운이 높고, 오른쪽으로 갈수록 기분이 좋아요.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {ORDER.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-2 gap-2">
            {row.map((quadrant) => (
              <fieldset
                key={quadrant}
                className={`rounded-2xl border p-2 ${QUADRANTS[quadrant].className}`}
              >
                <legend className="sr-only">{QUADRANTS[quadrant].description}</legend>
                <div className="grid grid-cols-2 gap-1.5">
                  {MOOD_OPTIONS.filter((option) => option.quadrant === quadrant).map((option) => {
                    const selected = value === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        aria-pressed={selected}
                        disabled={disabled}
                        onClick={() => onChange(option.key)}
                        className={`h-14 rounded-xl px-1 text-sm font-medium transition active:scale-95 disabled:opacity-60 ${
                          selected
                            ? "bg-foreground text-background"
                            : "bg-white/70 text-zinc-800 dark:bg-black/30 dark:text-zinc-100"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="mood-reason" className="text-sm font-medium">
          왜 그런 기분인지 한 줄로 적어 주세요
        </label>
        <textarea
          id="mood-reason"
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          rows={2}
          maxLength={200}
          disabled={disabled}
          placeholder="예) 어제 잠을 못 자서 피곤해요"
          className="w-full rounded-xl border border-line bg-card px-3 py-2 text-base outline-none focus:border-accent disabled:opacity-60"
        />

        {/* PRD 5.3 — 상설 안내. 감정 입력칸 옆에 항상 표시한다. */}
        <ul className="rounded-xl border border-line bg-card px-3 py-2 text-xs leading-relaxed text-muted">
          {MOOD_NOTICE.map((line) => (
            <li key={line}>· {line}</li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!value || saving || disabled}
        className="h-14 rounded-2xl bg-accent text-lg font-semibold text-white transition active:scale-95 disabled:opacity-40"
      >
        {saving ? "저장 중…" : saved ? "저장했어요 · 다시 저장" : "기분 저장하기"}
      </button>
    </div>
  );
}
