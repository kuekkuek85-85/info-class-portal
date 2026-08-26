"use client";

import { useState } from "react";

import type { WorksheetQuestion } from "@/lib/types";

/**
 * 하 → 중 → 상 을 차례로 깨는 숙달 퀴즈.
 *
 * 감정 낱말(마음 톡톡 2회기)에 처음 썼고, 지금은 수행평가 채점 기준 익히기(정보과
 * 6차시)에도 쓴다. 반드시 알고 넘어가야 하는 것이 있을 때 쓰는 부품이다.
 *
 * ## 점수를 매기려는 것이 아니다
 *
 * 표현은 낱말을 알아야 시작된다. "기분 나빴다" 밖에 없는 학생은 서운함도 억울함도
 * 좌절도 전부 그 한 마디로 뭉친다. 그래서 이 퀴즈의 목표는 등수가 아니라 **전원이
 * 100점에 도달하는 것**이다.
 *
 * 그래서 틀리면 끝나지 않는다. 해설을 보고 **틀린 문항만** 다시 푼다. 맞힌 것은
 * 다시 묻지 않는다 — 이미 아는 것을 또 풀게 하면 남는 것은 지겨움뿐이다.
 *
 * 단계를 셋으로 나눈 이유도 같다. 열 문제를 한꺼번에 펼치면 어려운 문항에서 막힌
 * 학생이 전체를 포기한다. 쉬운 넷을 먼저 깨고 나면 "나는 할 수 있다" 를 쥔 채로
 * 다음으로 간다.
 */

type Level = "easy" | "mid" | "hard";

const LEVELS: { key: Level; label: string; badge: string }[] = [
  { key: "easy", label: "하", badge: "bg-mint" },
  { key: "mid", label: "중", badge: "bg-cream" },
  { key: "hard", label: "상", badge: "bg-pink" },
];

/** 저장되는 것 — 다 깼는지와 몇 번 만에 깼는지 */
interface StoredResult {
  cleared: boolean;
  /** 채점을 누른 횟수. 한 번에 다 맞히면 3 (단계마다 한 번) */
  tries: number;
}

