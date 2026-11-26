"use client";

import { useState } from "react";

/**
 * 바이브 코딩 패널 — 학생이 원하는 기능을 프롬프트로 적으면 AI가 전체 코드 + 설명을 돌려준다.
 *
 * ## 투명성이 이 활동의 프라이버시 처리다
 *
 * 프롬프트와 AI 답은 저장되고 교사가 열람한다. 그래서 맨 위에 "선생님이 볼 수 있어요" 를 항상 띄운다.
 * 저장은 서버가 한다 — 여기서는 성공한 기록(log)을 부모에게 알려 화면에 반영한다(comfort-bot-panel 과 같은 구조).
 */

interface Entry {
  prompt: string;
  code: string;
  explanation: string;
  at: number;
  /** 이어서 부탁하기 문항만: 어디서 출발했나 */
  from?: "base" | "last" | "mine";
}
interface Log {
  entries: Entry[];
  updatedAt: number;
}

/** 대상 — turtle(22차 똥피하기) / microbit(25차 만보기·26차 주사위·27차 가위바위보). 열기 링크·안내·예시가 달라진다. */
type VibeTarget = "turtle" | "microbit";

const ONECOMPILER_URL = "https://onecompiler.com/turtle";
const MAKECODE_URL = "https://makecode.microbit.org/";

/** 받침 유무로 조사 와/과 고르기 (주사위·만보기·가위바위보→와, 게임→과). */
function waGwa(word: string): string {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return "와"; // 한글 음절 아니면 기본값
  return (code - 0xac00) % 28 === 0 ? "와" : "과"; // 종성 없음 → 와
}

interface VibeCopy {
  notice: string;
  promptLabel: string;
  placeholder: string;
  openUrl: string;
  openLabel: string;
  runHint: string;
}

/** turtle 문구 — 고정(22차). */
const TURTLE_COPY: VibeCopy = {
  notice:
    "내가 AI에게 보낸 말과 받은 코드는 저장되고, 선생님이 볼 수 있어요. 게임과 관련된 기능만 요청해요.",
  promptLabel: "어떤 기능을 더하고 싶나요? 한 번에 하나씩, 동작을 말로 적어 보세요.",
  placeholder: "예) 똥에 닿으면 목숨이 1 줄고, 목숨이 3개 다 떨어지면 게임 오버가 되게 해 줘",
  openUrl: ONECOMPILER_URL,
  openLabel: "OneCompiler 터틀 열기 (새 탭)",
  runHint: "복사해서 붙여넣어 실행해 봐요. 한 번에 안 되면 정상이에요 — 설명을 보고 조금씩 고쳐요.",
};

/**
 * microbit 문구 — '만든 것' 이름(noun)으로 조립한다. noun 기본값은 "만보기"(25차)라서, 아무 것도 안
 * 넘기면 25차와 글자 그대로 같다. 26차는 noun="주사위", 27차는 "가위바위보" 를 넘겨 덮어쓴다.
 * placeholder 는 noun 과 별개(차시마다 예시가 다름) — 안 넘기면 25차 만보기 예시로 물러난다.
 */
const MICROBIT_DEFAULT_NOUN = "만보기";
const MICROBIT_DEFAULT_PLACEHOLDER = "예) A와 B 버튼을 같이 누르면 걸음 수가 0으로 초기화되게 해 줘";
function microbitCopy(noun: string, placeholder: string): VibeCopy {
  return {
    notice: `내가 AI에게 보낸 말과 받은 코드는 저장되고, 선생님이 볼 수 있어요. ${noun}${waGwa(noun)} 관련된 기능만 요청해요.`,
    promptLabel: `${noun}에 어떤 기능을 더하고 싶나요? 한 번에 하나씩, 동작을 말로 적어 보세요.`,
    placeholder,
    openUrl: MAKECODE_URL,
    openLabel: "MakeCode 열기 (새 탭)",
    runHint:
      "'코드 복사하기' 로 복사한 뒤 [MakeCode 열기] 로 열어 위쪽을 'Python' 으로 바꾸고, 기존 코드를 모두 지우고 붙여넣어 실행해요. 한 번에 안 되면 정상이에요 — 설명을 보고 조금씩 고쳐요.",
  };
}

/** 이어서 부탁하기의 출발점 (서버 VibeCodeEntry.from 과 같다) */
type StartFrom = "base" | "last" | "mine";
const START_LABEL: Record<StartFrom, string> = {
  base: "처음 코드에서",
  last: "마지막으로 받은 코드에서 이어서",
  mine: "내 코드 붙여넣고 이어서",
};

