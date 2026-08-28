"use client";

import { useState } from "react";

import { HanoiQr, JoinQr } from "./hanoi-qr";
import {
  AskCount,
  AskInput,
  AskList,
  HANDS,
  HandsInput,
  HandsResult,
  usePoll,
  useWho,
} from "./poll";

/**
 * 슬라이드 내용.
 *
 * ## 눌러서 여는 것은 전부 위에서 내려온다
 *
 * 정답 공개도 순차 공개도 컴포넌트 안에 상태를 두지 않는다. 진행자가 열면 프로젝터와
 * 참가자 휴대폰 열두 대가 **함께** 열려야 하는데, 각자 자기 상태를 들고 있으면 그럴 수가
 * 없다. 무엇이 열렸는지는 서버에 있고(live-sync.ts) 여기는 받아서 그리기만 한다.
 *
 * 따라오는 화면(휴대폰)은 onReveal 을 안 넘긴다. 그러면 여는 단추가 아예 안 그려져서,
 * 참가자가 먼저 정답을 열어 보는 일이 생기지 않는다.
 */

/** 바꾸면 hanoi-qr.tsx 의 QR 도 다시 뽑아야 한다 — 그 파일 머리말에 방법이 있다 */
const HANOI_URL = "https://hanoi-tower-game-rosy.vercel.app/training";

export const SLIDES = [
  { key: "welcome", corner: "웰컴" },
  { key: "handsup", corner: "손 들어 주세요" },
  { key: "opening", corner: "오프닝" },
  { key: "talk1", corner: "발표 ①" },
  { key: "quiz1", corner: "3초 퀴즈 ①" },
  { key: "talk2", corner: "발표 ②" },
  { key: "quiz2", corner: "3초 퀴즈 ②" },
  { key: "talk3", corner: "발표 ③" },
  { key: "quiz3", corner: "3초 퀴즈 ③" },
  /*
   * 하노이는 발표 셋이 다 끝난 뒤다. 그리고 **둘은 반드시 붙어 다닌다.**
   *
   * 「왜 하노이탑인가」 는 게임 앞에 두는 3분짜리 틀이고, 마지막 줄이 "이제 하실 이
   * 게임" 이다. 게임과 떨어뜨려 놓으면 그 말을 게임 사십 분 전에 하게 된다.
   *
   * 원래는 게임을 먼저 시키고 뒤에서 "사실 이거 제 수업 자료였습니다" 로 뒤집는
   * 구조였는데, 틀을 먼저 주는 쪽으로 바뀌면서 지나간 일을 묻던 세 줄도 함께 고쳤다
   * (아래 why 슬라이드).
   */
  { key: "why", corner: "왜 하노이탑인가" },
  { key: "hanoi", corner: "하노이 탑" },
  { key: "awards", corner: "시상 ①" },
  { key: "hall", corner: "시상 ②" },
  { key: "pawback", corner: "오늘의 기념품" },
  { key: "keycap", corner: "키캡의 정체" },
  { key: "bonus", corner: "번외" },
  { key: "closing", corner: "클로징" },
] as const;

export type SlideKey = (typeof SLIDES)[number]["key"];

/**
 * 타이머가 붙는 슬라이드 (분).
 *
 * 발표 세 곳에서 뺐다. 발표자 머리 위에서 초가 줄어드는 것이 보이면 말하는 사람이
 * 쫓긴다 — 각 3분이라 더 그렇다. 시간은 진행자가 재고, 화면은 발표에만 쓴다.
 *
 * 하노이만 남긴다. 그건 발표가 아니라 **다 같이 겨루는 게임**이라 남은 시간이 보여야
 * 하고, 보는 것 자체가 재미다.
 */
export const TIMER_MINUTES: Partial<Record<SlideKey, number>> = {
  hanoi: 3,
};

