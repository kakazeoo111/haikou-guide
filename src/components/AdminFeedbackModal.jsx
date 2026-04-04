import { useState } from "react";
import { btnMainStyle, feedbackItemStyle, modalContentStyle, modalOverlayStyle } from "../styles/appStyles";
import { parseFeedbackImageUrls } from "../logic/feedbackImageUtils";

const actionBtnStyle = {
  border: "1px solid #d7e9df",
  background: "#fff",
  color: "#2e6a4a",
  borderRadius: "999px",
  padding: "5px 10px",
  fontSize: "12px",
  cursor: "pointer",
};

function AdminFeedbackModal({
  visible,
  allFeedbacks,
  onClose,
  onZoomImage,
  onUpdateStatus,
  onDeleteFeedback,
  onSendReply,
}) {
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [markResolvedAfterReply, setMarkResolvedAfterReply] = useState(true);
  const [pendingId, setPendingId] = useState(null);
  if (!visible) return null;

  const withPending = async (id, action) => {
    setPendingId(id);
    try {
      await action();
    } finally {
      setPendingId(null);
    }
  };

  const openReplyBox = (item) => {
    setActiveReplyId(item.id);
    setReplyText(item.admin_reply || "");
    setMarkResolvedAfterReply(!item.is_resolved);
  };

  const closeReplyBox = () => {
    setActiveReplyId(null);
    setReplyText("");
    setMarkResolvedAfterReply(true);
  };

  const handleSendReply = async (item) => {
    const letter = replyText.trim();
    if (!letter) return alert("回信内容不能为空");
    await withPending(item.id, async () => {
      const ok = await onSendReply({ feedbackId: item.id, letter, markResolved: markResolvedAfterReply });
      if (ok) closeReplyBox();
    });
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalContentStyle, maxWidth: "560px", maxHeight: "80vh", overflowY: "auto" }}>
        <h2 style={{ color: "#2e6a4a", textAlign: "center" }}>📩 反馈库</h2>
        {allFeedbacks.length === 0 && <div style={{ textAlign: "center", color: "#9aa5a0", padding: "14px 0 4px" }}>暂无反馈内容</div>}

        {allFeedbacks.map((item) => {
          const isPending = pendingId === item.id;
          const canDelete = item.is_read || item.is_resolved;
          const phone = item.user_phone || item.phone;
          const imageUrls = parseFeedbackImageUrls(item.image_url);
          return (
            <div key={item.id} style={{ ...feedbackItemStyle, borderRadius: "20px", border: "1px solid #e8f0eb", background: "#f9fcf9", padding: "12px" }}>
              <div style={{ fontSize: "11px", color: "#8c9c95", display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                <span>{phone || "未知手机号"}</span>
                <span>{new Date(item.created_at).toLocaleString()}</span>
              </div>

              <div style={{ marginTop: "8px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", color: item.is_read ? "#3c8f68" : "#999" }}>{item.is_read ? "已读" : "未读"}</span>
                <span style={{ fontSize: "11px", color: item.is_resolved ? "#3c8f68" : "#999" }}>{item.is_resolved ? "已解决" : "待处理"}</span>
                {item.replied_at && <span style={{ fontSize: "11px", color: "#3c8f68" }}>已回信</span>}
              </div>

              <div style={{ fontSize: "14px", marginTop: "8px", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{item.content || "（无文本内容）"}</div>
              {imageUrls.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "8px", maxWidth: "220px" }}>
                  {imageUrls.map((url, idx) => (
                    <img
                      key={`${item.id}-${idx}`}
                      src={url}
                      style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "8px", objectFit: "cover", cursor: "zoom-in" }}
                      onClick={() => onZoomImage(url)}
                      alt="feedback-image"
                    />
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
                <button
                  onClick={() => withPending(item.id, () => onUpdateStatus(item.id, { isRead: !item.is_read }))}
                  disabled={isPending}
                  style={actionBtnStyle}
                >
                  {item.is_read ? "取消已读" : "标记已读"}
                </button>
                <button
                  onClick={() => withPending(item.id, () => onUpdateStatus(item.id, { isResolved: !item.is_resolved }))}
                  disabled={isPending}
                  style={actionBtnStyle}
                >
                  {item.is_resolved ? "取消已解决" : "标记已解决"}
                </button>
                <button onClick={() => openReplyBox(item)} disabled={isPending} style={actionBtnStyle}>
                  写回信
                </button>
                <button
                  onClick={() =>
                    withPending(item.id, async () => {
                      if (!window.confirm("确认删除这条反馈吗？仅建议删除已读/已解决项。")) return;
                      await onDeleteFeedback(item.id);
                    })
                  }
                  disabled={!canDelete || isPending}
                  style={{ ...actionBtnStyle, color: canDelete ? "#ff4d4f" : "#b8b8b8", borderColor: canDelete ? "#ffc9ca" : "#efefef" }}
                >
                  删除
                </button>
              </div>

              {activeReplyId === item.id && (
                <div style={{ marginTop: "10px", background: "#fff", border: "1px solid #e7efe8", borderRadius: "14px", padding: "10px" }}>
                  <textarea
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder="写给反馈用户的一封信..."
                    style={{ width: "100%", minHeight: "86px", border: "1px solid #dceae1", borderRadius: "10px", padding: "8px", resize: "vertical", outline: "none", fontSize: "13px" }}
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px", color: "#3d6e57" }}>
                    <input type="checkbox" checked={markResolvedAfterReply} onChange={(event) => setMarkResolvedAfterReply(event.target.checked)} />
                    发送后标记为已解决
                  </label>
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    <button onClick={() => handleSendReply(item)} disabled={isPending} style={{ ...btnMainStyle, marginTop: 0, flex: 1 }}>
                      发送回信
                    </button>
                    <button onClick={closeReplyBox} disabled={isPending} style={{ ...btnMainStyle, marginTop: 0, flex: 1, background: "#b8c8bf" }}>
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <button onClick={onClose} style={{ ...btnMainStyle, marginTop: "20px" }}>
          关闭
        </button>
      </div>
    </div>
  );
}

export default AdminFeedbackModal;
