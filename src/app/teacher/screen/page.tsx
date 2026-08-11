"use client";

import { useState } from "react";

import { TeacherShell } from "@/components/teacher-shell";
import { todayKST } from "@/lib/datetime";
import { toEmbedUrl } from "@/lib/embed";
import { usePolled } from "@/lib/use-polled";
import { pickCurrentSession } from "@/lib/pick-session";
import type { LessonPhase } from "@/lib/types";

/**
 * 교실 앞 전자칠판에 띄우는 화면.
 *
 * 영상은 여기서만 재생한다. 학생 태블릿에는 영상 주소를 아예 내려보내지 않으므로,
 * 30명이 각자 다른 지점을 보거나 유튜브로 빠져나가는 일이 생기지 않는다 (PRD 3.2).
 *
 * 퀴즈 단계에서는 문항을 크게 띄운다. 학생 태블릿에도 같은 문항이 있지만, 다 같이 한 곳을
 * 보면서 읽어야 "1996년에는…"이라는 이야기가 성립한다.
 *
 * 이 화면은 교사가 바꾸는 상태(문항 번호·정답 공개)를 따라가야 해서 폴링한다.
 * 대시보드와 달리 **한 대만** 띄우고 세션 목록 몇 건만 읽으므로 읽기 부담이 작다.
 */

interface Content {
  heading: string;
  body: string;
  url: string;
}

interface SessionRow {
  id: string;
  classNo: number;
  period: number;
  lessonNo: number;
  title: string;
  status: "scheduled" | "active" | "ended";
  phase: LessonPhase;
  video?: Content;
  reflectionQuestions?: string[];
  quiz?: {
    questions: {
      prompt: string;
      choices: string[];
      answerIndex: number;
      nowText: string;
      stickers: string[];
      media?: { kind: "image" | "video"; url: string; caption: string; credit: string };
    }[];
  };
  quizIndex?: number;
  quizRevealed?: boolean;
}

/** 교사 조작을 따라가는 주기. 학생 화면(4초)과 비슷하게 둔다 */
const POLL_MS = 4000;

const CHOICE_LABELS = ["①", "②", "③", "④", "⑤"];

export default function ScreenPage() {
  return (
    <TeacherShell>
      <Screen />
    </TeacherShell>
  );
}

