export function registerNotificationRoutes(app, { pool }) {
  app.get("/api/notifications/:phone", async (req, res) => {
    try {
      const sql = `SELECT n.*, COALESCE(u.username, n.sender_phone) as sender_name, u.avatar_url as sender_avatar
                   FROM notifications n
                   LEFT JOIN users u ON n.sender_phone = u.phone
                   WHERE n.receiver_phone = ?
                   ORDER BY n.created_at DESC LIMIT 50`;
      const [rows] = await pool.execute(sql, [req.params.phone]);
      res.json({ ok: true, data: rows });
    } catch (error) {
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/notifications/read", async (req, res) => {
    try {
      await pool.execute("UPDATE notifications SET is_read = 1 WHERE receiver_phone = ?", [req.body.phone]);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/notifications/clear", async (req, res) => {
    try {
      const { phone } = req.body;
      await pool.execute("DELETE FROM notifications WHERE receiver_phone = ?", [phone]);
      res.json({ ok: true, message: "通知已清空" });
    } catch (error) {
      console.error("清空通知失败:", error.message);
      res.status(500).json({ ok: false });
    }
  });
}
