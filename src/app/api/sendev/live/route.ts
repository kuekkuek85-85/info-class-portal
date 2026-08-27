import { fail, guard, ok, readJson } from "@/lib/api";
import { db } from "@/lib/firebase-admin";

/**
 * 나눔 세션 — 지금 어느 슬라이드인가.
 *
 * 진행자가 넘기면 프로젝터·강사 노트북·참가자 휴대폰이 함께 움직여야 한다. 기기를
 * 넘나드는 상태라 브라우저 메모리로는 안 되고 서버를 거쳐야 한다.
 *
 * ## 읽기 비용
 *
 * 열두 명이 2초마다 물으면 시간당 2만 건이 넘는다. 무료 한도(하루 5만)를 저녁 한 번에
 * 태울 수 있다. 그래서 **서버가 잠깐 들고 있는다** — 학생 화면 단계 폴링이 쓰는 것과
 * 같은 수법이다 (db.ts 의 getSessionCached). 캐시가 1.5초만 있어도 Firestore 읽기는
 * 사람 수와 무관하게 초당 한 건 아래로 떨어진다.
 *
 * ## 아무나 넘기지 못하게
 *
 * 주소만 알면 POST 를 보낼 수 있으니, 넘기는 요청에는 입장 코드를 함께 받는다.
 * 금고 자물쇠는 아니고 **장난을 막는 걸쇠**다 — 참가자가 실수로 남의 화면을 넘기는
 * 일만 없으면 된다.
 */

/** 행사 하나짜리 문서. 학교 데이터와 컬렉션부터 분리한다 */
const COLLECTION = "sendevLive";
const DOC = "now";

const CACHE_MS = 1500;
let cache: { at: number; value: LiveState } | null = null;

interface LiveState extends Record<string, unknown> {
  slide: number;
  /** 눌러서 연 것들 (퀴즈 정답·순차 공개). 슬라이드가 뜻을 정한다 */
  revealed: string[];
  /** 현장에서 쳐 넣는 수상자 이름. 참가자 휴대폰에도 같이 떠야 한다 */
  names: { champion: string; grit: string };
  updatedAt: number;
}

const EMPTY: LiveState = {
  slide: 0,
  revealed: [],
  names: { champion: "", grit: "" },
  updatedAt: 0,
};

export async function GET() {
  return guard(async () => {
    if (cache && Date.now() - cache.at < CACHE_MS) return ok(cache.value);

    const snap = await db().collection(COLLECTION).doc(DOC).get();
    const value = snap.exists ? ({ ...EMPTY, ...snap.data() } as LiveState) : EMPTY;
    cache = { at: Date.now(), value };
    return ok(value);
  });
}

export async function POST(request: Request) {
  return guard(async () => {
    const body = await readJson<{
      code?: string;
      slide?: number;
      revealed?: string[];
      names?: { champion?: string; grit?: string };
    }>(request);
    if (!body) return fail("invalid_input");

    const expected = process.env.NEXT_PUBLIC_SENDEV_CODE ?? "";
    if (!expected || body.code !== expected) return fail("session_expired", "코드가 다릅니다.");

    const value: LiveState = {
      slide: Math.max(0, Math.min(99, Math.trunc(Number(body.slide) || 0))),
      revealed: Array.isArray(body.revealed)
        ? body.revealed.filter((k) => typeof k === "string").slice(0, 40)
        : [],
      names: {
        champion: String(body.names?.champion ?? "").slice(0, 20),
        grit: String(body.names?.grit ?? "").slice(0, 20),
      },
      updatedAt: Date.now(),
    };

    await db().collection(COLLECTION).doc(DOC).set(value);
    // 방금 쓴 값을 바로 캐시에 넣는다 — 넘긴 직후 1.5초 동안 옛 슬라이드가 나가면 안 된다
    cache = { at: Date.now(), value };

    return ok(value);
  });
}
