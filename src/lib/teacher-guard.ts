import "server-only";

import { fail } from "./api";
import { readTeacherSession, type TeacherSessionPayload } from "./session";

/**
 * 교사 전용 Route Handler 앞단. 세션이 없으면 401을 그대로 반환한다.
 *
 * 사용:
 *   const me = await requireTeacher();
 *   if (!isTeacher(me)) return me;   // Response
 */
export async function requireTeacher(): Promise<TeacherSessionPayload | Response> {
  const me = await readTeacherSession();
  if (!me) return fail("unauthorized");
  return me;
}

export function isTeacher(
  value: TeacherSessionPayload | Response,
): value is TeacherSessionPayload {
  return !(value instanceof Response);
}
