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
const PARENT_BADGE_BUBBLE_SIZE = 14;
const REPLY_BADGE_BUBBLE_SIZE = 11;
const selfBadgeBaseStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "3px",
  padding: "1px 7px",
  borderRadius: "999px",
  minHeight: "17px",
  backdropFilter: "blur(2px)",
};
const STICKER_BADGE_GLYPHS = ["\u2726", "\u2728", "\u2730", "\u26A1", "\u2604", "\u2764"];
const STICKER_BADGE_MOTIONS = [
  "hkStickerHop 1.9s ease-in-out infinite, hkStickerGlow 2.8s ease-in-out infinite",
  "hkStickerWiggle 1.8s ease-in-out infinite, hkStickerGlow 2.6s ease-in-out infinite",
  "hkStickerSpring 2.1s ease-in-out infinite, hkStickerGlow 3.2s ease-in-out infinite",
  "hkStickerSnap 1.75s ease-in-out infinite, hkStickerGlow 2.4s ease-in-out infinite",
];
const STICKER_BADGE_PALETTES = [
  {
    color: "#ff4fa2",
    weight: 800,
    tilt: "-8deg",
    scale: "1.02",
    textShadow: "0 1px 0 rgba(255,255,255,0.95), 0 0 7px rgba(255, 79, 162, 0.58)",
    filter: "drop-shadow(0 1px 2px rgba(255, 79, 162, 0.35))",
  },
  {
    color: "#ff8f1f",
    weight: 800,
    tilt: "6deg",
    scale: "1.03",
    textShadow: "0 1px 0 rgba(255,255,255,0.95), 0 0 8px rgba(255, 143, 31, 0.62)",
    filter: "drop-shadow(0 1px 2px rgba(255, 143, 31, 0.36))",
  },
  {
    color: "#7f8fff",
    weight: 700,
    tilt: "8deg",
    scale: "1",
    textShadow: "0 1px 0 rgba(255,255,255,0.92), 0 0 8px rgba(127, 143, 255, 0.58)",
    filter: "drop-shadow(0 1px 2px rgba(127, 143, 255, 0.36))",
  },
  {
    color: "#5fd6ff",
    weight: 800,
    tilt: "4deg",
    scale: "1.01",
    textShadow: "0 1px 0 rgba(255,255,255,0.92), 0 0 8px rgba(95, 214, 255, 0.64)",
    filter: "drop-shadow(0 1px 2px rgba(95, 214, 255, 0.35))",
  },
];
const BADGE_ANIMATION_STYLE = `
@keyframes hkStickerHop {
  0% { transform: translateY(0) rotate(var(--hk-tilt, 0deg)) scale(var(--hk-scale, 1)); }
  45% { transform: translateY(-2px) rotate(calc(var(--hk-tilt, 0deg) - 4deg)) scale(1.05); }
  100% { transform: translateY(0) rotate(var(--hk-tilt, 0deg)) scale(var(--hk-scale, 1)); }
}
@keyframes hkStickerWiggle {
  0% { transform: rotate(var(--hk-tilt, 0deg)) scale(var(--hk-scale, 1)); }
  30% { transform: rotate(calc(var(--hk-tilt, 0deg) - 6deg)) scale(var(--hk-scale, 1)); }
  70% { transform: rotate(calc(var(--hk-tilt, 0deg) + 6deg)) scale(var(--hk-scale, 1)); }
  100% { transform: rotate(var(--hk-tilt, 0deg)) scale(var(--hk-scale, 1)); }
}
@keyframes hkStickerSpring {
  0% { transform: translateY(0) rotate(var(--hk-tilt, 0deg)) scale(var(--hk-scale, 1)); }
  36% { transform: translateY(-1px) rotate(var(--hk-tilt, 0deg)) scale(1.1); }
  65% { transform: translateY(0) rotate(calc(var(--hk-tilt, 0deg) + 3deg)) scale(0.96); }
  100% { transform: translateY(0) rotate(var(--hk-tilt, 0deg)) scale(var(--hk-scale, 1)); }
}
@keyframes hkStickerSnap {
  0% { transform: rotate(var(--hk-tilt, 0deg)) scale(var(--hk-scale, 1)); }
  38% { transform: rotate(calc(var(--hk-tilt, 0deg) - 10deg)) scale(1.08); }
  72% { transform: rotate(calc(var(--hk-tilt, 0deg) + 3deg)) scale(0.98); }
  100% { transform: rotate(var(--hk-tilt, 0deg)) scale(var(--hk-scale, 1)); }
}
@keyframes hkStickerGlow {
  0%, 100% { opacity: 0.86; }
  50% { opacity: 1; }
}
`;

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

