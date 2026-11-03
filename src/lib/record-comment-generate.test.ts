import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCommentPrompt } from "./record-comment-core.ts";

test("프롬프트는 현재형 ~함·2줄·관찰사실·나열금지를 지시한다", () => {
  const p = buildCommentPrompt("정보 2반", "7차시 디지털 시민: 출처를 밝힘", false);
  assert.ok(p.includes("~함"));
  assert.ok(/2[^\d]*줄|두 줄|2문장|두 문장/.test(p));
  assert.ok(p.includes("나열") || p.includes("대표"));
});
test("민감 과목 프롬프트는 감정·내면 금지를 지시한다", () => {
  const p = buildCommentPrompt("마음톡톡 1기", "3차시 감정 낱말: 작성함", true);
  assert.ok(p.includes("감정") && (p.includes("쓰지") || p.includes("금지") || p.includes("않")));
});
test("프롬프트는 회사·제품명 금지와 띄어쓰기 한 칸 연결을 지시한다", () => {
  const p = buildCommentPrompt("정보 2반", "요약", false);
  assert.ok(/회사|제품|브랜드|서비스|앱/.test(p) && p.includes("일반 명칭"));
  assert.ok(p.includes("띄어쓰기") && p.includes("줄바꿈"));
});
