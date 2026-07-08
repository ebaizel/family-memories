import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

// Point the db at a throwaway dir before importing it.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-test-"));
process.env.DATA_DIR = dir;
const { createInvite, findInvite, revokeInvite, inviteUsable } = await import("../src/db.js");

test("fresh invite with no expiry is usable", () => {
  const inv = createInvite("tok-fresh", "Grandma", null);
  assert.equal(inviteUsable(inv), true);
  assert.equal(findInvite("tok-fresh")?.label, "Grandma");
});

test("unknown token is not found", () => {
  assert.equal(findInvite("nope"), undefined);
});

test("expired invite is not usable", () => {
  const past = new Date(Date.now() - 1000).toISOString().slice(0, 19) + "Z";
  const inv = createInvite("tok-expired", "Party guests", past);
  assert.equal(inviteUsable(inv), false);
});

test("future expiry is usable until it passes", () => {
  const future = new Date(Date.now() + 60_000).toISOString().slice(0, 19) + "Z";
  const inv = createInvite("tok-future", "Uncle Bob", future);
  assert.equal(inviteUsable(inv), true);
  assert.equal(inviteUsable(inv, new Date(Date.now() + 120_000)), false);
});

test("revoked invite is not usable", () => {
  const inv = createInvite("tok-revoked", "Old sitter", null);
  revokeInvite(inv.id);
  assert.equal(inviteUsable(findInvite("tok-revoked")!), false);
});
