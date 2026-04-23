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
import { getAvatarWithFallback } from "../../logic/avatarFallback";
import { parseForumImageUrls } from "../../logic/forumImageUtils";
import { buildImageLoadingProps } from "../../logic/imageProps";
import LikeHeartIcon from "../LikeHeartIcon";
import XhsImageUploadButton from "../common/XhsImageUploadButton";

const COMMENT_INPUT_ID = "forum-comment-images-input-overlay";
const listItemStyle = {
  background: "#fff",
  borderRadius: "14px",
  border: "1px solid #edf3ef",
  padding: "10px",
  marginBottom: "10px",
};
const imageGridStyle = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginTop: "8px", maxWidth: "300px" };
const imageStyle = { width: "100%", aspectRatio: "1 / 1", borderRadius: "8px", objectFit: "cover", cursor: "zoom-in" };
const replyTagStyle = { color: "#5aa77b", fontWeight: 700, cursor: "pointer", fontSize: "12px" };
const selectedImageHintStyle = { fontSize: "11px", color: "#5aa77b", marginTop: "8px", fontWeight: 700 };
const selectedImageGridStyle = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "8px", maxWidth: "260px" };
const selectedImageStyle = { width: "100%", aspectRatio: "1 / 1", borderRadius: "8px", objectFit: "cover" };