function parse(raw: string): Log | null {
  if (!raw.trim()) return null;
  try {
    const value = JSON.parse(raw) as Log;
    return Array.isArray(value.entries) ? value : null;
  } catch {
    return null;
  }
}

export function VibeCodePanel({
  questionKey,
  raw,
  onResult,
  disabled,
  target = "turtle",
  projectNoun,
  examplePrompt,
  promptLabel,
  sendLabel,
  continueEnabled = false,
  continueRaw = "",
}: {
  questionKey: string;
  raw: string;
  onResult: (raw: string) => void;
  disabled?: boolean;
  /** "내 코드로 이어서 부탁하기"(문항 vibeContinue). 켜면 출발점(처음 / 이어서 / 내 코드)을 고른다 */
  continueEnabled?: boolean;
  /** vibeContinueFromKey 칸의 기록(예: 34차에서 33차 기록) - 이 칸이 비었을 때 '이어서' 가 가능한지 본다 */
  continueRaw?: string;
  /** turtle(22차, 기본) / microbit(25차 만보기·26차 주사위·27차 가위바위보). 열기 링크·안내 문구를 고른다 */
  target?: VibeTarget;
  /** microbit 문구의 '만든 것' 이름 — 안 주면 "만보기"(25차). 26차="주사위" 등. turtle 에선 안 쓴다. */
  projectNoun?: string;
  /** microbit 입력칸 예시(placeholder) 덮어쓰기 — 안 주면 25차 만보기 예시. turtle 에선 안 쓴다. */
  examplePrompt?: string;
  /** 입력칸 제목 덮어쓰기 (34차) */
  promptLabel?: string;
  /** 보내기 단추 글자 덮어쓰기 (34차 「바이브 코딩 하기」) */
  sendLabel?: string;
}) {
  const copy =
    target === "microbit"
      ? microbitCopy(
          projectNoun ?? MICROBIT_DEFAULT_NOUN,
          examplePrompt ?? MICROBIT_DEFAULT_PLACEHOLDER,
        )
      : TURTLE_COPY;
  const log = parse(raw);
  const entries = log?.entries ?? [];
  const latest = entries[entries.length - 1];

  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  /** 이어서 고칠 코드가 있나 - 이 칸 기록, 없으면 앞 차시 칸 기록(continueRaw). 실제 코드는 서버가 꺼낸다 */
  const hasPrevious =
    entries.some((e) => e.code) || (parse(continueRaw)?.entries ?? []).some((e) => e.code);
  const [pickedFrom, setPickedFrom] = useState<StartFrom | null>(null);
  const from: StartFrom = !continueEnabled ? "base" : pickedFrom ?? (hasPrevious ? "last" : "base");
  const [mine, setMine] = useState("");

  async function send() {
    const prompt = draft.trim();
    if (!prompt || loading || disabled) return;
    if (from === "mine" && !mine.trim()) {
      setError("이어서 고칠 내 코드를 붙여넣어 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/student/vibe-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: questionKey,
          prompt,
          ...(continueEnabled ? { from, ...(from === "mine" ? { code: mine } : {}) } : {}),
        }),
      });
      const body = await response.json();
      if (body.ok && body.log) {
        onResult(JSON.stringify(body.log));
        setDraft("");
      } else {
        setError(body.message || "AI가 잠시 코드를 만들지 못하고 있어요. 조금 뒤에 다시 해 보세요.");
      }
    } catch {
      setError("인터넷 연결을 확인하고 다시 해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("복사가 안 되면 코드를 길게 눌러 직접 복사해 주세요.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 투명성 안내 — 항상 크게. */}
      <p className="rounded-lg border-2 border-ink bg-lilac px-4 py-3 t-body-sm font-semibold">
        🔎 {copy.notice}
      </p>

      {/* 출발점 고르기 - 이어서 부탁하기 문항만. 글은 두 줄까지. */}
      {continueEnabled && (
        <fieldset className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3" disabled={disabled || loading}>
          <legend className="t-body-sm font-semibold">어디서부터 부탁할까요?</legend>
          <div className="flex flex-wrap gap-2">
            {(["base", "last", "mine"] as const).map((option) => {
              const off = option === "last" && !hasPrevious;
              return (
                <label
                  key={option}
                  className={`pill t-body-sm cursor-pointer ${from === option ? "pill-primary" : "pill-secondary"} ${off ? "opacity-40" : ""}`}
                >
                  <input
                    type="radio"
                    name={`vibe-from-${questionKey}`}
                    value={option}
                    checked={from === option}
                    disabled={off}
                    onChange={() => setPickedFrom(option)}
                    className="sr-only"
                  />
                  {START_LABEL[option]}
                </label>
              );
            })}
          </div>
          {from === "last" && (
            <p className="t-caption text-muted">지난번에 받은 코드에 이어서 고쳐 달라고 해요.</p>
          )}
          {from === "mine" && (
            <textarea
              value={mine}
              onChange={(event) => setMine(event.target.value.slice(0, 6000))}
              rows={6}
              spellCheck={false}
              placeholder="MakeCode 'Python' 에 있는 내 코드를 전부 복사해 붙여넣어요. (예시 코드를 붙여도 돼요)"
              className="field font-mono text-sm"
            />
          )}
        </fieldset>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor={`vibe-${questionKey}`} className="t-body-sm font-semibold">
          {promptLabel || copy.promptLabel}
        </label>
        <textarea
          id={`vibe-${questionKey}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, 500))}
          rows={3}
          disabled={disabled || loading}
          placeholder={copy.placeholder}
          className="field"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={disabled || loading || !draft.trim()}
          className="pill pill-primary self-start disabled:opacity-60"
        >
          {loading ? "AI가 코드를 만드는 중…" : sendLabel || "AI에게 코드 받기"}
        </button>
      </div>

      {error && <p className="t-body-sm rounded-md bg-pink px-4 py-3">{error}</p>}

      {latest && (
        <div className="flex flex-col gap-2 rounded-lg border-2 border-line bg-canvas p-3">
          <p className="t-caption">
            내가 요청한 것: {latest.prompt}
            {latest.from && <span className="text-muted"> ({START_LABEL[latest.from]})</span>}
          </p>
          {latest.explanation && (
            <p className="whitespace-pre-line rounded-md bg-cream px-3 py-2 t-body-sm">
              {latest.explanation}
            </p>
          )}
          {latest.code ? (
            <>
              {/* 줄 번호 표준(31차~): 번호는 select-none 이라 복사에 안 딸려온다. 긴 줄은 접지 않고 칸 안에서 가로 스크롤. */}
              <div className="max-h-[32rem] overflow-auto rounded-lg border border-line bg-surface p-3 font-mono text-sm leading-relaxed">
                {latest.code.split("\n").map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <span
                      aria-hidden
                      className="w-8 shrink-0 select-none border-r border-line/60 pr-2 text-right tabular-nums text-muted/60"
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 whitespace-pre text-ink/90">{line === "" ? " " : line}</span>
                  </div>
                ))}
              </div>
              <details className="t-caption text-muted">
                <summary className="cursor-pointer">복사가 안 되면 여기를 눌러 직접 복사해요 (줄 번호 없음)</summary>
                <textarea
                  readOnly
                  value={latest.code}
                  rows={Math.min(latest.code.split("\n").length, 22)}
                  spellCheck={false}
                  onFocus={(event) => event.currentTarget.select()}
                  className="field mt-2 w-full font-mono text-sm"
                />
              </details>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyCode(latest.code)}
                  className="pill pill-secondary t-body-sm"
                >
                  {copied ? "복사됐어요" : "코드 복사하기"}
                </button>
                <a
                  href={copy.openUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="pill pill-primary t-body-sm"
                >
                  {copy.openLabel}
                </a>
              </div>
              <p className="t-caption text-muted">{copy.runHint}</p>
            </>
          ) : (
            <p className="t-body-sm rounded-md bg-pink px-3 py-2">
              이 요청은 코드를 만들지 못했어요(게임과 관련된 기능을 구체적으로 다시 적어 보세요).
            </p>
          )}
        </div>
      )}

      {entries.length > 1 && (
        <details className="rounded-lg border border-line bg-surface px-3 py-2">
          <summary className="t-body-sm cursor-pointer">지난 요청 다시 보기 ({entries.length - 1}개)</summary>
          <div className="mt-2 flex flex-col gap-2">
            {entries
              .slice(0, -1)
              .reverse()
              .map((e, i) => (
                <div key={`${e.at}-${i}`} className="rounded-md bg-canvas px-3 py-2">
                  <p className="t-caption">요청: {e.prompt}</p>
                  {e.explanation && <p className="t-caption text-muted">{e.explanation}</p>}
                </div>
              ))}
          </div>
        </details>
      )}
    </div>
  );
}
