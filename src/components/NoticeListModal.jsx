import { btnMainStyle, modalContentStyle, modalOverlayStyle } from "../styles/appStyles";

function getNoticeText(notice) {
  if (notice.type === "like_place") return "点赞了你的分享";
  if (notice.type === "like_comment") return "点赞了你的评论";
  if (notice.type === "reply") return `回复了你：${notice.content || ""}`;
  if (notice.type === "admin_reply") return `给你发来回信：${notice.content || ""}`;
  return notice.content || "给你发送了一条消息";
}

function NoticeListModal({
  visible,
  notifications,
  currentUser,
  authApiBase,
  onClose,
  onNoticeClick,
  onRefresh,
  formatCommentTime,
}) {
  if (!visible) return null;

  const handleMarkRead = async () => {
    try {
      await fetch(`${authApiBase}/api/notifications/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone }),
      });
      onRefresh();
    } catch (error) {
      console.error("消息已读失败:", error);
      alert("操作失败，请稍后再试");
    }
  };

  const handleClear = async () => {
    if (!window.confirm("确定要清空所有消息记录吗？")) return;
    try {
      const res = await fetch(`${authApiBase}/api/notifications/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.message || "清空失败");
        return;
      }
      onRefresh();
      alert("消息已全部清空");
    } catch (error) {
      console.error("消息清空失败:", error);
      alert("网络错误，请稍后再试");
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalContentStyle, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h3 style={{ margin: 0 }}>消息中心</h3>
          <span style={{ cursor: "pointer", fontSize: "24px" }} onClick={onClose}>
            ×
          </span>
        </div>

        {notifications.length === 0 && <p style={{ textAlign: "center", color: "#999", padding: "20px 0" }}>暂无消息</p>}

        {notifications.map((notice) => {
          const canJump = notice.type !== "admin_reply" && Boolean(notice.place_id);
          return (
            <div
              key={notice.id}
              onClick={() => canJump && onNoticeClick(notice)}
              style={{
                padding: "15px 10px",
                borderBottom: "1px solid #f0f0f0",
                cursor: canJump ? "pointer" : "default",
                background: notice.is_read ? "transparent" : "#f4fbf6",
                borderRadius: "10px",
                marginBottom: "5px",
              }}
            >
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <img
                  src={
                    notice.sender_avatar && notice.sender_avatar !== "null"
                      ? notice.sender_avatar.replace("http://", "https://")
                      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${notice.sender_phone}`
                  }
                  style={{ width: "32px", height: "32px", minWidth: "32px", borderRadius: "50%", objectFit: "cover" }}
                  alt="avatar"
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", color: "#333", lineHeight: 1.5 }}>
                    <span style={{ fontWeight: "bold" }}>{notice.sender_name}</span>
                    <span style={{ color: "#666", marginLeft: "4px" }}>{getNoticeText(notice)}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#bbb", marginTop: "6px", display: "flex", justifyContent: "space-between" }}>
                    <span>{formatCommentTime(notice.created_at)}</span>
                    <span style={{ color: "#5aa77b" }}>{canJump ? "点击查看 ➜" : "站主回信"}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={handleMarkRead} style={{ ...btnMainStyle, flex: 1, marginTop: 0 }}>
            全部已读
          </button>
          <button onClick={handleClear} style={{ ...btnMainStyle, flex: 1, marginTop: 0, background: "#ff4d4f" }}>
            清空全部
          </button>
        </div>
      </div>
    </div>
  );
}

export default NoticeListModal;
