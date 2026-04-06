import { buildUserBadgeData } from "./badgesService.js";

const PHONE_REGEX = /^1\d{10}$/;
const POINTS_PER_VOTE = 10;
const ACTIVE_WINDOW_DAYS = 30;
const RECOMMENDED_PLACE_LIMIT = 6;
const ACTIVE_SOURCE_TABLES = [
  { tableName: "recommendations", phoneColumn: "user_phone" },
  { tableName: "comments", phoneColumn: "user_phone" },
  { tableName: "forum_posts", phoneColumn: "user_phone" },
  { tableName: "forum_comments", phoneColumn: "user_phone" },
  { tableName: "recommendation_likes", phoneColumn: "phone" },
  { tableName: "comment_likes", phoneColumn: "phone" },
  { tableName: "forum_post_calls", phoneColumn: "user_phone" },
  { tableName: "place_likes", phoneColumn: "phone" },
];
const ACTIVE_TABLE_CACHE_TTL_MS = 5 * 60 * 1000;
const activeTableCache = {
  expiresAt: 0,
  tables: new Set(),
  pending: null,
};

async function queryCount(pool, sql, params) {
  const [rows] = await pool.execute(sql, params);
  const count = Number(rows?.[0]?.count || 0);
  return Number.isFinite(count) ? count : 0;
}

async function queryUserBasicInfo(pool, phone) {
  const [rows] = await pool.execute(
    "SELECT phone, username, avatar_url FROM users WHERE phone = ? LIMIT 1",
    [phone],
  );
  return rows?.[0] || null;
}

async function queryReceivedLikeCount(pool, phone) {
  const [recommendationLikes, commentLikes] = await Promise.all([
    queryCount(
      pool,
      `
        SELECT COUNT(*) AS count
        FROM recommendation_likes rl
        JOIN recommendations r ON rl.recommendation_id = r.id
        WHERE r.user_phone = ?
          AND rl.phone COLLATE utf8mb4_general_ci <> r.user_phone COLLATE utf8mb4_general_ci
      `,
      [phone],
    ),
    queryCount(
      pool,
      `
        SELECT COUNT(*) AS count
        FROM comment_likes cl
        JOIN comments c ON cl.comment_id = c.id
        WHERE c.user_phone = ?
          AND cl.phone COLLATE utf8mb4_general_ci <> c.user_phone COLLATE utf8mb4_general_ci
      `,
      [phone],
    ),
  ]);
  return recommendationLikes + commentLikes;
}

async function queryForumCallCount(pool, phone) {
  return queryCount(
    pool,
    `
      SELECT COUNT(*) AS count
      FROM forum_post_calls fc
      JOIN forum_posts fp ON fc.post_id = fp.id
      WHERE fp.user_phone = ?
        AND fc.user_phone COLLATE utf8mb4_general_ci <> fp.user_phone COLLATE utf8mb4_general_ci
    `,
    [phone],
  );
}

function normalizeDateKey(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return normalized.slice(0, 10);
}

async function getTablesWithCreatedAt(pool, tableNames) {
  if (!tableNames.length) return new Set();
  const now = Date.now();
  if (activeTableCache.tables.size > 0 && now < activeTableCache.expiresAt) return activeTableCache.tables;
  if (activeTableCache.pending) return activeTableCache.pending;
  const placeholders = tableNames.map(() => "?").join(",");
  activeTableCache.pending = pool
    .execute(
      `
        SELECT table_name
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND column_name = 'created_at'
          AND table_name IN (${placeholders})
      `,
      tableNames,
    )
    .then(([rows]) => {
      const nextTables = new Set(rows.map((row) => String(row.table_name || "")));
      activeTableCache.tables = nextTables;
      activeTableCache.expiresAt = Date.now() + ACTIVE_TABLE_CACHE_TTL_MS;
      return nextTables;
    })
    .finally(() => {
      activeTableCache.pending = null;
    });
  return activeTableCache.pending;
}

