import { btnCancelStyle, btnMainStyle, modalContentStyle, modalOverlayStyle, textAreaStyle } from "../styles/appStyles";
import XhsImageUploadButton from "./common/XhsImageUploadButton";

const MAX_FEEDBACK_IMAGES = 9;
const FEEDBACK_IMAGE_INPUT_ID = "feedback-images-input";

function FeedbackModal({ visible, feedbackContent, feedbackImages, onContentChange, onImageChange, onImageRemove, onCancel, onSubmit }) {
  const imageCount = feedbackImages.length;

  const handleSelectImages = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const remain = MAX_FEEDBACK_IMAGES - imageCount;
    if (remain <= 0) {
      alert(`最多上传 ${MAX_FEEDBACK_IMAGES} 张图片`);
      event.target.value = "";
      return;
    }
    const nextFiles = files.slice(0, remain);
    onImageChange(nextFiles);
    if (files.length > remain) alert(`最多上传 ${MAX_FEEDBACK_IMAGES} 张图片，已自动截取前 ${remain} 张`);
    event.target.value = "";
  };

  if (!visible) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalContentStyle, maxWidth: "400px" }}>
        <h2 style={{ color: "#2e6a4a", textAlign: "center" }}>反馈建议</h2>
        <textarea placeholder="您的反馈是作者最大的动力..." value={feedbackContent} onChange={(e) => onContentChange(e.target.value)} style={textAreaStyle} />
        {feedbackImages.length > 0 && (
          <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
            {feedbackImages.map((file, index) => (
              <div key={`${file.name}-${index}`} style={{ position: "relative" }}>
                <img src={URL.createObjectURL(file)} style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "10px", objectFit: "cover" }} alt="feedback-preview" />
                <div
                  onClick={() => onImageRemove(index)}
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
            ))}
          </div>
        )}
        <div style={{ marginTop: "8px", fontSize: "12px", color: "#7a8c82" }}>已选 {imageCount}/{MAX_FEEDBACK_IMAGES} 张</div>
        <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
          <XhsImageUploadButton
            onClick={() => document.getElementById(FEEDBACK_IMAGE_INPUT_ID)?.click()}
            ariaLabel="upload-feedback-images"
            size={46}
            radius={14}
            iconSize={22}
          />
          <input type="file" id={FEEDBACK_IMAGE_INPUT_ID} hidden accept="image/*" multiple onChange={handleSelectImages} />
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
