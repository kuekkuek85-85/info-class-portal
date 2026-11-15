# 생기부 세부특기사항 문장 생성기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 교사 대시보드에서 과목별·학생별 세특 2줄을 Gemini가 초안으로 만들고, 교사가 표에서 다듬어 저장하고, CSV(엑셀)로 내보낸다.

**Architecture:** 순수 로직(범위 판정·마음톡톡 비식별화·프롬프트·CSV)은 `record-comment-core.ts`(server-only 아님 → `node --test` 로 단위 테스트)에 두고, Gemini 호출·Firestore 접근은 `record-comment.ts`(server-only)와 `db.ts`에 둔다. 교사 전용 API 라우트 3종(목록·생성·저장)과 CSV 내보내기 라우트, 대시보드 패널 하나를 더한다. 기존 Gemini(raw fetch, `ai-review.ts`)·CSV(BOM, `export/route.ts`)·교사 가드(`requireTeacher`) 패턴을 그대로 따른다.

**Tech Stack:** Next.js 16.3 (this repo's version — API routes + client component), React 19, firebase-admin, Gemini raw fetch(`GEMINI_API_KEY`), Node 내장 `node:test`(새 의존성 없음), Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-11-03-record-comment-generator-design.md`

## Global Constraints

- **이 저장소의 Next.js는 학습데이터와 다르다.** 라우트/페이지 코드를 쓰기 전에 `node_modules/next/dist/docs/` 의 해당 가이드를 읽는다(AGENTS.md). `next dev` 가 AGENTS.md 블록을 다시 써넣어도 그 변경과 함께 커밋한다.
- **교사 전용.** 추가하는 모든 API 라우트는 `requireTeacher()` + `isTeacher()` 로 가드한다(`src/lib/teacher-guard.ts`). 학생 화면에 절대 노출하지 않는다.
- **학번·이름은 Gemini로 보내지 않는다.** 프롬프트에는 활동/성찰 텍스트·차시 제목만 넣는다(`comfort-bot`·`ai-review`·`ai-feedback` 원칙).
- **마음톡톡(kind "mt")은 학생이 쓴 글을 Gemini로도 출력으로도 내보내지 않는다.** 차시·활동 제목 + 작성/미작성(불리언) + 참여 횟수만 쓴다. 감정·내면 서술 금지.
- **1차 범위:** 정보 = `groupKey` 없는 세션 중 `classNo ∈ {1,2,3,4}` 그리고 `lessonNo ≤ 22`(마이크로비트 아크 23차~ 제외), `rehearsal` 제외. 선택과목 = `groupKey ∈ {mt-tue-1, mt-thu-1}`(마음톡톡 1기) 또는 `{hai-tue-1, hai-thu-1}`(진로탐색 1기), `rehearsal` 제외. `*-2`(2기) 전면 제외.
- **문장 규칙:** 현재형 종결어미 `~함/~앎` 만. 교사 관찰 사실 위주. 전체 나열 금지(대표 활동만). 공백 포함 **200자** 상한(약 2줄).
- **회차(round):** 이번은 `"1"`. 저장 문서 ID 에 round 를 포함해 12월 2차가 1차를 덮지 않게 한다.
- **새 npm 의존성 없음.** 테스트는 `node:test`, AI는 raw fetch, CSV는 BOM 수작업.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Review Focus

1. **마음톡톡 글 유출** — MT 과목 생성 시 성찰·활동지 자유서술이 프롬프트나 출력에 들어가면 1순위 원칙 위반. (Task 2 `summarizeForPrompt(sensitive=true)` 테스트: 어떤 학생 텍스트도 결과 문자열에 없음.)
2. **범위 경계** — 정보 23차 이상(마이크로비트)·리허설 세션이 1차에 섞이면 안 됨. (Task 2 `sessionInScope` 테스트: lessonNo 22 포함·23 제외·rehearsal 제외·groupKey 2기 제외.)
3. **기록 없는 학생**(결석·미제출) — 환각 문장이나 크래시 대신 "자료 부족"으로 표시·건너뜀. (Task 3 `generateComment` 테스트: 빈 records → source "fallback" + 빈 text 또는 "자료 부족" 마커.)
4. **CSV 깨짐** — 세특에 쉼표·따옴표·줄바꿈·한글 포함 시 BOM + 이스케이프. (Task 2 `recordCommentsCsv` 테스트.)
5. **회차 격리** — 2차 저장이 1차를 덮어쓰지 않음. (Task 1 doc-id 테스트: `recordCommentId("2",...) !== recordCommentId("1",...)`.)

---

### Task 1: 타입 · 저장소 (RecordComment)

**Files:**
- Modify: `src/lib/types.ts` (RecordComment 인터페이스 추가, Reflection 근처 ~2064행 이후)
- Modify: `src/lib/db.ts` (`COLLECTIONS.recordComments`, `recordCommentId`, `listRecordComments`, `saveRecordComment`)
- Test: `src/lib/record-comment-id.test.ts`

**Interfaces:**
- Produces:
  - `interface RecordComment { id: string; round: string; subjectKey: string; studentId: string; classNo: ClassNo; groupKey?: string; text: string; status: "draft" | "edited"; source?: "ai" | "fallback"; model?: string; updatedAt: number }`
  - `function recordCommentId(round: string, subjectKey: string, studentId: string): string` → `` `${round}__${subjectKey}__${studentId}` ``
  - `function listRecordComments(round: string): Promise<RecordComment[]>`
  - `function saveRecordComment(input: Omit<RecordComment, "id" | "updatedAt">): Promise<void>` (doc id = `recordCommentId(...)`, `{ merge: true }`, `updatedAt: Date.now()`)

- [ ] **Step 1: Write the failing test** — `src/lib/record-comment-id.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { recordCommentId } from "./db.ts";

test("doc id는 round·subject·학번을 합친다", () => {
  assert.equal(recordCommentId("1", "info-2", "10203"), "1__info-2__10203");
});
test("회차가 다르면 id가 다르다 (2차가 1차를 안 덮음)", () => {
  assert.notEqual(recordCommentId("1", "mt-1", "10203"), recordCommentId("2", "mt-1", "10203"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/record-comment-id.test.ts`
Expected: FAIL — `recordCommentId` export 없음.

- [ ] **Step 3: Implement**

`types.ts` 에 `RecordComment` 인터페이스 추가. `db.ts` 에 `COLLECTIONS.recordComments: "recordComments"` 추가, `recordCommentId`(순수 함수), `listRecordComments`(`collectAll<RecordComment>(where("round","==",round))` → studentId 정렬), `saveRecordComment`(doc(recordCommentId) set merge, updatedAt). 기존 db.ts 패턴(`withId`/`collectAll`) 그대로.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/lib/record-comment-id.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: tsc 통과 확인**

Run: `npx tsc --noEmit`
Expected: EXIT 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/db.ts src/lib/record-comment-id.test.ts
git commit -F <커밋메시지파일>
```

---

### Task 2: 순수 로직 — 범위 · 비식별화 · 프롬프트 · CSV (`record-comment-core.ts`)

**이 저장소엔 테스트 러너가 없다.** 여기서 처음으로 `node:test`(내장, 무의존성)를 쓴다. 프라이버시·범위처럼 틀리면 조용히 새는 고위험 순수 로직만 테스트한다. 이 파일은 **`import "server-only"` 를 넣지 않는다**(테스트에서 로드돼야 함) — firebase·fetch 참조 금지.

**Files:**
- Create: `src/lib/record-comment-core.ts`
- Test: `src/lib/record-comment-core.test.ts`

**Interfaces:**
- Consumes: `ClassNo` (types.ts)
- Produces:
  - `type SubjectKind = "info" | "mt" | "hai"`
  - `interface SubjectScope { subjectKey: string; label: string; kind: SubjectKind; classNo?: ClassNo; groupKeys?: string[]; maxLessonNo?: number }`
  - `const SUBJECT_SCOPES: SubjectScope[]` — `info-1`..`info-4`(label `"정보 1반"`.., kind "info", classNo, maxLessonNo 22), `mt-1`(label `"마음톡톡 1기"`, kind "mt", groupKeys `["mt-tue-1","mt-thu-1"]`), `hai-1`(label `"진로탐색 1기"`, kind "hai", groupKeys `["hai-tue-1","hai-thu-1"]`)
  - `function getSubjectScope(subjectKey: string): SubjectScope | undefined`
  - `function sessionInScope(session: { classNo: number; groupKey?: string; lessonNo: number; rehearsal?: boolean }, scope: SubjectScope): boolean`
  - `function isSensitiveSubject(scope: SubjectScope): boolean` (`kind === "mt"`)
  - `interface StudentSessionRecord { lessonNo: number; title: string; activityLabels: string[]; written: boolean; reflectionAnswers: string[]; worksheetAnswers: { label: string; value: string }[] }`
  - `function summarizeForPrompt(records: StudentSessionRecord[], sensitive: boolean): string` — 민감(MT)이면 `제목 + (작성함/미작성) + 참여 N회` 만, 비민감이면 성찰·활동지 텍스트 포함. 어떤 경우에도 학번·이름은 입력에 없음(인자에 없음).
  - `function capComment(text: string, max?: number): string` (기본 200, 마지막 `함`/문장부호 경계에서 자름)
  - `function recordCommentsCsv(rows: { subject: string; group: string; studentId: string; name: string; text: string }[]): string` (BOM + 헤더 `과목,반/분반,학번,이름,세특` + 이스케이프)

- [ ] **Step 1: Write the failing test** — `src/lib/record-comment-core.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sessionInScope, getSubjectScope, summarizeForPrompt, recordCommentsCsv, capComment,
} from "./record-comment-core.ts";

