import { test } from "node:test";
import assert from "node:assert/strict";

import { lostSegmentAt, shouldRestore } from "./ime-guard.ts";

test("끝 글자 하나가 빠진 값을 알아본다", () => {
  assert.equal(lostSegmentAt("가나다", "가나"), 2);
  assert.equal(lostSegmentAt("가다나", "가나"), 1);
  assert.equal(lostSegmentAt("가나다", "가나다"), -1);
  assert.equal(lostSegmentAt("가나다", "가"), 1);
  assert.equal(lostSegmentAt("가나다라마", "가"), -1);
  assert.equal(lostSegmentAt("가나다", "가라"), -1);
});

const base = { prev: "가나다", cur: "가나", startedAt: 1000, endedAt: 1500, deleteKeyAt: -Infinity };

test("조합 도중 탭 이탈 뒤 취소되면 되돌린다", () => {
  assert.equal(shouldRestore({ ...base, focusChangedAt: 1450 }), true);
});

test("취소 직후 탭 이탈이 와도 되돌린다", () => {
  assert.equal(shouldRestore({ ...base, focusChangedAt: 1600 }), true);
});

test("탭 이탈과 멀리 떨어진 취소(학생이 지움)는 그대로 둔다", () => {
  assert.equal(shouldRestore({ ...base, focusChangedAt: 4000 }), false);
});

test("돌아와서 새로 시작한 조합을 지운 것은 그대로 둔다", () => {
  assert.equal(shouldRestore({ ...base, focusChangedAt: 900 }), false);
});

test("백스페이스 바로 뒤 취소는 그대로 둔다", () => {
  assert.equal(shouldRestore({ ...base, focusChangedAt: 1450, deleteKeyAt: 1400 }), false);
});

test("값이 줄지 않았으면(정상 확정) 손대지 않는다", () => {
  assert.equal(shouldRestore({ ...base, cur: "가나다", focusChangedAt: 1450 }), false);
});
