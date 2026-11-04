"use client";

import { useMemo, useState } from "react";

/**
 * 주사위 코드 조립기 — 26차 주사위 게임 미션2. LED 애니메이터(led-animator)의 확장이다.
 *
 * ## 무엇을 하나 (순수 클라이언트 · 서버·AI 없음)
 *
 * 학생이 ① 주사위 눈 1~6을 5×5 격자에 **자유로** 그리고(기준·예시 패널 없이 직접 그림 — 일치검사·잠금
 * 없음, 틀리게 그려도 됨: 정확성은 교사 순회로), ② 각 행마다 **if/elif/else 키워드를 직접 고르고** '그 숫자일 때
 * 어떤 눈을 보여줄지' 를 조립한다(조건 `number == N` 은 행 순서로 정해지고, else 를 고르면 조건은 사라진다).
 * '코드 생성' 을 누르면 흔들기 이벤트 + randint(1,6) + 학생이 조립한 if/elif/else + 각 분기의 show_leds 가
 * 든 **MakeCode Python 전체 코드**를 뽑아 복사한다.
 *
 * ## 자유 조립 (강제 검증 없음)
 *
 * 키워드를 학생이 직접 골라 틀리게 조립하면(예: else 를 가운데 두거나 if 를 빠뜨림) 그대로 생성된다 —
 * 26차 '자유 그리기' 철학과 같다. 올바른지는 교사 순회로 본다. 기본 프리필은 1행 if, 2~5행 elif, 6행 else.
 *
 * ## 저장
 *
 * 격자(눈 6개)·분기(키워드+눈)는 answers[key] 에 JSON({grids, branches})으로 저장된다(onChange). 제출칸은
 * 없다 — '코드 생성' 을 누르면(또는 그리면·고르면) 그 상태가 자동 저장돼 교사가 활동지로 열람한다.
 *
 * ## 범용성 (27차 가위바위보 재활용)
 *
 * 눈 개수·조건 라벨·변수 이름을 props 로 받게 해, 27차 가위바위보(3개, 조건 "내 패 ==")에도 쓸 수 있다.
 */

const CELLS = 25;

type Keyword = "if" | "elif" | "else";
/** 학생이 아직 안 고른 상태("") 포함. 처음엔 전부 미선택으로 시작한다(프리필 없음, 교사 확정 2026-11-03). */
type KwChoice = Keyword | "";

interface Branch {
  /** "" = 아직 안 고름(처음 상태) / if·elif·else = 학생이 직접 고른 값 */
  kw: KwChoice;
  /** 이 행에서 보여줄 '내가 그린 눈'의 번호(0부터) */
  eye: number;
}
interface Doc {
  /** 학생이 그린 눈 N개 (각 25칸 boolean) */
  grids: boolean[][];
  branches: Branch[];
}

function blankGrid(): boolean[] {
  return Array(CELLS).fill(false);
}

/** 처음엔 키워드 미선택(""), 눈 매핑만 기본값(숫자 N → 눈 N). 교사 확정: 키워드는 학생이 직접 고른다. */
function defaultDoc(count: number): Doc {
  return {
    grids: Array.from({ length: count }, () => blankGrid()),
    branches: Array.from({ length: count }, (_, i) => ({ kw: "" as KwChoice, eye: i })),
  };
}

