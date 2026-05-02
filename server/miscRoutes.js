import { getPublicUploadBaseUrl } from "./uploadUrl.js";
import { validateUploadedImages } from "./uploadPolicy.js";

export function registerMiscRoutes(app, { pool, upload, requireAuth, requireAdmin }) {
  const UPLOAD_BASE_URL = getPublicUploadBaseUrl();

  app.get("/api/announcement", async (req, res) => {
    try {
      const [rows] = await pool.execute("SELECT content FROM announcements WHERE id = 1");
      res.json({ ok: true, content: rows[0]?.content || "鏆傛棤鍏憡" });
    } catch (error) {
      console.error("鑾峰彇鍏憡澶辫触:", error.message);
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/announcement/update", requireAdmin, async (req, res) => {
    const { newContent } = req.body;
    try {
      await pool.execute("UPDATE announcements SET content = ? WHERE id = 1", [newContent]);
      res.json({ ok: true });
    } catch (error) {
      console.error("鏇存柊鍏憡澶辫触:", error.message);
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/feedback/submit-legacy-disabled", async (req, res) => {
    res.status(410).json({ ok: false, message: "旧接口已停用" });
  });

  app.post("/api/feedback/all-legacy-disabled", async (req, res) => {
    res.status(410).json({ ok: false, message: "旧接口已停用" });
  });

  app.post("/api/user/upload-avatar", requireAuth, upload.single("avatar"), async (req, res) => {
    const phone = req.authUser.phone;
    if (!req.file?.filename) return res.status(400).json({ ok: false, message: "鏈娴嬪埌澶村儚鏂囦欢" });
    if (!(await validateUploadedImages(req, res))) return;
    try {
      const imageUrl = `${UPLOAD_BASE_URL}${req.file.filename}`;
      await pool.execute("UPDATE users SET avatar_url = ? WHERE phone = ?", [imageUrl, phone]);
      res.json({ ok: true, avatarUrl: imageUrl });
    } catch (error) {
      console.error("澶村儚涓婁紶澶辫触:", error);
      res.status(500).json({ ok: false, message: "澶村儚涓婁紶澶辫触" });
    }
  });

  app.get("/api/favorites/:phone", requireAuth, async (req, res) => {
    if (String(req.params.phone || "") !== req.authUser.phone) {
      return res.status(403).json({ ok: false, message: "无权限查看该收藏" });
    }
    try {
      const [rows] = await pool.execute("SELECT place_id FROM favorites WHERE user_phone = ?", [req.authUser.phone]);
      res.json({ ok: true, favIds: rows.map((row) => row.place_id) });
    } catch (error) {
      console.error("鑾峰彇鏀惰棌澶辫触:", error.message);
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/favorites/toggle", requireAuth, async (req, res) => {
    try {
      const { placeId } = req.body;
      const phone = req.authUser.phone;
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




