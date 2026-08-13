import type { Artifact, ClassSession, QuizAnswer, Reflection, Stroke, TextItem } from "./types";

/**
 * 지난 차시 복습 — **요약을 쓰지 않고 그 반이 남긴 것을 그대로 보여준다.**
 *
 * 기분 체크는 학생마다 끝나는 시각이 다르다. 먼저 끝낸 학생은 2~3분을 그냥 앉아 있고,
 * 그 시간이 교실 분위기를 흐트러뜨린다. 그 자리를 지난 시간 복습으로 메운다.
 *
 * 재료를 새로 만들지 않는 것이 요점이다. 화면 캡처를 뜨거나 요약문을 쓰면 차시마다
 * 교사 작업이 늘고, 그게 밀리는 순간 기능이 멈춘다. 지난 시간에 **학생들이 직접 만든
 * 것**이 이미 서버에 있고, 남의 요약보다 자기 반 친구의 그림과 문장이 훨씬 붙는다.
 *
 * 실제로 같은 4문항인데 반마다 결과가 갈렸다 — "용돈 보내기"를 4반은 다 맞혔고
 * 1반은 56%, 3반은 44%만 맞혔다. 반마다 다시 짚어야 할 것이 다르다는 뜻이다.
 */

/** 복습 화면에 넘길 그림 수. 3초에 한 장이면 12장이 36초 — 붕 뜨는 시간에 맞는다 */
const MAX_DRAWINGS = 12;

/** 보여줄 성찰 문장 수 */
const MAX_QUOTES = 3;

/** 문장이 길면 화면에서 읽히지 않는다 */
const QUOTE_LENGTH = 90;

/**
 * 이 정답률을 넘으면 복습 문항을 띄우지 않는다.
 *
 * 4반은 지난 시간 네 문항을 94·95·100·100% 로 맞혔다. 가장 낮은 것을 골라 다시 물어도
 * 스무 명 중 한 명을 위한 1분이다. 30분 수업에서 그 1분은 그리기에서 빠진다.
 * 반대로 1반(56%)·3반(44%)처럼 갈린 반은 반드시 짚어야 한다.
 */
const REASK_BELOW = 85;

export interface ReviewDrawing {
  place: string;
  year: number;
  strokes: Stroke[];
  texts: TextItem[];
}

export interface ReviewQuestion {
  prompt: string;
  choices: string[];
  answerIndex: number;
  nowText: string;
  /** 지난 시간 이 반의 정답률 (%) — 교사 화면에서 쓴다 */
  percent: number;
}

export interface Review {
  lessonNo: number;
  title: string;
  drawings: ReviewDrawing[];
  quotes: string[];
  question: ReviewQuestion | null;
  /** 교사 화면에 뜨는 한 줄 */
  summary: string;
}

/**
 * 지난 차시 세션을 고른다.
 *
 * 같은 반, 차시 번호가 하나 작은 것 중 **가장 최근 날짜**. 같은 차시를 두 번 한 경우
 * (보강·재수업) 나중 것이 지난 시간이다.
 */
export function findPreviousSession(
  sessions: ClassSession[],
  current: ClassSession,
): ClassSession | null {
  const candidates = sessions
    .filter((s) => s.classNo === current.classNo)
    .filter((s) => s.lessonNo === current.lessonNo - 1)
    .filter((s) => s.id !== current.id)
    // 리허설은 학생 기록이 아니다 — 복습 재료로 쓰면 교사 혼자 남긴 것이 반 전체 것처럼 보인다
    .filter((s) => !s.rehearsal)
    .sort((a, b) => b.date.localeCompare(a.date) || b.period - a.period);

  return candidates[0] ?? null;
}

/**
 * 문항별 정답률을 세어 **가장 많이 틀린 문항**을 고른다.
 *
 * 아직 안 고른 문항은 -1로 저장되므로 응답 수에서 뺀다. 아무도 안 푼 문항은
 * 정답률 0%가 아니라 "고를 수 없음"이다 — 나누기 전에 걸러낸다.
 */
export function hardestQuestion(
  session: ClassSession,
  answers: QuizAnswer[],
): ReviewQuestion | null {
  const questions = session.quiz?.questions ?? [];
  if (questions.length === 0) return null;

  let worst: ReviewQuestion | null = null;

  questions.forEach((question, index) => {
    const picked = answers
      .map((row) => row.answers?.[index])
      .filter((value): value is number => typeof value === "number" && value >= 0);

    if (picked.length === 0) return;

    const right = picked.filter((value) => value === question.answerIndex).length;
    const percent = Math.round((right / picked.length) * 100);

    if (!worst || percent < worst.percent) {
      worst = {
        prompt: question.prompt,
        choices: question.choices,
        answerIndex: question.answerIndex,
        nowText: question.nowText,
        percent,
      };
    }
  });

  return worst;
}

