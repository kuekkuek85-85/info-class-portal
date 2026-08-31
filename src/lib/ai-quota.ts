import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { COLLECTIONS } from "./db";
import { db } from "./firebase-admin";

/**
 * AI 호출 상한 — 돈이 나가는 자리라 Firestore 로 센다.
 *
 * ## 왜 메모리로 세면 안 되는가
 *
 * 원래 라우트가 모듈 안의 `Map` 으로 셌다. `src/lib/api.ts` 의 `rateLimit` 도 같은
 * 방식이고, 그쪽 주석에도 적혀 있듯 **서버리스에서는 인스턴스마다 카운터가 따로 논다.**
 * 코드 오입력을 늦추는 데는 충분하지만, 상한이 곧 비용인 자리에서는 못 쓴다 —
 * 한 학생이 연타하면 요청이 인스턴스마다 흩어지며 그대로 통과한다.
 *
 * ## 먼저 올리고 나서 부른다
 *
 * 트랜잭션으로 올린 다음 Gemini 를 부른다. 부르고 나서 올리면, 연타한 요청 둘이
 * 같은 값을 읽고 둘 다 통과한다. 실패해도 **되돌리지 않는다** — 되돌리는 코드가
 * 곧 무한 재시도의 입구다. 한 번 실패한 학생은 두 번 남은 것으로 친다.
 *
 * ## 두 겹으로 건다
 *
 * 개인 상한만 걸면 스물두 명이 각자 세 번씩 써서 예상 밖으로 새는 것은 못 막는다.
 * 세션 총량을 함께 두고, 넘으면 그 시점부터 전원 고정 질문으로 내려간다.
 * **비용이 새는 것보다 질문이 고정 질문인 편이 낫다.**
 *
 * ## 같은 문서가 교사 화면의 집계이기도 하다
 *
 * 총량 문서에 성공·폴백 수를 같이 얹는다. 대시보드는 20초마다 도는데, 여기에
 * 로그 컬렉션을 훑는 질의를 붙이면 읽기 수가 그대로 곱해진다 (PRD 10장 D2).
 * 문서 하나만 읽으면 끝나게 해 둔다.
 */

const COLLECTION = COLLECTIONS.aiQuota;

/** 1인 1차시 상한 */
export const PER_STUDENT = 3;
/** 세션 전체 상한. 22명 × 3회 + 여유 */
export const PER_SESSION = 80;

export interface QuotaClaim {
  /** 불러도 되는가 */
  allowed: boolean;
  /** 이 학생에게 남은 횟수 (이번 것을 뺀 값) */
  left: number;
  /** 막혔다면 개인 상한인가 세션 총량인가 */
  blockedBy?: "student" | "session";
}

function totalRef(sessionId: string) {
  return db().collection(COLLECTION).doc(`${sessionId}__total`);
}

function studentRef(sessionId: string, studentId: string) {
  return db().collection(COLLECTION).doc(`${sessionId}__${studentId}`);
}

/**
 * 한 번 부를 자리를 잡는다. 잡히면 카운터가 이미 올라간 상태로 돌아온다.
 *
 * 상한에 걸렸을 때는 올리지 않는다 — 막힌 요청까지 세면 총량이 실제 호출 수를
 * 넘어서고, 교사 화면의 "남은 쿼터" 가 거짓말을 한다.
 */
export async function claimAiCall(sessionId: string, studentId: string): Promise<QuotaClaim> {
  const mine = studentRef(sessionId, studentId);
  const total = totalRef(sessionId);

  return db().runTransaction(async (tx) => {
    // 트랜잭션 안의 읽기는 쓰기보다 먼저 다 끝내야 한다 (Firestore 규칙)
    const [mineSnap, totalSnap] = await Promise.all([tx.get(mine), tx.get(total)]);
    const used = (mineSnap.data()?.count as number | undefined) ?? 0;
    const spent = (totalSnap.data()?.count as number | undefined) ?? 0;

    if (used >= PER_STUDENT) return { allowed: false, left: 0, blockedBy: "student" as const };
    if (spent >= PER_SESSION) {
      return { allowed: false, left: PER_STUDENT - used, blockedBy: "session" as const };
    }

    const now = Date.now();
    tx.set(mine, { sessionId, count: FieldValue.increment(1), updatedAt: now }, { merge: true });
    tx.set(total, { sessionId, count: FieldValue.increment(1), updatedAt: now }, { merge: true });

    return { allowed: true, left: PER_STUDENT - used - 1 };
  });
}

/**
 * 결과가 어디서 왔는지 세션 총량 문서에 얹는다.
 *
 * 교사가 수업 중에 보는 것은 이 두 숫자다 — 폴백이 절반을 넘으면 AI 를 접고
 * 전자칠판에 프롬프트를 띄우는 쪽으로 3분 안에 판단한다.
 */
export async function tallyOutcome(sessionId: string, source: "ai" | "fallback"): Promise<void> {
  await totalRef(sessionId).set(
    { sessionId, [source]: FieldValue.increment(1), updatedAt: Date.now() },
    { merge: true },
  );
}

export interface QuotaSummary {
  ok: number;
  fallback: number;
  /** 세션 총량에서 남은 횟수 */
  left: number;
}

/** 교사 대시보드용. 문서 하나만 읽는다 */
export async function readQuotaSummary(sessionId: string): Promise<QuotaSummary> {
  const snap = await totalRef(sessionId).get();
  const data = snap.data() ?? {};
  const spent = (data.count as number | undefined) ?? 0;
  return {
    ok: (data.ai as number | undefined) ?? 0,
    fallback: (data.fallback as number | undefined) ?? 0,
    left: Math.max(0, PER_SESSION - spent),
  };
}
