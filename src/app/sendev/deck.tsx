"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { HanoiQr } from "./hanoi-qr";

/**
 * 나눔 세션 슬라이드 뭉치.
 *
 * ## 왜 한 파일인가
 *
 * 하루 저녁에 한 번 도는 화면이다. 컴포넌트를 잘게 쪼개 파일을 늘리면 진행 중에 "그
 * 문구 어디 있지" 를 찾는 시간만 늘어난다. 슬라이드 순서대로 위에서 아래로 읽히게 둔다.
 *
 * ## 진행 방법
 *
 *  · ← → : 앞뒤 슬라이드          · Space : 다음
 *  · 빈 곳 클릭 : 다음            · 하단 단추 : 앞뒤 · 목차
 *  · N : 진행자 노트 (프로젝터에 그대로 보이니 필요할 때만)
 *
 * 빈 곳 클릭만 받고 단추 위 클릭은 무시한다. "정답 공개" 를 누르려다 슬라이드가 넘어가면
 * 되돌리는 사이에 흐름이 끊긴다.
 */

const HANOI_URL = "https://hanoi-tower-game-rosy.vercel.app/";

/* ────────────────────────────────────────────────────────────
   슬라이드 차례

   문서의 번호(S1·S2·S3)가 아니라 **실제 진행 시각** 순서로 세운다. 빙고가
   19:00~19:13, 공식 오프닝이 19:13~19:15 라서, 문서 차례대로 두면 빙고 규칙을
   띄우려고 오프닝을 지나쳤다가 되돌아와야 한다.
   ──────────────────────────────────────────────────────────── */

const SLIDES = [
  { key: "welcome", corner: "웰컴" },
  { key: "bingo", corner: "개발자 빙고" },
  { key: "opening", corner: "오프닝" },
  { key: "talk1", corner: "발표 ①" },
  { key: "quiz1", corner: "3초 퀴즈 ①" },
  { key: "hanoi", corner: "하노이 탑" },
  { key: "why", corner: "왜 하노이탑이었나" },
  { key: "talk2", corner: "발표 ②" },
  { key: "quiz2", corner: "3초 퀴즈 ②" },
  { key: "talk3", corner: "발표 ③" },
  { key: "quiz3", corner: "3초 퀴즈 ③" },
  { key: "hall", corner: "명예의 전당" },
  { key: "pawback", corner: "의문의 고양이발" },
  { key: "keycap", corner: "키캡의 정체" },
  { key: "bonus", corner: "번외" },
  { key: "closing", corner: "클로징" },
] as const;

type SlideKey = (typeof SLIDES)[number]["key"];

/** 발표 슬라이드에만 타이머가 붙는다 (분) */
const TIMER_MINUTES: Partial<Record<SlideKey, number>> = {
  talk1: 15,
  talk2: 15,
  talk3: 15,
  hanoi: 3,
};

/** 진행자만 보는 말할 거리. N 을 눌러 띄운다 */
const NOTES: Partial<Record<SlideKey, string>> = {
  why:
    "올해부터 코딩 문법을 가르치지 않습니다. 문제를 찾고 정의하는 것, 추상화하는 것,\n" +
    "알고리즘을 세우고 바이브 코딩으로 만드는 것을 가르칩니다.\n\n" +
    "구현은 이제 AI가 합니다. 그러면 사람에게 남는 일이 무엇이냐 — 문제를 알아보는 것,\n" +
    "만들어진 것을 검증하는 것, 그리고 고쳐 쓰는 것입니다.\n\n" +
    "브루트포스도 결국 완성했잖아요. 검증하고 고치면 됩니다.",
  keycap: "2단을 누르기 전에 한 박자 쉬세요. 반전은 침묵이 만듭니다.",
  hanoi: "우승자는 이름만 박제, 교구는 최다 이동수. 반전 구조라 미리 말하지 마세요.",
};

