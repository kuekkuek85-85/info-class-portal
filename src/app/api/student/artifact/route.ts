import { deviceKey, fail, guard, ok, rateLimit, readJson } from "@/lib/api";
import {
  ensureArtifact,
  getSession,
  isSessionClosed,
  roughSize,
  updateArtifact,
  writeStrokes,
} from "@/lib/db";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAX_POINTS_PER_STROKE,
  SIZE_REJECT_BYTES,
  SIZE_WARN_BYTES,
  isValidColorIndex,
  isValidWidthIndex,
  quantize,
} from "@/lib/drawing";
import { readStudentSession } from "@/lib/session";
import { isTrait, type Stroke, type TextItem } from "@/lib/types";

/**
 * 그림·활동지 저장과 조회.
 *
 * **활동 ID 는 클라이언트가 정하지 않는다.** 세션 스냅샷에 적힌 값을 서버가 읽어 쓴다.
 * 학생이 값을 골라 보낼 수 있으면 다른 활동의 문서를 열거나 덮어쓸 수 있다.
 *
 * 그림이 sessionId 가 아니라 activityId 에 묶이는 것이 이 기능의 핵심이다. 그래서 2차시에
 * 그리던 그림이 3차시에 그대로 열리고, 태블릿이 죽어도 폰으로 로그인해 이어 그릴 수 있다.
 */

/** 저장 방식. append 는 새로 그은 획만, replace 는 통째로 (지우개·되돌리기 뒤) */
type SaveMode = "append" | "replace";

interface SaveBody {
  mode?: SaveMode;
  strokes?: unknown;
  texts?: unknown;
  /** 저장 순번. 이보다 낮은 번호로 늦게 도착한 요청은 서버가 버린다 */
  rev?: number;
  place?: string;
  year?: number;
  answers?: Record<string, string>;
  traits?: string[];
  sources?: { site?: string; ai?: string };
}

export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const activity = session.activity;
    if (!activity?.activityId) return fail("not_found", "이 차시에는 그리기 활동이 없어요.");

    const artifact = await ensureArtifact({
      activityId: activity.activityId,
      studentId: me.studentId,
      classNo: session.classNo,
      year: activity.year ?? 2040,
    });

    return ok({
      artifact: {
        id: artifact.id,
        place: artifact.place,
        year: artifact.year,
        strokes: artifact.strokes ?? [],
        texts: artifact.texts ?? [],
        answers: artifact.answers ?? {},
        traits: artifact.traits ?? [],
        sources: artifact.sources ?? { site: "", ai: "" },
        status: artifact.status,
        // 클라이언트는 이 번호 다음부터 세어 올린다. 0부터 다시 세면 새로고침한 학생의
        // 저장이 전부 "옛 요청"으로 버려진다.
        saveRev: artifact.saveRev ?? 0,
      },
      size: roughSize(artifact.strokes ?? []),
      warnBytes: SIZE_WARN_BYTES,
    });
  });
}

