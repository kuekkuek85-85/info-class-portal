import type { Artifact, Student } from "./types";

/**
 * 화면에 쓸 표시명 — 서버에서 조인해 문자열 하나로 만든다.
 *
 * 명렬표를 학생 클라이언트로 내려보내지 않는다는 원칙 때문에, 이름은 반드시 이 형태로만
 * 나간다. 학번 원문(10207)은 화면에 쓸 일이 없으므로 아예 포함하지 않는다.
 *
 * 실명을 쓰는 것은 의도한 안전장치다. 익명이면 장난 게시물이 늘고, 그걸 막으려고
 * 댓글·신고 기능을 붙이기 시작하면 관리 부담이 급증한다 (PRD 3.5).
 */
export function displayName(student: Student | undefined): string {
  if (!student) return "친구";
  return `${student.classNo}반 ${student.number}번 ${student.name}`;
}

/** 카드뉴스 한 장에 필요한 것만 추린다 */
export function toCard(artifact: Artifact, author: string) {
  return {
    id: artifact.id,
    author,
    place: artifact.place,
    year: artifact.year,
    strokes: artifact.strokes ?? [],
    texts: artifact.texts ?? [],
    answers: artifact.answers ?? {},
    traits: artifact.traits ?? [],
    sources: artifact.sources ?? { site: "", ai: "" },
  };
}

/**
 * 누가 누구 작품을 보는지 정한다.
 *
 * 자유 선택만 두면 결과가 뻔하다 — 그림 잘 그리는 몇 명에게 몰리고, 나머지는 아무도 안 본다.
 * 30분 수업에서 "아무도 내 걸 안 봤다"는 경험은 다음 활동 참여를 그대로 깎아먹는다.
 * 그래서 **필수 2편은 서버가 배정**하고, 자유 선택 1편만 학생에게 맡긴다.
 *
 * 배정은 제출한 사람들을 학번 순으로 늘어놓고 내 뒤 두 명을 준다. 마지막 사람은 처음으로
 * 돌아온다(순환). 이러면 모든 작품이 정확히 두 번씩 배정된다 — 아무도 빠지지 않는다.
 *
 * 학번 자체에 +1 을 하지 않는 이유: 결석하거나 아직 제출하지 않은 학생이 있으면 그 번호가
 * 비어 배정이 통째로 어긋난다. 제출한 사람들 안에서 세는 쪽이 항상 성립한다.
 */
export function assignPeers(submitted: Artifact[], myStudentId: string): Artifact[] {
  const ordered = [...submitted].sort((a, b) => a.studentId.localeCompare(b.studentId));
  const others = ordered.filter((row) => row.studentId !== myStudentId);
  if (others.length === 0) return [];

  const myIndex = ordered.findIndex((row) => row.studentId === myStudentId);

  /*
   * 아직 제출하지 않은 학생에게도 볼 것은 줘야 한다 (안 그리고 있는 학생일수록 남의 것을
   * 봐야 시작한다). 다만 전부 맨 앞 두 편으로 보내면 1·2번 작품에만 사람이 몰린다.
   * 학번을 시작점으로 삼아 흩뜨린다.
   */
  if (myIndex < 0) {
    const seed = Number(myStudentId.slice(-2)) || 0;
    const start = seed % others.length;
    return [others[start], others[(start + 1) % others.length]].filter(
      (row, index, list) => list.indexOf(row) === index,
    );
  }

  // 제출한 학생은 자기 뒤 두 명 — 마지막 사람은 처음으로 돌아온다.
  // 제출자가 3명 이상이면 모든 작품이 정확히 두 번씩 배정된다.
  // 2명이면 1편, 1명(나뿐)이면 0편 — 인원이 모자란 것이지 배정이 틀린 것은 아니다.
  const picked: Artifact[] = [];
  for (let step = 1; step <= ordered.length && picked.length < 2; step += 1) {
    const candidate = ordered[(myIndex + step) % ordered.length];
    if (candidate.studentId === myStudentId) continue;
    if (picked.some((row) => row.id === candidate.id)) continue;
    picked.push(candidate);
  }
  return picked;
}

/** 갤러리에 올라갈 자격 — 제출했고, 교사가 숨기지 않은 것 */
export function isVisible(artifact: Artifact): boolean {
  return artifact.status === "submitted" && !artifact.hidden;
}
