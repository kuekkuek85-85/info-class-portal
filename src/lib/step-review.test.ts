import { test } from "node:test";
import assert from "node:assert/strict";

import { reviewRound } from "./step-review.ts";

test("차수가 저장돼 있으면 그대로", () => {
  assert.equal(reviewRound({ count: 3, requestedAt: 100 }), 3);
});

test("요청이 없으면 0", () => {
  assert.equal(reviewRound({}), 0);
  assert.equal(reviewRound({ count: 0, requestedAt: null }), 0);
});

test("옛 기록: 요청만 있으면 1차", () => {
  assert.equal(reviewRound({ requestedAt: 100 }), 1);
});

test("옛 기록: 요청에 답이 왔고 아직 다시 요청 안 했으면 1차", () => {
  assert.equal(reviewRound({ requestedAt: 100, reviewedAt: 150, feedbackForRequestAt: 100 }), 1);
});

test("옛 기록: 답을 받은 뒤 다시 요청했으면 2차 (답 시각 또는 답이 가리킨 요청이 지금 요청보다 이르다)", () => {
  assert.equal(reviewRound({ requestedAt: 200, reviewedAt: 150 }), 2);
  assert.equal(reviewRound({ requestedAt: 200, feedbackForRequestAt: 100 }), 2);
});

test("학생 재요청: 옛 2차 학생이 다시 요청하면 다음은 3차 (before 2 + 1)", () => {
  const before = reviewRound({ requestedAt: 200, reviewedAt: 150, feedbackForRequestAt: 100 });
  assert.equal(before + 1, 3);
});
