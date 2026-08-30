# 정보과 7차시 수행평가 완료 차시 — 구현 계획

> **작업자에게:** 이 계획은 한 과제씩 끝내고 검증한 뒤 다음으로 넘어간다.
> 체크박스(`- [ ]`)로 진행을 표시한다.

**목표:** 6차시 그림·밑기사를 이어받아 기사 한 편을 완성하고, 1차 → AI 점검 → 2차 →
교사 피드백 → 최종의 3단계로 제출하는 40분 차시를 만든다.

**접근:** 루프를 활동지 안의 새 문항 종류(`submit`) 한 칸으로 넣는다. 단계를 새로 파지
않는다 — 학생마다 진도가 다른 것이 전제이므로 교사가 전체를 넘기는 구조를 쓸 수 없다.
점검은 **코드로 판정**하고 AI 는 오탈자만 본다.

**기술:** Next.js 16 App Router · Firebase Admin/Firestore · Tailwind v4 · Gemini

## 전체 제약

- **테스트 러너가 없다.** 이 저장소는 `npx tsc --noEmit` → `npm run lint` →
  `npm run build` → 브라우저 확인으로 검증해 왔다. 오늘 vitest 를 새로 들이지 않는다.
  각 과제의 검증 단계는 그 방식을 따른다.
- **활동 통은 `career-plan`.** 5·6차시와 같다. 그림과 ①② 가 같은 artifact 에 있다.
- **AI 는 정성 평가를 하지 않는다.** 빠진 조건·길이·오탈자만. 내용 판단은 교사 몫이다.
- **출처가 비어도 결함이 아니다.** 묻기만 하고, 문턱에서 제외한다.
- **읽기 비용:** 새 학생별 값은 attendance 문서에 얹는다 (PRD 10장 D2). 기사 본문은
  교사가 그 학생을 누를 때만 읽는다.
- **수업 중 배포 금지.** 작업 전 `Get-Date` 로 확인한다.
- 커밋 메시지는 한국어. 끝에 `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## 파일 구성

| 파일 | 책임 |
|---|---|
| `src/lib/article-check.ts` | **신규.** 순수 판정 — 빈 칸·길이·출처·오탈자 해결 여부 |
| `src/lib/types.ts` | 수정. `submit` 종류, artifact 3필드, attendance 2필드 |
| `src/lib/ai-review.ts` | 수정. `findTypos()` 추가 |
| `scripts/seed-lesson7.ts` | **신규.** 7차시 등록 |
| `src/app/api/student/submit/route.ts` | **신규.** POST 제출 / GET 상태 |
| `src/app/api/teacher/review/route.ts` | **신규.** 교사 피드백 저장 |
| `src/components/submit-panel.tsx` | **신규.** 제출 칸 (단계별 얼굴) |
| `src/components/worksheet-view.tsx` | 수정. `submit` 분기 한 줄 |
| `src/app/api/teacher/dashboard/route.ts` | 수정. 행에 `stage`·`waiting` 추가 |
| `src/app/teacher/dashboard/page.tsx` | 수정. 대기 줄 + 소리 |
| `src/components/teacher-review-panel.tsx` | **신규.** ✓✗ + 칩 + 한 줄 |

---

## Task 1: 판정 라이브러리와 타입

**Files:**
- Create: `src/lib/article-check.ts`
- Modify: `src/lib/types.ts`

**Interfaces:**
- Produces: `CheckItem`, `Resolution`, `ARTICLE_RULES`, `checkArticle()`,
  `gateItems()`, `resolveItems()` — Task 3·5·8 이 전부 이것을 쓴다.

- [ ] **Step 1: `src/lib/types.ts` 에 문항 종류를 더한다**

`kind` 유니온에 `| "submit"` 을 추가하고, 아래 필드를 `WorksheetQuestion` 에 붙인다.

```ts
  /**
   * submit 이 판정할 칸들. 없으면 ARTICLE_RULES 기본값을 쓴다.
   *
   * min 은 글자 수 최소치다. 빈 칸과 짧은 칸만 문턱이 되고, 출처와 오탈자는
   * 문턱에서 빠진다 — 일부러 비우는 학생과 오탐이 있기 때문이다.
   */
  submitFields?: { key: string; label: string; min: number }[];
