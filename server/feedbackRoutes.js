import { buildUploadedImagePayload, getUploadedImageAndThumbFiles } from "./uploadImagePayload.js";
import { validateUploadedImages } from "./uploadPolicy.js";

const FEEDBACK_ADMIN_COLUMNS = [
  { name: "is_read", ddl: "ALTER TABLE feedback ADD COLUMN is_read TINYINT(1) NOT NULL DEFAULT 0" },
  { name: "is_resolved", ddl: "ALTER TABLE feedback ADD COLUMN is_resolved TINYINT(1) NOT NULL DEFAULT 0" },
  { name: "resolved_at", ddl: "ALTER TABLE feedback ADD COLUMN resolved_at DATETIME NULL" },
  { name: "admin_reply", ddl: "ALTER TABLE feedback ADD COLUMN admin_reply TEXT NULL" },
  { name: "admin_reply_image_url", ddl: "ALTER TABLE feedback ADD COLUMN admin_reply_image_url LONGTEXT NULL" },
  { name: "replied_at", ddl: "ALTER TABLE feedback ADD COLUMN replied_at DATETIME NULL" },
  { name: "parent_feedback_id", ddl: "ALTER TABLE feedback ADD COLUMN parent_feedback_id INT NULL" },
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

function toUploadedImageJson(files) {
  const { images, thumbnails } = getUploadedImageAndThumbFiles(files);
  const payload = buildUploadedImagePayload(images, thumbnails);
  if (!payload.length) return null;
  return JSON.stringify(payload);
}

function parseFeedbackId(value) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) return null;
  return normalized;
}

async function fetchFeedbackRoot(pool, feedbackId) {
  const [rows] = await pool.execute("SELECT id, parent_feedback_id, phone FROM feedback WHERE id = ? LIMIT 1", [feedbackId]);
  if (!rows.length) return null;
  const target = rows[0];
  const rootId = target.parent_feedback_id ? Number(target.parent_feedback_id) : Number(target.id);
  const [roots] = await pool.execute("SELECT id, phone FROM feedback WHERE id = ? LIMIT 1", [rootId]);
  if (!roots.length) return null;
  return {
    rootId,
    ownerPhone: String(roots[0].phone || ""),
  };
}

async function fetchFeedbackThreadRows(pool, rootId) {
  const [rows] = await pool.execute(
    `SELECT id, parent_feedback_id, phone, content, image_url, created_at,
            is_read, is_resolved, resolved_at, admin_reply, admin_reply_image_url, replied_at
     FROM feedback
     WHERE id = ? OR parent_feedback_id = ?
     ORDER BY created_at DESC, id DESC`,
    [rootId, rootId],
  );
  return formatFeedbackRows(rows);
}

