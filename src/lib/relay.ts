/**
 * 릴레이(한 장 이어) 그림 그리기 — 데이터 모델과 순수 헬퍼.
 *
 * 모둠이 한 그림을 학번 순 턴제로 이어 그린다. 서버(relayGroups 컬렉션)에 모둠·턴·이미지가
 * 있고 학생은 폴링으로 따라온다. 이 파일은 타입·기본 제시어·순수 계산만 담는다(server-only 아님 —
 * 클라이언트가 타입을 import 한다).
 */

/** 모둠 한 개의 릴레이 상태. Firestore 문서 id = `${sessionId}__g${groupNo}`. */
export interface RelayGroup {
  id: string;
  sessionId: string;
  classNo: number;
  activityId: string;
  groupNo: number;
  /** 모둠원 학번 — 학번 순(턴 순서). */
  members: string[];
  /** 모둠원 이름(members 와 같은 순서) — 화면 표시용. */
  memberNames: string[];
  /** 모둠 주제(제시어). 첫 차례 학생이 바꿀 수 있다. */
  topic: string;
  /** 지금까지 이어 그린 합성 이미지(데이터 URL). 아직 없으면 "". */
  image: string;
  /** 지금 그릴 사람의 members 인덱스. members.length 이상이면 끝. */
  turnIndex: number;
  status: "drawing" | "done";
  /** 제출마다 +1. 트랜잭션에서 동시 제출 충돌을 막는 데 쓴다. */
  rev: number;
  updatedAt: number;
}

/**
 * 부적절 입력 대비 기본 제시어 풀. 시드가 relayTopics 를 주면 그걸 쓰고, 없으면 이걸 쓴다.
 * 중1이 말 없이 그림으로 전하기 좋은, 안전하고 친근한 주제들.
 */
export const DEFAULT_RELAY_TOPICS: readonly string[] = [
  "즐거운 소풍",
  "우리 반 교실",
  "미래의 도시",
  "바닷속 세상",
  "내가 좋아하는 음식",
  "우주 여행",
  "숲속 동물들",
  "비 오는 날",
  "놀이공원",
  "우리 학교 운동회",
];

/** 지금 그릴 사람의 학번(없으면 null). */
export function currentDrawer(group: Pick<RelayGroup, "members" | "turnIndex" | "status">): string | null {
  if (group.status === "done") return null;
  return group.members[group.turnIndex] ?? null;
}

/**
 * 접속(출석)한 학번들을 섞인 순서대로 N모둠으로 나눈다. 각 모둠 안은 **학번 순**으로 정렬해
 * 턴 순서를 정한다. 섞는 것은 호출자가 미리 한다(streams.ts 의 shuffle) — 여기선 나누고 정렬만.
 */
export function splitIntoGroups(shuffledIds: string[], groupCount: number): string[][] {
  const n = Math.max(1, Math.min(groupCount, shuffledIds.length || 1));
  const groups: string[][] = Array.from({ length: n }, () => []);
  shuffledIds.forEach((id, i) => {
    groups[i % n].push(id);
  });
  // 모둠 안은 학번(문자열) 순으로 — 턴이 학번 순서로 돌게.
  return groups.map((g) => g.slice().sort((a, b) => a.localeCompare(b)));
}
