"use client";

// 31차 code_choose: 좌(참조 '변수 하나하나' 코드, 읽기전용) · 우(리스트 코드, 빈칸은 '보기 선택').
// 자유 타자 없음. 오른쪽 {{토큰}} 자리마다 드롭다운. '확인' → 칸마다 정답/오답 + 모두 맞으면 why + 복사.
// 슬롯마다 색(1~4)을 정해 오른쪽 빈칸과 왼쪽 대응 줄(codeSlots.refLines)을 같은 색으로 묶고, 빈칸에
// 포커스·호버하면 그 슬롯의 왼쪽 줄만 진하게 보인다(나머지는 흐리게). 모바일은 탭(포커스)으로 동작.
import { useMemo, useState } from "react";

import type { WorksheetQuestion } from "@/lib/types";

const MAKECODE_URL = "https://makecode.microbit.org/";
const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/**
 * 슬롯 색(globals.css 의 --slot-N 토큰). Tailwind 가 클래스를 찾을 수 있게 문자열을 통째로 적는다.
 *  · tint   - 대응 줄 바탕(은은하게)
 *  · bar    - 강조 중인 줄 왼쪽 막대(안쪽 그림자라 들여쓰기·정렬이 안 밀린다)
 *  · ring   - 오른쪽 빈칸 테두리
 *  · badge  - 번호 배지(색만으로 구분하지 않도록 숫자를 함께)
 */
const SLOT_STYLES = [
  {
    tint: "bg-slot-1",
    bar: "shadow-[inset_4px_0_0_var(--slot-1-strong)]",
    ring: "ring-2 ring-slot-1-strong",
    badge: "bg-slot-1 border-slot-1-strong",
  },
  {
    tint: "bg-slot-2",
    bar: "shadow-[inset_4px_0_0_var(--slot-2-strong)]",
    ring: "ring-2 ring-slot-2-strong",
    badge: "bg-slot-2 border-slot-2-strong",
  },
  {
    tint: "bg-slot-3",
    bar: "shadow-[inset_4px_0_0_var(--slot-3-strong)]",
    ring: "ring-2 ring-slot-3-strong",
    badge: "bg-slot-3 border-slot-3-strong",
  },
  {
    tint: "bg-slot-4",
    bar: "shadow-[inset_4px_0_0_var(--slot-4-strong)]",
    ring: "ring-2 ring-slot-4-strong",
    badge: "bg-slot-4 border-slot-4-strong",
  },
] as const;

const styleOf = (idx: number) => SLOT_STYLES[idx % SLOT_STYLES.length];

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

