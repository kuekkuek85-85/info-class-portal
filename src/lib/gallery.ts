import { createHmac } from "node:crypto";

import type { Artifact, ClassSession, Student } from "./types";

/**
 * 이 수업에서 쓸 활동 ID.
 *
 * 작품은 세션이 아니라 **활동**에 묶인다(`activityId__학번`). 차시를 넘어 이어 그리려면
 * 그래야 하지만, 그 때문에 교사가 리허설로 걸어 보면서 그린 선이 **그 학생의 진짜 그림에
 * 그대로 들어간다.** 갤러리에도 섞인다.
 *
 * 그래서 리허설은 활동 ID 뒤에 꼬리표를 붙여 완전히 다른 문서를 쓰게 한다.
 * 리허설에서 무엇을 하든 진짜 작품은 손끝 하나 닿지 않는다.
 */
export function activityIdFor(session: ClassSession): string {
  const id = session.activity?.activityId;
  if (!id) return "";
  return session.rehearsal ? `${id}__rehearsal` : id;
}

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

/**
 * 학생에게 내려보낼 작품 번호.
 *
 * 진짜 문서 ID 는 `활동ID__학번` 이라, 그대로 내려보내면 화면에 이름을 안 띄워도
 * 개발자 도구에서 누구 것인지 그대로 읽힌다. 하필 정보 수업이라 열어 보는 학생이 나온다.
 *
 * **그냥 해시로는 부족하다.** 한 반의 학번 후보가 서른 개뿐이라, 활동 ID만 알면
 * `future-2040__10401` 부터 차례로 해시해서 목록과 맞춰 보면 누구 것인지 다 드러난다.
 * 그래서 서버만 아는 열쇠로 서명한다 — 열쇠가 없으면 후보를 만들어 볼 수가 없다.
 *
 * 서버는 그 반의 작품 목록(많아야 28개)을 훑어 같은 값을 만드는 문서를 찾는다.
 */
export function publicIdOf(artifactId: string): string {
  return createHmac("sha256", galleryKey()).update(artifactId).digest("hex").slice(0, 16);
}

function galleryKey(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("환경변수 SESSION_SECRET 가 설정되지 않았습니다.");
  }
  // 쿠키 서명과 같은 열쇠를 쓰되 용도를 섞지 않는다
  return `${secret}:gallery`;
}

/** 학생이 보낸 작품 번호를 실제 작품으로 되돌린다. 없으면 null */
export function findByPublicId(artifacts: Artifact[], publicId: string): Artifact | null {
  return artifacts.find((row) => publicIdOf(row.id) === publicId) ?? null;
}

/** 카드뉴스 한 장에 필요한 것만 추린다 */
export function toCard(artifact: Artifact, author: string) {
  return {
    id: publicIdOf(artifact.id),
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
