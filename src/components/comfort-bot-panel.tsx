"use client";

import { useState } from "react";

/**
 * 감정 위로 챗봇 — 학생이 설계한 챗봇과 대화하는 패널.
 *
 * ## 투명성이 이 활동의 프라이버시 처리다
 *
 * 대화는 저장되고 교사가 열람한다. 그래서 화면 맨 위에 "이 대화는 선생님이 볼 수 있어요" 를
 * **항상** 크게 띄운다(botNotice 로 문구를 바꿀 수 있지만, 없어도 기본 문구가 반드시 나온다).
 * 몰래 저장이 아니라, 알고 나누는 대화다.
 *
 * 저장은 서버가 한다 — 여기서는 성공한 transcript 를 부모에게 알려 화면에 반영한다
 * (emotion-lens-panel·ai-review-panel 과 같은 구조).
 */

interface Message {
  role: "user" | "bot";
  text: string;
  at: number;
}
interface Transcript {
  situation: string;
  design: { label: string; value: string }[];
  messages: Message[];
  updatedAt: number;
}

const DEFAULT_NOTICE = "이 대화는 선생님이 볼 수 있어요. 마음이 힘들 땐 챗봇보다 선생님과 직접 이야기해도 돼요.";

function parse(raw: string): Transcript | null {
  if (!raw.trim()) return null;
  try {
    const value = JSON.parse(raw) as Transcript;
    return Array.isArray(value.messages) ? value : null;
  } catch {
    return null;
  }
}

export function ComfortBotPanel({
  questionKey,
  raw,
  onResult,
  disabled,
  notice,
}: {
  questionKey: string;
  raw: string;
  onResult: (raw: string) => void;
  disabled?: boolean;
  notice?: string;
}) {
  const transcript = parse(raw);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function call(payload: { message?: string; reset?: boolean }) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/student/comfort-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: questionKey, ...payload }),
      });
      const body = await response.json();
      if (body.ok && body.transcript) {
        onResult(JSON.stringify(body.transcript));
        setDraft("");
      } else {
        setError(body.message || "챗봇이 잠시 대답하지 못하고 있어요. 조금 뒤에 다시 해 보세요.");
      }
    } catch {
      setError("인터넷 연결을 확인하고 다시 해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  const started = transcript !== null && transcript.messages.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* 투명성 안내 — 항상 크게. */}
      <p className="rounded-lg border-2 border-ink bg-lilac px-4 py-3 t-body-sm font-semibold">
        🔎 {notice?.trim() || DEFAULT_NOTICE}
      </p>

      {!started ? (
        <button
          type="button"
          onClick={() => void call({})}
          disabled={disabled || loading}
          className="pill pill-primary pill-block disabled:opacity-60"
        >
          {loading ? "챗봇을 부르는 중…" : "챗봇과 대화 시작하기"}
        </button>
      ) : (
        <>
          <div className="flex flex-col gap-2 rounded-lg border-2 border-line bg-canvas p-3">
            {transcript!.messages.map((message, index) => (
              <div
                key={`${message.at}-${index}`}
                className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <p
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 t-body-sm ${
                    message.role === "user" ? "bg-ink text-canvas" : "bg-cream"
                  }`}
                >
                  {message.text}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, 500))}
              rows={2}
              disabled={disabled || loading}
              placeholder="챗봇에게 하고 싶은 말을 적어 보세요"
              className="field"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void call({ message: draft })}
                disabled={disabled || loading || !draft.trim()}
                className="pill pill-primary disabled:opacity-60"
              >
                {loading ? "보내는 중…" : "보내기"}
              </button>
              <button
                type="button"
                onClick={() => void call({ reset: true })}
                disabled={disabled || loading}
                className="pill pill-secondary disabled:opacity-60"
              >
                처음부터 다시
              </button>
            </div>
          </div>
        </>
      )}

      {error && <p className="t-body-sm rounded-md bg-pink px-4 py-3">{error}</p>}
    </div>
  );
}
