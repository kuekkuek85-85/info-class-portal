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
  /*
   * 남은 횟수는 서버가 알려 준 뒤에만 뜬다.
   *
   * 화면에서 눌린 횟수를 세면 안 된다 — 새로고침하면 0 으로 돌아가고, 학생은 다 쓴
   * 뒤에도 남은 것처럼 보인다. 세는 곳은 Firestore 한 군데다 (ai-quota.ts).
   */
  const [left, setLeft] = useState<number | null>(null);
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
        if (typeof body.left === "number") setLeft(body.left);
      } else {
        /*
         * 여기까지 오는 것은 "아직 아무것도 안 썼다" 나 "로그인이 풀렸다" 뿐이다.
         * AI 가 죽은 경우는 서버가 고정 질문으로 채워서 성공으로 돌려준다 —
         * 스물두 명이 동시에 실패 문구를 보고 동시에 다시 누르는 일을 막으려는 것이다.
         */
        setError(body.message || "잠시 뒤에 다시 눌러 주세요.");
      }
    } catch {
      setError("인터넷 연결을 확인하고 다시 눌러 주세요.");
    } finally {
      setLoading(false);
    }
  }

  const usedUp = left === 0;

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
        disabled={disabled || loading || usedUp}
        className="pill pill-primary pill-block disabled:opacity-60"
      >
        {loading
          ? "AI가 생각하고 있어요…"
          : usedUp
            ? "이제 받은 질문에 답해 보자"
            : result
              ? "다시 검토받기"
              : "AI에게 검토받기"}
      </button>

      {left !== null && left > 0 && (
        <p className="t-caption text-muted">{left}번 더 받을 수 있어요</p>
      )}

      {error && <p className="t-body-sm rounded-md bg-pink px-4 py-3">{error}</p>}
    </div>
  );
}
