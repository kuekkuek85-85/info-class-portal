/**
 * 무드미터 — 마크 브래킷 「감정의 발견」의 10×10 감정 표.
 *
 * 축: valence(불쾌 -5 ~ 쾌 +5) × arousal(비활성 -5 ~ 활성 +5)
 *
 * ## 왜 100칸인가
 *
 * 처음에는 사분면당 4개, 총 16개만 두었다. "중1이 3초 안에 고르게" 하려던 것이다.
 * 그런데 이 수업의 목표 자체가 **감정을 더 정확한 낱말로 구별하는 것**이라,
 * 16칸은 목표와 반대로 작동했다 — "기분 나쁨" 을 넷 중 하나로 뭉뚱그리게 된다.
 *
 * 원본 표를 그대로 쓰면 "화난" 과 "짜증나는" 과 "좌절한" 이 서로 다른 칸에 있고,
 * 고르는 행위 자체가 어휘 학습이 된다. 고르는 데 시간이 더 걸리는 것은 감수한다.
 *
 * ## 옛 기록은 그대로 읽힌다
 *
 * 16칸 시절에 저장된 moodEntries 의 `mood` 값(키)은 그대로 남아 있다. 열여섯 중
 * 열넷은 이 표에 같은 키로 들어 있고, 표에 없는 둘은 LEGACY_MOODS 로 받는다.
 * 키가 안 풀리면 교사 화면에 낱말 대신 영문 키가 뜬다.
 */

export type Quadrant = "red" | "yellow" | "blue" | "green";

export interface MoodOption {
  key: string;
  label: string;
  /** 원본 표의 영어 낱말. 같은 한국어가 두 칸에 나올 때 구별에 쓴다 (초조한 Jittery/Nervous) */
  en: string;
  quadrant: Quadrant;
  /** 불쾌 -5 ~ 쾌 +5 */
  valence: number;
  /** 비활성 -5 ~ 활성 +5 */
  arousal: number;
}

/**
 * 사분면 색.
 *
 * 무드미터 관례(빨·노·파·초)를 지키되 디자인 시스템의 파스텔 면으로 톤을 맞췄다.
 * 여기서 색은 장식이 아니라 축을 읽는 단서라서, 임의로 바꾸면 무드미터가 아니게 된다.
 */
export const QUADRANTS: Record<
  Quadrant,
  { label: string; description: string; className: string; dotClassName: string; hue: number; sat: number }
> = {
  red: {
    label: "빨강",
    description: "기운은 높은데 기분은 나쁨",
    className: "bg-pink",
    dotClassName: "bg-[#efd4d4]",
    hue: 2,
    sat: 72,
  },
  yellow: {
    label: "노랑",
    description: "기운도 높고 기분도 좋음",
    className: "bg-cream",
    dotClassName: "bg-[#f4ecd6]",
    hue: 44,
    sat: 92,
  },
  blue: {
    label: "파랑",
    description: "기운도 낮고 기분도 나쁨",
    className: "bg-lilac",
    dotClassName: "bg-[#c5b0f4]",
    hue: 212,
    sat: 62,
  },
  green: {
    label: "초록",
    description: "기운은 낮지만 기분은 좋음",
    className: "bg-mint",
    dotClassName: "bg-[#c8e6cd]",
    hue: 140,
    sat: 46,
  },
};

/**
 * 표 그대로. **위에서 아래로 기운이 낮아지고, 왼쪽에서 오른쪽으로 기분이 좋아진다.**
 *
 * 줄 하나가 열 칸이고, 왼쪽 다섯은 불쾌·오른쪽 다섯은 쾌다.
 * `[한국어, 영어]` 순서이며 영어가 그대로 키가 된다(소문자, 공백 제거).
 */
