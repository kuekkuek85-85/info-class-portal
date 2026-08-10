import { todayKST } from "./datetime";
import { currentPeriod } from "./timetable";

/**
 * 교사 화면을 열었을 때 기본으로 보여줄 수업을 고른다.
 *
 * 오늘 첫 수업을 기본값으로 두면 3교시에 2교시 반의 데이터가 교실 앞 화면에 뜬다.
 * 다른 반 학생의 기분이 노출되는 셈이라 그냥 불편한 문제가 아니다.
 *
 * ① 교사가 시작한 세션 → ② 시각표상 지금 교시 → ③ 아직 안 끝난 첫 수업 → ④ 첫 수업
 */
export function pickCurrentSession<T extends { period: number; status: string }>(
  sessions: T[],
  now: Date = new Date(),
): T | undefined {
  if (sessions.length === 0) return undefined;

  const today = todayKST(now);
  return (
    sessions.find((s) => s.status === "active") ??
    sessions.find((s) => s.period === currentPeriod(today, now)) ??
    sessions.find((s) => s.status !== "ended") ??
    sessions[0]
  );
}
