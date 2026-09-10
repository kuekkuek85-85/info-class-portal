"use client";

import { useState } from "react";

/**
 * 비밀번호 강함 체크 체험 (9·10 통합 차시의 pw_strength).
 *
 * security.org 의 "내 비밀번호는 얼마나 안전한가" 를 수업용으로 옮긴 것이다. 가짜
 * 비밀번호를 쳐 보면 실시간으로 약함/보통/강함/아주 강함이 뜨고, 무엇을 고치면 더
 * 강해지는지 그때그때 알려 준다.
 *
 * ## 아무것도 브라우저 밖으로 나가지 않는다
 *
 * scam-sim·masking 과 같은 원칙이다 — 이 컴포넌트에는 **네트워크 코드가 한 줄도 없다.**
 * 학생이 친 글자는 서버로도, 어디로도 보내지 않고 이 화면 안에서만 계산된다. 그래서
 * 진짜 비밀번호를 쳐도 새어 나가지는 않지만, 습관이 되면 위험하므로 **가짜만 치라고**
 * 화면 맨 위에서 분명히 안내한다.
 *
 * ## 저장하는 것은 등급 한 줄뿐이다
 *
 * masking 이 "3/4", scam_sim 이 "2/3" 만 남기듯, 여기서는 **도달한 최고 등급**(예:
 * "강함") 한 줄만 onChange 로 남긴다. 친 글자 자체는 절대 저장하지 않는다 — 채점도,
 * 개인 데이터도 아니고, 교사가 볼 일도 없다.
 *
 * ## 뚫리는 시간은 어림이다
 *
 * "대략 ~에 뚫려요" 는 초당 100억 번 대입을 가정한 **교육용 어림**이다. 실제 공격은
 * 훨씬 복잡하다 — 정확한 값이 아니라 "길고 섞을수록 자릿수가 확 늘어난다" 를 눈으로
 * 보여주기 위한 것이다. 그래서 과장하지 않도록 화면에도 "어림" 이라고 적어 둔다.
 */

/** 자릿수 세기에 쓰는 기준 — 초당 10^10 번 대입(오프라인 공격을 크게 잡은 어림) */
const GUESSES_PER_SECOND = 1e10;

/** 등급 넷. 낮음 → 높음. bar 는 채운 칸 색(globals 의 블록 색 토큰) */
const LEVELS = [
  { name: "약함", bar: "bg-coral" },
  { name: "보통", bar: "bg-cream" },
  { name: "강함", bar: "bg-mint" },
  { name: "아주 강함", bar: "bg-lime" },
] as const;

/** 제일 먼저 대입해 보는 흔한 말들. 이 중 하나가 통째로 들어 있으면 즉시 약함 처리 */
const COMMON = [
  "password",
  "passw0rd",
  "qwerty",
  "qwer",
  "asdf",
  "zxcv",
  "1234",
  "12345",
  "123456",
  "111111",
  "000000",
  "abc123",
  "admin",
  "iloveyou",
  "letmein",
  "welcome",
  "dragon",
  "monkey",
  "master",
  "login",
  "guest",
  "비밀번호",
  "사랑해",
];

