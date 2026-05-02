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

  export async function registerNotificationRoutes(app, { pool, requireAuth }) {
    await ensureNotificationsTable(pool);

    app.get("/api/notifications/:phone", requireAuth, async (req, res) => {
      if (String(req.params.phone || "") !== req.authUser.phone) {
        return res.status(403).json({ ok: false, message: "无权限查看该通知" });
      }
      try {
        const sql = `SELECT n.*, COALESCE(u.username, n.sender_phone) AS sender_name, u.avatar_url AS sender_avatar
                     FROM notifications n
                     LEFT JOIN users u ON n.sender_phone = u.phone
                     WHERE n.receiver_phone = ?
                     ORDER BY n.created_at DESC LIMIT 50`;
        const [rows] = await pool.execute(sql, [req.params.phone]);
        res.json({ ok: true, data: rows });
      } catch (error) {
        console.error("获取通知失败:", error.message);
        res.status(500).json({ ok: false });
      }
    });

    app.post("/api/notifications/read", requireAuth, async (req, res) => {
      try {
        await pool.execute("UPDATE notifications SET is_read = 1 WHERE receiver_phone = ?", [req.authUser.phone]);
        res.json({ ok: true });
      } catch (error) {
        console.error("标记通知已读失败:", error.message);
        res.status(500).json({ ok: false });
      }
    });

    app.post("/api/notifications/read-forum", requireAuth, async (req, res) => {
      try {
        await pool.execute(
          `UPDATE notifications SET is_read = 1
           WHERE receiver_phone = ?
             AND (type IN (?, ?, ?, ?) OR place_id LIKE 'forum_%')`,
          [req.authUser.phone, ...FORUM_NOTICE_TYPES],
        );
        res.json({ ok: true });
      } catch (error) {
        console.error("标记论坛通知已读失败:", error.message);
        res.status(500).json({ ok: false });
      }
    });

    app.post("/api/notifications/clear-forum", requireAuth, async (req, res) => {
      try {
        await pool.execute(
          `DELETE FROM notifications
           WHERE receiver_phone = ?
             AND (type IN (?, ?, ?, ?) OR place_id LIKE 'forum_%')`,
          [req.authUser.phone, ...FORUM_NOTICE_TYPES],
        );
        res.json({ ok: true, message: "论坛互动已清空" });
      } catch (error) {
        console.error("清空论坛互动失败:", error.message);
        res.status(500).json({ ok: false });
      }
    });

    app.post("/api/notifications/clear", requireAuth, async (req, res) => {
      try {
        await pool.execute("DELETE FROM notifications WHERE receiver_phone = ?", [req.authUser.phone]);
        res.json({ ok: true, message: "通知已清空" });
      } catch (error) {
        console.error("清空通知失败:", error.message);
        res.status(500).json({ ok: false });
      }
    });
  }
