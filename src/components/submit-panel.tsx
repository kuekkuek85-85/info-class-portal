"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { NewsPaper, templateOf, type NewsPaperData } from "@/components/news-paper";
import type { CheckItem } from "@/lib/article-check";
import type { WorksheetQuestion } from "@/lib/types";

/**
 * 수행평가 제출 칸 (7차시).
 *
 * 한 칸이 단계마다 다른 얼굴을 한다 — 0차 제출 전, 1차 점검 결과, 2차 교사 대기,
 * 최종 완료. 단계(LESSON_PHASES)를 새로 파지 않은 이유가 여기 있다. 학생마다 진도가
 * 달라서, 교사가 전체를 한꺼번에 넘기는 구조로는 이 루프를 담을 수 없다.
 *
 * ## 학생을 세우지 않는다
 *
 * 서버가 느리거나 오탈자 호출이 실패해도 「그냥 넘어가기」로 다음 단계에 간다.
 * 스물여덟 명이 한꺼번에 내는 구간이라, 여기서 한 명이라도 막히면 손을 들고 기다린다.
 *
 * ## 2차 대기 중에만 묻는다
 *
 * 교사 피드백이 왔는지 확인하는 폴링은 stage 가 2 일 때만 돈다. 그 상태인 학생은
 * 많아야 열댓 명이고 몇 분이라, 수업 한 번에 읽기가 천 건 안쪽이다.
 */

const POLL_MS = 8000;

interface SubmitState {
  stage: 0 | 1 | 2 | 3;
  items: CheckItem[];
  teacherFeedback: { at: number; chips: string[]; note: string } | null;
}

interface SubmitPanelProps {
  question: WorksheetQuestion;
  /** 이 활동지가 담고 있는 자기 점검 답 — 2차 제출 때 함께 보낸다 */
  selfCheck: string;
  /** 최종 제출 뒤에 띄울 신문 지면의 재료 */
  paper: NewsPaperData;
  /** 고른 지면 (news_template 의 답) */
  templateChoice: string;
  /** 「그 칸으로」 — 고칠 칸으로 옮겨 준다 */
  onJump: (field: string) => void;
  disabled?: boolean;
}

