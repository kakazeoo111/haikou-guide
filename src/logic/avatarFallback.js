const AVATAR_GRADIENTS = [
  ["#e7f7ef", "#b7e3cc"],
  ["#e7f2ff", "#bdd8ff"],
  ["#fff3e8", "#ffd2b0"],
  ["#f6ecff", "#dbc7ff"],
  ["#e8fbff", "#bceeff"],
];

const AVATAR_TEXT_COLORS = ["#295640", "#1f4f6d", "#5a3f1f", "#5d3552", "#224a58"];
const EMPTY_AVATAR_TOKENS = new Set(["", "null", "undefined"]);

function hashSeed(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function escapeSvgText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function pickAvatarLabel(username, phone) {
  const base = String(username || "").trim() || String(phone || "").trim();
  const cleaned = base.replace(/[^0-9A-Za-z\u4e00-\u9fa5]/g, "");
  const first = cleaned.slice(0, 1).toUpperCase();
  return first || "U";
}

function buildAvatarSvg(seed, label) {
  const hash = hashSeed(seed);
  const [start, end] = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  const textColor = AVATAR_TEXT_COLORS[hash % AVATAR_TEXT_COLORS.length];
  const safeLabel = escapeSvgText(label);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${start}"/><stop offset="100%" stop-color="${end}"/></linearGradient></defs><circle cx="48" cy="48" r="48" fill="url(#bg)"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Arial, sans-serif" font-size="42" font-weight="700" fill="${textColor}">${safeLabel}</text></svg>`;
}

export function normalizeAvatarUrl(url) {
  const normalized = String(url || "").trim();
  if (EMPTY_AVATAR_TOKENS.has(normalized)) return "";
  if (normalized.startsWith("data:image/")) return normalized;
  if (normalized.startsWith("https://")) return normalized;
  if (normalized.startsWith("http://")) return normalized.replace(/^http:\/\//i, "https://");
  if (normalized.startsWith("//")) return `https:${normalized}`;
  if (normalized.startsWith("/uploads/")) return `https://api.suzcore.top${normalized}`;
  return "";
}

export function buildLocalAvatarDataUri(phone, username) {
  const seed = `${String(phone || "guest").trim()}|${String(username || "user").trim()}`;
  const label = pickAvatarLabel(username, phone);
  const svg = buildAvatarSvg(seed, label);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getAvatarWithFallback(url, phone, username) {
  const normalized = normalizeAvatarUrl(url);
  if (normalized) return normalized;
  return buildLocalAvatarDataUri(phone, username);
}
