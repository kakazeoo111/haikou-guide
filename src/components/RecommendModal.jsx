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
    const nextFiles = [...recImages, ...Array.from(files || [])].slice(0, 9);
    onImagesChange(nextFiles);
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalContentStyle, maxWidth: "400px" }}>
        <h2 style={{ color: "#2e6a4a", textAlign: "center", marginTop: 0 }}>分享好去处</h2>

        <div style={{ position: "relative", marginBottom: "15px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              placeholder="地点名字 (如: 海口骑楼老街)"
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
            ✅ 定位锁定: {newRec.lat.toFixed(3)}, {newRec.lng.toFixed(3)}
          </p>
        )}

        <textarea placeholder="推荐理由..." value={newRec.desc} onChange={(e) => onDescChange(e.target.value)} style={textAreaStyle} />

        <div style={{ marginTop: "15px" }}>
          <p style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>上传实拍图 (最多9张):</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {recImages.map((file, index) => (
              <div key={`${file.name}-${index}`} style={{ position: "relative", width: "60px", height: "60px" }}>
                <img src={URL.createObjectURL(file)} style={{ width: "100%", height: "100%", borderRadius: "8px", objectFit: "cover", border: "1px solid #eee" }} alt="preview" />
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
            {recImages.length < 9 && (
              <div
                onClick={() => document.getElementById("recommend-image-upload").click()}
                style={{
                  width: "60px",
                  height: "60px",
                  border: "1px dashed #ccc",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  color: "#ccc",
                  cursor: "pointer",
                  background: "#fafafa",
                }}
              >
                +
              </div>
            )}
          </div>
          <input
            type="file"
            id="recommend-image-upload"
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
