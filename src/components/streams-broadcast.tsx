"use client";

import { useEffect, useRef, useState } from "react";

import { StreamsBoardView } from "@/components/streams-board-view";
import { usePolled } from "@/lib/use-polled";
import { JOKER, scoreBoard, STREAM_SCORE_TABLE, type Slot } from "@/lib/streams";
import { leftmostEmpty } from "@/lib/streams-broadcast";

/**
 * STREAMS 동기화 개인전(교사 주도) — 학생 화면.
 *
 * 교사가 대시보드에서 숫자 한 장을 뽑으면 전원이 같은 순서의 같은 숫자를 받는다(공용 덱). 받은
 * 숫자를 내 20칸 보드의 빈 칸에 놓는다(놓으면 못 옮김 — 개인전). 판·점수는 학생별로 따로다.
 *
 *  · 공유 매치 상태를 4초마다 폴링한다(릴레이와 같은 패턴).
 *  · 내 차례(놓을 숫자가 있을 때) 30초 카운트다운. 0이 되면 **빈 칸 맨 왼쪽에 자동 배치**해
 *    게임이 멈추지 않게 한다(서버 autofill — 값은 서버가 deck 순서로 정한다).
 *  · 20장을 다 놓으면 solo 처럼 점수를 직접 계산·검증한다(등수는 실제 점수로 교사가 발표).
 *
 * answers(감정 글·갤러리)와 분리된 별도 경로(streamsMatches·streamsBoards)라 감정 답과 무관.
 */

interface BroadcastData {
  started: boolean;
  status?: "drawing" | "finished";
  drawCount?: number;
  drawn?: number[];
  lastDrawAt?: number;
  drawSeconds?: number;
  revealRank?: boolean;
  board?: Slot[];
  placed?: number;
  boardSize?: number;
  myScore?: number;
}

/** 타일을 큰 칩 라벨로 — 조커는 ★. */
function chip(value: number): string {
  return value === JOKER ? "★" : String(value);
}

