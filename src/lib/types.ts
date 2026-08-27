/**
 * 도메인 타입. PRD 5.1 데이터 모델을 따른다.
 *
 * 원칙: 이름은 students 컬렉션에만 둔다. 활동 기록(attendance/moodEntries/reflections)에는
 * 학번만 저장하고, 화면에 보여줄 때만 조인한다.
 */

/**
 * 1학년 반 번호.
 *
 * 정보과는 1~4반만 가르치는데, 선택과목은 학년 전체에서 학생이 모인다 —
 * 「인간과 인공지능」 화요일 1기 22명은 5·6·7·8반에서 왔다. 학번 앞자리가 5~8이면
 * 지금까지는 파싱 단계에서 통째로 거부됐다. 로그인 자체가 안 됐다는 뜻이다.
 *
 * 8까지 넓힌다. 정보과 화면은 아래 CLASS_NUMBERS 를 쓰므로 그대로 1~4반만 돈다.
 */
export type ClassNo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * 정보과가 가르치는 반. 반 고르는 화면·집계는 이 목록을 쓴다.
 *
 * 선택과목 학생의 반(5~8)이 정보과 대시보드의 반 목록에 섞여 들어오면, 있지도 않은
 * 수업의 반이 화면에 뜬다.
 */
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
  /*
   * 「디지털 마음 톡톡」이 기분 체크와 영상 사이에 쓰는 두 칸.
   *
   * 낱말을 배우기 **전에** 한 번 고르고, 퀴즈로 낱말을 익힌 뒤 **다시** 고른다.
   * 그 사이의 차이가 곧 오늘 배운 것이라, 두 번째 체크인은 활동이지 중복이 아니다.
   */
  | "wordquiz"
  | "recheck"
  | "quiz"
  | "progress"
  | "assessment"
  | "video"
  /*
   * 아래 넷은 선택과목 「인간과 인공지능」이 쓴다.
   *
   * 정보과 차시는 이 단계에 내용을 넣지 않으므로 교사 버튼에서 저절로 빠진다
   * (available 판정 참조). 기존 단계는 하나도 건드리지 않았다.
   */
  | "problem"
  | "mvp"
  | "build"
  | "grill"
  /*
   * 「디지털 마음 톡톡」(자유학기 주제선택)이 쓴다.
   *
   * 학생이 쓴 경험 글을 AI가 읽고 감정을 추측해 주면, 학생이 그 추측과 자기 마음을
   * 견줘 보는 단계다. 다른 과목 차시는 이 단계에 문항을 넣지 않으므로 교사 버튼에서
   * 저절로 빠진다 (available 판정 참조).
   */
  | "emotion"
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
/**
 * 단계 순서 — 대시보드의 버튼 차례이자 "이전·다음 단계"가 따라가는 길이다.
 *
 * 진도·평가 안내가 퀴즈보다 앞이다. 둘 다 있는 수업은 1·2차시 합본처럼 오리엔테이션을
 * 겸하는 경우인데, 그때는 학기 안내를 먼저 하고 활동으로 들어가는 편이 자연스럽다.
 * 안내를 뒤로 미루면 활동이 끊기고, 남은 시간에 밀려 안내를 아예 못 하기도 한다.
 *
 * 진도·평가가 비어 있는 차시(2·3차시)에서는 그 둘이 버튼에서 빠지므로,
 * 기분 다음이 곧 퀴즈다 — 순서를 바꿔도 그 수업들의 흐름은 그대로다.
 */
export const LESSON_PHASES: readonly LessonPhase[] = [
  "waiting",
  "mood",
  /*
   * 기분 체크 바로 뒤. 낱말 퀴즈 → 다시 기분 체크 순서를 여기서 못 박는다.
   *
   * 다른 칸을 빌려 쓸 수가 없었다. 기분과 영상 사이에 있는 칸(진도 안내·평가 안내·
   * 퀴즈)은 전부 활동지 문항을 못 띄우고, 활동지를 띄울 수 있는 칸(만들기·검토)은
   * 「인간과 인공지능」이 쓰는 순서가 있어 앞으로 옮길 수 없다.
   */
  "wordquiz",
  "recheck",
  "progress",
  "assessment",
  "quiz",
  "video",
  /*
   * 선택과목 단계는 "만들어 보고 나서 검토한다" 는 순서로 둔다.
   * 검토(grill)를 만들기(build) 앞에 두면 학생은 상상으로 답한다. 뒤에 두면 눈앞의
   * 결과를 보며 답한다 — 이 수업 설계의 핵심이라 순서를 지킨다.
   */
  "problem",
  "mvp",
  "build",
  "grill",
  "draw",
  "worksheet",
  /*
   * 감정 렌즈는 **활동지 뒤**다. 학생이 자기 경험 글을 먼저 쓴 다음에 AI에게 보여준다.
   *
   * 앞에 두면 AI가 던진 낱말을 그대로 베껴 쓰게 되고, "정답은 나에게 있다" 는 이 수업의
   * 결론이 뒤집힌다. 순서가 곧 설계라서 목록 자리로 못 박아 둔다 — 되돌아가기 목록도
   * 이 순서를 따르므로, 앞에 두면 학생이 글을 쓰기 전에 렌즈로 건너뛸 수 있게 된다.
   */
  /*
   * 서로 보기는 감정 렌즈보다 **앞**이다.
   *
   * 마음 톡톡은 감정 낱말을 쓴 직후에 같은 감정을 고른 친구를 찾아 읽는다 —
   * "나만 그런 게 아니구나" 를 먼저 겪고 나서 AI에게 물으러 간다. 뒤에 두면
   * 그 순서가 뒤집힌다.
   *
   * 그리기 차시(정보과 3차시)는 감정 단계를 안 써서 draw → worksheet → gallery
   * 순서가 그대로다.
   */
  "gallery",
  "emotion",
  "reflection",
  "done",
];