/** 다시 물을 만한 문항인가 — 잘 맞힌 반에게 1분을 쓰지 않는다 */
export function worthReasking(question: ReviewQuestion | null): boolean {
  return Boolean(question && question.percent < REASK_BELOW);
}

/** 성찰 답에서 보여줄 문장을 고른다 — 이름은 붙이지 않는다 */
export function pickQuotes(reflections: Reflection[]): string[] {
  const all = reflections
    .flatMap((row) => row.answers ?? [])
    .map((text) => String(text ?? "").replace(/\s+/g, " ").trim())
    // 한 글자짜리나 "몰라요"류는 복습에 쓸모가 없다. 너무 긴 것은 화면에서 읽히지 않는다.
    .filter((text) => text.length >= 10)
    .map((text) => (text.length > QUOTE_LENGTH ? `${text.slice(0, QUOTE_LENGTH)}…` : text));

  /*
   * 앞에서부터 자르면 늘 같은 학생(학번 앞순번) 것만 뽑힌다.
   * 고르게 흩어 뽑아 여러 사람 문장이 나오게 한다.
   */
  if (all.length <= MAX_QUOTES) return all;
  const step = all.length / MAX_QUOTES;
  return Array.from({ length: MAX_QUOTES }, (_, i) => all[Math.floor(i * step)]);
}

/** 그림을 고른다 — 획이 있는 것만, 장소가 한쪽에 몰리지 않게 */
export function pickDrawings(artifacts: Artifact[]): ReviewDrawing[] {
  const drawn = artifacts.filter((row) => !row.hidden && (row.strokes?.length ?? 0) > 0);
  if (drawn.length === 0) return [];

  /*
   * 장소별로 한 장씩 돌아가며 뽑는다.
   * 그냥 자르면 "집"만 일곱 장 지나가고 끝난다 (4반이 실제로 그랬다).
   */
  const byPlace = new Map<string, Artifact[]>();
  for (const row of drawn) {
    const key = row.place || "기타";
    byPlace.set(key, [...(byPlace.get(key) ?? []), row]);
  }

  const picked: Artifact[] = [];
  const queues = [...byPlace.values()];
  while (picked.length < MAX_DRAWINGS) {
    const before = picked.length;
    for (const queue of queues) {
      if (picked.length >= MAX_DRAWINGS) break;
      const next = queue.shift();
      if (next) picked.push(next);
    }
    if (picked.length === before) break; // 더 뽑을 것이 없다
  }

  return picked.map((row) => ({
    place: row.place,
    year: row.year,
    strokes: row.strokes ?? [],
    texts: row.texts ?? [],
  }));
}

/** 교사 화면에 뜨는 한 줄 — 수업 들어가기 전에 읽고 한마디 하시라고 */
export function buildSummary(
  previous: ClassSession,
  drawings: ReviewDrawing[],
  question: ReviewQuestion | null,
  quoteCount: number,
): string {
  const parts: string[] = [];

  if (question && worthReasking(question)) {
    const label = question.percent < 60 ? "절반 넘게 틀렸습니다" : `${question.percent}%만 맞혔습니다`;
    parts.push(`퀴즈에서 “${question.prompt}” 를 ${label} — 학생 화면에서 다시 묻습니다`);
  } else if (question) {
    // 잘 맞힌 반에게도 상태는 알려 준다. 다시 묻지 않는 이유가 되기도 한다.
    parts.push(`퀴즈는 가장 낮은 문항도 ${question.percent}% — 다시 묻지 않습니다`);
  }

  if (drawings.length > 0) {
    const counts = new Map<string, number>();
    for (const row of drawings) counts.set(row.place, (counts.get(row.place) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    parts.push(`그림 ${drawings.length}장 중 ${top[0]}이(가) 가장 많습니다`);
  }

  if (quoteCount > 0) parts.push(`성찰 ${quoteCount}문장을 함께 띄웁니다`);

  if (parts.length === 0) return `${previous.lessonNo}차시에 남은 기록이 없습니다.`;
  return `지난 ${previous.lessonNo}차시 — ${parts.join(" · ")}.`;
}
