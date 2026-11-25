import { fail, guard, ok, readJson } from "@/lib/api";
import {
  getArtifact,
  getReflection,
  getSession,
  setAttendanceStepReview,
  studentNameMap,
  updateArtifact,
} from "@/lib/db";
import { activityIdFor } from "@/lib/gallery";
import { checkSteps } from "@/lib/step-review";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import type { StepFeedback } from "@/lib/types";

/**
 * 단계별 교사 검토 - 교사 쪽 (33차 수행평가). 교사 핀 로그인으로만 닿는다.
 *
 *  GET  ?sessionId=&studentId=  → 단계별 산출물·성찰·검토 상태
 *  POST { sessionId, studentId, verdict: "good"|"revise", steps: { [phase]: 말 } } → 단계별 피드백 저장
 *
 * 저장하면 학생 화면이 8초 안에 받아 단계별 피드백 카드를 띄우고, 보상 게임이 열린다.
 */

const MAX_NOTE = 600;

export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const params = new URL(request.url).searchParams;
    const sessionId = (params.get("sessionId") ?? "").trim();
    const studentId = (params.get("studentId") ?? "").trim();
    if (!sessionId || !studentId) return fail("invalid_input");

    const session = await getSession(sessionId);
    const config = session?.activity?.stepReview;
    if (!session || !config) return fail("not_found");

    const activityId = activityIdFor(session);
    const [artifact, reflection, names] = await Promise.all([
      activityId ? getArtifact(activityId, studentId) : Promise.resolve(null),
      getReflection(sessionId, studentId),
      studentNameMap([studentId]),
    ]);
    const answers = artifact?.answers ?? {};
    const labels = new Map(
      (session.activity?.worksheet ?? []).map((q) => [q.key, q.label] as const),
    );

    return ok({
      student: { studentId, name: names.get(studentId)?.name ?? "" },
      steps: config.steps.map((step, index) => ({
        phase: step.phase,
        label: step.label,
        missing: checkSteps(config, answers)[index].missing,
        fields: step.fields.map((f) => ({
          key: f.key,
          label: labels.get(f.key) ?? f.label,
          value: String(answers[f.key] ?? ""),
        })),
      })),
      reflection: {
        questions: session.reflectionQuestions ?? [],
        answers: reflection?.answers ?? [],
        draft: reflection?.draft ?? true,
      },
      requestedAt: artifact?.stepReviewRequestedAt ?? null,
      count: artifact?.stepReviewCount ?? (artifact?.stepReviewRequestedAt ? 1 : 0),
      feedback: artifact?.stepFeedback ?? null,
    });
  });
}

export async function POST(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<{
      sessionId?: string;
      studentId?: string;
      verdict?: string;
      steps?: Record<string, unknown>;
    }>(request);
    const sessionId = (body?.sessionId ?? "").trim();
    const studentId = (body?.studentId ?? "").trim();
    if (!sessionId || !studentId) return fail("invalid_input");

    const session = await getSession(sessionId);
    const config = session?.activity?.stepReview;
    if (!session || !config) return fail("not_found");
    const activityId = activityIdFor(session);
    const artifact = activityId ? await getArtifact(activityId, studentId) : null;
    if (!artifact) return fail("not_found", "이 학생은 아직 쓴 것이 없어요.");

    const phases = new Set(config.steps.map((s) => s.phase as string));
    const steps: Record<string, string> = {};
    for (const [phase, value] of Object.entries(body?.steps ?? {})) {
      const note = String(value ?? "").trim().slice(0, MAX_NOTE);
      if (phases.has(phase) && note) steps[phase] = note;
    }
    const verdict = body?.verdict === "good" ? "good" : "revise";
    if (verdict === "revise" && Object.keys(steps).length === 0) {
      return fail("invalid_input", "「수정해 주세요」는 고칠 단계에 피드백을 한 줄 이상 적어야 보낼 수 있어요.");
    }

    const now = Date.now();
    const feedback: StepFeedback = {
      at: now,
      verdict,
      steps,
      forRequestAt: artifact.stepReviewRequestedAt,
    };
    await updateArtifact(artifact.id, { stepFeedback: feedback });
    await setAttendanceStepReview(sessionId, studentId, { stepReviewedAt: now, stepVerdict: verdict });
    return ok({ saved: true, feedback });
  });
}
