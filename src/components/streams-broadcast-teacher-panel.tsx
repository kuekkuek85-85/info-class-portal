"use client";

import { useState } from "react";

import { StreamsBoardView } from "@/components/streams-board-view";
import { usePolled } from "@/lib/use-polled";
import { JOKER, type Slot } from "@/lib/streams";

/**
 * STREAMS 동기화 개인전 — 교사 제어(대시보드).
 *
 *  · [새 게임 시작] — 공용 덱을 셔플해 매치를 연다(기존 매치·전원 판을 지운다).
 *  · [숫자 뽑기] — 다음 한 장을 뽑아 전원에게 동시에 보낸다(공용 덱, 개인 판).
 *  · 진행 중 각 학생이 이번 숫자를 놓았는지 집계로 보고, 다 놓이면 다음 장을 뽑는다.
 *  · 20장을 다 뽑으면 [등수 발표] — 3등→2등→1등을 하나씩 강조하며 학번·이름·최종 판을 크게.
 *
 * 매치 상태를 4초마다 폴링한다(릴레이 교사 패널과 같은 패턴). 학번·이름·판만 노출한다 —
 * 게임 기록이라 비민감(감정/마음일기 데이터와 무관). Gemini 미사용.
 */

interface BoardRow {
  studentId: string;
  name: string;
  placed: number;
  score: number;
  board: Slot[];
}
interface Data {
  started: boolean;
  status?: "drawing" | "finished";
  drawCount?: number;
  boardSize?: number;
  drawSeconds?: number;
  revealRank?: boolean;
  drawn?: number[];
  boards?: BoardRow[];
}

function chip(value: number): string {
  return value === JOKER ? "★" : String(value);
}

