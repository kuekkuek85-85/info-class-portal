"use client";

// 31차 code_choose: 좌(참조 '변수 하나하나' 코드, 읽기전용) · 우(리스트 코드, 빈칸은 '보기 선택').
// 자유 타자 없음. 오른쪽 {{토큰}} 자리마다 드롭다운. '확인' → 칸마다 정답/오답 + 모두 맞으면 why + 복사.
import { useMemo, useState } from "react";

import type { WorksheetQuestion } from "@/lib/types";

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

/**
 * 코드 왼쪽 줄 번호 거터(code-fill 과 같은 표준). select-none·aria-hidden 이라 드래그 선택·복사·화면낭독에
 * 안 딸려온다. 등폭·tabular-nums 로 정렬이 안 깨진다.
 */
function Ln({ n }: { n: number }) {
  return (
    <span
      aria-hidden
      className="w-7 shrink-0 select-none border-r border-line/60 pr-2 text-right tabular-nums text-muted/60"
    >
      {n}
    </span>
  );
}

/** 읽기전용 코드 블록(줄 번호 + 고정 글자). 왼쪽 참조 코드용. */
function RefCode({ code }: { code: string }) {
  const lines = code.split("\n");
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface p-3 font-mono text-sm leading-relaxed">
      {lines.map((line, i) => (
        <div key={i} className="flex gap-2">
          <Ln n={i + 1} />
          <span className="flex-1 whitespace-pre text-ink/70">{line === "" ? " " : line}</span>
        </div>
      ))}
    </div>
  );
}

