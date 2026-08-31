"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 선생님이 남긴 말 — 제출 기계 없이 그것만 띄운다.
 *
 * ## 왜 따로 있는가
 *
 * 7차시 수행평가에서는 제출 칸(submit-panel)이 이 말을 함께 보여준다. 그런데 제출
 * 절차가 없는 차시에서도 교사 검토 라운드가 있다 — 「인간과 인공지능」 3차시가
 * 그렇다. 그때 제출 기계를 통째로 끌어오면 학생 화면에 안 쓰는 단추가 생긴다.
 *
 * 읽는 곳은 같다. `/api/student/submit` 의 GET 은 제출 문항이 없어도 도는 조회라,
 * 차시를 가리지 않고 `artifact.teacherFeedback` 을 돌려준다.
 *
 * ## 갤러리를 끈 차시에서 이것이 유일한 통로다
 *
 * 교사가 작품 목록에서 쓰는 두 칸짜리 서식은 **친구 작품 보기용**이라, 서로 구경하기를
 * 끄면 학생 화면에 나올 자리가 없다. 그래서 교사 화면 쪽도 이 문항이 있을 때는
 * 한 칸짜리 서식으로 바뀐다 (teacher-artifact-panel 의 hasSubmit 판정).
 *
 * ## 올 때까지만 물어본다
 *
 * 선생님이 스물두 명을 도는 동안 학생 화면은 기다리는 상태다. 말이 도착하면 폴링을
 * 멈춘다 — 한 번 온 말은 바뀌지 않고, 남은 시간 내내 물어보면 그만큼이 읽기 수다
 * (PRD 10장 D2). 8초는 "선생님이 방금 말했는데 화면에 없다" 가 안 생길 만큼 짧고,
 * 스물두 명이 동시에 돌아도 한 교시에 감당되는 간격이다.
 */

const POLL_MS = 8000;

interface Feedback {
  at: number;
  chips: string[];
  note: string;
}

function isEmpty(feedback: Feedback | null): boolean {
  return !feedback || (feedback.chips.length === 0 && !feedback.note.trim());
}

export function TeacherNotePanel({ waitingText }: { waitingText?: string }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const stopped = useRef(false);

  const pull = useCallback(async () => {
    try {
      const response = await fetch("/api/student/submit", { cache: "no-store" });
      const body = await response.json();
      if (!body?.ok) return;
      const next = (body.teacherFeedback ?? null) as Feedback | null;
      if (isEmpty(next)) return;
      setFeedback(next);
      stopped.current = true;
    } catch {
      // 잠깐 끊긴 것이다. 다음 차례에 다시 묻는다 — 학생에게 알릴 일이 아니다
    }
  }, []);

  useEffect(() => {
    // 첫 조회는 다음 틱으로 미룬다 (그리는 중에 상태를 바꾸지 않는다)
    const first = setTimeout(() => void pull(), 0);
    const timer = setInterval(() => {
      if (stopped.current) return;
      void pull();
    }, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [pull]);

  if (isEmpty(feedback)) {
    return (
      <p className="rounded-lg bg-surface px-4 py-3 t-body-sm">
        {waitingText ?? "선생님이 오시면 여기에 말이 뜹니다. 그동안 앞 단계를 더 고쳐도 좋아요."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border-2 border-ink bg-canvas p-4">
      <p className="t-eyebrow">선생님이 남긴 말</p>
      {feedback!.chips.map((chip) => (
        <p key={chip} className="t-headline">
          · {chip}
        </p>
      ))}
      {feedback!.note && <p className="t-body-lg whitespace-pre-line">{feedback!.note}</p>}
    </div>
  );
}
