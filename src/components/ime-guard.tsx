"use client";

import { useEffect } from "react";

import { IME_RESTORE_WINDOW_MS, lostSegmentAt, shouldRestore } from "@/lib/ime-guard";

/**
 * 모든 입력칸에서 「탭 이탈 때 조합 중이던 한글이 사라지는」 일을 막는다 (33차 교사 발견).
 *
 * 입력칸마다 고치지 않고 문서 전체에 한 번 건다. 활동지 글칸·목록 칸·성찰·마음 체크인 등
 * 어느 차시의 어느 칸이든 같은 문제가 생기기 때문이다. 판정은 src/lib/ime-guard.ts.
 *
 * 되돌릴 때는 입력칸 값을 조합 중 마지막 값으로 다시 넣고 input 이벤트를 보낸다. 그러면
 * React 의 onChange 가 평소처럼 받아 상태·자동 저장까지 그 값으로 맞춰진다.
 */

type Field = HTMLInputElement | HTMLTextAreaElement;

interface Entry {
  /** 조합 중 마지막으로 본 값 (조합 중 글자 포함) */
  prev: string;
  composing: boolean;
  /** 조합이 시작된 시각 */
  startedAt: number;
  /** 조합이 끝난 시각 (끝나기 전이면 0) */
  endedAt: number;
}

const TEXT_TYPES = new Set(["text", "search", "url", "email", "tel", ""]);

function asField(target: EventTarget | null): Field | null {
  if (target instanceof HTMLTextAreaElement) return target;
  if (target instanceof HTMLInputElement && TEXT_TYPES.has(target.type)) return target;
  return null;
}

function restore(el: Field, prev: string, cur: string) {
  if (el.readOnly || el.disabled || !el.isConnected) return;
  const at = lostSegmentAt(prev, cur);
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  // React 가 값 변화를 알아채게 프로토타입 setter 로 넣는다 (el.value = 로 넣으면 onChange 가 안 온다)
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, prev);
  try {
    const caret = at + (prev.length - cur.length);
    el.setSelectionRange(caret, caret);
  } catch {
    /* 선택 범위를 못 정하는 칸이면 그냥 둔다 */
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export function ImeGuard() {
  useEffect(() => {
    const entries = new Map<Field, Entry>();
    let focusChangedAt = -Infinity;
    let deleteKeyAt = -Infinity;

    /** 조합이 끝난 칸을 본다. 되돌리거나, 탭 이탈을 잠깐 기다리거나, 잊는다 */
    function evaluate(el: Field, now: number) {
      const entry = entries.get(el);
      if (!entry || entry.composing || !entry.endedAt) return;
      const cur = el.value;
      if (shouldRestore({ prev: entry.prev, cur, startedAt: entry.startedAt, endedAt: entry.endedAt, focusChangedAt, deleteKeyAt })) {
        entries.delete(el);
        restore(el, entry.prev, cur);
        return;
      }
      // 줄어든 모양은 맞는데 아직 탭 이탈이 안 왔다 → 곧 올 수 있으니 잠깐 들고 있는다
      const waiting = lostSegmentAt(entry.prev, cur) >= 0 && now - entry.endedAt <= IME_RESTORE_WINDOW_MS;
      if (!waiting) entries.delete(el);
    }

    function onCompositionStart(event: Event) {
      const el = asField(event.target);
      if (el) entries.set(el, { prev: el.value, composing: true, startedAt: performance.now(), endedAt: 0 });
    }

    function onInput(event: Event) {
      const el = asField(event.target);
      if (!el) return;
      const entry = entries.get(el);
      if (!entry) return;
      if (entry.composing) {
        /*
         * 조합 글자가 비워지는 input(취소)은 prev 에 적지 않는다 - 그게 지켜야 할 값을 지운다.
         * 조합 중 글자 바꿈(「닭」→「달」)은 data 가 있어 그대로 적힌다.
         */
        const data = (event as InputEvent).data;
        const emptied = !data && el.value.length < entry.prev.length;
        if (!emptied) entry.prev = el.value;
        return;
      }
      // 조합이 끝난 뒤 따라온 input (취소가 이 이벤트로 오는 브라우저도 있다)
      evaluate(el, performance.now());
    }

    function onCompositionEnd(event: Event) {
      const el = asField(event.target);
      if (!el) return;
      const entry = entries.get(el);
      if (!entry) return;
      entry.composing = false;
      entry.endedAt = performance.now();
      // 같은 틱에 따라오는 input 이 값을 마저 고친 뒤에 본다
      setTimeout(() => evaluate(el, performance.now()), 0);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Backspace" || event.key === "Delete" || event.key === "Escape") {
        deleteKeyAt = performance.now();
      }
    }

    /** 탭 이탈·복귀. 조합이 끝나 기다리던 칸을 다시 본다 */
    function onFocusChange() {
      const now = performance.now();
      focusChangedAt = now;
      for (const [el, entry] of entries) {
        if (!entry.composing) evaluate(el, now);
      }
    }

    document.addEventListener("compositionstart", onCompositionStart, true);
    document.addEventListener("compositionend", onCompositionEnd, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("visibilitychange", onFocusChange);
    window.addEventListener("blur", onFocusChange);
    window.addEventListener("focus", onFocusChange);
    return () => {
      document.removeEventListener("compositionstart", onCompositionStart, true);
      document.removeEventListener("compositionend", onCompositionEnd, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("visibilitychange", onFocusChange);
      window.removeEventListener("blur", onFocusChange);
      window.removeEventListener("focus", onFocusChange);
    };
  }, []);

  return null;
}
