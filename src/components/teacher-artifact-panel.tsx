"use client";

import { useCallback, useState } from "react";

import { CardNews, type CardNewsData } from "@/components/card-news";
import { usePolled } from "@/lib/use-polled";
import type { WorksheetQuestion } from "@/lib/types";

/**
 * 교사용 작품 패널 — 제출 현황, 열람, 숨김, 교사 피드백.
 *
 * 목록은 획을 빼고 제목만 받는다. 한 편을 눌렀을 때만 그 작품의 획을 받아 그린다.
 * 28편치 좌표를 한꺼번에 받으면 목록 한 번 여는 데 수백 KB가 오간다.
 *
 * 자동 갱신하지 않는다 — 필요할 때 새로고침 버튼을 누른다 (PRD 10장 D2).
 */

interface Row {
  id: string;
  author: string;
  place: string;
  year: number;
  status: "draft" | "submitted";
  hidden: boolean;
  strokeCount: number;
}

interface Detail {
  card: CardNewsData & { id: string; author: string };
  status: string;
  hidden: boolean;
  worksheet: WorksheetQuestion[];
  /** 이 차시가 쓰는 두 칸의 질문. 학생 화면과 같은 것을 쓴다 */
  feedbackPrompts: { found: { label: string }; question: { label: string } };
  feedbacks: {
    id: string;
    mine: boolean;
    from: string;
    foundTech: string;
    question: string;
    authorReply: string;
  }[];
}

export function TeacherArtifactPanel({ sessionId }: { sessionId: string }) {
  const [openId, setOpenId] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);

  // 간격 없음 — 열 때 한 번. 그 뒤로는 새로고침 버튼과 숨김 처리 뒤에만 다시 읽는다.
  const { data, reload: loadList } = usePolled<{
    activity: boolean;
    rows: Row[];
    stats: { total: number; submitted: number; hidden: number } | null;
  }>(`/api/teacher/artifacts?sessionId=${sessionId}`);

  const rows = data?.activity ? data.rows : data ? [] : null;
  const stats = data?.stats ?? null;

  const openDetail = useCallback(
    async (id: string) => {
      setOpenId(id);
      setDetail(null);
      if (!id) return;

      const response = await fetch(`/api/teacher/artifacts?sessionId=${sessionId}&id=${id}`);
      const result = await response.json();
      if (result.ok) setDetail(result as Detail);
    },
    [sessionId],
  );

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch("/api/teacher/artifacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    loadList();
    if (openId === id) await openDetail(id);
  }

  if (rows === null) return null;
  if (rows.length === 0) return null;

  return (
    <section className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="t-body font-bold">
          작품 {stats ? `제출 ${stats.submitted} / ${stats.total}` : ""}
          {stats && stats.hidden > 0 ? ` · 숨김 ${stats.hidden}` : ""}
        </h2>
        <button type="button" onClick={loadList} className="pill pill-secondary t-body-sm">
          새로고침
        </button>
      </div>

      {/*
        펼친 작품은 **누른 줄 바로 아래**에 놓는다. 목록 맨 끝에 붙이면 25명 중 3번을
        눌렀을 때 화면이 저 아래로 튀고, 교사는 자기가 뭘 눌렀는지 잃어버린다.
      */}
      <ul className="flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
              <div className="min-w-0">
                <p className="t-body-sm font-semibold">
                  {row.author}
                  {row.hidden && " · 숨김"}
                </p>
                <p className="t-caption">
                  {row.place ? `${row.year}년의 ${row.place}` : "장소 미선택"} · 획{" "}
                  {row.strokeCount}개 · {row.status === "submitted" ? "제출함" : "작성 중"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => void openDetail(openId === row.id ? "" : row.id)}
                  className="pill pill-secondary t-body-sm"
                >
                  {openId === row.id ? "닫기" : "보기"}
                </button>
                <button
                  type="button"
                  onClick={() => patch(row.id, { hidden: !row.hidden })}
                  className="pill pill-secondary t-body-sm"
                >
                  {row.hidden ? "숨김 해제" : "숨기기"}
                </button>
              </div>
            </div>

            {openId === row.id && !detail && (
              <p className="t-body-sm px-3">작품을 불러오는 중…</p>
            )}

            {openId === row.id && detail && (
              <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-3">
                <CardNews
                  data={detail.card}
                  worksheet={detail.worksheet}
                  author={detail.card.author}
                  compact
                />

                {detail.feedbacks.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h3 className="t-caption">받은 피드백 {detail.feedbacks.length}개</h3>
                    {detail.feedbacks.map((item) => (
                      <div key={item.id} className="rounded-lg bg-canvas px-3 py-2">
                        <p className="t-caption">{item.from}</p>
                        {item.foundTech && <p className="t-body-sm">찾은 기술 · {item.foundTech}</p>}
                        {item.question && <p className="t-body-sm">궁금한 점 · {item.question}</p>}
                        {item.authorReply && (
                          <p className="t-body-sm mt-1">↳ 작성자 답 · {item.authorReply}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <TeacherFeedbackForm
                  key={detail.card.id}
                  prompts={detail.feedbackPrompts}
                  existing={detail.feedbacks.find((item) => item.mine)}
                  onSave={(foundTech, question) => patch(detail.card.id, { foundTech, question })}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function TeacherFeedbackForm({
  existing,
  prompts,
  onSave,
}: {
  existing?: { foundTech: string; question: string };
  prompts: { found: { label: string }; question: { label: string } };
  onSave: (foundTech: string, question: string) => Promise<void> | void;
}) {
  const [foundTech, setFoundTech] = useState(existing?.foundTech ?? "");
  const [question, setQuestion] = useState(existing?.question ?? "");

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
      <h3 className="t-caption">선생님 피드백 (학생과 같은 두 칸)</h3>
      <input
        value={foundTech}
        onChange={(event) => setFoundTech(event.target.value)}
        maxLength={200}
        placeholder={prompts.found.label}
        className="field"
      />
      <input
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        maxLength={200}
        placeholder={prompts.question.label}
        className="field"
      />
      <button
        type="button"
        onClick={() => void onSave(foundTech, question)}
        disabled={!foundTech.trim() && !question.trim()}
        className="pill pill-primary self-start"
      >
        {existing ? "고쳐서 남기기" : "남기기"}
      </button>
    </div>
  );
}
