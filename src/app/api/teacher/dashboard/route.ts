import { readQuotaSummary } from "@/lib/ai-quota";
import { fail, guard, ok } from "@/lib/api";
import { todayKST, isDateKey } from "@/lib/datetime";
import {
  getSession,
  listAttendance,
  listMoodEntries,
  listReflections,
  listSessionsByDate,
  listRoster,
} from "@/lib/db";
import { getMood } from "@/lib/mood";
import { pickCurrentSession } from "@/lib/pick-session";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import { LESSON_PHASES, answersOf, hasAnswer } from "@/lib/types";
import type { ClassSession, LessonPhase } from "@/lib/types";

/**
 * 지금 단계까지 학생이 채웠어야 하는 활동지 칸.
 *
 * 교사가 단계를 넘길 때마다 늘어난다. 진행률의 분모다.
 *
 * 밑줄로 시작하는 열쇠(안내문)와 답할 것이 없는 종류는 뺀다 — 세면 아무도 100% 가
 * 못 되고, 그러면 초록이 영영 안 나온다.
 */
const NO_ANSWER = new Set(["note", "echo", "ai_review"]);

function requiredKeys(session: ClassSession): string[] {
  const now = LESSON_PHASES.indexOf(session.phase);
  return (session.activity?.worksheet ?? [])
    .filter((q) => {
      if (q.key.startsWith("_") || NO_ANSWER.has(q.kind)) return false;
      const phase = (q.phase ?? "worksheet") as LessonPhase;
      const at = LESSON_PHASES.indexOf(phase);
      // 아직 안 지나온 단계의 칸은 요구하지 않는다
      return at >= 0 && at <= now;
    })
    .map((q) => q.key);
}

/**
 * 지금 단계까지 그림을 그렸어야 하는가.
 *
 * 그리기 단계는 칸이 아니라 획으로 잰다. 획이 하나라도 있으면 한 칸을 채운 것으로 친다 —
 * 몇 개를 그려야 한다는 기준은 둘 수 없다. 잘 그리는 것을 재는 것이 아니라 손을 댔는지를
 * 보는 것이다.
 */
function drawingCounts(session: ClassSession): boolean {
  const now = LESSON_PHASES.indexOf(session.phase);
  const draw = LESSON_PHASES.indexOf("draw");
  return (session.activity?.places?.length ?? 0) > 0 && draw >= 0 && draw <= now;
}

/**
 * 진행률을 신호등 다섯 칸으로 나눈다. 교사가 봐야 할 것은 red 와 orange 다.
 *
 * 초록은 **다 끝낸** 학생만이다. 0.8 이상으로 잡았더니 다섯 칸 중 넷을 쓴 학생이
 * 초록에 들어갔다 — 아직 한 칸이 남았는데 다 한 것으로 보이면 접어 둔 묶음에 숨는다.
 */
function bucketOf(ratio: number): "red" | "orange" | "yellow" | "lime" | "green" {
  if (ratio >= 1) return "green";
  if (ratio >= 0.6) return "lime";
  if (ratio >= 0.4) return "yellow";
  if (ratio >= 0.2) return "orange";
  return "red";
}

/**
 * 교사 대시보드 — 출석·감정 개별 응답·성찰을 이름과 함께 본다.
 *
 * 교실 앞 화면에 띄우는 공유용 집계는 /api/teacher/board 로 완전히 분리했다.
 * 이름과 이유가 응답에 실리는 곳은 이 엔드포인트뿐이다 (PRD 3.3).
 */
