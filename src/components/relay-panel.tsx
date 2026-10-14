"use client";

import { useEffect, useRef, useState } from "react";

import { RelayCanvas, type RelayCanvasHandle } from "@/components/relay-canvas";
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
  updatedAt: number;
  isMyTurn: boolean;
  canSetTopic: boolean;
  currentDrawerName: string;
}
interface RelayData {
  assigned: boolean;
  reveal: boolean;
  all: { groupNo: number; topic: string; image: string; status: string }[];
  /** 한 사람 차례 제한 시간(초). 없거나 0이면 시간 제한 없음(카운트다운 없음). */
  turnSeconds?: number;
  group?: GroupView;
}

export function RelayPanel() {
  const { data, reload } = usePolled<RelayData>("/api/student/relay", 4000);
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
        body: JSON.stringify({ image }),
      });
      const body = await response.json();
      if (body.ok) {
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
        <MyTurnCanvas
          // 턴마다(새 판 포함) 새로 마운트 — 카운트다운과 캔버스를 깨끗이 리셋.
          key={`turn-${g.updatedAt}-${g.turnIndex}-${g.rev}`}
          turnSeconds={data.turnSeconds ?? 0}
          background={g.image}
          onSubmit={submit}
          submitting={submitting}
        />
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

/**
 * 내 차례 그림판 + 제한 시간 카운트다운.
 *
 * turnSeconds > 0 이면 내 차례에 남은 시간이 보이고, 0초가 되면 지금 캔버스를 **자동 제출**해
 * 다음 사람으로 넘긴다(게임이 멈추지 않게). 그 전에 수동 제출하면 그대로 다음으로. 자동 제출은
 * 턴마다 단 한 번(firedRef) — 제출 중이면(submittingRef) 중복 발화하지 않는다.
 *
 * 턴이 바뀌면 부모가 key 로 이 컴포넌트를 새로 마운트하므로, 폴링(4초) 재렌더에도 타이머가
 * 리셋되지 않고 턴 단위로만 초기화된다. turnSeconds 가 0/미설정이면 타이머 없이 기존 동작.
 */
function MyTurnCanvas({
  turnSeconds,
  background,
  onSubmit,
  submitting,
}: {
  turnSeconds: number;
  background: string;
  onSubmit: (dataUrl: string) => void;
  submitting: boolean;
}) {
  const canvasRef = useRef<RelayCanvasHandle>(null);
  const [remaining, setRemaining] = useState(turnSeconds > 0 ? turnSeconds : 0);
  const firedRef = useRef(false);
  // 최신 값을 참조해 stale closure·중복 제출을 막는다.
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  const submittingRef = useRef(submitting);
  submittingRef.current = submitting;

  // 1초마다 카운트다운(시간 제한 있을 때만). 마운트당 한 번만 시작한다.
  useEffect(() => {
    if (!turnSeconds || turnSeconds <= 0) return;
    setRemaining(turnSeconds);
    firedRef.current = false;
    const id = setInterval(() => {
      setRemaining((r) => (r <= 0 ? 0 : r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [turnSeconds]);

  // 0초 도달 시 자동 제출(단 한 번). 제출 중이면 건너뛴다(수동 제출이 이미 진행 중).
  useEffect(() => {
    if (!turnSeconds || turnSeconds <= 0) return;
    if (remaining > 0 || firedRef.current || submittingRef.current) return;
    firedRef.current = true;
    const url = canvasRef.current?.getDataUrl();
    if (url) onSubmitRef.current(url); // 아무것도 안 그렸어도 현재 캔버스(이전 그림)를 제출해 턴만 넘긴다.
  }, [remaining, turnSeconds]);

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center justify-between gap-2 rounded-lg border-2 border-ink bg-mint px-3 py-2 t-body-sm font-semibold">
        <span>내 차례예요! 지금까지 그림 위에 이어서 그린 뒤 제출해요.</span>
        {turnSeconds > 0 && (
          <span
            aria-label={`남은 시간 ${remaining}초`}
            className={`shrink-0 rounded-full border-2 border-ink px-2 py-0.5 tabular-nums ${
              remaining <= 5 ? "bg-pink" : "bg-white"
            }`}
          >
            ⏱ {remaining}초
          </span>
        )}
      </p>
      <RelayCanvas ref={canvasRef} background={background} onSubmit={onSubmit} submitting={submitting} />
    </div>
  );
}
