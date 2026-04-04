import {
  bottomInputContainer,
  bottomRealInput,
  btnSendStyle,
  fixedBottomBarStyle,
  fullPageOverlayStyle,
  likeBtnStyle,
  navHeaderStyle,
  scrollContentStyle,
  sortBtnStyle,
  sortContainerStyle,
} from "../styles/appStyles";
import { getBadgeEmoji, getBadgeTheme } from "../logic/badgeTheme";

const PARENT_COMMENT_IMAGE_GRID_MAX_WIDTH = "152px";
const REPLY_COMMENT_IMAGE_GRID_MAX_WIDTH = "128px";
const CARTOON_AVATAR_STYLES = ["adventurer", "bottts", "fun-emoji", "personas"];
const CARTOON_AVATAR_API_BASE = "https://api.dicebear.com/7.x";
const DEFAULT_BADGE_TITLE = "\u672a\u89e3\u9501\u79f0\u53f7";
const PARENT_AVATAR_SIZE = 36;
const REPLY_AVATAR_SIZE = 24;
const PARENT_BADGE_BUBBLE_SIZE = 20;
const REPLY_BADGE_BUBBLE_SIZE = 16;
const selfBadgeBaseStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "3px 9px",
  borderRadius: "999px",
  transform: "translateY(-1px)",
  backdropFilter: "blur(2px)",
};

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getCartoonAvatar(phone, username) {
  const seedBase = `${phone || "guest"}-${username || "user"}`;
  const hash = hashString(seedBase);
  const style = CARTOON_AVATAR_STYLES[hash % CARTOON_AVATAR_STYLES.length];
  return `${CARTOON_AVATAR_API_BASE}/${style}/svg?seed=${encodeURIComponent(seedBase)}`;
}

function parseCommentImageUrls(imgData) {
  if (!imgData || imgData === "[]" || imgData === "null") return [];
  if (typeof imgData !== "string") return [];
  if (!imgData.startsWith("[")) return [imgData];
  try {
    const parsed = JSON.parse(imgData);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((url) => String(url).replace("http://", "https://")).filter(Boolean);
  } catch (error) {
    console.error("评论图片数据解析失败:", error);
    return [];
  }
}

function hasCommentImages(comment) {
  return parseCommentImageUrls(comment.image_url).length > 0;
}

function getAvatarSrc(url, phone, username) {
  const normalized = String(url || "").trim();
  if (!normalized || normalized === "null" || normalized === "undefined") return getCartoonAvatar(phone, username);
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return normalized.replace("http://", "https://");
  if (normalized.startsWith("/uploads/")) return `https://api.suzcore.top${normalized}`;
  console.error("Invalid avatar url, fallback to cartoon avatar:", normalized);
  return getCartoonAvatar(phone, username);
}

function handleAvatarLoadError(event, phone, username) {
  const fallback = getCartoonAvatar(phone, username);
  if (event.currentTarget.src === fallback) return;
  console.error("Avatar load failed, fallback to cartoon avatar:", event.currentTarget.src);
  event.currentTarget.src = fallback;
}

function getSelfBadge(comment, currentUser, activeBadgeTitle, badgeIcon) {
  if (String(comment?.user_phone || "") !== String(currentUser?.phone || "")) return null;
  return {
    icon: badgeIcon,
    title: activeBadgeTitle || DEFAULT_BADGE_TITLE,
  };
}

function createAvatarWrapStyle(size) {
  return {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    position: "relative",
  };
}

function createAvatarBadgeBubbleStyle(theme, size) {
  return {
    position: "absolute",
    right: "-5px",
    bottom: "-5px",
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: theme.background,
    border: `1px solid ${theme.border}`,
    boxShadow: `${theme.shadow}, 0 0 0 2px rgba(255,255,255,0.88)`,
  };
}

function sortAndFilterComments(comments, sortMode, showOnlyImages) {
  const source = Array.isArray(comments) ? [...comments] : [];
  const list = showOnlyImages ? source.filter(hasCommentImages) : source;
  if (sortMode === "latest") return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (sortMode === "hot") return list.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
  return list;
}

