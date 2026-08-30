import { fail, guard, ok, readJson } from "@/lib/api";
import { getArtifact, getSession, markReviewed, updateArtifact } from "@/lib/db";
import { activityIdFor } from "@/lib/gallery";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";

/**
 * 교사 피드백 — 정성적인 것이 본체다 (7차시 수행평가).
 *
 * ## 칩은 보조이고 note 가 선생님의 말이다
 *
 * 빠진 조건과 오탈자는 AI 자리에서 이미 걸렀다. 여기 남는 것은 기계가 못 보는 것 —
 * ②의 '왜' 가 설득되는지, ③이 ①② 와 이어지는지 같은 판단이다. 칩은 자주 쓰는 문장을
 * 탭 한 번으로 넣는 지름길일 뿐이고, 하실 말씀은 note 에 들어간다.
 *
 * ## 저장하면 학생 화면이 8초 안에 받는다
 *
 * 학생 쪽 제출 칸이 2차 대기 중에 `/api/student/submit` 을 폴링한다. 여기 쓰는 순간
 * 그쪽에 「고쳤어요 · 최종 제출」 이 열린다.
 */

/** 한 학생에게 붙일 수 있는 칩 수. 다 누르면 읽히지 않는다 */
const MAX_CHIPS = 5;
/** 수업 중에 폰으로 쓰는 글이다. 이보다 길면 그 시간에 말로 하는 편이 낫다 */
const MAX_NOTE = 500;

export async function POST(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<{
      sessionId?: string;
      studentId?: string;
      chips?: unknown;
      note?: string;
    }>(request);

    const sessionId = (body?.sessionId ?? "").trim();
    const studentId = (body?.studentId ?? "").trim();
    if (!sessionId || !studentId) return fail("invalid_input");

    const chips = Array.isArray(body?.chips)
      ? body.chips
          .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
          .map((c) => c.trim())
          .slice(0, MAX_CHIPS)
      : [];
    const note = (body?.note ?? "").trim().slice(0, MAX_NOTE);

    // 아무것도 안 적고 보내면 학생 화면에 빈 말풍선이 뜬다
    if (chips.length === 0 && !note) return fail("invalid_input", "칩을 고르거나 한 줄 적어 주세요.");

    const session = await getSession(sessionId);
    if (!session) return fail("not_found");

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");

    const artifact = await getArtifact(activityId, studentId);
    if (!artifact) return fail("not_found", "이 학생의 작품이 아직 없습니다.");

    await updateArtifact(artifact.id, {
      teacherFeedback: { at: Date.now(), chips, note },
    });
    // 대기 줄에서 뺀다. 학생이 2차를 다시 내면 recordSubmitStage 가 이 값을 지운다
    await markReviewed(sessionId, studentId);

    return ok();
  });
}
