/**
 * 교시별 시각표.
 *
 * 수업 코드는 "교시 종료 시 만료"된다 (PRD 8 확정 사항). 교사가 수업 종료 버튼을 누르는 것에만
 * 의존하면 깜빡한 날의 코드가 하교 후까지 살아 있다. 교시 끝 시각을 알면 자동으로 닫을 수 있다.
 *
 * 시각표가 정의되지 않은 날짜는 자동 만료를 적용하지 않는다 — 모르는 기간에 코드를 멋대로
 * 닫아 학생을 못 들어오게 만드는 쪽이 훨씬 나쁘다.
 */

export interface PeriodTime {
  period: number;
  /** "09:50" */
  start: string;
  /** "10:30" */
  end: string;
}

interface Schedule {
  /** 적용 시작일 (포함) */
  from: string;
  /** 적용 종료일 (포함) */
  to: string;
  label: string;
  periods: PeriodTime[];
}

/**
 * 단축 시간표 (2026-08-10 ~ 2026-08-21).
 * 40분 수업이고, 태블릿 수령 2분·반납 5분을 빼면 실질 수업은 30분 남짓이다 (PRD 1).
 */
const SCHEDULES: Schedule[] = [
  {
    from: "2026-08-10",
    to: "2026-08-21",
    label: "단축 시간표",
    periods: [
      { period: 1, start: "09:00", end: "09:40" },
      { period: 2, start: "09:50", end: "10:30" },
      { period: 3, start: "10:40", end: "11:20" },
      { period: 4, start: "11:30", end: "12:10" },
      // 점심 12:10~13:00
      { period: 5, start: "13:00", end: "13:40" },
      { period: 6, start: "13:50", end: "14:30" },
      { period: 7, start: "14:40", end: "15:20" },
    ],
  },
  /*
   * 정상 시간표 (45분 수업, 단축 없음). 학교 시정표를 그대로 받아 적었다.
   *
   * 여기 있던 값은 "일반적인 중학교 45분 기준"으로 **가정한 것**이었는데, 실제와 대 보니
   * 일곱 교시가 전부 10분씩 일렀다. 그대로 뒀으면 3교시(~11:35)가 끝나는 바로 그 시각에
   * 코드가 만료된다 — 가정값 11:25 + 유예 10분 = 11:35. 종이 울린 뒤 성찰을 마무리하는
   * 학생이 통째로 잠긴다. 시각표를 짐작으로 채우면 이렇게 조용히 어긋난다.
   *
   * 첫날은 8/24(월)이지만 구간은 8/22부터 잡는다. 주말이라 수업이 없고, 등록되지 않은
   * 날짜는 isPeriodOver() 가 항상 false 라 자동 만료가 오류도 경고도 없이 꺼진다
   * (PRD 10장 D3). 빈 구간을 만들지 않는 쪽이 안전하다.
   */
  {
    from: "2026-08-22",
    to: "2027-02-28",
    label: "정상 시간표 (45분)",
    periods: [
      { period: 1, start: "09:00", end: "09:45" },
      { period: 2, start: "09:55", end: "10:40" },
      { period: 3, start: "10:50", end: "11:35" },
      { period: 4, start: "11:45", end: "12:30" },
      // 급식 12:30~13:20 (50분)
      { period: 5, start: "13:20", end: "14:05" },
      { period: 6, start: "14:15", end: "15:00" },
      { period: 7, start: "15:10", end: "15:55" },
    ],
  },
];

/**
 * 교시가 끝난 뒤에도 이만큼은 코드를 열어 둔다.
 *
 * 수업이 종이 울린 뒤에 마무리되는 일은 흔하고, 늦게 들어온 학생이 성찰을 못 남기면
 * 그날 기록이 통째로 빈다. 코드를 조금 늦게 닫는 쪽의 손해가 훨씬 작다.
 */
const GRACE_MINUTES = 10;

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function scheduleFor(dateKey: string): Schedule | null {
  return SCHEDULES.find((s) => dateKey >= s.from && dateKey <= s.to) ?? null;
}

export function periodTimes(dateKey: string): PeriodTime[] {
  return scheduleFor(dateKey)?.periods ?? [];
}

export function periodTime(dateKey: string, period: number): PeriodTime | null {
  return periodTimes(dateKey).find((p) => p.period === period) ?? null;
}

/** "2026-08-10" + "09:50" → epoch ms (KST 기준) */
function toEpoch(dateKey: string, hhmm: string): number {
  return new Date(`${dateKey}T${hhmm}:00.000Z`).getTime() - KST_OFFSET_MS;
}

/**
 * 그 교시가 (여유 시간까지 포함해) 이미 끝났는가.
 * 시각표를 모르는 날짜는 false — 판단할 근거가 없으면 막지 않는다.
 */
export function isPeriodOver(dateKey: string, period: number, now: Date = new Date()): boolean {
  const time = periodTime(dateKey, period);
  if (!time) return false;
  return now.getTime() > toEpoch(dateKey, time.end) + GRACE_MINUTES * 60_000;
}

/** 지금이 몇 교시인지. 쉬는 시간·점심시간이면 null. */
export function currentPeriod(dateKey: string, now: Date = new Date()): number | null {
  const at = now.getTime();
  for (const time of periodTimes(dateKey)) {
    if (at >= toEpoch(dateKey, time.start) && at <= toEpoch(dateKey, time.end)) {
      return time.period;
    }
  }
  return null;
}

/** "2교시 09:50~10:30" — 화면에 그대로 쓰는 표기 */
export function describePeriod(dateKey: string, period: number): string {
  const time = periodTime(dateKey, period);
  return time ? `${period}교시 ${time.start}~${time.end}` : `${period}교시`;
}
