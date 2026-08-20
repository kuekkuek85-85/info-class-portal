import { fail, guard, ok } from "@/lib/api";
import { getArtifact, getSession, isSessionClosed, updateArtifact } from "@/lib/db";
import { activityIdFor } from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";

/**
 * 작품 제출 — 갤러리에 올린다.
 *
 * 제출 뒤에도 수업이 끝나기 전까지는 계속 고칠 수 있다. "제출 취소" 같은 것을 만들지 않는
 * 대신 수정을 열어 두는 쪽이 단순하다. 중1이 제출 버튼 앞에서 머뭇거리는 이유는 대개
 * "이제 못 고치나요?"이고, 못 고친다고 하면 끝까지 안 낸다.
 *
 * ## 그림이 없는 차시가 있다
 *
 * 여기 있던 검사(장소를 골랐는가 · 획이 하나라도 있는가)는 모든 활동이 그리기이던 때
 * 쓴 것이다. 4차시처럼 **글만 쓰는 활동**에서는 장소도 획도 영영 생기지 않아서,
 * "다 했어요"를 누른 학생 전원이 "먼저 장소를 골라 주세요"를 봤다. 아무도 낼 수 없었고
 * 교사에게는 제출한 학생이 0명으로 보였다.
 *
 * 갤러리 쪽(gallery.ts 의 isVisible)은 이미 두 경우를 나눠 보고 있었는데 여기만
 * 안 고쳐져 있었다. 같은 기준으로 맞춘다 — 그림 차시는 획을, 글 차시는 쓴 글을 본다.
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

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found", "이 차시에는 낼 활동이 없어요.");

    /** 그리는 차시인가. 장소가 하나도 없으면 글만 쓰는 활동이다 (학생 화면의 canDraw 와 같은 기준) */
    const canDraw = (session.activity?.places?.length ?? 0) > 0;
    const noun = canDraw ? "그림" : "활동지";

    const artifact = await getArtifact(activityId, me.studentId);
    if (!artifact) return fail("not_found", `아직 낸 ${noun}이 없어요.`);

    if (canDraw) {
      // 장소가 비어 있으면 갤러리에서 "2040년의 " 로 끝나는 카드가 된다
      if (!artifact.place) {
        return fail("invalid_input", "먼저 장소를 골라 주세요.");
      }
      if ((artifact.strokes?.length ?? 0) === 0) {
        return fail("invalid_input", "그림을 조금이라도 그려 주세요.");
      }
    } else {
      /*
       * 한 칸도 안 쓴 활동지를 받지 않는 이유는 갤러리 때문이다. 제출은 곧 "다 했어요"
       * 표시이고, 빈 것을 낸 학생이 다 한 것으로 세어지면 교사가 남은 학생을 못 찾는다.
       */
      const wrote = Object.values(artifact.answers ?? {}).some((value) =>
        String(value ?? "").trim(),
      );
      if (!wrote) {
        return fail("invalid_input", "활동지를 한 칸이라도 채워 주세요.");
      }
    }

    await updateArtifact(artifact.id, { status: "submitted" });
    return ok({ status: "submitted" });
  });
}
