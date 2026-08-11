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
  | "quiz"
  | "progress"
  | "assessment"
  | "video"
  | "draw"
  | "worksheet"
  | "gallery"
  | "reflection"
  | "done";

/**
 * 교사 화면에 버튼이 이 순서로 나열된다. 실제 수업이 지나가는 순서에 가깝게 둔다.
 *  · 2차시: waiting → mood → quiz → video → draw → reflection → done
 *  · 3차시: waiting → mood → draw → worksheet → gallery → reflection → done
 * 차시마다 쓰지 않는 단계는 그냥 건너뛴다.
 */
export const LESSON_PHASES: readonly LessonPhase[] = [
  "waiting",
  "mood",
  "quiz",
  "progress",
  "assessment",
  "video",
  "draw",
  "worksheet",
  "gallery",
  "reflection",
  "done",
];

export const PHASE_LABELS: Record<LessonPhase, string> = {
  waiting: "대기",
  mood: "기분",
  quiz: "타임머신 퀴즈",
  progress: "진도 안내",
  assessment: "평가 안내",
  video: "영상 시청",
  draw: "그리기",
  worksheet: "활동지",
  gallery: "작품 감상",
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

// ------------------------------------------------- 타임머신 퀴즈 (2차시)

/**
 * 디지털 특성 5개. 퀴즈 정답을 공개할 때 스티커로 붙어 누적된다.
 *
 * 특성을 따로 설명하는 시간을 두지 않는 것이 이 수업의 설계다. 퀴즈 네 문항을 지나면
 * 다섯 특성이 화면에 다 남아 있고, 그 상태가 곧 정리 화면이 된다.
 */
export const TRAITS = ["보안성", "정보화", "가속화", "연결성", "개인화"] as const;
export type Trait = (typeof TRAITS)[number];

export function isTrait(value: string): value is Trait {
  return (TRAITS as readonly string[]).includes(value);
}

/**
 * 정답을 공개할 때 함께 띄우는 자료.
 *
 * 말로만 "옛날엔 삐삐로 연락했다"고 하면 중1에게는 아무 그림도 안 그려진다.
 * 실물을 한 번 보여주는 쪽이 설명 세 문장보다 낫다.
 *
 * 사진은 학생 태블릿과 전자칠판 양쪽에 뜨고, **영상은 전자칠판에만** 뜬다.
 * 영상을 태블릿에 내려보내면 30명이 각자 다른 지점을 보게 된다 (PRD 3.2).
 */
export interface QuizMedia {
  kind: "image" | "video";
  url: string;
  /** 화면에 함께 적을 한 줄 설명 */
  caption: string;
  /** 출처·라이선스 표기. 남의 사진을 쓰면 밝히는 것이 수업에서 가르치는 태도와 같다 */
  credit: string;
}

export interface QuizQuestion {
  /** "1996년, 처음 가는 곳은 어떻게 찾아갔을까?" */
  prompt: string;
  /** 선지 3개 */
  choices: string[];
  answerIndex: number;
  /** 정답 공개 때 함께 보여줄 "지금은 이렇다" */
  nowText: string;
  /** 이 문항이 가르치는 특성 태그 */
  stickers: Trait[];
  /** 정답 공개 때 함께 띄울 사진·영상 */
  media?: QuizMedia;
}

export interface QuizContent {
  questions: QuizQuestion[];
}

// --------------------------------------------- 그리기 활동 (2·3차시 공용)

/** 활동지 질문 한 줄. kind 에 따라 입력 방식이 달라진다. */
export interface WorksheetQuestion {
  /** 답을 저장할 키. artifacts.answers 의 키가 된다 */
  key: string;
  label: string;
  hint: string;
  /**
   * text  — 한 줄 입력
   * long  — 여러 줄 입력
   * traits — 특성 5개 중 다중 선택. 이 답만 answers 가 아니라 artifacts.traits 에 저장된다
   */
  kind: "text" | "long" | "traits";
  maxLength: number;
}

export interface ActivityContent {
  /**
   * 그림을 묶는 열쇠. **2차시와 3차시 차시 계획에 같은 값을 넣는다.**
   *
   * 그림은 sessionId 가 아니라 이 값으로 저장·조회된다. 그래서 2차시에 그리던 그림이
   * 3차시에 그대로 열리고, 태블릿이 죽어도 폰으로 로그인해 이어 그릴 수 있다.
   * 30분 수업에서 그리기를 두 차시로 쪼갠 이상 이것 없이는 설계가 성립하지 않는다.
   */
  activityId: string;
  /** 장소 선택지 */
  places: string[];
  /** 기본 연도 */
  year: number;
  worksheet: WorksheetQuestion[];
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
  /** 타임머신 퀴즈. 없는 차시가 대부분이라 선택 항목 */
  quiz?: QuizContent;
  /** 그리기 활동. 2·3차시가 같은 activityId 를 공유한다 */
  activity?: ActivityContent;
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
  quiz?: QuizContent;
  activity?: ActivityContent;
  lessonNo: number;
  title: string;
  status: SessionStatus;
  /** 지금 학생 화면에 띄울 단계. 교사만 바꾼다. */
  phase: LessonPhase;
  /**
   * 퀴즈 진행 상태. 교사만 바꾼다.
   *
   * 세션 문서에 두는 이유: 학생 화면은 이미 세션을 폴링하고 있고 그 응답이 캐시된다.
   * 별도 컬렉션을 만들면 28명 × 4초짜리 새 폴링이 하나 더 생긴다 (PRD 10장 D2).
   */
  quizIndex?: number;
  /** 정답을 공개했는지 */
  quizRevealed?: boolean;
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

/** 퀴즈 응답. 문서ID = sessionId__학번 */
export interface QuizAnswer {
  id: string;
  studentId: string;
  sessionId: string;
  classNo: ClassNo;
  date: string;
  /**
   * 문항별 고른 선지 인덱스. 아직 안 고른 문항은 -1.
   * 한 번 고르면 바꿀 수 없다 — 정답 공개를 보고 눈치껏 바꾸는 것을 막는다.
   */
  answers: number[];
  updatedAt: number;
}

/** 저장된 답 배열을 안전하게 꺼낸다 (문항 수가 늘어난 뒤의 옛 문서 대비) */
export function quizAnswersOf(row: { answers?: number[] } | null | undefined): number[] {
  return Array.isArray(row?.answers) ? row.answers : [];
}

// ----------------------------------------------------------------- 작품

/**
 * 획 하나. 키를 한 글자로 줄인 이유는 문서 크기 때문이다.
 * 좌표 수백 개마다 "color"/"width"/"points" 를 반복하면 그것만으로 수십 KB가 된다.
 */
export interface Stroke {
  /** 색 인덱스 (PALETTE) */
  c: number;
  /** 굵기 인덱스 (STROKE_WIDTHS) */
  w: number;
  /** [x0,y0,x1,y1,…] 논리 좌표(1600×1200) 정수 */
  p: number[];
}

export interface TextItem {
  x: number;
  y: number;
  size: number;
  content: string;
}

export type ArtifactStatus = "draft" | "submitted";

/**
 * 학생 작품. 문서ID = activityId__학번
 *
 * sessionId 가 아니라 activityId 로 묶는다 — 2차시에 그린 것을 3차시에 이어 그려야 하고,
 * 태블릿이 죽으면 폰으로 이어 그릴 수 있어야 한다.
 */
export interface Artifact {
  id: string;
  activityId: string;
  studentId: string;
  classNo: ClassNo;
  /** 학생이 고른 장소 */
  place: string;
  year: number;
  strokes: Stroke[];
  texts: TextItem[];
  /** 활동지 답 (WorksheetQuestion.key → 값) */
  answers: Record<string, string>;
  /** 특성 다중 선택 (kind: "traits" 질문의 답) */
  traits: string[];
  /** 출처 — 수행평가1의 "출처 밝히기 태도" 평가 근거 (PRD 7) */
  sources: { site: string; ai: string };
  status: ArtifactStatus;
  /** 교사가 숨김 처리했는지. 갤러리에서 빠진다 */
  hidden: boolean;
  /**
   * 그림 저장 순번. 클라이언트가 저장할 때마다 1씩 올려 보내고, 서버는 이보다 낮은
   * 번호의 요청을 무시한다.
   *
   * 없으면 이런 일이 생긴다: 자동저장(획 10개)이 날아가는 중에 교사가 단계를 넘겨
   * 마지막 저장(획 12개 전체)이 함께 출발한다. 둘의 도착 순서는 보장되지 않아서,
   * 늦게 도착한 옛 요청이 최신 그림을 덮어쓰거나 같은 획을 두 번 붙인다.
   */
  saveRev: number;
  createdAt: number;
  updatedAt: number;
}

/** 피드백. 문서ID = artifactId__작성자학번 (교사는 작성자 자리에 "teacher") */
export interface ArtifactFeedback {
  id: string;
  artifactId: string;
  /** 작성자 학번. 교사가 쓴 것은 "teacher" */
  authorId: string;
  /** 대상 작품 주인의 학번 — 내가 받은 피드백을 찾을 때 쓴다 */
  ownerId: string;
  classNo: ClassNo;
  /** "그림에서 찾은 기술 하나" */
  foundTech: string;
  /** "궁금한 점 하나" */
  question: string;
  /** 작품 주인의 한 줄 응답 */
  authorReply: string;
  createdAt: number;
  updatedAt: number;
}

/** 교사가 쓴 피드백의 작성자 자리 값 */
export const TEACHER_AUTHOR_ID = "teacher";

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
