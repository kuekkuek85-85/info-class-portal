import "server-only";

import { NextResponse } from "next/server";

/** API 응답 헬퍼. 클라이언트는 { ok, ... } 또는 { ok: false, error } 형태만 본다. */

export type ApiError =
  | "invalid_input"
  | "code_not_found"
  | "class_mismatch"
  | "student_not_found"
  | "no_code_token"
  | "session_expired"
  | "unauthorized"
  | "not_found"
  | "too_many_attempts"
  | "not_configured"
  | "server_error";

const STATUS: Record<ApiError, number> = {
  invalid_input: 400,
  code_not_found: 404,
  class_mismatch: 403,
  student_not_found: 404,
  no_code_token: 401,
  session_expired: 401,
  unauthorized: 401,
  not_found: 404,
  too_many_attempts: 429,
  not_configured: 503,
  server_error: 500,
};

/** 학생에게 그대로 보여줄 수 있는 한국어 문구. 중1이 읽고 다음 행동을 알 수 있어야 한다. */
const MESSAGES: Record<ApiError, string> = {
  invalid_input: "입력한 내용을 다시 확인해 주세요.",
  code_not_found: "그런 수업 코드는 없어요. 칠판의 번호를 다시 확인해 주세요.",
  class_mismatch: "이 코드는 다른 반 수업 코드예요. 우리 반 코드를 확인해 주세요.",
  student_not_found: "명단에서 학번을 찾지 못했어요. 선생님께 손을 들어 알려 주세요.",
  no_code_token: "수업 코드부터 다시 입력해 주세요.",
  session_expired: "접속이 만료되었어요. 수업 코드부터 다시 입력해 주세요.",
  unauthorized: "권한이 없습니다.",
  not_found: "요청한 자료를 찾을 수 없습니다.",
  too_many_attempts: "너무 많이 시도했어요. 잠시 뒤에 다시 해 주세요.",
  not_configured: "서버 설정이 끝나지 않았습니다. 선생님께 알려 주세요.",
  server_error: "문제가 생겼어요. 잠시 뒤에 다시 시도해 주세요.",
};

export function ok<T extends Record<string, unknown>>(data: T = {} as T) {
  return NextResponse.json({ ok: true, ...data });
}

export function fail(error: ApiError, detail?: string) {
  return NextResponse.json(
    { ok: false, error, message: detail ?? MESSAGES[error] },
    { status: STATUS[error] },
  );
}

/** Route Handler를 감싸 예상 못 한 예외가 스택 트레이스째 노출되는 것을 막는다. */
export async function guard(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[api]", message);

    // 환경변수 누락은 배포 직후 흔한 실수라 따로 구분해 알려 준다.
    if (message.includes("환경변수")) {
      return fail("not_configured", message);
    }
    return fail("server_error");
  }
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/**
 * 아주 단순한 인메모리 시도 횟수 제한.
 *
 * 서버리스에서는 인스턴스마다 카운터가 따로 놀기 때문에 정확한 방어가 아니다.
 * 한 반 28명 규모에서 학번을 눌러 이름을 훑어보는 정도를 늦추는 용도이고,
 * 진짜 방어선은 "코드를 맞춘 사람만 학번 화면에 도달한다"는 동선 자체다 (PRD 3.1).
 */
const attempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;

  entry.count += 1;
  return true;
}

export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  return `${scope}:${ip}`;
}
