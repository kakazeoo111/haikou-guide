function normalizeHttps(url) {
  return String(url || "").replace("http://", "https://").trim();
}

export function parseForumImageUrls(rawValue) {
  if (!rawValue) return [];
  if (Array.isArray(rawValue)) return rawValue.map(normalizeHttps).filter(Boolean);
  if (typeof rawValue !== "string") return [];
  const text = rawValue.trim();
  if (!text) return [];
  if (!text.startsWith("[")) return [normalizeHttps(text)].filter(Boolean);
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeHttps).filter(Boolean);
  } catch (error) {
    console.error("论坛图片解析失败:", error);
    return [];
  }
}
