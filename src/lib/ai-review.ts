import "server-only";

import type { CheckItem } from "./article-check";

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

/**
 * 오탈자 후보를 찾는다. 최대 3개. (7차시 수행평가)
 *
 * ## 여기서만 AI 를 쓴다
 *
 * 같은 화면의 다른 점검(빈 칸·글자 수·출처)은 전부 코드가 센다 — 즉시 뜨고, 틀리지
 * 않고, 스물여덟 명이 한꺼번에 내도 몰리지 않는다. 사람 말의 맞춤법만은 셀 수가 없어서
 * 이 한 줄만 AI 에게 맡긴다.
 *
 * ## 고치라고 하지 않는다
 *
 * 돌려주는 문장은 "이 낱말 한 번만 볼까요" 다. 방언이나 일부러 쓴 말을 잘못 짚을 수
 * 있고, 중1에게 "틀렸다" 고 단정하면 자기 글을 의심하며 손을 놓는다. 고친 말을 대신
 * 제안하지도 않는다 — 그러면 AI 가 쓴 문장이 되고, 수행평가에서 그 경계가 흐려진다.
 *
 * ## 실패하면 그 줄만 빠진다
 *
 * 빈 배열을 돌려준다. 나머지 점검은 코드가 이미 만들어 두었으므로 화면은 그대로 뜬다 —
 * 스물여덟 명이 한꺼번에 제출하는 구간이라, 여기서 학생을 세우면 안 된다.
 *
 * **학번·이름은 보내지 않는다.** 활동지에 쓴 글 텍스트만 넘어간다.
 */
export async function findTypos(texts: string[]): Promise<CheckItem[]> {
  const body = texts
    .map((t) => (t ?? "").trim())
    .filter(Boolean)
    .join("\n");
  if (!body) return [];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const prompt = [
    "다음은 중학교 1학년이 쓴 신문 기사다.",
    "맞춤법이나 오타로 보이는 낱말을 최대 3개만 골라라.",
    "",
    "규칙:",
    "- 낱말만 **글에 나온 그대로** 적어라. 고친 말을 제안하지 마라.",
    "- 확실하지 않으면 고르지 마라. 없으면 빈 배열을 내라.",
    "- 사람 이름·가게 이름·새로 지어낸 기술 이름은 고르지 마라.",
    "- 문장이 아니라 낱말이다.",
    "",
    'JSON만 출력하세요: {"words":["...","..."]}',
    "",
    body,
  ].join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          // 맞춤법은 상상할 자리가 아니다. 온도를 낮춰 같은 글에 같은 답이 나오게 한다
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) return [];

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(text) as { words?: unknown };
    if (!Array.isArray(parsed.words)) return [];

    return parsed.words
      .filter((w): w is string => typeof w === "string")
      .map((w) => w.trim())
      // 20자가 넘으면 낱말이 아니라 문장을 돌려준 것이다. 그런 것은 버린다
      .filter((w) => w.length > 0 && w.length <= 20)
      // 정말로 글에 있는 낱말만. 없는 것을 짚으면 학생이 찾다가 교사에게 온다
      .filter((w) => body.includes(w))
      .slice(0, 3)
      .map((word) => ({
        code: `typo:${word}`,
        field: "",
        kind: "typo" as const,
        label: `이 낱말 한 번만 볼까요 — “${word}”`,
        detail: word,
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