```

- [ ] **Step 2: `Artifact` 에 3필드를 더한다**

```ts
  /** 0=미제출 1=1차 2=2차(교사 대기) 3=최종 */
  submitStage?: 0 | 1 | 2 | 3;
  /**
   * 1차 제출 때 코드가 짚은 것 + 오탈자.
   *
   * 반영 여부는 저장하지 않는다. 교사가 여는 순간 다시 세므로(resolveItems),
   * 기다리는 동안 학생이 더 고친 것이 그대로 반영된다.
   */
  aiCheck?: { at: number; items: import("./article-check").CheckItem[] };
  /** 교사 피드백. 칩은 보조, note 가 본체 */
  teacherFeedback?: { at: number; chips: string[]; note: string };
```

- [ ] **Step 3: `Attendance` 에 2필드를 더한다**

이탈·위기 신호와 같은 자리다. 대시보드가 이미 읽는 문서라 추가 읽기가 0건이다.

```ts
  /*
   * 제출 단계 (교사 대기 줄).
   *
   * 이탈 누적치와 같은 이유로 여기에 얹는다 — 대시보드가 이미 이 문서를 읽고 있어서
   * 추가 읽기가 0건이다. artifact 를 함께 읽으면 폴링마다 28건이 붙는다.
   */
  submitStage?: 0 | 1 | 2 | 3;
  /** 교사가 피드백을 보낸 시각. 대기 줄에서 빠지는 기준 */
  reviewedAt?: number;
  /** 2차 전 자기 점검 답. 대기 줄 순서를 정한다 */
  selfCheck?: string;
```

- [ ] **Step 4: `src/lib/article-check.ts` 를 만든다**

```ts
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
 * ②의 '왜' 가 충분한지, ③이 ①② 와 이어지는지는 여기서 판단하지 않는다.
 * 그것은 교사의 몫이다 — 정성 평가를 기계에 맡기지 않는다는 것이 이 수업의 원칙이다.
 */

export type CheckKind = "empty" | "short" | "ask" | "typo";

export interface CheckItem {
  /** 같은 항목인지 가리는 열쇠. `empty:news_real` 꼴 */
  code: string;
  /** 고칠 칸의 활동지 키. 「그 칸으로」 단추가 쓴다. 출처는 빈 문자열 */
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
  min: number;
}

/** 7차시 기본값. 차시가 submitFields 로 덮을 수 있다 */
export const ARTICLE_RULES: FieldRule[] = [
  { key: "news_title", label: "제목", min: 5 },
  { key: "news_scene", label: "① 현장", min: 60 },
  { key: "news_change", label: "② 무엇이 바뀌었나 · 왜", min: 80 },
  { key: "news_real", label: "③ 이미 시작되고 있다", min: 40 },
  { key: "news_interview", label: "④ 인터뷰", min: 40 },
];

const len = (v: string | undefined): number => (v ?? "").trim().length;

/**
 * 빈 칸 · 짧은 칸 · 출처를 본다. 오탈자는 여기서 안 만든다 (AI 몫).
 *
 * `askedSource` 가 true 면 출처를 다시 묻지 않는다 — 한 번 묻고 두 번은 묻지 않는다.
 */
