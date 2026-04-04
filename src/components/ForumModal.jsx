import { useEffect, useState } from "react";
import { btnMainStyle } from "../styles/appStyles";
import { getBadgeEmoji, getBadgeTheme } from "../logic/badgeTheme";
import ForumPostCard from "./forum/ForumPostCard";

const MAX_FORUM_IMAGES = 9;
const FORUM_POST_INPUT_ID = "forum-post-images-input";

const pageStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  zIndex: 3500,
  background: "#f8fbf9",
  display: "flex",
  flexDirection: "column",
};

const headerStyle = {
  height: "56px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 14px",
  borderBottom: "1px solid #e8efe9",
  background: "#fff",
};

function buildForumPostsUrl(authApiBase, phone, keyword, sortMode) {
  const params = new URLSearchParams({
    phone: String(phone || "").trim(),
    search: String(keyword || "").trim(),
    sort: sortMode,
  });
  return `${authApiBase}/api/forum/posts?${params.toString()}`;
}

function normalizeForumPosts(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    call_count: Number(item.call_count || 0),
    comment_count: Number(item.comment_count || 0),
    is_called: Boolean(item.is_called),
  }));
}

function ForumModal({ currentUser, authApiBase, activeBadgeTitle, activeBadgeMeta, onBack, onZoomImage, formatCommentTime }) {
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
  const [replyTargetMap, setReplyTargetMap] = useState({});

  const badgeSeed = `${currentUser?.phone || ""}-${activeBadgeTitle || ""}`;
  const badgeTheme = getBadgeTheme(badgeSeed);
  const badgeIcon = getBadgeEmoji(badgeSeed, activeBadgeMeta?.icon || "");

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
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const remain = MAX_FORUM_IMAGES - postImages.length;
    if (remain <= 0) {
      alert(`最多上传 ${MAX_FORUM_IMAGES} 张图片`);
      event.target.value = "";
      return;
    }
    const picked = files.slice(0, remain);
    setPostImages((prev) => [...prev, ...picked]);
    if (files.length > remain) alert(`最多上传 ${MAX_FORUM_IMAGES} 张图片，已自动截取前 ${remain} 张`);
    event.target.value = "";
  };

  const handleSubmitPost = async () => {
    const content = postContent.trim();
    if (!content && postImages.length === 0) return alert("发布内容不能为空");
    setSubmittingPost(true);
    try {
      const formData = new FormData();
      formData.append("phone", currentUser.phone);
      formData.append("content", content);
      postImages.forEach((file) => formData.append("images", file));
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
    if (!content) return alert("评论内容不能为空");
    const replyTarget = replyTargetMap[postId];
    setSubmittingCommentPostIds((prev) => [...prev, postId]);
    try {
      const res = await fetch(`${authApiBase}/api/forum/comment/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone, postId, content, parentId: replyTarget ? replyTarget.id : null }),
      });
      const data = await res.json();
      if (!data.ok) return alert(data.message || "评论发布失败");
      setCommentDraftMap((prev) => ({ ...prev, [postId]: "" }));
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
      await loadPosts(searchKeyword, sortMode);
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

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <span onClick={onBack} style={{ cursor: "pointer", fontSize: "18px" }}>&lt; 返回</span>
        <span style={{ fontWeight: 700, color: "#2e6a4a" }}>24小时论坛</span>
        <span style={{ width: "58px" }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 24px 14px" }}>
        <div style={{ background: "#fff", borderRadius: "20px", padding: "12px", border: "1px solid #e7f1eb", marginBottom: "12px" }}>
          <textarea
            value={postContent}
            onChange={(event) => setPostContent(event.target.value)}
            placeholder="发布你的24小时动态..."
            style={{ width: "100%", minHeight: "90px", border: "1px solid #dce8e1", borderRadius: "12px", padding: "10px", boxSizing: "border-box", resize: "vertical" }}
          />
          {postImages.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "8px", maxWidth: "280px" }}>
              {postImages.map((file, index) => (
                <div key={`${file.name}-${index}`} style={{ position: "relative" }}>
                  <img src={URL.createObjectURL(file)} alt="forum-post-preview" style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "8px", objectFit: "cover" }} />
                  <span onClick={() => setPostImages((prev) => prev.filter((_, i) => i !== index))} style={{ position: "absolute", top: "-5px", right: "-5px", width: "18px", height: "18px", borderRadius: "50%", background: "#ff4d4f", color: "#fff", textAlign: "center", lineHeight: "18px", cursor: "pointer" }}>×</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
            <button onClick={() => document.getElementById(FORUM_POST_INPUT_ID)?.click()} style={{ ...btnMainStyle, marginTop: 0, width: "auto", padding: "8px 14px", borderRadius: "999px" }}>添加图片</button>
            <span style={{ fontSize: "12px", color: "#6e867a" }}>已选 {postImages.length}/{MAX_FORUM_IMAGES}</span>
            <input id={FORUM_POST_INPUT_ID} type="file" hidden accept="image/*" multiple onChange={handleSelectPostImages} />
            <button onClick={handleSubmitPost} disabled={submittingPost} style={{ ...btnMainStyle, marginTop: 0, marginLeft: "auto", width: "auto", padding: "8px 16px" }}>{submittingPost ? "发布中..." : "发布"}</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <input value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="搜索用户或帖子内容" style={{ flex: 1, border: "1px solid #dce8e1", borderRadius: "12px", padding: "10px 12px", outline: "none", background: "#fff" }} />
          <button onClick={() => loadPosts(searchKeyword, sortMode)} style={{ ...btnMainStyle, marginTop: 0, width: "88px" }}>搜索</button>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
          <button onClick={handleToggleSortMode} style={{ border: "none", background: "transparent", color: sortMode === "chill" ? "#2e6a4a" : "#6f8b7e", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>
            {sortMode === "chill" ? "按最新排序" : "最chill排序"}
          </button>
        </div>

        {loadingPosts && <div style={{ textAlign: "center", color: "#7a8f85", padding: "12px 0" }}>论坛内容加载中...</div>}
        {!loadingPosts && posts.length === 0 && <div style={{ textAlign: "center", color: "#97a8a0", padding: "16px 0" }}>24小时内暂无相关帖子</div>}

        {!loadingPosts && posts.map((post) => (
          <ForumPostCard
            key={post.id}
            post={post}
            currentUser={currentUser}
            activeBadgeTitle={activeBadgeTitle}
            badgeIcon={badgeIcon}
            badgeTheme={badgeTheme}
            expanded={expandedPostIds.includes(Number(post.id))}
            comments={commentsMap[Number(post.id)] || []}
            loadingComments={loadingCommentPostIds.includes(Number(post.id))}
            replyTarget={replyTargetMap[Number(post.id)] || null}
            commentDraft={commentDraftMap[Number(post.id)] || ""}
            submittingComment={submittingCommentPostIds.includes(Number(post.id))}
            callingPost={callingPostIds.includes(Number(post.id))}
            onToggleComments={handleToggleComments}
            onToggleCall={handleToggleCall}
            onZoomImage={onZoomImage}
            onReplySelect={(postId, comment) => setReplyTargetMap((prev) => ({ ...prev, [postId]: comment }))}
            onReplyCancel={(postId) => setReplyTargetMap((prev) => ({ ...prev, [postId]: null }))}
            onCommentDraftChange={(postId, value) => setCommentDraftMap((prev) => ({ ...prev, [postId]: value }))}
            onSubmitComment={handleSubmitComment}
            formatCommentTime={formatCommentTime}
          />
        ))}
      </div>
    </div>
  );
}

export default ForumModal;
