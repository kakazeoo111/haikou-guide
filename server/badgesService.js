import {
  BADGE_CATALOG,
  BADGE_NAME_SET,
  BADGE_PRIORITY,
  DEFAULT_BADGE_TITLE,
  FORUM_CALL_TARGET,
  FORUM_POST_TARGET,
  QUANT_BADGE_RULES,
} from "./badgesConfig.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const METRIC_SQL = `
  SELECT
    u.created_at AS createdAt,
    (SELECT COUNT(*) FROM recommendations WHERE user_phone = ?) AS recommendationCount,
    (SELECT COUNT(*) FROM comments WHERE user_phone = ?) AS commentCount,
    (
      SELECT COUNT(*)
      FROM recommendation_likes rl
      JOIN recommendations r ON rl.recommendation_id = r.id
      WHERE r.user_phone = ?
    ) AS recommendationLikesReceived,
    (
      SELECT COUNT(*)
      FROM comment_likes cl
      JOIN comments c ON cl.comment_id = c.id
      WHERE c.user_phone = ?
    ) AS commentLikesReceived,
    (
      SELECT COUNT(*)
      FROM (
        SELECT created_at FROM recommendations WHERE user_phone = ?
        UNION ALL
        SELECT created_at FROM comments WHERE user_phone = ?
      ) recent_activities
      WHERE recent_activities.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ) AS postCountLast7Days,
    (
      SELECT COUNT(*)
      FROM (
        SELECT created_at FROM recommendations WHERE user_phone = ?
        UNION ALL
        SELECT created_at FROM comments WHERE user_phone = ?
      ) night_activities
      WHERE HOUR(night_activities.created_at) >= 22 OR HOUR(night_activities.created_at) < 2
    ) AS nightActiveCount,
    (SELECT COUNT(*) FROM forum_posts WHERE user_phone = ?) AS forumPostCount,
    (
      SELECT COUNT(*)
      FROM forum_post_calls c
      JOIN forum_posts p ON c.post_id = p.id
      WHERE p.user_phone = ?
    ) AS forumCallReceivedCount
  FROM users u
  WHERE u.phone = ?
  LIMIT 1