async function ensureFeedbackAdminColumns(pool) {
  const [columns] = await pool.query("SHOW COLUMNS FROM feedback");
  const existed = new Set(columns.map((col) => String(col.Field || "")));
  for (const column of FEEDBACK_ADMIN_COLUMNS) {
    if (existed.has(column.name)) continue;
    await pool.execute(column.ddl);
  }
  const imageColumn = columns.find((col) => String(col.Field || "") === "image_url");
  const imageColumnType = String(imageColumn?.Type || "").toLowerCase();
  if (imageColumn && !imageColumnType.includes("text")) {
    await pool.execute("ALTER TABLE feedback MODIFY COLUMN image_url LONGTEXT NULL");
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
            is_read, is_resolved, resolved_at, admin_reply, admin_reply_image_url, replied_at, parent_feedback_id
     FROM feedback
     ORDER BY created_at DESC`,
  );
  return formatFeedbackRows(rows);
}

export async function registerFeedbackRoutes(app, { pool, upload, ADMIN_PHONE, requireAuth, requireAdmin }) {
  await ensureFeedbackAdminColumns(pool);

  app.post("/api/feedback/submit", requireAuth, upload.fields([{ name: "images", maxCount: 9 }, { name: "thumbnails", maxCount: 9 }]), async (req, res) => {
    if (!(await validateUploadedImages(req, res))) return;
    try {
      const phone = req.authUser.phone;
      const { content } = req.body;
      const imageUrl = toUploadedImageJson(req.files);
      await pool.execute("INSERT INTO feedback (phone, content, image_url) VALUES (?, ?, ?)", [phone, content || "", imageUrl]);
      res.json({ ok: true, message: "反馈已收到" });
    } catch (error) {
      console.error("反馈提交失败:", error.message);
      res.status(500).json({ ok: false, message: "反馈提交失败" });
    }
  });

  app.post("/api/feedback/all", requireAdmin, async (req, res) => {
    try {
      const data = await fetchAllFeedbackRows(pool);
      res.json({ ok: true, data });
    } catch (error) {
      console.error("反馈库获取失败:", error.message);
      res.status(500).json({ ok: false, message: "反馈库获取失败" });
    }
  });

  app.post("/api/feedback/status", requireAdmin, async (req, res) => {
    const { feedbackId, isRead, isResolved } = req.body;
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
      res.status(500).json({ ok: false, message: "反馈状态更新失败" });
    }
  });

  app.post("/api/feedback/delete", requireAdmin, async (req, res) => {
    const { feedbackId } = req.body;
    const normalizedId = Number(feedbackId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) return res.status(400).json({ ok: false, message: "反馈ID无效" });

    try {
      const [result] = await pool.execute("DELETE FROM feedback WHERE id = ? AND (is_read = 1 OR is_resolved = 1)", [normalizedId]);
      if (!result.affectedRows) return res.status(400).json({ ok: false, message: "只能删除已读或已解决的反馈" });
      res.json({ ok: true, message: "反馈已删除" });
    } catch (error) {
      console.error("反馈删除失败:", error.message);
      res.status(500).json({ ok: false, message: "反馈删除失败" });
    }
  });

  app.post("/api/feedback/reply", requireAdmin, upload.fields([{ name: "images", maxCount: 9 }, { name: "thumbnails", maxCount: 9 }]), async (req, res) => {
    if (!(await validateUploadedImages(req, res))) return;
    const { feedbackId, letter, markResolved } = req.body;
    const phone = req.authUser.phone;
    const normalizedId = Number(feedbackId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) return res.status(400).json({ ok: false, message: "反馈ID无效" });

    const message = String(letter || "").trim();
    if (!message) return res.status(400).json({ ok: false, message: "回信内容不能为空" });
    const replyImageUrl = toUploadedImageJson(req.files);

    try {
      const [rows] = await pool.execute("SELECT id, phone FROM feedback WHERE id = ? LIMIT 1", [normalizedId]);
      if (!rows.length) return res.status(404).json({ ok: false, message: "反馈不存在或已删除" });

      const receiverPhone = String(rows[0].phone || "").trim();
      if (!receiverPhone) return res.status(400).json({ ok: false, message: "反馈手机号缺失，无法发送回信" });

      if (receiverPhone !== phone) {
        await pool.execute(
          "INSERT INTO notifications (receiver_phone, sender_phone, type, place_id, content) VALUES (?, ?, ?, ?, ?)",
          [receiverPhone, phone, "admin_reply", `feedback_${normalizedId}`, message],
        );
      }

      if (parseOptionalBoolean(markResolved)) {
        await pool.execute(
          "UPDATE feedback SET admin_reply = ?, admin_reply_image_url = ?, replied_at = NOW(), is_read = 1, is_resolved = 1, resolved_at = NOW() WHERE id = ?",
          [message, replyImageUrl, normalizedId],
        );
      } else {
        await pool.execute(
          "UPDATE feedback SET admin_reply = ?, admin_reply_image_url = ?, replied_at = NOW(), is_read = 1 WHERE id = ?",
          [message, replyImageUrl, normalizedId],
        );
      }

      res.json({ ok: true, message: "回信已发送" });
    } catch (error) {
      console.error("反馈回信失败:", error.message);
      res.status(500).json({ ok: false, message: "反馈回信失败" });
    }
  });

  app.post("/api/feedback/thread", requireAuth, async (req, res) => {
    const { feedbackId } = req.body;
    const phone = req.authUser.phone;
    const normalizedId = parseFeedbackId(feedbackId);
    if (!normalizedId) return res.status(400).json({ ok: false, message: "反馈ID无效" });
    try {
      const rootInfo = await fetchFeedbackRoot(pool, normalizedId);
      if (!rootInfo) return res.status(404).json({ ok: false, message: "反馈不存在或已删除" });
      const isAdmin = isAdminPhone(phone, ADMIN_PHONE);
      if (!isAdmin && String(phone || "") !== rootInfo.ownerPhone) {
        return res.status(403).json({ ok: false, message: "无权限查看该反馈会话" });
      }
      const items = await fetchFeedbackThreadRows(pool, rootInfo.rootId);
      res.json({ ok: true, rootId: rootInfo.rootId, items });
    } catch (error) {
      console.error("反馈会话获取失败:", error.message);
      res.status(500).json({ ok: false, message: "反馈会话获取失败" });
    }
  });

  app.post("/api/feedback/followup", requireAuth, upload.fields([{ name: "images", maxCount: 9 }, { name: "thumbnails", maxCount: 9 }]), async (req, res) => {
    if (!(await validateUploadedImages(req, res))) return;
    const { feedbackId, content } = req.body;
    const phone = req.authUser.phone;
    const normalizedId = parseFeedbackId(feedbackId);
    if (!normalizedId) return res.status(400).json({ ok: false, message: "反馈ID无效" });
    const message = String(content || "").trim();
    if (!message) return res.status(400).json({ ok: false, message: "补充回信不能为空" });
    const followupImageUrl = toUploadedImageJson(req.files);
    try {
      const rootInfo = await fetchFeedbackRoot(pool, normalizedId);
      if (!rootInfo) return res.status(404).json({ ok: false, message: "反馈不存在或已删除" });
      if (String(phone || "") !== rootInfo.ownerPhone) {
        return res.status(403).json({ ok: false, message: "只能由该反馈提交者继续回信" });
      }
      await pool.execute(
        "INSERT INTO feedback (phone, content, image_url, parent_feedback_id, is_read, is_resolved) VALUES (?, ?, ?, ?, 0, 0)",
        [rootInfo.ownerPhone, message, followupImageUrl, rootInfo.rootId],
      );
      await pool.execute("UPDATE feedback SET is_resolved = 0, resolved_at = NULL WHERE id = ?", [rootInfo.rootId]);
      res.json({ ok: true, message: "补充回信已发送给站长" });
    } catch (error) {
      console.error("补充回信失败:", error.message);
      res.status(500).json({ ok: false, message: "补充回信失败" });
    }
  });
}
