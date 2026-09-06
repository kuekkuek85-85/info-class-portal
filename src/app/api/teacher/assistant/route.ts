import { fail, guard, ok, readJson } from "@/lib/api";
import { runAssistant, type AgentImage, type AgentTurn } from "@/lib/assistant/gemini-agent";
import { Pseudonymizer, type RosterEntry } from "@/lib/assistant/pseudonymize";
import type { ToolContext } from "@/lib/assistant/tools";
import { listStudents } from "@/lib/db";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import type { ClassSession } from "@/lib/types";

/**
 * 교사 대시보드 챗봇 — 수업 내용·학생 데이터를 묻고 답한다 (교사 전용).
 *
 * ## 왜 이름을 가려서 보내는가
 *
 * 챗봇이 감정·성찰까지 답하려면 그 내용을 외부 AI(Gemini)로 보내야 한다. 이 과목 포털의
 * 1순위 가치가 감정 글의 프라이버시라, **누구의 것인지는 보내지 않는다.** 요청이 들어오면
 * 명렬표로 가명기를 만들어 질문·대화·도구 결과의 이름을 `학생A` 로 바꾸고, 답이 돌아오면
 * 화면에 실명으로 되돌린다. 매핑은 이 요청 안에서만 산다.
 *
 * ## 대화는 서버에 저장하지 않는다
 *
 * 이력은 브라우저(localStorage)가 들고 매 요청에 함께 보낸다. 교사 한 명이 저녁에 쓰는
 * 도구라 서버에 대화를 쌓을 이유가 없고, 안 쌓는 편이 프라이버시에 낫다.
 */

const MAX_QUESTION = 2000;
const MAX_HISTORY = 12;
const MAX_IMAGES = 4;
/** base64 한 장의 대략 상한 (~5MB 원본). 너무 크면 요청이 통째로 느려진다. */
const MAX_IMAGE_CHARS = 7_000_000;

interface Body {
  question?: string;
  history?: { role?: string; text?: string }[];
  images?: { mimeType?: string; dataBase64?: string }[];
}

const FRIENDLY: Record<string, string> = {
  timeout: "생각하는 데 너무 오래 걸렸어요. 질문을 조금 좁혀서 다시 물어봐 주세요.",
  error: "지금은 답을 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
  empty: "답을 만들지 못했어요. 다르게 한 번 더 물어봐 주세요.",
  maxsteps: "찾을 것이 너무 많았어요. 학생이나 날짜를 콕 집어 다시 물어봐 주세요.",
};

export async function POST(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<Body>(request);
    const question = (body?.question ?? "").trim().slice(0, MAX_QUESTION);
    if (!question) return fail("invalid_input", "질문을 입력해 주세요.");

    const history: AgentTurn[] = (body?.history ?? [])
      .slice(-MAX_HISTORY)
      .map((turn): AgentTurn => ({
        role: turn.role === "model" ? "model" : "user",
        text: (turn.text ?? "").slice(0, MAX_QUESTION),
      }))
      .filter((turn) => turn.text.trim());

    const images: AgentImage[] = (body?.images ?? [])
      .slice(0, MAX_IMAGES)
      .map((image) => ({
        mimeType: (image.mimeType ?? "image/png").slice(0, 64),
        // 데이터 URL 접두어(data:image/png;base64,)가 붙어 오면 뗀다
        dataBase64: (image.dataBase64 ?? "").replace(/^data:[^,]*,/, ""),
      }))
      .filter((image) => image.dataBase64 && image.dataBase64.length <= MAX_IMAGE_CHARS);

    // 명렬표 전체로 가명기를 만든다 — 질문·결과 어디에 이름이 나와도 가려지도록
    const students = await listStudents();
    const roster: RosterEntry[] = students.map((s) => ({
      studentId: s.studentId,
      name: s.name,
      number: s.number,
      classNo: s.classNo,
    }));
    const pseud = new Pseudonymizer(roster);
    const ctx: ToolContext = { pseud, sessionCache: new Map<string, ClassSession | null>(), sources: [] };

    const result = await runAssistant({ history, question, images, ctx });

    if (result.reason === "nokey") {
      return fail("not_configured", "AI 키가 설정되지 않았어요. 챗봇을 쓰려면 GEMINI_API_KEY 가 필요합니다.");
    }
    if (!result.ok) {
      return ok({ reply: FRIENDLY[result.reason ?? "error"] ?? FRIENDLY.error, sources: [] });
    }

    // 가명 → 실명 복원은 여기서. 화면에는 실명으로 나간다
    return ok({ reply: pseud.unmask(result.reply), sources: result.sources });
  });
}
