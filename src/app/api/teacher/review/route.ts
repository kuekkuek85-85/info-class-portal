import { fail, guard, ok, readJson } from "@/lib/api";
import {
  getArtifact,
  getSession,
  markReviewed,
  recordSubmitStage,
  updateArtifact,
} from "@/lib/db";
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
      verdict?: string;
    }>(request);

    /*
     * 판정이 학생 화면을 가른다.
     *
     * 「통과」면 그 학생은 끝났고 게임 화면으로 넘어간다. 「고치기」면 고쳐서 다시
     * 내야 하므로 활동지에 그대로 머문다. 안 보내면 고치기로 읽는다 — 빠뜨렸을 때
     * 통과가 되는 쪽이 훨씬 위험하다.
     */
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

    const verdict = body?.verdict === "pass" ? "pass" : "revise";

    /*
     * 고치라고 할 때만 무엇을 고칠지 적게 한다.
     *
     * 통과는 그 자체가 말이다 — 학생 화면이 「다 했어요」 로 바뀌므로 빈 말풍선이
     * 될 일이 없다. 여기서도 한마디를 받아 내면 스물여덟 명을 통과시키는 데 탭이
     * 두 배로 든다. 수업 중에 그 차이는 크다.
     */
    if (verdict === "revise" && chips.length === 0 && !note) {
      return fail("invalid_input", "무엇을 고칠지 칩을 고르거나 한 줄 적어 주세요.");
    }

    const session = await getSession(sessionId);
    if (!session) return fail("not_found");

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");

    const artifact = await getArtifact(activityId, studentId);
    if (!artifact) return fail("not_found", "이 학생의 작품이 아직 없습니다.");

    await updateArtifact(artifact.id, {
      teacherFeedback: { at: Date.now(), chips, note, verdict },
    });
    // 대기 줄에서 뺀다. 학생이 2차를 다시 내면 recordSubmitStage 가 이 값을 지운다
    await markReviewed(sessionId, studentId);

    /*
     * 통과는 그 자체가 최종 제출이다.
     *
     * 원래는 학생이 피드백을 읽고 「고쳤어요 · 최종 제출」 을 눌러 3차가 됐다. 그런데
     * 통과를 받으면 화면이 끝난 화면으로 바뀌어 그 단추를 누를 자리가 없어진다.
     * 여기서 안 올리면 대시보드의 최종제출 수만 계속 0 에 가깝게 남아, 선생님이
     * 자기가 통과시킨 인원을 화면에서 못 센다.
     */
    if (verdict === "pass") await recordSubmitStage(sessionId, studentId, 3);

    return ok();
  });
}
