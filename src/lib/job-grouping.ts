import "server-only";

/**
 * 학생이 쓴 직업 이름을 **뜻으로** 묶는다.
 *
 * 글자로 묶으면 "교사"와 "선생님"은 잡아도 "무인매장 관리자"와 "캐셔"는 못 잡는다.
 * 학생이 쓸 말을 미리 다 적어 둘 수 없다는 것이 사전 방식의 한계다.
 *
 * ## 실패해도 수업은 굴러가야 한다
 *
 * AI 가 느리거나 죽으면 집계가 통째로 멈추는 것이 아니라 **글자 기준으로 되돌아간다.**
 * 수업 중에 화면 하나가 비는 것과 덜 묶인 채로 보이는 것은 전혀 다른 문제다.
 *
 * ## 같은 질문에 같은 답이 나와야 한다
 *
 * 15초마다 다시 물으면 느리고, 비싸고, 무엇보다 **막대 순서가 계속 바뀐다.** 교실 앞에
 * 띄워 둔 화면이 스스로 뒤섞이면 읽을 수가 없다. 이름 목록이 그대로면 앞서 받은 답을
 * 그대로 쓴다.
 */

/** 이름 목록이 같으면 다시 묻지 않는다. 서버가 새로 뜨면 비워지고 다시 물으면 그만이다 */
const cache = new Map<string, Map<string, string>>();

/**
 * 이보다 오래 걸리면 기다리지 않고 글자 기준으로 넘어간다.
 *
 * 서른두 개를 묶는 데 실측 6초가 나왔다. 6초로 잡아 두었더니 그 자리에서 잘렸다.
 * 한 반이면 마흔 개까지 갈 수 있어 넉넉히 둔다 — 집계 화면은 15초마다 다시 묻고,
 * 한 번 받은 답은 이름 목록이 그대로인 동안 다시 쓰므로 이 기다림은 처음 한 번뿐이다.
 */
const TIMEOUT_MS = 12_000;

const MODEL = "gemini-flash-latest";

function cacheKey(names: string[]): string {
  return [...names].sort().join("|");
}

function buildPrompt(names: string[]): string {
  return [
    "다음은 중학생이 '미래에 사라질 직업 / 잘 나갈 직업'으로 적은 이름 목록입니다.",
    "같은 직업을 가리키거나 하는 일이 사실상 같은 것끼리 묶어 주세요.",
    "",
    "규칙:",
    "- 하는 일이 다르면 묶지 마세요. 애매하면 따로 두세요.",
    "- 표현만 다른 것은 묶으세요. 예) 교사 · 선생님 · 학교 선생님",
    "- 대표 이름은 **목록 안에 있는 말 중에서** 가장 알아듣기 쉬운 것으로 고르세요.",
    "  목록에 없는 새 이름을 만들지 마세요.",
    "- 입력한 이름이 모두 정확히 한 번씩 어느 묶음엔가 들어가야 합니다.",
    "",
    'JSON만 출력하세요: {"groups":[{"name":"대표","members":["...","..."]}]}',
    "",
    names.map((n) => `- ${n}`).join("\n"),
  ].join("\n");
}

/**
 * 이름 → 대표 이름 표를 만든다.
 *
 * 실패하면 **빈 표**를 돌려준다. 부르는 쪽이 글자 기준으로 넘어가면 된다.
 */
export async function groupJobNames(rawNames: string[]): Promise<Map<string, string>> {
  const names = [...new Set(rawNames.map((n) => n.replace(/\s+/g, " ").trim()).filter(Boolean))];
  // 하나뿐이면 물어볼 것이 없다
  if (names.length < 2) return new Map();

  const key = cacheKey(names);
  const hit = cache.get(key);
  if (hit) return hit;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return new Map();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(names) }] }],
          // temperature 0 — 같은 목록에 같은 답이 나와야 막대가 안 뒤섞인다
          generationConfig: { temperature: 0, responseMimeType: "application/json" },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) return new Map();

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(text) as { groups?: { name?: string; members?: string[] }[] };

    const map = new Map<string, string>();
    const known = new Set(names);

    for (const group of parsed.groups ?? []) {
      const members = (group.members ?? []).filter((m) => known.has(m));
      if (members.length === 0) continue;

      /*
       * 대표 이름은 반드시 학생이 쓴 말 중에서 고른다.
       * 모델이 없는 이름을 지어내면(자주 그런다) 화면에 아무도 안 쓴 직업이 뜬다.
       */
      const name = group.name && known.has(group.name) ? group.name : members[0];
      for (const member of members) map.set(member, name);
    }

    // 빠진 이름은 자기 자신으로 — 묶이지 않았을 뿐 사라지면 안 된다
    for (const n of names) if (!map.has(n)) map.set(n, n);

    cache.set(key, map);
    return map;
  } catch {
    // 시간 초과 · 네트워크 오류 · JSON 깨짐 — 무엇이든 글자 기준으로 넘어간다
    return new Map();
  } finally {
    clearTimeout(timer);
  }
}
