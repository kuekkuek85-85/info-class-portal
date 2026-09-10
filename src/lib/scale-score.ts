/**
 * 척도 문항(1~4점) 자동 채점 — 순수 함수.
 *
 * 10차시 스마트폰 중독 자가진단이 쓴다. 학생이 고른 선지 **문구**를 선지 배열(choices)의
 * index 로 되짚어 점수화한다 — 문구를 하드코딩하지 않으므로, 선지 문구가 바뀌어도 채점이
 * 안 깨진다. 역채점 문항은 점수를 뒤집는다.
 *
 * 결과는 **학생 본인 화면에서만** 계산해 보여준다(클라이언트). 어디에도 저장하지 않는다 —
 * 각 문항 답(sc_q*)은 이미 개인용으로 저장되므로 교사는 응답으로 확인할 수 있다.
 * 점수를 서열화하거나 공개하지 않는다.
 */

export interface ScaleBand {
  /** 이 구간에 들어가는 최소 총점(이상). 큰 것부터 맞춰 본다 */
  min: number;
  label: string;
  desc: string;
}

export interface ScaleConfig {
  /** 합산할 문항 key 들 (sc_q1 … sc_q15) */
  sumKeys: string[];
  /** 역채점할 문항 key 들 (sc_q8 · sc_q10 · sc_q13) */
  reverseKeys?: string[];
  /**
   * 선지 배열 — 낮은 점수부터 높은 점수 순. 점수 = index + 1.
   * (전혀 그렇지 않다=1 · 그렇지 않다=2 · 그렇다=3 · 매우 그렇다=4)
   * 역채점 문항은 (choices.length + 1 - 점수) 로 뒤집는다.
   */
  choices: string[];
  /** 구간 경계·라벨·설명 */
  bands: ScaleBand[];
}

export interface ScaleResult {
  /** 지금까지 응답한 문항 수 */
  answered: number;
  /** 채점 대상 문항 수 */
  total: number;
  /** 지금까지 고른 문항만 더한 합(실시간). 하나도 안 골랐으면 0 */
  running: number;
  /** 다 응답했을 때의 총점. 아직 다 안 골랐으면 null */
  score: number | null;
  /** 만점 (total × 선지 수) */
  max: number;
  /** 다 응답했을 때의 결과 구간. 아직이면 null */
  band: ScaleBand | null;
}

/**
 * 학생의 현재 답에서 총점과 결과 구간을 계산한다.
 *
 * 아직 다 안 골랐으면 score·band 를 null 로 두고 answered/total 만 채운다 —
 * 화면이 "아직 O/N 응답" 안내를 띄우게 한다.
 */
export function computeScaleResult(
  answers: Record<string, string>,
  cfg: ScaleConfig,
): ScaleResult {
  const n = cfg.choices.length;
  const reverse = new Set(cfg.reverseKeys ?? []);
  const total = cfg.sumKeys.length;
  const max = total * n;

  let answered = 0;
  let score = 0;
  for (const key of cfg.sumKeys) {
    const label = (answers[key] ?? "").trim();
    const idx = cfg.choices.indexOf(label);
    // 안 고른 문항·알 수 없는 값은 건너뛴다
    if (idx < 0) continue;
    answered += 1;
    const base = idx + 1; // 1..n
    // 역채점: 매우 그렇다(base=n)=1점 … 전혀 그렇지 않다(base=1)=n점
    score += reverse.has(key) ? n + 1 - base : base;
  }

  if (answered < total) return { answered, total, running: score, score: null, max, band: null };

  // 큰 경계부터 맞춰 본다 — 총점이 그 경계 이상인 첫 구간
  const sorted = [...cfg.bands].sort((a, b) => b.min - a.min);
  const band = sorted.find((b) => score >= b.min) ?? sorted[sorted.length - 1] ?? null;
  return { answered, total, running: score, score, max, band };
}
