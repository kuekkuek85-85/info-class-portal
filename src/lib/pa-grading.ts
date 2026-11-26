/**
 * 정보 33~34차 수행평가 「피지컬 컴퓨팅 프로젝트」 채점 - 기준·키·값 정리 (교사 전용).
 *
 * 점수는 발표 평가와 같은 별도 컬렉션(teacherEvals)에 activityId = PA_ACTIVITY 로 저장한다.
 * 학생이 닿는 어떤 라우트도 teacherEvals 를 읽지 않으므로(teacher-eval.ts 참조) 점수가 학생 화면으로 새지 않는다.
 * 학생 산출물은 학번별 공유 답안(artifacts/microbit-makecode__학번)에서 읽는다 - 리허설 문서(__rehearsal)는 안 본다.
 */

/** 채점 저장용 활동 ID (산출물 활동 ID 와 다르게 둔다 - 다른 평가와 문서 ID 가 겹치지 않게) */
export const PA_ACTIVITY = "microbit-pa-2026";
/** 학생 산출물이 들어 있는 활동 통 */
export const PA_SOURCE_ACTIVITY = "microbit-makecode";

/** 상·중·하 - 저장은 숫자(하=1, 중=2, 상=3), 0 은 '아직 안 매김' */
export const PA_LEVELS = [
  { value: 3, label: "상" },
  { value: 2, label: "중" },
  { value: 1, label: "하" },
] as const;

/** 채점 영역 - 문구는 평가 계획 그대로(32차 안내 탭과 같다). */
export const PA_CRITERIA = [
  {
    key: "understand",
    label: "① 피지컬 컴퓨팅 시스템의 이해",
    descriptors: {
      3: "컴퓨팅 시스템의 구성요소와 동작 원리를 명확히 설명하고, 생활 속 피지컬 컴퓨팅 사례를 분석하여 그 필요성과 가치를 판단함.",
      2: "구성요소와 동작 원리를 설명하고, 생활 속 사례를 조사하여 필요성과 가치를 설명함.",
      1: "구성요소와 피지컬 컴퓨팅의 개념을 부분적으로 설명함.",
    },
  },
  {
    key: "build",
    label: "② 피지컬 컴퓨팅 시스템 구현",
    descriptors: {
      3: "해결할 문제를 스스로 정하고 목적에 맞는 구성요소를 선택하여 시스템을 구상하며, 프로그램을 작성하고 오류를 수정하여 의도한 대로 동작시킴.",
      2: "안내에 따라 목적에 맞는 구성요소를 선택하여 시스템을 구성하고, 프로그램을 작성하여 동작시킴.",
      1: "교사와 동료의 도움을 받아 구성요소를 연결하고, 예시 프로그램을 수정하여 일부 기능을 동작시킴.",
    },
  },
] as const;

export const PA_MAX_COMMENT = 800;

const KEYS = new Set<string>(PA_CRITERIA.map((c) => c.key));

/** 들어온 점수에서 아는 영역만, 1~3 정수만 남긴다(0·빈 값은 '안 매김' 이라 뺀다). */
export function sanitizePaScores(input: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof input !== "object" || input === null) return out;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!KEYS.has(key)) continue;
    const n = Math.round(Number(value));
    if (n >= 1 && n <= 3) out[key] = n;
  }
  return out;
}

/** 34차 최종 제출의 필수 칸(2026-11-27 교사 결정: MakeCode 공유 링크 + 오늘 구현한 내용과 수정한 내용). */
export const PA_REQUIRED = [
  { key: "mb34_link", label: "MakeCode 공유 링크" },
  { key: "mb34_impl", label: "구현·수정 내용" },
] as const;

/** 채점 화면이 학생 한 명에게서 읽는 글 칸 (32~34차). 무거운 AI 기록·사진은 따로 다룬다. */
export const PA_TEXT_KEYS = [
  "mb32_pa_problem",
  "mb32_want_in",
  "mb32_want_out",
  "mb33_summary",
  "mb33_problem",
  "mb33_case",
  "mb33_case_value",
  "mb33_in",
  "mb33_out",
  "mb33_flow",
  // 2026-11-25 33차 재설계: 문제 정의(초기·목표 상태) · 추상화(꼭 필요한 기능) · 알고리즘
  "mb33_pc_def",
  "mb33_pc_case1",
  "mb33_pc_case2",
  "mb33_pc_case3",
  "mb33_who",
  "mb33_when",
  "mb33_what",
  "mb33_state_now",
  "mb33_state_goal",
  "mb33_func",
  "mb33_algo",
  "mb33_ai_log",
  "mb34_ai_log",
  "mb34_debug",
  "mb34_link",
  // 2026-11-27 34차 재구성: ⑤ 구현의 구현·수정 내용, 마무리 성찰 한 벌(기대 효과·확장 아이디어·후기)
  "mb34_impl",
  "mb34_reflect",
  "mb34_works",
  "mb34_concepts",
  "mb34_concepts_where",
  "mb34_code",
  "mb34_ext_idea",
  "mb34_effect",
  "mb34_extend",
] as const;

/** 포털 AI 대화 기록 칸 - 33차 구현, 34차 구현, 34차 확장 도전 */
export const PA_VIBE_KEYS = [
  { key: "mb33_vibe", label: "33차 구현 시작" },
  { key: "mb34_vibe", label: "34차 구현 완성" },
  { key: "mb34_ext_vibe", label: "34차 확장 도전" },
] as const;

export interface PaVibeEntry {
  prompt: string;
  code: string;
  explanation: string;
  at: number;
  from?: "base" | "last" | "mine";
  startCode?: string;
}

/**
 * AI 기록 상태: none(안 씀) · ok(온전) · broken(잘려서 볼 수 없음).
 * broken 은 2026-11-19 에 고친 저장 오류(활동지 자동저장이 500자로 잘라 덮어씀) 때문이라 학생 잘못이 아니다.
 */
export type PaVibeStatus = "none" | "ok" | "broken";

export function parseVibeLog(raw: string | undefined): { status: PaVibeStatus; entries: PaVibeEntry[] } {
  if (!raw || !raw.trim()) return { status: "none", entries: [] };
  try {
    const value = JSON.parse(raw) as { entries?: unknown };
    if (!Array.isArray(value.entries)) return { status: "broken", entries: [] };
    return { status: "ok", entries: value.entries as PaVibeEntry[] };
  } catch {
    return { status: "broken", entries: [] };
  }
}
