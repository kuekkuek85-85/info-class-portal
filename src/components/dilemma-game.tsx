"use client";

import { useState } from "react";

/**
 * 반복 죄수의 딜레마 게임 — 공동체 활동(상벌점 규칙 만들기)의 도입 훅.
 *
 * 학생이 컴퓨터와 약 10라운드 협력/배신을 반복한다. 상대 전략은 **팃포탯**(1라운드는 협력,
 * 이후 학생의 직전 선택을 그대로 따라함). "혼자 이익만 좇으면 어떻게 되는가 · 반복되면 협력이
 * 이득이 되는가" 를 몸으로 느끼게 해, 규칙 만들기의 동기를 세운다.
 *
 * ## 왜 클라이언트에서 다 하나
 *
 * 상대가 결정적(팃포탯)이라 서버·AI 가 필요 없다. 점수 계산·라운드 진행은 이 컴포넌트 안에서
 * 하고, **끝났을 때 결과(라운드별 선택·총점)만** answers 에 저장한다(기존 저장 경로). 민감
 * 정보가 아니다.
 *
 * 점수표(고정): 협력·협력 3/3 · 배신·협력 5/0 · 협력·배신 0/5 · 배신·배신 1/1.
 */

type Move = "cooperate" | "defect";

interface Round {
  me: Move;
  cpu: Move;
  myScore: number;
  cpuScore: number;
}
interface Result {
  rounds: Round[];
  myTotal: number;
  cpuTotal: number;
  at: number;
}

/** 점수표 — [내 점수, 상대 점수] */
function payoff(me: Move, cpu: Move): [number, number] {
  if (me === "cooperate" && cpu === "cooperate") return [3, 3];
  if (me === "defect" && cpu === "cooperate") return [5, 0];
  if (me === "cooperate" && cpu === "defect") return [0, 5];
  return [1, 1]; // 배신·배신
}

/** 팃포탯 — 1라운드는 협력, 이후 학생의 직전 선택을 따라함 */
function titForTat(previousMine: Move | null): Move {
  return previousMine ?? "cooperate";
}

function parse(raw: string): Result | null {
  if (!raw.trim()) return null;
  try {
    const value = JSON.parse(raw) as Result;
    return Array.isArray(value.rounds) ? value : null;
  } catch {
    return null;
  }
}

const label = (move: Move) => (move === "cooperate" ? "협력" : "배신");

export function DilemmaGame({
  raw,
  onChange,
  disabled,
  rounds = 10,
}: {
  questionKey: string;
  raw: string;
  onChange: (raw: string) => void;
  disabled?: boolean;
  rounds?: number;
}) {
  const total = Math.max(1, Math.min(30, rounds));
  const saved = parse(raw);
  // 진행 중 라운드 (저장된 최종 결과가 있으면 그걸 시작점으로 보여준다)
  const [log, setLog] = useState<Round[]>(saved?.rounds ?? []);
  const finished = log.length >= total;

  const myTotal = log.reduce((sum, r) => sum + r.myScore, 0);
  const cpuTotal = log.reduce((sum, r) => sum + r.cpuScore, 0);

  function choose(me: Move) {
    if (disabled || finished) return;
    const previousMine = log.length > 0 ? log[log.length - 1].me : null;
    const cpu = titForTat(previousMine);
    const [myScore, cpuScore] = payoff(me, cpu);
    const next = [...log, { me, cpu, myScore, cpuScore }];
    setLog(next);
    if (next.length >= total) {
      const result: Result = {
        rounds: next,
        myTotal: next.reduce((sum, r) => sum + r.myScore, 0),
        cpuTotal: next.reduce((sum, r) => sum + r.cpuScore, 0),
        at: Date.now(),
      };
      onChange(JSON.stringify(result));
    }
  }

  function reset() {
    if (disabled) return;
    setLog([]);
    onChange("");
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 점수표 안내 (고정) */}
      <div className="rounded-lg border border-line bg-cream px-3 py-2">
        <p className="t-caption font-semibold">점수표 — 나 / 상대</p>
        <ul className="mt-1 flex flex-col gap-0.5 t-body-sm">
          <li>둘 다 협력 · 3 / 3</li>
          <li>나만 배신 (상대 협력) · 5 / 0</li>
          <li>나만 협력 (상대 배신) · 0 / 5</li>
          <li>둘 다 배신 · 1 / 1</li>
        </ul>
        <p className="mt-1 t-caption">
          상대는 컴퓨터예요. 처음엔 협력하고, 그다음부터는 내 바로 앞 선택을 똑같이 따라 해요.
        </p>
      </div>

      {/* 진행 상태 */}
      <div className="flex items-baseline justify-between gap-2">
        <p className="t-body-sm font-semibold">
          {finished ? "게임 끝!" : `${log.length + 1} / ${total} 라운드`}
        </p>
        <p className="t-body-sm">
          내 점수 <b>{myTotal}</b> · 상대 {cpuTotal}
        </p>
      </div>

      {!finished ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => choose("cooperate")}
            disabled={disabled}
            className="pill pill-primary pill-block py-3 t-body disabled:opacity-60"
          >
            협력하기
          </button>
          <button
            type="button"
            onClick={() => choose("defect")}
            disabled={disabled}
            className="pill pill-secondary pill-block py-3 t-body disabled:opacity-60"
          >
            배신하기
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border-2 border-ink bg-canvas p-4">
          <p className="t-body font-bold">
            총점 — 나 {myTotal} · 상대 {cpuTotal}
          </p>
          <p className="t-body-sm">
            반복해서 만나는 상대와는, 혼자 배신해서 얻는 이익보다 서로 협력할 때 쌓이는 점수가 더
            컸나요? 함께 지키는 약속(규칙)이 왜 필요한지 생각해 봐요.
          </p>
          <button
            type="button"
            onClick={reset}
            disabled={disabled}
            className="pill pill-secondary self-start t-body-sm disabled:opacity-60"
          >
            다시 하기
          </button>
        </div>
      )}

      {/* 라운드 기록 */}
      {log.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg bg-surface px-3 py-2">
          <p className="t-caption font-semibold">라운드 기록</p>
          {log.map((round, index) => (
            <p key={index} className="t-body-sm">
              {index + 1}. 나 {label(round.me)} · 상대 {label(round.cpu)} → {round.myScore} / {round.cpuScore}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
