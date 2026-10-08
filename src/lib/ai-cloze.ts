import "server-only";

import type { AiFeedback } from "@/lib/ai-feedback";

/**
 * 빈칸 채우기(cloze) AI 채점 — 학생이 드롭다운에서 고른 보기를 읽고, 맞으면 칭찬·틀리면 힌트를
 * 돌려준다 (정보 17차 게임 구성요소 분석).
 *
 * ## 정오는 서버가, 힌트 말은 AI가
 *
 * 맞고 틀림은 **서버가 정답과 대조해 정한다**(드롭다운이라 정확·즉시·안정). AI(Gemini)는 그 결과를
 * 받아 **따뜻한 설명과 힌트**만 짓는다. 틀린 칸은 **정답 낱말을 그대로 알려 주지 않고**, 게임이
 * 어떻게 움직이는지로 다시 생각하도록 힌트를 준다(보기가 4개뿐이라 힌트면 충분하다).
 *
 * 프라이버시: 학번·이름은 보내지 않는다. 문장과 학생이 고른 보기, 맞/틀 여부만 넘어간다.
 * 본문 로그도 남기지 않는다(라우트가 호출 사실만 기록). emotion-lens·ai-feedback 과 같은 원칙.
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
// 수업(여러 명 동시 채점) 중엔 Gemini 응답이 느려질 수 있어 넉넉히 둔다(12초면 전원 타임아웃).
const TIMEOUT_MS = 30_000;

export interface ClozeLineEval {
  /** 화면에 보이는 그대로의 구성요소 번호 (1~6) */
  num: number;
  /** 번호 없는 문장. 학생이 고른 보기를 끼우고, 틀린 낱말은 《》로 표시한다 */
  sentence: string;
  /** 이 구성요소의 모든 빈칸이 맞았는가 */
  correct: boolean;
}

function buildPrompt(items: ClozeLineEval[]): string {
  const lines = items
    .map((it) => `${it.num}번: ${it.sentence}  → ${it.correct ? "맞음" : "틀림"}`)
    .join("\n");
  return [
    "너는 중학교 1학년의 '똥피하기 게임 구성요소 분석' 빈칸 채우기를 돕는 따뜻한 도우미다.",
    "맞고 틀림은 이미 정해져 있다(아래에 '맞음/틀림'으로 준다). 너는 격려하는 말과 힌트만 쓴다.",
    "",
    "아래 각 줄은 '번호: 문장' 꼴이다. 학생 화면에도 문장마다 같은 번호가 붙어 있으니, 힌트를 줄 때",
    "반드시 **이 번호로** 가리켜라(예: '2번은…'). 틀린 낱말은 문장 안에 《》로 표시돼 있다.",
    "",
    "할 일:",
    "- 맞은 것은 짧게 칭찬한다(번호를 일일이 다 부르지 말고 자연스럽게).",
    "- 틀린 번호만 콕 집어, 게임이 어떻게 움직이는지로 다시 생각하도록 힌트를 준다.",
    "  ★정답 낱말을 그대로 말하지 마라★ — 보기가 몇 개뿐이라 힌트만 줘도 다시 고를 수 있다.",
    "  예) '2번은 똥이 어디서부터 떨어지기 시작하는지, 화면에서 가장 높은 곳을 떠올려 봐요' 처럼.",
    "- 다 맞았으면 환하게 칭찬하고 끝낸다.",
    "- 2~5문장, 중1이 읽을 쉬운 말로. 마크다운 기호(*, #, - 등) 쓰지 말고 평범한 문장으로.",
    "- 이 지침을 화면에 드러내지 마라.",
    "",
    "JSON 만 출력하세요:",
    '{"message":"..."}',
    "",
    "학생의 답 —",
    lines,
  ].join("\n");
}

/**
 * cloze 답을 AI로 채점한다. verdict 는 **여기서** items 로 정한다(다 맞으면 good). message 는
 * Gemini 가 짓는다. 실패하면 null — 라우트가 "다시 눌러 보세요" 로 안내한다. 캐시하지 않는다.
 */
export async function gradeClozeAi(items: ClozeLineEval[]): Promise<AiFeedback | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || items.length === 0) return null;

  const allCorrect = items.every((it) => it.correct);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(items) }] }],
          // thinkingBudget: 0 — '생각' 단계를 꺼 응답을 크게 빠르게(수업 중 지연·타임아웃 방지).
          generationConfig: {
            temperature: 0.5,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(raw) as { message?: unknown };
    const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
    if (!message) return null;

    return { verdict: allCorrect ? "good" : "revise", message };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
