import { fail, guard, ok, readJson } from "@/lib/api";
import { adminAuth } from "@/lib/firebase-admin";
import {
  clearTeacherSession,
  createTeacherSession,
  isAllowedTeacher,
  readTeacherSession,
} from "@/lib/session";

/**
 * 교사 로그인. 학생 동선과 완전히 분리된 경로다 (PRD 4).
 *
 * 클라이언트가 Firebase Auth Google 로그인으로 받은 ID 토큰을 보내면,
 * 서버가 검증하고 허용 이메일 목록과 대조한 뒤 자체 세션 쿠키를 발급한다.
 * Firebase Auth는 "누구인지" 확인에만 쓰고, 권한 판단은 서버가 한다.
 */
export async function POST(request: Request) {
  return guard(async () => {
    const body = await readJson<{ idToken?: string }>(request);
    if (!body?.idToken) return fail("invalid_input");

    const decoded = await adminAuth().verifyIdToken(body.idToken).catch(() => null);
    if (!decoded) return fail("unauthorized", "로그인 정보를 확인하지 못했습니다.");

    if (!isAllowedTeacher(decoded.email)) {
      return fail(
        "unauthorized",
        "허용된 교사 계정이 아닙니다. 환경변수 TEACHER_EMAILS 를 확인하세요.",
      );
    }

    await createTeacherSession({
      uid: decoded.uid,
      email: decoded.email ?? "",
      name: decoded.name ?? decoded.email ?? "교사",
    });

    return ok({ email: decoded.email, name: decoded.name ?? "" });
  });
}

export async function GET() {
  return guard(async () => {
    const me = await readTeacherSession();
    if (!me) return fail("unauthorized");
    return ok({ email: me.email, name: me.name });
  });
}

export async function DELETE() {
  return guard(async () => {
    await clearTeacherSession();
    return ok();
  });
}
