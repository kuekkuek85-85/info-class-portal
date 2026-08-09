import { fail, guard, ok, readJson } from "@/lib/api";
import {
  allocateCode,
  createSession,
  deleteSession,
  findSessionSlot,
  getLessonPlan,
  getSession,
  listAllSessions,
  listSessionsByDate,
  setSessionStatus,
  updateSession,
} from "@/lib/db";
import { isDateKey, todayKST } from "@/lib/datetime";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import type { ClassNo, SessionStatus } from "@/lib/types";

/**
 * 세션(class_sessions) 관리.
 *
 * 생성 시점에 차시 계획의 슬라이드 URL·성찰 질문을 세션으로 복사(스냅샷)한다.
 * 이렇게 해야 "1반은 어떤 질문에 답한 것인가"가 나중에도 정확히 남는다 (PRD 5.1).
 */

export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const params = new URL(request.url).searchParams;
    const date = params.get("date");
    const all = params.get("all") === "1";

    const sessions = all
      ? await listAllSessions()
      : await listSessionsByDate(isDateKey(date) ? date : todayKST());

    return ok({ sessions });
  });
}

export async function POST(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<{
      lessonPlanId?: string;
      classNo?: number;
      date?: string;
      period?: number;
    }>(request);

    const classNo = Number(body?.classNo) as ClassNo;
    const period = Number(body?.period);
    const date = body?.date ?? "";

    if (!body?.lessonPlanId) return fail("invalid_input", "차시를 선택해 주세요.");
    if (![1, 2, 3, 4].includes(classNo)) return fail("invalid_input", "반은 1~4 중 하나입니다.");
    if (!isDateKey(date)) return fail("invalid_input", "날짜 형식은 2026-08-11 입니다.");
    if (!Number.isFinite(period) || period < 1 || period > 8) {
      return fail("invalid_input", "교시는 1~8 사이입니다.");
    }

    const plan = await getLessonPlan(body.lessonPlanId);
    if (!plan) return fail("not_found", "차시 계획을 찾을 수 없습니다.");

    const duplicate = await findSessionSlot(date, period, classNo);
    if (duplicate) {
      return fail("invalid_input", `${date} ${period}교시 ${classNo}반 수업이 이미 있습니다.`);
    }

    const code = await allocateCode(date);
    const session = await createSession({
      lessonPlanId: plan.id,
      classNo,
      date,
      period,
      code,
      // ↓ 여기서 복사한 값이 그 반이 실제로 본 내용으로 고정된다
      slideUrl: plan.slideUrl,
      reflectionQuestion: plan.reflectionQuestion,
      moodCheckEnabled: plan.moodCheckEnabled,
      reflectionPublic: plan.reflectionPublic,
      lessonNo: plan.lessonNo,
      title: plan.title,
      status: "scheduled",
      teacherNote: "",
      startedAt: null,
      endedAt: null,
    });

    return ok({ session });
  });
}

/** 교사 메모 저장, 상태 전환(시작/종료), 성찰 공개 여부 토글. */
export async function PATCH(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<{
      id?: string;
      teacherNote?: string;
      status?: SessionStatus;
      reflectionPublic?: boolean;
      lessonPlanId?: string;
    }>(request);

    if (!body?.id) return fail("invalid_input");
    const session = await getSession(body.id);
    if (!session) return fail("not_found");

    // 차시 배정(재배정)은 아직 시작하지 않은 세션에만 허용한다. 진행 중·종료된 세션의
    // 스냅샷을 바꾸면 학생이 실제로 답한 질문과 기록이 어긋난다 (PRD 5.1).
    if (body.lessonPlanId) {
      if (session.status !== "scheduled") {
        return fail("invalid_input", "이미 시작한 수업의 차시는 바꿀 수 없습니다.");
      }
      const plan = await getLessonPlan(body.lessonPlanId);
      if (!plan) return fail("not_found", "차시 계획을 찾을 수 없습니다.");

      await updateSession(body.id, {
        lessonPlanId: plan.id,
        slideUrl: plan.slideUrl,
        reflectionQuestion: plan.reflectionQuestion,
        moodCheckEnabled: plan.moodCheckEnabled,
        reflectionPublic: plan.reflectionPublic,
        lessonNo: plan.lessonNo,
        title: plan.title,
      });
    }

    if (typeof body.teacherNote === "string") {
      await updateSession(body.id, { teacherNote: body.teacherNote.slice(0, 2000) });
    }
    if (typeof body.reflectionPublic === "boolean") {
      await updateSession(body.id, { reflectionPublic: body.reflectionPublic });
    }
    if (body.status && ["scheduled", "active", "ended"].includes(body.status)) {
      await setSessionStatus(body.id, body.status);
    }

    return ok();
  });
}

export async function DELETE(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return fail("invalid_input");

    await deleteSession(id);
    return ok();
  });
}
