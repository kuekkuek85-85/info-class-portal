"use client";

// 28차 code_fill: 고정 코드 readonly + 인라인 빈칸(Tab=공백4칸) + 완성 코드 복사.
import { Fragment, useMemo, useState, type KeyboardEvent } from "react";

import type { WorksheetQuestion } from "@/lib/types";

/**
 * 코드 빈칸 채우기 (28차 똥피하기). 전체 코드가 한 블록 안에 **읽기전용 등폭**으로 보이고, 코드 중간의
 * `{{토큰}}` 자리마다 **인라인 편집칸(기본 2줄)** 이 끼어 있다. 학생이 그 칸만 채우면 고정부와 합쳐
 * 완성 코드가 되고, '완성 코드 복사' 로 전체를 복사한다.
 *
 * ## MakeCode 안전
 * 빈 칸이 하나라도 있으면 복사를 막고 그 칸으로 안내한다 → 복사되는 코드엔 `{{}}`/`___`/빈 줄이
 * 절대 안 남는다(학생이 적은 글자만 들어감). dice/rps 빌더와 같은 성격(순수 클라이언트, 서버·AI 없음).
 *
 * ## 저장
 * 입력은 answers[key] 에 {토큰: 글자} JSON 으로 자동저장돼 교사가 활동지로 열람한다(제출칸 없음).
 */

const MAKECODE_URL = "https://makecode.microbit.org/";
const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

type Values = Record<string, string>;

function parse(raw: string): Values {
  if (!raw.trim()) return {};
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: Values = {};
    for (const [k, val] of Object.entries(v)) out[k] = String(val ?? "");
    return out;
  } catch {
    return {};
  }
}

function hasAny(values: Values): boolean {
  // 공백만 든 칸(Tab 들여쓰기 직후 등)도 '내용 있음' 으로 본다 — trim 으로 보면 공백이 지워져
  // onChange("") 로 비워지고, 컨트롤드 재렌더가 Tab 공백을 되돌린다(빈 칸 첫 Tab 무반응 원인).
  return Object.values(values).some((v) => v.length > 0);
}

/** 한 줄을 고정 글자 / 토큰 조각들로 쪼갠다. */
type Piece = { kind: "text"; text: string } | { kind: "slot"; token: string };
function splitLine(line: string): Piece[] {
  const pieces: Piece[] = [];
  let last = 0;
  for (const m of line.matchAll(TOKEN_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) pieces.push({ kind: "text", text: line.slice(last, idx) });
    pieces.push({ kind: "slot", token: m[1] });
    last = idx + m[0].length;
  }
  if (last < line.length) pieces.push({ kind: "text", text: line.slice(last) });
  if (pieces.length === 0) pieces.push({ kind: "text", text: "" });
  return pieces;
}

