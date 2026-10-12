import { deviceKey, fail, guard, ok, rateLimit, readJson } from "@/lib/api";
import { clearTeacherSession, createTeacherSession, readTeacherSession } from "@/lib/session";

/**
 * 교사 로그인 — 6자리 교사 핀.
 *
 * Google 로그인에서 전환(2026-10-13): firebaseapp.com 인증 도메인 장애로 긴급 교체.
 * 핀은 **서버에서만** 검증한다 — 클라이언트 번들에 노출되지 않는다. 무차별 대입은 기기 기준
 * 횟수 제한으로 막는다. 핀이 맞으면 기존과 동일한 교사 세션 쿠키(role: teacher)를 발급하므로,
 * 대시보드·API 의 세션 검사는 그대로 동작한다.
 *
 * 핀은 환경변수 TEACHER_PIN 으로 바꿀 수 있다(없으면 기본값). 운영 시 TEACHER_PIN 설정 권장.
 */
const TEACHER_PIN = (process.env.TEACHER_PIN || "082800").trim();
const TEACHER_EMAIL =
  (process.env.TEACHER_EMAILS ?? "").split(",")[0].trim() || "kuekkuek85@gmail.com";

export async function POST(request: Request) {
  return guard(async () => {
    // 무차별 대입 방지 — 기기 기준 10분에 10회.
    if (!rateLimit(await deviceKey("teacherpin"), 10, 10 * 60_000)) {
      return fail("too_many_attempts", "로그인 시도가 너무 많아요. 잠시 후 다시 시도해 주세요.");
    }

    const body = await readJson<{ pin?: string }>(request);
    const pin = (body?.pin ?? "").trim();
    if (!pin) return fail("invalid_input", "교사 핀을 입력해 주세요.");
    if (pin !== TEACHER_PIN) return fail("unauthorized", "핀이 올바르지 않습니다.");

    await createTeacherSession({ uid: "teacher-pin", email: TEACHER_EMAIL, name: "선생님" });
    return ok({ email: TEACHER_EMAIL, name: "선생님" });
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