const GRID: [string, string][][] = [
  // ── 기운 높음 (High Energy) ─────────────────────────────
  [
    ["격분한", "Enraged"], ["공황에 빠진", "Panicked"], ["스트레스 받는", "Stressed"], ["초조한", "Jittery"], ["충격받은", "Shocked"],
    ["놀란", "Surprised"], ["긍정적인", "Upbeat"], ["흥겨운", "Festive"], ["아주 신나는", "Exhilarated"], ["황홀한", "Ecstatic"],
  ],
  [
    ["격노한", "Livid"], ["몹시 화가 난", "Furious"], ["좌절한", "Frustrated"], ["신경이 날카로운", "Tense"], ["망연자실한", "Stunned"],
    ["들뜬", "Hyper"], ["쾌활한", "Cheerful"], ["동기 부여된", "Motivated"], ["영감을 받은", "Inspired"], ["의기양양한", "Elated"],
  ],
  [
    ["화가 치밀어 오른", "Fuming"], ["겁먹은", "Frightened"], ["화난", "Angry"], ["초조한", "Nervous"], ["안절부절못하는", "Restless"],
    ["기운이 넘치는", "Energized"], ["활발한", "Lively"], ["흥분한", "Excited"], ["낙관적인", "Optimistic"], ["열광하는", "Enthusiastic"],
  ],
  [
    ["불안한", "Anxious"], ["우려하는", "Apprehensive"], ["근심하는", "Worried"], ["짜증나는", "Irritated"], ["거슬리는", "Annoyed"],
    ["만족스러운", "Pleased"], ["집중하는", "Focused"], ["행복한", "Happy"], ["자랑스러운", "Proud"], ["짜릿한", "Thrilled"],
  ],
  [
    ["불쾌한", "Repulsed"], ["골치 아픈", "Troubled"], ["염려하는", "Concerned"], ["마음이 불편한", "Uneasy"], ["언짢은", "Peeved"],
    ["유쾌한", "Pleasant"], ["기쁜", "Joyful"], ["희망찬", "Hopeful"], ["재미있는", "Playful"], ["더없이 행복한", "Blissful"],
  ],
  // ── 기운 낮음 (Low Energy) ──────────────────────────────
  [
    ["역겨운", "Disgusted"], ["침울한", "Glum"], ["실망스러운", "Disappointed"], ["의욕 없는", "Down"], ["냉담한", "Apathetic"],
    ["속 편한", "AtEase"], ["태평한", "Easygoing"], ["자족하는", "Content"], ["다정한", "Loving"], ["충만한", "Fulfilled"],
  ],
  [
    ["비관적인", "Pessimistic"], ["시무룩한", "Morose"], ["낙담한", "Discouraged"], ["슬픈", "Sad"], ["지루한", "Bored"],
    ["평온한", "Calm"], ["안전한", "Secure"], ["만족스러운", "Satisfied"], ["감사하는", "Grateful"], ["감동적인", "Touched"],
  ],
  [
    ["소외된", "Alienated"], ["비참한", "Miserable"], ["쓸쓸한", "Lonely"], ["기죽은", "Disheartened"], ["피곤한", "Tired"],
    ["여유로운", "Relaxed"], ["차분한", "Chill"], ["편안한", "Restful"], ["축복받은", "Blessed"], ["안정적인", "Balanced"],
  ],
  [
    ["의기소침한", "Despondent"], ["우울한", "Depressed"], ["둔한", "Sullen"], ["기진맥진한", "Exhausted"], ["지친", "Fatigued"],
    ["한가로운", "Mellow"], ["생각에 잠긴", "Thoughtful"], ["평화로운", "Peaceful"], ["편한", "Comfortable"], ["근심 걱정 없는", "Carefree"],
  ],
  [
    ["절망한", "Despairing"], ["가망 없는", "Hopeless"], ["고독한", "Desolate"], ["소모된", "Spent"], ["진이 빠진", "Drained"],
    ["나른한", "Sleepy"], ["흐뭇한", "Complacent"], ["고요한", "Tranquil"], ["안락한", "Cozy"], ["안온한", "Serene"],
  ],
];

