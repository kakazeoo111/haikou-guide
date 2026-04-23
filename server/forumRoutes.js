function normalizeForumImages(files) {
  const urls = (files || []).map((item) => `https://api.suzcore.top/uploads/${item.filename}`);
  if (!urls.length) return null;
  return JSON.stringify(urls);
}

const FORUM_IMAGE_TOO_LARGE_MESSAGE = "������ͼƬ�ڴ���󣨲��ó���5MB��";

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

function buildForumNoticePlaceId(postId) {
  return `${FORUM_NOTICE_PLACE_ID_PREFIX}${postId}`;
}

function truncateForumCommentSnippet(content) {
  const text = String(content || "").trim();
  if (text.length <= FORUM_NOTICE_COMMENT_SNIPPET_LIMIT) return text;
  return `${text.slice(0, FORUM_NOTICE_COMMENT_SNIPPET_LIMIT)}…`;
}

async function getForumPostOwnerPhone(pool, postId) {
  const [rows] = await pool.execute("SELECT user_phone FROM forum_posts WHERE id = ? LIMIT 1", [postId]);
  return rows[0]?.user_phone || "";
}

async function getForumCommentAuthorPhone(pool, commentId, postId) {
  const [rows] = await pool.execute(
    "SELECT user_phone FROM forum_comments WHERE id = ? AND post_id = ? LIMIT 1",
    [commentId, postId],
  );
  return rows[0]?.user_phone || "";
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
  res.status(400).json({ ok: false, message: error.message || "ͼƬ�ϴ�ʧ��" });
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
    "SELECT id FROM forum_posts WHERE id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) LIMIT 1",
    [postId]
  );
  return rows.length > 0;
}

