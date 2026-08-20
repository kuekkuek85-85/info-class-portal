"use client";

import { useMemo, useState } from "react";

import { ArtifactCanvas } from "@/components/artifact-canvas";
import { CardNews, type CardNewsData } from "@/components/card-news";
import { usePolled } from "@/lib/use-polled";
import { REACTIONS, type WorksheetQuestion } from "@/lib/types";

/**
 * 작품 감상.
 *
 * 그림을 먼저 보여준다. 제목과 이름을 줄줄이 늘어놓은 목록에서는 무엇을 볼지 고를 수가
 * 없다 — 학생이 고르는 기준은 그림이다. 그래서 격자에 그림을 깔고, 누르면 펼친다.
 *
 * 왼쪽 필터로 좁혀 본다. "가속화가 강한 작품만" 처럼 보면, 그냥 훑는 것과 달리 그 말이
 * 실제로 쓰인다 — 2차시 퀴즈에서 모은 다섯 개가 여기서 도구가 된다.
 *
 * **무엇으로 거를지는 차시가 정한다.** 여기에 박아 두면 안 된다. 4차시(직업 조사)에는
 * 특성도 장소도 없어서, 눌러도 목록이 그대로인 체크박스 다섯 개만 남았다.
 * 서버가 항목까지 만들어 보내고(facets) 이 화면은 받은 대로 세운다.
 *
 * 점수·좋아요 순위는 없다. 그림 실력 대회로 읽히는 순간 못 그린다고 생각하는 학생이
 * 손을 놓는다 (PRD 9장).
 */

interface Work extends CardNewsData {
  id: string;
  /** 꼭 봐야 할 두 편인지 */
  assigned: boolean;
  /** 이 활동지가 어느 필터 항목에 걸리는가. 서버가 차시에 맞게 채워 보낸다 */
  facetValues: Record<string, string[]>;
  counts: Record<string, number>;
  /** 내가 눌러 둔 이모지들 */
  myReactions: string[];
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
    reactions: string[];
    authorReply: string;
  }[];
  worksheet: WorksheetQuestion[];
  facets: Facet[];
  feedbackPrompts: FeedbackPrompts;
}

/** 필터 한 묶음. 무엇으로 거를지는 차시가 정한다 (gallery 라우트의 facetsFor) */
interface Facet {
  key: string;
  label: string;
  options: { value: string; count: number }[];
  /** 상한에 걸려 안 세운 항목 수 */
  hidden: number;
}

/** 친구 것에 남기는 두 칸의 질문. 차시마다 다르다 (types.ts 의 ActivityContent 참조) */
interface FeedbackPrompts {
  found: { label: string; placeholder: string };
  question: { label: string; placeholder: string };
}

/**
 * 그림을 그리는 차시인지에 따라 부르는 말이 달라진다.
 *
 * 4차시처럼 글만 쓰는 활동에서 "작품 감상 · 친구 작품" 이라고 하면 학생이 그림을 찾는다.
 * 같은 화면을 쓰되 이름만 바꾼다.
 */
