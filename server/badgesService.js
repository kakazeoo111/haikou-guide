const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BADGE_TITLE = "未解锁称号";
const BADGE_PRIORITY = [
  "无私奉献",
  "快乐种草机",
  "人气椰",
  "小夜猫",
  "评论小椰",
  "探店小椰",
  "佛系椰",
  "椰岛新兵",
];
const BADGE_CATALOG = [
  { name: "椰岛新兵", icon: "🌴", mood: "刚登陆，先热身", sourceType: "quant", ruleText: "登录三天即可获得" },
  { name: "探店能手", icon: "📍", mood: "发现好店达人", sourceType: "quant", ruleText: "推荐数 >= 3" },
  { name: "评论小子", icon: "💬", mood: "发言有料选手", sourceType: "quant", ruleText: "评论总数 >= 15" },
  { name: "人气椰", icon: "🔥", mood: "全场高光体质", sourceType: "quant", ruleText: "收到点赞总数 >= 50" },
  { name: "快乐种草机", icon: "✨", mood: "一发入魂种草王", sourceType: "quant", ruleText: "收到点赞总数 >= 100" },
  { name: "佛系椰", icon: "🧘", mood: "静静看世界", sourceType: "quant", ruleText: "近7天只浏览不发布" },
  { name: "小夜猫", icon: "🌙", mood: "深夜营业常驻", sourceType: "quant", ruleText: "22:00-02:00评论+发布 >= 15" },
  { name: "无私奉献", icon: "🤝", mood: "站主特别认可", sourceType: "manual", ruleText: "站主手动授权" },
];
const QUANT_BADGE_RULES = [
  { name: "椰岛新兵", isEarned: (metrics) => metrics.accountAgeDays >= 3 },
  { name: "探店小椰", isEarned: (metrics) => metrics.recommendationCount >= 3 },
  { name: "评论小椰", isEarned: (metrics) => metrics.commentCount >= 15 },
  { name: "人气椰", isEarned: (metrics) => metrics.receivedLikesTotal >= 50 },
  { name: "快乐种草机", isEarned: (metrics) => metrics.receivedLikesTotal >= 100 },
  { name: "佛系椰", isEarned: (metrics) => metrics.accountAgeDays >= 7 && metrics.postCountLast7Days === 0 },
  { name: "小夜猫", isEarned: (metrics) => metrics.nightActiveCount >= 15 },
];

function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function queryCount(pool, sql, params) {
  const [rows] = await pool.execute(sql, params);
  return toCount(rows?.[0]?.count);
}

async function getUserCreatedAt(pool, phone) {
  const [rows] = await pool.execute("SELECT created_at FROM users WHERE phone = ? LIMIT 1", [phone]);
  if (!rows.length || !rows[0].created_at) throw new Error("users.created_at 缺失，无法计算称号");
  return new Date(rows[0].created_at);
}

async function getManualBadgeNames(pool, phone) {
  const [rows] = await pool.execute(
    "SELECT badge_name FROM user_badge_grants WHERE user_phone = ? AND is_active = 1 ORDER BY granted_at DESC",
    [phone]
  );
  return rows.map((row) => row.badge_name).filter(Boolean);
}

async function getSelectedBadgeName(pool, phone) {
  const [rows] = await pool.execute(
    "SELECT selected_badge_name FROM user_badge_preferences WHERE user_phone = ? LIMIT 1",
    [phone]
  );
  return rows?.[0]?.selected_badge_name || "";
}

function getQuantBadgeNames(metrics) {
  return QUANT_BADGE_RULES.filter((rule) => rule.isEarned(metrics)).map((rule) => rule.name);
}

function pickPriorityBadgeName(allBadges) {
  for (const badgeName of BADGE_PRIORITY) {
    if (allBadges.includes(badgeName)) return badgeName;
  }
  return allBadges[0] || DEFAULT_BADGE_TITLE;
}

