"use client";

import { useState } from "react";

import type { MaskLine } from "@/lib/types";

/**
 * 개인정보 마스킹 체험 (9차시).
 *
 * ## 왜 조각을 눌러 가리게 하는가
 *
 * 문장을 통째로 주고 "개인정보를 지우세요" 라고 하면 중1은 이름만 지우고 끝낸다.
 * 조각을 하나씩 눌러 가리게 하면 **모든 조각을 한 번씩 판단하게** 된다 — 학교 이름은?
 * 반과 번호는? 그것이 이 활동에서 실제로 가르치려는 것이다. 하나만으로는 누군지 몰라도
 * 합치면 알 수 있으면 그것도 개인정보라는 것(슬라이드 4).
 *
 * ## 틀린 것을 빨갛게 칠하지 않는다
 *
 * 다 가리고 「채점」을 눌러야 결과가 나온다. 누를 때마다 맞다 틀리다가 뜨면 학생은
 * 판단을 멈추고 색이 바뀌는지만 본다 — 하나씩 눌러 보면서 맞는 조합을 찾아낸다.
 *
 * 채점 뒤에는 못 찾은 것을 짚어 준다. 지나치게 가린 것은 나무라지 않는다 — 개인정보를
 * 넓게 잡는 쪽은 이 수업에서 틀린 태도가 아니다.
 */
export function MaskingField({
  lines,
  value,
  onChange,
  disabled,
}: {
  lines: MaskLine[];
  /** "3/4" 꼴로 저장된 지난 결과 */
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  /** "줄-조각" 키 → 가렸는가 */
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [graded, setGraded] = useState(false);

  const shouldHide = lines.flatMap((line, li) =>
    line.parts.map((part, pi) => ({ key: `${li}-${pi}`, hide: part.hide === true })),
  );
  const targets = shouldHide.filter((item) => item.hide);
  const found = targets.filter((item) => hidden[item.key]).length;
  const missed = targets.filter((item) => !hidden[item.key]).length;

  function toggle(key: string) {
    if (disabled || graded) return;
    setHidden((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function grade() {
    setGraded(true);
    onChange(`${found}/${targets.length}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="t-note">
        개인정보라고 생각하는 낱말을 눌러서 가려 보세요. 다시 누르면 풀립니다.
      </p>

      <div className="flex flex-col gap-3">
        {lines.map((line, li) => (
          <p key={li} className="flex flex-wrap items-baseline gap-x-1 gap-y-2 rounded-lg border border-line p-3 t-body-lg">
            {line.parts.map((part, pi) => {
              const key = `${li}-${pi}`;
              const isHidden = hidden[key] === true;
              /*
                가릴 것이 아닌 조각은 단추로 만들지 않는다. 조사나 띄어쓰기까지 누를 수
                있으면 무엇을 판단하라는 것인지 흐려진다 — 누를 수 있는 것 자체가 힌트다.
                그래서 문장을 쪼갤 때 낱말 단위로 넉넉히 쪼개 둔다 (seed 참조).
              */
              const missedHere = graded && part.hide === true && !isHidden;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled || graded}
                  onClick={() => toggle(key)}
                  aria-pressed={isHidden}
                  className={`rounded px-1 transition ${
                    isHidden ? "bg-ink text-canvas" : missedHere ? "bg-pink" : "hover:bg-cream"
                  } ${graded ? "cursor-default" : ""}`}
                >
                  {isHidden ? "●".repeat(Math.max(2, Math.min(part.text.length, 6))) : part.text}
                </button>
              );
            })}
          </p>
        ))}
      </div>

      {!graded ? (
        <button type="button" onClick={grade} disabled={disabled} className="pill pill-primary self-start">
          다 가렸어요 · 확인하기
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg bg-cream p-3">
          <p className="t-body-lg">
            가려야 할 {targets.length}개 중 {found}개를 찾았어요.
          </p>
          {missed > 0 ? (
            <p className="t-body">
              분홍색으로 남은 것이 못 찾은 것입니다. 하나만으로는 누군지 몰라도, 다른 것과
              합치면 알 수 있으면 그것도 개인정보예요.
            </p>
          ) : (
            <p className="t-body">다 찾았습니다.</p>
          )}
        </div>
      )}

      {value && !graded && <p className="t-caption">지난번에 {value} 찾았어요.</p>}
    </div>
  );
}
