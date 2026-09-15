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
  questions: {
    prompt: string;
    choices: string[];
    answerIndex: number;
    /** 단답형(노래 퀴즈)이면 "text" */
    answerType?: "choice" | "text";
    /** 단답형에서 교사 화면으로 재생할 음성 (TTS). 학생 태블릿엔 안 간다 */
    audioUrl?: string;
    /** 정답 공개 때 학생에게 보이는 정답 텍스트 (교사도 여기서 확인) */
    nowText?: string;
    /** 의견형 문항(정답 없음) — 정답 강조 대신 「분포 공개」로 학생에게 분포를 보인다 */
    opinion?: boolean;
  }[];
  /**
   * questions 는 지금 단계의 부분집합이라, 각 문항의 전체 배열 번호를 여기서 받는다.
   * 이전·다음 이동과 집계(quiz-stats, 글로벌 인덱스)를 이 번호로 맞춘다.
   */
  globalIndices: number[];
  index: number;
  revealed: boolean;
  /** 의견형 투표 차시는 「정답 공개」를 숨긴다 (정답이 없어 공개가 오해를 준다) */
  hideReveal?: boolean;
  /** 화면에 표시할 퀴즈 이름 (기본 "타임머신 퀴즈") */
  label?: string;
  onPatch: (patch: Record<string, unknown>) => Promise<void> | void;
}

export function TeacherQuizPanel({
  sessionId,
  questions,
  globalIndices,
  index,
  revealed,
  hideReveal = false,
  label = "타임머신 퀴즈",
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
  // 집계는 글로벌 인덱스로 저장돼 있으므로, 지금 문항의 전체 배열 번호로 찾는다.
  const stat = stats?.[globalIndices[index]];
  const isText = current?.answerType === "text";
  const isOpinion = current?.opinion === true;
  // 퀴즈 전체가 의견형(hideReveal)이면 공개 버튼 자체를 숨긴다. 문항별 의견형(opinion)은
  // 「정답 공개」 대신 「분포 공개」로 바뀌어, 학생에게 응답 분포를 보인다.
  const noReveal = hideReveal;

  return (
    <section className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="t-body font-bold">
          {label} — {index + 1} / {total}
        </h2>
        <p className="t-caption">
          {noReveal
            ? "의견형 — 정답 공개 없이 분포만 봅니다"
            : isOpinion
              ? revealed
                ? "학생 화면에 응답 분포가 보이는 중"
                : "의견형 — 「분포 공개」로 학생에게 분포를 보입니다"
              : revealed
                ? "정답이 공개된 상태입니다"
                : "학생은 아직 정답을 볼 수 없습니다"}
        </p>
      </div>

      <div className="rounded-lg bg-surface px-4 py-3">
        <p className="t-body font-semibold">{current?.prompt}</p>

        {/*
          음성은 여기(교사 화면)에서만 재생한다 — 학생 태블릿엔 주소를 안 보낸다. 노래
          단답형, 문장 감정 투표 모두 이 재생기로 튼다. 한 번 튼 뒤 학생이 답한다.
        */}
        {current?.audioUrl && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio key={current.audioUrl} controls preload="none" className="mt-3 w-full">
            <source src={current.audioUrl} />
          </audio>
        )}

        {isText ? (
          current?.nowText && (
            <p className="mt-3 t-body-sm">
              <span className="font-bold">정답</span> · {current.nowText}
            </p>
          )
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {current?.choices.map((choice, i) => {
              const isAnswer = current.opinion !== true && i === current.answerIndex;
              return (
                <li key={i} className={`t-body-sm ${isAnswer ? "font-bold" : ""}`}>
                  {["①", "②", "③"][i] ?? i + 1} {choice}
                  {isAnswer && " ← 정답"}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onPatch({ quizIndex: globalIndices[index - 1] })}
          disabled={index === 0}
          className="pill pill-secondary t-body-sm"
        >
          ← 이전 문항
        </button>
        {!noReveal && (
          <button
            type="button"
            onClick={() => onPatch({ quizRevealed: !revealed })}
            className={`pill t-body-sm ${revealed ? "pill-secondary" : "pill-primary"}`}
          >
            {isOpinion
              ? revealed
                ? "분포 숨기기"
                : "분포 공개"
              : revealed
                ? "정답 숨기기"
                : "정답 공개"}
          </button>
        )}
        <button
          type="button"
          onClick={() => onPatch({ quizIndex: globalIndices[index + 1] })}
          disabled={index >= total - 1}
          className="pill pill-secondary t-body-sm"
        >
          다음 문항 →
        </button>
      </div>

      {!noReveal && (
        <p className="t-caption">
          {isOpinion
            ? "「분포 공개」를 누르면 지금까지 모인 응답 분포가 학생 화면에도 뜹니다. 문항을 옮기면 꺼집니다."
            : "문항을 옮기면 정답 공개는 자동으로 꺼집니다 — 다음 문제가 답부터 보이지 않도록."}
        </p>
      )}

      {isText && (
        <p className="t-caption border-t border-line pt-3">
          단답형은 학생 답을 모으지 않습니다 — 정답을 공개하면 학생이 스스로 채점합니다.
        </p>
      )}

      {!isText && (
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
              {stat.answered}명 응답{current?.opinion !== true && ` · 정답 ${stat.correct}명`}
            </p>
            {stat.choices.map((choice, i) => {
              const count = stat.counts[i] ?? 0;
              const ratio = stat.answered > 0 ? Math.round((count / stat.answered) * 100) : 0;
              const markCorrect = current?.opinion !== true && i === stat.answerIndex;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="t-body-sm w-6 shrink-0">{["①", "②", "③"][i] ?? i + 1}</span>
                  <span className="h-5 flex-1 overflow-hidden rounded-full bg-surface">
                    <span
                      className={`block h-full ${markCorrect ? "bg-lime" : "bg-line"}`}
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
      )}
    </section>
  );
}
