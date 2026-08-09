"use client";

import { useState } from "react";

import { TeacherShell } from "@/components/teacher-shell";
import { formatDateKorean, formatTimeKST, todayKST } from "@/lib/datetime";
import { QUADRANTS, type Quadrant } from "@/lib/mood";
import { usePolled } from "@/lib/use-polled";

/**
 * 교사 대시보드 — 출석 확인 겸 접속자 실시간 명단, 감정 개별 응답, 성찰 모아보기, 교사 메모.
 *
 * Firestore 실시간 구독 대신 5초 폴링을 쓴다. 학생 브라우저가 Firestore에 직접 붙지 않는
 * 구조를 유지하려면 교사 화면도 서버 API를 거쳐야 하고, 28명 규모에서는 폴링으로 충분하다.
 */

const POLL_INTERVAL_MS = 5000;

interface SessionRow {
  id: string;
  classNo: number;
  period: number;
  lessonNo: number;
  title: string;
  code: string;
  status: "scheduled" | "active" | "ended";
  teacherNote: string;
  reflectionPublic: boolean;
  date: string;
}

interface StudentRow {
  studentId: string;
  name: string;
  temporary: boolean;
  joinedAt: number;
  mood: {
    key: string;
    label: string;
    quadrant: Quadrant | null;
    reason: string;
    reviewed: boolean;
  } | null;
  reflection: { content: string; draft: boolean; updatedAt: number } | null;
}

interface DashboardData {
  date: string;
  sessions: SessionRow[];
  session: SessionRow | null;
  rows?: StudentRow[];
  missing?: { studentId: string; name: string }[];
  stats?: {
    rosterCount: number;
    joinedCount: number;
    moodCount: number;
    reflectionCount: number;
    unreviewed: number;
  };
}

export default function DashboardPage() {
  return (
    <TeacherShell>
      <Dashboard />
    </TeacherShell>
  );
}

