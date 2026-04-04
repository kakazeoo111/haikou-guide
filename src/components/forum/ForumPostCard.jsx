import { btnMainStyle } from "../../styles/appStyles";
import { parseForumImageUrls } from "../../logic/forumImageUtils";

const DEFAULT_BADGE_TITLE = "未解锁称号";

const selfBadgeStyle = (textColor) => ({
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  padding: "2px 9px",
  fontSize: "11px",
  fontWeight: 700,
  background: "linear-gradient(135deg, #fff6fb, #ffeef7)",
  border: "1px solid #ffc8de",
  color: textColor,
  maxWidth: "110px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const avatarBubbleStyle = {
  position: "absolute",
  right: "-3px",
  bottom: "-4px",
  width: "15px",
  height: "15px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  lineHeight: 1,
  pointerEvents: "none",
  filter: "drop-shadow(0 1px 1px rgba(255,255,255,0.85))",
};

const callBtnStyle = (active, disabled) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "4px 12px",
  borderRadius: "999px",
  border: active ? "1px solid #8ee1d1" : "1px solid #e3ece8",
  background: active ? "linear-gradient(135deg, #e8fff6, #dff4ff)" : "#f5f7f6",
  color: active ? "#1f9d85" : "#7f8d87",
  fontSize: "12px",
  fontWeight: 700,
  lineHeight: 1,
  boxShadow: active ? "0 4px 12px rgba(44,170,150,0.2)" : "none",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.65 : 1,
  userSelect: "none",
});

const callLabelStyle = (active) => ({
  fontSize: "11px",
  color: active ? "#2a9f87" : "#8ba197",
  fontWeight: 700,
  whiteSpace: "nowrap",
});

function getAvatarSrc(phone, avatarUrl) {
  const normalized = String(avatarUrl || "").trim();
  if (normalized) return normalized.replace("http://", "https://");
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${phone || "forum-user"}`;
}

function getSelfBadge(userPhone, currentUserPhone, activeBadgeTitle, badgeIcon) {
  if (String(userPhone || "") !== String(currentUserPhone || "")) return null;
  return { title: activeBadgeTitle || DEFAULT_BADGE_TITLE, icon: badgeIcon };
}

function ForumPostCard({
  post,
  currentUser,
  activeBadgeTitle,
  badgeIcon,
  badgeTheme,
  expanded,
  comments,
  loadingComments,
  replyTarget,
  commentDraft,
  submittingComment,
  callingPost,
  onToggleComments,
  onToggleCall,
  onZoomImage,
  onReplySelect,
  onReplyCancel,
  onCommentDraftChange,
  onSubmitComment,
  formatCommentTime,
}) {
  const postId = Number(post.id);
  const postImages = parseForumImageUrls(post.image_url);
  const commentMap = new Map((comments || []).map((item) => [Number(item.id), item]));
  const postBadge = getSelfBadge(post.user_phone, currentUser?.phone, activeBadgeTitle, badgeIcon);

  return (
    <div style={{ border: "1px solid #ebf2ee", borderRadius: "20px", padding: "12px", marginBottom: "12px", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <div style={{ width: "32px", height: "32px", position: "relative" }}>
          <img src={getAvatarSrc(post.user_phone, post.avatar_url)} alt="forum-user-avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
          {postBadge && <span style={avatarBubbleStyle}>{postBadge.icon}</span>}
        </div>
        <div style={{ fontSize: "13px", color: "#456a56", fontWeight: 700 }}>{post.username}</div>
        {postBadge && <span style={selfBadgeStyle(badgeTheme.textColor)}>{postBadge.title}</span>}
        <div style={{ fontSize: "11px", color: "#9db0a7", marginLeft: "auto" }}>{formatCommentTime(post.created_at)}</div>
      </div>

      <div style={{ marginTop: "8px", whiteSpace: "pre-wrap", color: "#233a2f", lineHeight: 1.55, fontSize: "14px" }}>{post.content || "（图片帖）"}</div>

      {postImages.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "8px", maxWidth: "320px" }}>
          {postImages.map((url, index) => (
            <img
              key={`${post.id}-${index}`}
              src={url}
              alt="forum-post-img"
              style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "8px", objectFit: "cover", cursor: "zoom-in" }}
              onClick={() => onZoomImage(postImages, index)}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <span onClick={() => onToggleComments(postId)} style={{ fontSize: "12px", color: "#5aa77b", cursor: "pointer", fontWeight: 700 }}>
          {expanded ? "收起评论" : `查看评论（${Number(post.comment_count || 0)}）`}
        </span>
        <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <span onClick={() => onToggleCall(postId)} style={callBtnStyle(Boolean(post.is_called), callingPost)}>
            <span style={{ fontSize: "13px" }}>{post.is_called ? "⚡" : "✦"}</span>
            <span>{Number(post.call_count || 0)}</span>
          </span>
          <span style={callLabelStyle(Boolean(post.is_called))}>{post.is_called ? "已共鸣" : "打call"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: "10px", background: "#f9fcfa", borderRadius: "12px", padding: "10px", border: "1px solid #edf4f0" }}>
          {loadingComments && <div style={{ fontSize: "12px", color: "#8fa39a" }}>评论加载中...</div>}
          {!loadingComments && comments.length === 0 && <div style={{ fontSize: "12px", color: "#9aac9f" }}>暂无评论，来抢沙发吧</div>}
          {!loadingComments && comments.map((comment) => {
            const parent = comment.parent_id ? commentMap.get(Number(comment.parent_id)) : null;
            const commentBadge = getSelfBadge(comment.user_phone, currentUser?.phone, activeBadgeTitle, badgeIcon);
            return (
              <div key={comment.id} style={{ borderBottom: "1px dashed #e5eeea", padding: "8px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", color: "#39664f", fontWeight: 700 }}>{comment.username}</span>
                  {commentBadge && <span style={{ fontSize: "12px" }}>{commentBadge.icon}</span>}
                  {commentBadge && <span style={selfBadgeStyle(badgeTheme.textColor)}>{commentBadge.title}</span>}
                  {parent && <span style={{ fontSize: "11px", color: "#7f968a" }}>回复 @{parent.username}</span>}
                  <span style={{ marginLeft: "auto", fontSize: "11px", color: "#a3b3ac" }}>{formatCommentTime(comment.created_at)}</span>
                </div>
                <div style={{ marginTop: "4px", fontSize: "13px", color: "#2d4439", whiteSpace: "pre-wrap" }}>{comment.content}</div>
                <div style={{ marginTop: "4px" }}>
                  <span onClick={() => onReplySelect(postId, comment)} style={{ fontSize: "11px", color: "#5aa77b", cursor: "pointer" }}>回复</span>
                </div>
              </div>
            );
          })}

          {replyTarget && (
            <div style={{ marginTop: "8px", fontSize: "12px", color: "#5aa77b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>正在回复 @{replyTarget.username}</span>
              <span onClick={() => onReplyCancel(postId)} style={{ cursor: "pointer", color: "#8ea39a" }}>取消</span>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <input
              value={commentDraft || ""}
              onChange={(event) => onCommentDraftChange(postId, event.target.value)}
              placeholder={replyTarget ? `回复 @${replyTarget.username}` : "写下评论..."}
              style={{ flex: 1, border: "1px solid #d8e5de", borderRadius: "10px", padding: "8px 10px", outline: "none" }}
            />
            <button onClick={() => onSubmitComment(postId)} disabled={submittingComment} style={{ ...btnMainStyle, marginTop: 0, width: "78px", borderRadius: "10px", padding: "8px 10px" }}>
              {submittingComment ? "发送中" : "发送"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ForumPostCard;
