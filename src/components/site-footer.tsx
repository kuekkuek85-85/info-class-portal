import Link from "next/link";

/**
 * 모든 화면 아래에 붙는 줄.
 *
 * 이용약관·개인정보처리방침은 "있으면 좋은 것"이 아니라 **9월 개인정보 단원의 교재**다.
 * 학생이 자기가 쓰는 서비스의 방침을 직접 열어 보고 "무엇을 모으는지"를 읽는 경험이
 * 수업 내용과 그대로 이어진다. 그래서 학생 화면에서도 감춰 두지 않는다.
 *
 * 화면 아래 끝에 붙되 본문을 밀지 않는다 — 그리기·퀴즈 화면의 높이 계산에 끼어들면
 * 캔버스가 잘린다.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line px-4 py-4">
      <nav className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1 t-caption">
        <Link href="/terms" className="underline underline-offset-4">
          이용약관
        </Link>
        <Link href="/privacy" className="underline underline-offset-4">
          개인정보처리방침
        </Link>
        <span>장평중학교 정보과</span>
      </nav>
    </footer>
  );
}
