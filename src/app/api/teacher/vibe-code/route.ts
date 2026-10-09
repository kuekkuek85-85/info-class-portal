import { fail, guard, ok } from "@/lib/api";
import { getSession, listArtifacts, studentNameMap } from "@/lib/db";
import { activityIdFor, displayName } from "@/lib/gallery";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import type { WorksheetQuestion } from "@/lib/types";
import type { VibeCodeLog } from "@/lib/vibe-code";

/**
 * 교사용 — 바이브 코딩 프롬프트·AI 답 열람 (읽기 전용).
 *
 * 학생이 AI에게 보낸 프롬프트와 받은 코드·설명을 이 세션(반)의 학생별로 모아 돌려준다. 학생 화면에
 * "선생님이 볼 수 있어요" 를 이미 띄우고 있으므로(투명성), 교사가 여기서 무엇을 요청했는지 확인한다.
 *
 * ## 이 세션(반)의 것만
 *
 * 활동 통(activityId)은 여러 차시가 이어 쓸 수 있어 classNo 로 이 세션 학생만 좁힌다. 기록은 학생
 * 본인 아티팩트에서만 읽는다 — 친구에게 나가는 경로가 없다. 자동 폴링 대상이 아니다(교사가 열 때만).
 */
export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const sessionId = (new URL(request.url).searchParams.get("sessionId") ?? "").trim();
    if (!sessionId) return fail("invalid_input");

    const session = await getSession(sessionId);
    if (!session) return fail("not_found");

    const activityId = activityIdFor(session);
    if (!activityId) return ok({ rows: [] });

    const keys = (session.activity?.worksheet ?? [])
      .filter((q: WorksheetQuestion) => q.kind === "vibe_code")
      .map((q) => q.key);
    if (keys.length === 0) return ok({ rows: [] });

    const artifacts = await listArtifacts(activityId, session.classNo);
    const names = await studentNameMap(artifacts.map((a) => a.studentId));

    const rows: {
      studentId: string;
      name: string;
      key: string;
      entries: { prompt: string; code: string; explanation: string; at: number }[];
      updatedAt: number;
    }[] = [];

    for (const artifact of artifacts) {
      for (const key of keys) {
        const raw = artifact.answers?.[key];
        if (!raw?.trim()) continue;
        let log: VibeCodeLog;
        try {
          log = JSON.parse(raw) as VibeCodeLog;
        } catch {
          continue;
        }
        if (!Array.isArray(log.entries) || log.entries.length === 0) continue;
        rows.push({
          studentId: artifact.studentId,
          name: displayName(names.get(artifact.studentId)),
          key,
          entries: log.entries,
          updatedAt: log.updatedAt ?? 0,
        });
      }
    }

    // 최근에 쓴 학생부터.
    rows.sort((a, b) => b.updatedAt - a.updatedAt);

    return ok({ rows });
  });
}
