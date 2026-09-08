/**
 * 학번 규칙. 1학년, 5자리.
 *
 *   1 0 1 0 9
 *   │ └┬┘ └┬┘
 *   │  │   └─ 번호 (01~29, 30은 테스트, 임시는 90~99)
 *   │  └───── 반 (01~08)
 *   └──────── 학년 (1)
 *
 * 반이 8까지인 이유: 정보과는 1~4반만 가르치지만 선택과목에는 학년 전체에서 온다.
 * 「인간과 인공지능」 22명은 5·6·7·8반 학생이라, 4까지로 두면 로그인 자체가 안 된다.
 *
 * 명렬표에 없는 학생(전입·오류)은 그 반 + 90번대 임시 번호로 진입시킨다.
 * 수업 흐름을 끊지 않는 것이 목적이고, 실제 학번 연결은 교사가 나중에 한다. (PRD 3.1)
 *
 * **각 반 30번은 테스트 학생**이다(교사가 리허설·점검에 쓰는 고정 자리). 명렬표에
 * 올리지 않아도 들어오도록, 90번대 임시 번호와 똑같이 명렬표 조회 없이 통과시킨다.
 * 실수업 정원은 29번까지라 진짜 학생과 겹치지 않는다.
 */

import type { ClassNo } from "./types";

export const STUDENT_ID_LENGTH = 5;
export const GRADE = 1;
export const MAX_CLASS_NO = 8;
/** 한 반 실제 정원 상한. 30번은 테스트 자리라 진짜 학생은 29번까지 받는다. */
export const MAX_STUDENT_NUMBER = 29;
/** 각 반 30번은 교사 테스트 학생. 명렬표 없이 임시처럼 통과시킨다. */
export const TEST_NUMBER = 30;
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

  // 1~29는 정상 번호, 30은 테스트, 90~99는 임시. 그 사이(31~89)는 오타로 보고 거부한다.
  // 테스트(30)와 임시(90~)는 명렬표 조회 없이 통과시키므로 함께 temporary 로 묶는다.
  const temporary = number >= TEMPORARY_NUMBER_MIN || number === TEST_NUMBER;
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
