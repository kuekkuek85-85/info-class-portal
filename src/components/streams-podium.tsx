"use client";

import { StreamsBoardView } from "@/components/streams-board-view";
import type { Slot } from "@/lib/streams";

/**
 * STREAMS 동기화 개인전 — 등수 발표 시상대(공용).
 *
 * 교사 대시보드 패널과 교실 앞 공유 화면(/teacher/board)이 함께 쓴다. 발표 단계(revealStep)는
 * 서버에 있어 두 화면이 같은 단계를 본다. 아래 등수부터 하나씩 공개하고 1등을 가장 크게.
 * 학번·이름·최종 판만 노출한다(게임 기록이라 비민감 — 감정/마음일기 데이터와 무관).
 *
 * `big` 은 교실 앞 화면용(글자·판을 더 크게).
 */

export interface PodiumRow {
  studentId: string;
  name: string;
  score: number;
  board: Slot[];
}

export function StreamsPodium({
  boards,
  revealStep,
  big = false,
}: {
  /** 점수 높은 순으로 정렬된 전체 판(상위 3명만 시상대에 올린다). */
  boards: PodiumRow[];
  /** 공개 단계(0=없음 → N=아래 N개 등수까지). 서버에서 온다. */
  revealStep: number;
  big?: boolean;
}) {
  const top3 = boards.slice(0, 3);
  // 실제 인원 기준으로 아래 등수부터 공개 — 1~2명이어도 마지막에 1등이 반드시 보인다.
  const revealed = top3.slice(Math.max(0, top3.length - revealStep));

  if (revealed.length === 0) {
    return (
      <p className={`text-muted ${big ? "text-lg" : "t-body-sm"}`}>
        아래 등수부터 하나씩 공개돼요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {revealed
        .slice()
        .sort((a, b) => b.score - a.score) // 1등이 위
        .map((row) => {
          const place = boards.findIndex((x) => x.studentId === row.studentId) + 1;
          const medal = place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉";
          const titleSize = big
            ? place === 1
              ? "text-4xl"
              : "text-2xl"
            : place === 1
              ? "text-2xl"
              : "text-lg";
          const cellSize = big ? (place === 1 ? 56 : 44) : place === 1 ? 40 : 30;
          return (
            <div
              key={row.studentId}
              className={`rounded-xl border-2 border-ink p-3 ${
                place === 1 ? "bg-lime" : place === 2 ? "bg-mint" : "bg-cream"
              }`}
            >
              <p className={`font-bold ${titleSize}`}>
                {medal} {place}등 · {row.name} — {row.score}점
              </p>
              <div className="mt-2">
                <StreamsBoardView board={row.board} colorSegments cellSize={cellSize} />
              </div>
            </div>
          );
        })}
    </div>
  );
}
