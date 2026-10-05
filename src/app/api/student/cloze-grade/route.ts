import { deviceKey, fail, guard, ok, rateLimit, readJson } from "@/lib/api";
import { gradeClozeAi, type ClozeBlankEval } from "@/lib/ai-cloze";
import { getSession, isSessionClosed, logAiCall } from "@/lib/db";
import { readStudentSession } from "@/lib/session";
import type { WorksheetQuestion } from "@/lib/types";

/**
 * 빈칸 채우기 AI 채점 — 학생이 드롭다운에서 고른 보기를 받아 정답과 대조하고(서버), 맞으면 칭찬·
 * 틀리면 힌트를 AI(Gemini)로 받아 돌려준다 (정보 17차 게임 구성요소 분석).
 *
 * **정답은 세션 문서에서만 읽는다** — 학생 화면으로는 answer 를 안 보냈다(student/lesson 이 뗌).
 * 학번·이름은 Gemini 로 안 보낸다. 결과는 저장하지 않는다(즉석 자가 점검이라 화면에만 띄운다).
 *
 * 요청: { key, selections } — selections = { [줄key]: 고른보기[] } (왼→오 순서).
 */

const PER_STUDENT = 12;
const PER_DEVICE = 40;
const WINDOW_MS = 60 * 60_000;

/** □ 자리에 학생 보기를 끼워 넣고, 지금 채점할 칸만 《》로 표시한 문장을 만든다 */
function markSentence(text: string, choices: string[], target: number): string {
  const parts = text.split("□");
  let out = parts[0] ?? "";
  for (let i = 0; i < parts.length - 1; i++) {
    const word = (choices[i] ?? "").trim();
    out += i === target ? `《${word || "(빈칸)"}》` : word || "□";
    out += parts[i + 1] ?? "";
  }
  return out;
}

export async function POST(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");
    if (isSessionClosed(session)) return fail("session_expired", "이 수업은 끝났어요.");

    const body = await readJson<{ key?: string; selections?: Record<string, string[]> }>(request);
    const key = body?.key ?? "";
    const selections = body?.selections ?? {};

    const question = (session.activity?.worksheet ?? []).find(
      (q): q is WorksheetQuestion => q.key === key && q.kind === "cloze" && q.clozeGrade === true,
    );
    if (!question) return fail("not_found");

    // 정답이 있는 빈칸만 채점한다 (세션 문서의 clozeLines.blanks.answer — 서버 전용)
    const items: ClozeBlankEval[] = [];
    let unanswered = false;
    for (const line of question.clozeLines ?? []) {
      const blanks = line.blanks ?? [];
      const picked = selections[line.key] ?? [];
      for (let i = 0; i < blanks.length; i++) {
        const answer = (blanks[i]?.answer ?? "").trim();
        if (!answer) continue; // 정답이 없는 빈칸은 채점 대상 아님
        const choice = (picked[i] ?? "").trim();
        if (!choice) unanswered = true;
        items.push({
          sentence: markSentence(line.text, picked, i),
          choice,
          correct: choice === answer,
        });
      }
    }

    if (items.length === 0) return fail("not_found");
    if (unanswered) {
      return fail("invalid_input", "먼저 빈칸을 다 고른 뒤 눌러 주세요.");
    }

    if (!rateLimit(`clozegrade:${me.studentId}`, PER_STUDENT, WINDOW_MS)) {
      return fail("too_many_attempts", "채점을 받을 수 있는 횟수를 다 썼어요. 조금 뒤에 다시 해요.");
    }
    if (!rateLimit(await deviceKey("clozegrade"), PER_DEVICE, WINDOW_MS)) {
      return fail("too_many_attempts", "이 태블릿에서 너무 많이 눌렀어요. 선생님께 알려 주세요.");
    }

    const feedback = await gradeClozeAi(items);
    if (!feedback) {
      return fail("server_error", "AI가 잠시 대답하지 못하고 있어요. 조금 뒤에 다시 눌러 보세요.");
    }

    await logAiCall({
      studentId: me.studentId,
      sessionId: session.id,
      lessonNo: session.lessonNo,
      feature: "cloze_grade",
    }).catch(() => undefined);

    const correctCount = items.filter((it) => it.correct).length;
    return ok({ result: feedback, correctCount, total: items.length });
  });
}
