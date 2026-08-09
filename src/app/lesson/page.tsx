"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ContentView, type Content } from "@/components/content-view";
import { MoodPicker } from "@/components/mood-picker";
import { PHASE_LABELS, type LessonPhase } from "@/lib/types";

/**
 * 오늘 수업 화면.
 *
 * 학생은 화면을 스스로 옮기지 못한다. 지금 어느 단계인지는 교사가 정하고, 학생 화면은
 * 그것을 따라간다. 30명이 제각각 다른 화면에 가 있으면 수업을 끌고 갈 수 없고,
 * 중1은 화면당 할 일이 하나여야 한다 (PRD 1, 3.2).
 */

interface LessonData {
  me: { studentId: string; name: string; classNo: number };
  session: {
    id: string;
    phase: LessonPhase;
    closed: boolean;
    lessonNo: number;
    title: string;
    moodCheckEnabled: boolean;
    game: Content;
    gameExplainer: Content;
    progress: Content;
    assessment: Content;
    video: Content;
    reflectionQuestions: string[];
    reflectionPublic: boolean;
    date: string;
    period: number;
    classNo: number;
  };
  mood: { mood: string; reason: string } | null;
  reflection: { answers: string[]; draft: boolean } | null;
  peers: { name: string; answers: string[] }[];
}

/** 입력이 멈춘 뒤 이만큼 지나면 임시저장한다. 종이 울려도 쓰던 내용이 남아야 한다. */
const AUTOSAVE_DELAY_MS = 1500;
/** 교사가 단계를 넘긴 것을 학생 화면이 알아채는 주기 */
const PHASE_POLL_MS = 4000;

