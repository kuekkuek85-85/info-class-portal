import { fail, guard, ok } from "@/lib/api";
import { getSession, listArtifacts } from "@/lib/db";
import { groupJobNames } from "@/lib/job-grouping";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";

/**
 * 직업 조사 집계 — 4차시 정리용.
 *
 * 학생들이 활동지에 쓴 "사라질 직업"과 "잘 나갈 직업"을 모아 **몇 명이 같은 직업을
 * 적었는지** 센다. 교실 앞에 띄우고 "우리 반은 이걸 제일 많이 골랐네" 로 마무리한다.
 *
 * **이름은 내보내지 않는다.** 누가 무엇을 적었는지가 아니라 반 전체의 그림이 목적이고,
 * 개인을 지목하는 순간 다음 시간부터 솔직하게 쓰지 않는다 (감정 집계와 같은 원칙).
 *
 * ## 같은 뜻으로 묶는 일은 전부 AI 가 한다
 *
 * 처음에는 동의어 사전을 두었다. 걷어냈다 — 글자로는 "무인매장 관리자"와 "캐셔"를
 * 못 잡고, 무엇보다 **잘못 묶었다.** "상담사"의 동의어에 "상담원"을 넣어 두었더니,
 * 전화 상담원을 사라질 직업으로 심리 상담사를 잘 나갈 직업으로 적은 학생의 답이
 * 양쪽 다 "상담사"로 떠서 그 학생이 그은 구분이 사라졌다.
 *
 * 덜 묶이는 것은 눈으로 알아볼 수 있지만, 잘못 묶인 것은 알아볼 수가 없다.
 * AI 가 실패하면 **아무것도 묶지 않고 쓴 그대로 보여준다.** 화면에 그 사실을 적는다.
 */

/** 두 글자 미만은 오타, 스무 자를 넘으면 직업 이름이 아니라 문장이다 */
function usable(name: string): boolean {
  return name.length >= 2 && name.length <= 20;
}

function tally(
  values: string[],
  /** 이름 → 대표 이름. 비어 있으면 묶지 않고 쓴 그대로 센다 */
  grouped: Map<string, string>,
): { name: string; count: number }[] {
  const byName = new Map<string, number>();

  for (const raw of values) {
    const name = raw.replace(/\s+/g, " ").trim();
    if (!usable(name)) continue;

    const merged = grouped.get(name) ?? name;
    byName.set(merged, (byName.get(merged) ?? 0) + 1);
  }

  return [...byName.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
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
    if (!activityId) return ok({ vanish: [], rise: [], written: 0, grouped: true });

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

    /*
     * 두 방향을 **한 번에** 묶는다.
     *
     * 따로 부르면 요청이 두 배가 되고, 같은 직업이 양쪽에서 다른 대표 이름을 받을 수
     * 있다 — 한 화면에 "선생님"과 "교사"가 나란히 뜨면 묶은 의미가 없다.
     */
    const vanishRaw = pick("vanish").filter((v) => usable(v.replace(/\s+/g, " ").trim()));
    const riseRaw = pick("rise").filter((v) => usable(v.replace(/\s+/g, " ").trim()));
    const grouped = await groupJobNames(vanishRaw, riseRaw);

    /*
     * 묶을 이름이 둘 미만이면 애초에 부르지 않으므로(job-grouping.ts) 표가 비어 있는
     * 것이 정상이다. 그 경우까지 "묶지 못했다"고 알리면 없는 문제를 알리는 셈이다.
     */
    const distinct = new Set([...vanishRaw, ...riseRaw].map((n) => n.replace(/\s+/g, " ").trim()));
    const groupedOk = distinct.size < 2 || grouped.size > 0;

    return ok({
      vanish: tally(vanishRaw, grouped),
      rise: tally(riseRaw, grouped),
      /** 한 칸이라도 쓴 학생 수 — 집계가 몇 명분인지 알아야 해석이 된다 */
      written: artifacts.filter(wrote).length,
      /** AI 묶기가 됐는가. 실패하면 화면에 알린다 */
      grouped: groupedOk,
    });
  });
}
