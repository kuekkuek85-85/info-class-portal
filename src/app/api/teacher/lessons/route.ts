import { fail, guard, ok, readJson } from "@/lib/api";
import {
  createLessonPlan,
  deleteLessonPlan,
  getLessonPlan,
  listLessonPlans,
  syncScheduledSessions,
  updateLessonPlan,
} from "@/lib/db";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import { emptyPhaseContent, type LessonPlan, type PhaseContent } from "@/lib/types";

/**
 * 차시 계획(lesson_plans) 관리.
 *
 * 반과 무관한 수업 내용이다. 4반이 같은 진도를 나가므로 한 번 등록하면 네 반 세션에
 * 공용으로 적용된다. 세션 생성 시점에 스냅샷으로 복사되므로, 여기를 고쳐도 이미 시작된
 * 세션의 기록은 바뀌지 않는다 (PRD 5.1).
 */

export async function GET() {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const plans = await listLessonPlans();
    return ok({ plans });
  });
}

type LessonInput = Partial<Omit<LessonPlan, "id" | "createdAt" | "updatedAt">>;

function normalizeContent(value: Partial<PhaseContent> | undefined): PhaseContent {
  if (!value) return emptyPhaseContent();

  const content: PhaseContent = {
    heading: (value.heading ?? "").trim().slice(0, 200),
    body: (value.body ?? "").trim().slice(0, 4000),
    url: (value.url ?? "").trim().slice(0, 1000),
  };

  // 구조화된 블록은 그대로 보존한다. 여기서 떨어뜨리면 차시를 한 번 저장할 때마다
  // 카드·탭이 조용히 사라져 텍스트만 남는다.
  if (Array.isArray(value.cards) && value.cards.length > 0) {
    content.cards = value.cards.map((card) => ({
      badge: String(card?.badge ?? "").slice(0, 40),
      title: String(card?.title ?? "").slice(0, 120),
      note: String(card?.note ?? "").slice(0, 60),
      lines: (Array.isArray(card?.lines) ? card.lines : []).map((line) =>
        String(line).slice(0, 300),
      ),
    }));
  }

  if (Array.isArray(value.tabs) && value.tabs.length > 0) {
    content.tabs = value.tabs.map((tab) => ({
      label: String(tab?.label ?? "").slice(0, 40),
      subtitle: String(tab?.subtitle ?? "").slice(0, 120),
      note: String(tab?.note ?? "").slice(0, 60),
      rows: (Array.isArray(tab?.rows) ? tab.rows : []).map((row) => ({
        label: String(row?.label ?? "").slice(0, 60),
        value: String(row?.value ?? "").slice(0, 1000),
      })),
      highlights: (Array.isArray(tab?.highlights) ? tab.highlights : []).map((line) =>
        String(line).slice(0, 500),
      ),
    }));
  }

  return content;
}

function normalize(body: LessonInput) {
  return {
    lessonNo: Number(body.lessonNo),
    title: (body.title ?? "").trim(),
    moodCheckEnabled: body.moodCheckEnabled !== false,
    game: normalizeContent(body.game),
    gameExplainer: normalizeContent(body.gameExplainer),
    progress: normalizeContent(body.progress),
    assessment: normalizeContent(body.assessment),
    video: normalizeContent(body.video),
    // 빈 질문은 버린다. 학생 화면에 빈 입력칸이 생기면 뭘 쓰라는 건지 알 수 없다.
    reflectionQuestions: (Array.isArray(body.reflectionQuestions) ? body.reflectionQuestions : [])
      .map((question) => String(question).trim().slice(0, 500))
      .filter(Boolean),
    reflectionPublic: body.reflectionPublic === true,
  };
}

export async function POST(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<LessonInput>(request);
    if (!body) return fail("invalid_input");

    const input = normalize(body);
    if (!Number.isFinite(input.lessonNo) || input.lessonNo < 1) {
      return fail("invalid_input", "차시 번호를 입력해 주세요.");
    }
    if (!input.title) return fail("invalid_input", "차시 제목을 입력해 주세요.");

    const plan = await createLessonPlan(input);
    return ok({ plan });
  });
}

export async function PATCH(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<LessonInput & { id?: string }>(request);
    if (!body?.id) return fail("invalid_input");

    const existing = await getLessonPlan(body.id);
    if (!existing) return fail("not_found");

    /*
     * 퀴즈·활동은 편집기에 입력 UI 가 없다(시드 스크립트로 등록). 화면이 보내오지 않는
     * 필드라서, 저장할 때마다 명시적으로 되살려 주지 않으면 조용히 지워진다.
     * merge 저장이라 지금은 살아남지만, 그건 우연히 그런 것이지 의도한 보호가 아니다.
     */
    const input = {
      ...normalize({ ...existing, ...body }),
      quiz: existing.quiz,
      activity: existing.activity,
    };
    await updateLessonPlan(body.id, input);

    // 아직 시작하지 않은 세션에만 반영한다. 끝난 세션은 그날 실제로 쓴 내용을 그대로 보존한다.
    const synced = await syncScheduledSessions({ ...existing, ...input });

    return ok({ synced });
  });
}

export async function DELETE(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return fail("invalid_input");

    await deleteLessonPlan(id);
    return ok();
  });
}