export function checkArticle(
  answers: Record<string, string>,
  sources: { site: string; ai: string },
  rules: FieldRule[] = ARTICLE_RULES,
  askedSource = false,
): CheckItem[] {
  const items: CheckItem[] = [];

  for (const rule of rules) {
    const n = len(answers[rule.key]);
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

  const hasSource = len(sources.site) > 0 || len(sources.ai) > 0;
  if (!hasSource && !askedSource) {
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
 * 말을 잘못 짚을 수 있다. 문턱이 학생을 가두면 안 된다.
 */
export function gateItems(items: CheckItem[]): CheckItem[] {
  return items.filter((i) => i.kind === "empty" || i.kind === "short");
}

export type ResolutionState = "fixed" | "open" | "asked";

export interface Resolution {
  item: CheckItem;
  state: ResolutionState;
  /** 지금 상태 — "87자" 처럼 교사 화면에 붙는다 */
  now: string;
}

/**
 * 1차에 짚은 것이 지금 어떻게 되었는지 **다시 센다.**
 *
 * 학생이 "고쳤어요" 를 눌러도 실제로 안 고쳤으면 open 이다. 자기 신고를 믿지 않는다.
 * 저장된 스냅샷을 쓰지 않고 매번 다시 세므로, 교사가 보는 글과 표시가 어긋나지 않는다.
 */
export function resolveItems(
  items: CheckItem[],
  answers: Record<string, string>,
  sources: { site: string; ai: string },
  rules: FieldRule[] = ARTICLE_RULES,
): Resolution[] {
  return items.map((item) => {
    if (item.kind === "ask") {
      const has = len(sources.site) > 0 || len(sources.ai) > 0;
      return {
        item,
        state: has ? "fixed" : "asked",
        now: has ? "채웠습니다" : "그대로 두었습니다",
      };
    }

    if (item.kind === "typo") {
      const word = item.detail ?? "";
      const still = Object.values(answers).some((v) => (v ?? "").includes(word));
      return { item, state: still ? "open" : "fixed", now: still ? "그대로" : "고쳤습니다" };
    }

    const rule = rules.find((r) => r.key === item.field);
    const n = len(answers[item.field]);
    const ok = rule ? n >= rule.min : n > 0;
    return { item, state: ok ? "fixed" : "open", now: `${n}자` };
  });
}
```

- [ ] **Step 5: 타입 검사와 린트**

```bash
npx tsc --noEmit && npm run lint
```

기대: 통과. `submit` 종류를 아직 아무도 안 그리므로 `worksheet-view` 는 무시한다
(switch 가 아니라 삼항 연쇄라 컴파일 오류가 안 난다). Task 5 에서 붙인다.

- [ ] **Step 6: 커밋**

```bash
git add src/lib/article-check.ts src/lib/types.ts
git commit -m "기사 판정을 코드로 세는 자리를 만든다"
```

---

## Task 2: 오탈자 찾기 (AI)

**Files:**
- Modify: `src/lib/ai-review.ts`

**Interfaces:**
- Consumes: `CheckItem` (Task 1)
- Produces: `findTypos(texts: string[]): Promise<CheckItem[]>` — Task 3 이 쓴다.

- [ ] **Step 1: `findTypos` 를 더한다**

기존 `reviewBuild` 옆에 둔다. 프롬프트 규칙은 파일 머리말의 것을 따른다 —
**학번·이름을 보내지 않는다.**

```ts
/**
 * 오탈자 후보를 찾는다. 최대 3개.
 *
 * 고치라고 하지 않는다. "이 낱말 한 번만 볼까요" 다 — 방언이나 일부러 쓴 말을
 * 잘못 짚을 수 있고, 중1에게 "틀렸다" 고 단정하면 위축된다.
 *
 * 실패하면 빈 배열이다. 그 줄만 빠지고 나머지 점검은 그대로 뜬다 —
 * 스물여덟 명이 한꺼번에 내는 구간이라 여기서 학생을 세우면 안 된다.
 */
export async function findTypos(texts: string[]): Promise<CheckItem[]> {
  const body = texts.filter((t) => t.trim()).join("\n");
  if (!body.trim()) return [];

  const prompt =
    "다음은 중학교 1학년이 쓴 신문 기사입니다.\n" +
    "맞춤법이나 오타로 보이는 낱말을 최대 3개만 골라 주세요.\n" +
    "고친 말을 제안하지 말고, 낱말만 그대로 적어 주세요.\n" +
    "확실하지 않으면 고르지 마세요. 없으면 빈 줄로 답하세요.\n" +
    "한 줄에 하나씩, 낱말만.\n\n" +
    body;

  try {
    const raw = await askGemini(prompt);
    return raw
      .split("\n")
      .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
      .filter((w) => w.length > 0 && w.length <= 20)
      .slice(0, 3)
      .map((word) => ({
        code: `typo:${word}`,
        field: "",
        kind: "typo" as const,
        label: `이 낱말 한 번만 볼까요 — "${word}"`,
        detail: word,
      }));
  } catch {
    return [];
  }
}
```

`askGemini` 는 이 파일이 이미 쓰는 호출부 이름에 맞춘다. **구현 전에
`src/lib/ai-review.ts` 를 열어 기존 호출 함수 이름과 오류 처리 방식을 확인하고 맞출 것.**

- [ ] **Step 2: 타입 검사와 린트**

```bash
npx tsc --noEmit && npm run lint
```

- [ ] **Step 3: 커밋**

```bash
git add src/lib/ai-review.ts
git commit -m "오탈자 후보를 찾는 자리를 만든다"
```

---

## Task 3: 제출 API

**Files:**
- Create: `src/app/api/student/submit/route.ts`

**Interfaces:**
- Consumes: `checkArticle`, `gateItems`, `findTypos`, `getArtifact`,
  `updateArtifact`, `getSession`, `readStudentSession`, `activityIdFor`
- Produces: `POST { stage }` → `{ ok, items?, blocked? }` · `GET` → `{ stage, items, teacherFeedback }`

- [ ] **Step 1: 라우트를 만든다**

기존 `src/app/api/student/ai-review/route.ts` 의 뼈대(guard·readStudentSession·
getSession·activityIdFor)를 그대로 따른다.

```ts
/**
 * 제출 — 1차 · 2차 · 최종.
 *
 * ## 단계마다 하는 일이 다르다
 *
 *  1차 — 코드로 판정하고 오탈자를 붙여 돌려준다. 저장은 하되 막지 않는다
 *  2차 — **문턱을 넘어야 통과한다.** 안 고쳤으면 되돌린다
 *  최종 — status 를 submitted 로 올린다
 *
 * ## 왜 attendance 에도 쓰는가
 *
 * 교사 대시보드가 대기 줄을 알아야 하는데, 폴링마다 artifact 를 스물여덟 건 읽으면
 * 한 교시에 무료 한도를 태운다. 출석 문서는 이미 읽고 있으므로 거기 얹으면 0건이다.
 */
```

본문 구조 (실제 코드는 구현 시 위 뼈대에 맞춰 작성):

```ts
export async function POST(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");
    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const body = await readJson<{ stage?: number; selfCheck?: string }>(request);
    const stage = body?.stage;
    if (stage !== 1 && stage !== 2 && stage !== 3) return fail("invalid_input");

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");
    const artifact = await getArtifact(activityId, me.studentId);
    if (!artifact) return fail("not_found", "먼저 답을 몇 개 써 주세요.");

    const rules = submitRulesOf(session);          // submitFields ?? ARTICLE_RULES
    const answers = artifact.answers ?? {};
    const sources = artifact.sources ?? { site: "", ai: "" };

    if (stage === 1) {
      const items = checkArticle(answers, sources, rules);
      const typos = await findTypos(rules.map((r) => answers[r.key] ?? ""));
      const all = [...items, ...typos];
      await updateArtifact(artifact.id, {
        submitStage: 1,
        aiCheck: { at: Date.now(), items: all },
      });
      await recordSubmitStage(me.sessionId, me.studentId, 1);
      return ok({ items: all });
    }

    if (stage === 2) {
      // 문턱 — 다시 세서 남아 있으면 되돌린다
      const blocked = gateItems(checkArticle(answers, sources, rules, true));
      if (blocked.length > 0) return ok({ blocked });
      await updateArtifact(artifact.id, { submitStage: 2 });
      await recordSubmitStage(me.sessionId, me.studentId, 2, body?.selfCheck);
      return ok({ blocked: [] });
    }

    await updateArtifact(artifact.id, { submitStage: 3, status: "submitted" });
    await recordSubmitStage(me.sessionId, me.studentId, 3);
    return ok();
  });
}
```

GET 은 2차 대기 중인 학생이 교사 피드백이 왔는지 확인하는 데 쓴다.

```ts
export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");
    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");
    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");
    const artifact = await getArtifact(activityId, me.studentId);
    if (!artifact) return ok({ stage: 0, items: [], teacherFeedback: null });
    return ok({
      stage: artifact.submitStage ?? 0,
      items: artifact.aiCheck?.items ?? [],
      teacherFeedback: artifact.teacherFeedback ?? null,
    });
  });
}
```

- [ ] **Step 2: `recordSubmitStage` 를 `src/lib/db.ts` 에 더한다**

`recordWorkProgress` 바로 아래에 같은 꼴로 둔다. **출석 문서가 있을 때만 쓴다** —
없는데 만들면 결석 학생이 출석으로 잡힌다.

```ts
/**
 * 제출 단계를 출석 문서에 얹는다.
 *
 * recordWorkProgress 와 같은 이유다 — 대시보드가 이미 읽는 문서라 추가 읽기가 0건이다.
 * 새 단계로 올라갈 때 교사 피드백 표시(reviewedAt)를 지운다. 2차를 다시 내면
 * 대기 줄에 다시 서야 한다.
 */
