"use client";

import { useEffect, useRef, useState } from "react";

import { TeacherArtifactPanel } from "@/components/teacher-artifact-panel";
import { TeacherQuizPanel } from "@/components/teacher-quiz-panel";
import { TeacherReviewPanel } from "@/components/teacher-review-panel";
import { TeacherShell } from "@/components/teacher-shell";
import { useTeacherDate } from "@/lib/teacher-date";
import { formatDateKorean, formatTimeKST } from "@/lib/datetime";
import { QUADRANTS, type Quadrant } from "@/lib/mood";
import { describePeriod, isPeriodOver, periodTime } from "@/lib/timetable";
import { usePolled } from "@/lib/use-polled";
import { AWAY_ALERT, LESSON_PHASES, PHASE_LABELS, type LessonPhase } from "@/lib/types";
import { groupName } from "@/lib/group-label";

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
  /** 리허설은 교시 시각으로 닫지 않는다 */
  rehearsal?: boolean;
  /** 이 차시에서만 쓰는 단계 이름 (4차시 진도 안내 → AI 직업 관상 체험) */
  phaseLabels?: Partial<Record<LessonPhase, string>>;
  reflectionQuestions: string[];
  moodCheckEnabled: boolean;
  date: string;
  quiz?: { questions: { prompt: string; choices: string[]; answerIndex: number }[] };
  quizIndex?: number;
  quizRevealed?: boolean;
  activity?: {
    activityId: string;
    places?: string[];
    worksheet?: { key: string; phase?: LessonPhase }[];
    /** 감정을 쓰는 차시는 감상을 막는다 (types.ts 의 galleryEnabled) */
    galleryEnabled?: boolean;
  };
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

/**
 * 신호등 다섯 칸. 교사가 봐야 할 것은 앞의 셋이다.
 *
 * **글자를 붙이지 않는다.** "많이 뒤처짐" 같은 말이 묶음 머리에 걸려 있으면, 이 화면을
 * 전자칠판에 띄우는 순간 그 말이 학생에게 붙는다. 이름을 번호로 가려도 마찬가지다 —
 * 자기 번호는 본인이 안다. 색과 인원수만 두면 교사는 똑같이 읽고 학생은 판정을 안 읽는다.
 *
 * 읽어 주는 프로그램을 위한 이름은 색 이름으로만 둔다. 교사가 입으로 말할 때도
 * "빨강 쪽 먼저 돌자" 이지 "많이 뒤처진 학생" 이 아니다.
 */
type Bucket = "red" | "orange" | "yellow" | "lime" | "green";

const BUCKETS: { key: Bucket; aria: string; dot: string; bg: string }[] = [
  { key: "red", aria: "빨강", dot: "#d92d20", bg: "#fde8e6" },
  { key: "orange", aria: "주황", dot: "#e8720c", bg: "#fdeddb" },
  { key: "yellow", aria: "노랑", dot: "#e3b306", bg: "#fdf5da" },
  { key: "lime", aria: "연두", dot: "#84c11c", bg: "#f0f8dd" },
  { key: "green", aria: "초록", dot: "#1ea64a", bg: "#e2f5e8" },
];

interface StudentRow {
  studentId: string;
  name: string;
  /** 이름을 가릴 때 대신 쓰는 출석 번호 */
  number?: number | null;
  temporary: boolean;
  joinedAt: number;
  /** 활동지 진도 — 출석 문서에 얹혀 온다 (Attendance 의 answeredKeys) */
  work?: { done: number; total: number; bucket: Bucket | null; idleMs: number | null };
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
  /**
   * 감정 렌즈에서 위기 신호가 걸린 기록. 걸린 적 없으면 null.
   *
   * 무엇을 썼는지는 오지 않는다 — 원문은 활동지에 있고, 판단은 그것을 읽은 교사가 한다.
   */
  careAlert?: { at: number; count: number } | null;

