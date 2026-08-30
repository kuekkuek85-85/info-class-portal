/**
 * 기사 판정 — 코드가 셀 수 있는 것만.
 *
 * ## 왜 AI 가 아닌가
 *
 * 빈 칸과 글자 수는 세면 안다. AI 에게 물으면 몇 초를 기다리고, 틀리기도 하고,
 * 스물여덟 명이 한꺼번에 내면 호출이 몰린다. 세는 쪽이 즉시 뜨고 정확하고 실패하지
 * 않는다. AI 가 필요한 것은 오탈자 하나뿐이다 (ai-review.ts 의 findTypos).
 *
 * ## 내용은 보지 않는다
 *
 * ②의 '왜' 가 충분한지, ③이 ①② 와 이어지는지는 여기서 판단하지 않는다. 그것은
 * 교사의 몫이다 — **정성 평가를 기계에 맡기지 않는다**는 것이 이 수행평가의 원칙이다.
 * 여기서 하는 일은 "조건이 갖춰졌는가" 까지다.
 *
 * ## 서버·브라우저 양쪽에서 돈다
 *
 * 순수 함수만 둔다. 서버는 제출을 받을 때 쓰고(api/student/submit), 교사 화면은
 * 반영 여부를 다시 셀 때 쓴다(teacher-review-panel). 같은 규칙으로 세야 학생이 본
 * 것과 교사가 보는 것이 어긋나지 않는다.
 */

export type CheckKind = "empty" | "short" | "ask" | "typo";

export interface CheckItem {
  /** 같은 항목인지 가리는 열쇠. `empty:news_real` 꼴 */
  code: string;
  /** 고칠 칸의 활동지 키. 「그 칸으로」 단추가 쓴다. 출처·오탈자는 빈 문자열 */
  field: string;
  kind: CheckKind;
  /** 학생에게 그대로 보이는 문장 */
  label: string;
  /** 오탈자 낱말 등 */
  detail?: string;
}

export interface FieldRule {
  key: string;
  label: string;
  /** 글자 수 최소치 */
  min: number;
}

/**
 * 7차시 기본값. 차시가 `submitFields` 로 덮을 수 있다.
 *
 * 최소치는 "이만큼은 써야 기사다" 가 아니라 **"이보다 짧으면 아직 안 쓴 것"** 의
 * 선이다. 넉넉히 잡으면 다 쓴 학생을 붙잡고, 빡빡하게 잡으면 한 줄만 쓰고 넘어간다.
 */
export const ARTICLE_RULES: readonly FieldRule[] = [
  { key: "news_title", label: "제목", min: 5 },
  { key: "news_scene", label: "① 현장", min: 60 },
  { key: "news_change", label: "② 무엇이 바뀌었나 · 왜", min: 80 },
  { key: "news_real", label: "③ 이미 시작되고 있다", min: 40 },
  { key: "news_interview", label: "④ 인터뷰", min: 40 },
] as const;

export interface Sources {
  site: string;
  ai: string;
}

const len = (value: string | undefined): number => (value ?? "").trim().length;

const hasSource = (sources: Sources | undefined): boolean =>
  len(sources?.site) > 0 || len(sources?.ai) > 0;

/**
 * 빈 칸 · 짧은 칸 · 출처를 본다. 오탈자는 여기서 만들지 않는다 (AI 몫).
 *
 * `askedSource` 가 true 면 출처를 다시 묻지 않는다 — **한 번 묻고 두 번은 묻지 않는다.**
 * 안 찾고 쓴 것이 맞다고 답한 학생에게 같은 질문을 또 띄우면 그것은 지적이 된다.
 */
export function checkArticle(
  answers: Record<string, string> | undefined,
  sources: Sources | undefined,
  rules: readonly FieldRule[] = ARTICLE_RULES,
  askedSource = false,
): CheckItem[] {
  const answered = answers ?? {};
  const items: CheckItem[] = [];

  for (const rule of rules) {
    const n = len(answered[rule.key]);
    if (n === 0) {
      items.push({
        code: `empty:${rule.key}`,
        field: rule.key,
        kind: "empty",
        label: `${rule.label}이 비어 있어요`,
      });
    } else if (n < rule.min) {
      items.push({
        code: `short:${rule.key}`,
        field: rule.key,
        kind: "short",
        label: `${rule.label}이 ${n}자예요 (${rule.min}자는 넘겨 주세요)`,
      });
    }
  }

  /*
   * 출처가 비어도 결함이 아니다.
   *
   * 안 찾고 쓰는 학생이 있고, 그것을 "빠뜨림" 으로 표시하면 안 찾은 것을 숨기게 된다.
   * 물어보기만 하고, 그대로 두어도 된다고 함께 알린다.
   */
  if (!hasSource(sources) && !askedSource) {
    items.push({
      code: "ask:source",
      field: "",
      kind: "ask",
      label: "출처를 안 적으셨네요. 안 찾고 쓴 게 맞나요? 맞다면 그대로 두셔도 됩니다",
    });
  }

  return items;
}

/**
 * 2차 제출 문턱.
 *
 * 빈 칸과 짧은 칸만이다. 출처는 일부러 비울 수 있고, 오탈자는 방언이나 일부러 쓴
 * 말을 잘못 짚을 수 있다. **문턱이 학생을 가두면 안 된다** — 막는 목적은 대충 고치고
 * 넘어가는 길을 좁히는 것이지 통과 못 하게 하는 것이 아니다.
 */
export function gateItems(items: readonly CheckItem[]): CheckItem[] {
  return items.filter((item) => item.kind === "empty" || item.kind === "short");
}

export type ResolutionState = "fixed" | "open" | "asked";

export interface Resolution {
  item: CheckItem;
  state: ResolutionState;
  /** 지금 상태 — "87자" · "그대로 두었습니다" 처럼 교사 화면에 붙는다 */
  now: string;
}

/**
 * 1차에 짚은 것이 **지금** 어떻게 되었는지 다시 센다.
 *
 * 학생이 「고쳤어요」를 눌러도 실제로 안 고쳤으면 open 이다. 자기 신고를 믿지 않는다.
 *
 * 스냅샷을 쌓지 않고 매번 다시 세는 이유: 교사를 기다리는 동안에도 학생은 계속 고친다.
 * 2차 제출 시점을 얼려 두면 교사가 읽는 글과 화면의 표시가 어긋난다.
 */
export function resolveItems(
  items: readonly CheckItem[],
  answers: Record<string, string> | undefined,
  sources: Sources | undefined,
  rules: readonly FieldRule[] = ARTICLE_RULES,
): Resolution[] {
  const answered = answers ?? {};

  return items.map((item) => {
    if (item.kind === "ask") {
      const filled = hasSource(sources);
      return {
        item,
        state: filled ? "fixed" : "asked",
        now: filled ? "채웠습니다" : "그대로 두었습니다",
      };
    }

    if (item.kind === "typo") {
      const word = item.detail ?? "";
      // 낱말이 본문에서 사라졌으면 고친 것으로 본다. 어떻게 고쳤는지는 묻지 않는다
      const still = word
        ? Object.values(answered).some((value) => (value ?? "").includes(word))
        : false;
      return { item, state: still ? "open" : "fixed", now: still ? "그대로" : "고쳤습니다" };
    }

    const rule = rules.find((r) => r.key === item.field);
    const n = len(answered[item.field]);
    const passed = rule ? n >= rule.min : n > 0;
    return { item, state: passed ? "fixed" : "open", now: `${n}자` };
  });
}
