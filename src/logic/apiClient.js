const AUTH_TOKEN_STORAGE_KEY = "haikouAuthToken";
const USER_STORAGE_KEY = "haikouUser";
export const AUTH_SESSION_EXPIRED_EVENT = "haikou:auth-session-expired";
const AUTH_PUBLIC_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/reset-password",
  "/api/sms/send",
]);
const SESSION_EXPIRED_STATUS = new Set([401, 403]);

function getRequestPath(url) {
  try {
    const baseUrl = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "http://localhost";
    return new URL(String(url), baseUrl).pathname;
  } catch {
    return String(url || "");
  }
}

function isPublicAuthRequest(url) {
  return AUTH_PUBLIC_PATHS.has(getRequestPath(url));
}

export function getAuthToken() {
  try {
    return String(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function saveAuthSession(user, token) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  if (token) localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearAuthSession() {
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

function emitAuthSessionExpired(status, url) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT, { detail: { status, url: String(url || "") } }));
}

function buildHeaders(headers) {
  const token = getAuthToken();
  const nextHeaders = new Headers(headers || {});
  if (token && !nextHeaders.has("Authorization")) nextHeaders.set("Authorization", `Bearer ${token}`);
  return nextHeaders;
}

export async function authFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: buildHeaders(options.headers),
  });
  if (SESSION_EXPIRED_STATUS.has(response.status) && getAuthToken() && !isPublicAuthRequest(url)) {
    clearAuthSession();
    emitAuthSessionExpired(response.status, url);
  }
  return response;
}
