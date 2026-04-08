import { btnMainStyle } from "../../styles/appStyles";
import { BADGE_ANIMATION_STYLE, buildBadgePresentation } from "../../logic/commentsOverlayUtils";
import { parseForumImageUrls } from "../../logic/forumImageUtils";
import { buildImageLoadingProps } from "../../logic/imageProps";
import { useUserPointsCard } from "../../logic/useUserPointsCard";
import UserPointsCardModal from "../UserPointsCardModal";
import XhsImageUploadButton from "../common/XhsImageUploadButton";

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

function getMotionIconStyle(baseStyle, isExplorerBadge) {
  if (!isExplorerBadge) return baseStyle;
  return {
    ...baseStyle,
    color: "#ffcc3a",
    textShadow: "0 1px 0 rgba(255,255,255,0.95), 0 0 8px rgba(255, 204, 58, 0.72)",
    filter: "drop-shadow(0 1px 2px rgba(255, 186, 46, 0.45))",
  };
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
  commentImages,
  submittingComment,
  callingPost,
  onToggleComments,
  onToggleCall,
  onZoomImage,
  onReplySelect,
  onReplyCancel,
  onCommentDraftChange,
  onSelectCommentImages,
  onRemoveCommentImage,
  onSubmitComment,
  formatCommentTime,
}) {
  const userPointsCard = useUserPointsCard();
  const postId = Number(post.id);
  const postImages = parseForumImageUrls(post.image_url);
  const commentImageInputId = `forum-comment-images-input-${postId}`;
  const commentMap = new Map((comments || []).map((item) => [Number(item.id), item]));
  const postBadge = getSelfBadge(post.user_phone, currentUser?.phone, activeBadgeTitle, badgeIcon);
  const { motionBadgeVariant, parentBadgeBubbleStyle, replyBadgeBubbleStyle, parentMotionIconStyle, replyMotionIconStyle } = buildBadgePresentation(
    currentUser,
    activeBadgeTitle,
    { icon: badgeIcon },
  );
  const isExplorerBadge = String(activeBadgeTitle || "") === "探店能手";
  const badgeGlyph = isExplorerBadge ? "✨" : motionBadgeVariant.glyph;
  const postMotionStyle = getMotionIconStyle(parentMotionIconStyle, isExplorerBadge);
  const replyMotionStyle = getMotionIconStyle(replyMotionIconStyle, isExplorerBadge);

  return (
    <div style={{ contentVisibility: "auto", containIntrinsicSize: "320px", border: "1px solid #ebf2ee", borderRadius: "20px", padding: "12px", marginBottom: "12px", background: "#fff" }}>
      <style>{BADGE_ANIMATION_STYLE}</style>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <div
          onClick={() => userPointsCard.openByPhone(post.user_phone)}
          style={{ width: "32px", height: "32px", position: "relative", cursor: "pointer" }}
        >
          <img src={getAvatarSrc(post.user_phone, post.avatar_url)} {...buildImageLoadingProps()} alt="forum-user-avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
          {postBadge && (
            <div style={parentBadgeBubbleStyle}>
              <span style={postMotionStyle}>{badgeGlyph}</span>
            </div>
          )}
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
              {...buildImageLoadingProps()}
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
            const commentImages = parseForumImageUrls(comment.image_url);
            return (
              <div key={comment.id} style={{ borderBottom: "1px dashed #e5eeea", padding: "8px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <div onClick={() => userPointsCard.openByPhone(comment.user_phone)} style={{ width: "22px", height: "22px", position: "relative", cursor: "pointer" }}>
                    <img src={getAvatarSrc(comment.user_phone, comment.avatar_url)} {...buildImageLoadingProps()} alt="forum-comment-avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    {commentBadge && (
                      <div style={replyBadgeBubbleStyle}>
                        <span style={replyMotionStyle}>{badgeGlyph}</span>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: "12px", color: "#39664f", fontWeight: 700 }}>{comment.username}</span>
                  {commentBadge && <span style={selfBadgeStyle(badgeTheme.textColor)}>{commentBadge.title}</span>}
                  {parent && <span style={{ fontSize: "11px", color: "#7f968a" }}>回复 @{parent.username}</span>}
                  <span style={{ marginLeft: "auto", fontSize: "11px", color: "#a3b3ac" }}>{formatCommentTime(comment.created_at)}</span>
                </div>
                <div style={{ marginTop: "4px", fontSize: "13px", color: "#2d4439", whiteSpace: "pre-wrap" }}>{comment.content}</div>
                {commentImages.length > 0 && (
                  <div style={{ marginTop: "6px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", maxWidth: "220px" }}>
                    {commentImages.map((url, index) => (
                      <img
                        key={`${comment.id}-img-${index}`}
                        src={url}
                        {...buildImageLoadingProps()}
                        alt="forum-comment-img"
                        style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "8px", objectFit: "cover", cursor: "zoom-in" }}
                        onClick={() => onZoomImage(commentImages, index)}
                      />
                    ))}
                  </div>
                )}
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

          {commentImages.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", marginTop: "8px", maxWidth: "240px" }}>
              {commentImages.map((file, index) => (
                <div key={`${postId}-comment-image-${file.name}-${index}`} style={{ position: "relative" }}>
                  <img src={URL.createObjectURL(file)} alt="forum-comment-preview" style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "8px", objectFit: "cover" }} />
                  <span
                    onClick={() => onRemoveCommentImage(postId, index)}
                    style={{ position: "absolute", top: "-5px", right: "-5px", width: "18px", height: "18px", borderRadius: "50%", background: "#ff4d4f", color: "#fff", textAlign: "center", lineHeight: "18px", cursor: "pointer" }}
                  >
                    ×
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
            <XhsImageUploadButton
              onClick={() => document.getElementById(commentImageInputId)?.click()}
              ariaLabel="upload-forum-comment-images"
              size={34}
              radius={11}
              iconSize={18}
            />
            <span style={{ fontSize: "11px", color: "#7f968a" }}>已选 {commentImages.length}/9</span>
            <input id={commentImageInputId} type="file" hidden accept="image/*" multiple onChange={(event) => onSelectCommentImages(postId, event)} />
          </div>

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
      <UserPointsCardModal visible={userPointsCard.visible} loading={userPointsCard.loading} data={userPointsCard.data} onClose={userPointsCard.close} />
    </div>
  );
}

export default ForumPostCard;
