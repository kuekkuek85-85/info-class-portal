// 세특(세부특기사항) 생성기의 순수 로직: 범위 · 비식별화 · 프롬프트 · CSV.
// node:test 에서 직접 로드되므로 server-only·firebase·fetch·next 를 import 하지 않는다.
import type { ClassNo } from "./types.ts";

export type SubjectKind = "info" | "mt" | "hai";

export interface SubjectScope {
  subjectKey: string;
  label: string;
  kind: SubjectKind;
  /** 정보(info) 전용: 해당 반 */
  classNo?: ClassNo;
  /** 선택과목(mt/hai) 전용: 포함되는 분반 열쇠 (1기만) */
  groupKeys?: string[];
  /** 포함되는 마지막 차시 번호 (정보: 22차까지) */
  maxLessonNo?: number;
}

export const SUBJECT_SCOPES: SubjectScope[] = [
  ...([1, 2, 3, 4] as const).map(
    (classNo): SubjectScope => ({
      subjectKey: `info-${classNo}`,
      label: `정보 ${classNo}반`,
      kind: "info",
      classNo,
      maxLessonNo: 22,
    }),
  ),
  {
    subjectKey: "mt-1",
    label: "마음톡톡 1기",
    kind: "mt",
    groupKeys: ["mt-tue-1", "mt-thu-1"],
  },
  {
    subjectKey: "hai-1",
    label: "진로탐색 1기",
    kind: "hai",
    groupKeys: ["hai-tue-1", "hai-thu-1"],
  },
];

export function getSubjectScope(subjectKey: string): SubjectScope | undefined {
  return SUBJECT_SCOPES.find((s) => s.subjectKey === subjectKey);
}

/** 세션이 이 과목의 세특 범위에 들어가는지. 리허설은 항상 제외. */
export function sessionInScope(
  session: { classNo: number; groupKey?: string; lessonNo: number; rehearsal?: boolean },
  scope: SubjectScope,
): boolean {
  if (session.rehearsal) return false;
  if (scope.kind === "info") {
    return (
      !session.groupKey &&
      session.classNo === scope.classNo &&
      session.lessonNo <= (scope.maxLessonNo ?? 22)
    );
  }
  return !!session.groupKey && (scope.groupKeys ?? []).includes(session.groupKey);
}

/** 마음톡톡은 감정 글이 있어 학생 글을 AI 로 보내지 않는다. */
export function isSensitiveSubject(scope: SubjectScope): boolean {
  return scope.kind === "mt";
}

export interface StudentSessionRecord {
  lessonNo: number;
  title: string;
  activityLabels: string[];
  written: boolean;
  reflectionAnswers: string[];
  worksheetAnswers: { label: string; value: string }[];
}

/** 프롬프트에 넣는 학생 글 한 덩어리의 길이 상한 */
const MAX_TEXT = 300;

function clip(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > MAX_TEXT ? `${t.slice(0, MAX_TEXT)}…` : t;
}

/**
 * 학생 한 명의 세션 기록을 프롬프트용 요약 문자열로.
 * sensitive=true 이면 제목·활동 이름·작성 여부·참여 횟수만 쓰고,
 * 학생이 쓴 글(reflectionAnswers, worksheetAnswers.value)은 읽지 않는다.
 */
export function summarizeForPrompt(records: StudentSessionRecord[], sensitive: boolean): string {
  const lines: string[] = [`참여 ${records.length}회`];
  for (const r of records) {
    const activities = r.activityLabels.length > 0 ? ` / 활동: ${r.activityLabels.join(", ")}` : "";
    lines.push(`- ${r.lessonNo}차 ${r.title}${activities} / ${r.written ? "작성함" : "미작성"}`);
    if (sensitive) continue;
    for (const a of r.reflectionAnswers) {
      if (a.trim()) lines.push(`  성찰: ${clip(a)}`);
    }
    for (const w of r.worksheetAnswers) {
      if (w.value.trim()) lines.push(`  ${w.label}: ${clip(w.value)}`);
    }
  }
  return lines.join("\n");
}

export function buildCommentPrompt(subjectLabel: string, summary: string, sensitive: boolean): string {
  const rules = [
    "교사가 학생을 관찰한 사실을 중심으로 쓴다.",
    "문장은 현재형 종결어미 '~함'으로 끝낸다. (예: 발표함, 정리함)",
    "정확히 2줄(약 2문장)로 쓴다.",
    "활동을 전부 나열하지 말고 대표 활동 위주로 쓴다.",
    "중학생 수준에 맞는 표현을 쓴다.",
  ];
  if (sensitive) {
    rules.push("학생의 감정·속마음을 쓰지 말고 활동 사실만 쓴다.");
  }
  return [
    `다음은 ${subjectLabel} 수업에서 한 학생의 활동 기록이다.`,
    "이 기록을 바탕으로 학교생활기록부 세부능력 및 특기사항 문구를 작성해라.",
    "",
    "[규칙]",
    ...rules.map((r) => `- ${r}`),
    "",
    "[활동 기록]",
    summary,
    "",
    'JSON만 출력: {"comment":"..."}',
  ].join("\n");
}

/** 상한(기본 200자)을 넘으면 마지막 '함'/문장부호 경계에서 자른다. */
export function capComment(text: string, max = 200): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const head = t.slice(0, max);
  const cut = Math.max(head.lastIndexOf("함"), head.lastIndexOf("."), head.lastIndexOf("!"), head.lastIndexOf("?"), head.lastIndexOf("。"));
  // 경계가 너무 앞이면(절반 미만) 의미가 크게 사라지므로 그냥 상한에서 자른다.
  return cut >= max / 2 ? head.slice(0, cut + 1) : head;
}

// --- CSV (api/teacher/export 의 csvCell/BOM 방식을 의도적으로 복제: 그 파일은 server 전용) ---

const BOM = "﻿";

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function recordCommentsCsv(
  rows: { subject: string; group: string; studentId: string; name: string; text: string }[],
): string {
  const lines = [["과목", "반/분반", "학번", "이름", "세특"].map(csvCell).join(",")];
  for (const r of rows) {
    lines.push([r.subject, r.group, r.studentId, r.name, r.text].map(csvCell).join(","));
  }
  return BOM + lines.join("\r\n");
}
