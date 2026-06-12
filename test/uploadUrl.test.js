import test from "node:test";
import assert from "node:assert/strict";
import { getPublicUploadBaseUrl, toPublicHttpsUrl, toPublicUploadUrl } from "../server/uploadUrl.js";

test("getPublicUploadBaseUrl uses the default HTTPS upload base", () => {
  assert.equal(getPublicUploadBaseUrl(), "https://api.suzcore.top/uploads/");
});

test("toPublicUploadUrl builds a public upload URL from a stored filename", () => {
  assert.equal(toPublicUploadUrl("avatar.jpg"), "https://api.suzcore.top/uploads/avatar.jpg");
  assert.equal(toPublicUploadUrl(""), "");
});

test("toPublicHttpsUrl converts insecure and protocol-relative URLs to HTTPS", () => {
  assert.equal(toPublicHttpsUrl("http://api.suzcore.top/uploads/a.jpg"), "https://api.suzcore.top/uploads/a.jpg");
  assert.equal(toPublicHttpsUrl("//api.suzcore.top/uploads/a.jpg"), "https://api.suzcore.top/uploads/a.jpg");
});

test("toPublicHttpsUrl maps /uploads paths to the public upload base", () => {
  assert.equal(toPublicHttpsUrl("/uploads/a.jpg"), "https://api.suzcore.top/uploads/a.jpg");
});

test("toPublicHttpsUrl rejects non-public relative paths", () => {
  assert.equal(toPublicHttpsUrl("/private/a.jpg"), "");
  assert.equal(toPublicHttpsUrl("a.jpg"), "");
});