export function CodeChoose({
  raw,
  template,
  refTemplate,
  refLabel,
  chooseLabel,
  slots,
  onChange,
  disabled,
}: {
  raw: string;
  template: string;
  refTemplate: string;
  refLabel?: string;
  chooseLabel?: string;
  slots: NonNullable<WorksheetQuestion["codeSlots"]>;
  onChange: (raw: string) => void;
  disabled?: boolean;
}) {
  const values = parse(raw);
  const [graded, setGraded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");
  const [shown, setShown] = useState("");

  const slotByToken = useMemo(() => {
    const map: Record<string, (typeof slots)[number]> = {};
    for (const s of slots) map[s.token] = s;
    return map;
  }, [slots]);

  const lines = useMemo(() => template.split("\n"), [template]);

  const allPicked = slots.every((s) => (values[s.token] ?? "") !== "");
  const correctOf = (token: string) => (values[token] ?? "") === (slotByToken[token]?.answer ?? "");
  const allOk = slots.every((s) => correctOf(s.token));

  function setValue(token: string, text: string) {
    const next = { ...values, [token]: text };
    onChange(JSON.stringify(next));
    setGraded(false);
    setErr("");
    if (copied) setCopied(false);
    if (shown) setShown("");
  }

  function check() {
    if (disabled || !allPicked) return;
    setGraded(true);
  }

  function reset() {
    onChange("");
    setGraded(false);
    setErr("");
    setShown("");
  }

  /** 완성 코드 = 템플릿의 각 토큰을 고른 보기로 치환. 모두 맞았을 때만 복사 허용(틀린 코드 붙여넣기 방지). */
  function assemble(): string {
    return template.replace(TOKEN_RE, (_m, token: string) => values[token] ?? "");
  }

  async function copy() {
    if (!allOk) {
      setErr("먼저 모든 칸을 바르게 골라 '확인' 을 눌러 주세요.");
      return;
    }
    setErr("");
    const full = assemble();
    setShown(full);
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setErr("자동 복사가 막혀 있어요. 아래 '완성 코드' 칸을 눌러 전체 선택한 뒤 복사하세요.");
    }
  }

  function Select({ token }: { token: string }) {
    const slot = slotByToken[token];
    const val = values[token] ?? "";
    const isRight = graded && correctOf(token);
    const isWrong = graded && val !== "" && !correctOf(token);
    return (
      <select
        value={val}
        disabled={disabled || (graded && allOk)}
        onChange={(e) => setValue(token, e.target.value)}
        aria-label={slot?.label ?? "보기 고르기"}
        className={`field inline-block w-auto min-w-[6rem] font-mono text-sm disabled:opacity-70 ${
          isRight ? "border-2 border-success bg-lime" : isWrong ? "border-2 border-ink bg-cream" : ""
        }`}
      >
        <option value="">고르기…</option>
        {(slot?.options ?? []).map((opt, k) => (
          <option key={k} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg bg-cream p-3">
        <p className="t-body-sm">
          <b>왼쪽</b> 은 지난 미션에서 만든 <b>변수 하나하나</b> 코드예요(그대로 두고 보기만 해요).{" "}
          <b>오른쪽</b> 은 똑같이 움직이는 <b>리스트</b> 코드인데, 빈칸을 <b>보기에서 골라</b> 채워요.
          다 고르면 「확인」을 눌러요. <b>같은 동작인데 오른쪽이 훨씬 짧죠?</b>
        </p>
      </div>

      {/* 좌우 2단(lg+). 스마트폰에선 세로로 쌓인다(왼쪽=참조 위, 오른쪽=선택 아래). */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* 왼쪽 — 참조('변수 하나하나') 코드, 읽기전용 */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="t-body-sm font-semibold text-muted">
            {refLabel ?? "변수 하나하나"} <span className="font-normal">(지난 미션 · 보기만)</span>
          </p>
          <RefCode code={refTemplate} />
        </div>

        {/* 오른쪽 — 리스트 코드, 빈칸은 드롭다운 선택 */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="t-body-sm font-semibold">
            {chooseLabel ?? "리스트로 정리"} <span className="font-normal">(빈칸을 골라요)</span>
          </p>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface p-3 font-mono text-sm leading-relaxed">
            {lines.map((line, i) => {
              const pieces = splitLine(line);
              const hasSlot = pieces.some((p) => p.kind === "slot");
              if (!hasSlot) {
                return (
                  <div key={i} className="flex gap-2">
                    <Ln n={i + 1} />
                    <span className="flex-1 whitespace-pre text-ink/90">
                      {line === "" ? " " : line}
                    </span>
                  </div>
                );
              }
              return (
                <div key={i} className="flex gap-2">
                  <Ln n={i + 1} />
                  <span className="flex flex-1 flex-wrap items-center gap-1">
                    {pieces.map((p, j) =>
                      p.kind === "text" ? (
                        <span key={j} className="whitespace-pre text-ink/90">
                          {p.text}
                        </span>
                      ) : (
                        <Select key={j} token={p.token} />
                      ),
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 확인 / 채점 결과 */}
      {!graded ? (
        <button
          type="button"
          onClick={check}
          disabled={disabled || !allPicked}
          className="pill pill-primary self-start disabled:opacity-35"
        >
          {allPicked ? "확인" : "오른쪽 빈칸을 모두 골라 주세요"}
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border-2 border-ink bg-surface px-4 py-4">
          <p className={`t-subhead ${allOk ? "text-success" : ""}`}>
            {allOk ? "잘했어요! 모두 맞혔어요 ✓" : "거의 다 왔어요 - 빨간 칸을 다시 골라 볼까요?"}
          </p>
          {/* 칸별 정답/오답 + 모두 맞으면 why(왜 그런지) */}
          <ul className="flex flex-col gap-1">
            {slots.map((s) => {
              const ok = correctOf(s.token);
              return (
                <li key={s.token} className="t-body-sm">
                  <span className={`font-bold ${ok ? "text-success" : ""}`}>
                    {ok ? "정답" : "다시"}
                  </span>{" "}
                  <span className="font-semibold">{s.label}</span>
                  {ok && s.why ? <span className="text-muted"> - {s.why}</span> : null}
                </li>
              );
            })}
          </ul>
          {!allOk && (
            <button
              type="button"
              onClick={reset}
              disabled={disabled}
              className="pill pill-secondary self-start"
            >
              다시 고르기
            </button>
          )}
        </div>
      )}

      {/* 모두 맞으면 완성 코드 복사 + MakeCode */}
      {graded && allOk && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copy()}
            disabled={disabled}
            className="pill pill-secondary t-body-sm disabled:opacity-60"
          >
            {copied ? "복사됐어요" : "완성 코드 복사"}
          </button>
          <a href={MAKECODE_URL} target="_blank" rel="noreferrer" className="pill pill-primary t-body-sm">
            MakeCode 열기 (새 탭)
          </a>
        </div>
      )}

      {err ? (
        <p role="alert" className="t-body-sm font-semibold text-rose-600">
          {err}
        </p>
      ) : (
        graded &&
        allOk && (
          <p className="t-caption text-muted">
            '완성 코드 복사' 를 눌러요. MakeCode 를 열고 Python 으로 바꾼 뒤 기존 코드를 모두 지우고
            붙여넣어 실행해요.
          </p>
        )
      )}

      {/* 완성 코드 — 줄 번호 보기 + 번호 없는 복사용 칸 */}
      {shown && (
        <div className="flex flex-col gap-1">
          <p className="t-body-sm font-semibold">완성 코드 (줄 번호는 보기용 - 복사엔 안 들어가요)</p>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface p-3 font-mono text-sm leading-relaxed">
            {shown.split("\n").map((l, i) => (
              <div key={i} className="flex gap-2">
                <Ln n={i + 1} />
                <span className="flex-1 whitespace-pre text-ink/90">{l === "" ? " " : l}</span>
              </div>
            ))}
          </div>
          <p className="t-caption text-muted">
            자동 복사가 막혔으면 아래 칸을 눌러 전체 선택한 뒤 복사하세요 (줄 번호 없음).
          </p>
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
