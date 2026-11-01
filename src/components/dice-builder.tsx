"use client";

import { useMemo, useState } from "react";

/**
 * 주사위 코드 조립기 — 26차 주사위 게임 미션2. LED 애니메이터(led-animator)의 확장이다.
 *
 * ## 무엇을 하나 (순수 클라이언트 · 서버·AI 없음)
 *
 * 학생이 ① 주사위 눈 1~6을 5×5 격자에 **자유로** 그리고(옆에 표준 '기준 눈' 참고 — 일치검사·잠금 없음,
 * 틀리게 그려도 됨: 정확성은 교사 순회로), ② 각 숫자에 어떤 눈을 보여줄지 **드롭다운으로 분기를 조립**한다
 * (숫자 N 일 때 → 내가 그린 눈 M). '코드 생성' 을 누르면 흔들기 이벤트 + randint(1,6) + if/elif/else +
 * 각 분기의 show_leds 가 든 **MakeCode Python 전체 코드**를 뽑아 복사한다.
 *
 * ## 저장
 *
 * 격자(눈 6개)·분기 매핑은 answers[key] 에 JSON({grids, branches})으로 저장된다(onChange). 제출칸은
 * 없다 — '코드 생성' 을 누르면(또는 그리면) 그 상태가 자동 저장돼 교사가 활동지로 열람한다.
 *
 * ## 범용성 (27차 가위바위보 재활용)
 *
 * 눈 개수·조건 라벨·변수 이름을 props 로 받게 해, 27차 가위바위보(가위·바위·보 3개, 조건 "내 패 ==")에도
 * 쓸 수 있다. 26차 주사위는 기본값(6개, "숫자 ==", roll)을 쓴다.
 */

const CELLS = 25;

/** 교사 확정 표준 주사위 눈 1~6 (5×5, 1=켜짐). 참고 이미지로만 보여 주고 강제하지 않는다. */
const STANDARD_EYES: string[] = [
  "00000" + "00000" + "00100" + "00000" + "00000", // 1
  "10000" + "00000" + "00000" + "00000" + "00001", // 2
  "10000" + "00000" + "00100" + "00000" + "00001", // 3
  "10001" + "00000" + "00000" + "00000" + "10001", // 4
  "10001" + "00000" + "00100" + "00000" + "10001", // 5
  "10001" + "00000" + "10001" + "00000" + "10001", // 6
];

function standardOn(index: number): boolean[] {
  const s = STANDARD_EYES[index] ?? "0".repeat(CELLS);
  return Array.from({ length: CELLS }, (_, i) => s[i] === "1");
}

interface Doc {
  /** 학생이 그린 눈 N개 (각 25칸 boolean) */
  grids: boolean[][];
  /** 숫자 i+1 일 때 보여줄 '내가 그린 눈'의 번호(0부터) */
  branches: number[];
}

function blankGrid(): boolean[] {
  return Array(CELLS).fill(false);
}

function defaultDoc(count: number): Doc {
  return {
    grids: Array.from({ length: count }, () => blankGrid()),
    branches: Array.from({ length: count }, (_, i) => i), // 1→눈1 … N→눈N
  };
}

function parse(raw: string, count: number): Doc {
  if (raw.trim()) {
    try {
      const value = JSON.parse(raw) as Doc;
      if (Array.isArray(value.grids) && value.grids.length === count) {
        const grids = value.grids.map((g) =>
          Array.isArray(g) && g.length === CELLS ? g.map(Boolean) : blankGrid(),
        );
        const branches =
          Array.isArray(value.branches) && value.branches.length === count
            ? value.branches.map((b) => {
                const n = Number(b);
                return Number.isInteger(n) && n >= 0 && n < count ? n : 0;
              })
            : Array.from({ length: count }, (_, i) => i);
        return { grids, branches };
      }
    } catch {
      // 깨진 저장값 — 기본값으로
    }
  }
  return defaultDoc(count);
}

