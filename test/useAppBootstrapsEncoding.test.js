import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/logic/useAppBootstraps.js", import.meta.url), "utf8");

test("useAppBootstraps user-facing messages stay readable", () => {
  assert.match(source, /登录态用户资料同步失败/);
  assert.match(source, /环境配置缺失/);
  assert.match(source, /用户缓存解析失败/);
  assert.doesNotMatch(source, /鐧|缂|瀹|澶|锛|歏|||/);
});
