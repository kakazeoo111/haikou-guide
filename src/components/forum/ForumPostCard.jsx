import { BADGE_ANIMATION_STYLE, buildBadgePresentation } from "../../logic/commentsOverlayUtils";
import { getAvatarWithFallback } from "../../logic/avatarFallback";
import { parseForumImageUrls } from "../../logic/forumImageUtils";
import { buildImageLoadingProps } from "../../logic/imageProps";
import { useUserPointsCard } from "../../logic/useUserPointsCard";
import UserPointsCardModal from "../UserPointsCardModal";

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
  callingPost,
  commentsOpen,
  onOpenComments,
  onToggleCall,
  onZoomImage,
  formatCommentTime,
}) {
  const userPointsCard = useUserPointsCard();
  const postId = Number(post.id);
  const postImages = parseForumImageUrls(post.image_url);
  const postBadge = getSelfBadge(post.user_phone, currentUser?.phone, activeBadgeTitle, badgeIcon);
  const { motionBadgeVariant, parentBadgeBubbleStyle, parentMotionIconStyle } = buildBadgePresentation(currentUser, activeBadgeTitle, { icon: badgeIcon });
  const isExplorerBadge = String(activeBadgeTitle || "") === "探店能手";
  const badgeGlyph = isExplorerBadge ? "✧" : motionBadgeVariant.glyph;
  const postMotionStyle = getMotionIconStyle(parentMotionIconStyle, isExplorerBadge);
  const commentCount = Number(post.comment_count || 0);

  return (
    <>
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "320px", border: "1px solid #ebf2ee", borderRadius: "20px", padding: "12px", background: "#fff" }}>
        <style>{BADGE_ANIMATION_STYLE}</style>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div onClick={() => userPointsCard.openByPhone(post.user_phone)} style={{ width: "32px", height: "32px", position: "relative", cursor: "pointer" }}>
            <img src={getAvatarWithFallback(post.avatar_url, post.user_phone, post.username)} {...buildImageLoadingProps()} alt="forum-user-avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
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
          {commentCount > 0 && !commentsOpen && (
            <span
              onClick={() => onOpenComments(postId)}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "#999", fontSize: "12px", fontWeight: 600 }}
            >
              <span style={{ width: "20px", height: "1px", background: "#ddd" }} />
              展开 {commentCount} 条评论 ▼
            </span>
          )}
          <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <span onClick={() => onToggleCall(postId)} style={callBtnStyle(Boolean(post.is_called), callingPost)}>
              <span style={{ fontSize: "13px" }}>{post.is_called ? "⚡" : "✧"}</span>
              <span>{Number(post.call_count || 0)}</span>
            </span>
            <span style={callLabelStyle(Boolean(post.is_called))}>{post.is_called ? "已共鸣" : "打call"}</span>
          </div>
        </div>
      </div>
      <UserPointsCardModal visible={userPointsCard.visible} loading={userPointsCard.loading} data={userPointsCard.data} onClose={userPointsCard.close} />
    </>
  );
}

export default ForumPostCard;
