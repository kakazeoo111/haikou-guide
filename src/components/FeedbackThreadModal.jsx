import { btnMainStyle, modalContentStyle, modalOverlayStyle } from "../styles/appStyles";
import { parseFeedbackImageUrls } from "../logic/feedbackImageUtils";

const MESSAGE_WRAP_RADIUS = "14px";
const USER_CARD_BG = "#f4fbf6";
const ADMIN_CARD_BG = "#f7fffb";
const MAX_FOLLOWUP_IMAGES = 9;

function renderReplyPair(item, formatCommentTime) {
  const imageUrls = parseFeedbackImageUrls(item.image_url);
  const adminReplyImageUrls = parseFeedbackImageUrls(item.admin_reply_image_url);
  return (
    <div key={item.id} style={{ marginBottom: "14px" }}>
      <div style={{ background: USER_CARD_BG, borderRadius: MESSAGE_WRAP_RADIUS, padding: "12px", border: "1px solid #e8f1eb" }}>
        <div style={{ fontSize: "12px", color: "#4e7f65", marginBottom: "6px", fontWeight: 700 }}>你的反馈</div>
        <div style={{ fontSize: "14px", color: "#222", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{item.content || "（空内容）"}</div>
        {imageUrls.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "8px" }}>
            {imageUrls.map((url, idx) => (
              <img
                key={`${item.id}-${idx}`}
                src={url}
                alt="feedback-img"
                style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "10px", objectFit: "cover" }}
              />
            ))}
          </div>
        )}
        <div style={{ marginTop: "8px", fontSize: "11px", color: "#9aa9a1" }}>{formatCommentTime(item.created_at)}</div>
      </div>

      {item.admin_reply && (
        <div
          style={{
            marginTop: "8px",
            background: ADMIN_CARD_BG,
            borderRadius: MESSAGE_WRAP_RADIUS,
            padding: "12px",
            border: "1px solid #d8efe2",
          }}
        >
          <div style={{ fontSize: "12px", color: "#2f8a5a", marginBottom: "6px", fontWeight: 700 }}>站主回信</div>
          <div style={{ fontSize: "14px", color: "#1f4330", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{item.admin_reply}</div>
          {adminReplyImageUrls.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "8px" }}>
              {adminReplyImageUrls.map((url, idx) => (
                <img
                  key={`reply-${item.id}-${idx}`}
                  src={url}
                  alt="admin-reply-img"
                  style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "10px", objectFit: "cover" }}
                />
              ))}
            </div>
          )}
          <div style={{ marginTop: "8px", fontSize: "11px", color: "#9aa9a1" }}>{formatCommentTime(item.replied_at || item.created_at)}</div>
        </div>
      )}
    </div>
  );
}

function FeedbackThreadModal({
  visible,
  loading,
  submitting,
  items,
  draft,
  followupImages,
  onDraftChange,
  onFollowupImagesChange,
  onFollowupImageRemove,
  onSubmit,
  onClose,
  formatCommentTime,
}) {
  const handleSelectFollowupImages = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const remain = MAX_FOLLOWUP_IMAGES - followupImages.length;
    if (remain <= 0) {
      alert(`补充回信最多上传 ${MAX_FOLLOWUP_IMAGES} 张图片`);
      event.target.value = "";
      return;
    }
    const nextFiles = files.slice(0, remain);
    onFollowupImagesChange(nextFiles);
    if (files.length > remain) alert(`最多上传 ${MAX_FOLLOWUP_IMAGES} 张图片，已自动截取前 ${remain} 张`);
    event.target.value = "";
  };

  if (!visible) return null;

  return (
    <div style={{ ...modalOverlayStyle, zIndex: 4100 }}>
      <div style={{ ...modalContentStyle, maxWidth: "560px", maxHeight: "86vh", overflowY: "auto", paddingBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h3 style={{ margin: 0, color: "#144934" }}>反馈会话</h3>
          <span style={{ cursor: "pointer", fontSize: "24px", color: "#888" }} onClick={onClose}>
            ×
          </span>
        </div>

        {loading && <div style={{ fontSize: "13px", color: "#666", padding: "8px 0 14px 0" }}>正在加载会话详情...</div>}
        {!loading && items.length === 0 && <div style={{ fontSize: "13px", color: "#888", padding: "8px 0 14px 0" }}>暂无会话内容</div>}
        {!loading && items.map((item) => renderReplyPair(item, formatCommentTime))}

        <div style={{ marginTop: "10px", borderTop: "1px solid #edf2ef", paddingTop: "12px" }}>
          <div style={{ fontSize: "13px", color: "#2f6b4b", fontWeight: 700, marginBottom: "8px" }}>继续回信给站长</div>
          <textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="可继续补充你的反馈，站长会在反馈库看到。"
            style={{
              width: "100%",
              minHeight: "88px",
              borderRadius: "12px",
              border: "1px solid #dce6df",
              padding: "10px",
              outline: "none",
              boxSizing: "border-box",
              fontSize: "14px",
              resize: "vertical",
            }}
          />
          {followupImages.length > 0 && (
            <div style={{ marginTop: "8px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", maxWidth: "220px" }}>
              {followupImages.map((file, index) => (
                <div key={`${file.name}-${index}`} style={{ position: "relative" }}>
                  <img src={URL.createObjectURL(file)} style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "8px", objectFit: "cover" }} alt="followup-preview" />
                  <div
                    onClick={() => onFollowupImageRemove(index)}
                    style={{
                      position: "absolute",
                      top: "-5px",
                      right: "-5px",
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: "#ff4d4f",
                      color: "#fff",
                      fontSize: "12px",
                      lineHeight: "18px",
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
          <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => document.getElementById("followup-images-input")?.click()}
              disabled={submitting}
              style={{ ...btnMainStyle, marginTop: 0, width: "auto", padding: "8px 14px", borderRadius: "999px" }}
            >
              添加照片
            </button>
            <span style={{ fontSize: "12px", color: "#7c9187" }}>已选 {followupImages.length}/{MAX_FOLLOWUP_IMAGES}</span>
            <input id="followup-images-input" type="file" hidden accept="image/*" multiple onChange={handleSelectFollowupImages} />
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={onSubmit} disabled={submitting} style={{ ...btnMainStyle, marginTop: 0, flex: 1 }}>
              {submitting ? "发送中..." : "发送补充回信"}
            </button>
            <button
              onClick={onClose}
              disabled={submitting}
              style={{ ...btnMainStyle, marginTop: 0, flex: 1, background: "#b8c8bf" }}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeedbackThreadModal;