export async function POST(request: Request) {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    // 자동저장이 4초마다 도는 화면이라 넉넉히. 30분이면 정상 사용도 450회쯤 된다.
    if (!rateLimit(await deviceKey("artifact"), 400, 60_000)) {
      return fail("too_many_attempts");
    }

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");
    if (isSessionClosed(session)) {
      return fail("session_expired", "수업이 끝나서 저장할 수 없어요.");
    }

    const activity = session.activity;
    if (!activity?.activityId) return fail("not_found", "이 차시에는 그리기 활동이 없어요.");

    const body = await readJson<SaveBody>(request);
    if (!body) return fail("invalid_input");

    const artifact = await ensureArtifact({
      activityId: activity.activityId,
      studentId: me.studentId,
      classNo: session.classNo,
      year: activity.year ?? 2040,
    });

    // ---------------------------------------------------------- 그림 외 항목

    const patch: Record<string, unknown> = {};

    if (typeof body.place === "string") {
      // 목록에 없는 장소는 받지 않는다. 자유 입력이면 갤러리에 무엇이든 적어 넣을 수 있다.
      const places = activity.places ?? [];
      if (body.place && !places.includes(body.place)) {
        return fail("invalid_input", "그 장소는 목록에 없어요.");
      }
      patch.place = body.place;
    }

    if (typeof body.year === "number" && Number.isFinite(body.year)) {
      patch.year = Math.max(2026, Math.min(2200, Math.trunc(body.year)));
    }

    if (body.answers && typeof body.answers === "object") {
      const allowed = new Map((activity.worksheet ?? []).map((q) => [q.key, q]));
      const answers: Record<string, string> = { ...(artifact.answers ?? {}) };
      for (const [key, value] of Object.entries(body.answers)) {
        const question = allowed.get(key);
        // 활동지에 없는 키는 버린다 — 문서에 임의의 필드가 쌓이는 것을 막는다
        if (!question || question.kind === "traits") continue;
        answers[key] = String(value ?? "").slice(0, question.maxLength || 500);
      }
      patch.answers = answers;
    }

    if (Array.isArray(body.traits)) {
      patch.traits = body.traits.filter((trait) => typeof trait === "string" && isTrait(trait));
    }

    if (body.sources && typeof body.sources === "object") {
      patch.sources = {
        site: String(body.sources.site ?? "").slice(0, 300),
        ai: String(body.sources.ai ?? "").slice(0, 300),
      };
    }

    const hasStrokes = Array.isArray(body.strokes);
    const texts = Array.isArray(body.texts) ? normalizeTexts(body.texts) : undefined;

    // 획과 함께 온 텍스트는 아래 트랜잭션에서 같이 쓴다 — 두 번 쓰면 서로 다른 시점의
    // 상태가 섞인다. 활동지처럼 텍스트만 보내온 경우에만 여기서 처리한다.
    if (texts && !hasStrokes) patch.texts = texts;

    if (Object.keys(patch).length > 0) {
      await updateArtifact(artifact.id, patch);
    }

    // -------------------------------------------------------------- 그림

    if (!hasStrokes) {
      return ok({ size: roughSize(artifact.strokes ?? []), warn: false, rejected: false });
    }

    const rev = Number(body.rev);
    if (!Number.isFinite(rev) || rev <= 0) {
      return fail("invalid_input", "저장 순번이 없습니다.");
    }

    const result = await writeStrokes(
      artifact.id,
      {
        mode: body.mode === "replace" ? "replace" : "append",
        strokes: normalizeStrokes(body.strokes as unknown[]),
        texts,
        rev,
      },
      { warn: SIZE_WARN_BYTES, reject: SIZE_REJECT_BYTES },
    );

    return ok({
      size: result.size,
      warn: result.size > SIZE_WARN_BYTES,
      rejected: result.rejected,
      stale: result.stale,
      serverRev: result.serverRev,
      strokeCount: result.total,
    });
  });
}

/**
 * 들어온 획을 규격에 맞춘다.
 *
 * 좌표를 정수로 깎는 것이 용량에 가장 크게 듣는다. 클라이언트가 이미 단순화해서 보내지만,
 * 요청을 직접 만들어 보내면 소수점 수천 개짜리 배열이 들어올 수 있다. 서버가 다시 깎는다.
 */
function normalizeStrokes(raw: unknown[]): Stroke[] {
  const out: Stroke[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const stroke = item as { c?: unknown; w?: unknown; p?: unknown };

    if (!isValidColorIndex(stroke.c) || !isValidWidthIndex(stroke.w)) continue;
    if (!Array.isArray(stroke.p) || stroke.p.length < 2) continue;

    const points: number[] = [];
    const limit = Math.min(stroke.p.length, MAX_POINTS_PER_STROKE * 2);

    for (let i = 0; i + 1 < limit; i += 2) {
      const x = Number(stroke.p[i]);
      const y = Number(stroke.p[i + 1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      points.push(quantize(x, CANVAS_WIDTH), quantize(y, CANVAS_HEIGHT));
    }

    if (points.length >= 2) {
      out.push({ c: stroke.c as number, w: stroke.w as number, p: points });
    }
  }

  return out;
}

function normalizeTexts(raw: unknown[]): TextItem[] {
  const out: TextItem[] = [];

  // 텍스트가 수백 개 붙는 그림은 그림이 아니다. 상한을 둔다.
  for (const item of raw.slice(0, 40)) {
    if (!item || typeof item !== "object") continue;
    const text = item as { x?: unknown; y?: unknown; size?: unknown; content?: unknown };

    const content = String(text.content ?? "").trim().slice(0, 60);
    if (!content) continue;

    out.push({
      x: quantize(Number(text.x) || 0, CANVAS_WIDTH),
      y: quantize(Number(text.y) || 0, CANVAS_HEIGHT),
      size: Math.max(12, Math.min(160, Math.round(Number(text.size) || 48))),
      content,
    });
  }

  return out;
}
