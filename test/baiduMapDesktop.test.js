import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/BaiduMap.jsx", import.meta.url), "utf8");

test("BaiduMap allows desktop map rendering", () => {
  assert.doesNotMatch(source, /if\s*\(!isMobile\)\s*\{[\s\S]*?FALLBACK_DESKTOP[\s\S]*?return;[\s\S]*?\}/);
});
