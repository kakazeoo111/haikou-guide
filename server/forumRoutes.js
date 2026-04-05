function normalizeForumImages(files) {
  const urls = (files || []).map((item) => `https://api.suzcore.top/uploads/${item.filename}`);
  if (!urls.length) return null;
  return JSON.stringify(urls);
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

function runUploadArray(upload, field, maxCount, req, res) {
  return new Promise((resolve) => {
    upload.array(field, maxCount)(req, res, (error) => resolve(handleMulterError(res, error)));
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
}

async function isForumPostActive(pool, postId) {
  const [rows] = await pool.execute(
    "SELECT id FROM forum_posts WHERE id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) LIMIT 1",
    [postId]
  );
  return rows.length > 0;
}

export async function registerForumRoutes(app, { pool, upload }) {
  await ensureForumTables(pool);

  app.get("/api/forum/posts", async (req, res) => {
    const viewerPhone = String(req.query.phone || "").trim();
    const search = String(req.query.search || "").trim();
    const sortMode = parseForumSortMode(req.query.sort);
    const orderBySql = sortMode === "chill" ? "ORDER BY call_count DESC, p.created_at DESC, p.id DESC" : "ORDER BY p.created_at DESC, p.id DESC";

    try {
      const [rows] = await pool.execute(
        `SELECT p.id, p.user_phone, p.content, p.image_url, p.created_at, u.username, u.avatar_url,
                (SELECT COUNT(*) FROM forum_comments c
                  WHERE c.post_id = p.id
                    AND c.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) AS comment_count,
                (SELECT COUNT(*) FROM forum_post_calls fpc WHERE fpc.post_id = p.id) AS call_count,
                (SELECT COUNT(*) FROM forum_post_calls fpc WHERE fpc.post_id = p.id AND fpc.user_phone COLLATE utf8mb4_general_ci = ?) AS is_called
         FROM forum_posts p
         JOIN users u ON p.user_phone COLLATE utf8mb4_general_ci = u.phone COLLATE utf8mb4_general_ci
         WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
           AND (? = '' OR u.username LIKE CONCAT('%', ?, '%') OR p.content LIKE CONCAT('%', ?, '%'))
         ${orderBySql}`,
        [viewerPhone, search, search, search]
      );

      const data = rows.map((row) => ({
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
    const uploadOk = await runUploadArray(upload, "images", 9, req, res);
    if (!uploadOk) return;
    const { phone, content } = req.body;
    const normalizedPhone = String(phone || "").trim();
    const message = String(content || "").trim();
    const imageUrl = normalizeForumImages(req.files);
    if (!normalizedPhone) return res.status(400).json({ ok: false, message: "手机号不能为空" });
    if (!message && !imageUrl) return res.status(400).json({ ok: false, message: "发布内容不能为空" });

    try {
      const [users] = await pool.execute("SELECT phone FROM users WHERE phone COLLATE utf8mb4_general_ci = ? LIMIT 1", [normalizedPhone]);
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
      const [users] = await pool.execute("SELECT phone FROM users WHERE phone COLLATE utf8mb4_general_ci = ? LIMIT 1", [normalizedPhone]);
      if (!users.length) return res.status(404).json({ ok: false, message: "用户不存在，请重新登录" });

      const active = await isForumPostActive(pool, normalizedPostId);
      if (!active) return res.status(404).json({ ok: false, message: "帖子不存在或已超过24小时" });

      const [rows] = await pool.execute(
        "SELECT id FROM forum_post_calls WHERE post_id = ? AND user_phone COLLATE utf8mb4_general_ci = ? LIMIT 1",
        [normalizedPostId, normalizedPhone]
      );

      const action = rows.length > 0 ? "uncalled" : "called";
      if (action === "uncalled") {
        await pool.execute(
          "DELETE FROM forum_post_calls WHERE post_id = ? AND user_phone COLLATE utf8mb4_general_ci = ?",
          [normalizedPostId, normalizedPhone]
        );
      } else {
        await pool.execute("INSERT INTO forum_post_calls (post_id, user_phone) VALUES (?, ?)", [normalizedPostId, normalizedPhone]);
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
    if (!postId) return res.status(400).json({ ok: false, message: "帖子ID无效" });

    try {
      const active = await isForumPostActive(pool, postId);
      if (!active) return res.status(404).json({ ok: false, message: "帖子不存在或已超过24小时" });
      const [rows] = await pool.execute(
        `SELECT c.id, c.post_id, c.parent_id, c.user_phone, c.content, c.image_url, c.created_at, u.username, u.avatar_url
         FROM forum_comments c
         JOIN users u ON c.user_phone COLLATE utf8mb4_general_ci = u.phone COLLATE utf8mb4_general_ci
         WHERE c.post_id = ?
           AND c.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         ORDER BY c.created_at DESC, c.id DESC`,
        [postId]
      );
      res.json({ ok: true, data: rows });
    } catch (error) {
      console.error("论坛评论获取失败:", error.message);
      res.status(500).json({ ok: false, message: `论坛评论获取失败: ${error.message}` });
    }
  });

  app.post("/api/forum/comment/add", async (req, res) => {
    const uploadOk = await runUploadArray(upload, "images", 9, req, res);
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
      if (!active) return res.status(404).json({ ok: false, message: "帖子不存在或已超过24小时" });
      if (normalizedParentId) {
        const [parents] = await pool.execute("SELECT id FROM forum_comments WHERE id = ? AND post_id = ? LIMIT 1", [normalizedParentId, normalizedPostId]);
        if (!parents.length) return res.status(400).json({ ok: false, message: "回复目标不存在" });
      }
      await pool.execute(
        "INSERT INTO forum_comments (post_id, parent_id, user_phone, content, image_url) VALUES (?, ?, ?, ?, ?)",
        [normalizedPostId, normalizedParentId, normalizedPhone, message, imageUrl]
      );
      res.json({ ok: true, message: "评论发布成功" });
    } catch (error) {
      console.error("论坛评论发布失败:", error.message);
      res.status(500).json({ ok: false, message: `论坛评论发布失败: ${error.message}` });
    }
  });
}
