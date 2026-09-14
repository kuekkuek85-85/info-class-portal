import { createHmac } from "node:crypto";

import type { Artifact, ClassSession, PeerAssignMode, Student } from "./types";

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

/**
 * 친구 작품을 늘어놓을 차례.
 *
 * **이름을 가리는 것만으로는 못 가린다.** 목록이 학번 순으로 나가고 있었다
 * (listArtifacts 가 그렇게 정렬한다 — 교사 화면은 그 차례가 맞다). 그러면 자기 그림이
 * 몇 번째인지만 알면 앞뒤가 누구인지 그대로 따라온다. 한 반이 스물여덟 명이고 서로
 * 번호를 아는 사이라, 한 명이 알아내면 그 자리에서 반 전체가 풀린다.
 *
 * 그래서 카드 번호(publicIdOf) 로 정렬한다. 그 번호가 이미 서버 열쇠로 서명한 값이라
 * 학번과 아무 관계가 없다 — 새로 섞는 장치를 만들지 않고 있는 것을 쓴다.
 *
 * 매번 새로 뽑지 않고 **늘 같은 차례**인 것이 중요하다.
 *  · 피드백을 남기면 목록을 다시 불러온다. 그때마다 섞이면 보던 자리를 잃는다.
 *  · 지난 차시 작품도 이 함수를 지나가므로 과거 활동까지 같이 흩어진다.
 *    저장된 것을 고치지 않으니 되돌릴 것도 없다.
 *
 * 반 전체가 같은 차례를 본다. 짝끼리 화면을 맞대도 "일곱 번째가 누구" 를 옮길 수는
 * 있는데, 그건 학번 순서와 달리 한 사람을 알아냈을 때 한 사람만 드러나는 문제다.
 */