export function SendevDeck({ code }: { code: string }) {
  const [entered, setEntered] = useState(false);
  const [index, setIndex] = useState(0);
  const [showIndex, setShowIndex] = useState(false);
  const [showNote, setShowNote] = useState(false);
  /*
   * 명예의 전당에 쳐 넣은 이름.
   *
   * 슬라이드 안이 아니라 여기에 둔다. 슬라이드는 옮길 때마다 새로 만들어지는데
   * (아래 key), 우승자 이름은 시상하는 동안 앞뒤로 오가도 남아 있어야 한다.
   * 저장은 하지 않는다 — 새로고침하면 사라지고, 그래도 되는 화면이다.
   */
  const [hall, setHall] = useState({ champion: "", grit: "" });

  const slide = SLIDES[index];

  const go = useCallback((step: number) => {
    setIndex((prev) => Math.min(SLIDES.length - 1, Math.max(0, prev + step)));
    setShowNote(false);
  }, []);

  useEffect(() => {
    if (!entered) return;

    function onKey(event: KeyboardEvent) {
      // 이름을 치는 중에는 방향키가 글자 사이를 움직여야 한다
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        go(1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
      }
      if (event.key === "n" || event.key === "N") setShowNote((prev) => !prev);
      if (event.key === "Escape") {
        setShowIndex(false);
        setShowNote(false);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entered, go]);

  if (!entered) return <Gate code={code} onPass={() => setEntered(true)} />;

  return (
    <main
      className="relative flex min-h-dvh flex-col bg-canvas"
      onClick={(event) => {
        /*
          빈 곳을 눌렀을 때만 넘긴다. 단추·입력칸에서 올라온 클릭은 그 자리의 일이다 —
          "정답 공개" 를 누르자마자 슬라이드가 넘어가면 아무도 정답을 못 본다.
        */
        const hit = (event.target as HTMLElement).closest("button, input, a, textarea, summary");
        if (!hit) go(1);
      }}
    >
      <TopBar corner={slide.corner} minutes={TIMER_MINUTES[slide.key]} slideKey={slide.key} />

      <div className="flex flex-1 items-center justify-center px-8 py-4">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          {/*
            key 를 물려 슬라이드마다 새로 만든다.

            없으면 리액트가 **같은 자리의 컴포넌트를 재사용한다.** 「왜 하노이탑」과
            「키캡의 정체」가 둘 다 Steps 를 같은 자리에 두고 있어서, 앞에서 세 줄을 다
            펼쳐 놓으면 키캡 슬라이드가 열자마자 반전까지 다 보였다 — 코너 하나가 통째로
            죽는다. 퀴즈 정답도 마찬가지로 앞 슬라이드에서 연 상태가 따라왔다.

            되돌아왔을 때 정답이 다시 접히는 것은 이 구조에서 옳다. 다시 눌러서 보여주는
            것이 진행에 방해가 되지 않고, "지금 무엇이 열려 있나" 를 외울 필요가 없다.
            다만 명예의 전당에 쳐 넣은 이름은 날아가면 안 되므로 위로 올려 두었다.
          */}
          <Slide
            key={slide.key}
            slideKey={slide.key}
            hall={hall}
            onHall={setHall}
          />
        </div>
      </div>

      {showNote && NOTES[slide.key] && (
        <div className="mx-8 mb-3 rounded-xl border-2 border-ink bg-cream px-5 py-4">
          <p className="t-caption mb-1">진행자 노트 — N 을 다시 누르면 닫힙니다</p>
          <p className="t-body whitespace-pre-line">{NOTES[slide.key]}</p>
        </div>
      )}

      <BottomNav
        index={index}
        onGo={go}
        onJump={(next) => {
          setIndex(next);
          setShowIndex(false);
          setShowNote(false);
        }}
        showIndex={showIndex}
        onToggleIndex={() => setShowIndex((prev) => !prev)}
        hasNote={Boolean(NOTES[slide.key])}
        noteOn={showNote}
        onToggleNote={() => setShowNote((prev) => !prev)}
      />
    </main>
  );
}

/* ────────────────────────────────────────────────────────────
   입장
   ──────────────────────────────────────────────────────────── */

/**
 * 네 자리 입장 코드.
 *
 * 코드는 번들에 그대로 실린다 (NEXT_PUBLIC_). 감출 수 있는 값이 아니라는 뜻인데,
 * 이건 금고 자물쇠가 아니라 **문패**다 — 주소를 우연히 연 사람이 슬라이드를 미리 보는
 * 것만 막으면 된다. 진짜로 막아야 할 것이 생기면 그때는 서버를 거쳐야 한다.
 */
function Gate({ code, onPass }: { code: string; onPass: () => void }) {
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (value.trim() === code) onPass();
    else {
      setWrong(true);
      setValue("");
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-canvas p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="t-eyebrow">2026 · 08 · 28</p>
        <h1 className="t-display">제1호 교사개발자 홈커밍데이</h1>
      </div>

      <form onSubmit={submit} className="flex flex-col items-center gap-3">
        <label htmlFor="sendev-code" className="t-body">
          입장 코드 네 자리
        </label>
        <input
          id="sendev-code"
          value={value}
          onChange={(event) => {
            setValue(event.target.value.replace(/\D/g, "").slice(0, 4));
            setWrong(false);
          }}
          inputMode="numeric"
          autoFocus
          className="field w-48 text-center text-3xl tracking-[0.4em]"
          placeholder="0000"
        />
        <button type="submit" className="pill pill-primary" disabled={value.length < 4}>
          들어가기
        </button>
        {wrong && <p className="t-body-sm">코드가 다릅니다.</p>}
      </form>
    </main>
  );
}

/* ────────────────────────────────────────────────────────────
   상시 요소
   ──────────────────────────────────────────────────────────── */

function TopBar({
  corner,
  minutes,
  slideKey,
}: {
  corner: string;
  minutes?: number;
  slideKey: SlideKey;
}) {
  return (
    <header className="flex items-center justify-between gap-4 px-8 pt-6">
      <p className="t-eyebrow">교사개발자 1기 나눔 세션</p>
      <div className="flex items-center gap-5">
        {minutes && <Timer key={slideKey} minutes={minutes} />}
        <p className="t-headline">{corner}</p>
      </div>
    </header>
  );
}

/**
 * 카운트다운.
 *
 * 남은 밀리초를 깎지 않고 **끝나는 시각**을 잡아 둔다. 15분짜리를 100ms 씩 빼면
 * 탭이 뒤로 갔다 오는 사이에 몇 초씩 어긋나는데, 발표 시간은 그 몇 초로 다툰다.
 *
 * key 로 슬라이드를 물려 두어서 다른 슬라이드로 가면 타이머가 새로 만들어진다 —
 * 발표 ①의 남은 시간이 발표 ②에 딸려 가면 안 된다.
 */
function Timer({ minutes }: { minutes: number }) {
  const total = minutes * 60_000;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const endAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const remain = Math.max(0, endAt.current - Date.now());
      setLeft(remain);
      if (remain === 0) setRunning(false);
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [running]);

  const mm = Math.floor(left / 60_000);
  const ss = Math.floor((left % 60_000) / 1000);
  // 1분 아래로 내려가면 눈에 띄어야 한다. 색만 바꾸고 깜빡이지는 않는다 — 발표자가 흔들린다
  const urgent = left <= 60_000 && left > 0;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`tabular-nums text-4xl font-bold ${urgent ? "text-magenta" : ""}`}
        aria-live="off"
      >
        {mm}:{String(ss).padStart(2, "0")}
      </span>
      <button
        type="button"
        onClick={() => {
          if (!running) endAt.current = Date.now() + left;
          setRunning(!running);
        }}
        className="pill pill-secondary text-sm"
      >
        {running ? "멈춤" : left === total ? "시작" : "이어서"}
      </button>
      <button
        type="button"
        onClick={() => {
          setRunning(false);
          setLeft(total);
        }}
        className="pill pill-secondary text-sm"
      >
        되돌리기
      </button>
    </div>
  );
}

