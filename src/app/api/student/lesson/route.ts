import { fail, guard, ok } from "@/lib/api";
import {
  getMoodEntry,
  getReflection,
  getSession,
  listReflections,
  studentNameMap,
} from "@/lib/db";
import { readStudentSession } from "@/lib/session";

/**
 * 오늘 그 교시 수업 화면에 필요한 것 전부를 한 번에 내려준다.
 *
 * 30분 수업에서 요청을 나누면 그만큼 로딩이 늘어난다. 28명 동시 접속을 감안해 왕복을 줄인다.
 * 슬라이드 URL·성찰 질문은 세션에 복사된 스냅샷을 쓴다 — 교사가 다음 반을 위해 차시 계획을
 * 고쳐도 이미 진행 중인 수업의 내용은 바뀌지 않는다 (PRD 5.1).
 */
export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const [mood, reflection] = await Promise.all([
      getMoodEntry(session.id, me.studentId),
      getReflection(session.id, me.studentId),
    ]);

    // 다른 학생 글 공개는 차시별 교사 설정. 기본값은 비공개 (PRD 3.4)
    let peers: { name: string; content: string }[] = [];
    if (session.reflectionPublic) {
      const rows = (await listReflections(session.id)).filter(
        // 제출한 글만 보여준다. draft는 아직 쓰는 중인 자동 임시저장본이라,
        // 고치다 만 문장이 실명과 함께 반 전체에 뜨면 안 된다.
        (row) => !row.draft && row.content.trim() && row.studentId !== me.studentId,
      );
      const names = await studentNameMap(rows.map((row) => row.studentId));
      peers = rows.map((row) => ({
        name: names.get(row.studentId)?.name || "친구",
        content: row.content,
      }));
    }

    return ok({
      me: { studentId: me.studentId, name: me.name, classNo: me.classNo },
      session: {
        id: session.id,
        // 교사가 수업을 종료하면 더 이상 쓸 수 없다. 화면을 튕겨내지는 않는다 —
        // 자기가 쓴 것은 계속 볼 수 있어야 하고, 갑자기 첫 화면으로 돌아가면 학생이 당황한다.
        closed: session.status === "ended",
        lessonNo: session.lessonNo,
        title: session.title,
        slideUrl: session.slideUrl,
        reflectionQuestion: session.reflectionQuestion,
        moodCheckEnabled: session.moodCheckEnabled,
        reflectionPublic: session.reflectionPublic,
        date: session.date,
        period: session.period,
        classNo: session.classNo,
      },
      mood: mood ? { mood: mood.mood, reason: mood.reason } : null,
      reflection: reflection ? { content: reflection.content, draft: reflection.draft } : null,
      peers,
    });
  });
}
