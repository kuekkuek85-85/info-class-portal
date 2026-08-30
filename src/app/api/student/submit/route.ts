import { fail, guard, ok, readJson } from "@/lib/api";
import { findTypos } from "@/lib/ai-review";
import {
  ARTICLE_RULES,
  checkArticle,
  gateItems,
  type FieldRule,
} from "@/lib/article-check";
import { getArtifact, getSession, recordSubmitStage, updateArtifact } from "@/lib/db";
import { activityIdFor } from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";
import type { ClassSession } from "@/lib/types";

/**
 * 수행평가 제출 — 1차 · 2차 · 최종 (7차시).
 *
 * ## 단계마다 하는 일이 다르다
 *
 *  1차 — 코드로 판정하고 오탈자를 붙여 돌려준다. 저장은 하되 **막지 않는다**
 *  2차 — **문턱을 넘어야 통과한다.** 「고쳤어요」를 눌러도 안 고쳤으면 되돌린다
 *  최종 — status 를 submitted 로 올린다
 *
 * ## 자기 신고를 믿지 않는다
 *
 * 2차 문턱은 학생이 보낸 값이 아니라 **저장된 답을 서버가 다시 세서** 판정한다.
 * 중1은 피드백을 오래 고민하지 않고 금방 눌러 버리는데, 그대로 통과시키면 전원이
 * 20분대에 교사 대기열로 몰려 절반은 차례가 오지 않는다.
 *
 * ## 왜 attendance 에도 쓰는가
 *
 * 교사 대시보드가 대기 줄을 알아야 하는데, 폴링마다 artifact 를 스물여덟 건 읽으면
 * 한 교시에 무료 한도를 태운다. 출석 문서는 이미 읽고 있으므로 거기 얹으면 0건이다
 * (PRD 10장 D2).
 */

/** 차시가 정한 판정 규칙. 없으면 기본값 */
function rulesOf(session: ClassSession): readonly FieldRule[] {
  const question = (session.activity?.worksheet ?? []).find((q) => q.kind === "submit");
  const fields = question?.submitFields;
  return fields && fields.length > 0 ? fields : ARTICLE_RULES;
}

export async function POST(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const body = await readJson<{ stage?: number; selfCheck?: string }>(request);
    const stage = body?.stage;
    if (stage !== 1 && stage !== 2 && stage !== 3) return fail("invalid_input");

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");

    const artifact = await getArtifact(activityId, me.studentId);
    if (!artifact) return fail("not_found", "먼저 답을 몇 개 써 주세요.");

    const rules = rulesOf(session);
    const answers = artifact.answers ?? {};
    const sources = artifact.sources ?? { site: "", ai: "" };

    if (stage === 1) {
      const items = checkArticle(answers, sources, rules);
      /*
       * 오탈자는 있으면 좋고 없어도 되는 줄이다.
       *
       * findTypos 는 실패하면 빈 배열을 준다 — 열쇠가 없거나, 시간이 넘거나,
       * 응답이 깨져도 여기서 멈추지 않는다. 코드가 센 항목은 이미 손에 있다.
       */
      const typos = await findTypos(rules.map((rule) => answers[rule.key] ?? ""));
      const all = [...items, ...typos];

      await updateArtifact(artifact.id, {
        submitStage: 1,
        aiCheck: { at: Date.now(), items: all },
      });
      await recordSubmitStage(me.sessionId, me.studentId, 1);

      return ok({ items: all });
    }

    if (stage === 2) {
      /*
       * 문턱은 빈 칸과 짧은 칸만이다.
       *
       * askedSource 를 true 로 넘겨 출처를 다시 묻지 않는다 — 1차에서 이미 물었고,
       * 안 찾고 쓴 것이 맞다고 답한 학생을 두 번 붙잡지 않는다.
       */
      const blocked = gateItems(checkArticle(answers, sources, rules, true));
      if (blocked.length > 0) return ok({ blocked });

      await updateArtifact(artifact.id, { submitStage: 2 });
      await recordSubmitStage(me.sessionId, me.studentId, 2, body?.selfCheck);

      return ok({ blocked: [] });
    }

    // 최종 — 여기서만 status 가 함께 올라간다
    await updateArtifact(artifact.id, { submitStage: 3, status: "submitted" });
    await recordSubmitStage(me.sessionId, me.studentId, 3);

    return ok();
  });
}

/**
 * 지금 상태를 돌려준다.
 *
 * 2차 대기 중인 학생 화면이 **교사 피드백이 왔는지** 확인하는 데 쓴다. 8초마다 묻되
 * **stage 가 2 일 때만** 묻는다 (submit-panel). 그 상태인 학생은 많아야 열댓 명이고
 * 몇 분이라, 수업 한 번에 천 건 안쪽이다.
 *
 * 새로고침한 학생이 자기 단계를 되찾는 데도 쓴다 — 화면 상태만으로 들고 있으면
 * 태블릿이 한 번 꺼진 학생이 1차부터 다시 낸다.
 */
export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");

    const artifact = await getArtifact(activityId, me.studentId);
    if (!artifact) return ok({ stage: 0, items: [], teacherFeedback: null });

    return ok({
      stage: artifact.submitStage ?? 0,
      items: artifact.aiCheck?.items ?? [],
      teacherFeedback: artifact.teacherFeedback ?? null,
    });
  });
}
