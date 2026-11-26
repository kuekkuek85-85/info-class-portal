"use client";

import { useEffect, useState } from "react";

/**
 * 단계별 교사 검토 보드 (교사 대시보드, 33차 수행평가).
 *
 *  · 학생마다 지금 쓰는 단계(답이 있는 가장 뒤 단계)와 검토 요청 상태를 한 줄로 보여 준다.
 *    검토를 기다리는 학생이 맨 위에 온다.
 *  · 학생을 누르면 지금까지 모든 단계 산출물·성찰이 팝업으로 뜨고, 단계마다 한 줄씩 피드백을 남기거나
 *    「잘했어요」를 누를 수 있다. 보내면 학생 화면에 단계별 카드가 뜨고(누르면 그 단계로 이동),
 *    보상 게임이 열린다.
 */

interface RowLike {
  studentId: string;
  name: string;
  number?: number | null;
  step?: {
    index: number;
    requestedAt: number | null;
    reviewedAt: number | null;
    verdict?: "good" | "revise" | null;
    /** 몇 번째 검토 요청인가 (없거나 0 이면 1차로 본다) */
    count?: number;
  } | null;
}

interface StepDetail {
  phase: string;
  label: string;
  missing: { key: string; label: string; need: string }[];
  fields: { key: string; label: string; value: string }[];
}

interface Detail {
  student: { studentId: string; name: string };
  steps: StepDetail[];
  reflection: { questions: string[]; answers: string[]; draft: boolean };
  requestedAt: number | null;
  count?: number;
  feedback: { at: number; verdict: "good" | "revise"; steps: Record<string, string> } | null;
  /** 차시를 넘은 피드백 기록 (오래된 것부터). lessonNo 가 없으면 33차 */
  history?: { at: number; verdict: "good" | "revise"; steps: Record<string, string>; lessonNo?: number }[];
}

/** 「N차 검토 요청」 - 1차는 그냥 「검토 요청」 */
function roundLabel(count?: number): string {
  const n = Math.max(1, count ?? 1);
  return n > 1 ? `${n}차 검토 요청` : "검토 요청";
}

/** 「방금 · 3분 전」 */
function ago(at: number, now: number): string {
  const min = Math.floor((now - at) / 60_000);
  return min < 1 ? "방금" : `${min}분 전`;
}

/** 답을 사람이 읽는 글로 (list 는 줄마다, rows 는 칸을 → 로) */
function readable(raw: string): string {
  const text = raw.trim();
  if (!text.startsWith("[")) return text;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) return text;
    return parsed
      .map((v, i) =>
        typeof v === "string"
          ? v.trim() && `${i + 1}. ${v.trim()}`
          : v && typeof v === "object"
            ? Object.values(v as Record<string, unknown>)
                .map((c) => String(c ?? "").trim())
                .filter(Boolean)
                .join(" → ")
            : "",
      )
      .filter(Boolean)
      .join("\n");
  } catch {
    return text;
  }
}

function status(row: RowLike): { text: string; className: string; order: number } {
  const step = row.step;
  if (step?.requestedAt && (!step.reviewedAt || step.reviewedAt < step.requestedAt)) {
    return { text: roundLabel(step.count), className: "bg-coral font-semibold", order: 0 };
  }
  if (step?.reviewedAt && step.verdict === "revise") return { text: "수정 요청됨", className: "bg-cream", order: 1 };
  if (step?.reviewedAt && step.verdict === "good") return { text: "통과", className: "bg-lime", order: 3 };
  if (step?.reviewedAt) return { text: "검토함", className: "bg-lime", order: 3 };
  return { text: "작성 중", className: "bg-surface", order: 2 };
}

