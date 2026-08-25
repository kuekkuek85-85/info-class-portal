"use client";

import { MoodBanner, MoodGrid } from "@/components/mood-grid";
import { getMood } from "@/lib/mood";

/**
 * 낱말을 배운 뒤 기분을 **다시** 고른다.
 *
 * ## 두 번 고르는 것이 이 활동이다
 *
 * 처음 체크인은 낱말을 배우기 전이라 아는 낱말 안에서 고를 수밖에 없다. "그냥 기분
 * 나쁨" 에 가장 가까운 칸을 찍는다. 퀴즈로 낱말을 익힌 뒤 같은 표를 다시 보면
 * 고르는 칸이 달라진다 — 화남이 아니라 좌절이었고, 슬픔이 아니라 서운함이었다.
 *
 * **그 차이가 오늘 배운 것 자체다.** 그래서 처음 고른 낱말을 나란히 띄운다. 안 보여
 * 주면 학생은 자기가 무엇을 바꿨는지 모르고, 그러면 두 번 고르는 일이 그냥 반복이 된다.
 *
 * 처음 것을 덮어쓰지 않는다. 기분 기록(moodEntries)은 그대로 두고 여기 고른 것은
 * 활동지 답으로 남는다 — 학기 내내 쌓이는 집계와 오늘의 활동을 섞지 않는다.
 */
export function MoodRecheck({
  value,
  firstMood,
  onChange,
  disabled,
}: {
  value: string;
  /** 오늘 처음 체크인에서 고른 낱말 열쇠. 아직 안 골랐으면 빈 문자열 */
  firstMood: string;
  onChange: (mood: string) => void;
  disabled?: boolean;
}) {
  const first = getMood(firstMood);
  const now = getMood(value);
  const changed = Boolean(first && now && first.key !== now.key);

  return (
    <div className="flex flex-col gap-4">
      {first ? (
        <p className="rounded-lg bg-cream px-4 py-3 t-body-sm">
          수업 시작할 때 고른 낱말 · <b>{first.label}</b>
        </p>
      ) : (
        <p className="rounded-lg bg-surface px-4 py-3 t-body-sm">
          수업 시작할 때 기분을 안 골랐네요. 지금 골라도 괜찮아요.
        </p>
      )}

      <MoodBanner value={value} empty="낱말을 배운 지금, 다시 골라 보세요." />
      <MoodGrid value={value} onChange={onChange} disabled={disabled} />

      {/*
        바뀌었든 그대로든 둘 다 뜻이 있다. "바꿔야 정답" 처럼 읽히면 안 바뀐 학생이
        억지로 다른 칸을 누른다.
      */}
      {now && first && (
        <p className="rounded-lg bg-lime px-4 py-3 t-body-sm">
          {changed ? (
            <>
              <b>{first.label}</b> 에서 <b>{now.label}</b> 로 바뀌었어요. 낱말을 알고 나니 더
              정확해진 거예요.
            </>
          ) : (
            <>
              처음과 같은 <b>{now.label}</b> 이에요. 백 개를 다 보고도 같은 칸이라면 그만큼
              확실한 겁니다.
            </>
          )}
        </p>
      )}
    </div>
  );
}
