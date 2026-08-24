"use client";

import { useState } from "react";

/**
 * "AI에게 검토받기" 단추와 결과 표시.
 *
 * 활동지 안에 있지만 자동저장(1.5초 디바운스)을 안 탄다 — 서버가 Gemini 를 부르고
 * 그 결과를 직접 저장하므로, 여기서는 성공한 결과를 부모에게 알려 화면에 반영하기만
 * 하면 된다. 다시 저장하면 서버가 방금 준 값을 그대로 덮어써도 결과가 같다.
 */

interface StoredResult {
  questions: string[];
  at: number;
}

function parse(raw: string): StoredResult | null {
  if (!raw.trim()) return null;
  try {
    const value = JSON.parse(raw) as StoredResult;
    return Array.isArray(value.questions) ? value : null;
  } catch {
    return null;
  }
}

export function AiReviewPanel({
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const result = parse(raw);

  async function run() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/student/ai-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: questionKey }),
      });
      const body = await response.json();
      if (body.ok) {
        onResult(JSON.stringify(body.result));
      } else {
        setError(body.message || "AI가 잠시 응답하지 않아요. 조금 뒤에 다시 눌러 보세요.");
      }
    } catch {
      setError("인터넷 연결을 확인하고 다시 눌러 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {result && (
        <div className="flex flex-col gap-2 rounded-lg bg-cream px-4 py-3">
          <p className="t-caption">AI가 이런 걸 더 생각해 보라고 물어봐요</p>
          {result.questions.map((q, i) => (
            <p key={i} className="t-body-sm">
              <span className="font-semibold">{i + 1}. </span>
              {q}
            </p>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => void run()}
        disabled={disabled || loading}
        className="pill pill-primary pill-block disabled:opacity-60"
      >
        {loading ? "AI가 생각하고 있어요…" : result ? "다시 검토받기" : "AI에게 검토받기"}
      </button>

      {error && <p className="t-body-sm rounded-md bg-pink px-4 py-3">{error}</p>}
    </div>
  );
}
