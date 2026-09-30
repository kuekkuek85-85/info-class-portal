"use client";

import { useState } from "react";

import { RelayCanvas } from "@/components/relay-canvas";
import { usePolled } from "@/lib/use-polled";

/**
 * 릴레이 그림 — 학생 화면. 내 모둠 상태를 폴링하며:
 *  · 내 차례면 지금까지의 모둠 그림 위에 덧그려 제출한다.
 *  · 내 차례가 아니면 "지금 ○○ 차례" 와 현재 그림을 자동 새로고침으로 본다.
 *  · 교사가 공개하면 모든 모둠 완성 그림을 함께 본다.
 *
 * 모둠 그림은 감정/게임 답(answers)과 분리된 별도 경로(relayGroups)라 감정 답이 새지 않는다.
 */

interface GroupView {
  groupNo: number;
  topic: string;
  memberNames: string[];
  turnIndex: number;
  status: "drawing" | "done";
  image: string;
  rev: number;
  isMyTurn: boolean;
  canSetTopic: boolean;
  currentDrawerName: string;
}
interface RelayData {
  assigned: boolean;
  reveal: boolean;
  all: { groupNo: number; topic: string; image: string; status: string }[];
  group?: GroupView;
}

export function RelayPanel() {
  const { data, reload } = usePolled<RelayData>("/api/student/relay", 4000);
  const [topic, setTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!data) return <p className="t-body-sm text-muted">불러오는 중…</p>;

  // 공개 — 모든 모둠 완성 그림 감상
  if (data.reveal && data.all.length > 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="t-caption">우리 반 모둠들이 이어 그린 그림이에요.</p>
        {data.all.map((g) => (
          <figure key={g.groupNo} className="flex flex-col gap-1">
            <figcaption className="t-body-sm font-semibold">
              {g.groupNo}모둠 — {g.topic}
            </figcaption>
            {g.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={g.image}
                alt={`${g.groupNo}모둠 그림`}
                className="w-full rounded-lg border-2 border-ink bg-white"
              />
            ) : (
              <p className="t-body-sm text-muted">아직 그림이 없어요.</p>
            )}
          </figure>
        ))}
      </div>
    );
  }

  if (!data.assigned || !data.group) {
    return (
      <p className="rounded-lg border border-line bg-surface px-4 py-3 t-body-sm text-muted">
        선생님이 모둠을 나누면 그림 그리기가 시작돼요. 잠깐 기다려 주세요.
      </p>
    );
  }

  const g = data.group;

  async function submit(image: string) {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/student/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, topic: g.canSetTopic ? topic : undefined }),
      });
      const body = await response.json();
      if (body.ok) {
        setTopic("");
        reload();
      } else {
        setError(body.message || "제출하지 못했어요. 다시 해 주세요.");
      }
    } catch {
      setError("연결을 확인하고 다시 해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg bg-cream px-3 py-2">
        <p className="t-body-sm font-semibold">
          {g.groupNo}모둠 · 주제: {g.topic || "(첫 사람이 정해요)"}
        </p>
        <p className="t-caption">
          순서: {g.memberNames.map((n, i) => (i === g.turnIndex ? `[${n}]` : n)).join(" → ")}
        </p>
      </div>

      {g.status === "done" ? (
        <div className="flex flex-col gap-2">
          <p className="rounded-lg border-2 border-ink bg-lime px-3 py-2 t-body-sm font-semibold">
            우리 모둠 그림이 완성됐어요! 선생님이 공개하면 다 같이 봐요.
          </p>
          {g.image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={g.image} alt="우리 모둠 그림" className="w-full rounded-lg border-2 border-ink bg-white" />
          )}
        </div>
      ) : g.isMyTurn ? (
        <div className="flex flex-col gap-2">
          <p className="rounded-lg border-2 border-ink bg-mint px-3 py-2 t-body-sm font-semibold">
            내 차례예요! 지금까지 그림 위에 이어서 그린 뒤 제출해요.
          </p>
          {g.canSetTopic && (
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value.slice(0, 40))}
              placeholder={`주제를 바꾸려면 입력 (기본: ${g.topic})`}
              className="field t-body-sm"
            />
          )}
          <RelayCanvas
            key={`turn-${g.turnIndex}-${g.rev}`}
            background={g.image}
            onSubmit={submit}
            submitting={submitting}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="rounded-lg bg-surface px-3 py-2 t-body-sm">
            지금 <b>{g.currentDrawerName}</b> 차례예요. 잠깐 기다리며 그림을 지켜봐요.
          </p>
          {g.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={g.image} alt="우리 모둠 그림" className="w-full rounded-lg border-2 border-line bg-white" />
          ) : (
            <p className="t-body-sm text-muted">아직 아무도 안 그렸어요. 곧 시작돼요.</p>
          )}
        </div>
      )}

      {error && <p className="t-body-sm rounded-md bg-pink px-4 py-3">{error}</p>}
    </div>
  );
}
