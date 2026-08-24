import { fail, guard, ok, readJson } from "@/lib/api";
import { reviewBuild } from "@/lib/ai-review";
import { getArtifact, getSession, logAiCall, updateArtifact } from "@/lib/db";
import { activityIdFor } from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";
import type { WorksheetQuestion } from "@/lib/types";

/**
 * AI 검토 — 학생이 지금까지 쓴 답을 모아 Gemini 에게 보내고, 질문 2개를 받아 온다.
 *
 * **studentId·이름은 보내지 않는다.** 활동지 답 텍스트만 넘어간다 (개인정보처리방침에
 * 밝힌 범위 그대로 — job-grouping.ts 와 같은 원칙).
 *
 * **1인 1차시 3회 상한.** 서버리스 인스턴스마다 카운터가 따로 논다는 한계는 있지만,
 * "몇 번이고 눌러 보는" 행동을 늦추는 것이 목적이다 — 진짜 방어선이 아니라 비용 상한이다.
 */

const LIMIT_PER_SESSION = 3;
const attempts = new Map<string, number>();

export async function POST(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const body = await readJson<{ key?: string }>(request);
    const key = body?.key ?? "";
    const question = (session.activity?.worksheet ?? []).find(
      (q): q is WorksheetQuestion => q.key === key && q.kind === "ai_review",
    );
    if (!question) return fail("not_found");

    const limitKey = `${me.studentId}:${session.id}`;
    const used = attempts.get(limitKey) ?? 0;
    if (used >= LIMIT_PER_SESSION) {
      return fail("too_many_attempts", "오늘은 AI 검토를 다 썼어요. 스스로 한 번 더 살펴봐도 좋아요.");
    }

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");
    const artifact = await getArtifact(activityId, me.studentId);
    if (!artifact) return fail("not_found", "먼저 답을 몇 개 써 주세요.");

    const fields = (question.reviewFields ?? [])
      .map((f) => ({ label: f.label, value: artifact.answers?.[f.key] ?? "" }))
      .filter((f) => f.value.trim());

    if (fields.length === 0) {
      return fail("invalid_input", "검토하려면 먼저 답을 몇 개 써 주세요.");
    }

    attempts.set(limitKey, used + 1);

    const questions = await reviewBuild(fields);
    if (questions.length === 0) {
      return fail("server_error", "AI가 잠시 응답하지 않아요. 조금 뒤에 다시 눌러 보세요.");
    }

    // 사용 기록만 남긴다 — 무엇을 물었는지는 남기지 않는다 (개인정보처리방침 §7)
    await logAiCall({ studentId: me.studentId, lessonNo: session.lessonNo, feature: "ai_review" }).catch(
      () => undefined,
    );

    const result = { questions, at: Date.now() };
    await updateArtifact(artifact.id, {
      answers: { ...artifact.answers, [key]: JSON.stringify(result) },
    });

    return ok({ result });
  });
}