export async function recordSubmitStage(
  sessionId: string,
  studentId: string,
  stage: 1 | 2 | 3,
  selfCheck?: string,
): Promise<void> {
  const ref = db().collection(COLLECTIONS.attendance).doc(`${sessionId}__${studentId}`);
  const snap = await ref.get();
  if (!snap.exists) return;
  const patch: Record<string, unknown> = { submitStage: stage };
  if (stage === 2) {
    patch.reviewedAt = 0;
    if (selfCheck) patch.selfCheck = selfCheck;
  }
  await ref.set(patch, { merge: true });
}
```

**문서 ID 규칙은 구현 전에 `recordWorkProgress` 를 열어 그대로 맞출 것.**

- [ ] **Step 3: 타입 검사 · 린트 · 빌드**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/student/submit/route.ts src/lib/db.ts
git commit -m "제출 단계를 받는 자리를 만든다"
```

---

## Task 4: 7차시 등록 (seed)

**Files:**
- Create: `scripts/seed-lesson7.ts`

**Interfaces:**
- Consumes: `WorksheetQuestion`, `LessonPlan` (Task 1 이 늘린 타입)

- [ ] **Step 1: `scripts/seed-lesson6.ts` 를 본떠 만든다**

`ACTIVITY_ID = "career-plan"` (같은 통), `LESSON_NO = 7`.

