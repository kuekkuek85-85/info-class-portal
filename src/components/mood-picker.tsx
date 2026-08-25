"use client";

import { MoodBanner, MoodGrid } from "@/components/mood-grid";
import { MOOD_NOTICE } from "@/lib/mood";

/**
 * 무드미터 감정 선택 — 원본 표(10×10) 그대로.
 *
 * 가로축은 기분(불쾌↔쾌), 세로축은 기운(낮음↔높음)이다. **배치가 곧 축이라서**
 * 줄과 칸을 흐트러뜨리면 화면 안내("위로 갈수록 기운이 높고…")와 어긋난다.
 *
 * 색은 장식이 아니다. 가운데에서 멀수록 진해지는 그러데이션이 "얼마나 센 감정인가" 를
 * 읽는 단서다 (mood.ts 의 moodCellStyle).
 *
 * ## 좁은 화면
 *
 * 열 칸을 한 줄에 넣으면 태블릿 세로에서 글자가 뭉갠다. 표를 가로로 밀 수 있게 두고
 * 최소 너비를 준다 — 칸을 접거나 줄여서 표 모양이 깨지면 축을 읽을 수 없게 된다.
 */

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
        <p className="t-body-sm mt-1">
          꼭 맞는 낱말이 없어도 괜찮아요. 가장 가까운 칸을 골라 주세요.
        </p>
      </div>

      <MoodBanner value={value} empty="아래 표에서 지금 내 기분과 가장 가까운 낱말을 눌러 주세요." />
      <MoodGrid value={value} onChange={onChange} disabled={disabled} />

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
