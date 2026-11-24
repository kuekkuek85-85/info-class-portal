"use client";

import { useCallback, useEffect, useState } from "react";

import { checkSteps } from "@/lib/step-review";
import type { LessonPhase, StepFeedback, StepReviewConfig } from "@/lib/types";

/**
 * 단계별 교사 검토 - 학생 화면 (33차 수행평가, 마무리 단계).
 *
 *  · useStepReview: 검토 상태(요청 시각·선생님 답)를 들고, 요청한 뒤 답이 올 때까지 8초마다 묻는다.
 *  · StepReviewPanel(성찰 위): 선생님 답(통과면 「고생하셨습니다」, 반려면 단계별 카드)과 단계별 분량 점검.
 *  · StepReviewSubmit(성찰 아래): 「선생님께 검토 받기」 하나로 성찰 제출 + 검토 요청을 함께 한다.
 *
 * 게임(UNO)은 선생님이 「고생하셨습니다」(verdict good)를 눌렀을 때만 열린다. 「수정해 주세요」(revise)면
 * 카드를 눌러 그 단계로 가 고친 뒤 다시 검토를 받는다.
 */

const POLL_MS = 8000;

export interface StepReviewState {
  requestedAt: number | null;
  feedback: StepFeedback | null;
  /** 요청했는데 그 요청에 대한 답이 아직 없다 */
  waiting: boolean;
  /** 마지막 요청에 대한 답 (요청 전에 받은 옛 답이면 null) */
  latest: StepFeedback | null;
  setRequestedAt: (at: number) => void;
}

export function useStepReview(enabled: boolean): StepReviewState {
  const [requestedAt, setRequestedAt] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<StepFeedback | null>(null);

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

  useEffect(() => {
    if (!enabled) return;
    const id = setTimeout(() => void pull(), 0);
    return () => clearTimeout(id);
  }, [enabled, pull]);

  const waiting = Boolean(requestedAt && (!feedback || (feedback.forRequestAt ?? 0) < requestedAt));
  // 답을 기다리는 중이거나, 「수정해 주세요」를 받은 상태(선생님이 다시 보고 통과를 줄 수 있다)면 8초마다 묻는다
  const shouldPoll = waiting || feedback?.verdict === "revise";
  useEffect(() => {
    if (!enabled || !shouldPoll) return;
    const id = setInterval(() => void pull(), POLL_MS);
    return () => clearInterval(id);
  }, [enabled, shouldPoll, pull]);

  // 지금 요청에 대한 답만 '최신' 으로 본다. 요청이 없던 시절의 답(옛 테스트 데이터 등)도 그대로 보여 준다
  const latest = feedback && !waiting ? feedback : null;
  return { requestedAt, feedback, waiting, latest, setRequestedAt };
}

/** 성찰 위 - 선생님 답과 단계별 분량 점검 */
export function StepReviewPanel({
  state,
  config,
  answers,
  phaseLabel,
  onJump,
  onUnlock,
}: {
  state: StepReviewState;
  config: StepReviewConfig;
  answers: Record<string, string>;
  phaseLabel: (phase: LessonPhase) => string;
  onJump: (phase: LessonPhase) => void;
  onUnlock: () => void;
}) {
  const checks = checkSteps(config, answers);
  const latest = state.latest;
  const passed = latest?.verdict === "good";

  // 통과(고생하셨습니다)일 때만 게임을 연다
  useEffect(() => {
    if (passed) onUnlock();
  }, [passed, onUnlock]);

  const notes = latest ? Object.entries(latest.steps).filter(([, v]) => v.trim()) : [];

  return (
    <section className="mb-6 flex flex-col gap-4 rounded-xl border-2 border-ink bg-canvas p-4">
      <h2 className="t-headline">선생님께 검토 받기</h2>

      {state.waiting && <p className="t-body rounded-lg bg-cream px-4 py-3">선생님이 보고 있어요… 잠시만요</p>}

      {latest && (
        <div className={`flex flex-col gap-2 rounded-lg px-4 py-3 ${passed ? "bg-lime" : "bg-coral"}`}>
          <p className="t-subhead">{passed ? "선생님: 고생하셨습니다! 👏" : "선생님이 수정을 부탁했어요"}</p>
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
          <p className="t-caption">
            {passed
              ? "게임은 아래에서 할 수 있어요."
              : "카드를 눌러 그 단계를 고치고, 마무리로 돌아와 다시 「선생님께 검토 받기」를 눌러요."}
          </p>
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
    </section>
  );
}

/**
 * 성찰 아래 - 「선생님께 검토 받기」 하나로 성찰 제출 + 검토 요청.
 * submitReflection 은 성찰을 제출(초안 아님)로 저장한다(성찰 화면의 기존 저장 경로).
 */
export function StepReviewSubmit({
  state,
  config,
  answers,
  canSubmit,
  disabled,
  submitReflection,
}: {
  state: StepReviewState;
  config: StepReviewConfig;
  answers: Record<string, string>;
  /** 성찰을 하나라도 썼는가 */
  canSubmit: boolean;
  disabled?: boolean;
  submitReflection: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const allDone = checkSteps(config, answers).every((c) => c.missing.length === 0);
  const passed = state.latest?.verdict === "good";

  async function run() {
    setBusy(true);
    setError("");
    try {
      await submitReflection();
      const res = await fetch("/api/student/step-review", { method: "POST" })
        .then((r) => r.json())
        .catch(() => null);
      if (res?.ok) state.setRequestedAt(res.requestedAt);
      else setError(res?.message ?? "다시 눌러 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {!allDone && <p className="t-body-sm">위 점검에서 ⬜ 단계를 먼저 채워 주세요.</p>}
      {!canSubmit && <p className="t-body-sm">성찰을 먼저 써 주세요.</p>}
      <button
        type="button"
        onClick={() => void run()}
        disabled={disabled || busy || !allDone || !canSubmit || state.waiting}
        className="pill pill-primary pill-block disabled:opacity-60"
      >
        {busy
          ? "보내는 중…"
          : state.waiting
            ? "선생님이 보고 있어요… 잠시만요"
            : state.latest && !passed
              ? "고쳤어요 · 다시 선생님께 검토 받기"
              : "선생님께 검토 받기"}
      </button>
      {error && <p className="t-body-sm rounded-md bg-pink px-3 py-2">{error}</p>}
    </div>
  );
}