활동지 문항 순서:

| 키 | kind | 비고 |
|---|---|---|
| `_final_note` | note | 오늘 할 일 |
| `news_title` | text | 6차시 것 — 다듬기 |
| `news_scene` | long | 6차시 것 |
| `news_change` | long | 6차시 것 |
| `news_real` | long | ③ 취재. **한 건만, 한 줄로** |
| `news_interview` | long | ④ `{이름}` 씨 인터뷰 |
| `news_check2` | choice | 2차 전 자기 점검 |
| `news_caption` | text | 사진 설명 — 기다리는 동안 |
| `news_submit` | **submit** | 제출 칸 |

`news_real` 의 hint 는 검색을 짧게 끊는다.

```ts
hint:
  "한 건만 찾으면 됩니다. 한 줄이면 충분해요.\n" +
  "예) 2026년 네이버 뉴스에서 서빙로봇을 들인 식당 기사를 봤다.\n\n" +
  "못 찾겠으면 아래 [사례 보기] 를 눌러 참고하세요 — 그대로 쓰지 말고 내 말로 바꿔서.",
```

`news_check2` 보기 (순서를 지킨다 — 첫 번째가 "괜찮다"):

```ts
choices: [
  "② 의 '왜' 가 한 문장으로 보인다",
  "읽어 보니 ② 의 '왜' 가 약한 것 같다",
  "③ 이 ①② 와 따로 노는 것 같다",
  "잘 모르겠다 — 선생님께 여쭙겠습니다",
],
```

`news_submit` :

```ts
{
  key: "news_submit",
  phase: "worksheet",
  label: "다 썼으면 제출하세요",
  hint: "",
  kind: "submit",
  maxLength: 0,
  submitFields: [
    { key: "news_title", label: "제목", min: 5 },
    { key: "news_scene", label: "① 현장", min: 60 },
    { key: "news_change", label: "② 무엇이 바뀌었나 · 왜", min: 80 },
    { key: "news_real", label: "③ 이미 시작되고 있다", min: 40 },
    { key: "news_interview", label: "④ 인터뷰", min: 40 },
  ],
}
```

