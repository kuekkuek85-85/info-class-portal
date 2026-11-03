import "server-only";

import { listArtifacts, listReflections } from "./db";
import {
  buildCommentPrompt,
  capComment,
  isSensitiveSubject,
  summarizeForPrompt,
  type StudentSessionRecord,
  type SubjectScope,
} from "./record-comment-core";
import { answersOf, type Artifact, type ClassSession } from "./types";

/**
 * 세특(세부특기사항) 초안 생성: 학생 기록 수집 + Gemini 호출.
 *
 * ## 학번·이름은 AI 로 보내지 않는다
 *
 * Gemini 에 가는 것은 `summarizeForPrompt` 가 만든 요약 문자열(차시 제목·활동 이름·
 * 학생이 쓴 글)뿐이다. 학번과 이름은 이 파일에서 프롬프트에 닿지 않는다.
 *
 * ## 마음톡톡은 학생 글을 읽지 않는다
 *
 * 감정 글이 있는 과목이라 `sensitive` 요약(제목·활동 이름·작성 여부만)을 쓴다.
 * 여기서 따로 프롬프트를 만들지 않는다 — 요약을 거치는 길 하나만 둔다.
 *
 * ## 실패해도 교사는 빈칸만 본다
 *
 * Gemini 가 실패하면 예외를 던지지 않고 폴백으로 내려간다. 일반 과목은 빈 문구(교사가
 * 직접 씀), 민감 과목은 활동 사실 템플릿. 자료가 없으면 아예 부르지 않는다 — 없는
 * 활동을 지어내지 않게 하려는 것이다.
 */

/** ai-review.ts 와 같은 값. 키 하나·모델 하나를 같이 쓴다 */
const TIMEOUT_MS = 12_000;
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

/**
 * 세특 문구에 쓸 수 있는 서술형 문항 종류.
 * 점수·그림·게임·계산 결과 같은 비서술 종류는 일부러 뺀다 (allowlist).
 */
const DESCRIPTIVE_KINDS: ReadonlySet<string> = new Set([
  "text",
  "long",
  "choice",
  "multi",
  "list",
  "cloze",
]);

/** 활동 이름으로 프롬프트에 넣는 문항 라벨의 길이·개수 상한 */
const MAX_LABELS = 4;
const MAX_LABEL_CHARS = 30;

/** 민감 과목에서 Gemini 가 실패했을 때 대신 나가는 활동 사실 문구 */
const SENSITIVE_FALLBACK = "수업 활동에 성실히 참여함.";

function shortLabel(label: string): string {
  const t = label.trim().replace(/\s+/g, " ");
  return t.length > MAX_LABEL_CHARS ? `${t.slice(0, MAX_LABEL_CHARS)}…` : t;
}

/** 한 세션에서 그 학생의 기록을 모은다 */
async function recordOf(
  session: ClassSession,
  studentId: string,
  sensitive: boolean,
  artifactsOf: (activityId: string, classNo: ClassSession["classNo"]) => Promise<Artifact[]>,
): Promise<StudentSessionRecord> {
  const activity = session.activity;
  const questions = (activity?.worksheet ?? []).filter((q) => DESCRIPTIVE_KINDS.has(q.kind));

  const [reflections, artifacts] = await Promise.all([
    listReflections(session.id),
    activity?.activityId ? artifactsOf(activity.activityId, session.classNo) : Promise.resolve([]),
  ]);

  const reflectionAnswers = reflections
    .filter((r) => r.studentId === studentId)
    .flatMap((r) => answersOf(r))
    .filter((a) => a.trim().length > 0);

  const artifact = artifacts.find((a) => a.studentId === studentId);
  const worksheetAnswers = artifact
    ? questions
        .map((q) => ({ label: q.label, value: (artifact.answers?.[q.key] ?? "").trim() }))
        .filter((w) => w.value.length > 0)
    : [];

  return {
    lessonNo: session.lessonNo,
    title: session.title,
    activityLabels: questions.slice(0, MAX_LABELS).map((q) => shortLabel(q.label)),
    written: reflectionAnswers.length > 0 || worksheetAnswers.length > 0,
    // 민감 과목은 작성 여부만 남기고 학생 글은 메모리에도 들고 나가지 않는다
    reflectionAnswers: sensitive ? [] : reflectionAnswers,
    worksheetAnswers: sensitive ? [] : worksheetAnswers,
  };
}

/**
 * 이미 범위(scope)로 거른 세션들에서 한 학생의 기록을 모은다. 차시 오름차순.
 * 거르기는 호출자(sessionInScope)가 한다. scope 는 민감 과목(마음톡톡) 여부를 가르는 데만 쓴다.
 */
export async function gatherStudentRecords(
  scope: SubjectScope,
  studentId: string,
  inScopeSessions: ClassSession[],
): Promise<StudentSessionRecord[]> {
  const sensitive = isSensitiveSubject(scope);
  // 같은 활동지(activityId)를 여러 세션이 쓰면 한 번만 읽는다
  const cache = new Map<string, Promise<Artifact[]>>();
  const artifactsOf = (activityId: string, classNo: ClassSession["classNo"]) => {
    const key = `${activityId}__${classNo}`;
    let hit = cache.get(key);
    if (!hit) {
      hit = listArtifacts(activityId, classNo);
      cache.set(key, hit);
    }
    return hit;
  };

  const sessions = [...inScopeSessions].sort((a, b) => a.lessonNo - b.lessonNo);
  return Promise.all(sessions.map((s) => recordOf(s, studentId, sensitive, artifactsOf)));
}

/** Gemini 를 한 번 부른다. 던지지 않고 문구 또는 null(실패) 을 돌려준다 */
async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(text) as { comment?: unknown };
    if (typeof parsed.comment !== "string" || !parsed.comment.trim()) return null;
    return parsed.comment;
  } catch {
    // 시간 초과·네트워크·JSON 형식 오류 모두 폴백으로 내려간다
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 세특 초안 한 건을 만든다. 던지지 않는다.
 * 자료가 없으면 빈 문구(라우트가 "자료 부족" 으로 표시), AI 가 실패하면 폴백.
 */
export async function generateComment(
  scope: SubjectScope,
  records: StudentSessionRecord[],
): Promise<{ text: string; source: "ai" | "fallback" }> {
  if (records.length === 0 || records.every((r) => !r.written)) {
    return { text: "", source: "fallback" };
  }

  const sensitive = isSensitiveSubject(scope);
  const summary = summarizeForPrompt(records, sensitive);
  const comment = await callGemini(buildCommentPrompt(scope.label, summary, sensitive));

  if (comment !== null) {
    const text = capComment(comment);
    if (text) return { text, source: "ai" };
  }
  return { text: sensitive ? SENSITIVE_FALLBACK : "", source: "fallback" };
}