export function inViewingOrder<T extends { id: string }>(cards: T[]): T[] {
  return [...cards].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * 카드뉴스 한 장에 필요한 것만 추린다.
 *
 * `allowKeys` 를 주면 **그 답 칸만** 싣는다. 감정을 나누는 차시에서 감정 낱말만
 * 열고 경험 글은 닫기 위한 것이다 (types.ts 의 galleryAnswerKeys).
 *
 * 거르는 자리가 화면이 아니라 여기인 것이 중요하다. 화면에서 고르면 안 보일 뿐
 * 응답에는 실려 있어서, 개발자 도구를 여는 학생 하나면 다 읽힌다.
 */
export function toCard(artifact: Artifact, author: string, allowKeys?: string[]) {
  const answers = artifact.answers ?? {};
  return {
    id: publicIdOf(artifact.id),
    author,
    place: artifact.place,
    year: artifact.year,
    strokes: artifact.strokes ?? [],
    texts: artifact.texts ?? [],
    answers: allowKeys
      ? Object.fromEntries(allowKeys.filter((k) => answers[k]).map((k) => [k, answers[k]]))
      : answers,
    traits: artifact.traits ?? [],
    sources: artifact.sources ?? { site: "", ai: "" },
  };
}

/**
 * 문자열 하나를 32비트 부호없는 정수로 접는다 (FNV-1a).
 *
 * 세션마다 다른, 그러나 **같은 세션에서는 늘 같은** 시드를 얻으려는 것뿐이다.
 * 보안 용도가 아니다 — 작품 번호(publicIdOf)는 지금까지처럼 서버 열쇠로 서명한다.
 */
function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 시드 하나로 늘 같은 난수열을 내는 작은 PRNG (mulberry32) */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 시드로 결정적으로 섞는다 (Fisher–Yates).
 *
 * **입력 순서에 흔들리지 않게, 부르는 쪽에서 먼저 학번순으로 세워 canonical 로 만든 뒤**
 * 넘긴다. 그래야 목록이 어떤 차례로 들어오든 같은 세션·같은 제출자 집합이면 같은 결과가 난다.
 */
function seededShuffle<T>(canonical: T[], seed: string): T[] {
  const rng = mulberry32(hashString(seed));
  const arr = [...canonical];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 누가 누구 작품을 보는지 정한다.
 *
 * 자유 선택만 두면 결과가 뻔하다 — 그림 잘 그리는 몇 명에게 몰리고, 나머지는 아무도 안 본다.
 * 30분 수업에서 "아무도 내 걸 안 봤다"는 경험은 다음 활동 참여를 그대로 깎아먹는다.
 * 그래서 **필수 N편은 서버가 배정**한다 (기본 2편 + 자유 선택 1편, 또는 자유 없이 배정만).
 *
 * 배정은 제출한 사람들을 한 줄로 늘어놓고 내 뒤 N명을 준다. 마지막 사람은 처음으로
 * 돌아온다(순환). 이러면 모든 작품이 정확히 N번씩 배정된다 — 아무도 빠지지 않는다.
 *
 * 학번 자체에 +1 을 하지 않는 이유: 결석하거나 아직 제출하지 않은 학생이 있으면 그 번호가
 * 비어 배정이 통째로 어긋난다. 제출한 사람들 안에서 세는 쪽이 항상 성립한다.
 *
 * ## 줄 세우는 방식은 두 가지다 (options.mode)
 *
 *  - "cyclic"(기본) — **학번 순.** 지금까지의 모든 동료 검토 차시가 이 길로 온다.
 *    options 를 안 주면 여기다 — 기존 동작이 한 줄도 바뀌지 않는다.
 *  - "random" — 학번순 canonical 을 세션 시드로 **한 번** 섞은 순서. 그 위에 같은 순환
 *    로직을 그대로 얹는다. 여러 반이 섞인 분반에서 학번순이면 같은 반끼리 몰리는 것을 푼다.
 *    폴링마다 다시 섞이지 않고(시드가 세션 고정), 모든 작품은 여전히 정확히 N번 배정된다.
 *
 * ## 몇 편을 배정할지 (options.count)
 *
 * 안 주면 **2** — 지금까지의 필수 2편 그대로다. 자유 선택을 없애고 배정만으로 채우는
 * 차시는 3 을 준다(인간과 인공지능 5차시). "내 뒤 N명" 이라 제출자가 N+1명 이상이면
 * 모든 작품이 정확히 N번씩 배정된다.
 */
export function assignPeers(
  submitted: Artifact[],
  myStudentId: string,
  options?: { mode?: PeerAssignMode; seed?: string; count?: number },
): Artifact[] {
  // 배정 편수. 안 주면 2 (기존 동작). 최소 1 로 막아 이상한 값에도 무너지지 않게.
  const count = Math.max(1, options?.count ?? 2);
  // 어느 방식이든 먼저 학번순 canonical 로 세운다 — 입력 차례에 결과가 흔들리지 않게.
  const canonical = [...submitted].sort((a, b) => a.studentId.localeCompare(b.studentId));
  const ordered =
    options?.mode === "random" ? seededShuffle(canonical, options.seed ?? "") : canonical;
  const others = ordered.filter((row) => row.studentId !== myStudentId);
  if (others.length === 0) return [];

  const myIndex = ordered.findIndex((row) => row.studentId === myStudentId);

  /*
   * 아직 제출하지 않은 학생에게도 볼 것은 줘야 한다 (안 그리고 있는 학생일수록 남의 것을
   * 봐야 시작한다). 다만 전부 맨 앞 편으로 보내면 앞 작품에만 사람이 몰린다.
   * 학번을 시작점으로 삼아 흩뜨린다. (이 학생들은 배정 균형에는 안 든다 — 볼 것만 준다.)
   */
  if (myIndex < 0) {
    const seed = Number(myStudentId.slice(-2)) || 0;
    const start = seed % others.length;
    const picked: Artifact[] = [];
    for (let step = 0; step < others.length && picked.length < count; step += 1) {
      const candidate = others[(start + step) % others.length];
      if (picked.some((row) => row.id === candidate.id)) continue;
      picked.push(candidate);
    }
    return picked;
  }

  // 제출한 학생은 자기 뒤 N명 — 마지막 사람은 처음으로 돌아온다.
  // 제출자가 N+1명 이상이면 모든 작품이 정확히 N번씩 배정된다.
  // 제출자가 그보다 적으면 있는 만큼만 — 인원이 모자란 것이지 배정이 틀린 것은 아니다.
  const picked: Artifact[] = [];
  for (let step = 1; step <= ordered.length && picked.length < count; step += 1) {
    const candidate = ordered[(myIndex + step) % ordered.length];
    if (candidate.studentId === myStudentId) continue;
    if (picked.some((row) => row.id === candidate.id)) continue;
    picked.push(candidate);
  }
  return picked;
}

/**
 * 갤러리에 올라갈 자격 — **그린 것이 있고**, 교사가 숨기지 않은 것.
 *
 * 처음에는 "제출"을 눌러야 올라가게 했다. 그런데 30분 수업에서 제출까지 가는 학생은
 * 마지막 몇 분에나 나온다. 그때까지 갤러리는 텅 비어 있고, 감상 단계로 넘겨도 볼 것이
 * 없어 활동 자체가 성립하지 않는다.
 *
 * 그리는 중인 그림이 보이는 것은 오히려 낫다. 남이 무엇을 그리는지 보면 막혀 있던
 * 학생이 시작한다. 완성 여부는 제출 표시로 교사만 따로 본다.
 */
export function isVisible(artifact: Artifact): boolean {
  if (artifact.hidden) return false;
  if ((artifact.strokes?.length ?? 0) > 0) return true;

  /*
   * 그림이 없는 활동도 있다 (4차시 직업 조사처럼 글만 쓰는 활동).
   * 획만 보고 판단하면 그런 차시에서는 갤러리가 영원히 비어 있다.
   */
  return Object.values(artifact.answers ?? {}).some((value) => String(value ?? "").trim());
}
