"use client";

import { useEffect, useState, type ReactNode } from "react";

import { TeacherShell } from "@/components/teacher-shell";
import { todayKST } from "@/lib/datetime";
import { usePolled } from "@/lib/use-polled";
import { groupName } from "@/lib/group-label";
import { COURSES, courseOf, type CourseKey } from "@/lib/assistant/courses";
import {
  emptyPhaseContent,
  type ActivityContent,
  type PhaseContent,
  type QuizContent,
} from "@/lib/types";

/**
 * 차시 계획 관리 + 개별 수업 등록.
 *
 * 차시 계획은 반과 무관하다. 한 번 등록하면 네 반이 공용으로 쓴다.
 * 여기서 내용을 고치면 **아직 시작하지 않은** 세션에만 반영된다 (PRD 5.1).
 */

interface Plan {
  id: string;
  lessonNo: number;
  title: string;
  moodCheckEnabled: boolean;
  game: PhaseContent;
  gameExplainer: PhaseContent;
  progress: PhaseContent;
  assessment: PhaseContent;
  video: PhaseContent;
  reflectionQuestions: string[];
  reflectionPublic: boolean;
  /** 시드로만 등록된다. 이 화면에서는 있다는 표시만 하고 수정하지 않는다 */
  quiz?: QuizContent;
  activity?: ActivityContent;
  /** 분반으로 여는 차시(선택과목). 있으면 반 대신 이 목록에서 고른다 */
  groups?: { key: string; label: string; classNo: number }[];
}

/** 편집기가 다루는 필드만. 퀴즈·활동은 서버가 기존 값을 그대로 유지한다 */
type Draft = Omit<Plan, "id" | "quiz" | "activity"> & { id?: string };

/** 리허설 목록에 쓰는 만큼만 */
interface SessionRow {
  id: string;
  code: string;
  classNo: number;
  lessonNo: number;
  title: string;
  rehearsal?: boolean;
  demo?: boolean;
}

/**
 * 반이냐 분반이냐를 고르는 칸.
 *
 * 정보과는 1~4반으로 열지만 선택과목은 분반(화요일 1기 …)으로 연다. 차시가 분반 목록을
 * 들고 있으면 그것을 세우고, 없으면 지금까지처럼 반을 세운다.
 *
 * 「인간과 인공지능」을 고른 채로 "1반" 을 고르라고 하면 고를 것이 없다 —
 * 그 수업에는 1반이라는 것이 없다.
 */
