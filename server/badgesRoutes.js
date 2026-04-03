import { buildUserBadgeData, updateManualBadgeGrant } from "./badgesService.js";

const PHONE_REGEX = /^1\d{10}$/;
const BADGE_NAME_MAX_LENGTH = 20;

function parseManualPayload(payload = {}) {
  const adminPhone = String(payload.adminPhone || "").trim();
  const targetPhone = String(payload.targetPhone || "").trim();
  const badgeName = String(payload.badgeName || "").trim();
  const isActive = payload.isActive !== false;
  const note = String(payload.note || "").trim();
  return { adminPhone, targetPhone, badgeName, isActive, note };
}

function validateManualPayload({ adminPhone, targetPhone, badgeName }, expectedAdminPhone) {
  if (adminPhone !== expectedAdminPhone) return "forbidden";
  if (!PHONE_REGEX.test(targetPhone)) return "目标手机号格式错误";
  if (!badgeName) return "称号名称不能为空";
  if (badgeName.length > BADGE_NAME_MAX_LENGTH) return "称号名称过长（最多20字）";
  return "";
}

export function registerBadgeRoutes(app, { pool, ADMIN_PHONE }) {
  app.get("/api/badges/:phone", async (req, res) => {
    const phone = String(req.params.phone || "").trim();
    if (!PHONE_REGEX.test(phone)) return res.status(400).json({ ok: false, message: "手机号格式错误" });
    try {
      const data = await buildUserBadgeData(pool, phone);
      res.json({ ok: true, data });
    } catch (error) {
      console.error("获取称号失败:", error.message);
      res.status(500).json({ ok: false, message: `获取称号失败: ${error.message}` });
    }
  });

  app.post("/api/badges/manual/update", async (req, res) => {
    const parsed = parseManualPayload(req.body);
    const errorMsg = validateManualPayload(parsed, ADMIN_PHONE);
    if (errorMsg === "forbidden") return res.status(403).json({ ok: false, message: "无权限操作称号授权" });
    if (errorMsg) return res.status(400).json({ ok: false, message: errorMsg });
    try {
      await updateManualBadgeGrant(pool, {
        targetPhone: parsed.targetPhone,
        badgeName: parsed.badgeName,
        adminPhone: parsed.adminPhone,
        isActive: parsed.isActive,
        note: parsed.note,
      });
      const data = await buildUserBadgeData(pool, parsed.targetPhone);
      res.json({
        ok: true,
        message: parsed.isActive ? "称号授权成功" : "称号已取消授权",
        data: { targetPhone: parsed.targetPhone, activeTitle: data.activeTitle, allBadges: data.allBadges },
      });
    } catch (error) {
      console.error("更新称号授权失败:", error.message);
      res.status(500).json({ ok: false, message: `更新称号授权失败: ${error.message}` });
    }
  });
}
