import { fail, guard, ok, readJson } from "@/lib/api";
import { datesForWeekday, isDateKey } from "@/lib/datetime";
import { createSession, listLessonPlans, listSessionsByDate, reserveCode } from "@/lib/db";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import type { ClassNo, TimetableSlot } from "@/lib/types";

/**
 * 시간표 → 학기 전체 세션 자동 생성 (PRD 4).
 *
 * 반별 요일·교시를 등록하면 시작일~종료일 사이의 모든 수업 날짜에 세션을 만든다.
 * 반마다 날짜순으로 1차시, 2차시… 를 매기고, 같은 번호의 차시 계획이 이미 등록돼 있으면
 * 슬라이드·질문을 스냅샷으로 복사한다. 아직 없으면 빈 세션으로 두고 나중에 배정한다.
 */
export async function POST(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<{
      startDate?: string;
      endDate?: string;
      slots?: TimetableSlot[];
    }>(request);

    const { startDate, endDate, slots } = body ?? {};
    if (!isDateKey(startDate) || !isDateKey(endDate)) {
      return fail("invalid_input", "시작일과 종료일을 2026-08-11 형식으로 입력해 주세요.");
    }
    if (startDate > endDate) {
      return fail("invalid_input", "종료일이 시작일보다 빠릅니다.");
    }
    if (!Array.isArray(slots) || slots.length === 0) {
      return fail("invalid_input", "시간표를 한 줄 이상 입력해 주세요.");
    }

    // (반, 날짜, 교시) 목록을 만든다
    const planned: { classNo: ClassNo; date: string; period: number }[] = [];
    for (const slot of slots) {
      const classNo = Number(slot.classNo) as ClassNo;
      const period = Number(slot.period);
      const weekday = Number(slot.weekday);

      if (![1, 2, 3, 4].includes(classNo)) continue;
      if (!Number.isFinite(period) || period < 1 || period > 8) continue;
      if (!Number.isFinite(weekday) || weekday < 0 || weekday > 6) continue;

      for (const date of datesForWeekday(startDate, endDate, weekday)) {
        planned.push({ classNo, date, period });
      }
    }

    if (planned.length === 0) {
      return fail("invalid_input", "생성할 수업이 없습니다. 요일과 교시를 확인해 주세요.");
    }
    if (planned.length > 400) {
      return fail(
        "invalid_input",
        `한 번에 ${planned.length}개는 너무 많습니다. 기간을 나눠 생성해 주세요.`,
      );
    }

    planned.sort(
      (a, b) => a.date.localeCompare(b.date) || a.period - b.period || a.classNo - b.classNo,
    );

    const plans = await listLessonPlans();
    const planByLessonNo = new Map(plans.map((plan) => [plan.lessonNo, plan]));

    // 이미 있는 (날짜, 교시, 반)은 코드를 예약하기 전에 걸러낸다. 최종 방어는 createSession의
    // 문서 ID 중복 거부이고, 이 조회는 쓸데없는 코드 예약을 줄이기 위한 것이다.
    const existingSlots = new Set<string>();
    for (const date of [...new Set(planned.map((p) => p.date))]) {
      for (const s of await listSessionsByDate(date)) {
        existingSlots.add(`${s.date}|${s.period}|${s.classNo}`);
      }
    }

    const lessonCounter = new Map<ClassNo, number>();
    let created = 0;
    let skipped = 0;
    let codeExhausted = 0;

    for (const item of planned) {
      const nth = (lessonCounter.get(item.classNo) ?? 0) + 1;
      lessonCounter.set(item.classNo, nth);

      const slotKey = `${item.date}|${item.period}|${item.classNo}`;
      if (existingSlots.has(slotKey)) {
        skipped += 1;
        continue;
      }

      let code: string;
      try {
        code = await reserveCode(item.date);
      } catch {
        // 그날 90개를 다 썼다 — 하루 12차시 규모에서는 사실상 일어나지 않는다
        codeExhausted += 1;
        continue;
      }

      const plan = planByLessonNo.get(nth);
      const session = await createSession({
        lessonPlanId: plan?.id ?? "",
        classNo: item.classNo,
        date: item.date,
        period: item.period,
        code,
        slideUrl: plan?.slideUrl ?? "",
        reflectionQuestion: plan?.reflectionQuestion ?? "",
        moodCheckEnabled: plan?.moodCheckEnabled ?? true,
        reflectionPublic: plan?.reflectionPublic ?? false,
        lessonNo: nth,
        title: plan?.title ?? `${nth}차시`,
        status: "scheduled",
        teacherNote: "",
        startedAt: null,
        endedAt: null,
      });

      if (!session) {
        skipped += 1;
        continue;
      }
      created += 1;
      existingSlots.add(slotKey);
    }

    return ok({ created, skipped, codeExhausted, total: planned.length });
  });
}
