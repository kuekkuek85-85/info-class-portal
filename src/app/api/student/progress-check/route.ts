import { fail, guard, ok, readJson } from "@/lib/api";
import {
  ensureArtifact,
  getArtifact,
  getSessionCached,
  isSessionClosed,
  updateArtifact,
} from "@/lib/db";
import { activityIdFor } from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";

/**
 * 진도 체크 팝업 (도우미 선발 속도 체크).
 *
 * 수업 시작 기준 정해진 분(progressChecks.minutes)에 학생 화면에 팝업을 띄워 "지금 어느
 * 단계 몇 번째 미션인지" 기록하게 한다. 이 라우트는 그 팝업 전용이다:
 *
 *  · GET  — 팝업이 필요한지 판단할 재료를 준다: active·startedAt·progressChecks·이미 답한 마크.
 *  · POST — 한 마크의 답(단계·미션 번호)을 작품 answers 의 `progress_<분>` 키에 저장한다.
 *
 * 답은 기존 answers 경로(작품 문서)에 담는다 — 대시보드가 작품을 읽어 시각별 스냅샷을
 * 만든다. 활동지 자동저장과 달리 **그 한 키만 병합**해 다른 답을 건드리지 않는다.
 * progressChecks 가 없는 차시에서는 GET 이 config 를 null 로 주어 팝업이 아예 안 뜬다.
 */

/** 답 키: progress_<분> (예: progress_20) */
function markKey(minute: number): string {
  return `progress_${minute}`;
}

export async function GET(): Promise<Response> {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSessionCached(me.sessionId);
    if (!session) return fail("session_expired");

    const config = session.progressChecks ?? null;
    // 팝업을 켜지 않은 차시 — 화면이 아무것도 안 하게 config 를 비운다
    if (!config || !Array.isArray(config.minutes) || config.minutes.length === 0) {
      return ok({ active: false, startedAt: 0, progressChecks: null, answered: [] });
    }

    const active = session.status === "active" && !isSessionClosed(session);
    const startedAt = session.startedAt ?? 0;

    // 이미 답한 마크 — 작품 answers 에서 progress_* 키를 읽는다 (팝업 재출현 방지)
    const activityId = activityIdFor(session);
    const artifact = activityId ? await getArtifact(activityId, me.studentId) : null;
    const answered = config.minutes.filter((m) => {
      const raw = artifact?.answers?.[markKey(m)];
      return typeof raw === "string" && raw.trim().length > 0;
    });

    return ok({
      active,
      startedAt,
      progressChecks: { minutes: config.minutes, stages: config.stages ?? [] },
      answered,
    });
  });
}

export async function POST(request: Request): Promise<Response> {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSessionCached(me.sessionId);
    if (!session) return fail("session_expired");
    if (isSessionClosed(session)) return fail("session_expired", "수업이 끝나서 저장할 수 없어요.");

    const config = session.progressChecks ?? null;
    if (!config) return fail("not_found", "이 수업에는 진도 체크가 없어요.");

    const startedAt = session.startedAt ?? 0;
    if (startedAt <= 0) return fail("invalid_input", "수업이 아직 시작되지 않았어요.");

    const body = await readJson<{ minute?: unknown; stage?: unknown; mission?: unknown }>(request);
    if (!body) return fail("invalid_input");

    const minute = Number(body.minute);
    if (!Number.isInteger(minute) || !config.minutes.includes(minute)) {
      return fail("invalid_input", "진도 체크 시각이 올바르지 않습니다.");
    }
    // 아직 도래하지 않은 마크는 미리 채우지 못하게 막는다 (1분 여유)
    const elapsedMin = (Date.now() - startedAt) / 60000;
    if (elapsedMin < minute - 1) return fail("invalid_input", "아직 그 시각이 되지 않았어요.");

    const stage = typeof body.stage === "string" ? body.stage : "";
    if (!(config.stages ?? []).includes(stage)) {
      return fail("invalid_input", "단계를 다시 골라 주세요.");
    }

    const mission = Number(body.mission);
    if (!Number.isInteger(mission) || mission < 1 || mission > 99) {
      return fail("invalid_input", "미션 번호를 1~99 로 적어 주세요.");
    }

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");

    const artifact = await ensureArtifact({
      activityId,
      studentId: me.studentId,
      classNo: session.classNo,
      year: session.activity?.year ?? 2036,
    });

    const key = markKey(minute);
    // 한 번 답한 마크는 덮지 않는다 — 처음 낸 진도를 그대로 둔다
    if (typeof artifact.answers?.[key] === "string" && artifact.answers[key].trim()) {
      return ok({ minute, alreadyAnswered: true });
    }

    const value = JSON.stringify({ stage, mission, at: Date.now() });
    // 그 한 키만 병합해 다른 답을 건드리지 않는다 (updateArtifact 는 set merge:true)
    await updateArtifact(artifact.id, { answers: { [key]: value } });

    return ok({ minute });
  });
}
