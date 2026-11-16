"use client";

import { useState } from "react";

/**
 * and_quiz (30차) — '그리고(and)' 진리표 문항.
 *
 * 상황을 조건1 and 조건2 로 주고, 학생이 ① 조건1 참/거짓 ② 조건2 참/거짓 ③ 전체(and) 참/거짓을
 * 드롭다운으로 고른다. 전체 정답은 cond1True && cond2True. 「확인」을 누르면 각 칸을 바로 채점하고
 * 짧은 해설을 보여준다. 고른 값은 answers[key] 에 JSON 으로 저장된다(교사 열람).
 *
 * 채점이 클라이언트에서 돌아 정답(cond1True/cond2True)이 화면 데이터에 포함되지만, 개념 확인용
 * (성적 아님)이라 diagnostic·choice 와 같은 수준으로 둔다.
 */

type Pick = "" | "T" | "F";

interface Stored {
  c1: Pick;
  c2: Pick;
  r: Pick;
  ok: boolean;
}

function parse(raw: string): Stored {
  try {
    const o = JSON.parse(raw) as Partial<Stored>;
    return {
      c1: o.c1 === "T" || o.c1 === "F" ? o.c1 : "",
      c2: o.c2 === "T" || o.c2 === "F" ? o.c2 : "",
      r: o.r === "T" || o.r === "F" ? o.r : "",
      ok: o.ok === true,
    };
  } catch {
    return { c1: "", c2: "", r: "", ok: false };
  }
}

function TF({ v }: { v: Pick }) {
  return <span className="font-bold">{v === "T" ? "참(True)" : v === "F" ? "거짓(False)" : "?"}</span>;
}

export function AndQuiz({
  cond1,
  cond2,
  cond1True,
  cond2True,
  value,
  onChange,
  disabled,
}: {
  cond1: string;
  cond2: string;
  cond1True: boolean;
  cond2True: boolean;
  value: string;
  onChange: (raw: string) => void;
  disabled?: boolean;
}) {
  const saved = parse(value);
  const [c1, setC1] = useState<Pick>(saved.c1);
  const [c2, setC2] = useState<Pick>(saved.c2);
  const [r, setR] = useState<Pick>(saved.r);
  const [graded, setGraded] = useState(saved.ok || (saved.c1 !== "" && saved.r !== ""));

  const resultTrue = cond1True && cond2True; // 전체(and) 정답
  const correct = {
    c1: c1 === (cond1True ? "T" : "F"),
    c2: c2 === (cond2True ? "T" : "F"),
    r: r === (resultTrue ? "T" : "F"),
  };
  const allPicked = c1 !== "" && c2 !== "" && r !== "";
  const allOk = correct.c1 && correct.c2 && correct.r;

  function persist(nc1: Pick, nc2: Pick, nr: Pick, ok: boolean) {
    onChange(JSON.stringify({ c1: nc1, c2: nc2, r: nr, ok }));
  }

  function pick(which: "c1" | "c2" | "r", val: Pick) {
    const n1 = which === "c1" ? val : c1;
    const n2 = which === "c2" ? val : c2;
    const nr = which === "r" ? val : r;
    if (which === "c1") setC1(val);
    if (which === "c2") setC2(val);
    if (which === "r") setR(val);
    setGraded(false);
    persist(n1, n2, nr, false);
  }

  function check() {
    if (disabled || !allPicked) return;
    setGraded(true);
    persist(c1, c2, r, allOk);
  }

  function reset() {
    setC1("");
    setC2("");
    setR("");
    setGraded(false);
    persist("", "", "", false);
  }

  const rowClass = (ok: boolean) =>
    `flex flex-col gap-2 rounded-lg border-2 p-3 sm:flex-row sm:items-center sm:justify-between ${
      graded ? (ok ? "border-ink bg-lime" : "border-ink bg-cream") : "border-line bg-canvas"
    }`;

  function Dropdown({
    which,
    val,
    trueLabel,
    falseLabel,
  }: {
    which: "c1" | "c2" | "r";
    val: Pick;
    trueLabel: string;
    falseLabel: string;
  }) {
    return (
      <select
        value={val}
        disabled={disabled || graded}
        onChange={(e) => pick(which, e.target.value as Pick)}
        className="field font-mono text-sm sm:w-56 disabled:opacity-70"
        aria-label="참 또는 거짓 고르기"
      >
        <option value="">고르기…</option>
        <option value="T">{trueLabel}</option>
        <option value="F">{falseLabel}</option>
      </select>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg bg-cream p-3">
        <p className="t-body-sm">
          아래 상황에서 <b>조건 1</b> 과 <b>조건 2</b> 가 각각 참(True)인지 거짓(False)인지 고르고,
          둘을 <b>and(그리고)</b> 로 묶은 <b>전체 결과</b> 도 골라 보세요. 다 고르면 「확인」을 눌러요.
        </p>
      </div>

      {/* 조건 1 */}
      <div className={rowClass(correct.c1)}>
        <p className="t-body-sm">
          <span className="font-bold">조건 1</span> : {cond1}
          {graded && (
            <span className={`ml-2 font-bold ${correct.c1 ? "text-success" : ""}`}>
              {correct.c1 ? "정답" : "오답"}
            </span>
          )}
        </p>
        <Dropdown which="c1" val={c1} trueLabel="참(True)" falseLabel="거짓(False)" />
      </div>

      <p className="t-subhead text-center">그리고 (and)</p>

      {/* 조건 2 */}
      <div className={rowClass(correct.c2)}>
        <p className="t-body-sm">
          <span className="font-bold">조건 2</span> : {cond2}
          {graded && (
            <span className={`ml-2 font-bold ${correct.c2 ? "text-success" : ""}`}>
              {correct.c2 ? "정답" : "오답"}
            </span>
          )}
        </p>
        <Dropdown which="c2" val={c2} trueLabel="참(True)" falseLabel="거짓(False)" />
      </div>

      {/* 전체 결과 */}
      <div className={rowClass(correct.r)}>
        <p className="t-body-sm">
          <span className="font-bold">전체 결과</span> (조건1 and 조건2)
          {graded && (
            <span className={`ml-2 font-bold ${correct.r ? "text-success" : ""}`}>
              {correct.r ? "정답" : "오답"}
            </span>
          )}
        </p>
        <Dropdown which="r" val={r} trueLabel="참(True) = 부딪힘" falseLabel="거짓(False) = 안 부딪힘" />
      </div>

      {!graded ? (
        <button
          type="button"
          onClick={check}
          disabled={disabled || !allPicked}
          className="pill pill-primary self-start disabled:opacity-35"
        >
          {allPicked ? "확인" : "세 칸을 모두 골라 주세요"}
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border-2 border-ink bg-surface px-4 py-4">
          <p className={`t-subhead ${allOk ? "text-success" : ""}`}>
            {allOk ? "잘했어요! 모두 맞혔어요 ✓" : "다시 한 번 생각해 볼까요?"}
          </p>
          <p className="t-body-sm">
            조건 1 은 <TF v={cond1True ? "T" : "F"} />, 조건 2 는 <TF v={cond2True ? "T" : "F"} /> 이에요.
            and 는 둘이 <b>모두 참</b> 일 때만 참이니, 전체 결과는{" "}
            <b>{resultTrue ? "참(True) = 부딪힘" : "거짓(False) = 안 부딪힘"}</b> 이에요.
          </p>
          <button type="button" onClick={reset} disabled={disabled} className="pill pill-secondary self-start">
            다시 풀기
          </button>
        </div>
      )}
    </div>
  );
}