/** 진행자만 보는 말할 거리 */
export const NOTES: Partial<Record<SlideKey, string>> = {
  welcome: "QR 을 띄워 두세요. 오시는 대로 휴대폰으로 들어오시면 화면이 같이 넘어갑니다.",
  handsup:
    "휴대폰으로 답하면 앞 화면에 실시간으로 모입니다. 상품은 없습니다 — 기념품은 마지막에 다 같이.\n\n" +
    "질문마다 답이 올라오는 것을 보고 한마디씩 하세요. 그게 이 코너의 전부입니다.\n" +
    "  · 1~3번은 숫자만 올라갑니다\n" +
    "  · 4·6번은 말풍선으로 흩어집니다 — 재미있는 것을 짚어 읽어 주세요\n" +
    "  · 5번 월세는 최고 금액이 크게 뜹니다. 합계도 함께 나오니 그걸로 한마디\n\n" +
    "답이 안 올라오면 「다음 질문」을 누르지 말고 조금 기다리세요. 2초마다 갱신됩니다.",
  talk1:
    "발표 시작 전에 한마디 — \"들으시면서 궁금한 것은 휴대폰에 적어 두세요. 끝나고 같이 봅니다.\"\n" +
    "여기 「질문 N개」 만 뜨고 내용은 안 보입니다. 발표자가 읽으며 흔들리지 않게 한 것이니\n" +
    "발표 중에 굳이 말하지 마세요. 질문은 다음 슬라이드(퀴즈) 맨 위에 뜹니다.\n\n" +
    "「발표 자료 열기」를 누르면 프로젝터에도 같이 뜹니다. 발표자 노트북으로 하실 거면 안 눌러도 됩니다.",
  talk2: "질문은 다음 슬라이드 맨 위에 뜹니다. 자료는 「발표 자료 열기」 · 닫기는 오른쪽 위.",
  talk3: "질문은 다음 슬라이드 맨 위에 뜹니다. 자료는 「발표 자료 열기」 · 닫기는 오른쪽 위.",
  quiz1: "받은 질문을 먼저 읽고 발표자에게 넘기세요. 그 다음 퀴즈로 갑니다.",
  quiz2: "받은 질문을 먼저 읽고 발표자에게 넘기세요. 그 다음 퀴즈로 갑니다.",
  quiz3: "받은 질문을 먼저 읽고 발표자에게 넘기세요. 그 다음 퀴즈로 갑니다.",
  why:
    "3분. 게임 앞에 두는 틀입니다 — 이 이야기를 듣고 원판을 옮기게 됩니다.\n" +
    "게임으로 넘기기 전에 한 줄 붙이세요 — \"이제 하실 이 게임, 사실 제 수업 자료입니다.\"\n" +
    "화면에서는 뺐습니다. 말로 하는 편이 낫습니다.\n\n" +
    "올해부터 코딩 문법을 가르치지 않습니다. 문제를 찾고 정의하는 것, 추상화하는 것,\n" +
    "알고리즘을 세우고 바이브 코딩으로 만드는 것을 가르칩니다.\n\n" +
    "구현은 이제 AI가 합니다. 그러면 사람에게 남는 일이 무엇이냐 — 문제를 알아보는 것,\n" +
    "만들어진 것을 검증하는 것, 그리고 고쳐 쓰는 것입니다.\n\n" +
    "끈기상 회수는 시상 때 하세요 — \"브루트포스도 결국 완성했잖아요. 검증하고 고치면\n" +
    "됩니다\" 는 게임이 끝난 뒤라야 먹힙니다.",
  awards: "세 분을 한 분씩 여세요. 세 번째쯤에는 화면이 뜨는 것만으로 웃음이 납니다.",
  hall: "우승자는 이름만 박제, 교구는 최다 이동수. 반전이니 미리 말하지 마세요.",
  keycap: "2단을 누르기 전에 한 박자 쉬세요. 반전은 침묵이 만듭니다.",
  hanoi: "각자 휴대폰으로 QR 을 찍고 들어갑니다.",
};

