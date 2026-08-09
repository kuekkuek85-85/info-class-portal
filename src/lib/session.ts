import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { endOfDayKST } from "./datetime";
import type { ClassNo, CodeTokenPayload, StudentSessionPayload } from "./types";

/**
 * 서명된 HttpOnly 쿠키로 세션을 유지한다.
 *
 * 학생 세션은 당일 자정에 만료된다 (PRD 3.1). 한 차시 동안 재입력이 없어야 하지만,
 * 다음 날까지 살아 있으면 태블릿을 공용으로 쓰는 환경에서 남의 계정으로 들어가게 된다.
 *
 * JWT(HS256)를 Node 내장 crypto 로 직접 만든다. jose 를 쓰면 firebase-admin 이 의존하는
 * jwks-rsa(CommonJS)가 require("jose") 에 실패해 Vercel 함수가 통째로 죽는다
 * (ERR_REQUIRE_ESM). 서명 알고리즘이 HMAC-SHA256 하나뿐이라 라이브러리가 필요 없다.
 */

const STUDENT_COOKIE = "portal_student";
const CODE_COOKIE = "portal_code";
const TEACHER_COOKIE = "portal_teacher";

/** 코드 검증 후 학번 입력까지만 유효. 짧게 잡아 코드 유출 시 노출 범위를 줄인다. */
const CODE_TOKEN_TTL_SECONDS = 10 * 60;
const TEACHER_TTL_SECONDS = 12 * 60 * 60;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "환경변수 SESSION_SECRET 가 없거나 너무 짧습니다 (32자 이상). `openssl rand -base64 32` 등으로 생성하세요.",
    );
  }
  return value;
}

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function hmac(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

async function sign(payload: Record<string, unknown>, expiresAt: Date): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const head = encode({ alg: "HS256", typ: "JWT" });
  const body = encode({ ...payload, iat: now, exp: Math.floor(expiresAt.getTime() / 1000) });
  return `${head}.${body}.${hmac(`${head}.${body}`)}`;
}

async function verify<T>(token: string): Promise<T | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [head, body, signature] = parts;

  // 서명 비교는 길이가 같을 때만 timingSafeEqual 이 동작한다
  const expected = Buffer.from(hmac(`${head}.${body}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    // alg 를 확인하지 않으면 "none" 을 주장하는 토큰을 받아들이게 된다
    const header = JSON.parse(Buffer.from(head, "base64url").toString("utf8"));
    if (header?.alg !== "HS256") return null;

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof payload?.exp === "number" && payload.exp * 1000 <= Date.now()) return null;

    return payload as T;
  } catch {
    return null;
  }
}

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

// ---------------------------------------------------------------- 학생 세션

export async function createStudentSession(payload: StudentSessionPayload): Promise<void> {
  const expiresAt = endOfDayKST();
  const token = await sign({ ...payload }, expiresAt);
  const store = await cookies();
  store.set(STUDENT_COOKIE, token, { ...baseCookieOptions, expires: expiresAt });
}

export async function readStudentSession(): Promise<StudentSessionPayload | null> {
  const store = await cookies();
  const token = store.get(STUDENT_COOKIE)?.value;
  if (!token) return null;

  const payload = await verify<StudentSessionPayload & { exp: number }>(token);
  if (!payload?.studentId || !payload.sessionId) return null;

  return {
    studentId: payload.studentId,
    name: payload.name,
    classNo: payload.classNo as ClassNo,
    sessionId: payload.sessionId,
    temporary: Boolean(payload.temporary),
  };
}

export async function clearStudentSession(): Promise<void> {
  const store = await cookies();
  store.delete(STUDENT_COOKIE);
  store.delete(CODE_COOKIE);
}

// ------------------------------------------------- 코드 토큰 (① → ② 단계)

/**
 * 수업 코드를 맞춘 사람만 학번 조회 화면에 도달하게 하는 단기 토큰.
 * 이 토큰이 없으면 학번 조회 API가 거부되므로, 학번 규칙(10709 형태)을 알아도
 * 아무 번호나 넣어 이름을 조회할 수 없다. (PRD 3.1 "코드를 먼저 받는 이유")
 */
export async function createCodeToken(payload: CodeTokenPayload): Promise<void> {
  const expiresAt = new Date(Date.now() + CODE_TOKEN_TTL_SECONDS * 1000);
  const token = await sign({ ...payload }, expiresAt);
  const store = await cookies();
  store.set(CODE_COOKIE, token, { ...baseCookieOptions, expires: expiresAt });
}

export async function readCodeToken(): Promise<CodeTokenPayload | null> {
  const store = await cookies();
  const token = store.get(CODE_COOKIE)?.value;
  if (!token) return null;

  const payload = await verify<CodeTokenPayload>(token);
  if (!payload?.sessionId) return null;

  return { sessionId: payload.sessionId, classNo: payload.classNo as ClassNo };
}

// ---------------------------------------------------------------- 교사 세션

export interface TeacherSessionPayload {
  uid: string;
  email: string;
  name: string;
}

export async function createTeacherSession(payload: TeacherSessionPayload): Promise<void> {
  const expiresAt = new Date(Date.now() + TEACHER_TTL_SECONDS * 1000);
  const token = await sign({ ...payload, role: "teacher" }, expiresAt);
  const store = await cookies();
  store.set(TEACHER_COOKIE, token, { ...baseCookieOptions, expires: expiresAt });
}

export async function readTeacherSession(): Promise<TeacherSessionPayload | null> {
  const store = await cookies();
  const token = store.get(TEACHER_COOKIE)?.value;
  if (!token) return null;

  const payload = await verify<TeacherSessionPayload & { role?: string }>(token);
  if (payload?.role !== "teacher" || !payload.email) return null;

  return { uid: payload.uid, email: payload.email, name: payload.name };
}

export async function clearTeacherSession(): Promise<void> {
  const store = await cookies();
  store.delete(TEACHER_COOKIE);
}

/** 교사 계정 허용 목록. 쉼표로 구분한 이메일. */
export function allowedTeacherEmails(): string[] {
  return (process.env.TEACHER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedTeacher(email: string | undefined): boolean {
  if (!email) return false;
  const allowed = allowedTeacherEmails();
  // 허용 목록이 비어 있으면 아무도 통과시키지 않는다. 열어두는 쪽이 더 위험하다.
  if (allowed.length === 0) return false;
  return allowed.includes(email.toLowerCase());
}
