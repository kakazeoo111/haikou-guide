import { attachBadgeProfileFields } from "./badgeProfileCache.js";
import { buildUploadedImagePayload, getUploadedImageAndThumbFiles } from "./uploadImagePayload.js";

function normalizeForumImages(files) {
  const { images, thumbnails } = getUploadedImageAndThumbFiles(files);
  const payload = buildUploadedImagePayload(images, thumbnails);
  if (!payload.length) return null;
  return JSON.stringify(payload);
}

const FORUM_IMAGE_TOO_LARGE_MESSAGE = "发布的图片内存过大（不得超过5MB）";

function parsePositiveInt(value) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) return null;
  return normalized;
}

function parseForumSortMode(value) {
  return String(value || "").trim().toLowerCase() === "chill" ? "chill" : "latest";
}

const FORUM_NOTICE_PLACE_ID_PREFIX = "forum_";
const FORUM_NOTICE_COMMENT_SNIPPET_LIMIT = 50;

const FORUM_COMMENT_LIST_SQL = `
  SELECT c.id, c.post_id, c.parent_id, c.user_phone, c.content, c.image_url, c.created_at, u.username, u.avatar_url,
         COALESCE(all_likes.like_count, 0) AS like_count,
         COALESCE(my_likes.is_liked, 0) AS is_liked
  FROM forum_comments c
  JOIN users u ON c.user_phone COLLATE utf8mb4_general_ci = u.phone COLLATE utf8mb4_general_ci
  LEFT JOIN (
    SELECT comment_id, COUNT(*) AS like_count
    FROM forum_comment_likes
    GROUP BY comment_id
  ) all_likes ON all_likes.comment_id = c.id
  LEFT JOIN (
    SELECT comment_id, 1 AS is_liked
    FROM forum_comment_likes
    WHERE user_phone COLLATE utf8mb4_general_ci = ?
    GROUP BY comment_id
  ) my_likes ON my_likes.comment_id = c.id
  WHERE c.post_id = ?
    AND c.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  ORDER BY c.created_at DESC, c.id DESC
`;

function buildForumNoticePlaceId(postId) {
  return `${FORUM_NOTICE_PLACE_ID_PREFIX}${postId}`;
}

function truncateForumCommentSnippet(content) {
  const text = String(content || "").trim();
  if (text.length <= FORUM_NOTICE_COMMENT_SNIPPET_LIMIT) return text;
  return `${text.slice(0, FORUM_NOTICE_COMMENT_SNIPPET_LIMIT)}...`;
}

async function getForumPostOwnerPhone(pool, postId) {
  const [rows] = await pool.execute("SELECT user_phone FROM forum_posts WHERE id = ? LIMIT 1", [postId]);
  return rows[0]?.user_phone || "";
}

async function getForumCommentOwner(pool, commentId) {
  const [rows] = await pool.execute("SELECT user_phone, post_id FROM forum_comments WHERE id = ? LIMIT 1", [commentId]);
  return rows[0] || null;
}

async function ensureForumNotificationTypeColumn(pool) {
  const [rows] = await pool.execute("SHOW COLUMNS FROM notifications LIKE 'type'");
  const columnType = String(rows?.[0]?.Type || "").toLowerCase();
  if (!columnType.startsWith("enum(")) return;
  await pool.execute("ALTER TABLE notifications MODIFY COLUMN type VARCHAR(50) NOT NULL");
}

