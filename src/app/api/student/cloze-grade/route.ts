import { deviceKey, fail, guard, ok, rateLimit, readJson } from "@/lib/api";
import { gradeClozeAi, type ClozeLineEval } from "@/lib/ai-cloze";
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

/** □ 자리에 학생 보기를 끼워 넣고, **틀린** 낱말만 《》로 표시한 문장을 만든다 */
function fillAndMark(text: string, choices: string[], answers: string[]): string {
  const parts = text.split("□");
  let out = parts[0] ?? "";
  for (let i = 0; i < parts.length - 1; i++) {
    const choice = (choices[i] ?? "").trim();
    const wrong = choice !== (answers[i] ?? "").trim();
    out += wrong ? `《${choice || "(빈칸)"}》` : choice;
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

    /*
     * 구성요소(줄)마다 하나씩 채점한다. 번호(num)는 화면에 보이는 그대로 줄 순서(1~6)다 —
     * cloze-field 가 같은 번호를 각 문장 앞에 붙이고, AI 힌트도 이 번호로 가리킨다.
     * 정답은 세션 문서의 clozeLines.blanks.answer(서버 전용)에서만 읽는다.
     */
    const items: ClozeLineEval[] = [];
    let unanswered = false;
    const lines = question.clozeLines ?? [];
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const blanks = line.blanks ?? [];
      if (blanks.length === 0) continue;
      const picked = selections[line.key] ?? [];
      const answers = blanks.map((b) => (b.answer ?? "").trim());
      let lineCorrect = true;
      for (let i = 0; i < blanks.length; i++) {
        if (!answers[i]) continue;
        const choice = (picked[i] ?? "").trim();
        if (!choice) unanswered = true;
        if (choice !== answers[i]) lineCorrect = false;
      }
      items.push({ num: idx + 1, sentence: fillAndMark(line.text, picked, answers), correct: lineCorrect });
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
