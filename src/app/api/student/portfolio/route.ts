import { fail, guard, ok } from "@/lib/api";
import { listAllSessions, listArtifactsByStudent, listReflectionsByStudent } from "@/lib/db";
import { readStudentSession } from "@/lib/session";
import type { Artifact, ClassSession, Stroke, TextItem, WorksheetQuestion } from "@/lib/types";

/**
 * 포트폴리오 — 학생 '본인'의 지난 회기 활동을 **회기별 아코디언**으로 모은다 (마음 톡톡 8회기 성찰).
 *
 * ## ★ 프라이버시 (이 과목 1순위)
 *
 * 철저히 **본인 것만** 모은다. 학번(me.studentId)으로만 조회하고, 친구 것은 한 건도 섞지
 * 않는다. 친구에게 나가는 경로가 아니라 자기 화면에만 뜨므로 갤러리·동료와 무관하다.
 * **AI(Gemini)로 보내는 것은 없다** — 지난 답을 그대로 읽어 보여줄 뿐이다.
 *
 * 리허설 흔적(activityId 가 __rehearsal 를 포함)과 두 번째 그림판 슬롯(activityId 에 `::` 포함,
 * 예: ::graph)은 거른다 — 전자는 교사 테스트, 후자는 인생 그래프(지난 '답'이 아니다).
 *
 * 포털 내장 그림(strokes)이 있는 통(2·3회기 힐링 스페이스)은 그 그림도 읽기 전용으로 함께 담는다.
 * (지난 산출물 대부분은 캔바·수노 같은 외부 링크라 포털에 그림이 없고, 힐링 스페이스만 내장 그림이다.)
 *
 * ## 무엇을 모으나 — 회기(활동통)별로 '본인이 쓴 답 전부'
 *
 * 특정 키를 하드코딩하지 않는다. 마음 톡톡 세션(제목에 "마음 톡톡")의 activity.worksheet 에서
 * key→label 을 읽어, 그 회기 artifact.answers 를 **일반적으로 순회**한다. 학생이 직접 쓴 답
 * (text·long·choice·multi·rows·list·cloze)만 담고, 안내(note)·AI 결과·게임·이미지 같은
 * 표시용/비서술 칸과 빈 답은 건너뛴다. 성찰(reflection) 답도 그 회기 질문과 짝지어 함께 담는다.
 *
 * 기분(mood)은 더 이상 여기서 다루지 않는다 — '마음일기'(mood-report) 단계로 옮겼다.
 * 지금 수업 중인 회기(현재 세션의 activityId)는 '지난' 돌아보기에서 제외한다.
 */

/** 학생이 직접 쓴 답만 (안내·AI·게임·이미지 칸은 제외) */
const WRITTEN_KINDS: ReadonlySet<string> = new Set([
  "text",
  "long",
  "choice",
  "multi",
  "rows",
  "list",
  "cloze",
]);

/** 한 칸에 보여줄 글자 상한 (본인 것이라 전문은 아니어도 됨) */
const MAX_VALUE = 1200;

interface PortfolioItem {
  label: string;
  value: string;
  link: boolean;
}
interface PortfolioSession {
  activityId: string;
  /** 아코디언 머리말 — "2·3회기" 같은 회기 라벨 */
  heading: string;
  /** 머리말 옆 소제목 — 그 회기의 주제 */
  subhead: string;
  /** 정렬용 (가장 이른 회기 번호) */
  lessonNo: number;
  items: PortfolioItem[];
  reflections: { question: string; answer: string }[];
  /** 포털 내장 그림(힐링 스페이스 손그림) — 읽기 전용. 없으면 null */
  drawing: { strokes: Stroke[]; texts: TextItem[]; title: string } | null;
}

/** 회기 번호 라벨 — 마음 톡톡은 lessonNo 202~208 → "2회기"~"8회기" */
function sessionLabel(lessonNo: number): string {
  return lessonNo > 200 && lessonNo < 221 ? `${lessonNo - 200}회기` : `${lessonNo}차시`;
}

/** 제목에서 "디지털 마음 톡톡 N회기 —" 머리말을 떼어 주제만 남긴다 */
function topicOf(title: string): string {
  const tail = title.split(/[—-]/).slice(1).join("-").trim();
  return tail || title.trim();
}

function looksLikeLink(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

/** 그림 제목 — 세션의 artifactTitle 틀({장소}→place)을 쓰고, 없으면 place, 그것도 없으면 "내 그림" */
function drawingTitle(groupSessions: ClassSession[], place: string): string {
  const template = String(
    groupSessions.find((s) => s.activity?.artifactTitle)?.activity?.artifactTitle ?? "",
  ).trim();
  const title = template ? template.replace(/\{장소\}/g, place || "").trim() : place.trim();
  return title || "내 그림";
}

/** 한 문항(쓴 답 종류)의 raw 답을 화면용 값으로 — 못 쓸 답이면 null */
function renderAnswer(question: WorksheetQuestion, raw: string): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  if (question.kind === "rows") {
    try {
      const rows = JSON.parse(value) as Record<string, string>[];
      if (!Array.isArray(rows)) return null;
      const lines = rows
        .map((row) =>
          (question.rowColumns ?? [])
            .map((c) => String(row?.[c.key] ?? "").trim())
            .filter(Boolean)
            .join(" · "),
        )
        .filter(Boolean);
      return lines.length ? lines.join("\n").slice(0, MAX_VALUE) : null;
    } catch {
      return null;
    }
  }

  if (question.kind === "list") {
    try {
      const items = JSON.parse(value) as string[];
      if (!Array.isArray(items)) return null;
      const lines = items.map((s) => String(s ?? "").trim()).filter(Boolean);
      return lines.length ? lines.map((s) => `· ${s}`).join("\n").slice(0, MAX_VALUE) : null;
    } catch {
      return null;
    }
  }

  if (question.kind === "cloze") {
    try {
      const parsed = JSON.parse(value) as unknown;
      const flat = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object"
          ? Object.values(parsed as Record<string, unknown>).flat()
          : [];
      const words = flat.map((s) => String(s ?? "").trim()).filter(Boolean);
      return words.length ? words.join(" · ").slice(0, MAX_VALUE) : null;
    } catch {
      return null;
    }
  }

  return value.slice(0, MAX_VALUE);
}

