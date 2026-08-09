"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { MoodPicker } from "@/components/mood-picker";
import { PHASE_LABELS, type LessonPhase } from "@/lib/types";

/**
 * 오늘 수업 화면.
 *
 * 학생은 화면을 스스로 옮기지 못한다. 지금 어느 단계인지는 교사가 정하고, 학생 화면은
 * 그것을 따라간다. 30명이 제각각 다른 화면에 가 있으면 수업을 끌고 갈 수 없고,
 * 중1은 화면당 할 일이 하나여야 한다 (PRD 1, 3.2).
 */

interface Content {
  heading: string;
  body: string;
  url: string;
}

interface LessonData {
  me: { studentId: string; name: string; classNo: number };
  session: {
    id: string;
    phase: LessonPhase;
    closed: boolean;
    lessonNo: number;
    title: string;
    moodCheckEnabled: boolean;
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
      setPhase(result.phase as LessonPhase);
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
      <header className="sticky top-0 z-10 border-b border-line bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {session.lessonNo}차시 · {session.title}
            </p>
            <p className="text-xs text-muted">
              1학년 {me.classNo}반 {me.name || "(임시 번호)"} · 지금은{" "}
              <span className="font-medium text-accent">{PHASE_LABELS[phase]}</span>
            </p>
          </div>
          <Link
            href="/lesson/history"
            className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs"
          >
            내 기록
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5">
        {closed && (
          <p className="mb-4 rounded-xl border border-line bg-card px-4 py-3 text-center text-sm text-muted">
            이 수업은 끝났어요. 내가 쓴 것은 볼 수 있지만 더 저장되지는 않아요.
          </p>
        )}

        {phase === "waiting" && (
          <Placeholder
            title="잠시만 기다려 주세요"
            description="선생님이 시작하면 화면이 저절로 바뀝니다."
          />
        )}

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
        {phase === "video" && <ContentView content={session.video} fallback="영상 시청" tall />}

        {phase === "reflection" && (
          <section className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold">오늘의 성찰</h2>
              <p className="mt-1 text-sm text-muted">
                {total}개 질문에 모두 답해 주세요. ({answered}/{total} 작성)
              </p>
            </div>

            {session.reflectionQuestions.map((question, index) => (
              <div key={index} className="flex flex-col gap-2">
                <label
                  htmlFor={`answer-${index}`}
                  className="rounded-xl border border-line bg-card px-4 py-3 text-base leading-relaxed"
                >
                  <span className="mr-1 font-semibold text-accent">{index + 1}.</span>
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
                  className="w-full rounded-xl border border-line bg-card px-3 py-3 text-base leading-relaxed outline-none focus:border-accent disabled:opacity-60"
                />
              </div>
            ))}

            <div className="flex items-center justify-between text-xs text-muted">
              <span aria-live="polite">
                {reflectionState === "saving" && "저장 중…"}
                {reflectionState === "saved" && "자동 저장됨"}
                {reflectionState === "done" && "제출 완료"}
                {reflectionState === "idle" && "쓰는 동안 자동으로 저장돼요"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => saveReflection(answers, true)}
              disabled={answered === 0 || reflectionState === "saving" || closed}
              className="h-14 rounded-2xl bg-accent text-lg font-semibold text-white transition active:scale-95 disabled:opacity-40"
            >
              {reflectionState === "done" ? "다시 제출하기" : "제출하기"}
            </button>

            {answered < total && answered > 0 && (
              <p className="text-center text-xs text-muted">
                아직 답하지 않은 질문이 {total - answered}개 있어요.
              </p>
            )}

            {session.reflectionPublic && data.peers.length > 0 && (
              <section className="mt-4 flex flex-col gap-2">
                <h3 className="text-sm font-semibold">친구들의 성찰</h3>
                <ul className="flex flex-col gap-2">
                  {data.peers.map((peer, index) => (
                    <li
                      key={index}
                      className="rounded-xl border border-line bg-card px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{peer.name}</span>
                      {peer.answers.map(
                        (answer, i) =>
                          answer.trim() && (
                            <p key={i} className="mt-1 whitespace-pre-wrap leading-relaxed">
                              <span className="text-muted">{i + 1}. </span>
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
    </div>
  );
}

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <section className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-card px-6 py-16 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted">{description}</p>
    </section>
  );
}

function ContentView({
  content,
  fallback,
  tall,
}: {
  content: Content;
  fallback: string;
  tall?: boolean;
}) {
  const hasAnything = content.heading || content.body || content.url;

  if (!hasAnything) {
    return (
      <Placeholder title={fallback} description="선생님 화면을 봐 주세요." />
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{content.heading || fallback}</h2>

      {content.body && (
        <p className="whitespace-pre-wrap rounded-xl border border-line bg-card px-4 py-3 text-base leading-relaxed">
          {content.body}
        </p>
      )}

      {content.url && (
        <div className="overflow-hidden rounded-2xl border border-line bg-card">
          <iframe
            src={content.url}
            title={content.heading || fallback}
            className={tall ? "aspect-video w-full" : "h-[60vh] w-full"}
            allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
          />
        </div>
      )}
    </section>
  );
}