interface SlideProps {
  slideKey: SlideKey;
  revealed: string[];
  /** 넘기는 쪽에서만 온다. 없으면 여는 단추를 안 그린다 (따라오는 화면) */
  onReveal?: (key: string) => void;
  names: { champion: string; grit: string };
  onNames?: (next: { champion: string; grit: string }) => void;
  /** 휴대폰에서 보는 화면인가 — 글자를 줄이고 QR 을 뺀다 */
  compact?: boolean;
}

/** 눌러야 나오는 것 */
function Reveal({
  id,
  label,
  revealed,
  onReveal,
  children,
}: {
  id: string;
  label: string;
  revealed: string[];
  onReveal?: (key: string) => void;
  children: React.ReactNode;
}) {
  if (revealed.includes(id)) return <>{children}</>;
  if (!onReveal) {
    // 따라오는 화면 — 진행자가 열 때까지 자리만 지킨다
    return <p className="t-body-lg text-muted">…</p>;
  }
  return (
    <button type="button" onClick={() => onReveal(id)} className="pill pill-primary self-start">
      {label}
    </button>
  );
}

/**
 * 한 줄씩 여는 문단.
 *
 * 세 줄을 한꺼번에 띄우면 청중이 마지막 줄을 먼저 읽는다. 반전이 있는 자리에서는
 * 그것으로 코너가 통째로 죽는다.
 */
function Steps({
  id,
  lines,
  revealed,
  onReveal,
  big,
}: {
  id: string;
  lines: string[];
  revealed: string[];
  onReveal?: (key: string) => void;
  big?: boolean;
}) {
  const shown = lines.filter((_, i) => revealed.includes(`${id}-${i}`)).length;

  return (
    <div className="flex flex-col gap-6">
      {lines.slice(0, shown).map((line) => (
        <p key={line} className={`${big ? "t-headline" : "t-display"} whitespace-pre-line`}>
          {line}
        </p>
      ))}
      {shown < lines.length && onReveal && (
        <button
          type="button"
          onClick={() => onReveal(`${id}-${shown}`)}
          className="pill pill-primary self-start"
        >
          {shown === 0 ? "시작" : "다음 줄"}
        </button>
      )}
    </div>
  );
}

/**
 * 발표자 소개 + 발표 자료.
 *
 * 시상은 여기 없다 — 뒤로 몰았다.
 *
 * ## 자료는 원본 그대로 띄운다
 *
 * 세 분이 만든 자료를 우리 테마로 옮겨 그리지 않는다. 발표자의 자료는 발표자의 것이고,
 * 글꼴과 색까지가 그분의 발표다. 그래서 PDF 를 그대로 화면에 얹는다.
 *
 * 여닫는 상태는 서버에 둔다 (revealed). 강사가 노트북에서 열면 프로젝터도 함께 열려야
 * 하는데, 각자 자기 상태를 들고 있으면 강사 화면만 열린다.
 *
 * 휴대폰에는 통째로 얹지 않는다. 79쪽짜리를 작은 화면의 iframe 에 넣으면 스크롤이
 * 엉키기만 한다. 새 창으로 여는 단추만 준다 — 각자 보고 싶으면 각자 속도로 본다.
 */
