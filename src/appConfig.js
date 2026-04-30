const DEFAULT_PUBLIC_UPLOAD_BASE_URL = "https://api.suzcore.top/uploads/";
const UPLOAD_PATH_PREFIX = "/uploads/";

function trimTrailingSlash(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizeUploadBaseUrl(value) {
  const normalized = String(value || "").trim();
  const httpsUrl = (normalized || DEFAULT_PUBLIC_UPLOAD_BASE_URL).replace(/^http:\/\//i, "https://");
  return httpsUrl.endsWith("/") ? httpsUrl : `${httpsUrl}/`;
}

export const AUTH_API_BASE = trimTrailingSlash(import.meta.env.VITE_AUTH_API_BASE);
export const PUBLIC_UPLOAD_BASE_URL = normalizeUploadBaseUrl(import.meta.env.VITE_PUBLIC_UPLOAD_BASE);

export function toPublicUploadUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  const suffix = normalized.startsWith(UPLOAD_PATH_PREFIX) ? normalized.slice(UPLOAD_PATH_PREFIX.length) : normalized.replace(/^\/+/, "");
  return `${PUBLIC_UPLOAD_BASE_URL}${suffix}`;
}

function toHttpsUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (normalized.startsWith("data:image/")) return normalized;
  if (normalized.startsWith("//")) return `https:${normalized}`;
  if (normalized.startsWith("http://")) return normalized.replace(/^http:\/\//i, "https://");
  return normalized;
}

function getUploadSuffix(value) {
  const normalized = toHttpsUrl(value);
  if (!normalized || normalized.startsWith("data:image/")) return "";
  if (normalized.startsWith(UPLOAD_PATH_PREFIX)) return normalized.slice(UPLOAD_PATH_PREFIX.length);
  if (!/^https?:\/\//i.test(normalized)) return "";
  try {
    const parsed = new URL(normalized);
    if (!parsed.pathname.startsWith(UPLOAD_PATH_PREFIX)) return "";
    return parsed.pathname.slice(UPLOAD_PATH_PREFIX.length);
  } catch {
    return "";
  }
}

export function toPublicHttpsUrl(value) {
  const normalized = toHttpsUrl(value);
  if (!normalized) return "";
  if (normalized.startsWith("data:image/")) return normalized;
  const uploadSuffix = getUploadSuffix(normalized);
  if (uploadSuffix) return toPublicUploadUrl(uploadSuffix);
  if (normalized.startsWith("https://")) return normalized;
  return "";
}

export function getUrlOrigin(value) {
  const normalized = toPublicHttpsUrl(value);
  if (!normalized || normalized.startsWith("data:image/")) return "";
  try {
    return new URL(normalized).origin;
  } catch {
    return "";
  }
}

export const APP_DEFAULT_COVER = {
  kind: "image",
  value: "/app-cover.jpg",
};
