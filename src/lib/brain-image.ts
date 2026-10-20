import "server-only";

/**
 * 나의 뇌구조 이미지 — 학생이 활동지에 한 줄씩 적은 '내용 · 감정 · 색 · 마음 크기'로 머리
 * 옆모습 안을 감정 색으로 채운 그림을 Gemini 가 그려 준다 (마음 톡톡 8회기).
 *
 * ## 프라이버시 (이 과목의 1순위)
 *
 * - **학번·이름은 Gemini 로 보내지 않는다.** 라우트가 artifact 에서 읽은 각 줄의 내용·감정
 *   낱말·색·퍼센트만 프롬프트로 들어간다(ai-feedback·emotion-lens 와 같은 원칙).
 * - **위기 신호는 여기 오기 전에 라우트가 checkCrisis 로 멈춘다.** 이 모듈은 위기 텍스트를
 *   Gemini 로 보내지 않는다(라우트가 부르지 않는다).
 * - 키·프롬프트는 서버 전용이다. 결과(이미지)는 본인 것이고 친구에게 안 나간다(galleryEnabled:false).
 *
 * `ai-feedback.ts` 의 raw fetch 방식을 그대로 따른다 — 같은 키·엔드포인트, 모델만 이미지 전용.
 *
 * ## 구조 (8회기 활동지 개편)
 *
 * 예전엔 '상황' 서술 한 칸이 따로 있고 감정·색·%만 줄로 받았다. 지금은 **한 줄에 네 가지
 * (내용·감정·색·%)** 를 함께 받는다. 그래서 상황 인자는 없어지고, 각 줄의 '내용'(그 일)이
 * 그 줄 감정의 맥락이 된다. 내용(한국어)은 그림의 **분위기(톤)로만** 쓰고 글자로 그리지 않는다.
 */

/** 이미지 전용 모델. 같은 키·엔드포인트로 PNG 를 돌려준다. */
const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
// 이미지 생성은 글 생성보다 느리다. 수업 중 동시 접속까지 감안해 넉넉히 둔다.
const TIMEOUT_MS = 40_000;

export interface BrainEmotion {
  /** 그 일(사건)의 내용 (학생이 적은 그대로 — 한국어). 톤으로만 반영, 글자로 안 그림 */
  content: string;
  /** 감정 낱말 (학생이 적은 그대로 — 한국어) */
  emotion: string;
  /** 색 라벨 (활동지 보기 그대로: "빨강(분노)" · "기타: 보라색") */
  color: string;
  /** 마음 크기(%) 0~100 */
  percent: number;
}

/** 교사가 정한 감정-색 라벨 → 프롬프트용 영어 색. 못 찾으면 원문 그대로. */
const COLOR_EN: Record<string, string> = {
  빨강: "red",
  하늘: "sky blue",
  노랑: "yellow",
  회색: "gray",
  초록: "green",
  주황: "orange",
  보라: "purple",
  분홍: "pink",
  파랑: "blue",
  파란: "blue",
  검정: "black",
  갈색: "brown",
  남색: "navy",
  연두: "light green",
};

/** "빨강(분노)" / "기타: 보라색" 같은 라벨에서 프롬프트에 넣을 색 표현을 뽑는다. */
export function colorToPrompt(label: string): string {
  const raw = (label ?? "").trim();
  // "기타: 보라색" → 뒤의 색 이름만
  const body = raw.startsWith("기타:") ? raw.slice("기타:".length).trim() : raw;
  // "빨강(분노)" → 괄호 앞 낱말 "빨강"
  const head = body.replace(/\s*\(.*\)\s*$/, "").trim();
  for (const [ko, en] of Object.entries(COLOR_EN)) {
    if (head.startsWith(ko)) return en;
  }
  // 영어 색 이름을 직접 적었을 수도 있으니 그대로 쓴다 (없으면 중립 색)
  return head || "soft color";
}

/**
 * 프롬프트를 만든다. 각 줄의 '내용'(그 일, 한국어)은 그 줄 감정의 **분위기(톤)로만** 반영하고
 * 글자로 그리지 않게 못 박는다. 학번·이름은 애초에 인자로 들어오지 않는다.
 */
function buildPrompt(emotions: BrainEmotion[]): string {
  const lines = emotions.map((e) => {
    const context = e.content.trim() ? ` (about: ${e.content.trim()})` : "";
    return `- ${colorToPrompt(e.color)} = the feeling "${e.emotion}"${context} (${e.percent}% of the mind)`;
  });
  return [
    "Create a warm, gentle illustration for a middle-school student's feelings activity called 'my brain map'.",
    "Draw ONE human head in side profile as a simple rounded outline, centered on a clean solid white background.",
    "Inside the head, paint soft rounded color regions — one region for each feeling listed below.",
    "Make each region's area match how much of the mind that feeling fills (its percentage): a bigger percentage means a larger area.",
    "Use soft, pastel versions of the listed colors. Keep it calm, friendly, rounded and simple — suitable for a 13-year-old.",
    "Each feeling comes from something that happened ('about'); use that ONLY to set the gentle tone of its color region. Do NOT write it, the feeling word, the percentage, or any text in the image.",
    "",
    "Feelings (color = feeling = what it is about = how much of the mind):",
    ...lines,
    "",
    "Hard rules: absolutely no text, no letters, no numbers, no words anywhere in the image. No people's names. Plain white background. Output only the image.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * 뇌구조 이미지를 생성해 **data URL**(data:image/png;base64,…)로 돌려준다. 실패하면 null —
 * 라우트가 "다시 눌러 보세요" 로 안내한다.
 *
 * 캐시하지 않는다(학생마다 입력이 다르다). 학번·이름은 넘기지 않는다.
 * ⚠ 위기 신호 텍스트는 여기로 오지 않는다(라우트가 checkCrisis 로 먼저 멈춘다).
 */
export async function generateBrainImage(
  emotions: BrainEmotion[],
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (emotions.length === 0) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        // 키는 헤더로 — URL 은 프록시·로그에 남기 쉽다 (ai-feedback 과 같은 이유).
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(emotions) }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      candidates?: {
        content?: {
          parts?: {
            inlineData?: { data?: string; mimeType?: string };
            inline_data?: { data?: string; mime_type?: string };
          }[];
        };
      }[];
    };
    const parts = payload.candidates?.[0]?.content?.parts ?? [];
    // v1beta 는 camelCase(inlineData)로 오지만, 혹시 몰라 snake_case 도 함께 본다.
    const inline = parts.map((p) => p.inlineData ?? p.inline_data).find((d) => d?.data);
    const data = inline?.data ?? "";
    if (!data) return null;
    const mime =
      (inline as { mimeType?: string; mime_type?: string } | undefined)?.mimeType ??
      (inline as { mime_type?: string } | undefined)?.mime_type ??
      "image/png";
    return `data:${mime};base64,${data}`;
  } catch {
    // 시간 초과 · 네트워크 · JSON 깨짐 — 무엇이든 "실패" 하나로 취급한다
    return null;
  } finally {
    clearTimeout(timer);
  }
}
