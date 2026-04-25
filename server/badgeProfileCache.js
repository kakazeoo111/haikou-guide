import { buildUserBadgeData } from "./badgesService.js";

const DEFAULT_BADGE_TITLE = "未解锁称号";
const DEFAULT_BADGE_ICON = "🏅";
const BADGE_PROFILE_CACHE_TTL_MS = 3 * 60 * 1000;

const badgeProfileCache = new Map();

function normalizePhone(phone) {
  return String(phone || "").trim();
}

function pickActiveBadgeIcon(badgeData) {
  const catalog = Array.isArray(badgeData?.badgeCatalog) ? badgeData.badgeCatalog : [];
  const activeTitle = String(badgeData?.activeTitle || "");
  const matched = catalog.find((item) => String(item?.name || "") === activeTitle);
  return String(matched?.icon || "").trim() || DEFAULT_BADGE_ICON;
}

function getCachedBadgeProfile(phone) {
  const cache = badgeProfileCache.get(phone);
  if (!cache) return null;
  if (Date.now() > cache.expiresAt) {
    badgeProfileCache.delete(phone);
    return null;
  }
  return cache.profile;
}

function saveCachedBadgeProfile(phone, profile) {
  badgeProfileCache.set(phone, {
    profile,
    expiresAt: Date.now() + BADGE_PROFILE_CACHE_TTL_MS,
  });
}

async function loadBadgeProfile(pool, phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return { title: DEFAULT_BADGE_TITLE, icon: DEFAULT_BADGE_ICON };

  const cached = getCachedBadgeProfile(normalizedPhone);
  if (cached) return cached;

  try {
    const badgeData = await buildUserBadgeData(pool, normalizedPhone);
    const profile = {
      title: String(badgeData?.activeTitle || "").trim() || DEFAULT_BADGE_TITLE,
      icon: pickActiveBadgeIcon(badgeData),
    };
    saveCachedBadgeProfile(normalizedPhone, profile);
    return profile;
  } catch (error) {
    console.error("Load badge profile failed:", normalizedPhone, error?.message || error);
    return { title: DEFAULT_BADGE_TITLE, icon: DEFAULT_BADGE_ICON };
  }
}

export async function attachBadgeProfileFields(pool, rows, phoneField = "user_phone") {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return list;

  const phones = [...new Set(list.map((row) => normalizePhone(row?.[phoneField])).filter(Boolean))];
  if (!phones.length) return list;

  const profileMap = new Map();
  const profiles = await Promise.all(
    phones.map(async (phone) => [phone, await loadBadgeProfile(pool, phone)]),
  );
  profiles.forEach(([phone, profile]) => profileMap.set(phone, profile));

  return list.map((row) => {
    const phone = normalizePhone(row?.[phoneField]);
    const profile = profileMap.get(phone) || { title: DEFAULT_BADGE_TITLE, icon: DEFAULT_BADGE_ICON };
    return {
      ...row,
      badge_title: profile.title,
      badge_icon: profile.icon,
    };
  });
}

