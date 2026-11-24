"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { TeacherShell } from "@/components/teacher-shell";
import { PA_CRITERIA, PA_LEVELS, type PaVibeEntry, type PaVibeStatus } from "@/lib/pa-grading";

/**
 * 「수행평가 채점」 - 정보 33~34차 피지컬 컴퓨팅 프로젝트 (교사 전용, 핀 로그인 보호).
 *
 * 반을 고르면 학생 목록, 학생을 고르면 32~34차 산출물을 단계별(① 문제 · ② 설계 · ③ 구현 · 제출 · ④ 성찰)로
 * 한 화면에 모아 보여 주고, 아래에서 영역 ①② 를 상·중·하로 매겨 저장한다. 이전·다음으로 넘겨 가며 채점한다.
 * 잘린 AI 기록(2026-11-19 에 고친 저장 오류)은 "기록이 잘려 볼 수 없음" 으로 따로 보여 학생 잘못과 구분한다.
 */

interface ListRow {
  studentId: string;
  name: string;
  number: number;
  temporary: boolean;
  steps: { problem: boolean; design: boolean; build: boolean; submit: boolean; reflect: boolean };
  missing: string[];
  scores: Record<string, number>;
}

interface Detail {
  student: { studentId: string; name: string; number: number; classNo: number };
  texts: Record<string, string>;
  vibes: { key: string; label: string; status: PaVibeStatus; entries: PaVibeEntry[] }[];
  photo: string;
  missing: string[];
  scores: Record<string, number>;
  comment: string;
  gradedAt: number | null;
}

const STEP_LABELS: [keyof ListRow["steps"], string][] = [
  ["problem", "①"],
  ["design", "②"],
  ["build", "③"],
  ["submit", "제출"],
  ["reflect", "④"],
];

const FROM_LABEL: Record<string, string> = {
  base: "처음 코드에서",
  last: "이어서",
  mine: "내 코드 붙여넣고",
};

const levelLabel = (n?: number) => PA_LEVELS.find((l) => l.value === n)?.label ?? "-";

/** multi 답(" · " 로 이은 문자열) → 낱말 목록 */
function chips(raw: string): string[] {
  return raw
    .split(" · ")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** rows 답(객체 배열 JSON) → 표 줄 */
function rowsOf(raw: string): Record<string, string>[] {
  if (!raw.trim().startsWith("[")) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((r) => r && typeof r === "object" && Object.values(r).some((v) => String(v ?? "").trim()))
      : [];
  } catch {
    return [];
  }
}

function Empty() {
  return <span className="text-muted">(안 씀)</span>;
}

function Text({ value }: { value: string }) {
  return value.trim() ? <span className="whitespace-pre-line">{value}</span> : <Empty />;
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-line bg-canvas p-4">
      <h3 className="t-subhead">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9rem_1fr]">
      <span className="t-body-sm font-semibold text-muted">{label}</span>
      <div className="t-body-sm">{children}</div>
    </div>
  );
}

