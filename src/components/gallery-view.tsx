"use client";

import { useMemo, useState } from "react";

import { ArtifactCanvas } from "@/components/artifact-canvas";
import { CardNews, type CardNewsData } from "@/components/card-news";
import { usePolled } from "@/lib/use-polled";
import { REACTIONS, TRAITS, type WorksheetQuestion } from "@/lib/types";

/**
 * 작품 감상.
 *
 * 그림을 먼저 보여준다. 제목과 이름을 줄줄이 늘어놓은 목록에서는 무엇을 볼지 고를 수가
 * 없다 — 학생이 고르는 기준은 그림이다. 그래서 격자에 그림을 깔고, 누르면 펼친다.
 *
 * 왼쪽 필터는 특성과 장소로 좁힌다. "가속화가 강한 작품만" 처럼 보면, 그냥 훑는 것과 달리
 * 특성이라는 말이 실제로 쓰인다 — 2차시 퀴즈에서 모은 다섯 개가 여기서 도구가 된다.
 *
 * 점수·좋아요 순위는 없다. 그림 실력 대회로 읽히는 순간 못 그린다고 생각하는 학생이
 * 손을 놓는다 (PRD 9장).
 */

interface Work extends CardNewsData {
  id: string;
  /** 꼭 봐야 할 두 편인지 */
  assigned: boolean;
  counts: Record<string, number>;
  myReaction: string;
  myFoundTech: string;
  myQuestion: string;
}

interface GalleryData {
  works: Work[];
  mine: (CardNewsData & { id: string; status: string; counts: Record<string, number> }) | null;
  received: {
    id: string;
    from: string;
    foundTech: string;
    question: string;
    reaction: string;
    authorReply: string;
  }[];
  worksheet: WorksheetQuestion[];
  places: string[];
}

