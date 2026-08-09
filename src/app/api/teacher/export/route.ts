import { fail, guard } from "@/lib/api";
import { formatTimeKST } from "@/lib/datetime";
import { db } from "@/lib/firebase-admin";
import { COLLECTIONS, listAllSessions, listStudents } from "@/lib/db";
import { getMood } from "@/lib/mood";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import type { Attendance, MoodEntry, Reflection } from "@/lib/types";

/**
 * CSV 내보내기 (PRD 5.2).
 *
 * 무료 티어에는 자동 백업이 없으므로 주 1회 내보내기를 운영 습관으로 삼는다.
 * 학기말 일괄 삭제 전에도 필요한 기록을 먼저 빼둔다.
 */

/** 엑셀이 한글을 깨뜨리지 않도록 BOM을 붙인다. */
const BOM = "﻿";

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return BOM + lines.join("\r\n");
}

function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const type = new URL(request.url).searchParams.get("type") ?? "reflections";

    const [students, sessions] = await Promise.all([listStudents(), listAllSessions()]);
    const nameOf = new Map(students.map((s) => [s.studentId, s.name]));
    const sessionById = new Map(sessions.map((s) => [s.id, s]));

    if (type === "students") {
      return csvResponse(
        "students.csv",
        toCsv(
          ["학번", "이름", "반", "번호", "임시", "연결된학번"],
          students.map((s) => [
            s.studentId,
            s.name,
            s.classNo,
            s.number,
            s.temporary ? "Y" : "",
            s.linkedStudentId ?? "",
          ]),
        ),
      );
    }

    if (type === "attendance") {
      const snap = await db().collection(COLLECTIONS.attendance).get();
      const rows = snap.docs
        .map((doc) => doc.data() as Attendance)
        .sort((a, b) => a.date.localeCompare(b.date) || a.joinedAt - b.joinedAt)
        .map((row) => {
          const session = sessionById.get(row.sessionId);
          return [
            row.date,
            session?.period ?? "",
            row.classNo,
            row.studentId,
            nameOf.get(row.studentId) ?? "",
            formatTimeKST(row.joinedAt),
          ];
        });
      return csvResponse(
        "attendance.csv",
        toCsv(["날짜", "교시", "반", "학번", "이름", "접속시각"], rows),
      );
    }

    if (type === "moods") {
      const snap = await db().collection(COLLECTIONS.moodEntries).get();
      const rows = snap.docs
        .map((doc) => doc.data() as MoodEntry)
        .sort((a, b) => a.date.localeCompare(b.date) || a.studentId.localeCompare(b.studentId))
        .map((row) => {
          const session = sessionById.get(row.sessionId);
          return [
            row.date,
            session?.lessonNo ?? "",
            row.classNo,
            row.studentId,
            nameOf.get(row.studentId) ?? "",
            getMood(row.mood)?.label ?? row.mood,
            row.valence,
            row.arousal,
            row.reason,
          ];
        });
      return csvResponse(
        "moods.csv",
        toCsv(
          ["날짜", "차시", "반", "학번", "이름", "감정", "쾌불쾌", "활성도", "이유"],
          rows,
        ),
      );
    }

    if (type === "reflections") {
      const snap = await db().collection(COLLECTIONS.reflections).get();
      const rows = snap.docs
        .map((doc) => doc.data() as Reflection)
        .filter((row) => row.content.trim())
        .sort((a, b) => a.date.localeCompare(b.date) || a.studentId.localeCompare(b.studentId))
        .map((row) => {
          const session = sessionById.get(row.sessionId);
          return [
            row.date,
            session?.lessonNo ?? "",
            session?.title ?? "",
            row.classNo,
            row.studentId,
            nameOf.get(row.studentId) ?? "",
            session?.reflectionQuestion ?? "",
            row.content,
          ];
        });
      return csvResponse(
        "reflections.csv",
        toCsv(
          ["날짜", "차시", "제목", "반", "학번", "이름", "질문", "성찰"],
          rows,
        ),
      );
    }

    return fail("invalid_input", "type 은 reflections | moods | attendance | students 중 하나입니다.");
  });
}
