import crypto from "crypto";

const DEFAULT_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RUNTIME_TOKEN_SECRET = crypto.randomBytes(32).toString("hex");

function getPositiveIntEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] || "", 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function getTokenSecret() {
  const configuredSecret = String(process.env.AUTH_TOKEN_SECRET || "").trim();
  if (configuredSecret) return configuredSecret;
  if (process.env.NODE_ENV === "production") {
    console.error("AUTH_TOKEN_SECRET is missing; using a runtime-only secret. Users will be logged out on restart.");
  }
  return RUNTIME_TOKEN_SECRET;
}

function toBase64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function signTokenBody(encodedBody) {
  return crypto.createHmac("sha256", getTokenSecret()).update(encodedBody).digest("base64url");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function parsePayload(encodedBody) {
  try {
    return JSON.parse(Buffer.from(encodedBody, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function createAuthToken(user) {
  const phone = String(user?.phone || "").trim();
  if (!phone) throw new Error("Cannot create auth token without phone");
  const now = Date.now();
  const ttlMs = getPositiveIntEnv("AUTH_TOKEN_TTL_MS", DEFAULT_TOKEN_TTL_MS);
  const payload = {
    phone,
    username: String(user?.username || "").trim(),
    iat: now,
    exp: now + ttlMs,
  };
  const encodedBody = toBase64Url(JSON.stringify(payload));
  return `${encodedBody}.${signTokenBody(encodedBody)}`;
}

export function verifyAuthToken(token) {
  const normalized = String(token || "").trim();
  const [encodedBody, signature, extra] = normalized.split(".");
  if (!encodedBody || !signature || extra) return null;
  if (!safeEqual(signTokenBody(encodedBody), signature)) return null;
  const payload = parsePayload(encodedBody);
  if (!payload?.phone || Number(payload.exp || 0) <= Date.now()) return null;
  return {
    phone: String(payload.phone || "").trim(),
    username: String(payload.username || "").trim(),
  };
}

export function getBearerToken(req) {
  const authorization = String(req.headers.authorization || "").trim();
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

export function createOptionalAuthMiddleware() {
  return (req, res, next) => {
    const token = getBearerToken(req);
    const user = token ? verifyAuthToken(token) : null;
    if (user) req.authUser = user;
    next();
  };
}

export function createRequireAuthMiddleware() {
  return (req, res, next) => {
    const user = verifyAuthToken(getBearerToken(req));
    if (!user) {
      return res.status(401).json({ ok: false, message: "请重新登录" });
    }
    req.authUser = user;
    next();
  };
}

export function createRequireAdminMiddleware(adminPhone) {
  const requireAuth = createRequireAuthMiddleware();
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (String(req.authUser?.phone || "") !== String(adminPhone || "")) {
        return res.status(403).json({ ok: false, message: "无权限操作" });
      }
      next();
    });
  };
}
