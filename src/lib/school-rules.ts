import "server-only";

/**
 * 「우리 학교 상점/벌점 규칙 만들기」 — 전체 학생의 규칙을 하나의 표로 정리한다.
 *
 * 교사가 「규칙 완성하기」를 누르면 서버가 이 분반 학생들의 최종 규칙(rows)을 텍스트 줄로
 * 모아 Gemini 에 보내고, **카테고리별로 묶고 중복을 정리한 하나의 학교 규칙 표**를 받는다.
 *
 * ## 프라이버시
 *
 * - **이름·학번은 보내지 않는다.** 규칙 텍스트(카테고리·항목·상점/벌점·점수)만 넘어간다.
 *   결과에도 저자가 없다 — 통합 "우리 학교 규칙" 이다.
 * - 규칙은 저민감 정보라 감정 글 같은 위기 처리는 없다. 그래도 키·프롬프트는 서버 전용이다.
 *
 * `comfort-bot.ts`·`ai-review.ts` 의 raw fetch 방식을 그대로 따른다(새 SDK 없음).
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const TIMEOUT_MS = 20_000;

export interface RuleItem {
  item: string;
  /** "상점" | "벌점" | "" */
  type: string;
  /** 점수 문자열 (예: "5", "-3", "") */
  score: string;
}
export interface RuleCategory {
  category: string;
  items: RuleItem[];
}

function buildPrompt(ruleLines: string[]): string {
  return [
    "너는 한 중학교의 여러 학생이 제안한 '학교 상점·벌점 규칙' 을 하나로 정리하는 도우미다.",
    "아래는 학생들이 제안한 규칙 목록이다(누가 냈는지는 없다).",
    "",
    "할 일:",
    "- 비슷한 카테고리끼리 묶는다(예: 수업 태도, 배려·존중, 안전, 청소·환경, 봉사 등).",
    "- 뜻이 같거나 겹치는 항목은 하나로 합친다. 표현이 다르면 더 분명한 말로 다듬는다.",
    "- 각 항목이 상점인지 벌점인지 정한다(학생 표시가 있으면 따르고, 없으면 내용으로 판단).",
    "- 점수는 학생들이 적은 값을 참고해 적당한 하나로 정한다. 애매하면 비워 둔다.",
    "- 중학생이 읽을 수 있는 쉬운 말로, 짧고 분명하게 쓴다. 특정 학생을 가리키는 말은 쓰지 않는다.",
    "",
    "JSON만 출력하세요. 형식:",
    '{"table":[{"category":"수업 태도","items":[{"item":"수업 시간에 적극적으로 참여하기","type":"상점","score":"3"}]}]}',
    "",
    "학생들이 제안한 규칙:",
    ...ruleLines.map((line, i) => `${i + 1}. ${line}`),
  ].join("\n");
}

function cleanType(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.includes("상점") || text.toLowerCase().includes("merit")) return "상점";
  if (text.includes("벌점") || text.toLowerCase().includes("demerit")) return "벌점";
  return "";
}

/**
 * 규칙 줄들을 하나의 표로 정리한다. 실패하면 null — 부르는 라우트가 "다시 눌러 보세요" 안내.
 */
export async function compileSchoolRules(ruleLines: string[]): Promise<RuleCategory[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (ruleLines.length === 0) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        // 키는 헤더로 — URL 은 프록시·로그에 남기 쉽다 (gemini-agent 와 같은 이유).
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(ruleLines) }] }],
          generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(rawText) as { table?: unknown };

    const table = (Array.isArray(parsed.table) ? parsed.table : [])
      .map((row) => row as { category?: unknown; items?: unknown })
      .map((row) => ({
        category: typeof row.category === "string" ? row.category.trim() : "",
        items: (Array.isArray(row.items) ? row.items : [])
          .map((it) => it as { item?: unknown; type?: unknown; score?: unknown })
          .filter((it) => typeof it.item === "string" && it.item.trim())
          .map((it) => ({
            item: String(it.item).trim(),
            type: cleanType(it.type),
            score: typeof it.score === "string" ? it.score.trim() : String(it.score ?? "").trim(),
          })),
      }))
      .filter((row) => row.category && row.items.length > 0);

    return table.length > 0 ? table : null;
  } catch {
    // 시간 초과·네트워크·형식 오류 — 무엇이든 실패 하나로 취급한다
    return null;
  } finally {
    clearTimeout(timer);
  }
}
