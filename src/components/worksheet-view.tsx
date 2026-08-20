"use client";

import { useEffect, useRef, useState } from "react";

import { ArtifactCanvas } from "@/components/artifact-canvas";
import { TechExampleChips } from "@/components/tech-examples";
import { TRAITS, type Stroke, type TextItem, type WorksheetQuestion } from "@/lib/types";

/**
 * 활동지 — 그린 것을 말로 옮기는 단계.
 *
 * 그림만 그리고 끝나면 "그림 잘 그리는 학생"의 활동이 된다. 무엇을 왜 그렸는지 적게 해야
 * 기술 이야기가 되고, 그게 이 수업의 목적이다.
 *
 * 성찰과 같은 1.5초 자동 임시저장을 쓴다. 30분 수업의 뒷부분이라 종이 울릴 때 쓰던 것이
 * 날아가면 다시 받을 방법이 없다 (PRD 3.4).
 */

const AUTOSAVE_MS = 1500;

export interface WorksheetValue {
  answers: Record<string, string>;
  traits: string[];
  sources: { site: string; ai: string };
}

interface WorksheetViewProps {
  questions: WorksheetQuestion[];
  place: string;
  year: number;
  /**
   * 그리는 차시인가.
   *
   * 아니면 머리글이 통째로 거짓말이 된다 — 4차시(직업 조사)에서 "내 그림 설명하기 /
   * 2040년의 내가 고른 장소 — 무엇을 그렸는지 적어 주세요" 가 떠 있었다.
   * 그린 것도 고른 장소도 없는 화면이다.
   */
  canDraw: boolean;
  strokes: Stroke[];
  texts: TextItem[];
  value: WorksheetValue;
  onChange: (value: WorksheetValue) => void;
  onSubmit: () => Promise<void> | void;
  submitted: boolean;
  submitError: string;
  disabled?: boolean;
}