function Screen() {
  const [picked, setPicked] = useState("");

  const { data } = usePolled<{ sessions: SessionRow[] }>(
    `/api/teacher/sessions?date=${todayKST()}`,
    POLL_MS,
  );
  const sessions = data?.sessions ?? [];
  // 대시보드와 같은 이유 — 열자마자 "지금 하는 수업"이 떠 있어야 한다
  const session = sessions.find((s) => s.id === picked) ?? pickCurrentSession(sessions);
  const embed = session?.video?.url ? toEmbedUrl(session.video.url) : "";
  const showQuiz = session?.phase === "quiz" && (session.quiz?.questions.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">전자칠판 화면</h1>
          <p className="text-sm text-muted">
            {showQuiz
              ? "퀴즈 문항을 크게 띄웁니다. 문항 이동·정답 공개는 대시보드에서 하세요."
              : "영상은 이 화면에서만 재생됩니다. 학생 태블릿에는 안내와 질문만 뜹니다."}
          </p>
        </div>
        <select
          value={session?.id ?? ""}
          onChange={(event) => setPicked(event.target.value)}
          className="rounded-lg border border-line bg-card px-3 py-2 text-sm"
        >
          {sessions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.period}교시 · {item.classNo}반 · {item.lessonNo}차시
            </option>
          ))}
        </select>
      </div>

      {sessions.length === 0 && (
        <p className="rounded-xl border border-line bg-card px-4 py-6 text-center text-sm text-muted">
          오늘 등록된 수업이 없습니다.
        </p>
      )}

      {session && showQuiz && <QuizBoard session={session} />}

      {session && !showQuiz && !embed && (
        <p className="rounded-xl border border-line bg-card px-4 py-6 text-center text-sm text-muted">
          이 차시에는 영상이 등록되어 있지 않습니다. <b>차시</b> 화면에서 영상 주소를 넣어 주세요.
        </p>
      )}

      {session && !showQuiz && embed && (
        <>
          <div className="overflow-hidden rounded-2xl border border-line bg-black">
            <iframe
              src={embed}
              title={session.video?.heading || "수업 영상"}
              className="aspect-video w-full"
              allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={session.video?.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-line px-4 py-2 text-sm"
            >
              유튜브에서 열기 (전체화면 편함)
            </a>
            {session.video?.body && (
              <p className="whitespace-pre-wrap text-sm text-muted">{session.video.body}</p>
            )}
          </div>

          {(session.reflectionQuestions?.length ?? 0) > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">학생 태블릿에 함께 떠 있는 질문</h2>
              <ol className="flex flex-col gap-2">
                {session.reflectionQuestions?.map((question, index) => (
                  <li
                    key={index}
                    className="rounded-xl border border-line bg-card px-4 py-3 text-base"
                  >
                    <span className="mr-2 font-semibold text-accent">{index + 1}.</span>
                    {question}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** 교실 뒤에서도 읽혀야 한다 — 글자를 최대한 키운다 */
function QuizBoard({ session }: { session: SessionRow }) {
  const questions = session.quiz?.questions ?? [];
  const index = Math.min(Math.max(session.quizIndex ?? 0, 0), questions.length - 1);
  const question = questions[index];
  const revealed = session.quizRevealed === true;

  if (!question) return null;

  // 지나간 문항 + 공개된 지금 문항의 특성 (학생 화면과 같은 규칙)
  const earned: string[] = [];
  for (let i = 0; i < index; i += 1) {
    for (const trait of questions[i]?.stickers ?? []) {
      if (!earned.includes(trait)) earned.push(trait);
    }
  }
  if (revealed) {
    for (const trait of question.stickers ?? []) {
      if (!earned.includes(trait)) earned.push(trait);
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <p className="text-lg font-semibold text-muted">
        타임머신 {index + 1} / {questions.length}
      </p>
      <h2 className="text-4xl leading-snug font-bold">{question.prompt}</h2>

      <ul className="flex flex-col gap-3">
        {question.choices.map((choice, i) => {
          const isAnswer = revealed && i === question.answerIndex;
          return (
            <li
              key={i}
              className={`flex items-start gap-4 rounded-2xl border-2 px-6 py-5 text-2xl ${
                isAnswer ? "border-ink bg-lime font-bold" : "border-line bg-card"
              }`}
            >
              <span className="font-bold">{CHOICE_LABELS[i]}</span>
              <span className="flex-1">{choice}</span>
              {isAnswer && <span className="shrink-0">정답</span>}
            </li>
          );
        })}
      </ul>

      {/*
        정답과 함께 나오는 자료. 영상은 여기서만 재생한다 — 학생 태블릿에는 주소를
        아예 내려보내지 않아서, 각자 다른 지점을 보는 일이 생기지 않는다 (PRD 3.2).
      */}
      {revealed && question.media && <BoardMedia media={question.media} />}

      {revealed && question.nowText && (
        <div className="rounded-2xl bg-cream px-6 py-5">
          <p className="text-lg font-semibold">그럼 지금은?</p>
          <p className="mt-2 text-2xl leading-snug whitespace-pre-wrap">{question.nowText}</p>
        </div>
      )}

      {earned.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-lg text-muted">모은 특성 {earned.length}/5</span>
          {earned.map((trait) => (
            <span
              key={trait}
              className="rounded-full bg-ink px-5 py-2 text-2xl font-bold text-canvas"
            >
              {trait}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * 전자칠판에 띄우는 정답 자료.
 *
 * 사진이 안 뜨거나 영상이 임베드를 막는 경우를 함께 처리한다. 수업 중에 화면이 비면
 * 되돌릴 방법이 있어야 한다 — 사진은 원본 주소를, 영상은 유튜브 링크를 남겨 둔다.
 */
function BoardMedia({
  media,
}: {
  media: { kind: "image" | "video"; url: string; caption: string; credit: string };
}) {
  const [failed, setFailed] = useState(false);

  return (
    <figure className="flex flex-col gap-3">
      {media.kind === "image" ? (
        failed ? (
          <p className="rounded-2xl border border-line bg-card px-6 py-8 text-center text-lg text-muted">
            사진을 불러오지 못했습니다. 아래 &ldquo;원본 열기&rdquo;로 띄워 주세요.
          </p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.url}
            alt={media.caption}
            onError={() => setFailed(true)}
            className="max-h-[52vh] w-full rounded-2xl border border-line bg-surface object-contain"
          />
        )
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-black">
          <iframe
            src={toEmbedUrl(media.url)}
            title={media.caption}
            className="aspect-video w-full"
            allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <figcaption className="flex flex-wrap items-center gap-3 text-lg">
        <span>{media.caption}</span>
        <a
          href={media.url}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-line px-3 py-1 text-sm"
        >
          {media.kind === "video" ? "유튜브에서 열기" : "원본 열기"}
        </a>
        {media.credit && <span className="text-sm text-muted">출처 · {media.credit}</span>}
      </figcaption>
    </figure>
  );
}
