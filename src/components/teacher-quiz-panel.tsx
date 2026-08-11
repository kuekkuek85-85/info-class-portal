"use client";

import { useState } from "react";

/**
 * 교사용 퀴즈 제어.
 *
 * 문항 이동과 정답 공개만 여기서 한다. 학생 화면은 4초 폴링으로 따라온다.
 *
 * 응답 분포는 **누를 때만** 불러온다. 대시보드 자동 폴링에 얹으면 5초마다 응답 문서를
 * 통째로 다시 읽게 되고, 그러잖아도 빠듯한 무료 읽기 한도를 더 밀어붙인다 (PRD 10장 D2).
 */

interface QuestionStat {
  prompt: string;
  choices: string[];
  answerIndex: number;
  counts: number[];
  answered: number;
  correct: number;
}

interface TeacherQuizPanelProps {
  sessionId: string;
  questions: { prompt: string; choices: string[]; answerIndex: number }[];
  index: number;
  revealed: boolean;
  onPatch: (patch: Record<string, unknown>) => Promise<void> | void;
}

export function TeacherQuizPanel({
  sessionId,
  questions,
  index,
  revealed,
  onPatch,
}: TeacherQuizPanelProps) {
  const [stats, setStats] = useState<QuestionStat[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsAt, setStatsAt] = useState("");

  const total = questions.length;
  const current = questions[index];

  async function loadStats() {
    setLoading(true);
    const response = await fetch(`/api/teacher/quiz-stats?sessionId=${sessionId}`);
    const result = await response.json();
    setLoading(false);
    if (!result.ok) return;

    setStats(result.questions as QuestionStat[]);
    setStatsAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
  }

  if (total === 0) return null;
  const stat = stats?.[index];

  return (
    <section className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="t-body font-bold">
          타임머신 퀴즈 — {index + 1} / {total}
        </h2>
        <p className="t-caption">
          {revealed ? "정답이 공개된 상태입니다" : "학생은 아직 정답을 볼 수 없습니다"}
        </p>
      </div>

      <div className="rounded-lg bg-surface px-4 py-3">
        <p className="t-body font-semibold">{current?.prompt}</p>
        <ul className="mt-2 flex flex-col gap-1">
          {current?.choices.map((choice, i) => (
            <li key={i} className={`t-body-sm ${i === current.answerIndex ? "font-bold" : ""}`}>
              {["①", "②", "③"][i] ?? i + 1} {choice}
              {i === current.answerIndex && " ← 정답"}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onPatch({ quizIndex: index - 1 })}
          disabled={index === 0}
          className="pill pill-secondary t-body-sm"
        >
          ← 이전 문항
        </button>
        <button
          type="button"
          onClick={() => onPatch({ quizRevealed: !revealed })}
          className={`pill t-body-sm ${revealed ? "pill-secondary" : "pill-primary"}`}
        >
          {revealed ? "정답 숨기기" : "정답 공개"}
        </button>
        <button
          type="button"
          onClick={() => onPatch({ quizIndex: index + 1 })}
          disabled={index >= total - 1}
          className="pill pill-secondary t-body-sm"
        >
          다음 문항 →
        </button>
      </div>

      <p className="t-caption">
        문항을 옮기면 정답 공개는 자동으로 꺼집니다 — 다음 문제가 답부터 보이지 않도록.
      </p>

      <div className="flex flex-col gap-3 border-t border-line pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={loadStats}
            disabled={loading}
            className="pill pill-secondary t-body-sm"
          >
            {loading ? "불러오는 중…" : "응답 분포 새로고침"}
          </button>
          <span className="t-caption">
            {statsAt ? `${statsAt} 기준` : "자동 갱신되지 않습니다 (읽기 한도 절약)"}
          </span>
        </div>

        {stat && (
          <div className="flex flex-col gap-2">
            <p className="t-caption">
              {stat.answered}명 응답 · 정답 {stat.correct}명
            </p>
            {stat.choices.map((choice, i) => {
              const count = stat.counts[i] ?? 0;
              const ratio = stat.answered > 0 ? Math.round((count / stat.answered) * 100) : 0;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="t-body-sm w-6 shrink-0">{["①", "②", "③"][i] ?? i + 1}</span>
                  <span className="h-5 flex-1 overflow-hidden rounded-full bg-surface">
                    <span
                      className={`block h-full ${i === stat.answerIndex ? "bg-lime" : "bg-line"}`}
                      style={{ width: `${ratio}%` }}
                    />
                  </span>
                  <span className="t-body-sm w-16 shrink-0 text-right">
                    {count}명 {ratio}%
                  </span>
                </div>
              );
            })}
            <p className="t-caption">
              누가 무엇을 골랐는지는 나오지 않습니다. 틀린 사람을 찾는 화면이 아닙니다.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