계획 값: `phaseLabels` 는 `{ draw: "그림 마무리", worksheet: "기사 완성하고 제출하기" }`.
`galleryEnabled: false` (수행평가). `focusExempt: ["worksheet", "draw"]` (6차시와 같은 이유).

- [ ] **Step 2: 등록하고 결과를 읽는다**

```bash
node --env-file=.env.local scripts/seed-lesson7.ts
```

기대: `✓ 등록 — 디지털 시민 리포트 ② …` 그리고 활동 ID 가 `career-plan` 으로 찍힌다.

- [ ] **Step 3: 커밋**

```bash
git add scripts/seed-lesson7.ts
git commit -m "7차시 수업을 등록한다"
```

---

## Task 5: 제출 칸 UI

**Files:**
- Create: `src/components/submit-panel.tsx`
- Modify: `src/components/worksheet-view.tsx`

**Interfaces:**
- Consumes: `CheckItem` (Task 1), `/api/student/submit` (Task 3)
- Produces: `<SubmitPanel question onJump />` — `onJump(field)` 는 그 칸으로 스크롤한다

- [ ] **Step 1: `submit-panel.tsx` 를 만든다**

단계별 얼굴은 명세서의 그림 그대로다. 지켜야 할 것:

- **1차 결과의 항목마다 `[그 칸으로]` 단추.** 무엇을 고칠지 헷갈리면 교사에게 온다
- **`[그냥 넘어가기]`** — 오탈자 호출이 실패해도 학생을 세우지 않는다
- **2차가 막히면** `blocked` 목록을 그 자리에 띄우고 단계를 올리지 않는다
- **2차 대기 중에는 `news_caption` 칸을 강조**하고, 8초마다 GET 으로 교사 피드백을
  확인한다. **stage 가 2 일 때만 폴링한다** — 그 상태 학생이 많아야 열댓 명이고
  몇 분이라 읽기가 1천 건 안쪽이다. 피드백이 오면 폴링을 멈춘다
- 최종 제출 뒤에는 「제출 완료 ✓」만 남는다

- [ ] **Step 2: `worksheet-view.tsx` 에 분기를 붙인다**

기존 `question.kind === "ai_review" ? (…)` 연쇄 옆에 한 줄 더한다.

```tsx
) : question.kind === "submit" ? (
  <SubmitPanel question={question} onJump={scrollToField} />
) : (
```

`scrollToField` 는 이 파일이 이미 문항마다 붙이는 id 를 쓴다. **없으면 문항 래퍼에
`id={`q-${question.key}`}` 를 붙이고 `document.getElementById` 로 스크롤한다.**

- [ ] **Step 3: 타입 검사 · 린트 · 빌드**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 4: 브라우저로 확인한다**

리허설 수업을 하나 열고 학생으로 들어가, 아래를 눈으로 확인한다.

1. 빈 칸인 채 **1차 제출** → 빈 칸 목록이 뜨고 `[그 칸으로]` 가 실제로 스크롤한다
2. 안 고치고 **2차 제출** → 막히고 남은 항목이 뜬다
3. 채우고 **2차 제출** → 「선생님이 보고 계세요」 와 사진 설명 칸이 뜬다

- [ ] **Step 5: 커밋**

```bash
git add src/components/submit-panel.tsx src/components/worksheet-view.tsx
git commit -m "제출 칸을 활동지 안에 넣는다"
```

---

## Task 6: 교사 검토 API

**Files:**
- Create: `src/app/api/teacher/review/route.ts`

**Interfaces:**
- Produces: `POST { sessionId, studentId, chips, note }` → `{ ok }`

- [ ] **Step 1: 라우트를 만든다**

교사 인증은 이 저장소의 다른 `api/teacher/*` 라우트와 **같은 방식**을 쓴다.
구현 전에 `src/app/api/teacher/dashboard/route.ts` 의 첫 20줄을 열어 맞출 것.

