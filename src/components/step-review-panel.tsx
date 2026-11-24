"use client";

import { useCallback, useEffect, useState } from "react";

import { checkSteps } from "@/lib/step-review";
import type { LessonPhase, StepFeedback, StepReviewConfig } from "@/lib/types";

/**
 * 단계별 교사 검토 - 학생 화면 (33차 수행평가, 성찰 단계에 뜬다).
 *
 *  ① 단계마다 최소 분량을 채웠는지 보여 준다. 모자라면 「그 단계로」 로 바로 간다.
 *  ② 성찰을 내고 다 채웠으면 「선생님께 검토 받기」. 서버가 같은 규칙으로 다시 센다.
 *  ③ 선생님 답을 8초마다 묻는다(요청한 학생만). 오면 단계별 카드를 띄우고(누르면 그 단계로),
 *     보상 게임을 연다(잘했어요든 피드백이든 - 교사 결정).
 */

const POLL_MS = 8000;

export function StepReviewPanel({
  config,
  answers,
  reflectionDone,
  disabled,
  phaseLabel,
  onJump,
  onUnlock,
}: {
  config: StepReviewConfig;
  answers: Record<string, string>;
  reflectionDone: boolean;
  disabled?: boolean;
  phaseLabel: (phase: LessonPhase) => string;
  onJump: (phase: LessonPhase) => void;
  onUnlock: () => void;
}) {
  const [requestedAt, setRequestedAt] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<StepFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const checks = checkSteps(config, answers);
  const allDone = checks.every((c) => c.missing.length === 0);

  const pull = useCallback(() => {
    return fetch("/api/student/step-review")
      .then((r) => r.json())
      .catch(() => null)
      .then((res) => {
        if (!res?.ok) return;
        setRequestedAt(res.requestedAt ?? null);
        setFeedback(res.feedback ?? null);
      });
  }, []);

  // 처음 한 번 + 검토를 요청했는데 아직 답이 없으면 8초마다
  useEffect(() => {
    const id = setTimeout(() => void pull(), 0);
    return () => clearTimeout(id);
  }, [pull]);
  const waiting = Boolean(requestedAt && (!feedback || (feedback.forRequestAt ?? 0) < requestedAt));
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => void pull(), POLL_MS);
    return () => clearInterval(id);
  }, [waiting, pull]);

  // 선생님 답이 있으면 게임을 연다
  useEffect(() => {
    if (feedback) onUnlock();
  }, [feedback, onUnlock]);

  async function request() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/student/step-review", { method: "POST" })
      .then((r) => r.json())
      .catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setRequestedAt(res.requestedAt);
    } else setError(res?.message ?? "다시 눌러 주세요.");
  }

  const notes = feedback ? Object.entries(feedback.steps).filter(([, v]) => v.trim()) : [];

  return (
    <section className="mb-6 flex flex-col gap-4 rounded-xl border-2 border-ink bg-canvas p-4">
      <h2 className="t-headline">선생님께 검토 받기</h2>

      {feedback && (
        <div className="flex flex-col gap-2 rounded-lg bg-lime px-4 py-3">
          <p className="t-subhead">
            {feedback.verdict === "good" ? "선생님: 잘했어요! 👍" : "선생님이 단계별로 말을 남겼어요"}
          </p>
          {notes.map(([phase, note]) => (
            <button
              key={phase}
              type="button"
              onClick={() => onJump(phase as LessonPhase)}
              className="flex flex-col gap-1 rounded-lg border border-line bg-canvas px-3 py-2 text-left"
            >
              <span className="t-body-sm font-bold">{phaseLabel(phase as LessonPhase)} → 눌러서 고치러 가기</span>
              <span className="t-body-sm whitespace-pre-wrap">{note}</span>
            </button>
          ))}
          <p className="t-caption">고친 뒤 다시 검토를 받아도 돼요. 게임은 아래에서 할 수 있어요.</p>
        </div>
      )}

      <ul className="flex flex-col gap-1.5">
        {checks.map((check) => (
          <li key={check.phase} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2">
            <span className="t-body-sm">
              {check.missing.length === 0 ? "✅" : "⬜"} {check.label}
              {check.missing.length > 0 && (
                <span className="ml-2 text-muted">{check.missing.map((m) => `${m.label}: ${m.need}`).join(" · ")}</span>
              )}
            </span>
            {check.missing.length > 0 && (
              <button type="button" onClick={() => onJump(check.phase)} className="pill pill-secondary t-body-sm">
                그 단계로
              </button>
            )}
          </li>
        ))}
      </ul>

      {!reflectionDone && <p className="t-body-sm">아래 성찰을 쓰고 「제출하기」를 먼저 눌러 주세요.</p>}

      <button
        type="button"
        onClick={() => void request()}
        disabled={disabled || busy || !allDone || !reflectionDone || waiting}
        className="pill pill-primary pill-block disabled:opacity-60"
      >
        {waiting ? "선생님이 보고 있어요… 잠시만요" : feedback ? "고쳤어요 · 다시 검토 받기" : "선생님께 검토 받기"}
      </button>
      {error && <p className="t-body-sm rounded-md bg-pink px-3 py-2">{error}</p>}
    </section>
  );
}
