"use client";

import { useEffect, useState } from "react";

import { ArtifactCanvas } from "@/components/artifact-canvas";
import type { Review } from "@/lib/review";

/**
 * 지난 차시 복습 — 기분 체크를 마친 학생 화면에 이어서 뜬다.
 *
 * 요약문을 읽히지 않는다. 지난 시간에 **자기 반이 만든 것**을 보여준다 — 친구들 그림이
 * 넘어가고, 친구가 쓴 문장이 뜨고, 그 반이 가장 많이 틀린 문항 하나를 다시 묻는다.
 *
 * 기분 체크가 끝나는 시각은 학생마다 다르다. 먼저 끝낸 학생은 그림을 여러 장 보고,
 * 늦게 들어온 학생은 몇 장만 보고 지나간다. 그래도 상관없게 만든 것이 요점이다 —
 * 모두가 같은 지점에 있을 필요가 없는 시간이라서 이 자리에 넣었다.
 */
export function ReviewView({ disabled }: { disabled?: boolean }) {
  const [review, setReview] = useState<Review | null | undefined>(undefined);
  const [slide, setSlide] = useState(0);
  const [picked, setPicked] = useState(-1);

  useEffect(() => {
    let alive = true;
    // 한 번만 부른다. 지난 시간 기록은 끝난 것이라 도중에 바뀌지 않는다.
    fetch("/api/student/review")
      .then((response) => response.json())
      .then((result) => {
        if (alive) setReview(result.ok ? (result.review ?? null) : null);
      })
      .catch(() => {
        if (alive) setReview(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  const drawings = review?.drawings ?? [];

  useEffect(() => {
    if (drawings.length <= 1) return;
    // 3초에 한 장. 더 빠르면 무엇을 그렸는지 알아보기 전에 넘어간다.
    const timer = setInterval(() => {
      setSlide((current) => (current + 1) % drawings.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [drawings.length]);

  if (review === undefined) return null;
  if (review === null) return null;

  const question = review.question;
  const answered = picked >= 0;

  return (
    <section className="mt-6 flex flex-col gap-4 border-t border-line pt-6">
      <div className="flex flex-col gap-1">
        <h2 className="t-eyebrow">지난 시간에 우리 반은</h2>
        <p className="t-subhead">
          {review.lessonNo}차시 · {review.title}
        </p>
      </div>

      {drawings.length > 0 && (
        <div className="flex flex-col gap-2">
          <ArtifactCanvas
            key={slide}
            strokes={drawings[slide].strokes}
            texts={drawings[slide].texts}
            pixelWidth={640}
            className="h-auto w-full rounded-lg border-2 border-line bg-white"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="t-body-sm">
              {drawings[slide].year}년의 {drawings[slide].place || "어딘가"}
            </p>
            <p className="t-caption">
              {slide + 1} / {drawings.length}
            </p>
          </div>
        </div>
      )}

      {review.quotes.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="t-caption">친구들이 쓴 말</h3>
          {review.quotes.map((quote) => (
            <p key={quote} className="rounded-lg bg-surface px-3 py-2 t-body">
              “{quote}”
            </p>
          ))}
        </div>
      )}

      {question && (
        <div className="flex flex-col gap-3 rounded-lg bg-lilac p-4">
          <h3 className="t-body font-bold">다시 한 번 — {question.prompt}</h3>

          <div className="flex flex-col gap-2">
            {question.choices.map((choice, index) => {
              const right = index === question.answerIndex;
              /*
               * 고르기 전에는 아무 표시도 하지 않는다. 정답 자리를 미리 알 수 있으면
               * 다시 묻는 의미가 없다.
               */
              const tone = !answered
                ? "border-line bg-canvas"
                : right
                  ? "border-ink bg-canvas font-bold"
                  : index === picked
                    ? "border-line bg-canvas opacity-60 line-through"
                    : "border-line bg-canvas opacity-60";
              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => !answered && setPicked(index)}
                  disabled={answered || disabled}
                  className={`rounded-lg border-2 px-4 py-3 text-left t-body ${tone}`}
                >
                  {choice}
                </button>
              );
            })}
          </div>

          {answered && (
            <div className="flex flex-col gap-1">
              <p className="t-body font-bold">
                {picked === question.answerIndex ? "맞았어요!" : "정답은 위에 진하게 표시했어요."}
              </p>
              {question.nowText && <p className="t-body-sm">지금은 — {question.nowText}</p>}
            </div>
          )}
        </div>
      )}

      <p className="t-caption">선생님이 다음으로 넘기면 이 화면은 저절로 넘어가요.</p>
    </section>
  );
}
