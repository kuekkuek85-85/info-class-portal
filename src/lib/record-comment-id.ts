/**
 * 생기부 세특 초안 문서 ID. 회차(round)를 포함해 12월 2차가 1차를 덮지 않게 한다.
 *
 * db.ts 는 "server-only" 와 firebase-admin 을 top-level 로 import 해서 `node --test` 로 로드할 수 없다.
 * 그래서 순수 함수만 이 모듈에 두고 db.ts 가 re-export 한다.
 */
export function recordCommentId(round: string, subjectKey: string, studentId: string): string {
  return `${round}__${subjectKey}__${studentId}`;
}
