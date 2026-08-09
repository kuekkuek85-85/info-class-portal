"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * API를 읽어오고, 필요하면 일정 간격으로 다시 읽는다.
 *
 * 교사 화면의 "실시간" 명단은 Firestore 구독이 아니라 이 폴링으로 만든다. 학생 브라우저가
 * Firestore에 직접 붙지 않는 구조를 유지하려면 교사 화면도 서버 API를 거쳐야 하고,
 * 한 반 28명 규모에서는 몇 초 간격 폴링으로 충분하다.
 *
 * setState는 모두 await 이후에만 일어난다 — effect 본문에서 동기적으로 상태를 바꾸면
 * 연쇄 렌더가 생긴다 (react-hooks/set-state-in-effect).
 */
export function usePolled<T>(url: string | null, intervalMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    async function tick(target: string) {
      try {
        const response = await fetch(target);
        const result = await response.json();
        if (cancelled) return;

        if (result.ok) {
          setData(result as T);
          setError("");
        } else {
          setError(result.message ?? "불러오지 못했습니다.");
        }
      } catch {
        if (!cancelled) setError("연결이 끊겼습니다. 잠시 뒤 다시 시도합니다.");
      }
    }

    void tick(url);

    if (!intervalMs) {
      return () => {
        cancelled = true;
      };
    }

    const timer = setInterval(() => void tick(url), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [url, intervalMs, reloadToken]);

  /** 쓰기 작업 뒤 즉시 다시 읽는다. 다음 폴링을 기다리지 않아도 되게. */
  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { data, error, reload };
}
