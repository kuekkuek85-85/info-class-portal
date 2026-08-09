/**
 * 무드미터 4사분면 감정어.
 *
 * 축: valence(불쾌 -2 ~ 쾌 +2) × arousal(비활성 -2 ~ 활성 +2)
 * 중1이 3초 안에 고를 수 있도록 사분면당 4개, 총 16개로 제한했다.
 */

export type Quadrant = "red" | "yellow" | "blue" | "green";

export interface MoodOption {
  key: string;
  label: string;
  quadrant: Quadrant;
  /** 불쾌 -2 ~ 쾌 +2 */
  valence: number;
  /** 비활성 -2 ~ 활성 +2 */
  arousal: number;
}

export const QUADRANTS: Record<
  Quadrant,
  { label: string; description: string; className: string; dotClassName: string }
> = {
  red: {
    label: "빨강",
    description: "기운은 높은데 기분은 나쁨",
    className: "bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900",
    dotClassName: "bg-rose-500",
  },
  yellow: {
    label: "노랑",
    description: "기운도 높고 기분도 좋음",
    className: "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900",
    dotClassName: "bg-amber-400",
  },
  blue: {
    label: "파랑",
    description: "기운도 낮고 기분도 나쁨",
    className: "bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-900",
    dotClassName: "bg-sky-500",
  },
  green: {
    label: "초록",
    description: "기운은 낮지만 기분은 좋음",
    className: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900",
    dotClassName: "bg-emerald-500",
  },
};

export const MOOD_OPTIONS: readonly MoodOption[] = [
  // 빨강 — 고활성 · 불쾌
  { key: "angry", label: "화남", quadrant: "red", valence: -2, arousal: 2 },
  { key: "nervous", label: "긴장됨", quadrant: "red", valence: -1, arousal: 2 },
  { key: "anxious", label: "불안함", quadrant: "red", valence: -2, arousal: 1 },
  { key: "annoyed", label: "짜증남", quadrant: "red", valence: -1, arousal: 1 },

  // 노랑 — 고활성 · 쾌
  { key: "excited", label: "신남", quadrant: "yellow", valence: 2, arousal: 2 },
  { key: "hopeful", label: "기대됨", quadrant: "yellow", valence: 1, arousal: 2 },
  { key: "joyful", label: "즐거움", quadrant: "yellow", valence: 2, arousal: 1 },
  { key: "confident", label: "자신있음", quadrant: "yellow", valence: 1, arousal: 1 },

  // 파랑 — 저활성 · 불쾌
  { key: "sad", label: "슬픔", quadrant: "blue", valence: -2, arousal: -1 },
  { key: "lonely", label: "외로움", quadrant: "blue", valence: -2, arousal: -2 },
  { key: "tired", label: "지침", quadrant: "blue", valence: -1, arousal: -2 },
  { key: "bored", label: "심심함", quadrant: "blue", valence: -1, arousal: -1 },

  // 초록 — 저활성 · 쾌
  { key: "satisfied", label: "뿌듯함", quadrant: "green", valence: 2, arousal: -1 },
  { key: "relieved", label: "홀가분함", quadrant: "green", valence: 2, arousal: -2 },
  { key: "comfortable", label: "편안함", quadrant: "green", valence: 1, arousal: -1 },
  { key: "calm", label: "차분함", quadrant: "green", valence: 1, arousal: -2 },
];

const MOOD_BY_KEY = new Map(MOOD_OPTIONS.map((m) => [m.key, m]));

export function getMood(key: string): MoodOption | undefined {
  return MOOD_BY_KEY.get(key);
}

export function moodsByQuadrant(quadrant: Quadrant): MoodOption[] {
  return MOOD_OPTIONS.filter((m) => m.quadrant === quadrant);
}

/** PRD 5.3 — 감정 입력칸 옆에 항상 표시하는 안내 문구 */
export const MOOD_NOTICE = [
  "기분은 다 같이 보고, 적은 이유는 선생님이 봅니다.",
  "내용을 정리할 때 AI 도구를 사용합니다.",
  "힘든 일이 있으면 담임 선생님이나 상담 선생님께 이야기해 주세요.",
] as const;