/** 슬롯 번호 배지(1~4). 색만으로 구분하지 않도록 숫자를 함께 보인다. */
function Badge({ idx, className = "" }: { idx: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-5 min-w-5 shrink-0 select-none items-center justify-center rounded-full border px-1 font-sans text-xs font-bold text-ink ${styleOf(idx).badge} ${className}`}
    >
      {idx + 1}
    </span>
  );
}

/**
 * 한 줄의 짝 맞추기 꾸밈. 이 줄이 슬롯 idx 에 속하면 그 색으로 은은하게 칠하고, 강조 중인 슬롯이
 * 있으면 그 슬롯 줄만 막대로 진하게, 나머지 줄은 흐리게 한다.
 */
function rowClass(idx: number | undefined, active: number | null): string {
  if (active === null) return idx === undefined ? "" : styleOf(idx).tint;
  if (idx === active) return `${styleOf(idx).tint} ${styleOf(idx).bar}`;
  return "opacity-40";
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
  /** 지금 강조 중인 빈칸 - 마우스를 올린 칸이 먼저, 없으면 포커스(탭)한 칸. */
  const [hoverTok, setHoverTok] = useState<string | null>(null);
  const [focusTok, setFocusTok] = useState<string | null>(null);

  const slotByToken = useMemo(() => {
    const map: Record<string, (typeof slots)[number]> = {};
    for (const s of slots) map[s.token] = s;
    return map;
  }, [slots]);

  /** 토큰 → 슬롯 색 번호(slots 순서). */
  const idxByToken = useMemo(() => {
    const map: Record<string, number> = {};
    slots.forEach((s, i) => (map[s.token] = i));
    return map;
  }, [slots]);

  /** 왼쪽 줄 번호(1부터) → 슬롯 색 번호. refLines 가 없으면 비어 색 매칭 없이 그린다. */
  const refIdxByLine = useMemo(() => {
    const map: Record<number, number> = {};
    slots.forEach((s, i) => {
      for (const n of s.refLines ?? []) if (map[n] === undefined) map[n] = i;
    });
    return map;
  }, [slots]);

  /** 슬롯마다 왼쪽에서 배지를 붙일 첫 줄. */
  const firstRefLine = useMemo(() => {
    const map: Record<number, number> = {};
    slots.forEach((s, i) => {
      const lines = s.refLines ?? [];
      if (lines.length) map[Math.min(...lines)] = i;
    });
    return map;
  }, [slots]);

  const hasRefMap = slots.some((s) => (s.refLines ?? []).length > 0);
  const lines = useMemo(() => template.split("\n"), [template]);
  const refLines = useMemo(() => refTemplate.split("\n"), [refTemplate]);

  const activeTok = hoverTok ?? focusTok;
  const active = activeTok !== null && idxByToken[activeTok] !== undefined ? idxByToken[activeTok] : null;

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

  /**
   * 빈칸 드롭다운. 컴포넌트가 아니라 **함수로** 그린다 - 안쪽에서 컴포넌트로 정의하면 렌더마다 새 타입이
   * 되어 셀렉트가 다시 만들어지고, 포커스가 풀려(blur) 강조가 깜빡인다.
   */
  function renderSelect(token: string, key: number) {
    const slot = slotByToken[token];
    const idx = idxByToken[token] ?? 0;
    const val = values[token] ?? "";
    const isRight = graded && correctOf(token);
    const isWrong = graded && val !== "" && !correctOf(token);
    return (
      <span key={key} className="inline-flex items-center gap-1">
        {hasRefMap && <Badge idx={idx} />}
        <select
          value={val}
          disabled={disabled || (graded && allOk)}
          onChange={(e) => setValue(token, e.target.value)}
          onFocus={() => setFocusTok(token)}
          onBlur={() => setFocusTok((t) => (t === token ? null : t))}
          onMouseEnter={() => setHoverTok(token)}
          onMouseLeave={() => setHoverTok((t) => (t === token ? null : t))}
          aria-label={slot?.label ?? "보기 고르기"}
          className={`field inline-block w-auto min-w-[6rem] font-mono text-sm disabled:opacity-70 ${
            hasRefMap ? styleOf(idx).ring : ""
          } ${isRight ? "border-2 border-success bg-lime" : isWrong ? "border-2 border-ink bg-cream" : ""}`}
        >
          <option value="">고르기…</option>
          {(slot?.options ?? []).map((opt, k) => (
            <option key={k} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </span>
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
        {hasRefMap && (
          <p className="t-body-sm mt-1">
            <b>같은 색·같은 번호</b> 끼리 짝이에요. 오른쪽 빈칸을 누르면(또는 마우스를 올리면) 왼쪽에서{" "}
            <b>그 빈칸으로 바뀌는 부분</b> 이 진하게 보여요.
          </p>
        )}
      </div>

      {/* 좌우 2단(lg+). 스마트폰에선 세로로 쌓인다(왼쪽=참조 위, 오른쪽=선택 아래). */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* 왼쪽 - 참조('변수 하나하나') 코드, 읽기전용. 대응 줄은 슬롯 색으로 칠한다. */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="t-body-sm font-semibold text-muted">
            {refLabel ?? "변수 하나하나"} <span className="font-normal">(지난 미션 · 보기만)</span>
          </p>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface p-3 font-mono text-sm leading-relaxed">
            {refLines.map((line, i) => {
              const n = i + 1;
              const idx = refIdxByLine[n];
              const badgeIdx = firstRefLine[n];
              return (
                <div
                  key={i}
                  className={`flex gap-2 rounded-sm transition-opacity ${hasRefMap ? rowClass(idx, active) : ""}`}
                >
                  <Ln n={n} />
                  <span className="flex-1 whitespace-pre text-ink/80">{line === "" ? " " : line}</span>
                  {badgeIdx !== undefined && <Badge idx={badgeIdx} className="mr-1 self-center" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* 오른쪽 - 리스트 코드, 빈칸은 드롭다운 선택. 빈칸이 든 줄도 같은 색으로 칠한다. */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="t-body-sm font-semibold">
            {chooseLabel ?? "리스트로 정리"} <span className="font-normal">(빈칸을 골라요)</span>
          </p>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface p-3 font-mono text-sm leading-relaxed">
            {lines.map((line, i) => {
              const pieces = splitLine(line);
              const slotPiece = pieces.find((p) => p.kind === "slot");
              if (!slotPiece) {
                return (
                  <div
                    key={i}
                    className={`flex gap-2 rounded-sm transition-opacity ${hasRefMap && active !== null ? "opacity-40" : ""}`}
                  >
                    <Ln n={i + 1} />
                    <span className="flex-1 whitespace-pre text-ink/90">{line === "" ? " " : line}</span>
                  </div>
                );
              }
              const lineIdx = slotPiece.kind === "slot" ? idxByToken[slotPiece.token] : undefined;
              return (
                <div
                  key={i}
                  className={`flex gap-2 rounded-sm transition-opacity ${hasRefMap ? rowClass(lineIdx, active) : ""}`}
                >
                  <Ln n={i + 1} />
                  {/* 줄을 접지 않는다 - 빈칸 뒤 글자가 다음 줄로 넘어가면 코드 모양이 깨진다. 길면 칸 안에서 가로로 스크롤. */}
                  <span className="flex flex-1 flex-nowrap items-center gap-1">
                    {pieces.map((p, j) =>
                      p.kind === "text" ? (
                        <span key={j} className="whitespace-pre text-ink/90">
                          {p.text}
                        </span>
                      ) : (
                        renderSelect(p.token, j)
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
            {slots.map((s, i) => {
              const ok = correctOf(s.token);
              return (
                <li key={s.token} className="t-body-sm flex items-start gap-1.5">
                  {hasRefMap && <Badge idx={i} className="mt-0.5" />}
                  <span>
                    <span className={`font-bold ${ok ? "text-success" : ""}`}>{ok ? "정답" : "다시"}</span>{" "}
                    <span className="font-semibold">{s.label}</span>
                    {ok && s.why ? <span className="text-muted"> - {s.why}</span> : null}
                  </span>
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

      {/* 완성 코드 - 줄 번호 보기 + 번호 없는 복사용 칸 */}
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