function BottomNav({
  index,
  onGo,
  onJump,
  showIndex,
  onToggleIndex,
  hasNote,
  noteOn,
  onToggleNote,
}: {
  index: number;
  onGo: (step: number) => void;
  onJump: (next: number) => void;
  showIndex: boolean;
  onToggleIndex: () => void;
  hasNote: boolean;
  noteOn: boolean;
  onToggleNote: () => void;
}) {
  return (
    <>
      {showIndex && (
        <nav className="mx-8 mb-3 flex flex-wrap gap-2 rounded-xl border border-line bg-surface p-4">
          {SLIDES.map((item, i) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onJump(i)}
              className={`pill text-sm ${i === index ? "pill-primary" : "pill-secondary"}`}
            >
              {i + 1}. {item.corner}
            </button>
          ))}
        </nav>
      )}

      <footer className="flex items-center justify-between gap-3 px-8 pb-6">
        <button type="button" onClick={() => onGo(-1)} className="pill pill-secondary">
          ← 이전
        </button>

        <div className="flex items-center gap-3">
          {hasNote && (
            <button
              type="button"
              onClick={onToggleNote}
              aria-pressed={noteOn}
              className="pill pill-secondary text-sm"
            >
              진행자 노트
            </button>
          )}
          <button type="button" onClick={onToggleIndex} className="pill pill-secondary text-sm">
            {index + 1} / {SLIDES.length}
          </button>
        </div>

        <button type="button" onClick={() => onGo(1)} className="pill pill-primary">
          다음 →
        </button>
      </footer>
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   되풀이해서 쓰는 조각
   ──────────────────────────────────────────────────────────── */

