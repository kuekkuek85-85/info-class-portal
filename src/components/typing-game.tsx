"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * 파이썬 타자 게임 (12차 도우미 선발).
 *
 * 파이썬 키워드·코드 줄을 하나씩 정확·빠르게 입력한다. **정확도 + 속도**를 0~100 점수로
 * 내고, 최고점 한 줄만 onChange 로 남긴다(대시보드 리더보드가 이 값을 읽는다). 무엇을
 * 쳤는지·오타 내용은 저장하지 않는다 — 점수 한 줄뿐이다.
 *
 * ## 두 갈래 — 내장 게임 / 외부 앱 임베드
 *
 * `typingUrl` 이 있으면 그 **외부 타자게임 웹앱을 iframe 으로 얹고**, 그 앱이 끝날 때 보내는
 * 점수 메시지(`postMessage({ type: "typing-score", score })`)를 받아 최고점을 저장한다
 * (ScamSim 의 LoginScene postMessage 수신과 같은 방식). 없으면 아래 **내장 타자게임** 그대로다.
 * 저장 키(helper_typing)와 리더보드 계산은 어느 쪽이든 같다.
 *
 * ## 점수 공식 (근거를 코드로 남긴다)
 *
 *   score = round( 100 × (0.6 × 정확도 + 0.4 × 속도점수) )
 *
 *  · 정확도 = 정확히 맞힌 줄 수 / 전체 줄 수 (0~1)
 *  · 속도점수 = clamp(CPM / TARGET_CPM, 0, 1)
 *      - CPM(분당 글자수) = 친 목표 글자 총합 / (경과분)
 *      - TARGET_CPM = 150. 중1이 기호 섞인 코드를 또박또박 치는 현실 속도를 만점 기준으로
 *        잡았다(선생님이 조정 가능). 150 이상이면 속도점수 만점.
 *  · 정확도 가중을 더 크게(0.6) 둔다 — 코딩에서 "정확히" 가 "빨리" 보다 먼저다.
 *
 * 시작~끝 시간만 잰다(첫 줄 확인부터 마지막 줄 확인까지). 시작 전 멍하니 있는 시간은
 * 점수에 안 들어간다.
 */

/** 안 주면 쓰는 기본 목록 — 파이썬 키워드·짧은 코드 줄 (12차 문법 미니와 맞춤) */
const DEFAULT_PROMPTS = [
  "print",
  "for",
  "if",
  "range(5)",
  "name = 10",
  'print("Hello")',
  "for i in range(3):",
  "if x > 5:",
  "total = a + b",
  "print(name)",
];

