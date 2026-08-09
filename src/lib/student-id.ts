/**
 * 학번 규칙. 1학년 1~4반, 5자리.
 *
 *   1 0 1 0 9
 *   │ └┬┘ └┬┘
 *   │  │   └─ 번호 (01~28, 임시는 91~99)
 *   │  └───── 반 (01~04)
 *   └──────── 학년 (1)
 *
 * 명렬표에 없는 학생(전입·오류)은 그 반 + 90번대 임시 번호로 진입시킨다.
 * 수업 흐름을 끊지 않는 것이 목적이고, 실제 학번 연결은 교사가 나중에 한다. (PRD 3.1)
 */

import type { ClassNo } from "./types";

export const STUDENT_ID_LENGTH = 5;
export const GRADE = 1;
export const MAX_CLASS_NO = 4;
/** 한 반 정원 상한. 실제는 28명이지만 전입 여유로 30까지 받는다. */
export const MAX_STUDENT_NUMBER = 30;
/** 이 번호 이상은 임시 번호로 취급한다 (90번대) */
export const TEMPORARY_NUMBER_MIN = 90;

export interface ParsedStudentId {
  studentId: string;
  grade: number;
  classNo: ClassNo;
  number: number;
  temporary: boolean;
}

/** 형식·범위가 맞으면 파싱 결과, 아니면 null */
export function parseStudentId(raw: string): ParsedStudentId | null {
  const value = raw.trim();
  if (!/^\d{5}$/.test(value)) return null;

  const grade = Number(value.slice(0, 1));
  const classNo = Number(value.slice(1, 3));
  const number = Number(value.slice(3, 5));

  if (grade !== GRADE) return null;
  if (classNo < 1 || classNo > MAX_CLASS_NO) return null;

  // 1~30은 정상 번호, 90~99는 임시 번호. 그 사이(31~89)는 오타로 보고 거부한다.
  const temporary = number >= TEMPORARY_NUMBER_MIN;
  if (!temporary && (number < 1 || number > MAX_STUDENT_NUMBER)) return null;

  return {
    studentId: value,
    grade,
    classNo: classNo as ClassNo,
    number,
    temporary,
  };
}

/** 반 번호만 뽑는다. 코드에 묶인 반과 대조하는 용도. */
export function classNoOf(studentId: string): ClassNo | null {
  return parseStudentId(studentId)?.classNo ?? null;
}

export function formatStudentId(classNo: number, number: number): string {
  return `${GRADE}${String(classNo).padStart(2, "0")}${String(number).padStart(2, "0")}`;
}

/** "1학년 2반 9번" */
export function describeStudentId(studentId: string): string {
  const parsed = parseStudentId(studentId);
  if (!parsed) return studentId;
  return `${parsed.grade}학년 ${parsed.classNo}반 ${parsed.number}번`;
}
