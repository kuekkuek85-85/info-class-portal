import "server-only";

/**
 * 학생이 스스로 한 검토를 보고, AI가 놓친 것을 짚어 준다.
 *
 * ## AI 는 질문자다, 평가자가 아니다
 *
 * 점수·등급·칭찬을 주면 "AI가 내 앱을 평가했다"가 되고, 그 순간부터 학생은 점수를
 * 올리는 데만 매달린다. 이 수업의 목적은 "왜 부족한지 스스로 찾는" 경험이라, AI 도
 * 교사와 같은 규칙을 따른다 — 질문만 한다. 결정은 학생 몫으로 남긴다.
 *
 * ## 이미 답한 것 다음에 온다
 *
 * 학생이 먼저 "누가 쓸까 / 어디가 다른가" 를 자기 말로 적은 뒤에 이 검토를 부른다.
 * 그래서 AI 에게 보내는 것은 백지 기획이 아니라 학생의 자기 검토까지 포함한 전체
 * 맥락이다 — 그래야 "네가 이미 답한 것 말고, 아직 안 짚은 것"을 물을 수 있다.
 *
 * ## 실패해도 수업은 굴러가야 한다
 *
 * 실패하면 빈 배열을 돌려준다. 부르는 쪽이 "다시 눌러 보세요" 로 안내하면 그만이다.
 * 화면 하나가 죽는 것과, 버튼을 한 번 더 눌러야 하는 것은 전혀 다른 문제다.
 */

const TIMEOUT_MS = 12_000;
const MODEL = "gemini-flash-latest";

export interface ReviewInput {
  label: string;
  value: string;
}

function buildPrompt(fields: ReviewInput[]): string {
  const lines = fields
    .map(({ label, value }) => value.trim() && `${label}: ${value.trim()}`)
    .filter(Boolean);

  return [
    "너는 중학교 1학년의 앱 기획을 함께 검토하는 조력자다.",
    "아래는 학생이 오늘 만든 것과, 학생이 스스로 한 검토다.",
    "학생이 아직 생각하지 못했을 만한 질문을 정확히 2개만 던져라.",
    "",
    "규칙:",
    "- 점수·등급·평가·칭찬을 하지 마라. 질문만 해라.",
    "- 중학교 1학년이 읽을 수 있는 쉬운 말로.",
    "- 학생이 이미 스스로 답한 것과 겹치는 질문은 하지 마라.",
    "- 각 질문은 한 문장. 답을 대신 제시하지 마라.",
    "",
    'JSON만 출력하세요: {"questions":["...","..."]}',
    "",
    ...lines,
  ].join("\n");
}

/**
 * 검토 질문 2개를 만든다. 실패하면 빈 배열.
 *
 * 캐시하지 않는다 — 학생마다 내용이 전부 달라서 같은 질문이 다시 나올 일이 없다
 * (job-grouping.ts 와 반대 이유. 그쪽은 반 전체가 같은 질문에 같은 답을 봐야 한다).
 */
export async function reviewBuild(fields: ReviewInput[]): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(fields) }] }],
          generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) return [];

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(text) as { questions?: unknown };

    if (!Array.isArray(parsed.questions)) return [];
    return parsed.questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0).slice(0, 2);
  } catch {
    // 시간 초과 · 네트워크 오류 · JSON 깨짐 — 무엇이든 "실패" 하나로 취급한다
    return [];
  } finally {
    clearTimeout(timer);
  }
}
