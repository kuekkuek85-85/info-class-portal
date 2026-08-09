"use client";

import { useState } from "react";

import { TeacherShell } from "@/components/teacher-shell";
import { todayKST } from "@/lib/datetime";
import { toEmbedUrl } from "@/lib/embed";
import { usePolled } from "@/lib/use-polled";

/**
 * 교실 앞 전자칠판에 띄우는 화면.
 *
 * 영상은 여기서만 재생한다. 학생 태블릿에는 영상 주소를 아예 내려보내지 않으므로,
 * 30명이 각자 다른 지점을 보거나 유튜브로 빠져나가는 일이 생기지 않는다 (PRD 3.2).
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
  video?: Content;
  reflectionQuestions?: string[];
}

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
  );
  const sessions = data?.sessions ?? [];
  const session = sessions.find((s) => s.id === picked) ?? sessions[0];
  const embed = session?.video?.url ? toEmbedUrl(session.video.url) : "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">전자칠판 화면</h1>
          <p className="text-sm text-muted">
            영상은 이 화면에서만 재생됩니다. 학생 태블릿에는 &ldquo;영상 시청 중&rdquo; 안내와 질문만
            뜹니다.
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

      {session && !embed && (
        <p className="rounded-xl border border-line bg-card px-4 py-6 text-center text-sm text-muted">
          이 차시에는 영상이 등록되어 있지 않습니다. <b>차시</b> 화면에서 영상 주소를 넣어 주세요.
        </p>
      )}

      {session && embed && (
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
