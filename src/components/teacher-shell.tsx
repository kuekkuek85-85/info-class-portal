"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { signOutGoogle } from "@/lib/firebase-client";

/** 교사 화면 공통 껍데기. 세션이 없으면 로그인 화면으로 돌려보낸다. */

const NAV = [
  { href: "/teacher/dashboard", label: "대시보드" },
  { href: "/teacher/screen", label: "영상 재생" },
  { href: "/teacher/board", label: "공유 화면" },
  { href: "/teacher/lessons", label: "차시" },
  { href: "/teacher/schedule", label: "시간표" },
  { href: "/teacher/students", label: "명렬표" },
  { href: "/teacher/data", label: "데이터" },
] as const;

export function TeacherShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<{ email: string; name: string } | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function check() {
      const response = await fetch("/api/teacher/session");
      const result = await response.json();
      if (result.ok) setMe({ email: result.email, name: result.name });
      else router.replace("/teacher");
      setChecked(true);
    }
    void check();
  }, [router]);

  async function logout() {
    await fetch("/api/teacher/session", { method: "DELETE" });
    await signOutGoogle();
    router.replace("/teacher");
  }

  if (!checked) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-muted">확인 중…</main>
    );
  }
  if (!me) return null;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-line bg-canvas">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-baseline gap-3">
            <span className="t-body font-bold">정보 수업 포털</span>
            <span className="t-caption">{me.name || me.email}</span>
          </div>
          <button type="button" onClick={logout} className="pill pill-secondary t-body-sm">
            로그아웃
          </button>
        </div>

        <nav className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`pill t-body-sm shrink-0 ${active ? "pill-primary" : "pill-secondary"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

      <SiteFooter />
    </div>
  );
}
