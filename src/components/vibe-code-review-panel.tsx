"use client";

import { useState } from "react";

import { usePolled } from "@/lib/use-polled";

/**
 * 교사용 — 바이브 코딩 프롬프트·AI 답 열람 (읽기 전용).
 *
 * 학생이 AI에게 보낸 프롬프트와 받은 코드·설명을 학생별로 펼쳐 읽는다. 학생 화면에 "선생님이 볼 수
 * 있어요" 를 이미 띄우고 있으므로(투명성), 교사는 여기서 무엇을 요청했는지 확인한다.
 *
 * 자동 갱신하지 않는다 — 필요할 때 새로고침을 누른다 (comfort-bot-review-panel 과 같은 구조).
 */

interface Entry {
  prompt: string;
  code: string;
  explanation: string;
  at: number;
}
interface Row {
  studentId: string;
  name: string;
  key: string;
  entries: Entry[];
  updatedAt: number;
}

export function VibeCodeReviewPanel({ sessionId }: { sessionId: string }) {
  const { data, reload } = usePolled<{ rows: Row[] }>(
    `/api/teacher/vibe-code?sessionId=${sessionId}`,
  );
  const [openId, setOpenId] = useState("");
  const [listOpen, setListOpen] = useState(false);

  const rows = data?.rows ?? null;
  if (rows === null) return null;

  const total = rows.reduce((sum, row) => sum + row.entries.length, 0);

  return (
    <section className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="t-body font-bold">
          바이브 코딩 요청 {rows.length}명 · {total}건
        </h2>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setListOpen((prev) => !prev)}
            aria-expanded={listOpen}
            className="pill pill-secondary t-body-sm"
          >
            {listOpen ? "접기" : "펼치기"}
          </button>
          {listOpen && (
            <button type="button" onClick={reload} className="pill pill-secondary t-body-sm">
              새로고침
            </button>
          )}
        </div>
      </div>

      {listOpen && rows.length === 0 && (
        <p className="t-body-sm text-muted">아직 바이브 코딩 요청이 없어요.</p>
      )}

      {listOpen && rows.length > 0 && (
        <ul className="flex flex-col gap-1">
          {rows.map((row) => {
            const id = `${row.studentId}:${row.key}`;
            const open = openId === id;
            return (
              <li key={id} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                  <div className="min-w-0">
                    <p className="t-body-sm font-semibold">{row.name}</p>
                    <p className="t-caption">요청 {row.entries.length}건</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? "" : id)}
                    className="pill pill-secondary t-body-sm shrink-0"
                  >
                    {open ? "닫기" : "보기"}
                  </button>
                </div>

                {open && (
                  <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3">
                    {row.entries
                      .slice()
                      .reverse()
                      .map((entry, index) => (
                        <div key={`${entry.at}-${index}`} className="flex flex-col gap-1 rounded-lg bg-canvas px-3 py-2">
                          <p className="t-body-sm">
                            <span className="font-semibold">요청 · </span>
                            {entry.prompt}
                          </p>
                          {entry.explanation && (
                            <p className="t-caption text-muted whitespace-pre-line">{entry.explanation}</p>
                          )}
                          {entry.code && (
                            <details className="mt-1">
                              <summary className="t-caption cursor-pointer">AI가 준 코드 보기</summary>
                              <pre className="mt-1 overflow-x-auto whitespace-pre rounded-md bg-ink px-3 py-2 font-mono text-xs text-canvas">
                                {entry.code}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
