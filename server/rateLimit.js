const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 60;

function normalizeKey(value) {
  return String(value || "").trim() || "anonymous";
}

export function createRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  max = DEFAULT_MAX_REQUESTS,
  keyGenerator = (req) => req.ip,
  message = "请求过于频繁，请稍后再试",
} = {}) {
  const hits = new Map();
  const safeWindowMs = Math.max(1000, Number(windowMs) || DEFAULT_WINDOW_MS);
  const safeMax = Math.max(1, Number(max) || DEFAULT_MAX_REQUESTS);

  return (req, res, next) => {
    const now = Date.now();
    const key = normalizeKey(keyGenerator(req));
    const current = hits.get(key);
    if (!current || current.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + safeWindowMs });
      return next();
    }

    current.count += 1;
    if (current.count > safeMax) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ ok: false, message });
    }
    next();
  };
}