export function StreamsBroadcast() {
  const { data, reload } = usePolled<BroadcastData>("/api/student/streams-broadcast", 4000);

  /*
   * 내 판은 서버(streamsBoards)가 정본이다 — 나만 쓰는 판이라, 배치/자동배치 응답으로 받은
   * 최신 판을 override 에 담아 바로 보여 주고(낙관적), 폴링 data 는 재접속·초기 로드의 씨앗으로
   * 쓴다. override 는 이벤트 핸들러에서만 바꾼다(effect 안에서 setState 하지 않는다 — use-polled
   * 메모 참고). 교사가 새 게임을 시작하면 서버 placed 가 override 보다 작아져(되감김) override
   * 를 버리고 서버를 따른다(아래 useView 계산) — 별도 effect 없이 렌더에서만 판단한다.
   */
  const [override, setOverride] = useState<{ board: Slot[]; placed: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [autoNotice, setAutoNotice] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // 점수 직접 계산·검증(solo UX 재사용).
  const [guess, setGuess] = useState("");
  const [checked, setChecked] = useState<{ actual: number; correct: boolean } | null>(null);
  const [showTable, setShowTable] = useState(false);

  const firedRef = useRef(0); // 타임아웃 자동배치를 draw 당 한 번만(키 = lastDrawAt).

  // 1초보다 촘촘히(0.5s) 틱 — 카운트다운 표시용. (interval 콜백 안 setState — effect 본문 동기 아님)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const drawCount = data?.drawCount ?? 0;
  const drawn = data?.drawn ?? [];
  const drawSeconds = data?.drawSeconds ?? 0;
  const lastDrawAt = data?.lastDrawAt ?? 0;
  const boardSize = data?.boardSize ?? 20;

  const serverBoard = data?.board ?? [];
  const serverPlaced = data?.placed ?? 0;
  // override 가 서버보다 뒤처지지 않을 때만 쓴다(되감김=리셋이면 버리고 서버를 따른다).
  const useView = override !== null && override.placed >= serverPlaced;
  const board = useView ? override.board : serverBoard;
  const placed = useView ? override.placed : serverPlaced;

  // 지금 놓을 숫자(뽑혔지만 아직 안 놓은 가장 오래된 것). 없으면 null.
  const pending: number | null = placed < drawCount ? (drawn[placed] ?? null) : null;

  // 남은 시간(초). 제한 없음이거나 놓을 게 없으면 null.
  const remaining =
    pending !== null && drawSeconds > 0 && lastDrawAt > 0
      ? Math.max(0, drawSeconds - Math.floor((now - lastDrawAt) / 1000))
      : null;

  async function send(body: Record<string, unknown>): Promise<BroadcastData | null> {
    const res = await fetch("/api/student/streams-broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.ok) {
      setError(json.message || "배치하지 못했어요. 다시 해 주세요.");
      return null;
    }
    setError("");
    return json as BroadcastData;
  }

  async function place(slot: number) {
    if (submitting || pending === null) return;
    setSubmitting(true);
    const result = await send({ slot });
    if (result?.board) setOverride({ board: result.board, placed: result.placed ?? placed + 1 });
    else reload(); // 실패 시 서버 상태로 되돌린다.
    setSubmitting(false);
  }

  // 카운트다운 0 도달 → 자동 배치(한 draw 당 한 번). 서버가 빈 칸 맨 왼쪽부터 채운다.
  // setState 는 모두 await 뒤(async IIFE) 라 effect 동기 본문이 아니다.
  useEffect(() => {
    if (remaining !== 0 || pending === null) return;
    if (firedRef.current === lastDrawAt) return;
    firedRef.current = lastDrawAt;
    const targetSlot = leftmostEmpty(board); // 안내용(1-based).
    void (async () => {
      setSubmitting(true);
      const result = await send({ autofill: true });
      if (result?.board) {
        setOverride({ board: result.board, placed: result.placed ?? placed });
        if (targetSlot >= 0) {
          setAutoNotice(`시간 초과 — ${targetSlot + 1}번 칸부터 자동으로 놓았어요.`);
        }
      } else {
        reload();
      }
      setSubmitting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, pending, lastDrawAt]);

  if (!data) return <p className="t-body-sm text-muted">불러오는 중…</p>;

  if (!data.started) {
    return (
      <p className="rounded-lg border border-line bg-surface px-4 py-3 t-body-sm text-muted">
        선생님이 게임을 준비하고 있어요. 곧 숫자가 하나씩 나와요. 잠깐 기다려 주세요.
      </p>
    );
  }

  const finishedPlacing = placed >= boardSize;
  const scored = scoreBoard(board);
  const actualScore = data.myScore ?? scored.total;

  // 등수 발표 중 — 내 최종 판·점수를 보여준다(등수는 교사 화면에서 발표).
  if (data.revealRank) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-lg border-2 border-ink bg-mint px-3 py-2 t-body font-bold">
          결과 발표 중! 앞 화면에서 등수를 확인해요. 내 최종 점수는 {actualScore}점이에요.
        </p>
        <StreamsBoardView board={board} colorSegments />
        <p className="t-body-sm">
          이어진 줄기:{" "}
          {scored.segments
            .filter((s) => s.length >= 2)
            .map((s) => `${s.length}칸(+${s.score})`)
            .join(" · ") || "없음"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 진행 상태 */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setShowTable(true)} className="pill pill-secondary">
          📋 점수표·숫자 구성
        </button>
        <p className="t-body-sm font-semibold">
          {placed}/{boardSize}칸 놓음 · 나온 숫자 {drawCount}장
        </p>
        {remaining !== null && (
          <span
            aria-label={`남은 시간 ${remaining}초`}
            className={`ml-auto shrink-0 rounded-full border-2 border-ink px-2 py-0.5 tabular-nums t-body-sm font-bold ${
              remaining <= 5 ? "bg-pink" : "bg-white"
            }`}
          >
            ⏱ {remaining}초
          </span>
        )}
      </div>

      {/* 이번 숫자 + 나온 순서 */}
      {!finishedPlacing &&
        (pending !== null ? (
          <div className="flex flex-col gap-1.5">
            <p className="t-body">
              이번 숫자
              <span className="mx-1 inline-flex min-w-10 items-center justify-center rounded-lg border-2 border-ink bg-canvas px-2 py-1 text-lg font-bold">
                {chip(pending)}
              </span>
              <span className="t-caption text-muted">→ 놓을 초록 칸을 눌러요</span>
            </p>
            {drawn.length > 1 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <span className="t-caption text-muted shrink-0">나온 순서</span>
                {drawn.map((t, i) => (
                  <span
                    key={i}
                    className={`shrink-0 rounded border px-1.5 py-0.5 t-caption ${
                      i === drawn.length - 1
                        ? "border-2 border-ink font-bold"
                        : "border-line text-muted"
                    }`}
                  >
                    {chip(t)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-lg bg-surface px-3 py-2 t-body-sm">
            선생님이 다음 숫자를 뽑기를 기다려요. 뽑으면 여기에 나타나요.
          </p>
        ))}

      {autoNotice && (
        <p className="rounded-md bg-cream px-3 py-2 t-body-sm">{autoNotice}</p>
      )}
      {error && <p className="t-body-sm rounded-md bg-pink px-4 py-3">{error}</p>}

      {/* 보드 — 끝나면 줄기 색으로 묶기 */}
      <StreamsBoardView
        board={board}
        colorSegments={finishedPlacing}
        onPlace={place}
        canPlace={!finishedPlacing && pending !== null && !submitting}
      />

      {/* 20칸 다 놓음 — 점수 직접 계산 + 검증(solo UX) */}
      {finishedPlacing && (
        <div className="flex flex-col gap-2 rounded-lg border-2 border-ink bg-canvas p-3">
          <p className="t-body font-bold">20칸을 다 놓았어요! 점수를 직접 계산해 봐요.</p>
          <p className="t-body-sm">
            색으로 묶인 <b>줄기마다 칸 수</b>를 세고 점수표로 찾아 모두 더하면 내 점수예요.
          </p>
          {checked === null ? (
            <div className="flex flex-wrap items-center gap-2">
              <label className="t-body-sm font-semibold">내가 계산한 점수</label>
              <input
                type="number"
                inputMode="numeric"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="예) 28"
                className="w-24 rounded-lg border-2 border-line px-2 py-1 t-body"
              />
              <button
                type="button"
                onClick={() =>
                  setChecked({ actual: actualScore, correct: Number(guess) === actualScore })
                }
                disabled={guess.trim() === ""}
                className="pill pill-primary disabled:opacity-60"
              >
                검증하기
              </button>
            </div>
          ) : (
            <div className={`rounded-lg px-3 py-2 ${checked.correct ? "bg-lime" : "bg-pink"}`}>
              {checked.correct ? (
                <p className="t-body font-bold">정답! 총점 {checked.actual}점 🎉</p>
              ) : (
                <p className="t-body font-bold">
                  아쉬워요 — 내가 쓴 점수 {guess}점, 실제는 {checked.actual}점이에요. 줄기 길이와
                  점수표를 다시 확인해 봐요.
                </p>
              )}
              <p className="mt-1 t-body-sm">
                이어진 줄기:{" "}
                {scored.segments
                  .filter((s) => s.length >= 2)
                  .map((s) => `${s.length}칸(+${s.score})`)
                  .join(" · ") || "없음"}
              </p>
              <button
                type="button"
                onClick={() => setChecked(null)}
                className="pill pill-secondary mt-2"
              >
                다시 계산해 보기
              </button>
            </div>
          )}
          <p className="t-caption text-muted">
            선생님이 등수를 발표하면 앞 화면에서 순위를 함께 봐요.
          </p>
        </div>
      )}

      {/* 점수표 팝업 — 필요할 때만 본다(solo 와 같은 내용) */}
      {showTable && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowTable(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-xs overflow-auto rounded-xl bg-canvas p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="t-body font-bold">점수표 · 숫자 구성</h3>
              <button type="button" onClick={() => setShowTable(false)} className="pill pill-secondary">
                닫기
              </button>
            </div>
            <div className="mt-2 rounded-lg border border-line bg-cream px-3 py-2 t-body-sm">
              <p className="font-semibold">숫자 구성 (총 40장)</p>
              <ul className="mt-1 list-disc pl-5">
                <li>1~10 : 각 1장 (10장)</li>
                <li>11~19 : 각 2장 (18장) — 가장 흔해요</li>
                <li>20~30 : 각 1장 (11장)</li>
                <li>조커 ★ : 1장 (아무 숫자로나)</li>
              </ul>
            </div>
            <p className="mt-3 t-caption text-muted">이어진 칸 수(연속)가 길수록 점수가 커져요.</p>
            <table className="mt-2 w-full border-collapse text-center t-body-sm">
              <thead>
                <tr className="bg-cream">
                  <th className="border border-line py-1">연속</th>
                  <th className="border border-line py-1">점수</th>
                </tr>
              </thead>
              <tbody>
                {STREAM_SCORE_TABLE.map((s, len) =>
                  len >= 2 ? (
                    <tr key={len}>
                      <td className="border border-line py-0.5">{len}칸</td>
                      <td className="border border-line py-0.5 font-semibold">+{s}</td>
                    </tr>
                  ) : null,
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
