import { useMemo } from "react";
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
} from "../../styles/appStyles";
import {
  BADGE_ANIMATION_STYLE,
  PARENT_COMMENT_IMAGE_GRID_MAX_WIDTH,
  REPLY_COMMENT_IMAGE_GRID_MAX_WIDTH,
  buildBadgePresentation,
  getAvatarSrc,
  getSelfBadge,
  handleAvatarLoadError,
  parseCommentImageEntries,
  sortAndFilterComments,
} from "../../logic/commentsOverlayUtils";
import { parseForumImageEntries } from "../../logic/forumImageUtils";
import { useUserPointsCard } from "../../logic/useUserPointsCard";
import UserPointsCardModal from "../UserPointsCardModal";
import LikeHeartIcon from "../LikeHeartIcon";
import XhsImageUploadButton from "../common/XhsImageUploadButton";
import { buildCommentImageLoadingProps } from "../../logic/imageProps";

const COMMENT_INPUT_ID = "forum-comment-input-overlay";
const COMMENT_IMAGE_INPUT_ID = "forum-comment-images-input-overlay";
const ORIGINAL_POST_IMAGE_LIMIT = 3;

const originalPostCardStyle = {
  margin: "0 0 16px",
  padding: "12px",
  borderRadius: "16px",
  border: "1px solid #e7f0eb",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fcfa 100%)",
  boxShadow: "0 6px 18px rgba(80, 124, 100, 0.08)",
};

const originalPostLabelStyle = {
  display: "inline-flex",
  alignItems: "center",
  marginBottom: "10px",
  padding: "3px 9px",
  borderRadius: "999px",
  background: "#edf8f1",
  color: "#4f946d",
  fontSize: "12px",
  fontWeight: 800,
};

const originalPostImageGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "6px",
  marginTop: "10px",
  maxWidth: "220px",
};

