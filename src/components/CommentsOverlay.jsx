import {
  bottomInputContainer,
  bottomRealInput,
  btnSendStyle,
  fixedBottomBarStyle,
  fullPageOverlayStyle,
  navHeaderStyle,
  scrollContentStyle,
  sortBtnStyle,
  sortContainerStyle,
} from "../styles/appStyles";

const PARENT_COMMENT_IMAGE_GRID_MAX_WIDTH = "168px";
const REPLY_COMMENT_IMAGE_GRID_MAX_WIDTH = "144px";

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

function getAvatarSrc(url, phone) {
  if (url && url !== "null") return String(url).replace("http://", "https://");
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${phone || "haikou"}`;
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

          return (
            <div key={parent.id} style={{ marginBottom: "25px", borderBottom: "1px solid #f2f2f2", paddingBottom: "15px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <img
                  src={getAvatarSrc(parent.avatar_url, parent.user_phone)}
                  style={{ width: "36px", height: "36px", minWidth: "36px", borderRadius: "50%", objectFit: "cover", border: "1px solid #eee", backgroundColor: "#f5f5f5" }}
                  alt="avatar"
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: "bold", color: "#666" }}>{parent.username}</div>
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
                          onClick={() => onZoomImage(url)}
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
                    <span onClick={() => onLikeComment(parent.id)} style={{ cursor: "pointer", color: parent.is_liked ? "#ff4d4f" : "#999" }}>
                      {parent.is_liked ? "❤️" : "🤍"} {parent.like_count || 0}
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
                        return (
                          <div key={reply.id} style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                            <img
                              src={getAvatarSrc(reply.avatar_url, reply.user_phone)}
                              style={{ width: "24px", height: "24px", minWidth: "24px", borderRadius: "50%", objectFit: "cover", border: "1px solid #eee", backgroundColor: "#f5f5f5" }}
                              alt="avatar"
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}>{reply.username}</div>
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
                                      onClick={() => onZoomImage(url)}
                                      alt="reply-img"
                                    />
                                  ))}
                                </div>
                              )}
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11px", color: "#bbb", marginTop: "5px" }}>
                                <span>{formatCommentTime(reply.created_at)}</span>
                                <span onClick={() => onLikeComment(reply.id)} style={{ cursor: "pointer", color: reply.is_liked ? "#ff4d4f" : "#999" }}>
                                  ❤️ {reply.like_count || 0}
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
