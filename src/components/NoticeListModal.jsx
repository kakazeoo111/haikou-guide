import { useState } from "react";
import { getAvatarWithFallback } from "../logic/avatarFallback";
import FeedbackThreadModal from "./FeedbackThreadModal";
import { buildImageLoadingProps } from "../logic/imageProps";
import { optimizeUploadImages } from "../logic/uploadImageOptimizer";
import { btnMainStyle, modalContentStyle, modalOverlayStyle } from "../styles/appStyles";

function getNoticeText(notice) {
  if (notice.type === "like_place") return "点赞了你的分享";
  if (notice.type === "like_comment") return "点赞了你的评论";
  if (notice.type === "reply") return `回复了你：${notice.content || ""}`;
  if (notice.type === "admin_reply") return `给你发来回信：${notice.content || ""}`;
  if (notice.type === "forum_call") return "给你的论坛动态打了 call";
  if (notice.type === "forum_comment") return `评论了你的论坛动态：${notice.content || ""}`;
  if (notice.type === "forum_reply") return `回复了你的论坛评论：${notice.content || ""}`;
  return notice.content || "给你发送了一条消息";
}

function parseFeedbackIdFromNotice(notice) {
  if (notice?.type !== "admin_reply") return null;
  const placeId = String(notice?.place_id || "").trim();
  const matched = placeId.match(/^feedback_(\d+)$/);
  if (!matched) return null;
  const normalized = Number(matched[1]);
  if (!Number.isInteger(normalized) || normalized <= 0) return null;
  return normalized;
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
  modalTitle = "消息中心",
  emptyText = "暂无消息",
  markReadPath = "/api/notifications/read",
  clearPath = "/api/notifications/clear",
  clearButtonText = "清空全部",
  clearConfirmText = "确定要清空这些消息吗？",
  clearSuccessText = "消息已清空",
  showClearButton = true,
}) {
  const [showThreadModal, setShowThreadModal] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadItems, setThreadItems] = useState([]);
  const [threadRootId, setThreadRootId] = useState(null);
  const [followupDraft, setFollowupDraft] = useState("");
  const [followupImages, setFollowupImages] = useState([]);
  const [followupSubmitting, setFollowupSubmitting] = useState(false);

  if (!visible) return null;

  const fetchFeedbackThread = async (feedbackId) => {
    setThreadLoading(true);
    try {
      const res = await fetch(`${authApiBase}/api/feedback/thread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone, feedbackId }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.message || "加载反馈会话失败");
        setThreadItems([]);
        setThreadRootId(null);
        return false;
      }
      setThreadItems(Array.isArray(data.items) ? data.items : []);
      setThreadRootId(Number(data.rootId) || feedbackId);
      return true;
    } catch (error) {
      console.error("反馈会话加载失败:", error);
      alert("网络错误，暂时无法加载反馈详情");
      setThreadItems([]);
      setThreadRootId(null);
      return false;
    } finally {
      setThreadLoading(false);
    }
  };

  const handleOpenAdminReply = async (notice) => {
    const feedbackId = parseFeedbackIdFromNotice(notice);
    if (!feedbackId) {
      alert("该回信缺少关联反馈 ID，无法查看详情");
      return;
    }
    setShowThreadModal(true);
    setFollowupDraft("");
    setFollowupImages([]);
    await fetchFeedbackThread(feedbackId);
  };

  const handleCloseThreadModal = () => {
    setShowThreadModal(false);
    setThreadItems([]);
    setThreadRootId(null);
    setFollowupDraft("");
    setFollowupImages([]);
    setFollowupSubmitting(false);
  };

  const handleSubmitFollowup = async () => {
    const message = followupDraft.trim();
    if (!threadRootId) return alert("反馈会话未加载完成，请稍后再试");
    if (!message) return alert("补充回信不能为空");
    setFollowupSubmitting(true);
    try {
      const optimizedImages = await optimizeUploadImages(followupImages);
      const formData = new FormData();
      formData.append("phone", currentUser.phone);
      formData.append("feedbackId", threadRootId);
      formData.append("content", message);
      optimizedImages.forEach((file) => formData.append("images", file));
      const res = await fetch(`${authApiBase}/api/feedback/followup`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.message || "发送补充回信失败");
        return;
      }
      setFollowupDraft("");
      setFollowupImages([]);
      alert(data.message || "补充回信已发送");
      await fetchFeedbackThread(threadRootId);
      await onRefresh?.();
    } catch (error) {
      console.error("补充回信请求失败:", error);
      alert("网络错误，请稍后再试");
    } finally {
      setFollowupSubmitting(false);
    }
  };

  const handleMarkRead = async () => {
    try {
      await fetch(`${authApiBase}${markReadPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone }),
      });
      await onRefresh?.();
    } catch (error) {
      console.error("消息已读失败:", error);
      alert("操作失败，请稍后再试");
    }
  };

  const handleClear = async () => {
    if (!window.confirm(clearConfirmText)) return;
    try {
      const res = await fetch(`${authApiBase}${clearPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.message || "删除失败");
        return;
      }
      await onRefresh?.();
      alert(data.message || clearSuccessText);
    } catch (error) {
      console.error("消息清空失败:", error);
      alert("网络错误，请稍后再试");
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalContentStyle, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h3 style={{ margin: 0 }}>{modalTitle}</h3>
          <span style={{ cursor: "pointer", fontSize: "24px" }} onClick={onClose}>
            ×
          </span>
        </div>

        {notifications.length === 0 && <p style={{ textAlign: "center", color: "#999", padding: "20px 0" }}>{emptyText}</p>}

        {notifications.map((notice) => {
          const canJumpToPlace = notice.type !== "admin_reply" && Boolean(notice.place_id);
          const canOpenFeedbackThread = Boolean(parseFeedbackIdFromNotice(notice));
          const isClickable = canJumpToPlace || canOpenFeedbackThread;
          return (
            <div
              key={notice.id}
              onClick={() => {
                if (canJumpToPlace) onNoticeClick(notice);
                if (canOpenFeedbackThread) handleOpenAdminReply(notice);
              }}
              style={{
                contentVisibility: "auto",
                containIntrinsicSize: "72px",
                padding: "15px 10px",
                borderBottom: "1px solid #f0f0f0",
                cursor: isClickable ? "pointer" : "default",
                background: notice.is_read ? "transparent" : "#f4fbf6",
                borderRadius: "10px",
                marginBottom: "5px",
              }}
            >
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <img
                  src={getAvatarWithFallback(notice.sender_avatar, notice.sender_phone, notice.sender_name)}
                  {...buildImageLoadingProps()}
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
                    <span style={{ color: "#5aa77b" }}>{isClickable ? "点击查看 →" : "站内消息"}</span>
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
          {showClearButton && (
            <button onClick={handleClear} style={{ ...btnMainStyle, flex: 1, marginTop: 0, background: "#ff4d4f" }}>
              {clearButtonText}
            </button>
          )}
        </div>
      </div>

      <FeedbackThreadModal
        visible={showThreadModal}
        loading={threadLoading}
        submitting={followupSubmitting}
        items={threadItems}
        draft={followupDraft}
        followupImages={followupImages}
        onDraftChange={setFollowupDraft}
        onFollowupImagesChange={(nextFiles) => setFollowupImages((prev) => [...prev, ...nextFiles])}
        onFollowupImageRemove={(index) => setFollowupImages((prev) => prev.filter((_, i) => i !== index))}
        onSubmit={handleSubmitFollowup}
        onClose={handleCloseThreadModal}
        formatCommentTime={formatCommentTime}
      />
    </div>
  );
}

export default NoticeListModal;