export const PHASE_LABELS: Record<LessonPhase, string> = {
  waiting: "대기",
  mood: "기분",
  wordquiz: "감정 낱말 퀴즈",
  recheck: "기분 다시 고르기",
  quiz: "타임머신 퀴즈",
  progress: "진도 안내",
  assessment: "평가 안내",
  video: "영상 시청",
  problem: "문제 정의",
  /*
   * "MVP 기획" 이라고 쓰지 않는다. 중1이 모르는 말이다.
   *
   * 뜻을 그대로 옮기면 "꼭 필요한 것만" 이다. 다음 단계가 "만들기" 라서
   * "제일 작게 만들기" 로는 두 단추가 헷갈린다.
   */
  mvp: "꼭 필요한 것만",
  build: "만들기",
  grill: "AI 검토",
  emotion: "AI 감정 렌즈",
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
  /**
   * 새 창으로 열 것인가.
   *
   * 카메라·마이크를 쓰는 사이트는 iframe 안에서 권한이 막힌다 — 태블릿에서는 아예
   * 안 되는 경우가 많아, 학생 절반이 검은 화면 앞에서 손을 든다.
   */
  openInNewTab?: boolean;
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
  /**
   * text   — 한 줄 입력
   * long   — 여러 줄 입력
   * traits — 특성 5개 중 다중 선택. 이 답만 answers 가 아니라 artifacts.traits 에 저장된다
   * choice — 주어진 보기 중 하나. 고른 문구가 그대로 answers 에 들어간다
   * multi  — 주어진 보기 중 **여럿**. 고른 것들을 " · " 로 이어 한 칸에 담는다.
   *          traits 와 다르다 — 보기를 차시가 정하고, 답도 answers 로 들어간다.
   * note      — 입력칸 없이 안내만. 문항이 여럿 이어질 때 묶어 주는 머리글로 쓴다
   * echo      — 앞 단계에서 쓴 답을 읽기 전용으로 다시 보여준다 (echoKeys)
   * ai_review — 단추를 누르면 앞서 쓴 답들을 모아 AI에게 보내고, 아직 안 짚은 것을
   *             질문 2개로 돌려받는다 (reviewFields). AI는 평가·칭찬 없이 질문만 한다.
   * emotion_lens — 앞 칸에 쓴 경험 글(lensSourceKey)을 AI에게 보내고, 감정 추측
   *             2개와 공감 한 줄을 돌려받는다. 맞히는 것이 목적이 아니라 **학생이
   *             그 추측과 자기 마음을 견줘 보게** 하는 것이 목적이다.
   * emotion_quiz — 감정 낱말 퀴즈 (quizItems). 하 → 중 → 상 을 차례로 깨고,
   *             한 단계를 다 맞혀야 다음이 열린다. 틀린 문항만 다시 푼다.
   * mood_recheck — 무드미터 표를 다시 띄워 기분을 한 번 더 고르게 한다. 처음
   *             체크인에서 고른 낱말을 나란히 보여준다 — 그 차이가 배운 것이다.
   */
  kind:
    | "text"
    | "long"
    | "traits"
    | "choice"
    | "multi"
    | "note"
    | "echo"
    | "ai_review"
    | "emotion_lens"
    | "emotion_quiz"
    | "mood_recheck";
  /**
   * echo 가 다시 보여줄 답들.
   *
   * 한 시간에 여러 단계를 지나는 차시에서는 **앞 단계 답이 화면에서 사라진다.**
   * "앞에서 쓴 한 줄을 그대로 넣어도 돼요" 라고 안내해 놓고 그 한 줄을 안 보여주면,
   * 학생은 기억으로 다시 쓰거나 그냥 새로 지어낸다. 되돌아가기가 꺼진 수업에서는
   * 볼 방법 자체가 없다.
   */
  echoKeys?: { key: string; label: string }[];
  /**
   * 문항 아래에 붙는 큰 링크 단추.
   *
   * 캔바 초대 주소처럼 **글자로 보여주면 안 되는** 주소가 있다. 토큰이 붙어 100자가
   * 넘는데, 중1에게 그걸 손으로 옮겨 적으라고 하면 그 자리에서 수업이 멈춘다.
   *
   * 새 창으로 연다 — 같은 창에서 나가면 쓰던 답이 날아간다.
   */
  linkUrl?: string;
  linkLabel?: string;
  /**
   * 분반마다 다른 주소 (분반 열쇠 → 주소).
   *
   * 캔바 초대 주소가 분반별 그룹으로 따로 나 있다. 여기 넷을 다 적어 두고, **수업을
   * 만들 때 그 분반 것 하나만 골라 `linkUrl` 에 박고 이 필드는 지운다**
   * (db.ts 의 snapshotOf).
   *
   * 지우는 것이 핵심이다. 활동지는 학생 화면으로 통째로 내려가므로, 이 표가 남아 있으면
   * 화요일 1기 학생의 브라우저에 목요일 2기 초대 토큰까지 실려 간다 — 남의 분반
   * 캔바 그룹에 들어갈 수 있게 된다.
   */
  linkUrlByGroup?: Record<string, string>;
  /**
   * 칸이 비어 있을 때 앞 답으로 미리 채워 넣을 문장.
   *
   * `{키}` 자리에 그 칸의 답이 들어간다. 안 쓴 칸은 통째로 빠진다.
   *
   * 앞 답을 읽기 전용으로 옆에 보여주기만 하면 학생은 그것을 **손으로 옮겨 적는다.**
   * 45분에 뽑기까지 가야 하는 수업에서 그 시간이 아깝고, 옮겨 적다가 달라지기도 한다.
   * 미리 채워 두고 고치게 하는 편이 빠르고 정확하다.
   *
   * **이미 쓴 것은 절대 덮지 않는다.** 비어 있을 때 한 번만 채운다.
   */
  prefillTemplate?: string;
  /** 칸 옆에 복사 단추를 붙인다 (다른 곳에 붙여 넣을 값일 때) */
  copyable?: boolean;
  /**
   * ai_review 가 AI 에게 보낼 답들. 순서대로 이름표를 붙여 함께 보낸다.
   * 안 쓴 칸은 자동으로 빠진다 — 학생이 비워 둔 것까지 "왜 안 썼냐"고 묻지 않는다.
   */
  reviewFields?: { key: string; label: string }[];
  /**
   * emotion_lens 가 AI 에게 보낼 글이 들어 있는 칸.
   *
   * 즉석에서 새로 쓰게 하지 않는다. 앞 단계에서 **고민해서 쓴 글**을 그대로 보낸다 —
   * 렌즈 화면에 빈 칸을 하나 더 두면 학생은 거기에 한 줄로 대충 적고, 그러면 추측이
   * 얕아져서 견줄 것이 없어진다.
   */
  lensSourceKey?: string;
  /**
   * emotion_quiz 의 문항. `level` 순서(easy → mid → hard)로 단계가 열린다.
   *
   * **한 단계를 다 맞혀야 다음이 열린다.** 점수를 매겨 줄을 세우려는 것이 아니라,
   * 감정 낱말을 정확히 알고 넘어가게 하려는 것이다 — 표현은 낱말을 알아야 시작된다.
   * 그래서 틀리면 해설을 보고 **그 문항만** 다시 푼다. 맞힌 것은 다시 안 묻는다.
   */
  quizItems?: {
    level: "easy" | "mid" | "hard";
    prompt: string;
    choices: string[];
    answerIndex: number;
    /** 왜 그 낱말인지. 맞히든 틀리든 채점 뒤에 보여준다 */
    explain: string;
  }[];
  /**
   * 세 단계를 다 깬 뒤에 할 말. 안 적으면 감정 낱말 퀴즈용 기본 문구가 나온다.
   *
   * 같은 퀴즈 부품을 낱말 익히기에도, 수행평가 채점 기준 익히기에도 쓴다.
   * 끝나고 할 말이 서로 다르다.
   */
  quizDoneMessage?: string;
  /**
   * choice 의 보기.
   *
   * 보기 문구 안에 판단 근거를 넣어 둔다. 5차시에서 "곧 가져간다 / 나중에 / 사람이 계속"
   * 처럼만 두면 중1은 근거 없이 찍는다. "순서가 정해져 있어서 — 곧 가져간다" 로 적어 두면
   * 고르는 순간 이유를 함께 고르게 되고, 따로 설명할 필요가 없어진다.
   */
  choices?: string[];
  maxLength: number;
  /**
   * 질문 아래에 붙는 낱말 보기.
   *
   * hint 로는 모자란 경우가 있다. 3차시에서 "그림에 넣은 핵심 기술의 이름"을 물었더니
   * 중1이 **첨단 기술이라는 말 자체를 몰라** 칸을 비웠다. 예시 한 줄이 아니라 고를 수
   * 있는 목록이 눈앞에 있어야 한다.
   *
   * 눌러서 칸에 넣어 주지는 않는다. 답으로 원하는 것은 "로봇"이 아니라 "음식을 나르는
   * 로봇"이라서, 눌러 넣게 하면 낱말만 남고 생각이 빠진다.
   */
  examples?: string[];
  /**
   * examples 상자의 안내 문구. 안 적으면 그림 차시 기본값(첨단 기술 · 로봇 예시)이 나온다.
   *
   * 감정 낱말을 보여주는 차시에 기본값이 그대로 나가면 "첨단 기술이란 이런 것들이에요"
   * 가 감정 낱말 위에 붙는다. 중1은 안내를 지시로 읽으므로 엉뚱한 안내는 없는 것보다 나쁘다.
   */
  examplesNote?: { heading: string; hint: string };
  /**
   * 이 문항을 어느 단계에서 보여줄지.
   *
   * 비우면 활동지(worksheet) 단계에 나온다 — 지금까지의 차시가 전부 그렇다.
   *
   * 선택과목은 한 시간에 문제 정의 · MVP 기획 · 만들기 · AI 검토를 차례로 지나간다.
   * 이걸 활동지 하나에 다 넣으면 학생이 첫 칸에서 붙잡혀 끝까지 못 간다. 교사가 단계를
   * 넘기면 그 단계 문항만 보이게 해야 시간을 끌고 갈 수 있다.
   */
  phase?: LessonPhase;
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
  /**
   * 그림판에서 열어 보는 첨단 기술 목록.
   *
   * 활동지의 examples 와 같은 값을 넣는다. 나누어 둔 이유는 **필요한 때가 다르기**
   * 때문이다. 활동지는 다 그린 뒤에 여는 화면이라, 거기에만 두면 정작 무엇을 그릴지
   * 정해야 하는 순간에는 볼 수가 없다.
   *
   * 비워 두면 그림판에 단추가 안 생긴다 (4차시처럼 그림이 없는 차시).
   */
  techExamples?: string[];
  /**
   * 그리기 첫 화면(장소 고르기)의 문구. 안 적으면 "어디를 그릴까요? / ○○년의 모습을
   * 상상해서 그릴 장소를 하나 고르세요".
   *
   * 3차시는 장소를 그리는 활동이라 기본 문구가 맞았다. 6차시는 **내 직업이 일하는
   * 모습**을 그리는데, 기본 문구만 보면 학생은 3차시처럼 아무 미래 도시를 그린다 —
   * 그러면 다음 시간 서술과 이어지지 않는다. 그리기 화면은 활동지와 따로 뜨는 화면이라
   * 안내를 여기 두지 않으면 닿을 방법이 없다.
   */
  drawPrompt?: { heading: string; body: string };
  /**
   * 활동지 첫 화면의 문구. 안 적으면 "내 그림 설명하기 / ○○년의 △△ — 무엇을 그렸는지
   * 적어 주세요".
   *
   * 기본 문구는 **그림을 설명하는 활동지**를 전제한다. 6차시 활동지는 그림을 재료 삼아
   * 신문 기사를 쓰는 것이라, 기본값이 그대로 나가면 머리글만 보고 그림 설명을 적는다.
   * drawPrompt 와 같은 이유이고 같은 모양으로 둔다 — 그리기 화면과 활동지 화면은
   * 따로 뜨므로 안내가 각각 필요하다.
   */
  worksheetIntro?: { heading: string; body: string };
  /**
   * 활동지 아래 출처 두 칸의 예시.
   *
   * 기본값은 그림 활동을 전제한다("나무위키 — 자율주행"). 4차시(직업 조사)에 그대로
   * 두면 무엇을 찾아보라는 것인지 어긋난다 — 자율주행을 찾아본 학생은 없다.
   * 예시가 엉뚱하면 안 쓰는 것보다 나쁘다. 중1은 예시를 지시로 읽는다.
   */
  sourceHints?: { site: string; ai: string };
  /**
   * 감상 화면 왼쪽 필터를 무엇으로 세울지.
   *
   * 정하지 않으면 그림 활동 기준으로 **디지털 사회의 특성 · 장소**가 선다. 4차시처럼
   * 특성도 장소도 없는 차시에서는 그것이 아무것도 거르지 못하는 체크박스 다섯 개로
   * 남는다 — 눌러도 목록이 그대로라 학생은 화면이 고장 난 줄 안다.
   *
   * `answerKeys` 는 활동지 답의 키다. 그 칸들에 적힌 말이 그대로 필터 항목이 된다.
   * 많이 나온 순으로 세운다.
   */
  galleryFacets?: { key: string; label: string; answerKeys: string[] }[];
  /**
   * 서로 구경하기를 여는가. 안 적으면 열린다 (지금까지의 차시가 전부 그렇다).
   *
   * **감정을 쓰는 차시에서는 반드시 false 로 막는다.** 「디지털 마음 톡톡」의 활동지에는
   * "최근 있었던 일" 과 그때의 감정이 들어간다 — 성찰 글과 같은 등급이라 친구에게 보이면
   * 안 되는 내용인데, 지금까지의 판정은 "활동지 문항이 있으면 감상을 연다" 였다.
   * 그대로 두면 마음 이야기가 반 전체에 그대로 걸린다.
   *
   * 학생 화면의 감상 탭, 교사 대시보드의 감상 단추, 감상 API 가 모두 이 값을 본다.
   */
  galleryEnabled?: boolean;
  /**
   * 친구에게 보여줄 **답 칸을 딱 집어 정한다.** 안 적으면 지금까지처럼 전부 보인다.
   *
   * 감상 화면은 활동지 답을 통째로 카드에 싣는다. 감정을 쓰는 차시에서 그대로 열면
   * 감정 낱말만 나누려던 것이 경험 글·AI 비교·성찰까지 통째로 반 전체에 걸린다.
   *
   * **거르는 곳은 서버다** (gallery 라우트의 toCard). 화면에서 고르면 안 보일 뿐
   * 응답에는 실려 있어서, 개발자 도구를 여는 학생 하나면 다 읽힌다.
   */
  galleryAnswerKeys?: string[];
  /**
   * 감상 화면에서 부르는 말. 안 적으면 그림이 있으면 "작품", 없으면 "활동지".
   *
   * 감정을 나누는 활동에 "친구 활동지" 라고 하면 서로 숙제 검사하는 것처럼 읽힌다.
   * "이야기" 로 두면 "친구 이야기 (21)" 이 되어 무엇을 보러 가는지가 그대로 읽힌다.
   */
  galleryNoun?: string;
  /**
   * 지난 차시에 쓴 답을 활동지 위에 읽기 전용으로 띄운다.
   *
   * 5차시는 "내 희망 직업" 에서 출발하는데, 그 답은 이미 4차시에 적었다. 다시 쓰라고 하면
   * 그 자리에서 막히는 학생이 나온다 — 진로가 없어서가 아니라 지난주에 겨우 정한 것을
   * 또 떠올려야 해서다. 옆에 띄워 두면 그냥 이어 쓴다.
   *
   * 리허설에서는 리허설 쪽 기록을 본다 (진짜 기록과 섞이지 않게, gallery.ts 참조).
   */
  carryOver?: {
    /** 어느 활동에서 가져올지. 4차시는 future-job */
    activityId: string;
    heading: string;
    fields: { key: string; label: string }[];
  };
  /**
   * 친구 것을 보고 남기는 두 칸의 질문.
   *
   * 기본값은 그림을 전제로 한다("이 그림에 어떤 기술이 쓰였을까요"). 4차시처럼 글만 쓰는
   * 활동에서는 그대로 두면 답할 수가 없다 — 볼 그림이 없다.
   *
   * 두 칸의 성격은 유지한다. 첫 칸은 **자세히 들여다봐야 답할 수 있는 것**을 묻고,
   * 둘째 칸은 작성자에게 던지는 질문이다. 칭찬이나 평가가 오가면 서열이 생긴다.
   */
  feedbackPrompts?: {
    found: { label: string; placeholder: string };
    question: { label: string; placeholder: string };
  };
}

