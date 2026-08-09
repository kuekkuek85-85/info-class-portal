"use client";

/**
 * 화면 안 숫자 키패드.
 *
 * 태블릿 소프트 키보드에 의존하지 않는다. 부팅 직후 키보드가 늦게 뜨거나, 한글 자판이 잡혀
 * 숫자가 안 들어가는 상황이 30명 중 몇 명에게는 반드시 생긴다. 30분 수업에서 그걸 하나씩
 * 봐주면 진입에만 5분이 넘어간다. (PRD 1 설계 제약 — 입력은 숫자 위주)
 */

interface NumberPadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function NumberPad({ onDigit, onBackspace, disabled }: NumberPadProps) {
  const keyClass =
    "h-16 rounded-2xl border border-line bg-card text-2xl font-semibold " +
    "active:scale-95 transition disabled:opacity-40 " +
    "hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

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
        className={`${keyClass} text-lg`}
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
          className={`flex h-16 w-12 items-center justify-center rounded-xl border-2 text-3xl font-bold ${
            value[index]
              ? "border-accent bg-card"
              : "border-dashed border-line text-transparent"
          }`}
        >
          {value[index] ?? "0"}
        </div>
      ))}
    </div>
  );
}
