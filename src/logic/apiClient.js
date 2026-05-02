const AUTH_TOKEN_STORAGE_KEY = "haikouAuthToken";
const USER_STORAGE_KEY = "haikouUser";

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

function buildHeaders(headers) {
  const token = getAuthToken();
  const nextHeaders = new Headers(headers || {});
  if (token && !nextHeaders.has("Authorization")) nextHeaders.set("Authorization", `Bearer ${token}`);
  return nextHeaders;
}

export function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: buildHeaders(options.headers),
  });
}