  /*
   * 수행평가 제출 단계 (7차시). 출석 문서에 얹혀 와서 추가 읽기가 없다.
   * 기사 본문은 오지 않는다 — 검토 패널을 열 때 따로 1건 읽는다.
   */
  stage?: 0 | 1 | 2 | 3;
  /** 2차를 냈고 아직 피드백을 안 준 학생 */
  waiting?: boolean;
  /** 2차 전 자기 점검 답. 검토 패널에 그대로 보여 준다 */
  selfCheck?: string;
  /** 스스로 부족한 곳이 있다고 답했는가. 대기 줄 순서를 정한다 */
  selfCheckWeak?: boolean;
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
  /** AI 검토가 있는 차시에서만 온다. 없는 차시에서는 서버가 읽지도 않는다 */
  aiQuota?: { ok: number; fallback: number; left: number } | null;
}

export default function DashboardPage() {
  return (
    <TeacherShell>
      <Dashboard />
    </TeacherShell>
  );
}

/**
 * 신호등 — 수업 중에 "지금 누구에게 가야 하나" 하나만 답한다.
 *
 * 전체 명단 표는 잘 정리돼 있지만 수업 중에는 쓸 수가 없다. 스물여덟 줄을 눈으로 훑어
 * 뒤처진 학생을 찾는 동안 이미 몇 분이 지나간다. 그래서 **묶어서** 보여준다.
 *
 * 빨강·주황을 맨 위에 크게 놓고 초록은 접는다. 교사가 봐야 할 것은 못 따라오는 쪽이고,
 * 다 한 학생은 셀 수만 있으면 된다.
 *
 * "몇 분째 손을 안 댐" 을 함께 찍는 이유: 진도가 낮아도 지금 열심히 쓰는 중인 학생과
 * 5분째 화면만 보고 있는 학생은 다르다. 뒤쪽이 진짜 가 봐야 할 학생이다.
 */
/**
 * 명단에 보여줄 한 줄 이름.
 *
 * 임시 좌석(90~99)으로 들어온 학생은 명렬표에 없어서 **이름도 번호도 없다.** 그대로
 * 두면 "?번" 이 되어 교사가 누구에게 가야 할지 알 수 없다 — 대기 줄에서는 그것이
 * 곧 그 학생을 못 만난다는 뜻이다.
 *
 * 학번 뒷자리를 쓴다. 그것이 그 태블릿의 좌석 번호이고, 아래 표와 신호등이 이미
 * 같은 규칙을 쓰고 있다. 명렬표에 있는 학생(1~28번)과 겹치지 않게 「임시」를 붙인다.
 */
function whoLabel(row: StudentRow, masked: boolean): string {
  const seat = `${row.number ?? row.studentId.slice(3)}번`;
  if (masked) return seat;
  return row.name || `임시 ${seat}`;
}

/**
 * 검토 대기 줄 (7차시 수행평가).
 *
 * ## 순서를 자기 점검이 정한다
 *
 * 낸 차례대로 도는 것보다, **스스로 "약한 것 같다" 고 고른 학생을 앞에 세우는** 편이
 * 낫다. 교사가 도는 창은 11분이고 스물여덟 명을 다 만날 수는 없다. 그러면 누구를
 * 먼저 만나느냐가 전부인데, 그 답을 학생이 이미 골라 두었다.
 *
 * ## 소리로 알린다
 *
 * 선생님은 교실을 돌아다닌다. 화면을 계속 보고 있을 수가 없으니, 새 이름이 뜰 때만
 * 짧게 운다. **푸시 알림이 아니다** — 이 앱에 푸시가 없고, 폰 화면이 잠기면 폴링도
 * 멈춘다. 폰을 손에 들고 있는 동안만 들린다.
 */