export function StreamsBroadcastTeacherPanel({ sessionId }: { sessionId: string }) {
  const { data, reload } = usePolled<Data>(
    `/api/teacher/streams-broadcast?sessionId=${sessionId}`,
    4000,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // 등수 발표 단계(클라이언트). 0=없음 → 1:3등 → 2:2·3등 → 3:1·2·3등.
  const [podiumStep, setPodiumStep] = useState(0);

  const started = data?.started === true;
  const drawCount = data?.drawCount ?? 0;
  const boardSize = data?.boardSize ?? 20;
  const drawSeconds = data?.drawSeconds ?? 0;
  const revealRank = data?.revealRank === true;
  const drawn = data?.drawn ?? [];
  const boards = data?.boards ?? [];
  const finished = data?.status === "finished";
  const latest = drawCount > 0 ? drawn[drawCount - 1] : null;
  // 이번 숫자를 놓은 사람 수(placed >= drawCount).
  const caughtUp = boards.filter((b) => b.placed >= drawCount).length;

  async function post(payload: Record<string, unknown>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/teacher/streams-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, ...payload }),
      });
      const body = await res.json();
      if (body.ok) reload();
      else setError(body.message || "실행하지 못했습니다.");
    } catch {
      setError("연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const top3 = boards.slice(0, 3);
  // podiumStep 만큼 아래 등수부터 공개한다. 참가자가 3명 미만이어도(1~2명) 실제 인원 수에
  // 맞춰 잘라, 마지막 단계에서 1등이 반드시 보이게 한다(top3.length 기준).
  const revealed = top3.slice(Math.max(0, top3.length - podiumStep));

  return (
    <section className="card flex flex-col gap-4">
      <h2 className="t-body font-bold">STREAMS 동기화 개인전 — 진행</h2>
      <p className="t-caption text-muted">
        숫자 한 장을 뽑으면 전원이 같은 숫자를 받아요(공용 덱). 판·점수는 학생마다 따로예요.
        {drawSeconds > 0 ? ` 한 장당 ${drawSeconds}초.` : " 시간 제한 없음."}
      </p>

      {error && <p className="t-body-sm rounded-md bg-pink px-4 py-3">{error}</p>}

      {/* 시작 / 리셋 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setPodiumStep(0);
            void post(
              { action: "setup" },
              started
                ? "새 게임을 시작하면 지금 판·점수가 모두 지워지고 새 덱으로 다시 시작해요. 계속할까요?"
                : undefined,
            );
          }}
          disabled={busy}
          className="pill pill-primary t-body-sm disabled:opacity-60"
        >
          {started ? "새 게임 시작 (판 초기화)" : "새 게임 시작"}
        </button>
        {started && (
          <button
            type="button"
            onClick={() => {
              setPodiumStep(0);
              void post({ action: "reset" }, "매치와 전원 판을 완전히 지울까요?");
            }}
            disabled={busy}
            className="pill pill-secondary t-body-sm disabled:opacity-60"
          >
            게임 지우기
          </button>
        )}
      </div>

      {started && (
        <>
          {/* 뽑기 + 이번 숫자 */}
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
            <button
              type="button"
              onClick={() => void post({ action: "draw" })}
              disabled={busy || finished}
              className="pill pill-primary disabled:opacity-60"
            >
              🎲 숫자 뽑기
            </button>
            <span className="t-body-sm font-semibold">
              {drawCount}/{boardSize}장 뽑음
            </span>
            {latest !== null && (
              <span className="inline-flex min-w-12 items-center justify-center rounded-lg border-2 border-ink bg-canvas px-3 py-1.5 text-xl font-bold">
                {chip(latest)}
              </span>
            )}
            {!finished && (
              <span className="t-caption text-muted">
                이번 숫자 놓은 학생 {caughtUp}/{boards.length}명
                {boards.length > 0 && caughtUp === boards.length ? " — 모두 놓음, 다음 숫자!" : ""}
              </span>
            )}
            {finished && <span className="t-body-sm font-bold">20장 완료 — 등수를 발표하세요!</span>}
          </div>

          {/* 등수 발표 */}
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <button
              type="button"
              onClick={() => {
                const next = !revealRank;
                if (next) setPodiumStep(0);
                void post({ action: "reveal", reveal: next });
              }}
              disabled={busy || boards.length === 0}
              className={`pill t-body-sm ${revealRank ? "pill-secondary" : "pill-primary"} disabled:opacity-60`}
            >
              {revealRank ? "발표 끄기" : "등수 발표 시작"}
            </button>
            {revealRank && (
              <button
                type="button"
                onClick={() => setPodiumStep((s) => Math.min(top3.length, s + 1))}
                disabled={podiumStep >= top3.length}
                className="pill pill-primary t-body-sm disabled:opacity-60"
              >
                {/* 다음에 공개할 등수 = (실제 인원 − 지금까지 공개한 수). 3명이면 3→2→1등. */}
                {podiumStep < top3.length ? `${top3.length - podiumStep}등 공개` : "모두 공개됨"}
              </button>
            )}
          </div>

          {/* 시상대 — 공개된 등수만, 1등이 가장 크게 */}
          {revealRank && (
            <div className="flex flex-col gap-3">
              {podiumStep === 0 && (
                <p className="t-body-sm text-muted">아래 등수부터 버튼을 하나씩 눌러 발표해요.</p>
              )}
              {revealed
                .slice()
                .sort((a, b) => b.score - a.score) // 1등이 위
                .map((row) => {
                  const place = boards.findIndex((x) => x.studentId === row.studentId) + 1;
                  const medal = place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉";
                  return (
                    <div
                      key={row.studentId}
                      className={`rounded-xl border-2 border-ink p-3 ${
                        place === 1 ? "bg-lime" : place === 2 ? "bg-mint" : "bg-cream"
                      }`}
                    >
                      <p className={`font-bold ${place === 1 ? "text-2xl" : "text-lg"}`}>
                        {medal} {place}등 · {row.name} — {row.score}점
                      </p>
                      <div className="mt-2">
                        <StreamsBoardView
                          board={row.board}
                          colorSegments
                          cellSize={place === 1 ? 40 : 30}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* 전체 순위(교사 참고) */}
          {boards.length > 0 && (
            <details className="rounded-lg border border-line px-3 py-2">
              <summary className="t-body-sm font-semibold cursor-pointer">
                전체 순위·진행 ({boards.length}명)
              </summary>
              <table className="mt-2 w-full border-collapse text-left t-body-sm">
                <thead>
                  <tr className="bg-cream">
                    <th className="border border-line px-2 py-1 text-center">순위</th>
                    <th className="border border-line px-2 py-1">학생</th>
                    <th className="border border-line px-2 py-1 text-right">점수</th>
                    <th className="border border-line px-2 py-1 text-center">놓음</th>
                  </tr>
                </thead>
                <tbody>
                  {boards.map((b, i) => (
                    <tr key={b.studentId}>
                      <td className="border border-line px-2 py-0.5 text-center">{i + 1}</td>
                      <td className="border border-line px-2 py-0.5">{b.name}</td>
                      <td className="border border-line px-2 py-0.5 text-right">{b.score}</td>
                      <td className="border border-line px-2 py-0.5 text-center">
                        {b.placed}/{boardSize}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </>
      )}
    </section>
  );
}
