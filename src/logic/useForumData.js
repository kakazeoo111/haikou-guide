import { useMemo, useState } from "react";
import { appendOptimizedImagesWithThumbnails } from "./uploadImageOptimizer";
import {
  FORUM_IMAGE_TOO_LARGE_MESSAGE,
  MAX_FORUM_IMAGES,
  buildForumPostsUrl,
  normalizeForumPosts,
  splitValidForumFiles,
} from "./forumModalUtils";
import { authFetch } from "./apiClient";
import { warmCommentAvatars, warmCommentImages, warmForumPostImages } from "./imageWarmup";

const FORUM_NOTICE_TYPES = ["forum_call", "forum_comment", "forum_reply", "forum_comment_like"];

function toForumNotifications(notifications) {
  return (notifications || []).filter((notice) => {
    const type = String(notice.type || "");
    const placeId = String(notice.place_id || "");
    return FORUM_NOTICE_TYPES.includes(type) || placeId.startsWith("forum_");
  });
}

function updateCommentLikeState(comments, commentId, nextLiked, nextCount) {
  return (comments || []).map((item) => {
    if (Number(item.id) !== Number(commentId)) return item;
    const fallback = Math.max(0, Number(item.like_count || 0) + (nextLiked ? 1 : -1));
    return { ...item, is_liked: nextLiked, like_count: Number.isFinite(nextCount) ? nextCount : fallback };
  });
}

function updatePostCallState(posts, postId, nextCalled, nextCount) {
  return (posts || []).map((item) => {
    if (Number(item.id) !== Number(postId)) return item;
    const fallback = Math.max(0, Number(item.call_count || 0) + (nextCalled ? 1 : -1));
    return { ...item, is_called: nextCalled, call_count: Number.isFinite(nextCount) ? nextCount : fallback };
  });
}

