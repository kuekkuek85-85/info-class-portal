"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 진도 체크 팝업 (도우미 선발 속도 체크).
 *
 * 수업 시작 기준 정해진 분(minutes)에 학생 화면에 모달을 띄워 "지금 어느 단계 몇 번째
 * 미션인지" 기록하게 한다. **자립형**이다 — 자기 상태를 `/api/student/progress-check` 에서
 * 직접 받아 오고, 수업 페이지의 상태에 얹히지 않는다. progressChecks 가 없는 차시에서는
 * 아무것도 그리지 않는다(GET 이 config 를 null 로 준다).
 *
 * ## 언제 뜨나
 *
 * 수업이 active 이고 시작 시각(startedAt)이 있을 때, **지나간 마크 중 아직 답 안 한 것**이
 * 있으면 뜬다. 늦게 들어와 여러 마크를 지난 학생에게는 **가장 최근 미답 마크 하나만**
 * 물어(과거 마크 폭탄 방지) 답하면 닫힌다. 이미 답한 마크는 다시 안 뜬다.
 *
 * 시작 전(startedAt 0)에는 주기적으로 상태만 다시 확인하고, 시작되면 로컬 타이머로
 * 마크 시각을 잰다 — 매초 서버를 부르지 않는다.
 */

interface CheckState {
  active: boolean;
  startedAt: number;
  progressChecks: { minutes: number[]; stages: string[] } | null;
  answered: number[];
}

/** 상태 재확인 주기 (시작 전·마크 반영). 학생당 이 주기로만 서버를 부른다 */
const SYNC_MS = 20_000;
/** 로컬로 마크 시각을 재검사하는 주기 (서버 호출 없음) */
const TICK_MS = 10_000;

export function ProgressCheckModal() {
  const [state, setState] = useState<CheckState | null>(null);
  const [due, setDue] = useState<number | null>(null);
  const [stage, setStage] = useState("");
  const [mission, setMission] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dueRef = useRef<number | null>(null);

  const sync = useCallback(async () => {
    try {
      const response = await fetch("/api/student/progress-check", { cache: "no-store" });
      const result = await response.json();
      if (result?.ok) {
        setState({
          active: Boolean(result.active),
          startedAt: Number(result.startedAt) || 0,
          progressChecks: result.progressChecks ?? null,
          answered: Array.isArray(result.answered) ? result.answered.map(Number) : [],
        });
      }
    } catch {
      /* 조용히 넘어간다 — 다음 주기에 다시 시도 */
    }
  }, []);

  // 상태를 주기적으로 확인한다 (시작 전에는 이 확인이 곧 "시작됐나" 폴링이다).
  // 첫 호출은 setTimeout(0) 으로 미뤄 이펙트 본문에서 동기 setState 를 하지 않는다.
  useEffect(() => {
    const first = setTimeout(() => void sync(), 0);
    const id = setInterval(() => void sync(), SYNC_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [sync]);

  // 로컬 타이머로 "지금 물어야 할 마크"를 정한다 (서버 호출 없음)
  useEffect(() => {
    function computeDue() {
      const s = state;
      if (!s || !s.active || !s.progressChecks || s.startedAt <= 0) {
        if (dueRef.current !== null) {
          dueRef.current = null;
          setDue(null);
        }
        return;
      }
      const elapsedMin = (Date.now() - s.startedAt) / 60000;
      const answered = new Set(s.answered);
      const dueMarks = s.progressChecks.minutes.filter((m) => elapsedMin >= m && !answered.has(m));
      // 여러 개면 가장 최근(가장 큰) 마크 하나만 — 과거 마크 폭탄 방지
      const next = dueMarks.length > 0 ? Math.max(...dueMarks) : null;
      if (next !== dueRef.current) {
        dueRef.current = next;
        setDue(next);
        // 새 마크를 물을 때만 입력을 비운다 (같은 마크 유지 중엔 타이핑을 지우지 않음)
        if (next !== null) {
          setStage("");
          setMission("");
          setError("");
        }
      }
    }
    computeDue();
    const id = setInterval(computeDue, TICK_MS);
    return () => clearInterval(id);
  }, [state]);

  const config = state?.progressChecks ?? null;
  if (due === null || !config) return null;
  // 물어야 할 마크(0 이상 정수). 아래 닫힘 콜백들이 number 로 확실히 쓰게 잡아 둔다
  const activeMark: number = due;

  async function submit() {
    if (busy) return;
    if (!stage) {
      setError("먼저 어느 미로인지 골라 주세요.");
      return;
    }
    const missionNum = Number(mission);
    if (!Number.isInteger(missionNum) || missionNum < 1 || missionNum > 99) {
      setError("몇 번째 미션인지 숫자로 적어 주세요 (1~99).");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/student/progress-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ minute: activeMark, stage, mission: missionNum }),
      });
      const result = await response.json();
      if (!result?.ok) {
        setError(result?.message ?? "저장하지 못했어요. 다시 눌러 주세요.");
        return;
      }
      // 답한 마크를 로컬 상태에 반영 → 이 마크는 다시 안 뜬다
      setState((prev) =>
        prev ? { ...prev, answered: [...new Set([...prev.answered, activeMark])] } : prev,
      );
      dueRef.current = null;
      setDue(null);
      setStage("");
      setMission("");
    } catch {
      setError("저장하지 못했어요. 다시 눌러 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border-2 border-ink bg-canvas p-5 shadow-xl">
        <div className="flex flex-col gap-1">
          <p className="t-headline">지금 어디까지 했나요?</p>
          <p className="t-body-sm text-muted">
            잠깐만요! 지금 풀고 있는 미로와 몇 번째 미션까지 했는지 알려 주세요. (수업 시작 후
            {" "}
            {due}분 기록)
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="t-eyebrow">어느 미로인가요?</p>
          <div className="flex flex-col gap-2">
            {config.stages.map((label) => {
              const on = stage === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStage(label)}
                  aria-pressed={on}
                  className={`rounded-lg border-2 px-4 py-3 text-left t-body-sm transition active:scale-[0.99] ${
                    on ? "border-ink bg-ink text-canvas" : "border-line bg-canvas"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="t-eyebrow">몇 번째 미션까지 했나요?</span>
          <input
            value={mission}
            onChange={(event) => setMission(event.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
            inputMode="numeric"
            placeholder="예) 7  (1~12)"
            className="field"
          />
        </label>

        {error && <p className="t-body-sm rounded-md bg-pink px-3 py-2">{error}</p>}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="pill pill-primary pill-block"
        >
          {busy ? "보내는 중…" : "기록하고 계속하기"}
        </button>
      </div>
    </div>
  );
}
