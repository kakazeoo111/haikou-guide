import { useMemo } from "react";
import { likeBtnStyle } from "../../styles/appStyles";
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

const COMMENT_INPUT_ID_PREFIX = "forum-comment-input-inline-";
const COMMENT_IMAGE_INPUT_ID_PREFIX = "forum-comment-images-input-inline-";

const PANEL_STYLE = {
  marginTop: "8px",
  marginBottom: "12px",
  borderTop: "1px solid #edf2ef",
  background: "#fff",
};
const TOOLBAR_STYLE = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  padding: "14px 4px 12px",
  borderBottom: "1px solid #f0f3f1",
  flexWrap: "wrap",
};
const SORT_TABS_STYLE = { display: "inline-flex", alignItems: "center", gap: "16px" };
const SORT_TAB_STYLE = (active) => ({
  border: "none",
  background: "transparent",
  padding: 0,
  fontSize: "13px",
  fontWeight: active ? 700 : 500,
  color: active ? "#5aa77b" : "#8f9d96",
  cursor: "pointer",
});
const IMAGE_FILTER_STYLE = (active) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 12px",
  borderRadius: "999px",
  border: active ? "1px solid #dcebe2" : "1px solid #edf1ef",
  background: active ? "#f0f8f3" : "#f7f8f8",
  color: active ? "#5aa77b" : "#98a59f",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
});
const COMMENTS_BODY_STYLE = {
  padding: "0 0 4px",
};
const ACTION_TEXT_STYLE = {
  cursor: "pointer",
  fontWeight: 700,
  color: "#5aa77b",
};
const DELETE_TEXT_STYLE = {
  color: "#ff6b73",
  cursor: "pointer",
};
const COMPOSER_WRAP_STYLE = {
  padding: "12px 0 4px",
  borderTop: "1px solid #f0f3f1",
};
const REPLY_HINT_ROW_STYLE = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "8px",
  padding: "0 4px",
  fontSize: "12px",
  color: "#5aa77b",
  fontWeight: 700,
};
const INPUT_BAR_STYLE = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  background: "#f6f7f7",
  borderRadius: "999px",
  padding: "8px 10px 8px 14px",
};
const INPUT_STYLE = {
  flex: 1,
  border: "none",
  background: "transparent",
  outline: "none",
  fontSize: "14px",
  color: "#32463a",
  minWidth: 0,
};
const SEND_BUTTON_STYLE = {
  border: "none",
  borderRadius: "999px",
  background: "#5aa77b",
  color: "#fff",
  fontSize: "13px",
  fontWeight: 700,
  padding: "8px 16px",
  cursor: "pointer",
};
const IMAGE_PREVIEW_GRID_STYLE = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "8px",
  marginTop: "10px",
  maxWidth: "240px",
};
const REPLY_TOGGLE_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  marginTop: "10px",
  color: "#6fae88",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
};
const REPLY_TOGGLE_LINE_STYLE = {
  width: "52px",
  height: "1px",
  background: "#7eb695",
  opacity: 0.85,
};

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

function buildReplyPrefix(reply) {
  const content = String(reply.content || "").trim();
  return content ? `回复：${content}` : "（图片回复）";
}

