const DEFAULT_BADGE_TITLE = "\u672a\u89e3\u9501\u79f0\u53f7";

async function parseJson(res) {
  const data = await res.json();
  if (!data.ok) throw new Error(data.message || "\u79f0\u53f7\u8bf7\u6c42\u5931\u8d25");
  return data.data;
}

export async function fetchBadgeSummary(authApiBase, phone) {
  const res = await fetch(`${authApiBase}/api/badges/${phone}`);
  return parseJson(res);
}

export async function selectActiveBadge(authApiBase, phone, badgeName) {
  const res = await fetch(`${authApiBase}/api/badges/select`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, badgeName }),
  });
  return parseJson(res);
}

export async function updateManualBadgeGrant(authApiBase, { adminPhone, targetPhone, badgeName, isActive, note }) {
  const res = await fetch(`${authApiBase}/api/badges/manual/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminPhone,
      targetPhone: String(targetPhone || "").trim(),
      badgeName: String(badgeName || "").trim(),
      isActive: isActive !== false,
      note: String(note || "").trim(),
    }),
  });
  return parseJson(res);
}

export function getBadgeTitleOrDefault(summary) {
  if (!summary?.activeTitle) return DEFAULT_BADGE_TITLE;
  return summary.activeTitle;
}