export async function registerForumRoutes(app, { pool, upload, addNotice }) {
  await ensureForumTables(pool);

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

      const data = rows.map((row) => ({
        ...row,
        comment_count: Number(row.comment_count || 0),
        call_count: Number(row.call_count || 0),
        is_called: Number(row.is_called || 0) > 0,
      }));
      res.json({ ok: true, data, sortMode });
    } catch (error) {
      console.error("��̳���ӻ�ȡʧ��:", error.message);
      res.status(500).json({ ok: false, message: `��̳���ӻ�ȡʧ��: ${error.message}` });
    }
  });

  app.post("/api/forum/post/add", async (req, res) => {
    const uploadOk = await runUploadArray(upload, "images", 9, req, res);
    if (!uploadOk) return;
    const { phone, content } = req.body;
    const normalizedPhone = String(phone || "").trim();
    const message = String(content || "").trim();
    const imageUrl = normalizeForumImages(req.files);
    if (!normalizedPhone) return res.status(400).json({ ok: false, message: "�ֻ��Ų���Ϊ��" });
    if (!message && !imageUrl) return res.status(400).json({ ok: false, message: "�������ݲ���Ϊ��" });

    try {
      const [users] = await pool.execute("SELECT phone FROM users WHERE phone = ? LIMIT 1", [normalizedPhone]);
      if (!users.length) return res.status(404).json({ ok: false, message: "�û������ڣ������µ�¼" });
      const [result] = await pool.execute(
        "INSERT INTO forum_posts (user_phone, content, image_url) VALUES (?, ?, ?)",
        [normalizedPhone, message, imageUrl]
      );
      res.json({ ok: true, message: "���ӷ����ɹ�", postId: Number(result.insertId) });
    } catch (error) {
      console.error("��̳���ӷ���ʧ��:", error.message);
      res.status(500).json({ ok: false, message: `��̳���ӷ���ʧ��: ${error.message}` });
    }
  });

  app.post("/api/forum/post/call", async (req, res) => {
    const { phone, postId } = req.body;
    const normalizedPhone = String(phone || "").trim();
    const normalizedPostId = parsePositiveInt(postId);
    if (!normalizedPhone) return res.status(400).json({ ok: false, message: "�ֻ��Ų���Ϊ��" });
    if (!normalizedPostId) return res.status(400).json({ ok: false, message: "����ID��Ч" });

    try {
      const [users] = await pool.execute("SELECT phone FROM users WHERE phone = ? LIMIT 1", [normalizedPhone]);
      if (!users.length) return res.status(404).json({ ok: false, message: "�û������ڣ������µ�¼" });

      const active = await isForumPostActive(pool, normalizedPostId);
      if (!active) return res.status(404).json({ ok: false, message: "���Ӳ����ڻ��ѳ���7��" });

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
        if (ownerPhone) await addNotice(ownerPhone, normalizedPhone, "forum_call", buildForumNoticePlaceId(normalizedPostId));
      }

      const [countRows] = await pool.execute("SELECT COUNT(*) AS count FROM forum_post_calls WHERE post_id = ?", [normalizedPostId]);
      const callCount = Number(countRows[0]?.count || 0);
      res.json({ ok: true, action, callCount });
    } catch (error) {
      console.error("��̳��callʧ��:", error.message);
      res.status(500).json({ ok: false, message: `��̳��callʧ��: ${error.message}` });
    }
  });

  app.get("/api/forum/comments/:postId", async (req, res) => {
    const postId = parsePositiveInt(req.params.postId);
    if (!postId) return res.status(400).json({ ok: false, message: "����ID��Ч" });

    try {
      const active = await isForumPostActive(pool, postId);
      if (!active) return res.status(404).json({ ok: false, message: "���Ӳ����ڻ��ѳ���7��" });
      const [rows] = await pool.execute(
        `SELECT c.id, c.post_id, c.parent_id, c.user_phone, c.content, c.image_url, c.created_at, u.username, u.avatar_url
         FROM forum_comments c
         JOIN users u ON c.user_phone COLLATE utf8mb4_general_ci = u.phone COLLATE utf8mb4_general_ci
         WHERE c.post_id = ?
           AND c.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         ORDER BY c.created_at DESC, c.id DESC`,
        [postId]
      );
      res.json({ ok: true, data: rows });
    } catch (error) {
      console.error("��̳���ۻ�ȡʧ��:", error.message);
      res.status(500).json({ ok: false, message: `��̳���ۻ�ȡʧ��: ${error.message}` });
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
    if (!normalizedPhone) return res.status(400).json({ ok: false, message: "�ֻ��Ų���Ϊ��" });
    if (!normalizedPostId) return res.status(400).json({ ok: false, message: "����ID��Ч" });
    if (!message && !imageUrl) return res.status(400).json({ ok: false, message: "�������ݺ�ͼƬ����ͬʱΪ��" });

    try {
      const active = await isForumPostActive(pool, normalizedPostId);
      if (!active) return res.status(404).json({ ok: false, message: "���Ӳ����ڻ��ѳ���7��" });
      if (normalizedParentId) {
        const [parents] = await pool.execute("SELECT id FROM forum_comments WHERE id = ? AND post_id = ? LIMIT 1", [normalizedParentId, normalizedPostId]);
        if (!parents.length) return res.status(400).json({ ok: false, message: "�ظ�Ŀ�겻����" });
      }
      await pool.execute(
        "INSERT INTO forum_comments (post_id, parent_id, user_phone, content, image_url) VALUES (?, ?, ?, ?, ?)",
        [normalizedPostId, normalizedParentId, normalizedPhone, message, imageUrl]
      );
      const noticePlaceId = buildForumNoticePlaceId(normalizedPostId);
      const snippet = truncateForumCommentSnippet(message);
      const ownerPhone = await getForumPostOwnerPhone(pool, normalizedPostId);
      if (ownerPhone) await addNotice(ownerPhone, normalizedPhone, "forum_comment", noticePlaceId, snippet);
      if (normalizedParentId) {
        const parentAuthorPhone = await getForumCommentAuthorPhone(pool, normalizedParentId, normalizedPostId);
        if (parentAuthorPhone && parentAuthorPhone !== ownerPhone) {
          await addNotice(parentAuthorPhone, normalizedPhone, "forum_reply", noticePlaceId, snippet);
        }
      }
      res.json({ ok: true, message: "���۷����ɹ�" });
    } catch (error) {
      console.error("��̳���۷���ʧ��:", error.message);
      res.status(500).json({ ok: false, message: `��̳���۷���ʧ��: ${error.message}` });
    }
  });
}
