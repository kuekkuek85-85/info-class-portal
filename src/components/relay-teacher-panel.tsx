"use client";

import { useState } from "react";

import { usePolled } from "@/lib/use-polled";

/**
 * 릴레이 그림 — 교사 제어(대시보드). 모둠 나누기 / 턴 건너뛰기 / 공개.
 *
 * 모둠 상태를 5초마다 폴링해 각 모둠의 현재 차례·완성 여부를 보여준다. 결석·막힌 학생이
 * 모둠을 막으면 「건너뛰기」로 다음 사람으로 넘긴다. 다 완성되면 「공개」로 모든 학생 화면에
 * 완성 그림을 띄운다.
 */

interface GroupRow {
  groupNo: number;
  topic: string;
  memberNames: string[];
  turnIndex: number;
  status: "drawing" | "done";
  image: string;
  currentDrawerName: string;
}
interface Data {
  reveal: boolean;
  groups: GroupRow[];
}

export function RelayTeacherPanel({ sessionId }: { sessionId: string }) {
  const { data, reload } = usePolled<Data>(`/api/teacher/relay?sessionId=${sessionId}`, 5000);
  const [groupCount, setGroupCount] = useState(4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const groups = data?.groups ?? [];
  const reveal = data?.reveal === true;
  const allDone = groups.length > 0 && groups.every((g) => g.status === "done");

  async function post(payload: Record<string, unknown>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/teacher/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, ...payload }),
      });
      const body = await response.json();
      if (body.ok) reload();
      else setError(body.message || "실행하지 못했습니다.");
    } catch {
      setError("연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card flex flex-col gap-4">
      <h2 className="t-body font-bold">릴레이 그림 — 모둠 제어</h2>

      <div className="flex flex-wrap items-center gap-2">
        <label className="t-body-sm">모둠 수</label>
        <input
          type="number"
          min={2}
          max={10}
          value={groupCount}
          onChange={(event) => setGroupCount(Math.max(2, Math.min(10, Number(event.target.value) || 2)))}
          className="field w-16 t-body-sm"
        />
        <button
          type="button"
          onClick={() =>
            void post(
              { action: "setup", groups: groupCount },
              groups.length > 0 ? "이미 모둠이 있어요. 새로 나누면 지금까지 그린 그림이 지워져요. 계속할까요?" : undefined,
            )
          }
          disabled={busy}
          className="pill pill-primary t-body-sm disabled:opacity-60"
        >
          {groups.length > 0 ? "다시 모둠 나누기" : "접속 학생 모둠 나누기"}
        </button>
        <span className="t-caption">접속한 학생만 나눕니다(출석 기준).</span>
      </div>

      {error && <p className="t-body-sm rounded-md bg-pink px-4 py-3">{error}</p>}

      {groups.length > 0 && (
        <ul className="flex flex-col gap-2">
          {groups.map((g) => (
            <li
              key={g.groupNo}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2"
            >
              <div className="min-w-0">
                <p className="t-body-sm font-semibold">
                  {g.groupNo}모둠 · {g.topic}
                </p>
                <p className="t-caption">
                  {g.status === "done"
                    ? "완성"
                    : `지금 ${g.currentDrawerName} 차례 (${g.turnIndex + 1}/${g.memberNames.length})`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {g.image && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={g.image} alt={`${g.groupNo}모둠`} className="h-12 w-16 rounded border border-line bg-white object-cover" />
                )}
                {g.status === "drawing" && (
                  <button
                    type="button"
                    onClick={() => void post({ action: "skip", groupNo: g.groupNo })}
                    disabled={busy}
                    className="pill pill-secondary t-body-sm disabled:opacity-60"
                  >
                    건너뛰기
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {groups.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <button
            type="button"
            onClick={() => void post({ action: "reveal", reveal: !reveal })}
            disabled={busy}
            className={`pill t-body-sm ${reveal ? "pill-secondary" : "pill-primary"} disabled:opacity-60`}
          >
            {reveal ? "공개 끄기(다시 잠금)" : "완성 그림 공개하기"}
          </button>
          <span className="t-caption">
            {reveal
              ? "학생 화면에 모든 모둠 그림이 보이는 중"
              : allDone
                ? "모든 모둠이 완성됐어요 — 공개해도 좋아요."
                : "아직 그리는 중인 모둠이 있어요."}
          </span>
        </div>
      )}
    </section>
  );
}
