/**
 * 도메인 타입. PRD 5.1 데이터 모델을 따른다.
 *
 * 원칙: 이름은 students 컬렉션에만 둔다. 활동 기록(attendance/moodEntries/reflections)에는
 * 학번만 저장하고, 화면에 보여줄 때만 조인한다.
 */

/** 1학년 1~4반 */
export type ClassNo = 1 | 2 | 3 | 4;

export const CLASS_NUMBERS: readonly ClassNo[] = [1, 2, 3, 4];

/** 세션 상태. 스냅샷 수정은 scheduled 상태에서만 허용된다 (PRD 5.1). */
export type SessionStatus = "scheduled" | "active" | "ended";

/**
 * 수업 진행 단계. 학생 화면은 교사가 정한 단계 하나만 보여준다.
 *
 * 중1은 화면당 할 일이 하나여야 하고(PRD 1), 30명이 제각각 다른 화면에 가 있으면
 * 교사가 수업을 끌고 갈 수 없다. 그래서 학생에게 이동 권한을 주지 않는다.
 */
export type LessonPhase =
  | "waiting"
  | "mood"
  | "progress"
  | "assessment"
  | "video"
  | "reflection"
  | "done";

export const LESSON_PHASES: readonly LessonPhase[] = [
  "waiting",
  "mood",
  "progress",
  "assessment",
  "video",
  "reflection",
  "done",
];

export const PHASE_LABELS: Record<LessonPhase, string> = {
  waiting: "대기",
  mood: "기분",
  progress: "진도 안내",
  assessment: "평가 안내",
  video: "영상 시청",
  reflection: "성찰",
  done: "마침",
};

/** 진도 안내처럼 나란히 놓고 비교하는 내용 — 카드 한 장 */
export interface ContentCard {
  /** "5단원" 처럼 앞에 붙는 꼬리표 */
  badge: string;
  title: string;
  /** "8~9월" 같은 부가 정보 */
  note: string;
  lines: string[];
}

/** 수행평가처럼 여러 개를 번갈아 보여줘야 하는 내용 — 탭 하나 */
export interface ContentTab {
  label: string;
  subtitle: string;
  note: string;
  /** 표로 보여줄 [항목, 내용] 쌍 */
  rows: { label: string; value: string }[];
  /** 꼭 기억해야 할 것 — 눈에 띄게 따로 뺀다 */
  highlights: string[];
}

/**
 * 한 단계에서 학생에게 보여줄 것.
 *
 * 긴 문단은 중1이 한눈에 읽지 못한다. cards·tabs 가 있으면 그것으로 그리고,
 * 없을 때만 body 를 그대로 보여준다. url 이 있으면 화면에 임베드한다.
 */
export interface PhaseContent {
  heading: string;
  body: string;
  url: string;
  cards?: ContentCard[];
  tabs?: ContentTab[];
}

