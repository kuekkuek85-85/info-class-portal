import { deviceKey, fail, guard, ok, rateLimit, readJson } from "@/lib/api";
import {
  ensureArtifact,
  getSession,
  isSessionClosed,
  logAiCall,
  updateArtifact,
} from "@/lib/db";
import { activityIdFor } from "@/lib/gallery";
import { readStudentSession } from "@/lib/session";
import type { WorksheetQuestion } from "@/lib/types";
import { vibeCodeGenerate, type VibeCodeEntry, type VibeCodeLog } from "@/lib/vibe-code";

/**
 * 바이브 코딩 — 학생 프롬프트 → Gemini 코드 생성 (22차 vibe_code 문항).
 *
 * ## 프라이버시 (이 과목의 1순위)
 *
 * - 학번·이름은 Gemini 로 보내지 않는다. 현재 게임 코드(차시가 준 vibeBaseCode)와 학생 프롬프트만 넘어간다.
 * - 프롬프트·AI 답(코드·설명)은 학생 본인 activity 아티팩트(answers[key])에 JSON 으로 저장되고
 *   교사만 열람한다(api/teacher/vibe-code + requireTeacher). 학생 화면엔 "선생님이 볼 수 있어요" 를 띄운다.
 *
 * 요청: POST { key, prompt }  → 코드 생성해 기록에 추가, 전체 기록 반환
 *       GET  ?key=...         → 내 기록 반환 (Gemini 호출 없음)
 */

/** 학번 기준 시간당 상한. 코드 생성은 비싸니 넉넉하되 남용은 막는다 */
const PER_STUDENT = 25;
/** 태블릿 기준 이중 상한 (다른 학번으로 우회 방지) */
const PER_DEVICE = 50;
const WINDOW_MS = 60 * 60_000;

const MAX_PROMPT = 500;
/** 아티팩트에 쌓아 둘 기록 최대 개수 (Firestore 문서 방어). 오래된 것부터 버린다 */
const MAX_ENTRIES = 12;

function parseLog(raw: string | undefined): VibeCodeLog | null {
  if (!raw?.trim()) return null;
  try {
    const value = JSON.parse(raw) as VibeCodeLog;
    return Array.isArray(value.entries) ? value : null;
  } catch {
    return null;
  }
}

function findQuestion(
  session: Awaited<ReturnType<typeof getSession>>,
  key: string,
): WorksheetQuestion | undefined {
  return (session?.activity?.worksheet ?? []).find(
    (q): q is WorksheetQuestion => q.key === key && q.kind === "vibe_code",
  );
}

export async function GET(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");
    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const key = (new URL(request.url).searchParams.get("key") ?? "").trim();
    if (!findQuestion(session, key)) return fail("not_found");

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");

    const artifact = await ensureArtifact({
      activityId,
      studentId: me.studentId,
      classNo: session.classNo,
      year: session.activity?.year ?? new Date().getFullYear(),
    });
    const log = parseLog(artifact.answers?.[key]) ?? { entries: [], updatedAt: 0 };
    return ok({ log });
  });
}

export async function POST(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");
    if (isSessionClosed(session)) return fail("session_expired", "이 수업은 끝났어요.");

    const body = await readJson<{ key?: string; prompt?: string }>(request);
    const key = body?.key ?? "";
    const question = findQuestion(session, key);
    if (!question) return fail("not_found");

    const prompt = (body?.prompt ?? "").trim().slice(0, MAX_PROMPT);
    if (!prompt) return fail("invalid_input", "추가하고 싶은 기능을 적어 주세요.");

    // 현재 게임 코드는 차시가 준 것(vibeBaseCode)을 쓴다 — 클라이언트가 보낸 코드는 신뢰하지 않는다.
    const baseCode = (question.vibeBaseCode ?? question.code ?? "").trim();
    if (!baseCode) return fail("server_error", "현재 게임 코드가 준비되지 않았어요. 선생님께 알려 주세요.");

    const activityId = activityIdFor(session);
    if (!activityId) return fail("not_found");

    if (!rateLimit(`vibecode:${me.studentId}`, PER_STUDENT, WINDOW_MS)) {
      return fail("too_many_attempts", "오늘 AI에게 코드를 받을 수 있는 횟수를 다 썼어요.");
    }
    if (!rateLimit(await deviceKey("vibecode"), PER_DEVICE, WINDOW_MS)) {
      return fail("too_many_attempts", "이 태블릿에서 너무 많이 눌렀어요. 선생님께 알려 주세요.");
    }

    const result = await vibeCodeGenerate({ baseCode, prompt });
    if (!result) {
      await logAiCall({
        studentId: me.studentId,
        lessonNo: session.lessonNo,
        feature: "vibe_code_fail",
      }).catch(() => undefined);
      return fail("server_error", "AI가 잠시 코드를 만들지 못하고 있어요. 조금 뒤에 다시 보내 보세요.");
    }

    const artifact = await ensureArtifact({
      activityId,
      studentId: me.studentId,
      classNo: session.classNo,
      year: session.activity?.year ?? new Date().getFullYear(),
    });
    const existing = parseLog(artifact.answers?.[key]) ?? { entries: [], updatedAt: 0 };
    const now = Date.now();
    const entry: VibeCodeEntry = { prompt, code: result.code, explanation: result.explanation, at: now };
    const log: VibeCodeLog = {
      // 오래된 것부터 버리고 최신 MAX_ENTRIES 개만 남긴다 (Firestore 문서 방어).
      entries: [...existing.entries, entry].slice(-MAX_ENTRIES),
      updatedAt: now,
    };
    await updateArtifact(artifact.id, {
      answers: { ...artifact.answers, [key]: JSON.stringify(log) },
    });
    await logAiCall({
      studentId: me.studentId,
      sessionId: session.id,
      lessonNo: session.lessonNo,
      feature: "vibe_code",
    }).catch(() => undefined);

    return ok({ log, entry });
  });
}