/** 분당 글자수 만점 기준. 선생님이 반 수준에 맞춰 조정 */
const TARGET_CPM = 150;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function TypingGame({
  prompts,
  typingUrl,
  value,
  onChange,
  disabled,
}: {
  prompts?: string[];
  /** 있으면 외부 타자게임을 iframe 으로 얹고 점수 메시지를 받는다 */
  typingUrl?: string;
  /** 지난 최고점(문자열 숫자) */
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  // 외부 앱 주소가 있으면 임베드 판으로 간다 (내장 게임은 자리지기)
  if (typingUrl && typingUrl.trim()) {
    return (
      <EmbeddedTyping url={typingUrl.trim()} value={value} onChange={onChange} disabled={disabled} />
    );
  }

  return <BuiltInTyping prompts={prompts} value={value} onChange={onChange} disabled={disabled} />;
}

/**
 * 외부 타자게임 임베드.
 *
 * iframe 으로 외부 앱을 띄우고, 그 앱이 끝날 때 보내는 점수 메시지를 받아 최고점을
 * 저장한다. **외부에서 온 값이라 신뢰하지 않는다** — 형식이 맞는 `typing-score` 메시지의
 * score 만, 유한수인지 확인하고 0~100 정수로 clamp 해서 쓴다. 다른 타입·필드는 무시한다.
 * 주소의 오리진과 다른 곳에서 온 메시지도 버린다.
 *
 * sandbox 는 `allow-scripts allow-forms` 만 준다 — 점수 postMessage 에 same-origin 권한이
 * 필요 없다. 포털 CSP 가 `frame-src 'self' https:` 라 외부 https 임베드는 허용된다.
 */
function EmbeddedTyping({
  url,
  value,
  onChange,
  disabled,
}: {
  url: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const best = Number(value) || 0;
  const [received, setReceived] = useState<number | null>(null);

  const expectedOrigin = useMemo(() => {
    try {
      return new URL(url).origin;
    } catch {
      return "";
    }
  }, [url]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (disabled) return;
      // 오리진이 다르면 버린다 — 다른 iframe·창이 보낸 메시지를 받지 않는다
      if (expectedOrigin && event.origin !== expectedOrigin) return;
      const data = event.data as unknown;
      if (!data || typeof data !== "object") return;
      const msg = data as { type?: unknown; score?: unknown };
      if (msg.type !== "typing-score") return;
      const n = Number(msg.score);
      if (!Number.isFinite(n)) return;
      const score = Math.max(0, Math.min(100, Math.round(n)));
      setReceived(score);
      // 최고점만 올린다. best 는 클로저에 갇히지 않게 저장값에서 다시 읽는다
      if (score > (Number(value) || 0)) onChange(String(score));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [expectedOrigin, value, onChange, disabled]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-lg bg-cream p-3">
        <p className="t-body-lg font-bold">파이썬 타자 — 게임 안에서 도전!</p>
        <p className="t-body-sm">
          아래 타자게임에서 도전하세요. 게임이 끝나면 점수가 자동으로 이 화면에 저장돼요.
          여러 번 해서 최고점을 올릴 수 있어요. 이 점수는 도우미 순위의 30%예요.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border-2 border-ink">
        <iframe
          src={url}
          title="파이썬 타자게임"
          className="h-[520px] w-full"
          // 점수 메시지에는 same-origin 권한이 필요 없다 (allow-same-origin 을 주지 않는다)
          sandbox="allow-scripts allow-forms"
        />
      </div>

      {received !== null ? (
        <p className="t-body-sm rounded-lg bg-surface px-4 py-3">
          방금 점수 {received}점을 받았어요. 지금까지 최고점: {Math.max(best, received)} / 100.
        </p>
      ) : (
        best > 0 && <p className="t-caption">지금까지 최고점: {best} / 100</p>
      )}
    </div>
  );
}

/**
 * 내장 파이썬 타자게임 (외부 앱 URL 이 없을 때의 자리지기).
 *
 * 파이썬 낱말·코드 줄을 하나씩 정확·빠르게 입력한다. 점수 공식은 위 파일 주석 참조.
 */
function BuiltInTyping({
  prompts,
  value,
  onChange,
  disabled,
}: {
  prompts?: string[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const list = useMemo(
    () => (prompts && prompts.length > 0 ? prompts : DEFAULT_PROMPTS),
    [prompts],
  );

  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [correct, setCorrect] = useState(0);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const startedAt = useRef(0);
  const targetChars = useRef(0);

  const best = Number(value) || 0;
  const target = list[index] ?? "";

  function start() {
    if (disabled) return;
    setPhase("playing");
    setIndex(0);
    setTyped("");
    setCorrect(0);
    startedAt.current = 0;
    targetChars.current = 0;
  }

  function confirmLine() {
    if (disabled || phase !== "playing") return;
    // 타이머는 첫 확인부터 — 시작 전 대기 시간은 안 센다
    if (startedAt.current === 0) startedAt.current = Date.now();

    const isExact = typed === target;
    const nextCorrect = correct + (isExact ? 1 : 0);
    targetChars.current += target.length;

    if (index + 1 < list.length) {
      setCorrect(nextCorrect);
      setIndex(index + 1);
      setTyped("");
      return;
    }

    // 마지막 줄 — 채점
    const elapsedMin = Math.max((Date.now() - startedAt.current) / 60000, 1 / 60);
    const accuracy = nextCorrect / list.length;
    const cpm = targetChars.current / elapsedMin;
    const speed = clamp01(cpm / TARGET_CPM);
    const score = Math.round(100 * (0.6 * accuracy + 0.4 * speed));

    setCorrect(nextCorrect);
    setLastScore(score);
    setPhase("done");
    if (score > best) onChange(String(score));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-lg bg-cream p-3">
        <p className="t-body-lg font-bold">파이썬 타자 — 정확하게, 그리고 빠르게</p>
        <p className="t-body-sm">
          아래에 뜨는 것을 똑같이 입력하고 「확인」을 누르세요(엔터도 됩니다). 대문자·기호·
          괄호까지 정확히! {list.length}줄을 다 치면 점수가 나와요. 여러 번 도전해 최고점을
          올릴 수 있어요.
        </p>
      </div>

      {phase === "ready" && (
        <button
          type="button"
          onClick={start}
          disabled={disabled}
          className="pill pill-primary self-start"
        >
          시작하기
        </button>
      )}

      {phase === "playing" && (
        <div className="flex flex-col gap-3">
          <p className="t-caption">
            {index + 1} / {list.length}
          </p>
          <div className="rounded-lg border-2 border-ink bg-canvas px-3 py-3">
            <p className="break-all font-mono text-lg">{target}</p>
          </div>
          <input
            // 자동완성·교정이 코드 입력을 방해하지 않게 끈다
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                confirmLine();
              }
            }}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={disabled}
            placeholder="여기에 똑같이 입력"
            className="field font-mono"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={confirmLine}
              disabled={disabled}
              className="pill pill-primary self-start"
            >
              확인
            </button>
            {typed.length > 0 && typed !== target && (
              <span className="t-caption text-muted">아직 똑같지 않아요 — 그래도 넘어가려면 확인</span>
            )}
            {typed === target && <span className="t-caption">정확해요! 확인을 누르세요</span>}
          </div>
        </div>
      )}

      {phase === "done" && lastScore !== null && (
        <div className="flex flex-col gap-2 rounded-lg border-2 border-ink bg-surface px-4 py-4">
          <p className="t-headline">이번 점수 {lastScore} / 100</p>
          <p className="t-body-sm">
            {list.length}줄 중 {correct}줄을 정확히 쳤어요. 최고점은 {Math.max(best, lastScore)}점.
          </p>
          <button type="button" onClick={start} disabled={disabled} className="pill pill-secondary self-start">
            다시 도전
          </button>
        </div>
      )}

      {best > 0 && phase !== "done" && <p className="t-caption">지금까지 최고점: {best} / 100</p>}
    </div>
  );
}
