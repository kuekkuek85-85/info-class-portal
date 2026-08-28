"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 참가자가 휴대폰으로 답하고, 화면이 실시간으로 모아 보여주는 부분.
 *
 * ## 세 가지 답 방식
 *
 *  · count — 눌러서 손드는 것. 몇 명인지만 센다
 *  · text  — 한 줄 적기. 말풍선으로 흩어 놓는다
 *  · money — 금액. 높은 쪽이 위로 올라간다
 *
 * 셋 다 **이름을 받지 않는다.** 월세를 얼마 내는지에 이름이 붙으면 아무도 솔직하게
 * 적지 않는다. 참가자 열쇠는 같은 사람이 다시 눌렀을 때 답을 덮어쓰기 위한 것뿐이다.
 */

export interface HandsQuestion {
  id: string;
  kind: "count" | "text" | "money";
  q: string;
  hint?: string;
}

export const HANDS: HandsQuestion[] = [
  { id: "h1", kind: "count", q: "초등학교에 계신 분" },
  { id: "h2", kind: "count", q: "중·고등학교에 계신 분" },
  { id: "h3", kind: "count", q: "아이들과 함께 바이브코딩 수업을 해보신 분" },
  {
    id: "h4",
    kind: "text",
    q: "업무 말고 수업에, 만든 것을 실제로 쓰고 계신 분",
    hint: "무엇을 쓰고 계신가요? 한 줄로",
  },
  {
    id: "h5",
    kind: "money",
    q: "AI·디지털 월세, 한 달에 얼마 내고 계신가요?",
    hint: "숫자만 적어 주세요 (원)",
  },
  {
    id: "h6",
    kind: "text",
    q: "오늘 다른 일정을 뿌리치고 오신 분",
    hint: "어떤 일정이었나요?",
  },
];

const POLL_MS = 2000;

function makeWho(): string {
  return Math.random().toString(36).slice(2, 14).replace(/[^a-z0-9]/g, "x");
}

/**
 * 이 브라우저의 참가자 열쇠. 이름이 아니라 **같은 사람인지**만 가린다.
 *
 * 첫 렌더에서는 빈 값이다. localStorage 를 렌더 중에 읽으면 서버가 그린 것과 브라우저가
 * 그린 것이 달라져 하이드레이션이 어긋난다. 붙은 뒤에 한 번 읽어 온다.
 */
export function useWho(): string {
  const [who, setWho] = useState("");

  useEffect(() => {
    // 이미 있으면 그대로 — 새로고침해도 같은 사람이어야 답이 겹치지 않는다
    let saved = "";
    try {
      saved = localStorage.getItem("sendev-who") ?? "";
      if (!saved) {
        saved = makeWho();
        localStorage.setItem("sendev-who", saved);
      }
    } catch {
      // 저장소를 막아 둔 브라우저 — 새로고침하면 새 사람이 된다. 답은 그래도 들어간다
      saved = makeWho();
    }
    // 효과가 끝난 뒤로 미룬다 — 효과 몸통에서 바로 setState 를 하면 렌더가 겹쳐 돈다
    const id = setTimeout(() => setWho(saved), 0);
    return () => clearTimeout(id);
  }, []);

  return who;
}

export type PollState = Record<string, Record<string, string>>;

/**
 * 답을 모아 온다.
 *
 * 창이 뒤에 있어도 쉬지 않는다. 슬라이드 따라오기(live-sync)는 주머니 속 휴대폰
 * 열두 대가 계속 물으면 아까워서 쉬게 했는데, 여기서 같은 규칙을 걸었더니 **강사
 * 노트북에서 창을 잠깐 바꾸는 사이에 집계가 멈췄다.** 답이 올라오는 것을 보는 것이
 * 이 코너의 전부라 멈추면 안 된다.
 *
 * 비용은 서버가 막고 있다 — 응답을 1.2초 들고 있어서, 몇 명이 보든 Firestore 읽기는
 * 초당 한 건 아래다.
 */