export function WorksheetView({
  questions,
  place,
  year,
  canDraw,
  strokes,
  texts,
  value,
  onChange,
  onSubmit,
  submitted,
  submitError,
  disabled,
}: WorksheetViewProps) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(JSON.stringify(value));

  // 입력이 멈추면 조용히 올린다. 학생은 저장 버튼을 누를 생각을 하지 않는다.
  useEffect(() => {
    if (disabled) return;
    const serialized = JSON.stringify(value);
    if (serialized === lastSaved.current) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setState("saving");
      const response = await fetch("/api/student/artifact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: value.answers,
          traits: value.traits,
          sources: value.sources,
        }),
      });
      const result = await response.json();
      if (result.ok) {
        lastSaved.current = serialized;
        setState("saved");
      } else {
        setState("idle");
      }
    }, AUTOSAVE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, disabled]);

  function setAnswer(key: string, text: string) {
    onChange({ ...value, answers: { ...value.answers, [key]: text } });
  }

  function toggleTrait(trait: string) {
    const next = value.traits.includes(trait)
      ? value.traits.filter((item) => item !== trait)
      : [...value.traits, trait];
    onChange({ ...value, traits: next });
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="t-display">{canDraw ? "내 그림 설명하기" : "활동지 쓰기"}</h2>
        <p className="t-body mt-2">
          {canDraw
            ? `${year}년의 ${place || "내가 고른 장소"} — 무엇을 그렸는지 적어 주세요.`
            : "아래 질문에 차례로 답해 주세요. 쓰는 동안 자동으로 저장돼요."}
        </p>
      </div>

      {/*
        그림을 위에 띄워 둔다. 자기가 뭘 그렸는지 보면서 써야 답이 구체적으로 나온다.

        높이를 화면의 3분의 1로 묶는다. 폭에만 맞추면 넓은 화면에서 미리보기 하나가
        976px을 먹어(1366×768에서 실측) 첫 질문조차 보이지 않는다. 여기서는 그리는 게
        아니라 보고 쓰는 것이므로, 그림보다 질문이 보이는 편이 낫다.
      */}
      {/* 그림이 없는 차시(4차시 직업 조사)에서는 빈 흰 상자만 남는다 — 아예 뺀다 */}
      {(strokes.length > 0 || texts.length > 0) && (
        <div className="flex justify-center rounded-lg border border-line p-2">
          <ArtifactCanvas
            strokes={strokes}
            texts={texts}
            pixelWidth={640}
            className="h-auto max-h-[32dvh] w-auto max-w-full rounded bg-white"
          />
        </div>
      )}

      {questions.map((question) => (
        <div key={question.key} className="flex flex-col gap-2">
          <label htmlFor={`ws-${question.key}`} className="block bg-cream t-subhead">
            {question.label}
          </label>
          {question.hint && <p className="t-caption">{question.hint}</p>}

          {/*
            낱말 보기. 힌트 한 줄로는 모자란 질문에만 붙는다.
            힌트 **아래** 입력칸 **위** 자리다 — 읽고 나서 바로 쓰게 된다.
          */}
          {question.examples && question.examples.length > 0 && (
            <TechExampleChips items={question.examples} />
          )}

          {question.kind === "traits" ? (
            <div className="flex flex-wrap gap-2" id={`ws-${question.key}`}>
              {TRAITS.map((trait) => {
                const on = value.traits.includes(trait);
                return (
                  <button
                    key={trait}
                    type="button"
                    onClick={() => toggleTrait(trait)}
                    aria-pressed={on}
                    disabled={disabled}
                    className={`pill t-body ${on ? "pill-primary" : "pill-secondary"}`}
                  >
                    {trait}
                  </button>
                );
              })}
            </div>
          ) : question.kind === "long" ? (
            <textarea
              id={`ws-${question.key}`}
              value={value.answers[question.key] ?? ""}
              onChange={(event) => setAnswer(question.key, event.target.value)}
              rows={3}
              maxLength={question.maxLength || 500}
              disabled={disabled}
              className="field disabled:opacity-60"
              placeholder="여기에 적어 주세요"
            />
          ) : (
            <>
              <input
                id={`ws-${question.key}`}
                value={value.answers[question.key] ?? ""}
                onChange={(event) => setAnswer(question.key, event.target.value)}
                maxLength={question.maxLength || 200}
                disabled={disabled}
                className="field disabled:opacity-60"
                placeholder="여기에 적어 주세요"
              />
              {question.maxLength > 0 && question.maxLength <= 80 && (
                <span className="t-caption self-end">
                  {(value.answers[question.key] ?? "").length} / {question.maxLength}자
                </span>
              )}
            </>
          )}
        </div>
      ))}

      {/*
        출처 두 칸은 고정이다. 수행평가1이 "출처 밝히기 태도"를 평가하므로,
        쓸 자리가 없어서 못 썼다는 상황을 만들지 않는다 (PRD 7).
      */}
      <div className="flex flex-col gap-3 rounded-lg border border-line p-4">
        <h3 className="t-subhead">어디에서 찾아봤나요?</h3>
        <p className="t-caption">안 찾아봤으면 비워 둬도 됩니다. 찾아봤으면 꼭 적어 주세요.</p>

        <label className="flex flex-col gap-1">
          <span className="t-body-sm">인터넷에서 찾은 곳</span>
          <input
            value={value.sources.site}
            onChange={(event) =>
              onChange({ ...value, sources: { ...value.sources, site: event.target.value } })
            }
            maxLength={300}
            disabled={disabled}
            placeholder="예) 나무위키 — 자율주행"
            className="field disabled:opacity-60"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="t-body-sm">AI에게 물어봤다면</span>
          <input
            value={value.sources.ai}
            onChange={(event) =>
              onChange({ ...value, sources: { ...value.sources, ai: event.target.value } })
            }
            maxLength={300}
            disabled={disabled}
            placeholder="예) 챗지피티 — 2040년 병원은 어떻게 바뀔까?"
            className="field disabled:opacity-60"
          />
        </label>
      </div>

      <span className="t-caption" aria-live="polite">
        {state === "saving" && "저장 중…"}
        {state === "saved" && "자동 저장됨"}
        {state === "idle" && "쓰는 동안 자동으로 저장돼요"}
      </span>

      {submitError && <p className="rounded-md bg-pink px-4 py-3 t-body-sm">{submitError}</p>}

      <button
        type="button"
        onClick={() => void onSubmit()}
        disabled={disabled}
        className="pill pill-primary pill-block"
      >
        {/*
          그림은 그리는 순간 이미 갤러리에 올라간다. 이 버튼은 "다 했어요" 표시라,
          문구도 그렇게 바꾼다 — 누르지 않으면 안 보인다고 오해하면 조급해진다.
        */}
        {submitted ? "다시 냈어요" : "다 했어요 — 선생님께 알리기"}
      </button>

      {submitted && (
        <p className="t-body-sm text-center">
          선생님께 알렸어요. 수업이 끝나기 전까지는 계속 고칠 수 있습니다.
        </p>
      )}
    </section>
  );
}
