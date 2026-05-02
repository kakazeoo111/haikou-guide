const ONLINE_EXPIRE_MS = 70 * 1000;
const ONLINE_CLEAN_INTERVAL_MS = 15 * 1000;
const onlineUserMap = new Map();
let cleanTimer = null;

function normalizePhone(value) {
  return String(value || "").trim();
}

function removeExpiredOnlineUsers() {
  const now = Date.now();
  for (const [phone, lastSeenAt] of onlineUserMap.entries()) {
    if (now - lastSeenAt <= ONLINE_EXPIRE_MS) continue;
    onlineUserMap.delete(phone);
  }
}

function ensureOnlineCleanTimer() {
  if (cleanTimer) return;
  cleanTimer = setInterval(() => {
    removeExpiredOnlineUsers();
  }, ONLINE_CLEAN_INTERVAL_MS);
  if (typeof cleanTimer.unref === "function") cleanTimer.unref();
}

function markOnline(phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return;
  onlineUserMap.set(normalizedPhone, Date.now());
}

function getOnlineCount() {
  removeExpiredOnlineUsers();
  return onlineUserMap.size;
}

export function registerOnlineRoutes(app, { optionalAuth } = {}) {
  ensureOnlineCleanTimer();

  const attachOptionalAuth = typeof optionalAuth === "function" ? optionalAuth : (req, res, next) => next();

  app.get("/api/online/count", attachOptionalAuth, (req, res) => {
    try {
      markOnline(req.authUser?.phone);
      res.json({ ok: true, onlineCount: getOnlineCount() });
    } catch (error) {
      console.error("在线人数获取失败:", error.message);
      res.status(500).json({ ok: false, message: `在线人数获取失败: ${error.message}` });
    }
  });
}
