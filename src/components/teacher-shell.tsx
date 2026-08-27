"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { formatDateKorean, todayKST } from "@/lib/datetime";
import { signOutGoogle } from "@/lib/firebase-client";
import { useTeacherDate } from "@/lib/teacher-date";

/** 교사 화면 공통 껍데기. 세션이 없으면 로그인 화면으로 돌려보낸다. */

/**
 * 날짜를 함께 쓰는 화면들.
 *
 * 이 셋만 "어느 날 수업이냐" 를 따진다. 차시·시간표·명렬표·데이터는 날짜의 뜻이 달라서
 * (시간표는 만들 기간, 차시는 편집 대상) 여기에 끼우면 오히려 헷갈린다.
 */
const DATED = ["/teacher/dashboard", "/teacher/screen", "/teacher/board"];

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
  const [date, setDate] = useTeacherDate();

  const dated = DATED.includes(pathname);
  const notToday = date !== todayKST();

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
        {/*
          날짜를 여기 한 곳에 둔다.

          화면마다 따로 들고 있었더니, 대시보드에서 지난 날짜를 골라 놓고 공유 화면으로
          넘어가면 오늘로 돌아갔다. 지난 학급 작품을 보여주려던 흐름이 거기서 끊긴다.
        */}
        {dated && (
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 pb-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">날짜</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="rounded-lg border border-line bg-card px-3 py-2"
              />
            </label>

            {/*
              오늘이 아니면 반드시 눈에 걸리게 한다. 모르고 단계 버튼을 누르면 교사는
              학생 화면이 안 바뀐다고 생각하고 계속 누르게 된다.
            */}
            {notToday && (
              <span className="flex flex-wrap items-center gap-2 rounded-full bg-coral px-3 py-1.5 text-sm font-semibold">
                오늘이 아닙니다 — {formatDateKorean(date)} 을 보고 있어요
                <button
                  type="button"
                  onClick={() => setDate(todayKST())}
                  className="pill pill-primary text-sm"
                >
                  오늘로
                </button>
              </span>
            )}
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

      <SiteFooter />
    </div>
  );
}
