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
export function pickCurrentSession<
  T extends { period: number; status: string; rehearsal?: boolean },
>(sessions: T[], now: Date = new Date()): T | undefined {
  /*
   * 리허설은 후보에서 뺀다.
   *
   * 교사가 방과 후에 만들어 두고 지우는 것을 깜빡하면, 그 수업은 계속 열려 있다
   * (시각 만료가 면제되므로). 다음 날 대시보드가 그것을 "지금 하는 수업"으로 골라 버리면
   * 교사는 엉뚱한 반 화면을 보며 진짜 수업을 진행하게 된다.
   */
  const real = sessions.filter((s) => !s.rehearsal);
  if (real.length === 0) return undefined;

  const today = todayKST(now);
  return (
    real.find((s) => s.status === "active") ??
    real.find((s) => s.period === currentPeriod(today, now)) ??
    real.find((s) => s.status !== "ended") ??
    real[0]
  );
}
