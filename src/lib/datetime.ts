/**
 * KST(UTC+9) 기준 날짜 유틸.
 *
 * Vercel 서버는 UTC로 돌기 때문에 `new Date().toISOString().slice(0,10)`을 쓰면
 * 한국 시간 오전 9시 이전에 전날 날짜가 나온다. 수업 세션은 반드시 KST 날짜로 묶여야 한다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** "2026-08-11" (KST 기준 오늘) */
export function todayKST(now: Date = new Date()): string {
  return dateKeyKST(now);
}

/** Date → "YYYY-MM-DD" (KST 기준) */
export function dateKeyKST(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** KST 기준 요일 (0=일 ... 6=토) */
export function weekdayKST(date: Date = new Date()): number {
  return new Date(date.getTime() + KST_OFFSET_MS).getUTCDay();
}

/** 학생 세션 만료 시각 — 당일 자정(KST). PRD 3.1 */
export function endOfDayKST(now: Date = new Date()): Date {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  kst.setUTCHours(23, 59, 59, 999);
  return new Date(kst.getTime() - KST_OFFSET_MS);
}

/** "2026-08-11" → 로컬 표시용 "8월 11일 (화)" */
export function formatDateKorean(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const wd = weekdays[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일 (${wd})`;
}

/** epoch ms → "14:32" (KST) */
export function formatTimeKST(ms: number): string {
  const kst = new Date(ms + KST_OFFSET_MS);
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mm = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** "YYYY-MM-DD" 형식인지 */
export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** startKey부터 endKey까지 특정 요일에 해당하는 날짜들 */
export function datesForWeekday(startKey: string, endKey: string, weekday: number): string[] {
  const result: string[] = [];
  const start = new Date(`${startKey}T00:00:00Z`);
  const end = new Date(`${endKey}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return result;

  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    if (cursor.getUTCDay() === weekday) {
      result.push(cursor.toISOString().slice(0, 10));
    }
  }
  return result;
}