function parse(raw: string, count: number): Doc {
  if (raw.trim()) {
    try {
      const value = JSON.parse(raw) as { grids?: unknown; branches?: unknown };
      if (Array.isArray(value.grids) && value.grids.length === count) {
        const grids = value.grids.map((g) =>
          Array.isArray(g) && g.length === CELLS ? g.map(Boolean) : blankGrid(),
        );
        let branches: Branch[];
        if (Array.isArray(value.branches) && value.branches.length === count) {
          branches = value.branches.map((b, i) => {
            // 신형: {kw, eye}(kw 없거나 "" 면 미선택 유지) / 구형: 눈 번호(number) → 미선택으로 시작
            if (b && typeof b === "object") {
              const kw = (b as Branch).kw;
              const eye = Number((b as Branch).eye);
              return {
                kw: kw === "if" || kw === "elif" || kw === "else" ? kw : ("" as KwChoice),
                eye: Number.isInteger(eye) && eye >= 0 && eye < count ? eye : i,
              };
            }
            const n = Number(b);
            return {
              kw: "" as KwChoice,
              eye: Number.isInteger(n) && n >= 0 && n < count ? n : i,
            };
          });
        } else {
          branches = Array.from({ length: count }, (_, i) => ({ kw: "" as KwChoice, eye: i }));
        }
        return { grids, branches };
      }
    } catch {
      // 깨진 저장값 — 기본값으로
    }
  }
  return defaultDoc(count);
}

