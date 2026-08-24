import "server-only";

import type { Quadrant } from "@/lib/mood";

/**
 * AI 감정 렌즈 — 학생이 쓴 경험 글을 읽고 감정을 **추측**한다.
 *
 * ## 맞히는 것이 목적이 아니다
 *
 * 서울시교육청 사회정서교육자료 1-2차시의 '마음 탐정 게임'(같은 상황을 두고 사람마다
 * 다른 감정을 고르는 것을 보는 활동)에서 추측하는 주체만 모둠 친구에서 AI로 바꾼 것이다.
 * 그래서 **AI가 틀리면 오히려 좋다** — "AI가 못 본 나"를 찾는 것이 이 시간의 자기 인식이다.
 *
 * 정확도를 높이려 들지 않는다. 확신에 찬 한 개가 아니라 후보 2개를 퍼센트와 함께
 * 돌려받는 것도 같은 이유다. 하나만 딱 집어 주면 학생은 그것을 정답으로 받아들인다.
 *
 * ## 진단하지 않는다 (PRD 6.5)
 *
 * 병명·치료·낙인 어휘를 프롬프트에서 금지한다. 공감 한 줄도 조언("~해 보세요")이
 * 아니라 수용으로 끝내게 한다. 중학생 정서 텍스트를 다루는 기능이라 여기서 한 발만
 * 나가도 교사가 감당할 수 없는 말이 화면에 뜬다.
 *
 * ## 위기 신호는 보내기 전에 거른다
 *
 * 아래 checkCrisis 참조. **Gemini 를 부르기 전에** 거른다 — 보내고 나서 거르면 이미
 * 밖으로 나간 뒤다.
 */

const TIMEOUT_MS = 12_000;
const MODEL = "gemini-flash-latest";

export interface EmotionGuess {
  /** 감정 후보 2개. percent 합이 100 */
  candidates: { label: string; percent: number }[];
  /** 무드미터 사분면. 알아볼 수 없으면 null — 색칠만 빠지고 나머지는 그대로 보인다 */
  quadrant: Quadrant | null;
  /** 받아들이는 한 문장. 조언이 아니다 */
  empathy: string;
  /** 글의 어느 대목을 보고 그렇게 추측했는지 한 문장 */
  because: string;
}

/**
 * 자·타해 암시. **Gemini 에 보내기 전에** 여기서 걸린다.
 *
 * 보내고 나서 거르면 두 가지가 동시에 잘못된다. ① 글이 이미 외부로 나갔다.
 * ② AI가 만든 위로 문구를 학생이 먼저 읽고 "이걸로 끝났다"고 느낀다. 여기서 필요한 것은
 * 답이 아니라 **교사와의 연결**이다.
 *
 * ### "죽겠다" 를 넣지 않은 이유
 *
 * "배고파 죽겠다", "졸려 죽겠다" 는 중학생이 하루에도 몇 번씩 쓰는 과장 표현이다.
 * 이것까지 걸면 배고픈 이야기를 쓴 학생이 상담 안내를 받고, 그 다음부터는 아무도
 * 솔직하게 안 쓴다. 걸러야 하는 것은 **의도를 말하는 형태**("죽고 싶다")다.
 *
 * 놓치는 표현이 반드시 있다. 이 목록은 교사를 대신하는 장치가 아니라, 명백한 신호가
 * 그대로 외부로 나가는 것만 막는 최소한의 문턱이다.
 */
const CRISIS_PATTERNS: readonly RegExp[] = [
  /죽고\s*싶/,
  /죽어\s*버리/,
  /자살/,
  /자해/,
  /살기\s*싫/,
  /살고\s*싶지\s*않/,
  /사라지고\s*싶/,
  /없어지고\s*싶/,
  /태어나지\s*말/,
  /뛰어내리/,
  /목을?\s*매/,
  /손목\s*긋/,
];

export function checkCrisis(text: string): boolean {
  const flat = text.replace(/\s+/g, " ");
  return CRISIS_PATTERNS.some((pattern) => pattern.test(flat));
}

