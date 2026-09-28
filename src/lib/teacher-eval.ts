/**
 * 교사 전용 발표 평가 — 기준·척도와 값 정리 (인간과 인공지능 7·8차시).
 *
 * ## 왜 teacherFeedback 과 완전히 분리하는가
 *
 * teacherFeedback.note 는 **학생에게 보여주는** 피드백이다 (teacher-note-panel 이 차시를
 * 가리지 않고 읽고, 6차시 '받은 피드백' 표가 그대로 띄운다). 발표 채점 점수를 거기 적으면
 * 학생 화면으로 새고, 3~5차 교사 피드백까지 덮어쓴다. 그래서 발표 평가는 teacherFeedback 을
 * 절대 건드리지 않고 **별도 컬렉션(teacherEvals)** 에 저장한다. 이 값은 교사 화면
 * (/teacher/eval) 에서만 읽고, 학생이 닿는 어떤 라우트·컴포넌트도 이 컬렉션을 조회하지 않는다.
 *
 * 기준은 6차시 교사 루브릭과 같다. 항목 만점(TEACHER_EVAL_MAX)은 교사가 바꾸려면 이 값만
 * 고치면 된다 — 화면·검증이 모두 이 상수를 읽는다.
 */

/** 각 항목 만점. 0 ~ 이 값 사이 정수. 바꾸려면 여기만 고친다 (화면·검증이 함께 읽는다). */
export const TEACHER_EVAL_MAX = 3;

/** 교사 루브릭 기준 (6차시 교사평가 기준과 같음). key 로 저장, label 로 표시. */
export const TEACHER_EVAL_CRITERIA = [
  { key: "content", label: "내용 충실성" },
  { key: "problem", label: "문제·해결의 적절성" },
  { key: "creativity", label: "창의성" },
  { key: "delivery", label: "전달력" },
  { key: "feedback", label: "동료 피드백 반영" },
] as const;

/** 코멘트 최대 길이 */
export const TEACHER_EVAL_MAX_COMMENT = 800;

const CRITERIA_KEYS = new Set<string>(TEACHER_EVAL_CRITERIA.map((c) => c.key));

/**
 * 들어온 점수 표에서 **아는 기준만**, **0~만점 정수만** 추린다.
 *
 * 화면이 보낸 값을 그대로 믿지 않는다 — 모르는 키·범위 밖·소수·문자열은 버린다.
 * 서버(save)와 표시(total)가 같은 규칙을 쓰도록 여기 한 곳에 둔다.
 */
export function sanitizeScores(input: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof input !== "object" || input === null) return out;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!CRITERIA_KEYS.has(key)) continue;
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n < 0 || n > TEACHER_EVAL_MAX) continue;
    out[key] = n;
  }
  return out;
}

/** 정리된 점수의 합. 만점은 기준 수 × 항목 만점. */
export function evalTotal(scores: Record<string, number>): number {
  return TEACHER_EVAL_CRITERIA.reduce((sum, c) => sum + (scores[c.key] ?? 0), 0);
}

/** 만점(표시용) */
export const TEACHER_EVAL_TOTAL_MAX = TEACHER_EVAL_CRITERIA.length * TEACHER_EVAL_MAX;
