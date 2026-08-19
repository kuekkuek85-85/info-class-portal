"use client";

import { usePolled } from "@/lib/use-polled";

/**
 * 직업 조사 집계 — 4차시 정리용.
 *
 * 막대 하나가 "이 직업을 적은 사람 수"다. 숫자만 늘어놓으면 눈에 안 들어오고,
 * 원그래프로 만들면 조각이 스무 개가 되어 읽을 수가 없다. 많이 나온 순으로 세워 두는
 * 것이 교실 앞에서 가장 빨리 읽힌다.
 *
 * **이름은 나오지 않는다.** 누가 무엇을 적었는지가 아니라 반 전체의 그림이 목적이다.
 */

interface Tally {
  name: string;
  count: number;
}

interface JobsData {
  vanish: Tally[];
  rise: Tally[];
  written: number;
}

/** 화면에 세우는 막대 수. 더 늘리면 꼬리만 길어지고 읽히지 않는다 */
const TOP_N = 8;

export function TeacherJobsPanel({
  sessionId,
  /** 교실 앞 화면은 위에 이미 제목이 있다. 두 번 쓰지 않는다 */
  hideHeading,
}: {
  sessionId: string;
  hideHeading?: boolean;
}) {
  const { data } = usePolled<JobsData>(`/api/teacher/jobs?sessionId=${sessionId}`, 15_000);

  if (!data) return <p className="text-sm text-muted">집계를 불러오는 중…</p>;

  if (data.written === 0) {
    return (
      <p className="rounded-xl border border-line bg-card px-4 py-6 text-center text-sm text-muted">
        아직 직업을 적은 학생이 없습니다. 활동지를 쓰기 시작하면 여기에 모입니다.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {!hideHeading && <h2 className="text-lg font-bold">우리 반이 고른 직업</h2>}
        <p className="text-xs text-muted">
          {data.written}명이 적었습니다 · 이름은 나오지 않습니다
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Column title="사라질 것 같은 직업" rows={data.vanish} tone="bg-rose-400" big={hideHeading} />
        <Column title="잘 나갈 것 같은 직업" rows={data.rise} tone="bg-emerald-400" big={hideHeading} />
      </div>
    </section>
  );
}

function Column({
  title,
  rows,
  tone,
  big,
}: {
  title: string;
  rows: Tally[];
  tone: string;
  /** 교실 앞 화면에서는 뒷자리에서도 읽혀야 한다 */
  big?: boolean;
}) {
  const top = rows.slice(0, TOP_N);
  // 가장 많이 나온 것을 100%로 잡는다. 절대 인원으로 재면 막대가 전부 짧아 비교가 안 된다
  const max = Math.max(1, ...top.map((row) => row.count));

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-card p-4">
      <h3 className={big ? "text-lg font-bold" : "text-sm font-semibold"}>{title}</h3>

      {top.length === 0 && <p className="text-sm text-muted">아직 없습니다.</p>}

      {top.map((row) => (
        <div key={row.name} className="flex items-center gap-2">
          <span
            className={`shrink-0 truncate ${big ? "w-40 text-lg" : "w-28 text-sm"}`}
            title={row.name}
          >
            {row.name}
          </span>
          <span
            className={`flex-1 overflow-hidden rounded bg-surface ${big ? "h-8" : "h-5"}`}
          >
            <span
              className={`block h-full rounded ${tone}`}
              style={{ width: `${Math.round((row.count / max) * 100)}%` }}
            />
          </span>
          <span
            className={`shrink-0 text-right tabular-nums ${big ? "w-10 text-lg font-bold" : "w-8 text-sm"}`}
          >
            {row.count}
          </span>
        </div>
      ))}

      {rows.length > TOP_N && (
        <p className="text-xs text-muted">그 밖에 {rows.length - TOP_N}가지가 더 나왔습니다.</p>
      )}
    </div>
  );
}
