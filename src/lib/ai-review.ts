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
 * 예전에는 실패하면 빈 배열을 돌려주고 화면이 "다시 눌러 보세요" 를 띄웠다. 한 명이
 * 실패했을 때는 그것으로 됐는데, **학교망이 외부 API 를 막으면 스물두 명이 동시에**
 * 그 문구를 본다. 그러면 스물두 명이 다시 누르고, 다시 실패하고, 교사에게 온다.
 *
 * 그래서 실패해도 질문 세 개는 반드시 나온다 (FALLBACK_QUESTIONS). 학생 화면에는
 * 어느 경로로 왔는지 **표시하지 않는다** — "저는 AI가 안 왔어요" 가 한 명 나오는
 * 순간 나머지 수업이 멈춘다. 폴백인지 아닌지는 교사 대시보드에서만 보인다.
 */

/**
 * 12초. 재 보고 정한 값이라 줄이지 말 것.
 *
 * 혼자 부르면 4.6~7.3초에 온다. 그런데 수업은 스물두 명이 몇 분 안에 몰려 누르는
 * 자리고, 그때 꼬리가 길어진다 — 22명 동시 호출을 재 보니 중앙값 6.6초에 최대 22.5초였다.
 *
 *   8초로 자르면   22명 중 16명만 AI 를 받는다 (여섯 명이 고정 질문)
 *   12초로 자르면  21명이 받는다
 *   15초로 늘려도  21명. 더 기다려서 얻는 것이 없다
 *
 * 8초가 "22명을 오래 기다리게 하지 않는다" 는 이유로 그럴듯해 보이는데, 실제로는
 * 네 명 중 한 명에게서 AI 를 뺏는다. 기다리는 동안 활동지의 다른 칸은 계속 쓸 수 있으므로
 * (단추 자리에서만 도는 로딩) 12초를 기다리는 비용이 그만큼 크지 않다.
 */
const TIMEOUT_MS = 12_000;

/**
 * 모델 이름은 환경변수로 뺀다.
 *
 * **기본값을 바꾸기 전에 반드시 실제로 불러 볼 것.** 이 키로는 `gemini-2.5-flash` 가
 * v1beta 생성 엔드포인트에서 404 로 떨어진다 — 모델 목록에는 있는데도 그렇다.
 * 그러면 전원이 고정 질문으로 내려가는데, 화면에는 아무 표시가 안 나서
 * 교사 대시보드를 보기 전까지 아무도 모른다.
 */
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

/**
 * AI 가 없을 때 대신 나가는 질문.
 *
 * 아무 앱에나 물어도 말이 되고, 답하려면 자기 화면을 실제로 봐야 하는 것들로 골랐다.
 * 세 질문의 각도가 서로 다르다 — 누가 쓰는가 · 정말 필요한가 · 써 보면 헷갈리지 않는가.
 *
 * **여기 한 곳에만 적는다.** 활동지 시드와 두 군데에 흩어 두면 한쪽만 고치게 된다.
 */
export const FALLBACK_QUESTIONS: readonly string[] = [
  "이 앱을 쓸 사람을 한 명 떠올려 보자. 그 사람 이름을 댈 수 있나?",
  "이 앱이 없으면 그 사람은 지금 어떻게 하고 있을까?",
  "처음 보는 사람이 설명 없이 이 화면을 쓸 수 있을까? 어디서 헷갈릴까?",
] as const;

/** 어디서 온 질문인가. 교사 집계용이며 학생 화면은 쓰지 않는다 */
export type ReviewSource = "ai" | "fallback";
/** 폴백이라면 왜인가. 아침 점검과 수업 중 판단에 쓴다 */
export type ReviewReason = "ok" | "timeout" | "format" | "error" | "quota" | "nokey";

export interface ReviewResult {
  questions: string[];
  source: ReviewSource;
  reason: ReviewReason;
  latencyMs: number;
}

export interface ReviewInput {
  label: string;
  value: string;
}