function sortComments(comments, sortMode) {
  const next = Array.isArray(comments) ? [...comments] : [];
  if (sortMode === "hot") {
    next.sort((a, b) => {
      const likeDiff = Number(b.like_count || 0) - Number(a.like_count || 0);
      if (likeDiff !== 0) return likeDiff;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    return next;
  }
  next.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return next;
}

function buildCommentTree(comments) {
  const list = Array.isArray(comments) ? comments : [];
  const parents = list.filter((item) => !item.parent_id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const childrenMap = list.reduce((acc, item) => {
    if (!item.parent_id) return acc;
    const key = String(item.parent_id);
    const prev = acc[key] || [];
    return { ...acc, [key]: [...prev, item] };
  }, {});
  return { parents, childrenMap };
}

function ForumCommentsOverlay({
  visible,
  post,
  comments,
  loading,
  sortMode,
  currentUser,
  replyTarget,
  commentDraft,
  commentImages,
  submitting,
  onClose,
  onSortChange,
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
  if (!visible || !post) return null;
  const sortedComments = useMemo(() => sortComments(comments, sortMode), [comments, sortMode]);
  const { parents, childrenMap } = useMemo(() => buildCommentTree(sortedComments), [sortedComments]);
  const placeholder = replyTarget ? `回复 @${replyTarget.username}...` : "写评论...";

  return (
    <div style={fullPageOverlayStyle}>
      <div style={navHeaderStyle}>
        <span onClick={onClose} style={{ cursor: "pointer", fontSize: "18px", color: "#5a6e65" }}>← 返回</span>
        <span style={{ fontWeight: 700, color: "#2e6a4a" }}>帖子评论</span>
        <span style={{ width: "56px" }} />
      </div>

      <div style={sortContainerStyle}>
        <button onClick={() => onSortChange("latest")} style={sortBtnStyle(sortMode === "latest")}>按最新</button>
        <button onClick={() => onSortChange("hot")} style={sortBtnStyle(sortMode === "hot")}>按最火</button>
      </div>

      <div style={{ ...scrollContentStyle, paddingTop: "12px" }}>
        <div style={{ marginBottom: "10px", color: "#6f8379", fontSize: "12px" }}>{post.username} · {post.content || "图片帖"}</div>
        {loading && <div style={{ textAlign: "center", color: "#7a8f85", padding: "12px 0" }}>评论加载中...</div>}
        {!loading && parents.length === 0 && <div style={{ textAlign: "center", color: "#97a8a0", padding: "20px 0" }}>还没有评论，来做第一个互动吧</div>}

        {!loading && parents.map((parent) => {
          const parentImages = parseForumImageUrls(parent.image_url);
          const replies = (childrenMap[String(parent.id)] || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          return (
            <div key={parent.id} style={listItemStyle}>
              <div style={{ display: "flex", gap: "10px" }}>
                <img
                  src={getAvatarWithFallback(parent.avatar_url, parent.user_phone, parent.username)}
                  {...buildImageLoadingProps()}
                  alt="forum-comment-avatar"
                  style={{ width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#49685a" }}>{parent.username}</div>
                  <div style={{ fontSize: "14px", color: "#233a2f", marginTop: "2px", whiteSpace: "pre-wrap" }}>{parent.content || "（图片评论）"}</div>
                  {parentImages.length > 0 && (
                    <div style={imageGridStyle}>
                      {parentImages.map((url, index) => (
                        <img key={`${parent.id}-${index}`} src={url} alt="forum-comment-img" style={imageStyle} onClick={() => onZoomImage(parentImages, index)} />
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11px", color: "#9db0a7" }}>{formatCommentTime(parent.created_at)}</span>
                    <span onClick={() => onReplySelect(parent)} style={replyTagStyle}>回复</span>
                    <span onClick={() => onLikeComment(parent.id)} style={likeBtnStyle(Boolean(parent.is_liked))}>
                      <LikeHeartIcon liked={Boolean(parent.is_liked)} size={14} />
                      <span>{Number(parent.like_count || 0)}</span>
                    </span>
                  </div>
                </div>
              </div>

              {replies.length > 0 && (
                <div style={{ marginTop: "8px", marginLeft: "44px", borderLeft: "2px solid #eff4f1", paddingLeft: "10px" }}>
                  {replies.map((reply) => {
                    const replyImages = parseForumImageUrls(reply.image_url);
                    return (
                      <div key={reply.id} style={{ marginBottom: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <img
                            src={getAvatarWithFallback(reply.avatar_url, reply.user_phone, reply.username)}
                            {...buildImageLoadingProps()}
                            alt="forum-reply-avatar"
                            style={{ width: "26px", height: "26px", borderRadius: "50%", objectFit: "cover" }}
                          />
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#5b766a" }}>{reply.username}</span>
                          <span style={{ fontSize: "11px", color: "#9db0a7" }}>{formatCommentTime(reply.created_at)}</span>
                        </div>
                        <div style={{ fontSize: "13px", color: "#2f4539", marginTop: "4px", whiteSpace: "pre-wrap" }}>{reply.content || "（图片回复）"}</div>
                        {replyImages.length > 0 && (
                          <div style={imageGridStyle}>
                            {replyImages.map((url, index) => (
                              <img key={`${reply.id}-${index}`} src={url} alt="forum-reply-img" style={imageStyle} onClick={() => onZoomImage(replyImages, index)} />
                            ))}
                          </div>
                        )}
                        <div style={{ marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "12px" }}>
                          <span onClick={() => onReplySelect(parent)} style={replyTagStyle}>回复</span>
                          <span onClick={() => onLikeComment(reply.id)} style={likeBtnStyle(Boolean(reply.is_liked))}>
                            <LikeHeartIcon liked={Boolean(reply.is_liked)} size={13} />
                            <span>{Number(reply.like_count || 0)}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ height: "96px" }} />
      </div>

      <div style={fixedBottomBarStyle}>
        {replyTarget && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 10px 8px", fontSize: "12px", color: "#5aa77b", fontWeight: 700 }}>
            <span>正在回复 @{replyTarget.username}</span>
            <span onClick={onReplyCancel} style={{ cursor: "pointer", color: "#999", fontSize: "16px" }}>×</span>
          </div>
        )}
        <div style={bottomInputContainer}>
          <input value={commentDraft} onChange={(event) => onCommentDraftChange(event.target.value)} placeholder={placeholder} style={bottomRealInput} />
          <XhsImageUploadButton onClick={() => document.getElementById(COMMENT_INPUT_ID)?.click()} ariaLabel="upload-forum-comment-images" size={32} radius={10} iconSize={16} style={{ boxShadow: "none", borderWidth: "1px" }} />
          <input id={COMMENT_INPUT_ID} type="file" hidden multiple accept="image/*" onChange={onSelectCommentImages} />
          <button onClick={onSubmitComment} disabled={submitting} style={{ ...btnSendStyle, opacity: submitting ? 0.6 : 1 }}>{submitting ? "发布中..." : "发布"}</button>
        </div>
        {commentImages.length > 0 && (
          <>
            <div style={selectedImageHintStyle}>已选 {commentImages.length} / 9 张</div>
            <div style={selectedImageGridStyle}>
              {commentImages.map((file, index) => (
                <div key={`${file.name}-${index}`} style={{ position: "relative" }}>
                  <img src={URL.createObjectURL(file)} alt="forum-comment-selected" style={selectedImageStyle} />
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
          </>
        )}
      </div>
    </div>
  );
}

export default ForumCommentsOverlay;
