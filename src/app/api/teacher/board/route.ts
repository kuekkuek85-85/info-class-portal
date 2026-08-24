import { fail, guard, ok } from "@/lib/api";
import { getSession, listMoodEntries } from "@/lib/db";
import { MOOD_OPTIONS, getMood, type Quadrant } from "@/lib/mood";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";

/**
 * 교실 앞 화면에 띄우는 공유용 감정 집계 — **익명**.
 *
 * 이 엔드포인트는 학번·이름·이유를 응답에 담지 않는다. 화면 컴포넌트가 실수로
 * 개인 응답을 렌더링하는 사고를 막으려면 애초에 데이터가 내려오지 않아야 한다 (PRD 3.3).
 * 개별 응답 열람은 /api/teacher/dashboard 로 분리되어 있다.
 */
export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (!sessionId) return fail("invalid_input");

    const session = await getSession(sessionId);
    if (!session) return fail("not_found");

    const entries = await listMoodEntries(session.id);

    const byMood = new Map<string, number>();
    const byQuadrant: Record<Quadrant, number> = { red: 0, yellow: 0, blue: 0, green: 0 };
    let valenceSum = 0;
    let arousalSum = 0;

    for (const entry of entries) {
      byMood.set(entry.mood, (byMood.get(entry.mood) ?? 0) + 1);
      const option = getMood(entry.mood);
      if (option) byQuadrant[option.quadrant] += 1;
      valenceSum += entry.valence;
      arousalSum += entry.arousal;
    }

    const counts = MOOD_OPTIONS.map((option) => ({
      key: option.key,
      label: option.label,
      quadrant: option.quadrant,
      valence: option.valence,
      arousal: option.arousal,
      count: byMood.get(option.key) ?? 0,
    }));

    return ok({
      session: {
        id: session.id,
        classNo: session.classNo,
        // 분반으로 여는 수업은 "1반" 이 아니라 "화요일 1기" 로 불러야 한다
        groupLabel: session.groupLabel ?? "",
        lessonNo: session.lessonNo,
        title: session.title,
        period: session.period,
        date: session.date,
      },
      total: entries.length,
      counts,
      byQuadrant,
      average:
        entries.length > 0
          ? { valence: valenceSum / entries.length, arousal: arousalSum / entries.length }
          : null,
    });
  });
}
