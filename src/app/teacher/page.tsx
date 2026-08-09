"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { isClientConfigured, signInWithGoogle } from "@/lib/firebase-client";

/** 교사 로그인. 학생 동선과 완전히 분리된 경로다 (PRD 4). */
export default function TeacherLoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const configured = isClientConfigured();

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
    setBusy(true);
    setError("");
    try {
      const idToken = await signInWithGoogle();
      const response = await fetch("/api/teacher/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const result = await response.json();

      if (!result.ok) {
        setError(result.message ?? "로그인하지 못했습니다.");
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
        <p className="mt-2 text-sm text-muted">
          허용된 Google 계정만 들어올 수 있습니다.
        </p>
      </header>

      {!configured && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
          Firebase 웹 앱 환경변수(<code>NEXT_PUBLIC_FIREBASE_*</code>)가 아직 설정되지 않았습니다.
          README의 “Firebase 설정” 절차를 먼저 진행하세요.
        </p>
      )}

      <button
        type="button"
        onClick={login}
        disabled={busy || !configured}
        className="h-14 rounded-2xl bg-accent text-base font-semibold text-white transition active:scale-95 disabled:opacity-40"
      >
        {busy ? "로그인 중…" : "Google 계정으로 로그인"}
      </button>

      {error && (
        <p className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
          {error}
        </p>
      )}
    </main>
  );
}
