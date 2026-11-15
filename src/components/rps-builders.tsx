"use client";

import { useMemo, useState } from "react";

/**
 * 가위바위보(27차) 인터랙티브 빌더 3종 — 26차 dice-builder 와 같은 성격(순수 클라이언트, 서버·AI 없음,
 * '입력/체험 → 코드 자동 생성 → MakeCode 붙여넣기, 제출칸 없음'). 상태는 answers[key] 에 JSON 자동저장.
 *
 * 패 인코딩(기존 RPS 베이스와 일치): 1=가위, 2=바위, 3=보.
 *  · RpsSim(미션1)  — A/B 버튼 순환을 화면에서 체험(LED 아이콘) → 순환 코드 생성.
 *  · RpsFill(미션2) — 정답(ai = randint(1, 3))을 직접 입력 → (★미션★) 자리에 끼워 전체 코드 생성.
 *  · RpsJudge(미션3)— 9가지 경우(인간·AI·결과·LED아이콘) 드롭다운 조립 → if/elif + show_icon 코드 생성.
 *
 * MakeCode 실측(2026-11-04): on_button_pressed·on_logo_event(TouchButtonEvent.PRESSED)·randint·
 * show_icon(IconNames.*)·show_leds·show_hand(n)·if/elif/else·== / and 블록 변환 확인.
 */

// ── 공통: 패 LED 패턴 / 이름 / show_hand·버튼 코드 조각 ──
const HAND_PATTERNS: Record<number, string[]> = {
  1: ["11001", "11010", "00100", "11010", "11001"], // 가위
  2: ["00000", "01110", "01110", "01110", "00000"], // 바위
  3: ["01110", "01111", "01111", "11111", "11111"], // 보
};
const HAND_NAMES: Record<number, string> = { 1: "가위", 2: "바위", 3: "보" };
/** 패 드롭다운(번호 유지). 보기 순서는 가위·바위·보. */
const HAND_OPTIONS = [
  { n: 1, label: "가위" },
  { n: 2, label: "바위" },
  { n: 3, label: "보" },
];
const RESULT_OPTIONS = ["이김", "비김", "짐"];
const ICON_OPTIONS = [
  { name: "HAPPY", label: "웃는 얼굴 (이김)" },
  { name: "MEH", label: "그냥 얼굴 (비김)" },
  { name: "SAD", label: "슬픈 얼굴 (짐)" },
  { name: "HEART", label: "하트" },
  { name: "YES", label: "예(체크)" },
  { name: "NO", label: "아니오(엑스)" },
];

const SHOW_HAND = `def show_hand(n):
    if n == 1:
        basic.show_leds("""
            # # . . #
            # # . # .
            . . # . .
            # # . # .
            # # . . #
            """)
    elif n == 2:
        basic.show_leds("""
            . . . . .
            . # # # .
            . # # # .
            . # # # .
            . . . . .
            """)
    else:
        basic.show_leds("""
            . # # # .
            . # # # #
            . # # # #
            # # # # #
            # # # # #
            """)`;

const BTN_A = `def on_button_pressed_a():
    global choice
    choice = choice + 1
    if choice > 3:
        choice = 1
    show_hand(choice)
input.on_button_pressed(Button.A, on_button_pressed_a)`;

const BTN_B = `def on_button_pressed_b():
    global choice
    choice = choice - 1
    if choice < 1:
        choice = 3
    show_hand(choice)
input.on_button_pressed(Button.B, on_button_pressed_b)`;

const MAKECODE_URL = "https://makecode.microbit.org/";

