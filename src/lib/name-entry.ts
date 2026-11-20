/**
 * 성함 입장 (교사 연수 세션 전용, 세션 플래그 nameEntry) - 순수 로직만 둔다(Firestore 없음, 단위 테스트 대상).
 *
 * 외부 참가자는 학번이 없다. 수업 코드 다음에 학번 대신 성함(별명도 됨)을 받고, 서버가 임시 자리 풀에서
 * 빈 자리를 하나 배정한다. 같은 세션에 같은 이름이 다시 오면(새로고침, 다른 기기) 같은 자리를 돌려준다.
 *
 * 플래그가 없는 세션(정규 수업 전부)은 이 파일을 거치지 않는다 - 학번 입장 경로(identify·confirm)는 그대로다.
 */

/** 이름 최대 글자 수 */
export const NAME_MAX = 20;

/** 연수 임시 자리 풀: 6반·7반 임시 번호 90~99 (20석). 실제 학생(각 반 1~29번)과 겹치지 않는다. */
export const TRAINING_SEATS: readonly string[] = (() => {
  const seats: string[] = [];
  for (const cls of ["06", "07"]) for (let n = 90; n <= 99; n += 1) seats.push(`1${cls}${n}`);
  return seats;
})();

/** 자리 하나의 기록 (seatMaps/{세션ID}.seats.{학번}) */
export interface SeatRecord {
  /** 화면에 보일 이름 (정규화 뒤) */
  name: string;
  /** 같은 사람 판정용 열쇠 */
  key: string;
  at: number;
}

export type SeatMap = Record<string, SeatRecord>;

/** 제어 문자·폭 없는 문자·줄 구분 문자 (이스케이프로 적는다 - 원문자로 두면 소스가 깨진다) */
const INVISIBLE = new RegExp("[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202f\\u2060\\ufeff]", "g");

/**
 * 입력 이름을 정규화한다: 유니코드 NFC, 제어 문자 제거, 앞뒤 공백 제거, 연속 공백을 한 칸으로, 최대 20자.
 * 빈 문자열이면 받지 않는다(부르는 쪽에서 거절).
 */
export function normalizeName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const cleaned = raw
    .normalize("NFC")
    .replace(INVISIBLE, " ")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(cleaned).slice(0, NAME_MAX).join("").trim();
}

/** 같은 사람 판정 열쇠. 정규화한 이름 그대로(대소문자도 구분하지 않는다 - 영문 별명 대비) */
export function nameKey(normalized: string): string {
  return normalized.toLowerCase();
}

export type SeatPick =
  /** name = 처음 적었던 이름(표시는 첫 이름으로 고정 - 다시 들어올 때 띄어쓰기·대소문자가 달라도 안 바뀐다) */
  | { kind: "existing"; seat: string; name: string }
  | { kind: "new"; seat: string }
  | { kind: "full" };

/**
 * 자리 고르기. 같은 열쇠가 이미 있으면 그 자리, 없으면 풀 순서대로 첫 빈 자리, 다 찼으면 full.
 * Firestore 트랜잭션 안에서 읽은 seats 를 그대로 넘긴다(동시에 둘이 같은 빈 자리를 집지 않게).
 */
export function pickSeat(seats: SeatMap, key: string, pool: readonly string[] = TRAINING_SEATS): SeatPick {
  for (const [seat, record] of Object.entries(seats)) {
    if (record?.key === key) return { kind: "existing", seat, name: record.name };
  }
  const free = pool.find((seat) => !seats[seat]);
  return free ? { kind: "new", seat: free } : { kind: "full" };
}
