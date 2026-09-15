"use client";

/**
 * 화면 안 숫자 키패드.
 *
 * 태블릿 소프트 키보드에 의존하지 않는다. 부팅 직후 키보드가 늦게 뜨거나, 한글 자판이 잡혀
 * 숫자가 안 들어가는 상황이 30명 중 몇 명에게는 반드시 생긴다. 30분 수업에서 그걸 하나씩
 * 봐주면 진입에만 5분이 넘어간다. (PRD 1 설계 제약 — 입력은 숫자 위주)
 *
 * ## 터치 확실히 먹게 (교사 요청)
 *
 * 버튼에 `touch-action: manipulation`(touch-manipulation)을 준다. 태블릿에서 5자리를 빠르게
 * 연속으로 탭하면, 인접 탭이 **더블탭 확대(double-tap zoom)** 로 해석돼 그 탭이 씹히거나
 * 300ms 지연이 생겨 "터치가 안 먹는" 것처럼 보인다. manipulation 은 더블탭 확대·지연을 꺼
 * 탭이 곧바로 입력된다. select-none 은 빠른 탭 중 숫자 글자가 선택(길게눌림)되는 것을 막는다.
 * onClick 은 탭에서도 그대로 발생하므로 터치 전용 핸들러는 두지 않는다.
 */

interface NumberPadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function NumberPad({ onDigit, onBackspace, disabled }: NumberPadProps) {
  const keyClass =
    "h-16 rounded-full border border-line bg-canvas text-2xl font-semibold text-ink " +
    "touch-manipulation select-none transition active:scale-95 disabled:opacity-35 hover:bg-surface " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

  return (
    <div className="grid grid-cols-3 gap-3" role="group" aria-label="숫자 입력">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          className={keyClass}
          disabled={disabled}
          onClick={() => onDigit(key)}
        >
          {key}
        </button>
      ))}
      <div aria-hidden />
      <button type="button" className={keyClass} disabled={disabled} onClick={() => onDigit("0")}>
        0
      </button>
      <button
        type="button"
        className={`${keyClass} text-base`}
        disabled={disabled}
        onClick={onBackspace}
        aria-label="지우기"
      >
        ← 지우기
      </button>
    </div>
  );
}

/** 입력한 자릿수를 칸으로 보여준다. 몇 자리를 더 눌러야 하는지 한눈에 보이게. */
export function DigitDisplay({ value, length }: { value: string; length: number }) {
  return (
    <div className="flex justify-center gap-2" aria-live="polite">
      {Array.from({ length }).map((_, index) => (
        <div
          key={index}
          className={`flex h-16 w-12 items-center justify-center rounded-md text-3xl font-bold ${
            value[index]
              ? "border-2 border-ink bg-canvas text-ink"
              : "border border-dashed border-line text-transparent"
          }`}
        >
          {value[index] ?? "0"}
        </div>
      ))}
    </div>
  );
}
