"use client";

import { RecordCommentPanel } from "@/components/record-comment-panel";
import { TeacherShell } from "@/components/teacher-shell";

/**
 * 생기부 세특 초안 — 상단 네비(데이터 옆) 전용 페이지.
 *
 * 수업(세션)과 무관한 교사 도구라 대시보드 하단이 아니라 별도 메뉴로 둔다.
 * 패널은 열 때 한 번만 읽는다(로스터 전체 읽기라 폴링 없음).
 */
export default function RecordCommentsPage() {
  return (
    <TeacherShell>
      <RecordCommentPanel />
    </TeacherShell>
  );
}
