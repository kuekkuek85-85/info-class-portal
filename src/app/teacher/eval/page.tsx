"use client";

import { useState } from "react";

import { TeacherShell } from "@/components/teacher-shell";
import { usePolled } from "@/lib/use-polled";
import { normalizeUrl } from "@/lib/url";
import {
  TEACHER_EVAL_CRITERIA,
  TEACHER_EVAL_MAX,
  TEACHER_EVAL_TOTAL_MAX,
  evalTotal,
} from "@/lib/teacher-eval";

/**
 * 발표 평가 — 교사 전용, 학생 비노출 (인간과 인공지능 7·8차시).
 *
 * ## 운영 방식에 맞춘 두 가지
 *
 *  1. **모바일 우선.** 발표 때 학생이 나와 교사 대시보드에서 발표를 진행하고, 교사는 자기
 *     스마트폰에서 이 화면으로 평가한다. 좁은 폭(~360px)에서 세로로 쌓고, 점수는 큰 터치
 *     버튼(세그먼트)으로 고르며, 가로 스크롤이 없다.
 *  2. **점수는 펼치기 전까지 안 보인다(기본 접힘).** 목록은 이름·번호와 중립 배지(평가함)만
 *     보이고, 발표자를 눌러야 그 사람 점수 칸이 열린다. 한 번에 한 명만 열린다. 그래서 이
 *     화면이 어디에 잠깐 비쳐도(공유·투사) 다른 학생 점수가 드러나지 않는다.
 *
 * 저장은 teacherFeedback 이 아니라 별도 컬렉션(teacherEvals, /api/teacher/eval)으로 간다 —
 * 학생이 닿는 어떤 화면도 이 값을 읽지 않는다.
 */

const GROUPS = [
  { key: "hai-tue-1", label: "화요일 1기" },
  { key: "hai-thu-1", label: "목요일 1기" },
] as const;

const ACTIVITY = "hai-2026-1기";

interface Row {
  studentId: string;
  name: string;
  number: number | null;
  buildUrl: string;
  slidesUrl: string;
  pitch: string;
  hasEval: boolean;
  scores: Record<string, number>;
  comment: string;
}

export default function TeacherEvalPage() {
  return (
    <TeacherShell>
      <TeacherEval />
    </TeacherShell>
  );
}

function TeacherEval() {
  const [group, setGroup] = useState<string>(GROUPS[0].key);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, reload } = usePolled<{ students: Row[] }>(
    `/api/teacher/eval?activity=${encodeURIComponent(ACTIVITY)}&group=${encodeURIComponent(group)}`,
  );
  const students = data?.students ?? null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div>
        <h1 className="t-display">발표 평가</h1>
        <p className="t-body mt-1">
          발표를 보며 발표자를 눌러 점수를 매기세요. 학생에게는 보이지 않습니다. 발표자를
          펼치기 전에는 점수가 뜨지 않아, 화면이 잠깐 비쳐도 다른 학생 점수가 드러나지 않아요.
        </p>
      </div>

      <div className="flex gap-2">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => {
              setGroup(g.key);
              setOpenId(null);
            }}
            className={`pill t-body-sm ${group === g.key ? "pill-primary" : "pill-secondary"}`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {students === null ? (
        <p className="t-body text-muted">불러오는 중…</p>
      ) : students.length === 0 ? (
        <p className="t-body text-muted">이 분반에 수강생이 없습니다.</p>
      ) : (
        <>
          <p className="t-caption">
            수강 {students.length}명 · 평가함 {students.filter((s) => s.hasEval).length}명
          </p>
          <div className="flex flex-col gap-3">
            {students.map((row) => (
              <PresenterCard
                key={row.studentId}
                row={row}
                open={openId === row.studentId}
                onToggle={() =>
                  setOpenId((cur) => (cur === row.studentId ? null : row.studentId))
                }
                onSaved={reload}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PresenterCard({
  row,
  open,
  onToggle,
  onSaved,
}: {
  row: Row;
  open: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  return (
    <section className="card flex flex-col gap-3 p-3">
      {/* 헤더 — 점수는 절대 안 띄운다. 평가했는지 여부만 중립 배지로. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex items-center justify-between gap-2 text-left"
      >
        <span className="t-card-title">
          {row.number ?? "?"} · {row.name}
          {row.hasEval && <span className="t-body-sm"> · 평가함</span>}
        </span>
        <span className="pill pill-secondary t-body-sm shrink-0">{open ? "접기" : "평가"}</span>
      </button>

      {open && <EvalForm row={row} onSaved={onSaved} />}
    </section>
  );
}

function EvalForm({ row, onSaved }: { row: Row; onSaved: () => void }) {
  const [scores, setScores] = useState<Record<string, number>>(row.scores ?? {});
  const [comment, setComment] = useState(row.comment ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const buildUrl = normalizeUrl(row.buildUrl);
  const slidesUrl = normalizeUrl(row.slidesUrl);
  const total = evalTotal(scores);

  function pick(key: string, value: number) {
    setScores((cur) => ({ ...cur, [key]: value }));
    setState("idle");
  }

  async function save() {
    setState("saving");
    try {
      const response = await fetch("/api/teacher/eval", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ activity: ACTIVITY, studentId: row.studentId, scores, comment }),
      });
      const result = await response.json();
      setState(result?.ok ? "saved" : "error");
      if (result?.ok) onSaved();
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-3">
      {/* 발표를 보며 열어 볼 참고 링크 (학생 본인이 낸 자기 것) */}
      <div className="flex flex-wrap gap-2">
        {/^https?:\/\//i.test(slidesUrl) && (
          <a href={slidesUrl} target="_blank" rel="noreferrer" className="pill pill-secondary t-body-sm">
            슬라이드 열기
          </a>
        )}
        {/^https?:\/\//i.test(buildUrl) && (
          <a href={buildUrl} target="_blank" rel="noreferrer" className="pill pill-secondary t-body-sm">
            앱 열기
          </a>
        )}
      </div>
      {row.pitch && <p className="t-body-sm text-muted">{row.pitch}</p>}

      {TEACHER_EVAL_CRITERIA.map((c) => (
        <div key={c.key} className="flex flex-col gap-1">
          <span className="t-body-sm font-semibold">{c.label}</span>
          <div className="flex gap-2">
            {Array.from({ length: TEACHER_EVAL_MAX + 1 }, (_, n) => {
              const on = scores[c.key] === n;
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pick(c.key, n)}
                  className={`min-h-[44px] flex-1 rounded-lg border text-base font-semibold ${
                    on ? "border-ink border-2 bg-surface" : "border-line bg-canvas"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <p className="t-caption">
        합계 {total} / {TEACHER_EVAL_TOTAL_MAX} (각 항목 0~{TEACHER_EVAL_MAX})
      </p>

      <textarea
        value={comment}
        onChange={(event) => {
          setComment(event.target.value);
          setState("idle");
        }}
        rows={2}
        placeholder="한마디 (선택) — 교사만 봅니다"
        className="field"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={state === "saving"}
          className="pill pill-primary min-h-[44px] self-start px-5"
        >
          {state === "saving" ? "저장 중…" : "저장"}
        </button>
        <span className="t-caption" aria-live="polite">
          {state === "saved" && "저장했어요"}
          {state === "error" && "저장 실패 — 다시 눌러 주세요"}
        </span>
      </div>
    </div>
  );
}
