import { btnMainStyle, modalContentStyle, modalOverlayStyle } from "../styles/appStyles";

const MESSAGE_WRAP_RADIUS = "14px";
const USER_CARD_BG = "#f4fbf6";
const ADMIN_CARD_BG = "#f7fffb";

function normalizeImageUrl(url) {
  return String(url || "").replace("http://", "https://").trim();
}

function renderReplyPair(item, formatCommentTime) {
  const imageUrl = normalizeImageUrl(item.image_url);
  return (
    <div key={item.id} style={{ marginBottom: "14px" }}>
      <div style={{ background: USER_CARD_BG, borderRadius: MESSAGE_WRAP_RADIUS, padding: "12px", border: "1px solid #e8f1eb" }}>
        <div style={{ fontSize: "12px", color: "#4e7f65", marginBottom: "6px", fontWeight: 700 }}>你的反馈</div>
        <div style={{ fontSize: "14px", color: "#222", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{item.content || "（空内容）"}</div>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="feedback-img"
            style={{ width: "100%", borderRadius: "10px", marginTop: "8px", maxHeight: "180px", objectFit: "cover" }}
          />
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
  onDraftChange,
  onSubmit,
  onClose,
  formatCommentTime,
}) {
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