/** 출처 두 칸의 기본 예시. 차시가 따로 정하지 않으면 이것을 쓴다 (그림 활동 기준) */
export const DEFAULT_SOURCE_HINTS = {
  site: "예) 나무위키 — 자율주행",
  ai: "예) 챗지피티 — 2040년 병원은 어떻게 바뀔까?",
} as const;

/** 그림 활동의 기본 질문. 차시가 따로 정하지 않으면 이것을 쓴다 */
export const DEFAULT_FEEDBACK_PROMPTS = {
  found: {
    label: "이 그림에 어떤 기술이 쓰였을까요? 맞혀 보세요",
    placeholder: "예) 천장에 달린 배달 드론인 것 같아요",
  },
  question: {
    label: "그림을 그린 친구에게 물어보고 싶은 것",
    placeholder: "예) 비 오는 날에도 날 수 있나요?",
  },
} as const;

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
  /**
   * 영상을 보는 동안 화면에 띄울 "생각할 것".
   *
   * 안 적으면 성찰 질문을 그대로 띄운다 — 영상 직후에 성찰을 쓰는 차시(정보과 2차시)는
   * 그게 맞다. 하지만 영상이 **수업 맨 앞**에 오는 차시에서는 어긋난다.
   * 마음 톡톡은 영상이 첫 활동인데 성찰(마음일기)은 90분 뒤라, 시작하자마자
   * "지금 내 기분은 어떤가요?" 가 세 개나 떠서 학생이 지금 답해야 하는 줄 안다.
   */
  videoPrompts?: string[];
  /** 성찰 질문. 학생은 각 질문에 따로 답한다. */
  reflectionQuestions: string[];
  /** 다른 학생의 성찰 글을 볼 수 있는지. 기본값 false (PRD 3.4) */
  reflectionPublic: boolean;
  /** 이 차시에서만 쓰는 단계 이름 (4차시 진도 안내 → AI 직업 관상 체험) */
  phaseLabels?: Partial<Record<LessonPhase, string>>;
  /** 이 차시에서만 이탈을 세지 않을 단계 */
  focusExempt?: LessonPhase[];
  /**
   * 이 차시를 여는 단위. 선택과목처럼 반이 아니라 **분반**으로 여는 경우에만 적는다.
   *
   * 「인간과 인공지능」은 화요일 1기 · 화요일 2기 · 목요일 1기 · 목요일 2기 넷으로
   * 나뉘고, 각 분반에 여러 반 학생이 섞여 있다. 수업을 열 때 "1반~4반" 을 고르라고 하면
   * 고를 것이 없다.
   *
   * `classNo` 는 화면에 보이지 않는 **데이터 통 번호**다. 출석·작품·감정이 전부 이
   * 값으로 묶이므로 분반마다 다른 값을 줘야 한다 — 같은 값을 주면 화요일 1기가
   * 목요일 2기 작품을 보게 된다.
   */
  groups?: { key: string; label: string; classNo: ClassNo }[];
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
  /**
   * 이 수업이 묶이는 반.
   *
   * 학생의 소속 반이기도 하고 수업의 단위이기도 했다. 선택과목이 생기면서 둘이 갈라진다 —
   * 여러 반에서 온 학생이 한 수업에 앉는다. 그때는 groupKey 를 쓴다.
   *
   * 값 자체는 그대로 둔다. 출석·작품·감정이 전부 이 값으로 묶여 있어서, 여기를 건드리면
   * 운영 중인 정보과가 멈춘다. 선택과목 수업도 반 하나를 골라 적어 두고, 그 값으로 묶는다.
   */
  classNo: ClassNo;
  /**
   * 반이 섞인 수업인지. 선택과목처럼 여러 반 학생이 한자리에 앉는 경우에만 적는다.
   *
   * 이 값이 있으면 학번의 반과 수업의 반이 달라도 들어올 수 있다. 없으면 지금까지처럼
   * 반이 맞아야 한다 — 다른 반 코드를 알아내도 소용없게 하는 장치다 (PRD 3.1).
   *
   * **세션 문서 ID 는 바꾸지 않는다.** 계획서에는 `날짜__교시__groupKey` 로 바꾸자고
   * 되어 있는데, 그러면 운영 중인 정보과 문서를 전부 옮겨야 한다. 반이 섞인 수업에
   * 필요한 것은 "반 검사를 건너뛰는 것" 하나뿐이라, 필드만 얹는다.
   */
  groupKey?: string;
  /**
   * 화면에 쓸 분반 이름 ("화요일 1기").
   *
   * 차시 계획에서 찾아 쓸 수도 있지만, 그러면 수업 목록을 그릴 때마다 계획 문서를
   * 함께 읽어야 한다. 세션에 적어 두면 읽기가 늘지 않고, 계획이 나중에 바뀌어도
   * 그 수업이 실제로 무엇이었는지가 남는다 (PRD 5.1 과 같은 이유).
   */
  groupLabel?: string;
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
  /** 영상 볼 때 띄울 "생각할 것". 없으면 성찰 질문을 쓴다 (LessonPlan 쪽 설명 참조) */
  videoPrompts?: string[];
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
  /**
   * 교사가 혼자 걸어보는 리허설 수업.
   *
   * 방과 후에 화면을 미리 확인하려면 "오늘 날짜에, 아직 안 끝난 교시" 인 수업이 있어야
   * 하는데 그런 시간이 없다. 그래서 이 표시가 붙은 수업은 교시 시각과 무관하게 열려 있다.
   *
   * 대신 "지금 하는 수업" 자동 선택에서는 빠진다. 지우는 것을 깜빡한 리허설 수업이
   * 다음 날 진짜 수업 대신 대시보드에 뜨면, 교사는 엉뚱한 반을 보며 수업을 진행하게 된다.
   */
  rehearsal?: boolean;
  /**
   * 교사 연수 시연용 수업.
   *
   * 참가자는 코드도 학번도 입력하지 않는다. `/demo` 링크를 누르면 서버가 빈 임시 번호를
   * 하나 배정한다 — 스무 명에게 번호를 불러 주다 보면 겹치고, 겹치면 한 문서에 둘이
   * 써서 그림이 서로 덮인다.
   *
   * 자리를 넉넉히 하려고 **다른 반 임시 번호까지 끌어 쓴다**(반당 90~99, 네 반이면 40).
   * 출석·그림에 적히는 반은 이 수업의 반으로 통일하므로, 작품 감상은 참가자 전체가
   * 서로 다 보인다.
   *
   * 반드시 리허설로 만든다 — 진짜 학생 기록과 완전히 분리된다.
   */
  demo?: boolean;
  /**
   * 학생이 **지나온 단계로 되돌아갈 수 있는가** (기본 꺼짐).
   *
   * 다 같이 한 곳을 봐야 하는 구간이 있고 — 퀴즈 문항을 함께 읽을 때가 그렇다 —
   * 각자 속도로 보완해야 하는 구간이 있다. 앞의 것을 위해 학생 화면은 교사를 따라가는
   * 것이 기본이고(PRD 3.2), 이 값을 켜면 지나온 단계까지는 스스로 오갈 수 있다.
   *
   * **앞 단계로는 못 간다.** 아직 안 한 퀴즈를 미리 열어 보거나 남의 작품을 먼저
   * 들여다보면 수업을 끌고 갈 수가 없다.
   */
  freeNavigation?: boolean;

  /**
   * 이 차시에서만 쓰는 단계 이름.
   *
   * 단계 칸은 열한 개로 고정인데 차시마다 쓰임이 다르다. 4차시는 "진도 안내" 칸에
   * AI 관상 체험을 실었다 — 교사 화면에 "진도 안내"로 뜨면 수업 중에 잘못 누른다.
   * 학생 화면에는 단계 이름이 뜨지 않으므로 교사 화면과 되돌아가기 줄에만 쓴다.
   */
  phaseLabels?: Partial<Record<LessonPhase, string>>;

  /**
   * 이 차시에서만 이탈을 세지 않을 단계. 기본 제외(대기·영상·마침)에 더한다.
   *
   * 화면을 벗어나는 것이 활동 자체인 단계가 차시마다 다르게 생긴다 —
   * 4차시 AI 관상 체험은 새 창에서 카메라를 켠다.
   */
  focusExempt?: LessonPhase[];

  /**
   * 지난 차시 복습 화면을 만들어 둔 것 (없으면 null).
   *
   * 먼저 들어온 학생 한 명이 만들고 나머지는 그대로 받는다. 28명이 각자 지난 차시
   * 기록을 뒤지면 수업 한 번에 읽기가 2천 건이다. 자세한 사정은 review.ts 참조.
   */
  reviewCache?: unknown;
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

  /*
   * 이탈(집중 확인) 누적치.
   *
   * 별도 컬렉션을 만들지 않고 출석 문서에 얹는다. 대시보드 폴링은 이미 28명의 출석
   * 문서를 매회 읽으므로, 여기 얹으면 **읽기 증가가 정확히 0건**이다. 따로 두면
   * 폴링마다 28건이 더 붙어 D2(읽기량)를 정면으로 악화시킨다.
   *
   * 대가로 "몇 시 몇 분에 나갔는지" 목록은 남지 않는다. 이 기능의 용도는 "지금 누구를
   * 봐야 하나"이지 행동 로그 축적이 아니다.
   */
  /** 누적 이탈 시간(ms) */
  awayMs?: number;
  /** 10초 이상 에피소드 수 */
  awayCount?: number;
  /** 최장 1회 이탈(ms) */
  longestAwayMs?: number;
  /** 마지막 이탈 시각 */
  lastAwayAt?: number;

  /*
   * 감정 렌즈에서 위기 신호가 걸린 기록 (emotion-lens.ts 의 checkCrisis).
   *
   * 이탈 누적치와 같은 이유로 출석 문서에 얹는다 — 대시보드 폴링이 이미 이 문서를
   * 읽고 있어서 **추가 읽기가 0건**이다. 따로 컬렉션을 두면 폴링마다 22건이 더 붙는다.
   *
   * 여기에는 **시각과 횟수만** 둔다. 학생이 쓴 글은 절대 얹지 않는다 —
   * 원문은 활동지에 그대로 있고, 판단은 그것을 읽은 교사가 한다 (PRD 5.4).
   * 교사 화면에서만 쓴다. 교실 앞 공유 화면(/api/teacher/board)에는 내보내지 않는다.
   */
  /** 마지막으로 위기 신호가 걸린 시각 */
  careAlertAt?: number;
  /** 몇 번 걸렸는지 */
  careAlertCount?: number;

  /*
   * 활동지 진도 (교사 대시보드의 신호등).
   *
   * 이탈·위기 신호와 **같은 이유로 여기에 얹는다.** 대시보드는 5초마다 도는데, 진도를
   * 보려고 활동지 문서를 함께 읽으면 28명 × 12회/분 = 시간당 2만 건이라 하루 무료
   * 한도(5만)를 한 교시 반 만에 쓴다. 출석 문서는 이미 읽고 있어서 추가 읽기가 0건이다.
   *
   * **답 내용은 얹지 않는다. 채운 칸의 열쇠만 둔다.** 진도를 세는 데는 그것으로 충분하고,
   * 학생이 쓴 글이 대시보드 응답에 실려 나갈 이유가 없다.
   *
   * 비율이 아니라 열쇠 목록인 것이 중요하다. 교사가 단계를 넘기면 "지금까지 요구하는 칸"
   * 이 늘어나는데, 비율을 저장해 두면 그 뒤로 아무것도 안 한 학생이 옛 비율 그대로
   * 초록에 남는다 — 정작 가 봐야 할 학생이 안 보인다. 목록으로 두면 대시보드가 그때그때
   * 지금 단계 기준으로 다시 센다.
   */
  /** 활동지에서 실제로 채운 칸의 열쇠 */
  answeredKeys?: string[];
  /** 그린 획 수. 그리기 단계의 진도를 이것으로 본다 */
  strokeCount?: number;
  /** 마지막으로 활동지·그림에 손댄 시각. 진행률이 낮아도 지금 쓰는 중인지 가른다 */
  workedAt?: number;
}