function Dashboard() {
  const [date, setDate] = useState(todayKST());
  const [sessionId, setSessionId] = useState<string | null>(null);
  /** null이면 서버 값을 그대로 보여준다. 교사가 타이핑을 시작하면 그때부터 로컬 값이 이긴다. */
  const [noteDraft, setNoteDraft] = useState<string | null>(null);

  const params = new URLSearchParams({ date });
  if (sessionId) params.set("sessionId", sessionId);
  const { data, reload } = usePolled<DashboardData>(
    `/api/teacher/dashboard?${params}`,
    POLL_INTERVAL_MS,
  );

  const sessions = data?.sessions ?? [];
  const session = data?.session ?? null;
  const rows = data?.rows ?? [];
  const stats = data?.stats;
  const note = noteDraft ?? session?.teacherNote ?? "";

  async function patchSession(patch: Record<string, unknown>) {
    if (!sessionId) return;
    await fetch("/api/teacher/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sessionId, ...patch }),
    });
    setNoteDraft(null);
    reload();
  }

  async function reviewAll() {
    if (!sessionId) return;
    await fetch("/api/teacher/mood-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, all: true }),
    });
    reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">날짜</span>
          <input
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setSessionId(null);
            }}
            className="rounded-lg border border-line bg-card px-3 py-2"
          />
        </label>
        <p className="pb-2 text-sm text-muted">{formatDateKorean(date)} 수업 {sessions.length}개</p>
      </section>

      {sessions.length === 0 && (
        <p className="rounded-xl border border-line bg-card px-4 py-6 text-center text-sm text-muted">
          이 날짜에 등록된 수업이 없습니다. <b>시간표</b>에서 일괄 생성하거나 <b>차시</b>에서
          하나씩 등록하세요.
        </p>
      )}

      {sessions.length > 0 && (
        <section className="flex flex-wrap gap-2">
          {sessions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSessionId(item.id);
                setNoteDraft(null);
              }}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                sessionId === item.id
                  ? "border-accent bg-accent/10"
                  : "border-line bg-card hover:border-accent"
              }`}
            >
              <p className="text-sm font-semibold">
                {item.period}교시 · {item.classNo}반
              </p>
              <p className="text-xs text-muted">
                {item.lessonNo}차시 {item.title}
              </p>
              <p className="mt-1 text-xs">
                <StatusBadge status={item.status} />
              </p>
            </button>
          ))}
        </section>
      )}

      {session && (
        <>
          {/* 수업 코드 — 칠판에 적어야 하므로 크게 */}
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-card px-5 py-4">
            <div>
              <p className="text-xs text-muted">수업 코드</p>
              <p className="text-5xl font-black tracking-widest tabular-nums">{session.code}</p>
              <p className="mt-1 text-xs text-muted">
                {session.classNo}반 · {session.period}교시 · {session.lessonNo}차시
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => patchSession({ status: "active" })}
                disabled={session.status === "active"}
                className="rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-40"
              >
                수업 시작
              </button>
              <button
                type="button"
                onClick={() => patchSession({ status: "ended" })}
                disabled={session.status === "ended"}
                className="rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-40"
              >
                수업 종료 (코드 만료)
              </button>
              <label className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={session.reflectionPublic}
                  onChange={(event) => patchSession({ reflectionPublic: event.target.checked })}
                />
                성찰 서로 공개
              </label>
            </div>
          </section>

          {stats && (
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="접속" value={`${stats.joinedCount} / ${stats.rosterCount}`} />
              <Stat label="감정 응답" value={String(stats.moodCount)} />
              <Stat label="성찰 제출" value={String(stats.reflectionCount)} />
              <Stat
                label="미확인 감정"
                value={String(stats.unreviewed)}
                warn={stats.unreviewed > 0}
              />
            </section>
          )}

          {/* PRD 5.4 — 매 수업 종료 후 그날 감정 응답을 확인한다 */}
          {stats && stats.unreviewed > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
              <span>
                아직 확인하지 않은 감정 이유가 {stats.unreviewed}건 있습니다. 받아두고 보지 않는
                상태가 가장 위험합니다.
              </span>
              <button
                type="button"
                onClick={reviewAll}
                className="rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-medium"
              >
                모두 확인 처리
              </button>
            </div>
          )}

          {data?.missing && data.missing.length > 0 && (
            <section className="rounded-xl border border-line bg-card px-4 py-3">
              <h2 className="text-sm font-semibold">아직 안 들어온 학생 {data.missing.length}명</h2>
              <p className="mt-2 text-sm text-muted">
                {data.missing.map((item) => `${item.name}(${item.studentId.slice(3)})`).join(", ")}
              </p>
            </section>
          )}

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">접속자 · 응답</h2>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead className="bg-card text-left text-xs text-muted">
                  <tr>
                    <th className="px-3 py-2">학번</th>
                    <th className="px-3 py-2">이름</th>
                    <th className="px-3 py-2">접속</th>
                    <th className="px-3 py-2">기분</th>
                    <th className="px-3 py-2">이유</th>
                    <th className="px-3 py-2">성찰</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.studentId} className="border-t border-line align-top">
                      <td className="px-3 py-2 tabular-nums">{row.studentId}</td>
                      <td className="px-3 py-2">
                        {row.name || <span className="text-muted">임시</span>}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-muted">
                        {formatTimeKST(row.joinedAt)}
                      </td>
                      <td className="px-3 py-2">
                        {row.mood ? (
                          <span className="inline-flex items-center gap-1.5">
                            {row.mood.quadrant && (
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${QUADRANTS[row.mood.quadrant].dotClassName}`}
                              />
                            )}
                            {row.mood.label}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 max-w-[240px] whitespace-pre-wrap">
                        {row.mood?.reason || <span className="text-muted">—</span>}
                      </td>
                      <td className="px-3 py-2 max-w-[320px] whitespace-pre-wrap">
                        {row.reflection?.content ? (
                          <>
                            {row.reflection.content}
                            {row.reflection.draft && (
                              <span className="ml-1 text-xs text-muted">(작성 중)</span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-muted">
                        아직 접속한 학생이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* PRD 5.1 — 다음 반 수업 전에 이 메모를 확인하는 것이 개선 루프의 출발점 */}
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">수업 후 메모</h2>
            <textarea
              value={note}
              onChange={(event) => setNoteDraft(event.target.value)}
              rows={3}
              placeholder="예) 영상 2분 넘어가니 늘어짐 / 성찰 질문 2번 어려워함"
              className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => patchSession({ teacherNote: note })}
              className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              메모 저장
            </button>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        warn ? "border-amber-400 bg-amber-50 dark:bg-amber-950/40" : "border-line bg-card"
      }`}
    >
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: SessionRow["status"] }) {
  const map = {
    scheduled: { label: "대기", className: "text-muted" },
    active: { label: "진행 중", className: "text-emerald-600 dark:text-emerald-400" },
    ended: { label: "종료", className: "text-rose-600 dark:text-rose-400" },
  } as const;
  return <span className={map[status].className}>{map[status].label}</span>;
}
