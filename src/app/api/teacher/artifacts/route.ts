import { fail, guard, ok, readJson } from "@/lib/api";
import {
  getArtifactById,
  getSession,
  listArtifacts,
  listFeedbacksFor,
  studentNameMap,
  updateArtifact,
  upsertFeedback,
} from "@/lib/db";
import { activityIdFor, displayName, toCard } from "@/lib/gallery";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import { TEACHER_AUTHOR_ID } from "@/lib/types";

/**
 * 교사용 작품 목록·열람·숨김·피드백.
 *
 * 숨김은 1클릭이어야 한다. 부적절한 게시물이 교실 앞 화면에 떠 있는 30초는 아주 길다.
 * 삭제가 아니라 숨김인 이유는, 학생이 그린 것을 교사가 지워 버리는 일을 만들지 않기
 * 위해서다 — 안 보이게만 하고 나중에 같이 이야기한다.
 *
 * 자동 폴링 대상이 아니다. 대시보드가 이 API 를 5초마다 부르면 작품 28편의 획을
 * 통째로 다시 읽는다 (PRD 10장 D2).
 */

export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const params = new URL(request.url).searchParams;
    const sessionId = params.get("sessionId");
    const artifactId = params.get("id");

    if (!sessionId) return fail("invalid_input");

    const session = await getSession(sessionId);
    if (!session) return fail("not_found");

    const activityId = activityIdFor(session);
    if (!activityId) return ok({ activity: false, rows: [], stats: null });

    // 작품 한 편만 펼쳐 보기
    if (artifactId) {
      const artifact = await getArtifactById(artifactId);
      if (!artifact || artifact.activityId !== activityId) return fail("not_found");

      const [names, feedbacks] = await Promise.all([
        studentNameMap([artifact.studentId]),
        listFeedbacksFor([artifact.id]),
      ]);
      const authorNames = await studentNameMap(
        feedbacks.map((row) => row.authorId).filter((id) => id !== TEACHER_AUTHOR_ID),
      );

      return ok({
        card: toCard(artifact, displayName(names.get(artifact.studentId))),
        status: artifact.status,
        hidden: artifact.hidden,
        worksheet: session.activity?.worksheet ?? [],
        feedbacks: feedbacks.map((row) => ({
          id: row.id,
          mine: row.authorId === TEACHER_AUTHOR_ID,
          from:
            row.authorId === TEACHER_AUTHOR_ID
              ? "선생님"
              : displayName(authorNames.get(row.authorId)),
          foundTech: row.foundTech,
          question: row.question,
          authorReply: row.authorReply ?? "",
        })),
      });
    }

    // 목록 — 획은 빼고 제목만. 28편치 좌표를 목록에 실을 이유가 없다.
    const rows = await listArtifacts(activityId, session.classNo);
    const names = await studentNameMap(rows.map((row) => row.studentId));

    return ok({
      activity: true,
      rows: rows.map((row) => ({
        id: row.id,
        author: displayName(names.get(row.studentId)),
        place: row.place,
        year: row.year,
        status: row.status,
        hidden: row.hidden,
        strokeCount: row.strokes?.length ?? 0,
        updatedAt: row.updatedAt,
      })),
      stats: {
        total: rows.length,
        submitted: rows.filter((row) => row.status === "submitted").length,
        hidden: rows.filter((row) => row.hidden).length,
      },
    });
  });
}

export async function PATCH(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<{
      id?: string;
      hidden?: boolean;
      foundTech?: string;
      question?: string;
    }>(request);
    if (!body?.id) return fail("invalid_input");

    const artifact = await getArtifactById(body.id);
    if (!artifact) return fail("not_found");

    if (typeof body.hidden === "boolean") {
      await updateArtifact(artifact.id, { hidden: body.hidden });
    }

    // 교사 피드백도 학생과 같은 두 칸 양식을 쓴다. 교사만 자유 서술을 쓰면
    // 학생이 받는 말의 성격이 달라지고, 그게 곧 "평가"로 읽힌다.
    if (typeof body.foundTech === "string" || typeof body.question === "string") {
      await upsertFeedback({
        artifactId: artifact.id,
        authorId: TEACHER_AUTHOR_ID,
        ownerId: artifact.studentId,
        classNo: artifact.classNo,
        foundTech: String(body.foundTech ?? "").trim().slice(0, 200),
        question: String(body.question ?? "").trim().slice(0, 200),
      });
    }

    return ok();
  });
}
