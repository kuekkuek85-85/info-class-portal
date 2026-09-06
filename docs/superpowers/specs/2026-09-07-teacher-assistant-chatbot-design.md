# 교사 대시보드 AI 챗봇 설계

**작성일:** 2026-09-07
**상태:** 승인됨 (구현 진행)

## 목표

교사가 수업 내용·학생 데이터를 자연어로 묻고, 텍스트 답 + 출처 링크를 받는 교사 전용 챗봇.
"고객센터 AI 챗봇" 형태 — 우하단 플로팅 버튼 → 채팅 팝업 → 접기/펼치기.

주 용도: **현재 차시가 아니어도** 특정 학생의 산출물을 찾거나 감정 데이터를 뽑는 것.

## 결정 사항 (사용자 승인)

- **답변 이미지: 없음.** 질문(입력)에는 이미지 첨부 가능(Gemini 비전).
- **민감 데이터: 이름만 가린다.** 감정·성찰 원문은 이름을 뗀 채 Gemini로 보내고, 화면엔 실명 복원.
- **방식: 도구 호출형(에이전트).** Gemini가 조회 도구를 스스로 골라 Firestore를 조회.

## 아키텍처

기존 Gemini 통합(`src/lib/ai-review.ts`의 raw `v1beta` fetch)을 함수호출로 확장해 재사용.
새 SDK·새 API 키 없음. 모델은 `GEMINI_MODEL || "gemini-flash-latest"`.

### 데이터 흐름

1. 교사가 질문(+선택 이미지) 입력 → `POST /api/teacher/assistant` (`requireTeacher` 가드).
2. 서버가 명렬표로 **가명기(Pseudonymizer)** 생성. 질문 텍스트의 학생 이름 → `학생A/B`로 치환.
3. **에이전트 루프**: Gemini 호출 → `functionCall`이 오면 도구 실행(Firestore) → 결과를
   가명 처리해 Gemini로 되먹임 → 텍스트 답이 나올 때까지(최대 5회 왕복).
4. 도구가 만든 **출처(sources)** 를 루프가 누적(가명 아님 — 클라이언트 전용).
5. 답 텍스트의 가명 → 실명 복원 → `{ reply, sources }` 반환.
6. 클라이언트가 답 + 출처 칩 렌더. 칩을 누르면 그 날짜로 `teacher-date`를 맞추고 대시보드로 점프.

### 조회 도구 (`db.ts` 위에 얇게)

각 도구 실행 결과는 `{ result(가명·Gemini용), sources(실명·클라이언트용) }` 로 나눈다.

- `resolveStudents(query)` — 이름/번호 → 가명 + 소속(반/분반).
- `studentWork(student, course?)` — 산출물: 활동·제출단계·앱링크·날짜.
- `studentEmotions(student)` — 감정 기록 + 성찰(날짜별). `reason`·성찰 원문은 보내되 이름은 뗌.
- `findSessions(course?, date?, lesson?)` — 그날 무슨 수업/단계/활동.
- `lessonContent(course?, lesson?)` — 차시 계획·활동 설명(수업 내용 질문).

### 가명 처리 (프라이버시 핵심)

- `Pseudonymizer`: 명렬표(id,name,number,classNo) 보유. 참조될 때 가명을 지연 할당.
- `mask(text)`: 텍스트에서 명렬표 이름을 찾아 가명으로(긴 이름 우선). 자유서술(사유·성찰) 안의
  다른 학생 이름도 함께 가려진다.
- `unmask(text)`: 가명 → 실명.
- 매핑은 요청 내부에만 존재. Gemini에는 학생 정체가 넘어가지 않는다.

## 파일 구성

**신규**
- `src/lib/assistant/courses.ts` — activityId/groupKey/lessonNo → 과목 추론 + breadcrumb.
- `src/lib/assistant/pseudonymize.ts` — 가명기 (순수 로직).
- `src/lib/assistant/tools.ts` — 도구 정의(functionDeclarations) + 실행기 (server-only).
- `src/lib/assistant/gemini-agent.ts` — 함수호출 루프 (server-only, 이미지 파트 처리).
- `src/app/api/teacher/assistant/route.ts` — POST 핸들러.
- `src/components/teacher-assistant.tsx` — 플로팅 버튼 + 채팅 팝업 (client).
- `src/lib/teacher-jump.ts` — 출처 칩 점프용 세션 핸드오프(날짜+세션), `teacher-date`와 같은 방식.

**수정**
- `src/components/teacher-shell.tsx` — `<TeacherAssistant/>` 마운트 (교사 전용).
- `src/lib/db.ts` — `listArtifactsByStudent(studentId)` 추가.
- `src/app/teacher/dashboard/page.tsx` — 마운트 시 `teacher-jump` 를 읽어 세션 미리 선택.

## 예외·성능

- 도구 루프 최대 5회 + 전체 타임아웃(~25초). 실패 시 "지금은 답을 못 만들었어요".
- 키 없으면 챗봇 비활성(버튼만 회색 안내).
- **Gemini 모델이 실제로 함수호출 되는지 먼저 실측** (전례: 2.5-flash가 v1beta 생성에서 404).
- 전체 학생 조회는 무거우니 특정 학생/날짜로 좁혀 조회 (무료 읽기 한도).
- 대화 이력은 브라우저 localStorage. 서버측 대화 저장 없음.

## 범위 밖 (YAGNI)

이미지 답변, 스트리밍, 서버측 대화 저장, 학생 접근, 학생 quota 연동.

## 테스트

프로젝트에 테스트 러너가 없어 기존 관례를 따른다 — TypeScript 빌드 + 브라우저 리허설로 검증.
가명기는 순수 로직으로 유지해 필요 시 임시 node 스크립트로 확인.
