"use client";

import { useState } from "react";

/**
 * 타임머신 퀴즈 — 학생 화면.
 *
 * 화면당 할 일이 하나다. 지금 열린 문항 하나와 선지 셋만 크게 띄우고, 다른 문항으로 갈
 * 방법을 주지 않는다. 문항 이동은 교사가 한다 (PRD 3.2).
 *
 * 한 번 고르면 잠긴다. 정답을 보고 바꾸는 것을 막기도 하지만, 그보다 "친구가 뭘 골랐나"를
 * 보고 따라 바꾸는 쪽이 훨씬 흔하다. 틀린 선택이 그대로 남아야 정답 공개가 의미를 갖는다.
 */

export interface QuizState {
  /** 이 단계 안에서의 위치(3/10 의 3) */
  index: number;
  /** 이 단계 문항 수(3/10 의 10) */
  total: number;
  /** 전체 배열 기준 문항 번호 — 답 제출·기록에 쓴다 */
  globalIndex: number;
  /** 화면에 표시할 퀴즈 이름 (기본 "타임머신") */
  label: string;
  /** 답하는 방식 (기본 "choice"). "text" 면 선지 대신 글칸에 적는다 */
  answerType: "choice" | "text";
  /** 단답형 입력칸 (answerType 이 "text" 일 때만) */
  answerFields: { key: string; label: string; placeholder?: string }[];
  /** 앞 화면에서 재생하는 음성이 있는 문항인가 (노래·문장) */
  hasAudio: boolean;
  revealed: boolean;
  /** 의견형을 「분포 공개」했을 때 우리 반 응답 분포 (아니면 null) */
  dist: { counts: number[]; answered: number } | null;
  answerIndex: number | null;
  nowText: string;
  stickers: string[];
  /** 사진은 주소째 오고, 영상은 종류만 온다 (재생은 전자칠판에서) */
  media: { kind: "image" | "video"; url: string; caption: string; credit: string } | null;
  earned: string[];
}

interface QuizViewProps {
  question: { prompt: string; choices: string[] } | undefined;
  state: QuizState;
  /** 내가 이 문항에서 고른 선지. 아직 안 골랐으면 -1 */
  picked: number;
  onPick: (choiceIndex: number) => void;
  saving: boolean;
  disabled?: boolean;
}

const CHOICE_LABELS = ["①", "②", "③", "④", "⑤"];