function getMotionBadgeVariant(seed) {
  const baseIndex = hashString(`motion-icon-${seed}`);
  const glyph = STICKER_BADGE_GLYPHS[baseIndex % STICKER_BADGE_GLYPHS.length];
  const motion = STICKER_BADGE_MOTIONS[baseIndex % STICKER_BADGE_MOTIONS.length];
  const palette = STICKER_BADGE_PALETTES[baseIndex % STICKER_BADGE_PALETTES.length];
  return {
    glyph,
    motion,
    ...palette,
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

function createAvatarBadgeBubbleStyle(size) {
  return {
    position: "absolute",
    right: "-3px",
    bottom: "-3px",
    width: `${size}px`,
    height: `${size}px`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    pointerEvents: "none",
  };
}

function createMotionIconStyle(size, variant) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${Math.max(8, size - 1)}px`,
    fontWeight: variant.weight,
    color: variant.color,
    textShadow: variant.textShadow,
    lineHeight: 1,
    animation: variant.motion,
    transformOrigin: "center 75%",
    userSelect: "none",
    pointerEvents: "none",
    filter: variant.filter,
    willChange: "transform, opacity",
    "--hk-tilt": variant.tilt,
    "--hk-scale": variant.scale,
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
  const motionBadgeVariant = getMotionBadgeVariant(`${badgeSeed}-${badgeIcon}`);
  const selfBadgeStyle = {
    ...selfBadgeBaseStyle,
    background: `linear-gradient(130deg, rgba(255,255,255,0.95), rgba(255,255,255,0.76)), ${badgeTheme.background}`,
    border: `1px solid ${badgeTheme.border}`,
    boxShadow: `0 1px 3px rgba(255, 124, 182, 0.12), 0 1px 0 rgba(255,255,255,0.8) inset`,
  };
  const parentAvatarWrapStyle = createAvatarWrapStyle(PARENT_AVATAR_SIZE);
  const replyAvatarWrapStyle = createAvatarWrapStyle(REPLY_AVATAR_SIZE);
  const parentBadgeBubbleStyle = createAvatarBadgeBubbleStyle(PARENT_BADGE_BUBBLE_SIZE);
  const replyBadgeBubbleStyle = createAvatarBadgeBubbleStyle(REPLY_BADGE_BUBBLE_SIZE);
  const parentMotionIconStyle = createMotionIconStyle(PARENT_BADGE_BUBBLE_SIZE, motionBadgeVariant);
  const replyMotionIconStyle = createMotionIconStyle(REPLY_BADGE_BUBBLE_SIZE, motionBadgeVariant);

  return (
    <div style={fullPageOverlayStyle}>
      <style>{BADGE_ANIMATION_STYLE}</style>
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
                      <span style={parentMotionIconStyle}>{motionBadgeVariant.glyph}</span>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <div style={{ fontSize: "13px", fontWeight: "bold", color: "#666" }}>{parent.username}</div>
                    {parentBadge && (
                      <div style={selfBadgeStyle}>
                        <span style={{ fontSize: "10px", color: badgeTheme.textColor, fontWeight: "bold", letterSpacing: "0.1px", maxWidth: "78px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                          {parentBadge.title}
                        </span>
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
                                  <span style={replyMotionIconStyle}>{motionBadgeVariant.glyph}</span>
                                </div>
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                <div style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}>{reply.username}</div>
                                {replyBadge && (
                                  <div style={selfBadgeStyle}>
                                    <span style={{ fontSize: "9px", color: badgeTheme.textColor, fontWeight: "bold", letterSpacing: "0.1px", maxWidth: "68px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                                      {replyBadge.title}
                                    </span>
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
