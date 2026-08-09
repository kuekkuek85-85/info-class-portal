"use client";

import { useState } from "react";

import { TeacherShell } from "@/components/teacher-shell";
import { usePolled } from "@/lib/use-polled";

/**
 * 데이터 내보내기 · 일괄 삭제 (PRD 5.2).
 *
 * 무료 티어에는 자동 백업이 없다. 주 1회 CSV 내보내기를 운영 습관으로 삼고,
 * 학기말에는 이름과 기록을 지운다. 마지막 삭제 일자는 서버에 남겨 어느 기기에서든 보이게 한다.
 */

interface Target {
  key: string;
  label: string;
  confirm: string;
  note: string;
  lastPurge: { at: number; affected: number } | null;
}

const EXPORTS = [
  { type: "reflections", label: "성찰 글" },
  { type: "moods", label: "감정 기록" },
  { type: "attendance", label: "접속 로그(출석)" },
  { type: "students", label: "명렬표" },
] as const;

export default function DataPage() {
  return (
    <TeacherShell>
      <DataTools />
    </TeacherShell>
  );
}

function DataTools() {
  const [confirmText, setConfirmText] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const { data, reload } = usePolled<{ targets: Target[] }>("/api/teacher/purge");
  const targets = data?.targets ?? [];

  async function purge(target: Target) {
    setMessage("");

    const response = await fetch("/api/teacher/purge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: target.key, confirm: confirmText[target.key] ?? "" }),
    });
    const result = await response.json();

    if (!result.ok) {
      setMessage(result.message ?? "삭제하지 못했습니다.");
      return;
    }
    setMessage(`${target.label} ${result.affected}건을 처리했습니다.`);
    setConfirmText({ ...confirmText, [target.key]: "" });
    reload();
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">내보내기</h1>
        <p className="text-sm text-muted">
          무료 티어에는 자동 백업이 없습니다. <b>주 1회</b> 내려받아 두세요. 엑셀에서 바로 열리는
          UTF-8 CSV입니다.
        </p>
        <div className="flex flex-wrap gap-2">
          {EXPORTS.map((item) => (
            <a
              key={item.type}
              href={`/api/teacher/export?type=${item.type}`}
              className="rounded-lg border border-line bg-card px-4 py-2 text-sm"
            >
              {item.label} CSV
            </a>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">일괄 삭제</h2>
        <p className="text-sm text-muted">
          되돌릴 수 없습니다. 필요한 기록은 <b>먼저 내보낸 뒤</b> 삭제하세요.
        </p>

        <ul className="flex flex-col gap-3">
          {targets.map((target) => (
            <li
              key={target.key}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{target.label}</p>
                <p className="text-xs text-muted">{target.note}</p>
                <p className="mt-1 text-xs text-muted">
                  확인 문구 <code className="font-semibold">{target.confirm}</code> 입력 필요 ·{" "}
                  {target.lastPurge
                    ? `마지막 삭제 ${new Date(target.lastPurge.at).toLocaleString("ko-KR")} (${target.lastPurge.affected}건)`
                    : "삭제한 적 없음"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <input
                  value={confirmText[target.key] ?? ""}
                  onChange={(event) =>
                    setConfirmText({ ...confirmText, [target.key]: event.target.value })
                  }
                  placeholder={target.confirm}
                  className="w-32 rounded-lg border border-line bg-background px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => purge(target)}
                  disabled={(confirmText[target.key] ?? "") !== target.confirm}
                  className="rounded-lg border border-rose-400 px-3 py-2 text-sm text-rose-600 disabled:opacity-40"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>

        {message && <p className="text-sm">{message}</p>}
      </section>
    </div>
  );
}