/** 질문이 모자라거나 없을 때 고정 질문으로 채운다. 개수는 항상 맞춰 나간다 */
export function fallbackResult(reason: ReviewReason, latencyMs = 0, count = 2): ReviewResult {
  return { questions: FALLBACK_QUESTIONS.slice(0, count), source: "fallback", reason, latencyMs };
}

function buildPrompt(fields: ReviewInput[], count: number): string {
  const lines = fields
    .map(({ label, value }) => value.trim() && `${label}: ${value.trim()}`)
    .filter(Boolean);

  /*
   * 세 개를 물을 때만 각도를 지정한다.
   *
   * 개수만 늘리면 같은 것을 세 번 다르게 묻는다. 각도를 못 박아야 학생이 세 번째
   * 질문에서 처음 보는 관점을 만난다.
   */
  const angles =
    count >= 3
      ? ["- 세 질문은 서로 다른 각도여야 한다: (1) 누가 쓰는가 (2) 정말 필요한가 (3) 써 보면 헷갈리지 않는가"]
      : [];

  return [
    "너는 중학교 1학년의 앱 기획을 함께 검토하는 조력자다.",
    "아래는 학생이 오늘 만든 것과, 학생이 스스로 한 검토다.",
    `학생이 아직 생각하지 못했을 만한 질문을 정확히 ${count}개만 던져라.`,
    "",
    "규칙:",
    "- 점수·등급·평가·칭찬을 하지 마라. 질문만 해라.",
    "- 중학교 1학년이 읽을 수 있는 쉬운 말로.",
    "- 학생이 이미 스스로 답한 것과 겹치는 질문은 하지 마라.",
    ...angles,
    "- 각 질문은 한 문장. 답을 대신 제시하지 마라.",
    "",
    `JSON만 출력하세요: {"questions":[${Array(count).fill('"..."').join(",")}]}`,
    "",
    ...lines,
  ].join("\n");
}

/** 한 번 부른다. 던지지 않고 결과나 실패 사유를 돌려준다 */
async function callOnce(
  apiKey: string,
  fields: ReviewInput[],
  count: number,
): Promise<{ questions: string[] } | { failed: ReviewReason }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(fields, count) }] }],
          generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) return { failed: "error" };

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(text) as { questions?: unknown };
    if (!Array.isArray(parsed.questions)) return { failed: "format" };

    const questions = parsed.questions
      .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
      .map((q) => q.trim())
      .slice(0, count);

    // 개수가 모자라면 형식 실패다. 두 개 물어보기로 해 놓고 하나만 오면 화면이 어색해진다
    return questions.length === count ? { questions } : { failed: "format" };
  } catch (error) {
    // AbortController 가 끊은 것과 네트워크가 죽은 것은 아침 점검에서 뜻이 다르다
    return { failed: error instanceof Error && error.name === "AbortError" ? "timeout" : "error" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 검토 질문을 만든다. **어떤 경우에도 질문 개수를 채워서 돌려준다.**
 *
 * 캐시하지 않는다 — 학생마다 내용이 전부 달라서 같은 질문이 다시 나올 일이 없다
 * (job-grouping.ts 와 반대 이유. 그쪽은 반 전체가 같은 질문에 같은 답을 봐야 한다).
 *
 * 형식이 깨졌을 때만 한 번 더 부른다. 시간 초과와 오류는 다시 불러도 같은 결과일
 * 가능성이 높고, 스물두 명이 동시에 누르는 자리라 두 배로 기다리게 할 수 없다.
 */
export async function reviewBuild(fields: ReviewInput[], count = 2): Promise<ReviewResult> {
  const started = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallbackResult("nokey", 0, count);

  let outcome = await callOnce(apiKey, fields, count);
  if ("failed" in outcome && outcome.failed === "format") {
    outcome = await callOnce(apiKey, fields, count);
  }

  const latencyMs = Date.now() - started;
  if ("failed" in outcome) return fallbackResult(outcome.failed, latencyMs, count);
  return { questions: outcome.questions, source: "ai", reason: "ok", latencyMs };
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
