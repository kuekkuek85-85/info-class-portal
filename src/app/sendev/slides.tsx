"use client";

import { HanoiQr, JoinQr } from "./hanoi-qr";

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

const HANOI_URL = "https://hanoi-tower-game-rosy.vercel.app/";

export const SLIDES = [
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
  { key: "awards", corner: "시상 ①" },
  { key: "hall", corner: "시상 ②" },
  { key: "pawback", corner: "의문의 고양이발" },
  { key: "keycap", corner: "키캡의 정체" },
  { key: "bonus", corner: "번외" },
  { key: "closing", corner: "클로징" },
] as const;

export type SlideKey = (typeof SLIDES)[number]["key"];

/** 발표 슬라이드에만 타이머가 붙는다 (분) */
export const TIMER_MINUTES: Partial<Record<SlideKey, number>> = {
  talk1: 15,
  talk2: 15,
  talk3: 15,
  hanoi: 3,
};

/** 진행자만 보는 말할 거리 */
export const NOTES: Partial<Record<SlideKey, string>> = {
  welcome: "QR 을 띄워 두세요. 오시는 대로 휴대폰으로 들어오시면 화면이 같이 넘어갑니다.",
  why:
    "올해부터 코딩 문법을 가르치지 않습니다. 문제를 찾고 정의하는 것, 추상화하는 것,\n" +
    "알고리즘을 세우고 바이브 코딩으로 만드는 것을 가르칩니다.\n\n" +
    "구현은 이제 AI가 합니다. 그러면 사람에게 남는 일이 무엇이냐 — 문제를 알아보는 것,\n" +
    "만들어진 것을 검증하는 것, 그리고 고쳐 쓰는 것입니다.\n\n" +
    "브루트포스도 결국 완성했잖아요. 검증하고 고치면 됩니다.",
  awards: "세 분을 한 분씩 여세요. 세 번째쯤에는 화면이 뜨는 것만으로 웃음이 납니다.",
  hall: "우승자는 이름만 박제, 교구는 최다 이동수. 반전이니 미리 말하지 마세요.",
  keycap: "2단을 누르기 전에 한 박자 쉬세요. 반전은 침묵이 만듭니다.",
  hanoi: "각자 휴대폰으로 QR 을 찍고 들어갑니다. 완료 화면을 저에게 보여 주세요.",
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

/** 발표자 소개. 시상은 여기 없다 — 뒤로 몰았다 */
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
  return (
    <div className="flex flex-col gap-4">
      <p className="t-eyebrow">{where}</p>
      <h1 className="t-display">{title}</h1>
      <p className="t-headline">{who}</p>
      <p className="t-body-lg text-muted">{line}</p>
    </div>
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
          <p className="t-headline">오시는 대로 빙고판을 받아가세요 🎉</p>
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

    case "bingo":
      return (
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
            {["빙고", "발표 ①", "하노이 릴레이", "발표 ② ③", "시상식", "클로징"].map(
              (step, i) => (
                <li key={step} className="block flex items-baseline gap-3 bg-surface t-headline">
                  <span className="t-eyebrow">{String(i + 1).padStart(2, "0")}</span>
                  {step}
                </li>
              ),
            )}
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
          <p className="t-body-lg">
            맞히신 분께 의문의 고양이발 증정 — 이게 뭔지는 마지막에 알려드립니다 🐾
          </p>
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
              <li>③ 완료 화면을 진행자에게 보여주기</li>
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
              "왜 우리는 원판을 옮기고 있었을까요?",
              "— 이 게임, 사실 제 수업 자료입니다.",
            ]}
            {...r}
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
          who="박환석 선생님"
          title="수행평가 성적 열람 시스템을 개발하면서"
          line="나이스 엑셀에서 QR 열람까지, 그리고 개인정보를 지키는 2초의 긴장감."
        />
      );

    case "quiz3":
      return (
        <div className="flex flex-col gap-5">
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
            <p className="t-body-lg">집에서 연습하시라고 교구를 드립니다 🗼</p>
          </div>
        </div>
      );

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
        <div className="flex min-h-[45vh] flex-col justify-center gap-8">
          <Steps
            id="keycap"
            lines={[
              "우리 모두 교사개발자 1기라서, ‘개발자 키캡’ 을 기념품으로 찾아 헤맸습니다.\n그런데 교사개발자 키캡은 세상에 없더라고요.\n그래서… 고양이발을 샀습니다.",
              "그런데 사 놓고 보니, 이거 개발자 키캡 맞습니다.\ncat — 리눅스 명령어잖아요.\n오늘부터 여러분 손끝엔 cat 명령어가 있습니다.",
            ]}
            big
            {...r}
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
