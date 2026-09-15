import type { ClassSession, LessonPhase, QuizMedia, Trait } from "./types";

/**
 * 퀴즈 진행 상태를 세션에서 읽어 학생 화면이 쓸 형태로 만든다.
 *
 * **정답(answerIndex)과 해설(nowText)은 공개된 뒤에만 넣는다.**
 * 화면에서만 감추면 개발자 도구로 응답을 열어 보는 것으로 끝난다. 중1이 그렇게까지 할까
 * 싶지만, 한 명이 알아내면 그 반 전체가 알게 되고 퀴즈가 무의미해진다. 애초에 안 보낸다.
 *
 * 세션 문서는 phase 폴링에서 이미 캐시된 것을 쓰므로 추가 읽기가 없다 (PRD 10장 D2).
 */

export interface QuizView {
  /** 이 단계 안에서의 위치 (0부터). 화면 표시용 — 3/10 의 3 */
  index: number;
  /** 이 단계의 문항 수 — 3/10 의 10 */
  total: number;
  /**
   * 전체 배열 기준 문항 번호. 학생이 답을 제출·기록할 때 이 번호를 쓴다 — 집계가
   * 단계와 무관하게 어긋나지 않도록(quiz-stats 는 글로벌 인덱스로 센다).
   */
  globalIndex: number;
  /** 화면에 표시할 퀴즈 이름 (기본 "타임머신") */
  label: string;
  /** 답하는 방식 (기본 "choice"). "text" 면 학생이 글칸에 직접 적는다 */
  answerType: "choice" | "text";
  /** 단답형 입력칸 (answerType 이 "text" 일 때만 채워진다). audioUrl 은 절대 안 내려간다 */
  answerFields: { key: string; label: string; placeholder?: string }[];
  /**
   * 이 문항에 교사 화면 재생용 음성(audioUrl)이 있는가. 주소 자체는 안 내려보내고
   * "앞 화면을 듣고" 안내만 켜는 용도다(노래·문장 감정 문항).
   */
  hasAudio: boolean;
  revealed: boolean;
  /**
   * 의견형 문항을 「분포 공개」했을 때 학생 화면에 보일 응답 분포. 아니면 null.
   * counts 는 선지별 응답 수. answered 는 총 응답 수.
   */
  dist: { counts: number[]; answered: number } | null;
  /** 공개 뒤에만 채워진다 */
  answerIndex: number | null;
  nowText: string;
  stickers: Trait[];
  /**
   * 공개 뒤에만 내려간다.
   *
   * 영상은 주소를 빼고 종류만 알려 준다 — 학생 태블릿에서 영상이 열릴 수 있으면
   * 30명이 각자 다른 지점을 보게 된다. 재생은 전자칠판에서만 한다 (PRD 3.2).
   */
  media: (Omit<QuizMedia, "url"> & { url: string }) | null;
  /**
   * 지금까지 모은 특성 스티커 (누적).
   *
   * 클라이언트가 쌓게 두면 중간에 들어온 학생·새로고침한 학생만 스티커가 비어 있다.
   * 네 문항이 끝났을 때 다섯 특성이 화면에 다 남아 있는 것이 이 수업의 결론이므로,
   * 누적은 서버가 계산해서 내려보낸다.
   */
  earned: Trait[];
}

export function quizView(session: ClassSession): QuizView | null {
  const all = session.quiz?.questions ?? [];
  if (all.length === 0) return null;

  // 이 단계(phase)에 속한 문항만 — group 이 없으면 "quiz" 단계 소속(기존 타임머신 퀴즈).
  const phase = session.phase as LessonPhase;
  const inGroup = (q: { group?: LessonPhase }) => (q.group ?? "quiz") === phase;

  const globalIndex = clamp(session.quizIndex ?? 0, 0, all.length - 1);
  const current = all[globalIndex];
  // 지금 quizIndex 가 이 단계 문항이 아니면(다른 단계 퀴즈를 가리킴) 이 화면엔 퀴즈가 없다.
  if (!current || !inGroup(current)) return null;

  // 이 단계 문항들의 글로벌 인덱스 목록 → 화면 표시용 위치(3/10)와 스티커 누적에 쓴다.
  const groupIdx: number[] = [];
  for (let i = 0; i < all.length; i += 1) if (inGroup(all[i])) groupIdx.push(i);
  const index = groupIdx.indexOf(globalIndex);
  const total = groupIdx.length;

  const revealed = session.quizRevealed === true;

  // 이 단계에서 지나온 문항의 스티커 + (공개됐다면) 지금 문항의 스티커
  const earned: Trait[] = [];
  for (let k = 0; k < index; k += 1) {
    for (const trait of all[groupIdx[k]]?.stickers ?? []) {
      if (!earned.includes(trait)) earned.push(trait);
    }
  }
  if (revealed) {
    for (const trait of current.stickers ?? []) {
      if (!earned.includes(trait)) earned.push(trait);
    }
  }

  // 투표 중에도 보여줄 문항(mediaWhileVoting)은 공개 전에도 media 를 내려보낸다.
  const showMedia = revealed || current.mediaWhileVoting === true;
  // 의견형 문항은 정답이 없다 — 공개돼도 "← 정답" 강조가 뜨지 않도록 answerIndex 를 안 보낸다.
  const showAnswer = revealed && current.opinion !== true;
  // 의견형을 「분포 공개」했으면(서버가 quizDist 를 채움) 학생에게 분포를 내려보낸다.
  const dist =
    revealed && current.opinion === true && session.quizDist?.index === globalIndex
      ? { counts: session.quizDist.counts, answered: session.quizDist.answered }
      : null;

  return {
    index,
    total,
    globalIndex,
    label: session.quiz?.label ?? "타임머신",
    answerType: current.answerType ?? "choice",
    answerFields: current.answerType === "text" ? (current.answerFields ?? []) : [],
    hasAudio: Boolean(current.audioUrl),
    revealed,
    dist,
    answerIndex: showAnswer ? current.answerIndex : null,
    nowText: revealed ? current.nowText : "",
    stickers: revealed ? (current.stickers ?? []) : [],
    media: showMedia ? studentMedia(current.media) : null,
    earned,
  };
}

/**
 * 학생에게 내려보낼 자료.
 *
 * 사진은 주소째 보낸다 — 태블릿에서 봐도 흩어질 일이 없고, 오히려 가까이 보는 편이 낫다.
 * 영상은 **주소를 지운다.** 종류만 알려 주면 화면은 "앞을 보라"고 안내할 수 있고,
 * 주소가 없으니 태블릿에서 열리는 경로 자체가 없다.
 */
function studentMedia(media: QuizMedia | undefined): QuizView["media"] {
  if (!media?.url) return null;
  if (media.kind === "video") {
    return { kind: "video", url: "", caption: media.caption, credit: media.credit };
  }
  return { kind: "image", url: media.url, caption: media.caption, credit: media.credit };
}

/** 학생에게 내려보내도 되는 문항 목록 — 정답과 해설을 뺀 것 */
export function publicQuestions(session: ClassSession) {
  return (session.quiz?.questions ?? []).map((question) => ({
    prompt: question.prompt,
    choices: question.choices,
  }));
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}