export function SubmitPanel({
  question,
  selfCheck,
  paper,
  templateChoice,
  onJump,
  disabled,
}: SubmitPanelProps) {
  const [state, setState] = useState<SubmitState>({ stage: 0, items: [], teacherFeedback: null });
  const [blocked, setBlocked] = useState<CheckItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /** 「그냥 넘어가기」를 눌렀는지 — 점검 결과를 접고 2차 단추만 남긴다 */
  const [skipped, setSkipped] = useState(false);

  // 새로고침한 학생이 자기 단계를 되찾는다. 화면 상태로만 들고 있으면 1차부터 다시 낸다
  const pull = useCallback(async () => {
    try {
      const response = await fetch("/api/student/submit", { cache: "no-store" });
      const result = await response.json();
      if (result?.ok) {
        setState({
          stage: (result.stage ?? 0) as SubmitState["stage"],
          items: (result.items ?? []) as CheckItem[],
          teacherFeedback: result.teacherFeedback ?? null,
        });
      }
    } catch {
      // 다음 차례에 다시 묻는다
    }
  }, []);

  /*
   * 효과 몸통에서 바로 부르지 않는다.
   *
   * pull 은 async 라 setState 가 await 뒤에 일어나지만, 린트는 정적으로 보고 "효과에서
   * 바로 setState" 로 읽는다. 한 박자 미루면 규칙도 만족하고 실제 동작도 같다
   * (sendev 의 useWho 와 같은 처리).
   */
  useEffect(() => {
    const id = setTimeout(() => void pull(), 0);
    return () => clearTimeout(id);
  }, [pull]);

  // 교사를 기다리는 동안에만 돈다. 피드백이 오면 저절로 멈춘다
  const waiting = state.stage === 2 && !state.teacherFeedback;
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => void pull(), POLL_MS);
    return () => clearInterval(id);
  }, [waiting, pull]);

  const send = useCallback(
    async (stage: 1 | 2 | 3) => {
      setBusy(true);
      setError("");
      setBlocked([]);
      try {
        const response = await fetch("/api/student/submit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ stage, selfCheck }),
        });
        const result = await response.json();

        if (!result?.ok) {
          setError(result?.message ?? "잠시 뒤에 다시 눌러 보세요.");
          return;
        }
        if (Array.isArray(result.blocked) && result.blocked.length > 0) {
          setBlocked(result.blocked as CheckItem[]);
          return;
        }
        setSkipped(false);
        await pull();
      } catch {
        setError("잠시 뒤에 다시 눌러 보세요.");
      } finally {
        setBusy(false);
      }
    },
    [pull, selfCheck],
  );

  if (state.stage === 3) {
    return (
      <div className="flex flex-col gap-4">
        <div className="block flex flex-col gap-2 bg-mint">
          <p className="t-display">제출 완료 ✓</p>
          <p className="t-body-lg">
            수고했어요. 아래가 완성된 지면입니다 — 고치고 싶으면 위에서 고친 뒤 다시 제출하면 됩니다.
          </p>
          <button
            type="button"
            onClick={() => void send(3)}
            disabled={busy || disabled}
            className="pill pill-secondary self-start"
          >
            고쳤어요 · 다시 제출하기
          </button>
        </div>
        {/*
          완성본. 지면을 보는 것이 이 40분의 끝이다 — 칸을 채우는 일로만 끝나면
          자기가 무엇을 만들었는지 볼 자리가 없다.
        */}
        <NewsPaper data={paper} template={templateOf(templateChoice)} />
      </div>
    );
  }

  if (state.stage === 2) {
    const feedback = state.teacherFeedback;
    return (
      <div className="block flex flex-col gap-4 bg-cream">
        {!feedback ? (
          <>
            <p className="t-headline">선생님이 보고 계세요</p>
            <p className="t-body-lg">기다리는 동안 더 고쳐도 됩니다.</p>
            {/*
              대기 시간이 빈 시간이 되지 않게 한다. 사진 설명은 실제 신문의 요소이고
              그림과 기사를 잇는 일이라, 기다리며 하기에 알맞다.
            */}
            <button
              type="button"
              onClick={() => onJump("news_caption")}
              className="pill pill-primary self-start"
            >
              그동안 사진 설명 한 줄 쓰기 →
            </button>
          </>
        ) : (
          <>
            <p className="t-eyebrow">선생님 피드백</p>
            {feedback.chips.map((chip) => (
              <p key={chip} className="t-headline">
                · {chip}
              </p>
            ))}
            {feedback.note && <p className="t-body-lg whitespace-pre-line">{feedback.note}</p>}
            <button
              type="button"
              onClick={() => void send(3)}
              disabled={busy || disabled}
              className="pill pill-primary self-start"
            >
              고쳤어요 · 최종 제출
            </button>
          </>
        )}
        {error && <p className="t-body-sm">{error}</p>}
      </div>
    );
  }

  if (state.stage === 1) {
    return (
      <div className="block flex flex-col gap-4 bg-cream">
        {!skipped && state.items.length > 0 && (
          <>
            <p className="t-headline">확인해 주세요</p>
            <ul className="flex flex-col gap-3">
              {state.items.map((item) => (
                <li key={item.code} className="flex flex-wrap items-center gap-3">
                  <span className="t-body-lg">{item.label}</span>
                  {item.field && (
                    <button
                      type="button"
                      onClick={() => onJump(item.field)}
                      className="pill pill-secondary text-sm"
                    >
                      그 칸으로
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {!skipped && state.items.length === 0 && (
          <p className="t-headline">빠진 것이 없어요. 그대로 2차로 내도 됩니다.</p>
        )}

        {blocked.length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border-2 border-ink p-4">
            <p className="t-subhead">아직 남았어요</p>
            {blocked.map((item) => (
              <div key={item.code} className="flex flex-wrap items-center gap-3">
                <span className="t-body-lg">{item.label}</span>
                {item.field && (
                  <button
                    type="button"
                    onClick={() => onJump(item.field)}
                    className="pill pill-secondary text-sm"
                  >
                    그 칸으로
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void send(2)}
            disabled={busy || disabled}
            className="pill pill-primary"
          >
            고쳤어요 · 2차 제출
          </button>
          {!skipped && (
            <button
              type="button"
              onClick={() => setSkipped(true)}
              className="pill pill-secondary"
            >
              그냥 넘어가기
            </button>
          )}
        </div>
        {error && <p className="t-body-sm">{error}</p>}
      </div>
    );
  }

  return (
    <div className="block flex flex-col gap-3 bg-cream">
      <p className="t-body-lg">{question.hint || "다 썼으면 1차로 제출하세요. 내고 나서도 고칠 수 있어요."}</p>
      <button
        type="button"
        onClick={() => void send(1)}
        disabled={busy || disabled}
        className="pill pill-primary self-start"
      >
        {busy ? "내는 중…" : "1차 제출하기"}
      </button>
      {error && <p className="t-body-sm">{error}</p>}
    </div>
  );
}

/** 활동지 칸으로 부드럽게 옮긴다. 없는 칸이면 아무 일도 안 한다 */
export function useJumpToField() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return useCallback((field: string) => {
    const node = document.getElementById(`q-${field}`);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    // 스크롤이 멎은 뒤에 커서를 준다. 바로 주면 브라우저가 스크롤을 취소한다
    timer.current = setTimeout(() => {
      const input = node.querySelector<HTMLElement>("input, textarea");
      input?.focus({ preventScroll: true });
    }, 400);
  }, []);
}
