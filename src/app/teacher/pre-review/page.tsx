"use client";

import { useState } from "react";

import { TeacherShell } from "@/components/teacher-shell";
import { usePolled } from "@/lib/use-polled";
import { normalizeUrl } from "@/lib/url";

/**
 * 「미리 피드백」 — 분반 전체를 한 페이지에서 검토하고, 수업 전에 피드백을 써 둔다.
 *
 * 학생을 하나씩 열고 닫는 대신, 22명을 쭉 펼쳐 놓는다. 각 줄에서 앱을 새 창으로 열어
 * 눌러 보고, 그 자리에서 피드백을 타이핑해 저장한다. 저장한 것은 다음 시간 학생
 * 화면(teacher_note)에 그대로 뜬다.
 *
 * AI가 미리 써 둔 초안이 칸에 채워져 있으면, 교사는 그걸 고쳐서 저장한다. 초안은
 * 학생에게 안 보이고, 저장한 진짜 피드백만 학생에게 간다.
 */

const GROUPS = [
  { key: "hai-tue-1", label: "화요일 1기" },
  { key: "hai-thu-1", label: "목요일 1기" },
] as const;

const ACTIVITY = "hai-2026-1기";

/** 답 열쇠를 사람이 읽는 이름으로. 없는 열쇠는 그대로 보여준다 */
const LABELS: Record<string, string> = {
  problem_what: "불편했던 것",
  problem_who: "누구의 불편",
  mvp_one: "만들려던 것",
  mvp_must1: "기능 ①",
  mvp_must2: "기능 ②",
  mvp_must3: "기능 ③",
  build_prompt: "프롬프트",
  grill_a1: "누가 쓰나",
  grill_a2: "계획과 다른 점",
  fix1: "1차 고침(내 눈)",
  fix2: "2차 고침(AI)",
  fix3: "3차 고침(교사)",
  will_fix: "다음에 할 것",
};

interface Row {
  studentId: string;
  name: string;
  number: number | null;
  hasArtifact: boolean;
  answers: { key: string; value: string }[];
  aiDraft: string;
  teacherNote: string;
  reviewedAt: number;
}

export default function PreReviewPage() {
  return (
    <TeacherShell>
      <PreReview />
    </TeacherShell>
  );
}

function PreReview() {
  const [group, setGroup] = useState<string>(GROUPS[0].key);
  const { data, reload } = usePolled<{ students: Row[] }>(
    `/api/teacher/pre-review?activity=${encodeURIComponent(ACTIVITY)}&group=${encodeURIComponent(group)}`,
  );
  const students = data?.students ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="t-display">미리 피드백</h1>
          <p className="t-body mt-1">
            앱을 열어 눌러 보고, 그 자리에서 피드백을 써서 저장하세요. 다음 시간에 학생
            화면에 그대로 뜹니다.
          </p>
        </div>
        <div className="flex gap-2">
          {GROUPS.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGroup(g.key)}
              className={`pill t-body-sm ${group === g.key ? "pill-primary" : "pill-secondary"}`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {students === null ? (
        <p className="t-body text-muted">불러오는 중…</p>
      ) : students.length === 0 ? (
        <p className="t-body text-muted">이 분반에 수강생이 없습니다.</p>
      ) : (
        <>
          <p className="t-caption">
            수강 {students.length}명 · 피드백 완료{" "}
            {students.filter((s) => s.teacherNote.trim()).length}명
          </p>
          <div className="flex flex-col gap-4">
            {students.map((row) => (
              <StudentCard key={row.studentId} row={row} onSaved={reload} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StudentCard({ row, onSaved }: { row: Row; onSaved: () => void }) {
  // 처음엔 진짜 피드백이 있으면 그걸, 없으면 AI 초안을 담는다. 분반을 바꾸면 카드가
  // key(studentId)로 다시 마운트되므로 새 학생의 값으로 초기화된다
  const [note, setNote] = useState(row.teacherNote || row.aiDraft || "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // 스킴이 빠진 채 저장된 옛 링크도 눌리게 https:// 를 채워 준다 (normalizeUrl 이 trim 도 한다)
  const buildUrl = normalizeUrl(row.answers.find((a) => a.key === "build_url")?.value ?? "");
  const isLink = /^https?:\/\//i.test(buildUrl);
  const shown = row.answers.filter((a) => a.key !== "build_url");
  const fromDraft = !row.teacherNote && Boolean(row.aiDraft) && note === row.aiDraft;

  async function save() {
    setState("saving");
    try {
      const response = await fetch("/api/teacher/pre-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ activity: ACTIVITY, studentId: row.studentId, note }),
      });
      const result = await response.json();
      setState(result?.ok ? "saved" : "error");
      if (result?.ok) onSaved();
    } catch {
      setState("error");
    }
  }

  return (
    <section className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="t-card-title">
          {row.number ?? "?"} · {row.name}
          {row.teacherNote.trim() && <span className="t-body-sm"> · 피드백 완료</span>}
        </p>
        {isLink ? (
          <a href={buildUrl} target="_blank" rel="noreferrer" className="pill pill-primary t-body-sm">
            앱 열기 (새 창)
          </a>
        ) : buildUrl ? (
          <span className="t-caption">링크 아님: {buildUrl}</span>
        ) : (
          <span className="t-caption">아직 앱 링크 없음</span>
        )}
      </div>

      {shown.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg bg-surface px-3 py-2">
          {shown.map((a) => (
            <li key={a.key} className="t-body-sm">
              <b>{LABELS[a.key] ?? a.key}</b> — {a.value}
            </li>
          ))}
        </ul>
      )}

      {fromDraft && <p className="t-caption">↓ AI 초안입니다. 고쳐서 저장하면 학생에게 갑니다.</p>}
      <textarea
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
          setState("idle");
        }}
        rows={3}
        placeholder="이 학생에게 줄 피드백을 적으세요"
        className="field"
      />
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={state === "saving"} className="pill pill-primary self-start">
          {state === "saving" ? "저장 중…" : "저장"}
        </button>
        <span className="t-caption" aria-live="polite">
          {state === "saved" && "저장했어요 — 학생 화면에 뜹니다"}
          {state === "error" && "저장 실패 — 다시 눌러 주세요"}
        </span>
      </div>
    </section>
  );
}
