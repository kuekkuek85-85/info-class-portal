/**
 * 활동·분반·차시번호로 "무슨 과목인가" 를 알아낸다.
 *
 * 이 저장소 하나가 네 과목을 담는다. 과목을 가르는 표시가 데이터에 흩어져 있다 —
 * 활동 통 이름(activityId), 분반 열쇠(groupKey), 차시 번호(lessonNo)가 각각 단서다.
 * 챗봇이 "이건 어느 과목 자료다" 를 말하려면 한곳에서 판정해야 한다.
 *
 * 순수 로직이라 서버·테스트 어디서나 부른다.
 */

export type CourseKey = "informatics" | "mind-talk" | "human-ai" | "heart-robot";

export interface Course {
  key: CourseKey;
  /** 사람이 읽는 이름 */
  label: string;
}

export const COURSES: Record<CourseKey, Course> = {
  "informatics": { key: "informatics", label: "정보" },
  "mind-talk": { key: "mind-talk", label: "디지털 마음 톡톡" },
  "human-ai": { key: "human-ai", label: "인간과 인공지능" },
  "heart-robot": { key: "heart-robot", label: "하트아이로봇" },
};

/**
 * 단서 하나로 과목을 고른다. 아무것도 안 맞으면 정보로 본다 —
 * 정보과가 반(1~4)으로 열리고 활동 이름에 접두어가 없어서, 나머지가 다 걸러진 뒤 남는 것이 정보다.
 */
export function courseOf(input: { activityId?: string; groupKey?: string; lessonNo?: number }): Course {
  const a = input.activityId ?? "";
  const g = input.groupKey ?? "";
  if (a.startsWith("hai-") || g.startsWith("hai-")) return COURSES["human-ai"];
  if (a.startsWith("mt-") || g.startsWith("mt-")) return COURSES["mind-talk"];
  if (a.startsWith("heart-") || g.startsWith("heart-")) return COURSES["heart-robot"];
  // 차시 번호대로도 가른다 (100번대 인간과AI, 200번대 마음톡톡). 활동·분반이 없을 때의 보조 단서.
  const n = input.lessonNo ?? 0;
  if (n >= 100 && n < 200) return COURSES["human-ai"];
  if (n >= 200 && n < 300) return COURSES["mind-talk"];
  return COURSES["informatics"];
}

/** 과목 이름(또는 키)으로 CourseKey 를 찾는다. 챗봇이 "인간과 인공지능" 같은 말로 물을 때. */
export function courseKeyFromText(text: string): CourseKey | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  for (const course of Object.values(COURSES)) {
    if (course.key === t) return course.key;
    if (t.includes(course.label) || course.label.includes(t)) return course.key;
  }
  // 흔한 별칭
  if (t.includes("마음") || t.includes("톡톡") || t.includes("감정")) return "mind-talk";
  if (t.includes("인공지능") || t.includes("ai") || t.includes("진로")) return "human-ai";
  if (t.includes("로봇") || t.includes("동아리") || t.includes("하트")) return "heart-robot";
  if (t.includes("정보")) return "informatics";
  return null;
}
