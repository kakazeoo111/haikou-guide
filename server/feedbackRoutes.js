const FEEDBACK_ADMIN_COLUMNS = [
  { name: "is_read", ddl: "ALTER TABLE feedback ADD COLUMN is_read TINYINT(1) NOT NULL DEFAULT 0" },
  { name: "is_resolved", ddl: "ALTER TABLE feedback ADD COLUMN is_resolved TINYINT(1) NOT NULL DEFAULT 0" },
  { name: "resolved_at", ddl: "ALTER TABLE feedback ADD COLUMN resolved_at DATETIME NULL" },
  { name: "admin_reply", ddl: "ALTER TABLE feedback ADD COLUMN admin_reply TEXT NULL" },
  { name: "replied_at", ddl: "ALTER TABLE feedback ADD COLUMN replied_at DATETIME NULL" },
];

function isAdminPhone(phone, adminPhone) {
  return String(phone || "") === String(adminPhone || "");
}

function parseOptionalBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return null;
}

async function ensureFeedbackAdminColumns(pool) {
  const [columns] = await pool.query("SHOW COLUMNS FROM feedback");
  const existed = new Set(columns.map((col) => String(col.Field || "")));
  for (const column of FEEDBACK_ADMIN_COLUMNS) {
    if (existed.has(column.name)) continue;
    await pool.execute(column.ddl);
  }
}

function formatFeedbackRows(rows) {
  return (rows || []).map((row) => ({
    ...row,
    user_phone: row.user_phone || row.phone,
    is_read: Boolean(row.is_read),
    is_resolved: Boolean(row.is_resolved),
  }));
}

async function fetchAllFeedbackRows(pool) {
  const [rows] = await pool.execute(
    `SELECT id, phone, phone AS user_phone, content, image_url, created_at, 
            is_read, is_resolved, resolved_at, admin_reply, replied_at 
     FROM feedback 
     ORDER BY created_at DESC`
  );
  return formatFeedbackRows(rows);
}

export async function registerFeedbackRoutes(app, { pool, upload, ADMIN_PHONE }) {
  await ensureFeedbackAdminColumns(pool);

  app.post("/api/feedback/submit", upload.single("image"), async (req, res) => {
    try {
      const { phone, content } = req.body;
      const imageUrl = req.file ? `https://api.suzcore.top/uploads/${req.file.filename}` : null;
      await pool.execute("INSERT INTO feedback (phone, content, image_url) VALUES (?, ?, ?)", [phone, content || "", imageUrl]);
      res.json({ ok: true, message: "反馈已收到" });
    } catch (error) {
      console.error("反馈提交失败:", error.message);
      res.status(500).json({ ok: false, message: `反馈提交失败: ${error.message}` });
    }
  });

  app.post("/api/feedback/all", async (req, res) => {
    const { phone } = req.body;
    if (!isAdminPhone(phone, ADMIN_PHONE)) return res.status(403).json({ ok: false, message: "无权限查看反馈库" });
    try {
      const data = await fetchAllFeedbackRows(pool);
      res.json({ ok: true, data });
    } catch (error) {
      console.error("反馈库获取失败:", error.message);
      res.status(500).json({ ok: false, message: `反馈库获取失败: ${error.message}` });
    }
  });

  app.post("/api/feedback/status", async (req, res) => {
    const { phone, feedbackId, isRead, isResolved } = req.body;
    if (!isAdminPhone(phone, ADMIN_PHONE)) return res.status(403).json({ ok: false, message: "无权限操作反馈状态" });

    const normalizedId = Number(feedbackId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) return res.status(400).json({ ok: false, message: "反馈ID无效" });

    const nextRead = parseOptionalBoolean(isRead);
    const nextResolved = parseOptionalBoolean(isResolved);
    const fields = [];
    const params = [];
    if (nextRead !== null) {
      fields.push("is_read = ?");
      params.push(nextRead ? 1 : 0);
    }
    if (nextResolved !== null) {
      fields.push("is_resolved = ?");
      fields.push("resolved_at = ?");
      params.push(nextResolved ? 1 : 0, nextResolved ? new Date() : null);
    }
    if (fields.length === 0) return res.status(400).json({ ok: false, message: "缺少可更新字段" });

    params.push(normalizedId);
    try {
      const [result] = await pool.execute(`UPDATE feedback SET ${fields.join(", ")} WHERE id = ?`, params);
      if (!result.affectedRows) return res.status(404).json({ ok: false, message: "反馈不存在或已删除" });
      res.json({ ok: true, message: "反馈状态已更新" });
    } catch (error) {
      console.error("反馈状态更新失败:", error.message);
      res.status(500).json({ ok: false, message: `反馈状态更新失败: ${error.message}` });
    }
  });

  app.post("/api/feedback/delete", async (req, res) => {
    const { phone, feedbackId } = req.body;
    if (!isAdminPhone(phone, ADMIN_PHONE)) return res.status(403).json({ ok: false, message: "无权限删除反馈" });

    const normalizedId = Number(feedbackId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) return res.status(400).json({ ok: false, message: "反馈ID无效" });

    try {
      const [result] = await pool.execute("DELETE FROM feedback WHERE id = ? AND (is_read = 1 OR is_resolved = 1)", [normalizedId]);
      if (!result.affectedRows) return res.status(400).json({ ok: false, message: "只能删除已读或已解决的反馈" });
      res.json({ ok: true, message: "反馈已删除" });
    } catch (error) {
      console.error("反馈删除失败:", error.message);
      res.status(500).json({ ok: false, message: `反馈删除失败: ${error.message}` });
    }
  });

  app.post("/api/feedback/reply", async (req, res) => {
    const { phone, feedbackId, letter, markResolved } = req.body;
    if (!isAdminPhone(phone, ADMIN_PHONE)) return res.status(403).json({ ok: false, message: "无权限发送回信" });

    const normalizedId = Number(feedbackId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) return res.status(400).json({ ok: false, message: "反馈ID无效" });

    const message = String(letter || "").trim();
    if (!message) return res.status(400).json({ ok: false, message: "回信内容不能为空" });

    try {
      const [rows] = await pool.execute("SELECT id, phone FROM feedback WHERE id = ? LIMIT 1", [normalizedId]);
      if (!rows.length) return res.status(404).json({ ok: false, message: "反馈不存在或已删除" });

      const receiverPhone = String(rows[0].phone || "").trim();
      if (!receiverPhone) return res.status(400).json({ ok: false, message: "反馈手机号缺失，无法发送回信" });

      if (receiverPhone !== phone) {
        await pool.execute(
          "INSERT INTO notifications (receiver_phone, sender_phone, type, place_id, content) VALUES (?, ?, ?, ?, ?)",
          [receiverPhone, phone, "admin_reply", `feedback_${normalizedId}`, message]
        );
      }

      if (parseOptionalBoolean(markResolved)) {
        await pool.execute(
          "UPDATE feedback SET admin_reply = ?, replied_at = NOW(), is_read = 1, is_resolved = 1, resolved_at = NOW() WHERE id = ?",
          [message, normalizedId]
        );
      } else {
        await pool.execute("UPDATE feedback SET admin_reply = ?, replied_at = NOW(), is_read = 1 WHERE id = ?", [message, normalizedId]);
      }

      res.json({ ok: true, message: "回信已发送" });
    } catch (error) {
      console.error("反馈回信失败:", error.message);
      res.status(500).json({ ok: false, message: `反馈回信失败: ${error.message}` });
    }
  });
}
