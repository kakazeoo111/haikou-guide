import { getBadgeEmoji, getBadgeTheme } from "./badgeTheme";

export const PARENT_COMMENT_IMAGE_GRID_MAX_WIDTH = "152px";
export const REPLY_COMMENT_IMAGE_GRID_MAX_WIDTH = "128px";

const CARTOON_AVATAR_STYLES = ["adventurer", "bottts", "fun-emoji", "personas"];
const CARTOON_AVATAR_API_BASE = "https://api.dicebear.com/7.x";
const DEFAULT_BADGE_TITLE = "未解锁称号";
const PARENT_AVATAR_SIZE = 36;
const REPLY_AVATAR_SIZE = 24;
const PARENT_BADGE_BUBBLE_SIZE = 14;
const REPLY_BADGE_BUBBLE_SIZE = 11;

const selfBadgeBaseStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "3px",
  padding: "1px 7px",
  borderRadius: "999px",
  minHeight: "17px",
  backdropFilter: "blur(2px)",
};

const STICKER_BADGE_GLYPHS = ["\u2726", "\u2728", "\u2730", "\u26A1", "\u2604", "\u2764"];
const STICKER_BADGE_MOTIONS = [
  "hkStickerHop 1.9s ease-in-out infinite, hkStickerGlow 2.8s ease-in-out infinite",
  "hkStickerWiggle 1.8s ease-in-out infinite, hkStickerGlow 2.6s ease-in-out infinite",
  "hkStickerSpring 2.1s ease-in-out infinite, hkStickerGlow 3.2s ease-in-out infinite",
  "hkStickerSnap 1.75s ease-in-out infinite, hkStickerGlow 2.4s ease-in-out infinite",
];

const STICKER_BADGE_PALETTES = [
  {
    color: "#ff4fa2",
    weight: 800,
    tilt: "-8deg",
    scale: "1.02",
    textShadow: "0 1px 0 rgba(255,255,255,0.95), 0 0 7px rgba(255, 79, 162, 0.58)",
    filter: "drop-shadow(0 1px 2px rgba(255, 79, 162, 0.35))",
  },
  {
    color: "#ff8f1f",
    weight: 800,
    tilt: "6deg",
    scale: "1.03",
    textShadow: "0 1px 0 rgba(255,255,255,0.95), 0 0 8px rgba(255, 143, 31, 0.62)",
    filter: "drop-shadow(0 1px 2px rgba(255, 143, 31, 0.36))",
  },
  {
    color: "#7f8fff",
    weight: 700,
    tilt: "8deg",
    scale: "1",
    textShadow: "0 1px 0 rgba(255,255,255,0.92), 0 0 8px rgba(127, 143, 255, 0.58)",
    filter: "drop-shadow(0 1px 2px rgba(127, 143, 255, 0.36))",
  },
  {
    color: "#5fd6ff",
    weight: 800,
    tilt: "4deg",
    scale: "1.01",
    textShadow: "0 1px 0 rgba(255,255,255,0.92), 0 0 8px rgba(95, 214, 255, 0.64)",
    filter: "drop-shadow(0 1px 2px rgba(95, 214, 255, 0.35))",
  },
];

export const BADGE_ANIMATION_STYLE = `
@keyframes hkStickerHop {
  0% { transform: translateY(0) rotate(var(--hk-tilt, 0deg)) scale(var(--hk-scale, 1)); }
  45% { transform: translateY(-2px) rotate(calc(var(--hk-tilt, 0deg) - 4deg)) scale(1.05); }
  100% { transform: translateY(0) rotate(var(--hk-tilt, 0deg)) scale(var(--hk-scale, 1)); }
}
@keyframes hkStickerWiggle {
  0% { transform: rotate(var(--hk-tilt, 0deg)) scale(var(--hk-scale, 1)); }
  30% { transform: rotate(calc(var(--hk-tilt, 0deg) - 6deg)) scale(var(--hk-scale, 1)); }
  70% { transform: rotate(calc(var(--hk-tilt, 0deg) + 6deg)) scale(var(--hk-scale, 1)); }
  100% { transform: rotate(var(--hk-tilt, 0deg)) scale(var(--hk-scale, 1)); }
}
@keyframes hkStickerSpring {
  0% { transform: translateY(0) rotate(var(--hk-tilt, 0deg)) scale(var(--hk-scale, 1)); }
  36% { transform: translateY(-1px) rotate(var(--hk-tilt, 0deg)) scale(1.1); }
  65% { transform: translateY(0) rotate(calc(var(--hk-tilt, 0deg) + 3deg)) scale(0.96); }
  100% { transform: translateY(0) rotate(var(--hk-tilt, 0deg)) scale(var(--hk-scale, 1)); }
}
@keyframes hkStickerSnap {
  0% { transform: rotate(var(--hk-tilt, 0deg)) scale(var(--hk-scale, 1)); }
  38% { transform: rotate(calc(var(--hk-tilt, 0deg) - 10deg)) scale(1.08); }
  72% { transform: rotate(calc(var(--hk-tilt, 0deg) + 3deg)) scale(0.98); }
  100% { transform: rotate(var(--hk-tilt, 0deg)) scale(var(--hk-scale, 1)); }
}
@keyframes hkStickerGlow {
  0%, 100% { opacity: 0.86; }
  50% { opacity: 1; }
}
`;

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getCartoonAvatar(phone, username) {
  const seedBase = `${phone || "guest"}-${username || "user"}`;
  const hash = hashString(seedBase);
  const style = CARTOON_AVATAR_STYLES[hash % CARTOON_AVATAR_STYLES.length];
  return `${CARTOON_AVATAR_API_BASE}/${style}/svg?seed=${encodeURIComponent(seedBase)}`;
}

