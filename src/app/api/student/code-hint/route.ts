import { deviceKey, fail, guard, ok, rateLimit, readJson } from "@/lib/api";
import { codeHintAi } from "@/lib/code-hint";
import { getSession, isSessionClosed, logAiCall } from "@/lib/db";
import { readStudentSession } from "@/lib/session";
import type { WorksheetQuestion } from "@/lib/types";

/**
 * code_fill 'AI 도움' — 학생이 한 칸을 틀린 채 도움을 누르면, 그 칸의 정답을 **그대로 알려 주지 않고**
 * 방향만 짚어 주는 힌트를 AI(Gemini)로 받아 돌려준다 (28차 똥피하기).
 *
 * **정답(answer)·설명은 세션 문서에서만 읽는다** — 클라가 보낸 값을 믿지 않는다(위변조 방지).
 * 학번·이름은 Gemini 로 안 보낸다. 결과는 저장하지 않는다(즉석 도움이라 화면에만 띄운다).
 *
 * 요청: { key, token, input } — key=문항 key, token=슬롯 토큰, input=학생이 지금 적은 글자.
 */

const PER_STUDENT = 30;
const PER_DEVICE = 80;
const WINDOW_MS = 60 * 60_000;

export async function POST(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");
    if (isSessionClosed(session)) return fail("session_expired", "이 수업은 끝났어요.");

    const body = await readJson<{ key?: string; token?: string; input?: string }>(request);
    const key = body?.key ?? "";
    const token = body?.token ?? "";
    const input = String(body?.input ?? "");

    const question = (session.activity?.worksheet ?? []).find(
      (q): q is WorksheetQuestion => q.key === key && q.kind === "code_fill",
    );
    const slot = (question?.codeSlots ?? []).find((s) => s.token === token);
    if (!question || !slot || !slot.answer) return fail("not_found");

    // 이미 맞은 칸이면 AI 를 부르지 않는다(뒤 공백만 무시하고 비교).
    const norm = (s: string) =>
      s
        .split("\n")
        .map((l) => l.replace(/\s+$/g, ""))
        .join("\n");
    if (norm(input) === norm(slot.answer)) {
      return ok({ hint: "이미 맞게 적었어요! 그대로 두면 돼요." });
    }

    if (!rateLimit(`codehint:${me.studentId}`, PER_STUDENT, WINDOW_MS)) {
      return fail("too_many_attempts", "도움을 받을 수 있는 횟수를 다 썼어요. 조금 뒤에 다시 해요.");
    }
    if (!rateLimit(await deviceKey("codehint"), PER_DEVICE, WINDOW_MS)) {
      return fail("too_many_attempts", "이 태블릿에서 너무 많이 눌렀어요. 선생님께 알려 주세요.");
    }

    const hint = await codeHintAi({
      label: slot.label,
      hint: slot.hint,
      answer: slot.answer,
      input,
    });
    if (!hint) {
      return fail("server_error", "AI가 잠시 대답하지 못하고 있어요. 조금 뒤에 다시 눌러 보세요.");
    }

    await logAiCall({
      studentId: me.studentId,
      sessionId: session.id,
      lessonNo: session.lessonNo,
      feature: "code_hint",
    }).catch(() => undefined);

    return ok({ hint });
  });
}
