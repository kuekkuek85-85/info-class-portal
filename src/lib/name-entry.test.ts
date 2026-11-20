import { test } from "node:test";
import assert from "node:assert/strict";

import { NAME_MAX, TRAINING_SEATS, nameKey, normalizeName, pickSeat, type SeatMap } from "./name-entry.ts";

function take(seats: SeatMap, raw: string) {
  const name = normalizeName(raw);
  const key = nameKey(name);
  const pick = pickSeat(seats, key);
  if (pick.kind === "new") seats[pick.seat] = { name, key, at: 0 };
  return pick;
}

test("자리 풀은 6반·7반 임시 번호 20석", () => {
  assert.equal(TRAINING_SEATS.length, 20);
  assert.equal(TRAINING_SEATS[0], "10690");
  assert.equal(TRAINING_SEATS[9], "10699");
  assert.equal(TRAINING_SEATS[10], "10790");
  assert.equal(TRAINING_SEATS[19], "10799");
});

test("이름 정규화: 앞뒤 공백 제거, 연속 공백 한 칸, 제어 문자 제거", () => {
  assert.equal(normalizeName("  김  선생  "), "김 선생");
  assert.equal(normalizeName("박\t\n교사"), "박 교사");
  assert.equal(normalizeName("이​연수"), "이 연수");
  assert.equal(normalizeName(""), "");
  assert.equal(normalizeName("   "), "");
  assert.equal(normalizeName(42), "");
});

test("이름은 최대 20자", () => {
  const long = "가".repeat(30);
  assert.equal(Array.from(normalizeName(long)).length, NAME_MAX);
});

test("세 이름은 풀 순서대로 서로 다른 자리", () => {
  const seats: SeatMap = {};
  assert.deepEqual(take(seats, "김연수"), { kind: "new", seat: "10690" });
  assert.deepEqual(take(seats, "박교사"), { kind: "new", seat: "10691" });
  assert.deepEqual(take(seats, "이참가"), { kind: "new", seat: "10692" });
});

test("같은 이름이 다시 오면 같은 자리 (공백·대소문자 차이 무시)", () => {
  const seats: SeatMap = {};
  take(seats, "김연수");
  take(seats, "Teacher Kim");
  assert.deepEqual(take(seats, "  김연수 "), { kind: "existing", seat: "10690", name: "김연수" });
  // 다시 들어올 때 적은 모양이 달라도 표시 이름은 처음 것 그대로
  assert.deepEqual(take(seats, "teacher   kim"), { kind: "existing", seat: "10691", name: "Teacher Kim" });
});

test("20석이 다 차면 full, 그래도 기존 이름은 자기 자리로 들어온다", () => {
  const seats: SeatMap = {};
  for (let i = 1; i <= 20; i += 1) assert.equal(take(seats, `참가자${i}`).kind, "new");
  assert.deepEqual(take(seats, "새로운 사람"), { kind: "full" });
  assert.deepEqual(take(seats, "참가자7"), { kind: "existing", seat: "10696", name: "참가자7" });
});

test("빈 자리가 중간에 있으면 그 자리부터 채운다", () => {
  const seats: SeatMap = { "10690": { name: "가", key: "가", at: 0 }, "10692": { name: "다", key: "다", at: 0 } };
  assert.deepEqual(pickSeat(seats, "나"), { kind: "new", seat: "10691" });
});
