async function ensureNotificationTypeColumn(pool) {
  const [rows] = await pool.execute("SHOW COLUMNS FROM notifications LIKE 'type'");
  const columnType = String(rows?.[0]?.Type || "").toLowerCase();
  if (!columnType.startsWith("enum(")) return;
  await pool.execute("ALTER TABLE notifications MODIFY COLUMN type VARCHAR(50) NOT NULL");
}

async function ensureNotificationsTable(pool) {
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
  await ensureNotificationTypeColumn(pool);
}

const FORUM_NOTICE_TYPES = ["forum_call", "forum_comment", "forum_reply", "forum_comment_like"];

export async function registerNotificationRoutes(app, { pool }) {
  await ensureNotificationsTable(pool);

  app.get("/api/notifications/:phone", async (req, res) => {
    try {
      const sql = `SELECT n.*, COALESCE(u.username, n.sender_phone) AS sender_name, u.avatar_url AS sender_avatar
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

  app.post("/api/notifications/read-forum", async (req, res) => {
    try {
      const { phone } = req.body;
      await pool.execute(
        `UPDATE notifications SET is_read = 1
         WHERE receiver_phone = ?
           AND (type IN (?, ?, ?) OR place_id LIKE 'forum_%')`,
        [phone, ...FORUM_NOTICE_TYPES],
      );
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/notifications/clear-forum", async (req, res) => {
    try {
      const { phone } = req.body;
      await pool.execute(
        `DELETE FROM notifications
         WHERE receiver_phone = ?
           AND (type IN (?, ?, ?) OR place_id LIKE 'forum_%')`,
        [phone, ...FORUM_NOTICE_TYPES],
      );
      res.json({ ok: true, message: "论坛互动已删除" });
    } catch (error) {
      console.error("删除论坛互动失败:", error.message);
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