export function emptyPhaseContent(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

/** 명렬표. 문서 ID = 학번 문자열 (예: "10101") */
export interface Student {
  studentId: string;
  name: string;
  classNo: ClassNo;
  /** 반 안에서의 번호. 임시 학생은 91~99 */
  number: number;
  /** 명렬표에 없어 임시 번호로 진입한 학생 (전입·오류) */
  temporary: boolean;
  /** 임시 학생을 실제 학번에 연결했을 때 그 학번 */
  linkedStudentId?: string;
  createdAt: number;
}

/** 수업 내용. 반과 무관하게 한 번만 등록해 4반에 공용으로 쓴다. */
export interface LessonPlan {
  id: string;
  lessonNo: number;
  title: string;
  moodCheckEnabled: boolean;
  /**
   * 대기 시간에 띄우는 미니게임.
   *
   * 태블릿이 늦게 켜지거나 주소를 잘못 쳐서 학생마다 도착 시각이 5분씩 벌어진다.
   * 먼저 온 학생의 그 시간을 그냥 버리지 않으려는 것이다.
   */
  game: PhaseContent;
  /** 수업을 시작할 때 띄우는 "방금 그 게임의 원리" 팝업. 게임으로만 끝나지 않게 한다. */
  gameExplainer: PhaseContent;
  progress: PhaseContent;
  assessment: PhaseContent;
  video: PhaseContent;
  /** 성찰 질문. 학생은 각 질문에 따로 답한다. */
  reflectionQuestions: string[];
  /** 다른 학생의 성찰 글을 볼 수 있는지. 기본값 false (PRD 3.4) */
  reflectionPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * 언제 어느 반에서 하는지. 시간표에서 자동 생성된다.
 *
 * 스냅샷 필드(slideUrl/reflectionQuestion/...)는 세션 생성 시 lessonPlan에서 복사한다.
 * 교사가 1반 수업 후 lessonPlan을 고쳐도 이미 끝난 세션의 기록은 소급 변경되지 않는다.
 */
export interface ClassSession {
  id: string;
  lessonPlanId: string;
  classNo: ClassNo;
  /** "2026-08-11" (KST 기준) */
  date: string;
  /** 교시 */
  period: number;
  /** 수업 코드. 숫자 2자리 문자열 (예: "47") */
  code: string;
  moodCheckEnabled: boolean;
  game: PhaseContent;
  gameExplainer: PhaseContent;
  progress: PhaseContent;
  assessment: PhaseContent;
  video: PhaseContent;
  reflectionQuestions: string[];
  reflectionPublic: boolean;
  lessonNo: number;
  title: string;
  status: SessionStatus;
  /** 지금 학생 화면에 띄울 단계. 교사만 바꾼다. */
  phase: LessonPhase;
  /** 수업 직후 남기는 한 줄 회고. 다음 반 수업 전 개선 루프의 출발점 (PRD 5.1) */
  teacherNote: string;
  startedAt: number | null;
  endedAt: number | null;
  createdAt: number;
}

/** 출석. 인증 완료 시각으로 확정한다 (PRD 3.3 — 감정 응답 여부와 무관). */
export interface Attendance {
  id: string;
  studentId: string;
  sessionId: string;
  classNo: ClassNo;
  date: string;
  joinedAt: number;
}

export interface MoodEntry {
  id: string;
  studentId: string;
  sessionId: string;
  classNo: ClassNo;
  date: string;
  /** 감정어 키 (mood.ts의 MOOD_OPTIONS) */
  mood: string;
  /** 불쾌 -2 ~ 쾌 +2 */
  valence: number;
  /** 비활성 -2 ~ 활성 +2 */
  arousal: number;
  /** 왜 그런지 한 줄. 학생에게는 비공개, 교사만 열람 (PRD 3.3) */
  reason: string;
  /** 교사가 확인했는지. PRD 5.4 미확인 응답 추적용 */
  reviewedByTeacher: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Reflection {
  id: string;
  studentId: string;
  sessionId: string;
  classNo: ClassNo;
  date: string;
  /** 질문별 답. 인덱스가 세션 스냅샷의 reflectionQuestions 순서와 짝을 이룬다. */
  answers: string[];
  /** 자동 임시저장된 미완성 상태인지 (PRD 3.4) */
  draft: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * 저장된 답 배열을 안전하게 꺼낸다.
 *
 * 질문이 하나였던 시절의 문서에는 answers 가 없다. 그런 문서 하나 때문에 교사 대시보드 전체가
 * 500 으로 죽으면 수업 중에 손쓸 방법이 없다. 읽는 쪽에서 항상 배열을 보장한다.
 */
export function answersOf(reflection: { answers?: string[] } | null | undefined): string[] {
  return Array.isArray(reflection?.answers) ? reflection.answers : [];
}

/** 답이 하나라도 있는지 — 제출 여부·집계 판정에 쓴다 */
export function hasAnswer(reflection: { answers?: string[] }): boolean {
  return answersOf(reflection).some((answer) => answer.trim().length > 0);
}

/** 시간표 한 줄. 반별 요일·교시를 등록하면 학기 전체 세션을 생성한다. */
export interface TimetableSlot {
  classNo: ClassNo;
  /** 0=일 ... 6=토 */
  weekday: number;
  period: number;
}

/** 학생 브라우저 세션에 담기는 내용 (서명된 HttpOnly 쿠키) */
export interface StudentSessionPayload {
  studentId: string;
  name: string;
  classNo: ClassNo;
  sessionId: string;
  temporary: boolean;
}

/** 코드 검증 통과 후 학번 입력 단계까지만 유효한 단기 토큰 */
export interface CodeTokenPayload {
  sessionId: string;
  classNo: ClassNo;
}
