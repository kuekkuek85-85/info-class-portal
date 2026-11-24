import { fail, guard, ok } from "@/lib/api";
import {
  getArtifact,
  getReflection,
  getSession,
  isSessionClosed,
  setAttendanceStepReview,
  updateArtifact,
} from "@/lib/db";
import { activityIdFor } from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";
import { checkSteps } from "@/lib/step-review";

/**
 * 단계별 교사 검토 - 학생 쪽 (activity.stepReview 를 켠 차시만, 33차 수행평가).
 *
 *  GET  → 내 검토 상태 { requestedAt, feedback } (8초 폴링, 검토를 요청한 학생만 부른다)
 *  POST → 「선생님께 검토 받기」: 성찰 제출 + 단계마다 최소 분량을 서버가 다시 세고, 되면 요청 시각을 남긴다.
 *
 * 선생님이 답하면(잘했어요든 피드백이든) 학생 화면에서 보상 게임이 열린다.
 */

async function load() {
  const me = await readStudentSession();
  if (!me) return { error: fail("session_expired") };
  const session = await getSession(me.sessionId);
  if (!session) return { error: fail("session_expired") };
  const config = session.activity?.stepReview;
  if (!config) return { error: fail("not_found") };
  const activityId = activityIdFor(session);
  const artifact = activityId ? await getArtifact(activityId, me.studentId) : null;
  return { error: null, me, session, config, artifact };
}

export async function GET() {
  return guard(async () => {
    const loaded = await load();
    if (loaded.error) return loaded.error;
    const { artifact } = loaded;
    return ok({
      requestedAt: artifact?.stepReviewRequestedAt ?? null,
      feedback: artifact?.stepFeedback ?? null,
    });
  });
}

export async function POST() {
  return guard(async () => {
    const loaded = await load();
    if (loaded.error || !loaded.session) return loaded.error ?? fail("not_found");
    const { me, session, config, artifact } = loaded;
    if (isSessionClosed(session)) return fail("session_expired", "이 수업은 끝났어요.");
    if (!artifact) return fail("invalid_input", "먼저 단계마다 답을 써 주세요.");

    // 성찰을 먼저 낸다(자동 임시저장 draft 는 제출이 아니다)
    const reflection = await getReflection(session.id, me.studentId);
    const reflected = reflection && !reflection.draft && reflection.answers.some((a) => a.trim());
    if (!reflected) return fail("invalid_input", "먼저 위의 성찰을 쓰고 「제출하기」를 눌러 주세요.");

    const checks = checkSteps(config, artifact.answers ?? {});
    const short = checks.filter((c) => c.missing.length > 0);
    if (short.length > 0) {
      return fail(
        "invalid_input",
        `아직 덜 쓴 단계가 있어요: ${short.map((c) => c.label).join(", ")}`,
      );
    }

    const now = Date.now();
    await updateArtifact(artifact.id, { stepReviewRequestedAt: now });
    await setAttendanceStepReview(session.id, me.studentId, { stepReviewRequestedAt: now });
    return ok({ requestedAt: now, feedback: artifact.stepFeedback ?? null });
  });
}
