"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { MoodPicker } from "@/components/mood-picker";

/**
 * 오늘 수업 화면.
 *
 * 진입 직후 오늘 그 교시 수업이 바로 열린다. 날짜·교시를 고르는 단계를 두지 않는다
 * (30명 × 클릭 1회 ≒ 1분). 탭 하나에 할 일 하나만 둔다 — 중1 대상 설계 (PRD 1, 3.2).
 */

type Tab = "slide" | "mood" | "reflection";

interface LessonData {
  me: { studentId: string; name: string; classNo: number };
  session: {
    id: string;
    lessonNo: number;
    title: string;
    slideUrl: string;
    reflectionQuestion: string;
    moodCheckEnabled: boolean;
    reflectionPublic: boolean;
    date: string;
    period: number;
    classNo: number;
  };
  mood: { mood: string; reason: string } | null;
  reflection: { content: string; draft: boolean } | null;
  peers: { name: string; content: string }[];
}

/** 입력이 멈춘 뒤 이만큼 지나면 임시저장한다. 종이 울려도 쓰던 내용이 남아야 한다. */
const AUTOSAVE_DELAY_MS = 1500;

export default function LessonPage() {
  const router = useRouter();
  const [data, setData] = useState<LessonData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<Tab>("slide");

  const [mood, setMood] = useState("");
  const [moodReason, setMoodReason] = useState("");
  const [moodSaving, setMoodSaving] = useState(false);
  const [moodSaved, setMoodSaved] = useState(false);

  const [reflection, setReflection] = useState("");
  const [reflectionState, setReflectionState] = useState<"idle" | "saving" | "saved" | "done">(
    "idle",
  );
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef("");

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
      setMood(payload.mood?.mood ?? "");
      setMoodReason(payload.mood?.reason ?? "");
      setMoodSaved(Boolean(payload.mood));
      setReflection(payload.reflection?.content ?? "");
      lastSaved.current = payload.reflection?.content ?? "";
      if (payload.reflection && !payload.reflection.draft) setReflectionState("done");
      // 슬라이드가 없는 차시면 바로 할 일이 있는 탭으로 보낸다
      if (!payload.session.slideUrl) {
        setTab(payload.session.moodCheckEnabled ? "mood" : "reflection");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const saveReflection = useCallback(async (content: string, draft: boolean) => {
    setReflectionState("saving");
    const response = await fetch("/api/student/reflection", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, draft }),
    });
    const result = await response.json();
    if (result.ok) {
      lastSaved.current = content;
      setReflectionState(draft ? "saved" : "done");
    } else {
      setReflectionState("idle");
    }
  }, []);

  // 입력 중 자동 임시저장 (PRD 3.4)
  useEffect(() => {
    if (!data) return;
    if (reflection === lastSaved.current) return;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void saveReflection(reflection, true);
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [data, reflection, saveReflection]);

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
  const tabs: { key: Tab; label: string; hidden?: boolean }[] = [
    { key: "slide", label: "수업", hidden: !session.slideUrl },
    { key: "mood", label: "기분", hidden: !session.moodCheckEnabled },
    { key: "reflection", label: "성찰" },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {session.lessonNo}차시 · {session.title}
            </p>
            <p className="text-xs text-muted">
              1학년 {me.classNo}반 {me.name || "(임시 번호)"}
            </p>
          </div>
          <Link
            href="/lesson/history"
            className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs"
          >
            내 기록
          </Link>
        </div>

        <nav className="mx-auto mt-3 flex w-full max-w-3xl gap-2" aria-label="수업 활동">
          {tabs
            .filter((item) => !item.hidden)
            .map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                aria-current={tab === item.key ? "page" : undefined}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  tab === item.key
                    ? "bg-accent text-white"
                    : "border border-line bg-card text-muted"
                }`}
              >
                {item.label}
              </button>
            ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5">
        {tab === "slide" && session.slideUrl && (
          <section className="flex flex-col gap-3">
            {/*
              유튜브 등 외부 영상은 슬라이드 안에 심어둔다. 새 창으로 열면 학생 화면이
              각자 흩어진다 (PRD 3.2). 그래서 여기서는 슬라이드만 임베드한다.
            */}
            <div className="overflow-hidden rounded-2xl border border-line bg-card">
              <iframe
                src={session.slideUrl}
                title={`${session.lessonNo}차시 수업 슬라이드`}
                className="h-[70vh] w-full"
                allow="fullscreen; autoplay; encrypted-media"
              />
            </div>
            <a
              href={session.slideUrl}
              target="_blank"
              rel="noreferrer"
              className="text-center text-sm text-muted underline underline-offset-4"
            >
              화면이 안 보이면 여기를 눌러 새 창으로 열기
            </a>
          </section>
        )}

        {tab === "mood" && session.moodCheckEnabled && (
          <MoodPicker
            value={mood}
            reason={moodReason}
            onChange={setMood}
            onReasonChange={setMoodReason}
            onSubmit={submitMood}
            saving={moodSaving}
            saved={moodSaved}
          />
        )}

        {tab === "reflection" && (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold">오늘의 한 줄 성찰</h2>
              <p className="mt-2 whitespace-pre-wrap rounded-xl border border-line bg-card px-4 py-3 text-base leading-relaxed">
                {session.reflectionQuestion || "오늘 배운 것과 느낀 점을 한 줄로 적어 주세요."}
              </p>
            </div>

            <textarea
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
              rows={6}
              maxLength={1000}
              placeholder="여기에 적어 주세요"
              className="w-full rounded-xl border border-line bg-card px-3 py-3 text-base leading-relaxed outline-none focus:border-accent"
            />

            <div className="flex items-center justify-between text-xs text-muted">
              <span aria-live="polite">
                {reflectionState === "saving" && "저장 중…"}
                {reflectionState === "saved" && "자동 저장됨"}
                {reflectionState === "done" && "제출 완료"}
                {reflectionState === "idle" && "쓰는 동안 자동으로 저장돼요"}
              </span>
              <span>{reflection.length} / 1000</span>
            </div>

            <button
              type="button"
              onClick={() => saveReflection(reflection, false)}
              disabled={!reflection.trim() || reflectionState === "saving"}
              className="h-14 rounded-2xl bg-accent text-lg font-semibold text-white transition active:scale-95 disabled:opacity-40"
            >
              {reflectionState === "done" ? "다시 제출하기" : "제출하기"}
            </button>

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
                      <p className="mt-1 whitespace-pre-wrap leading-relaxed">{peer.content}</p>
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
