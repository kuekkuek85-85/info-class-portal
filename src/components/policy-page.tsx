import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";

/**
 * 이용약관·개인정보처리방침이 함께 쓰는 틀.
 *
 * 중1이 읽는 문서다. 법률 문장을 그대로 옮기면 아무도 안 읽고, 안 읽히는 방침은
 * 없는 것과 같다. 짧은 문장과 표로 쓰고, 어려운 말이 필요하면 옆에 풀어 적는다.
 */
export function PolicyPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-line px-4 py-3">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <p className="t-body-sm font-bold">정보 수업 포털</p>
          <Link href="/" className="pill pill-secondary t-body-sm">
            돌아가기
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <h1 className="t-display">{title}</h1>
        <p className="t-caption mt-2">시행일 {updated}</p>
        <div className="mt-6 flex flex-col gap-6">{children}</div>
      </main>

      <SiteFooter />
    </div>
  );
}

/** 방침 안의 한 절 */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="t-subhead">{title}</h2>
      {children}
    </section>
  );
}
