import { fail, guard, ok } from "@/lib/api";
import { getArtifact, getSession, isSessionClosed, updateArtifact } from "@/lib/db";
import { readStudentSession } from "@/lib/session";

/**
 * 작품 제출 — 갤러리에 올린다.
 *
 * 제출 뒤에도 수업이 끝나기 전까지는 계속 고칠 수 있다. "제출 취소" 같은 것을 만들지 않는
 * 대신 수정을 열어 두는 쪽이 단순하다. 중1이 제출 버튼 앞에서 머뭇거리는 이유는 대개
 * "이제 못 고치나요?"이고, 못 고친다고 하면 끝까지 안 낸다.
 */
export async function POST() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");
    if (isSessionClosed(session)) {
      return fail("session_expired", "수업이 끝나서 제출할 수 없어요.");
    }

    const activityId = session.activity?.activityId;
    if (!activityId) return fail("not_found", "이 차시에는 그리기 활동이 없어요.");

    const artifact = await getArtifact(activityId, me.studentId);
    if (!artifact) return fail("not_found", "아직 그린 그림이 없어요.");

    // 장소가 비어 있으면 갤러리에서 "2040년의 " 로 끝나는 카드가 된다
    if (!artifact.place) {
      return fail("invalid_input", "먼저 장소를 골라 주세요.");
    }
    if ((artifact.strokes?.length ?? 0) === 0) {
      return fail("invalid_input", "그림을 조금이라도 그려 주세요.");
    }

    await updateArtifact(artifact.id, { status: "submitted" });
    return ok({ status: "submitted" });
  });
}
