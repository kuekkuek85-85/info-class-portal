"use client";

import { useState } from "react";

import { TeacherArtifactPanel } from "@/components/teacher-artifact-panel";
import { TeacherJobsPanel } from "@/components/teacher-jobs-panel";
import { TeacherQuizPanel } from "@/components/teacher-quiz-panel";
import { TeacherShell } from "@/components/teacher-shell";
import { formatDateKorean, formatTimeKST, todayKST } from "@/lib/datetime";
import { QUADRANTS, type Quadrant } from "@/lib/mood";
import { describePeriod, periodTime } from "@/lib/timetable";
import { usePolled } from "@/lib/use-polled";
import { AWAY_ALERT, LESSON_PHASES, PHASE_LABELS, type LessonPhase } from "@/lib/types";

/**
 * 교사 대시보드 — 출석 확인 겸 접속자 실시간 명단, 감정 개별 응답, 성찰 모아보기, 교사 메모.
 *
 * Firestore 실시간 구독 대신 5초 폴링을 쓴다. 학생 브라우저가 Firestore에 직접 붙지 않는
 * 구조를 유지하려면 교사 화면도 서버 API를 거쳐야 하고, 28명 규모에서는 폴링으로 충분하다.
 */

/**
 * 접속자 명단 갱신 주기.
 *
 * 5초에서 늘렸다. 한 번 부를 때마다 출석·감정·성찰·명렬표를 통째로 다시 읽어서
 * 폴링 1회가 문서 100건이 넘는다. 5초로 두면 30분 수업 하나가 무료 읽기 한도
 * (하루 5만 건)의 절반을 먹고, 하루 세 반이면 늦은 교시에 읽기가 거부된다 (PRD 10장 D2).
 *
 * 출석 명단이 20초 늦게 갱신되는 것은 수업에 지장이 없다. 도중에 확인이 급하면
 * 화면을 다시 열면 된다.
 */
const POLL_INTERVAL_MS = 20_000;

interface SessionRow {
  id: string;
  classNo: number;
  period: number;
  lessonNo: number;
  title: string;
  code: string;
  status: "scheduled" | "active" | "ended";
  phase: LessonPhase;
  teacherNote: string;
  reflectionPublic: boolean;
  /** 학생이 지나온 단계로 되돌아갈 수 있는가 */
  freeNavigation?: boolean;
  /** 이 차시에서만 쓰는 단계 이름 (4차시 진도 안내 → AI 직업 관상 체험) */
  phaseLabels?: Partial<Record<LessonPhase, string>>;
  reflectionQuestions: string[];
  moodCheckEnabled: boolean;
  date: string;
  quiz?: { questions: { prompt: string; choices: string[]; answerIndex: number }[] };
  quizIndex?: number;
  quizRevealed?: boolean;
  activity?: { activityId: string; places?: string[]; worksheet?: { key: string }[] };
  /** 지난 차시 복습 — 학생이 기분 체크를 마치면 서버가 만들어 넣는다. 여기서는 한 줄만 쓴다 */
  reviewCache?: { summary?: string } | null;
  /** 단계 버튼을 만들지 말지 판단하는 데만 쓴다 */
  progress?: SessionContent;
  assessment?: SessionContent;
  video?: SessionContent;
}

interface SessionContent {
  heading?: string;
  body?: string;
  url?: string;
  cards?: unknown[];
  tabs?: unknown[];
}

interface StudentRow {
  studentId: string;
  name: string;
  temporary: boolean;
  joinedAt: number;
  mood: {
    key: string;
    label: string;
    quadrant: Quadrant | null;
    reason: string;
    reviewed: boolean;
  } | null;
  reflection: { answers: string[]; draft: boolean; updatedAt: number } | null;
  /** 이탈 누적치 — 출석 문서에 얹혀 있어 추가 읽기가 없다 */
  away?: { ms: number; count: number; longestMs: number };
}

