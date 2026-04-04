import { useEffect, useState } from "react";
import { getBadgeEmoji, getBadgeTheme } from "../logic/badgeTheme";

const PHONE_REGEX = /^1\d{10}$/;
const BADGE_MAX_LENGTH = 20;

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.55)",
  zIndex: 4000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  boxSizing: "border-box",
};

const cardStyle = {
  width: "100%",
  maxWidth: "460px",
  background: "white",
  borderRadius: "24px",
  padding: "20px",
  boxSizing: "border-box",
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.18)",
};

const labelStyle = { display: "block", fontSize: "12px", color: "#6f8076", marginBottom: "6px", fontWeight: 700 };
const inputStyle = { width: "100%", boxSizing: "border-box", border: "1px solid #dce7e0", borderRadius: "14px", padding: "10px 12px", outline: "none", fontSize: "14px" };
const submitBtnStyle = { flex: 1, border: "none", borderRadius: "14px", padding: "11px 0", background: "#5aa77b", color: "white", fontWeight: 700, cursor: "pointer" };
const cancelBtnStyle = { flex: 1, border: "1px solid #d8e5dc", borderRadius: "14px", padding: "11px 0", background: "#f7faf8", color: "#486457", fontWeight: 700, cursor: "pointer" };

const DEFAULT_FORM = { targetPhone: "", badgeName: "", isActive: true, note: "" };

function getModeBtnStyle(active) {
  return {
    flex: 1,
    border: active ? "none" : "1px solid #d8e5dc",
    borderRadius: "12px",
    padding: "9px 0",
    background: active ? "#5aa77b" : "#f5f8f6",
    color: active ? "white" : "#557368",
    fontWeight: 700,
    cursor: "pointer",
  };
}

function validateForm(form) {
  if (!PHONE_REGEX.test(form.targetPhone.trim())) return "手机号格式错误，请输入11位手机号";
  if (!form.badgeName.trim()) return "称号名称不能为空";
  if (form.badgeName.trim().length > BADGE_MAX_LENGTH) return "称号名称过长（最多20字）";
  return "";
}

function BadgeGrantModal({ visible, onClose, onSubmit }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setForm(DEFAULT_FORM);
    setSubmitting(false);
  }, [visible]);

  if (!visible) return null;

  const badgeTheme = getBadgeTheme(form.badgeName || form.targetPhone || "badge-preview");
  const badgeEmoji = getBadgeEmoji(form.badgeName || form.targetPhone || "badge-preview");

  const handleSubmit = async () => {
    const errorMessage = validateForm(form);
    if (errorMessage) {
      alert(errorMessage);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        targetPhone: form.targetPhone.trim(),
        badgeName: form.badgeName.trim(),
        isActive: form.isActive,
        note: form.note.trim(),
      });
      alert(form.isActive ? "称号授权成功" : "称号已取消授权");
      onClose();
    } catch (error) {
      console.error("Badge grant submit failed:", error);
      alert(error.message || "称号授权失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(event) => event.stopPropagation()}>
        <div style={{ fontSize: "22px", fontWeight: 900, color: "#194d35" }}>称号授权</div>
        <div style={{ marginTop: "4px", color: "#6b8578", fontSize: "12px" }}>可输入手机号和称号名，手机端可直接编辑</div>

        <div
          style={{
            marginTop: "14px",
            borderRadius: "16px",
            padding: "10px 12px",
            background: badgeTheme.background,
            border: `1px solid ${badgeTheme.border}`,
            boxShadow: badgeTheme.shadow,
            display: "inline-flex",
            gap: "6px",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "14px" }}>{badgeEmoji}</span>
          <span style={{ color: badgeTheme.textColor, fontWeight: 800, fontSize: "13px" }}>{form.badgeName.trim() || "称号预览"}</span>
        </div>

        <div style={{ marginTop: "14px" }}>
          <label style={labelStyle}>用户手机号</label>
          <input style={inputStyle} value={form.targetPhone} onChange={(e) => setForm((prev) => ({ ...prev, targetPhone: e.target.value }))} placeholder="例如：13800138000" />
        </div>

        <div style={{ marginTop: "12px" }}>
          <label style={labelStyle}>称号名称</label>
          <input style={inputStyle} value={form.badgeName} onChange={(e) => setForm((prev) => ({ ...prev, badgeName: e.target.value }))} placeholder="例如：夜游策展人" />
        </div>

        <div style={{ marginTop: "12px" }}>
          <label style={labelStyle}>操作</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" onClick={() => setForm((prev) => ({ ...prev, isActive: true }))} style={getModeBtnStyle(form.isActive)}>
              授权
            </button>
            <button type="button" onClick={() => setForm((prev) => ({ ...prev, isActive: false }))} style={getModeBtnStyle(!form.isActive)}>
              取消授权
            </button>
          </div>
        </div>

        <div style={{ marginTop: "12px" }}>
          <label style={labelStyle}>备注（可选）</label>
          <textarea
            style={{ ...inputStyle, minHeight: "72px", resize: "vertical" }}
            value={form.note}
            onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            placeholder="例如：活动期间授予"
          />
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button type="button" onClick={onClose} style={cancelBtnStyle} disabled={submitting}>
            取消
          </button>
          <button type="button" onClick={handleSubmit} style={submitBtnStyle} disabled={submitting}>
            {submitting ? "提交中..." : "确认"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BadgeGrantModal;
