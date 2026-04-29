const DEFAULT_PUBLIC_UPLOAD_BASE_URL = "https://api.suzcore.top/uploads/";

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
  const suffix = normalized.startsWith("/uploads/") ? normalized.slice("/uploads/".length) : normalized.replace(/^\/+/, "");
  return `${PUBLIC_UPLOAD_BASE_URL}${suffix}`;
}

export function toPublicHttpsUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (normalized.startsWith("data:image/")) return normalized;
  if (normalized.startsWith("https://")) return normalized;
  if (normalized.startsWith("http://")) return normalized.replace(/^http:\/\//i, "https://");
  if (normalized.startsWith("//")) return `https:${normalized}`;
  if (normalized.startsWith("/uploads/")) return toPublicUploadUrl(normalized);
  return "";
}

export const APP_DEFAULT_COVER = {
  kind: "image",
  value: "/app-cover.jpg",
};
