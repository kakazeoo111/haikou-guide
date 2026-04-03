const DEFAULT_BADGE_TITLE = "未解锁称号";
const MANUAL_BADGE_PROMPT = "请输入称号名称（示例：无私奉献）";

export async function fetchBadgeSummary(authApiBase, phone) {
  const res = await fetch(`${authApiBase}/api/badges/${phone}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.message || "获取称号失败");
  return data.data;
}

function askManualBadgePayload() {
  const targetPhone = window.prompt("请输入要授权称号的用户手机号");
  if (!targetPhone) return null;
  const badgeName = window.prompt(MANUAL_BADGE_PROMPT);
  if (!badgeName) return null;
  const isActiveInput = window.prompt("授权请输入 1，取消授权请输入 0", "1");
  if (isActiveInput === null) return null;
  const note = window.prompt("备注（可选）", "") || "";
  return {
    targetPhone: targetPhone.trim(),
    badgeName: badgeName.trim(),
    isActive: isActiveInput !== "0",
    note,
  };
}

export async function promptAndUpdateManualBadge({ authApiBase, adminPhone }) {
  const payload = askManualBadgePayload();
  if (!payload) return null;
  const res = await fetch(`${authApiBase}/api/badges/manual/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminPhone, ...payload }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.message || "称号授权失败");
  return data;
}

export function getBadgeTitleOrDefault(summary) {
  if (!summary?.activeTitle) return DEFAULT_BADGE_TITLE;
  return summary.activeTitle;
}
