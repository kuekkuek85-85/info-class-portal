"use client";

import { useState } from "react";

import { CardNews, type CardNewsData } from "@/components/card-news";
import { usePolled } from "@/lib/use-polled";
import type { WorksheetQuestion } from "@/lib/types";

/**
 * 작품 감상 + 피드백.
 *
 * 필수 2편은 서버가 배정하고, 1편은 목록에서 고른다. 배정을 두는 이유는
 * "아무도 내 걸 안 봤다"를 없애기 위해서다 — 자유 선택만 두면 몇 명에게 몰린다.
 *
 * 점수·좋아요·랭킹은 없다. 그림 실력 대회로 읽히는 순간 그림을 못 그린다고 생각하는
 * 학생이 손을 놓는다 (PRD 9장).
 */

interface CardRow extends CardNewsData {
  id: string;
  author: string;
}

interface GalleryData {
  assigned: CardRow[];
  choices: { id: string; author: string; place: string; year: number }[];
  myFeedbacks: { artifactId: string; foundTech: string; question: string }[];
  mine: (CardRow & { status: string }) | null;
  received: {
    id: string;
    from: string;
    foundTech: string;
    question: string;
    authorReply: string;
  }[];
  worksheet: WorksheetQuestion[];
}

export function GalleryView({ disabled }: { disabled?: boolean }) {
  const [picked, setPicked] = useState<CardRow | null>(null);
  const [pickedId, setPickedId] = useState("");
  const [tab, setTab] = useState<"peers" | "mine">("peers");

  // 간격을 주지 않는다 — 열 때 한 번만 읽고, 피드백을 남긴 뒤에만 reload() 한다.
  const { data, reload: load } = usePolled<GalleryData>("/api/student/gallery");

  async function openChoice(id: string) {
    setPickedId(id);
    if (!id) {
      setPicked(null);
      return;
    }
    const response = await fetch(`/api/student/gallery?id=${encodeURIComponent(id)}`);
    const result = await response.json();
    if (result.ok) setPicked(result.card as CardRow);
  }

  if (!data) {
    return <p className="py-10 text-center t-body">불러오는 중…</p>;
  }

  const worksheet = data.worksheet;
  const feedbackOf = (artifactId: string) =>
    data.myFeedbacks.find((row) => row.artifactId === artifactId);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("peers")}
          className={`pill flex-1 ${tab === "peers" ? "pill-primary" : "pill-secondary"}`}
        >
          친구 작품 보기
        </button>
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={`pill flex-1 ${tab === "mine" ? "pill-primary" : "pill-secondary"}`}
        >
          내 작품 ({data.received.length})
        </button>
      </div>

      {tab === "peers" && (
        <>
          {data.assigned.length === 0 && (
            <p className="block bg-lilac py-12 text-center t-body-lg">
              아직 제출된 작품이 없어요. 조금 뒤에 다시 보면 친구들 작품이 올라와 있을 거예요.
            </p>
          )}

          {data.assigned.map((card, index) => (
            <div key={card.id} className="flex flex-col gap-3">
              <h3 className="t-eyebrow">꼭 봐야 할 작품 {index + 1}</h3>
              <CardNews data={card} worksheet={worksheet} author={card.author} />
              <FeedbackForm
                artifactId={card.id}
                existing={feedbackOf(card.id)}
                onSaved={load}
                disabled={disabled}
              />
            </div>
          ))}

          {data.choices.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-line pt-5">
              <h3 className="t-eyebrow">보고 싶은 작품 하나 더 고르기</h3>
              <select
                value={pickedId}
                onChange={(event) => void openChoice(event.target.value)}
                className="field"
              >
                <option value="">고르기</option>
                {data.choices.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.year}년의 {choice.place} — {choice.author}
                  </option>
                ))}
              </select>

              {picked && (
                <>
                  <CardNews data={picked} worksheet={worksheet} author={picked.author} />
                  <FeedbackForm
                    artifactId={picked.id}
                    existing={feedbackOf(picked.id)}
                    onSaved={load}
                    disabled={disabled}
                  />
                </>
              )}
            </div>
          )}
        </>
      )}

      {tab === "mine" && (
        <>
          {data.mine ? (
            <CardNews data={data.mine} worksheet={worksheet} />
          ) : (
            <p className="block bg-lilac py-10 text-center t-body-lg">아직 그린 작품이 없어요.</p>
          )}

          <h3 className="t-eyebrow">친구들이 남긴 말</h3>
          {data.received.length === 0 && (
            <p className="t-body">아직 없어요. 조금만 기다려 보세요.</p>
          )}

          {data.received.map((item) => (
            <ReceivedCard key={item.id} item={item} onSaved={load} disabled={disabled} />
          ))}
        </>
      )}
    </section>
  );
}

/** 두 칸짜리 고정 양식. 자유 댓글칸은 만들지 않는다 */
function FeedbackForm({
  artifactId,
  existing,
  onSaved,
  disabled,
}: {
  artifactId: string;
  existing?: { foundTech: string; question: string };
  onSaved: () => void;
  disabled?: boolean;
}) {
  const [foundTech, setFoundTech] = useState(existing?.foundTech ?? "");
  const [question, setQuestion] = useState(existing?.question ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/student/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artifactId, foundTech, question }),
    });
    const result = await response.json();
    setSaving(false);

    if (!result.ok) {
      setMessage(result.message ?? "저장하지 못했어요.");
      return;
    }
    setMessage("남겼어요!");
    onSaved();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface p-4">
      <label className="flex flex-col gap-1">
        <span className="t-body-sm font-bold">이 그림에서 찾은 기술 하나</span>
        <input
          value={foundTech}
          onChange={(event) => setFoundTech(event.target.value)}
          maxLength={200}
          disabled={disabled}
          placeholder="예) 천장에 달린 배달 드론"
          className="field"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="t-body-sm font-bold">궁금한 점 하나</span>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={200}
          disabled={disabled}
          placeholder="예) 비 오는 날에도 날 수 있나요?"
          className="field"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || disabled || (!foundTech.trim() && !question.trim())}
          className="pill pill-primary"
        >
          {existing ? "고쳐서 남기기" : "남기기"}
        </button>
        {message && <span className="t-body-sm">{message}</span>}
      </div>
    </div>
  );
}

function ReceivedCard({
  item,
  onSaved,
  disabled,
}: {
  item: { id: string; from: string; foundTech: string; question: string; authorReply: string };
  onSaved: () => void;
  disabled?: boolean;
}) {
  const [reply, setReply] = useState(item.authorReply);
  const [saving, setSaving] = useState(false);

  async function send() {
    setSaving(true);
    await fetch("/api/student/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replyTo: item.id, reply }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="card flex flex-col gap-2">
      <p className="t-caption">{item.from}</p>
      {item.foundTech && (
        <p className="t-body">
          <span className="font-bold">찾은 기술 · </span>
          {item.foundTech}
        </p>
      )}
      {item.question && (
        <p className="t-body">
          <span className="font-bold">궁금한 점 · </span>
          {item.question}
        </p>
      )}

      <div className="mt-1 flex gap-2">
        <input
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          maxLength={200}
          disabled={disabled}
          placeholder="한 줄로 답해 주세요"
          className="field flex-1"
        />
        <button
          type="button"
          onClick={send}
          disabled={saving || disabled}
          className="pill pill-secondary shrink-0"
        >
          답하기
        </button>
      </div>
    </div>
  );
}