function RowsTable({ raw, columns }: { raw: string; columns: { key: string; label: string }[] }) {
  const rows = rowsOf(raw);
  if (rows.length === 0) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full t-body-sm">
        <thead>
          <tr className="text-left text-muted">
            {columns.map((c) => (
              <th key={c.key} className="border-b border-line px-2 py-1 font-semibold">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} className="border-b border-line-soft px-2 py-1 align-top">
                  {String(r[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 줄 번호가 달린 읽기 전용 코드 (번호는 선택·복사에 안 딸려온다) */
function Code({ code }: { code: string }) {
  return (
    <div className="max-h-80 overflow-auto rounded-md border border-line bg-surface p-2 font-mono text-xs leading-relaxed">
      {code.split("\n").map((line, i) => (
        <div key={i} className="flex gap-2">
          <span aria-hidden className="w-7 shrink-0 select-none border-r border-line/60 pr-2 text-right tabular-nums text-muted/60">
            {i + 1}
          </span>
          <span className="flex-1 whitespace-pre">{line === "" ? " " : line}</span>
        </div>
      ))}
    </div>
  );
}

function VibeLog({ v }: { v: Detail["vibes"][number] }) {
  if (v.status === "none") return <Field label={v.label}><Empty /></Field>;
  if (v.status === "broken")
    return (
      <Field label={v.label}>
        <span className="rounded-md bg-surface px-2 py-1 text-muted">
          기록이 잘려 볼 수 없음 (저장 오류 - 학생 잘못 아님)
        </span>
      </Field>
    );
  const last = v.entries[v.entries.length - 1];
  return (
    <Field label={`${v.label} (${v.entries.length}번)`}>
      <ol className="flex list-decimal flex-col gap-1 pl-5">
        {v.entries.map((e, i) => (
          <li key={`${e.at}-${i}`}>
            {e.prompt}
            {e.from && <span className="text-muted"> ({FROM_LABEL[e.from] ?? e.from})</span>}
            {e.startCode && (
              <details className="mt-1">
                <summary className="cursor-pointer text-muted">붙여넣은 출발 코드</summary>
                <Code code={e.startCode} />
              </details>
            )}
          </li>
        ))}
      </ol>
      {last?.code && (
        <details className="mt-2">
          <summary className="cursor-pointer text-muted">마지막으로 받은 코드 보기</summary>
          <Code code={last.code} />
        </details>
      )}
    </Field>
  );
}

export default function PaGradingPage() {
  const [classNo, setClassNo] = useState(1);
  const [list, setList] = useState<ListRow[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  // 반 목록: 반이 바뀔 때만 받아 온다 (화면 비우기는 chooseClass 가 먼저 한다)
  useEffect(() => {
    let alive = true;
    void fetch(`/api/teacher/pa-grading?classNo=${classNo}`)
      .then((r) => r.json())
      .catch(() => null)
      .then((res) => {
        if (!alive) return;
        if (res?.ok) setList(res.students);
        else setError("목록을 불러오지 못했어요.");
      });
    return () => {
      alive = false;
    };
  }, [classNo]);

  // 학생 상세: 고른 학생이 바뀔 때만 받아 온다 (화면 비우기는 chooseStudent 가 먼저 한다)
  useEffect(() => {
    if (!selected) return;
    let alive = true;
    void fetch(`/api/teacher/pa-grading?studentId=${selected}`)
      .then((r) => r.json())
      .catch(() => null)
      .then((res) => {
        if (!alive) return;
        if (res?.ok) {
          setDetail(res);
          setScores(res.scores ?? {});
          setComment(res.comment ?? "");
        } else setError("학생 기록을 불러오지 못했어요.");
      });
    return () => {
      alive = false;
    };
  }, [selected]);

  function chooseClass(c: number) {
    if (c === classNo) return;
    setClassNo(c);
    setList(null);
    setSelected(null);
    setDetail(null);
    setError("");
  }

  function chooseStudent(id: string) {
    if (id === selected) return;
    setSelected(id);
    setDetail(null);
    setSaveState("idle");
    setError("");
  }

  const index = useMemo(() => (list ?? []).findIndex((s) => s.studentId === selected), [list, selected]);
  const move = (step: number) => {
    if (!list || list.length === 0) return;
    const next = list[Math.min(Math.max(index + step, 0), list.length - 1)];
    if (next) chooseStudent(next.studentId);
  };

  async function save(): Promise<boolean> {
    if (!selected) return false;
    setSaveState("saving");
    const res = await fetch("/api/teacher/pa-grading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: selected, scores, comment }),
    })
      .then((r) => r.json())
      .catch(() => null);
    if (res?.ok) {
      setSaveState("saved");
      setList((rows) => rows?.map((r) => (r.studentId === selected ? { ...r, scores: { ...scores } } : r)) ?? rows);
      return true;
    }
    setSaveState("error");
    return false;
  }

  const t = detail?.texts ?? {};

  return (
    <TeacherShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="t-headline">수행평가 채점 - 피지컬 컴퓨팅 프로젝트</h1>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => chooseClass(c)}
                className={`pill t-body-sm ${classNo === c ? "pill-primary" : "pill-secondary"}`}
              >
                1-{c}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="t-body-sm rounded-md bg-pink px-3 py-2">{error}</p>}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* 학생 목록 */}
          <aside className="flex flex-col gap-1 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:w-80 lg:shrink-0 lg:overflow-y-auto">
            {!list && <p className="t-body-sm text-muted">불러오는 중…</p>}
            {list?.map((s) => (
              <button
                key={s.studentId}
                type="button"
                onClick={() => chooseStudent(s.studentId)}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left t-body-sm ${
                  selected === s.studentId ? "border-ink bg-cream" : "border-line bg-canvas"
                }`}
              >
                <span className="w-6 tabular-nums text-muted">{s.number}</span>
                <span className="flex-1 font-semibold">
                  {s.name || "(이름 없음)"}
                  {s.temporary && <span className="ml-1 text-xs font-normal text-muted">임시</span>}
                </span>
                <span className="flex gap-0.5" aria-label="단계별 작성">
                  {STEP_LABELS.map(([k, label]) => (
                    <span
                      key={k}
                      title={label}
                      className={`inline-block h-2.5 w-2.5 rounded-full ${s.steps[k] ? "bg-success" : "bg-line"}`}
                    />
                  ))}
                </span>
                {s.missing.length > 0 && <span className="rounded bg-pink px-1 text-xs">필수 빠짐</span>}
                <span className="w-10 text-right text-xs tabular-nums">
                  {levelLabel(s.scores.understand)}·{levelLabel(s.scores.build)}
                </span>
              </button>
            ))}
            {list && list.length === 0 && <p className="t-body-sm text-muted">명단이 없어요.</p>}
            <p className="t-caption text-muted">점: ① ② ③ 제출 ④ 작성 여부 · 오른쪽: 영역 ①·② 채점</p>
          </aside>

          {/* 학생 상세 */}
          <main className="flex min-w-0 flex-1 flex-col gap-3">
            {!selected && <p className="t-body text-muted">왼쪽에서 학생을 고르세요.</p>}
            {selected && !detail && <p className="t-body-sm text-muted">불러오는 중…</p>}
            {detail && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="t-subhead">
                    1-{detail.student.classNo} {detail.student.number}번 {detail.student.name}
                    {detail.missing.length > 0 && (
                      <span className="ml-2 rounded bg-pink px-2 py-0.5 t-body-sm">필수 빠짐: {detail.missing.join(", ")}</span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => move(-1)} disabled={index <= 0} className="pill pill-secondary t-body-sm disabled:opacity-40">
                      ← 이전
                    </button>
                    <button
                      type="button"
                      onClick={() => move(1)}
                      disabled={!list || index >= list.length - 1}
                      className="pill pill-secondary t-body-sm disabled:opacity-40"
                    >
                      다음 →
                    </button>
                  </div>
                </div>

                <Card title="① 문제 발견·정의">
                  <Field label="32차 성찰(불편)"><Text value={t.mb32_pa_problem ?? ""} /></Field>
                  <Field label="한 줄 소개"><Text value={t.mb33_summary ?? ""} /></Field>
                  <Field label="피지컬 컴퓨팅이란"><Text value={t.mb33_pc_def ?? ""} /></Field>
                  <Field label="실생활 사례"><Text value={[t.mb33_pc_case1, t.mb33_pc_case2, t.mb33_pc_case3].filter((v) => v?.trim()).join("\n")} /></Field>
                  <Field label="누가 · 상황 · 불편"><Text value={[t.mb33_who, t.mb33_when, t.mb33_what].filter((v) => v?.trim()).join("\n")} /></Field>
                  <Field label="내가 풀 문제"><Text value={t.mb33_problem ?? ""} /></Field>
                  <Field label="초기 상태"><Text value={t.mb33_state_now ?? ""} /></Field>
                  <Field label="목표 상태"><Text value={t.mb33_state_goal ?? ""} /></Field>
                  <Field label="생활 속 사례"><Text value={t.mb33_case ?? ""} /></Field>
                  <Field label="사례의 가치"><Text value={t.mb33_case_value ?? ""} /></Field>
                </Card>

                <Card title="② 구성요소 설계">
                  <Field label="입력"><Text value={t.mb33_in ?? ""} /></Field>
                  <Field label="출력"><Text value={t.mb33_out ?? ""} /></Field>
                  <Field label="꼭 필요한 기능"><Text value={t.mb33_func ?? ""} /></Field>
                  <Field label="알고리즘"><Text value={t.mb33_algo ?? ""} /></Field>
                  <Field label="입력 → 처리 → 출력">
                    <RowsTable raw={t.mb33_flow ?? ""} columns={[{ key: "in", label: "입력" }, { key: "proc", label: "처리" }, { key: "out", label: "출력" }]} />
                  </Field>
                </Card>

                <Card title="③ AI로 구현 · 검토">
                  {detail.vibes.map((v) => (
                    <VibeLog key={v.key} v={v} />
                  ))}
                  <Field label="AI 검토 기록 (33차)">
                    <RowsTable raw={t.mb33_ai_log ?? ""} columns={[{ key: "ask", label: "물어본 것" }, { key: "check", label: "확인·고친 것" }, { key: "why", label: "왜" }]} />
                  </Field>
                  <Field label="AI 검토 기록 (34차)">
                    <RowsTable raw={t.mb34_ai_log ?? ""} columns={[{ key: "ask", label: "물어본 것" }, { key: "check", label: "확인·고친 것" }, { key: "why", label: "왜" }]} />
                  </Field>
                  <Field label="오류 수정 기록">
                    <RowsTable raw={t.mb34_debug ?? ""} columns={[{ key: "bug", label: "안 된 것" }, { key: "fix", label: "고친 방법" }]} />
                  </Field>
                </Card>

                <Card title="최종 제출">
                  <Field label="MakeCode 링크 (필수)">
                    {t.mb34_link?.trim() ? (
                      <span className="flex flex-wrap items-center gap-2">
                        <a href={t.mb34_link} target="_blank" rel="noreferrer" className="pill pill-primary t-body-sm">
                          새 탭에서 열기
                        </a>
                        <span className="break-all text-xs text-muted">{t.mb34_link}</span>
                      </span>
                    ) : (
                      <span className="rounded bg-pink px-2 py-0.5">빠짐</span>
                    )}
                  </Field>
                  <Field label="동작 한 줄 (필수)">
                    {t.mb34_works?.trim() ? <Text value={t.mb34_works} /> : <span className="rounded bg-pink px-2 py-0.5">빠짐</span>}
                  </Field>
                  <Field label="넣은 개념">
                    {chips(t.mb34_concepts ?? "").length ? (
                      <span className="flex flex-wrap gap-1">
                        {chips(t.mb34_concepts ?? "").map((c) => (
                          <span key={c} className="rounded-full bg-mint px-2 py-0.5">{c}</span>
                        ))}
                      </span>
                    ) : (
                      <Empty />
                    )}
                  </Field>
                  <Field label="어디에 썼나"><Text value={t.mb34_concepts_where ?? ""} /></Field>
                  <Field label="최종 코드 (선택)">{t.mb34_code?.trim() ? <Code code={t.mb34_code} /> : <Empty />}</Field>
                  <Field label="동작 사진 (선택)">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {detail.photo ? <img src={detail.photo} alt="동작 사진" className="max-h-64 rounded-md border border-line" /> : <Empty />}
                  </Field>
                  <Field label="확장 도전"><Text value={t.mb34_ext_idea ?? ""} /></Field>
                </Card>

                <Card title="④ 성찰">
                  <Field label="기대 효과·장점"><Text value={t.mb34_effect ?? ""} /></Field>
                  <Field label="확장·개선 아이디어"><Text value={t.mb34_extend ?? ""} /></Field>
                </Card>

                {/* 채점 */}
                <section className="flex flex-col gap-3 rounded-lg border-2 border-ink bg-surface p-4">
                  <h3 className="t-subhead">채점</h3>
                  {PA_CRITERIA.map((c) => {
                    const v = scores[c.key];
                    return (
                      <div key={c.key} className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="t-body-sm font-semibold">{c.label}</span>
                          {PA_LEVELS.map((l) => (
                            <button
                              key={l.value}
                              type="button"
                              onClick={() => {
                                setScores((s) => ({ ...s, [c.key]: s[c.key] === l.value ? 0 : l.value }));
                                setSaveState("idle");
                              }}
                              className={`pill t-body-sm ${v === l.value ? "pill-primary" : "pill-secondary"}`}
                            >
                              {l.label}
                            </button>
                          ))}
                        </div>
                        {v ? (
                          <p className="t-caption text-muted">{c.descriptors[v as 1 | 2 | 3]}</p>
                        ) : (
                          <p className="t-caption text-muted">아직 안 매김</p>
                        )}
                      </div>
                    );
                  })}
                  <textarea
                    value={comment}
                    onChange={(e) => {
                      setComment(e.target.value.slice(0, 800));
                      setSaveState("idle");
                    }}
                    rows={3}
                    placeholder="메모 (학생에게 안 보여요)"
                    className="field"
                  />
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => void save()} disabled={saveState === "saving"} className="pill pill-primary disabled:opacity-60">
                      {saveState === "saving" ? "저장 중…" : "저장"}
                    </button>
                    {saveState === "saved" && <span className="t-body-sm text-success">저장됐어요</span>}
                    {saveState === "error" && <span className="t-body-sm text-rose-600">저장하지 못했어요. 다시 눌러 주세요.</span>}
                    <button type="button" onClick={() => void save().then((saved) => saved && move(1))} className="pill pill-secondary t-body-sm">
                      저장하고 다음 →
                    </button>
                  </div>
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </TeacherShell>
  );
}
