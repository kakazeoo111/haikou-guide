function toHttpsUrl(url) {
  const normalized = String(url || "").trim();
  if (!normalized) return "";
  if (normalized.startsWith("http://")) return normalized.replace(/^http:\/\//i, "https://");
  return normalized;
}

function normalizeImageEntry(item) {
  if (!item) return null;
  if (typeof item === "string") {
    const url = toHttpsUrl(item);
    if (!url) return null;
    return { url, thumbnail: url };
  }
  if (typeof item !== "object") return null;
  const url = toHttpsUrl(item.url || item.src || item.original || item.full);
  if (!url) return null;
  const thumbnail = toHttpsUrl(item.thumbnail || item.thumb || item.preview) || url;
  return { url, thumbnail };
}

function parseRawImageList(rawValue) {
  if (!rawValue || rawValue === "null" || rawValue === "[]") return [];
  if (Array.isArray(rawValue)) return rawValue;
  const text = String(rawValue || "").trim();
  if (!text) return [];
  if (!text.startsWith("[")) return [text];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Image list parse failed:", error);
    return [];
  }
}

export function parseImageEntries(rawValue) {
  const rawList = parseRawImageList(rawValue);
  return rawList.map(normalizeImageEntry).filter(Boolean);
}

export function parseImageUrls(rawValue) {
  return parseImageEntries(rawValue).map((item) => item.url);
}

export function parseImagePreviewUrls(rawValue) {
  return parseImageEntries(rawValue).map((item) => item.thumbnail || item.url);
}
