"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AWAY_MIN_MS, countsFocus, type LessonPhase } from "@/lib/types";

/**
 * 수업 화면을 벗어난 시간을 잰다.
 *
 * **어디로 갔는지는 알 수 없다.** 브라우저가 원천 차단한다. 알 수 있는 것은 "이 화면이
 * 보이지 않게 되었다"뿐이고, 그것이 인스타인지 화면 꺼짐인지 전화인지 구분되지 않는다.
 * 그래서 이 값은 징계·평가의 근거가 될 수 없고, 교사가 교실을 둘러볼 타이밍을 알려주는
 * 신호등으로만 쓴다.
 *
 * ## 이벤트를 그대로 보내지 않는다
 *
 * 이탈 시작~복귀를 **에피소드**로 묶어 복귀한 순간에만 한 번 보고한다. 세 가지 이유다.
 *  ① 이탈 "시작" 시점에는 보낼 수 없다 — 백그라운드로 가면 JS 실행이 중단·지연된다
 *  ② 요청 수가 에피소드 수와 같아져 쓰기량이 자연히 묶인다
 *  ③ 지속시간을 클라이언트가 확정해 보내므로 서버가 상태를 들고 있을 필요가 없다
 *
 * ## 시간은 performance.now() 로 잰다
 *
 * 학생 기기의 시계는 믿을 수 없고, 절전 중 타이머가 멈추는 기기도 있다. 단조 증가하는
 * 시계로 재고, 서버가 상한으로 한 번 더 깎는다.
 *
 * ## 탭을 닫아 버린 경우는 잡지 않는다
 *
 * 복귀 보고가 오지 않는다. sendBeacon 으로 마지막 발악을 할 수는 있지만 전송 보장이 없어
 * 데이터 신뢰도만 흐린다. **안 잡히는 케이스를 인정하는 편이 반쯤 잡히는 케이스를 만드는
 * 것보다 낫다.** 어차피 그 학생은 재입장하면서 인증부터 다시 하므로 교사 눈에 띈다.
 */

interface Episode {
  /** performance.now() 기준 시작 시각 */
  since: number;
  /** 완전히 숨겨졌던 적이 있는가 (탭·앱 전환). 아니면 포커스만 잃은 것 */
  hidden: boolean;
  /** 집계 제외 단계에 걸쳐 있었는가 — 걸쳐 있으면 통째로 버린다 */
  exempt: boolean;
}

export interface AwayNotice {
  ms: number;
  /** 배너를 다시 띄우기 위한 일련번호 (같은 길이로 두 번 나가도 새 배너가 뜬다) */
  seq: number;
}

export function useFocusTracker(
  phase: LessonPhase,
  enabled: boolean,
  /** 이 차시에서만 세지 않을 단계 (기본 제외에 더한다) */
  extraExempt: readonly LessonPhase[] = [],
): AwayNotice | null {
  const episode = useRef<Episode | null>(null);
  const phaseRef = useRef(phase);
  const exemptRef = useRef(extraExempt);
  const enabledRef = useRef(enabled);
  const seq = useRef(0);
  const [notice, setNotice] = useState<AwayNotice | null>(null);

  // 이벤트 처리기가 늘 최신 값을 보게 한다 (렌더 중에 ref 를 쓰면 안 된다)
  useEffect(() => {
    phaseRef.current = phase;
    enabledRef.current = enabled;
    exemptRef.current = extraExempt;
  }, [phase, enabled, extraExempt]);

  /*
   * 이탈 중에 교사가 영상 단계로 넘기면 그 에피소드는 버린다.
   *
   * 경계 사례에서는 **학생에게 유리하게** 처리한다는 원칙이다. 영상을 보라고 해 놓고
   * 태블릿을 안 봤다고 세는 것은 앞뒤가 맞지 않는다.
   */
  useEffect(() => {
    if (episode.current && !countsFocus(phase, exemptRef.current)) {
      episode.current.exempt = true;
    }
  }, [phase]);

  const report = useCallback((awayMs: number, kind: "hidden" | "blur-only") => {
    /*
     * keepalive 를 붙인다. 복귀 직후 학생이 곧바로 다시 나가 버리면 일반 요청은
     * 중간에 끊긴다.
     */
    void fetch("/api/student/focus-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ awayMs, kind }),
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    /*
     * **`document.hasFocus()` 로 복귀를 판정하지 않는다.**
     *
     * 화면이 멀쩡히 보이는데도 false 인 경우가 흔하다 — 주소창을 눌렀을 때, 화면 키보드가
     * 올라왔을 때, 창이 여러 개일 때. 그것을 이탈로 보면 학생이 화면을 보고 있는데도
     * 시계가 계속 돌아가고, 그 상태에서 벗어날 방법이 없다.
     *
     * 그래서 시작과 끝을 각각 분명한 사건으로만 판정한다.
     *   시작 — 화면이 숨겨짐(탭·앱 전환), 또는 포커스를 잃음(화면 분할 추정)
     *   끝  — 화면이 다시 보임, 포커스를 되찾음, 또는 학생이 화면을 건드림
     *
     * 마지막 "건드림"이 안전판이다. 돌아온 학생은 반드시 무언가를 누른다.
     */
    function start(hidden: boolean) {
      if (!enabledRef.current) return;

      if (episode.current) {
        // 포커스만 잃었다가 완전히 숨겨졌으면 "완전 이탈"로 올린다
        if (hidden) episode.current.hidden = true;
        return;
      }
      episode.current = {
        since: performance.now(),
        hidden,
        // 시작할 때 이미 제외 단계였으면 세지 않는다
        exempt: !countsFocus(phaseRef.current, exemptRef.current),
      };
    }

    function end() {
      const current = episode.current;
      if (!current) return;
      episode.current = null;

      if (current.exempt || !countsFocus(phaseRef.current, exemptRef.current)) return;

      const awayMs = Math.round(performance.now() - current.since);
      // 10초 미만은 알림 확인이나 실수 탭 전환이다. 서버에 아무것도 보내지 않는다.
      if (awayMs < AWAY_MIN_MS) return;

      report(awayMs, current.hidden ? "hidden" : "blur-only");
      seq.current += 1;
      setNotice({ ms: awayMs, seq: seq.current });
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") start(true);
      else end();
    }

    function onBlur() {
      // 숨겨지기 직전에도 blur 가 온다. 그때는 visibilitychange 가 곧 hidden 으로 올린다.
      if (document.visibilityState === "visible") start(false);
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", end);
    // 돌아온 학생은 반드시 화면을 건드린다 — 포커스 이벤트가 오지 않는 기기의 안전판
    window.addEventListener("pointerdown", end);
    window.addEventListener("keydown", end);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", end);
      window.removeEventListener("pointerdown", end);
      window.removeEventListener("keydown", end);
    };
  }, [report]);

  return notice;
}
