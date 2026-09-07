/**
 * 챗봇 범용 조회(queryData)가 볼 수 있는 데이터 카탈로그.
 *
 * AI 조교는 교사 대시보드가 접근하는 학생 데이터에 기본적으로 접근할 수 있어야 한다.
 * 질문마다 전용 도구를 만드는 대신, Gemini 가 여기 적힌 컬렉션·필드를 보고 직접 질의를
 * 조립하게 한다(queryData). 해석·조합은 그 다음이다.
 *
 * 두 갈래로 쓴다:
 *  - `SCHEMA_TEXT` : Gemini 에게 주는 사람말 설명(어떤 컬렉션에 무엇이 있는가).
 *  - `COLLECTION_META` : 서버가 조회를 안전하게 실행하고 프라이버시를 지키는 규칙.
 *     · indexable  — Firestore 로 밀어 넣기 좋은(자동 색인) 동등 필터 필드
 *     · textFields — 이름이 섞일 수 있는 자유서술 → 마스킹 대상
 *     · heavyFields — 화면·모델에 보낼 필요 없는 큰 필드 → 뺀다
 *
 * 학생 정체(name·studentId)는 컬렉션과 무관하게 항상 가명 처리한다(마스킹 층에서).
 */

export interface CollectionMeta {
  label: string;
  indexable: string[];
  textFields: string[];
  heavyFields: string[];
}

export const COLLECTION_META: Record<string, CollectionMeta> = {
  students: { label: "명렬표", indexable: ["classNo", "number", "temporary"], textFields: [], heavyFields: [] },
  moodEntries: {
    label: "기분 체크",
    indexable: ["studentId", "sessionId", "classNo", "date", "reviewedByTeacher"],
    textFields: ["reason"],
    heavyFields: [],
  },
  reflections: {
    label: "성찰",
    indexable: ["studentId", "sessionId", "classNo", "date", "draft"],
    textFields: ["answers"],
    heavyFields: [],
  },
  artifacts: {
    label: "작품/활동지",
    indexable: ["activityId", "studentId", "classNo", "status", "submitStage"],
    textFields: ["answers", "teacherFeedback", "sources"],
    heavyFields: ["strokes", "texts"],
  },
  classSessions: {
    label: "수업 세션",
    indexable: ["date", "classNo", "groupKey", "lessonNo", "status", "period"],
    textFields: [],
    heavyFields: ["game", "gameExplainer", "progress", "assessment", "video", "activity", "quiz", "reviewCache"],
  },
  attendance: {
    label: "출석·진행",
    indexable: ["studentId", "sessionId", "classNo", "date", "passed"],
    textFields: ["selfCheck"],
    heavyFields: ["answeredKeys"],
  },
  quizAnswers: {
    label: "퀴즈 응답",
    indexable: ["studentId", "sessionId", "classNo", "date"],
    textFields: [],
    heavyFields: [],
  },
  enrollments: { label: "분반 수강", indexable: ["groupKey", "studentId"], textFields: [], heavyFields: [] },
  lessonPlans: { label: "차시 계획", indexable: ["lessonNo"], textFields: [], heavyFields: ["game", "gameExplainer", "progress", "assessment", "video", "activity", "quiz"] },
};

export const SCHEMA_TEXT = [
  "데이터(교사 대시보드가 보는 것과 같다). queryData 로 컬렉션을 골라 조회한다. 학생 참조는 가명('학생A'), 날짜는 YYYY-MM-DD.",
  "프라이버시: 반(classNo)·번호(number)로 필터는 걸 수 있지만, 조회 결과 줄에는 반·번호가 담기지 않는다(준식별자라 뺀다). 누가 누구인지·몇 반 몇 번인지는 교사 화면의 출처(근거)에만 나오니, 반·번호가 필요하면 '근거를 보라'고 안내하고 답에 지어내지 마라.",
  "- students(명렬표): studentId, name, classNo(1~4), number(출석번호), temporary. 필터: classNo, number.",
  "- moodEntries(기분 체크): studentId, classNo, date, sessionId, mood(감정어), valence(-2 불쾌~+2 쾌), arousal(-2 비활성~+2 활성), reason(사유), reviewedByTeacher(교사 확인). 필터: studentId, classNo, date, reviewedByTeacher.",
  "- reflections(성찰): studentId, classNo, date, sessionId, answers(질문별 답 배열), draft(작성중). 필터: studentId, classNo, date, draft.",
  "- artifacts(작품/활동지): activityId, studentId, classNo, answers(활동지 답; build_url=만든 앱 주소), status, submitStage(0~3), teacherFeedback.note(교사 피드백). 필터: activityId, studentId, classNo, status, submitStage.",
  "- classSessions(수업): date, period, classNo, groupKey, groupLabel, lessonNo, title, status(scheduled/active/ended). 필터: date, classNo, groupKey, lessonNo, status.",
  "- attendance(출석·진행): studentId, sessionId, classNo, date, passed(통과 여부), submitStage, selfCheck(자기점검), away(이탈 누적), careAlert(위기 신호). 필터: studentId, classNo, date, passed.",
  "- quizAnswers(퀴즈): studentId, sessionId, classNo, date, answers.",
  "- enrollments(분반 수강): groupKey, studentId.",
  "- lessonPlans(차시 계획): lessonNo, title, reflectionQuestions.",
  "분반 열쇠(groupKey): 인간과인공지능 hai-tue-1·hai-tue-2·hai-thu-1·hai-thu-2, 디지털 마음 톡톡 mt-tue-1·mt-thu-2.",
  "연산자: eq, ne, lt, lte, gt, gte, in, contains(문자열 포함 — 성찰·사유 텍스트 검색용).",
  "예) 1반에서 부정 기분: collection=moodEntries, where=[[\"classNo\",\"eq\",1],[\"valence\",\"lt\",0]].",
  "예) 통과 못 한 학생: collection=attendance, where=[[\"classNo\",\"eq\",1],[\"passed\",\"ne\",true]].",
].join("\n");