function TalkSlide({
  speaker,
  where,
  title,
  line,
  doc,
  ask,
  revealed,
  onReveal,
  compact,
}: {
  speaker: string;
  where: string;
  title: string;
  line: string;
  doc: string;
  /** 발표 중에 받는 질문의 열쇠 (qa1·qa2·qa3) */
  ask: string;
  revealed: string[];
  onReveal?: (key: string) => void;
  compact?: boolean;
}) {
  const open = revealed.includes(`doc-${doc}`);
  const poll = usePoll();
  const me = useWho();

  /*
   * 휴대폰은 질문 칸만 크게 띄운다.
   *
   * 발표를 듣는 사람에게 필요한 것은 발표자 소개가 아니라 **적을 자리**다. 소개는 앞
   * 화면에 크게 떠 있고, 작은 화면에서 그것까지 그리면 정작 칸이 접혀 내려간다.
   */
  if (compact) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="t-caption">{where}</p>
          <p className="t-headline">{speaker}</p>
        </div>
        <AskInput id={ask} who={me} poll={poll} />
        <a
          href={`/sendev/${doc}.pdf`}
          target="_blank"
          rel="noreferrer"
          className="pill pill-secondary pill-block text-center"
        >
          발표 자료 보기
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <p className="t-eyebrow">{where}</p>
        <h1 className="t-display">{title}</h1>
        <p className="t-headline">{speaker}</p>
        <p className="t-body-lg text-muted">{line}</p>

        {/* 질문 내용은 발표 중에 안 띄운다 — 발표자가 읽으며 흔들린다. 개수만 */}
        <AskCount id={ask} poll={poll} />

        <div className="mt-2 flex flex-wrap gap-2">
          {onReveal && (
            <button
              type="button"
              onClick={() => onReveal(`doc-${doc}`)}
              className="pill pill-primary"
            >
              {open ? "자료 닫기" : "📄 발표 자료 열기"}
            </button>
          )}
          <a
            href={`/sendev/${doc}.pdf`}
            target="_blank"
            rel="noreferrer"
            className="pill pill-secondary"
          >
            새 창으로 열기
          </a>
        </div>
      </div>

      {/*
        큰 화면에서만 화면 위에 얹는다. 닫기는 오른쪽 위 단추 — 자료 위를 아무 데나 눌러
        닫히게 하면 PDF 를 넘기려다 닫힌다.
      */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink">
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <p className="t-body-sm text-canvas">
              {speaker} · {title}
            </p>
            {onReveal && (
              <button
                type="button"
                onClick={() => onReveal(`doc-${doc}`)}
                className="pill pill-secondary text-sm"
              >
                닫기
              </button>
            )}
          </div>
          <iframe
            src={`/sendev/${doc}.pdf`}
            title={`${speaker} 발표 자료`}
            className="flex-1 w-full border-0 bg-canvas"
          />
        </div>
      )}
    </>
  );
}

/**
 * 손 들어 주세요 — 휴대폰으로 답하고 앞 화면에서 함께 본다.
 *
 * 지금 몇 번째 질문인지는 revealed 에 쌓인 `hands-N` 개수로 정한다. 슬라이드 안에
 * 상태를 두면 프로젝터와 휴대폰이 서로 다른 질문을 띄운다.
 *
 * 큰 화면은 **결과만** 크게, 휴대폰은 **답하는 칸만** 크게. 같은 것을 양쪽에 다 그리면
 * 휴대폰에서는 결과가 작아 안 보이고, 앞 화면에는 아무도 못 누르는 입력칸이 뜬다.
 */
