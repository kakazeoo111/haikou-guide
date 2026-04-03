import { btnMainStyle, feedbackItemStyle, modalContentStyle, modalOverlayStyle } from "../styles/appStyles";

function AdminFeedbackModal({ visible, allFeedbacks, onClose, onZoomImage }) {
  if (!visible) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalContentStyle, maxWidth: "500px", maxHeight: "80vh", overflowY: "auto" }}>
        <h2 style={{ color: "#2e6a4a", textAlign: "center" }}>📩 反馈库</h2>
        {allFeedbacks.map((item) => (
          <div key={item.id} style={feedbackItemStyle}>
            <div style={{ fontSize: "11px", color: "#999" }}>
              {item.user_phone} | {new Date(item.created_at).toLocaleString()}
            </div>
            <div style={{ fontSize: "14px", marginTop: "5px" }}>{item.content}</div>
            {item.image_url && (
              <img
                src={item.image_url}
                style={{ width: "100px", marginTop: "8px", borderRadius: "8px", cursor: "zoom-in" }}
                onClick={() => onZoomImage(item.image_url)}
                alt="feedback-image"
              />
            )}
          </div>
        ))}
        <button onClick={onClose} style={{ ...btnMainStyle, marginTop: "20px" }}>
          关闭
        </button>
      </div>
    </div>
  );
}

export default AdminFeedbackModal;