export default function LessonPage() {
  const router = useRouter();
  const [data, setData] = useState<LessonData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [phase, setPhase] = useState<LessonPhase>("waiting");
  const [closed, setClosed] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);
  const previousPhase = useRef<LessonPhase>("waiting");
  const explainerShown = useRef(false);

  const [mood, setMood] = useState("");
  const [moodReason, setMoodReason] = useState("");
  const [moodSaving, setMoodSaving] = useState(false);
  const [moodSaved, setMoodSaved] = useState(false);

  const [answers, setAnswers] = useState<string[]>([]);
  const [reflectionState, setReflectionState] = useState<"idle" | "saving" | "saved" | "done">(
    "idle",
  );
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef("");
  const submitted = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await fetch("/api/student/lesson");
      const result = await response.json();
      if (cancelled) return;

      if (!result.ok) {
        // 세션 만료 — 코드부터 다시 받는다
        router.replace("/");
        setLoadError(result.message ?? "");
        return;
      }

      const payload = result as LessonData;
      setData(payload);
      setPhase(payload.session.phase);
      previousPhase.current = payload.session.phase;
      setClosed(payload.session.closed);
      setMood(payload.mood?.mood ?? "");
      setMoodReason(payload.mood?.reason ?? "");
      setMoodSaved(Boolean(payload.mood));

      const count = payload.session.reflectionQuestions.length;
      const initial = Array.from({ length: count }, (_, i) => payload.reflection?.answers[i] ?? "");
      setAnswers(initial);
      lastSaved.current = JSON.stringify(initial);
      if (payload.reflection && !payload.reflection.draft) {
        submitted.current = true;
        setReflectionState("done");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // 교사가 넘긴 단계를 따라간다
  useEffect(() => {
    if (!data) return;
    let cancelled = false;

    async function tick() {
      const response = await fetch("/api/student/phase");
      const result = await response.json();
      if (cancelled || !result.ok) return;

      const next = result.phase as LessonPhase;
      // 대기(게임)에서 수업으로 넘어가는 순간 한 번만 원리 설명을 띄운다.
      // 게임으로만 끝나면 남는 게 없다.
      if (previousPhase.current === "waiting" && next !== "waiting" && !explainerShown.current) {
        explainerShown.current = true;
        setShowExplainer(true);
      }
      previousPhase.current = next;

      setPhase(next);
      setClosed(Boolean(result.closed));
    }

    const timer = setInterval(() => void tick(), PHASE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [data]);

  const saveReflection = useCallback(async (next: string[], submit: boolean) => {
    // 예약된 자동저장을 먼저 취소한다. 제출 직후 늦게 도착한 임시저장이
    // 제출 완료 상태를 초안으로 되돌리는 것을 막는다.
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
    if (submit) submitted.current = true;

    setReflectionState("saving");
    const response = await fetch("/api/student/reflection", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: next, draft: !submitted.current }),
    });
    const result = await response.json();

    if (result.ok) {
      lastSaved.current = JSON.stringify(next);
      setReflectionState(result.draft ? "saved" : "done");
    } else {
      setReflectionState("idle");
    }
  }, []);

  // 입력 중 자동 임시저장 (PRD 3.4)
  useEffect(() => {
    if (!data || closed) return;
    if (JSON.stringify(answers) === lastSaved.current) return;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void saveReflection(answers, false);
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [answers, closed, data, saveReflection]);

  async function submitMood() {
    setMoodSaving(true);
    const response = await fetch("/api/student/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, reason: moodReason }),
    });
    const result = await response.json();
    setMoodSaving(false);
    if (result.ok) setMoodSaved(true);
  }

  if (loadError) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted">
        {loadError}
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-sm text-muted">
        불러오는 중…
      </main>
    );
  }

  const { session, me } = data;
  const answered = answers.filter((a) => a.trim()).length;
  const total = session.reflectionQuestions.length;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="t-body-sm truncate font-bold">
              {session.lessonNo}차시 · {session.title}
            </p>
            <p className="t-caption mt-0.5">
              1학년 {me.classNo}반 {me.name || "(임시 번호)"} · {PHASE_LABELS[phase]}
            </p>
          </div>
          <Link href="/lesson/history" className="pill pill-secondary t-body-sm shrink-0">
            내 기록
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5">
        {closed && (
          <p className="mb-5 rounded-md bg-surface px-4 py-3 text-center t-body-sm">
            이 수업은 끝났어요. 내가 쓴 것은 볼 수 있지만 더 저장되지는 않아요.
          </p>
        )}

        {phase === "waiting" &&
          (session.game.url ? (
            /*
              먼저 온 학생이 5분을 기다리기도 한다 (태블릿 부팅, 주소 오타).
              그 시간에 게임을 띄운다. 수업이 시작되면 화면이 저절로 넘어가므로
              학생이 게임을 끄고 나올 필요가 없다.
            */
            <section className="flex flex-col gap-4">
              <div className="block bg-lime">
                <h2 className="t-headline">{session.game.heading || "기다리는 동안"}</h2>
                {session.game.body && (
                  <p className="t-body mt-2 whitespace-pre-wrap">{session.game.body}</p>
                )}
                <p className="t-body-sm mt-3">
                  선생님이 수업을 시작하면 이 화면은 저절로 넘어가요.
                </p>
              </div>

              <div className="overflow-hidden rounded-lg border border-line">
                <iframe
                  src={session.game.url}
                  title={session.game.heading || "대기 중 게임"}
                  className="h-[70vh] w-full"
                  allow="fullscreen"
                />
              </div>
            </section>
          ) : (
            <Placeholder
              title="잠시만 기다려 주세요"
              description="선생님이 시작하면 화면이 저절로 바뀝니다."
            />
          ))}

        {phase === "done" && (
          <Placeholder title="오늘 수업 끝!" description="고생했어요. 태블릿을 정리해 주세요." />
        )}

        {phase === "mood" && session.moodCheckEnabled && (
          <MoodPicker
            value={mood}
            reason={moodReason}
            onChange={setMood}
            onReasonChange={setMoodReason}
            onSubmit={submitMood}
            saving={moodSaving}
            saved={moodSaved}
            disabled={closed}
          />
        )}

        {phase === "progress" && <ContentView content={session.progress} fallback="진도 안내" />}
        {phase === "assessment" && (
          <ContentView content={session.assessment} fallback="평가 안내" />
        )}

        {/*
          영상은 교실 앞 전자칠판으로 다 같이 본다. 태블릿에는 영상을 띄우지 않고,
          시청 중에 생각할 질문만 크게 보여준다. 화면을 꽉 채워 다른 데로 눈이 가지 않게 한다.
        */}
        {phase === "video" && (
          <section className="flex flex-col gap-6">
            <div className="block bg-navy text-center text-inverse-ink">
              <p className="t-display">📺 영상 시청 중</p>
              <p className="t-body-lg mt-3">앞 화면을 봐 주세요. 태블릿은 잠시 내려놓아도 됩니다.</p>
              {session.video.body && (
                <p className="t-body-sm mt-5 whitespace-pre-wrap text-left opacity-80">
                  {session.video.body}
                </p>
              )}
            </div>

            {session.reflectionQuestions.length > 0 && (
              <div className="flex flex-col gap-3">
                <h2 className="t-eyebrow text-center">영상을 보면서 생각할 것</h2>
                {session.reflectionQuestions.map((question, index) => (
                  <div key={index} className="block bg-lime t-subhead">
                    <span className="mr-2 font-bold">{index + 1}.</span>
                    {question}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {phase === "reflection" && (
          <section className="flex flex-col gap-6">
            <div>
              <h2 className="t-display">오늘의 성찰</h2>
              <p className="t-body mt-2">
                {total}개 질문에 모두 답해 주세요. ({answered}/{total} 작성)
              </p>
            </div>

            {session.reflectionQuestions.map((question, index) => (
              <div key={index} className="flex flex-col gap-3">
                <label htmlFor={`answer-${index}`} className="block bg-cream t-subhead">
                  <span className="mr-2 font-bold">{index + 1}.</span>
                  {question}
                </label>
                <textarea
                  id={`answer-${index}`}
                  value={answers[index] ?? ""}
                  onChange={(event) =>
                    setAnswers((prev) =>
                      prev.map((value, i) => (i === index ? event.target.value : value)),
                    )
                  }
                  rows={3}
                  maxLength={1000}
                  disabled={closed}
                  placeholder="여기에 적어 주세요"
                  className="field disabled:opacity-60"
                />
              </div>
            ))}

            <span className="t-caption" aria-live="polite">
              {reflectionState === "saving" && "저장 중…"}
              {reflectionState === "saved" && "자동 저장됨"}
              {reflectionState === "done" && "제출 완료"}
              {reflectionState === "idle" && "쓰는 동안 자동으로 저장돼요"}
            </span>

            <button
              type="button"
              onClick={() => saveReflection(answers, true)}
              disabled={answered === 0 || reflectionState === "saving" || closed}
              className="pill pill-primary pill-block"
            >
              {reflectionState === "done" ? "다시 제출하기" : "제출하기"}
            </button>

            {answered < total && answered > 0 && (
              <p className="t-body-sm text-center">
                아직 답하지 않은 질문이 {total - answered}개 있어요.
              </p>
            )}

            {session.reflectionPublic && data.peers.length > 0 && (
              <section className="mt-2 flex flex-col gap-3">
                <h3 className="t-eyebrow">친구들의 성찰</h3>
                <ul className="flex flex-col gap-3">
                  {data.peers.map((peer, index) => (
                    <li key={index} className="card">
                      <span className="t-body-sm font-bold">{peer.name}</span>
                      {peer.answers.map(
                        (answer, i) =>
                          answer.trim() && (
                            <p key={i} className="t-body mt-2 whitespace-pre-wrap">
                              <span className="font-bold">{i + 1}. </span>
                              {answer}
                            </p>
                          ),
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </section>
        )}
      </main>

      {/* 게임으로만 끝나지 않게 — 수업이 시작되는 순간 원리를 한 번 짚어 준다 */}
      {showExplainer && (
        <ExplainerModal
          content={session.gameExplainer}
          onClose={() => setShowExplainer(false)}
        />
      )}
    </div>
  );
}

function ExplainerModal({ content, onClose }: { content: Content; onClose: () => void }) {
  const hasAnything =
    content.heading || content.body || content.cards?.length || content.tabs?.length;
  if (!hasAnything) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="explainer-title"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-lg bg-canvas p-6 sm:rounded-lg">
        <p className="t-eyebrow">방금 한 게임의 원리</p>
        <h2 id="explainer-title" className="t-display mt-2">
          {content.heading}
        </h2>

        {content.body && <p className="t-body-lg mt-4 whitespace-pre-wrap">{content.body}</p>}

        {content.cards && content.cards.length > 0 && (
          <div className="mt-5 flex flex-col gap-3">
            {content.cards.map((card, index) => (
              <article
                key={index}
                className={`block ${["bg-lime", "bg-mint", "bg-cream", "bg-lilac"][index % 4]}`}
              >
                <header className="flex flex-wrap items-baseline gap-x-3">
                  {card.badge && (
                    <span className="rounded-full bg-ink px-3 py-1 text-sm font-semibold text-canvas">
                      {card.badge}
                    </span>
                  )}
                  <h3 className="t-card-title">{card.title}</h3>
                </header>
                {card.lines.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-2">
                    {card.lines.map((line, i) => (
                      <li key={i} className="t-body-lg">
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}

        <button type="button" onClick={onClose} className="pill pill-primary pill-block mt-6">
          알겠어요, 수업 시작!
        </button>
      </div>
    </div>
  );
}

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <section className="block flex flex-col items-center justify-center gap-3 bg-lilac py-20 text-center">
      <h2 className="t-display">{title}</h2>
      <p className="t-body-lg">{description}</p>
    </section>
  );
}