export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const params = new URL(request.url).searchParams;
    const sessionId = params.get("sessionId");
    const dateParam = params.get("date");
    const date = isDateKey(dateParam) ? dateParam : todayKST();

    const sessions = await listSessionsByDate(date);

    /*
     * 교사가 고르지 않았으면 "지금 하는 수업"을 서버가 잡아 준다.
     *
     * 첫 수업을 기본값으로 두면 3교시에 화면을 열었을 때 2교시 반의 감정·성찰이 뜬다.
     * 교실 앞 공유 화면까지 같은 값을 쓰므로, 다른 반 학생의 기록이 노출되는 문제가 된다.
     */
    const target = sessionId ?? pickCurrentSession(sessions)?.id;
    if (!target) {
      return ok({ date, sessions, session: null });
    }

    const session = await getSession(target);
    if (!session) return fail("not_found");

    const [attendance, moods, reflections, roster] = await Promise.all([
      listAttendance(session.id),
      listMoodEntries(session.id),
      listReflections(session.id),
      // 분반 수업은 반이 아니라 수강 명단을 본다 (여러 반에서 모여 앉는다)
      listRoster(session),
    ]);

    const nameOf = new Map(roster.map((s) => [s.studentId, s.name]));
    const joined = new Set(attendance.map((a) => a.studentId));
    const moodByStudent = new Map(moods.map((m) => [m.studentId, m]));
    const reflectionByStudent = new Map(reflections.map((r) => [r.studentId, r]));

    // 명렬표에 있으나 아직 안 들어온 학생 — 출석 확인용
    const missing = roster
      .filter((s) => !s.temporary && !joined.has(s.studentId))
      .map((s) => ({ studentId: s.studentId, name: s.name }));

    /*
     * 진도 — 신호등.
     *
     * 출석 문서에 얹혀 온 값으로만 센다 (Attendance 의 answeredKeys). 활동지를 따로
     * 읽지 않으므로 **추가 읽기가 0건**이다.
     */
    const required = requiredKeys(session);
    const needsDrawing = drawingCounts(session);
    const total = required.length + (needsDrawing ? 1 : 0);

    /*
     * 자기 점검의 "괜찮다" 보기 (7차시 수행평가).
     *
     * 첫 보기를 그대로 읽어 온다. 문구를 여기 적어 두면 차시가 말을 바꿀 때마다
     * 대기 줄 순서가 조용히 틀어진다 — 화면에는 아무 표시가 안 나므로 알아채기도 어렵다.
     */
    const selfCheckOk =
      (session.activity?.worksheet ?? []).find((q) => q.key === "news_check2")?.choices?.[0] ?? "";

    const rows = attendance.map((entry) => {
      const mood = moodByStudent.get(entry.studentId);
      const reflection = reflectionByStudent.get(entry.studentId);

      const answered = new Set(entry.answeredKeys ?? []);
      const doneKeys = required.filter((key) => answered.has(key)).length;
      const drew = needsDrawing && (entry.strokeCount ?? 0) > 0 ? 1 : 0;
      const done = doneKeys + drew;
      /*
       * 요구하는 칸이 없는 단계(대기·기분·영상)에서는 진행률을 재지 않는다.
       * 0/0 을 0% 로 두면 모두가 빨강이 되어 신호등이 의미를 잃는다.
       */
      const ratio = total > 0 ? done / total : null;

      return {
        studentId: entry.studentId,
        name: nameOf.get(entry.studentId) ?? "",
        /** 이름을 가릴 때 대신 보여줄 자리 — 교사는 출석부로 바로 찾을 수 있어야 한다 */
        number: roster.find((s) => s.studentId === entry.studentId)?.number ?? null,
        temporary: !nameOf.get(entry.studentId),
        joinedAt: entry.joinedAt,
        work: {
          done,
          total,
          bucket: ratio === null ? null : bucketOf(ratio),
          /*
           * 손을 놓은 지 얼마나 됐는지. 낮은 진도라도 지금 쓰는 중인지 가른다.
           *
           * 시각이 아니라 **경과 시간**으로 보내는 이유는 둘이다. 교사 화면이 렌더 중에
           * Date.now() 를 부르면 안 되고(순수하지 않다), 태블릿 시계가 서버와 몇 분씩
           * 어긋나 있어도 여기서 재면 맞는다. 대시보드가 5초마다 다시 물으므로 값도 신선하다.
           */
          idleMs: entry.workedAt ? Date.now() - entry.workedAt : null,
        },
        /*
         * 수행평가 제출 단계와 교사 검토 대기 (7차시).
         *
         * 이탈 누적치와 같이 출석 문서에 얹혀 있어 **추가 읽기가 없다**. 기사 본문은
         * 여기 싣지 않는다 — 교사가 그 학생을 누를 때만 artifact 를 1건 읽는다.
         */
        stage: entry.submitStage ?? 0,
        /** 2차를 냈고 아직 피드백을 안 준 학생만 대기 줄에 선다 */
        waiting: (entry.submitStage ?? 0) === 2 && !(entry.reviewedAt ?? 0),
        /** 자기 점검 답. 교사 화면에 그대로 보여 준다 */
        selfCheck: entry.selfCheck ?? "",
        /**
         * 스스로 걸린다고 한 학생인가. 대기 줄 **순서**를 정한다.
         *
         * 첫 보기("다 들어 있다")가 아닌 것을 고르면 앞에 선다. 문구로 맞히지 않고
         * **보기의 자리로** 가린다 — 차시가 문구를 고쳐도 여기가 안 깨진다.
         *
         * 아무것도 안 고른 학생은 뒤로 보낸다. 급하다는 신호가 없다.
         */
        selfCheckWeak: Boolean(entry.selfCheck) && entry.selfCheck !== selfCheckOk,
        /*
         * 이탈 누적치. 출석 문서에 얹혀 있어 **추가 읽기가 없다**.
         * 이 화면에서만 쓴다 — /api/teacher/board(교실 앞 공유 화면)에는 절대 내보내지
         * 않는다. 개인별 이탈 표시는 공개 망신이 된다.
         */
        away: {
          ms: entry.awayMs ?? 0,
          count: entry.awayCount ?? 0,
          longestMs: entry.longestAwayMs ?? 0,
        },
        /*
         * 감정 렌즈에서 위기 신호가 걸린 학생. 출석 문서에 얹혀 있어 추가 읽기가 없다.
         * 이탈과 마찬가지로 이 화면에서만 쓴다 — 교실 앞 공유 화면에는 절대 안 나간다.
         */
        careAlert: entry.careAlertAt
          ? { at: entry.careAlertAt, count: entry.careAlertCount ?? 1 }
          : null,
        mood: mood
          ? {
              key: mood.mood,
              label: getMood(mood.mood)?.label ?? mood.mood,
              quadrant: getMood(mood.mood)?.quadrant ?? null,
              reason: mood.reason,
              reviewed: mood.reviewedByTeacher,
            }
          : null,
        reflection: reflection
          ? {
              answers: answersOf(reflection),
              draft: reflection.draft,
              updatedAt: reflection.updatedAt,
            }
          : null,
      };
    });

    // PRD 5.4 — 받아두고 보지 않는 상태가 가장 위험하다. 미확인 개수를 항상 노출한다.
    const unreviewed = moods.filter((m) => m.reason.trim() && !m.reviewedByTeacher).length;

    /*
     * AI 검토가 있는 차시에서만 한 문서를 더 읽는다.
     *
     * 이 화면은 20초마다 돈다. 로그 컬렉션을 훑는 질의를 붙이면 읽기 수가 그대로
     * 곱해지므로 (PRD 10장 D2), 집계를 상한 카운터 문서에 얹어 두고 그 하나만 읽는다.
     * AI 검토가 없는 차시에서는 이 읽기조차 하지 않는다 — 정보과 1~7차시가 그렇다.
     */
    const hasAiReview = (session.activity?.worksheet ?? []).some((q) => q.kind === "ai_review");
    const aiQuota = hasAiReview ? await readQuotaSummary(session.id).catch(() => null) : null;

    return ok({
      date,
      sessions,
      session,
      rows,
      missing,
      /**
       * 오늘 AI 가 실제로 돌았는가.
       *
       * 학생 화면은 AI 질문과 고정 질문을 구분해 주지 않으므로 (그래야 수업이 안 멈춘다),
       * 교사가 그것을 알 수 있는 곳이 여기뿐이다. 폴백이 절반을 넘으면 AI 를 접고
       * 다른 방법으로 넘어가는 판단을 3분 안에 내려야 한다.
       */
      aiQuota,
      stats: {
        rosterCount: roster.filter((s) => !s.temporary).length,
        joinedCount: attendance.length,
        moodCount: moods.length,
        reflectionCount: reflections.filter((r) => hasAnswer(r)).length,
        unreviewed,
      },
    });
  });
}
