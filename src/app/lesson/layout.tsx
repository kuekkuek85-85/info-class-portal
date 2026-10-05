import type { ReactNode } from "react";

/**
 * 학생 수업 라우트(/lesson, /lesson/history) 전용 레이아웃.
 *
 * 하는 일은 하나 — DOM 에 `.lesson-2x` 표식을 남긴다. globals.css 의
 * `html:has(.lesson-2x) { font-size: 200% }` 가 이 표식이 있을 때만 켜져서,
 * 학생 수업 화면에서만 글자가 2배가 되고 교사 화면은 기본 크기를 유지한다.
 *
 * `contents` 라 이 래퍼는 상자를 만들지 않는다 — 기존 레이아웃(flex 흐름)에 전혀
 * 영향을 주지 않으면서 표식만 심는다.
 */
export default function LessonLayout({ children }: { children: ReactNode }) {
  return <div className="lesson-2x contents">{children}</div>;
}
