import { fail, guard, ok } from "@/lib/api";
import { getSession, listArtifacts } from "@/lib/db";
import { activityIdFor } from "@/lib/gallery";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import type { WorksheetQuestion } from "@/lib/types";

/**
 * 교사용 — 「우리 학교 규칙」 현재 결과 + 지금까지 규칙을 낸 학생 수 (읽기 전용).
 *
 * 완성 패널이 이 값을 읽어, 「규칙 완성하기」 전에는 "몇 명이 규칙을 냈는지" 를 보여주고,
 * 완성 뒤에는 만들어진 표를 미리 보여준다. 저자 신원은 담지 않는다.
 */
export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const sessionId = (new URL(request.url).searchParams.get("sessionId") ?? "").trim();
    if (!sessionId) return fail("invalid_input");

    const session = await getSession(sessionId);
    if (!session) return fail("not_found");

    const worksheet = session.activity?.worksheet ?? [];
    const resultQuestion = worksheet.find((q: WorksheetQuestion) => q.kind === "rules_result");
    const rulesKey = resultQuestion?.rulesSourceKey ?? "";

    let contributed = 0;
    const activityId = activityIdFor(session);
    if (rulesKey && activityId) {
      const artifacts = await listArtifacts(activityId, session.classNo);
      for (const artifact of artifacts) {
        const raw = artifact.answers?.[rulesKey];
        if (!raw?.trim()) continue;
        try {
          const rows = JSON.parse(raw);
          if (Array.isArray(rows) && rows.some((r) => Object.values(r ?? {}).some((v) => String(v ?? "").trim()))) {
            contributed += 1;
          }
        } catch {
          // 깨진 JSON 은 센 수에서 뺀다
        }
      }
    }

    return ok({ result: session.rulesResult ?? null, contributed });
  });
}
