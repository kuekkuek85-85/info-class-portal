import { fail, guard, ok, readJson } from "@/lib/api";
import { getRelayGroupForStudent, getSession, isSessionClosed, listRelayGroups, submitRelayTurn } from "@/lib/db";
import { currentDrawer } from "@/lib/relay";
import { readStudentSession } from "@/lib/session";

/**
 * 릴레이 그림 — 학생용. GET 은 내 모둠 상태(폴링), POST 는 내 차례 이미지 제출.
 *
 * ## 프라이버시
 *
 * 모둠 그림·주제는 이 활동 전용(relayGroups 컬렉션)이고, 감정/게임 답(answers)과 완전히
 * 분리돼 있다. 공개(reveal) 전에는 내 모둠 그림만 보이고, 교사가 공개하면 모든 모둠 완성
 * 그림을 함께 본다. 갤러리(galleryAnswerKeys)와 무관한 별도 경로라 감정 답은 새지 않는다.
 */

/** 이미지 데이터 URL 상한(문자 수) — 축소 저장(~480px jpeg)이면 넉넉히 아래. Firestore 문서 1MB 방어. */
const MAX_IMAGE_CHARS = 400_000;

export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");
    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const reveal = session.relayReveal === true;
    const mine = await getRelayGroupForStudent(session.id, me.studentId);

    // 공개되면 모든 모둠 완성 그림을 함께 본다(교사 신호 전엔 내 모둠만).
    const all = reveal
      ? (await listRelayGroups(session.id)).map((g) => ({
          groupNo: g.groupNo,
          topic: g.topic,
          image: g.image,
          status: g.status,
        }))
      : [];

    if (!mine) {
      return ok({ assigned: false, reveal, all });
    }

    const drawerId = currentDrawer(mine);
    const drawerIdx = mine.turnIndex;

    /*
     * 익명 모드(activity.relayAnonymous): 학생 화면에서 모둠원 이름을 숨기고 "N번째(친구)" 로만
     * 보인다. 실명을 응답에 아예 싣지 않아(순서 라벨로 치환) 개발자 도구로도 이름이 새지 않는다.
     * 동작(턴·제출·건너뛰기·공개)은 그대로 — 표시만 익명. 교사 패널은 별도 라우트라 실명 유지.
     */
    const anon = session.activity?.relayAnonymous === true;
    const memberNames = anon
      ? mine.memberNames.map((_, i) => `${i + 1}번째`)
      : mine.memberNames;
    const currentDrawerName = drawerId
      ? anon
        ? `${mine.turnIndex + 1}번째 친구`
        : (mine.memberNames[mine.turnIndex] ?? "다음 사람")
      : "";

    return ok({
      assigned: true,
      reveal,
      all,
      anonymous: anon,
      group: {
        groupNo: mine.groupNo,
        topic: mine.topic,
        memberNames,
        turnIndex: mine.turnIndex,
        status: mine.status,
        image: mine.image,
        rev: mine.rev,
        isMyTurn: drawerId === me.studentId && mine.status === "drawing",
        // 첫 차례(빈 그림)면 주제를 직접 쓸 수 있다.
        canSetTopic: drawerIdx === 0 && drawerId === me.studentId,
        currentDrawerName,
      },
    });
  });
}

export async function POST(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");
    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");
    if (isSessionClosed(session)) return fail("session_expired", "이 수업은 끝났어요.");

    const body = await readJson<{ image?: string; topic?: string }>(request);
    const image = body?.image ?? "";
    if (!image.startsWith("data:image/")) return fail("invalid_input", "그림을 먼저 그려 주세요.");
    if (image.length > MAX_IMAGE_CHARS) {
      return fail("invalid_input", "그림이 너무 커요. 잠시 뒤 다시 제출해 주세요.");
    }

    const result = await submitRelayTurn({
      sessionId: session.id,
      studentId: me.studentId,
      image,
      topic: body?.topic,
    });

    if (!result.ok) {
      const message =
        result.reason === "not_your_turn"
          ? "지금은 내 차례가 아니에요. 잠깐 기다려 주세요."
          : result.reason === "done"
            ? "우리 모둠 그림은 이미 완성됐어요."
            : result.reason === "no_group"
              ? "아직 모둠이 정해지지 않았어요. 선생님을 기다려 주세요."
              : "제출하지 못했어요. 다시 해 주세요.";
      return fail("invalid_input", message);
    }

    return ok({ done: result.group?.status === "done" });
  });
}