export function CodeFill({
  questionKey,
  raw,
  template,
  slots,
  onChange,
  disabled,
}: {
  questionKey: string;
  raw: string;
  template: string;
  slots: NonNullable<WorksheetQuestion["codeSlots"]>;
  onChange: (raw: string) => void;
  disabled?: boolean;
}) {
  const values = parse(raw);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");
  /** 완성 코드 미리보기(복사 버튼을 누르면 조립해 보여준다 — 클립보드가 막혀도 눌러서 직접 복사 가능). */
  const [shown, setShown] = useState("");

  const slotByToken = useMemo(() => {
    const map: Record<string, (typeof slots)[number]> = {};
    for (const s of slots) map[s.token] = s;
    return map;
  }, [slots]);

  const lines = useMemo(() => template.split("\n"), [template]);

  function setValue(token: string, text: string) {
    const next = { ...values, [token]: text };
    onChange(hasAny(next) ? JSON.stringify(next) : "");
    setErr("");
    if (copied) setCopied(false);
    // 칸을 고치면 이전에 뽑아 둔 완성 코드는 흐려 둔다(다시 눌러 새로 뽑게)
    if (shown) setShown("");
  }

  /**
   * Python 들여쓰기를 위해 이 코드 입력칸에서만 Tab/Enter 를 가로챈다(탭 문자 아님, 공백 4칸).
   *  · Tab        → 포커스 이동 막고 커서에 공백 4칸 삽입.
   *  · Shift+Tab  → 커서 앞(줄머리 쪽) 공백을 최대 4칸 내어쓰기.
   *  · Enter      → 직전 줄 들여쓰기 유지, 직전 줄이 ':' 로 끝나면 4칸 더(파이썬 자동 들여쓰기).
   * 삽입은 textarea.setRangeText 로 한다 — DOM 값·커서를 직접 바꾸고, 바뀐 값을 setValue 로 React
   * 상태에 그대로 반영한다(값이 같아 재렌더가 커서를 안 건드림). keydown 핸들러 안에서 input 이벤트를
   * 합성 dispatch 하면 React 컨트롤드 값이 되돌아가는 브라우저가 있어(미션3 Tab 무반응) 쓰지 않는다.
   */
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>, token: string) {
    if (disabled) return;
    if (e.key !== "Tab" && e.key !== "Enter") return;
    const ta = e.currentTarget;
    const val = ta.value;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        const lineStart = val.lastIndexOf("\n", start - 1) + 1;
        const before = val.slice(lineStart, start);
        const removable = (before.match(/ {1,4}$/) ?? [""])[0].length;
        if (removable > 0) {
          ta.setRangeText("", start - removable, start, "end");
          setValue(token, ta.value);
        }
      } else {
        ta.setRangeText("    ", start, end, "end");
        setValue(token, ta.value);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const lineStart = val.lastIndexOf("\n", start - 1) + 1;
      const curLine = val.slice(lineStart, start);
      let indent = (curLine.match(/^ */) ?? [""])[0];
      if (curLine.trimEnd().endsWith(":")) indent += "    ";
      ta.setRangeText("\n" + indent, start, end, "end");
      setValue(token, ta.value);
    }
  }

  /** 완성 코드 = 템플릿의 각 토큰을 그 칸 입력으로 치환. */
  function assemble(): string {
    return template.replace(TOKEN_RE, (_m, token: string) => values[token] ?? "");
  }

  async function copy() {
    const missing = slots.filter((s) => !(values[s.token] ?? "").trim());
    if (missing.length > 0) {
      setErr(
        `아직 안 채운 칸이 있어요: ${missing.map((s) => s.label).join(", ")}. 모두 채운 뒤 다시 눌러 주세요.`,
      );
      return;
    }
    setErr("");
    const full = assemble();
    // 클립보드가 막혀도 학생이 눌러서 직접 복사할 수 있게 완성 코드를 먼저 보여 준다.
    setShown(full);
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setErr("자동 복사가 막혀 있어요. 아래 '완성 코드' 칸을 눌러 전체 선택한 뒤 복사하세요.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 한 코드 블록 — 고정부는 읽기전용 등폭, {{토큰}} 자리만 편집칸 */}
      <div className="overflow-x-auto rounded-lg border border-line bg-surface p-3 font-mono text-sm leading-relaxed">
        {lines.map((line, i) => {
          const pieces = splitLine(line);
          const hasSlot = pieces.some((p) => p.kind === "slot");
          if (!hasSlot) {
            // 고정 줄 — 읽기전용. 빈 줄은 높이 유지.
            return (
              <div key={i} className="whitespace-pre text-ink/90">
                {line === "" ? " " : line}
              </div>
            );
          }
          return (
            <div key={i} className="flex flex-wrap items-start gap-1 py-1">
              {pieces.map((p, j) =>
                p.kind === "text" ? (
                  <span key={j} className="whitespace-pre text-ink/90">
                    {p.text}
                  </span>
                ) : (
                  (() => {
                    const slot = slotByToken[p.token];
                    const rows = slot?.rows ?? 2;
                    return (
                      <span key={j} className="flex min-w-[14rem] flex-1 flex-col gap-1">
                        <span className="t-caption font-sans font-semibold text-muted">
                          ✎ {slot?.label ?? p.token}
                          {slot?.hint ? ` — ${slot.hint}` : ""}
                          <span className="font-normal"> (Tab=들여쓰기)</span>
                        </span>
                        <textarea
                          value={values[p.token] ?? ""}
                          onChange={(e) => setValue(p.token, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, p.token)}
                          disabled={disabled}
                          rows={rows}
                          spellCheck={false}
                          aria-label={`${slot?.label ?? "빈칸"} (Tab 으로 공백 4칸 들여쓰기)`}
                          className="field w-full border-2 border-ink/40 bg-cream font-mono text-sm disabled:opacity-60"
                        />
                      </span>
                    );
                  })()
                ),
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copy()}
          disabled={disabled}
          className="pill pill-secondary t-body-sm disabled:opacity-60"
        >
          {copied ? "복사됐어요" : "완성 코드 복사"}
        </button>
        <a
          href={MAKECODE_URL}
          target="_blank"
          rel="noreferrer"
          className="pill pill-primary t-body-sm"
        >
          MakeCode 열기 (새 탭)
        </a>
      </div>
      {err ? (
        <p role="alert" className="t-body-sm font-semibold text-rose-600">
          {err}
        </p>
      ) : (
        <p className="t-caption text-muted">
          빈칸을 모두 채운 뒤 '완성 코드 복사' 를 눌러요. MakeCode 를 열고 Python 으로 바꾼 뒤 기존 코드를
          모두 지우고 붙여넣어 실행해요. <span className="sr-only">{questionKey}</span>
        </p>
      )}

      {/* 완성 코드 — 복사 버튼을 누르면 조립해 보여준다. 자동 복사가 막혀도 눌러서 직접 복사할 수 있다. */}
      {shown && (
        <div className="flex flex-col gap-1">
          <p className="t-body-sm font-semibold">완성 코드 (눌러서 전체 선택 → 복사)</p>
          <textarea
            readOnly
            value={shown}
            rows={Math.min(shown.split("\n").length, 34)}
            spellCheck={false}
            onFocus={(e) => e.currentTarget.select()}
            className="field font-mono text-sm"
          />
        </div>
      )}
    </div>
  );
}
