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
  /**
   * 중1이 읽고 바로 아는 뜻풀이. 낱말을 누르면 표 위에 뜬다.
   *
   * "망연자실한" 을 아는 중1은 거의 없다. 뜻을 모르는 낱말이 백 개 깔려 있으면
   * 학생은 아는 낱말 몇 개 안에서만 고르고, 그러면 표를 백 칸으로 늘린 이유가 사라진다.
   *
   * 낱말 자체를 풀이에 다시 쓰지 않는다 — "화난: 화가 난 상태" 는 아무것도 안 알려 준다.
   */
  def: string;
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
const GRID: [string, string, string][][] = [
  // ── 기운 높음 (High Energy) ─────────────────────────────
  [
    ["격분한", "Enraged", "참을 수 없을 만큼 크게 화가 난 상태"],
    ["공황에 빠진", "Panicked", "갑자기 겁이 나서 어떻게 해야 할지 모르는 상태"],
    ["스트레스 받는", "Stressed", "할 일과 걱정이 쌓여 마음이 눌리는 느낌"],
    ["초조한", "Jittery", "마음이 급해서 가만히 있기 힘든 느낌"],
    ["충격받은", "Shocked", "예상 못 한 일에 머리가 멍해진 상태"],
    ["놀란", "Surprised", "뜻밖의 일에 눈이 번쩍 뜨이는 느낌"],
    ["긍정적인", "Upbeat", "잘될 거라는 생각이 들어 기운이 나는 상태"],
    ["흥겨운", "Festive", "축제처럼 들뜨고 신이 나는 기분"],
    ["아주 신나는", "Exhilarated", "가슴이 뻥 뚫릴 만큼 신이 난 상태"],
    ["황홀한", "Ecstatic", "너무 좋아서 정신이 아득할 정도인 상태"],
  ],
  [
    ["격노한", "Livid", "화가 머리끝까지 나서 얼굴이 굳을 정도"],
    ["몹시 화가 난", "Furious", "아주 크게 화가 나 참기 어려운 상태"],
    ["좌절한", "Frustrated", "애써 온 일이 막혀서 힘이 빠지는 느낌"],
    ["신경이 날카로운", "Tense", "작은 소리에도 예민해질 만큼 긴장한 상태"],
    ["망연자실한", "Stunned", "큰일을 당해 아무 생각도 안 나고 멍한 상태"],
    ["들뜬", "Hyper", "기운이 넘쳐 가만히 못 있을 만큼 신난 상태"],
    ["쾌활한", "Cheerful", "밝고 명랑해서 웃음이 잘 나오는 상태"],
    ["동기 부여된", "Motivated", "하고 싶은 마음이 생겨 시작하게 되는 상태"],
    ["영감을 받은", "Inspired", "좋은 생각이 떠올라 만들고 싶어지는 상태"],
    ["의기양양한", "Elated", "잘해내서 어깨가 으쓱해진 상태"],
  ],
  [
    ["화가 치밀어 오른", "Fuming", "속에서 화가 부글부글 올라오는 느낌"],
    ["겁먹은", "Frightened", "무서워서 몸이 굳는 느낌"],
    ["화난", "Angry", "마음에 안 드는 일 때문에 기분이 확 상한 상태"],
    ["초조한", "Nervous", "걱정돼서 마음이 가라앉지 않는 느낌"],
    ["안절부절못하는", "Restless", "가만히 앉아 있기 어렵고 자꾸 움직이게 되는 상태"],
    ["기운이 넘치는", "Energized", "몸에 힘이 가득 차 뭐든 할 수 있을 것 같은 상태"],
    ["활발한", "Lively", "움직임이 많고 생기가 도는 상태"],
    ["흥분한", "Excited", "기대돼서 심장이 빨리 뛰는 느낌"],
    ["낙관적인", "Optimistic", "앞일이 잘 풀릴 거라고 믿는 마음"],
    ["열광하는", "Enthusiastic", "아주 좋아서 푹 빠져 있는 상태"],
  ],
  [
    ["불안한", "Anxious", "나쁜 일이 생길까 봐 마음이 놓이지 않는 느낌"],
    ["우려하는", "Apprehensive", "앞으로 있을 일이 잘 안 될까 봐 조심스러운 마음"],
    ["근심하는", "Worried", "어떤 일이 계속 마음에 걸려 신경 쓰이는 상태"],
    ["짜증나는", "Irritated", "사소한 일이 거슬려서 기분이 상하는 느낌"],
    ["거슬리는", "Annoyed", "뭔가가 자꾸 신경을 건드려 불편한 느낌"],
    ["만족스러운", "Pleased", "바라던 대로 되어 기분이 좋은 상태"],
    ["집중하는", "Focused", "다른 게 안 보일 만큼 한 가지에 빠진 상태"],
    ["행복한", "Happy", "마음이 가득 차서 좋은 상태"],
    ["자랑스러운", "Proud", "내가 해낸 것이 대견하게 느껴지는 상태"],
    ["짜릿한", "Thrilled", "온몸이 찌릿할 만큼 신나는 느낌"],
  ],
  [
    ["불쾌한", "Repulsed", "보거나 겪기 싫을 만큼 기분이 나쁜 상태"],
    ["골치 아픈", "Troubled", "어떻게 풀어야 할지 몰라 머리가 복잡한 상태"],
    ["염려하는", "Concerned", "누군가나 무언가가 걱정되어 마음이 쓰이는 상태"],
    ["마음이 불편한", "Uneasy", "뭔가 께름칙해서 편하지 않은 느낌"],
    ["언짢은", "Peeved", "기분이 살짝 상해서 뾰로통해진 상태"],
    ["유쾌한", "Pleasant", "기분 좋고 웃음이 나는 편안한 상태"],
    ["기쁜", "Joyful", "좋은 일이 생겨 마음이 환해진 상태"],
    ["희망찬", "Hopeful", "앞으로 좋아질 거라는 기대가 있는 상태"],
    ["재미있는", "Playful", "장난치고 놀고 싶은 기분"],
    ["더없이 행복한", "Blissful", "더 바랄 것이 없을 만큼 행복한 상태"],
  ],
  // ── 기운 낮음 (Low Energy) ──────────────────────────────
  [
    ["역겨운", "Disgusted", "보기만 해도 속이 뒤집힐 만큼 싫은 느낌"],
    ["침울한", "Glum", "기분이 가라앉아 말수가 줄어든 상태"],
    ["실망스러운", "Disappointed", "기대한 것이 어긋나 마음이 푹 꺼진 느낌"],
    ["의욕 없는", "Down", "뭘 해도 하고 싶은 마음이 안 생기는 상태"],
    ["냉담한", "Apathetic", "아무 관심도 안 생기고 마음이 식은 상태"],
    ["속 편한", "AtEase", "걱정이 없어 마음이 놓인 상태"],
    ["태평한", "Easygoing", "급할 것 없이 느긋한 상태"],
    ["자족하는", "Content", "지금 가진 것으로 충분하다고 느끼는 마음"],
    ["다정한", "Loving", "누군가를 아끼는 마음이 따뜻하게 드는 상태"],
    ["충만한", "Fulfilled", "마음이 가득 차서 부족함이 없는 상태"],
  ],
  [
    ["비관적인", "Pessimistic", "어차피 안 될 거라고 미리 생각하는 마음"],
    ["시무룩한", "Morose", "서운해서 표정이 굳고 말이 없어진 상태"],
    ["낙담한", "Discouraged", "잘 안 돼서 하려던 마음이 꺾인 상태"],
    ["슬픈", "Sad", "마음이 아파서 눈물이 날 것 같은 상태"],
    ["지루한", "Bored", "할 것도 재미도 없어 시간이 안 가는 느낌"],
    ["평온한", "Calm", "흔들림 없이 잔잔한 마음"],
    ["안전한", "Secure", "걱정할 것이 없어 든든한 느낌"],
    ["만족스러운", "Satisfied", "바라던 만큼 되어서 마음이 놓인 상태"],
    ["감사하는", "Grateful", "고마운 마음이 드는 상태"],
    ["감동적인", "Touched", "마음이 뭉클해지는 느낌"],
  ],
  [
    ["소외된", "Alienated", "여럿 속에 있는데 나만 끼지 못한 느낌"],
    ["비참한", "Miserable", "너무 힘들어서 스스로가 초라하게 느껴지는 상태"],
    ["쓸쓸한", "Lonely", "곁에 아무도 없는 것 같아 허전한 느낌"],
    ["기죽은", "Disheartened", "자신이 없어져 어깨가 처진 상태"],
    ["피곤한", "Tired", "쉬고 싶을 만큼 몸이 지친 상태"],
    ["여유로운", "Relaxed", "서두를 것 없이 몸과 마음이 풀린 상태"],
    ["차분한", "Chill", "들뜨지 않고 가라앉아 있는 상태"],
    ["편안한", "Restful", "쉬고 있는 것처럼 몸이 가벼운 상태"],
    ["축복받은", "Blessed", "좋은 일이 나에게 온 것 같아 고마운 마음"],
    ["안정적인", "Balanced", "어느 쪽으로도 치우치지 않고 고른 상태"],
  ],
  [
    ["의기소침한", "Despondent", "기운이 빠져 아무것도 하기 싫은 상태"],
    ["우울한", "Depressed", "마음이 오래 가라앉아 무겁게 느껴지는 상태"],
    ["뚱한", "Sullen", "기분이 상해 말도 표정도 없이 굳은 상태"],
    ["기진맥진한", "Exhausted", "힘이 하나도 안 남을 만큼 지친 상태"],
    ["지친", "Fatigued", "오래 애써서 힘이 다 빠진 상태"],
    ["한가로운", "Mellow", "할 일이 없어 느릿느릿 편한 상태"],
    ["생각에 잠긴", "Thoughtful", "조용히 무언가를 곱씹고 있는 상태"],
    ["평화로운", "Peaceful", "다툼도 걱정도 없이 조용한 마음"],
    ["편한", "Comfortable", "불편한 데가 없어 마음이 놓이는 상태"],
    ["근심 걱정 없는", "Carefree", "신경 쓸 것이 없어 마음이 가벼운 상태"],
  ],
  [
    ["절망한", "Despairing", "이제 방법이 없다고 느껴져 캄캄한 상태"],
    ["가망 없는", "Hopeless", "나아질 것 같지 않다고 느끼는 상태"],
    ["고독한", "Desolate", "혼자 뚝 떨어진 것처럼 텅 빈 느낌"],
    ["소모된", "Spent", "쓸 수 있는 힘을 다 써 버린 상태"],
    ["진이 빠진", "Drained", "속까지 다 빠져나간 것처럼 힘없는 상태"],
    ["나른한", "Sleepy", "졸음이 와서 몸이 늘어지는 느낌"],
    ["흐뭇한", "Complacent", "보기 좋아서 절로 미소가 나는 마음"],
    ["고요한", "Tranquil", "아주 조용하고 잔잔한 상태"],
    ["안락한", "Cozy", "포근하고 아늑해서 좋은 상태"],
    ["안온한", "Serene", "조용하고 편안해서 흔들림이 없는 상태"],
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
  cells.map(([label, en, def], col) => ({
    key: en.toLowerCase(),
    label,
    en,
    def,
    quadrant: quadrantOf(row, col),
    valence: valenceOf(col),
    arousal: arousalOf(row),
  })),
);

/** 화면이 표 모양 그대로 그릴 때 쓴다 */
export const MOOD_GRID: readonly (readonly MoodOption[])[] = GRID.map((cells, row) =>
  cells.map(([label, en, def], col) => ({
    key: en.toLowerCase(),
    label,
    en,
    def,
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
  { key: "confident", label: "자신있음", en: "Confident", def: "잘할 수 있다고 믿어지는 상태", quadrant: "yellow", valence: 2, arousal: 2 },
  { key: "relieved", label: "홀가분함", en: "Relieved", def: "걱정이 끝나 마음이 가벼워진 상태", quadrant: "green", valence: 4, arousal: -4 },
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