/** 열 번호(0~9) → 기분. 가운데를 건너뛰어 -5…-1, +1…+5 */
function valenceOf(col: number): number {
  return col < 5 ? col - 5 : col - 4;
}
/** 줄 번호(0~9) → 기운. 위가 높다 */
function arousalOf(row: number): number {
  return row < 5 ? 5 - row : 4 - row;
}

function quadrantOf(row: number, col: number): Quadrant {
  if (row < 5) return col < 5 ? "red" : "yellow";
  return col < 5 ? "blue" : "green";
}

/** 표를 한 줄씩 펼친 목록. 화면은 GRID 를, 집계는 이 목록을 쓴다 */
export const MOOD_OPTIONS: readonly MoodOption[] = GRID.flatMap((cells, row) =>
  cells.map(([label, en], col) => ({
    key: en.toLowerCase(),
    label,
    en,
    quadrant: quadrantOf(row, col),
    valence: valenceOf(col),
    arousal: arousalOf(row),
  })),
);

/** 화면이 표 모양 그대로 그릴 때 쓴다 */
export const MOOD_GRID: readonly (readonly MoodOption[])[] = GRID.map((cells, row) =>
  cells.map(([label, en], col) => ({
    key: en.toLowerCase(),
    label,
    en,
    quadrant: quadrantOf(row, col),
    valence: valenceOf(col),
    arousal: arousalOf(row),
  })),
);

/**
 * 16칸 시절에만 있던 낱말.
 *
 * 그때 저장된 기록의 키를 풀어 주기 위해서만 둔다 — 화면의 표에는 안 나온다.
 * 나머지 열넷(angry·sad·lonely…)은 지금 표에 같은 키로 들어 있어 저절로 풀린다.
 */
const LEGACY_MOODS: readonly MoodOption[] = [
  { key: "confident", label: "자신있음", en: "Confident", quadrant: "yellow", valence: 2, arousal: 2 },
  { key: "relieved", label: "홀가분함", en: "Relieved", quadrant: "green", valence: 4, arousal: -4 },
];

const MOOD_BY_KEY = new Map([...MOOD_OPTIONS, ...LEGACY_MOODS].map((m) => [m.key, m]));

export function getMood(key: string): MoodOption | undefined {
  return MOOD_BY_KEY.get(key);
}

export function moodsByQuadrant(quadrant: Quadrant): MoodOption[] {
  return MOOD_OPTIONS.filter((m) => m.quadrant === quadrant);
}

/**
 * 칸 색 — 가운데에서 멀어질수록 진해진다.
 *
 * 원본 표가 그렇게 되어 있고, 그 그러데이션이 곧 "얼마나 센 감정인가" 를 읽는 단서다.
 * 평평하게 칠하면 100칸이 그냥 색종이 넉 장이 된다.
 */
export function moodCellStyle(option: MoodOption): { background: string; color: string } {
  const { hue, sat } = QUADRANTS[option.quadrant];
  // 가운데에서의 거리 1~5 두 축을 더해 2~10
  const away = Math.abs(option.valence) + Math.abs(option.arousal);
  const light = 90 - ((away - 2) / 8) * 36;
  return {
    background: `hsl(${hue} ${sat}% ${light}%)`,
    // 바탕이 어두워지면 글씨를 뒤집는다 — 안 그러면 진한 칸의 낱말이 안 읽힌다
    color: light < 62 ? "#fff" : "#1a1a1a",
  };
}

/** PRD 5.3 — 감정 입력칸 옆에 항상 표시하는 안내 문구 */
export const MOOD_NOTICE = [
  "기분은 다 같이 보고, 적은 이유는 선생님이 봅니다.",
  "내용을 정리할 때 AI 도구를 사용합니다.",
  "힘든 일이 있으면 담임 선생님이나 상담 선생님께 이야기해 주세요.",
] as const;
