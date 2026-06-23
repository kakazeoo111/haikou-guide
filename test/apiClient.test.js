import test from "node:test";
import assert from "node:assert/strict";
import { authFetch, getAuthToken, saveAuthSession } from "../src/logic/apiClient.js";

const AUTH_SESSION_EXPIRED_EVENT = "haikou:auth-session-expired";
const AUTH_TOKEN_STORAGE_KEY = "haikouAuthToken";
const USER_STORAGE_KEY = "haikouUser";

function installBrowserEnvironment() {
  const values = new Map();
  globalThis.window = new EventTarget();
  globalThis.localStorage = {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
  };
}

test("authFetch clears cached auth and emits an event when protected API returns unauthorized", async (t) => {
  installBrowserEnvironment();
  saveAuthSession({ phone: "13707584213", username: "tester" }, "old-token");
  const expiredEvents = [];
  const onExpired = (event) => expiredEvents.push(event.detail);
  globalThis.window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, onExpired);
  t.after(() => globalThis.window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, onExpired));
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(options.headers.get("Authorization"), "Bearer old-token");
    return new Response(JSON.stringify({ ok: false, message: "login expired" }), { status: 401 });
  });

  const response = await authFetch("https://api.suzcore.top/api/favorites/13707584213");

  assert.equal(response.status, 401);
  assert.equal(getAuthToken(), "");
  assert.equal(localStorage.getItem(USER_STORAGE_KEY), null);
  assert.equal(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY), null);
  assert.deepEqual(expiredEvents, [{ status: 401, url: "https://api.suzcore.top/api/favorites/13707584213" }]);
});

test("authFetch does not clear auth when login returns unauthorized credentials", async (t) => {
  installBrowserEnvironment();
  saveAuthSession({ phone: "13707584213", username: "tester" }, "old-token");
  const expiredEvents = [];
  const onExpired = (event) => expiredEvents.push(event.detail);
  globalThis.window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, onExpired);
  t.after(() => globalThis.window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, onExpired));
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ ok: false, message: "bad password" }), { status: 401 }));

  const response = await authFetch("https://api.suzcore.top/api/auth/login", { method: "POST" });

  assert.equal(response.status, 401);
  assert.equal(getAuthToken(), "old-token");
  assert.deepEqual(expiredEvents, []);
});
