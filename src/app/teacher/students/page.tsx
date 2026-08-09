"use client";

import { useState } from "react";

import { TeacherShell } from "@/components/teacher-shell";
import { usePolled } from "@/lib/use-polled";

/**
 * 명렬표 관리 — CSV 업로드, 임시 번호 연결 (PRD 4).
 *
 * 이름은 이 컬렉션에만 둔다. 활동 기록에는 학번만 저장하고 화면에 보여줄 때만 조인하므로,
 * 기록 데이터가 유출되어도 숫자만 남는다 (PRD 5.1).
 */

interface Student {
  studentId: string;
  name: string;
  classNo: number;
  number: number;
  temporary: boolean;
  linkedStudentId?: string;
}

export default function StudentsPage() {
  return (
    <TeacherShell>
      <Students />
    </TeacherShell>
  );
}

function Students() {
  const [csv, setCsv] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState(0);

  const { data, reload } = usePolled<{ students: Student[] }>("/api/teacher/students");
  const students = data?.students ?? [];

  async function upload() {
    setBusy(true);
    setMessage("");
    setErrors([]);

    const response = await fetch("/api/teacher/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    const result = await response.json();
    setBusy(false);

    if (!result.ok) {
      setMessage(result.message ?? "등록하지 못했습니다.");
      return;
    }
    setMessage(`${result.written}명을 등록했습니다.`);
    setErrors(result.errors ?? []);
    setCsv("");
    reload();
  }

  async function readFile(file: File) {
    setCsv(await file.text());
  }

  async function link(temporaryId: string) {
    const realId = prompt(`${temporaryId} 학생의 실제 학번을 입력하세요 (예: 10209)`);
    if (!realId) return;

    const response = await fetch("/api/teacher/students", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: temporaryId, linkedStudentId: realId }),
    });
    const result = await response.json();
    if (!result.ok) setMessage(result.message ?? "연결하지 못했습니다.");
    reload();
  }

  async function remove(studentId: string) {
    if (!confirm(`${studentId} 학생을 명렬표에서 삭제할까요?`)) return;
    await fetch(`/api/teacher/students?studentId=${studentId}`, { method: "DELETE" });
    reload();
  }

  const temporary = students.filter((s) => s.temporary);
  const visible = filter === 0 ? students : students.filter((s) => s.classNo === filter);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">명렬표 업로드</h1>
        <p className="text-sm text-muted">
          CSV 한 줄이 <code>학번,이름</code> 형식입니다. 예) <code>10101,김철수</code> — 첫 줄이
          머리글이면 건너뜁니다. 기존 학생은 덮어쓰고, CSV에 없는 학생은 그대로 둡니다.
        </p>

        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readFile(file);
          }}
          className="text-sm"
        />

        <textarea
          value={csv}
          onChange={(event) => setCsv(event.target.value)}
          rows={6}
          placeholder={"학번,이름\n10101,김철수\n10102,이영희"}
          className="w-full rounded-xl border border-line bg-card px-3 py-2 font-mono text-sm"
        />

        <button
          type="button"
          onClick={upload}
          disabled={busy || !csv.trim()}
          className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "등록 중…" : "등록"}
        </button>

        {message && <p className="text-sm">{message}</p>}
        {errors.length > 0 && (
          <ul className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
            {errors.slice(0, 10).map((error) => (
              <li key={error}>· {error}</li>
            ))}
            {errors.length > 10 && <li>… 외 {errors.length - 10}건</li>}
          </ul>
        )}
      </section>

      {temporary.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">임시 번호로 들어온 학생 {temporary.length}명</h2>
          <p className="text-sm text-muted">
            명렬표에 없어 90번대로 진입한 학생입니다. 실제 학번과 연결해 두면 기록을 이어 볼 수
            있습니다.
          </p>
          <ul className="flex flex-col gap-2">
            {temporary.map((student) => (
              <li
                key={student.studentId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3 text-sm"
              >
                <span>
                  <b className="tabular-nums">{student.studentId}</b>
                  {student.linkedStudentId && (
                    <span className="ml-2 text-muted">→ {student.linkedStudentId} 연결됨</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => link(student.studentId)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs"
                >
                  실제 학번 연결
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">등록된 학생 {students.length}명</h2>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setFilter(n)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  filter === n ? "bg-accent text-white" : "border border-line"
                }`}
              >
                {n === 0 ? "전체" : `${n}반`}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-card text-left text-xs text-muted">
              <tr>
                <th className="px-3 py-2">학번</th>
                <th className="px-3 py-2">이름</th>
                <th className="px-3 py-2">반</th>
                <th className="px-3 py-2">번호</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.map((student) => (
                <tr key={student.studentId} className="border-t border-line">
                  <td className="px-3 py-2 tabular-nums">{student.studentId}</td>
                  <td className="px-3 py-2">
                    {student.name || <span className="text-muted">(임시)</span>}
                  </td>
                  <td className="px-3 py-2">{student.classNo}</td>
                  <td className="px-3 py-2 tabular-nums">{student.number}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => remove(student.studentId)}
                      className="text-xs text-rose-600"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted">
                    등록된 학생이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
