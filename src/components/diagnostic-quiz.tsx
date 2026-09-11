"use client";

import { useState } from "react";

import type { DiagnosticItem } from "@/lib/types";

/**
 * 진단평가 — 자동 채점 (12차 도우미 선발).
 *
 * 출력 예측·오류 찾기·줄 순서(보기로 제시)·빈칸 채우기를 **객관식(mc)·정확일치(fill)**
 * 두 꼴로만 담아 코드가 바로 채점한다(AI 안 부른다). 다 풀고 「채점하기」를 누르면
 * 0~100 점(=맞은 수 / 전체 × 100)을 내고, 그 점수 한 줄만 onChange 로 남긴다 —
 * 대시보드 리더보드가 이 값을 읽는다. 문항별 답 내용은 저장하지 않는다.
 *
 * 한 번 채점하면 잠긴다(점수 조작 방지). 다시 풀고 싶으면 「다시 풀기」로 초기화하되,
 * **최고점만** 남긴다.
 */

/** 공백을 정리하고 소문자로 — fill 정확일치 채점용(따옴표 종류도 통일) */
function normalize(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .toLowerCase();
}

export function DiagnosticQuiz({
  items,
  value,
  onChange,
  disabled,
}: {
  items: DiagnosticItem[];
  /** 지난 최고점(문자열 숫자) */
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  /** 문항별 답 — mc 는 고른 index, fill 은 친 글자 */
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [fills, setFills] = useState<Record<number, string>>({});
  const [graded, setGraded] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const best = Number(value) || 0;
  const total = items.length;

  function isCorrect(item: DiagnosticItem, i: number): boolean {
    if (item.type === "fill") {
      return normalize(fills[i] ?? "") === normalize(item.answer ?? "");
    }
    return picks[i] === item.answerIndex;
  }

  const answeredCount =
    items.filter((item, i) =>
      item.type === "fill" ? (fills[i] ?? "").trim().length > 0 : picks[i] !== undefined,
    ).length;

  function grade() {
    if (disabled || graded) return;
    const got = items.filter((item, i) => isCorrect(item, i)).length;
    const next = total > 0 ? Math.round((got / total) * 100) : 0;
    setScore(next);
    setGraded(true);
    if (next > best) onChange(String(next));
  }

  function reset() {
    setPicks({});
    setFills({});
    setGraded(false);
    setScore(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-lg bg-cream p-3">
        <p className="t-body-lg font-bold">진단 — {total}문항</p>
        <p className="t-body-sm">
          코드를 읽고 답을 고르거나 빈칸을 채우세요. 다 풀면 아래 「채점하기」를 누르면
          점수가 바로 나와요. 틀려도 괜찮아요 — 오늘은 실력을 보는 시간이에요.
        </p>
      </div>

      <ol className="flex flex-col gap-5">
        {items.map((item, i) => {
          const ok = graded && isCorrect(item, i);
          const wrong = graded && !isCorrect(item, i);
          return (
            <li key={i} className="flex flex-col gap-2">
              <p className="t-subhead">
                {i + 1}. {item.prompt}
                {graded && (
                  <span className={`ml-2 t-body-sm font-bold ${ok ? "text-success" : ""}`}>
                    {ok ? "정답" : "오답"}
                  </span>
                )}
              </p>

              {item.code && (
                <textarea
                  readOnly
                  value={item.code}
                  rows={item.code.split("\n").length}
                  className="field font-mono text-sm"
                  onFocus={(event) => event.currentTarget.select()}
                />
              )}

              {item.type === "mc" ? (
                <div className="flex flex-col gap-2">
                  {(item.choices ?? []).map((choice, ci) => {
                    const on = picks[i] === ci;
                    const isAnswer = graded && item.answerIndex === ci;
                    return (
                      <button
                        key={ci}
                        type="button"
                        disabled={disabled || graded}
                        onClick={() => setPicks((prev) => ({ ...prev, [i]: ci }))}
                        aria-pressed={on}
                        className={`rounded-lg border-2 px-4 py-2 text-left font-mono text-sm transition ${
                          isAnswer
                            ? "border-ink bg-lime"
                            : on
                              ? "border-ink bg-ink text-canvas"
                              : "border-line bg-canvas"
                        } ${graded ? "cursor-default" : "active:scale-[0.99]"}`}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  value={fills[i] ?? ""}
                  onChange={(event) => setFills((prev) => ({ ...prev, [i]: event.target.value }))}
                  disabled={disabled || graded}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="빈칸에 들어갈 코드를 입력"
                  className="field font-mono"
                />
              )}

              {graded && wrong && item.type === "fill" && (
                <p className="t-caption">정답: <span className="font-mono">{item.answer}</span></p>
              )}
              {graded && item.explain && <p className="t-note">{item.explain}</p>}
            </li>
          );
        })}
      </ol>

      {!graded ? (
        <button
          type="button"
          onClick={grade}
          disabled={disabled || answeredCount < total}
          className="pill pill-primary self-start disabled:opacity-35"
        >
          {answeredCount < total ? `아직 ${total - answeredCount}문항 남았어요` : "채점하기"}
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border-2 border-ink bg-surface px-4 py-4">
          <p className="t-headline">점수 {score} / 100</p>
          <p className="t-body-sm">최고점: {Math.max(best, score ?? 0)}점.</p>
          <button type="button" onClick={reset} disabled={disabled} className="pill pill-secondary self-start">
            다시 풀기
          </button>
        </div>
      )}

      {best > 0 && !graded && <p className="t-caption">지금까지 최고점: {best} / 100</p>}
    </div>
  );
}