/** 눈 하나(25칸)를 show_leds 용 5줄 문자열로 (각 줄 8칸 들여쓰기, 칸 사이 공백, 켜짐 # 꺼짐 .) */
function gridToRows(on: boolean[]): string {
  const rows: string[] = [];
  for (let r = 0; r < 5; r += 1) {
    const cells: string[] = [];
    for (let c = 0; c < 5; c += 1) cells.push(on[r * 5 + c] ? "#" : ".");
    rows.push(`        ${cells.join(" ")}`);
  }
  return rows.join("\n");
}

/**
 * MakeCode Python 전체 프로그램을 만든다 (복사→붙여넣기로 바로 도는 완성본).
 *  roll = 0 / 흔들기 핸들러(global roll + randint + if/elif/else + show_leds) / on_gesture 등록.
 */
function generateCode(doc: Doc, varName: string, conditionLabel: string): string {
  const count = doc.grids.length;
  const lines: string[] = [`${varName} = 0`, "", "def on_gesture_shake():", `    global ${varName}`];
  lines.push(`    ${varName} = randint(1, ${count})`);
  for (let n = 1; n <= count; n += 1) {
    const eye = doc.grids[doc.branches[n - 1]] ?? blankGrid();
    let header: string;
    if (n === 1) header = `    if ${varName} == ${n}:`;
    else if (n === count) header = `    else:`; // 마지막 숫자 → else (if/elif/else 완성)
    else header = `    elif ${varName} == ${n}:`;
    lines.push(header);
    lines.push(`        basic.show_leds("""\n${gridToRows(eye)}\n        """)`);
  }
  lines.push("input.on_gesture(Gesture.SHAKE, on_gesture_shake)");
  void conditionLabel; // 라벨은 화면 표시에만 쓰고 코드엔 숫자 비교로 들어간다
  return lines.join("\n");
}