function buildBadgeCatalog(allBadges, manualBadges) {
  const ownedSet = new Set(allBadges);
  const baseCatalog = BADGE_CATALOG.map((badge) => ({ ...badge, owned: ownedSet.has(badge.name) }));
  const extraManualBadges = manualBadges
    .filter((name) => !BADGE_CATALOG.some((badge) => badge.name === name))
    .map((name) => ({
      name,
      icon: "🎖️",
      mood: "站主特别授权",
      sourceType: "manual",
      ruleText: "站主手动授权称号",
      owned: true,
    }));
  return [...baseCatalog, ...extraManualBadges];
}

async function collectBaseMetrics(pool, phone) {
  const createdAt = await getUserCreatedAt(pool, phone);
  const accountAgeDays = Math.floor((Date.now() - createdAt.getTime()) / DAY_MS);
  const recommendationCount = await queryCount(pool, "SELECT COUNT(*) AS count FROM recommendations WHERE user_phone = ?", [phone]);
  const commentCount = await queryCount(pool, "SELECT COUNT(*) AS count FROM comments WHERE user_phone = ?", [phone]);
  return { accountAgeDays, recommendationCount, commentCount };
}

async function collectLikeMetrics(pool, phone) {
  const recommendationLikesReceived = await queryCount(
    pool,
    `
      SELECT COUNT(*) AS count
      FROM recommendation_likes rl
      JOIN recommendations r ON rl.recommendation_id = r.id
      WHERE r.user_phone = ?
    `,
    [phone]
  );
  const commentLikesReceived = await queryCount(
    pool,
    `
      SELECT COUNT(*) AS count
      FROM comment_likes cl
      JOIN comments c ON cl.comment_id = c.id
      WHERE c.user_phone = ?
    `,
    [phone]
  );
  return { recommendationLikesReceived, commentLikesReceived, receivedLikesTotal: recommendationLikesReceived + commentLikesReceived };
}

async function collectActivityMetrics(pool, phone) {
  const postCountLast7Days = await queryCount(
    pool,
    `
      SELECT COUNT(*) AS count FROM (
        SELECT created_at FROM recommendations WHERE user_phone = ?
        UNION ALL
        SELECT created_at FROM comments WHERE user_phone = ?
      ) t
      WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `,
    [phone, phone]
  );
  const nightActiveCount = await queryCount(
    pool,
    `
      SELECT COUNT(*) AS count FROM (
        SELECT created_at FROM recommendations WHERE user_phone = ?
        UNION ALL
        SELECT created_at FROM comments WHERE user_phone = ?
      ) t
      WHERE HOUR(t.created_at) >= 22 OR HOUR(t.created_at) < 2
    `,
    [phone, phone]
  );
  return { postCountLast7Days, nightActiveCount };
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
}

export async function buildUserBadgeData(pool, phone) {
  const [baseMetrics, likeMetrics, activityMetrics, manualBadges, selectedRaw] = await Promise.all([
    collectBaseMetrics(pool, phone),
    collectLikeMetrics(pool, phone),
    collectActivityMetrics(pool, phone),
    getManualBadgeNames(pool, phone),
    getSelectedBadgeName(pool, phone),
  ]);
  const metrics = { ...baseMetrics, ...likeMetrics, ...activityMetrics };
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
    badgeCatalog: buildBadgeCatalog(allBadges, manualBadges),
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
    [targetPhone, badgeName, adminPhone, isActive ? 1 : 0, note || ""]
  );

  // 手动授权后直接切换为该称号，避免“授权成功但界面没生效”的错觉。
  if (isActive) {
    await saveSelectedBadge(pool, { phone: targetPhone, badgeName });
    return;
  }

  // 取消授权时，如果当前正使用该称号，则清空选择让系统自动回退到可用称号。
  await pool.execute(
    `
      UPDATE user_badge_preferences
      SET selected_badge_name = ''
      WHERE user_phone = ? AND selected_badge_name = ?
    `,
    [targetPhone, badgeName]
  );
}

export async function saveSelectedBadge(pool, { phone, badgeName }) {
  await pool.execute(
    `
      INSERT INTO user_badge_preferences (user_phone, selected_badge_name)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE selected_badge_name = VALUES(selected_badge_name)
    `,
    [phone, badgeName]
  );
}
