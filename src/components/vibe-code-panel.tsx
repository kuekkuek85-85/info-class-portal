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
}
interface Log {
  entries: Entry[];
  updatedAt: number;
}

const NOTICE = "내가 AI에게 보낸 말과 받은 코드는 저장되고, 선생님이 볼 수 있어요. 게임과 관련된 기능만 요청해요.";
const ONECOMPILER_URL = "https://onecompiler.com/turtle";

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
}: {
  questionKey: string;
  raw: string;
  onResult: (raw: string) => void;
  disabled?: boolean;
}) {
  const log = parse(raw);
  const entries = log?.entries ?? [];
  const latest = entries[entries.length - 1];

  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function send() {
    const prompt = draft.trim();
    if (!prompt || loading || disabled) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/student/vibe-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: questionKey, prompt }),
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
        🔎 {NOTICE}
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor={`vibe-${questionKey}`} className="t-body-sm font-semibold">
          어떤 기능을 더하고 싶나요? 한 번에 하나씩, 동작을 말로 적어 보세요.
        </label>
        <textarea
          id={`vibe-${questionKey}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, 500))}
          rows={3}
          disabled={disabled || loading}
          placeholder="예) 똥에 닿으면 목숨이 1 줄고, 목숨이 3개 다 떨어지면 게임 오버가 되게 해 줘"
          className="field"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={disabled || loading || !draft.trim()}
          className="pill pill-primary self-start disabled:opacity-60"
        >
          {loading ? "AI가 코드를 만드는 중…" : "AI에게 코드 받기"}
        </button>
      </div>

      {error && <p className="t-body-sm rounded-md bg-pink px-4 py-3">{error}</p>}

      {latest && (
        <div className="flex flex-col gap-2 rounded-lg border-2 border-line bg-canvas p-3">
          <p className="t-caption">내가 요청한 것: {latest.prompt}</p>
          {latest.explanation && (
            <p className="whitespace-pre-line rounded-md bg-cream px-3 py-2 t-body-sm">
              {latest.explanation}
            </p>
          )}
          {latest.code ? (
            <>
              <textarea
                readOnly
                value={latest.code}
                rows={Math.min(latest.code.split("\n").length, 22)}
                spellCheck={false}
                onFocus={(event) => event.currentTarget.select()}
                className="field font-mono text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyCode(latest.code)}
                  className="pill pill-secondary t-body-sm"
                >
                  {copied ? "복사됐어요" : "코드 복사하기"}
                </button>
                <a
                  href={ONECOMPILER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="pill pill-primary t-body-sm"
                >
                  OneCompiler 터틀 열기 (새 탭)
                </a>
              </div>
              <p className="t-caption text-muted">
                복사해서 붙여넣어 실행해 봐요. 한 번에 안 되면 정상이에요 — 설명을 보고 조금씩 고쳐요.
              </p>
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
