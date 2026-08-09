"use client";

import { useState } from "react";

import { TeacherShell } from "@/components/teacher-shell";
import { todayKST } from "@/lib/datetime";
import { usePolled } from "@/lib/use-polled";

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
  slideUrl: string;
  reflectionQuestion: string;
  moodCheckEnabled: boolean;
  reflectionPublic: boolean;
}

const EMPTY: Omit<Plan, "id"> = {
  lessonNo: 1,
  title: "",
  slideUrl: "",
  reflectionQuestion: "",
  moodCheckEnabled: true,
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
  const [draft, setDraft] = useState<Omit<Plan, "id"> & { id?: string }>(EMPTY);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, reload } = usePolled<{ plans: Plan[] }>("/api/teacher/lessons");
  const plans = data?.plans ?? [];

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

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">{draft.id ? "차시 수정" : "차시 등록"}</h1>

        <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">차시 번호</span>
            <input
              type="number"
              min={1}
              value={draft.lessonNo}
              onChange={(event) => setDraft({ ...draft, lessonNo: Number(event.target.value) })}
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

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">슬라이드 URL (비워두면 교사 화면 투사로 대체)</span>
          <input
            value={draft.slideUrl}
            onChange={(event) => setDraft({ ...draft, slideUrl: event.target.value })}
            placeholder="https://..."
            className="rounded-lg border border-line bg-card px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">성찰 질문</span>
          <textarea
            value={draft.reflectionQuestion}
            onChange={(event) => setDraft({ ...draft, reflectionQuestion: event.target.value })}
            rows={3}
            placeholder="예) 영상에서 AI가 아직 못 한다고 한 것 중 하나를 고르고, 왜 어려울지 내 생각 쓰기"
            className="rounded-lg border border-line bg-card px-3 py-2"
          />
        </label>

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
        <ul className="flex flex-col gap-2">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {plan.lessonNo}차시 · {plan.title}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">
                  {plan.reflectionQuestion || "성찰 질문 없음"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {plan.moodCheckEnabled ? "감정 체크 O" : "감정 체크 X"} ·{" "}
                  {plan.reflectionPublic ? "성찰 공개" : "성찰 비공개"} ·{" "}
                  {plan.slideUrl ? "슬라이드 있음" : "슬라이드 없음"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(plan)}
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

      <QuickSession plans={plans} />
    </div>
  );
}

/** 시간표를 쓰지 않고 수업 하나만 급히 열 때 (1차시처럼 첫날 바로 쓰는 경우) */
function QuickSession({ plans }: { plans: Plan[] }) {
  const [picked, setPicked] = useState("");
  const [classNo, setClassNo] = useState(1);
  const [date, setDate] = useState(todayKST());
  const [period, setPeriod] = useState(1);
  const [message, setMessage] = useState("");

  // 고르지 않았으면 첫 차시를 쓴다. 기본값을 effect로 채우면 연쇄 렌더가 생긴다.
  const lessonPlanId = picked || plans[0]?.id || "";

  async function create() {
    setMessage("");
    const response = await fetch("/api/teacher/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonPlanId, classNo, date, period }),
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

      <div className="grid gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">차시</span>
          <select
            value={lessonPlanId}
            onChange={(event) => setPicked(event.target.value)}
            className="rounded-lg border border-line bg-background px-3 py-2"
          >
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.lessonNo}차시 {plan.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">반</span>
          <select
            value={classNo}
            onChange={(event) => setClassNo(Number(event.target.value))}
            className="rounded-lg border border-line bg-background px-3 py-2"
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}반
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">날짜</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-lg border border-line bg-background px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">교시</span>
          <input
            type="number"
            min={1}
            max={8}
            value={period}
            onChange={(event) => setPeriod(Number(event.target.value))}
            className="rounded-lg border border-line bg-background px-3 py-2"
          />
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
