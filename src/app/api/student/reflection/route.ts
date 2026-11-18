import { fail, guard, ok, readJson } from "@/lib/api";
import {
  artifactId,
  getArtifactById,
  getSession,
  isSessionClosed,
  updateArtifact,
  upsertReflection,
} from "@/lib/db";
import { activityIdFor } from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";
import type { ClassSession } from "@/lib/types";

const MAX_ANSWER_LENGTH = 1000;
/** reflectionAnswerKey 로 쓸 수 있는 키 모양 - 점(.)이 들어가면 merge 쓰기에서 중첩 경로가 되므로 막는다 */
const ANSWER_KEY_RE = /^[A-Za-z0-9_]{1,64}$/;

/**
 * 세션에 reflectionAnswerKey 가 있으면, 성찰 글을 학번별 공유 답안 문서의 그 키에도 한 벌 저장한다.
 * (다음 차시 활동지가 echoKeys 로 다시 보여 주게 - 32차 성찰을 33차 수행평가 첫 단계에서 쓴다.)
 *
 *  · 답안 문서가 **이미 있을 때만** 쓴다. 빈 문서를 새로 만들면 그림·갤러리 화면이 기대하는 필드가 없다.
 *  · 리허설은 activityIdFor 가 꼬리표를 붙여 진짜 답안 문서와 갈린다.
 *  · 빈 글로는 덮어쓰지 않는다(지우다 만 임시저장이 앞서 낸 답을 날리지 않게).
 *  · 여기서 실패해도 성찰 저장은 이미 끝났다 - 실패를 학생에게 돌려주지 않는다.
 */
async function mirrorToArtifact(session: ClassSession, studentId: string, answers: string[]) {
  const key = session.reflectionAnswerKey;
  if (!key || !ANSWER_KEY_RE.test(key)) return;
  const text = answers.map((a) => a.trim()).filter(Boolean).join("\n");
  if (!text) return;
  const activityId = activityIdFor(session);
  if (!activityId) return;
  const id = artifactId(activityId, studentId);
  try {
    if (!(await getArtifactById(id))) return;
    await updateArtifact(id, { answers: { [key]: text } });
  } catch {
    // 한 벌 저장 실패는 조용히 넘긴다 (성찰 원본은 reflections 에 있다)
  }
}

/**
 * 성찰 저장. 질문마다 답이 따로 있다.
 *
 * `draft: true`는 입력 중 자동 임시저장이다. 30분 수업의 마지막 활동이라 종이 울려
 * 미완성 상태로 태블릿을 반납해도 쓰던 내용이 남아야 한다 (PRD 3.4).
 */
export async function PUT(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const body = await readJson<{ answers?: unknown[]; draft?: boolean }>(request);
    const given = body?.answers;
    if (!Array.isArray(given)) return fail("invalid_input");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");
    // 교시가 끝난 뒤에는 기록을 바꿀 수 없다. 코드 만료와 같은 시점이다 (PRD 8).
    if (isSessionClosed(session)) {
      return fail("session_expired", "수업이 끝나서 저장할 수 없어요.");
    }

    // 질문 수만큼만 받는다. 클라이언트가 보낸 배열 길이를 그대로 믿지 않는다.
    const questionCount = (session.reflectionQuestions ?? []).length;
    const answers = Array.from({ length: questionCount }, (_, index) => {
      const value = given[index];
      return typeof value === "string" ? value.slice(0, MAX_ANSWER_LENGTH) : "";
    });

    const saved = await upsertReflection({
      studentId: me.studentId,
      sessionId: session.id,
      classNo: session.classNo,
      date: session.date,
      answers,
      draft: body?.draft !== false,
    });
    await mirrorToArtifact(session, me.studentId, answers);

    return ok({ draft: saved.draft, updatedAt: saved.updatedAt });
  });
}
