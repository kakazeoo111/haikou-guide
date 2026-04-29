import { getAvatarWithFallback } from "./avatarFallback";
import { parseRecommendationAlbum } from "./placeUtils";
import { parseImageUrls } from "./imageEntryUtils";
import { toPublicHttpsUrl } from "../appConfig";

const WARMUP_LIMIT_RECOMMENDATIONS = 6;
const WARMUP_LIMIT_COMMENTS = 10;
const WARMUP_LIMIT_COMMENT_AVATARS = 16;
const WARMUP_IMAGES_PER_ITEM = 2;
const warmedImageSet = new Set();

function normalizeUrl(url) {
  return toPublicHttpsUrl(url);
}

function parseCommentImageUrls(imageValue) {
  return parseImageUrls(imageValue).map(normalizeUrl).filter(Boolean);
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

export function warmCommentAvatars(items) {
  const comments = Array.isArray(items) ? items : [];
  comments.slice(0, WARMUP_LIMIT_COMMENT_AVATARS).forEach((item) => {
    const avatarUrl = getAvatarWithFallback(item?.avatar_url, item?.user_phone, item?.username);
    warmImageUrl(avatarUrl);
  });
}
