"use client";

import { useMemo, useState } from "react";

/**
 * 교사용 — 생기부 세특 초안 만들기·다듬기·내보내기.
 *
 * 과목(정보 1~4반 · 마음톡톡 · 진로탐색)별 탭에서 학생마다 초안을 만들고, 손봐서 저장하고,
 * CSV 로 내려받는다. 교사 대시보드 안에만 있어 학생 화면에는 나오지 않는다.
 *
 * ## 열 때만 읽는다
 *
 * 명단·저장분을 읽는 API 는 과목 전체의 명단을 한꺼번에 읽는다. 대시보드를 열 때마다 읽으면
 * 쓰지도 않는 읽기가 나가므로 「열기」를 누를 때 한 번만 읽는다 (폴링 없음).
 *
 * ## 과목 전체 생성은 한 번의 호출이다
 *
 * 서버가 호출 하나당 세션을 한 번만 읽어 학생별로 나눈다. 학생을 쪼개서 여러 번 부르면
 * 그때마다 세션을 다시 읽는다 — 그래서 탭의 전원을 한 번에 보낸다 (최대 80초쯤 걸린다).
 *
 * ## 교사가 고친 글을 함부로 덮지 않는다
 *
 * 다시 만들면 저장해 둔 글이 사라진다. 교사가 고쳐 저장한 글(edited)이나 아직 저장 안 한
 * 편집 중인 글이 걸려 있으면 만들기 전에 한 번 묻는다.
 */

/** 세특 글자 수 상한. 넘으면 경고색 */
const LIMIT = 200;
const ROUND = "1";

type RowStatus = "none" | "draft" | "edited";
type Note = "자료부족" | "오류";

interface Row {
  subjectKey: string;
  subjectLabel: string;
  classNo: number;
  groupKey?: string;
  studentId: string;
  name: string;
  text: string;
  status: RowStatus;
}

interface GenerateResult {
  studentId: string;
  text: string;
  source: string;
  status: string;
  note?: Note;
}

const rowKey = (subjectKey: string, studentId: string) => `${subjectKey}__${studentId}`;

const OVERWRITE_MESSAGE = "수정한 내용을 덮어쓸까요?";