export function QuizView({ question, state, picked, onPick, saving, disabled }: QuizViewProps) {
  // 단답형(노래 퀴즈) 답은 서버로 안 보낸다 — 화면에만 남겨 자기 채점한다.
  // 문항별로 따로 담아 두어(교사가 문항을 옮겨도) 각자 적은 게 섞이지 않게 한다.
  const [textAnswers, setTextAnswers] = useState<Record<number, Record<string, string>>>({});

  if (!question) {
    return (
      <section className="block flex flex-col items-center gap-3 bg-lilac py-20 text-center">
        <h2 className="t-display">퀴즈를 준비하고 있어요</h2>
      </section>
    );
  }

  const isText = state.answerType === "text";
  const locked = picked >= 0 || disabled || saving;
  const myText = textAnswers[state.index] ?? {};
  const setMyText = (key: string, value: string) =>
    setTextAnswers((prev) => ({
      ...prev,
      [state.index]: { ...(prev[state.index] ?? {}), [key]: value },
    }));

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="t-eyebrow">
          {state.label} · {state.index + 1} / {state.total}
        </p>
        <h2 className="t-display">{question.prompt}</h2>
      </header>

      {/*
        투표하는 동안 보여주는 그림 (mediaWhileVoting). 선지 위에 크게 둬서 "그림을 보며
        투표"가 되게 한다. 공개 뒤 자료(아래 MediaFigure)와 겹치지 않게 공개 전에만 띄운다.
      */}
      {!state.revealed && state.media && state.media.kind === "image" && (
        <MediaFigure media={state.media} />
      )}

      {/*
        선지형(감정 맞히기 등)인데 음성이 있는 문항 — 앞 화면에서 문장/노래를 듣고 고른다.
        음성 주소는 학생에게 안 보내므로 여기선 안내만 한다.
      */}
      {!isText && state.hasAudio && (
        <div className="block bg-navy text-center text-inverse-ink">
          <p className="t-subhead">🎧 앞 화면에서 나오는 소리를 듣고 골라 보세요</p>
        </div>
      )}

      {/*
        단답형(노래 퀴즈): 선지 대신 글칸. 음성은 앞 화면(교사)에서만 나온다 — 태블릿엔
        주소를 안 보내므로 여기서 재생할 방법이 없다. 학생은 듣고 가수·제목을 적는다.
      */}
      {isText && (
        <div className="flex flex-col gap-4">
          {state.hasAudio && (
            <div className="block bg-navy text-center text-inverse-ink">
              <p className="t-subhead">🎧 앞 화면의 노래를 듣고 적어 보세요</p>
            </div>
          )}
          <div className="flex flex-col gap-3">
            {state.answerFields.map((field) => (
              <label key={field.key} className="flex flex-col gap-1">
                <span className="t-body-sm font-semibold">{field.label}</span>
                <input
                  type="text"
                  value={myText[field.key] ?? ""}
                  onChange={(event) => setMyText(field.key, event.target.value)}
                  disabled={disabled}
                  placeholder={field.placeholder ?? ""}
                  className="rounded-lg border-2 border-line bg-canvas px-4 py-3 t-body-lg focus:border-ink focus:outline-none disabled:bg-surface"
                />
              </label>
            ))}
          </div>
          {!state.revealed && (
            <p className="t-body-sm text-center">
              편하게 적어 보세요. 정답은 다 같이 확인해요 — 스스로 채점하면 돼요.
            </p>
          )}
        </div>
      )}

      {!isText && (
      <ul className="flex flex-col gap-3">
        {question.choices.map((choice, index) => {
          const chosen = picked === index;
          const isAnswer = state.revealed && state.answerIndex === index;
          const wrongPick = state.revealed && chosen && state.answerIndex !== index;

          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => onPick(index)}
                disabled={locked}
                aria-pressed={chosen}
                className={[
                  "flex w-full items-start gap-3 rounded-lg border-2 px-4 py-4 text-left transition",
                  "t-body-lg disabled:cursor-default",
                  isAnswer
                    ? "border-ink bg-lime"
                    : wrongPick
                      ? "border-ink bg-pink"
                      : chosen
                        ? "border-ink bg-surface"
                        : "border-line bg-canvas",
                  locked ? "" : "active:scale-[0.99]",
                ].join(" ")}
              >
                <span className="font-bold">{CHOICE_LABELS[index]}</span>
                <span className="flex-1">{choice}</span>
                {isAnswer && <span className="shrink-0 font-bold">정답</span>}
                {wrongPick && <span className="shrink-0 font-bold">내 선택</span>}
              </button>
            </li>
          );
        })}
      </ul>
      )}

      {!isText && picked < 0 && !state.revealed && (
        <p className="t-body-sm text-center">하나를 골라 주세요. 고른 뒤에는 바꿀 수 없어요.</p>
      )}
      {!isText && picked >= 0 && !state.revealed && (
        <p className="t-body-sm text-center">골랐어요. 다 같이 결과를 볼 때까지 기다려 주세요.</p>
      )}

      {/*
        의견형 문항 — 선생님이 「분포 공개」하면 우리 반 응답 분포를 막대로 보여준다.
        정답이 없으므로 "정답" 강조 없이 분포만 보인다.
      */}
      {state.dist && (
        <div className="block bg-cream flex flex-col gap-2">
          <p className="t-eyebrow">우리 반 응답 — 모두 {state.dist.answered}명</p>
          {question.choices.map((choice, i) => {
            const count = state.dist!.counts[i] ?? 0;
            const answered = state.dist!.answered;
            const ratio = answered > 0 ? Math.round((count / answered) * 100) : 0;
            const mine = picked === i;
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="t-body-sm w-8 shrink-0">
                  {CHOICE_LABELS[i]}
                </span>
                <span className="h-6 flex-1 overflow-hidden rounded-full bg-surface">
                  <span
                    className={`block h-full ${mine ? "bg-lime" : "bg-line"}`}
                    style={{ width: `${ratio}%` }}
                  />
                </span>
                <span className="t-body-sm w-20 shrink-0 text-right">
                  {count}명 {ratio}%
                </span>
              </div>
            );
          })}
          {picked >= 0 && <p className="t-caption">초록색이 내가 고른 것이에요.</p>}
        </div>
      )}

      {/*
        정답과 함께 나오는 자료.
        말로만 "옛날엔 삐삐로 연락했다"고 하면 중1에게는 아무 그림도 안 그려진다.
      */}
      {state.revealed && state.media && <MediaFigure media={state.media} />}

      {/* 정답 공개 — 왜 그렇게 바뀌었는지가 본론이다 */}
      {state.revealed && state.nowText && (
        <div className="block bg-cream">
          <p className="t-eyebrow">{isText ? "정답" : "그럼 지금은?"}</p>
          <p className="t-body-lg mt-2 whitespace-pre-wrap">{state.nowText}</p>

          {state.stickers.length > 0 && (
            <p className="mt-4 flex flex-wrap gap-2">
              {state.stickers.map((trait) => (
                <span
                  key={trait}
                  className="rounded-full bg-ink px-3 py-1.5 text-base font-semibold text-canvas"
                >
                  #{trait}
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      {/*
        모은 특성은 계속 남는다. 네 문항이 끝나면 다섯 개가 다 붙어 있고,
        그 화면이 곧 "디지털 특성 다섯 가지" 정리다 — 따로 설명하는 시간을 두지 않는다.
      */}
      {state.earned.length > 0 && (
        <div className="rounded-lg border border-line px-4 py-3">
          <p className="t-caption">지금까지 모은 특성 {state.earned.length}/5</p>
          <p className="mt-2 flex flex-wrap gap-2">
            {state.earned.map((trait) => (
              <span key={trait} className="rounded-full bg-lilac px-3 py-1 text-sm font-semibold">
                {trait}
              </span>
            ))}
          </p>
        </div>
      )}
    </section>
  );
}

/**
 * 정답과 함께 나오는 자료.
 *
 * 사진이 안 뜨는 경우를 반드시 처리한다. 학교망이 외부 주소를 막거나 잠깐 느릴 때
 * 아무 처리가 없으면 깨진 아이콘만 남고, 28명이 동시에 "선생님 사진 안 나와요"를 외친다.
 * 그때도 설명 문구는 읽을 수 있어야 수업이 이어진다.
 */
function MediaFigure({ media }: { media: NonNullable<QuizState["media"]> }) {
  const [failed, setFailed] = useState(false);
  const showImage = media.kind === "image" && !failed;

  return (
    <figure className="flex flex-col gap-2">
      {showImage ? (
        // next/image 를 쓰지 않는다 — 외부 도메인이라 설정이 필요하고, 최적화 프록시를
        // 거치면 학교망에서 한 단계 더 실패할 자리가 생긴다. 그냥 원본을 띄운다.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.url}
          alt={media.caption}
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-full rounded-lg border border-line bg-surface object-contain"
        />
      ) : (
        <div className="block bg-navy text-center text-inverse-ink">
          <p className="t-subhead">
            {media.kind === "video" ? "📺 앞 화면을 봐 주세요" : "🖼 앞 화면으로 함께 볼게요"}
          </p>
        </div>
      )}
      <figcaption className="t-body-sm">
        {media.caption}
        {media.credit && <span className="t-caption mt-1 block">출처 · {media.credit}</span>}
      </figcaption>
    </figure>
  );
}
