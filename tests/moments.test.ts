import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

// Point the db at a throwaway dir before importing it.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-moments-test-"));
process.env.DATA_DIR = dir;
const { addKid, addMoment, recentMoments } = await import("../src/db.js");

const maya = addKid("Maya", "2023-04-12");
const leo = addKid("Leo", "2025-11-02");

test("moment tagged with two kids appears under both filters", () => {
  const m = addMoment({ type: "quote", text: "built a fort", kidIds: [maya.id, leo.id] });
  const underMaya = recentMoments(50, maya.id);
  const underLeo = recentMoments(50, leo.id);
  assert.ok(underMaya.some((x) => x.id === m.id));
  assert.ok(underLeo.some((x) => x.id === m.id));
});

test("kids come back on the moment, oldest first", () => {
  addMoment({ type: "note", text: "beach day", kidIds: [leo.id, maya.id] });
  const [latest] = recentMoments(1);
  assert.deepEqual(latest.kids.map((k) => k.name), ["Maya", "Leo"]);
});

test("untagged moment has empty kids and misses kid filters", () => {
  const m = addMoment({ type: "note", text: "quiet sunday" });
  const [latest] = recentMoments(1);
  assert.equal(latest.id, m.id);
  assert.deepEqual(latest.kids, []);
  assert.ok(!recentMoments(50, maya.id).some((x) => x.id === m.id));
});
