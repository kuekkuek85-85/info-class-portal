"use client";

import { useEffect, useState } from "react";

import { ArtifactCanvas } from "@/components/artifact-canvas";
import { TeacherShell } from "@/components/teacher-shell";
import { todayKST } from "@/lib/datetime";
import { pickCurrentSession } from "@/lib/pick-session";
import { QUADRANTS, type Quadrant } from "@/lib/mood";
import type { Review } from "@/lib/review";
import { usePolled } from "@/lib/use-polled";

/**
 * 교실 앞 화면에 띄우는 공유용 감정 집계 — **익명**.
 *
 * 이 화면이 쓰는 /api/teacher/board 응답에는 학번·이름·이유가 아예 들어 있지 않다.
 * 전체 공유 화면에 실수로 개인 응답이 뜨는 사고를 데이터 단계에서 막는다 (PRD 3.3).
 * 개별 응답은 대시보드에서만 본다.
 */

interface Count {
  key: string;
  label: string;
  quadrant: Quadrant;
  count: number;
}

interface BoardData {
  session: { id: string; classNo: number; lessonNo: number; title: string; period: number };
  total: number;
  counts: Count[];
  byQuadrant: Record<Quadrant, number>;
}

interface SessionOption {
  id: string;
  classNo: number;
  period: number;
  lessonNo: number;
  title: string;
  status: "scheduled" | "active" | "ended";
}

const POLL_INTERVAL_MS = 5000;

/** 복습 문항 선지 앞에 붙이는 기호 — 앞 화면에서 "2번요" 라고 말할 수 있게 */
const CHOICE_MARKS = ["①", "②", "③", "④", "⑤"];

/**
 * 화면 배치가 곧 무드미터 축이다. 위 = 기운 높음, 오른쪽 = 기분 좋음.
 * 학생 화면(`mood-picker.tsx`의 ORDER)과 반드시 같은 순서여야 한다.
 */
const GRID: Quadrant[] = ["red", "yellow", "blue", "green"];

export default function BoardPage() {
  return (
    <TeacherShell>
      <Board />
    </TeacherShell>
  );
}