export function GalleryView({ disabled }: { disabled?: boolean }) {
  const [tab, setTab] = useState<"peers" | "mine">("peers");
  const [openId, setOpenId] = useState("");
  const [traitFilter, setTraitFilter] = useState<string[]>([]);
  const [placeFilter, setPlaceFilter] = useState<string[]>([]);
  const [onlyAssigned, setOnlyAssigned] = useState(false);

  // 간격을 주지 않는다 — 열 때 한 번만 읽고, 남긴 뒤에만 reload() 한다
  const { data, reload } = usePolled<GalleryData>("/api/student/gallery");

  // ?? [] 를 그대로 두면 렌더마다 새 배열이 되어 아래 useMemo 가 매번 다시 돈다
  const works = useMemo(() => data?.works ?? [], [data]);

  const filtered = useMemo(() => {
    return works.filter((work) => {
      if (onlyAssigned && !work.assigned) return false;
      if (placeFilter.length > 0 && !placeFilter.includes(work.place)) return false;
      // 특성은 "고른 것 중 하나라도 있으면" 으로 본다. 전부 만족을 요구하면 거의 안 남는다.
      if (traitFilter.length > 0 && !traitFilter.some((t) => work.traits.includes(t))) return false;
      return true;
    });
  }, [works, onlyAssigned, placeFilter, traitFilter]);

  const open = works.find((work) => work.id === openId) ?? null;

  if (!data) return <p className="py-10 text-center t-body">불러오는 중…</p>;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("peers")}
          className={`pill flex-1 ${tab === "peers" ? "pill-primary" : "pill-secondary"}`}
        >
          친구 작품 ({works.length})
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
          {works.length === 0 && (
            <p className="block bg-lilac py-12 text-center t-body-lg">
              아직 그려진 작품이 없어요. 조금 뒤에 다시 보면 친구들 그림이 올라와 있을 거예요.
            </p>
          )}

          {works.length > 0 && (
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
              <FilterPanel
                places={data.places}
                traitFilter={traitFilter}
                placeFilter={placeFilter}
                onlyAssigned={onlyAssigned}
                onTrait={setTraitFilter}
                onPlace={setPlaceFilter}
                onAssigned={setOnlyAssigned}
                total={works.length}
                shown={filtered.length}
              />

              <div className="min-w-0 flex-1">
                {/*
                  칸 수를 늘리지 않는다. 그림을 알아볼 수 있어야 고를 수 있고,
                  한 화면에 많이 넣는 것보다 한 장이 큰 편이 낫다.
                */}
                {filtered.length === 0 ? (
                  <p className="rounded-lg bg-surface py-12 text-center t-body">
                    고른 조건에 맞는 작품이 없어요. 필터를 조금 풀어 보세요.
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                    {filtered.map((work) => (
                      <li key={work.id}>
                        <button
                          type="button"
                          onClick={() => setOpenId(work.id)}
                          className="flex w-full flex-col gap-2 rounded-lg border-2 border-line bg-canvas p-2 text-left transition active:scale-[0.99]"
                        >
                          {/*
                            축소해 그린다 — 원본(1600×1200) 크기로 스물다섯 장을 띄우면
                            캔버스만 190MB라 태블릿 화면이 죽는다. 카드가 커진 만큼
                            640px 로 올려 흐릿해지지 않게 했다.
                          */}
                          <ArtifactCanvas
                            strokes={work.strokes}
                            texts={work.texts}
                            pixelWidth={640}
                            className="h-auto w-full rounded bg-white"
                          />
                          <div className="flex flex-col gap-1">
                            <p className="t-body-sm font-bold">
                              {work.answers.place_year?.trim() ||
                                `${work.year}년의 ${work.place || "어딘가"}`}
                            </p>
                            <p className="t-caption">{work.place}</p>
                            {work.traits.length > 0 && (
                              <p className="flex flex-wrap gap-1">
                                {work.traits.map((trait) => (
                                  <span
                                    key={trait}
                                    className="rounded-full bg-lilac px-2 py-0.5 text-xs font-semibold"
                                  >
                                    {trait}
                                  </span>
                                ))}
                              </p>
                            )}
                            <p className="flex flex-wrap items-center gap-2">
                              {work.assigned && (
                                <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-canvas">
                                  꼭 보기
                                </span>
                              )}
                              {Object.entries(work.counts).map(([emoji, n]) => (
                                <span key={emoji} className="text-xs">
                                  {emoji} {n}
                                </span>
                              ))}
                              {(work.myFoundTech || work.myQuestion) && (
                                <span className="text-xs text-muted">✎ 남김</span>
                              )}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "mine" && (
        <>
          {data.mine ? (
            <>
              <CardNews data={data.mine} worksheet={data.worksheet} />
              {Object.keys(data.mine.counts).length > 0 && (
                <p className="flex flex-wrap gap-2">
                  {Object.entries(data.mine.counts).map(([emoji, n]) => (
                    <span key={emoji} className="rounded-full bg-surface px-3 py-1.5 t-body">
                      {emoji} {n}
                    </span>
                  ))}
                </p>
              )}
            </>
          ) : (
            <p className="block bg-lilac py-10 text-center t-body-lg">아직 그린 작품이 없어요.</p>
          )}

          <h3 className="t-eyebrow">친구들이 남긴 말</h3>
          {data.received.length === 0 && (
            <p className="t-body">아직 없어요. 조금만 기다려 보세요.</p>
          )}
          {data.received.map((item) => (
            <ReceivedCard key={item.id} item={item} onSaved={reload} disabled={disabled} />
          ))}
        </>
      )}

      {open && (
        <DetailModal
          work={open}
          worksheet={data.worksheet}
          onClose={() => setOpenId("")}
          onSaved={reload}
          disabled={disabled}
        />
      )}
    </section>
  );
}

/** 왼쪽 필터. 넓은 화면에서는 옆에, 좁은 화면에서는 위에 접혀 붙는다 */
function FilterPanel({
  places,
  traitFilter,
  placeFilter,
  onlyAssigned,
  onTrait,
  onPlace,
  onAssigned,
  total,
  shown,
}: {
  places: string[];
  traitFilter: string[];
  placeFilter: string[];
  onlyAssigned: boolean;
  onTrait: (next: string[]) => void;
  onPlace: (next: string[]) => void;
  onAssigned: (next: boolean) => void;
  total: number;
  shown: number;
}) {
  const toggle = (list: string[], value: string, set: (next: string[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const dirty = traitFilter.length > 0 || placeFilter.length > 0 || onlyAssigned;

  return (
    <aside className="flex shrink-0 flex-col gap-4 rounded-lg border border-line p-4 lg:w-56">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="t-body font-bold">필터</h3>
        <span className="t-caption">
          {shown} / {total}
        </span>
      </div>

      <label className="flex items-center gap-2 t-body-sm">
        <input
          type="checkbox"
          checked={onlyAssigned}
          onChange={(event) => onAssigned(event.target.checked)}
        />
        꼭 봐야 할 작품만
      </label>

      {/*
        좁은 화면에서는 필터가 격자 위에 통째로 얹힌다. 세로로 세워 두면 체크박스 열 개를
        지나야 그림이 나온다 — 눕혀서 두어 줄로 만든다.
      */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-3 lg:flex-col">
        <p className="t-caption w-full">디지털 사회의 특성</p>
        {TRAITS.map((trait) => (
          <label key={trait} className="flex items-center gap-2 t-body-sm">
            <input
              type="checkbox"
              checked={traitFilter.includes(trait)}
              onChange={() => toggle(traitFilter, trait, onTrait)}
            />
            {trait}
          </label>
        ))}
      </div>

      {places.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-3 lg:flex-col">
          <p className="t-caption w-full">장소</p>
          {places.map((place) => (
            <label key={place} className="flex items-center gap-2 t-body-sm">
              <input
                type="checkbox"
                checked={placeFilter.includes(place)}
                onChange={() => toggle(placeFilter, place, onPlace)}
              />
              {place}
            </label>
          ))}
        </div>
      )}

      {dirty && (
        <button
          type="button"
          onClick={() => {
            onTrait([]);
            onPlace([]);
            onAssigned(false);
          }}
          className="pill pill-secondary t-body-sm"
        >
          필터 지우기
        </button>
      )}
    </aside>
  );
}

/** 카드를 누르면 펼쳐지는 상세. 격자 위에 덮어 띄운다 */
function DetailModal({
  work,
  worksheet,
  onClose,
  onSaved,
  disabled,
}: {
  work: Work;
  worksheet: WorksheetQuestion[];
  onClose: () => void;
  onSaved: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-lg bg-canvas p-5 sm:rounded-lg">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="t-headline">작품 보기</h3>
          <button type="button" onClick={onClose} className="pill pill-secondary t-body-sm">
            닫기
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <CardNews data={work} worksheet={worksheet} />

          <ReactionBar
            artifactId={work.id}
            counts={work.counts}
            mine={work.myReaction}
            onSaved={onSaved}
            disabled={disabled}
          />

          <FeedbackForm
            key={work.id}
            artifactId={work.id}
            foundTech={work.myFoundTech}
            question={work.myQuestion}
            onSaved={onSaved}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * 이모지 반응.
 *
 * 글을 쓰기 어려워하는 학생도 표현할 수 있어야 한다. 네 개로 제한한 이유는 개수가 늘면
 * "좋아요 수"가 되어 잘 그린 순위가 생기기 때문이다. 같은 것을 다시 누르면 취소된다.
 */
function ReactionBar({
  artifactId,
  counts,
  mine,
  onSaved,
  disabled,
}: {
  artifactId: string;
  counts: Record<string, number>;
  mine: string;
  onSaved: () => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function react(emoji: string) {
    setBusy(true);
    await fetch("/api/student/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artifactId, reaction: mine === emoji ? "" : emoji }),
    });
    setBusy(false);
    onSaved();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {REACTIONS.map((emoji) => {
        const on = mine === emoji;
        const n = counts[emoji] ?? 0;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => react(emoji)}
            disabled={busy || disabled}
            aria-pressed={on}
            className={`rounded-full border-2 px-4 py-2 t-body ${
              on ? "border-ink bg-surface" : "border-line bg-canvas"
            }`}
          >
            {emoji}
            {n > 0 && <span className="ml-2 font-semibold">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 두 칸짜리 고정 양식. 자유 댓글칸은 만들지 않는다.
 *
 * 첫 칸은 일부러 "맞혀 보기"로 물었다 — 그림을 자세히 들여다봐야 답할 수 있고,
 * 칭찬이나 평가가 아니라 관찰이 오간다.
 */
function FeedbackForm({
  artifactId,
  foundTech: initialFoundTech,
  question: initialQuestion,
  onSaved,
  disabled,
}: {
  artifactId: string;
  foundTech: string;
  question: string;
  onSaved: () => void;
  disabled?: boolean;
}) {
  const [foundTech, setFoundTech] = useState(initialFoundTech);
  const [question, setQuestion] = useState(initialQuestion);
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

  const already = Boolean(initialFoundTech || initialQuestion);

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface p-4">
      <label className="flex flex-col gap-1">
        <span className="t-body-sm font-bold">이 그림에 어떤 기술이 쓰였을까요? 맞혀 보세요</span>
        <input
          value={foundTech}
          onChange={(event) => setFoundTech(event.target.value)}
          maxLength={200}
          disabled={disabled}
          placeholder="예) 천장에 달린 배달 드론인 것 같아요"
          className="field"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="t-body-sm font-bold">그림을 그린 친구에게 물어보고 싶은 것</span>
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
          {already ? "고쳐서 남기기" : "남기기"}
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
  item: {
    id: string;
    from: string;
    foundTech: string;
    question: string;
    reaction: string;
    authorReply: string;
  };
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
      <p className="t-caption">
        {item.from} {item.reaction}
      </p>
      {item.foundTech && (
        <p className="t-body">
          <span className="font-bold">찾은 기술 · </span>
          {item.foundTech}
        </p>
      )}
      {item.question && (
        <p className="t-body">
          <span className="font-bold">물어본 것 · </span>
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
