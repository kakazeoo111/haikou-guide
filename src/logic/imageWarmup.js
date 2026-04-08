import { parseRecommendationAlbum } from "./placeUtils";

const WARMUP_LIMIT_RECOMMENDATIONS = 6;
const WARMUP_LIMIT_COMMENTS = 10;
const WARMUP_IMAGES_PER_ITEM = 2;
const warmedImageSet = new Set();

function normalizeUrl(url) {
  const normalized = String(url || "").trim();
  if (!normalized) return "";
  if (normalized.startsWith("/uploads/")) return `https://api.suzcore.top${normalized}`;
  return normalized.replace(/^http:\/\//i, "https://");
}

function parseCommentImageUrls(imageValue) {
  if (!imageValue || imageValue === "null" || imageValue === "[]") return [];
  if (Array.isArray(imageValue)) return imageValue.map(normalizeUrl).filter(Boolean);
  const normalized = String(imageValue || "").trim();
  if (!normalized) return [];
  if (!normalized.startsWith("[")) return [normalizeUrl(normalized)].filter(Boolean);
  try {
    const parsed = JSON.parse(normalized);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeUrl).filter(Boolean);
  } catch (error) {
    console.error("评论图片预热解析失败:", error);
    return [];
  }
}

function warmImageUrl(url) {
  const finalUrl = normalizeUrl(url);
  if (!finalUrl || warmedImageSet.has(finalUrl)) return;
  warmedImageSet.add(finalUrl);
  const image = new Image();
  image.decoding = "async";
  image.loading = "eager";
  image.fetchPriority = "low";
  image.src = finalUrl;
}

export function warmRecommendationImages(items) {
  const recommendations = Array.isArray(items) ? items : [];
  recommendations.slice(0, WARMUP_LIMIT_RECOMMENDATIONS).forEach((item) => {
    const album = parseRecommendationAlbum(item?.image_url);
    album.slice(0, WARMUP_IMAGES_PER_ITEM).forEach(warmImageUrl);
  });
}

export function warmCommentImages(items) {
  const comments = Array.isArray(items) ? items : [];
  comments.slice(0, WARMUP_LIMIT_COMMENTS).forEach((item) => {
    const commentImages = parseCommentImageUrls(item?.image_url);
    commentImages.slice(0, WARMUP_IMAGES_PER_ITEM).forEach(warmImageUrl);
  });
}
