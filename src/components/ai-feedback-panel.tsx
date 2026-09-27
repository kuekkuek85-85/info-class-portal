"use client";

import { useState } from "react";

/**
 * "AI 피드백 받기" 단추와 결과 — 나 전달법·공감 문장·갈등 분석 (마음 톡톡 6회기).
 *
 * ## 채점이 아니라 격려다
 *
 * 형식이 잘 갖춰졌으면 "잘했어요"(good), 부족하면 어느 부분을 어떻게 고칠지 힌트(revise)를
 * 보여준다. 점수·정오 표시가 아니라 따뜻하게 북돋우는 화면이라, 색과 말투를 부드럽게 둔다.
 *
 * 자동저장(디바운스)을 안 탄다 — 서버가 결과를 직접 저장하고, 여기서는 성공한 결과를 부모에게
 * 알려 화면에 반영만 한다 (emotion-lens-panel 과 같은 구조). 학번·이름은 서버로 안 보낸다.
 */

interface StoredResult {
  feedback: { verdict: "good" | "revise"; message: string };
  at: number;
}

function parse(raw: string): StoredResult | null {
  if (!raw.trim()) return null;
  try {
    const value = JSON.parse(raw) as StoredResult;
    return typeof value.feedback?.message === "string" ? value : null;
  } catch {
    return null;
  }
}

export function AiFeedbackPanel({
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
  /**
   * 위기 신호로 막혔을 때의 안내. 활동지 답으로 저장하지 않는다 — 나중에 자기 활동지를 열었을
   * 때 "너는 걸렸던 사람" 이라는 표시가 남으면 안 된다. 필요한 것은 지금 교사에게 가닿는 것이다.
   */
  const [blocked, setBlocked] = useState("");
  const result = parse(raw);

  async function run() {
    setLoading(true);
    setError("");
    setBlocked("");
    try {
      const response = await fetch("/api/student/ai-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: questionKey }),
      });
      const body = await response.json();
      if (body.ok && body.blocked) {
        setBlocked(body.message);
      } else if (body.ok && body.result) {
        onResult(JSON.stringify(body.result));
      } else {
        setError(body.message || "AI가 잠시 대답하지 못하고 있어요. 조금 뒤에 다시 눌러 보세요.");
      }
    } catch {
      setError("인터넷 연결을 확인하고 다시 눌러 주세요.");
    } finally {
      setLoading(false);
    }
  }

  const feedback = result?.feedback;
  const good = feedback?.verdict === "good";

  return (
    <div className="flex flex-col gap-3">
      {feedback && (
        <div
          className={`flex flex-col gap-2 rounded-lg border-2 border-ink p-4 ${
            good ? "bg-cream" : "bg-lilac"
          }`}
        >
          <p className="t-subhead">{good ? "잘했어요 ✓" : "이렇게 고쳐 볼까요?"}</p>
          <p className="t-body whitespace-pre-line">{feedback.message}</p>
          <p className="t-caption">AI 도우미의 참고 의견이에요 — 정답이 하나만 있는 건 아니에요.</p>
        </div>
      )}

      {/* 막힌 안내는 결과 자리에 크게 띄운다. 작게 붙이면 다시 누르는 단추만 눈에 들어온다. */}
      {blocked && (
        <div className="rounded-lg border-2 border-ink bg-lilac p-4">
          <p className="t-body whitespace-pre-line">{blocked}</p>
        </div>
      )}

      {!blocked && (
        <button
          type="button"
          onClick={() => void run()}
          disabled={disabled || loading}
          className="pill pill-primary pill-block disabled:opacity-60"
        >
          {loading ? "AI가 읽고 있어요…" : result ? "다시 받기" : "AI 피드백 받기"}
        </button>
      )}

      {error && <p className="t-body-sm rounded-md bg-pink px-4 py-3">{error}</p>}
    </div>
  );
}
