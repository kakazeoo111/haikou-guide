import { buildUserBadgeData } from "./badgesService.js";
const PHONE_REGEX = /^1\d{10}$/;
const POINTS_PER_VOTE = 10;
const ACTIVE_WINDOW_DAYS = 30;
const RECOMMENDED_PLACE_LIMIT = 6;
const ACTIVE_TIME_COLUMN_CANDIDATES = ["created_at", "create_time", "createdAt"];
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
  sourceColumns: new Map(),
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

function normalizeColumnName(value) {
  return String(value || "").trim().toLowerCase();
}

function pickTimeColumn(columns) {
  if (!Array.isArray(columns) || !columns.length) return "";
  const columnMap = new Map();
  columns.forEach((column) => {
    const raw = String(column || "").trim();
    const normalized = normalizeColumnName(raw);
    if (!raw || !normalized || columnMap.has(normalized)) return;
    columnMap.set(normalized, raw);
  });
  for (const candidate of ACTIVE_TIME_COLUMN_CANDIDATES) {
    const normalizedCandidate = normalizeColumnName(candidate);
    if (columnMap.has(normalizedCandidate)) return columnMap.get(normalizedCandidate);
  }
  return "";
}

function toHttpsUrl(url) {
  const normalized = String(url || "").trim();
  if (!normalized) return "";
  if (normalized.startsWith("http://")) return normalized.replace("http://", "https://");
  if (normalized.startsWith("https://")) return normalized;
  if (normalized.startsWith("/uploads/")) return `https://api.suzcore.top${normalized}`;
  return "";
}

function parseRecommendationImageUrls(imageValue) {
  if (!imageValue || imageValue === "null" || imageValue === "[]") return [];
  const sanitize = (items) => items.map((item) => toHttpsUrl(item)).filter(Boolean);
  if (Array.isArray(imageValue)) return sanitize(imageValue);
  const normalized = String(imageValue || "").trim();
  if (!normalized) return [];
  if (normalized.startsWith("[")) {
    try {
      const parsed = JSON.parse(normalized);
      return Array.isArray(parsed) ? sanitize(parsed) : [];
    } catch (error) {
      console.error("解析推荐图片失败:", error.message);
      return [];
    }
  }
  const single = toHttpsUrl(normalized);
  return single ? [single] : [];
}

async function getActiveSourceColumns(pool, tableNames) {
  if (!tableNames.length) return new Map();
  const now = Date.now();
  if (activeTableCache.sourceColumns.size > 0 && now < activeTableCache.expiresAt) return activeTableCache.sourceColumns;
  if (activeTableCache.pending) return activeTableCache.pending;
  activeTableCache.pending = Promise.all(
    tableNames.map(async (tableName) => {
      const normalizedTableName = String(tableName || "").trim();
      if (!normalizedTableName) return { tableName: "", timeColumn: "" };
      if (!/^[a-zA-Z0-9_]+$/.test(normalizedTableName)) {
        console.error("活跃统计表名非法:", normalizedTableName);
        return { tableName: normalizedTableName, timeColumn: "" };
      }
      try {
        const [rows] = await pool.execute(`SHOW COLUMNS FROM \`${normalizedTableName}\``);
        const columns = rows.map((row) => String(row.Field || row.field || "").trim()).filter(Boolean);
        return { tableName: normalizedTableName, timeColumn: pickTimeColumn(columns) };
      } catch (error) {
        console.error(`读取表字段失败: ${normalizedTableName}`, error.message);
        return { tableName: normalizedTableName, timeColumn: "" };
      }
    }),
  )
    .then((results) => {
      const nextColumns = new Map();
      results.forEach(({ tableName, timeColumn }) => {
        if (tableName && timeColumn) nextColumns.set(tableName, timeColumn);
      });
      activeTableCache.sourceColumns = nextColumns;
      activeTableCache.expiresAt = Date.now() + ACTIVE_TABLE_CACHE_TTL_MS;
      return nextColumns;
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
  const sourceColumns = await getActiveSourceColumns(pool, tableNames);
  const activeSources = ACTIVE_SOURCE_TABLES.map((item) => ({
    ...item,
    timeColumn: sourceColumns.get(item.tableName) || "",
  })).filter((item) => item.timeColumn);
  if (!activeSources.length) {
    throw new Error(`活跃统计失败：未找到可用时间字段（支持 ${ACTIVE_TIME_COLUMN_CANDIDATES.join("/")})`);
  }
  const sourceRows = await Promise.all(
    activeSources.map(({ tableName, phoneColumn, timeColumn }) =>
      pool
        .execute(
          `
            SELECT DISTINCT DATE_FORMAT(${timeColumn}, '%Y-%m-%d') AS active_day
            FROM ${tableName}
            WHERE ${phoneColumn} COLLATE utf8mb4_general_ci = ?
              AND ${timeColumn} >= DATE_SUB(CURDATE(), INTERVAL ${historyWindowDays} DAY)
          `,
          [phone],
        )
        .then(([rows]) => ({ tableName, timeColumn, rows })),
    ),
  );
  const activeDaySet = new Set();
  const sourceBreakdown = [];
  sourceRows.forEach(({ tableName, timeColumn, rows }) => {
    const tableDaySet = new Set();
    rows.forEach((row) => {
      const activeDay = normalizeDateKey(row.active_day);
      if (!activeDay) return;
      tableDaySet.add(activeDay);
      activeDaySet.add(activeDay);
    });
    sourceBreakdown.push({
      tableName,
      timeColumn,
      dayCount: tableDaySet.size,
    });
  });
  return {
    days: activeDaySet.size,
    sourceBreakdown,
    missingTables: tableNames.filter((tableName) => !sourceColumns.has(tableName)),
  };
}

async function queryRecommendedPlaces(pool, phone, limit = RECOMMENDED_PLACE_LIMIT) {
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || RECOMMENDED_PLACE_LIMIT, 1), 20);
  const [rows] = await pool.execute(
    `
      SELECT id, place_name, description, image_url, created_at, lat, lng
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
      description: String(row.description || "").trim(),
      images: parseRecommendationImageUrls(row.image_url),
      createdAt: row.created_at || null,
      lat: row.lat == null ? null : Number(row.lat),
      lng: row.lng == null ? null : Number(row.lng),
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
      const [badgeData, receivedLikes, forumCalls, activityResult, recommendedPlaces] = await Promise.all([
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
          recentActiveDays: activityResult.days,
          activeWindowDays: ACTIVE_WINDOW_DAYS,
          activityBreakdown: activityResult.sourceBreakdown,
          activityMissingTables: activityResult.missingTables,
          recommendedPlaces,
        },
      });
    } catch (error) {
      console.error("获取用户点数简卡失败:", error.message);
      res.status(500).json({ ok: false, message: `获取用户点数简卡失败: ${error.message}` });
    }
  });
}