async function queryRecentActiveDays(pool, phone, windowDays = ACTIVE_WINDOW_DAYS) {
  const safeWindowDays = Math.max(1, Number.parseInt(windowDays, 10) || ACTIVE_WINDOW_DAYS);
  const historyWindowDays = safeWindowDays - 1;
  const tableNames = ACTIVE_SOURCE_TABLES.map((item) => item.tableName);
  const supportedTables = await getTablesWithCreatedAt(pool, tableNames);
  const activeSources = ACTIVE_SOURCE_TABLES.filter((item) => supportedTables.has(item.tableName));
  if (!activeSources.length) return 0;
  const activeDateRows = await Promise.all(
    activeSources.map(({ tableName, phoneColumn }) =>
      pool
        .execute(
          `
            SELECT DISTINCT DATE_FORMAT(created_at, '%Y-%m-%d') AS active_day
            FROM ${tableName}
            WHERE ${phoneColumn} COLLATE utf8mb4_general_ci = ?
              AND created_at >= DATE_SUB(CURDATE(), INTERVAL ${historyWindowDays} DAY)
          `,
          [phone],
        )
        .then(([rows]) => rows),
    ),
  );
  const activeDaySet = new Set();
  activeDateRows.forEach((rows) => {
    rows.forEach((row) => {
      const activeDay = normalizeDateKey(row.active_day);
      if (activeDay) activeDaySet.add(activeDay);
    });
  });
  return activeDaySet.size;
}

async function queryRecommendedPlaces(pool, phone, limit = RECOMMENDED_PLACE_LIMIT) {
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || RECOMMENDED_PLACE_LIMIT, 1), 20);
  const [rows] = await pool.execute(
    `
      SELECT id, place_name
      FROM recommendations
      WHERE user_phone COLLATE utf8mb4_general_ci = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ${safeLimit}
    `,
    [phone],
  );
  return rows
    .map((row) => ({
      id: Number(row.id || 0),
      name: String(row.place_name || "").trim(),
    }))
    .filter((item) => item.id > 0 && item.name);
}

function pickActiveBadgeIcon(badgeData) {
  const catalog = Array.isArray(badgeData?.badgeCatalog) ? badgeData.badgeCatalog : [];
  const matched = catalog.find((item) => String(item?.name || "") === String(badgeData?.activeTitle || ""));
  return matched?.icon || "🏅";
}

function normalizeAvatarUrl(url, phone) {
  const normalized = String(url || "").trim();
  if (!normalized) return `https://api.dicebear.com/7.x/avataaars/svg?seed=${phone || "user"}`;
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return normalized.replace("http://", "https://");
  if (normalized.startsWith("/uploads/")) return `https://api.suzcore.top${normalized}`;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${phone || "user"}`;
}

export function registerUserSummaryRoutes(app, { pool }) {
  app.get("/api/users/:phone/summary", async (req, res) => {
    const phone = String(req.params.phone || "").trim();
    if (!PHONE_REGEX.test(phone)) {
      return res.status(400).json({ ok: false, message: "手机号格式错误" });
    }
    try {
      const user = await queryUserBasicInfo(pool, phone);
      if (!user) return res.status(404).json({ ok: false, message: "用户不存在" });
      const [badgeData, receivedLikes, forumCalls, recentActiveDays, recommendedPlaces] = await Promise.all([
        buildUserBadgeData(pool, phone),
        queryReceivedLikeCount(pool, phone),
        queryForumCallCount(pool, phone),
        queryRecentActiveDays(pool, phone),
        queryRecommendedPlaces(pool, phone),
      ]);
      const totalVotes = receivedLikes + forumCalls;
      res.json({
        ok: true,
        data: {
          phone,
          username: user.username || phone,
          avatarUrl: normalizeAvatarUrl(user.avatar_url, phone),
          badgeTitle: badgeData?.activeTitle || "未解锁称号",
          badgeIcon: pickActiveBadgeIcon(badgeData),
          points: totalVotes * POINTS_PER_VOTE,
          totalVotes,
          recentActiveDays,
          activeWindowDays: ACTIVE_WINDOW_DAYS,
          recommendedPlaces,
        },
      });
    } catch (error) {
      console.error("获取用户点数简卡失败:", error.message);
      res.status(500).json({ ok: false, message: `获取用户点数简卡失败: ${error.message}` });
    }
  });
}
