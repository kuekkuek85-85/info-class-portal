"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 프로젝터·강사 노트북·참가자 휴대폰이 같은 슬라이드를 보게 맞춘다.
 *
 * ## 왜 서버를 거치는가
 *
 * 처음에는 노트북 한 대에서만 도는 화면이라 브라우저 메모리로 충분했다. 참가자가
 * 휴대폰으로 들어와 함께 넘어가게 되면서 **기기를 넘나드는 상태**가 됐고, 그건 서버를
 * 거칠 수밖에 없다. 학교 포털이 이미 쓰는 방식 그대로다 — 교사가 단계를 바꾸면
 * 학생 화면이 폴링으로 따라온다.
 *
 * ## 넘기는 쪽과 따라오는 쪽
 *
 * 진행자 화면(프로젝터·강사)은 **넘기고 나서 바로 자기 화면을 바꾼다.** 서버 응답을
 * 기다렸다 바꾸면 방향키를 눌렀는데 반 박자 늦게 넘어가고, 진행자는 안 눌렸다고 생각해
 * 한 번 더 누른다 — 두 장이 넘어간다.
 *
 * 따라오는 쪽(휴대폰)은 폴링만 한다. 화면을 스스로 넘기지 않는다.
 */

export interface LiveState {
  slide: number;
  revealed: string[];
  /** 현장에서 쳐 넣는 수상자 이름. 참가자 휴대폰에도 같이 떠야 한다 */
  names: { champion: string; grit: string };
}

const EMPTY: LiveState = { slide: 0, revealed: [], names: { champion: "", grit: "" } };

function readState(result: Record<string, unknown>): LiveState {
  return {
    slide: Number(result.slide) || 0,
    revealed: Array.isArray(result.revealed) ? (result.revealed as string[]) : [],
    names: {
      champion: String((result.names as LiveState["names"])?.champion ?? ""),
      grit: String((result.names as LiveState["names"])?.grit ?? ""),
    },
  };
}

/** 두 상태가 같은가 — 매번 새 객체를 넣으면 화면이 쉼 없이 다시 그려진다 */
function same(a: LiveState, b: LiveState): boolean {
  return (
    a.slide === b.slide &&
    a.revealed.join() === b.revealed.join() &&
    a.names.champion === b.names.champion &&
    a.names.grit === b.names.grit
  );
}

const POLL_MS = 2000;

/**
 * 따라오기 전용. 서버가 말하는 슬라이드를 그대로 보여준다.
 *
 * 창이 뒤에 있을 때는 묻지 않는다. 주머니 속 휴대폰 열두 대가 계속 물으면 읽기만
 * 쌓이고, 다시 꺼내 보는 순간 한 번 물어서 따라잡으면 그만이다.
 */
export function useFollower(): LiveState | null {
  const [state, setState] = useState<LiveState | null>(null);

  useEffect(() => {
    let alive = true;

    /*
     * force 는 첫 조회에만 준다.
     *
     * 뒤에 있는 창은 묻지 않는 것이 맞지만, 그 규칙을 첫 조회에까지 걸면 화면이 열릴 때
     * 뒤에 있었다는 이유로 "들어가는 중…" 에서 멈춘다. 한 번은 반드시 받아 온다.
     */
    async function pull(force = false) {
      if (!force && document.hidden) return;
      try {
        const response = await fetch("/api/sendev/live", { cache: "no-store" });
        const result = await response.json();
        if (alive && result.ok) {
          const next = readState(result);
          setState((prev) => (prev && same(prev, next) ? prev : next));
        }
      } catch {
        // 잠깐 끊긴 것뿐이다. 다음 차례에 다시 묻는다
      }
    }

    void pull(true);
    const id = setInterval(() => void pull(), POLL_MS);
    // 화면을 다시 켜면 기다리지 않고 바로 따라잡는다
    const wake = () => void pull();
    document.addEventListener("visibilitychange", wake);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  return state;
}

/**
 * 넘기는 쪽. 자기 화면을 먼저 바꾸고 서버에 알린다.
 *
 * 다른 진행자 화면(프로젝터와 강사 노트북)도 서로 따라와야 하므로 폴링도 함께 한다.
 * 다만 **방금 내가 넘긴 직후에는 서버 값을 무시한다** — 캐시가 도는 1.5초 사이에
 * 옛 슬라이드가 돌아와 화면이 튀는 것을 막는다.
 */
export function useDriver(code: string, total: number) {
  const [state, setState] = useState<LiveState>(EMPTY);
  const mineUntil = useRef(0);

  const push = useCallback(
    (next: LiveState) => {
      setState(next);
      mineUntil.current = Date.now() + 2500;
      void fetch("/api/sendev/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, ...next }),
      }).catch(() => undefined);
    },
    [code],
  );

  useEffect(() => {
    let alive = true;

    async function pull() {
      if (document.hidden || Date.now() < mineUntil.current) return;
      try {
        const response = await fetch("/api/sendev/live", { cache: "no-store" });
        const result = await response.json();
        if (!alive || !result.ok) return;
        const next = readState(result);
        setState((prev) => (same(prev, next) ? prev : next));
      } catch {
        // 무시. 다음 차례에 다시 묻는다
      }
    }

    void pull();
    const id = setInterval(pull, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const go = useCallback(
    (step: number) => {
      const slide = Math.min(total - 1, Math.max(0, state.slide + step));
      if (slide === state.slide) return;
      // 슬라이드를 옮기면 열어 둔 것은 접는다 — 되돌아왔을 때 정답이 미리 보이면 안 된다
      push({ ...state, slide, revealed: [] });
    },
    [push, state, total],
  );

  const jump = useCallback(
    (slide: number) => push({ ...state, slide, revealed: [] }),
    [push, state],
  );

  /**
   * 열기 / 닫기.
   *
   * 정답 공개는 한 번 열면 단추가 사라지니 사실상 여는 것뿐이다. 발표 자료처럼 **닫아야
   * 하는 것**이 생기면서 같은 열쇠를 다시 눌러 접을 수 있어야 했다.
   */
  const reveal = useCallback(
    (key: string) => {
      const revealed = state.revealed.includes(key)
        ? state.revealed.filter((k) => k !== key)
        : [...state.revealed, key];
      push({ ...state, revealed });
    },
    [push, state],
  );

  const setNames = useCallback(
    (names: LiveState["names"]) => push({ ...state, names }),
    [push, state],
  );

  return { state, go, jump, reveal, setNames };
}