`;

const BADGE_RELATED_INDEXES = [
  { table: "recommendations", name: "idx_recommendations_user_created", columns: "user_phone, created_at" },
  { table: "comments", name: "idx_comments_user_created", columns: "user_phone, created_at" },
  { table: "forum_posts", name: "idx_forum_posts_user_phone", columns: "user_phone" },
  { table: "recommendation_likes", name: "idx_recommendation_likes_rec_id", columns: "recommendation_id" },
  { table: "comment_likes", name: "idx_comment_likes_comment_id", columns: "comment_id" },
  { table: "forum_post_calls", name: "idx_forum_post_calls_post_id", columns: "post_id" },
  { table: "user_badge_grants", name: "idx_user_badge_grants_active", columns: "user_phone, is_active, granted_at" },
];

function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function buildMetricParams(phone) {
  return [phone, phone, phone, phone, phone, phone, phone, phone, phone, phone, phone];
}

function normalizeMetricsRow(row) {
  if (!row?.createdAt) throw new Error("users.created_at 缺失，无法计算称号");
  const createdAt = new Date(row.createdAt);
  if (Number.isNaN(createdAt.getTime())) throw new Error("users.created_at 异常，无法计算称号");

  const recommendationLikesReceived = toCount(row.recommendationLikesReceived);
  const commentLikesReceived = toCount(row.commentLikesReceived);
  return {
    accountAgeDays: Math.floor((Date.now() - createdAt.getTime()) / DAY_MS),
    recommendationCount: toCount(row.recommendationCount),
    commentCount: toCount(row.commentCount),
    recommendationLikesReceived,
    commentLikesReceived,
    receivedLikesTotal: recommendationLikesReceived + commentLikesReceived,
    postCountLast7Days: toCount(row.postCountLast7Days),
    nightActiveCount: toCount(row.nightActiveCount),
    forumPostCount: toCount(row.forumPostCount),
    forumCallReceivedCount: toCount(row.forumCallReceivedCount),
  };
}

async function collectAllMetrics(pool, phone) {
  const [rows] = await pool.execute(METRIC_SQL, buildMetricParams(phone));
  return normalizeMetricsRow(rows?.[0]);
}

async function getManualBadgeNames(pool, phone) {
  const [rows] = await pool.execute(
    "SELECT badge_name FROM user_badge_grants WHERE user_phone = ? AND is_active = 1 ORDER BY granted_at DESC",
    [phone],
  );
  return rows.map((row) => row.badge_name).filter(Boolean);
}

async function getSelectedBadgeName(pool, phone) {
  const [rows] = await pool.execute(
    "SELECT selected_badge_name FROM user_badge_preferences WHERE user_phone = ? LIMIT 1",
    [phone],
  );
  return rows?.[0]?.selected_badge_name || "";
}

function getQuantBadgeNames(metrics) {
  return QUANT_BADGE_RULES.filter((rule) => rule.isEarned(metrics)).map((rule) => rule.name);
}

function pickPriorityBadgeName(allBadges) {
  if (allBadges.length === 0) return DEFAULT_BADGE_TITLE;
  const ownedSet = new Set(allBadges);
  for (const badgeName of BADGE_PRIORITY) {
    if (ownedSet.has(badgeName)) return badgeName;
  }
  return allBadges[0];
}

function getProgressPercent(current, target) {
  const normalizedTarget = Math.max(1, toCount(target));
  return Math.max(0, Math.min(100, Math.round((toCount(current) / normalizedTarget) * 100)));
}

function buildBadgeProgressMap(metrics) {
  const forumPostCurrent = toCount(metrics.forumPostCount);
  const forumCallCurrent = toCount(metrics.forumCallReceivedCount);
  const forumProgress = {
    text: `发帖 ${forumPostCurrent}/${FORUM_POST_TARGET} · 被打call ${forumCallCurrent}/${FORUM_CALL_TARGET}`,
    percent: Math.round((getProgressPercent(forumPostCurrent, FORUM_POST_TARGET) + getProgressPercent(forumCallCurrent, FORUM_CALL_TARGET)) / 2),
  };

  const quietDays = toCount(metrics.accountAgeDays);
  const quietPostCount = toCount(metrics.postCountLast7Days);
  const quietProgress = {
    text: `账号天数 ${quietDays}/7 · 近7天发布 ${quietPostCount}/0`,
    percent: Math.round((getProgressPercent(quietDays, 7) + (quietPostCount === 0 ? 100 : 0)) / 2),
  };

  return {
    椰岛新兵: { text: `登录天数 ${toCount(metrics.accountAgeDays)}/3`, percent: getProgressPercent(metrics.accountAgeDays, 3) },
    探店能手: { text: `推荐 ${toCount(metrics.recommendationCount)}/3`, percent: getProgressPercent(metrics.recommendationCount, 3) },
    评论小子: { text: `评论 ${toCount(metrics.commentCount)}/15`, percent: getProgressPercent(metrics.commentCount, 15) },
    人气椰: { text: `收到点赞 ${toCount(metrics.receivedLikesTotal)}/50`, percent: getProgressPercent(metrics.receivedLikesTotal, 50) },
    快乐种草机: { text: `收到点赞 ${toCount(metrics.receivedLikesTotal)}/100`, percent: getProgressPercent(metrics.receivedLikesTotal, 100) },
    论坛居士: forumProgress,
    佛系椰: quietProgress,
    小夜猫: { text: `深夜活跃 ${toCount(metrics.nightActiveCount)}/15`, percent: getProgressPercent(metrics.nightActiveCount, 15) },
  };
}

function buildBadgeCatalog(allBadges, manualBadges, metrics) {
  const ownedSet = new Set(allBadges);
  const progressMap = buildBadgeProgressMap(metrics);
  const baseCatalog = BADGE_CATALOG.map((badge) => ({ ...badge, owned: ownedSet.has(badge.name), progress: progressMap[badge.name] || null }));
  const extraManualBadges = manualBadges
    .filter((name) => !BADGE_NAME_SET.has(name))
    .map((name) => ({
      name,
      icon: "🎖️",
      mood: "站主特别授权",
      sourceType: "manual",
      ruleText: "站主手动授权称号",
      owned: true,
      progress: null,
    }));
  return [...baseCatalog, ...extraManualBadges];
}

async function ensureIndexIfMissing(pool, tableName, indexName, columns) {
  const [rows] = await pool.execute(
    `
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?
      LIMIT 1
    `,
    [tableName, indexName],
  );
  if (rows.length > 0) return;
  await pool.execute(`CREATE INDEX \`${indexName}\` ON \`${tableName}\` (${columns})`);
}

