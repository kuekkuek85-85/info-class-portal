import { fail, guard, ok } from "@/lib/api";
import { getSession, listArtifacts } from "@/lib/db";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";

/**
 * 직업 조사 집계 — 4차시 정리용.
 *
 * 학생들이 활동지에 쓴 "사라질 직업"과 "잘 나갈 직업"을 모아 **몇 명이 같은 직업을
 * 적었는지** 센다. 교실 앞에 띄우고 "우리 반은 이걸 제일 많이 골랐네" 로 마무리한다.
 *
 * **이름은 내보내지 않는다.** 누가 무엇을 적었는지가 아니라 반 전체의 그림이 목적이고,
 * 개인을 지목하는 순간 다음 시간부터 솔직하게 쓰지 않는다 (감정 집계와 같은 원칙).
 */

/** 한 줄에서 직업 이름만 떼어 낸다 — "톨게이트 요금 수납원 — 하이패스가 대신하니까" */
function jobNameOf(line: string): string {
  const head = line.split(/[—\-:·(]/)[0];
  return head.replace(/^\s*\d+[.)]?\s*/, "").trim();
}

/** 같은 직업을 다르게 적은 것을 한 칸으로 모은다 */
function normalize(name: string): string {
  return name.replace(/\s+/g, "").replace(/(직업|사|원|가)$/, "");
}

function tally(values: string[]): { name: string; count: number }[] {
  const byKey = new Map<string, { name: string; count: number }>();

  for (const raw of values) {
    for (const line of raw.split("\n")) {
      const name = jobNameOf(line);
      // 두 글자 미만은 오타이거나 빈 줄이다
      if (name.length < 2 || name.length > 20) continue;

      const key = normalize(name);
      const found = byKey.get(key);
      // 표시 이름은 처음 나온 표기를 쓴다 — 반에서 실제로 쓴 말이 남는 편이 낫다
      if (found) found.count += 1;
      else byKey.set(key, { name, count: 1 });
    }
  }

  return [...byKey.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (!sessionId) return fail("invalid_input");

    const session = await getSession(sessionId);
    if (!session) return fail("not_found");

    const activityId = session.activity?.activityId;
    if (!activityId) return ok({ vanish: [], rise: [], written: 0 });

    const artifacts = (await listArtifacts(activityId, session.classNo)).filter((row) => !row.hidden);

    const pick = (key: string) =>
      artifacts.map((row) => String(row.answers?.[key] ?? "")).filter((v) => v.trim());

    return ok({
      vanish: tally(pick("vanish")),
      rise: tally(pick("rise")),
      /** 한 칸이라도 쓴 학생 수 — 집계가 몇 명분인지 알아야 해석이 된다 */
      written: artifacts.filter((row) =>
        ["vanish", "rise"].some((k) => String(row.answers?.[k] ?? "").trim()),
      ).length,
    });
  });
}
