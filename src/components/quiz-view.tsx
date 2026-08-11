"use client";

/**
 * 타임머신 퀴즈 — 학생 화면.
 *
 * 화면당 할 일이 하나다. 지금 열린 문항 하나와 선지 셋만 크게 띄우고, 다른 문항으로 갈
 * 방법을 주지 않는다. 문항 이동은 교사가 한다 (PRD 3.2).
 *
 * 한 번 고르면 잠긴다. 정답을 보고 바꾸는 것을 막기도 하지만, 그보다 "친구가 뭘 골랐나"를
 * 보고 따라 바꾸는 쪽이 훨씬 흔하다. 틀린 선택이 그대로 남아야 정답 공개가 의미를 갖는다.
 */

export interface QuizState {
  index: number;
  total: number;
  revealed: boolean;
  answerIndex: number | null;
  nowText: string;
  stickers: string[];
  earned: string[];
}

interface QuizViewProps {
  question: { prompt: string; choices: string[] } | undefined;
  state: QuizState;
  /** 내가 이 문항에서 고른 선지. 아직 안 골랐으면 -1 */
  picked: number;
  onPick: (choiceIndex: number) => void;
  saving: boolean;
  disabled?: boolean;
}

const CHOICE_LABELS = ["①", "②", "③", "④", "⑤"];

export function QuizView({ question, state, picked, onPick, saving, disabled }: QuizViewProps) {
  if (!question) {
    return (
      <section className="block flex flex-col items-center gap-3 bg-lilac py-20 text-center">
        <h2 className="t-display">퀴즈를 준비하고 있어요</h2>
      </section>
    );
  }

  const locked = picked >= 0 || disabled || saving;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="t-eyebrow">
          타임머신 · {state.index + 1} / {state.total}
        </p>
        <h2 className="t-display">{question.prompt}</h2>
      </header>

      <ul className="flex flex-col gap-3">
        {question.choices.map((choice, index) => {
          const chosen = picked === index;
          const isAnswer = state.revealed && state.answerIndex === index;
          const wrongPick = state.revealed && chosen && state.answerIndex !== index;

          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => onPick(index)}
                disabled={locked}
                aria-pressed={chosen}
                className={[
                  "flex w-full items-start gap-3 rounded-lg border-2 px-4 py-4 text-left transition",
                  "t-body-lg disabled:cursor-default",
                  isAnswer
                    ? "border-ink bg-lime"
                    : wrongPick
                      ? "border-ink bg-pink"
                      : chosen
                        ? "border-ink bg-surface"
                        : "border-line bg-canvas",
                  locked ? "" : "active:scale-[0.99]",
                ].join(" ")}
              >
                <span className="font-bold">{CHOICE_LABELS[index]}</span>
                <span className="flex-1">{choice}</span>
                {isAnswer && <span className="shrink-0 font-bold">정답</span>}
                {wrongPick && <span className="shrink-0 font-bold">내 선택</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {picked < 0 && !state.revealed && (
        <p className="t-body-sm text-center">하나를 골라 주세요. 고른 뒤에는 바꿀 수 없어요.</p>
      )}
      {picked >= 0 && !state.revealed && (
        <p className="t-body-sm text-center">골랐어요. 다 같이 정답을 볼 때까지 기다려 주세요.</p>
      )}

      {/* 정답 공개 — 왜 그렇게 바뀌었는지가 본론이다 */}
      {state.revealed && state.nowText && (
        <div className="block bg-cream">
          <p className="t-eyebrow">그럼 지금은?</p>
          <p className="t-body-lg mt-2 whitespace-pre-wrap">{state.nowText}</p>

          {state.stickers.length > 0 && (
            <p className="mt-4 flex flex-wrap gap-2">
              {state.stickers.map((trait) => (
                <span
                  key={trait}
                  className="rounded-full bg-ink px-3 py-1.5 text-base font-semibold text-canvas"
                >
                  #{trait}
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      {/*
        모은 특성은 계속 남는다. 네 문항이 끝나면 다섯 개가 다 붙어 있고,
        그 화면이 곧 "디지털 특성 다섯 가지" 정리다 — 따로 설명하는 시간을 두지 않는다.
      */}
      {state.earned.length > 0 && (
        <div className="rounded-lg border border-line px-4 py-3">
          <p className="t-caption">지금까지 모은 특성 {state.earned.length}/5</p>
          <p className="mt-2 flex flex-wrap gap-2">
            {state.earned.map((trait) => (
              <span key={trait} className="rounded-full bg-lilac px-3 py-1 text-sm font-semibold">
                {trait}
              </span>
            ))}
          </p>
        </div>
      )}
    </section>
  );
}
