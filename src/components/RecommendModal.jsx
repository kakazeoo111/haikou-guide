import {
  btnCancelStyle,
  btnCodeStyle,
  btnMainStyle,
  inputStyle,
  modalContentStyle,
  modalOverlayStyle,
  suggestionItemStyle,
  suggestionListStyle,
  textAreaStyle,
} from "../styles/appStyles";

const RECOMMEND_IMAGE_LIMIT = 9;
const RECOMMEND_IMAGE_UPLOAD_ID = "recommend-image-upload";

const uploadCardStyle = {
  marginTop: "15px",
  padding: "12px 14px 14px",
  borderRadius: "18px",
  border: "1px solid #edf1ee",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfcfb 100%)",
};

const uploadHeadStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  marginBottom: "12px",
};

const uploadTriggerStyle = {
  width: "52px",
  height: "52px",
  border: "1.5px solid #d8ddd9",
  borderRadius: "16px",
  background: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
  boxShadow: "0 6px 16px rgba(31, 61, 50, 0.05)",
};

const previewGridStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const previewItemStyle = {
  position: "relative",
  width: "60px",
  height: "60px",
};

function PhotoUploadIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.25" y="4.25" width="17.5" height="15.5" rx="4.5" stroke="#4c534f" strokeWidth="1.7" />
      <circle cx="16.3" cy="8.3" r="1.45" stroke="#4c534f" strokeWidth="1.5" />
      <path
        d="M6.4 16.35 10.15 12.4c.31-.33.84-.34 1.17-.03l1.9 1.8c.34.32.87.3 1.18-.04l1.77-1.95c.32-.35.88-.36 1.21-.02l1.22 1.28"
        stroke="#4c534f"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RecommendModal({
  visible,
  newRec,
  recommendSuggestions,
  recImages,
  onInputChange,
  onSearchLoc,
  onSelectPoi,
  onDescChange,
  onImagesChange,
  onImageRemove,
  onClose,
  onSubmit,
}) {
  if (!visible) return null;

  const handleFiles = (files) => {
    const nextFiles = [...recImages, ...Array.from(files || [])].slice(0, RECOMMEND_IMAGE_LIMIT);
    onImagesChange(nextFiles);
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalContentStyle, maxWidth: "400px" }}>
        <h2 style={{ color: "#2e6a4a", textAlign: "center", marginTop: 0 }}>分享好去处</h2>

        <div style={{ position: "relative", marginBottom: "15px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              placeholder="地点名字（如：海口骑楼老街）"
              style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
              value={newRec.name}
              onChange={(e) => onInputChange(e.target.value)}
            />
            <button onClick={onSearchLoc} style={{ ...btnCodeStyle, width: "60px" }}>
              定位
            </button>
          </div>

          {recommendSuggestions.length > 0 && (
            <div style={suggestionListStyle}>
              {recommendSuggestions.map((poi, idx) => (
                <div key={`${poi.title}-${idx}`} style={suggestionItemStyle} onClick={() => onSelectPoi(poi)}>
                  <div style={{ fontWeight: "bold", fontSize: "13px" }}>{poi.title}</div>
                  <div style={{ fontSize: "10px", color: "#999" }}>{poi.address}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {newRec.lat && (
          <p style={{ fontSize: "10px", color: "#5aa77b", marginTop: "-10px", marginBottom: "10px" }}>
            已定位锁定: {newRec.lat.toFixed(3)}, {newRec.lng.toFixed(3)}
          </p>
        )}

        <textarea placeholder="推荐理由..." value={newRec.desc} onChange={(e) => onDescChange(e.target.value)} style={textAreaStyle} />

        <div style={uploadCardStyle}>
          <div style={uploadHeadStyle}>
            <button
              type="button"
              onClick={() => document.getElementById(RECOMMEND_IMAGE_UPLOAD_ID).click()}
              style={uploadTriggerStyle}
              aria-label="upload-recommend-images"
            >
              <PhotoUploadIcon />
            </button>
            <div>
              <div style={{ fontSize: "14px", color: "#2d3732", fontWeight: 700, lineHeight: 1.2 }}>上传实拍图</div>
              <div style={{ fontSize: "12px", color: "#8d9891", marginTop: "4px" }}>改成了更接近小红书的细线图片按钮</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: "12px", color: "#5aa77b", fontWeight: 700 }}>
              {recImages.length}/{RECOMMEND_IMAGE_LIMIT}
            </div>
          </div>

          <div style={previewGridStyle}>
            {recImages.map((file, index) => (
              <div key={`${file.name}-${index}`} style={previewItemStyle}>
                <img
                  src={URL.createObjectURL(file)}
                  style={{ width: "100%", height: "100%", borderRadius: "10px", objectFit: "cover", border: "1px solid #eee" }}
                  alt="preview"
                />
                <div
                  onClick={() => onImageRemove(index)}
                  style={{
                    position: "absolute",
                    top: "-5px",
                    right: "-5px",
                    background: "#ff4d4f",
                    color: "white",
                    borderRadius: "50%",
                    width: "16px",
                    height: "16px",
                    fontSize: "12px",
                    textAlign: "center",
                    cursor: "pointer",
                    lineHeight: "14px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  }}
                >
                  ×
                </div>
              </div>
            ))}
            {recImages.length === 0 && <div style={{ fontSize: "12px", color: "#a0aaa4", padding: "6px 0" }}>点左侧图片图标选择照片，最多 9 张</div>}
          </div>

          <input
            type="file"
            id={RECOMMEND_IMAGE_UPLOAD_ID}
            hidden
            multiple
            accept="image/png, image/jpeg, image/jpg, image/webp"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = null;
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={onClose} style={btnCancelStyle}>
            取消
          </button>
          <button onClick={onSubmit} style={btnMainStyle}>
            立即发布
          </button>
        </div>
      </div>
    </div>
  );
}

export default RecommendModal;
