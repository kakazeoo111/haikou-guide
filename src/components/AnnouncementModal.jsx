import { btnMainStyle, btnSmallStyle, modalContentStyle, modalOverlayStyle } from "../styles/appStyles";

function AnnouncementModal({ visible, noticeContent, isMobile, isAdmin, onEdit, onEnterMap }) {
  if (!visible) return null;

  return (
    <div style={modalOverlayStyle}>
      <div
        style={{
          ...modalContentStyle,
          width: isMobile ? "90%" : "420px",
          maxHeight: "75vh",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        <h2
          style={{
            color: "#2e6a4a",
            textAlign: "center",
            marginTop: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            fontSize: "20px",
          }}
        >
          <span style={{ fontSize: "22px" }}>✉️</span> 遇见不一样的椰城
        </h2>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            fontSize: "14px",
            color: "#555",
            lineHeight: "1.6",
            whiteSpace: "pre-wrap",
            padding: "0 5px",
          }}
        >
          {noticeContent}
        </div>
        <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
          {isAdmin && (
            <button onClick={onEdit} style={{ ...btnSmallStyle(false), flex: 1 }}>
              编辑
            </button>
          )}
          <button onClick={onEnterMap} style={{ ...btnMainStyle, flex: 2 }}>
            进入地图
          </button>
        </div>
      </div>
    </div>
  );
}

export function AnnouncementEditorModal({ visible, noticeContent, onChange, onCancel, onSave }) {
  if (!visible) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <h2>编辑公告</h2>
        <textarea value={noticeContent} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", height: "150px", padding: "10px" }} />
        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #ddd", background: "white" }}>
            取消
          </button>
          <button onClick={onSave} style={btnMainStyle}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnnouncementModal;