/**
 * 이탈을 세지 않는 단계.
 *
 * 수업 구조상 화면을 안 보는 게 정상인 구간이 있다. 여기서 세면 오탐이 데이터를 오염시킨다.
 *  · video   — 학생은 전자칠판을 보라고 안내받는다. 태블릿 화면이 저절로 꺼진다
 *  · waiting — 수업 시작 전. 도착 시각이 5분씩 벌어지는 구간이다
 *  · done    — 정리·반납 구간
 */
export const FOCUS_EXEMPT_PHASES: readonly LessonPhase[] = ["waiting", "video", "done"];

/**
 * 이 단계에서 이탈을 세는가.
 *
 * 차시마다 사정이 다르다. 4차시는 "진도 안내" 칸을 AI 관상 체험에 쓰는데, 그 체험은
 * 새 창에서 카메라를 켠다 — 화면을 벗어나는 것이 활동 그 자체다. 세면 안 된다.
 * 그래서 차시별로 제외 단계를 더 얹을 수 있게 열어 둔다.
 */
export function countsFocus(phase: LessonPhase, extraExempt?: readonly LessonPhase[]): boolean {
  if (FOCUS_EXEMPT_PHASES.includes(phase)) return false;
  return !(extraExempt ?? []).includes(phase);
}

/**
 * 10초 미만은 기록하지 않는다.
 *
 * 알림 확인, 실수로 누른 탭 전환이 대부분이다. 이것까지 세면 화면이 의미 없는 숫자로
 * 가득 차서 정작 봐야 할 학생이 묻힌다.
 */