/** 눌러야 나오는 것. 퀴즈 정답·반전 문구가 전부 이걸 쓴다 */
function Reveal({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="pill pill-primary self-start">
        {label}
      </button>
    );
  }
  return <>{children}</>;
}

/**
 * 발표자 소개 + 시상.
 *
 * 세 발표가 같은 모양이라 하나로 만든다. 시상 오버레이도 셋이 같은 상을 받는
 * **반복 개그**라 같은 컴포넌트를 세 번 띄우는 것이 맞다 — 세 번째쯤에는 화면이
 * 뜨는 것만으로 웃음이 나야 한다.
 */
function TalkSlide({
  who,
  where,
  title,
  line,
}: {
  who: string;
  where: string;
  title: string;
  line: string;
}) {
  const [award, setAward] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4">
        <p className="t-eyebrow">{where}</p>
        <h1 className="t-display">{title}</h1>
        <p className="t-headline">{who}</p>
        <p className="t-body-lg text-muted">{line}</p>
        <button
          type="button"
          onClick={() => setAward(true)}
          className="pill pill-secondary mt-4 self-start"
        >
          🏆 시상하기
        </button>
      </div>

      {award && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-lilac p-10 text-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setAward(false)}
        >
          <p className="t-display">🏆 손목 산재 위로상</p>
          <p className="t-headline">{who}</p>
          <p className="t-body-lg max-w-3xl">
            발표 준비로 혹사당한 손목에, 학교안전공제회를 대신하여
            <br />
            교사개발자 1기 일동이 위로의 뜻을 전합니다.
          </p>
          <p className="t-body-lg">🖱️ 마우스 손목 받침대</p>
          <button type="button" onClick={() => setAward(false)} className="pill pill-primary">
            닫기
          </button>
        </div>
      )}
    </>
  );
}