export function DiceBuilder({
  questionKey,
  raw,
  onChange,
  disabled,
  eyeCount = 6,
  varName = "roll",
  conditionLabel = "숫자",
  eyeNoun = "눈",
}: {
  questionKey: string;
  raw: string;
  onChange: (raw: string) => void;
  disabled?: boolean;
  /** 눈(그림) 개수 — 주사위 6, 가위바위보 3 */
  eyeCount?: number;
  /** 생성 코드의 변수 이름 — 주사위 roll */
  varName?: string;
  /** 분기 조건 라벨 — "숫자"(주사위) / "내 패"(가위바위보) */
  conditionLabel?: string;
  /** 그림을 부르는 말 — "눈"(주사위) / "그림"(가위바위보) */
  eyeNoun?: string;
}) {
  const initial = useMemo(() => parse(raw, eyeCount), [raw, eyeCount]);
  const [grids, setGrids] = useState<boolean[][]>(initial.grids);
  const [branches, setBranches] = useState<number[]>(initial.branches);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  function persist(nextGrids: boolean[][], nextBranches: number[]) {
    onChange(JSON.stringify({ grids: nextGrids, branches: nextBranches }));
  }

  function toggleCell(eyeIndex: number, cell: number) {
    if (disabled) return;
    const next = grids.map((g, i) =>
      i === eyeIndex ? g.map((v, c) => (c === cell ? !v : v)) : g,
    );
    setGrids(next);
    persist(next, branches);
  }

  function setBranch(numberIndex: number, eyeIndex: number) {
    if (disabled) return;
    const next = branches.map((b, i) => (i === numberIndex ? eyeIndex : b));
    setBranches(next);
    persist(grids, next);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 복사 막힘 — 칸을 눌러 직접 복사하도록 둔다
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 1) 눈 그리기 — 눈 N개, 각각 기준 눈 참고 + 5×5 격자 */}
      <div className="flex flex-col gap-2">
        <p className="t-body-sm font-semibold">① {eyeNoun}을 직접 그려요 (옆의 기준을 보고 따라 찍어요)</p>
        <p className="t-caption text-muted">
          기준과 똑같지 않아도 코드는 만들어져요. 틀린 데는 선생님이 돌아다니며 봐 줄 거예요.
        </p>
        <div className="flex flex-col gap-3">
          {grids.map((grid, eyeIndex) => (
            <div
              key={eyeIndex}
              className="flex flex-wrap items-center gap-4 rounded-lg border-2 border-line bg-canvas p-3"
            >
              <span className="t-body-sm font-semibold w-full sm:w-auto">
                {eyeNoun} {eyeIndex + 1}
              </span>

              {/* 기준(참고) — 읽기 전용 */}
              <div className="flex flex-col items-center gap-1">
                <span className="t-caption text-muted">기준</span>
                <div className="grid w-fit grid-cols-5 gap-0.5" aria-label={`기준 ${eyeNoun} ${eyeIndex + 1}`}>
                  {standardOn(eyeIndex).map((cellOn, cell) => (
                    <div
                      key={cell}
                      className={`h-4 w-4 rounded-sm border ${
                        cellOn ? "border-ink bg-ink" : "border-line bg-surface"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* 내가 그리기 — 토글 격자 */}
              <div className="flex flex-col items-center gap-1">
                <span className="t-caption text-muted">내가 그리기</span>
                <div className="grid w-fit grid-cols-5 gap-1">
                  {grid.map((cellOn, cell) => (
                    <button
                      key={cell}
                      type="button"
                      aria-label={`${eyeNoun} ${eyeIndex + 1}, ${cell + 1}번 칸`}
                      aria-pressed={cellOn}
                      onClick={() => toggleCell(eyeIndex, cell)}
                      disabled={disabled}
                      className={`h-8 w-8 rounded-sm border ${
                        cellOn ? "border-ink bg-ink" : "border-line bg-surface"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2) 분기 조립 — 숫자 N 일 때 → 내가 그린 눈 M */}
      <div className="flex flex-col gap-2">
        <p className="t-body-sm font-semibold">② 어떤 {conditionLabel}일 때 어떤 {eyeNoun}을 보여줄까요?</p>
        <p className="t-caption text-muted">
          기본은 {conditionLabel} 1 → {eyeNoun} 1 … 처럼 똑같이 맞춰 뒀어요. 바꾸고 싶으면 골라요.
        </p>
        <div className="flex flex-col gap-2">
          {branches.map((eyeIndex, numberIndex) => (
            <label key={numberIndex} className="flex flex-wrap items-center gap-2 t-body-sm">
              <span className="font-mono">
                {conditionLabel} == {numberIndex + 1}
              </span>
              <span aria-hidden>→</span>
              <select
                value={eyeIndex}
                onChange={(event) => setBranch(numberIndex, Number(event.target.value))}
                disabled={disabled}
                className="field w-auto"
                aria-label={`${conditionLabel} ${numberIndex + 1} 일 때 보여줄 ${eyeNoun}`}
              >
                {grids.map((_, i) => (
                  <option key={i} value={i}>
                    {eyeNoun} {i + 1}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      {/* 3) 코드 생성 */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setCode(generateCode({ grids, branches }, varName, conditionLabel))}
          disabled={disabled}
          className="pill pill-primary self-start disabled:opacity-60"
        >
          코드 생성 (MakeCode Python)
        </button>

        {code && (
          <>
            <textarea
              readOnly
              value={code}
              rows={Math.min(code.split("\n").length, 30)}
              spellCheck={false}
              onFocus={(event) => event.currentTarget.select()}
              className="field font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => void copyCode()}
              className="pill pill-secondary t-body-sm self-start"
            >
              {copied ? "복사됐어요" : "코드 복사하기"}
            </button>
            <a
              href="https://makecode.microbit.org/"
              target="_blank"
              rel="noreferrer"
              className="pill pill-primary t-body-sm self-start"
            >
              MakeCode 열기 (새 탭)
            </a>
            <p className="t-caption text-muted">
              MakeCode 를 열고 위쪽 메뉴에서 JavaScript 를 Python 으로 바꾼 뒤, 이 코드를 붙여넣고 흔들어
              보세요. 숫자 대신 {eyeNoun}이 떠요.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
