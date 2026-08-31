import { fail, guard, ok, readJson } from "@/lib/api";
import { claimAiCall, tallyOutcome } from "@/lib/ai-quota";
import { fallbackResult, reviewBuild, type ReviewResult } from "@/lib/ai-review";
import { getArtifact, getSession, logAiCall, updateArtifact } from "@/lib/db";
import { activityIdFor } from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";
import type { WorksheetQuestion } from "@/lib/types";

/**
 * AI 검토 — 학생이 지금까지 쓴 답을 모아 Gemini 에게 보내고 질문을 받아 온다.
 *
 * **studentId·이름은 보내지 않는다.** 활동지 답 텍스트만 넘어간다 (개인정보처리방침에
 * 밝힌 범위 그대로 — job-grouping.ts 와 같은 원칙). 학번은 서버가 쿠키에서 꺼내
 * 상한 계산에만 쓰고, 바깥으로 나가지 않는다.
 *
 * ## 학생에게 실패를 보여주지 않는다
 *
 * 예전에는 Gemini 가 죽으면 "조금 뒤에 다시 눌러 보세요" 를 띄웠다. 한 명이 실패할
 * 때는 맞는 문구인데, **학교망이 외부 API 를 막으면 스물두 명이 동시에** 그 문구를
 * 보고 동시에 다시 누른다. 그래서 상한 초과·시간 초과·형식 오류·키 없음 — 무엇이든
 * 고정 질문으로 내려가고, 응답은 항상 성공이다. 어느 경로로 왔는지는 학생 화면에
 * 표시하지 않는다 (ai-review.ts 의 FALLBACK_QUESTIONS 참조).
 *
 * 진짜 실패로 남기는 것은 두 가지뿐이다 — 로그인이 풀렸거나, 아직 아무것도 안 썼거나.
 * 둘 다 학생이 지금 할 수 있는 일이 있는 경우다.
 *
 * ## 상한은 Firestore 로 센다
 *
 * 모듈 안의 Map 으로 세면 서버리스 인스턴스마다 따로 놀아 연타가 그대로 통과한다.
 * 돈이 나가는 자리라 트랜잭션으로 센다 (ai-quota.ts).
 */

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

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");
    const artifact = await getArtifact(activityId, me.studentId);
    if (!artifact) return fail("not_found", "먼저 답을 몇 개 써 주세요.");

    const fields = (question.reviewFields ?? [])
      .map((f) => ({ label: f.label, value: artifact.answers?.[f.key] ?? "" }))
      .filter((f) => f.value.trim());

    /*
     * 여기만은 막아 세운다.
     *
     * 아무것도 안 쓴 채로 부르면 AI 는 백지를 보고 아무 질문이나 만든다. 그건 폴백보다
     * 나쁘다 — 학생이 자기 앱과 상관없는 질문을 받고 "AI 가 이상하다" 로 배운다.
     * 이 경우는 학생이 지금 할 수 있는 일(답을 쓰는 것)이 분명하므로 안내가 맞다.
     */
    if (fields.length === 0) {
      return fail("invalid_input", "검토하려면 먼저 답을 몇 개 써 주세요.");
    }

    const count = question.reviewCount ?? 2;

    /*
     * 부르기 전에 자리를 잡는다. 부르고 나서 세면 연타한 둘이 같은 값을 읽고 통과한다.
     * 실패해도 되돌리지 않는다 — 되돌리는 코드가 곧 무한 재시도의 입구다.
     */
    const claim = await claimAiCall(session.id, me.studentId);
    const result: ReviewResult = claim.allowed
      ? await reviewBuild(fields, count)
      : fallbackResult("quota", 0, count);

    await tallyOutcome(session.id, result.source).catch(() => undefined);
    await logAiCall({
      studentId: me.studentId,
      sessionId: session.id,
      lessonNo: session.lessonNo,
      feature: "ai_review",
      source: result.source,
      reason: result.reason,
      latencyMs: result.latencyMs,
    }).catch(() => undefined);

    /*
     * 남은 횟수는 학생에게 알려 준다. 이건 경로가 아니라 규칙이라 숨길 이유가 없고,
     * 오히려 안 보이면 "몇 번이나 눌러도 되지" 하고 계속 누른다.
     */
    const stored = { questions: result.questions, at: Date.now() };
    await updateArtifact(artifact.id, {
      answers: { ...artifact.answers, [key]: JSON.stringify(stored) },
    });

    return ok({ result: stored, left: claim.left });
  });
}