/** 3초 퀴즈 한 문제 */
function Quiz({ q, a, note }: { q: string; a: string; note?: string }) {
  return (
    <div className="block flex flex-col gap-3 bg-cream">
      <p className="t-headline">{q}</p>
      <Reveal label="정답 공개">
        <div className="flex flex-col gap-2">
          <p className="t-display">{a}</p>
          {note && <p className="t-body-lg">{note}</p>}
        </div>
      </Reveal>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   슬라이드
   ──────────────────────────────────────────────────────────── */

interface HallState {
  champion: string;
  grit: string;
}

function Slide({
  slideKey,
  hall,
  onHall,
}: {
  slideKey: SlideKey;
  hall: HallState;
  onHall: (next: HallState) => void;
}) {
  switch (slideKey) {
    case "welcome":
      return (
        <div className="flex flex-col items-center gap-8 text-center">
          <p className="t-eyebrow">2026 · 08 · 28 · 금</p>
          <h1 className="t-display">제1호 교사개발자 홈커밍데이</h1>
          <p className="t-display animate-pulse motion-reduce:animate-none">🎉</p>
          <p className="t-headline">오시는 대로 빙고판을 받아가세요</p>
          <p className="t-body-lg text-muted">곧 시작합니다. 편히 앉아 계세요.</p>
        </div>
      );

    case "bingo":
      return (
        /*
          16:9 프로젝터(1280×720)에 다 들어가야 한다. .block 은 여백이 2rem 이라 규칙
          셋을 담으면 841px 이 되어 마지막 줄이 잘렸다. 여기서는 여백을 직접 준다.
        */
        <div className="flex flex-col gap-4">
          <h1 className="t-headline">개발자 빙고</h1>
          <ol className="flex flex-col gap-3">
            <li className="rounded-xl bg-lime px-6 py-4">
              <p className="t-headline">① 해당하는 사람을 찾아 사인 받기</p>
              <p className="t-body-lg">본인 사인 불가 · 1인당 최대 2칸</p>
            </li>
            <li className="rounded-xl bg-mint px-6 py-4">
              <p className="t-headline">② 다른 학교급 선생님 사인 칸 주의!</p>
            </li>
            <li className="rounded-xl bg-coral px-6 py-4">
              <p className="t-headline">③ 한 줄 빙고 완성하면 외치기</p>
              <p className="t-body-lg">의문의 고양이발 증정 — 정체는 비밀 🤫</p>
            </li>
          </ol>
          <p className="t-body-lg text-center">지각하신 분 사인은 2칸 인정 ❤️</p>
        </div>
      );

    case "opening":
      return (
        <div className="flex flex-col gap-6">
          <h1 className="t-display">오늘의 흐름</h1>
          <ol className="grid gap-3 sm:grid-cols-2">
            {[
              "빙고",
              "발표 ①",
              "하노이 릴레이",
              "발표 ② ③",
              "경품 추첨",
              "클로징",
            ].map((step, i) => (
              <li key={step} className="block flex items-baseline gap-3 bg-surface t-headline">
                <span className="t-eyebrow">{String(i + 1).padStart(2, "0")}</span>
                {step}
              </li>
            ))}
          </ol>
          <p className="t-body-lg text-muted">
            오늘 이 슬라이드도 제 정보 수업 포털로 돌아갑니다.
          </p>
        </div>
      );

    case "talk1":
      return (
        <TalkSlide
          where="서일중학교"
          who="이재연 선생님"
          title="바이브코딩으로 만든 가정 수업 도구"
          line="지렁이를 키우고, 두더지를 잡으며 가정 교과를 배웁니다 — 시연 준비 완료."
        />
      );

    case "quiz1":
      return (
        <div className="flex flex-col gap-5">
          <h1 className="t-headline">3초 퀴즈 ①</h1>
          <Quiz
            q="이재연 선생님의 지렁이가 먹으면서 자라는 것은?"
            a="여섯 가지 식품군 음식"
          />
          <Quiz
            q="이재연 선생님이 다음 목표로 만들고 있는 미니게임 월드의 이름은?"
            a="가정월드"
          />
          <p className="t-body-lg">
            맞히신 분께 의문의 고양이발 증정 — 이게 뭔지는 마지막에 알려드립니다 🐾
          </p>
        </div>
      );

    case "hanoi":
      return (
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex flex-col items-center gap-3">
            <HanoiQr className="h-56 w-56" />
            <p className="t-caption break-all">{HANOI_URL}</p>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <h1 className="t-display">하노이 탑</h1>
            <ol className="flex flex-col gap-2 t-body-lg">
              <li>① 제한 시간 안에 완성하기</li>
              <li>② 최소 이동 · 최단 시간으로 겨루기</li>
              <li>③ 완료 화면을 진행자에게 보여주기</li>
            </ol>
            <div className="block flex flex-col gap-2 bg-cream">
              <p className="t-headline">우승자 (최소 이동 · 최단 시간)</p>
              <p className="t-body-lg">명예의 전당에 이름 박제 + 박수</p>
              <p className="t-headline mt-2">하노이탑 교구</p>
              <p className="t-body-lg">최다 이동수 기록자에게 — 브루트포스 끈기상</p>
            </div>
            <p className="t-body text-muted">
              지난주 저희 1학년 학생들이 한 바로 그 게임입니다.
            </p>
          </div>
        </div>
      );

    case "why":
      /*
       * 이 슬라이드만 톤이 다르다.
       *
       * 앞뒤가 전부 개그 코너라, 여기까지 같은 밀도로 가면 메시지가 그냥 흘러간다.
       * 여백을 크게 두고 한 줄씩 눌러 띄운다 — 침묵이 문장을 세운다.
       *
       * 진행자 멘트는 NOTES.why 에 있다 (N 키).
       */
      return (
        <div className="flex min-h-[50vh] flex-col justify-center gap-10">
          <Steps
            lines={[
              "딸깍이면 누구나 만드는 시대에,",
              "왜 우리는 원판을 옮기고 있었을까요?",
              "— 이 게임, 사실 제 수업 자료입니다.",
            ]}
          />
          <p className="t-body-lg text-muted">
            문제 정의 · 추상화 · 알고리즘 → 바이브 코딩 → 검증 · 유지보수
          </p>
        </div>
      );

    case "talk2":
      return (
        <TalkSlide
          where="서울군자초등학교"
          who="김효진 선생님"
          title="업무를 자동화하는 코드 한 줄"
          line="보물창고부터 정책정보 아카이브까지, 랄라쌤의 자동화 5종 세트."
        />
      );

    case "quiz2":
      return (
        <div className="flex flex-col gap-5">
          <h1 className="t-headline">3초 퀴즈 ②</h1>
          <Quiz
            q="김효진 선생님이 ‘슬라이도처럼’ 을 직접 만든 이유 — 무료 요금제의 질문 개수 제한은 몇 개였을까요?"
            a="3개"
          />
          <Quiz
            q="Wee클래스 상담일지의 기록은 어디에만 저장될까요?"
            a="상담교사의 업무 PC"
            note="로컬 저장 — 서버가 없습니다."
          />
        </div>
      );

    case "talk3":
      return (
        <TalkSlide
          where="대신중학교"
          who="박환석 선생님"
          title="수행평가 성적 열람 시스템을 개발하면서"
          line="나이스 엑셀에서 QR 열람까지, 그리고 개인정보를 지키는 2초의 긴장감."
        />
      );

    case "quiz3":
      return (
        <div className="flex flex-col gap-5">
          <h1 className="t-headline">3초 퀴즈 ③</h1>
          <Quiz q="박환석 선생님이 학생 성적 조회를 허용한 시간은 단 몇 초?" a="2초" />
          <Quiz q="이 시스템이 거쳐야 했던 심의 기구는?" a="학교운영위원회" note="학운위" />
        </div>
      );

    case "hall":
      return <HallOfFame hall={hall} onHall={onHall} />;

    case "pawback":
      return (
        <div className="flex flex-col items-center gap-8 text-center">
          <p className="t-display">🐾</p>
          <h1 className="t-display">의문의 고양이발</h1>
          <p className="t-headline">행사 중간에 이걸 받으신 분들, 궁금하셨죠?</p>
        </div>
      );

    case "keycap":
      return (
        <div className="flex min-h-[50vh] flex-col justify-center gap-8">
          <Steps
            lines={[
              "우리 모두 교사개발자 1기라서, ‘개발자 키캡’ 을 기념품으로 찾아 헤맸습니다.\n그런데 교사개발자 키캡은 세상에 없더라고요.\n그래서… 고양이발을 샀습니다.",
              "그런데 사 놓고 보니, 이거 개발자 키캡 맞습니다.\ncat — 리눅스 명령어잖아요.\n오늘부터 여러분 손끝엔 cat 명령어가 있습니다.",
            ]}
            big
          />
          <p className="t-headline text-center">🐾 전원 증정</p>
        </div>
      );

    case "bonus":
      return (
        <div className="flex flex-col gap-6">
          <h1 className="t-display">번외 — 이 슬라이드도 사례입니다</h1>
          <p className="t-body-lg">
            정보 수업 포털 · 중학교 정보 수업과 선택과목을 한 화면으로 굴리는 웹 앱입니다.
          </p>
          <ul className="flex flex-col gap-2 t-body-lg">
            <li>· 오늘 이 슬라이드가 그 포털의 라우트 하나입니다</li>
            <li>· 발표 타이머 · 퀴즈 정답 공개 · 시상 오버레이 모두 같은 컴포넌트 규약</li>
            <li>· 학생 데이터와는 완전히 분리 — 저장하는 것이 하나도 없습니다</li>
          </ul>
          <p className="t-caption">info-class-portal.vercel.app</p>
        </div>
      );

    case "closing":
      return (
        <div className="flex flex-col gap-6">
          <h1 className="t-display">다음에 또</h1>
          <div className="block flex flex-col gap-3 bg-mint">
            <p className="t-eyebrow">다음 나눔 데이</p>
            <p className="t-headline">
              임세범 (서울중광초) — 교사개발자의 AI 기반 현장연구 한해살이
            </p>
            <p className="t-headline">김예슬 (서울월정초) 발표 예정</p>
          </div>
          <p className="t-body-lg">문화 분과 소식도 곧 전해드립니다.</p>
          <p className="t-display">이제 옆방 해커톤 참관하러 이동합니다 🚶</p>
        </div>
      );
  }
}

/**
 * 한 줄씩 눌러서 띄우는 문단.
 *
 * 세 줄을 한꺼번에 띄우면 청중이 마지막 줄을 먼저 읽어 버린다. 반전이 있는 자리에서는
 * 그것으로 코너가 통째로 죽는다.
 */
function Steps({ lines, big }: { lines: string[]; big?: boolean }) {
  const [shown, setShown] = useState(0);

  return (
    <div className="flex flex-col gap-6">
      {lines.slice(0, shown).map((line) => (
        <p key={line} className={`${big ? "t-headline" : "t-display"} whitespace-pre-line`}>
          {line}
        </p>
      ))}
      {shown < lines.length && (
        <button
          type="button"
          onClick={() => setShown((prev) => prev + 1)}
          className="pill pill-primary self-start"
        >
          {shown === 0 ? "시작" : "다음 줄"}
        </button>
      )}
    </div>
  );
}

/** 하노이 우승자 — 현장에서 이름을 쳐 넣는다. 저장하지 않는다 */
function HallOfFame({ hall, onHall }: { hall: HallState; onHall: (next: HallState) => void }) {
  const { champion, grit } = hall;
  const setChampion = (value: string) => onHall({ ...hall, champion: value });
  const setGrit = (value: string) => onHall({ ...hall, grit: value });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="t-display">명예의 전당</h1>

      {/*
        칸을 글자로 바꿔치지 않는다.

        처음에는 "이름이 들어오면 큰 글자로 바꿔 보여주기" 로 짰는데, 한 글자를 치는 순간
        입력칸이 사라져서 이름을 끝까지 칠 수가 없었다. 입력칸을 그대로 두고 글자만 크게
        키운다 — 어차피 프로젝터에 크게 보이면 되는 것이라 칸이 남아 있어도 상관없다.
      */}
      <div className="block flex flex-col gap-2 bg-lime">
        <label htmlFor="hall-champion" className="t-eyebrow">
          최소 이동 · 최단 시간
        </label>
        <input
          id="hall-champion"
          value={champion}
          onChange={(event) => setChampion(event.target.value.slice(0, 20))}
          placeholder="우승자 이름"
          className="w-full border-none bg-transparent text-5xl font-bold outline-none placeholder:text-muted placeholder:opacity-50"
        />
      </div>

      <div className="block flex flex-col gap-2 bg-coral">
        <label htmlFor="hall-grit" className="t-eyebrow">
          브루트포스 끈기상 · 최다 이동수
        </label>
        <input
          id="hall-grit"
          value={grit}
          onChange={(event) => setGrit(event.target.value.slice(0, 20))}
          placeholder="수상자 이름"
          className="w-full border-none bg-transparent text-5xl font-bold outline-none placeholder:text-muted placeholder:opacity-50"
        />
        <p className="t-body-lg">집에서 연습하시라고 교구를 드립니다 🗼</p>
      </div>
    </div>
  );
}
