import { fail, guard, ok, readJson } from "@/lib/api";
import { deleteStudent, linkTemporaryStudent, listStudents, upsertStudents } from "@/lib/db";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";
import { parseStudentId } from "@/lib/student-id";
import type { ClassNo, Student } from "@/lib/types";

export async function GET() {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const students = await listStudents();
    return ok({ students });
  });
}

/**
 * 명렬표 업로드. CSV 한 줄이 `학번,이름` 형식이다 (헤더 있어도 되고 없어도 됨).
 * 기존 학생은 덮어쓰고, CSV에 없는 기존 학생은 건드리지 않는다 — 실수로 올린 부분 파일이
 * 명렬표 전체를 날리는 사고를 막는다. 지우려면 개별 삭제를 쓴다.
 */
export async function POST(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<{ csv?: string }>(request);
    if (!body?.csv?.trim()) return fail("invalid_input", "CSV 내용이 비어 있습니다.");

    const rows: Omit<Student, "createdAt">[] = [];
    const errors: string[] = [];

    body.csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line, index) => {
        const [rawId, ...rest] = line.split(",");
        const studentId = rawId?.trim() ?? "";
        const name = rest.join(",").trim();

        // 헤더 줄로 보이면 조용히 건너뛴다
        if (!/^\d/.test(studentId)) {
          if (index === 0) return;
          errors.push(`${index + 1}행: 학번이 숫자가 아닙니다 (${line})`);
          return;
        }

        const parsed = parseStudentId(studentId);
        if (!parsed) {
          errors.push(`${index + 1}행: 학번 형식이 올바르지 않습니다 (${studentId})`);
          return;
        }
        if (!name) {
          errors.push(`${index + 1}행: 이름이 비어 있습니다 (${studentId})`);
          return;
        }

        rows.push({
          studentId: parsed.studentId,
          name,
          classNo: parsed.classNo,
          number: parsed.number,
          temporary: parsed.temporary,
        });
      });

    if (rows.length === 0) {
      return fail("invalid_input", `등록할 수 있는 줄이 없습니다. ${errors.slice(0, 3).join(" / ")}`);
    }

    const written = await upsertStudents(rows);
    return ok({ written, errors });
  });
}

/** 임시 번호로 들어온 학생을 실제 학번에 연결하거나, 이름을 고친다. */
export async function PATCH(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<{
      studentId?: string;
      name?: string;
      linkedStudentId?: string;
    }>(request);

    const parsed = parseStudentId(body?.studentId ?? "");
    if (!parsed) return fail("invalid_input");

    if (body?.linkedStudentId) {
      const target = parseStudentId(body.linkedStudentId);
      if (!target) return fail("invalid_input", "연결할 학번 형식이 올바르지 않습니다.");
      await linkTemporaryStudent(parsed.studentId, target.studentId);
    }

    if (typeof body?.name === "string") {
      await upsertStudents([
        {
          studentId: parsed.studentId,
          name: body.name.trim(),
          classNo: parsed.classNo as ClassNo,
          number: parsed.number,
          temporary: parsed.temporary,
        },
      ]);
    }

    return ok();
  });
}

export async function DELETE(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const studentId = new URL(request.url).searchParams.get("studentId") ?? "";
    if (!parseStudentId(studentId)) return fail("invalid_input");

    await deleteStudent(studentId);
    return ok();
  });
}
