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

/** 같은 직업을 다르게 적은 것을 한 칸으로 모은다 */
function normalize(name: string): string {
  return name.replace(/\s+/g, "").replace(/(직업|사|원|가)$/, "");
}

/**
 * 직업 이름만 모아 센다.
 *
 * 활동지가 직업 칸과 이유 칸을 나눠 받으므로 글을 쪼갤 필요가 없다. 예전에는 한 칸에
 * "직업 — 이유" 를 여러 줄로 적게 하고 구분자로 잘랐는데, 학생이 줄표 대신 쉼표를 쓰거나
 * 이유를 먼저 적으면 엉뚱한 말이 직업으로 잡혔다.
 */
function tally(values: string[]): { name: string; count: number }[] {
  const byKey = new Map<string, { name: string; count: number }>();

  for (const raw of values) {
    const name = raw.replace(/\s+/g, " ").trim();
    // 두 글자 미만은 오타이거나 빈 칸이다
    if (name.length < 2 || name.length > 20) continue;

    const key = normalize(name);
    const found = byKey.get(key);
    // 표시 이름은 처음 나온 표기를 쓴다 — 반에서 실제로 쓴 말이 남는 편이 낫다
    if (found) found.count += 1;
    else byKey.set(key, { name, count: 1 });
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

    /** 직업 칸 세 개(vanish1_job · vanish2_job · vanish3_job)를 모은다 */
    const pick = (prefix: string) =>
      artifacts.flatMap((row) =>
        [1, 2, 3].map((i) => String(row.answers?.[`${prefix}${i}_job`] ?? "")).filter((v) => v.trim()),
      );

    const wrote = (row: (typeof artifacts)[number]) =>
      ["vanish", "rise"].some((p) =>
        [1, 2, 3].some((i) => String(row.answers?.[`${p}${i}_job`] ?? "").trim()),
      );

    return ok({
      vanish: tally(pick("vanish")),
      rise: tally(pick("rise")),
      /** 한 칸이라도 쓴 학생 수 — 집계가 몇 명분인지 알아야 해석이 된다 */
      written: artifacts.filter(wrote).length,
    });
  });
}
