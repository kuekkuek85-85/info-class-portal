import { deviceKey, fail, guard, networkKey, ok, rateLimit, readJson } from "@/lib/api";
import { findSessionByCode } from "@/lib/db";
import { createCodeToken } from "@/lib/session";

/**
 * ① 수업 코드 (숫자 2자리)
 *
 * 코드를 먼저 받는 이유: 학번이 규칙적(10101)이라 학번을 먼저 받으면 아무 숫자나 넣어
 * 이름을 조회할 수 있다. 코드가 앞에 있으면 그 교실에 있는 학생만 이름 확인 화면에 도달한다.
 * (PRD 3.1)
 */
export async function POST(request: Request) {
  return guard(async () => {
    // 기기별로 센다 — 교실 전체가 한 IP로 나가므로 IP로 세면 옆자리 학생까지 막힌다.
    if (!rateLimit(await deviceKey("code"), 12, 60_000)) {
      return fail("too_many_attempts");
    }
    // 네트워크 단위 백스톱. 28명이 각자 몇 번 눌러도 걸리지 않을 만큼 넉넉히.
    if (!rateLimit(networkKey(request, "code"), 600, 60_000)) {
      return fail("too_many_attempts");
    }

    const body = await readJson<{ code?: string }>(request);
    const code = body?.code?.trim();
    if (!code || !/^\d{2}$/.test(code)) {
      return fail("invalid_input", "수업 코드는 숫자 2자리예요.");
    }

    const { open, notStarted } = await findSessionByCode(code);

    /*
     * "코드가 틀렸다"와 "아직 시작 전이다"는 학생에게 완전히 다른 말이다.
     *
     * 코드는 이제 교사가 "수업 시작"을 눌러야 열린다. 그걸 깜빡한 채 수업이 시작되면
     * 28명이 동시에 코드를 치는데 "그런 코드는 없어요"가 뜬다 — 학생은 자기가 잘못 쳤다고
     * 생각해 계속 다시 치고, 교사는 무엇이 문제인지 모른 채 시간이 지나간다.
     */
    if (!open) {
      if (notStarted) {
        return fail("code_not_found", "아직 수업이 시작되지 않았어요. 선생님을 기다려 주세요.");
      }
      return fail("code_not_found");
    }
    const session = open;

    // 여기서는 세션 상태를 바꾸지 않는다. 코드를 맞히기만 한 요청(아직 학생인지 모른다)이
    // 수업을 시작 상태로 만들면, 코드를 찍어 맞힌 것만으로 차시 스냅샷이 고정된다.
    // 실제 시작 처리는 학생 인증이 끝나는 /api/student/confirm 에서 한다.
    await createCodeToken({ sessionId: session.id, classNo: session.classNo });

    return ok({
      classNo: session.classNo,
      lessonNo: session.lessonNo,
      title: session.title,
      period: session.period,
      /*
       * 반이 섞인 수업인지.
       *
       * 화면에 "1학년 1반" 이라고 뜨면 나머지 세 반 학생은 코드를 잘못 눌렀다고 생각한다.
       * 차시 번호도 마찬가지다 — 정보과와 겹치지 않게 100번대를 쓰는데, 학생에게
       * "102차시" 는 아무 뜻이 없다. 둘 다 감추고 제목만 보여준다.
       */
      mixed: Boolean(session.groupKey),
    });
  });
}
