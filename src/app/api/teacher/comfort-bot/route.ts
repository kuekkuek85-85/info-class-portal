import { fail, guard, ok } from "@/lib/api";
import type { ComfortTranscript } from "@/lib/comfort-bot";
import { getSession, listArtifacts, studentNameMap } from "@/lib/db";
import { activityIdFor, displayName } from "@/lib/gallery";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import type { WorksheetQuestion } from "@/lib/types";

/**
 * 교사용 — 감정 위로 챗봇 대화 열람 (읽기 전용).
 *
 * 학생이 챗봇과 나눈 대화(transcript)를 이 세션(회기)의 학생별로 모아 돌려준다. 학생 화면에
 * "이 대화는 선생님이 볼 수 있어요" 를 이미 띄우고 있으므로(투명성), 여기서 교사가 그 대화를
 * 읽고 후속 대응한다(특히 위기 신호).
 *
 * ## 이 세션(반/분반)의 것만
 *
 * 활동 통(activityId)은 회기가 이어 쓸 수 있어, classNo 로 이 세션 학생만 좁힌다(다른 분반의
 * 대화가 섞이지 않게). 대화는 학생 본인 아티팩트에서만 읽는다 — 친구에게 나가는 경로가 없다.
 *
 * 자동 폴링 대상이 아니다 — 교사가 열거나 새로고침할 때만 읽는다 (PRD 10장 D2).
 */
export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const sessionId = (new URL(request.url).searchParams.get("sessionId") ?? "").trim();
    if (!sessionId) return fail("invalid_input");

    const session = await getSession(sessionId);
    if (!session) return fail("not_found");

    const activityId = activityIdFor(session);
    if (!activityId) return ok({ rows: [] });

    const keys = (session.activity?.worksheet ?? [])
      .filter((q: WorksheetQuestion) => q.kind === "comfort_bot")
      .map((q) => q.key);
    if (keys.length === 0) return ok({ rows: [] });

    const artifacts = await listArtifacts(activityId, session.classNo);
    const names = await studentNameMap(artifacts.map((a) => a.studentId));

    const rows: {
      studentId: string;
      name: string;
      key: string;
      situation: string;
      design: { label: string; value: string }[];
      messages: { role: "user" | "bot"; text: string; at: number }[];
      flagged: boolean;
      updatedAt: number;
    }[] = [];

    for (const artifact of artifacts) {
      for (const key of keys) {
        const raw = artifact.answers?.[key];
        if (!raw?.trim()) continue;
        let transcript: ComfortTranscript;
        try {
          transcript = JSON.parse(raw) as ComfortTranscript;
        } catch {
          continue;
        }
        if (!Array.isArray(transcript.messages) || transcript.messages.length === 0) continue;

        // 위기 안내가 대화에 들어갔는지(부드러운 표시). flagCareAlert 도 별도로 떠 있다.
        const flagged = transcript.messages.some(
          (m) => m.role === "bot" && m.text.includes("1388"),
        );

        rows.push({
          studentId: artifact.studentId,
          name: displayName(names.get(artifact.studentId)),
          key,
          situation: transcript.situation ?? "",
          design: Array.isArray(transcript.design) ? transcript.design : [],
          messages: transcript.messages,
          flagged,
          updatedAt: transcript.updatedAt ?? 0,
        });
      }
    }

    // 위기 표시가 있는 학생을 위로, 그다음 최근 대화 순.
    rows.sort((a, b) => Number(b.flagged) - Number(a.flagged) || b.updatedAt - a.updatedAt);

    return ok({ rows });
  });
}