// ── 공통 UI: 5×5 LED 미리보기 ──
function LedIcon({ pattern, label }: { pattern: string[]; label: string }) {
  const flat = pattern.join("");
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="grid w-fit grid-cols-5 gap-0.5 rounded-md bg-ink p-1.5" aria-label={label}>
        {Array.from(flat).map((c, i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-sm ${c === "1" ? "bg-rose-500" : "bg-zinc-700"}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── 공통 UI: 생성 코드 표시(복사 + MakeCode 열기) ──
function CodeBox({ code, eyeNounNote }: { code: string; eyeNounNote?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 복사 막힘 — 칸을 눌러 직접 복사 */
    }
  }
  return (
    <>
      <textarea
        readOnly
        value={code}
        rows={Math.min(code.split("\n").length, 34)}
        spellCheck={false}
        onFocus={(e) => e.currentTarget.select()}
        className="field font-mono text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void copy()} className="pill pill-secondary t-body-sm">
          {copied ? "복사됐어요" : "코드 복사하기"}
        </button>
        <a href={MAKECODE_URL} target="_blank" rel="noreferrer" className="pill pill-primary t-body-sm">
          MakeCode 열기 (새 탭)
        </a>
      </div>
      <p className="t-caption text-muted">
        {eyeNounNote ??
          "MakeCode 를 열고 위쪽에서 Python 으로 바꾼 뒤 기존 코드를 모두 지우고 이 코드를 붙여넣어 실행해요."}
      </p>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 미션1 — A/B 순환 시뮬레이터 + 코드 생성 (제출칸 없음)
// ─────────────────────────────────────────────────────────────
function genSimCode(): string {
  return [`choice = 1`, ``, SHOW_HAND, ``, BTN_A, ``, BTN_B, ``, `show_hand(choice)`].join("\n");
}

export function RpsSim({
  raw,
  onChange,
  disabled,
}: {
  raw: string;
  onChange: (raw: string) => void;
  disabled?: boolean;
}) {
  const start = useMemo(() => {
    try {
      const v = JSON.parse(raw) as { choice?: number };
      const c = Number(v.choice);
      return c === 1 || c === 2 || c === 3 ? c : 1;
    } catch {
      return 1;
    }
  }, [raw]);
  const [choice, setChoice] = useState<number>(start);
  const [code, setCode] = useState("");

  function persist(next: number) {
    onChange(JSON.stringify({ choice: next, played: true }));
  }
  function pressA() {
    if (disabled) return;
    const next = choice >= 3 ? 1 : choice + 1; // 가위→바위→보→가위
    setChoice(next);
    persist(next);
  }
  function pressB() {
    if (disabled) return;
    const next = choice <= 1 ? 3 : choice - 1; // 가위→보→바위→가위
    setChoice(next);
    persist(next);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-line bg-canvas p-4">
        <LedIcon pattern={HAND_PATTERNS[choice]} label={`지금 패: ${HAND_NAMES[choice]}`} />
        <p className="t-body font-semibold">지금 내 패: {HAND_NAMES[choice]}</p>
        <div className="flex gap-3">
          <button type="button" onClick={pressA} disabled={disabled} className="pill pill-primary">
            A 버튼 (가위→바위→보)
          </button>
          <button type="button" onClick={pressB} disabled={disabled} className="pill pill-primary">
            B 버튼 (가위→보→바위)
          </button>
        </div>
        <p className="t-caption text-muted">
          버튼을 눌러 패가 어떻게 바뀌는지 체험해 봐요. A는 한 방향, B는 반대 방향으로 돌아가요.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setCode(genSimCode())}
        disabled={disabled}
        className="pill pill-primary self-start disabled:opacity-60"
      >
        코드 생성 (MakeCode Python)
      </button>

      {code && <CodeBox code={code} eyeNounNote="붙여넣고 A·B 버튼을 눌러 패가 바뀌면 성공!" />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 미션2 — 정답 입력 + (★미션★) 자리에 끼워 코드 생성 (제출칸 없음)
// ─────────────────────────────────────────────────────────────
const M2_SLOT = "    (★미션★)"; // 로고 함수 안, 학생 답이 들어갈 자리
function m2Template(slotLine: string): string {
  return [
    `choice = 1`,
    `ai = 0`,
    ``,
    SHOW_HAND,
    ``,
    BTN_A,
    ``,
    BTN_B,
    ``,
    `# 금색 로고를 터치하면 AI 가 무작위로 패를 내요`,
    `def on_logo_pressed():`,
    `    global ai`,
    slotLine,
    `    show_hand(ai)`,
    `input.on_logo_event(TouchButtonEvent.PRESSED, on_logo_pressed)`,
    ``,
    `show_hand(choice)`,
  ].join("\n");
}

export function RpsFill({
  questionKey,
  raw,
  onChange,
  disabled,
}: {
  questionKey: string;
  raw: string;
  onChange: (raw: string) => void;
  disabled?: boolean;
}) {
  const start = useMemo(() => {
    try {
      return String((JSON.parse(raw) as { answer?: string }).answer ?? "");
    } catch {
      return "";
    }
  }, [raw]);
  const [answer, setAnswerText] = useState(start);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  function onType(v: string) {
    setAnswerText(v);
    onChange(JSON.stringify({ answer: v }));
    setErr("");
  }
  function generate() {
    if (disabled) return;
    if (!answer.trim()) {
      setErr("먼저 (★미션★) 자리에 들어갈 코드를 적어 주세요. (힌트: ai 에 1~3 중 무작위 수 담기)");
      setCode("");
      return;
    }
    setErr("");
    setCode(m2Template(`    ${answer.trim()}`));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* (★미션★) 자리가 든 뼈대 미리보기 */}
      <div className="flex flex-col gap-1">
        <p className="t-body-sm font-semibold">코드에서 바꿀 곳 — (★미션★) 자리</p>
        <pre className="field whitespace-pre-wrap font-mono text-sm">{m2Template(M2_SLOT)}</pre>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`rpsfill-${questionKey}`} className="t-body-sm font-semibold">
          (★미션★) 자리에 들어갈 정답을 적어요
        </label>
        <input
          id={`rpsfill-${questionKey}`}
          type="text"
          value={answer}
          onChange={(e) => onType(e.target.value)}
          disabled={disabled}
          placeholder="예) ai = randint(1, 3)"
          className="field font-mono"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={generate}
          disabled={disabled}
          className="pill pill-primary self-start disabled:opacity-60"
        >
          정답 반영 코드 생성
        </button>
        {err && (
          <p role="alert" className="t-body-sm font-semibold text-rose-600">
            {err}
          </p>
        )}
      </div>

      {code && <CodeBox code={code} eyeNounNote="붙여넣고 로고를 터치하면 AI 패가 바뀌면 성공!" />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 미션3 — 9가지 경우의 수 드롭다운 빌더 → 판정 코드 생성
// ─────────────────────────────────────────────────────────────
interface JudgeRow {
  my: number; // 1/2/3
  ai: number; // 1/2/3
  result: string; // 이김/비김/짐 (코드 주석)
  icon: string; // IconNames.* ("" = 미선택)
}
/** 9가지 조합(인간×AI)을 기본으로 채운다. 결과·아이콘은 학생이 고른다. */
function defaultRows(): JudgeRow[] {
  const rows: JudgeRow[] = [];
  for (const my of [1, 2, 3]) {
    for (const ai of [1, 2, 3]) {
      rows.push({ my, ai, result: "", icon: "" });
    }
  }
  return rows;
}
function parseRows(raw: string): JudgeRow[] {
  try {
    const v = JSON.parse(raw) as { rows?: unknown };
    if (Array.isArray(v.rows) && v.rows.length === 9) {
      return v.rows.map((r, i) => {
        const o = (r ?? {}) as Partial<JudgeRow>;
        const base = defaultRows()[i];
        const my = Number(o.my);
        const ai = Number(o.ai);
        return {
          my: my === 1 || my === 2 || my === 3 ? my : base.my,
          ai: ai === 1 || ai === 2 || ai === 3 ? ai : base.ai,
          result: typeof o.result === "string" ? o.result : "",
          icon: typeof o.icon === "string" ? o.icon : "",
        };
      });
    }
  } catch {
    /* 기본값 */
  }
  return defaultRows();
}

function genJudgeCode(rows: JudgeRow[]): string {
  const lines: string[] = [
    `choice = 1`,
    `my = 0`,
    `ai = 0`,
    ``,
    SHOW_HAND,
    ``,
    BTN_A,
    ``,
    BTN_B,
    ``,
    `def on_logo_pressed():`,
    `    global my, ai`,
    `    my = choice`,
    `    ai = randint(1, 3)`,
    `    show_hand(ai)`,
    `    basic.pause(800)`,
  ];
  rows.forEach((r, i) => {
    const head = i === 0 ? "if" : "elif";
    const comment = r.result ? `  # ${HAND_NAMES[r.my]} vs ${HAND_NAMES[r.ai]} → ${r.result}` : "";
    lines.push(`    ${head} my == ${r.my} and ai == ${r.ai}:`);
    lines.push(`        basic.show_icon(IconNames.${r.icon})${comment}`);
  });
  lines.push(`    basic.pause(1500)`);
  lines.push(`input.on_logo_event(TouchButtonEvent.PRESSED, on_logo_pressed)`);
  lines.push(``);
  lines.push(`show_hand(choice)`);
  return lines.join("\n");
}

export function RpsJudge({
  questionKey,
  raw,
  onChange,
  disabled,
}: {
  questionKey: string;
  raw: string;
  onChange: (raw: string) => void;
  disabled?: boolean;
}) {
  const initial = useMemo(() => parseRows(raw), [raw]);
  const [rows, setRows] = useState<JudgeRow[]>(initial);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  function update(i: number, patch: Partial<JudgeRow>) {
    if (disabled) return;
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    setRows(next);
    onChange(JSON.stringify({ rows: next }));
    setErr("");
  }
  function generate() {
    const missing = rows
      .map((r, i) => (!r.result || !r.icon ? i + 1 : 0))
      .filter((n) => n > 0);
    if (missing.length > 0) {
      setCode("");
      setErr(`결과·LED를 아직 안 고른 줄이 있어요: ${missing.join(", ")}번째 줄. 모두 고른 뒤 다시 눌러 주세요.`);
      return;
    }
    setErr("");
    setCode(genJudgeCode(rows));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="t-caption text-muted">
        9가지 경우마다 ① 내 패 ② AI 패 ③ 결과(이김/비김/짐) ④ 보여줄 LED 를 골라요. 틀리게 골라도 그대로
        코드가 나와요 — 선생님이 돌아다니며 봐 줄 거예요.
      </p>
      <div className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 t-body-sm"
          >
            <span className="w-6 text-muted">{i + 1}.</span>
            <label className="sr-only" htmlFor={`j-my-${questionKey}-${i}`}>
              내 패
            </label>
            <select
              id={`j-my-${questionKey}-${i}`}
              value={r.my}
              onChange={(e) => update(i, { my: Number(e.target.value) })}
              disabled={disabled}
              className="field w-auto"
            >
              {HAND_OPTIONS.map((h) => (
                <option key={h.n} value={h.n}>
                  나: {h.label}
                </option>
              ))}
            </select>
            <select
              aria-label={`${i + 1}번 AI 패`}
              value={r.ai}
              onChange={(e) => update(i, { ai: Number(e.target.value) })}
              disabled={disabled}
              className="field w-auto"
            >
              {HAND_OPTIONS.map((h) => (
                <option key={h.n} value={h.n}>
                  AI: {h.label}
                </option>
              ))}
            </select>
            <span aria-hidden>→</span>
            <select
              aria-label={`${i + 1}번 결과`}
              value={r.result}
              onChange={(e) => update(i, { result: e.target.value })}
              disabled={disabled}
              className="field w-auto"
            >
              <option value="" disabled>
                결과 고르기
              </option>
              {RESULT_OPTIONS.map((res) => (
                <option key={res} value={res}>
                  {res}
                </option>
              ))}
            </select>
            <select
              aria-label={`${i + 1}번 LED`}
              value={r.icon}
              onChange={(e) => update(i, { icon: e.target.value })}
              disabled={disabled}
              className="field w-auto"
            >
              <option value="" disabled>
                LED 고르기
              </option>
              {ICON_OPTIONS.map((ic) => (
                <option key={ic.name} value={ic.name}>
                  {ic.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={disabled}
        className="pill pill-primary self-start disabled:opacity-60"
      >
        코드 생성 (MakeCode Python)
      </button>
      {err && (
        <p role="alert" className="t-body-sm font-semibold text-rose-600">
          {err}
        </p>
      )}

      {code && <CodeBox code={code} eyeNounNote="붙여넣고 A·B 로 패를 정한 뒤 로고를 터치해 승부를 봐요!" />}
    </div>
  );
}
