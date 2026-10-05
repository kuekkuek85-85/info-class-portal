"use client";

import { Fragment, useCallback } from "react";

import type { ClozeLine } from "@/lib/types";

/**
 * 빈칸 채우기.
 *
 * 문장을 쭉 보여주되, 정해진 낱말 자리(□)만 입력칸으로 비운다. 한 문항에 여러 줄을 담고,
 * 한 줄에 빈칸이 여럿일 수 있다. 예: "똥(장애물) — □에서 □로 떨어진다" → '위' · '아래'.
 *
 * ## 저장
 *
 * 줄 key → 빈칸 값 배열로 묶어, 답 하나에 JSON 으로 담는다(rows·list 와 같은 방식). 서버는
 * maxLength 로 자를 뿐 형식을 모른다. 깨진 값이 와도 화면이 죽지 않게 못 읽으면 빈 값으로 물러난다.
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

/** 한 칸이라도 채워졌는가. 다 비면 답을 통째로 비운다 */
function hasAny(answers: Answers): boolean {
  return Object.values(answers).some((arr) => arr.some((v) => v.trim()));
}

export function ClozeField({
  value,
  lines,
  onChange,
  disabled,
}: {
  value: string;
  lines: ClozeLine[];
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const answers = parse(value);

  const write = useCallback(
    (next: Answers) => onChange(hasAny(next) ? JSON.stringify(next) : ""),
    [onChange],
  );

  function setBlank(lineKey: string, index: number, blanks: number, text: string) {
    const current = answers[lineKey] ?? [];
    const arr = Array.from({ length: blanks }, (_, i) => (i === index ? text : current[i] ?? ""));
    write({ ...answers, [lineKey]: arr });
  }

  return (
    <div className="flex flex-col gap-3">
      {lines.map((line) => {
        const parts = line.text.split("□");
        const blanks = parts.length - 1;
        const vals = answers[line.key] ?? [];
        return (
          <div
            key={line.key}
            className="flex flex-wrap items-center gap-x-1 gap-y-2 rounded-lg border border-line p-3 t-body-sm leading-relaxed"
          >
            {parts.map((seg, i) => (
              <Fragment key={i}>
                {seg !== "" && <span className="whitespace-pre-wrap">{seg}</span>}
                {i < blanks && (
                  <input
                    value={vals[i] ?? ""}
                    onChange={(event) =>
                      setBlank(line.key, i, blanks, event.target.value.slice(0, 20))
                    }
                    disabled={disabled}
                    aria-label="빈칸"
                    className="field t-body-sm inline-block w-24 px-2 py-1 text-center disabled:opacity-60"
                  />
                )}
              </Fragment>
            ))}
          </div>
        );
      })}
    </div>
  );
}
