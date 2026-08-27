"use client";

import { useEffect, useState } from "react";

import { todayKST } from "@/lib/datetime";

/**
 * 교사 화면들이 함께 보는 "어느 날짜를 보고 있는가".
 *
 * ## 왜 필요한가
 *
 * 대시보드에서 8월 13일을 골라 놓고 「공유 화면」이나 「영상 재생」으로 넘어가면, 그쪽은
 * 오늘 날짜로 못 박혀 있어 3차시 그림을 보여주려던 화면이 오늘 수업 목록으로 돌아갔다.
 * 화면마다 날짜를 따로 들고 있었던 탓이다.
 *
 * ## 왜 주소(?date=)가 아니라 sessionStorage 인가
 *
 * 주소에 실으면 화면을 옮길 때마다 링크에 날짜를 붙여 다녀야 하고, useSearchParams 를
 * 쓰는 순간 정적으로 만들던 교사 화면들이 Suspense 경계를 요구한다. 하루 저녁 한 대의
 * 노트북에서 도는 화면에 그만한 배관을 깔 이유가 없다.
 *
 * 탭을 닫으면 사라지는 것이 오히려 안전하다. 다음 날 아침에 열면 늘 오늘이다 —
 * 지난주 날짜를 붙들고 수업에 들어가는 일이 생기지 않는다.
 *
 * ## 오늘이 아닐 때는 반드시 눈에 보여야 한다
 *
 * 지난 날짜를 보는 중인 줄 모르고 단계 버튼을 누르면, 교사는 학생 화면이 안 바뀐다고
 * 생각하고 계속 누른다. TeacherShell 이 오늘이 아닐 때 띠를 띄운다.
 */

const KEY = "teacher-date";
/** 같은 탭의 다른 화면들이 함께 따라오게 하는 신호 */
const EVENT = "teacher-date-change";

export function useTeacherDate(): [string, (next: string) => void] {
  /*
   * 첫 렌더는 반드시 오늘로 시작한다.
   *
   * sessionStorage 를 렌더 중에 읽으면 서버가 그린 것과 브라우저가 그린 것이 달라져
   * 하이드레이션이 어긋난다. 값은 붙은 뒤에 효과에서 가져온다.
   */
  const [date, setDate] = useState(todayKST());

  useEffect(() => {
    const read = () => {
      try {
        const saved = sessionStorage.getItem(KEY);
        if (saved) setDate(saved);
      } catch {
        // 저장소를 막아 둔 브라우저 — 오늘 날짜로 두면 된다
      }
    };
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, []);

  function change(next: string) {
    setDate(next);
    try {
      sessionStorage.setItem(KEY, next);
    } catch {
      // 저장이 안 되면 이 화면에서만 바뀐다. 막을 일은 아니다
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return [date, change];
}
