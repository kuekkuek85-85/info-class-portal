"use client";

import { Fragment, useCallback, useState } from "react";

import type { ClozeLine } from "@/lib/types";

/**
 * 빈칸 채우기.
 *
 * 문장을 쭉 보여주되, 정해진 낱말 자리(□)만 입력칸/드롭다운으로 비운다. 한 문항에 여러 줄을 담고,
 * 한 줄에 빈칸이 여럿일 수 있다. 예: "똥(장애물) — □에서 □로 떨어진다" → '위' · '아래'.
 * 줄에 blanks 가 있으면 그 자리는 보기 드롭다운이 된다(없으면 글칸).
 *
 * gradeEnabled 면 아래에 "AI 채점 받기" 단추가 뜬다 — 서버가 정답과 대조하고(드롭다운), 맞으면
 * 칭찬·틀리면 힌트를 AI가 돌려준다. 채점 결과는 저장하지 않고 이 화면에만 띄운다(즉석 자가 점검).
 *
 * ## 저장
 *
 * 줄 key → 빈칸 값 배열로 묶어, 답 하나에 JSON 으로 담는다(rows·list 와 같은 방식). 깨진 값이 와도
 * 화면이 죽지 않게 못 읽으면 빈 값으로 물러난다.
 */

type Answers = Record<string, string[]>;

function parse(raw: string): Answers {
  if (!raw.trim()) return {};
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out: Answers = {};
    for (const [key, val] of Object.entries(value)) {
      if (Array.isArray(val)) out[key] = val.map((x) => String(x ?? ""));
    }
    return out;
  } catch {
    return {};
  }
}

function hasAny(answers: Answers): boolean {
  return Object.values(answers).some((arr) => arr.some((v) => v.trim()));
}

export function ClozeField({
  value,
  lines,
  questionKey,
  gradeEnabled,
  onChange,
  disabled,
}: {
  value: string;
  lines: ClozeLine[];
  questionKey: string;
  gradeEnabled?: boolean;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const answers = parse(value);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ verdict: "good" | "revise"; message: string } | null>(
    null,
  );

  const write = useCallback(
    (next: Answers) => onChange(hasAny(next) ? JSON.stringify(next) : ""),
    [onChange],
  );

  function setBlank(lineKey: string, index: number, blanks: number, text: string) {
    const current = answers[lineKey] ?? [];
    const arr = Array.from({ length: blanks }, (_, i) => (i === index ? text : current[i] ?? ""));
    write({ ...answers, [lineKey]: arr });
    // 답을 바꾸면 이전 채점 결과는 흐려 둔다(다시 눌러 새로 받게)
    if (result) setResult(null);
  }

  async function grade() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/student/cloze-grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: questionKey, selections: answers }),
      });
      const body = await response.json();
      if (body.ok && body.result) {
        setResult(body.result);
      } else {
        setError(body.message || "AI가 잠시 대답하지 못하고 있어요. 조금 뒤에 다시 눌러 보세요.");
      }
    } catch {
      setError("인터넷 연결을 확인하고 다시 눌러 주세요.");
    } finally {
      setLoading(false);
    }
  }

  const good = result?.verdict === "good";

  return (
    <div className="flex flex-col gap-3">
      {lines.map((line, lineIdx) => {
        const parts = line.text.split("□");
        const blanks = parts.length - 1;
        const vals = answers[line.key] ?? [];
        const lineBlanks = line.blanks ?? [];
        return (
          <div
            key={line.key}
            className="flex flex-wrap items-center gap-x-1 gap-y-2 rounded-lg border border-line p-3 t-body-sm leading-relaxed"
          >
            {/* 구성요소 번호 — AI 힌트가 이 번호로 가리키므로 화면에도 똑같이 붙인다 */}
            <span className="mr-1 shrink-0 font-bold">{lineIdx + 1}.</span>
            {parts.map((seg, i) => (
              <Fragment key={i}>
                {seg !== "" && <span className="whitespace-pre-wrap">{seg}</span>}
                {i < blanks &&
                  (lineBlanks[i]?.options && lineBlanks[i]!.options!.length > 0 ? (
                    <select
                      value={vals[i] ?? ""}
                      onChange={(event) => setBlank(line.key, i, blanks, event.target.value)}
                      disabled={disabled}
                      aria-label="빈칸 고르기"
                      className="field t-body-sm inline-block w-auto min-w-[5rem] px-2 py-1 disabled:opacity-60"
                    >
                      <option value="">고르기</option>
                      {lineBlanks[i]!.options!.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={vals[i] ?? ""}
                      onChange={(event) =>
                        setBlank(line.key, i, blanks, event.target.value.slice(0, 20))
                      }
                      disabled={disabled}
                      aria-label="빈칸"
                      className="field t-body-sm inline-block w-24 px-2 py-1 text-center disabled:opacity-60"
                    />
                  ))}
              </Fragment>
            ))}
          </div>
        );
      })}

      {gradeEnabled && (
        <div className="flex flex-col gap-3">
          {result && (
            <div
              className={`flex flex-col gap-2 rounded-lg border-2 border-ink p-4 ${
                good ? "bg-cream" : "bg-lilac"
              }`}
            >
              <p className="t-subhead">{good ? "모두 맞았어요 ✓" : "거의 다 왔어요 — 힌트예요"}</p>
              <p className="t-body whitespace-pre-line">{result.message}</p>
              <p className="t-caption">AI 도우미의 참고 의견이에요.</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => void grade()}
            disabled={disabled || loading}
            className="pill pill-primary pill-block disabled:opacity-60"
          >
            {loading ? "AI가 채점하고 있어요…" : result ? "다시 채점받기" : "AI 채점 받기"}
          </button>

          {error && <p className="t-body-sm rounded-md bg-pink px-4 py-3">{error}</p>}
        </div>
      )}
    </div>
  );
}