```ts
/**
 * 교사 피드백 — 정성적인 것이 본체다.
 *
 * 칩은 자주 쓰는 문장을 탭 한 번으로 넣는 보조이고, note 가 선생님의 말이다.
 * 저장하면 학생 화면의 폴링(8초)이 그것을 받아 「고쳤어요 · 최종 제출」 을 연다.
 */
```

- artifact 에 `teacherFeedback: { at, chips, note }` 를 쓴다
- attendance 에 `reviewedAt: Date.now()` 를 써 대기 줄에서 뺀다
- `chips` 는 최대 5개, `note` 는 500자로 자른다

- [ ] **Step 2: 타입 검사 · 린트 · 빌드**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/teacher/review/route.ts
git commit -m "교사 피드백을 저장하는 자리를 만든다"
```

---

## Task 7: 대기 줄과 소리

**Files:**
- Modify: `src/app/api/teacher/dashboard/route.ts:127-160`
- Modify: `src/app/teacher/dashboard/page.tsx`

**Interfaces:**
- Consumes: attendance 의 `submitStage`·`reviewedAt`·`selfCheck` (Task 1·3)
- Produces: 행에 `stage: number`, `waiting: boolean`, `selfCheck: string`

- [ ] **Step 1: 대시보드 라우트의 행에 세 값을 더한다**

`rows = attendance.map(...)` 안, `work: {...}` 옆이다.

```ts
      stage: entry.submitStage ?? 0,
      // 2차를 냈고 아직 피드백을 안 준 학생만 대기 줄에 선다
      waiting: (entry.submitStage ?? 0) === 2 && !(entry.reviewedAt ?? 0),
      selfCheck: entry.selfCheck ?? "",