export const AWAY_MIN_MS = 10_000;

/**
 * 대시보드에서 노란 배경으로 표시할 기준.
 *
 * 첫 2주 운영 후 실측으로 보정한다. 셋 중 하나만 넘어도 표시한다 — 오래 한 번 나간 것과
 * 짧게 여러 번 나간 것은 다른 신호지만 둘 다 돌아볼 이유가 된다.
 */
export const AWAY_ALERT = {
  totalMs: 3 * 60_000,
  count: 5,
  longestMs: 2 * 60_000,
} as const;

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
  /** "이 그림에 쓰인 기술이 뭘까?" — 맞히기 */
  foundTech: string;
  /** "궁금한 점 하나" */
  question: string;
  /** 작품 주인의 한 줄 응답 */
  authorReply: string;
  /**
   * 이모지 반응. 글을 안 써도 표현할 수 있게 (PRD 3.5 — 반응은 열되 서열화는 피한다).
   *
   * 여러 개를 함께 누를 수 있다. 하나만 고르게 하면 "놀랐고 아이디어도 좋다"를 표현할 수
   * 없어서, 학생은 결국 아무 것이나 하나 누르고 만다.
   */
  reactions?: string[];
  /** @deprecated 하나만 누를 수 있던 때의 값. 읽을 때 reactions 로 옮겨 본다 */
  reaction?: string;
  createdAt: number;
  updatedAt: number;
}

