import { modalContentStyle, modalOverlayStyle } from "../styles/appStyles";
import XhsImageUploadButton from "./common/XhsImageUploadButton";

const MAX_FEEDBACK_IMAGES = 9;
const FEEDBACK_IMAGE_INPUT_ID = "feedback-images-input";
const BUTTON_HEIGHT_PX = 48;
const BUTTON_RADIUS_PX = 14;
const PRIMARY_GREEN = "#5aa77b";
const PRIMARY_DARK_GREEN = "#2e6a4a";
const SUBTLE_GREEN_BG = "#f9fcfa";
const SUBTLE_GREEN_BORDER = "#e1ede5";

const closeIconStyle = {
  position: "absolute",
  top: "14px",
  right: "14px",
  border: "none",
  background: "transparent",
  fontSize: "22px",
  lineHeight: 1,
  cursor: "pointer",
  color: "#9fb2a8",
  padding: "4px 8px",
};

const titleWrapperStyle = { textAlign: "center", marginBottom: "18px", marginTop: "2px" };
const titleTextStyle = { fontSize: "22px", fontWeight: 700, color: PRIMARY_DARK_GREEN, letterSpacing: "0.5px" };
const subtitleStyle = { fontSize: "12px", color: "#7d9488", marginTop: "6px" };

const textAreaCustomStyle = {
  width: "100%",
  minHeight: "120px",
  borderRadius: "14px",
  padding: "14px",
  border: `1px solid ${SUBTLE_GREEN_BORDER}`,
  background: SUBTLE_GREEN_BG,
  outline: "none",
  boxSizing: "border-box",
  resize: "vertical",
  fontSize: "14px",
  lineHeight: 1.5,
  color: "#2b3a33",
};

const previewGridStyle = { marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" };
const previewImageStyle = { width: "100%", aspectRatio: "1 / 1", borderRadius: "12px", objectFit: "cover", display: "block" };
const previewRemoveStyle = {
  position: "absolute",
  top: "-6px",
  right: "-6px",
  background: "#ff4d4f",
  color: "white",
  borderRadius: "50%",
  width: "20px",
  height: "20px",
  lineHeight: "20px",
  textAlign: "center",
  cursor: "pointer",
  fontSize: "14px",
  boxShadow: "0 2px 6px rgba(255,77,79,0.35)",
};

const imageCountStyle = { marginTop: "10px", fontSize: "12px", color: "#8ca397", textAlign: "right" };

const buttonRowStyle = { display: "flex", gap: "10px", marginTop: "18px", alignItems: "stretch" };

const cancelButtonStyle = {
  flex: "0 0 auto",
  height: `${BUTTON_HEIGHT_PX}px`,
  padding: "0 22px",
  borderRadius: `${BUTTON_RADIUS_PX}px`,
  border: `1px solid ${SUBTLE_GREEN_BORDER}`,
  background: "#fff",
  color: "#5b6e65",
  fontWeight: 600,
  fontSize: "14px",
  cursor: "pointer",
};

const submitButtonStyle = {
  flex: 1,
  height: `${BUTTON_HEIGHT_PX}px`,
  padding: "0 22px",
  borderRadius: `${BUTTON_RADIUS_PX}px`,
  border: "none",
  background: PRIMARY_GREEN,
  color: "white",
  fontWeight: 700,
  fontSize: "15px",
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(90,167,123,0.28)",
};

function FeedbackImagePreview({ images, onImageRemove }) {
  if (images.length === 0) return null;
  return (
    <div style={previewGridStyle}>
      {images.map((file, index) => (
        <div key={`${file.name}-${index}`} style={{ position: "relative" }}>
          <img src={URL.createObjectURL(file)} style={previewImageStyle} alt="feedback-preview" />
          <div onClick={() => onImageRemove(index)} style={previewRemoveStyle}>
            ×
          </div>
        </div>
      ))}
    </div>
  );
}

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
      <div style={{ ...modalContentStyle, maxWidth: "400px", position: "relative" }}>
        <button onClick={onCancel} style={closeIconStyle} aria-label="close-feedback">
          ×
        </button>
        <div style={titleWrapperStyle}>
          <div style={titleTextStyle}>💌 反馈建议</div>
          <div style={subtitleStyle}>你的每一条反馈都会被认真阅读</div>
        </div>
        <textarea
          placeholder="您的反馈是作者最大的动力..."
          value={feedbackContent}
          onChange={(e) => onContentChange(e.target.value)}
          style={textAreaCustomStyle}
        />
        <FeedbackImagePreview images={feedbackImages} onImageRemove={onImageRemove} />
        <div style={imageCountStyle}>
          已选 {imageCount}/{MAX_FEEDBACK_IMAGES} 张
        </div>
        <div style={buttonRowStyle}>
          <XhsImageUploadButton
            onClick={() => document.getElementById(FEEDBACK_IMAGE_INPUT_ID)?.click()}
            ariaLabel="upload-feedback-images"
            size={BUTTON_HEIGHT_PX}
            radius={BUTTON_RADIUS_PX}
            iconSize={22}
          />
          <input type="file" id={FEEDBACK_IMAGE_INPUT_ID} hidden accept="image/*" multiple onChange={handleSelectImages} />
          <button onClick={onCancel} style={cancelButtonStyle}>
            取消
          </button>
          <button onClick={onSubmit} style={submitButtonStyle}>
            提交
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeedbackModal;