function CommentsOverlay({
  place,
  comments,
  commentSort,
  showOnlyImages,
  expandedParentIds,
  currentUser,
  activeBadgeTitle,
  activeBadgeMeta,
  replyTo,
  newComment,
  commentImages,
  onClose,
  onCommentSortChange,
  onToggleShowOnlyImages,
  onToggleExpand,
  onSetReplyTo,
  onNewCommentChange,
  onCommentImagesChange,
  onAddComment,
  onLikeComment,
  onDeleteComment,
  onZoomImage,
  formatCommentTime,
}) {
  if (!place) return null;

  const sorted = sortAndFilterComments(comments, commentSort, showOnlyImages);
  const parents = sorted.filter((c) => !c.parent_id);
  const children = sorted.filter((c) => c.parent_id);
  const badgeSeed = `${currentUser?.phone || ""}-${activeBadgeTitle || ""}`;
  const badgeTheme = getBadgeTheme(badgeSeed);
  const badgeIcon = getBadgeEmoji(badgeSeed, activeBadgeMeta?.icon || "");
  const selfBadgeStyle = {
    ...selfBadgeBaseStyle,
    background: `linear-gradient(130deg, rgba(255,255,255,0.86), rgba(255,255,255,0.56)), ${badgeTheme.background}`,
    border: `1px solid ${badgeTheme.border}`,
    boxShadow: `${badgeTheme.shadow}, 0 2px 0 rgba(255,255,255,0.74) inset`,
  };
  const parentAvatarWrapStyle = createAvatarWrapStyle(PARENT_AVATAR_SIZE);
  const replyAvatarWrapStyle = createAvatarWrapStyle(REPLY_AVATAR_SIZE);
  const parentBadgeBubbleStyle = createAvatarBadgeBubbleStyle(badgeTheme, PARENT_BADGE_BUBBLE_SIZE);
  const replyBadgeBubbleStyle = createAvatarBadgeBubbleStyle(badgeTheme, REPLY_BADGE_BUBBLE_SIZE);

  return (
    <div style={fullPageOverlayStyle}>
      <div style={navHeaderStyle}>
        <span onClick={onClose} style={{ cursor: "pointer", fontSize: "18px" }}>
          ← 返回
        </span>
        <span style={{ fontWeight: "bold" }}>{place.name}的点评</span>
        <span style={{ width: "40px" }}></span>
      </div>

      <div style={{ ...sortContainerStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "15px" }}>
          <button onClick={() => onCommentSortChange("latest")} style={sortBtnStyle(commentSort === "latest")}>
            按照最新
          </button>
          <button onClick={() => onCommentSortChange("hot")} style={sortBtnStyle(commentSort === "hot")}>
            按照最火
          </button>
        </div>
        <div
          onClick={onToggleShowOnlyImages}
          style={{
            fontSize: "12px",
            color: showOnlyImages ? "#5aa77b" : "#999",
            fontWeight: "bold",
            cursor: "pointer",
            background: showOnlyImages ? "#e8f5eb" : "#f5f5f5",
            padding: "4px 10px",
            borderRadius: "15px",
            transition: "0.2s",
          }}
        >
          {showOnlyImages ? "✅ 仅看图片" : "🖼️ 仅看图片"}
        </div>
      </div>

      <div style={scrollContentStyle}>
        {parents.length === 0 && <div style={{ textAlign: "center", marginTop: "100px", color: "#bbb" }}>💬 暂无相关点评...</div>}

        {parents.map((parent) => {
          const replies = children
            .filter((child) => String(child.parent_id) === String(parent.id))
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          const isExpanded = expandedParentIds.includes(parent.id);
          const parentImages = parseCommentImageUrls(parent.image_url);
          const parentBadge = getSelfBadge(parent, currentUser, activeBadgeTitle, badgeIcon);

          return (
            <div key={parent.id} style={{ marginBottom: "25px", borderBottom: "1px solid #f2f2f2", paddingBottom: "15px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={parentAvatarWrapStyle}>
                  <img
                    src={getAvatarSrc(parent.avatar_url, parent.user_phone, parent.username)}
                    onError={(event) => handleAvatarLoadError(event, parent.user_phone, parent.username)}
                    style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: "1px solid #eee", backgroundColor: "#f5f5f5" }}
                    alt="avatar"
                  />
                  {parentBadge && (
                    <div style={parentBadgeBubbleStyle}>
                      <span style={{ fontSize: "11px", lineHeight: 1 }}>{parentBadge.icon}</span>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <div style={{ fontSize: "13px", fontWeight: "bold", color: "#666" }}>{parent.username}</div>
                    {parentBadge && (
                      <div style={selfBadgeStyle}>
                        <span style={{ fontSize: "11px" }}>{parentBadge.icon}</span>
                        <span style={{ fontSize: "11px", color: badgeTheme.textColor, fontWeight: "bold", letterSpacing: "0.2px" }}>{parentBadge.title}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: "15px", color: "#222", margin: "4px 0" }}>{parent.content}</div>
                  {parentImages.length > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          parentImages.length === 1
                            ? "1fr"
                            : parentImages.length === 2 || parentImages.length === 4
                              ? "repeat(2, 1fr)"
                              : "repeat(3, 1fr)",
                        gap: "4px",
                        marginTop: "8px",
                        maxWidth: PARENT_COMMENT_IMAGE_GRID_MAX_WIDTH,
                      }}
                    >
                      {parentImages.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          loading="lazy"
                          decoding="async"
                          style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: "6px", border: "1px solid #eee", cursor: "zoom-in" }}
                          onClick={() => onZoomImage(parentImages, idx)}
                          alt="comment-img"
                        />
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: "15px", fontSize: "12px", color: "#999", marginTop: "10px" }}>
                    <span>{formatCommentTime(parent.created_at)}</span>
                    <span onClick={() => onSetReplyTo(parent)} style={{ cursor: "pointer", fontWeight: "bold", color: "#5aa77b" }}>
                      回复
                    </span>
                    <span onClick={() => onLikeComment(parent.id)} style={likeBtnStyle(parent.is_liked)}>
                      <span style={{ fontSize: "13px" }}>{parent.is_liked ? "♥" : "♡"}</span>
                      <span>{parent.like_count || 0}</span>
                    </span>
                    {parent.user_phone === currentUser.phone && (
                      <span onClick={() => onDeleteComment(parent.id)} style={{ color: "#ff4d4f", cursor: "pointer" }}>
                        删除
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {replies.length > 0 && (
                <div style={{ marginLeft: "46px", marginTop: "10px" }}>
                  {!isExpanded && (
                    <div
                      onClick={() => onToggleExpand(parent.id)}
                      style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "#999", fontSize: "12px" }}
                    >
                      <div style={{ width: "20px", height: "1px", background: "#ddd" }}></div>展开 {replies.length} 条回复 ▼
                    </div>
                  )}
                  {isExpanded && (
                    <div style={{ background: "#f9f9f9", padding: "10px", borderRadius: "8px" }}>
                      {replies.map((reply) => {
                        const replyImages = parseCommentImageUrls(reply.image_url);
                        const replyBadge = getSelfBadge(reply, currentUser, activeBadgeTitle, badgeIcon);
                        return (
                          <div key={reply.id} style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                            <div style={replyAvatarWrapStyle}>
                              <img
                                src={getAvatarSrc(reply.avatar_url, reply.user_phone, reply.username)}
                                onError={(event) => handleAvatarLoadError(event, reply.user_phone, reply.username)}
                                style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: "1px solid #eee", backgroundColor: "#f5f5f5" }}
                                alt="avatar"
                              />
                              {replyBadge && (
                                <div style={replyBadgeBubbleStyle}>
                                  <span style={{ fontSize: "9px", lineHeight: 1 }}>{replyBadge.icon}</span>
                                </div>
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                <div style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}>{reply.username}</div>
                                {replyBadge && (
                                  <div style={selfBadgeStyle}>
                                    <span style={{ fontSize: "10px" }}>{replyBadge.icon}</span>
                                    <span style={{ fontSize: "10px", color: badgeTheme.textColor, fontWeight: "bold", letterSpacing: "0.2px" }}>{replyBadge.title}</span>
                                  </div>
                                )}
                              </div>
                              <div style={{ fontSize: "14px", color: "#333" }}>
                                <span style={{ color: "#5aa77b" }}>回复：</span>
                                {reply.content}
                              </div>
                              {replyImages.length > 0 && (
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px", marginTop: "8px", maxWidth: REPLY_COMMENT_IMAGE_GRID_MAX_WIDTH }}>
                                  {replyImages.map((url, idx) => (
                                    <img
                                      key={idx}
                                      src={url}
                                      loading="lazy"
                                      decoding="async"
                                      style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: "6px", border: "1px solid #eee", cursor: "zoom-in" }}
                                      onClick={() => onZoomImage(replyImages, idx)}
                                      alt="reply-img"
                                    />
                                  ))}
                                </div>
                              )}
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11px", color: "#bbb", marginTop: "5px" }}>
                                <span>{formatCommentTime(reply.created_at)}</span>
                                <span onClick={() => onLikeComment(reply.id)} style={likeBtnStyle(reply.is_liked)}>
                                  <span style={{ fontSize: "13px" }}>{reply.is_liked ? "♥" : "♡"}</span>
                                  <span>{reply.like_count || 0}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div onClick={() => onToggleExpand(parent.id)} style={{ color: "#5aa77b", fontSize: "12px", cursor: "pointer", textAlign: "center", fontWeight: "bold" }}>
                        —— 收起回复 ▲ ——
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ height: "120px" }}></div>
      </div>

      <div style={fixedBottomBarStyle}>
        {replyTo && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 10px 8px", fontSize: "12px", color: "#5aa77b", fontWeight: "bold" }}>
            <span>正在回复 @{replyTo.username}</span>
            <span onClick={() => onSetReplyTo(null)} style={{ cursor: "pointer", color: "#999", fontSize: "16px" }}>
              ×
            </span>
          </div>
        )}

        <div style={bottomInputContainer}>
          <input
            id="comment-input-overlay"
            value={newComment}
            onChange={(e) => onNewCommentChange(e.target.value)}
            placeholder={replyTo ? `回复 @${replyTo.username}...` : "写点评..."}
            style={bottomRealInput}
          />
          <div onClick={() => document.getElementById("comment-image-input-overlay").click()} style={{ cursor: "pointer", fontSize: "20px" }}>
            🖼️
          </div>
          <input
            type="file"
            id="comment-image-input-overlay"
            hidden
            multiple
            accept="image/*"
            onChange={(e) => onCommentImagesChange(Array.from(e.target.files || []))}
          />
          <button onClick={onAddComment} style={btnSendStyle}>
            发布
          </button>
        </div>

        {commentImages.length > 0 && (
          <div style={{ fontSize: "10px", color: "#5aa77b", marginTop: "5px", fontWeight: "bold" }}>
            📸 已选择 {commentImages.length} 张照片 (最多9张)
            <span onClick={() => onCommentImagesChange([])} style={{ marginLeft: "10px", color: "#999", cursor: "pointer" }}>
              [重选]
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default CommentsOverlay;