function GroupPicker({
  plan,
  classNo,
  groupKey,
  onClassNo,
  onGroupKey,
}: {
  plan: Plan | undefined;
  classNo: number;
  groupKey: string;
  onClassNo: (n: number) => void;
  onGroupKey: (key: string) => void;
}) {
  const groups = plan?.groups ?? [];

  if (groups.length > 0) {
    return (
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">분반</span>
        <select
          value={groupKey || groups[0].key}
          onChange={(event) => onGroupKey(event.target.value)}
          className="rounded-lg border border-line bg-background px-3 py-2"
        >
          {groups.map((g) => (
            <option key={g.key} value={g.key}>
              {g.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted">반</span>
      <select
        value={classNo}
        onChange={(event) => onClassNo(Number(event.target.value))}
        className="rounded-lg border border-line bg-background px-3 py-2"
      >
        {[1, 2, 3, 4].map((n) => (
          <option key={n} value={n}>
            {n}반
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * 등록 차시 목록을 가르는 탭. 하트아이로봇(heart-robot)은 아직 차시가 없어 뺀다.
 *
 * 챗봇이 쓰는 `courseOf` 와 같은 분류를 그대로 쓴다 — 화면과 조교가 "이건 무슨 과목"
 * 을 다르게 말하면 안 된다.
 */
const LESSON_TABS: readonly CourseKey[] = ["informatics", "human-ai", "mind-talk"];

/** 선택 탭 기억. 저장소가 막힌 브라우저면 그냥 기본 탭으로 시작한다 (try/catch). */
const TAB_STORAGE_KEY = "teacher-lessons-tab";

/** 콘텐츠 섹션 접힘 상태 기억. 저장소가 막히면 이번 화면에서만 동작한다 (try/catch). */
const COLLAPSE_STORAGE_KEY = "teacher-lessons-collapsed";

/** 개별 토글로 접는 콘텐츠 섹션 6개 (편집 폼 안). */
type SectionKey =
  | "game"
  | "gameExplainer"
  | "progress"
  | "assessment"
  | "video"
  | "reflection";

/**
 * 콘텐츠 섹션 하나를 개별 접이식 패널로 감싼다.
 *
 * 헤더(라벨 + 펼치기/접기 토글)는 늘 보이고 본문만 접힌다. 다른 섹션에는 영향이 없다.
 * 기본은 펼침이라 접기 전엔 지금과 똑같이 보이고, 접으면 헤더만 남는다.
 *
 * 접힘은 표시만 제어한다 — DOM 을 지우지 않고 hidden 으로 감추므로, 안의 입력·onChange 는
 * 그대로 살아 있고 접어도 값이 사라지지 않는다.
 */
function CollapsibleSection({
  label,
  collapsed,
  onToggle,
  children,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-card p-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <h2 className="text-sm font-semibold">{label}</h2>
        <span className="shrink-0 text-xs font-medium text-muted">
          {collapsed ? "▸ 펼치기" : "▾ 접기"}
        </span>
      </button>
      {/*
        hidden 을 얹는 칸에는 flex 같은 display 유틸을 두지 않는다 — display 유틸이 있으면
        hidden(=display:none)이 덮여 안 접힌다. 안쪽 칸이 세로 간격을 맡는다.
      */}
      <div hidden={collapsed} className="mt-2">
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    </section>
  );
}

/**
 * 「리허설」·「바로 열기」의 과목 선택 시작값. 3탭에서 기억해 둔 과목을 읽어 와
 * 화면끼리 "무슨 과목" 을 다르게 말하지 않게 한다. 첫 렌더는 기본값(정보)으로 두고
 * (하이드레이션 어긋남 방지) 붙은 뒤 저장소에서 복원한다. 막힌 브라우저면 정보로 둔다 (try/catch).
 */
function useRememberedCourse() {
  const [course, setCourse] = useState<CourseKey>("informatics");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TAB_STORAGE_KEY);
      if (saved && (LESSON_TABS as readonly string[]).includes(saved)) {
        setCourse(saved as CourseKey);
      }
    } catch {
      // 저장소를 막아 둔 브라우저 — 정보로 둔다
    }
  }, []);
  return [course, setCourse] as const;
}

/**
 * 차시 하나를 과목으로 접는다. `courseOf` 판정을 그대로 따르되,
 * 탭에 없는 과목(heart-robot, 또는 미래에 생길 무엇)으로 잡히면 정보 탭에 담는다 —
 * courses.ts 의 기본값도 정보라, 어느 탭에도 안 잡혀 계획이 사라지는 일이 없게 한다.
 */
function planCourse(plan: Plan): CourseKey {
  const key = courseOf({
    activityId: plan.activity?.activityId,
    groupKey: plan.groups?.[0]?.key,
    lessonNo: plan.lessonNo,
  }).key;
  return (LESSON_TABS as readonly string[]).includes(key) ? key : "informatics";
}

const EMPTY: Draft = {
  lessonNo: 1,
  title: "",
  moodCheckEnabled: true,
  game: emptyPhaseContent(),
  gameExplainer: emptyPhaseContent(),
  progress: emptyPhaseContent(),
  assessment: emptyPhaseContent(),
  video: emptyPhaseContent(),
  reflectionQuestions: [""],
  reflectionPublic: false,
};

export default function LessonsPage() {
  return (
    <TeacherShell>
      <Lessons />
    </TeacherShell>
  );
}

function Lessons() {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, reload } = usePolled<{ plans: Plan[] }>("/api/teacher/lessons");
  const plans = data?.plans ?? [];

  // 선택 탭. 첫 렌더는 기본값으로 두고(하이드레이션 어긋남 방지), 붙은 뒤 저장소에서 복원한다.
  const [tab, setTab] = useState<CourseKey>("informatics");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TAB_STORAGE_KEY);
      if (saved && (LESSON_TABS as readonly string[]).includes(saved)) {
        setTab(saved as CourseKey);
      }
    } catch {
      // 저장소를 막아 둔 브라우저 — 기본 탭으로 둔다
    }
  }, []);

  function chooseTab(key: CourseKey) {
    setTab(key);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, key);
    } catch {
      // 못 저장해도 이번 화면에서는 그대로 동작한다
    }
  }

  // 콘텐츠 섹션별 접힘. 기본은 모두 펼침(빈 객체 = 지금 동작 유지). 붙은 뒤 저장소에서 복원한다.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSE_STORAGE_KEY);
      if (saved) setCollapsed(JSON.parse(saved) as Record<string, boolean>);
    } catch {
      // 저장소가 막혔거나 값이 깨졌다 — 모두 펼친 기본으로 둔다
    }
  }, []);

  function toggleSection(key: SectionKey) {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // 못 저장해도 이번 화면에서는 접힘이 동작한다
      }
      return next;
    });
  }

  // 탭별 개수는 전체 목록에서 센다. 지금 보이는 것은 고른 탭 하나뿐이다.
  const counts = { informatics: 0, "human-ai": 0, "mind-talk": 0 } as Record<CourseKey, number>;
  for (const plan of plans) counts[planCourse(plan)] += 1;
  const visiblePlans = plans.filter((plan) => planCourse(plan) === tab);

  async function save() {
    setBusy(true);
    setMessage("");

    const response = await fetch("/api/teacher/lessons", {
      method: draft.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const result = await response.json();
    setBusy(false);

    if (!result.ok) {
      setMessage(result.message ?? "저장하지 못했습니다.");
      return;
    }
    setMessage(
      draft.id
        ? `저장했습니다. 아직 시작하지 않은 수업 ${result.synced ?? 0}개에 반영했습니다.`
        : "차시를 등록했습니다.",
    );
    setDraft(EMPTY);
    reload();
  }

  async function remove(id: string) {
    if (!confirm("이 차시 계획을 삭제할까요? 이미 만들어진 수업은 그대로 남습니다.")) return;
    await fetch(`/api/teacher/lessons?id=${id}`, { method: "DELETE" });
    reload();
  }

  function edit(plan: Plan) {
    setDraft({
      ...plan,
      game: plan.game ?? emptyPhaseContent(),
      gameExplainer: plan.gameExplainer ?? emptyPhaseContent(),
      progress: plan.progress ?? emptyPhaseContent(),
      assessment: plan.assessment ?? emptyPhaseContent(),
      video: plan.video ?? emptyPhaseContent(),
      reflectionQuestions:
        plan.reflectionQuestions?.length > 0 ? [...plan.reflectionQuestions] : [""],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">{draft.id ? "차시 수정" : "차시 등록"}</h1>

        <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
          {/*
            차시 번호는 고르게 할 수 없다 — 정보과는 1~7이지만 선택과목은 102·201 처럼
            세 자리를 쓴다. 그래서 칸으로 두되, 다 지웠을 때 0 이 남지 않게 한다.

            0 을 "비어 있음" 으로 쓴다. 차시 번호는 1부터라 0 이 뜻을 가질 일이 없다.
            이걸 안 하면 지우는 순간 0 이 되고, 이어서 치면 "07" 이 된다.
          */}
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">차시 번호</span>
            <input
              type="number"
              min={1}
              value={draft.lessonNo === 0 ? "" : draft.lessonNo}
              onChange={(event) => {
                const raw = event.target.value;
                setDraft({ ...draft, lessonNo: raw === "" ? 0 : Number(raw) });
              }}
              className="rounded-lg border border-line bg-card px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">제목</span>
            <input
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="예) 디지털 세상과 나"
              className="rounded-lg border border-line bg-card px-3 py-2"
            />
          </label>
        </div>

        <p className="text-sm text-muted">
          수업은 <b>기분 → 진도 안내 → 평가 안내 → 영상 시청 → 성찰</b> 순서로 진행되고, 학생
          화면은 <b>대시보드에서 선생님이 넘긴 단계</b>만 보여줍니다.
        </p>

        <CollapsibleSection
          label="대기 중 게임"
          collapsed={!!collapsed.game}
          onToggle={() => toggleSection("game")}
        >
          <ContentEditor
            label="대기 중 게임"
            hint="태블릿이 늦게 켜지거나 주소를 잘못 친 학생을 기다리는 동안 띄웁니다. 주소를 비우면 '잠시만 기다려 주세요'만 나옵니다."
            value={draft.game}
            onChange={(game) => setDraft({ ...draft, game })}
            urlPlaceholder="https://... (게임 주소)"
          />
        </CollapsibleSection>
        <CollapsibleSection
          label="게임 원리 설명 (팝업)"
          collapsed={!!collapsed.gameExplainer}
          onToggle={() => toggleSection("gameExplainer")}
        >
          <ContentEditor
            label="게임 원리 설명 (팝업)"
            hint="선생님이 수업을 시작하는 순간 학생 화면에 한 번 뜹니다. 게임으로만 끝나지 않게 하는 장치입니다."
            value={draft.gameExplainer}
            onChange={(gameExplainer) => setDraft({ ...draft, gameExplainer })}
            urlPlaceholder="(보통 비워 둡니다)"
          />
        </CollapsibleSection>
        <CollapsibleSection
          label="진도 안내"
          collapsed={!!collapsed.progress}
          onToggle={() => toggleSection("progress")}
        >
          <ContentEditor
            label="진도 안내"
            hint="이번 단원에서 무엇을 배우는지. URL을 넣으면 슬라이드가 학생 화면에 표시됩니다."
            value={draft.progress}
            onChange={(progress) => setDraft({ ...draft, progress })}
          />
        </CollapsibleSection>
        <CollapsibleSection
          label="평가 안내"
          collapsed={!!collapsed.assessment}
          onToggle={() => toggleSection("assessment")}
        >
          <ContentEditor
            label="평가 안내"
            hint="수행평가 방식과 기준."
            value={draft.assessment}
            onChange={(assessment) => setDraft({ ...draft, assessment })}
          />
        </CollapsibleSection>
        <CollapsibleSection
          label="영상 시청"
          collapsed={!!collapsed.video}
          onToggle={() => toggleSection("video")}
        >
          <ContentEditor
            label="영상 시청"
            hint="유튜브 주소를 넣으면 포털 안에서 재생됩니다. 새 창으로 열지 않아 학생 화면이 흩어지지 않습니다."
            value={draft.video}
            onChange={(video) => setDraft({ ...draft, video })}
            urlPlaceholder="https://youtu.be/... 또는 https://www.youtube.com/watch?v=..."
          />
        </CollapsibleSection>

        <CollapsibleSection
          label="성찰 질문"
          collapsed={!!collapsed.reflection}
          onToggle={() => toggleSection("reflection")}
        >
          <p className="text-xs text-muted">
            질문마다 입력칸이 하나씩 생기고, 학생은 <b>모든 질문에 각각</b> 답합니다.
          </p>

          {draft.reflectionQuestions.map((question, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="pt-2.5 text-sm font-semibold text-muted">{index + 1}.</span>
              <textarea
                value={question}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    reflectionQuestions: draft.reflectionQuestions.map((q, i) =>
                      i === index ? event.target.value : q,
                    ),
                  })
                }
                rows={2}
                placeholder="예) 영상에서 AI가 아직 못 한다고 한 것 중 하나를 고르고, 왜 어려울지 내 생각 쓰기"
                className="flex-1 rounded-lg border border-line bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    reflectionQuestions: draft.reflectionQuestions.filter((_, i) => i !== index),
                  })
                }
                disabled={draft.reflectionQuestions.length === 1}
                className="mt-1 rounded-lg border border-line px-3 py-2 text-xs disabled:opacity-40"
              >
                삭제
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              setDraft({ ...draft, reflectionQuestions: [...draft.reflectionQuestions, ""] })
            }
            className="self-start rounded-lg border border-line px-4 py-2 text-sm"
          >
            + 질문 추가
          </button>
        </CollapsibleSection>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.moodCheckEnabled}
              onChange={(event) => setDraft({ ...draft, moodCheckEnabled: event.target.checked })}
            />
            감정 체크 사용
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.reflectionPublic}
              onChange={(event) => setDraft({ ...draft, reflectionPublic: event.target.checked })}
            />
            성찰 글 서로 공개 (기본 비공개)
          </label>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {draft.id ? "수정 저장" : "차시 등록"}
          </button>
          {draft.id && (
            <button
              type="button"
              onClick={() => setDraft(EMPTY)}
              className="rounded-lg border border-line px-4 py-2 text-sm"
            >
              새로 작성
            </button>
          )}
        </div>

        {message && <p className="text-sm text-muted">{message}</p>}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">등록된 차시 {plans.length}개</h2>

        {/*
          과목별 탭. 스타일은 학생 화면 필터 pill(반 고르기)과 같은 토큰을 쓰고,
          갤럭시 탭·모바일에서 줄바꿈되게 flex-wrap 으로 둔다. 표시 필터일 뿐이라
          아래 리허설·바로 열기 목록은 전체 plans 를 그대로 받는다.
        */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="과목">
          {LESSON_TABS.map((key) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => chooseTab(key)}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${
                  active ? "bg-accent text-white" : "border border-line text-muted"
                }`}
              >
                {COURSES[key].label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                    active ? "bg-white/20" : "bg-surface text-muted"
                  }`}
                >
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>

        {visiblePlans.length === 0 && (
          <p className="text-sm text-muted">이 과목에 등록된 차시가 없습니다.</p>
        )}
        <ul className="flex flex-col gap-2">
          {visiblePlans.map((plan) => (
            <li
              key={plan.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {plan.lessonNo}차시 · {plan.title}
                </p>
                <p className="mt-1 text-sm text-muted">
                  성찰 질문 {plan.reflectionQuestions?.length ?? 0}개
                </p>
                <p className="mt-1 text-xs text-muted">
                  {plan.moodCheckEnabled ? "감정 체크 O" : "감정 체크 X"} ·{" "}
                  {plan.reflectionPublic ? "성찰 공개" : "성찰 비공개"} ·{" "}
                  {[
                    plan.progress?.heading || plan.progress?.body || plan.progress?.url
                      ? "진도"
                      : null,
                    plan.assessment?.heading || plan.assessment?.body || plan.assessment?.url
                      ? "평가"
                      : null,
                    plan.video?.url ? "영상" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "단계 내용 없음"}
                </p>

                {/*
                  퀴즈·활동은 시드 스크립트로 등록되고 이 화면에는 입력칸이 없다.
                  표시조차 없으면 교사가 "이 차시에 퀴즈가 붙어 있다"는 사실을 모르고
                  수업에 들어가게 된다. 고칠 수는 없어도 있다는 것은 보여야 한다.
                */}
                {(plan.quiz || plan.activity) && (
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    {plan.quiz && (
                      <span className="rounded-full bg-lime px-2.5 py-1 text-xs font-semibold">
                        퀴즈 {plan.quiz.questions?.length ?? 0}문항
                      </span>
                    )}
                    {plan.activity && (
                      <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold">
                        그리기 활동 · {plan.activity.activityId}
                        {plan.activity.worksheet?.length
                          ? ` · 활동지 ${plan.activity.worksheet.length}문항`
                          : ""}
                      </span>
                    )}
                    <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">
                      화면에서 수정 불가 — 시드 스크립트로 관리
                    </span>
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => edit(plan)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => remove(plan.id)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs text-rose-600"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Rehearsal plans={plans} />
      <QuickSession plans={plans} />
    </div>
  );
}

/**
 * 리허설 — 교사가 혼자 화면을 걸어보는 수업.
 *
 * 방과 후에 미리 확인하려면 "오늘 날짜에, 아직 안 끝난 교시" 인 수업이 있어야 하는데
 * 그런 시간이 없다. 진짜 교시로 만들면 만들자마자 코드가 만료된다.
 *
 * 그래서 시각표에 없는 교시로 만들고 시각 만료를 면제한다. 대신 "지금 하는 수업"
 * 자동 선택에서는 빠진다 — 지우는 것을 깜빡한 리허설이 다음 날 진짜 수업 대신
 * 대시보드에 뜨면 엉뚱한 반을 보며 수업하게 된다.
 */
function Rehearsal({ plans }: { plans: Plan[] }) {
  const [picked, setPicked] = useState("");
  const [classNo, setClassNo] = useState(1);
  const [groupKey, setGroupKey] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  /** 교사 연수 시연용으로 열면 /demo 링크로 코드 없이 들어올 수 있다 */
  const [demo, setDemo] = useState(false);
  // 먼저 과목을 고르고, 그 과목 차시만 아래 드롭다운에 세운다 (3탭과 같은 courseOf 분류).
  const [course, setCourse] = useRememberedCourse();

  // 과목을 바꾸면 고른 차시를 비운다 — 엉뚱한 과목 차시가 선택된 채 남지 않게. 새 과목의 첫 차시로 돌아간다.
  function chooseCourse(next: CourseKey) {
    setCourse(next);
    setPicked("");
  }

  const coursePlans = plans.filter((p) => planCourse(p) === course);
  const lessonPlanId = picked || coursePlans[0]?.id || "";
  const plan = plans.find((p) => p.id === lessonPlanId);
  const { data, reload } = usePolled<{ sessions: SessionRow[] }>(
    `/api/teacher/sessions?date=${todayKST()}`,
  );
  const rehearsals = (data?.sessions ?? []).filter((s) => s.rehearsal);

  async function create() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/teacher/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonPlanId,
        classNo,
        // 분반제 차시면 고른 분반을, 아니면 아무것도 안 보낸다
        groupKey: plan?.groups?.length ? groupKey || plan.groups[0].key : undefined,
        rehearsal: true,
        demo,
      }),
    });
    const result = await response.json();
    setBusy(false);
    setMessage(result.ok ? "" : (result.message ?? "만들지 못했습니다."));
    reload();
  }

  async function remove(id: string) {
    await fetch(`/api/teacher/sessions?id=${id}`, { method: "DELETE" });
    reload();
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
      <h2 className="text-lg font-semibold">리허설 — 혼자 걸어보기</h2>
      <p className="text-sm text-muted">
        방과 후에도 코드가 만료되지 않는 연습용 수업입니다. 진짜 수업 목록과 대시보드의 &ldquo;지금
        하는 수업&rdquo;에는 잡히지 않으니, 확인이 끝나면 지워 주세요. 학생 화면은{" "}
        <b>각 반 30번 테스트 계정</b>(10130 · 10230 · 10330 · 10430)으로 들어가면 됩니다.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">과목</span>
          <select
            value={course}
            onChange={(event) => chooseCourse(event.target.value as CourseKey)}
            className="rounded-lg border border-line bg-background px-3 py-2"
          >
            {LESSON_TABS.map((key) => (
              <option key={key} value={key}>
                {COURSES[key].label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">차시</span>
          <select
            value={lessonPlanId}
            onChange={(event) => setPicked(event.target.value)}
            disabled={coursePlans.length === 0}
            className="rounded-lg border border-line bg-background px-3 py-2 disabled:opacity-40"
          >
            {coursePlans.length === 0 && <option value="">등록된 차시 없음</option>}
            {coursePlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.lessonNo}차시 {plan.title}
              </option>
            ))}
          </select>
        </label>
        <GroupPicker
          plan={plan}
          classNo={classNo}
          groupKey={groupKey}
          onClassNo={setClassNo}
          onGroupKey={setGroupKey}
        />
        {/*
          시연용으로 열면 /demo 링크가 살아난다. 참가자는 코드도 학번도 치지 않고,
          서버가 빈 임시 번호를 하나씩 배정한다 — 스무 명에게 번호를 불러 주면
          반드시 겹치고, 겹치면 그림이 서로 덮인다.
        */}
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
          교사 연수 시연용 (/demo 링크로 참가)
        </label>

        <button
          type="button"
          onClick={create}
          disabled={!lessonPlanId || busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "만드는 중…" : "리허설 수업 열기"}
        </button>
      </div>

      {message && <p className="text-sm">{message}</p>}

      {rehearsals.length > 0 && (
        <ul className="flex flex-col gap-2 border-t border-line pt-3">
          {rehearsals.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2"
            >
              <span className="text-sm">
                <b className="text-lg">코드 {item.code}</b> · {groupName(item)} · {item.lessonNo}차시{" "}
                {item.title}
                {item.demo && <b className="ml-2 text-accent">· 시연용 (/demo)</b>}
              </span>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="rounded-lg border border-line px-3 py-1.5 text-xs text-rose-600"
              >
                지우기
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ContentEditor({
  label,
  hint,
  value,
  onChange,
  urlPlaceholder = "https://... (없으면 비워 두세요)",
}: {
  label: string;
  hint: string;
  value: PhaseContent;
  onChange: (value: PhaseContent) => void;
  urlPlaceholder?: string;
}) {
  // 바깥 카드(테두리·헤더·접힘)는 CollapsibleSection 이 맡는다. 여기선 안내 문구와 입력칸만.
  return (
    <>
      <p className="text-xs text-muted">{hint}</p>

      <input
        value={value.heading}
        onChange={(event) => onChange({ ...value, heading: event.target.value })}
        placeholder={`화면 제목 (비우면 "${label}")`}
        className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
      />
      <textarea
        value={value.body}
        onChange={(event) => onChange({ ...value, body: event.target.value })}
        rows={3}
        placeholder="학생 화면에 보여줄 안내 문구"
        className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
      />
      <input
        value={value.url}
        onChange={(event) => onChange({ ...value, url: event.target.value })}
        placeholder={urlPlaceholder}
        className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
      />
    </>
  );
}

/** 시간표를 쓰지 않고 수업 하나만 급히 열 때 (1차시처럼 첫날 바로 쓰는 경우) */
function QuickSession({ plans }: { plans: Plan[] }) {
  const [picked, setPicked] = useState("");
  const [classNo, setClassNo] = useState(1);
  const [groupKey, setGroupKey] = useState("");
  const [date, setDate] = useState(todayKST());
  const [period, setPeriod] = useState(1);
  const [message, setMessage] = useState("");
  // 과목을 먼저 고르고, 그 과목 차시만 드롭다운에 세운다 (3탭과 같은 courseOf 분류).
  const [course, setCourse] = useRememberedCourse();

  // 과목을 바꾸면 고른 차시를 비운다 — 엉뚱한 과목 차시가 남지 않게. 새 과목의 첫 차시로 돌아간다.
  function chooseCourse(next: CourseKey) {
    setCourse(next);
    setPicked("");
  }

  // 고르지 않았으면 그 과목의 첫 차시를 쓴다. 기본값을 effect로 채우면 연쇄 렌더가 생긴다.
  const coursePlans = plans.filter((p) => planCourse(p) === course);
  const lessonPlanId = picked || coursePlans[0]?.id || "";
  const plan = plans.find((p) => p.id === lessonPlanId);

  async function create() {
    setMessage("");
    const response = await fetch("/api/teacher/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonPlanId,
        classNo,
        groupKey: plan?.groups?.length ? groupKey || plan.groups[0].key : undefined,
        date,
        period,
      }),
    });
    const result = await response.json();
    setMessage(
      result.ok
        ? `수업을 만들었습니다. 수업 코드: ${result.session.code}`
        : (result.message ?? "만들지 못했습니다."),
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
      <h2 className="text-lg font-semibold">수업 하나만 바로 열기</h2>
      <p className="text-sm text-muted">
        시간표 일괄 생성 전에 한 차시만 급히 열 때 씁니다. 등록하면 수업 코드가 바로 발급됩니다.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">과목</span>
          <select
            value={course}
            onChange={(event) => chooseCourse(event.target.value as CourseKey)}
            className="rounded-lg border border-line bg-background px-3 py-2"
          >
            {LESSON_TABS.map((key) => (
              <option key={key} value={key}>
                {COURSES[key].label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">차시</span>
          <select
            value={lessonPlanId}
            onChange={(event) => setPicked(event.target.value)}
            disabled={coursePlans.length === 0}
            className="rounded-lg border border-line bg-background px-3 py-2 disabled:opacity-40"
          >
            {coursePlans.length === 0 && <option value="">등록된 차시 없음</option>}
            {coursePlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.lessonNo}차시 {plan.title}
              </option>
            ))}
          </select>
        </label>
        <GroupPicker
          plan={plan}
          classNo={classNo}
          groupKey={groupKey}
          onClassNo={setClassNo}
          onGroupKey={setGroupKey}
        />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">날짜</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-lg border border-line bg-background px-3 py-2"
          />
        </label>
        {/*
          교시는 고르게 한다.

          숫자 칸으로 두면 다 지웠을 때 빈 문자열이 0 이 되어 "0" 이 남고, 이어서
          치면 "02" 가 된다. 0 을 지울 방법이 없다 — 지우는 순간 다시 0 이 된다.

          교시는 1~8 뿐이라 애초에 칠 일이 없다. 고르게 하면 이 문제도, 범위를 벗어난
          값도 함께 사라지고 태블릿에서 더 빠르다.
        */}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">교시</span>
          <select
            value={period}
            onChange={(event) => setPeriod(Number(event.target.value))}
            className="rounded-lg border border-line bg-background px-3 py-2"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n}교시
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={create}
        disabled={!lessonPlanId}
        className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        수업 만들기
      </button>

      {message && <p className="text-sm">{message}</p>}
    </section>
  );
}
