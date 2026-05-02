const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(8,23,16,0.48)",
  zIndex: 4100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "18px",
  boxSizing: "border-box",
};

const panelStyle = {
  width: "100%",
  maxWidth: "460px",
  background: "linear-gradient(180deg, #ffffff 0%, #f4fbf6 100%)",
  borderRadius: "24px",
  border: "1px solid #d7eee1",
  boxShadow: "0 22px 44px rgba(32,68,52,0.24)",
  padding: "18px 16px 16px",
};

const doneButtonStyle = {
  marginTop: "12px",
  width: "100%",
  border: "none",
  borderRadius: "14px",
  background: "#5aa77b",
  color: "#fff",
  fontWeight: 700,
  padding: "11px 0",
  cursor: "pointer",
};

function ForumNoticeModal({ visible, dontShowAgain, onToggleDontShowAgain, onClose }) {
  if (!visible) return null;

  return (
    <div style={overlayStyle} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#1d563d" }}>论坛公告</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", color: "#7c9388", fontSize: "22px", lineHeight: 1, cursor: "pointer" }}>
            ×
          </button>
        </div>

        <div style={{ marginTop: "8px", color: "#355a49", fontSize: "13px", lineHeight: 1.65 }}>
          欢迎大家来到7 天论坛，这里可以发布短时动态、即刻分享和互动打call，希望大家一同打造一个良好的社区氛围，彼此尊重，充满自由与爱。
        </div>

        <label style={{ marginTop: "12px", display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "13px", color: "#4a6a5c", cursor: "pointer" }}>
          <input type="checkbox" checked={dontShowAgain} onChange={(event) => onToggleDontShowAgain(event.target.checked)} />
          不再弹出
        </label>

        <button onClick={onClose} style={doneButtonStyle}>
          我知道了
        </button>
      </div>
    </div>
  );
}

export default ForumNoticeModal;
