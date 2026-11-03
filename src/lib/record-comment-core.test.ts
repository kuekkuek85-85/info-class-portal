import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sessionInScope, getSubjectScope, summarizeForPrompt, recordCommentsCsv, capComment,
} from "./record-comment-core.ts";

test("정보: 22차 포함, 23차(마이크로비트) 제외", () => {
  const info = getSubjectScope("info-2")!;
  assert.equal(sessionInScope({ classNo: 2, lessonNo: 22 }, info), true);
  assert.equal(sessionInScope({ classNo: 2, lessonNo: 23 }, info), false);
});
test("정보: 다른 반·리허설·분반세션 제외", () => {
  const info = getSubjectScope("info-2")!;
  assert.equal(sessionInScope({ classNo: 3, lessonNo: 10 }, info), false);
  assert.equal(sessionInScope({ classNo: 2, lessonNo: 10, rehearsal: true }, info), false);
  assert.equal(sessionInScope({ classNo: 2, lessonNo: 10, groupKey: "mt-tue-1" }, info), false);
});
test("마음톡톡 1기: 1기 groupKey만, 2기 제외", () => {
  const mt = getSubjectScope("mt-1")!;
  assert.equal(sessionInScope({ classNo: 5, lessonNo: 4, groupKey: "mt-tue-1" }, mt), true);
  assert.equal(sessionInScope({ classNo: 5, lessonNo: 4, groupKey: "mt-tue-2" }, mt), false);
});
test("MT 요약(sensitive)엔 학생 글이 없다", () => {
  const recs = [{
    lessonNo: 3, title: "감정 낱말", activityLabels: ["마음일기"], written: true,
    reflectionAnswers: ["오늘 너무 슬펐다 비밀글"],
    worksheetAnswers: [{ label: "경험", value: "친구와 싸워서 화가 났다" }],
  }];
  const out = summarizeForPrompt(recs, true);
  assert.ok(!out.includes("슬펐다"));
  assert.ok(!out.includes("싸워서"));
  assert.ok(out.includes("감정 낱말"));
});
test("정보 요약(non-sensitive)엔 성찰 텍스트가 들어간다", () => {
  const recs = [{
    lessonNo: 7, title: "디지털 시민", activityLabels: [], written: true,
    reflectionAnswers: ["출처를 밝히는 것이 중요하다고 느꼈다"], worksheetAnswers: [],
  }];
  assert.ok(summarizeForPrompt(recs, false).includes("출처를 밝히는"));
});
test("CSV: BOM·헤더·쉼표/줄바꿈/따옴표 이스케이프", () => {
  const csv = recordCommentsCsv([{ subject: "정보 2반", group: "2반", studentId: "10203", name: "홍길동", text: '발표함, 그리고 "정리"함\n잘함' }]);
  assert.ok(csv.startsWith("﻿"));
  assert.ok(csv.includes("과목,반/분반,학번,이름,세특"));
  assert.ok(csv.includes('"발표함, 그리고 ""정리""함\n잘함"'));
});
test("capComment: 200자 상한", () => {
  assert.ok(capComment("가".repeat(400)).length <= 200);
});