function HandsUp({
  revealed,
  onReveal,
  compact,
}: {
  revealed: string[];
  onReveal?: (key: string) => void;
  compact?: boolean;
}) {
  const shown = HANDS.filter((_, i) => revealed.includes(`hands-${i}`)).length;
  const index = Math.max(0, shown - 1);
  const question = HANDS[index];
  const poll = usePoll();
  const who = useWho();

  if (shown === 0) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="t-display">손 들어 주세요</h1>
        <p className="t-body-lg text-muted">
          휴대폰으로 답하시면 앞 화면에 함께 모입니다. 이름은 안 받습니다.
        </p>
        {onReveal && (
          <button
            type="button"
            onClick={() => onReveal("hands-0")}
            className="pill pill-primary"
          >
            시작
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="t-eyebrow">
          {index + 1} / {HANDS.length}
        </p>
        <h1 className={compact ? "t-headline" : "t-display"}>{question.q}</h1>
      </div>

      {compact ? (
        // key 로 질문마다 새로 만든다 — 앞 질문에 쓰던 글이 남아 있으면 그대로 다시 간다
        <HandsInput key={question.id} question={question} who={who} poll={poll} />
      ) : (
        <HandsResult question={question} poll={poll} />
      )}

      {onReveal && shown < HANDS.length && (
        <button
          type="button"
          onClick={() => onReveal(`hands-${shown}`)}
          className="pill pill-primary self-start"
        >
          다음 질문
        </button>
      )}
    </div>
  );
}

/**
 * 발표 중에 받은 질문 — 퀴즈 앞에 붙는다.
 *
 * 휴대폰에서는 접어 둔다. 앞 화면에 크게 떠 있는 것을 작은 화면에 또 그리면 정작
 * 퀴즈 문제가 스크롤 아래로 내려간다.
 */
function AskPanel({ id, compact }: { id: string; compact?: boolean }) {
  const poll = usePoll();
  if (compact) return null;
  return <AskList id={id} poll={poll} />;
}

/**
 * 상품 사진.
 *
 * 파일이 없으면 **아무것도 안 그린다.** 행사 중에 깨진 이미지 아이콘이 시상 화면에
 * 떠 있는 것보다는 사진이 없는 편이 낫다. 넣을 파일은 public/sendev 에 둔다.
 */
function PrizePhoto({
  src,
  alt,
  className = "max-w-xs",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 행사용 정적 사진 한 장. 최적화 파이프라인을 붙일 이유가 없다
    <img
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      className={`mx-auto h-auto w-full rounded-2xl ${className}`}
    />
  );
}

function Quiz({
  id,
  q,
  a,
  note,
  revealed,
  onReveal,
}: {
  id: string;
  q: string;
  a: string;
  note?: string;
  revealed: string[];
  onReveal?: (key: string) => void;
}) {
  return (
    <div className="block flex flex-col gap-3 bg-cream">
      <p className="t-headline">{q}</p>
      <Reveal id={id} label="정답 공개" revealed={revealed} onReveal={onReveal}>
        <div className="flex flex-col gap-2">
          <p className="t-display">{a}</p>
          {note && <p className="t-body-lg">{note}</p>}
        </div>
      </Reveal>
    </div>
  );
}

export function Slide({ slideKey, revealed, onReveal, names, onNames, compact }: SlideProps) {
  const r = { revealed, onReveal };

  switch (slideKey) {
    case "welcome":
      return (
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="t-eyebrow">2026 · 08 · 28 · 금</p>
          <h1 className="t-display">제1호 교사개발자 홈커밍데이</h1>
          <p className="t-headline">오시는 대로 편히 앉으세요 🎉</p>
          {/*
            참가자용 QR. 휴대폰으로 들어오면 이 뒤로는 진행자가 넘기는 대로 따라온다.
            휴대폰 화면에는 이 QR 을 그리지 않는다 — 이미 들어온 사람에게는 쓸모가 없다.
          */}
          {!compact && (
            <div className="flex flex-col items-center gap-2">
              <JoinQr className="h-52 w-52" />
              <p className="t-body-lg">휴대폰으로 찍고 들어오세요</p>
              <p className="t-caption">info-class-portal.vercel.app/sendev/live</p>
            </div>
          )}
        </div>
      );

    case "handsup":
      /*
       * 빙고를 대신한다.
       *
       * 종이 빙고판을 들고 다니며 사인을 받는 활동이었는데 자리가 좁아 오갈 수가 없다.
       * 빙고가 하려던 일은 **서로를 알게 하는 것**이었지 종이를 채우는 것이 아니었으므로,
       * 앉은 채로 휴대폰으로 답하고 그 결과를 앞 화면에 함께 본다.
       *
       * 질문을 한 번에 하나만 띄운다. 여섯 개를 늘어놓으면 뭘 답해야 하는지 모르고,
       * 앞 질문 결과를 보며 이야기할 틈도 없다. 진행자가 「다음 질문」으로 넘긴다.
       */
      return <HandsUp revealed={revealed} onReveal={onReveal} compact={compact} />;

    case "opening":
      return (
        <div className="flex flex-col gap-6">
          <h1 className="t-display">오늘의 흐름</h1>
          <ol className="grid gap-3 sm:grid-cols-2">
            {/* 실제 슬라이드 차례와 같아야 한다 — 빙고를 손들기로 바꾸면서 여기도 함께 */}
            {["손 들어 주세요", "발표 ①", "발표 ② ③", "하노이 릴레이", "시상식", "클로징"].map(
              (step, i) => (
                <li key={step} className="block flex items-baseline gap-3 bg-surface t-headline">
                  <span className="t-eyebrow">{String(i + 1).padStart(2, "0")}</span>
                  {step}
                </li>
              ),
            )}
          </ol>
        </div>
      );

    case "talk1":
      return (
        <TalkSlide
          where="서일중학교"
          speaker="이재연 선생님"
          ask="qa1"
          title="바이브코딩으로 만든 가정 수업 도구"
          line="지렁이를 키우고, 두더지를 잡으며 가정 교과를 배웁니다 — 시연 준비 완료."
          doc="talk1-jaeyeon"
          compact={compact}
          {...r}
        />
      );

    case "quiz1":
      return (
        <div className="flex flex-col gap-5">
          {/* 발표 중에 받은 질문을 먼저 읽고 퀴즈로 넘어간다 */}
          <AskPanel id="qa1" compact={compact} />
          <h1 className="t-headline">3초 퀴즈 ①</h1>
          <Quiz
            id="q1a"
            q="이재연 선생님의 지렁이가 먹으면서 자라는 것은?"
            a="여섯 가지 식품군 음식"
            {...r}
          />
          <Quiz
            id="q1b"
            q="이재연 선생님이 다음 목표로 만들고 있는 미니게임 월드의 이름은?"
            a="가정월드"
            {...r}
          />
        </div>
      );

    case "hanoi":
      return (
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {!compact && (
            <div className="flex flex-col items-center gap-3">
              <HanoiQr className="h-56 w-56" />
              <p className="t-caption break-all">{HANOI_URL}</p>
            </div>
          )}
          <div className="flex flex-1 flex-col gap-4">
            <h1 className="t-display">하노이 탑</h1>
            {compact && (
              <a
                href={HANOI_URL}
                target="_blank"
                rel="noreferrer"
                className="pill pill-primary pill-block text-center"
              >
                게임 열기
              </a>
            )}
            <ol className="flex flex-col gap-2 t-body-lg">
              <li>① 제한 시간 안에 완성하기</li>
              <li>② 최소 이동 · 최단 시간으로 겨루기</li>
            </ol>
            <p className="t-body text-muted">
              지난주 저희 1학년 학생들이 한 바로 그 게임입니다.
            </p>
          </div>
        </div>
      );

    case "why":
      /*
       * 이 슬라이드만 톤이 다르다. 앞뒤가 전부 개그 코너라, 여기까지 같은 밀도로 가면
       * 메시지가 그냥 흘러간다. 여백을 크게 두고 한 줄씩 연다 — 침묵이 문장을 세운다.
       */
      return (
        <div className="flex min-h-[45vh] flex-col justify-center gap-10">
          <Steps
            id="why"
            lines={[
              "딸깍이면 누구나 만드는 시대에,",
              "학생들에게 도대체 무엇을 가르쳐야 할까요?",
            ]}
            {...r}
          />
          {/*
            괄호는 Steps 로 안 만든다. 한 줄로 넣으면 질문과 같은 크기(t-display)로
            떠서 곁말이 본문만큼 커진다. 질문이 열릴 때 그 아래에 작게 붙인다.
          */}
          {revealed.includes("why-1") && (
            <p className="t-headline text-muted">(정보 교과 입장에서)</p>
          )}
          <p className="t-body-lg text-muted">
            문제 정의 · 추상화 · 알고리즘 → 바이브 코딩 → 검증 · 유지보수
          </p>
        </div>
      );

    case "talk2":
      return (
        <TalkSlide
          where="서울군자초등학교"
          speaker="김효진 선생님"
          ask="qa2"
          title="업무를 자동화하는 코드 한 줄"
          line="보물창고부터 정책정보 아카이브까지, 랄라쌤의 자동화 5종 세트."
          doc="talk2-hyojin"
          compact={compact}
          {...r}
        />
      );

    case "quiz2":
      return (
        <div className="flex flex-col gap-5">
          <AskPanel id="qa2" compact={compact} />
          <h1 className="t-headline">3초 퀴즈 ②</h1>
          <Quiz
            id="q2a"
            q="김효진 선생님이 ‘슬라이도처럼’ 을 직접 만든 이유 — 무료 요금제의 질문 개수 제한은 몇 개였을까요?"
            a="3개"
            {...r}
          />
          <Quiz
            id="q2b"
            q="Wee클래스 상담일지의 기록은 어디에만 저장될까요?"
            a="상담교사의 업무 PC"
            note="로컬 저장 — 서버가 없습니다."
            {...r}
          />
        </div>
      );

    case "talk3":
      return (
        <TalkSlide
          where="대신중학교"
          speaker="박환석 선생님"
          ask="qa3"
          title="수행평가 성적 열람 시스템을 개발하면서"
          line="나이스 엑셀에서 QR 열람까지, 그리고 개인정보를 지키는 2초의 긴장감."
          doc="talk3-hwanseok"
          compact={compact}
          {...r}
        />
      );

    case "quiz3":
      return (
        <div className="flex flex-col gap-5">
          <AskPanel id="qa3" compact={compact} />
          <h1 className="t-headline">3초 퀴즈 ③</h1>
          <Quiz
            id="q3a"
            q="박환석 선생님이 학생 성적 조회를 허용한 시간은 단 몇 초?"
            a="2초"
            {...r}
          />
          <Quiz
            id="q3b"
            q="이 시스템이 거쳐야 했던 심의 기구는?"
            a="학교운영위원회"
            note="학운위"
            {...r}
          />
        </div>
      );

    case "awards":
      /*
       * 발표 직후마다 하던 시상을 여기로 몰았다.
       *
       * 세 분이 같은 상을 받는 **반복 개그**라 한자리에서 연달아 여는 편이 낫다.
       * 발표 사이에 흩어 놓으면 세 번째에도 처음처럼 읽히고, 그러면 웃음이 안 쌓인다.
       */
      return (
        <div className="flex flex-col gap-6">
          <h1 className="t-display">🏆 손목 산재 위로상</h1>
          <p className="t-body-lg">
            발표 준비로 혹사당한 손목에, 학교안전공제회를 대신하여
            <br />
            교사개발자 1기 일동이 위로의 뜻을 전합니다.
          </p>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex flex-1 flex-col gap-6">
              <Steps
                id="awards"
                lines={[
                  "이재연 선생님 — 서일중학교",
                  "김효진 선생님 — 서울군자초등학교",
                  "박환석 선생님 — 대신중학교",
                ]}
                big
                {...r}
              />
            </div>

            {/*
              상품 사진.
              휴대폰에는 안 띄운다 — 작은 화면에서는 이름이 먼저 보여야 한다.
            */}
            {!compact && <PrizePhoto src="/sendev/prize-wrist.png" alt="마우스 손목 받침대" />}
          </div>

          <p className="t-headline">🖱️ 마우스 손목 받침대</p>
        </div>
      );

    case "hall":
      return (
        <div className="flex flex-col gap-5">
          <h1 className="t-display">명예의 전당</h1>

          <div className="block flex flex-col gap-2 bg-lime">
            <p className="t-eyebrow">최소 이동 · 최단 시간</p>
            {onNames ? (
              <input
                value={names.champion}
                onChange={(event) =>
                  onNames({ ...names, champion: event.target.value.slice(0, 20) })
                }
                placeholder="우승자 이름"
                className="w-full border-none bg-transparent text-4xl font-bold outline-none placeholder:text-muted placeholder:opacity-50"
              />
            ) : (
              <p className="t-display">{names.champion || "…"}</p>
            )}
          </div>

          <div className="block flex flex-col gap-2 bg-coral">
            <p className="t-eyebrow">브루트포스 끈기상 · 최다 이동수</p>
            {onNames ? (
              <input
                value={names.grit}
                onChange={(event) => onNames({ ...names, grit: event.target.value.slice(0, 20) })}
                placeholder="수상자 이름"
                className="w-full border-none bg-transparent text-4xl font-bold outline-none placeholder:text-muted placeholder:opacity-50"
              />
            ) : (
              <p className="t-display">{names.grit || "…"}</p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="t-body-lg">집에서 연습하시라고 교구를 드립니다 🗼</p>
              {/* 휴대폰에는 안 띄운다 — 작은 화면에서는 수상자 이름이 먼저 보여야 한다 */}
              {!compact && (
                <PrizePhoto
                  src="/sendev/prize-hanoi.png"
                  alt="하노이탑 나무 교구"
                  className="max-w-[9rem]"
                />
              )}
            </div>
          </div>
        </div>
      );

    case "pawback":
      /*
       * 원래는 "행사 중간에 이걸 받으신 분들, 궁금하셨죠?" 였다.
       *
       * 빙고·퀴즈 승자에게 미리 나눠 주고 마지막에 정체를 밝히는 구조였는데, 중간
       * 시상을 다 걷어내고 전원 기념품으로 바꾸면서 **아무도 중간에 받은 사람이 없어졌다.**
       * 받은 적 없는 물건을 두고 "궁금하셨죠" 라고 물으면 그 자리에서 김이 샌다.
       *
       * 그래서 묻는 대상을 바꾼다 — 받은 경험이 아니라 **왜 하필 이것이냐**로. 다음
       * 슬라이드의 cat 반전은 그대로 살아난다.
       */
      return (
        <div className="flex flex-col items-center gap-8 text-center">
          <p className="t-display">🐾</p>
          <h1 className="t-display">오늘의 기념품</h1>
          <p className="t-headline">그런데 왜 하필 고양이발일까요?</p>
        </div>
      );

    case "keycap":
      /*
       * 사진이 문장을 앞지르면 안 된다.
       *
       * 두 장을 처음부터 띄워 두면 cat 반전이 그림으로 먼저 새어 나간다. 그래서 줄이
       * 열릴 때 같이 연다 — 첫 줄에 키캡 실물, 둘째 줄에 cat. 그리고 **한 장씩만**
       * 둔다. 둘을 나란히 놓으면 눈이 두 번째로 먼저 가고, 그러면 첫 줄을 읽는 동안
       * 답이 옆에 떠 있다.
       */
      return (
        <div className="flex min-h-[45vh] flex-col justify-center gap-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Steps
                id="keycap"
                lines={[
                  "우리 모두 교사개발자 1기라서, ‘개발자 키캡’ 을 기념품으로 찾아 헤맸습니다.\n그런데 개발 키캡은 세상에 없더라고요.\n그래서… 고양이발을 샀습니다.",
                  "그런데 사 놓고 보니, 이거 개발자 키캡 맞습니다.\ncat — 리눅스 명령어잖아요.\n오늘부터 여러분 손끝엔 cat 명령어가 있습니다.",
                ]}
                big
                {...r}
              />
            </div>

            {!compact && revealed.includes("keycap-1") ? (
              <PrizePhoto
                src="/sendev/keycap-cat.png"
                alt="컴퓨터 앞에 앉은 고양이"
                className="max-w-[16rem]"
              />
            ) : (
              !compact &&
              revealed.includes("keycap-0") && (
                <PrizePhoto
                  src="/sendev/keycap-paw.png"
                  alt="고양이발 모양 키캡 다섯 개"
                  className="max-w-[16rem]"
                />
              )
            )}
          </div>

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
            <li>· 지금 여러분 휴대폰이 제 화면을 따라오는 것도 같은 구조예요</li>
            <li>· 교사가 단계를 넘기면 학생 태블릿 스물여덟 대가 함께 넘어갑니다</li>
            <li>· 학생 데이터와는 완전히 분리 — 오늘 이 화면은 저장하는 것이 없습니다</li>
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