function ForumCommentsOverlay({
  visible,
  post,
  comments,
  loading,
  commentSort,
  showOnlyImages,
  expandedParentIds,
  currentUser,
  isAdmin,
  activeBadgeTitle,
  activeBadgeMeta,
  replyTarget,
  commentDraft,
  commentImages,
  submitting,
  onClose,
  onToggleExpand,
  onReplySelect,
  onReplyCancel,
  onCommentDraftChange,
  onSelectCommentImages,
  onClearCommentImages,
  onSubmitComment,
  onLikeComment,
  onDeleteComment,
  onZoomImage,
  formatCommentTime,
  onCommentSortChange,
  onToggleShowOnlyImages,
}) {
  const userPointsCard = useUserPointsCard();
  const sortedComments = useMemo(() => sortAndFilterComments(comments, commentSort, showOnlyImages), [comments, commentSort, showOnlyImages]);
  const parents = sortedComments.filter((item) => !item.parent_id);
  const children = sortedComments.filter((item) => item.parent_id);
  const commentById = useMemo(() => new Map(sortedComments.map((item) => [String(item.id), item])), [sortedComments]);
  const parentIdSet = useMemo(() => new Set(parents.map((item) => String(item.id))), [parents]);
  const postImageEntries = useMemo(() => parseForumImageEntries(post?.image_url), [post?.image_url]);
  const postImages = useMemo(() => postImageEntries.map((item) => item.url), [postImageEntries]);
  const visiblePostImageEntries = postImageEntries.slice(0, ORIGINAL_POST_IMAGE_LIMIT);
  const repliesByParentId = useMemo(() => {
    const grouped = {};
    children.forEach((child) => {
      let current = child;
      const seenIds = new Set([String(child.id)]);
      let rootParentId = null;

      while (current?.parent_id) {
        const parentComment = commentById.get(String(current.parent_id));
        if (!parentComment) break;
        const parentId = String(parentComment.id);
        if (seenIds.has(parentId)) break;
        if (!parentComment.parent_id) {
          rootParentId = Number(parentComment.id);
          break;
        }
        seenIds.add(parentId);
        current = parentComment;
      }

      if (!rootParentId || !parentIdSet.has(String(rootParentId))) return;
      const replyTo = commentById.get(String(child.parent_id));
      const enrichedReply = { ...child, _replyToName: replyTo?.username || "" };
      if (!grouped[rootParentId]) grouped[rootParentId] = [];
      grouped[rootParentId].push(enrichedReply);
    });
    Object.values(grouped).forEach((replyList) => {
      replyList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    });
    return grouped;
  }, [children, commentById, parentIdSet]);
  const {
    badgeTheme,
    badgeIcon,
    motionBadgeVariant,
    selfBadgeStyle,
    parentAvatarWrapStyle,
    replyAvatarWrapStyle,
    parentBadgeBubbleStyle,
    replyBadgeBubbleStyle,
    parentMotionIconStyle,
    replyMotionIconStyle,
  } = buildBadgePresentation(currentUser, activeBadgeTitle, activeBadgeMeta);
  const postBadge = getSelfBadge(post, currentUser, activeBadgeTitle, badgeIcon);

  if (!visible || !post) return null;

  return (
    <div style={fullPageOverlayStyle}>
      <style>{BADGE_ANIMATION_STYLE}</style>
      <div style={navHeaderStyle}>
        <span onClick={onClose} style={{ cursor: "pointer", fontSize: "18px" }}>
          &lt; 返回
        </span>
        <span style={{ fontWeight: "bold" }}>帖子评论</span>
        <span style={{ width: "40px" }} />
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
        <div style={originalPostCardStyle}>
          <div style={originalPostLabelStyle}>原帖</div>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <div onClick={() => userPointsCard.openByPhone(post.user_phone)} style={{ ...parentAvatarWrapStyle, cursor: "pointer" }}>
              <img
                src={getAvatarSrc(post.avatar_url, post.user_phone, post.username)}
                onError={(event) => handleAvatarLoadError(event, post.user_phone, post.username)}
                style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: "1px solid #eee", backgroundColor: "#f5f5f5" }}
                alt="forum-post-avatar"
              />
              {postBadge && (
                <div style={parentBadgeBubbleStyle}>
                  <span style={parentMotionIconStyle}>{motionBadgeVariant.glyph}</span>
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <div style={{ fontSize: "13px", fontWeight: "bold", color: "#456a56" }}>{post.username || "用户"}</div>
                {postBadge && (
                  <div style={selfBadgeStyle}>
                    <span
                      style={{
                        fontSize: "10px",
                        color: badgeTheme.textColor,
                        fontWeight: "bold",
                        maxWidth: "86px",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {postBadge.title}
                    </span>
                  </div>
                )}
                <span style={{ marginLeft: "auto", fontSize: "11px", color: "#9db0a7" }}>{formatCommentTime(post.created_at)}</span>
              </div>
              <div style={{ marginTop: "7px", color: "#233a2f", fontSize: "14px", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {post.content || "图片动态"}
              </div>
              {visiblePostImageEntries.length > 0 && (
                <div style={originalPostImageGridStyle}>
                  {visiblePostImageEntries.map((entry, idx) => {
                    const remainingCount = postImageEntries.length - ORIGINAL_POST_IMAGE_LIMIT;
                    const showMoreMask = idx === ORIGINAL_POST_IMAGE_LIMIT - 1 && remainingCount > 0;
                    return (
                      <div key={`${post.id}-original-${idx}`} style={{ position: "relative" }}>
                        <img
                          src={entry.thumbnail || entry.url}
                          {...buildCommentImageLoadingProps({ itemIndex: 0, imageIndex: idx, eagerWindow: 1 })}
                          style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: "8px", border: "1px solid #e8eee9", cursor: "zoom-in", display: "block" }}
                          onClick={() => onZoomImage(postImages, idx)}
                          alt="forum-post-img"
                        />
                        {showMoreMask && (
                          <div
                            onClick={() => onZoomImage(postImages, idx)}
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "8px",
                              background: "rgba(0,0,0,0.38)",
                              color: "#fff",
                              fontSize: "15px",
                              fontWeight: 800,
                              cursor: "zoom-in",
                            }}
                          >
                            +{remainingCount}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        {loading && <div style={{ textAlign: "center", color: "#7a8f85", padding: "12px 0" }}>评论加载中...</div>}
        {!loading && parents.length === 0 && <div style={{ textAlign: "center", marginTop: "100px", color: "#bbb" }}>暂无相关评论...</div>}

        {parents.map((parent, parentIndex) => {
          const replies = repliesByParentId[parent.id] || [];
          const isExpanded = expandedParentIds.includes(parent.id);
          const parentImageEntries = parseCommentImageEntries(parent.image_url);
          const parentImages = parentImageEntries.map((item) => item.url);
          const parentBadge = getSelfBadge(parent, currentUser, activeBadgeTitle, badgeIcon);

          return (
            <div key={parent.id} style={{ marginBottom: "25px", borderBottom: "1px solid #f2f2f2", paddingBottom: "15px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <div onClick={() => userPointsCard.openByPhone(parent.user_phone)} style={{ ...parentAvatarWrapStyle, cursor: "pointer" }}>
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
                        <span
                          style={{
                            fontSize: "10px",
                            color: badgeTheme.textColor,
                            fontWeight: "bold",
                            letterSpacing: "0.1px",
                            maxWidth: "78px",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                          }}
                        >
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
                      {parentImageEntries.map((entry, idx) => (
                        <img
                          key={idx}
                          src={entry.thumbnail || entry.url}
	                          {...buildCommentImageLoadingProps({ itemIndex: parentIndex, imageIndex: idx })}
                          style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: "6px", border: "1px solid #eee", cursor: "zoom-in" }}
                          onClick={() => onZoomImage(parentImages, idx)}
                          alt="forum-comment-img"
                        />
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: "15px", fontSize: "12px", color: "#999", marginTop: "10px" }}>
                    <span>{formatCommentTime(parent.created_at)}</span>
                    <span onClick={() => onReplySelect(parent)} style={{ cursor: "pointer", fontWeight: "bold", color: "#5aa77b" }}>
                      回复
                    </span>
                    <span onClick={() => onLikeComment(parent.id)} style={likeBtnStyle(parent.is_liked)}>
                      <LikeHeartIcon liked={Boolean(parent.is_liked)} size={14} />
                      <span>{Number(parent.like_count || 0)}</span>
                    </span>
                    {(isAdmin || parent.user_phone === currentUser.phone) && (
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
                      <div style={{ width: "20px", height: "1px", background: "#ddd" }} />
                      展开 {replies.length} 条回复 ▼
                    </div>
                  )}
                  {isExpanded && (
                    <div style={{ background: "#f9f9f9", padding: "10px", borderRadius: "8px" }}>
                      {replies.map((reply) => {
                        const replyImageEntries = parseCommentImageEntries(reply.image_url);
                        const replyImages = replyImageEntries.map((item) => item.url);
                        const replyBadge = getSelfBadge(reply, currentUser, activeBadgeTitle, badgeIcon);
                        return (
                          <div key={reply.id} style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                            <div onClick={() => userPointsCard.openByPhone(reply.user_phone)} style={{ ...replyAvatarWrapStyle, cursor: "pointer" }}>
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
                                    <span
                                      style={{
                                        fontSize: "9px",
                                        color: badgeTheme.textColor,
                                        fontWeight: "bold",
                                        letterSpacing: "0.1px",
                                        maxWidth: "68px",
                                        overflow: "hidden",
                                        whiteSpace: "nowrap",
                                        textOverflow: "ellipsis",
                                      }}
                                    >
                                      {replyBadge.title}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div style={{ fontSize: "14px", color: "#333" }}>
                                <span style={{ color: "#5aa77b" }}>
                                  {reply._replyToName ? `回复 @${reply._replyToName}：` : "回复："}
                                </span>
                                {reply.content}
                              </div>
                              {replyImages.length > 0 && (
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px", marginTop: "8px", maxWidth: REPLY_COMMENT_IMAGE_GRID_MAX_WIDTH }}>
                                  {replyImageEntries.map((entry, idx) => (
                                    <img
                                      key={idx}
                                      src={entry.thumbnail || entry.url}
	                                      {...buildCommentImageLoadingProps({ itemIndex: parentIndex + 1, imageIndex: idx })}
                                      style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: "6px", border: "1px solid #eee", cursor: "zoom-in" }}
                                      onClick={() => onZoomImage(replyImages, idx)}
                                      alt="forum-reply-img"
                                    />
                                  ))}
                                </div>
                              )}
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11px", color: "#bbb", marginTop: "5px" }}>
                                <span>{formatCommentTime(reply.created_at)}</span>
                                <span onClick={() => onReplySelect(reply)} style={{ cursor: "pointer", fontWeight: "bold", color: "#5aa77b" }}>
                                  回复
                                </span>
                                <span onClick={() => onLikeComment(reply.id)} style={likeBtnStyle(reply.is_liked)}>
                                  <LikeHeartIcon liked={Boolean(reply.is_liked)} size={14} />
                                  <span>{Number(reply.like_count || 0)}</span>
                                </span>
                                {(isAdmin || reply.user_phone === currentUser.phone) && (
                                  <span onClick={() => onDeleteComment(reply.id)} style={{ color: "#ff4d4f", cursor: "pointer" }}>
                                    删除
                                  </span>
                                )}
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
        <div style={{ height: "120px" }} />
      </div>

      <div style={fixedBottomBarStyle}>
        {replyTarget && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 10px 8px", fontSize: "12px", color: "#5aa77b", fontWeight: "bold" }}>
            <span>正在回复 @{replyTarget.username}</span>
            <span onClick={onReplyCancel} style={{ cursor: "pointer", color: "#999", fontSize: "16px" }}>
              ×
            </span>
          </div>
        )}
        <div style={bottomInputContainer}>
          <input
            id={COMMENT_INPUT_ID}
            value={commentDraft}
            onChange={(event) => onCommentDraftChange(event.target.value)}
            placeholder={replyTarget ? `回复 @${replyTarget.username}...` : "写点评论..."}
            style={bottomRealInput}
          />
          <XhsImageUploadButton
            onClick={() => document.getElementById(COMMENT_IMAGE_INPUT_ID)?.click()}
            ariaLabel="upload-forum-comment-images"
            size={32}
            radius={10}
            iconSize={16}
            style={{ boxShadow: "none", borderWidth: "1px" }}
          />
          <input id={COMMENT_IMAGE_INPUT_ID} type="file" hidden multiple accept="image/*" onChange={onSelectCommentImages} />
          <button onClick={onSubmitComment} disabled={submitting} style={{ ...btnSendStyle, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "发布中..." : "发布"}
          </button>
        </div>
        {commentImages.length > 0 && (
          <div style={{ fontSize: "10px", color: "#5aa77b", marginTop: "5px", fontWeight: "bold" }}>
            📸 已选择 {commentImages.length} 张照片 (最多9张)
            <span onClick={onClearCommentImages} style={{ marginLeft: "10px", color: "#999", cursor: "pointer" }}>
              [重选]
            </span>
          </div>
        )}
      </div>

      <UserPointsCardModal visible={userPointsCard.visible} loading={userPointsCard.loading} data={userPointsCard.data} onClose={userPointsCard.close} />
    </div>
  );
}

export default ForumCommentsOverlay;
