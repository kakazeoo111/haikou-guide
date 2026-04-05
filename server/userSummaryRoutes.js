import { buildUserBadgeData } from "./badgesService.js";

const PHONE_REGEX = /^1\d{10}$/;
const POINTS_PER_VOTE = 10;
const ACTIVE_WINDOW_DAYS = 30;

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

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function queryRecentActiveDays(pool, phone, windowDays = ACTIVE_WINDOW_DAYS) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - (windowDays - 1));
  const threshold = formatLocalDate(thresholdDate);
  return queryCount(
    pool,
    `
      SELECT COUNT(DISTINCT active_day) AS count
      FROM (
        SELECT DATE(created_at) AS active_day FROM recommendations WHERE user_phone = ?
        UNION ALL
        SELECT DATE(created_at) AS active_day FROM comments WHERE user_phone = ?
        UNION ALL
        SELECT DATE(created_at) AS active_day FROM forum_posts WHERE user_phone = ?
        UNION ALL
        SELECT DATE(created_at) AS active_day FROM forum_comments WHERE user_phone = ?
        UNION ALL
        SELECT DATE(created_at) AS active_day FROM recommendation_likes WHERE phone = ?
        UNION ALL
        SELECT DATE(created_at) AS active_day FROM comment_likes WHERE phone = ?
        UNION ALL
        SELECT DATE(created_at) AS active_day FROM forum_post_calls WHERE user_phone = ?
        UNION ALL
        SELECT DATE(created_at) AS active_day FROM place_likes WHERE phone = ?
      ) activity_days
      WHERE active_day >= ?
    `,
    [phone, phone, phone, phone, phone, phone, phone, phone, threshold],
  );
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
      const [badgeData, receivedLikes, forumCalls, recentActiveDays] = await Promise.all([
        buildUserBadgeData(pool, phone),
        queryReceivedLikeCount(pool, phone),
        queryForumCallCount(pool, phone),
        queryRecentActiveDays(pool, phone),
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
        },
      });
    } catch (error) {
      console.error("获取用户点数简卡失败:", error.message);
      res.status(500).json({ ok: false, message: `获取用户点数简卡失败: ${error.message}` });
    }
  });
}
