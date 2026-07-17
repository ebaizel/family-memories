import { test } from "node:test";
import assert from "node:assert/strict";
import { parseKidTags } from "../src/parse.js";

const kids = ["Maya", "Leo"];

test("colon prefix, single kid", () => {
  assert.deepEqual(parseKidTags("Maya: the moon is following our car", kids), {
    kidNames: ["Maya"],
    text: "the moon is following our car",
  });
});

test("case-insensitive prefix with spaced dash", () => {
  assert.deepEqual(parseKidTags("leo - I did it myself", kids), {
    kidNames: ["Leo"],
    text: "I did it myself",
  });
});

test("plus prefix tags both kids", () => {
  assert.deepEqual(parseKidTags("Maya + Leo: built a fort", kids), {
    kidNames: ["Maya", "Leo"],
    text: "built a fort",
  });
});

test("'and' prefix tags both kids", () => {
  assert.deepEqual(parseKidTags("maya and leo - dance party in the kitchen", kids), {
    kidNames: ["Maya", "Leo"],
    text: "dance party in the kitchen",
  });
});

test("comma and ampersand separators work", () => {
  assert.deepEqual(parseKidTags("Leo, Maya: bath chaos", kids).kidNames, ["Leo", "Maya"]);
  assert.deepEqual(parseKidTags("Leo & Maya: bath chaos", kids).kidNames, ["Leo", "Maya"]);
});

test("duplicate names collapse", () => {
  assert.deepEqual(parseKidTags("Maya + maya: echo", kids).kidNames, ["Maya"]);
});

test("multiple hashtags anywhere", () => {
  assert.deepEqual(parseKidTags("splashing in puddles #maya #leo", kids), {
    kidNames: ["Maya", "Leo"],
    text: "splashing in puddles",
  });
});

test("prefix with an unknown name stays plain text", () => {
  const result = parseKidTags("Grandma: look at this", kids);
  assert.deepEqual(result.kidNames, []);
  assert.equal(result.text, "Grandma: look at this");
});

test("mixed known+unknown prefix stays plain text", () => {
  const result = parseKidTags("Maya and Grandma: baking day", kids);
  assert.deepEqual(result.kidNames, []);
  assert.equal(result.text, "Maya and Grandma: baking day");
});

test("no tag", () => {
  assert.deepEqual(parseKidTags("rainy day fort building", kids), {
    kidNames: [],
    text: "rainy day fort building",
  });
});
