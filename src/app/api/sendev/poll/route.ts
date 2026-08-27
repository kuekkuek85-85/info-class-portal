import { fail, guard, ok, readJson } from "@/lib/api";
import { db } from "@/lib/firebase-admin";

/**
 * 나눔 세션 — 참가자가 휴대폰으로 답하는 것들.
 *
 * ## 한 문서에 다 담는다
 *
 * `{ 질문열쇠: { 참가자열쇠: 값 } }` 한 덩어리다. 답마다 문서를 만들면 화면이 집계할 때
 * 일흔 건씩 읽어야 하고, 2초마다 그러면 저녁 한 번에 무료 한도를 태운다. 한 문서면
 * 몇 명이 보든 읽기는 한 건이고, 서버가 잠깐 들고 있으므로(GET 캐시) 그보다도 적다.
 *
 * 열두 명이 같은 문서에 쓰는 것은 괜찮다. Firestore 가 버거워하는 것은 **한 문서에
 * 초당 한 번 넘게 꾸준히** 쓸 때인데, 여기는 질문 하나에 열두 명이 삼십 초 동안
 * 한 번씩 누르는 정도다.
 *
 * ## 이름을 받지 않는다
 *
 * 참가자 열쇠는 브라우저가 스스로 만든 무작위 문자열이다. 누가 얼마를 내는지 드러나면
 * 월세 질문에 아무도 솔직하게 답하지 않는다. 열쇠는 **같은 사람이 다시 눌렀을 때 답을
 * 덮어쓰기 위한 것**일 뿐이다.
 */

const COLLECTION = "sendevPoll";
const DOC = "now";

/** 슬라이드가 아는 질문만 받는다 — 문서에 아무 필드나 쌓이는 것을 막는다 */
const QUESTIONS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

const CACHE_MS = 1200;
let cache: { at: number; value: PollState } | null = null;

type PollState = Record<string, Record<string, string>>;

export async function GET() {
  return guard(async () => {
    if (cache && Date.now() - cache.at < CACHE_MS) return ok({ poll: cache.value });

    const snap = await db().collection(COLLECTION).doc(DOC).get();
    const value = (snap.exists ? snap.data() : {}) as PollState;
    cache = { at: Date.now(), value };
    return ok({ poll: value });
  });
}

export async function POST(request: Request) {
  return guard(async () => {
    const body = await readJson<{ who?: string; q?: string; value?: string }>(request);
    if (!body?.who || !body.q) return fail("invalid_input");
    if (!QUESTIONS.has(body.q)) return fail("invalid_input");

    // 참가자 열쇠는 우리가 만든 형식만 받는다. 점이 들어가면 필드 경로가 쪼개진다
    const who = String(body.who).replace(/[^a-z0-9]/gi, "").slice(0, 24);
    if (!who) return fail("invalid_input");

    const value = String(body.value ?? "").trim().slice(0, 60);

    await db()
      .collection(COLLECTION)
      .doc(DOC)
      .set({ [body.q]: { [who]: value } }, { merge: true });

    // 방금 쓴 것을 캐시에도 반영한다 — 누른 사람이 자기 답이 안 올라간 화면을 보면 또 누른다
    if (cache) {
      cache.value = {
        ...cache.value,
        [body.q]: { ...(cache.value[body.q] ?? {}), [who]: value },
      };
    }

    return ok();
  });
}

/** 진행자가 다시 시작할 때 — 그 질문의 답을 전부 지운다 */
export async function DELETE(request: Request) {
  return guard(async () => {
    const body = await readJson<{ code?: string; q?: string }>(request);
    const expected = process.env.NEXT_PUBLIC_SENDEV_CODE ?? "";
    if (!expected || body?.code !== expected) return fail("session_expired");
    if (!body.q || !QUESTIONS.has(body.q)) return fail("invalid_input");

    await db()
      .collection(COLLECTION)
      .doc(DOC)
      .set({ [body.q]: {} }, { merge: true });
    cache = null;

    return ok();
  });
}