```

- [ ] **Step 2: 대시보드 화면 맨 위에 대기 줄을 그린다**

- 「검토 대기 N명」 — `waiting` 인 행만
- **순서는 자기 점검이 정한다.** `selfCheck` 가 첫 보기("한 문장으로 보인다")가
  **아닌** 학생을 앞에 세운다. 스스로 약하다고 한 학생을 먼저 만나는 편이 낫다
- 이름 마스킹 토글이 켜져 있으면 번호만 보인다 (기존 `masked` 상태를 그대로 쓴다)

- [ ] **Step 3: 새 이름이 뜰 때 짧은 소리를 낸다**

교실을 돌아다니는 중에 화면을 계속 보지 않아도 되게 한다.

```tsx
// 대기 인원이 늘어난 순간에만 운다. 줄어들 때(피드백을 준 뒤)는 울지 않는다.
// 오디오 파일을 두지 않는다 — 소리 하나 때문에 정적 파일을 늘릴 이유가 없다.
useEffect(() => {
  if (waitingCount > prevCount.current) {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.06;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // 소리를 막아 둔 브라우저 — 화면 숫자로 충분하다
    }
  }
  prevCount.current = waitingCount;
}, [waitingCount]);
```

**`prevCount` 는 `useRef`** 로 둔다. 렌더 중에 값을 바꾸면 `react-hooks/purity` 에 걸린다.

- [ ] **Step 4: 타입 검사 · 린트 · 빌드**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 5: 브라우저로 확인한다**

학생 창에서 2차 제출 → 교사 대시보드에 20초 안에 이름이 뜨고 소리가 나는지.

- [ ] **Step 6: 커밋**

```bash
git add src/app/api/teacher/dashboard/route.ts src/app/teacher/dashboard/page.tsx
git commit -m "교사 화면에 검토 대기 줄을 세운다"
```

---

## Task 8: 교사 검토 화면

**Files:**
- Create: `src/components/teacher-review-panel.tsx`
- Modify: `src/app/teacher/dashboard/page.tsx`

**Interfaces:**
- Consumes: `resolveItems` (Task 1), `/api/teacher/review` (Task 6)

- [ ] **Step 1: 패널을 만든다**

대기 줄에서 이름을 누르면 열린다. **작은 화면이 기준이다** — 선생님은 폰을 들고
교실을 돈다.

배치 (위에서부터):

1. **AI 가 1차에서 짚은 것** — `resolveItems` 결과. `fixed` ✓ · `open` ✗ · `asked` `?`
   각 줄 끝에 `now`("87자", "그대로 두었습니다")
2. **기사 본문** — 기본은 접혀 있다. 선생님은 학생 태블릿으로 읽는다
3. **한 줄 입력칸** — 크게. 정성적 피드백의 본체
4. **칩 5개** — 아래 보조

```tsx
const CHIPS = [
  "② 의 '왜' 가 더 필요해요",
  "① 이 그림에 없는 것 같아요",
  "③ 사례가 기사와 잘 이어지네요",
  "④ 인터뷰가 앞 내용과 따로 노는 것 같아요",
  "좋아요 · 최종 제출하세요",
];
```

5. **[보내기]** — 누르면 목록에서 빠지고 다음 학생으로 넘어간다

**기사 본문을 읽으려면 artifact 를 읽어야 한다.** 대기 줄에는 넣지 않고 **이 패널을
열 때만 1건** 읽는다.

- [ ] **Step 2: 타입 검사 · 린트 · 빌드**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 3: 브라우저로 한 바퀴 돌린다**

두 창(학생·교사)을 띄우고 전체 흐름을 확인한다.

1. 학생: 1차 제출 → 항목 확인
2. 학생: 일부만 고치고 2차 → 막히는지
3. 학생: 다 고치고 2차 → 대기
4. 교사: 이름 뜸 → 열면 **✓ 와 ✗ 가 실제 글자 수와 맞는지**
5. 교사: 칩 하나 + 한 줄 → 보내기
6. 학생: 8초 안에 피드백이 뜨는지 → 최종 제출
7. 교사: 목록에서 빠지고 `stage 3` 인지

- [ ] **Step 4: 커밋**

```bash
git add src/components/teacher-review-panel.tsx src/app/teacher/dashboard/page.tsx
git commit -m "교사가 2차 제출을 보고 답하는 화면을 만든다"
```

---

## Task 9 (후순위): 신문 지면

**여기까지 안 와도 수업은 된다.** 완성본은 기존 `CardNews` 로 보인다.

**Files:**
- Create: `src/components/news-paper.tsx`
- Modify: `scripts/seed-lesson7.ts` (`news_template` choice 문항 추가)
- Modify: `src/components/submit-panel.tsx` (최종 제출 뒤 지면 표시)
- Modify: `src/components/teacher-review-panel.tsx` (같은 지면 표시)

- [ ] **Step 1: `news_template` 문항을 seed 에 더한다**

```ts
choices: ["1면 톱", "인터뷰 중심", "사진 특집"],
```

- [ ] **Step 2: `news-paper.tsx` 를 만든다**

`CardNews` 와 같은 자리에 얹는 다른 판형이다. `ArtifactCanvas` 로 그림을 다시 그리고
답을 신문 꼴로 배치한다. 제호는 「2036 미래신문」 고정, 기자 이름은 `{이름} 기자` —
`worksheet-view` 의 `named()` 를 그대로 쓴다.

- [ ] **Step 3: 타입 검사 · 린트 · 빌드 · 브라우저 확인 · 커밋**

---

## 자체 점검

**명세 대응:** 40분 배분(Task 4) · 1차 완성 기준(Task 3·7) · AI 정량 판정(Task 1·2) ·
출처 묻기(Task 1) · 2차 문턱(Task 1·3·5) · 자기 점검(Task 4·7) · 사진 설명(Task 4·5) ·
대기 줄과 소리(Task 7) · ✓✗ 다시 세기(Task 1·8) · 칩과 한 줄(Task 6·8) ·
신문 지면(Task 9). **빠진 항목 없음.**

**이름 일치:** `CheckItem`·`Resolution`·`checkArticle`·`gateItems`·`resolveItems`·
`ARTICLE_RULES`·`findTypos`·`recordSubmitStage` 를 정의한 곳과 쓰는 곳이 같다.

**남은 확인 사항** (구현 시 파일을 열어 맞출 것):
- `src/lib/ai-review.ts` 의 Gemini 호출 함수 이름
- `recordWorkProgress` 의 attendance 문서 ID 규칙
- `api/teacher/*` 의 교사 인증 방식
- `worksheet-view.tsx` 가 문항에 붙이는 id
