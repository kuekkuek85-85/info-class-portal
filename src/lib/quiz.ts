import type { ClassSession, QuizMedia, Trait } from "./types";

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
  index: number;
  total: number;
  revealed: boolean;
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
  const questions = session.quiz?.questions ?? [];
  if (questions.length === 0) return null;

  const total = questions.length;
  const index = clamp(session.quizIndex ?? 0, 0, total - 1);
  const revealed = session.quizRevealed === true;
  const current = questions[index];

  // 이미 지나간 문항의 스티커 + (공개됐다면) 지금 문항의 스티커
  const earned: Trait[] = [];
  for (let i = 0; i < index; i += 1) {
    for (const trait of questions[i]?.stickers ?? []) {
      if (!earned.includes(trait)) earned.push(trait);
    }
  }
  if (revealed) {
    for (const trait of current?.stickers ?? []) {
      if (!earned.includes(trait)) earned.push(trait);
    }
  }

  return {
    index,
    total,
    revealed,
    answerIndex: revealed ? current.answerIndex : null,
    nowText: revealed ? current.nowText : "",
    stickers: revealed ? (current.stickers ?? []) : [],
    media: revealed ? studentMedia(current.media) : null,
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
