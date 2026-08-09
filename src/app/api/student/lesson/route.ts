import { fail, guard, ok } from "@/lib/api";
import { toEmbedUrl } from "@/lib/embed";
import {
  getMoodEntry,
  getReflection,
  getSession,
  isSessionClosed,
  listReflections,
  studentNameMap,
} from "@/lib/db";
import { readStudentSession } from "@/lib/session";
import { answersOf, hasAnswer, type PhaseContent } from "@/lib/types";

/**
 * 오늘 그 교시 수업 화면에 필요한 것 전부를 한 번에 내려준다.
 *
 * 30분 수업에서 요청을 나누면 그만큼 로딩이 늘어난다. 28명 동시 접속을 감안해 왕복을 줄인다.
 * 단계 전환만 따로 /api/student/phase 로 가볍게 확인한다.
 *
 * 내용은 세션에 복사된 스냅샷을 쓴다 — 교사가 다음 반을 위해 차시 계획을 고쳐도 이미 진행 중인
 * 수업의 내용은 바뀌지 않는다 (PRD 5.1).
 */

function present(content: PhaseContent | undefined) {
  return {
    heading: content?.heading ?? "",
    body: content?.body ?? "",
    url: content?.url ? toEmbedUrl(content.url) : "",
  };
}

export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const questions = session.reflectionQuestions ?? [];

    const [mood, reflection] = await Promise.all([
      getMoodEntry(session.id, me.studentId),
      getReflection(session.id, me.studentId),
    ]);

    // 다른 학생 글 공개는 차시별 교사 설정. 기본값은 비공개 (PRD 3.4)
    let peers: { name: string; answers: string[] }[] = [];
    if (session.reflectionPublic) {
      const rows = (await listReflections(session.id)).filter(
        // 제출한 글만 보여준다. draft 는 아직 쓰는 중인 자동 임시저장본이라,
        // 고치다 만 문장이 실명과 함께 반 전체에 뜨면 안 된다.
        (row) => !row.draft && hasAnswer(row) && row.studentId !== me.studentId,
      );
      const names = await studentNameMap(rows.map((row) => row.studentId));
      peers = rows.map((row) => ({
        name: names.get(row.studentId)?.name || "친구",
        answers: answersOf(row),
      }));
    }

    return ok({
      me: { studentId: me.studentId, name: me.name, classNo: me.classNo },
      session: {
        id: session.id,
        phase: session.phase,
        closed: isSessionClosed(session),
        lessonNo: session.lessonNo,
        title: session.title,
        moodCheckEnabled: session.moodCheckEnabled,
        progress: present(session.progress),
        assessment: present(session.assessment),
        video: present(session.video),
        reflectionQuestions: questions,
        reflectionPublic: session.reflectionPublic,
        date: session.date,
        period: session.period,
        classNo: session.classNo,
      },
      mood: mood ? { mood: mood.mood, reason: mood.reason } : null,
      reflection: reflection
        ? { answers: answersOf(reflection), draft: reflection.draft }
        : null,
      peers,
    });
  });
}
