function normalizeForumImages(files) {
  const urls = (files || []).map((item) => `https://api.suzcore.top/uploads/${item.filename}`);
  if (!urls.length) return null;
  return JSON.stringify(urls);
}

function parsePositiveInt(value) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) return null;
  return normalized;
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
    const search = String(req.query.search || "").trim();
    try {
      const [rows] = await pool.execute(
        `SELECT p.id, p.user_phone, p.content, p.image_url, p.created_at, u.username, u.avatar_url,
                (SELECT COUNT(*) FROM forum_comments c
                  WHERE c.post_id = p.id
                    AND c.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) AS comment_count
         FROM forum_posts p
         JOIN users u ON p.user_phone = u.phone
         WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
           AND (? = '' OR u.username LIKE CONCAT('%', ?, '%') OR p.content LIKE CONCAT('%', ?, '%'))
         ORDER BY p.created_at DESC, p.id DESC`,
        [search, search, search]
      );
      res.json({ ok: true, data: rows });
    } catch (error) {
      console.error("论坛帖子获取失败:", error.message);
      res.status(500).json({ ok: false, message: `论坛帖子获取失败: ${error.message}` });
    }
  });

  app.post("/api/forum/post/add", upload.array("images", 9), async (req, res) => {
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

  app.get("/api/forum/comments/:postId", async (req, res) => {
    const postId = parsePositiveInt(req.params.postId);
    if (!postId) return res.status(400).json({ ok: false, message: "帖子ID无效" });
    try {
      const active = await isForumPostActive(pool, postId);
      if (!active) return res.status(404).json({ ok: false, message: "帖子不存在或已超过24小时" });
      const [rows] = await pool.execute(
        `SELECT c.id, c.post_id, c.parent_id, c.user_phone, c.content, c.created_at, u.username, u.avatar_url
         FROM forum_comments c
         JOIN users u ON c.user_phone = u.phone
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
    const { phone, postId, parentId, content } = req.body;
    const normalizedPhone = String(phone || "").trim();
    const normalizedPostId = parsePositiveInt(postId);
    const normalizedParentId = parentId ? parsePositiveInt(parentId) : null;
    const message = String(content || "").trim();
    if (!normalizedPhone) return res.status(400).json({ ok: false, message: "手机号不能为空" });
    if (!normalizedPostId) return res.status(400).json({ ok: false, message: "帖子ID无效" });
    if (!message) return res.status(400).json({ ok: false, message: "评论内容不能为空" });
    try {
      const active = await isForumPostActive(pool, normalizedPostId);
      if (!active) return res.status(404).json({ ok: false, message: "帖子不存在或已超过24小时" });
      if (normalizedParentId) {
        const [parents] = await pool.execute("SELECT id FROM forum_comments WHERE id = ? AND post_id = ? LIMIT 1", [normalizedParentId, normalizedPostId]);
        if (!parents.length) return res.status(400).json({ ok: false, message: "回复目标不存在" });
      }
      await pool.execute(
        "INSERT INTO forum_comments (post_id, parent_id, user_phone, content) VALUES (?, ?, ?, ?)",
        [normalizedPostId, normalizedParentId, normalizedPhone, message]
      );
      res.json({ ok: true, message: "评论发布成功" });
    } catch (error) {
      console.error("论坛评论发布失败:", error.message);
      res.status(500).json({ ok: false, message: `论坛评论发布失败: ${error.message}` });
    }
  });
}
