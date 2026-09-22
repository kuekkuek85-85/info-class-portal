"use client";

import { useState } from "react";

import { usePolled } from "@/lib/use-polled";

/**
 * 교사용 — 감정 위로 챗봇 대화 열람 (읽기 전용).
 *
 * 학생이 챗봇과 나눈 대화를 학생별로 펼쳐 읽는다. 학생 화면에 "이 대화는 선생님이 볼 수
 * 있어요" 를 이미 띄우고 있으므로(투명성), 교사는 여기서 대화를 읽고 후속 대응한다.
 *
 * 자동 갱신하지 않는다 — 필요할 때 새로고침을 누른다 (PRD 10장 D2).
 */

interface Row {
  studentId: string;
  name: string;
  key: string;
  situation: string;
  design: { label: string; value: string }[];
  messages: { role: "user" | "bot"; text: string; at: number }[];
  flagged: boolean;
  updatedAt: number;
}

export function ComfortBotReviewPanel({ sessionId }: { sessionId: string }) {
  const { data, reload } = usePolled<{ rows: Row[] }>(
    `/api/teacher/comfort-bot?sessionId=${sessionId}`,
  );
  const [openId, setOpenId] = useState("");
  const [listOpen, setListOpen] = useState(false);

  const rows = data?.rows ?? null;
  if (rows === null) return null;

  const flaggedCount = rows.filter((row) => row.flagged).length;

  return (
    <section className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="t-body font-bold">
          감정 위로 챗봇 대화 {rows.length}건
          {flaggedCount > 0 && (
            <span className="ml-2 rounded-full bg-pink px-2 py-0.5 t-caption">
              ⚠ 살펴볼 대화 {flaggedCount}건
            </span>
          )}
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
        <p className="t-body-sm text-muted">아직 챗봇과 나눈 대화가 없어요.</p>
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
                    <p className="t-body-sm font-semibold">
                      {row.name}
                      {row.flagged && " · ⚠ 살펴볼 대화"}
                    </p>
                    <p className="t-caption">
                      {row.situation || "상황 미선택"} · 주고받은 말 {row.messages.length}개
                    </p>
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
                    {row.flagged && (
                      <p className="rounded-md border-2 border-ink bg-pink px-3 py-2 t-body-sm">
                        이 대화에 위기 안내가 들어갔어요. 학생과 직접 이야기해 주세요.
                      </p>
                    )}

                    {row.design.length > 0 && (
                      <div className="flex flex-col gap-1 rounded-lg bg-canvas px-3 py-2">
                        <h3 className="t-caption">학생이 설계한 챗봇</h3>
                        {row.design.map((field, index) => (
                          <p key={index} className="t-body-sm">
                            <span className="font-semibold">{field.label} · </span>
                            {field.value}
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      {row.messages.map((message, index) => (
                        <div
                          key={`${message.at}-${index}`}
                          className={
                            message.role === "user" ? "flex justify-end" : "flex justify-start"
                          }
                        >
                          <p
                            className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 t-body-sm ${
                              message.role === "user" ? "bg-ink text-canvas" : "bg-cream"
                            }`}
                          >
                            {message.text}
                          </p>
                        </div>
                      ))}
                    </div>
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