const QUADRANTS: readonly string[] = ["red", "yellow", "blue", "green"];

function buildPrompt(text: string): string {
  return [
    "너는 중학교 1학년이 쓴 글을 읽고 그 사람의 감정을 조심스럽게 추측하는 도우미다.",
    "너는 상담사도 의사도 아니다. 진단하지 않는다.",
    "",
    "규칙:",
    "- 감정 후보를 정확히 2개 추측한다. percent 는 둘을 합쳐 100 이 되게 한다.",
    "- 확신하지 마라. 맞히는 것이 목적이 아니라 학생이 견줘 볼 거리를 주는 것이 목적이다.",
    "- 병명·진단·치료를 절대 말하지 마라 (우울증, 불안장애, 상담 받아라 등 금지).",
    "- 사람을 낮추는 말을 쓰지 마라 (예민하다, 유난이다, 별것 아니다 등 금지).",
    "- empathy 는 받아들이는 한 문장이다. 조언하지 마라 — \"~해 보세요\" 로 끝내지 마라.",
    "- because 는 글의 어느 대목을 보고 그렇게 추측했는지 한 문장으로 적는다.",
    "- 글에 사람 이름이 있으면 ○○ 으로 바꿔서 말한다.",
    "- 중학교 1학년이 읽을 수 있는 쉬운 말로.",
    "",
    "quadrant 는 무드미터 사분면이다:",
    "- red: 기운은 높은데 기분은 나쁨 (화남·긴장됨·불안함·짜증남)",
    "- yellow: 기운도 높고 기분도 좋음 (신남·기대됨·즐거움·자신있음)",
    "- blue: 기운도 낮고 기분도 나쁨 (슬픔·외로움·지침·심심함)",
    "- green: 기운은 낮지만 기분은 좋음 (뿌듯함·홀가분함·편안함·차분함)",
    "",
    "JSON만 출력하세요:",
    '{"candidates":[{"label":"서운함","percent":70},{"label":"지침","percent":30}],' +
      '"quadrant":"blue","empathy":"...","because":"..."}',
    "",
    "학생이 쓴 글:",
    text.trim(),
  ].join("\n");
}

/**
 * 감정을 추측한다. 실패하면 null — 부르는 쪽이 "다시 눌러 보세요" 로 안내한다.
 *
 * 캐시하지 않는다. 학생마다 쓴 글이 전부 다르다.
 */
export async function guessEmotion(text: string): Promise<EmotionGuess | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(text) }] }],
          generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(raw) as {
      candidates?: unknown;
      quadrant?: unknown;
      empathy?: unknown;
      because?: unknown;
    };

    const candidates = (Array.isArray(parsed.candidates) ? parsed.candidates : [])
      .map((item) => item as { label?: unknown; percent?: unknown })
      .filter((item) => typeof item.label === "string" && item.label.trim())
      .slice(0, 2)
      .map((item) => ({
        label: String(item.label).trim(),
        // 퍼센트가 깨져 와도 화면은 떠야 한다. 숫자가 아니면 0 으로 두고 안 보여준다
        percent: Number.isFinite(Number(item.percent)) ? Math.round(Number(item.percent)) : 0,
      }));

    // 후보가 하나도 없으면 견줄 것이 없다 — 실패로 본다
    if (candidates.length === 0) return null;

    const quadrant = typeof parsed.quadrant === "string" ? parsed.quadrant.toLowerCase() : "";

    return {
      candidates,
      quadrant: QUADRANTS.includes(quadrant) ? (quadrant as Quadrant) : null,
      empathy: typeof parsed.empathy === "string" ? parsed.empathy.trim() : "",
      because: typeof parsed.because === "string" ? parsed.because.trim() : "",
    };
  } catch {
    // 시간 초과 · 네트워크 오류 · JSON 깨짐 — 무엇이든 "실패" 하나로 취급한다
    return null;
  } finally {
    clearTimeout(timer);
  }
}
