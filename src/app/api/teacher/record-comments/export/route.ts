import { fail, guard } from "@/lib/api";
import { listRecordComments, studentNameMap } from "@/lib/db";
import { getSubjectScope, recordCommentsCsv, SUBJECT_SCOPES } from "@/lib/record-comment-core";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";

/**
 * 세특 초안 CSV 내보내기 (교사 전용). 저장된 초안만 읽는다.
 *
 *   GET ?round=1&subjectKey=all        → 그 회차 전체
 *   GET ?round=1&subjectKey=info-2     → 한 과목만
 */
export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const params = new URL(request.url).searchParams;
    const round = (params.get("round") ?? "1").trim() || "1";
    if (!/^[0-9A-Za-z_-]{1,10}$/.test(round)) {
      return fail("invalid_input", "round 형식이 올바르지 않습니다.");
    }
    const subjectKey = params.get("subjectKey") ?? "all";
    if (subjectKey !== "all" && !getSubjectScope(subjectKey)) {
      return fail("invalid_input", "알 수 없는 과목입니다.");
    }

    const saved = (await listRecordComments(round))
      // 빈 문구는 내보낼 게 없다
      .filter((c) => c.text.trim() !== "")
      .filter((c) => subjectKey === "all" || c.subjectKey === subjectKey);
    const names = await studentNameMap(saved.map((c) => c.studentId));

    // 과목 순서(SUBJECT_SCOPES) → 학번 순. 모르는 과목 열쇠는 뒤로
    const order = (key: string) => {
      const i = SUBJECT_SCOPES.findIndex((s) => s.subjectKey === key);
      return i === -1 ? 99 : i;
    };
    saved.sort(
      (a, b) => order(a.subjectKey) - order(b.subjectKey) || a.studentId.localeCompare(b.studentId),
    );

    const csv = recordCommentsCsv(
      saved.map((c) => {
        const label = getSubjectScope(c.subjectKey)?.label ?? c.subjectKey;
        return {
          subject: label,
          group: c.groupKey ? label : `${c.classNo}반`,
          studentId: c.studentId,
          name: names.get(c.studentId)?.name ?? "",
          text: c.text,
        };
      }),
    );

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="record-comments.csv"',
        "Cache-Control": "no-store",
      },
    });
  });
}
