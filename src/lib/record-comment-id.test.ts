import { test } from "node:test";
import assert from "node:assert/strict";
import { recordCommentId } from "./record-comment-id.ts";

test("doc id는 round·subject·학번을 합친다", () => {
  assert.equal(recordCommentId("1", "info-2", "10203"), "1__info-2__10203");
});
test("회차가 다르면 id가 다르다 (2차가 1차를 안 덮음)", () => {
  assert.notEqual(recordCommentId("1", "mt-1", "10203"), recordCommentId("2", "mt-1", "10203"));
});