async function ensureBadgeMetricIndexes(pool) {
  for (const indexDef of BADGE_RELATED_INDEXES) {
    try {
      await ensureIndexIfMissing(pool, indexDef.table, indexDef.name, indexDef.columns);
    } catch (error) {
      console.error(`称号索引初始化失败: ${indexDef.table}.${indexDef.name}`, error.message);
    }
  }
}

export async function ensureBadgeGrantTable(pool) {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_badge_grants (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_phone VARCHAR(32) NOT NULL,
      badge_name VARCHAR(64) NOT NULL,
      granted_by VARCHAR(32) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      note VARCHAR(255) DEFAULT '',
      granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_badge (user_phone, badge_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_badge_preferences (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_phone VARCHAR(32) NOT NULL UNIQUE,
      selected_badge_name VARCHAR(64) NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await ensureBadgeMetricIndexes(pool);
}

export async function buildUserBadgeData(pool, phone) {
  const [metrics, manualBadges, selectedRaw] = await Promise.all([
    collectAllMetrics(pool, phone),
    getManualBadgeNames(pool, phone),
    getSelectedBadgeName(pool, phone),
  ]);

  const quantifiedBadges = getQuantBadgeNames(metrics);
  const allBadges = [...new Set([...manualBadges, ...quantifiedBadges])];
  const selectedTitle = allBadges.includes(selectedRaw) ? selectedRaw : "";
  const activeTitle = selectedTitle || pickPriorityBadgeName(allBadges);

  return {
    activeTitle,
    selectedTitle,
    allBadges,
    quantifiedBadges,
    manualBadges,
    badgeCatalog: buildBadgeCatalog(allBadges, manualBadges, metrics),
    metrics,
  };
}

export async function updateManualBadgeGrant(pool, { targetPhone, badgeName, adminPhone, isActive, note }) {
  await pool.execute(
    `
      INSERT INTO user_badge_grants (user_phone, badge_name, granted_by, is_active, note, granted_at)
      VALUES (?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        granted_by = VALUES(granted_by),
        is_active = VALUES(is_active),
        note = VALUES(note),
        granted_at = NOW()
    `,
    [targetPhone, badgeName, adminPhone, isActive ? 1 : 0, note || ""],
  );

  if (isActive) {
    await saveSelectedBadge(pool, { phone: targetPhone, badgeName });
    return;
  }

  await pool.execute(
    `
      UPDATE user_badge_preferences
      SET selected_badge_name = ''
      WHERE user_phone = ? AND selected_badge_name = ?
    `,
    [targetPhone, badgeName],
  );
}

export async function saveSelectedBadge(pool, { phone, badgeName }) {
  await pool.execute(
    `
      INSERT INTO user_badge_preferences (user_phone, selected_badge_name)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE selected_badge_name = VALUES(selected_badge_name)
    `,
    [phone, badgeName],
  );
}
