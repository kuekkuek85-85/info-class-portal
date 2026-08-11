"use client";

import { MOOD_NOTICE, MOOD_OPTIONS, QUADRANTS, type Quadrant } from "@/lib/mood";

/**
 * 무드미터 4사분면 감정 선택.
 *
 * 가로축은 기분(불쾌↔쾌), 세로축은 기운(낮음↔높음)이다. 사분면 색은 무드미터 관례를 따르되,
 * 디자인 시스템의 파스텔 면으로 톤을 맞췄다 — 여기서 색은 장식이 아니라 축을 읽는 단서다.
 * 16개를 한 화면에 펼쳐 스크롤 없이 한 번에 고르게 했다.
 */

/**
 * 화면 배치가 곧 축이다. 위 = 기운 높음(고활성), 오른쪽 = 기분 좋음(쾌).
 *
 *        불쾌 ←→ 쾌
 *   높음  빨강   노랑
 *   낮음  파랑   초록
 *
 * 이 순서를 바꾸면 화면 안내("위로 갈수록 기운이 높고…")와 어긋나 학생이 엉뚱한 칸을 본다.
 * `/teacher/board` 의 GRID 도 같은 순서를 쓴다 — 한쪽만 고치면 두 화면이 달라진다.
 */
const ORDER: Quadrant[][] = [
  ["red", "yellow"],
  ["blue", "green"],
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
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="t-display">오늘 기분은 어때요?</h2>
        <p className="t-body mt-2">위로 갈수록 기운이 높고, 오른쪽으로 갈수록 기분이 좋아요.</p>
      </div>

      <div className="flex flex-col gap-3">
        {ORDER.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-2 gap-3">
            {row.map((quadrant) => (
              <fieldset
                key={quadrant}
                className={`rounded-lg p-3 ${QUADRANTS[quadrant].className}`}
              >
                <legend className="sr-only">{QUADRANTS[quadrant].description}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {MOOD_OPTIONS.filter((option) => option.quadrant === quadrant).map((option) => {
                    const selected = value === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        aria-pressed={selected}
                        disabled={disabled}
                        onClick={() => onChange(option.key)}
                        className={`h-14 rounded-full px-1 text-base font-semibold transition active:scale-95 disabled:opacity-50 ${
                          selected ? "bg-ink text-canvas" : "bg-canvas text-ink"
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

      <div className="flex flex-col gap-3">
        <label htmlFor="mood-reason" className="t-body font-bold">
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
          className="field disabled:opacity-60"
        />

        {/* PRD 5.3 — 상설 안내. 감정 입력칸 옆에 항상 표시한다. */}
        <ul className="rounded-md bg-surface px-4 py-3">
          {MOOD_NOTICE.map((line) => (
            <li key={line} className="t-body-sm">
              · {line}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!value || saving || disabled}
        className="pill pill-primary pill-block"
      >
        {saving ? "저장 중…" : saved ? "저장했어요 · 다시 저장" : "기분 저장하기"}
      </button>
    </div>
  );
}