interface DashboardData {
  date: string;
  sessions: SessionRow[];
  session: SessionRow | null;
  rows?: StudentRow[];
  missing?: { studentId: string; name: string }[];
  stats?: {
    rosterCount: number;
    joinedCount: number;
    moodCount: number;
    reflectionCount: number;
    unreviewed: number;
  };
}

export default function DashboardPage() {
  return (
    <TeacherShell>
      <Dashboard />
    </TeacherShell>
  );
}

function Dashboard() {
  const [date, setDate] = useState(todayKST());
  const [sessionId, setSessionId] = useState<string | null>(null);
  /** null이면 서버 값을 그대로 보여준다. 교사가 타이핑을 시작하면 그때부터 로컬 값이 이긴다. */
  const [noteDraft, setNoteDraft] = useState<string | null>(null);

  const params = new URLSearchParams({ date });
  if (sessionId) params.set("sessionId", sessionId);
  const { data, reload } = usePolled<DashboardData>(
    `/api/teacher/dashboard?${params}`,
    POLL_INTERVAL_MS,
  );

  // sessionId 를 안 보내면 서버가 "지금 하는 수업"을 골라 준다 (교시 시각표 기준).
  const sessions = data?.sessions ?? [];
  const session = data?.session ?? null;
  const rows = data?.rows ?? [];
  const stats = data?.stats;
  const note = noteDraft ?? session?.teacherNote ?? "";

  // 학생 한 명이 기분 체크를 마치면 서버가 만들어 세션에 넣어 둔다 (review.ts 참조)
  const reviewSummary = session?.reviewCache?.summary ?? "";

  /*
   * 지금 화면에 떠 있는 수업의 ID.
   *
   * sessionId 는 교사가 드롭다운에서 **직접 고른** 경우에만 채워진다. 아무것도 고르지
   * 않고 화면을 열면 서버가 "지금 하는 수업"을 골라 주는데(4.3), 그때 sessionId 는
   * null 이다.
   *
   * 예전에는 여기서 `if (!sessionId) return` 으로 돌아가 버렸다. 그래서 대시보드를
   * 열자마자 단계 버튼을 누르면 **아무 일도 일어나지 않았다.** 오류도 안 뜨니 교사는
   * 계속 누르고, 학생 화면은 그대로다. 수업이 그 자리에서 멈춘다.
   */
  const currentSessionId = sessionId ?? session?.id ?? null;

  async function patchSession(patch: Record<string, unknown>) {
    if (!currentSessionId) return;
    await fetch("/api/teacher/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentSessionId, ...patch }),
    });
    setNoteDraft(null);
    reload();
  }

  async function reviewAll() {
    // 여기도 같은 이유로 서버가 고른 수업을 받아 쓴다 (patchSession 주석 참조)
    if (!currentSessionId) return;
    await fetch("/api/teacher/mood-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: currentSessionId, all: true }),
    });
    reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">날짜</span>
          <input
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setSessionId(null);
            }}
            className="rounded-lg border border-line bg-card px-3 py-2"
          />
        </label>
        <p className="pb-2 text-sm text-muted">{formatDateKorean(date)} 수업 {sessions.length}개</p>
      </section>

      {sessions.length === 0 && (
        <p className="rounded-xl border border-line bg-card px-4 py-6 text-center text-sm text-muted">
          이 날짜에 등록된 수업이 없습니다. <b>시간표</b>에서 일괄 생성하거나 <b>차시</b>에서
          하나씩 등록하세요.
        </p>
      )}

      {sessions.length > 0 && (
        <section className="flex flex-wrap gap-2">
          {sessions.map((item) => {
            const time = periodTime(item.date, item.period);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSessionId(item.id);
                  setNoteDraft(null);
                }}
                // 서버가 골라 준 수업도 골라진 것으로 표시한다. 아무것도 선택돼 보이지
                // 않으면 교사는 "어느 반을 보고 있는지" 알 수 없다.
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  currentSessionId === item.id
                    ? "border-accent bg-accent/10"
                    : "border-line bg-card hover:border-accent"
                }`}
              >
                <p className="text-sm font-semibold">
                  {item.period}교시 · {item.classNo}반
                </p>
                <p className="text-xs text-muted">
                  {time ? `${time.start}~${time.end} · ` : ""}
                  {item.lessonNo}차시 {item.title}
                </p>
                <p className="mt-1 text-xs">
                  <StatusBadge status={item.status} />
                </p>
              </button>
            );
          })}
        </section>
      )}

      {session && (
        <>
          {/* 수업 코드 — 칠판에 적어야 하므로 크게 */}
          <section className="block flex flex-wrap items-center justify-between gap-4 bg-lime">
            <div>
              <p className="t-eyebrow">수업 코드</p>
              <p className="text-6xl font-black tracking-widest tabular-nums">{session.code}</p>
              <p className="mt-1 text-xs text-muted">
                {session.classNo}반 · {describePeriod(session.date, session.period)} ·{" "}
                {session.lessonNo}차시
              </p>
              {/*
                코드는 "수업 시작"부터 "수업 종료"까지 산다. 교시 시각과는 무관하다.
                안내와 실제 동작이 어긋나면 교사가 학생에게 잘못 알려 준다.
              */}
              <p className="mt-1 text-xs text-muted">
                {session.status === "scheduled" &&
                  "아직 시작 전입니다. 수업 시작을 눌러야 학생이 코드로 들어올 수 있어요."}
                {session.status === "active" &&
                  "지금 코드가 열려 있습니다. 수업 종료를 누르면 닫힙니다."}
                {session.status === "ended" && "수업이 끝나 코드가 닫혔습니다."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => patchSession({ status: "active" })}
                disabled={session.status === "active"}
                className="pill pill-secondary t-body-sm"
              >
                수업 시작
              </button>
              <button
                type="button"
                onClick={() => patchSession({ status: "ended" })}
                disabled={session.status === "ended"}
                className="pill pill-secondary t-body-sm"
              >
                수업 종료 (코드 만료)
              </button>
              {/*
                켜면 학생이 **지나온 단계로** 되돌아갈 수 있다. 앞 단계로는 못 간다.

                다 같이 한 곳을 봐야 하는 구간(퀴즈 문항을 함께 읽을 때)과 각자 속도로
                보완해야 하는 구간이 수업 안에 섞여 있다. 그래서 켜고 끄는 스위치로 둔다.
              */}
              <label
                className={`pill t-body-sm cursor-pointer ${
                  session.freeNavigation ? "pill-primary" : "pill-secondary"
                }`}
                title="학생이 이미 지나온 단계로 되돌아가 보완할 수 있습니다. 아직 안 한 단계로는 갈 수 없습니다."
              >
                <input
                  type="checkbox"
                  checked={Boolean(session.freeNavigation)}
                  onChange={(event) => patchSession({ freeNavigation: event.target.checked })}
                />
                {session.freeNavigation ? "되돌아가기 켬" : "되돌아가기 끔"}
              </label>
              <label className="pill pill-secondary t-body-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={session.reflectionPublic}
                  onChange={(event) => patchSession({ reflectionPublic: event.target.checked })}
                />
                성찰 서로 공개
              </label>
            </div>
          </section>

          {/*
            지난 차시에 이 반이 어땠는지 한 줄.

            같은 4문항인데 반마다 갈렸다 — "용돈 보내기"를 4반은 다 맞혔고 1반은 56%,
            3반은 44%만 맞혔다. 반마다 다시 짚어야 할 것이 다르다. 수업 들어가기 전에
            읽고 한마디 하시라고 여기 둔다.

            학생 중 한 명이 기분 체크를 마치는 순간 만들어진다. 그 전에는 뜨지 않는다.
          */}
          {reviewSummary && (
            <section className="card flex flex-col gap-1">
              <h2 className="t-caption">지난 시간 이 반은</h2>
              <p className="t-body">{reviewSummary}</p>
            </section>
          )}

          {/* 학생 화면은 여기서 정한 단계만 보여준다. 학생은 스스로 옮길 수 없다. */}
          <section className="card flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="t-body font-bold">
                수업 진행 — 지금 학생 화면: {phaseLabel(session, session.phase)}
              </h2>
              <p className="t-caption">누르면 학생 태블릿이 4초 안에 따라옵니다</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {LESSON_PHASES.filter((item) => availablePhase(session, item)).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => patchSession({ phase: item })}
                    aria-current={session.phase === item ? "true" : undefined}
                    className={`pill t-body-sm ${
                      session.phase === item ? "pill-primary" : "pill-secondary"
                    }`}
                  >
                    {phaseLabel(session, item)}
                  </button>
                ),
              )}
            </div>

            {session.phase === "video" && (
              <p className="rounded-lg border border-line bg-background px-3 py-2 text-xs text-muted">
                학생 태블릿에는 &ldquo;영상 시청 중&rdquo; 안내와 성찰 질문만 떠 있습니다. 영상은{" "}
                <a href="/teacher/screen" className="font-medium text-accent underline">
                  영상 재생
                </a>{" "}
                화면에서 전자칠판으로 틀어 주세요.
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => patchSession({ phase: neighbourPhase(session, -1) })}
                disabled={session.phase === "waiting"}
                className="pill pill-secondary"
              >
                ← 이전 단계
              </button>
              <button
                type="button"
                onClick={() => patchSession({ phase: neighbourPhase(session, 1) })}
                disabled={session.phase === "done"}
                className="pill pill-primary"
              >
                다음 단계 →
              </button>
            </div>
          </section>

          {/* 퀴즈가 붙은 차시에서 퀴즈 단계일 때만. 다른 단계에서는 자리만 차지한다 */}
          {session.phase === "quiz" && session.quiz && (
            <TeacherQuizPanel
              sessionId={session.id}
              questions={session.quiz.questions}
              index={session.quizIndex ?? 0}
              revealed={session.quizRevealed === true}
              onPatch={patchSession}
            />
          )}

          {/* 그리기 이후 단계에서만. 그 전에는 볼 작품이 없다 */}
          {session.activity &&
            (session.phase === "draw" ||
              session.phase === "worksheet" ||
              session.phase === "gallery") && <TeacherArtifactPanel sessionId={session.id} />}

          {/*
            직업 조사 집계 — 4차시 정리용.
            활동지에 vanish·rise 칸이 있는 차시에서만 뜬다. 다른 차시에서는 셀 것이 없다.
          */}
          {session.activity?.worksheet?.some((q) => q.key === "vanish") && (
            <TeacherJobsPanel sessionId={session.id} />
          )}

          {stats && (
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="접속" value={`${stats.joinedCount} / ${stats.rosterCount}`} />
              <Stat label="감정 응답" value={String(stats.moodCount)} />
              <Stat label="성찰 제출" value={String(stats.reflectionCount)} />
              <Stat
                label="미확인 감정"
                value={String(stats.unreviewed)}
                warn={stats.unreviewed > 0}
              />
            </section>
          )}

          {/* PRD 5.4 — 매 수업 종료 후 그날 감정 응답을 확인한다 */}
          {stats && stats.unreviewed > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
              <span>
                아직 확인하지 않은 감정 이유가 {stats.unreviewed}건 있습니다. 받아두고 보지 않는
                상태가 가장 위험합니다.
              </span>
              <button
                type="button"
                onClick={reviewAll}
                className="rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-medium"
              >
                모두 확인 처리
              </button>
            </div>
          )}

          {data?.missing && data.missing.length > 0 && (
            <section className="rounded-xl border border-line bg-card px-4 py-3">
              <h2 className="text-sm font-semibold">아직 안 들어온 학생 {data.missing.length}명</h2>
              <p className="mt-2 text-sm text-muted">
                {data.missing.map((item) => `${item.name}(${item.studentId.slice(3)})`).join(", ")}
              </p>
            </section>
          )}

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">접속자 · 응답</h2>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead className="bg-card text-left text-xs text-muted">
                  <tr>
                    <th className="px-3 py-2">학번</th>
                    <th className="px-3 py-2">이름</th>
                    <th className="px-3 py-2">접속</th>
                    <th className="px-3 py-2">자리 비움</th>
                    <th className="px-3 py-2">기분</th>
                    <th className="px-3 py-2">이유</th>
                    <th className="px-3 py-2">성찰</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.studentId} className="border-t border-line align-top">
                      <td className="px-3 py-2 tabular-nums">{row.studentId}</td>
                      <td className="px-3 py-2">
                        {row.name || <span className="text-muted">임시</span>}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-muted">
                        {formatTimeKST(row.joinedAt)}
                      </td>
                      <AwayCell away={row.away} />
                      <td className="px-3 py-2">
                        {row.mood ? (
                          <span className="inline-flex items-center gap-1.5">
                            {row.mood.quadrant && (
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${QUADRANTS[row.mood.quadrant].dotClassName}`}
                              />
                            )}
                            {row.mood.label}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 max-w-[240px] whitespace-pre-wrap">
                        {row.mood?.reason || <span className="text-muted">—</span>}
                      </td>
                      <td className="px-3 py-2 max-w-[420px]">
                        {row.reflection && row.reflection.answers.some((a) => a.trim()) ? (
                          <>
                            {row.reflection.answers.map(
                              (answer, index) =>
                                answer.trim() && (
                                  <p key={index} className="whitespace-pre-wrap">
                                    <span className="text-muted">{index + 1}. </span>
                                    {answer}
                                  </p>
                                ),
                            )}
                            {row.reflection.draft && (
                              <span className="text-xs text-muted">(작성 중)</span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-muted">
                        아직 접속한 학생이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* PRD 5.1 — 다음 반 수업 전에 이 메모를 확인하는 것이 개선 루프의 출발점 */}
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">수업 후 메모</h2>
            <textarea
              value={note}
              onChange={(event) => setNoteDraft(event.target.value)}
              rows={3}
              placeholder="예) 영상 2분 넘어가니 늘어짐 / 성찰 질문 2번 어려워함"
              className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => patchSession({ teacherNote: note })}
              className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              메모 저장
            </button>
          </section>
        </>
      )}
    </div>
  );
}

