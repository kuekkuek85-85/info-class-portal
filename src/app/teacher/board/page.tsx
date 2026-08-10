"use client";

import { useState } from "react";

import { TeacherShell } from "@/components/teacher-shell";
import { todayKST } from "@/lib/datetime";
import { pickCurrentSession } from "@/lib/pick-session";
import { QUADRANTS, type Quadrant } from "@/lib/mood";
import { usePolled } from "@/lib/use-polled";

/**
 * 교실 앞 화면에 띄우는 공유용 감정 집계 — **익명**.
 *
 * 이 화면이 쓰는 /api/teacher/board 응답에는 학번·이름·이유가 아예 들어 있지 않다.
 * 전체 공유 화면에 실수로 개인 응답이 뜨는 사고를 데이터 단계에서 막는다 (PRD 3.3).
 * 개별 응답은 대시보드에서만 본다.
 */

interface Count {
  key: string;
  label: string;
  quadrant: Quadrant;
  count: number;
}

interface BoardData {
  session: { id: string; classNo: number; lessonNo: number; title: string; period: number };
  total: number;
  counts: Count[];
  byQuadrant: Record<Quadrant, number>;
}

interface SessionOption {
  id: string;
  classNo: number;
  period: number;
  lessonNo: number;
  title: string;
  status: "scheduled" | "active" | "ended";
}

const POLL_INTERVAL_MS = 5000;

/** 화면 배치가 곧 무드미터 축이다. 위 = 기운 높음, 오른쪽 = 기분 좋음. */
const GRID: Quadrant[] = ["blue", "red", "green", "yellow"];

export default function BoardPage() {
  return (
    <TeacherShell>
      <Board />
    </TeacherShell>
  );
}

function Board() {
  const [picked, setPicked] = useState("");

  const { data: sessionList } = usePolled<{ sessions: SessionOption[] }>(
    `/api/teacher/sessions?date=${todayKST()}`,
  );
  const sessions = sessionList?.sessions ?? [];

  // 고르지 않았으면 "지금 하는 수업"을 쓴다. 오늘 첫 수업을 기본값으로 두면 3교시에
  // 2교시 반의 기분이 교실 앞 화면에 뜬다 — 다른 반 데이터가 노출되는 셈이다.
  const sessionId = picked || pickCurrentSession(sessions)?.id || "";

  const { data } = usePolled<BoardData>(
    sessionId ? `/api/teacher/board?sessionId=${sessionId}` : null,
    POLL_INTERVAL_MS,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">우리 반 기분</h1>
          <p className="text-sm text-muted">
            이름과 적은 이유는 이 화면에 나오지 않습니다. 교실 앞 화면에 띄워도 됩니다.
          </p>
        </div>
        <select
          value={sessionId}
          onChange={(event) => setPicked(event.target.value)}
          className="rounded-lg border border-line bg-card px-3 py-2 text-sm"
        >
          {sessions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.period}교시 · {item.classNo}반 · {item.lessonNo}차시
            </option>
          ))}
        </select>
      </div>

      {sessions.length === 0 && (
        <p className="rounded-xl border border-line bg-card px-4 py-6 text-center text-sm text-muted">
          오늘 등록된 수업이 없습니다.
        </p>
      )}

      {sessionId && !data && <p className="text-sm text-muted">불러오는 중…</p>}

      {data && (
        <>
          <p className="text-sm text-muted">
            {data.session.classNo}반 · 응답 <b className="text-foreground">{data.total}</b>명
          </p>

          <div className="grid grid-cols-2 gap-2">
            {GRID.map((quadrant) => (
              <section
                key={quadrant}
                className={`rounded-2xl border p-3 ${QUADRANTS[quadrant].className}`}
              >
                <header className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-zinc-600 dark:text-zinc-300">
                    {QUADRANTS[quadrant].description}
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    {data.byQuadrant[quadrant]}명
                  </span>
                </header>

                <div className="grid grid-cols-2 gap-2">
                  {data.counts
                    .filter((item) => item.quadrant === quadrant)
                    .map((item) => (
                      <div
                        key={item.key}
                        className={`flex h-20 flex-col items-center justify-center rounded-xl ${
                          item.count > 0 ? "bg-white dark:bg-black/40" : "bg-white/40 dark:bg-black/10"
                        }`}
                      >
                        <span className="text-2xl font-bold tabular-nums">
                          {item.count > 0 ? item.count : ""}
                        </span>
                        <span
                          className={`text-xs ${
                            item.count > 0 ? "" : "text-zinc-400 dark:text-zinc-600"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                    ))}
                </div>
              </section>
            ))}
          </div>

          <p className="text-center text-xs text-muted">↑ 기운이 높음 · → 기분이 좋음</p>
        </>
      )}
    </div>
  );
}
