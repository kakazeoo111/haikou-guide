function normalizeUploadedImages(files) {
  return files ? files.map((file) => `https://api.suzcore.top/uploads/${file.filename}`) : [];
}

export function registerPlaceCommentRoutes(app, { pool, upload, addNotice }) {
  app.get("/api/places/stats", async (req, res) => {
    const { phone } = req.query;
    try {
      const [statsRows] = await pool.execute("SELECT place_id, COUNT(*) as count FROM place_likes GROUP BY place_id");
      const [myLikes] = await pool.execute("SELECT place_id FROM place_likes WHERE phone = ?", [phone || ""]);
      const stats = {};
      statsRows.forEach((row) => {
        stats[row.place_id] = row.count;
      });
      res.json({ ok: true, stats, myLikedIds: myLikes.map((row) => row.place_id) });
    } catch (error) {
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/places/like", async (req, res) => {
    const { phone, placeId } = req.body;
    try {
      const [rows] = await pool.execute("SELECT id FROM place_likes WHERE phone = ? AND place_id = ?", [phone, placeId]);
      const action = rows.length > 0 ? "unliked" : "liked";
      if (rows.length > 0) {
        await pool.execute("DELETE FROM place_likes WHERE phone = ? AND place_id = ?", [phone, placeId]);
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
      res.status(500).json({ ok: false });
    }
  });

  app.get("/api/comments/:placeId", async (req, res) => {
    const { phone } = req.query;
    const placeId = req.params.placeId;
    try {
      const sql = `SELECT c.*, u.username, u.avatar_url,
                  (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as like_count,
                  (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND phone = ?) as is_liked
                  FROM comments c
                  JOIN users u ON c.user_phone = u.phone
                  WHERE c.place_id = ?
                  ORDER BY c.created_at DESC, c.id DESC`;
      const [rows] = await pool.execute(sql, [phone || "", placeId]);
      res.json({ ok: true, comments: rows.map((row) => ({ ...row, is_liked: row.is_liked > 0 })) });
    } catch (error) {
      res.status(500).json({ ok: false, message: "获取评论失败" });
    }
  });

  app.post("/api/comments/like", async (req, res) => {
    try {
      const { phone, commentId } = req.body;
      const [rows] = await pool.execute("SELECT id FROM comment_likes WHERE phone = ? AND comment_id = ?", [phone, commentId]);
      if (rows.length > 0) {
        await pool.execute("DELETE FROM comment_likes WHERE phone = ? AND comment_id = ?", [phone, commentId]);
      } else {
        await pool.execute("INSERT INTO comment_likes (phone, comment_id) VALUES (?, ?)", [phone, commentId]);
        const [author] = await pool.execute("SELECT user_phone, place_id FROM comments WHERE id = ?", [commentId]);
        if (author.length > 0) await addNotice(author[0].user_phone, phone, "like_comment", author[0].place_id);
      }
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/comments/add", upload.array("images", 9), async (req, res) => {
    try {
      const { phone, placeId, content, parentId } = req.body;
      const imageUrls = normalizeUploadedImages(req.files);
      await pool.execute(
        "INSERT INTO comments (place_id, user_phone, content, image_url, parent_id) VALUES (?, ?, ?, ?, ?)",
        [placeId, phone, content || "", JSON.stringify(imageUrls), parentId || null],
      );
      if (parentId) {
        const [parent] = await pool.execute("SELECT user_phone FROM comments WHERE id = ?", [parentId]);
        if (parent.length > 0) await addNotice(parent[0].user_phone, phone, "reply", placeId, content);
      }
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/comments/delete", async (req, res) => {
    try {
      const { phone, commentId } = req.body;
      await pool.execute("DELETE FROM comments WHERE id = ? AND user_phone = ?", [commentId, phone]);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ ok: false });
    }
  });
}
