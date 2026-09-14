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
import type { ActivityContent, ClassSession } from "@/lib/types";

/**
 * "내 앱 소개 최종 수정" 팝업 전용 라우트.
 *
 * 차시를 지나며 기획이 바뀌어, 동료 검토 카드에 뜨는 소개 문구(누구의 불편·한 줄 소개·기능)가
 * 지금 생각과 다른 학생이 많다. 검토를 시작할 때 자기 소개 칸을 프리필한 편집 모달로 띄워,
 * 고치거나 그대로 두고 내면 그 값이 검토 카드에 반영되게 한다. 앱 링크(build_url)는
 * 이전 차시에 낸 그대로 가져오고, 여기서 고치는 것은 소개 문구뿐이다.
 *
 *  · GET  — 팝업이 필요한지 판단할 재료: enabled·active(검토 시점 게이팅)·submitted·fields.
 *  · POST — reviewDescribe.fields 의 key **화이트리스트만** 받아 answers 에 병합 저장한다.
 *
 * 저장은 progress-check 라우트와 같은 자립형이다 — 화이트리스트한 그 키들 + 제출 마커(rv_done)
 * 만 병합해 다른 답을 건드리지 않는다. reviewDescribe 가 없는 차시에서는 GET 이 enabled=false
 * 를 주어 팝업이 아예 안 뜬다(다른 차시·과목 무영향).
 *
 * 기존 /api/student/artifact POST 는 활동지(worksheet)에 없는 키를 버리는데, 이 소개 칸들은
 * hai5 에서 echo·검토용으로만 쓰고 worksheet 문항이 아니라 그 경로로는 저장이 안 된다. 그래서
 * 이 전용 라우트가 필요하다.
 *
 * 공유되는 답이므로 위기 신호 검사는 감상 라우트(gallery)의 checkCrisis 가 그대로 맡는다 —
 * 카드를 그릴 때 공유 키를 검사하므로, 여기서 덮어쓴 값도 같은 문턱을 지난다.
 */

/** 제출 마커 키. answers 에 "1" 로 남겨 팝업 재출현을 막는다 (progress-check 의 progress_* 와 같은 방식) */
const DONE_KEY = "rv_done";

/** 한 칸이 저장할 수 있는 글자 수 상한. maxLength 를 안 정한 칸의 기본값과, 정한 칸의 천장 */
const DEFAULT_MAX = 200;
const MAX_CAP = 500;

function clampMax(value?: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.min(Math.trunc(value), MAX_CAP);
  }
  return DEFAULT_MAX;
}

/**
 * 지금이 "검토 시점" 인가 — 게이팅.
 *
 * 팝업은 수업 시작이 아니라 검토를 시작할 때 떠야 한다(자기 앱을 다 고친 뒤 최종 소개를
 * 정리하는 흐름). 세션의 현재 단계(session.phase — 교사가 넘긴다)를 reviewDescribe.phases
 * 에 맞춰 판단한다. phases 를 안 정했으면 active 동안 항상 켠다(기본).
 */
function inReviewPhase(
  session: ClassSession,
  config: NonNullable<ActivityContent["reviewDescribe"]>,
): boolean {
  const phases = config.phases;
  if (!Array.isArray(phases) || phases.length === 0) return true;
  return phases.includes(session.phase);
}

function configOf(session: ClassSession): NonNullable<ActivityContent["reviewDescribe"]> | null {
  const config = session.activity?.reviewDescribe;
  if (!config?.enabled || !Array.isArray(config.fields) || config.fields.length === 0) return null;
  return config;
}

export async function GET(): Promise<Response> {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSessionCached(me.sessionId);
    if (!session) return fail("session_expired");

    const config = configOf(session);
    // 팝업을 켜지 않은 차시 — 화면이 아무것도 안 하게 enabled 를 끈다
    if (!config) {
      return ok({ enabled: false, active: false, submitted: false, fields: [] });
    }

    const active =
      session.status === "active" && !isSessionClosed(session) && inReviewPhase(session, config);

    const activityId = activityIdFor(session);
    const artifact = activityId ? await getArtifact(activityId, me.studentId) : null;
    const answers = artifact?.answers ?? {};
    const submitted = String(answers[DONE_KEY] ?? "") === "1";

    // fields 정의에 현재 answers 값을 채워 준다 (프리필용)
    const fields = config.fields.map((field) => ({
      key: field.key,
      label: field.label,
      value: String(answers[field.key] ?? ""),
      maxLength: clampMax(field.maxLength),
      multiline: field.multiline === true,
    }));

    return ok({ enabled: true, active, submitted, fields });
  });
}

export async function POST(request: Request): Promise<Response> {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSessionCached(me.sessionId);
    if (!session) return fail("session_expired");
    if (isSessionClosed(session)) return fail("session_expired", "수업이 끝나서 저장할 수 없어요.");

    const config = configOf(session);
    if (!config) return fail("not_found", "이 수업에는 앱 소개 수정이 없어요.");

    const body = await readJson<{ answers?: Record<string, unknown> }>(request);
    if (!body || typeof body.answers !== "object" || body.answers === null) {
      return fail("invalid_input");
    }

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");

    const artifact = await ensureArtifact({
      activityId,
      studentId: me.studentId,
      classNo: session.classNo,
      year: session.activity?.year ?? 2026,
    });

    /*
     * reviewDescribe.fields 의 key 화이트리스트만 받는다 — 임의 키가 문서에 쌓이는 것을 막는다.
     * 값은 그 칸의 maxLength 로 자른다. 이 키들 + 제출 마커만 병합해 다른 답은 건드리지 않는다
     * (updateArtifact 는 set merge:true — progress-check 와 같은 병합).
     */
    const allowed = new Map(config.fields.map((field) => [field.key, field]));
    const incoming = body.answers as Record<string, unknown>;
    const merged: Record<string, string> = {};
    for (const [key, raw] of Object.entries(incoming)) {
      const field = allowed.get(key);
      if (!field) continue; // 화이트리스트 밖 — 버린다
      merged[key] = String(raw ?? "").slice(0, clampMax(field.maxLength));
    }
    merged[DONE_KEY] = "1";

    await updateArtifact(artifact.id, { answers: merged });

    return ok({ submitted: true });
  });
}
