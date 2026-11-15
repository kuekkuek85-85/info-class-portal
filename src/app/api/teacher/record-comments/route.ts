import { fail, guard, ok, readJson } from "@/lib/api";
import {
  listAllSessions,
  listRecordComments,
  listRoster,
  listStudents,
  saveRecordComment,
} from "@/lib/db";
import { generateComment, gatherRecordsForStudents } from "@/lib/record-comment";
import {
  getSubjectScope,
  SUBJECT_SCOPES,
  sessionInScope,
  type SubjectScope,
} from "@/lib/record-comment-core";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import type { ClassNo, RecordComment } from "@/lib/types";

/**
 * 생기부 세특 초안 (교사 전용).
 *
 *   GET  ?round=1                → 과목별 명단 + 저장된 초안 (성찰·활동 기록은 읽지 않는다)
 *   POST {action:"generate"}     → 선택한 학생들의 초안을 만들어 recordComments 에 저장
 *   POST {action:"save"}         → 교사가 손본 문구 저장
 *
 * 쓰기는 recordComments 컬렉션뿐이다. 성찰·활동지는 읽기만 한다.
 */

/** 일괄 생성은 학생 수에 따라 80~180초쯤 걸린다 (Gemini 호출 × 학생 수) */
export const maxDuration = 300;

/** 한 번에 Gemini 를 부르는 학생 수 */
const CONCURRENCY = 4;
/** 한 요청에서 만들 수 있는 학생 수 상한 (과목 하나 = 한 반 정도) */
const MAX_GENERATE = 60;
/** 저장 문구 길이 상한. 생성 문구는 200자 안팎이라 넉넉하다 */
const MAX_TEXT = 1000;

type RowStatus = "none" | "draft" | "edited";

interface Row {
  subjectKey: string;
  subjectLabel: string;
  classNo: number;
  groupKey?: string;
  studentId: string;
  name: string;
  text: string;
  status: RowStatus;
}

interface RosterEntry {
  studentId: string;
  name: string;
  classNo: ClassNo;
  groupKey?: string;
}

/** 과목의 명단. 정보는 그 반 전체, 선택과목은 분반 수강 명단의 합집합 */
async function rosterOf(scope: SubjectScope): Promise<RosterEntry[]> {
  if (scope.kind === "info") {
    const students = await listStudents(scope.classNo!);
    return students.map((s) => ({ studentId: s.studentId, name: s.name, classNo: s.classNo }));
  }

  // groupKey 경로는 classNo 를 무시한다 (수강 명단으로 찾음)
  const perGroup = await Promise.all(
    (scope.groupKeys ?? []).map(async (groupKey) => ({
      groupKey,
      students: await listRoster({ classNo: 1 as ClassNo, groupKey }),
    })),
  );
  const byId = new Map<string, RosterEntry>();
  for (const { groupKey, students } of perGroup) {
    for (const s of students) {
      if (byId.has(s.studentId)) continue;
      byId.set(s.studentId, { studentId: s.studentId, name: s.name, classNo: s.classNo, groupKey });
    }
  }
  return [...byId.values()].sort((a, b) => a.studentId.localeCompare(b.studentId));
}

function parseRound(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return "1";
  const round = String(value).trim();
  return /^[0-9A-Za-z_-]{1,10}$/.test(round) ? round : null;
}

/** 저장 입력. groupKey 는 있을 때만 넣는다 (Firestore 는 undefined 값을 거부한다) */
function commentInput(
  round: string,
  subjectKey: string,
  entry: RosterEntry,
  text: string,
  status: "draft" | "edited",
  source?: "ai" | "fallback",
): Omit<RecordComment, "id" | "updatedAt"> {
  return {
    round,
    subjectKey,
    studentId: entry.studentId,
    classNo: entry.classNo,
    ...(entry.groupKey ? { groupKey: entry.groupKey } : {}),
    text,
    status,
    ...(source ? { source } : {}),
  };
}

export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const round = parseRound(new URL(request.url).searchParams.get("round"));
    if (round === null) return fail("invalid_input", "round 형식이 올바르지 않습니다.");

    // 명단 + 저장분만 읽는다. 성찰·활동지는 생성할 때만 읽는다 (읽기 예산)
    const [saved, rosters] = await Promise.all([
      listRecordComments(round),
      Promise.all(SUBJECT_SCOPES.map((scope) => rosterOf(scope))),
    ]);
    const savedByKey = new Map(saved.map((c) => [`${c.subjectKey}__${c.studentId}`, c]));

    const rows: Row[] = [];
    SUBJECT_SCOPES.forEach((scope, i) => {
      for (const entry of rosters[i]) {
        const hit = savedByKey.get(`${scope.subjectKey}__${entry.studentId}`);
        rows.push({
          subjectKey: scope.subjectKey,
          subjectLabel: scope.label,
          classNo: entry.classNo,
          ...(entry.groupKey ? { groupKey: entry.groupKey } : {}),
          studentId: entry.studentId,
          name: entry.name,
          text: hit?.text ?? "",
          status: hit ? hit.status : "none",
        });
      }
    });

    return ok({ rows });
  });
}

