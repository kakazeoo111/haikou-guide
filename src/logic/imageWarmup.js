import { getAvatarWithFallback } from "./avatarFallback";
import { parseRecommendationAlbumEntries } from "./placeUtils";
import { parseImageEntries } from "./imageEntryUtils";
import { toPublicHttpsUrl } from "../appConfig";

const WARMUP_LIMIT_RECOMMENDATIONS = 8;
const WARMUP_LIMIT_COMMENTS = 16;
const WARMUP_LIMIT_COMMENT_AVATARS = 24;
const WARMUP_IMAGES_PER_ITEM = 3;
const WARMUP_CONCURRENCY = 4;
const WARMUP_IDLE_TIMEOUT_MS = 500;
const WARMUP_IMAGE_TIMEOUT_MS = 10000;
const warmedImageSet = new Set();
const warmupQueue = [];
let activeWarmups = 0;
let warmupScheduled = false;

function normalizeUrl(url) {
  return toPublicHttpsUrl(url);
}

function parseCommentPreviewUrls(imageValue) {
  return parseImageEntries(imageValue)
    .map((entry) => entry.thumbnail || entry.url)
    .map(normalizeUrl)
    .filter(Boolean);
}

function scheduleWarmupTask(task) {
  if (typeof window === "undefined" || warmupScheduled) return;
  warmupScheduled = true;
  const runTask = () => {
    warmupScheduled = false;
    task();
  };
  const userAgent = navigator.userAgent || "";
  const isMobileWebView = /Android|iP(?:hone|ad|od)|MicroMessenger/i.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isMobileWebView && typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(runTask, { timeout: WARMUP_IDLE_TIMEOUT_MS });
    return;
  }
  window.setTimeout(runTask, isMobileWebView ? 60 : 180);
}

function runNextWarmup() {
  while (activeWarmups < WARMUP_CONCURRENCY && warmupQueue.length > 0) {
    const finalUrl = warmupQueue.shift();
    activeWarmups += 1;
    const image = new Image();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeoutId);
      activeWarmups -= 1;
      runNextWarmup();
    };
    const timeoutId = window.setTimeout(finish, WARMUP_IMAGE_TIMEOUT_MS);
    image.decoding = "async";
    image.loading = "eager";
    image.fetchPriority = "high";
    image.onload = finish;
    image.onerror = finish;
    image.src = finalUrl;
  }
}

function enqueueWarmImage(finalUrl) {
  warmupQueue.push(finalUrl);
  scheduleWarmupTask(runNextWarmup);
}

function warmImageUrl(url) {
  const finalUrl = normalizeUrl(url);
  if (!finalUrl || warmedImageSet.has(finalUrl)) return;
  warmedImageSet.add(finalUrl);
  enqueueWarmImage(finalUrl);
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

export function warmForumPostImages(items) {
  const posts = Array.isArray(items) ? items : [];
  posts.slice(0, WARMUP_LIMIT_RECOMMENDATIONS).forEach((item) => {
    const postImages = parseCommentPreviewUrls(item?.image_url);
    postImages.slice(0, WARMUP_IMAGES_PER_ITEM).forEach(warmImageUrl);
  });
}

export function warmCommentAvatars(items) {
  const comments = Array.isArray(items) ? items : [];
  comments.slice(0, WARMUP_LIMIT_COMMENT_AVATARS).forEach((item) => {
    const avatarUrl = getAvatarWithFallback(item?.avatar_url, item?.user_phone, item?.username);
    warmImageUrl(avatarUrl);
  });
}