function ForumInlineCommentsPanel({
  postId,
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
  onDeleteComment,
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

  const commentInputId = `${COMMENT_INPUT_ID_PREFIX}${postId}`;
  const commentImageInputId = `${COMMENT_IMAGE_INPUT_ID_PREFIX}${postId}`;

  return (
    <div style={PANEL_STYLE}>
      <style>{BADGE_ANIMATION_STYLE}</style>

      <div style={TOOLBAR_STYLE}>
        <div style={SORT_TABS_STYLE}>
          <button onClick={() => onSortChange("latest")} style={SORT_TAB_STYLE(sortMode === "latest")}>按照最新</button>
          <button onClick={() => onSortChange("hot")} style={SORT_TAB_STYLE(sortMode === "hot")}>按照最热</button>
        </div>
        <button onClick={onToggleShowOnlyImages} style={IMAGE_FILTER_STYLE(showOnlyImages)}>
          <span style={{ fontSize: "13px" }}>🖼️</span>
          <span>只看图片</span>
        </button>
      </div>

      <div style={COMMENTS_BODY_STYLE}>
        {loading && <div style={{ textAlign: "center", color: "#7a8f85", padding: "12px 0 18px" }}>评论加载中...</div>}
        {!loading && parents.length === 0 && <div style={{ textAlign: "center", color: "#a0aca6", padding: "12px 0 20px" }}>还没有评论，来抢个前排</div>}

        {!loading && parents.map((parent) => {
          const replies = children
            .filter((child) => String(child.parent_id) === String(parent.id))
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          const isExpanded = expandedParentIds.includes(parent.id);
          const parentImages = parseForumImageUrls(parent.image_url);
          const parentBadge = getSelfBadge(parent, currentUser, activeBadgeTitle, badgeIcon);

          return (
            <div key={parent.id} style={{ padding: "14px 0", borderBottom: "1px solid #f0f3f1" }}>
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

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#365243" }}>{parent.username}</div>
                    {parentBadge && (
                      <div style={selfBadgeStyle}>
                        <span
                          style={{
                            fontSize: "10px",
                            color: badgeTheme.textColor,
                            fontWeight: 700,
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

                  <div style={{ fontSize: "15px", color: "#222", margin: "4px 0", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
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

                  <div style={{ display: "flex", alignItems: "center", gap: "15px", fontSize: "12px", color: "#999", marginTop: "10px", flexWrap: "wrap" }}>
                    <span>{formatCommentTime(parent.created_at)}</span>
                    <span onClick={() => onReplySelect(parent)} style={ACTION_TEXT_STYLE}>回复</span>
                    <span onClick={() => onLikeComment(parent.id)} style={likeBtnStyle(parent.is_liked)}>
                      <LikeHeartIcon liked={Boolean(parent.is_liked)} size={14} />
                      <span>{Number(parent.like_count || 0)}</span>
                    </span>
                    {String(parent.user_phone || "") === String(currentUser?.phone || "") && (
                      <span onClick={() => onDeleteComment(parent.id)} style={DELETE_TEXT_STYLE}>删除</span>
                    )}
                  </div>

                  {replies.length > 0 && !isExpanded && (
                    <div onClick={() => onToggleExpand(parent.id)} style={REPLY_TOGGLE_STYLE}>
                      <span style={REPLY_TOGGLE_LINE_STYLE} />
                      <span>{`展开 ${replies.length} 条回复 ▼`}</span>
                      <span style={REPLY_TOGGLE_LINE_STYLE} />
                    </div>
                  )}

                  {replies.length > 0 && isExpanded && (
                    <div style={{ marginTop: "10px" }}>
                      {replies.map((reply) => {
                        const replyImages = parseForumImageUrls(reply.image_url);
                        const replyBadge = getSelfBadge(reply, currentUser, activeBadgeTitle, badgeIcon);

                        return (
                          <div key={reply.id} style={{ display: "flex", gap: "8px", marginBottom: "12px", marginLeft: "24px" }}>
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

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                <div style={{ fontSize: "12px", fontWeight: 700, color: "#4d6157" }}>{reply.username}</div>
                                {replyBadge && (
                                  <div style={selfBadgeStyle}>
                                    <span
                                      style={{
                                        fontSize: "9px",
                                        color: badgeTheme.textColor,
                                        fontWeight: 700,
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

                              <div style={{ fontSize: "14px", color: "#333", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                                <span style={{ color: "#5aa77b", fontWeight: 700 }}>回复：</span>
                                {buildReplyPrefix(reply).replace(/^回复：/, "")}
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

                              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11px", color: "#9ea9a4", marginTop: "5px", flexWrap: "wrap" }}>
                                <span>{formatCommentTime(reply.created_at)}</span>
                                <span onClick={() => onLikeComment(reply.id)} style={likeBtnStyle(reply.is_liked)}>
                                  <LikeHeartIcon liked={Boolean(reply.is_liked)} size={14} />
                                  <span>{Number(reply.like_count || 0)}</span>
                                </span>
                                {String(reply.user_phone || "") === String(currentUser?.phone || "") && (
                                  <span onClick={() => onDeleteComment(reply.id)} style={DELETE_TEXT_STYLE}>删除</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <div onClick={() => onToggleExpand(parent.id)} style={REPLY_TOGGLE_STYLE}>
                        <span style={REPLY_TOGGLE_LINE_STYLE} />
                        <span>收起回复 ▲</span>
                        <span style={REPLY_TOGGLE_LINE_STYLE} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={COMPOSER_WRAP_STYLE}>
        {replyTarget && (
          <div style={REPLY_HINT_ROW_STYLE}>
            <span>{`正在回复 @${replyTarget.username}`}</span>
            <span onClick={onReplyCancel} style={{ cursor: "pointer", color: "#9aa6a0", fontSize: "16px" }}>×</span>
          </div>
        )}

        <div style={INPUT_BAR_STYLE}>
          <input
            id={commentInputId}
            value={commentDraft}
            onChange={(event) => onCommentDraftChange(event.target.value)}
            placeholder={replyTarget ? `回复 @${replyTarget.username}...` : "写点评论..."}
            style={INPUT_STYLE}
          />
          <XhsImageUploadButton
            onClick={() => document.getElementById(commentImageInputId)?.click()}
            ariaLabel="upload-forum-comment-images"
            size={34}
            radius={10}
            iconSize={16}
            style={{ boxShadow: "none", borderWidth: "1px" }}
          />
          <input id={commentImageInputId} type="file" hidden multiple accept="image/*" onChange={onSelectCommentImages} />
          <button onClick={onSubmitComment} disabled={submitting} style={{ ...SEND_BUTTON_STYLE, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "发布中..." : "发布"}
          </button>
        </div>

        {commentImages.length > 0 && (
          <div style={{ fontSize: "11px", color: "#5aa77b", marginTop: "8px", fontWeight: 700 }}>
            已选择 {commentImages.length} 张图片
          </div>
        )}

        {commentImages.length > 0 && (
          <div style={IMAGE_PREVIEW_GRID_STYLE}>
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

export default ForumInlineCommentsPanel;
