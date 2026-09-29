import { fail, guard, ok, readJson } from "@/lib/api";
import { getSession, listArtifacts, updateSession } from "@/lib/db";
import { activityIdFor } from "@/lib/gallery";
import { compileSchoolRules } from "@/lib/school-rules";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import type { WorksheetQuestion } from "@/lib/types";

/**
 * 교사 트리거 — 「우리 학교 상점/벌점 규칙 만들기」 완성하기 (1회 생성, 재생성 가능).
 *
 * 이 분반 전체 학생의 최종 규칙(rulesSourceKey 칸의 rows)을 모아 Gemini 로 카테고리별로 묶고
 * 중복을 정리한 하나의 표를 만들어, 학급 공용 결과(session.rulesResult)에 저장한다. 교사
 * 대시보드와 모든 학생 화면이 그 값을 읽어 같은 완성 지면을 본다.
 *
 * ## 프라이버시
 *
 * - **이름·학번은 Gemini 에 보내지 않는다.** 규칙 텍스트만 줄로 모아 보낸다(school-rules.ts).
 * - 결과에도 저자가 없다 — 통합 "우리 학교 규칙". 규칙은 저민감 정보다.
 */

/** rows 한 줄을 사람이 읽는 텍스트로 (컬럼 라벨: 값). 이름은 포함하지 않는다. */
function rowToLine(row: Record<string, unknown>, columns: { key: string; label: string }[]): string {
  const parts = columns
    .map((c) => {
      const value = String(row?.[c.key] ?? "").trim();
      return value ? `${c.label}: ${value}` : "";
    })
    .filter(Boolean);
  return parts.join(" / ");
}

export async function POST(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<{ sessionId?: string }>(request);
    const sessionId = (body?.sessionId ?? "").trim();
    if (!sessionId) return fail("invalid_input");

    const session = await getSession(sessionId);
    if (!session) return fail("not_found");

    const worksheet = session.activity?.worksheet ?? [];
    const resultQuestion = worksheet.find(
      (q: WorksheetQuestion) => q.kind === "rules_result",
    );
    const rulesKey = resultQuestion?.rulesSourceKey ?? "";
    const rowsQuestion = worksheet.find(
      (q: WorksheetQuestion) => q.key === rulesKey && q.kind === "rows",
    );
    if (!rulesKey || !rowsQuestion) {
      return fail("invalid_input", "이 수업에는 규칙 rows 문항이 없습니다.");
    }
    const columns = rowsQuestion.rowColumns ?? [];

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");

    const artifacts = await listArtifacts(activityId, session.classNo);

    /*
     * 학생별 규칙 rows 를 텍스트 줄로 편다. **이름·학번은 담지 않는다** — 규칙 텍스트만.
     */
    const ruleLines: string[] = [];
    let contributed = 0;
    for (const artifact of artifacts) {
      const raw = artifact.answers?.[rulesKey];
      if (!raw?.trim()) continue;
      let rows: Record<string, unknown>[];
      try {
        const parsed = JSON.parse(raw);
        rows = Array.isArray(parsed) ? parsed : [];
      } catch {
        continue;
      }
      let any = false;
      for (const row of rows) {
        const line = rowToLine(row, columns);
        if (line) {
          ruleLines.push(line);
          any = true;
        }
      }
      if (any) contributed += 1;
    }

    if (ruleLines.length === 0) {
      return fail("invalid_input", "아직 모을 규칙이 없습니다. 학생들이 규칙을 먼저 적어야 합니다.");
    }

    const table = await compileSchoolRules(ruleLines);
    if (!table) {
      return fail("server_error", "AI가 잠시 정리하지 못하고 있어요. 조금 뒤에 다시 눌러 주세요.");
    }

    const result = { table, count: contributed, at: Date.now() };
    await updateSession(sessionId, { rulesResult: result });

    return ok({ result });
  });
}