export function RecordCommentPanel() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [subjectKey, setSubjectKey] = useState<string | null>(null);

  /** 저장 전 textarea 편집본. 키가 없으면 서버 값(row.text)을 그대로 보여 준다 */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  /** 이번 생성에서 글을 못 만든 이유 (자료부족/오류). 다시 만들거나 저장하면 지운다 */
  const [notes, setNotes] = useState<Record<string, Note>>({});
  /** 생성·저장 중인 행 */
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const subjects = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of rows ?? []) {
      if (!seen.has(row.subjectKey)) seen.set(row.subjectKey, row.subjectLabel);
    }
    return [...seen].map(([key, label]) => ({ key, label }));
  }, [rows]);

  const currentKey = subjectKey ?? subjects[0]?.key ?? null;
  const tabRows = useMemo(
    () => (rows ?? []).filter((row) => row.subjectKey === currentKey),
    [rows, currentKey],
  );
  /** 한 번이라도 생성·저장이 돌고 있으면 다른 생성·저장은 막는다 (연타·중복 방지) */
  const anyBusy = bulkBusy || busyKeys.size > 0;

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/teacher/record-comments?round=${ROUND}`);
      const body = await response.json();
      if (body.ok) {
        setRows(body.rows as Row[]);
        setDrafts({});
        setNotes({});
      } else {
        setError(body.message || "불러오지 못했습니다.");
      }
    } catch {
      setError("연결을 확인하고 다시 눌러 주세요.");
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && rows === null && !loading) void load();
  }

  const textOf = (row: Row) => drafts[rowKey(row.subjectKey, row.studentId)] ?? row.text;
  const isDirty = (row: Row) => textOf(row) !== row.text;
  /** 다시 만들면 사라지는 글인가 — 고쳐 저장한 글, 또는 저장 전 편집 중인 글 */
  const wouldLose = (row: Row) => row.status === "edited" || isDirty(row);

  function setBusy(keys: string[], on: boolean) {
    setBusyKeys((prev) => {
      const next = new Set(prev);
      for (const key of keys) {
        if (on) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  }

  /** 선택한 학생들의 초안을 한 번의 호출로 만든다 */
  async function generate(targets: Row[], bulk: boolean) {
    if (targets.length === 0 || !currentKey) return;

    const lose = targets.filter(wouldLose);
    let chosen = targets;
    if (lose.length > 0) {
      if (confirm(OVERWRITE_MESSAGE)) {
        chosen = targets;
      } else if (bulk) {
        // 거절하면 고친 글은 건너뛰고 나머지만 만든다
        chosen = targets.filter((row) => !wouldLose(row));
        if (chosen.length === 0) return;
      } else {
        return;
      }
    }

    const keys = chosen.map((row) => rowKey(row.subjectKey, row.studentId));
    if (bulk) setBulkBusy(true);
    else setBusy(keys, true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/teacher/record-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          round: ROUND,
          subjectKey: currentKey,
          studentIds: chosen.map((row) => row.studentId),
        }),
      });
      const body = await response.json();
      if (!body.ok) {
        setError(body.message || "만들지 못했습니다. 조금 뒤에 다시 눌러 주세요.");
        return;
      }

      const results = body.results as GenerateResult[];
      const byId = new Map(results.map((result) => [result.studentId, result]));
      const madeIds = new Set(
        results.filter((result) => !result.note && result.text).map((result) => result.studentId),
      );

      // 만들어진 글은 행에 반영하고 편집 중이던 값은 버린다. 못 만든 행은 기존 글을 그대로 둔다
      setRows((prev) =>
        (prev ?? []).map((row) => {
          if (row.subjectKey !== currentKey) return row;
          const result = byId.get(row.studentId);
          if (!result || !madeIds.has(row.studentId)) return row;
          return { ...row, text: result.text, status: "draft" };
        }),
      );
      setDrafts((prev) => {
        const next = { ...prev };
        for (const id of madeIds) delete next[rowKey(currentKey, id)];
        return next;
      });
      setNotes((prev) => {
        const next = { ...prev };
        for (const result of results) {
          const key = rowKey(currentKey, result.studentId);
          if (result.note) next[key] = result.note;
          else delete next[key];
        }
        return next;
      });

      const failed = results.filter((result) => result.note).length;
      setMessage(
        failed > 0
          ? `${madeIds.size}명 만들었어요. ${failed}명은 만들지 못했습니다 (상태 칸 확인).`
          : `${madeIds.size}명 만들었어요.`,
      );
    } catch {
      setError("연결을 확인하고 다시 눌러 주세요. (오래 걸리면 새로고침 뒤 상태를 확인하세요)");
    } finally {
      if (bulk) setBulkBusy(false);
      else setBusy(keys, false);
    }
  }

  async function save(row: Row) {
    if (!currentKey) return;
    const key = rowKey(row.subjectKey, row.studentId);
    const text = textOf(row);
    setBusy([key], true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/teacher/record-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          round: ROUND,
          subjectKey: row.subjectKey,
          studentId: row.studentId,
          text,
        }),
      });
      const body = await response.json();
      if (!body.ok) {
        setError(body.message || "저장하지 못했습니다.");
        return;
      }
      // 서버는 앞뒤 공백을 자르고 저장한다 — 화면도 같은 값으로 맞춘다
      const saved = text.trim();
      setRows((prev) =>
        (prev ?? []).map((item) =>
          item.subjectKey === row.subjectKey && item.studentId === row.studentId
            ? { ...item, text: saved, status: "edited" }
            : item,
        ),
      );
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setNotes((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch {
      setError("연결을 확인하고 다시 눌러 주세요.");
    } finally {
      setBusy([key], false);
    }
  }

  function statusCell(row: Row) {
    const note = notes[rowKey(row.subjectKey, row.studentId)];
    if (note === "자료부족") return <span className="text-muted">자료 부족</span>;
    if (note === "오류") return <span className="font-semibold">오류 — 다시 시도</span>;
    if (isDirty(row)) return <span className="font-semibold">수정 중 (저장 전)</span>;
    if (row.status === "edited") return <span className="font-semibold">교사수정</span>;
    if (row.status === "draft") return <span>AI초안</span>;
    return <span className="text-muted">미생성</span>;
  }

  const exportBase = `/api/teacher/record-comments/export?round=${ROUND}`;

  return (
    <section className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="t-body font-bold">생기부 세특 초안</h2>
        <button type="button" onClick={toggle} className="pill pill-secondary t-body-sm">
          {open ? "접기" : "열기"}
        </button>
      </div>

      {!open && (
        <p className="t-caption">
          과목별로 학생의 활동 기록을 모아 세특 초안을 만들고, 손봐서 저장한 뒤 CSV 로 내려받습니다.
          학생 이름은 AI에 보내지 않아요.
        </p>
      )}

      {open && (
        <>
          {loading && <p className="t-caption">불러오는 중…</p>}
          {error && <p className="t-body-sm rounded-md bg-pink px-4 py-3">{error}</p>}

          {rows !== null && subjects.length === 0 && (
            <p className="t-caption">명단이 없습니다.</p>
          )}

          {subjects.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2">
                {subjects.map((subject) => (
                  <button
                    key={subject.key}
                    type="button"
                    onClick={() => setSubjectKey(subject.key)}
                    aria-current={currentKey === subject.key ? "true" : undefined}
                    className={`pill t-body-sm ${
                      currentKey === subject.key ? "pill-primary" : "pill-secondary"
                    }`}
                  >
                    {subject.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void generate(tabRows, true)}
                  disabled={anyBusy || tabRows.length === 0}
                  className="pill pill-primary t-body-sm disabled:opacity-60"
                >
                  {bulkBusy ? "만드는 중… (최대 1~2분)" : "과목 전체 생성"}
                </button>
                <a
                  href={`${exportBase}&subjectKey=${encodeURIComponent(currentKey ?? "all")}`}
                  className="pill pill-secondary t-body-sm"
                >
                  이 과목 CSV 내보내기
                </a>
                <a href={`${exportBase}&subjectKey=all`} className="pill pill-secondary t-body-sm">
                  전체 CSV
                </a>
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={anyBusy || loading}
                  className="pill pill-secondary t-body-sm disabled:opacity-60"
                >
                  새로 불러오기
                </button>
              </div>

              {bulkBusy && (
                <p className="t-caption">
                  전체 {tabRows.length}명의 초안을 한 번에 만들고 있어요. 창을 닫지 말고 기다려 주세요.
                </p>
              )}
              {message && !error && <p className="t-caption">{message}</p>}

              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead className="bg-card text-left text-xs text-muted">
                    <tr>
                      <th className="px-3 py-2">반/분반</th>
                      <th className="px-3 py-2">학번</th>
                      <th className="px-3 py-2">이름</th>
                      <th className="px-3 py-2">세특</th>
                      <th className="px-3 py-2">상태</th>
                      <th className="px-3 py-2 text-right">글자수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabRows.map((row) => {
                      const key = rowKey(row.subjectKey, row.studentId);
                      const text = textOf(row);
                      const length = text.length;
                      const rowBusy = busyKeys.has(key);
                      return (
                        <tr key={key} className="border-t border-line align-top">
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.groupKey ? row.subjectLabel : `${row.classNo}반`}
                          </td>
                          <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                            {row.studentId}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{row.name}</td>
                          <td className="px-3 py-2">
                            <textarea
                              value={text}
                              onChange={(event) =>
                                setDrafts((prev) => ({ ...prev, [key]: event.target.value }))
                              }
                              rows={4}
                              aria-label={`${row.name} 세특`}
                              disabled={rowBusy || bulkBusy}
                              className="w-full min-w-[260px] rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60"
                            />
                            <div className="mt-1 flex gap-2">
                              <button
                                type="button"
                                onClick={() => void generate([row], false)}
                                disabled={anyBusy}
                                className="pill pill-secondary t-body-sm disabled:opacity-60"
                              >
                                {rowBusy ? "처리 중…" : "생성"}
                              </button>
                              <button
                                type="button"
                                onClick={() => void save(row)}
                                disabled={anyBusy || text.trim() === ""}
                                className="pill pill-secondary t-body-sm disabled:opacity-60"
                              >
                                저장
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{statusCell(row)}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                            <span
                              className={
                                length > LIMIT ? "rounded bg-coral px-1.5 py-0.5 font-bold" : ""
                              }
                            >
                              {length}
                            </span>
                            <span className="text-muted"> / {LIMIT}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="t-caption">
                「생성」은 그 학생 한 명, 「과목 전체 생성」은 이 탭의 모든 학생을 한 번에 만듭니다.
                글자수는 {LIMIT}자 안팎이 좋아요. 고친 글은 「저장」을 눌러야 남습니다.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
