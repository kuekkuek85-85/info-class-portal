import { fail, guard, ok, readJson } from "@/lib/api";
import {
  createLessonPlan,
  deleteLessonPlan,
  getLessonPlan,
  listLessonPlans,
  syncScheduledSessions,
  updateLessonPlan,
} from "@/lib/db";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import type { LessonPlan } from "@/lib/types";

/**
 * 차시 계획(lesson_plans) 관리.
 *
 * 반과 무관한 수업 내용이다. 4반이 같은 진도를 나가므로 한 번 등록하면 네 반 세션에
 * 공용으로 적용된다. 세션 생성 시점에 스냅샷으로 복사되므로, 여기를 고쳐도 이미 시작된
 * 세션의 기록은 바뀌지 않는다 (PRD 5.1).
 */

export async function GET() {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const plans = await listLessonPlans();
    return ok({ plans });
  });
}

type LessonInput = Partial<Omit<LessonPlan, "id" | "createdAt" | "updatedAt">>;

function normalize(body: LessonInput) {
  return {
    lessonNo: Number(body.lessonNo),
    title: (body.title ?? "").trim(),
    slideUrl: (body.slideUrl ?? "").trim(),
    reflectionQuestion: (body.reflectionQuestion ?? "").trim(),
    moodCheckEnabled: body.moodCheckEnabled !== false,
    reflectionPublic: body.reflectionPublic === true,
  };
}

export async function POST(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<LessonInput>(request);
    if (!body) return fail("invalid_input");

    const input = normalize(body);
    if (!Number.isFinite(input.lessonNo) || input.lessonNo < 1) {
      return fail("invalid_input", "차시 번호를 입력해 주세요.");
    }
    if (!input.title) return fail("invalid_input", "차시 제목을 입력해 주세요.");

    const plan = await createLessonPlan(input);
    return ok({ plan });
  });
}

export async function PATCH(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<LessonInput & { id?: string }>(request);
    if (!body?.id) return fail("invalid_input");

    const existing = await getLessonPlan(body.id);
    if (!existing) return fail("not_found");

    const input = normalize({ ...existing, ...body });
    await updateLessonPlan(body.id, input);

    // 아직 시작하지 않은 세션에만 반영한다. 끝난 세션은 그날 실제로 쓴 내용을 그대로 보존한다.
    const synced = await syncScheduledSessions({ ...existing, ...input });

    return ok({ synced });
  });
}

export async function DELETE(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return fail("invalid_input");

    await deleteLessonPlan(id);
    return ok();
  });
}