/** 교사가 쓴 피드백의 작성자 자리 값 */
export const TEACHER_AUTHOR_ID = "teacher";

/**
 * 고를 수 있는 이모지 반응.
 *
 * 넷으로 제한한다. 종류를 늘리면 "좋아요 수"가 되어 잘 그린 순위가 생기고,
 * 그림 못 그린다고 생각하는 학생이 손을 놓는다 (PRD 9장 — 서열화는 피한다).
 * 그래서 부러움·놀람·응원처럼 방향이 다른 것만 남겼다.
 */
export const REACTIONS = ["👍", "😮", "💡", "❤️"] as const;
export type Reaction = (typeof REACTIONS)[number];

export function isReaction(value: string): value is Reaction {
  return (REACTIONS as readonly string[]).includes(value);
}

/**
 * 저장된 반응을 배열로 꺼낸다.
 *
 * 처음에는 하나만 누를 수 있어서 `reaction` 문자열로 저장했다. 그 시절 문서가 남아 있으므로
 * 읽을 때 두 형태를 모두 받는다. 목록에 없는 이모지는 버린다.
 */
export function reactionsOf(row: { reactions?: string[]; reaction?: string }): Reaction[] {
  const raw = row.reactions ?? (row.reaction ? [row.reaction] : []);
  return [...new Set(raw.filter(isReaction))];
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
