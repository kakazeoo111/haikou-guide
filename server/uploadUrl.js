const DEFAULT_PUBLIC_UPLOAD_BASE_URL = "https://api.suzcore.top/uploads/";

function normalizePublicUploadBase(rawBaseUrl) {
  const normalized = String(rawBaseUrl || "").trim();
  if (!normalized) return DEFAULT_PUBLIC_UPLOAD_BASE_URL;
  const httpsUrl = normalized.replace(/^http:\/\//i, "https://");
  return httpsUrl.endsWith("/") ? httpsUrl : `${httpsUrl}/`;
}

const PUBLIC_UPLOAD_BASE_URL = normalizePublicUploadBase(process.env.PUBLIC_UPLOAD_BASE_URL);

export function getPublicUploadBaseUrl() {
  return PUBLIC_UPLOAD_BASE_URL;
}

export function toPublicUploadUrl(filename) {
  const safeName = String(filename || "").trim();
  if (!safeName) return "";
  return `${PUBLIC_UPLOAD_BASE_URL}${safeName}`;
}

export function toPublicHttpsUrl(url) {
  const normalized = String(url || "").trim();
  if (!normalized) return "";
  if (normalized.startsWith("http://")) return normalized.replace(/^http:\/\//i, "https://");
  if (normalized.startsWith("https://")) return normalized;
  if (normalized.startsWith("//")) return `https:${normalized}`;
  if (normalized.startsWith("/uploads/")) {
    const suffix = normalized.slice("/uploads/".length);
    return toPublicUploadUrl(suffix);
  }
  return "";
}
