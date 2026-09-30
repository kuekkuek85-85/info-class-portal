import { fail, guard, ok, readJson } from "@/lib/api";
import {
  getSession,
  listAttendance,
  listRelayGroups,
  setupRelayGroups,
  skipRelayTurn,
  studentNameMap,
  updateSession,
} from "@/lib/db";
import { activityIdFor, displayName } from "@/lib/gallery";
import { currentDrawer } from "@/lib/relay";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import type { WorksheetQuestion } from "@/lib/types";

/**
 * 릴레이 그림 — 교사용. GET 은 모든 모둠 상태(제어·관찰), POST 는 동작:
 *  · setup  { groups } — 접속(출석) 학생을 랜덤 N모둠으로 나누고 주제를 뽑는다(기존 모둠 덮음).
 *  · skip   { groupNo } — 그 모둠의 현재 턴을 건너뛴다(결석·막힌 학생 대비).
 *  · reveal { reveal } — 모든 모둠 완성 그림을 학생에게 공개(또는 다시 잠금).
 *
 * 이름·학번은 이 학교 안 협력 활동이라 모둠·턴 표시에 쓴다(감정 글이 아니다). Gemini 미사용.
 */

const MIN_GROUPS = 2;
const MAX_GROUPS = 10;

export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;
    const sessionId = (new URL(request.url).searchParams.get("sessionId") ?? "").trim();
    if (!sessionId) return fail("invalid_input");
    const session = await getSession(sessionId);
    if (!session) return fail("not_found");

    const groups = await listRelayGroups(sessionId);
    return ok({
      reveal: session.relayReveal === true,
      groups: groups.map((g) => ({
        groupNo: g.groupNo,
        topic: g.topic,
        memberNames: g.memberNames,
        turnIndex: g.turnIndex,
        status: g.status,
        image: g.image,
        currentDrawerName:
          currentDrawer(g) !== null ? (g.memberNames[g.turnIndex] ?? "다음 사람") : "",
      })),
    });
  });
}

export async function POST(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<{
      sessionId?: string;
      action?: string;
      groups?: number;
      groupNo?: number;
      reveal?: boolean;
    }>(request);
    const sessionId = (body?.sessionId ?? "").trim();
    if (!sessionId) return fail("invalid_input");
    const session = await getSession(sessionId);
    if (!session) return fail("not_found");

    if (body?.action === "setup") {
      const activityId = activityIdFor(session);
      if (!activityId) return fail("invalid_input", "이 수업에는 활동이 없습니다.");
      const count = Math.max(MIN_GROUPS, Math.min(MAX_GROUPS, Math.trunc(body?.groups ?? 4)));

      // 접속(출석)한 학생만 모둠에 넣는다.
      const attend = await listAttendance(sessionId);
      const studentIds = [...new Set(attend.map((a) => a.studentId))];
      if (studentIds.length < 2) {
        return fail("invalid_input", "아직 접속한 학생이 적어요. 학생들이 들어온 뒤 나눠 주세요.");
      }
      const names = await studentNameMap(studentIds);

      const question = (session.activity?.worksheet ?? []).find(
        (q: WorksheetQuestion) => q.kind === "relay_draw",
      );
      const topics = question?.relayTopics ?? [];

      const made = await setupRelayGroups({
        sessionId,
        classNo: session.classNo,
        activityId,
        studentIds,
        nameOf: (id) => displayName(names.get(id)),
        groupCount: count,
        topics,
      });
      // 새로 나누면 공개는 잠근다.
      await updateSession(sessionId, { relayReveal: false });
      return ok({ groups: made, students: studentIds.length });
    }

    if (body?.action === "skip") {
      const groupNo = Math.trunc(body?.groupNo ?? 0);
      if (groupNo < 1) return fail("invalid_input");
      const done = await skipRelayTurn(sessionId, groupNo);
      return ok({ skipped: done });
    }

    if (body?.action === "reveal") {
      await updateSession(sessionId, { relayReveal: body?.reveal === true });
      return ok({ reveal: body?.reveal === true });
    }

    return fail("invalid_input", "모르는 동작입니다.");
  });
}
