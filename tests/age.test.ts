import { test } from "node:test";
import assert from "node:assert/strict";
import { ageAt } from "../src/age.js";

test("years and months", () => {
  assert.equal(ageAt("2023-04-12", new Date("2025-08-20T12:00:00Z")), "2y 4mo");
});

test("exact years", () => {
  assert.equal(ageAt("2023-04-12", new Date("2026-04-12T00:00:00Z")), "3y");
});

test("under a year", () => {
  assert.equal(ageAt("2026-01-15", new Date("2026-06-20T00:00:00Z")), "5mo");
});

test("newborn in days", () => {
  assert.equal(ageAt("2026-06-01", new Date("2026-06-19T00:00:00Z")), "18d");
});

test("day-of-month borrow", () => {
  // Birthday on the 30th, checked on the 5th: previous month not yet completed.
  assert.equal(ageAt("2024-01-30", new Date("2024-03-05T00:00:00Z")), "1mo");
});