export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const [artifacts, reflections, sessions] = await Promise.all([
      listArtifactsByStudent(me.studentId),
      listReflectionsByStudent(me.studentId),
      listAllSessions(),
    ]);

    // 지금 수업 중인 회기(활동통)는 '지난' 돌아보기에서 뺀다
    const currentActivityId = sessions.find((s) => s.id === me.sessionId)?.activity?.activityId ?? "";

    /* ── 마음 톡톡 세션을 활동통(activityId)별로 묶는다 (한 통을 2·3회기가 나눠 쓰기도 한다) ── */
    const groups = new Map<string, ClassSession[]>();
    for (const s of sessions) {
      if (!String(s.title ?? "").includes("마음 톡톡")) continue;
      const activityId = s.activity?.activityId ?? "";
      if (!activityId) continue;
      if (activityId.includes("__rehearsal") || activityId.includes("::")) continue;
      if (activityId === currentActivityId) continue; // 지난 것만
      const list = groups.get(activityId) ?? [];
      list.push(s);
      groups.set(activityId, list);
    }

    /* ── 본인 reflection 을 sessionId 로 찾을 수 있게 모은다 (draft 든 제출이든 본인 것) ── */
    const reflectionBySession = new Map(reflections.map((r) => [r.sessionId, r]));

    const realArtifact = (activityId: string): Artifact | undefined =>
      artifacts.find((a) => a.activityId === activityId);

    const out: PortfolioSession[] = [];
    for (const [activityId, groupSessions] of groups) {
      const artifact = realArtifact(activityId);

      // 라벨용 worksheet 는 이 통을 쓴 세션들의 문항을 key 로 합친다(뒤 세션이 덮어씀)
      const questionByKey = new Map<string, WorksheetQuestion>();
      const orderedKeys: string[] = [];
      for (const s of groupSessions) {
        for (const q of s.activity?.worksheet ?? []) {
          if (!questionByKey.has(q.key)) orderedKeys.push(q.key);
          questionByKey.set(q.key, q);
        }
      }

      /* 쓴 답만, worksheet 순서대로. note(키가 `_`로 시작)·표시용·빈 답은 건너뛴다 */
      const items: PortfolioItem[] = [];
      const answers = artifact?.answers ?? {};
      for (const key of orderedKeys) {
        if (key.startsWith("_")) continue;
        const question = questionByKey.get(key);
        if (!question || !WRITTEN_KINDS.has(question.kind)) continue;
        const value = renderAnswer(question, answers[key] ?? "");
        if (!value) continue;
        items.push({ label: question.label, value, link: looksLikeLink(value) });
      }

      /* 성찰 답 — 이 통을 쓴 세션들의 본인 reflection 을 질문과 짝지어 담는다 */
      const reflectionItems: { question: string; answer: string }[] = [];
      for (const s of groupSessions) {
        const r = reflectionBySession.get(s.id);
        if (!r) continue;
        const questions = s.reflectionQuestions ?? [];
        (r.answers ?? []).forEach((ans, i) => {
          const answer = String(ans ?? "").trim();
          if (!answer) return;
          reflectionItems.push({
            question: questions[i] ?? `질문 ${i + 1}`,
            answer: answer.slice(0, MAX_VALUE),
          });
        });
      }

      /* 포털 내장 그림(힐링 스페이스 손그림) — 있으면 읽기 전용으로 함께 담는다 */
      const drawing =
        artifact && (artifact.strokes?.length ?? 0) > 0
          ? {
              strokes: artifact.strokes as Stroke[],
              texts: (artifact.texts ?? []) as TextItem[],
              title: drawingTitle(groupSessions, String(artifact.place ?? "")),
            }
          : null;

      if (items.length === 0 && reflectionItems.length === 0 && !drawing) continue;

      const lessonNos = [...new Set(groupSessions.map((s) => s.lessonNo ?? 0))].sort((a, b) => a - b);
      const heading = lessonNos.map(sessionLabel).join("·");
      // 소제목은 가장 문항이 많은(대표) 세션의 주제
      const rep = [...groupSessions].sort(
        (a, b) => (b.activity?.worksheet?.length ?? 0) - (a.activity?.worksheet?.length ?? 0),
      )[0];
      out.push({
        activityId,
        heading,
        subhead: topicOf(String(rep?.title ?? "")),
        lessonNo: lessonNos[0] ?? 0,
        items,
        reflections: reflectionItems,
        drawing,
      });
    }

    out.sort((a, b) => a.lessonNo - b.lessonNo);

    return ok({ sessions: out });
  });
}
