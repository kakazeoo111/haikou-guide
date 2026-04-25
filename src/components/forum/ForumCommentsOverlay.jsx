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
  getSelfBadge,
} from "../../logic/commentsOverlayUtils";
import { getAvatarWithFallback } from "../../logic/avatarFallback";
import { parseForumImageUrls } from "../../logic/forumImageUtils";
import { buildImageLoadingProps } from "../../logic/imageProps";
import { useUserPointsCard } from "../../logic/useUserPointsCard";
import UserPointsCardModal from "../UserPointsCardModal";
import LikeHeartIcon from "../LikeHeartIcon";
import XhsImageUploadButton from "../common/XhsImageUploadButton";

const COMMENT_INPUT_ID = "forum-comment-input-overlay";
const COMMENT_IMAGE_INPUT_ID = "forum-comment-images-input-overlay";

function hasForumCommentImages(comment) {
  return parseForumImageUrls(comment?.image_url).length > 0;
}

function sortAndFilterForumComments(comments, sortMode, showOnlyImages) {
  const source = Array.isArray(comments) ? [...comments] : [];
  const list = showOnlyImages ? source.filter(hasForumCommentImages) : source;
  if (sortMode === "latest") return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (sortMode === "hot") {
    return list.sort((a, b) => {
      const likeDiff = Number(b.like_count || 0) - Number(a.like_count || 0);
      if (likeDiff !== 0) return likeDiff;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }
  return list;
}

function buildCommentTree(comments) {
  const list = Array.isArray(comments) ? comments : [];
  const parents = list.filter((item) => !item.parent_id);
  const children = list.filter((item) => item.parent_id);
  return { parents, children };
}

function getPostSummary(post) {
  const text = String(post?.content || "").trim();
  if (text) return text;
  return parseForumImageUrls(post?.image_url).length > 0 ? "这是一条图片动态" : "这条动态暂无文字内容";
}

function ForumCommentsOverlay({
  visible,
  post,
  comments,
  loading,
  sortMode,
  showOnlyImages,
  expandedParentIds,
  currentUser,
  activeBadgeTitle,
  activeBadgeMeta,
  replyTarget,
  commentDraft,
  commentImages,
  submitting,
  onClose,
  onSortChange,
  onToggleShowOnlyImages,
  onToggleExpand,
  onReplySelect,
  onReplyCancel,
  onCommentDraftChange,
  onSelectCommentImages,
  onRemoveCommentImage,
  onSubmitComment,
  onLikeComment,
  onZoomImage,
  formatCommentTime,
}) {
  const userPointsCard = useUserPointsCard();
  const sortedComments = useMemo(
    () => sortAndFilterForumComments(comments, sortMode, showOnlyImages),
    [comments, sortMode, showOnlyImages],
  );
  const { parents, children } = useMemo(() => buildCommentTree(sortedComments), [sortedComments]);
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
          <button onClick={() => onSortChange("latest")} style={sortBtnStyle(sortMode === "latest")}>
            按照最新
          </button>
          <button onClick={() => onSortChange("hot")} style={sortBtnStyle(sortMode === "hot")}>
            按照最热
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
          {showOnlyImages ? "仅看图片" : "只看图片"}
        </div>
      </div>

      <div style={scrollContentStyle}>
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 14px",
            borderRadius: "14px",
            background: "#f5fbf7",
            border: "1px solid #e5f0e9",
            color: "#48685b",
            fontSize: "13px",
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>原帖内容</div>
          <div>{getPostSummary(post)}</div>
        </div>

        {loading && <div style={{ textAlign: "center", color: "#7a8f85", padding: "12px 0" }}>评论加载中...</div>}
        {!loading && parents.length === 0 && <div style={{ textAlign: "center", marginTop: "100px", color: "#bbb" }}>暂无相关评论...</div>}

        {parents.map((parent) => {
          const replies = children
            .filter((child) => String(child.parent_id) === String(parent.id))
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          const isExpanded = expandedParentIds.includes(parent.id);
          const parentImages = parseForumImageUrls(parent.image_url);
          const parentBadge = getSelfBadge(parent, currentUser, activeBadgeTitle, badgeIcon);

          return (
            <div key={parent.id} style={{ marginBottom: "25px", borderBottom: "1px solid #f2f2f2", paddingBottom: "15px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <div onClick={() => userPointsCard.openByPhone(parent.user_phone)} style={{ ...parentAvatarWrapStyle, cursor: "pointer" }}>
                  <img
                    src={getAvatarWithFallback(parent.avatar_url, parent.user_phone, parent.username)}
                    {...buildImageLoadingProps()}
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
                  <div style={{ fontSize: "15px", color: "#222", margin: "4px 0", whiteSpace: "pre-wrap" }}>
                    {parent.content || "（图片评论）"}
                  </div>
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
                          {...buildImageLoadingProps()}
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
                      展开 {replies.length} 条回复
                    </div>
                  )}
                  {isExpanded && (
                    <div style={{ background: "#f9f9f9", padding: "10px", borderRadius: "8px" }}>
                      {replies.map((reply) => {
                        const replyImages = parseForumImageUrls(reply.image_url);
                        const replyBadge = getSelfBadge(reply, currentUser, activeBadgeTitle, badgeIcon);
                        return (
                          <div key={reply.id} style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                            <div onClick={() => userPointsCard.openByPhone(reply.user_phone)} style={{ ...replyAvatarWrapStyle, cursor: "pointer" }}>
                              <img
                                src={getAvatarWithFallback(reply.avatar_url, reply.user_phone, reply.username)}
                                {...buildImageLoadingProps()}
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
                              <div style={{ fontSize: "14px", color: "#333", whiteSpace: "pre-wrap" }}>
                                <span style={{ color: "#5aa77b" }}>回复：</span>
                                {reply.content || "（图片回复）"}
                              </div>
                              {replyImages.length > 0 && (
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px", marginTop: "8px", maxWidth: REPLY_COMMENT_IMAGE_GRID_MAX_WIDTH }}>
                                  {replyImages.map((url, idx) => (
                                    <img
                                      key={idx}
                                      src={url}
                                      {...buildImageLoadingProps()}
                                      style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: "6px", border: "1px solid #eee", cursor: "zoom-in" }}
                                      onClick={() => onZoomImage(replyImages, idx)}
                                      alt="forum-reply-img"
                                    />
                                  ))}
                                </div>
                              )}
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11px", color: "#bbb", marginTop: "5px" }}>
                                <span>{formatCommentTime(reply.created_at)}</span>
                                <span onClick={() => onLikeComment(reply.id)} style={likeBtnStyle(reply.is_liked)}>
                                  <LikeHeartIcon liked={Boolean(reply.is_liked)} size={14} />
                                  <span>{Number(reply.like_count || 0)}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div onClick={() => onToggleExpand(parent.id)} style={{ color: "#5aa77b", fontSize: "12px", cursor: "pointer", textAlign: "center", fontWeight: "bold" }}>
                        收起回复
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
            已选择 {commentImages.length} 张照片（最多 9 张）
            <span onClick={onReplyCancel} style={{ display: "none" }} />
          </div>
        )}
        {commentImages.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "8px", maxWidth: "260px" }}>
            {commentImages.map((file, index) => (
              <div key={`${file.name}-${index}`} style={{ position: "relative" }}>
                <img src={URL.createObjectURL(file)} alt="forum-comment-selected" style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "8px", objectFit: "cover" }} />
                <span
                  onClick={() => onRemoveCommentImage(index)}
                  style={{
                    position: "absolute",
                    top: "-6px",
                    right: "-6px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "#ff4d4f",
                    color: "#fff",
                    textAlign: "center",
                    lineHeight: "18px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  ×
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <UserPointsCardModal visible={userPointsCard.visible} loading={userPointsCard.loading} data={userPointsCard.data} onClose={userPointsCard.close} />
    </div>
  );
}

export default ForumCommentsOverlay;