/** 1234 · abcd · qwer 처럼 옆으로 이어지는 4글자 이상 흐름이 있나 */
function hasSequence(pw: string): boolean {
  const lower = pw.toLowerCase();
  const runs = ["abcdefghijklmnopqrstuvwxyz", "0123456789", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
  for (const run of runs) {
    for (let i = 0; i + 4 <= run.length; i++) {
      const chunk = run.slice(i, i + 4);
      const back = chunk.split("").reverse().join("");
      if (lower.includes(chunk) || lower.includes(back)) return true;
    }
  }
  return false;
}

interface Analysis {
  level: number; // 0~3
  bits: number;
  seconds: number;
  tips: string[];
  common: boolean;
}

function analyze(pw: string): Analysis {
  const length = pw.length;
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const lower = pw.toLowerCase();
  const common = COMMON.some((word) => lower.includes(word));
  const repeated = /(.)\1\1/.test(pw); // 같은 글자 3연속
  const sequenced = hasSequence(pw);

  // 글자 종류로 "한 자리에 올 수 있는 경우의 수"(pool)를 잡는다
  let pool = 0;
  if (hasLower) pool += 26;
  if (hasUpper) pool += 26;
  if (hasDigit) pool += 10;
  if (hasSymbol) pool += 33;
  if (pool === 0) pool = 1;

  // 자릿수(비트) = 길이 × log2(pool). 흔한 말·반복·나열은 실제로 훨씬 빨리 뚫려 깎는다
  let bits = length * Math.log2(pool);
  if (common) bits = Math.min(bits, 10);
  if (repeated) bits *= 0.6;
  if (sequenced) bits *= 0.6;

  // 절반쯤 대입하면 맞는다고 보고 시간을 잡는다 (교육용 어림)
  const seconds = Math.pow(2, Math.max(bits - 1, 0)) / GUESSES_PER_SECOND;

  let level: number;
  if (length === 0) level = 0;
  else if (common || length < 6 || bits < 28) level = 0;
  else if (bits < 40) level = 1;
  else if (bits < 60) level = 2;
  else level = 3;

  const tips: string[] = [];
  if (length > 0 && length < 12) tips.push("더 길게 — 12자가 넘어가면 뚫는 시간이 확 늘어나요.");
  if (!(hasLower && hasUpper)) tips.push("대문자와 소문자를 섞어 보세요.");
  if (!hasDigit) tips.push("숫자를 하나 넣어 보세요.");
  if (!hasSymbol) tips.push("! # @ 같은 기호를 섞으면 훨씬 강해져요.");
  if (common) tips.push("password · qwerty · 1234 같은 흔한 말은 제일 먼저 대입돼요.");
  if (sequenced) tips.push("abcd · 1234 처럼 이어지는 글자는 길이만큼 안 강해져요.");
  if (repeated) tips.push("같은 글자를 반복하면(aaa) 길어도 별로 안 강해져요.");

  return { level, bits, seconds, tips, common };
}

/** 초를 사람이 읽는 어림으로. 과장하지 않게 아주 큰 값은 뭉뚱그린다 */
function humanTime(seconds: number): string {
  if (!isFinite(seconds) || seconds > 1e17) return "사실상 뚫기 어려워요";
  if (seconds < 1) return "즉시";
  const minute = 60;
  const hour = 60 * minute;
  const day = 24 * hour;
  const year = 365 * day;
  if (seconds < minute) return `약 ${Math.round(seconds)}초`;
  if (seconds < hour) return `약 ${Math.round(seconds / minute)}분`;
  if (seconds < day) return `약 ${Math.round(seconds / hour)}시간`;
  if (seconds < year) return `약 ${Math.round(seconds / day)}일`;
  const years = seconds / year;
  if (years < 1000) return `약 ${Math.round(years)}년`;
  if (years < 1e6) return `약 ${Math.round(years / 1000)}천 년`;
  if (years < 1e9) return `약 ${Math.round(years / 1e6)}백만 년`;
  return "수십억 년 이상";
}

/** 저장된 등급 이름을 순위(0~3)로. 없거나 못 읽으면 -1 */
function rankOf(name: string): number {
  return LEVELS.findIndex((l) => l.name === name);
}

export function PwStrengthField({
  value,
  onChange,
  disabled,
}: {
  /** 도달한 최고 등급 이름("강함" 등). 지난 결과 */
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const [pw, setPw] = useState("");
  const analysis = analyze(pw);
  const active = pw.length > 0;
  const level = LEVELS[analysis.level];

  function handle(next: string) {
    if (disabled) return;
    setPw(next);
    // 최고 등급만 남긴다 — 친 글자는 저장하지 않는다
    if (next.length > 0) {
      const reached = analyze(next).level;
      if (reached > rankOf(value)) onChange(LEVELS[reached].name);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-lg bg-pink px-4 py-3">
        <p className="t-body-lg font-bold">진짜 비밀번호는 절대 치지 마세요!</p>
        <p className="t-body-sm">
          아무 가짜 비밀번호나 지어서 쳐 보세요. 여기 친 글자는 어디로도 보내지 않고 이
          화면 안에서만 계산돼요 — 그래도 진짜를 치는 습관은 위험하니 가짜로만 해 봅니다.
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="t-body-sm">가짜 비밀번호를 쳐 보세요</span>
        {/*
          type="text" 로 둔다 — 가리는 것이 목적이 아니라 무엇을 쳤는지 보며 고쳐 보는
          활동이라, 보이는 편이 낫다. autoComplete 을 꺼서 브라우저가 저장·자동완성으로
          진짜 비밀번호를 끌어오지 못하게 한다.
        */}
        <input
          value={pw}
          onChange={(event) => handle(event.target.value)}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={64}
          disabled={disabled}
          placeholder="예) Tiger9!rainDrop"
          className="field font-mono disabled:opacity-60"
        />
      </label>

      {/* 강함 막대 — 네 칸. 도달한 등급까지 그 등급 색으로 채운다 */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-1.5" aria-hidden>
          {LEVELS.map((_, i) => (
            <div
              key={i}
              className={`h-2.5 flex-1 rounded-full ${
                active && i <= analysis.level ? level.bar : "bg-surface"
              }`}
            />
          ))}
        </div>
        <p className="t-body-lg font-bold" aria-live="polite">
          {active ? level.name : "여기에 쳐 보면 강함 정도가 나와요"}
          {active && (
            <span className="t-body-sm font-normal text-muted">
              {" "}
              · 대략 {humanTime(analysis.seconds)}에 뚫려요 (어림)
            </span>
          )}
        </p>
      </div>

      {active && analysis.tips.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg bg-cream p-3">
          <p className="t-eyebrow">이렇게 하면 더 강해져요</p>
          <ul className="flex flex-col gap-1">
            {analysis.tips.map((tip) => (
              <li key={tip} className="t-body-sm">
                · {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {active && analysis.tips.length === 0 && (
        <p className="t-body-sm rounded-lg bg-cream p-3">
          아주 좋아요! 길고, 여러 종류를 섞었고, 흔한 말이 없어요. 이런 비밀번호는 뚫기가
          아주 어렵습니다.
        </p>
      )}

      <p className="t-caption text-muted">
        이름 · 생일 · 전화번호는 남이 가장 먼저 넣어 봐요 — 비밀번호에 쓰지 마세요.
      </p>

      {value && <p className="t-caption">지금까지 도달한 최고 등급: {value}</p>}
    </div>
  );
}
