"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * "내 앱 소개 최종 수정" 팝업.
 *
 * 차시를 지나며 기획이 바뀌어, 동료 검토 카드에 뜨는 소개 문구가 지금 생각과 다른 학생이
 * 많다. 검토를 시작할 때(서버가 phase 로 게이팅), 자기 소개 칸을 **프리필한 편집 모달**로
 * 띄운다. 고치거나 그대로 두고 [제출] 하면 그 값이 곧 검토 카드에 반영된다.
 *
 * **자립형**이다 — 자기 상태를 `/api/student/review-desc` 에서 직접 받아 오고, 수업 페이지의
 * 상태에 얹히지 않는다. reviewDescribe 가 없는 차시에서는 GET 이 enabled=false 를 주어
 * 아무것도 그리지 않는다.
 *
 * ## 언제 뜨나
 *
 * enabled && active(검토 시점) && 아직 제출 안 함 이면 편집 모달이 자동으로 한 번 뜬다.
 * 제출하면 닫히고, 화면 구석에 작은 [내 앱 소개 고치기] 버튼을 남긴다 — 늦게 고치는
 * 학생이 눌러 다시 편집·재제출할 수 있다(재제출도 같은 키 덮어쓰기). 검토 시점이 아니면
 * (phase 밖) 아무것도 안 뜬다.
 */

interface Field {
  key: string;
  label: string;
  value: string;
  maxLength: number;
  multiline: boolean;
}

interface DescState {
  enabled: boolean;
  active: boolean;
  submitted: boolean;
  fields: Field[];
}

/** 상태 재확인 주기. 검토 시점(phase) 도래와 다른 기기 제출 반영을 위해 이 주기로만 부른다 */
const SYNC_MS = 15_000;

export function ReviewDescModal() {
  const [state, setState] = useState<DescState | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // 자동 열기·제출을 한 번씩만 반영하기 위한 표시 (렌더 없이 판단만)
  const openedRef = useRef(false);
  const submittedRef = useRef(false);

  const sync = useCallback(async () => {
    try {
      const response = await fetch("/api/student/review-desc", { cache: "no-store" });
      const result = await response.json();
      if (result?.ok) {
        setState({
          enabled: Boolean(result.enabled),
          active: Boolean(result.active),
          submitted: Boolean(result.submitted),
          fields: Array.isArray(result.fields) ? (result.fields as Field[]) : [],
        });
      }
    } catch {
      /* 조용히 넘어간다 — 다음 주기에 다시 시도 */
    }
  }, []);

  // 상태를 주기적으로 확인한다. 첫 호출은 setTimeout(0) 으로 미뤄 이펙트 본문에서
  // 동기 setState 를 하지 않는다 (progress-check-modal 과 같은 패턴).
  useEffect(() => {
    const first = setTimeout(() => void sync(), 0);
    const id = setInterval(() => void sync(), SYNC_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [sync]);

  // 상태가 오면 자동 열기/제출 여부를 정한다. 표시 ref 로 각각 한 번씩만 반영해 연쇄를 막는다.
  useEffect(() => {
    if (!state || !state.enabled) return;

    // 서버가 이미 제출됐다고 하면 (다른 기기·새로고침) 로컬도 제출로 본다
    if (state.submitted && !submittedRef.current) {
      submittedRef.current = true;
      setSubmitted(true);
      setOpen(false);
      return;
    }

    // 아직 제출 전 · 검토 시점(active)이면 프리필해 한 번 자동으로 연다
    if (state.active && !state.submitted && !submittedRef.current && !openedRef.current) {
      openedRef.current = true;
      setValues(Object.fromEntries(state.fields.map((field) => [field.key, field.value])));
      setOpen(true);
    }
  }, [state]);

  const setField = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reopen = useCallback(() => {
    // 최신 저장본을 프리필해서 다시 연다 (늦은 수정 흐름)
    if (state) setValues(Object.fromEntries(state.fields.map((field) => [field.key, field.value])));
    setError("");
    setOpen(true);
  }, [state]);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/student/review-desc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers: values }),
      });
      const result = await response.json();
      if (!result?.ok) {
        setError(result?.message ?? "저장하지 못했어요. 다시 눌러 주세요.");
        return;
      }
      submittedRef.current = true;
      setSubmitted(true);
      setOpen(false);
      // 저장본을 다시 읽어 온다 — 다음 프리필과 검토 카드가 최신값을 쓰게
      void sync();
    } catch {
      setError("저장하지 못했어요. 다시 눌러 주세요.");
    } finally {
      setBusy(false);
    }
  }

  // 팝업을 켜지 않은 차시거나 검토 시점이 아니면 아무것도 안 그린다
  if (!state || !state.enabled || !state.active) return null;

  // 제출한 뒤엔 구석에 작은 [고치기] 버튼만 남긴다 (늦은 수정용)
  if (!open) {
    if (!submitted) return null;
    return (
      <button
        type="button"
        onClick={reopen}
        className="fixed bottom-4 right-4 z-40 rounded-full border-2 border-ink bg-canvas px-4 py-2 t-body-sm shadow-lg active:scale-[0.99]"
      >
        내 앱 소개 고치기
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-xl border-2 border-ink bg-canvas p-5 shadow-xl">
        <div className="flex flex-col gap-1">
          <p className="t-headline">내 앱 소개, 지금 고칠 수 있어요</p>
          <p className="t-body-sm text-muted">
            다른 친구들이 볼 내 앱 소개예요. 바뀐 게 있으면 지금 고쳐서 내면 검토에 반영돼요.
            그대로 두어도 괜찮아요.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {state.fields.map((field) => (
            <label key={field.key} className="flex flex-col gap-1">
              <span className="t-eyebrow">{field.label}</span>
              {field.multiline ? (
                <textarea
                  value={values[field.key] ?? ""}
                  onChange={(event) => setField(field.key, event.target.value)}
                  maxLength={field.maxLength}
                  rows={2}
                  className="field"
                />
              ) : (
                <input
                  value={values[field.key] ?? ""}
                  onChange={(event) => setField(field.key, event.target.value)}
                  maxLength={field.maxLength}
                  className="field"
                />
              )}
            </label>
          ))}
        </div>

        {error && <p className="t-body-sm rounded-md bg-pink px-3 py-2">{error}</p>}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="pill pill-primary pill-block"
        >
          {busy ? "내는 중…" : "이대로 내기"}
        </button>
      </div>
    </div>
  );
}
