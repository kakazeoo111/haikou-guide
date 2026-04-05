function normalizeUploadedImages(files) {
  return files ? files.map((file) => `https://api.suzcore.top/uploads/${file.filename}`) : [];
}

export function registerRecommendationRoutes(app, { pool, upload, addNotice }) {
  app.get("/api/recommendations", async (req, res) => {
    const { phone } = req.query;
    try {
      const sql = `
        SELECT r.*, u.username, u.avatar_url,
        (SELECT COUNT(*) FROM recommendation_likes WHERE recommendation_id = r.id) as like_count,
        (SELECT COUNT(*) FROM recommendation_likes WHERE recommendation_id = r.id AND phone = ?) as is_liked
        FROM recommendations r
        JOIN users u ON r.user_phone = u.phone
        ORDER BY r.created_at DESC`;
      const [rows] = await pool.execute(sql, [phone || ""]);
      const data = rows.map((row) => ({ ...row, is_liked: row.is_liked > 0 }));
      res.json({ ok: true, data });
    } catch (error) {
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/recommendations/add", upload.array("images", 9), async (req, res) => {
    const { phone, place_name, description, lat, lng } = req.body;
    const imageUrls = normalizeUploadedImages(req.files);
    try {
      await pool.execute(
        "INSERT INTO recommendations (user_phone, place_name, description, lat, lng, image_url) VALUES (?, ?, ?, ?, ?, ?)",
        [phone, place_name, description || "", lat, lng, JSON.stringify(imageUrls)],
      );
      res.json({ ok: true, message: "推荐成功！" });
    } catch (error) {
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/recommendations/like", async (req, res) => {
    const { phone, recId } = req.body;
    try {
      const id = parseInt(recId, 10);
      const [rows] = await pool.execute("SELECT id FROM recommendation_likes WHERE phone = ? AND recommendation_id = ?", [phone, id]);
      if (rows.length > 0) {
        await pool.execute("DELETE FROM recommendation_likes WHERE phone = ? AND recommendation_id = ?", [phone, id]);
        return res.json({ ok: true, action: "unliked" });
      }
      await pool.execute("INSERT INTO recommendation_likes (phone, recommendation_id) VALUES (?, ?)", [phone, id]);
      const [owner] = await pool.execute("SELECT user_phone FROM recommendations WHERE id = ?", [id]);
      if (owner.length > 0) await addNotice(owner[0].user_phone, phone, "like_place", `rec_${id}`);
      res.json({ ok: true, action: "liked" });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message });
    }
  });

  app.post("/api/recommendations/delete", async (req, res) => {
    const { phone, recId } = req.body;
    try {
      const [result] = await pool.execute("DELETE FROM recommendations WHERE id = ? AND user_phone = ?", [recId, phone]);
      res.json({ ok: result.affectedRows > 0 });
    } catch (error) {
      res.status(500).json({ ok: false });
    }
  });
}
