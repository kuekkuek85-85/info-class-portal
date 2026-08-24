"use client";

import { useState } from "react";

import { QUADRANTS, type Quadrant } from "@/lib/mood";

/**
 * "AI에게 보여주기" 단추와 감정 추측 결과.
 *
 * ## 화면이 말해야 하는 것은 "이건 추측이다"
 *
 * 퍼센트를 두 개 나란히 보여주고, 사분면 색을 함께 띄운다. 하나만 딱 집어 주면 학생은
 * 그것을 정답으로 받아들이고, 그러면 바로 다음 칸에서 "AI가 맞혔나요?" 를 물을 수가
 * 없다. 견줄 것이 두 개여야 견주게 된다.
 *
 * 사분면 색을 쓰는 이유는 따로다. 도입에서 배운 무드미터 지도 위에 AI의 추측이 얹히면,
 * **내가 체크인에서 찍은 칸과 AI가 찍은 칸의 차이가 말이 아니라 화면으로 보인다.**
 *
 * 자동저장(1.5초 디바운스)을 안 탄다 — 서버가 결과를 직접 저장하고, 여기서는 성공한
 * 결과를 부모에게 알려 화면에 반영하기만 한다 (ai-review-panel 과 같은 구조).
 */

interface StoredResult {
  guess: {
    candidates: { label: string; percent: number }[];
    quadrant: Quadrant | null;
    empathy: string;
    because: string;
  };
  at: number;
}

function parse(raw: string): StoredResult | null {
  if (!raw.trim()) return null;
  try {
    const value = JSON.parse(raw) as StoredResult;
    return Array.isArray(value.guess?.candidates) ? value : null;
  } catch {
    return null;
  }
}

export function EmotionLensPanel({
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
   * 위기 신호로 막혔을 때의 안내.
   *
   * 활동지 답으로 저장하지 않는다. 학생이 나중에 자기 활동지를 열었을 때 "너는 걸렸던
   * 사람" 이라는 표시가 남아 있으면 안 된다. 필요한 것은 지금 이 자리에서 교사에게
   * 가닿는 것 하나다.
   */
  const [blocked, setBlocked] = useState("");
  const result = parse(raw);

  async function run() {
    setLoading(true);
    setError("");
    setBlocked("");
    try {
      const response = await fetch("/api/student/emotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: questionKey }),
      });
      const body = await response.json();

      if (body.ok && body.blocked) {
        setBlocked(body.message);
      } else if (body.ok) {
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

  const guess = result?.guess;
  const quadrant = guess?.quadrant ? QUADRANTS[guess.quadrant] : null;

  return (
    <div className="flex flex-col gap-3">
      {guess && (
        <div className="flex flex-col gap-3 rounded-lg border-2 border-line bg-canvas p-4">
          <p className="t-caption">AI는 이렇게 추측했어요 — 맞을 수도, 틀릴 수도 있어요</p>

          {guess.candidates.map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <p className="flex items-baseline justify-between gap-2 t-body">
                <span className="font-bold">{item.label}일 수 있어요</span>
                {item.percent > 0 && <span className="t-caption">{item.percent}%</span>}
              </p>
              {/*
                막대는 장식이 아니다. 70 대 30 이 눈에 보여야 "AI도 확신하지 못한다" 가
                읽힌다 — 숫자만 있으면 첫 줄만 보고 정답으로 받아들인다.
              */}
              {item.percent > 0 && (
                <span className="block h-2 w-full overflow-hidden rounded-full bg-surface">
                  <span
                    className="block h-full rounded-full bg-ink"
                    style={{ width: `${Math.min(100, Math.max(0, item.percent))}%` }}
                  />
                </span>
              )}
            </div>
          ))}

          {/* 도입에서 배운 무드미터 지도 위에 AI의 추측을 얹는다 */}
          {quadrant && (
            <p className={`rounded-md px-3 py-2 t-body-sm ${quadrant.className}`}>
              무드미터에서는 <b>{quadrant.label}</b> 칸 — {quadrant.description}
            </p>
          )}

          {guess.because && (
            <p className="t-body-sm">
              <span className="font-semibold">그렇게 본 이유 · </span>
              {guess.because}
            </p>
          )}
          {guess.empathy && <p className="rounded-md bg-cream px-3 py-2 t-body">{guess.empathy}</p>}
        </div>
      )}

      {/*
        막힌 안내는 결과 자리에 크게 띄운다. 작게 붙이면 다시 누르는 단추만 눈에 들어온다.
      */}
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
          {loading
            ? "AI가 읽고 있어요…"
            : result
              ? "다시 물어보기"
              : "AI에게 보여주기"}
        </button>
      )}

      {error && <p className="t-body-sm rounded-md bg-pink px-4 py-3">{error}</p>}
    </div>
  );
}