export function EmotionQuiz({
  question,
  raw,
  onResult,
  disabled,
}: {
  question: WorksheetQuestion;
  raw: string;
  onResult: (raw: string) => void;
  disabled?: boolean;
}) {
  const items = question.quizItems ?? [];
  const total = items.length;

  /** 문항 번호 → 고른 선지 */
  const [picked, setPicked] = useState<Record<number, number>>({});
  /** 맞힌 문항 번호. 한 번 맞히면 다시 안 묻는다 */
  const [solved, setSolved] = useState<Set<number>>(new Set());
  /** 지금 단계에서 채점을 눌렀는가 — 눌러야 해설이 나온다 */
  const [graded, setGraded] = useState(false);
  const [levelIndex, setLevelIndex] = useState(0);
  const [tries, setTries] = useState(0);

  const already = parseResult(raw);
  const level = LEVELS[levelIndex];
  /** 이번 단계의 문항 (원래 번호를 달고 다닌다) */
  const levelItems = items
    .map((item, index) => ({ item, index }))
    .filter((row) => row.item.level === level?.key);

  const done = levelIndex >= LEVELS.length;
  const score = total > 0 ? Math.round((solved.size / total) * 100) : 0;

  /** 이번 단계에서 아직 못 맞힌 문항 */
  const remaining = levelItems.filter((row) => !solved.has(row.index));
  const allPicked = remaining.every((row) => picked[row.index] !== undefined);

  function grade() {
    const nextSolved = new Set(solved);
    for (const row of remaining) {
      if (picked[row.index] === row.item.answerIndex) nextSolved.add(row.index);
    }
    setSolved(nextSolved);
    setTries((n) => n + 1);
    setGraded(true);

    // 이번 단계를 다 맞혔고 그것이 마지막 단계면 결과를 남긴다
    const clearedLevel = levelItems.every((row) => nextSolved.has(row.index));
    if (clearedLevel && levelIndex === LEVELS.length - 1) {
      onResult(
        // 시각은 안 남긴다 — 활동지 문서의 updatedAt 이 이미 그것이다
        JSON.stringify({ cleared: true, tries: tries + 1 } satisfies StoredResult),
      );
    }
  }

  function next() {
    setGraded(false);
    setPicked({});
    setLevelIndex((n) => n + 1);
  }

  /** 이번 단계를 다 맞혔는가 */
  const levelCleared = levelItems.length > 0 && levelItems.every((row) => solved.has(row.index));

  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* 진행 막대 — 어디까지 왔는지가 곧 동기다 */}
      <div className="flex items-center gap-2">
        {LEVELS.map((item, index) => {
          const cleared = index < levelIndex || (index === levelIndex && levelCleared);
          return (
            <span
              key={item.key}
              className={`rounded-full px-3 py-1 t-body-sm font-bold ${
                cleared ? "bg-ink text-canvas" : index === levelIndex ? item.badge : "bg-surface"
              }`}
            >
              {item.label} {cleared ? "✓" : ""}
            </span>
          );
        })}
        <span className="ml-auto t-body font-bold tabular-nums">{score}점</span>
      </div>

      {done ? (
        <div className="flex flex-col gap-2 rounded-lg bg-lime px-4 py-5 text-center">
          <p className="t-headline">100점! 다 깼어요 🎉</p>
          {/* 다 깬 뒤 할 말은 차시가 정한다 — 낱말 퀴즈와 채점 기준 퀴즈가 할 말이 다르다 */}
          <p className="t-body-sm">
            {question.quizDoneMessage ||
              "이제 감정 낱말을 더 정확하게 고를 수 있어요. 아래 활동지에 써 봅시다."}
          </p>
        </div>
      ) : (
        <>
          {levelItems.map((row, order) => {
            const isSolved = solved.has(row.index);
            const chosen = picked[row.index];
            // 채점 뒤에만 정오답을 보여준다. 고르는 도중에 알려 주면 찍어서 맞힌다
            const wrong = graded && !isSolved && chosen !== undefined;

            return (
              <div key={row.index} className="flex flex-col gap-2 rounded-lg border border-line p-4">
                <p className="t-body">
                  <span className="font-bold">
                    {level.label} {order + 1}.{" "}
                  </span>
                  {row.item.prompt}
                  {isSolved && <span className="ml-2 font-bold">✓ 맞았어요</span>}
                  {wrong && <span className="ml-2 font-bold">✗ 다시</span>}
                </p>

                <div className="flex flex-col gap-2">
                  {row.item.choices.map((choice, choiceIndex) => {
                    const on = chosen === choiceIndex;
                    /*
                      맞힌 문항은 정답만 남기고 잠근다. 다시 고를 수 있게 두면
                      맞혀 놓고 잘못 눌러서 푸는 일이 생긴다.
                    */
                    if (isSolved && choiceIndex !== row.item.answerIndex) return null;
                    return (
                      <button
                        key={choiceIndex}
                        type="button"
                        disabled={disabled || isSolved}
                        aria-pressed={on}
                        onClick={() => {
                          setPicked((prev) => ({ ...prev, [row.index]: choiceIndex }));
                          setGraded(false);
                        }}
                        className={`rounded-lg border-2 px-4 py-3 text-left t-body transition active:scale-[0.99] disabled:opacity-100 ${
                          isSolved
                            ? "border-ink bg-mint"
                            : on
                              ? "border-ink bg-surface"
                              : "border-line bg-canvas"
                        }`}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>

                {/* 해설은 채점 뒤에만. 맞힌 사람에게도 보여준다 — 왜 맞았는지 알아야 남는다 */}
                {(isSolved || wrong) && graded && (
                  <p className="rounded-md bg-cream px-3 py-2 t-body-sm">{row.item.explain}</p>
                )}
              </div>
            );
          })}

          {levelCleared ? (
            <button type="button" onClick={next} className="pill pill-primary pill-block">
              {levelIndex === LEVELS.length - 1
                ? "결과 보기"
                : `${level.label} 단계 통과! ${LEVELS[levelIndex + 1].label} 단계로`}
            </button>
          ) : (
            <button
              type="button"
              onClick={grade}
              disabled={disabled || !allPicked}
              className="pill pill-primary pill-block disabled:opacity-50"
            >
              {!allPicked
                ? "답을 다 고르면 채점할 수 있어요"
                : graded
                  ? "다시 채점하기"
                  : "채점하기"}
            </button>
          )}

          {graded && !levelCleared && (
            <p className="t-body-sm rounded-md bg-pink px-4 py-3">
              틀린 문제만 다시 풀면 돼요. 해설을 먼저 읽어 보세요.
            </p>
          )}
        </>
      )}

      {/* 지난 시간에 이미 깬 기록이 있으면 알려 준다 */}
      {already?.cleared && !done && (
        <p className="t-caption">전에 한 번 다 깼어요. 다시 풀어도 좋아요.</p>
      )}
    </div>
  );
}

function parseResult(raw: string): StoredResult | null {
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as StoredResult;
  } catch {
    return null;
  }
}
