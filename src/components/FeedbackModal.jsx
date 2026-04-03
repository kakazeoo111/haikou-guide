import { btnCancelStyle, btnIconStyle, btnMainStyle, modalContentStyle, modalOverlayStyle, textAreaStyle } from "../styles/appStyles";

function FeedbackModal({ visible, feedbackContent, feedbackImage, onContentChange, onImageChange, onImageRemove, onCancel, onSubmit }) {
  if (!visible) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalContentStyle, maxWidth: "400px" }}>
        <h2 style={{ color: "#2e6a4a", textAlign: "center" }}>反馈建议</h2>
        <textarea placeholder="您的反馈是作者最大的动力..." value={feedbackContent} onChange={(e) => onContentChange(e.target.value)} style={textAreaStyle} />
        {feedbackImage && (
          <div style={{ marginTop: "10px", position: "relative", display: "inline-block" }}>
            <img src={URL.createObjectURL(feedbackImage)} style={{ width: "80px", height: "80px", borderRadius: "10px", objectFit: "cover" }} alt="feedback-preview" />
            <div
              onClick={onImageRemove}
              style={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                background: "#ff4d4f",
                color: "white",
                borderRadius: "50%",
                width: "18px",
                height: "18px",
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              ×
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
          <button onClick={() => document.getElementById("feedback-image-input").click()} style={btnIconStyle}>
            🖼️
          </button>
          <input type="file" id="feedback-image-input" hidden accept="image/*" onChange={(e) => onImageChange(e.target.files?.[0] || null)} />
          <button onClick={onCancel} style={btnCancelStyle}>
            取消
          </button>
          <button onClick={onSubmit} style={btnMainStyle}>
            提交
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeedbackModal;
