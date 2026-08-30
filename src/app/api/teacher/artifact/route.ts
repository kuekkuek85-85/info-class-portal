import { fail, guard, ok } from "@/lib/api";
import { getArtifact, getSession } from "@/lib/db";
import { activityIdFor } from "@/lib/gallery";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";

/**
 * 한 학생의 기사와 1차 점검 결과를 읽는다 (7차시 검토 패널).
 *
 * ## 대기 줄에는 본문이 실리지 않는다
 *
 * 대시보드 폴링은 20초마다 스물여덟 명을 훑는다. 거기에 기사 본문을 태우면 폴링마다
 * artifact 를 28건 읽어 한 교시에 무료 한도를 태운다. 그래서 대기 줄은 출석 문서에
 * 얹힌 단계만 보고, 본문은 **선생님이 그 학생을 누를 때 여기서 1건** 읽는다.
 *
 * ## 반영 여부는 여기서 계산하지 않는다
 *
 * 1차에 짚은 항목과 지금 답을 그대로 넘기고, 화면에서 resolveItems 로 센다.
 * 판정 규칙이 학생 화면·서버·교사 화면에서 한 벌이어야 표시가 어긋나지 않는다.
 */
export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const url = new URL(request.url);
    const sessionId = (url.searchParams.get("sessionId") ?? "").trim();
    const studentId = (url.searchParams.get("studentId") ?? "").trim();
    if (!sessionId || !studentId) return fail("invalid_input");

    const session = await getSession(sessionId);
    if (!session) return fail("not_found");

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");

    const artifact = await getArtifact(activityId, studentId);
    if (!artifact) return fail("not_found", "이 학생의 작품이 아직 없습니다.");

    return ok({
      answers: artifact.answers ?? {},
      sources: artifact.sources ?? { site: "", ai: "" },
      items: artifact.aiCheck?.items ?? [],
      stage: artifact.submitStage ?? 0,
      /*
       * 그림도 함께 보낸다.
       *
       * 교사가 완성된 지면을 보려면 획이 있어야 한다. 대기 줄에는 안 실리고 이
       * 패널을 열 때만 오므로, 폴링 비용과는 무관하다.
       */
      strokes: artifact.strokes ?? [],
      texts: artifact.texts ?? [],
    });
  });
}