function Board() {
  const [picked, setPicked] = useState("");
  const [tab, setTab] = useState<"mood" | "review">("mood");

  const { data: sessionList } = usePolled<{ sessions: SessionOption[] }>(
    `/api/teacher/sessions?date=${todayKST()}`,
  );
  const sessions = sessionList?.sessions ?? [];

  // 고르지 않았으면 "지금 하는 수업"을 쓴다. 오늘 첫 수업을 기본값으로 두면 3교시에
  // 2교시 반의 기분이 교실 앞 화면에 뜬다 — 다른 반 데이터가 노출되는 셈이다.
  const sessionId = picked || pickCurrentSession(sessions)?.id || "";

  const { data } = usePolled<BoardData>(
    sessionId && tab === "mood" ? `/api/teacher/board?sessionId=${sessionId}` : null,
    POLL_INTERVAL_MS,
  );

  /*
   * 복습은 폴링하지 않는다 — 지난 시간 기록이라 도중에 바뀌지 않는다.
   * 기분 집계와 달리 새로 들어오는 응답을 기다릴 이유가 없다.
   */
  const { data: reviewData } = usePolled<{ review: Review | null }>(
    sessionId && tab === "review" ? `/api/teacher/review?sessionId=${sessionId}` : null,
  );
  const review = reviewData?.review ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">
            {tab === "mood" ? "우리 반 기분" : "지난 시간에 우리 반은"}
          </h1>
          <p className="text-sm text-muted">
            {tab === "mood"
              ? "이름과 적은 이유는 이 화면에 나오지 않습니다. 교실 앞 화면에 띄워도 됩니다."
              : "학생 태블릿에 뜨는 것과 같은 화면입니다. 누가 그렸는지·썼는지는 나오지 않습니다."}
          </p>
        </div>
        <select
          value={sessionId}
          onChange={(event) => setPicked(event.target.value)}
          className="rounded-lg border border-line bg-card px-3 py-2 text-sm"
        >
          {sessions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.period}교시 · {item.classNo}반 · {item.lessonNo}차시
            </option>
          ))}
        </select>
      </div>

      {/*
        기분과 복습을 한 화면에 세로로 쌓지 않고 탭으로 나눈다. 교실 앞 화면은 한 번에
        하나만 보여야 학생 시선이 흩어지지 않는다.
      */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("mood")}
          className={`rounded-xl border px-4 py-2 text-sm font-medium ${
            tab === "mood" ? "border-accent bg-accent/10" : "border-line bg-card"
          }`}
        >
          우리 반 기분
        </button>
        <button
          type="button"
          onClick={() => setTab("review")}
          className={`rounded-xl border px-4 py-2 text-sm font-medium ${
            tab === "review" ? "border-accent bg-accent/10" : "border-line bg-card"
          }`}
        >
          지난 차시 리뷰
        </button>
      </div>

      {tab === "review" && (
        <ReviewBoard review={review} loading={Boolean(sessionId) && !reviewData} />
      )}

      {sessions.length === 0 && (
        <p className="rounded-xl border border-line bg-card px-4 py-6 text-center text-sm text-muted">
          오늘 등록된 수업이 없습니다.
        </p>
      )}

      {tab === "mood" && sessionId && !data && <p className="text-sm text-muted">불러오는 중…</p>}

      {tab === "mood" && data && (
        <>
          <p className="text-sm text-muted">
            {data.session.classNo}반 · 응답 <b className="text-foreground">{data.total}</b>명
          </p>

          <div className="grid grid-cols-2 gap-2">
            {GRID.map((quadrant) => (
              <section
                key={quadrant}
                className={`rounded-2xl border p-3 ${QUADRANTS[quadrant].className}`}
              >
                <header className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-zinc-600 dark:text-zinc-300">
                    {QUADRANTS[quadrant].description}
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    {data.byQuadrant[quadrant]}명
                  </span>
                </header>

                <div className="grid grid-cols-2 gap-2">
                  {data.counts
                    .filter((item) => item.quadrant === quadrant)
                    .map((item) => (
                      <div
                        key={item.key}
                        className={`flex h-20 flex-col items-center justify-center rounded-xl ${
                          item.count > 0 ? "bg-white dark:bg-black/40" : "bg-white/40 dark:bg-black/10"
                        }`}
                      >
                        <span className="text-2xl font-bold tabular-nums">
                          {item.count > 0 ? item.count : ""}
                        </span>
                        <span
                          className={`text-xs ${
                            item.count > 0 ? "" : "text-zinc-400 dark:text-zinc-600"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                    ))}
                </div>
              </section>
            ))}
          </div>

          <p className="text-center text-xs text-muted">↑ 기운이 높음 · → 기분이 좋음</p>
        </>
      )}
    </div>
  );
}

/**
 * 교실 앞 화면에 띄우는 지난 차시 복습.
 *
 * 학생 태블릿과 같은 재료를 쓰되 크게 그린다. 학생만 혼자 훑고 끝나면 남는 것이 없다 —
 * 교사가 앞에서 같은 것을 보며 자기 말로 짚어 주는 것이 이 화면의 목적이다.
 *
 * 그래서 학생 화면에 없는 두 가지가 여기 있다.
 *  · 교사용 한 줄 — "이 반은 무엇을 다시 짚어야 하는지"
 *  · 정답 보기 버튼 — 학생이 다 고른 뒤 교사가 눌러서 함께 확인한다
 */
function ReviewBoard({ review, loading }: { review: Review | null; loading: boolean }) {
  const [slide, setSlide] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const drawings = review?.drawings ?? [];

  useEffect(() => {
    if (drawings.length <= 1) return;
    // 학생 화면과 같은 3초. 앞 화면과 태블릿이 따로 놀면 "어느 걸 보라는 거지"가 된다.
    const timer = setInterval(() => {
      setSlide((current) => (current + 1) % drawings.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [drawings.length]);

  if (loading) return <p className="text-sm text-muted">불러오는 중…</p>;

  if (!review) {
    return (
      <p className="rounded-xl border border-line bg-card px-4 py-10 text-center text-sm text-muted">
        지난 차시 기록이 없습니다. 1차시이거나, 지난 시간에 남은 것이 없는 경우입니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 교사만 읽는 줄. 학생 태블릿에는 내려가지 않는다 */}
      {review.summary && (
        <p className="rounded-xl border border-accent bg-accent/10 px-4 py-3 text-sm">
          <b>선생님께</b> — {review.summary}
        </p>
      )}

      <p className="text-sm text-muted">
        지난 {review.lessonNo}차시 · {review.title}
      </p>

      {drawings.length > 0 && (
        <div className="flex flex-col gap-2">
          <ArtifactCanvas
            key={slide}
            strokes={drawings[slide].strokes}
            texts={drawings[slide].texts}
            pixelWidth={1200}
            className="mx-auto h-auto w-full max-w-4xl rounded-2xl border-2 border-line bg-white"
          />
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
            <p className="text-lg font-bold">
              {drawings[slide].year}년의 {drawings[slide].place || "어딘가"}
            </p>
            <p className="text-sm text-muted tabular-nums">
              {slide + 1} / {drawings.length}
            </p>
          </div>
        </div>
      )}

      {review.quotes.length > 0 && (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2">
          <h2 className="text-xs text-muted">친구들이 쓴 말</h2>
          {review.quotes.map((quote) => (
            <p key={quote} className="rounded-xl bg-card px-4 py-3 text-lg">
              “{quote}”
            </p>
          ))}
        </div>
      )}

      {review.question && (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 rounded-2xl border border-line bg-card p-5">
          <h2 className="text-xl font-bold">다시 한 번 — {review.question.prompt}</h2>

          <ul className="flex flex-col gap-2">
            {review.question.choices.map((choice, index) => {
              const right = index === review.question!.answerIndex;
              return (
                <li
                  key={choice}
                  className={`rounded-xl border px-4 py-3 text-lg ${
                    revealed && right
                      ? "border-accent bg-accent/10 font-bold"
                      : "border-line opacity-90"
                  }`}
                >
                  {CHOICE_MARKS[index] ?? "·"} {choice}
                </li>
              );
            })}
          </ul>

          {!revealed ? (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              정답 보기 — 학생이 다 고른 뒤에 누르세요
            </button>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted">
                지난 시간 이 반의 정답률 {review.question.percent}%
              </p>
              {review.question.nowText && (
                <p className="text-lg">지금은 — {review.question.nowText}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