async function ensureForumNotificationTable(pool) {
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT NOT NULL AUTO_INCREMENT,
      receiver_phone VARCHAR(20) NOT NULL,
      sender_phone VARCHAR(20) NOT NULL,
      type VARCHAR(50) NOT NULL,
      place_id VARCHAR(120) NULL,
      content TEXT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_notifications_receiver_created (receiver_phone, created_at),
      KEY idx_notifications_sender (sender_phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
  await ensureForumNotificationTypeColumn(pool);
}

function createForumNoticeSender(pool, addNotice) {
  if (typeof addNotice === "function") return addNotice;
  console.warn("forumRoutes: addNotice not injected, fallback to internal forum notice writer");
  return async (receiverPhone, senderPhone, type, placeId, content = "") => {
    if (receiverPhone === senderPhone) return;
    try {
      await pool.execute(
        "INSERT INTO notifications (receiver_phone, sender_phone, type, place_id, content) VALUES (?, ?, ?, ?, ?)",
        [receiverPhone, senderPhone, type, placeId, content],
      );
    } catch (error) {
      console.error("Forum notice write failed:", error.message);
    }
  };
}

const FORUM_POST_LIST_SQL = `
  SELECT p.id, p.user_phone, p.content, p.image_url, p.created_at, u.username, u.avatar_url,
         COALESCE(comment_stats.comment_count, 0) AS comment_count,
         COALESCE(call_stats.call_count, 0) AS call_count,
         COALESCE(my_call_stats.is_called, 0) AS is_called
  FROM forum_posts p
  JOIN users u ON p.user_phone COLLATE utf8mb4_general_ci = u.phone COLLATE utf8mb4_general_ci
  LEFT JOIN (
    SELECT post_id, COUNT(*) AS comment_count
    FROM forum_comments
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY post_id
  ) comment_stats ON comment_stats.post_id = p.id
  LEFT JOIN (
    SELECT post_id, COUNT(*) AS call_count
    FROM forum_post_calls
    GROUP BY post_id
  ) call_stats ON call_stats.post_id = p.id
  LEFT JOIN (
    SELECT post_id, 1 AS is_called
    FROM forum_post_calls
    WHERE user_phone = ?
    GROUP BY post_id
  ) my_call_stats ON my_call_stats.post_id = p.id
  WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    AND (? = '' OR u.username LIKE CONCAT('%', ?, '%') OR p.content LIKE CONCAT('%', ?, '%'))
`;

async function ensureCommentImageColumn(pool) {
  const [rows] = await pool.execute("SHOW COLUMNS FROM forum_comments LIKE 'image_url'");
  if (rows.length > 0) return;
  await pool.execute("ALTER TABLE forum_comments ADD COLUMN image_url LONGTEXT NULL AFTER content");
}

function handleMulterError(res, error) {
  if (!error) return true;
  if (error?.code === "LIMIT_FILE_SIZE") {
    res.status(400).json({ ok: false, message: FORUM_IMAGE_TOO_LARGE_MESSAGE });
    return false;
  }
  res.status(400).json({ ok: false, message: error.message || "图片上传失败" });
  return false;
}

function runUploadImages(upload, req, res) {
  return new Promise((resolve) => {
    upload.fields([{ name: "images", maxCount: 9 }, { name: "thumbnails", maxCount: 9 }])(req, res, (error) => resolve(handleMulterError(res, error)));
  });
}

async function ensureForumTables(pool) {
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS forum_posts (
      id INT NOT NULL AUTO_INCREMENT,
      user_phone VARCHAR(20) NOT NULL,
      content TEXT NULL,
      image_url LONGTEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_forum_posts_created (created_at),
      KEY idx_forum_posts_user_phone (user_phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await pool.execute(
    `CREATE TABLE IF NOT EXISTS forum_comments (
      id INT NOT NULL AUTO_INCREMENT,
      post_id INT NOT NULL,
      parent_id INT NULL,
      user_phone VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_forum_comments_post_created (post_id, created_at),
      KEY idx_forum_comments_parent (parent_id),
      KEY idx_forum_comments_user_phone (user_phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
  await ensureCommentImageColumn(pool);

  await pool.execute(
    `CREATE TABLE IF NOT EXISTS forum_post_calls (
      id INT NOT NULL AUTO_INCREMENT,
      post_id INT NOT NULL,
      user_phone VARCHAR(20) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_forum_post_calls_post_user (post_id, user_phone),
      KEY idx_forum_post_calls_post_id (post_id),
      KEY idx_forum_post_calls_user_phone (user_phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await pool.execute(
    `CREATE TABLE IF NOT EXISTS forum_comment_likes (
      id INT NOT NULL AUTO_INCREMENT,
      comment_id INT NOT NULL,
      user_phone VARCHAR(20) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_forum_comment_likes_comment_user (comment_id, user_phone),
      KEY idx_forum_comment_likes_comment_id (comment_id),
      KEY idx_forum_comment_likes_user_phone (user_phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}

async function isForumPostActive(pool, postId) {
  const [rows] = await pool.execute(
    "SELECT id FROM forum_posts WHERE id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) LIMIT 1",
    [postId]
  );
  return rows.length > 0;
}

export async function registerForumRoutes(app, { pool, upload, addNotice }) {
  await ensureForumTables(pool);
  await ensureForumNotificationTable(pool);
  const sendNotice = createForumNoticeSender(pool, addNotice);

  app.get("/api/forum/posts", async (req, res) => {
    const viewerPhone = String(req.query.phone || "").trim();
    const search = String(req.query.search || "").trim();
    const sortMode = parseForumSortMode(req.query.sort);
    const orderBySql = sortMode === "chill" ? "ORDER BY call_count DESC, p.created_at DESC, p.id DESC" : "ORDER BY p.created_at DESC, p.id DESC";

    try {
      const [rows] = await pool.execute(
        `${FORUM_POST_LIST_SQL}
         ${orderBySql}`,
        [viewerPhone, search, search, search]
      );

      const rowsWithBadge = await attachBadgeProfileFields(pool, rows);
      const data = rowsWithBadge.map((row) => ({
        ...row,
        comment_count: Number(row.comment_count || 0),
        call_count: Number(row.call_count || 0),
        is_called: Number(row.is_called || 0) > 0,
      }));
      res.json({ ok: true, data, sortMode });
    } catch (error) {
      console.error("论坛帖子获取失败:", error.message);
      res.status(500).json({ ok: false, message: `论坛帖子获取失败: ${error.message}` });
    }
  });

  app.post("/api/forum/post/add", async (req, res) => {
    const uploadOk = await runUploadImages(upload, req, res);
    if (!uploadOk) return;
    const { phone, content } = req.body;
    const normalizedPhone = String(phone || "").trim();
    const message = String(content || "").trim();
    const imageUrl = normalizeForumImages(req.files);
    if (!normalizedPhone) return res.status(400).json({ ok: false, message: "手机号不能为空" });
    if (!message && !imageUrl) return res.status(400).json({ ok: false, message: "发布内容不能为空" });

    try {
      const [users] = await pool.execute("SELECT phone FROM users WHERE phone = ? LIMIT 1", [normalizedPhone]);
      if (!users.length) return res.status(404).json({ ok: false, message: "用户不存在，请重新登录" });
      const [result] = await pool.execute(
        "INSERT INTO forum_posts (user_phone, content, image_url) VALUES (?, ?, ?)",
        [normalizedPhone, message, imageUrl]
      );
      res.json({ ok: true, message: "帖子发布成功", postId: Number(result.insertId) });
    } catch (error) {
      console.error("论坛帖子发布失败:", error.message);
      res.status(500).json({ ok: false, message: `论坛帖子发布失败: ${error.message}` });
    }
  });

  app.post("/api/forum/post/call", async (req, res) => {
    const { phone, postId } = req.body;
    const normalizedPhone = String(phone || "").trim();
    const normalizedPostId = parsePositiveInt(postId);
    if (!normalizedPhone) return res.status(400).json({ ok: false, message: "手机号不能为空" });
    if (!normalizedPostId) return res.status(400).json({ ok: false, message: "帖子ID无效" });

    try {
      const [users] = await pool.execute("SELECT phone FROM users WHERE phone = ? LIMIT 1", [normalizedPhone]);
      if (!users.length) return res.status(404).json({ ok: false, message: "用户不存在，请重新登录" });

      const active = await isForumPostActive(pool, normalizedPostId);
      if (!active) return res.status(404).json({ ok: false, message: "帖子不存在或已超过7天" });

      const [rows] = await pool.execute(
        "SELECT id FROM forum_post_calls WHERE post_id = ? AND user_phone = ? LIMIT 1",
        [normalizedPostId, normalizedPhone]
      );

      const action = rows.length > 0 ? "uncalled" : "called";
      if (action === "uncalled") {
        await pool.execute("DELETE FROM forum_post_calls WHERE post_id = ? AND user_phone = ?", [normalizedPostId, normalizedPhone]);
      } else {
        await pool.execute("INSERT INTO forum_post_calls (post_id, user_phone) VALUES (?, ?)", [normalizedPostId, normalizedPhone]);
        const ownerPhone = await getForumPostOwnerPhone(pool, normalizedPostId);
        if (ownerPhone) await sendNotice(ownerPhone, normalizedPhone, "forum_call", buildForumNoticePlaceId(normalizedPostId));
      }

      const [countRows] = await pool.execute("SELECT COUNT(*) AS count FROM forum_post_calls WHERE post_id = ?", [normalizedPostId]);
      const callCount = Number(countRows[0]?.count || 0);
      res.json({ ok: true, action, callCount });
    } catch (error) {
      console.error("论坛打call失败:", error.message);
      res.status(500).json({ ok: false, message: `论坛打call失败: ${error.message}` });
    }
  });

  app.get("/api/forum/comments/:postId", async (req, res) => {
    const postId = parsePositiveInt(req.params.postId);
    const viewerPhone = String(req.query.phone || "").trim();
    if (!postId) return res.status(400).json({ ok: false, message: "帖子ID无效" });

    try {
      const active = await isForumPostActive(pool, postId);
      if (!active) return res.status(404).json({ ok: false, message: "帖子不存在或已超过7天" });
      const [rows] = await pool.execute(FORUM_COMMENT_LIST_SQL, [viewerPhone, postId]);
      const rowsWithBadge = await attachBadgeProfileFields(pool, rows);
      const data = rowsWithBadge.map((row) => ({
        ...row,
        like_count: Number(row.like_count || 0),
        is_liked: Number(row.is_liked || 0) > 0,
      }));
      res.json({ ok: true, data });
    } catch (error) {
      console.error("论坛评论获取失败:", error.message);
      res.status(500).json({ ok: false, message: `论坛评论获取失败: ${error.message}` });
    }
  });

  app.post("/api/forum/comment/like", async (req, res) => {
    const { phone, commentId } = req.body;
    const normalizedPhone = String(phone || "").trim();
    const normalizedCommentId = parsePositiveInt(commentId);
    if (!normalizedPhone) return res.status(400).json({ ok: false, message: "手机号不能为空" });
    if (!normalizedCommentId) return res.status(400).json({ ok: false, message: "评论ID无效" });

    try {
      const owner = await getForumCommentOwner(pool, normalizedCommentId);
      if (!owner) return res.status(404).json({ ok: false, message: "目标评论不存在" });

      const [rows] = await pool.execute(
        "SELECT id FROM forum_comment_likes WHERE comment_id = ? AND user_phone = ? LIMIT 1",
        [normalizedCommentId, normalizedPhone]
      );
      const action = rows.length > 0 ? "unliked" : "liked";
      if (action === "unliked") {
        await pool.execute("DELETE FROM forum_comment_likes WHERE comment_id = ? AND user_phone = ?", [normalizedCommentId, normalizedPhone]);
      } else {
        await pool.execute("INSERT INTO forum_comment_likes (comment_id, user_phone) VALUES (?, ?)", [normalizedCommentId, normalizedPhone]);
        await sendNotice(owner.user_phone, normalizedPhone, "forum_comment_like", buildForumNoticePlaceId(Number(owner.post_id)), "点赞了你的论坛评论");
      }

      const [countRows] = await pool.execute("SELECT COUNT(*) AS count FROM forum_comment_likes WHERE comment_id = ?", [normalizedCommentId]);
      const likeCount = Number(countRows[0]?.count || 0);
      res.json({ ok: true, action, likeCount });
    } catch (error) {
      console.error("论坛评论点赞失败:", error.message);
      res.status(500).json({ ok: false, message: `论坛评论点赞失败: ${error.message}` });
    }
  });

  app.post("/api/forum/comment/add", async (req, res) => {
    const uploadOk = await runUploadImages(upload, req, res);
    if (!uploadOk) return;
    const { phone, postId, parentId, content } = req.body;
    const normalizedPhone = String(phone || "").trim();
    const normalizedPostId = parsePositiveInt(postId);
    const normalizedParentId = parentId ? parsePositiveInt(parentId) : null;
    const message = String(content || "").trim();
    const imageUrl = normalizeForumImages(req.files);
    if (!normalizedPhone) return res.status(400).json({ ok: false, message: "手机号不能为空" });
    if (!normalizedPostId) return res.status(400).json({ ok: false, message: "帖子ID无效" });
    if (!message && !imageUrl) return res.status(400).json({ ok: false, message: "评论内容和图片不能同时为空" });

    try {
      const active = await isForumPostActive(pool, normalizedPostId);
      if (!active) return res.status(404).json({ ok: false, message: "帖子不存在或已超过7天" });
      if (normalizedParentId) {
        const [parents] = await pool.execute("SELECT id FROM forum_comments WHERE id = ? AND post_id = ? LIMIT 1", [normalizedParentId, normalizedPostId]);
        if (!parents.length) return res.status(400).json({ ok: false, message: "回复目标不存在" });
      }
      await pool.execute(
        "INSERT INTO forum_comments (post_id, parent_id, user_phone, content, image_url) VALUES (?, ?, ?, ?, ?)",
        [normalizedPostId, normalizedParentId, normalizedPhone, message, imageUrl]
      );
      const noticePlaceId = buildForumNoticePlaceId(normalizedPostId);
      const snippet = truncateForumCommentSnippet(message);
      const ownerPhone = await getForumPostOwnerPhone(pool, normalizedPostId);
      if (ownerPhone) await sendNotice(ownerPhone, normalizedPhone, "forum_comment", noticePlaceId, snippet);
      if (normalizedParentId) {
        const parentAuthorPhone = await getForumCommentOwner(pool, normalizedParentId);
        if (parentAuthorPhone?.user_phone && parentAuthorPhone.user_phone !== ownerPhone) {
          await sendNotice(parentAuthorPhone.user_phone, normalizedPhone, "forum_reply", noticePlaceId, snippet);
        }
      }
      res.json({ ok: true, message: "评论发布成功" });
    } catch (error) {
      console.error("论坛评论发布失败:", error.message);
      res.status(500).json({ ok: false, message: `论坛评论发布失败: ${error.message}` });
    }
  });

  app.post("/api/forum/comment/delete", async (req, res) => {
    const { phone, commentId } = req.body;
    const normalizedPhone = String(phone || "").trim();
    const normalizedCommentId = parsePositiveInt(commentId);
    if (!normalizedPhone) return res.status(400).json({ ok: false, message: "手机号不能为空" });
    if (!normalizedCommentId) return res.status(400).json({ ok: false, message: "评论ID无效" });

    try {
      const [rows] = await pool.execute(
        "SELECT id, post_id, parent_id, user_phone FROM forum_comments WHERE id = ? LIMIT 1",
        [normalizedCommentId]
      );
      const targetComment = rows[0];
      if (!targetComment) return res.status(404).json({ ok: false, message: "评论不存在" });
      if (String(targetComment.user_phone || "") !== normalizedPhone) {
        return res.status(403).json({ ok: false, message: "只能删除自己的评论" });
      }

      const idsToDelete = [normalizedCommentId];
      if (!targetComment.parent_id) {
        const [childRows] = await pool.execute(
          "SELECT id FROM forum_comments WHERE parent_id = ?",
          [normalizedCommentId]
        );
        childRows.forEach((item) => idsToDelete.push(Number(item.id)));
      }
      const placeholders = idsToDelete.map(() => "?").join(", ");
      await pool.execute(`DELETE FROM forum_comment_likes WHERE comment_id IN (${placeholders})`, idsToDelete);
      await pool.execute(`DELETE FROM forum_comments WHERE id IN (${placeholders})`, idsToDelete);
      res.json({ ok: true, deletedIds: idsToDelete });
    } catch (error) {
      console.error("论坛评论删除失败:", error.message);
      res.status(500).json({ ok: false, message: `论坛评论删除失败: ${error.message}` });
    }
  });
}


