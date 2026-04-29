import { getPublicUploadBaseUrl, toPublicUploadUrl } from "./uploadUrl.js";

export function registerMiscRoutes(app, { pool, upload, ADMIN_PHONE }) {
  const UPLOAD_BASE_URL = getPublicUploadBaseUrl();

  app.get("/api/announcement", async (req, res) => {
    try {
      const [rows] = await pool.execute("SELECT content FROM announcements WHERE id = 1");
      res.json({ ok: true, content: rows[0]?.content || "暂无公告" });
    } catch (error) {
      console.error("获取公告失败:", error.message);
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/announcement/update", async (req, res) => {
    const { phone, newContent } = req.body;
    if (phone !== ADMIN_PHONE) return res.status(403).json({ ok: false });
    try {
      await pool.execute("UPDATE announcements SET content = ? WHERE id = 1", [newContent]);
      res.json({ ok: true });
    } catch (error) {
      console.error("更新公告失败:", error.message);
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/feedback/submit-legacy-disabled", upload.single("image"), async (req, res) => {
    try {
      const { phone, content } = req.body;
      const imageUrl = req.file ? toPublicUploadUrl(req.file.filename) : null;
      await pool.execute("INSERT INTO feedback (phone, content, image_url) VALUES (?, ?, ?)", [phone, content || "", imageUrl]);
      res.json({ ok: true, message: "反馈已收到" });
    } catch (error) {
      console.error("【反馈提交彻底失败】:", error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/feedback/all-legacy-disabled", async (req, res) => {
    const { phone } = req.body;
    if (phone !== ADMIN_PHONE) return res.status(403).json({ ok: false });
    try {
      const [rows] = await pool.execute("SELECT * FROM feedback ORDER BY created_at DESC");
      res.json({ ok: true, data: rows });
    } catch (error) {
      console.error("获取反馈列表失败:", error.message);
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/user/upload-avatar", upload.single("avatar"), async (req, res) => {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ ok: false, message: "缺少手机号" });
    if (!req.file?.filename) return res.status(400).json({ ok: false, message: "未检测到头像文件" });
    try {
      const imageUrl = `${UPLOAD_BASE_URL}${req.file.filename}`;
      await pool.execute("UPDATE users SET avatar_url = ? WHERE phone = ?", [imageUrl, phone]);
      res.json({ ok: true, avatarUrl: imageUrl });
    } catch (error) {
      console.error("头像上传失败:", error);
      res.status(500).json({ ok: false, message: "头像上传失败" });
    }
  });

  app.get("/api/favorites/:phone", async (req, res) => {
    try {
      const [rows] = await pool.execute("SELECT place_id FROM favorites WHERE user_phone = ?", [req.params.phone]);
      res.json({ ok: true, favIds: rows.map((row) => row.place_id) });
    } catch (error) {
      console.error("获取收藏失败:", error.message);
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/favorites/toggle", async (req, res) => {
    try {
      const { phone, placeId } = req.body;
      const normalizedPlaceId = String(placeId);
      const [rows] = await pool.execute("SELECT id FROM favorites WHERE user_phone = ? AND place_id = ?", [phone, normalizedPlaceId]);
      if (rows.length > 0) {
        await pool.execute("DELETE FROM favorites WHERE user_phone = ? AND place_id = ?", [phone, normalizedPlaceId]);
        return res.json({ ok: true, action: "removed" });
      }
      await pool.execute("INSERT INTO favorites (user_phone, place_id) VALUES (?, ?)", [phone, normalizedPlaceId]);
      res.json({ ok: true, action: "added" });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });
}
