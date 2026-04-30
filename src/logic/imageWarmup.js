import { getAvatarWithFallback } from "./avatarFallback";
import { parseRecommendationAlbumEntries } from "./placeUtils";
import { parseImageEntries } from "./imageEntryUtils";
import { toPublicHttpsUrl } from "../appConfig";

const WARMUP_LIMIT_RECOMMENDATIONS = 6;
const WARMUP_LIMIT_COMMENTS = 10;
const WARMUP_LIMIT_COMMENT_AVATARS = 16;
const WARMUP_IMAGES_PER_ITEM = 2;
const warmedImageSet = new Set();

function normalizeUrl(url) {
  return toPublicHttpsUrl(url);
}

function parseCommentPreviewUrls(imageValue) {
  return parseImageEntries(imageValue)
    .map((entry) => entry.thumbnail || entry.url)
    .map(normalizeUrl)
    .filter(Boolean);
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
    const previewUrls = parseRecommendationAlbumEntries(item?.image_url)
      .map((entry) => entry.thumbnail || entry.url)
      .map(normalizeUrl)
      .filter(Boolean);
    previewUrls.slice(0, WARMUP_IMAGES_PER_ITEM).forEach(warmImageUrl);
  });
}

export function warmCommentImages(items) {
  const comments = Array.isArray(items) ? items : [];
  comments.slice(0, WARMUP_LIMIT_COMMENTS).forEach((item) => {
    const commentImages = parseCommentPreviewUrls(item?.image_url);
    commentImages.slice(0, WARMUP_IMAGES_PER_ITEM).forEach(warmImageUrl);
  });
}

export function warmCommentAvatars(items) {
  const comments = Array.isArray(items) ? items : [];
  comments.slice(0, WARMUP_LIMIT_COMMENT_AVATARS).forEach((item) => {
    const avatarUrl = getAvatarWithFallback(item?.avatar_url, item?.user_phone, item?.username);
    warmImageUrl(avatarUrl);
  });
}