test("정보: 22차 포함, 23차(마이크로비트) 제외", () => {
  const info = getSubjectScope("info-2")!;
  assert.equal(sessionInScope({ classNo: 2, lessonNo: 22 }, info), true);
  assert.equal(sessionInScope({ classNo: 2, lessonNo: 23 }, info), false);
});
test("정보: 다른 반·리허설·분반세션 제외", () => {
  const info = getSubjectScope("info-2")!;
  assert.equal(sessionInScope({ classNo: 3, lessonNo: 10 }, info), false);
  assert.equal(sessionInScope({ classNo: 2, lessonNo: 10, rehearsal: true }, info), false);
  assert.equal(sessionInScope({ classNo: 2, lessonNo: 10, groupKey: "mt-tue-1" }, info), false);
});
test("마음톡톡 1기: 1기 groupKey만, 2기 제외", () => {
  const mt = getSubjectScope("mt-1")!;
  assert.equal(sessionInScope({ classNo: 5, lessonNo: 4, groupKey: "mt-tue-1" }, mt), true);
  assert.equal(sessionInScope({ classNo: 5, lessonNo: 4, groupKey: "mt-tue-2" }, mt), false);
});
test("MT 요약(sensitive)엔 학생 글이 없다", () => {
  const recs = [{
    lessonNo: 3, title: "감정 낱말", activityLabels: ["마음일기"], written: true,
    reflectionAnswers: ["오늘 너무 슬펐다 비밀글"],
    worksheetAnswers: [{ label: "경험", value: "친구와 싸워서 화가 났다" }],
  }];
  const out = summarizeForPrompt(recs, true);
  assert.ok(!out.includes("슬펐다"));
  assert.ok(!out.includes("싸워서"));
  assert.ok(out.includes("감정 낱말"));
});
test("정보 요약(non-sensitive)엔 성찰 텍스트가 들어간다", () => {
  const recs = [{
    lessonNo: 7, title: "디지털 시민", activityLabels: [], written: true,
    reflectionAnswers: ["출처를 밝히는 것이 중요하다고 느꼈다"], worksheetAnswers: [],
  }];
  assert.ok(summarizeForPrompt(recs, false).includes("출처를 밝히는"));
});
test("CSV: BOM·헤더·쉼표/줄바꿈/따옴표 이스케이프", () => {
  const csv = recordCommentsCsv([{ subject: "정보 2반", group: "2반", studentId: "10203", name: "홍길동", text: '발표함, 그리고 "정리"함\n잘함' }]);
  assert.ok(csv.startsWith("﻿"));
  assert.ok(csv.includes("과목,반/분반,학번,이름,세특"));
  assert.ok(csv.includes('"발표함, 그리고 ""정리""함\n잘함"'));
});
test("capComment: 200자 상한", () => {
  assert.ok(capComment("가".repeat(400)).length <= 200);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/record-comment-core.test.ts`
Expected: FAIL — 모듈/함수 없음.

- [ ] **Step 3: Implement `record-comment-core.ts`**

`SUBJECT_SCOPES` 와 위 함수들 구현. `sessionInScope`: info 는 `!groupKey && scope.classNo === session.classNo && session.lessonNo <= scope.maxLessonNo! && !rehearsal`; 선택과목은 `scope.groupKeys.includes(session.groupKey) && !rehearsal`. `summarizeForPrompt`: sensitive 분기에서 `reflectionAnswers`·`worksheetAnswers.value` 를 **읽지 않는다**(제목·activityLabels·written·개수만). `recordCommentsCsv`: `export/route.ts` 의 `csvCell`/`BOM` 방식 복제(또는 거기서 import — 단 그 파일은 라우트라 server 전용이므로 복제가 안전).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/lib/record-comment-core.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: tsc + lint**

Run: `npx tsc --noEmit` (EXIT 0), `npm run lint` (해당 파일 경고 없음).

- [ ] **Step 6: Commit**

```bash
git add src/lib/record-comment-core.ts src/lib/record-comment-core.test.ts
git commit -F <커밋메시지파일>
```

---

### Task 3: 기록 수집 + Gemini 생성 (`record-comment.ts`)

**Files:**
- Create: `src/lib/record-comment.ts` (`import "server-only"`)
- Test: `src/lib/record-comment-generate.test.ts` (Gemini·Firestore를 타지 않는 순수 조립 부분만 — 아래)

**Interfaces:**
- Consumes: Task 2 전체, `ClassSession`/`Student`/`Reflection`/`Artifact`(types), `listReflections`·`listArtifacts`·`listAllSessions`·`listRoster`(db), `ai-review.ts` 의 fetch 패턴
- Produces:
  - `async function gatherStudentRecords(scope: SubjectScope, studentId: string, inScopeSessions: ClassSession[]): Promise<StudentSessionRecord[]>` — 각 in-scope 세션에서 그 학생의 `Reflection`(listReflections → studentId 필터, `answersOf`)과 `Artifact`(`session.activity?.activityId` 있으면 listArtifacts(activityId, session.classNo) → studentId 필터; `session.activity.worksheet` 로 key→label 매핑, **image/typing_game/diagnostic/scale_result/streams_*/dilemma_game/relay_draw 등 비서술 kind 는 제외**, 텍스트 kind(text/long/choice/multi/list 등)만 label·value 수집). `written = 성찰 or 활동지에 비어있지 않은 값이 하나라도 있음`.
  - `async function generateComment(scope: SubjectScope, records: StudentSessionRecord[]): Promise<{ text: string; source: "ai" | "fallback" }>` — records 없거나 전부 `written=false` 면 `{ text: "", source: "fallback" }`(라우트가 "자료 부족"으로 표기). 아니면 `summarizeForPrompt` → `buildCommentPrompt` → Gemini(ai-review 의 `callOnce` 패턴: timeout·AbortController·JSON `{"comment":"..."}`) → `capComment`. 실패 시 fallback: MT 등 민감 과목은 `"수업에 성실히 참여함."` 류 활동 사실 템플릿, 그 외는 `""`(source "fallback").
  - `buildCommentPrompt` 는 Task 2 core 에 두고 여기서 import(프롬프트 문자열은 순수 — core 에서 테스트 가능하게).

> **정정:** `buildCommentPrompt(subjectLabel, summary, sensitive)` 는 Task 2 `record-comment-core.ts` 로 옮겨 export 한다(Task 2 Interfaces 에 추가). 프롬프트 규칙 테스트를 위해.

- [ ] **Step 1: Write the failing test** — `src/lib/record-comment-generate.test.ts` (프롬프트 규칙만; core 함수 대상)

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCommentPrompt } from "./record-comment-core.ts";

test("프롬프트는 현재형 ~함·2줄·관찰사실·나열금지를 지시한다", () => {
  const p = buildCommentPrompt("정보 2반", "7차시 디지털 시민: 출처를 밝힘", false);
  assert.ok(p.includes("~함"));
  assert.ok(/2[^\d]*줄|두 줄|2문장|두 문장/.test(p));
  assert.ok(p.includes("나열") || p.includes("대표"));
});
test("민감 과목 프롬프트는 감정·내면 금지를 지시한다", () => {
  const p = buildCommentPrompt("마음톡톡 1기", "3차시 감정 낱말: 작성함", true);
  assert.ok(p.includes("감정") && (p.includes("쓰지") || p.includes("금지") || p.includes("않")));
});
```

(Gemini 호출·Firestore 수집은 네트워크·DB 의존이라 단위 테스트하지 않는다 — Task 4 에서 라이브로 검증한다.)

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/record-comment-generate.test.ts`
Expected: FAIL — `buildCommentPrompt` 없음.

- [ ] **Step 3: Implement**

core 에 `buildCommentPrompt` 추가(규칙 문구 포함). `record-comment.ts` 에 `gatherStudentRecords`·`generateComment` 구현. Gemini 는 `ai-review.ts` 의 `callOnce` 를 참고해 `generateContent` 호출, `generationConfig:{temperature:0.3, responseMimeType:"application/json"}`, 응답 `{"comment": string}` 파싱. 학번·이름 미전송(요약 문자열만).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/lib/record-comment-generate.test.ts` (PASS 2), 그리고 `node --test src/lib/*.test.ts` 로 전체 녹색 확인.

- [ ] **Step 5: tsc 통과**

Run: `npx tsc --noEmit` → EXIT 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/record-comment.ts src/lib/record-comment-core.ts src/lib/record-comment-generate.test.ts
git commit -F <커밋메시지파일>
```

---

### Task 4: 교사 API 라우트 (목록 · 생성 · 저장 · 내보내기)

**Files:**
- Create: `src/app/api/teacher/record-comments/route.ts` (GET 목록, POST 생성/저장)
- Create: `src/app/api/teacher/record-comments/export/route.ts` (GET CSV)
- (참고만) `src/app/api/teacher/export/route.ts`, `src/lib/api.ts`(`guard`/`fail`), `src/lib/teacher-guard.ts`

**먼저** `node_modules/next/dist/docs/` 에서 Route Handler 가이드를 읽는다(이 저장소 Next 버전 규약 확인).

**Interfaces:**
- Consumes: Task 1~3 전부, `listRoster`, `listAllSessions`, `requireTeacher`/`isTeacher`, `guard`/`fail`
- Produces (HTTP):
  - `GET /api/teacher/record-comments?round=1` → `{ rows: Row[] }`, `Row = { subjectKey; subjectLabel; classNo; groupKey?; studentId; name; text; status: "none"|"draft"|"edited" }`. 구성: `SUBJECT_SCOPES` 각각 roster(info=listStudents(classNo), 선택=groupKeys 별 enrollments 합집합) × 저장된 RecordComment(left join). **생성 전이라 기록 조회는 안 한다**(읽기 비용↓).
  - `POST /api/teacher/record-comments` body `{ action: "generate"; round; subjectKey; studentIds: string[] }` → 각 학생: in-scope 세션 필터(`listAllSessions` → `sessionInScope`) → `gatherStudentRecords` → `generateComment` → `saveRecordComment(status:"draft")`. 동시성 ≤ 4, 부분 성공 허용. 응답 `{ results: { studentId; text; source; status }[] }`. 빈 records 는 `text:""` + `note:"자료부족"`.
  - `POST /api/teacher/record-comments` body `{ action: "save"; round; subjectKey; studentId; text }` → `saveRecordComment(status:"edited")`. 응답 `{ ok: true }`.

- [ ] **Step 1: Route Handler 가이드 확인**

`node_modules/next/dist/docs/` 에서 route handler(메서드 export·Request/Response) 규약을 읽고, 이 저장소의 기존 `src/app/api/teacher/*/route.ts` 한 개와 대조.

- [ ] **Step 2: GET 목록 구현 + 수동 검증**

GET 핸들러 작성(가드 → SUBJECT_SCOPES × roster × 저장분 join). dev 서버(`preview_start name:"dev"` 또는 기존 launch.json)로 교사 로그인 후 `/api/teacher/record-comments?round=1` 호출.
Run(검증): 브라우저/least `read_network_requests` 로 200 + rows 에 정보 1~4반·mt-1·hai-1 학생이 뜨고 text 빈 값인지 확인.
Expected: 200, rows 비어있지 않음, 2기 학생 없음.

- [ ] **Step 3: POST 생성/저장 구현 + 라이브 검증(리허설/테스트 계정)**

생성·저장 핸들러 작성. **실제 학생 데이터 쓰기 주의** — 생성은 `recordComments` 컬렉션에만 쓰고 기존 성찰/활동 문서는 읽기만 한다. 한 과목·소수 studentIds 로 generate 호출 → `recordComments` 문서 생성 확인, 같은 학생 save 호출 → status "edited" 로 바뀌는지 확인.
Expected: generate 응답에 2줄 이내 문장(현재형), MT 과목 생성 결과·프롬프트에 학생 글 없음(코드/로그로 확인), save 후 재조회 시 edited.

- [ ] **Step 4: tsc + lint**

Run: `npx tsc --noEmit` (EXIT 0), `npm run lint`.

- [ ] **Step 5: CSV 내보내기 라우트**

`export/route.ts`: `GET ?round=1&subjectKey=all|info-1|...` → `listRecordComments(round)` 필터 → `recordCommentsCsv(rows)`(이름은 roster join) → `Content-Disposition: attachment; filename="record-comments.csv"`. 수동으로 내려받아 엑셀에서 한글·줄바꿈 정상 확인.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/teacher/record-comments
git commit -F <커밋메시지파일>
```

---

### Task 5: 대시보드 패널 (표 · 편집 · 생성 · 내보내기)

**Files:**
- Create: `src/components/record-comment-panel.tsx` (`"use client"`)
- Modify: `src/app/teacher/dashboard/page.tsx` (패널 import + 렌더; 기존 패널들과 같은 자리)
- (참고) 기존 패널 한 개(예: `teacher-review-panel.tsx`)로 스타일·폴링/`guard` 사용법 맞춤

**Interfaces:**
- Consumes: Task 4 의 세 엔드포인트
- Produces: `export function RecordCommentPanel(): JSX.Element`

- [ ] **Step 1: 패널 구현**

과목 필터 탭(정보 1~4반 / 마음톡톡 1기 / 진로탐색 1기), 표(열: 과목·반/분반·학번·이름·세특 textarea·상태·글자수), 행별 `생성`·`저장`, 상단 `과목 전체 생성`·`CSV 내보내기`(export 링크). textarea 변경 시 글자수 표시(200 초과 경고색). 저장 시 POST save, 생성 시 POST generate 후 text 채움. `자료부족` note 는 상태칸에 표시. 기존 패널의 fetch/guard·Tailwind 클래스 관습을 따른다.

- [ ] **Step 2: 대시보드에 마운트**

`dashboard/page.tsx` 에 `<RecordCommentPanel />` 추가(기존 패널 import 목록·렌더 위치에 맞춰).

- [ ] **Step 3: 라이브 검증 (dev 미리보기)**

`preview_start` 로 dev 서버 → 교사 로그인 → 패널에서: ① 과목 탭 전환 시 해당 학생만, 2기 안 뜸 ② 한 행 `생성` → 2줄 문장 채워짐(현재형) ③ 문장 수정 후 `저장` → 새로고침해도 유지(edited) ④ `CSV 내보내기` 다운로드 → 엑셀에서 한글 정상 ⑤ MT 과목 생성 문장이 감정/내면 서술이 아니라 활동 사실인지 눈으로 확인. `read_console_messages`·`read_network_requests` 로 에러 없음 확인.

- [ ] **Step 4: tsc + lint + 전체 테스트**

Run: `npx tsc --noEmit` (0), `npm run lint`, `node --test src/lib/*.test.ts` (전부 PASS).

- [ ] **Step 5: Commit + 배포**

```bash
git add src/components/record-comment-panel.tsx src/app/teacher/dashboard/page.tsx
git commit -F <커밋메시지파일>
git push
```

푸시 후 Vercel 자동 배포. 수업 시간대가 아닐 때 푸시(실제 교사 사용 전 배포 완료 확인).

---

## 메모 (빌더 결정 사항)

- **첫 마이크로비트 차시 확인:** `maxLessonNo = 22` 는 메모리상 "마이크로비트 아크 23차~" 기준. 구현 시 `scripts/seed-lesson22.ts`/`seed-lesson23.ts` 제목으로 23차가 첫 마이크로비트가 맞는지 확인하고, 아니면 `SUBJECT_SCOPES` 의 `maxLessonNo` 만 조정(테스트 숫자도 함께).
- **mt-1 중복:** 한 학생은 mt-tue-1 **또는** mt-thu-1 중 하나에만 등록 → `mt-1` 한 줄에 한 번만 나옴. 두 groupKey enrollments 를 합쳐 중복 제거.
- **AI 쿼터:** `ai-quota.ts` 는 세션(수업) 단위라 여기선 쓰지 않는다(교사 전용, 학생 연타 아님). 생성 버튼 과도 호출만 프런트에서 비활성 처리.
- **읽기 비용:** GET 목록은 기록을 안 읽어 가볍다. 생성(POST)만 성찰·활동을 읽으므로 과목 전체 생성은 동시성 제한으로 돈다.