export function parseCommentImageUrls(imgData) {
  if (!imgData || imgData === "[]" || imgData === "null") return [];
  if (typeof imgData !== "string") return [];
  if (!imgData.startsWith("[")) return [imgData];
  try {
    const parsed = JSON.parse(imgData);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((url) => String(url).replace("http://", "https://")).filter(Boolean);
  } catch (error) {
    console.error("评论图片数据解析失败:", error);
    return [];
  }
}

function hasCommentImages(comment) {
  return parseCommentImageUrls(comment.image_url).length > 0;
}

export function getAvatarSrc(url, phone, username) {
  const normalized = String(url || "").trim();
  if (!normalized || normalized === "null" || normalized === "undefined") return getCartoonAvatar(phone, username);
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return normalized.replace("http://", "https://");
  if (normalized.startsWith("/uploads/")) return `https://api.suzcore.top${normalized}`;
  console.error("Invalid avatar url, fallback to cartoon avatar:", normalized);
  return getCartoonAvatar(phone, username);
}

export function handleAvatarLoadError(event, phone, username) {
  const fallback = getCartoonAvatar(phone, username);
  if (event.currentTarget.src === fallback) return;
  console.error("Avatar load failed, fallback to cartoon avatar:", event.currentTarget.src);
  event.currentTarget.src = fallback;
}

export function getSelfBadge(comment, currentUser, activeBadgeTitle, badgeIcon) {
  if (String(comment?.user_phone || "") !== String(currentUser?.phone || "")) return null;
  return {
    icon: badgeIcon,
    title: activeBadgeTitle || DEFAULT_BADGE_TITLE,
  };
}

function getMotionBadgeVariant(seed) {
  const baseIndex = hashString(`motion-icon-${seed}`);
  const glyph = STICKER_BADGE_GLYPHS[baseIndex % STICKER_BADGE_GLYPHS.length];
  const motion = STICKER_BADGE_MOTIONS[baseIndex % STICKER_BADGE_MOTIONS.length];
  const palette = STICKER_BADGE_PALETTES[baseIndex % STICKER_BADGE_PALETTES.length];
  return {
    glyph,
    motion,
    ...palette,
  };
}

function createAvatarWrapStyle(size) {
  return {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    position: "relative",
  };
}

function createAvatarBadgeBubbleStyle(size) {
  return {
    position: "absolute",
    right: "-3px",
    bottom: "-3px",
    width: `${size}px`,
    height: `${size}px`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    pointerEvents: "none",
  };
}

function createMotionIconStyle(size, variant) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${Math.max(8, size - 1)}px`,
    fontWeight: variant.weight,
    color: variant.color,
    textShadow: variant.textShadow,
    lineHeight: 1,
    animation: variant.motion,
    transformOrigin: "center 75%",
    userSelect: "none",
    pointerEvents: "none",
    filter: variant.filter,
    willChange: "transform, opacity",
    "--hk-tilt": variant.tilt,
    "--hk-scale": variant.scale,
  };
}

export function sortAndFilterComments(comments, sortMode, showOnlyImages) {
  const source = Array.isArray(comments) ? [...comments] : [];
  const list = showOnlyImages ? source.filter(hasCommentImages) : source;
  if (sortMode === "latest") return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (sortMode === "hot") return list.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
  return list;
}

export function buildBadgePresentation(currentUser, activeBadgeTitle, activeBadgeMeta) {
  const badgeSeed = `${currentUser?.phone || ""}-${activeBadgeTitle || ""}`;
  const badgeTheme = getBadgeTheme(badgeSeed);
  const badgeIcon = getBadgeEmoji(badgeSeed, activeBadgeMeta?.icon || "");
  const motionBadgeVariant = getMotionBadgeVariant(`${badgeSeed}-${badgeIcon}`);
  return {
    badgeTheme,
    badgeIcon,
    motionBadgeVariant,
    selfBadgeStyle: {
      ...selfBadgeBaseStyle,
      background: `linear-gradient(130deg, rgba(255,255,255,0.95), rgba(255,255,255,0.76)), ${badgeTheme.background}`,
      border: `1px solid ${badgeTheme.border}`,
      boxShadow: "0 1px 3px rgba(255, 124, 182, 0.12), 0 1px 0 rgba(255,255,255,0.8) inset",
    },
    parentAvatarWrapStyle: createAvatarWrapStyle(PARENT_AVATAR_SIZE),
    replyAvatarWrapStyle: createAvatarWrapStyle(REPLY_AVATAR_SIZE),
    parentBadgeBubbleStyle: createAvatarBadgeBubbleStyle(PARENT_BADGE_BUBBLE_SIZE),
    replyBadgeBubbleStyle: createAvatarBadgeBubbleStyle(REPLY_BADGE_BUBBLE_SIZE),
    parentMotionIconStyle: createMotionIconStyle(PARENT_BADGE_BUBBLE_SIZE, motionBadgeVariant),
    replyMotionIconStyle: createMotionIconStyle(REPLY_BADGE_BUBBLE_SIZE, motionBadgeVariant),
  };
}
