import { toPublicHttpsUrl, toPublicUploadUrl } from "../appConfig";

function normalizeImageUrl(url) {
  const normalized = String(url || "").trim();
  if (!normalized) return "";
  const publicUrl = toPublicHttpsUrl(normalized);
  if (publicUrl) return publicUrl;
  if (!normalized.startsWith("/") && !normalized.includes("://")) return toPublicUploadUrl(normalized);
  return normalized;
}

function normalizeImageEntry(item) {
  if (!item) return null;
  if (typeof item === "string") {
    const url = normalizeImageUrl(item);
    if (!url) return null;
    return { url, thumbnail: url };
  }
  if (typeof item !== "object") return null;
  const url = normalizeImageUrl(item.url || item.src || item.original || item.full);
  if (!url) return null;
  const thumbnail = normalizeImageUrl(item.thumbnail || item.thumb || item.preview) || url;
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
