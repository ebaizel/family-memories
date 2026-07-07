import { test } from "node:test";
import assert from "node:assert/strict";
import { parseKidTag } from "../src/parse.js";

const kids = ["Maya", "Leo"];

test("colon prefix", () => {
  assert.deepEqual(parseKidTag("Maya: the moon is following our car", kids), {
    kidName: "Maya",
    text: "the moon is following our car",
  });
});

test("case-insensitive prefix with dash", () => {
  assert.deepEqual(parseKidTag("leo - I did it myself", kids), {
    kidName: "Leo",
    text: "I did it myself",
  });
});

test("hashtag anywhere", () => {
  assert.deepEqual(parseKidTag("splashing in puddles #maya", kids), {
    kidName: "Maya",
    text: "splashing in puddles",
  });
});

test("unknown name prefix is kept as plain text", () => {
  const result = parseKidTag("Grandma: look at this", kids);
  assert.equal(result.kidName, null);
  assert.equal(result.text, "Grandma: look at this");
});

test("no tag", () => {
  assert.deepEqual(parseKidTag("rainy day fort building", kids), {
    kidName: null,
    text: "rainy day fort building",
  });
});
