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
 */

/**
 * 같은 직업을 다르게 적은 것을 한 이름으로 모은다.
 *
 * 스물여덟 명이 각자 쓰면 "교사 · 선생님 · 학교 선생님" 이 세 칸으로 갈라져서, 막대가
 * 스무 개가 되고 무엇이 많은지 보이지 않는다. 집계의 쓸모가 사라진다.
 *
 * 외부 AI 로 묶지 않는다. 수업 중에 부르면 느리고, 실패하면 집계가 통째로 멈추고,
 * 같은 답이 반마다 다르게 묶여 비교가 안 된다. 사전은 느리지도 틀리지도 않는다.
 *
 * 목록에 없는 직업은 **쓴 그대로 남긴다.** 모르는 것을 억지로 묶으면 학생이 쓴 말이
 * 사라진다 — 없는 것보다 나쁘다.
 */
const SYNONYMS: Record<string, string[]> = {
  교사: ["선생님", "선생", "학교선생님", "교수", "강사"],
  의사: ["의사선생님", "내과의사", "외과의사"],
  간호사: ["간호"],
  약사: [],
  수의사: ["동물의사", "동물병원의사"],
  요리사: ["셰프", "조리사", "쉐프", "요리"],
  제빵사: ["파티시에", "빵집주인"],
  프로그래머: ["개발자", "소프트웨어개발자", "코딩", "코더", "웹개발자", "앱개발자"],
  "AI 전문가": ["ai전문가", "인공지능전문가", "ai개발자", "인공지능개발자", "ai엔지니어"],
  "AI 윤리 전문가": ["ai윤리전문가", "인공지능윤리전문가", "ai윤리"],
  "데이터 분석가": ["데이터과학자", "빅데이터전문가", "데이터전문가", "데이터사이언티스트"],
  "로봇 정비사": ["로봇수리기사", "로봇엔지니어", "로봇정비", "로봇기술자", "로봇수리"],
  "드론 조종사": ["드론파일럿", "드론기사", "드론조종"],
  디자이너: ["웹디자이너", "그래픽디자이너"],
  번역가: ["통역사", "번역사", "통역가", "번역"],
  계산원: ["캐셔", "마트계산원", "편의점알바", "편의점직원", "마트직원"],
  텔레마케터: ["전화상담원", "콜센터직원", "콜센터상담원", "전화판매원"],
  은행원: ["은행창구직원", "은행직원", "은행"],
  "운전기사": ["택시기사", "버스기사", "트럭운전사", "운전사", "기사", "화물차운전사"],
  경찰: ["경찰관", "형사"],
  소방관: ["소방사", "소방"],
  변호사: [],
  판사: [],
  회계사: ["세무사"],
  기자: ["리포터", "아나운서", "기사쓰는사람"],
  작가: ["소설가", "시인", "글쓰는사람"],
  유튜버: ["크리에이터", "스트리머", "bj", "인플루언서"],
  가수: ["아이돌", "래퍼"],
  배우: ["연기자", "탤런트"],
  상담사: ["심리상담사", "상담원", "심리치료사", "상담"],
  "우주 비행사": ["우주인", "우주비행사", "우주비행"],
  농부: ["농업인", "농사꾼"],
  건축가: ["건축사"],
  사서: ["도서관사서"],
  통번역가: [],
};

/** 표기 → 대표 이름. 사전을 뒤집어 한 번만 만든다 */
const CANONICAL = new Map<string, string>();
for (const [name, words] of Object.entries(SYNONYMS)) {
  const key = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  CANONICAL.set(key(name), name);
  for (const w of words) CANONICAL.set(key(w), name);
}

/**
 * 부분 일치용 목록 — **긴 이름부터** 본다.
 *
 * "마트 계산원"처럼 앞에 말을 붙여 쓰는 경우를 잡으려는 것인데, 짧은 것부터 보면
 * "수의사"가 "의사"에 걸려 엉뚱하게 묶인다.
 */
const BY_LENGTH = [...CANONICAL.keys()].sort((a, b) => b.length - a.length);

function normalize(name: string): string {
  const key = name.replace(/\s+/g, "").toLowerCase().replace(/직업$/, "");
  if (!key) return "";

  const exact = CANONICAL.get(key);
  if (exact) return exact;

  for (const word of BY_LENGTH) {
    if (key.includes(word)) return CANONICAL.get(word)!;
  }
  // 사전에 없는 직업은 학생이 쓴 그대로 둔다
  return name.replace(/\s+/g, " ").trim();
}

/**
 * 직업 이름만 모아 센다.
 *
 * 활동지가 직업 칸과 이유 칸을 나눠 받으므로 글을 쪼갤 필요가 없다. 예전에는 한 칸에
 * "직업 — 이유" 를 여러 줄로 적게 하고 구분자로 잘랐는데, 학생이 줄표 대신 쉼표를 쓰거나
 * 이유를 먼저 적으면 엉뚱한 말이 직업으로 잡혔다.
 */
function tally(
  values: string[],
  /** AI 가 만든 이름 → 대표 이름 표. 비어 있으면 글자 기준으로 묶는다 */
  grouped: Map<string, string>,
): { name: string; count: number }[] {
  const byKey = new Map<string, { name: string; count: number }>();

  for (const raw of values) {
    const name = raw.replace(/\s+/g, " ").trim();
    // 두 글자 미만은 오타이거나 빈 칸이다
    if (name.length < 2 || name.length > 20) continue;

    /*
     * 표시 이름은 대표 이름을 쓴다.
     *
     * 처음 나온 표기를 쓰면 "선생님 5" 로 뜨는데, 그 안에는 "교사"라고 쓴 학생도 섞여
     * 있다. 묶은 결과를 보여줄 때는 묶은 이름으로 부르는 편이 정직하다.
     *
     * AI 가 묶어 준 것이 있으면 그것을, 없으면(느리거나 죽었으면) 글자 기준을 쓴다.
     */
    const merged = grouped.get(name) ?? normalize(name);
    const found = byKey.get(merged);
    if (found) found.count += 1;
    else byKey.set(merged, { name: merged, count: 1 });
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

    /*
     * 두 방향을 **한 번에** 묶는다.
     *
     * 따로 부르면 요청이 두 배가 되고, 같은 직업이 양쪽에서 다른 대표 이름을 받을 수
     * 있다 — 한 화면에 "선생님"과 "교사"가 나란히 뜨면 묶은 의미가 없다.
     */
    const vanishRaw = pick("vanish");
    const riseRaw = pick("rise");
    const grouped = await groupJobNames([...vanishRaw, ...riseRaw]);

    return ok({
      vanish: tally(vanishRaw, grouped),
      rise: tally(riseRaw, grouped),
      /** 한 칸이라도 쓴 학생 수 — 집계가 몇 명분인지 알아야 해석이 된다 */
      written: artifacts.filter(wrote).length,
    });
  });
}