/** 감정 체크를 쓰지 않는 차시에서는 '기분'을 건너뛴다 */
/**
 * 이 차시에 쓸 수 있는 단계인가.
 *
 * 단계가 11개로 늘면서, 쓰지 않는 단계까지 다 보여주면 교사가 수업 중에 잘못 누르기 쉽다.
 * 잘못 누르면 학생 28명 화면이 동시에 빈 화면으로 바뀐다 — 되돌리는 동안 수업이 멈춘다.
 * 그래서 내용이 없는 단계는 아예 버튼을 만들지 않는다.
 */
function availablePhase(session: SessionRow, phase: LessonPhase): boolean {
  if (phase === "mood") return session.moodCheckEnabled;
  if (phase === "quiz") return (session.quiz?.questions.length ?? 0) > 0;
  /*
   * 활동이 있어도 그리기가 없는 차시가 있다 (4차시 직업 조사는 글만 쓴다).
   * 장소가 하나도 없으면 눌러 봐야 고를 것이 없는 빈 화면이 나온다.
   */
  if (phase === "draw") return (session.activity?.places?.length ?? 0) > 0;
  // 활동지·감상은 활동지 질문이 있는 차시(3차시)에만. 2차시는 그리기까지만 한다.
  if (phase === "worksheet" || phase === "gallery") {
    return (session.activity?.worksheet?.length ?? 0) > 0;
  }
  /*
   * 내용을 채워 넣은 차시에만 버튼을 만든다.
   *
   * 진도·평가 안내는 1차시(오리엔테이션)에서만 쓴다. 2차시는 퀴즈와 그리기로 채워져
   * 있어서 이 단계로 넘기면 학생 28명이 동시에 빈 화면을 본다. 영상도 마찬가지로,
   * 주소가 없는 차시(3차시)에서는 "영상 시청 중"만 뜨고 볼 것이 없다.
   */
  if (phase === "progress") return hasContent(session.progress);
  if (phase === "assessment") return hasContent(session.assessment);
  if (phase === "video") return hasContent(session.video);
  return true;
}

