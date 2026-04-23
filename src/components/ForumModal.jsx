import { useEffect, useMemo, useState } from "react";
import { getBadgeEmoji, getBadgeTheme } from "../logic/badgeTheme";
import NoticeListModal from "./NoticeListModal";
import ForumPostCard from "./forum/ForumPostCard";
import ForumPostComposer from "./forum/ForumPostComposer";
import ForumNoticeModal from "./forum/ForumNoticeModal";
import { optimizeUploadImages } from "../logic/uploadImageOptimizer";
import { useOnlineCount } from "../logic/useOnlineCount";
import { useForumNotice } from "../logic/useForumNotice";
import { getForumPostDomId, useForumJumpTo } from "../logic/useForumJumpTo";
import {
  FORUM_IMAGE_TOO_LARGE_MESSAGE,
  MAX_FORUM_IMAGES,
  buildForumPostsUrl,
  forumHeaderStyle,
  forumHintBannerStyle,
  forumNoticeButtonStyle,
  forumOnlinePillStyle,
  forumPageStyle,
  forumSearchButtonStyle,
  forumSearchInputStyle,
  forumSearchRowStyle,
  forumSortButtonStyle,
  normalizeForumPosts,
  splitValidForumFiles,
} from "../logic/forumModalUtils";

const FORUM_NOTICE_TYPES = ["forum_call", "forum_comment", "forum_reply"];
const FORUM_POST_INPUT_ID = "forum-post-images-input";
const forumUnreadBadgeStyle = {
  minWidth: "16px",
  height: "16px",
  padding: "0 4px",
  borderRadius: "999px",
  background: "#ff4d6d",
  color: "white",
  fontSize: "10px",
  fontWeight: "bold",
  lineHeight: "16px",
  textAlign: "center",
  boxSizing: "border-box",
  boxShadow: "0 2px 6px rgba(255,77,109,0.35)",
};
function ForumModal({
  currentUser,
  authApiBase,
  activeBadgeTitle,
  activeBadgeMeta,
  notifications,
  onRefreshNotices,
  onNoticeClick,
  onBack,
  onZoomImage,
  formatCommentTime,
}) {
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImages, setPostImages] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortMode, setSortMode] = useState("latest");
  const [expandedPostIds, setExpandedPostIds] = useState([]);
  const [commentsMap, setCommentsMap] = useState({});
  const [loadingCommentPostIds, setLoadingCommentPostIds] = useState([]);
  const [submittingCommentPostIds, setSubmittingCommentPostIds] = useState([]);
  const [callingPostIds, setCallingPostIds] = useState([]);
  const [commentDraftMap, setCommentDraftMap] = useState({});
  const [commentImagesMap, setCommentImagesMap] = useState({});
  const [replyTargetMap, setReplyTargetMap] = useState({});
  const [showForumNotices, setShowForumNotices] = useState(false);
  const badgeSeed = `${currentUser?.phone || ""}-${activeBadgeTitle || ""}`;
  const badgeTheme = getBadgeTheme(badgeSeed);
  const badgeIcon = getBadgeEmoji(badgeSeed, activeBadgeMeta?.icon || "");
  const onlineCount = useOnlineCount({ enabled: Boolean(currentUser?.phone), authApiBase, phone: currentUser?.phone });
  const { showNotice, openNotice, closeNotice, dontShowAgain, updateDontShowAgain } = useForumNotice(currentUser?.phone);
  const forumNotifications = useMemo(
    () => (notifications || []).filter((notice) => {
      const type = String(notice.type || "");
      const placeId = String(notice.place_id || "");
      return FORUM_NOTICE_TYPES.includes(type) || placeId.startsWith("forum_");
    }),
    [notifications],
  );
  const forumUnreadCount = useMemo(
    () => forumNotifications.filter((notice) => !notice.is_read).length,
    [forumNotifications],
  );
  useForumJumpTo({ posts, expandedPostIds, setExpandedPostIds, loadComments: (postId) => loadComments(postId), commentsMap, loadingPosts });
  const loadPosts = async (keyword = searchKeyword, nextSortMode = sortMode) => {
    if (!currentUser?.phone) return;
    setLoadingPosts(true);
    try {
      const url = buildForumPostsUrl(authApiBase, currentUser.phone, keyword, nextSortMode);
      const res = await fetch(url);
      const data = await res.json();
      if (!data.ok) return alert(data.message || "论坛内容获取失败");
      setPosts(normalizeForumPosts(data.data));
    } catch (error) {
      console.error("论坛帖子加载失败:", error);
      alert("网络错误，论坛内容加载失败");
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    loadPosts("", sortMode);
  }, [currentUser?.phone]);

  useEffect(() => {
    if (searchKeyword.trim()) return;
    loadPosts("", sortMode);
  }, [searchKeyword]);
  useEffect(() => {
    if (!currentUser?.phone) return;
    onRefreshNotices?.(false);
  }, [currentUser?.phone]);

  const loadComments = async (postId) => {
    if (!currentUser?.phone) return;
    setLoadingCommentPostIds((prev) => [...prev, postId]);
    try {
      const res = await fetch(`${authApiBase}/api/forum/comments/${postId}?phone=${currentUser.phone}`);
      const data = await res.json();
      if (!data.ok) return alert(data.message || "论坛评论加载失败");
      setCommentsMap((prev) => ({ ...prev, [postId]: Array.isArray(data.data) ? data.data : [] }));
    } catch (error) {
      console.error("论坛评论加载失败:", error);
      alert("网络错误，评论加载失败");
    } finally {
      setLoadingCommentPostIds((prev) => prev.filter((id) => id !== postId));
    }
  };

  const handleToggleComments = async (postId) => {
    if (expandedPostIds.includes(postId)) {
      setExpandedPostIds((prev) => prev.filter((id) => id !== postId));
      return;
    }
    setExpandedPostIds((prev) => [...prev, postId]);
    if (!commentsMap[postId]) await loadComments(postId);
  };

  const handleSelectPostImages = (event) => {
    const { validFiles, hasOversizedFile } = splitValidForumFiles(event.target.files);
    if (hasOversizedFile) alert(FORUM_IMAGE_TOO_LARGE_MESSAGE);
    if (!validFiles.length) {
      event.target.value = "";
      return;
    }
    const remain = MAX_FORUM_IMAGES - postImages.length;
    if (remain <= 0) {
      alert(`最多上传 ${MAX_FORUM_IMAGES} 张图片`);
      event.target.value = "";
      return;
    }
    const picked = validFiles.slice(0, remain);
    setPostImages((prev) => [...prev, ...picked]);
    if (validFiles.length > remain) alert(`最多上传 ${MAX_FORUM_IMAGES} 张图片，已自动截取前 ${remain} 张`);
    event.target.value = "";
  };

  const handleSelectCommentImages = (postId, event) => {
    const { validFiles, hasOversizedFile } = splitValidForumFiles(event.target.files);
    if (hasOversizedFile) alert(FORUM_IMAGE_TOO_LARGE_MESSAGE);
    const existing = commentImagesMap[postId] || [];
    if (!validFiles.length) {
      event.target.value = "";
      return;
    }
    const remain = MAX_FORUM_IMAGES - existing.length;
    if (remain <= 0) {
      alert(`最多上传 ${MAX_FORUM_IMAGES} 张图片`);
      event.target.value = "";
      return;
    }
    const picked = validFiles.slice(0, remain);
    setCommentImagesMap((prev) => ({ ...prev, [postId]: [...existing, ...picked] }));
    if (validFiles.length > remain) alert(`最多上传 ${MAX_FORUM_IMAGES} 张图片，已自动截取前 ${remain} 张`);
    event.target.value = "";
  };

  const handleRemoveCommentImage = (postId, index) => {
    const existing = commentImagesMap[postId] || [];
    const next = existing.filter((_, i) => i !== index);
    setCommentImagesMap((prev) => ({ ...prev, [postId]: next }));
  };

  const handleSubmitPost = async () => {
    const content = postContent.trim();
    if (!content && postImages.length === 0) return alert("发布内容不能为空");
    setSubmittingPost(true);
    try {
      const optimizedPostImages = await optimizeUploadImages(postImages);
      const formData = new FormData();
      formData.append("phone", currentUser.phone);
      formData.append("content", content);
      optimizedPostImages.forEach((file) => formData.append("images", file));
      const res = await fetch(`${authApiBase}/api/forum/post/add`, { method: "POST", body: formData });
      const data = await res.json();
      if (!data.ok) return alert(data.message || "发帖失败");
      setPostContent("");
      setPostImages([]);
      await loadPosts(searchKeyword, sortMode);
    } catch (error) {
      console.error("论坛发帖失败:", error);
      alert("网络错误，发帖失败");
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleSubmitComment = async (postId) => {
    const content = String(commentDraftMap[postId] || "").trim();
    const commentImages = commentImagesMap[postId] || [];
    if (!content && commentImages.length === 0) return alert("评论内容和图片不能同时为空");
    const replyTarget = replyTargetMap[postId];
    setSubmittingCommentPostIds((prev) => [...prev, postId]);
    try {
      const optimizedCommentImages = await optimizeUploadImages(commentImages);
      const formData = new FormData();
      formData.append("phone", currentUser.phone);
      formData.append("postId", String(postId));
      formData.append("content", content);
      formData.append("parentId", replyTarget ? String(replyTarget.id) : "");
      optimizedCommentImages.forEach((file) => formData.append("images", file));
      const res = await fetch(`${authApiBase}/api/forum/comment/add`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.ok) return alert(data.message || "评论发布失败");
      setCommentDraftMap((prev) => ({ ...prev, [postId]: "" }));
      setCommentImagesMap((prev) => ({ ...prev, [postId]: [] }));
      setReplyTargetMap((prev) => ({ ...prev, [postId]: null }));
      await loadComments(postId);
      await loadPosts(searchKeyword, sortMode);
    } catch (error) {
      console.error("论坛评论发布失败:", error);
      alert("网络错误，评论发布失败");
    } finally {
      setSubmittingCommentPostIds((prev) => prev.filter((id) => id !== postId));
    }
  };

  const handleToggleCall = async (postId) => {
    if (callingPostIds.includes(postId)) return;
    setCallingPostIds((prev) => [...prev, postId]);
    try {
      const res = await fetch(`${authApiBase}/api/forum/post/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone, postId }),
      });
      const data = await res.json();
      if (!data.ok) return alert(data.message || "打call失败");
      const nextCalled = data.action === "called";
      const nextCount = Number(data.callCount);
      setPosts((prev) => prev.map((item) => {
        if (Number(item.id) !== Number(postId)) return item;
        const fallback = Math.max(0, Number(item.call_count || 0) + (nextCalled ? 1 : -1));
        return { ...item, is_called: nextCalled, call_count: Number.isFinite(nextCount) ? nextCount : fallback };
      }));
    } catch (error) {
      console.error("论坛打call失败:", error);
      alert("网络错误，打call失败");
    } finally {
      setCallingPostIds((prev) => prev.filter((id) => id !== postId));
    }
  };

  const handleToggleSortMode = () => {
    const nextSortMode = sortMode === "latest" ? "chill" : "latest";
    setSortMode(nextSortMode);
    loadPosts(searchKeyword, nextSortMode);
  };

  const handleOpenForumNotices = async () => {
    await onRefreshNotices?.(false);
    setShowForumNotices(true);
  };

  const handleForumNoticeClick = async (notice) => {
    const placeId = String(notice?.place_id || "");
    const matched = placeId.match(/^forum_(\d+)$/);
    const postId = matched ? Number(matched[1]) : null;
    setShowForumNotices(false);
    if (!Number.isInteger(postId) || postId <= 0) return;
    if (searchKeyword.trim()) setSearchKeyword("");
    await loadPosts("", sortMode);
    window.dispatchEvent(new CustomEvent("forum:jumpTo", { detail: { postId } }));
  };

  return (
    <div style={forumPageStyle}>
      <div style={forumHeaderStyle}>
        <span onClick={onBack} style={{ cursor: "pointer", fontSize: "18px", color: "#5a6e65" }}>&lt; 返回</span>
        <span style={{ fontWeight: 700, color: "#2e6a4a", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span>🗒️</span>
          <span>7天论坛</span>
        </span>
        <span style={{ width: "58px" }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 24px 14px" }}>
        <div style={forumHintBannerStyle}>💬 记录你7天内的心情 · 7天后自动消散</div>

        <ForumPostComposer
          postContent={postContent}
          onContentChange={setPostContent}
          postImages={postImages}
          onRemoveImage={(index) => setPostImages((prev) => prev.filter((_, i) => i !== index))}
          onSelectImages={handleSelectPostImages}
          onSubmitPost={handleSubmitPost}
          submitting={submittingPost}
          inputId={FORUM_POST_INPUT_ID}
        />

        <div style={forumSearchRowStyle}>
          <input value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="搜索用户或帖子内容" style={forumSearchInputStyle} />
          <button onClick={() => loadPosts(searchKeyword, sortMode)} style={forumSearchButtonStyle}>搜索</button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <button onClick={handleToggleSortMode} style={forumSortButtonStyle}>
            <span>⚡</span>
            <span>{sortMode === "chill" ? "按最新排序" : "按chill排序"}</span>
          </button>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <button onClick={handleOpenForumNotices} style={forumNoticeButtonStyle}>
              <span>互动</span>
              {forumUnreadCount > 0 && <span style={forumUnreadBadgeStyle}>{forumUnreadCount > 99 ? "99+" : forumUnreadCount}</span>}
            </button>
            <button onClick={openNotice} style={forumNoticeButtonStyle}>公告</button>
            <span style={forumOnlinePillStyle}>
              <span style={{ fontSize: "10px" }}>●</span>
              <span>在线 {onlineCount}</span>
            </span>
          </div>
        </div>

        {loadingPosts && <div style={{ textAlign: "center", color: "#7a8f85", padding: "12px 0" }}>论坛内容加载中...</div>}
        {!loadingPosts && posts.length === 0 && <div style={{ textAlign: "center", color: "#97a8a0", padding: "16px 0" }}>7天内暂无相关帖子</div>}

        {!loadingPosts && posts.map((post) => (
          <div key={post.id} id={getForumPostDomId(post.id)}>
            <ForumPostCard
              post={post} currentUser={currentUser} activeBadgeTitle={activeBadgeTitle} badgeIcon={badgeIcon} badgeTheme={badgeTheme}
              expanded={expandedPostIds.includes(Number(post.id))} comments={commentsMap[Number(post.id)] || []} loadingComments={loadingCommentPostIds.includes(Number(post.id))}
              replyTarget={replyTargetMap[Number(post.id)] || null} commentDraft={commentDraftMap[Number(post.id)] || ""} commentImages={commentImagesMap[Number(post.id)] || []}
              submittingComment={submittingCommentPostIds.includes(Number(post.id))} callingPost={callingPostIds.includes(Number(post.id))}
              onToggleComments={handleToggleComments} onToggleCall={handleToggleCall} onZoomImage={onZoomImage}
              onReplySelect={(postId, comment) => setReplyTargetMap((prev) => ({ ...prev, [postId]: comment }))} onReplyCancel={(postId) => setReplyTargetMap((prev) => ({ ...prev, [postId]: null }))}
              onCommentDraftChange={(postId, value) => setCommentDraftMap((prev) => ({ ...prev, [postId]: value }))} onSelectCommentImages={handleSelectCommentImages} onRemoveCommentImage={handleRemoveCommentImage}
              onSubmitComment={handleSubmitComment} formatCommentTime={formatCommentTime}
            />
          </div>
        ))}
      </div>
      <ForumNoticeModal visible={showNotice} dontShowAgain={dontShowAgain} onToggleDontShowAgain={updateDontShowAgain} onClose={closeNotice} />
      <NoticeListModal
        visible={showForumNotices}
        notifications={forumNotifications}
        currentUser={currentUser}
        authApiBase={authApiBase}
        onClose={() => setShowForumNotices(false)}
        onNoticeClick={handleForumNoticeClick}
        onRefresh={() => onRefreshNotices?.(false)}
        formatCommentTime={formatCommentTime}
        modalTitle="论坛互动"
        emptyText="暂无互动"
        markReadPath="/api/notifications/read-forum"
        showClearButton={false}
      />
    </div>
  );
}

export default ForumModal;