interface PostBody {
  action?: unknown;
  round?: unknown;
  subjectKey?: unknown;
  studentIds?: unknown;
  studentId?: unknown;
  text?: unknown;
}

export async function POST(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<PostBody>(request);
    if (!body || typeof body !== "object") return fail("invalid_input", "요청 본문이 올바르지 않습니다.");

    const round = parseRound(body.round);
    if (round === null) return fail("invalid_input", "round 형식이 올바르지 않습니다.");

    if (body.action !== "generate" && body.action !== "save") {
      return fail("invalid_input", "action 은 generate | save 중 하나입니다.");
    }

    const scope = typeof body.subjectKey === "string" ? getSubjectScope(body.subjectKey) : undefined;
    if (!scope) return fail("invalid_input", "알 수 없는 과목입니다.");

    const roster = await rosterOf(scope);
    const rosterById = new Map(roster.map((e) => [e.studentId, e]));

    if (body.action === "save") {
      const studentId = typeof body.studentId === "string" ? body.studentId : "";
      const entry = rosterById.get(studentId);
      if (!entry) return fail("invalid_input", "이 과목 명단에 없는 학생입니다.");
      if (typeof body.text !== "string") return fail("invalid_input", "text 가 필요합니다.");

      const text = body.text.trim().slice(0, MAX_TEXT);
      await saveRecordComment(commentInput(round, scope.subjectKey, entry, text, "edited"));
      return ok();
    }

    // --- generate
    if (!Array.isArray(body.studentIds) || body.studentIds.some((id) => typeof id !== "string")) {
      return fail("invalid_input", "studentIds 는 학번 문자열 배열이어야 합니다.");
    }
    // 명단에 있는 학생만 (중복 제거). 명단 밖 학번은 조용히 건너뛴다
    const targets = [...new Set(body.studentIds as string[])]
      .map((id) => rosterById.get(id))
      .filter((e): e is RosterEntry => !!e);
    if (targets.length === 0) return fail("invalid_input", "만들 학생이 없습니다.");
    if (targets.length > MAX_GENERATE) {
      return fail("invalid_input", `한 번에 ${MAX_GENERATE}명까지 만들 수 있습니다.`);
    }

    // 세션당 한 번만 읽어 학생별로 나눈다
    const all = await listAllSessions();
    const inScope = all.filter((s) => sessionInScope(s, scope));
    const recordsByStudent = await gatherRecordsForStudents(
      scope,
      targets.map((e) => e.studentId),
      inScope,
    );

    type Result = {
      studentId: string;
      text: string;
      source: "ai" | "fallback";
      status: "draft" | "none";
      /** 자료부족 = 쓸 기록이 없음, 오류 = 이 학생만 만들다 실패 (다시 시도) */
      note?: "자료부족" | "오류";
    };

    const one = async (entry: RosterEntry): Promise<Result> => {
      const records = recordsByStudent.get(entry.studentId) ?? [];
      const { text, source } = await generateComment(scope, records);
      // 빈 문구는 저장하지 않는다 — 빈 초안이 교사의 기존 글을 덮지 않게.
      // 기록이 있는데 비었다면 AI 호출 실패(시간 초과·네트워크 등)이므로 "오류"로 알린다
      if (text === "") {
        const hadData = records.some((r) => r.written);
        return {
          studentId: entry.studentId,
          text,
          source,
          status: "none",
          note: hadData ? "오류" : "자료부족",
        };
      }
      await saveRecordComment(commentInput(round, scope.subjectKey, entry, text, "draft", source));
      return { studentId: entry.studentId, text, source, status: "draft" };
    };

    const results: Result[] = [];
    for (let i = 0; i < targets.length; i += CONCURRENCY) {
      const batch = targets.slice(i, i + CONCURRENCY);
      // 한 학생이 실패해도 나머지는 계속한다 (부분 성공)
      const settled = await Promise.allSettled(batch.map(one));
      settled.forEach((r, j) => {
        if (r.status === "fulfilled") {
          results.push(r.value);
        } else {
          console.error("[record-comments]", r.reason instanceof Error ? r.reason.message : r.reason);
          results.push({
            studentId: batch[j].studentId,
            text: "",
            source: "fallback",
            status: "none",
            note: "오류",
          });
        }
      });
    }

    return ok({ results });
  });
}
