import { fail, guard, ok, readJson } from "@/lib/api";
import { saveTypingScore } from "@/lib/db";
import { parseStudentId } from "@/lib/student-id";

/**
 * 타자게임 점수 수신 (12차 도우미 선발) — **공개 엔드포인트**.
 *
 * 타자게임은 별도 세션의 외부 웹앱에서 열린다. 학생이 새 탭에서 학번으로 로그인해 게임을
 * 하고, 끝날 때 그 앱이 여기로 학번·점수를 POST 한다. 포털은 교사 인증 없이 받되, 아래로
 * 오염을 최소화한다:
 *
 *  · key  — env TYPING_SCORE_SECRET 와 일치해야 한다(불일치 401). **저강도 보호**다:
 *           키가 게임 클라이언트에 노출될 수 있다. 그래도 수업용이고, 최종 도우미는 교사가
 *           리더보드를 보고 **수동으로 top7 을 확정**하므로 허용 범위다.
 *  · studentId — 포털 학번 형식(1학년 5자리)만. parseStudentId 로 검증(형식·반·번호 범위).
 *  · score — 외부 값이라 신뢰하지 않는다. 유한수만, 0~100 정수로 clamp. 최고점만 저장.
 *
 * **secret 값 자체는 저장소에 커밋하지 않는다** — .env(.local)/배포 환경변수에만 둔다.
 * .env.example 에는 키 이름만 비워 둔다.
 *
 * 외부 오리진에서 부르므로 CORS 를 연다(공개 엔드포인트). 점수 하나만 받고 형식·범위·
 * 최고점으로 거르므로, 아무 오리진이 불러도 넣을 수 있는 것은 clamp 된 점수뿐이다.
 */

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function withCors(res: Response): Response {
  for (const [key, value] of Object.entries(CORS)) res.headers.set(key, value);
  return res;
}

/** 브라우저 프리플라이트(application/json POST 은 프리플라이트를 부른다) */
export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: Request): Promise<Response> {
  return guard(async () => {
    const secret = process.env.TYPING_SCORE_SECRET;
    // 키가 설정 안 됐으면 아무 점수도 받지 않는다 — 검증할 방법이 없다
    if (!secret) return withCors(fail("not_configured", "타자 점수 저장이 아직 설정되지 않았습니다."));

    const body = await readJson<{ studentId?: unknown; score?: unknown; key?: unknown }>(request);
    if (!body || typeof body !== "object") return withCors(fail("invalid_input"));

    if (typeof body.key !== "string" || body.key !== secret) {
      return withCors(fail("unauthorized"));
    }

    const parsed =
      typeof body.studentId === "string" ? parseStudentId(body.studentId) : null;
    if (!parsed) return withCors(fail("invalid_input", "학번 형식이 올바르지 않습니다."));

    const raw = Number(body.score);
    if (!Number.isFinite(raw)) return withCors(fail("invalid_input", "점수가 숫자가 아닙니다."));
    const score = Math.max(0, Math.min(100, Math.round(raw)));

    await saveTypingScore(parsed.studentId, score);
    return withCors(ok({ studentId: parsed.studentId, score }));
  });
}
