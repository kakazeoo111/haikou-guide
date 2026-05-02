import { attachBadgeProfileFields } from "./badgeProfileCache.js";
import { buildUploadedImagePayload, getUploadedImageAndThumbFiles } from "./uploadImagePayload.js";
import { validateUploadedImages } from "./uploadPolicy.js";

function normalizeUploadedImages(files) {
  const { images, thumbnails } = getUploadedImageAndThumbFiles(files);
  return buildUploadedImagePayload(images, thumbnails);
}

async function ensurePlaceCommentTables(pool) {
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS place_likes (
      id INT NOT NULL AUTO_INCREMENT,
      phone VARCHAR(20) NOT NULL,
      place_id VARCHAR(120) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_place_likes_phone_place (phone, place_id),
      KEY idx_place_likes_place_id (place_id),
      KEY idx_place_likes_phone (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await pool.execute(
    `CREATE TABLE IF NOT EXISTS comments (
      id INT NOT NULL AUTO_INCREMENT,
      place_id VARCHAR(120) NOT NULL,
      user_phone VARCHAR(20) NOT NULL,
      content TEXT NULL,
      image_url LONGTEXT NULL,
      parent_id INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_comments_place_created (place_id, created_at),
      KEY idx_comments_user_phone (user_phone),
      KEY idx_comments_parent_id (parent_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await pool.execute(
    `CREATE TABLE IF NOT EXISTS comment_likes (
      id INT NOT NULL AUTO_INCREMENT,
      phone VARCHAR(20) NOT NULL,
      comment_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_comment_likes_phone_comment (phone, comment_id),
      KEY idx_comment_likes_comment_id (comment_id),
      KEY idx_comment_likes_phone (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}

const COMMENT_LIST_SQL = `
  SELECT c.*, u.username, u.avatar_url,
         COALESCE(all_likes.like_count, 0) AS like_count,
         COALESCE(my_likes.is_liked, 0) AS is_liked
  FROM comments c
  JOIN users u ON c.user_phone COLLATE utf8mb4_general_ci = u.phone COLLATE utf8mb4_general_ci
  LEFT JOIN (
    SELECT comment_id, COUNT(*) AS like_count
    FROM comment_likes
    GROUP BY comment_id
  ) all_likes ON all_likes.comment_id = c.id
  LEFT JOIN (
    SELECT comment_id, 1 AS is_liked
    FROM comment_likes
    WHERE phone COLLATE utf8mb4_general_ci = ?
    GROUP BY comment_id
  ) my_likes ON my_likes.comment_id = c.id
  WHERE c.place_id = ?
  ORDER BY c.created_at DESC, c.id DESC
`;

function isAdminPhone(phone, adminPhone) {
  return String(phone || "") === String(adminPhone || "");
}

async function collectPlaceCommentTreeIds(pool, rootCommentId) {
  const ids = [Number(rootCommentId)];
  const queue = [Number(rootCommentId)];
  const seen = new Set(ids.map(String));

  while (queue.length > 0) {
    const batch = queue.splice(0, queue.length);
    const placeholders = batch.map(() => "?").join(", ");
    const [rows] = await pool.execute(`SELECT id FROM comments WHERE parent_id IN (${placeholders})`, batch);
    rows.forEach((row) => {
      const id = Number(row.id);
      if (!id || seen.has(String(id))) return;
      seen.add(String(id));
      ids.push(id);
      queue.push(id);
    });
  }

  return ids;
}

export async function registerPlaceCommentRoutes(app, { pool, upload, addNotice, ADMIN_PHONE, requireAuth, optionalAuth }) {
  await ensurePlaceCommentTables(pool);

  app.get("/api/places/stats", optionalAuth, async (req, res) => {
    const phone = req.authUser?.phone || "";
    try {
      const statsPromise = pool.execute("SELECT place_id, COUNT(*) as count FROM place_likes GROUP BY place_id");
      const myLikesPromise = phone
        ? pool.execute("SELECT place_id FROM place_likes WHERE phone COLLATE utf8mb4_general_ci = ?", [phone])
        : Promise.resolve([[]]);
      const [statsResult, myLikesResult] = await Promise.all([statsPromise, myLikesPromise]);
      const [statsRows] = statsResult;
      const [myLikes] = myLikesResult;
      const stats = {};
      statsRows.forEach((row) => {
        stats[row.place_id] = row.count;
      });
      res.json({ ok: true, stats, myLikedIds: myLikes.map((row) => row.place_id) });
    } catch (error) {
      console.error("获取景点赞统计失败:", error.message);
      res.status(500).json({ ok: false, message: `获取景点赞统计失败: ${error.message}` });
    }
  });

  app.post("/api/places/like", requireAuth, async (req, res) => {
    const { placeId } = req.body;
    const phone = req.authUser.phone;
    try {
      const [rows] = await pool.execute(
        "SELECT id FROM place_likes WHERE phone COLLATE utf8mb4_general_ci = ? AND place_id = ?",
        [phone, placeId]
      );
      const action = rows.length > 0 ? "unliked" : "liked";
      if (rows.length > 0) {
        await pool.execute("DELETE FROM place_likes WHERE phone COLLATE utf8mb4_general_ci = ? AND place_id = ?", [phone, placeId]);
      } else {
        await pool.execute("INSERT INTO place_likes (phone, place_id) VALUES (?, ?)", [phone, placeId]);
        if (String(placeId).startsWith("rec_")) {
          const recId = placeId.replace("rec_", "");
          const [owner] = await pool.execute("SELECT user_phone FROM recommendations WHERE id = ?", [recId]);
          if (owner.length > 0) await addNotice(owner[0].user_phone, phone, "like_place", placeId);
        }
      }
      const [countRow] = await pool.execute("SELECT COUNT(*) as count FROM place_likes WHERE place_id = ?", [placeId]);
      res.json({ ok: true, action, newCount: countRow[0].count });
    } catch (error) {
      console.error("景点点赞失败:", error.message);
      res.status(500).json({ ok: false, message: `景点点赞失败: ${error.message}` });
    }
  });

  app.get("/api/comments/:placeId", optionalAuth, async (req, res) => {
    const phone = req.authUser?.phone || "";
    const placeId = req.params.placeId;
    try {
      const [rows] = await pool.execute(COMMENT_LIST_SQL, [phone || "", placeId]);
      const rowsWithBadge = await attachBadgeProfileFields(pool, rows);
      res.json({ ok: true, comments: rowsWithBadge.map((row) => ({ ...row, is_liked: row.is_liked > 0 })) });
    } catch (error) {
      console.error("获取评论失败:", error.message);
      res.status(500).json({ ok: false, message: `获取评论失败: ${error.message}` });
    }
  });

  app.post("/api/comments/like", requireAuth, async (req, res) => {
    try {
      const { commentId } = req.body;
      const phone = req.authUser.phone;
      const [rows] = await pool.execute(
        "SELECT id FROM comment_likes WHERE phone COLLATE utf8mb4_general_ci = ? AND comment_id = ?",
        [phone, commentId]
      );
      if (rows.length > 0) {
        await pool.execute("DELETE FROM comment_likes WHERE phone COLLATE utf8mb4_general_ci = ? AND comment_id = ?", [phone, commentId]);
      } else {
        await pool.execute("INSERT INTO comment_likes (phone, comment_id) VALUES (?, ?)", [phone, commentId]);
        const [author] = await pool.execute("SELECT user_phone, place_id FROM comments WHERE id = ?", [commentId]);
        if (author.length > 0) await addNotice(author[0].user_phone, phone, "like_comment", author[0].place_id);
      }
      res.json({ ok: true });
    } catch (error) {
      console.error("评论点赞失败:", error.message);
      res.status(500).json({ ok: false, message: `评论点赞失败: ${error.message}` });
    }
  });

  app.post("/api/comments/add", requireAuth, upload.fields([{ name: "images", maxCount: 9 }, { name: "thumbnails", maxCount: 9 }]), async (req, res) => {
    try {
      if (!(await validateUploadedImages(req, res))) return;
      const { placeId, content, parentId } = req.body;
      const phone = req.authUser.phone;
      const imageUrls = normalizeUploadedImages(req.files);
      await pool.execute(
        "INSERT INTO comments (place_id, user_phone, content, image_url, parent_id) VALUES (?, ?, ?, ?, ?)",
        [placeId, phone, content || "", JSON.stringify(imageUrls), parentId || null]
      );
      if (parentId) {
        const [parent] = await pool.execute("SELECT user_phone FROM comments WHERE id = ?", [parentId]);
        if (parent.length > 0) await addNotice(parent[0].user_phone, phone, "reply", placeId, content);
      }
      res.json({ ok: true });
    } catch (error) {
      console.error("发布评论失败:", error.message);
      res.status(500).json({ ok: false, message: `发布评论失败: ${error.message}` });
    }
  });

  app.post("/api/comments/delete", requireAuth, async (req, res) => {
    try {
      const { commentId } = req.body;
      const phone = req.authUser.phone;
      const [rows] = await pool.execute("SELECT id, user_phone FROM comments WHERE id = ? LIMIT 1", [commentId]);
      const targetComment = rows[0];
      if (!targetComment) return res.status(404).json({ ok: false, message: "评论不存在" });
      const canDelete = isAdminPhone(phone, ADMIN_PHONE) || String(targetComment.user_phone || "") === String(phone || "");
      if (!canDelete) return res.status(403).json({ ok: false, message: "只能删除自己的评论" });

      const idsToDelete = await collectPlaceCommentTreeIds(pool, targetComment.id);
      const placeholders = idsToDelete.map(() => "?").join(", ");
      await pool.execute(`DELETE FROM comment_likes WHERE comment_id IN (${placeholders})`, idsToDelete);
      await pool.execute(`DELETE FROM comments WHERE id IN (${placeholders})`, idsToDelete);
      res.json({ ok: true, deletedIds: idsToDelete });
    } catch (error) {
      console.error("删除评论失败:", error.message);
      res.status(500).json({ ok: false, message: `删除评论失败: ${error.message}` });
    }
  });
}
