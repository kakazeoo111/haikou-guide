const CACHE_PREFIX = "haikou_cache_v1_";
const memoryCache = new Map();

export const APP_CACHE_TTL_MS = Object.freeze({
  recommendations: 2 * 60 * 1000,
  notifications: 60 * 1000,
  favorites: 5 * 60 * 1000,
  placeStats: 2 * 60 * 1000,
  announcement: 30 * 60 * 1000,
});

function getStorageKey(key) {
  return `${CACHE_PREFIX}${key}`;
}

function parseCacheEntry(rawValue) {
  if (!rawValue) return null;
  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") return null;
    if (!Number.isFinite(Number(parsed.savedAt))) return null;
    return parsed;
  } catch (error) {
    console.error("缓存解析失败:", error);
    return null;
  }
}

export function readCachedValue(key, ttlMs) {
  const now = Date.now();
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry && now - memoryEntry.savedAt <= ttlMs) return memoryEntry.value;

  const storageEntry = parseCacheEntry(localStorage.getItem(getStorageKey(key)));
  if (!storageEntry || now - storageEntry.savedAt > ttlMs) return null;
  memoryCache.set(key, storageEntry);
  return storageEntry.value;
}

export function writeCachedValue(key, value) {
  const entry = { savedAt: Date.now(), value };
  memoryCache.set(key, entry);
  try {
    localStorage.setItem(getStorageKey(key), JSON.stringify(entry));
  } catch (error) {
    console.error("缓存写入失败:", error);
  }
}