export function useForumData({ currentUser, authApiBase, notifications }) {
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImages, setPostImages] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortMode, setSortMode] = useState("latest");
  const [commentsMap, setCommentsMap] = useState({});
  const [loadingCommentPostIds, setLoadingCommentPostIds] = useState([]);
  const [submittingCommentPostIds, setSubmittingCommentPostIds] = useState([]);
  const [callingPostIds, setCallingPostIds] = useState([]);
  const [commentDraftMap, setCommentDraftMap] = useState({});
  const [commentImagesMap, setCommentImagesMap] = useState({});
  const [replyTargetMap, setReplyTargetMap] = useState({});
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [commentSortMode, setCommentSortMode] = useState("default");
  const [expandedCommentParentIdsMap, setExpandedCommentParentIdsMap] = useState({});
  const [showOnlyImageCommentMap, setShowOnlyImageCommentMap] = useState({});

  const forumNotifications = useMemo(() => toForumNotifications(notifications), [notifications]);
  const forumUnreadCount = useMemo(() => forumNotifications.filter((notice) => !notice.is_read).length, [forumNotifications]);

  const loadPosts = async (keyword = searchKeyword, nextSortMode = sortMode) => {
    if (!currentUser?.phone) return;
    setLoadingPosts(true);
    try {
      const url = buildForumPostsUrl(authApiBase, currentUser.phone, keyword, nextSortMode);
      const res = await authFetch(url);
      const data = await res.json();
      if (!data.ok) return alert(data.message || "论坛内容获取失败");
      const nextPosts = normalizeForumPosts(data.data);
      setPosts(nextPosts);
      warmForumPostImages(nextPosts);
    } catch (error) {
      console.error("论坛帖子加载失败:", error);
      alert("网络错误，论坛内容加载失败");
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadComments = async (postId) => {
    if (!currentUser?.phone) return;
    setLoadingCommentPostIds((prev) => [...prev, postId]);
    try {
      const res = await authFetch(`${authApiBase}/api/forum/comments/${postId}?phone=${currentUser.phone}`);
      const data = await res.json();
      if (!data.ok) return alert(data.message || "论坛评论加载失败");
      const nextComments = Array.isArray(data.data) ? data.data : [];
      setCommentsMap((prev) => ({ ...prev, [postId]: nextComments }));
      warmCommentImages(nextComments);
      warmCommentAvatars(nextComments);
    } catch (error) {
      console.error("论坛评论加载失败:", error);
      alert("网络错误，评论加载失败");
    } finally {
      setLoadingCommentPostIds((prev) => prev.filter((id) => id !== postId));
    }
  };

  const openComments = async (postId) => {
    setActiveCommentPostId(postId);
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
      const formData = new FormData();
      formData.append("phone", currentUser.phone);
      formData.append("content", content);
      await appendOptimizedImagesWithThumbnails(formData, postImages);
      const res = await authFetch(`${authApiBase}/api/forum/post/add`, { method: "POST", body: formData });
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
      const formData = new FormData();
      formData.append("phone", currentUser.phone);
      formData.append("postId", String(postId));
      formData.append("content", content);
      formData.append("parentId", replyTarget ? String(replyTarget.id) : "");
      await appendOptimizedImagesWithThumbnails(formData, commentImages);
      const res = await authFetch(`${authApiBase}/api/forum/comment/add`, { method: "POST", body: formData });
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

  const handleLikeComment = async (postId, commentId) => {
    try {
      const res = await authFetch(`${authApiBase}/api/forum/comment/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone, commentId }),
      });
      const data = await res.json();
      if (!data.ok) return alert(data.message || "评论点赞失败");
      const nextLiked = data.action === "liked";
      const nextCount = Number(data.likeCount || 0);
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: updateCommentLikeState(prev[postId], commentId, nextLiked, nextCount),
      }));
    } catch (error) {
      console.error("论坛评论点赞失败:", error);
      alert("网络错误，评论点赞失败");
    }
  };

  const handleDeleteComment = async (postId, commentId, confirm) => {
    const accepted = await (confirm ? confirm({
      title: "删除评论",
      message: "确定删除这条论坛评论吗？如果它下面有回复，也会一起删除。",
    }) : Promise.resolve(window.confirm("确定删除这条评论吗？")));
    if (!accepted) return;
    try {
      const res = await authFetch(`${authApiBase}/api/forum/comment/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone, commentId }),
      });
      const data = await res.json();
      if (!data.ok) return alert(data.message || "评论删除失败");
      setReplyTargetMap((prev) => {
        const currentReply = prev[postId];
        if (!currentReply || Number(currentReply.id) !== Number(commentId)) return prev;
        return { ...prev, [postId]: null };
      });
      await loadComments(postId);
      await loadPosts(searchKeyword, sortMode);
    } catch (error) {
      console.error("论坛评论删除失败:", error);
      alert("网络错误，评论删除失败");
    }
  };

  const handleDeletePost = async (postId, confirm) => {
    const accepted = await (confirm ? confirm({
      title: "删除帖子",
      message: "确定删除这条论坛帖子吗？帖子下的评论和回复也会一起删除。",
    }) : Promise.resolve(window.confirm("确定删除这条论坛帖子吗？帖子下的评论和回复也会一起删除。")));
    if (!accepted) return;
    try {
      const res = await authFetch(`${authApiBase}/api/forum/post/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone, postId }),
      });
      const data = await res.json();
      if (!data.ok) return alert(data.message || "帖子删除失败");
      setPosts((prev) => prev.filter((item) => Number(item.id) !== Number(postId)));
      setCommentsMap((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      setReplyTargetMap((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      setCommentDraftMap((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      setCommentImagesMap((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      setExpandedCommentParentIdsMap((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      setShowOnlyImageCommentMap((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      setActiveCommentPostId((currentPostId) => (Number(currentPostId) === Number(postId) ? null : currentPostId));
    } catch (error) {
      console.error("论坛帖子删除失败:", error);
      alert("网络错误，帖子删除失败");
    }
  };

  const handleToggleCall = async (postId) => {
    if (callingPostIds.includes(postId)) return;
    setCallingPostIds((prev) => [...prev, postId]);
    try {
      const res = await authFetch(`${authApiBase}/api/forum/post/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone, postId }),
      });
      const data = await res.json();
      if (!data.ok) return alert(data.message || "打call失败");
      const nextCalled = data.action === "called";
      const nextCount = Number(data.callCount);
      setPosts((prev) => updatePostCallState(prev, postId, nextCalled, nextCount));
    } catch (error) {
      console.error("论坛打call失败:", error);
      alert("网络错误，打call失败");
    } finally {
      setCallingPostIds((prev) => prev.filter((id) => id !== postId));
    }
  };

  return {
    posts,
    loadingPosts,
    submittingPost,
    postContent,
    postImages,
    searchKeyword,
    sortMode,
    commentsMap,
    loadingCommentPostIds,
    submittingCommentPostIds,
    callingPostIds,
    commentDraftMap,
    commentImagesMap,
    replyTargetMap,
    activeCommentPostId,
    commentSortMode,
    expandedCommentParentIdsMap,
    showOnlyImageCommentMap,
    forumNotifications,
    forumUnreadCount,
    setPostContent,
    setPostImages,
    setSearchKeyword,
    setSortMode,
    setReplyTargetMap,
    setCommentDraftMap,
    setCommentImagesMap,
    setActiveCommentPostId,
    setCommentSortMode,
    setExpandedCommentParentIdsMap,
    setShowOnlyImageCommentMap,
    loadPosts,
    loadComments,
    openComments,
    handleSelectPostImages,
    handleSelectCommentImages,
    handleRemoveCommentImage,
    handleSubmitPost,
    handleSubmitComment,
    handleLikeComment,
    handleDeleteComment,
    handleDeletePost,
    handleToggleCall,
  };
}
