"use client";

import { useEffect, useRef, useState } from "react";

import { AiReviewPanel } from "@/components/ai-review-panel";
import { EmotionLensPanel } from "@/components/emotion-lens-panel";
import { ArtifactCanvas } from "@/components/artifact-canvas";
import { TechExampleChips } from "@/components/tech-examples";
import {
  DEFAULT_SOURCE_HINTS,
  TRAITS,
  type Stroke,
  type TextItem,
  type WorksheetQuestion,
} from "@/lib/types";

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
  /** 출처 두 칸의 예시. 차시가 안 정하면 그림 활동 기준 기본값을 쓴다 */
  sourceHints?: { site: string; ai: string };
  /** 지난 차시에 쓴 답. 활동지 맨 위에 읽기 전용으로 붙는다 */
  carried?: { heading: string; rows: { label: string; value: string }[] } | null;
  /**
   * 제출 단추를 감춘다.
   *
   * 선택과목은 한 시간에 네 단계를 지나는데, 단계마다 "다 했어요" 가 뜨면 문제 정의만
   * 쓰고 끝내는 학생이 나온다. 마지막 단계에서만 띄운다.
   */
  hideSubmit?: boolean;
  /** 맨 위 제목. 안 주면 차시 성격에 따라 "내 그림 설명하기" / "활동지 쓰기" */
  heading?: string;
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
  sourceHints = DEFAULT_SOURCE_HINTS,
  carried,
  hideSubmit,
  heading,
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

  /**
   * 앞 답으로 칸을 미리 채운다.
   *
   * 읽기 전용으로 옆에 보여주기만 하면 학생은 그것을 손으로 옮겨 적는다. 45분에 뽑기까지
   * 가야 하는 수업에서 그 시간이 아깝고, 옮겨 적다가 내용이 달라지기도 한다.
   *
   * **이미 쓴 것은 절대 덮지 않는다.** 그리고 채운 칸은 기억해 둔다 — 학생이 일부러
   * 지웠는데 다음 렌더에서 되살아나면 지울 수가 없다.
   */
  const prefilled = useRef(new Set<string>());
  useEffect(() => {
    if (disabled) return;

    const filled: Record<string, string> = {};
    for (const question of questions) {
      if (!question.prefillTemplate) continue;
      if (prefilled.current.has(question.key)) continue;
      if ((value.answers[question.key] ?? "").trim()) continue;

      // {키} 를 그 칸의 답으로 바꾸고, 안 쓴 칸이 들어간 줄은 통째로 뺀다
      const text = question.prefillTemplate
        .split("\n")
        .map((line) => {
          let missing = false;
          const filledLine = line.replace(/\{(\w+)\}/g, (_, key: string) => {
            const answer = (value.answers[key] ?? "").trim();
            if (!answer) missing = true;
            return answer;
          });
          return missing ? "" : filledLine;
        })
        .filter(Boolean)
        .join("\n")
        .trim();

      if (!text) continue;
      prefilled.current.add(question.key);
      filled[question.key] = text;
    }

    if (Object.keys(filled).length > 0) {
      onChange({ ...value, answers: { ...value.answers, ...filled } });
    }
  }, [questions, value, disabled, onChange]);

  /** 방금 복사한 칸 — 눌렀는데 아무 일도 안 일어난 것처럼 보이면 또 누른다 */
  const [copied, setCopied] = useState("");

  async function copy(key: string) {
    const text = value.answers[key] ?? "";
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      /*
       * 클립보드가 막히는 경우가 있다 (창이 포커스를 안 받았거나 브라우저 설정).
       *
       * 그냥 삼키면 학생 눈에는 **눌렀는데 아무 일도 안 일어난 것**으로 보이고,
       * 그러면 계속 누른다. 대신 칸의 글자를 통째로 선택해 준다 —
       * 그 상태에서 Ctrl+C 한 번이면 되고, 무엇을 하라는지도 눈에 보인다.
       */
      const field = document.getElementById(`ws-${key}`);
      if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
        field.focus();
        field.select();
      }
      setCopied(`${key}__manual`);
      setTimeout(() => setCopied(""), 4000);
    }
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
        <h2 className="t-display">{heading ?? (canDraw ? "내 그림 설명하기" : "활동지 쓰기")}</h2>
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
      {/*
        지난 차시에 쓴 답. 고쳐 쓰는 칸이 아니라 **보고 이어 쓰라고** 띄운다.
        5차시가 "내 희망 직업" 에서 출발하는데 그 답은 4차시에 이미 있다.
      */}
      {carried && carried.rows.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg bg-cream px-4 py-3">
          <p className="t-caption">{carried.heading}</p>
          {carried.rows.map((row) => (
            <p key={row.label} className="t-body-sm">
              <span className="font-semibold">{row.label} · </span>
              {row.value}
            </p>
          ))}
        </div>
      )}

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
          {/*
            note 는 답할 것이 없다. label 로 두면 눌렀을 때 엉뚱한 칸에 커서가 가고,
            읽는 프로그램에는 "답이 없는 입력칸" 으로 들린다.
          */}
          {question.kind === "note" ? (
            <p className="block bg-cream t-subhead">{question.label}</p>
          ) : /* 제목 없이 답만 다시 보여주는 경우가 있다 (앞 문항 바로 아래에 붙일 때) */
          question.kind === "echo" && !question.label ? null : (
            <label htmlFor={`ws-${question.key}`} className="block bg-cream t-subhead">
              {question.label}
            </label>
          )}
          {question.hint && <p className="t-caption whitespace-pre-line">{question.hint}</p>}

          {/*
            주소를 글자로 보여주지 않고 누를 수 있게 한다. 캔바 초대 주소는 토큰이 붙어
            100자가 넘어서, 옮겨 적으라고 하면 그 자리에서 수업이 멈춘다.
            새 창으로 연다 — 같은 창에서 나가면 쓰던 답이 날아간다.
          */}
          {question.linkUrl && (
            <a
              href={question.linkUrl}
              target="_blank"
              rel="noreferrer"
              className="pill pill-primary pill-block text-center"
            >
              {question.linkLabel || "열기"}
            </a>
          )}

          {/*
            낱말 보기. 힌트 한 줄로는 모자란 질문에만 붙는다.
            힌트 **아래** 입력칸 **위** 자리다 — 읽고 나서 바로 쓰게 된다.
          */}
          {question.examples && question.examples.length > 0 && (
            <TechExampleChips items={question.examples} note={question.examplesNote} />
          )}

          {question.kind === "note" ? null : question.kind === "echo" ? (
            /*
              앞 단계에서 쓴 답. 고치는 칸이 아니라 **보고 옮겨 적으라고** 띄운다.
              한 시간에 여러 단계를 지나면 앞 단계 답이 화면에서 사라지는데,
              되돌아가기가 꺼진 수업에서는 학생이 볼 방법이 아예 없다.
            */
            <div className="flex flex-col gap-1 rounded-lg bg-cream px-4 py-3">
              {(question.echoKeys ?? []).map((row) => {
                const written = (value.answers[row.key] ?? "").trim();
                return (
                  <p key={row.key} className="t-body-sm">
                    <span className="font-semibold">{row.label} · </span>
                    {/* 안 쓴 칸은 비워 두지 않는다 — 빈 줄만 보면 고장으로 읽는다 */}
                    {!written && <span className="text-muted">(아직 안 썼어요)</span>}
                    {/*
                      주소는 눌러서 열 수 있게 한다. "만든 화면을 띄워 놓고 답해 주세요" 라고
                      해 놓고 주소를 글자로만 보여주면 학생이 손으로 옮겨 적는다.
                      새 창으로 연다 — 여기서 나가면 쓰던 답이 날아간다.
                    */}
                    {written &&
                      (/^https?:\/\//.test(written) ? (
                        <a
                          href={written}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all underline"
                        >
                          {written}
                        </a>
                      ) : (
                        written
                      ))}
                  </p>
                );
              })}
            </div>
          ) : question.kind === "ai_review" ? (
            <AiReviewPanel
              questionKey={question.key}
              raw={value.answers[question.key] ?? ""}
              onResult={(raw) => setAnswer(question.key, raw)}
              disabled={disabled}
            />
          ) : question.kind === "emotion_lens" ? (
            <EmotionLensPanel
              questionKey={question.key}
              raw={value.answers[question.key] ?? ""}
              onResult={(raw) => setAnswer(question.key, raw)}
              disabled={disabled}
            />
          ) : question.kind === "traits" ? (
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
          ) : question.kind === "choice" ? (
            /*
              보기 중 하나. 고른 문구가 그대로 답이 된다.
              보기 안에 판단 근거가 들어 있어서(types.ts 의 choices 참조) 고르는 순간
              이유를 함께 고르게 된다 — 그래서 짧은 라벨로 줄이지 않는다.
            */
            <div className="flex flex-col gap-2" id={`ws-${question.key}`}>
              {(question.choices ?? []).map((choice) => {
                const on = (value.answers[question.key] ?? "") === choice;
                return (
                  <button
                    key={choice}
                    type="button"
                    // 누른 것을 다시 누르면 고른 것이 풀린다. 잘못 눌러 놓고 못 바꾸면 답답하다
                    onClick={() => setAnswer(question.key, on ? "" : choice)}
                    aria-pressed={on}
                    disabled={disabled}
                    className={`rounded-lg border-2 px-4 py-3 text-left t-body-sm transition active:scale-[0.99] ${
                      on ? "border-ink bg-ink text-canvas" : "border-line bg-canvas"
                    }`}
                  >
                    {choice}
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

          {/*
            다른 곳에 붙여 넣을 값이면 복사 단추를 준다. 긁어서 복사하는 것은 태블릿에서
            잘 안 된다 — 손가락으로 끝을 맞추다 글자가 지워지기도 한다.
          */}
          {question.copyable && (
            <button
              type="button"
              onClick={() => void copy(question.key)}
              disabled={disabled || !(value.answers[question.key] ?? "").trim()}
              className="pill pill-secondary t-body-sm self-start disabled:opacity-35"
            >
              {copied === question.key
                ? "복사됐어요"
                : copied === `${question.key}__manual`
                  ? "글자를 골라 뒀어요 — Ctrl+C 를 누르세요"
                  : "복사하기"}
            </button>
          )}
        </div>
      ))}

      {/*
        출처 두 칸은 고정이다. 수행평가1이 "출처 밝히기 태도"를 평가하므로,
        쓸 자리가 없어서 못 썼다는 상황을 만들지 않는다 (PRD 7).

        단계를 쪼개 쓰는 차시에서는 마지막 단계에만 붙인다 — 문제 정의 칸 아래에도
        "어디에서 찾아봤나요" 가 나오면 매 단계 같은 상자를 지나야 한다.
      */}
      <div
        className="flex flex-col gap-3 rounded-lg border border-line p-4"
        hidden={hideSubmit}
      >
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
            placeholder={sourceHints.site}
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
            placeholder={sourceHints.ai}
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

      {!hideSubmit && (
        <>
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
        </>
      )}
    </section>
  );
}
