import { deviceKey, fail, guard, ok, rateLimit } from "@/lib/api";
import {
  flagCareAlert,
  getSession,
  listAllSessions,
  listMoodEntriesByStudent,
  logAiCall,
} from "@/lib/db";
import { checkCrisis } from "@/lib/emotion-lens";
import { getMood, moodCellStyle } from "@/lib/mood";
import { buildMoodPayload, summarizeMood, type MoodSummaryPoint } from "@/lib/mood-report";
import { readStudentSession } from "@/lib/session";

/**
 * 마음일기 리포트 — 학생 '본인'이 학기 내내 고른 마음 체크인을 모아 **계산 + AI 한두 문장 총평**
 * 으로 돌려준다 (마음 톡톡 8회기 마음일기, 본인만 봄).
 *
 * ## ★ 프라이버시 (이 과목 1순위)
 *
 * - 철저히 **본인 것만**. 학번(me.studentId)으로만 조회하고, 친구 것은 한 건도 섞지 않는다.
 * - 마음 톡톡 세션의 mood 만 — 정보·진로탐색 mood 가 섞이지 않게 세션 제목으로 거른다.
 * - **Gemini 로는 기분 라벨 + valence/arousal 숫자 + 회기 번호만 보낸다.** 학번·이름·기분 이유
 *   (moodEntries.reason, 자유서술)는 **AI 로 절대 보내지 않는다**(buildMoodPayload·checkCrisis 입력에서 제외).
 *   reason 은 **본인 화면 표시용으로만** 응답에 담는다 — 친구에게 안 나가고 AI 로도 안 간다.
 * - 보낼 문자열을 checkCrisis 로 한 번 더 통과시킨 뒤에만 Gemini 를 부른다. 걸리면 호출하지
 *   않고 교사에게 사실만 알린다(flagCareAlert). 실패·상한 초과면 AI 총평은 생략하고 계산만 준다.
 */

/** 학번 기준 — 한 시간에 6회. 다시 열어 봐도 되지만 Gemini 호출은 아껴 쓴다 */
const PER_STUDENT = 6;
const PER_DEVICE = 20;
const WINDOW_MS = 60 * 60_000;

/** 회기 번호 — 마음 톡톡은 lessonNo 202~208 → 2~8 */
function lessonOf(lessonNo: number): number {
  return lessonNo > 200 && lessonNo < 221 ? lessonNo - 200 : lessonNo;
}

export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const [moods, sessions] = await Promise.all([
      listMoodEntriesByStudent(me.studentId),
      listAllSessions(),
    ]);

    const sessionById = new Map(sessions.map((s) => [s.id, s]));

    /* ── 회기별 기분 추이 — 마음 톡톡 세션의 mood 만. reason 은 본인 화면 표시용으로만 담는다 ── */
    const trend = moods
      .map((m) => {
        const s = sessionById.get(m.sessionId);
        if (!s) return null;
        if (!String(s.title ?? "").includes("마음 톡톡")) return null;
        const option = getMood(m.mood);
        const style = option ? moodCellStyle(option) : null;
        return {
          lessonNo: s.lessonNo ?? 0,
          title: String(s.title ?? ""),
          date: s.date ?? m.date ?? "",
          moodLabel: option?.label ?? m.mood,
          valence: m.valence ?? 0,
          arousal: m.arousal ?? 0,
          color: style?.background ?? "#cccccc",
          // ★ 본인 화면 표시용. AI(buildMoodPayload·checkCrisis·summarizeMood)에는 넣지 않는다.
          reason: String(m.reason ?? "").trim(),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.lessonNo - b.lessonNo || a.date.localeCompare(b.date));

    if (trend.length === 0) {
      return ok({ trend: [], stats: null, summary: null });
    }

    /* ── 계산 기반 리포트 ── */
    const count = trend.length;
    const averageValence = Math.round((trend.reduce((s, t) => s + t.valence, 0) / count) * 10) / 10;

    const freq = new Map<string, number>();
    for (const t of trend) freq.set(t.moodLabel, (freq.get(t.moodLabel) ?? 0) + 1);
    const topMood = [...freq.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

    const best = [...trend].sort((a, b) => b.valence - a.valence)[0];
    const hardest = [...trend].sort((a, b) => a.valence - b.valence)[0];

    const point = (t: (typeof trend)[number]) => ({
      lessonNo: t.lessonNo,
      moodLabel: t.moodLabel,
      valence: t.valence,
    });

    const stats = {
      count,
      averageValence,
      topMood: topMood ? { label: topMood[0], times: topMood[1] } : null,
      best: point(best),
      hardest: point(hardest),
    };

    /* ── AI 한두 문장 총평 — 라벨·숫자·회기 번호만 보낸다 (학번·이름·이유 없음) ── */
    const points: MoodSummaryPoint[] = trend.map((t) => ({
      lesson: lessonOf(t.lessonNo),
      moodLabel: t.moodLabel,
      valence: t.valence,
      arousal: t.arousal,
    }));

    let summary: string | null = null;

    // 전송 직전 한 번 더 — 보낼 문자열(라벨·숫자뿐)에 위기 신호가 있으면 부르지 않는다.
    if (checkCrisis(buildMoodPayload(points))) {
      await logAiCall({
        studentId: me.studentId,
        lessonNo: session.lessonNo,
        feature: "mood_report_blocked",
      }).catch(() => undefined);
      await flagCareAlert(session.id, me.studentId).catch(() => undefined);
      return ok({ trend, stats, summary: null });
    }

    // 상한을 넘으면 AI 총평만 생략하고 계산 리포트는 그대로 준다(graceful).
    const underStudent = rateLimit(`moodreport:${me.studentId}`, PER_STUDENT, WINDOW_MS);
    const underDevice = underStudent && rateLimit(await deviceKey("moodreport"), PER_DEVICE, WINDOW_MS);
    if (underStudent && underDevice) {
      summary = await summarizeMood(points);
      await logAiCall({
        studentId: me.studentId,
        sessionId: session.id,
        lessonNo: session.lessonNo,
        feature: "mood_report",
        source: summary ? "ai" : "fallback",
      }).catch(() => undefined);
    }

    return ok({ trend, stats, summary });
  });
}