export function StepReviewBoard<T extends RowLike>({
  sessionId,
  stepLabels,
  rows,
  who,
  onSaved,
}: {
  sessionId: string;
  stepLabels: string[];
  rows: T[];
  who: (row: T) => string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  // 경과 시간 표시용 시계 (30초마다)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  /*
   * 상태별로 묶는다(섞지 않는다): 검토 요청 → 수정 요청됨 → 작성 중 → 통과.
   *  · 검토 요청: 먼저 요청한 학생이 위(FIFO, 서버가 찍은 요청 시각 오름차순). 고쳐서 다시 요청한 학생은
   *    새 요청 시각으로 줄 끝에 선다 - 그사이 기다린 다른 학생을 앞지르지 않게.
   *  · 작성 중: 단계 순(① → ④), 같은 단계면 번호 순. 나머지 묶음은 번호 순.
   */
  const byNumber = (a: T, b: T) => (a.number ?? 99) - (b.number ?? 99);
  const groupOf = (row: T) => status(row).order;
  const groups: { key: number; title: string; tone: string; rows: T[] }[] = [
    {
      key: 0,
      title: "검토 요청 (먼저 요청한 순서)",
      tone: "border-coral bg-coral/30",
      rows: rows.filter((r) => groupOf(r) === 0).sort((a, b) => (a.step?.requestedAt ?? 0) - (b.step?.requestedAt ?? 0)),
    },
    { key: 1, title: "수정 요청됨 (학생이 고치는 중)", tone: "border-line bg-cream/40", rows: rows.filter((r) => groupOf(r) === 1).sort(byNumber) },
    {
      key: 2,
      title: "작성 중",
      tone: "border-line bg-surface",
      rows: rows
        .filter((r) => groupOf(r) === 2)
        .sort((a, b) => (a.step?.index ?? -1) - (b.step?.index ?? -1) || byNumber(a, b)),
    },
    { key: 3, title: "통과", tone: "border-line bg-lime/30", rows: rows.filter((r) => groupOf(r) === 3).sort(byNumber) },
  ];
  const waiting = groups[0].rows.length;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-card px-4 py-3">
      <h2 className="text-sm font-semibold">
        단계별 진행 · 교사 검토 {waiting > 0 && <span className="ml-1 rounded-full bg-coral px-2 py-0.5 text-xs">검토 요청 {waiting}명</span>}
      </h2>
      {rows.length === 0 && <p className="text-sm text-muted">아직 들어온 학생이 없습니다.</p>}
      {groups.map((group) => (
        <div key={group.key} className={`flex flex-col gap-1.5 rounded-lg border px-3 py-2 ${group.tone}`}>
          <h3 className="text-xs font-semibold">
            {group.title} · {group.rows.length}명
          </h3>
          {group.rows.length > 0 && (
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {group.rows.map((row, i) => {
                const s = status(row);
                const index = row.step?.index ?? -1;
                const inQueue = group.key === 0;
                return (
                  <button
                    key={row.studentId}
                    type="button"
                    onClick={() => setOpen(row.studentId)}
                    className="flex items-center justify-between gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-left text-sm hover:border-accent"
                  >
                    <span className="flex items-center gap-1.5 font-semibold">
                      {inQueue && <span className="rounded-full bg-ink px-1.5 text-xs text-canvas tabular-nums">{i + 1}</span>}
                      {who(row)}
                      {inQueue && row.step?.requestedAt && (
                        <span className="text-xs font-normal text-muted">{ago(row.step.requestedAt, now)}</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-xs text-muted">{index >= 0 ? stepLabels[index] : "아직"}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${s.className}`}>{s.text}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
      {open && (
        <StepReviewModal
          sessionId={sessionId}
          studentId={open}
          onClose={() => setOpen(null)}
          onSaved={() => {
            setOpen(null);
            onSaved();
          }}
        />
      )}
    </section>
  );
}

function StepReviewModal({
  sessionId,
  studentId,
  onClose,
  onSaved,
}: {
  sessionId: string;
  studentId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetch(`/api/teacher/step-review?sessionId=${encodeURIComponent(sessionId)}&studentId=${encodeURIComponent(studentId)}`)
      .then((r) => r.json())
      .catch(() => null)
      .then((res) => {
        if (!alive) return;
        if (res?.ok) {
          // 지난 피드백은 참고로만 보여 주고 새 칸은 비운다 - 다시 보낼 때 옛 말이 저절로 실려 가지 않게
          setDetail(res as Detail);
          setNotes({});
        } else setError(res?.message ?? "불러오지 못했어요.");
      });
    return () => {
      alive = false;
    };
  }, [sessionId, studentId]);

  async function send(verdict: "good" | "revise") {
    setSaving(true);
    setError("");
    const res = await fetch("/api/teacher/step-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, studentId, verdict, steps: notes }),
    })
      .then((r) => r.json())
      .catch(() => null);
    setSaving(false);
    if (res?.ok) onSaved();
    else setError(res?.message ?? "보내지 못했어요. 다시 눌러 주세요.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="flex w-full max-w-3xl flex-col gap-4 rounded-2xl bg-canvas p-5 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <h2 className="t-subhead">
            {detail ? detail.student.name || detail.student.studentId : "불러오는 중…"} 단계별 산출물
            {detail?.requestedAt && (
              <span className="ml-2 rounded-full bg-coral px-2 py-0.5 text-xs">{roundLabel(detail.count)}</span>
            )}
          </h2>
          <button type="button" onClick={onClose} className="pill pill-secondary t-body-sm">
            닫기
          </button>
        </div>
        {error && <p className="rounded-md bg-pink px-3 py-2 text-sm">{error}</p>}
        {detail && (
          <>
            {detail.steps.map((step) => (
              <section key={step.phase} className="flex flex-col gap-2 rounded-xl border border-line bg-card p-3">
                <h3 className="text-sm font-semibold">
                  {step.label}
                  {step.missing.length > 0 && (
                    <span className="ml-2 rounded bg-pink px-1.5 py-0.5 text-xs font-normal">
                      덜 씀: {step.missing.map((m) => `${m.label}(${m.need})`).join(", ")}
                    </span>
                  )}
                </h3>
                {step.fields.map((field) => (
                  <div key={field.key} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
                    <span className="text-xs font-semibold text-muted">{field.label}</span>
                    <p className="whitespace-pre-wrap text-sm">{readable(field.value) || <span className="text-muted">(안 씀)</span>}</p>
                  </div>
                ))}
                {(detail.history && detail.history.length > 0
                  ? detail.history
                  : detail.feedback
                    ? [detail.feedback]
                    : []
                )
                  .filter((fb) => fb.steps?.[step.phase])
                  .map((fb) => (
                    <p key={fb.at} className="rounded bg-surface px-2 py-1 text-xs text-muted">
                      {"lessonNo" in fb && fb.lessonNo ? `${fb.lessonNo}차 ` : detail.history?.length ? "33차 " : "지난 "}
                      피드백({fb.verdict === "good" ? "고생하셨습니다" : "수정해 주세요"}): {fb.steps[step.phase]}
                    </p>
                  ))}
                <textarea
                  value={notes[step.phase] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [step.phase]: e.target.value.slice(0, 600) }))}
                  rows={2}
                  placeholder="이 단계에 줄 피드백 (비우면 이 단계는 보내지 않아요)"
                  className="field text-sm"
                />
              </section>
            ))}
            <section className="flex flex-col gap-1 rounded-xl border border-line bg-card p-3">
              <h3 className="text-sm font-semibold">성찰 {detail.reflection.draft && <span className="text-xs font-normal text-muted">(아직 제출 전)</span>}</h3>
              {detail.reflection.questions.map((q, i) => (
                <div key={i} className="text-sm">
                  <p className="text-xs text-muted">{q.split("\n")[0]}</p>
                  <p className="whitespace-pre-wrap">{detail.reflection.answers[i]?.trim() || <span className="text-muted">(안 씀)</span>}</p>
                </div>
              ))}
            </section>
            <p className="text-xs text-muted">
              {detail.requestedAt ? `학생이 ${roundLabel(detail.count)}을 했어요.` : "아직 검토 요청 전이에요(미리 피드백을 보내도 돼요)."}
              {detail.feedback && " 이미 한 번 보냈어요 - 지난 피드백은 칸 위에 참고로만 보여요."} 「고생하셨습니다」는 통과(학생에게 게임이 열려요), 「수정해 주세요」는 반려(피드백 한 단계 이상 필요).
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving || !Object.values(notes).some((v) => v.trim())}
                onClick={() => void send("revise")}
                className="pill pill-secondary disabled:opacity-60"
                title="피드백을 한 단계 이상 써야 보낼 수 있어요"
              >
                수정해 주세요
              </button>
              <button type="button" disabled={saving} onClick={() => void send("good")} className="pill pill-primary disabled:opacity-60">
                고생하셨습니다
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
