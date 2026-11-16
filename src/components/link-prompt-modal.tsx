"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * "앱 게시 링크 제출" 팝업 (「인간과 인공지능」 동료 검토 차시).
 *
 * 지난 차시에 앱 링크를 못 냈거나, 낸 링크가 죽어서 열리지 않는 학생이 있다. 그 학생은
 * 동료 검토 풀에서 빠지고 pickAppUrl 도 열 링크가 없다. 그래서 **교사가 콕 집은 학번**으로
 * 로그인한 학생에게만, 접속 직후 이 모달을 띄워 게시 링크를 받는다. 제출하면 그 학생 작품의
 * build_url 로 저장된다(기존 /api/student/artifact 경로 재사용 — normalizeUrl 자동 적용).
 *
 * ## 엄격한 게이트 (다른 수업·학생에 영향 0)
 *
 * `promptIds` 에 지금 로그인한 `studentId` 가 들어 있을 때만 무엇이든 그린다. 목록이 없거나
 * (대부분의 세션) 학번이 목록에 없으면 **아무것도 렌더하지 않고, 조회도 하지 않는다.**
 * 마음 체크인 등 기존 관문과 겹치지 않는다 — 이 모달은 자기 상태만 보고 독립적으로 뜬다.
 *
 * ## 다시 안 뜨게
 *
 * 제출에 성공하면 이 세션 동안 다시 안 뜬다(sessionStorage 로 새로고침에도 유지). 가두지
 * 않으려고 작은 [X]·[나중에] 로 닫을 수 있고(세션 저장 안 함), 교사가 목록에 다시 넣거나
 * 학생이 새로고침하면 또 뜬다.
 */

interface Props {
  sessionId: string;
  studentId: string;
  promptIds?: string[];
}

export function LinkPromptModal({ sessionId, studentId, promptIds }: Props) {
  // 이 학번이 대상인가. 대상이 아니면 아래 훅은 전부 빈손으로 돈다(조회·렌더 0).
  const targeted = Array.isArray(promptIds) && promptIds.includes(studentId);

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // 기존 링크가 있으면(죽은 링크 재제출) 안내 문구가 달라진다. null=아직 안 읽음
  const [hadLink, setHadLink] = useState<boolean | null>(null);
  const startedRef = useRef(false);

  const doneKey = `linkPrompt:${sessionId}:${studentId}`;

  // 접속 직후 한 번: 이미 제출했는지(sessionStorage) 보고, 아니면 현재 build_url 을 읽어
  // 안내 문구를 정한 뒤 모달을 연다. 대상이 아니면 아무 요청도 하지 않는다.
  useEffect(() => {
    if (!targeted || startedRef.current) return;
    startedRef.current = true;

    try {
      if (sessionStorage.getItem(doneKey) === "done") return;
    } catch {
      /* 프라이빗 모드 등 — 저장소가 막혀도 모달은 떠야 한다 */
    }

    let alive = true;
    (async () => {
      let existing = "";
      try {
        const res = await fetch("/api/student/artifact", { cache: "no-store" });
        const result = await res.json();
        existing = String(result?.artifact?.answers?.build_url ?? "").trim();
      } catch {
        /* 조회 실패해도 모달은 띄운다 — 문구만 기본값(처음 제출)으로 */
      }
      if (!alive) return;
      setHadLink(existing.length > 0);
      setValue(existing);
      setOpen(true);
    })();

    return () => {
      alive = false;
    };
  }, [targeted, doneKey]);

  const dismiss = useCallback(() => {
    // 닫기만. 세션 저장 안 함 — 새로고침하거나 교사가 다시 넣으면 또 뜬다.
    setOpen(false);
  }, []);

  async function submit() {
    if (busy) return;
    const trimmed = value.trim();
    if (!trimmed) {
      setError("링크를 붙여넣어 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      // 기존 학생 저장 경로 재사용. 서버가 build_url 에 normalizeUrl 을 적용해 저장한다.
      // 학번·이름을 본문에 싣지 않는다 — 세션 쿠키로 서버가 본인을 안다(외부 전송 없음).
      const res = await fetch("/api/student/artifact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers: { build_url: trimmed } }),
      });
      const result = await res.json();
      if (!result?.ok) {
        setError(result?.message ?? "저장하지 못했어요. 다시 눌러 주세요.");
        return;
      }
      try {
        sessionStorage.setItem(doneKey, "done");
      } catch {
        /* 저장소가 막혀도 제출은 됐다 — 이 세션 재노출만 못 막을 뿐 */
      }
      setOpen(false);
    } catch {
      setError("저장하지 못했어요. 다시 눌러 주세요.");
    } finally {
      setBusy(false);
    }
  }

  // 엄격한 게이트: 대상이 아니거나 아직/이미 닫혔으면 아무것도 안 그린다.
  if (!targeted || !open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex w-full max-w-md flex-col gap-4 rounded-xl border-2 border-ink bg-canvas p-5 shadow-xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label="닫기"
          className="absolute right-3 top-3 rounded-full border border-line px-2 py-0.5 t-body-sm text-muted active:scale-[0.99]"
        >
          ✕
        </button>

        <div className="flex flex-col gap-1 pr-6">
          <p className="t-headline">앱 게시 링크를 제출해 주세요</p>
          <p className="t-body-sm text-muted">
            {hadLink
              ? "링크가 열리지 않아요. 캔바에서 다시 '게시(공유)'한 주소를 붙여넣어 주세요."
              : "친구들이 볼 수 있게, 캔바에서 '게시'한 앱 주소를 붙여넣어 주세요."}
          </p>
        </div>

        <label className="flex flex-col gap-1">
          <span className="t-eyebrow">앱 게시 링크</span>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={300}
            inputMode="url"
            placeholder="예: https://○○○.my.canva.site/..."
            className="field"
          />
        </label>

        {error && <p className="t-body-sm rounded-md bg-pink px-3 py-2">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="pill flex-1"
          >
            나중에
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="pill pill-primary flex-[2]"
          >
            {busy ? "내는 중…" : "제출"}
          </button>
        </div>
      </div>
    </div>
  );
}
