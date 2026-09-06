"use client";

/**
 * 챗봇 출처 칩 → 대시보드 점프용 한 번짜리 쪽지.
 *
 * 챗봇이 "이 감정 기록은 8월 31일 7차시" 라고 답할 때, 칩을 누르면 그 날짜·세션으로
 * 대시보드가 열려야 한다. 그런데 대시보드의 "고른 수업"은 화면 안 지역 상태이고,
 * 날짜는 `teacher-date`(sessionStorage)라 주소로 실어 나를 수가 없다.
 *
 * 그래서 `teacher-date` 와 똑같이 sessionStorage 에 쪽지를 남긴다. 챗봇이 날짜를 맞추고
 * 세션ID 를 여기 적어 둔 뒤 대시보드로 이동하면, 대시보드가 마운트될 때 한 번 읽어
 * 그 수업을 골라 놓고 쪽지를 지운다. 새로고침해도 다시 튀지 않게 **읽으면 사라진다.**
 */

const KEY = "teacher-jump";

export interface JumpTarget {
  date: string;
  sessionId?: string;
}

export function setTeacherJump(target: JumpTarget): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(target));
  } catch {
    // 저장소를 막아 둔 브라우저 — 점프가 세션 선택까지는 못 가도 날짜는 맞는다
  }
}

/** 쪽지를 읽고 지운다. 없으면 null. */
export function takeTeacherJump(): JumpTarget | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as JumpTarget;
    return parsed?.date ? parsed : null;
  } catch {
    return null;
  }
}
