/**
 * 단계별 교사 검토(33차 수행평가) - 순수 로직(브라우저·서버 공용, Firestore 없음).
 *
 * 학생이 「선생님께 검토 받기」를 누르기 전에 단계마다 최소 분량을 채웠는지 센다.
 * 서버(검토 요청 API)와 학생 화면이 같은 규칙으로 세야 "화면엔 다 됐다는데 서버가 거절" 이 안 생긴다.
 */

import type { LessonPhase, StepReviewConfig } from "./types";

/** 빈 줄을 뺀 줄 수. list/rows 답(JSON 배열)이면 채운 항목 수를 줄로 센다 */
export function countLines(raw: string): number {
  const text = (raw ?? "").trim();
  if (!text) return 0;
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((v) =>
          typeof v === "string"
            ? v.trim().length > 0
            : v && typeof v === "object" && Object.values(v as Record<string, unknown>).some((c) => String(c ?? "").trim()),
        ).length;
      }
    } catch {
      // 배열이 아니면 그냥 글로 센다
    }
  }
  return text.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

/** list 답(문자열 배열 JSON)의 채운 칸들. 배열이 아니면 줄마다 한 칸으로 본다 */
export function listItems(raw: string): string[] {
  const text = (raw ?? "").trim();
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    } catch {
      // 아래로
    }
  }
  return text.split(/\r?\n/).filter((line) => line.trim().length > 0);
}

/** 공백을 뺀 글자 수 */
export function countChars(raw: string): number {
  return (raw ?? "").replace(/\s+/g, "").length;
}

export interface StepCheck {
  phase: LessonPhase;
  label: string;
  /** 모자란 칸과 그 이유 (비었으면 이 단계는 다 됐다) */
  missing: { key: string; label: string; need: string }[];
}

/** 단계마다 최소 분량을 센다 */
export function checkSteps(config: StepReviewConfig, answers: Record<string, string>): StepCheck[] {
  return config.steps.map((step) => ({
    phase: step.phase,
    label: step.label,
    missing: step.fields
      .map((field) => {
        const raw = String(answers[field.key] ?? "");
        const lines = countLines(raw);
        const chars = countChars(raw);
        if (!raw.trim() || raw.trim() === "[]") return { key: field.key, label: field.label, need: "아직 안 썼어요" };
        if (field.minLines && lines < field.minLines) {
          return { key: field.key, label: field.label, need: `${field.minLines}줄 이상 (지금 ${lines}줄)` };
        }
        if (field.minChars && chars < field.minChars) {
          return { key: field.key, label: field.label, need: `${field.minChars}자 이상 (지금 ${chars}자)` };
        }
        // list 답(칸마다 하나): 채운 칸마다 최소 글자 (33차 기능 칸 - 각 5자 이상)
        if (field.minItemChars) {
          const short = listItems(raw).filter((item) => countChars(item) < field.minItemChars!).length;
          if (short > 0) {
            return { key: field.key, label: field.label, need: `칸마다 ${field.minItemChars}자 이상 (모자란 칸 ${short}개)` };
          }
        }
        return null;
      })
      .filter((m): m is { key: string; label: string; need: string } => m !== null),
  }));
}

/**
 * 몇 번째 검토 요청인가 (대시보드 「N차 검토 요청」, 학생 재요청의 다음 차수 계산).
 *
 * 차수(count)를 저장하기 전(2026-11-25 12:56 배포 전)의 기록은 count 가 없다. 그때는 추정한다:
 * 요청이 있고, 그 요청보다 앞서 선생님 답이 있었으면(답 시각 또는 답이 가리킨 요청 시각이 지금 요청보다 이르면)
 * 한 번 답을 받고 다시 요청한 것이라 2차, 요청만 있으면 1차, 요청이 없으면 0.
 */
export function reviewRound(input: {
  count?: number | null;
  requestedAt?: number | null;
  reviewedAt?: number | null;
  feedbackForRequestAt?: number | null;
}): number {
  if (input.count && input.count > 0) return input.count;
  const requested = input.requestedAt ?? 0;
  if (!requested) return 0;
  const answeredBefore =
    (input.reviewedAt != null && input.reviewedAt < requested) ||
    (input.feedbackForRequestAt != null && input.feedbackForRequestAt < requested);
  return answeredBefore ? 2 : 1;
}

/**
 * 지금 어느 단계를 쓰는 중인가 - 답이 하나라도 있는 가장 뒤 단계(대시보드 표시용).
 * 아무것도 안 썼으면 -1.
 */
export function currentStepIndex(config: StepReviewConfig, answeredKeys: string[]): number {
  const answered = new Set(answeredKeys);
  let last = -1;
  config.steps.forEach((step, index) => {
    if (step.fields.some((f) => answered.has(f.key))) last = index;
  });
  return last;
}
