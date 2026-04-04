function ensureHttps(url) {
  return String(url || "").replace("http://", "https://").trim();
}

export function parseFeedbackImageUrls(rawValue) {
  if (!rawValue) return [];
  if (Array.isArray(rawValue)) return rawValue.map(ensureHttps).filter(Boolean);

  if (typeof rawValue !== "string") return [];
  const text = rawValue.trim();
  if (!text) return [];

  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(ensureHttps).filter(Boolean);
      return [];
    } catch (error) {
      console.error("反馈图片JSON解析失败:", error);
      return [];
    }
  }
  return [ensureHttps(text)].filter(Boolean);
}
