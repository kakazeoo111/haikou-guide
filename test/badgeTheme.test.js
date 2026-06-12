import test from "node:test";
import assert from "node:assert/strict";
import { getBadgeEmoji, getBadgeTheme } from "../src/logic/badgeTheme.js";

test("getBadgeTheme returns a stable theme for the same seed", () => {
  const first = getBadgeTheme("13700000000-椰岛新兵");
  const second = getBadgeTheme("13700000000-椰岛新兵");

  assert.deepEqual(first, second);
  assert.equal(typeof first.background, "string");
  assert.equal(typeof first.border, "string");
  assert.equal(typeof first.textColor, "string");
  assert.equal(typeof first.shadow, "string");
});

test("getBadgeEmoji returns fallback emoji when one is provided", () => {
  assert.equal(getBadgeEmoji("any-seed", "🏅"), "🏅");
});

test("getBadgeEmoji returns a stable emoji when fallback is missing", () => {
  assert.equal(getBadgeEmoji("13700000000-探店能手"), getBadgeEmoji("13700000000-探店能手"));
  assert.equal(getBadgeEmoji("13700000000-探店能手").length > 0, true);
});