function ReviewQueue({
  rows,
  masked,
  onPick,
}: {
  rows: StudentRow[];
  masked: boolean;
  onPick: (row: StudentRow) => void;
}) {
  const waiting = rows.filter((row) => row.waiting);

  /*
   * 스스로 부족한 곳이 있다고 답한 학생을 앞으로. 그다음은 먼저 낸 순서다.
   *
   * 판정은 서버가 한다 (selfCheckWeak) — 보기의 자리로 가리므로 차시가 문구를 고쳐도
   * 여기가 안 깨진다.
   */
  const ordered = [...waiting].sort(
    (a, b) => Number(b.selfCheckWeak ?? false) - Number(a.selfCheckWeak ?? false) || a.joinedAt - b.joinedAt,
  );

  const prev = useRef(0);
  useEffect(() => {
    if (ordered.length > prev.current) {
      /*
       * 오디오 파일을 두지 않는다. 소리 하나 때문에 정적 파일을 늘릴 이유가 없고,
       * 파일을 받아 오는 동안 놓치는 것보다 즉시 나는 편이 낫다.
       */
      try {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = 880;
          gain.gain.value = 0.06;
          osc.connect(gain).connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.12);
        }
      } catch {
        // 소리를 막아 둔 브라우저 — 화면 숫자로 충분하다
      }
    }
    prev.current = ordered.length;
  }, [ordered.length]);

  if (ordered.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 rounded-xl border-2 border-ink bg-cream p-4">
      <h2 className="text-sm font-semibold">검토 대기 {ordered.length}명</h2>
      {/*
        왜 이 순서인지를 글로 남긴다.
        앞에 세우기만 하면 교사가 그 순서를 믿을 근거가 없고, 표시를 붙여 놔도
        무슨 뜻인지 모르면 없는 것과 같다. 표시가 붙은 학생이 있을 때만 설명한다.
      */}
      <p className="t-caption">
        {ordered.some((row) => row.selfCheckWeak)
          ? "● 표시 — 학생이 스스로 “이 부분이 부족한 것 같다” 고 답했습니다. 먼저 보시라고 앞에 뒀어요."
          : "먼저 낸 순서입니다."}
      </p>
      <div className="flex flex-wrap gap-2">
        {ordered.map((row) => (
          <button
            key={row.studentId}
            type="button"
            onClick={() => onPick(row)}
            className={`pill text-sm ${row.selfCheckWeak ? "pill-primary" : "pill-secondary"}`}
          >
            {row.selfCheckWeak ? "● " : ""}
            {whoLabel(row, masked)}
          </button>
        ))}
      </div>
    </section>
  );
}