/** 학생에게 보여 줄 것이 하나라도 있는가 */
function hasContent(content: SessionContent | undefined): boolean {
  if (!content) return false;
  return Boolean(
    content.heading?.trim() ||
      content.body?.trim() ||
      content.url?.trim() ||
      content.cards?.length ||
      content.tabs?.length,
  );
}

function neighbourPhase(session: SessionRow, step: 1 | -1): LessonPhase {
  const usable = LESSON_PHASES.filter((item) => availablePhase(session, item));
  const at = usable.indexOf(session.phase);

  // 지금 단계가 목록에 없다 — 차시 내용이 바뀌어 그 단계가 사라진 경우다.
  // 이럴 때 계산을 그대로 돌리면 엉뚱한 곳으로 뛴다. 맨 앞으로 되돌린다.
  if (at < 0) return usable[0];

  const next = Math.min(Math.max(at + step, 0), usable.length - 1);
  return usable[next];
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        warn ? "border-amber-400 bg-amber-50 dark:bg-amber-950/40" : "border-line bg-card"
      }`}
    >
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

/**
 * 단계 버튼에 쓸 이름.
 *
 * 단계 칸은 열한 개로 고정인데 차시마다 쓰임이 다르다. 4차시는 "진도 안내" 칸에
 * AI 관상 체험을 실었다 — 그대로 두면 수업 중에 잘못 누른다.
 */
function phaseLabel(session: SessionRow, phase: LessonPhase): string {
  return session.phaseLabels?.[phase] ?? PHASE_LABELS[phase];
}

/**
 * 자리 비움 한 칸.
 *
 * **신호등이지 성적표가 아니다.** 어디로 갔는지는 알 수 없고 — 화면 꺼짐·전화·알림과
 * 구분되지 않는다 — 그래서 이 숫자만으로 학생을 지목해 꾸짖으면 안 된다.
 * 노란 칸이 뜨면 그 학생 옆을 한 번 지나가면 된다는 뜻으로만 쓴다.
 *
 * 정렬도 순위도 두지 않는다. 줄을 세우는 순간 신호등이 리더보드가 된다.
 */
function AwayCell({ away }: { away?: StudentRow["away"] }) {
  if (!away || away.count === 0 || away.ms < 30_000) {
    return <td className="px-3 py-2 text-muted">—</td>;
  }

  const alert =
    away.ms >= AWAY_ALERT.totalMs ||
    away.count >= AWAY_ALERT.count ||
    away.longestMs >= AWAY_ALERT.longestMs;

  return (
    <td className={`px-3 py-2 tabular-nums ${alert ? "bg-amber-100 dark:bg-amber-900/40" : "text-muted"}`}>
      {formatAway(away.ms)} · {away.count}회
    </td>
  );
}

/** "1분 20초" — 교사가 훑어보는 표라 짧게 */
function formatAway(ms: number): string {
  const total = Math.round(ms / 1000);
  if (total < 60) return `${total}초`;
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return sec === 0 ? `${min}분` : `${min}분 ${sec}초`;
}

function StatusBadge({ status }: { status: SessionRow["status"] }) {
  const map = {
    scheduled: { label: "대기", className: "text-muted" },
    active: { label: "진행 중", className: "text-emerald-600 dark:text-emerald-400" },
    ended: { label: "종료", className: "text-rose-600 dark:text-rose-400" },
  } as const;
  return <span className={map[status].className}>{map[status].label}</span>;
}