/** 아직 키워드를 안 고른 행의 번호(1부터) 목록. 비어 있으면 모두 선택됨 → 생성 가능. */
function unselectedRows(doc: Doc): number[] {
  const out: number[] = [];
  doc.branches.forEach((b, i) => {
    if (b.kw !== "if" && b.kw !== "elif" && b.kw !== "else") out.push(i + 1);
  });
  return out;
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
 *  roll = 0 / 흔들기 핸들러(global roll + randint + 학생이 조립한 if/elif/else + show_leds) / 등록.
 * 학생이 고른 키워드 순서 그대로 나온다(자유 조립 — 틀리면 틀린 대로 생성).
 */
function generateCode(doc: Doc, varName: string): string {
  const count = doc.grids.length;
  const lines: string[] = [
    `${varName} = 0`,
    "",
    "def on_gesture_shake():",
    `    global ${varName}`,
    `    ${varName} = randint(1, ${count})`,
  ];
  for (let i = 0; i < count; i += 1) {
    const { kw, eye } = doc.branches[i];
    const n = i + 1;
    let header: string;
    if (kw === "else") header = "    else:";
    else if (kw === "elif") header = `    elif ${varName} == ${n}:`;
    else header = `    if ${varName} == ${n}:`;
    lines.push(header);
    lines.push(`        basic.show_leds("""\n${gridToRows(doc.grids[eye] ?? blankGrid())}\n        """)`);
  }
  lines.push("input.on_gesture(Gesture.SHAKE, on_gesture_shake)");
  return lines.join("\n");
}

export function DiceBuilder({
  questionKey,
  raw,
  onChange,
  disabled,
  eyeCount = 6,
  varName = "roll",
  conditionLabel = "number",
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
  /** 분기 조건에 보이는 변수 라벨 — "number"(주사위 roll). 코드엔 varName 이 들어간다 */
  conditionLabel?: string;
  /** 그림을 부르는 말 — "눈"(주사위) / "그림"(가위바위보) */
  eyeNoun?: string;
}) {
  const initial = useMemo(() => parse(raw, eyeCount), [raw, eyeCount]);
  const [grids, setGrids] = useState<boolean[][]>(initial.grids);
  const [branches, setBranches] = useState<Branch[]>(initial.branches);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  // 키워드를 안 고른 행이 있는데 '코드 생성' 을 누르면 띄우는 안내
  const [genError, setGenError] = useState("");

  function persist(nextGrids: boolean[][], nextBranches: Branch[]) {
    onChange(JSON.stringify({ grids: nextGrids, branches: nextBranches }));
  }

  function toggleCell(eyeIndex: number, cell: number) {
    if (disabled) return;
    const next = grids.map((g, i) => (i === eyeIndex ? g.map((v, c) => (c === cell ? !v : v)) : g));
    setGrids(next);
    persist(next, branches);
  }

  function setKeyword(rowIndex: number, kw: KwChoice) {
    if (disabled) return;
    const next = branches.map((b, i) => (i === rowIndex ? { ...b, kw } : b));
    setBranches(next);
    persist(grids, next);
    setGenError(""); // 고르면 안내 지움
  }

  function setEye(rowIndex: number, eye: number) {
    if (disabled) return;
    const next = branches.map((b, i) => (i === rowIndex ? { ...b, eye } : b));
    setBranches(next);
    persist(grids, next);
  }

  function handleGenerate() {
    const missing = unselectedRows({ grids, branches });
    if (missing.length > 0) {
      setCode("");
      setGenError(
        `아직 if / elif / else 를 안 고른 줄이 있어요: ${missing.join(", ")}번째 줄. 모두 고른 뒤 다시 눌러 주세요.`,
      );
      return;
    }
    setGenError("");
    setCode(generateCode({ grids, branches }, varName));
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
      {/* 1) 눈 그리기 — 눈 N개, 각각 5×5 격자(기준·예시 없이 직접 그림) */}
      <div className="flex flex-col gap-2">
        <p className="t-body-sm font-semibold">① {eyeNoun}을 직접 그려요 (내 마음대로 찍어요)</p>
        <p className="t-caption text-muted">
          정해진 모양은 없어요 — 내 마음대로 찍어도 코드는 만들어져요. 틀린 데는 선생님이 돌아다니며 봐 줄 거예요.
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

              {/* 내가 그리기 — 토글 격자 */}
              <div className="flex flex-col items-center gap-1">
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

      {/* 2) 분기 조립 — [if/elif/else] + number == N : → 내가 그린 눈 M */}
      <div className="flex flex-col gap-2">
        <p className="t-body-sm font-semibold">
          ② 갈림길(if / elif / else)을 직접 골라 조립해요
        </p>
        <p className="t-caption text-muted">
          각 줄에서 <code>if</code> / <code>elif</code> / <code>else</code> 를 직접 골라 조립해요(처음엔 아무것도
          안 골라져 있어요). 틀리게 조립하면 그대로 코드가 나와요 — 선생님이 봐 줄 거예요. <code>else</code> 를
          고르면 그 줄은 조건 없이 '나머지 전부' 가 돼요.
        </p>
        <div className="flex flex-col gap-2">
          {branches.map((branch, rowIndex) => (
            <div
              key={rowIndex}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 t-body-sm"
            >
              {/* 키워드 드롭다운 — 처음엔 미선택("선택해 주세요") */}
              <select
                value={branch.kw}
                onChange={(event) => setKeyword(rowIndex, event.target.value as KwChoice)}
                disabled={disabled}
                className="field w-auto font-mono"
                aria-label={`${rowIndex + 1}번 줄 갈림길 키워드`}
              >
                <option value="" disabled>
                  선택해 주세요
                </option>
                <option value="if">if</option>
                <option value="elif">elif</option>
                <option value="else">else</option>
              </select>

              {/* 조건 — else 면 '나머지 전부', 미선택이면 흐리게, if/elif 면 number == N */}
              {branch.kw === "else" ? (
                <span className="font-mono text-muted">: (나머지 전부)</span>
              ) : (
                <span className={`font-mono ${branch.kw === "" ? "text-muted" : ""}`}>
                  {conditionLabel} == {rowIndex + 1} :
                </span>
              )}

              <span aria-hidden>→</span>

              {/* 어떤 눈을 보여줄지 */}
              <span className="whitespace-nowrap">
                내가 그린
                <select
                  value={branch.eye}
                  onChange={(event) => setEye(rowIndex, Number(event.target.value))}
                  disabled={disabled}
                  className="field mx-1 w-auto"
                  aria-label={`${rowIndex + 1}번 줄에서 보여줄 ${eyeNoun}`}
                >
                  {grids.map((_, i) => (
                    <option key={i} value={i}>
                      {eyeNoun} {i + 1}
                    </option>
                  ))}
                </select>
                보여주기
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3) 코드 생성 */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={disabled}
          className="pill pill-primary self-start disabled:opacity-60"
        >
          코드 생성 (MakeCode Python)
        </button>

        {genError && (
          <p role="alert" className="t-body-sm font-semibold text-rose-600">
            {genError}
          </p>
        )}

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