function ProgressBoard({
  rows,
  masked,
  onMasked,
}: {
  rows: StudentRow[];
  masked: boolean;
  onMasked: (next: boolean) => void;
}) {
  const scored = rows.filter((row) => row.work && row.work.bucket);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">지금 진도 — 신호등</h2>
        <button
          type="button"
          onClick={() => onMasked(!masked)}
          aria-pressed={masked}
          className="pill pill-secondary text-sm"
        >
          {masked ? "이름 보이기" : "이름 가리기"}
        </button>
      </div>

      {scored.length === 0 ? (
        <p className="rounded-xl border border-line bg-card px-4 py-6 text-center text-sm text-muted">
          아직 셀 것이 없습니다. 활동지나 그리기 단계로 넘어가면 채워집니다.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {BUCKETS.map((bucket) => {
            const members = scored.filter((row) => row.work?.bucket === bucket.key);
            if (members.length === 0) return null;
            /*
             * 빨강·주황·노랑까지 펼친다. 노랑은 아직 절반쯤이라 곧 뒤처질 쪽이고,
             * 순회하다 들여다볼 학생이 그 안에 있다.
             *
             * 연두·초록은 접는다. 다 한 쪽은 셀 수만 있으면 되고, 이름을 늘어놓으면
             * 정작 봐야 할 위쪽이 화면 밖으로 밀린다.
             */
            const foldable = bucket.key === "green" || bucket.key === "lime";

            return (
              <details
                key={bucket.key}
                open={!foldable}
                className="overflow-hidden rounded-xl border border-line border-l-8"
                style={{ background: bucket.bg, borderLeftColor: bucket.dot }}
              >
                {/*
                  글자가 없으니 색이 유일한 표시다. 점을 키우고 왼쪽에 같은 색 띠를 둬서
                  스치듯 봐도 어느 묶음인지 잡히게 한다.
                */}
                <summary
                  className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3"
                  aria-label={`${bucket.aria} ${members.length}명`}
                >
                  <span
                    aria-hidden
                    className="h-5 w-5 shrink-0 rounded-full"
                    style={{ background: bucket.dot }}
                  />
                  <span className="tabular-nums font-semibold">{members.length}명</span>
                </summary>
                <ul className="flex flex-wrap gap-2 px-4 pb-4">
                  {members.map((row) => {
                    const work = row.work!;
                    const idleMin =
                      work.idleMs === null ? null : Math.floor(work.idleMs / 60_000);
                    return (
                      <li
                        key={row.studentId}
                        className="flex items-baseline gap-2 rounded-lg bg-canvas px-3 py-2"
                      >
                        {/*
                          임시 좌석이 여럿이면 전부 "임시" 로 떠서 누가 누군지 안 보였다.
                          좌석 번호를 붙인다 (whoLabel).
                        */}
                        <span className="font-semibold">{whoLabel(row, masked)}</span>
                        <span className="tabular-nums text-sm text-muted">
                          {work.done}/{work.total}
                        </span>
                        {/*
                          손을 놓은 지 오래된 학생만 표시한다. 3분 미만은 쓰는 중이라고 보고
                          찍지 않는다 — 모두에게 붙으면 아무것도 가리키지 못한다.
                        */}
                        {idleMin !== null && idleMin >= 3 && (
                          <span className="tabular-nums text-sm font-semibold">
                            {idleMin}분째 멈춤
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Dashboard() {
  // 날짜는 껍데기(TeacherShell)가 들고 있다. 공유 화면·영상 재생도 같은 값을 본다
  const [date] = useTeacherDate();
  /*
   * 교사가 직접 고른 수업. **어느 날짜에서 골랐는지까지** 함께 들고 있는다.
   *
   * 어제 3교시를 고른 채로 날짜만 오늘로 옮기면 없는 수업 ID 를 붙들고 있어서 화면이
   * 빈다. 예전에는 날짜 칸이 이 화면에 있어서 바꾸는 자리에서 함께 비웠는데, 칸을
   * 껍데기로 옮기면서 그 자리가 없어졌다.
   *
   * 효과로 비우지 않고 **날짜가 다르면 안 고른 것으로 친다.** 효과에서 setState 를 하면
   * 렌더가 한 번 더 돌고, 그 사이 한 프레임 동안 옛 수업이 보인다.
   */
  const [pickedSession, setPickedSession] = useState<{ date: string; id: string } | null>(null);
  const sessionId = pickedSession?.date === date ? pickedSession.id : null;
  const setSessionId = (id: string | null) =>
    setPickedSession(id ? { date, id } : null);
  /** null이면 서버 값을 그대로 보여준다. 교사가 타이핑을 시작하면 그때부터 로컬 값이 이긴다. */
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  /*
   * 이름 가리기.
   *
   * 이 화면을 전자칠판에 띄우는 순간이 있다. 그때 "많이 뒤처짐" 칸에 실명이 걸려 있으면
   * 그 자체로 공개 망신이 된다 (PRD 9장 — 서열화는 피한다).
   *
   * 완전히 지우지 않고 **번호만** 남긴다. 점으로 가리면 교사도 누구에게 가야 할지
   * 알 수 없어서 신호등이 쓸모없어진다. 번호는 학생 본인만 자기 것을 알고, 교사는
   * 출석부로 바로 찾는다.
   */
  const [masked, setMasked] = useState(false);
  /** 지금 검토 중인 학생. 누를 때만 그 학생 기사를 읽는다 */
  const [reviewing, setReviewing] = useState<{
    studentId: string;
    selfCheck: string;
    who: string;
  } | null>(null);

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
  const aiQuota = data?.aiQuota ?? null;
  const note = noteDraft ?? session?.teacherNote ?? "";

  // 학생 한 명이 기분 체크를 마치면 서버가 만들어 세션에 넣어 둔다 (review.ts 참조)
  const reviewSummary = session?.reviewCache?.summary ?? "";

  /*
   * 교시가 끝나 코드가 저절로 닫힌 상태.
   *
   * 상태는 여전히 "진행 중" 인데 학생은 못 들어온다. 그걸 알려 주지 않으면 교사는
   * 화면에 "진행 중" 이 떠 있으니 코드가 살아 있다고 믿고, 학생은 계속 막힌다.
   * (닫힘 판정은 서버의 isSessionClosed 와 같은 규칙이다)
   */
  const autoClosed = Boolean(
    session &&
      session.status === "active" &&
      !session.rehearsal &&
      isPeriodOver(session.date, session.period),
  );

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
      {/* 날짜 고르는 칸은 껍데기로 옮겼다 — 공유 화면·영상 재생과 같은 값을 써야 한다 */}
      <section className="flex flex-wrap items-end gap-3">
        <p className="text-sm text-muted">
          {formatDateKorean(date)} 수업 {sessions.length}개
        </p>
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
                  {item.period}교시 · {groupName(item)}
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
                {groupName(session)} · {describePeriod(session.date, session.period)} ·{" "}
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
                  (autoClosed
                    ? "교시가 끝나 코드가 저절로 닫혔습니다. 다시 열려면 수업 시작을 눌러 주세요."
                    : "지금 코드가 열려 있습니다. 수업 종료를 누르면 닫힙니다.")}
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

          {/*
            학생이 뭔가 쓰기 시작한 뒤로는 계속 띄운다.

            원래 draw·worksheet·gallery 세 단계에서만 띄웠는데, 그러면 **끝난 수업의 작품을
            볼 방법이 아예 없었다.** 수업을 마치면 단계가 done 이 되고, 그 순간 이 패널이
            화면에서 사라진다. 날짜를 되돌려 지난 수업을 골라도 마찬가지다 — 연수에서
            지난 학급 작품을 보여주려다 막힌 자리가 여기다.

            선택과목도 못 봤다. 「인간과 인공지능」은 problem·mvp·build·grill 에서 만드는데
            셋 중 어느 것도 아니어서 한 번도 안 떴다.

            그래서 **작업이 시작되는 단계(problem)부터 끝(done)까지** 로 넓힌다. 그 앞의
            대기·기분·안내·영상 단계에서는 여전히 안 띄운다 — 볼 것이 없는데 스물여덟 편을
            읽어 오는 것은 읽기 낭비다 (PRD 10장 D2).
          */}
          {/*
            onFeedbackSent — 피드백을 보내면 대기 줄을 바로 다시 읽는다.

            대시보드는 20초마다 도는데, 여기서 보내고 위를 올려다보면 이름이 아직 남아
            있다. 안 갔나 싶어 한 번 더 보내게 된다 — 그 20초를 없앤다.
          */}
          {session.activity &&
            LESSON_PHASES.indexOf(session.phase) >= LESSON_PHASES.indexOf("problem") && (
              <TeacherArtifactPanel sessionId={session.id} onFeedbackSent={reload} />
            )}

          {/*
            직업 집계는 여기 두지 않는다.

            셀 때마다 AI 에게 직업 이름을 묶어 달라고 부른다. 대시보드에 두면 교사가
            보지 않는 동안에도 화면이 떠 있는 것만으로 호출이 나간다. 교실 앞 화면
            (/teacher/board)의 "직업 집계" 탭에서 교사가 누를 때만 센다.
          */}

          {/*
            기분 체크를 안 쓰는 차시(선택과목)에서는 감정 칸을 아예 뺀다.
            늘 0으로 떠 있으면 "아무도 안 했다" 로 읽히고, 교사가 눌러 볼 곳을 찾는다.
          */}
          {stats && (
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="접속" value={`${stats.joinedCount} / ${stats.rosterCount}`} />
              {session.moodCheckEnabled && (
                <Stat label="감정 응답" value={String(stats.moodCount)} />
              )}
              {session.reflectionQuestions.length > 0 && (
                <Stat label="성찰 제출" value={String(stats.reflectionCount)} />
              )}
              {session.moodCheckEnabled && (
                <Stat
                  label="미확인 감정"
                  value={String(stats.unreviewed)}
                  warn={stats.unreviewed > 0}
                />
              )}
            </section>
          )}

          {/*
            오늘 AI 가 실제로 돌고 있는가.

            학생 화면은 AI 질문과 고정 질문을 구분해 주지 않는다 — "저는 AI가 안 왔어요"
            가 한 명 나오면 나머지 수업이 멈추기 때문이다. 그래서 교사가 그것을 알 수
            있는 곳이 여기뿐이다. 폴백이 절반을 넘으면 AI 를 접고 다른 방법으로 넘어가는
            판단을 빨리 내려야 해서, 그 순간에만 색을 바꿔 눈에 걸리게 한다.
          */}
          {aiQuota && aiQuota.ok + aiQuota.fallback > 0 && (
            <div
              className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-4 py-3 t-body-sm ${
                aiQuota.fallback > aiQuota.ok ? "bg-coral" : "bg-surface"
              }`}
            >
              <span>
                AI 검토 — 실제 응답 <b>{aiQuota.ok}</b> · 고정 질문 <b>{aiQuota.fallback}</b> ·
                남은 호출 {aiQuota.left}
              </span>
              {aiQuota.fallback > aiQuota.ok && (
                <span>
                  AI 가 안 오고 있습니다. 학생 화면에는 고정 질문 세 개가 대신 나가는
                  중이라 수업은 굴러갑니다 — 여기서 더 기다릴지 접을지만 정하시면 됩니다.
                </span>
              )}
            </div>
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

          {/*
            위기 신호 — 감정 렌즈가 학생 글에서 자·타해 암시를 보고 AI 호출을 멈춘 경우.

            표 안의 칸이 아니라 맨 위 배너로 띄운다. 스물두 줄짜리 표에서 한 칸이
            달라진 것은 수업 중에 못 본다. 이건 놓치면 안 되는 신호다.

            무엇을 썼는지는 여기 띄우지 않는다 — 학생 이름과 글을 나란히 화면에
            띄워 두면 지나가는 다른 학생이 읽는다. 원문은 활동지에서 따로 본다.
          */}
          {data?.rows && data.rows.some((r) => r.careAlert) && (
            <section className="rounded-xl border-2 border-ink bg-pink px-4 py-3">
              <h2 className="text-sm font-semibold">
                오늘 이야기를 나눠야 할 학생이 있어요
              </h2>
              <p className="mt-2 text-sm">
                {data.rows
                  .filter((r) => r.careAlert)
                  .map((r) => `${r.name || r.studentId}(${formatTimeKST(r.careAlert!.at)})`)
                  .join(", ")}
              </p>
              <p className="mt-2 text-xs text-muted">
                감정 렌즈에 힘든 이야기가 담겨 있어 AI에게 보내지 않고 멈췄습니다. 학생
                화면에는 선생님과 이야기하자는 안내만 떴어요. 쓴 내용은 이 화면에 띄우지
                않습니다 — 활동지에서 직접 확인해 주세요.
              </p>
            </section>
          )}

          {data?.missing && data.missing.length > 0 && (
            <section className="rounded-xl border border-line bg-card px-4 py-3">
              <h2 className="text-sm font-semibold">아직 안 들어온 학생 {data.missing.length}명</h2>
              <p className="mt-2 text-sm text-muted">
                {data.missing.map((item) => `${item.name}(${item.studentId.slice(3)})`).join(", ")}
              </p>
            </section>
          )}

          {/*
            수행평가 대기 줄은 신호등보다 위다. 지금 당장 움직여야 하는 것이 이쪽이고,
            신호등은 훑어보는 것이다. 대기가 없으면 통째로 안 그려진다.
          */}
          {data?.session && (
            <ReviewQueue
              rows={rows}
              masked={masked}
              onPick={(row) =>
                setReviewing({
                  studentId: row.studentId,
                  selfCheck: row.selfCheck ?? "",
                  who: whoLabel(row, masked),
                })
              }
            />
          )}

          {reviewing && data?.session && (
            <TeacherReviewPanel
              sessionId={data.session.id}
              studentId={reviewing.studentId}
              who={reviewing.who}
              selfCheck={reviewing.selfCheck}
              /* 보내고 나면 대기 줄을 바로 다시 읽는다 — 다음 학생으로 이어서 간다 */
              onDone={() => {
                setReviewing(null);
                reload();
              }}
              onClose={() => setReviewing(null)}
            />
          )}

          <ProgressBoard rows={rows} masked={masked} onMasked={setMasked} />

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">접속자 · 응답 — 수업 뒤 정리용</h2>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead className="bg-card text-left text-xs text-muted">
                  <tr>
                    <th className="px-3 py-2">학번</th>
                    <th className="px-3 py-2">이름</th>
                    <th className="px-3 py-2">접속</th>
                    <th className="px-3 py-2">자리 비움</th>
                    {session.moodCheckEnabled && (
                      <>
                        <th className="px-3 py-2">기분</th>
                        <th className="px-3 py-2">이유</th>
                      </>
                    )}
                    <th className="px-3 py-2">성찰</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.studentId} className="border-t border-line align-top">
                      <td className="px-3 py-2 tabular-nums">{row.studentId}</td>
                      {/* 가리기는 신호등과 함께 켜진다 — 한쪽만 가리면 다른 쪽에서 그대로 보인다 */}
                      <td className="px-3 py-2">
                        {masked ? (
                          <span className="tabular-nums">{row.number ?? row.studentId.slice(3)}번</span>
                        ) : (
                          row.name || <span className="text-muted">임시</span>
                        )}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-muted">
                        {formatTimeKST(row.joinedAt)}
                      </td>
                      <AwayCell away={row.away} />
                      {session.moodCheckEnabled && (
                        <>
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
                        </>
                      )}
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
                      <td
                        colSpan={session.moodCheckEnabled ? 6 : 4}
                        className="px-3 py-6 text-center text-muted"
                      >
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
  if (phase === "draw") {
    /*
     * 회고 뒤에 그리기를 두는 차시는 그쪽이 입구다 (types.ts 의 wrapheal).
     * 여기까지 열어 두면 그리기 단추가 목록 가운데와 끝에 두 번 뜬다.
     */
    const wrapDraw = (session.activity?.worksheet ?? []).some((q) => q.phase === "wrapheal");
    return !wrapDraw && (session.activity?.places?.length ?? 0) > 0;
  }
  if (phase === "wrapheal") {
    return (session.activity?.worksheet ?? []).some((q) => q.phase === "wrapheal");
  }

  /*
   * 단계별로 나눠 쓰는 차시가 있다 (선택과목은 한 시간에 문제 정의 · 꼭 필요한 것만 ·
   * 만들기 · AI 검토를 지난다). 문항에 적힌 단계로 가른다 — 안 적힌 문항은 활동지 단계다.
   *
   * 이 판정이 없으면 두 가지가 어긋난다.
   *  · 정보과 차시에도 선택과목 단추 넷이 뜬다 (문항이 없어 눌러도 빈 화면)
   *  · 선택과목에 "활동지" 단추가 뜬다 (모든 문항이 다른 단계에 배정돼 있어 역시 빈 화면)
   */
  const STEP_PHASES: LessonPhase[] = [
    "wordquiz",
    "recheck",
    "problem",
    "mvp",
    "build",
    "grill",
    "emotion",
    // 회고 뒤에 오는 활동지 단계 (types.ts 의 LESSON_PHASES 참조)
    "wrapmap",
  ];
  const questionsIn = (item: LessonPhase) =>
    (session.activity?.worksheet ?? []).filter((q) => (q.phase ?? "worksheet") === item).length;

  if (STEP_PHASES.includes(phase)) return questionsIn(phase) > 0;
  if (phase === "worksheet") return questionsIn("worksheet") > 0;
  /*
   * 감상은 볼 것이 있어야 한다 — 어느 단계에 배정됐든 활동지 문항이 있으면 열린다.
   * 다만 감정을 쓰는 차시는 차시 쪽에서 막아 둔다 (galleryEnabled). 마음 이야기가
   * 반 전체에 걸리는 것을 단추 하나 잘못 눌러서 일어나게 두면 안 된다.
   */
  if (phase === "gallery") {
    if (session.activity?.galleryEnabled === false) return false;
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
