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
  slideUrl: string;
  reflectionQuestion: string;
  moodCheckEnabled: boolean;
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
  slideUrl: string;
  reflectionQuestion: string;
  moodCheckEnabled: boolean;
  reflectionPublic: boolean;
  lessonNo: number;
  title: string;
  status: SessionStatus;
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
  content: string;
  /** 자동 임시저장된 미완성 상태인지 (PRD 3.4) */
  draft: boolean;
  createdAt: number;
  updatedAt: number;
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