export function usePoll(): PollState {
  const [poll, setPoll] = useState<PollState>({});

  useEffect(() => {
    let alive = true;
    async function pull() {
      try {
        const response = await fetch("/api/sendev/poll", { cache: "no-store" });
        const result = await response.json();
        if (alive && result.ok) setPoll(result.poll ?? {});
      } catch {
        // 다음 차례에 다시 묻는다
      }
    }
    void pull();
    const id = setInterval(() => void pull(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return poll;
}

export function useAnswer(who: string) {
  return useCallback(
    (q: string, value: string) => {
      if (!who) return;
      void fetch("/api/sendev/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ who, q, value }),
      }).catch(() => undefined);
    },
    [who],
  );
}

/* ────────────────────────────────────────────────────────────
   보여주는 쪽
   ──────────────────────────────────────────────────────────── */

function values(poll: PollState, id: string): string[] {
  return Object.values(poll[id] ?? {}).filter((v) => v.trim());
}

export function HandsResult({ question, poll }: { question: HandsQuestion; poll: PollState }) {
  const rows = values(poll, question.id);

  if (question.kind === "count") {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="tabular-nums text-[7rem] leading-none font-bold">{rows.length}</p>
        <p className="t-headline">명</p>
        {/* 숫자만 크게 두면 방 안의 사람과 안 이어진다. 점을 함께 찍어 규모가 보이게 한다 */}
        <div className="flex flex-wrap justify-center gap-2">
          {rows.map((_, i) => (
            <span key={i} className="h-4 w-4 rounded-full bg-ink" />
          ))}
        </div>
      </div>
    );
  }

  if (question.kind === "money") {
    /*
     * 높은 금액이 위로. 이름이 없으니 순위표가 아니라 **금액의 줄**이다.
     * 1등만 크게 두고 나머지는 작게 — 누가 얼마인지가 아니라 "이만큼들 쓰는구나" 가
     * 이 질문의 목적이다.
     */
    const amounts = rows
      .map((v) => Number(v.replace(/[^0-9]/g, "")))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => b - a);

    if (amounts.length === 0) return <p className="t-headline text-muted">기다리는 중…</p>;

    const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
    const total = amounts.reduce((sum, n) => sum + n, 0);

    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl bg-lilac px-6 py-4">
          <p className="t-eyebrow">최고</p>
          <p className="tabular-nums text-6xl font-bold">{won(amounts[0])}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {amounts.slice(1).map((n, i) => (
            <span key={i} className="tabular-nums rounded-full bg-surface px-4 py-2 t-body-lg">
              {won(n)}
            </span>
          ))}
        </div>
        <p className="t-body-lg text-muted">
          {amounts.length}명 · 우리 방 합계 {won(total)}
        </p>
      </div>
    );
  }

  // text — 말풍선
  if (rows.length === 0) return <p className="t-headline text-muted">기다리는 중…</p>;

  const TINTS = ["bg-lime", "bg-mint", "bg-cream", "bg-coral", "bg-pink", "bg-lilac"];
  return (
    <div className="flex flex-wrap gap-3">
      {rows.map((text, i) => (
        <p
          key={`${text}-${i}`}
          className={`rounded-2xl px-5 py-3 t-body-lg ${TINTS[i % TINTS.length]}`}
        >
          {text}
        </p>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   발표 중 질문받기
   ──────────────────────────────────────────────────────────── */

/**
 * 발표를 들으며 휴대폰으로 적는 질문.
 *
 * 손을 들어 끊는 것보다 이쪽이 낫다. 3분짜리 발표를 질문이 끊으면 발표가 안 끝나고,
 * 무엇보다 **묻고 싶은데 손은 안 드는 사람**의 질문이 사라진다. 적어 두면 남는다.
 *
 * 한 사람이 한 질문이다. 다시 보내면 앞의 것을 고쳐 쓴다 — 열두 명이 여러 개씩 던지면
 * 다음 화면에서 다 읽어 줄 수가 없다.
 */
export function AskInput({ id, who, poll }: { id: string; who: string; poll: PollState }) {
  const answer = useAnswer(who);
  const mine = poll[id]?.[who] ?? "";
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState(false);

  if (!who) return null;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.trim()) return;
        answer(id, draft.trim());
        setSent(true);
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor={`ask-${id}`} className="t-body-sm font-bold">
        발표 들으며 궁금한 것을 적어 두세요
      </label>
      <textarea
        id={`ask-${id}`}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value.slice(0, 140));
          setSent(false);
        }}
        rows={3}
        placeholder="발표 끝나고 화면에 함께 띄웁니다"
        className="field"
      />
      <button type="submit" className="pill pill-primary pill-block" disabled={!draft.trim()}>
        {sent ? "보냈어요 — 고치려면 다시 보내기" : "질문 보내기"}
      </button>
      {mine && !sent && <p className="t-caption">보낸 질문 · {mine}</p>}
    </form>
  );
}

/** 받은 질문들. 퀴즈 앞에 붙는다 */
export function AskList({ id, poll }: { id: string; poll: PollState }) {
  const rows = values(poll, id);
  if (rows.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="t-eyebrow">받은 질문 {rows.length}개</h2>
      <ul className="flex flex-col gap-2">
        {rows.map((text, i) => (
          <li key={`${text}-${i}`} className="rounded-xl bg-surface px-5 py-3 t-body-lg">
            {text}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 발표 화면에 찍는 "지금 몇 개 들어왔나". 질문 내용은 발표 중에 안 띄운다 */
export function AskCount({ id, poll }: { id: string; poll: PollState }) {
  const n = values(poll, id).length;
  if (n === 0) return null;
  return <p className="t-body-lg text-muted">질문 {n}개 들어왔습니다</p>;
}

/** 휴대폰에서 답하는 칸 */
export function HandsInput({
  question,
  who,
  poll,
}: {
  question: HandsQuestion;
  who: string;
  poll: PollState;
}) {
  const answer = useAnswer(who);
  const mine = poll[question.id]?.[who] ?? "";
  /*
   * 질문이 바뀌면 쓰던 것이 비워져야 한다 — 앞 질문의 답이 남아 있으면 그대로 다시
   * 보내게 된다. 효과로 비우지 않고 부르는 쪽에서 key 를 물려 새로 만든다 (slides.tsx).
   */
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState(false);

  if (!who) return null;

  if (question.kind === "count") {
    const on = mine === "1";
    return (
      <button
        type="button"
        onClick={() => answer(question.id, on ? "" : "1")}
        className={`pill pill-block ${on ? "pill-primary" : "pill-secondary"}`}
      >
        {on ? "✋ 들었어요 — 다시 누르면 내려요" : "✋ 저요!"}
      </button>
    );
  }

  const numeric = question.kind === "money";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.trim()) return;
        answer(question.id, draft.trim());
        setSent(true);
      }}
      className="flex flex-col gap-2"
    >
      <input
        value={draft}
        onChange={(event) => {
          setDraft(numeric ? event.target.value.replace(/[^0-9]/g, "").slice(0, 9) : event.target.value.slice(0, 60));
          setSent(false);
        }}
        inputMode={numeric ? "numeric" : "text"}
        placeholder={question.hint ?? "한 줄로 적어 주세요"}
        className="field text-lg"
      />
      <button type="submit" className="pill pill-primary pill-block" disabled={!draft.trim()}>
        {sent ? "보냈어요 — 고치려면 다시 보내기" : "보내기"}
      </button>
      {mine && !sent && <p className="t-caption">보낸 답 · {mine}</p>}
    </form>
  );
}