export function GalleryView({ disabled, noun = "작품" }: { disabled?: boolean; noun?: string }) {
  const [tab, setTab] = useState<"peers" | "mine">("peers");
  const [openId, setOpenId] = useState("");
  /** 필터 묶음마다 고른 항목들. 키는 서버가 준 facet.key */
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [onlyAssigned, setOnlyAssigned] = useState(false);

  // 간격을 주지 않는다 — 열 때 한 번만 읽고, 남긴 뒤에만 reload() 한다
  const { data, reload } = usePolled<GalleryData>("/api/student/gallery");

  // ?? [] 를 그대로 두면 렌더마다 새 배열이 되어 아래 useMemo 가 매번 다시 돈다
  const works = useMemo(() => data?.works ?? [], [data]);

  const filtered = useMemo(() => {
    return works.filter((work) => {
      if (onlyAssigned && !work.assigned) return false;

      for (const [key, values] of Object.entries(picked)) {
        if (values.length === 0) continue;
        /*
         * 한 묶음 안에서는 "고른 것 중 하나라도 있으면" 으로 본다.
         * 전부 만족을 요구하면 두 개만 골라도 남는 것이 거의 없다.
         * 묶음끼리는 반대로 둘 다 만족해야 한다 — 그래야 좁히는 데 쓸모가 있다.
         */
        if (!values.some((value) => (work.facetValues?.[key] ?? []).includes(value))) return false;
      }
      return true;
    });
  }, [works, onlyAssigned, picked]);

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
          친구 {noun} ({works.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={`pill flex-1 ${tab === "mine" ? "pill-primary" : "pill-secondary"}`}
        >
          {/*
            여기에 괄호 숫자를 붙이지 않는다.

            옆 탭의 (25)는 작품 수인데 이 자리에는 '받은 말'의 수가 들어가 있었다.
            나란히 놓인 두 숫자가 같은 것을 센다고 읽혀서, 작품을 낸 학생이
            "내 작품(0)"을 보고 자기 것이 사라진 줄 알았다. 말풍선을 붙여
            무엇을 센 숫자인지 보이게 하고, 받은 말이 없으면 아예 안 띄운다.
          */}
          내 {noun}
          {data.received.length > 0 && <span>💬 {data.received.length}</span>}
        </button>
      </div>

      {tab === "peers" && (
        <>
          {works.length === 0 && (
            <p className="block bg-lilac py-12 text-center t-body-lg">
              아직 올라온 {noun}이 없어요. 조금 뒤에 다시 보면 친구들 것이 올라와 있을 거예요.
            </p>
          )}

          {works.length > 0 && (
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
              <FilterPanel
                facets={data.facets ?? []}
                picked={picked}
                onPicked={setPicked}
                onlyAssigned={onlyAssigned}
                onAssigned={setOnlyAssigned}
                noun={noun}
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
                    고른 조건에 맞는 {noun}이 없어요. 필터를 조금 풀어 보세요.
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
                          {/*
                            그림이 없는 차시(4차시 직업 조사)에서는 빈 캔버스 대신 쓴 글을
                            보여준다. 새하얀 사각형이 격자를 채우면 무엇을 고를지 알 수 없다.
                          */}
                          {work.strokes.length > 0 || work.texts.length > 0 ? (
                            <ArtifactCanvas
                              strokes={work.strokes}
                              texts={work.texts}
                              pixelWidth={640}
                              className="h-auto w-full rounded bg-white"
                            />
                          ) : (
                            <div className="flex min-h-32 flex-col gap-1 rounded bg-white p-3">
                              {Object.values(work.answers)
                                .map((v) => String(v ?? "").trim())
                                .filter(Boolean)
                                .slice(0, 3)
                                .map((line, i) => (
                                  <p key={i} className="t-body-sm line-clamp-2">
                                    {line}
                                  </p>
                                ))}
                            </div>
                          )}
                          <div className="flex flex-col gap-1">
                            {(work.strokes.length > 0 || work.place) && (
                              <>
                                <p className="t-body-sm font-bold">
                                  {work.answers.place_year?.trim() ||
                                    `${work.year}년의 ${work.place || "어딘가"}`}
                                </p>
                                <p className="t-caption">{work.place}</p>
                              </>
                            )}
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
            <p className="block bg-lilac py-10 text-center t-body-lg">아직 낸 {noun}이 없어요.</p>
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
          noun={noun}
          prompts={data.feedbackPrompts}
          onClose={() => setOpenId("")}
          onSaved={reload}
          disabled={disabled}
        />
      )}
    </section>
  );
}

/**
 * 왼쪽 필터. 넓은 화면에서는 옆에, 좁은 화면에서는 위에 접혀 붙는다.
 *
 * 무엇으로 거를지는 서버가 정해 보낸다. 여기에 특성·장소를 박아 두었더니 4차시에서
 * 아무것도 거르지 못하는 체크박스 다섯 개가 남았다.
 */
function FilterPanel({
  facets,
  picked,
  onPicked,
  onlyAssigned,
  onAssigned,
  noun,
  total,
  shown,
}: {
  facets: Facet[];
  picked: Record<string, string[]>;
  onPicked: (next: Record<string, string[]>) => void;
  onlyAssigned: boolean;
  onAssigned: (next: boolean) => void;
  noun: string;
  total: number;
  shown: number;
}) {
  function toggle(key: string, value: string) {
    const list = picked[key] ?? [];
    onPicked({
      ...picked,
      [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    });
  }

  const dirty = onlyAssigned || Object.values(picked).some((list) => list.length > 0);

  /*
   * 묶음이 셋 이상이면 접는다.
   *
   * 4차시를 한 반(28명) 분량으로 열어 보니 체크박스가 마흔한 개, 필터 열 높이가
   * 1668px 이었다 — 화면이 720px 이다. 볼 활동지에 닿기까지 두 화면을 넘겨야 한다.
   * 필터가 본문을 밀어내면 그건 더 이상 도구가 아니다.
   *
   * 둘 이하(그림 차시의 특성·장소)는 지금까지처럼 펼쳐 둔다. 짧아서 문제가 없고,
   * 익숙한 화면을 이유 없이 바꾸지 않는다.
   */
  const collapsible = facets.length > 2;
  const [opened, setOpened] = useState<Record<string, boolean>>(
    // 첫 묶음만 열어 둔다. 전부 닫아 두면 무엇이 들어 있는 줄인지 눌러 봐야 안다
    () => (facets[0] ? { [facets[0].key]: true } : {}),
  );

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
        꼭 봐야 할 {noun}만
      </label>

      {/*
        좁은 화면에서는 필터가 격자 위에 통째로 얹힌다. 세로로 세워 두면 체크박스 열 개를
        지나야 그림이 나온다 — 눕혀서 두어 줄로 만든다.
      */}
      {facets.map((facet) => {
        const chosen = picked[facet.key] ?? [];
        const open = !collapsible || (opened[facet.key] ?? false);

        return (
          <div
            key={facet.key}
            className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-3 lg:flex-col"
          >
            {collapsible ? (
              <button
                type="button"
                onClick={() =>
                  setOpened((prev) => ({ ...prev, [facet.key]: !(prev[facet.key] ?? false) }))
                }
                aria-expanded={open}
                className="flex w-full items-center gap-2 text-left t-caption"
              >
                <span className="flex-1">{facet.label}</span>
                {/*
                  접힌 채로 골라 둔 것이 있으면 그것을 알려 준다. 아니면 왜 활동지가
                  몇 개밖에 안 남았는지 알 길이 없다.
                */}
                {chosen.length > 0 && <span className="shrink-0">{chosen.length}개 고름</span>}
                <span aria-hidden className="shrink-0">
                  {open ? "▾" : "▸"}
                </span>
              </button>
            ) : (
              <p className="t-caption w-full">{facet.label}</p>
            )}

            {open &&
              facet.options.map((option) => (
                <label key={option.value} className="flex items-center gap-2 t-body-sm">
                  <input
                    type="checkbox"
                    checked={chosen.includes(option.value)}
                    onChange={() => toggle(facet.key, option.value)}
                  />
                  <span className="min-w-0 break-keep">{option.value}</span>
                  {/*
                    몇 명이 적었는지. 많이 나온 순으로 세우고 있어서, 숫자가 없으면 순서가
                    제멋대로로 보인다. 겸사겸사 우리 반이 어디로 쏠렸는지도 읽힌다.
                  */}
                  {option.count > 1 && <span className="t-caption shrink-0">{option.count}</span>}
                </label>
              ))}
            {open && facet.hidden > 0 && (
              <p className="t-caption w-full">그 밖에 {facet.hidden}가지가 더 있어요.</p>
            )}
          </div>
        );
      })}

      {dirty && (
        <button
          type="button"
          onClick={() => {
            onPicked({});
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
  noun,
  prompts,
  onClose,
  onSaved,
  disabled,
}: {
  work: Work;
  worksheet: WorksheetQuestion[];
  noun: string;
  prompts: FeedbackPrompts;
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
          <h3 className="t-headline">{noun} 보기</h3>
          <button type="button" onClick={onClose} className="pill pill-secondary t-body-sm">
            닫기
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <CardNews data={work} worksheet={worksheet} />

          <ReactionBar
            artifactId={work.id}
            counts={work.counts}
            mine={work.myReactions}
            onSaved={onSaved}
            disabled={disabled}
          />

          <FeedbackForm
            key={work.id}
            artifactId={work.id}
            foundTech={work.myFoundTech}
            question={work.myQuestion}
            prompts={prompts}
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
 * 글을 쓰기 어려워하는 학생도 표현할 수 있어야 한다. **네 개를 함께 누를 수 있다** —
 * 하나만 고르게 하면 "놀랐고 아이디어도 좋다"를 표현할 수 없어서, 결국 아무 것이나
 * 하나 누르고 만다. 같은 것을 다시 누르면 꺼진다.
 *
 * 종류를 넷으로 제한한 이유는 따로다. 개수가 늘면 "좋아요 수"가 되어 잘 그린 순위가
 * 생기고, 그림 못 그린다고 생각하는 학생이 손을 놓는다 (PRD 9장).
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
  mine: string[];
  onSaved: () => void;
  disabled?: boolean;
}) {
  /*
   * 누른 즉시 화면을 바꾸고 저장은 뒤따르게 한다.
   * 서버 응답을 기다렸다 바꾸면 이모지를 연달아 누를 때 한 박자씩 밀린다.
   */
  const [picked, setPicked] = useState(mine);

  async function react(emoji: string) {
    const next = picked.includes(emoji)
      ? picked.filter((item) => item !== emoji)
      : [...picked, emoji];
    setPicked(next);

    await fetch("/api/student/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artifactId, reactions: next }),
    });
    onSaved();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {REACTIONS.map((emoji) => {
        const on = picked.includes(emoji);
        // 내가 방금 켜고 끈 것을 개수에도 바로 반영한다 (서버 값이 오기 전까지)
        const base = counts[emoji] ?? 0;
        const n = base + (on ? 1 : 0) - (mine.includes(emoji) ? 1 : 0);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => react(emoji)}
            disabled={disabled}
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
 * 첫 칸은 **자세히 들여다봐야 답할 수 있는 것**을 묻는다. 칭찬이나 평가가 아니라
 * 관찰이 오가게 하려는 것이다. 무엇을 묻는지는 차시가 정한다 — 그림을 그린 차시와
 * 글만 쓴 차시에 같은 질문을 두면 한쪽은 답할 수가 없다.
 */
function FeedbackForm({
  artifactId,
  foundTech: initialFoundTech,
  question: initialQuestion,
  prompts,
  onSaved,
  disabled,
}: {
  artifactId: string;
  foundTech: string;
  question: string;
  prompts: FeedbackPrompts;
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
        <span className="t-body-sm font-bold">{prompts.found.label}</span>
        <input
          value={foundTech}
          onChange={(event) => setFoundTech(event.target.value)}
          maxLength={200}
          disabled={disabled}
          placeholder={prompts.found.placeholder}
          className="field"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="t-body-sm font-bold">{prompts.question.label}</span>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={200}
          disabled={disabled}
          placeholder={prompts.question.placeholder}
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
    reactions: string[];
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
        {item.from} {item.reactions.join(" ")}
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
