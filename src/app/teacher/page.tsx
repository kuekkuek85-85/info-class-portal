"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** 교사 로그인 — 6자리 교사 핀. 학생 동선과 완전히 분리된 경로다 (PRD 4). */
export default function TeacherLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 이미 로그인돼 있으면 대시보드로 넘긴다
  useEffect(() => {
    async function check() {
      const response = await fetch("/api/teacher/session");
      const result = await response.json();
      if (result.ok) router.replace("/teacher/dashboard");
    }
    void check();
  }, [router]);

  async function login() {
    if (busy || pin.length < 6) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/teacher/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const result = await response.json();

      if (!result.ok) {
        setError(result.message ?? "로그인하지 못했습니다.");
        setPin("");
        return;
      }
      router.replace("/teacher/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "로그인하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-10">
      <header>
        <h1 className="text-2xl font-bold">교사 로그인</h1>
        <p className="mt-2 text-sm text-muted">교사 핀 6자리를 입력하세요.</p>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void login();
        }}
        className="flex flex-col gap-4"
      >
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={6}
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="••••••"
          aria-label="교사 핀 6자리"
          className="h-16 w-full rounded-2xl border-2 border-ink bg-canvas px-4 text-center text-3xl tracking-[0.4em] outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || pin.length < 6}
          className="h-14 rounded-2xl bg-accent text-base font-semibold text-white transition active:scale-95 disabled:opacity-40"
        >
          {busy ? "확인 중…" : "로그인"}
        </button>
      </form>

      {error && (
        <p className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
          {error}
        </p>
      )}
    </main>
  );
}
